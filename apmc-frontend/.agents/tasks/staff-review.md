# Staff-Side Implementation: APMC OPD Appointment System

Three staff roles (doctor/office, OPD head, admin) backed by JWT session cookies, Supabase with pgcrypto for doctor credential storage, and environment-variable credentials for the two privileged roles. The build succeeded with 0 TypeScript errors and 27 routes compiled. However, three runtime-critical routes are missing — `/api/admin/logout`, `/api/head/logout`, and `/api/doctor/me` — and the admin/head login has a security flaw that makes the timing-safe comparison useless when env vars are unset.

Watch for: (1) **Missing logout routes** for admin and head — the dashboards call these endpoints and will silently fail to clear sessions. (2) **Missing `/api/doctor/me`** — the doctor dashboard fetches this on mount to resolve the office name; without it every doctor dashboard load hits a 404 and falls back, losing the office name display. (3) **Timing-safe bypass** — empty-string fallback on env var reads means an attacker can log in with blank credentials if `ADMIN_USERNAME`/`ADMIN_PASSWORD` are not set.

**Verdict**: CHANGES_REQUESTED

---

## High-level view

All three staff login flows mint an `HS256` JWT, set it as an `httpOnly; SameSite=Strict` session cookie, and verify it on every protected API call before touching the database. The doctor role additionally runs pgcrypto's `crypt()` on the Supabase side via a `SECURITY DEFINER` RPC, keeping the plaintext password entirely server-side. Admin and head use Node's `timingSafeEqual`, which is correct — except that the env-var fallback to `''` means a zero-length attacker input matches a zero-length expected value when the vars are absent.

The proxy guard (`proxy.ts` at project root, exporting `proxy()` per the Next.js 16 convention) covers all three dashboard paths and verifies the JWT role before forwarding. It correctly inlines `jwtVerify` rather than importing `server-only`-gated `lib/auth.ts`.

Three routes the dashboards depend on at runtime are simply absent: `/api/admin/logout`, `/api/head/logout`, and `/api/doctor/me`. The build passes because the calls are issued from client components via `fetch()`, not via static imports — so TypeScript never catches the gap.

The `SchedulePickerView` hardcodes slot capacity at 2 in both the fullness check and the display label. The `slot_capacity` column exists in the database and is managed through the admin UI, but the booking form never reads it — a new office with capacity 4 would appear full to patients after only 2 bookings.

The SQL schema includes the right `REVOKE EXECUTE … FROM PUBLIC` block for all `SECURITY DEFINER` RPCs. This is the most important single security decision in the schema and it's done correctly.

---

<details>
<summary>Issues (5)</summary>

1. **Missing `/api/admin/logout`** — `handleLogout()` in the admin dashboard POSTs to this route; without it the session cookie is never cleared. Create the route (expire `apmc_session` with `maxAge: 0`).

2. **Missing `/api/head/logout`** — same problem for the head dashboard. `handleLogout()` calls `/api/head/logout`.

3. **Missing `/api/doctor/me`** — the doctor dashboard fetches this on mount to display the office name in the header. Currently returns a 404, causing the office name badge to stay blank and the error path to `router.push('/doctor/login')` on any network error.

4. **Timing-safe bypass on missing env vars** — `const expectedUsername = process.env.ADMIN_USERNAME || ''` means that if `ADMIN_USERNAME` is not set, the expected value is `''`. An attacker submitting `{ username: '', password: '' }` passes the length-equality check (`0 === 0`) and `timingSafeEqual` returns `true`. Fix: throw (or return 500) when the env var is absent, the same way `lib/auth.ts` throws on a missing `JWT_SECRET`.

5. **Slot capacity hardcoded at 2 in booking form** — `SchedulePickerView.tsx` line 416 checks `bookedCount >= 2` and displays `Full (2/2)` / `Available (${bookedCount}/2)`. The `slot_capacity` field is stored per-office and editable via admin, but the booking form never fetches or uses it. An office configured with capacity > 2 will appear full prematurely to patients.

</details>

---

<details>
<summary>Details</summary>

## Missing logout routes and `/api/doctor/me`

The admin dashboard's `handleLogout` does `fetch('/api/admin/logout', { method: 'POST' })`. That file does not exist. Same for the head dashboard and `/api/head/logout`. Both are confirmed absent via file search. The build does not catch this because the calls originate in client-side `fetch()` calls, not TypeScript imports.

`/api/doctor/me` is fetched on doctor dashboard mount to resolve `officeName` from the session:

```ts
fetch('/api/doctor/me')
  .then((r) => {
    if (r.status === 401) { router.push('/doctor/login'); return null; }
    return r.json();
  })
  .then((data) => { if (data?.officeName) setOfficeName(data.officeName); })
  .catch(() => router.push('/doctor/login'));
```

Without the route, the `catch` fires on a network-level failure (or on a non-JSON 404 body causing a parse error), sending the doctor back to the login page immediately after every successful login. The appointment queue still loads because `fetchAppointments` uses a separate call that extracts `officeName` from the JWT — but the office name badge in the header will never populate.

## Timing-safe bypass on absent env vars

In both `/api/admin/login/route.ts` and `/api/head/login/route.ts`:

```ts
const expectedUsername = process.env.ADMIN_USERNAME || '';
const expectedPassword = process.env.ADMIN_PASSWORD || '';
```

If either variable is unset (mis-configured deployment, CI environment, local dev without a `.env`), the expected value is `''`. An attacker submitting `username: ''` and `password: ''` passes `uBuf.length === eBuf.length` (both 0) and `timingSafeEqual(Buffer.alloc(0), Buffer.alloc(0))` returns `true`. This is confirmed: the length guard does not protect against the zero-length case.

`lib/auth.ts` sets the correct pattern:

```ts
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set…');
}
```

Admin and head login should do the same: check `!process.env.ADMIN_USERNAME` at startup (or at the top of the handler) and return a 500 rather than falling back to `''`.

## Slot capacity hardcoded in booking form

`SchedulePickerView.tsx` line 416: `const isFull = bookedCount >= 2`. The label shows `Full (2/2)`. The `offices` table has a `slot_capacity` column, managed via the admin dashboard, but `/api/offices` returns only `{ id, name }` — the capacity is not included. The booking form has no way to use it even if it wanted to. Offices added with a non-default capacity are silently treated as capacity-2 for all booking purposes.

## Test coverage

No tests exist for any staff route. Untested paths with the highest blast radius:

- Admin/head login with absent env vars — the timing-safe bypass described above is exploitable precisely in this unexercised path
- Doctor status update scoped to `.eq('office', payload.officeName)` — correct but unverified; a test with a cross-office appointment ID would confirm the scoping holds

</details>

---

<details>
<summary>Files reviewed</summary>

| File | What it does |
|---|---|
| `supabase/schema-staff.sql` | DDL for offices/holidays, RLS policies, 4 SECURITY DEFINER RPCs with REVOKE, seed data |
| `lib/auth.ts` | JWT sign/verify via jose@5, throws on missing JWT_SECRET |
| `lib/supabase-admin.ts` | Service-role Supabase client, server-only gated |
| `proxy.ts` | Next.js 16 proxy guard; covers all three dashboard prefixes |
| `app/api/doctor/login/route.ts` | pgcrypto RPC password verify, sets httpOnly session cookie |
| `app/api/doctor/logout/route.ts` | Expires session cookie |
| `app/api/doctor/appointments/route.ts` | Auth-gated queue fetch scoped to calling doctor's office |
| `app/api/doctor/appointments/[id]/status/route.ts` | Status PATCH with office-scoping; awaits params correctly |
| `app/api/admin/login/route.ts` | timingSafeEqual comparison; env-var fallback flaw |
| `app/api/admin/offices/route.ts` | GET + POST for office management |
| `app/api/admin/offices/[id]/route.ts` | PATCH (edit) + DELETE (toggle is_active) |
| `app/api/admin/holidays/route.ts` | GET + POST + DELETE for holiday management |
| `app/api/admin/credentials/route.ts` | POST to reset office password via RPC |
| `app/api/admin/stats/route.ts` | Aggregate stats query |
| `app/api/head/login/route.ts` | Same timingSafeEqual pattern as admin; same flaw |
| `app/api/head/appointments/route.ts` | Filterable appointment list for OPD head |
| `app/api/head/stats/route.ts` | Identical stats shape as admin stats |
| `app/api/offices/route.ts` | Public GET for booking form office list |
| `app/api/holidays/route.ts` | Public GET for booking form holiday set |
| `app/doctor/login/page.tsx` | Login form; pushes to /doctor/dashboard on success |
| `app/doctor/dashboard/page.tsx` | Queue view with status actions; 15-min idle timeout |
| `app/admin/login/page.tsx` | Admin login form |
| `app/admin/dashboard/page.tsx` | 4-tab admin panel: overview, offices, holidays, credentials |
| `app/head/login/page.tsx` | Head login form |
| `app/head/dashboard/page.tsx` | 2-tab head panel: overview + filterable appointment table with print/pagination |
| `components/booking/SchedulePickerView.tsx` | Dynamic office/holiday fetch from API; slot capacity hardcoded at 2 |

</details>
