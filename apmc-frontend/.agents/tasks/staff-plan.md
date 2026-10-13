# Implementation Plan: APMC OPD Staff-Side

## Project Context

- **Framework**: Next.js 16.4.0 App Router, React 19.3.0, TypeScript strict mode, Tailwind CSS 4
- **Build command**: `npm run build` (run from `apmc-frontend/`)
- **Dev command**: `npm run dev`
- **Database**: Supabase (anon client already in `lib/supabase.ts`)
- **Existing UI aesthetic**: emerald-600 accent, slate-900 text, border-2 inputs, uppercase tracking-widest labels (see `components/layout/Header.tsx`, `components/booking/SchedulePickerView.tsx`)
- **Existing API pattern**: App Router route handlers using Web `Request`/`Response` APIs, `NextResponse.json()`, async `cookies()` from `next/headers` (see `app/api/appointments/route.ts`)

---

## ⚠️ CRITICAL Next.js 16 Breaking Changes

Read before writing ANY middleware or route handler code.

### 1. `middleware.ts` is DEPRECATED — use `proxy.ts`

`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/middleware.md` states:

> The `middleware.js` file convention has been **deprecated** in Next.js 16 and renamed to `proxy.js`.

- **File**: create `proxy.ts` at the project root (same level as `app/`), NOT `middleware.ts`
- **Export name**: export a named function called `proxy`, NOT `middleware`
- **Type**: use `NextRequest` / `NextResponse` from `next/server`; import `NextProxy` type if needed
- **Config**: export `config` with `matcher` array exactly as before — identical syntax

Example shape:
```ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  // ...
  return NextResponse.redirect(new URL('/doctor/login', request.url))
}

export const config = {
  matcher: ['/doctor/dashboard', '/head/dashboard', '/admin/dashboard'],
}
```

### 2. `params` in dynamic Route Handlers is a Promise

`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md` states (v15.0.0-RC changelog):

> `context.params` is now a promise.

Always `await params`:
```ts
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params   // ← must await
}
```

### 3. `cookies()` is async

`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cookies.md`:

> `cookies` is an **asynchronous** function that returns a promise.

Always `await cookies()`:
```ts
import { cookies } from 'next/headers'
const cookieStore = await cookies()
cookieStore.set('apmc_session', token, { httpOnly: true, ... })
```

### 4. Default caching for GET handlers changed

GET Route Handlers are now **dynamic by default** (no longer statically cached). No action needed for this project since all endpoints are dynamic anyway.

---

## Step-by-Step Implementation Plan

---

- [ ] 1. **Install `jose@5`**

  Add the only permitted new dependency.

  Files: `package.json`, `package-lock.json`

  ```
  cd c:\Users\Hamah\Downloads\WEB-SYSTEMS\OPD-System\apmc-frontend
  npm install jose@5
  ```

  Verify: `npm run build` — completes with 0 errors. Check `node_modules/jose/package.json` exists.

---

- [ ] 2. **Write the Supabase SQL schema file**

  Create `supabase/schema-staff.sql` with all DDL. This file is SQL only — never imported by application code. Run it in the Supabase SQL editor manually.

  Files: `supabase/schema-staff.sql` (new)

  Content must include, in order:

  a. `CREATE EXTENSION IF NOT EXISTS pgcrypto;`

  b. `offices` table:
  ```sql
  CREATE TABLE IF NOT EXISTS offices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text UNIQUE NOT NULL,
    username text UNIQUE NOT NULL,
    password_hash text NOT NULL,
    slot_capacity integer NOT NULL DEFAULT 2,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  ```

  c. `holidays` table:
  ```sql
  CREATE TABLE IF NOT EXISTS holidays (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    date date UNIQUE NOT NULL,
    label text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  ```

  d. Alter `appointments` to add `status`:
  ```sql
  ALTER TABLE appointments ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';
  ```

  e. RLS policies:
  - `offices`: SELECT open to `anon` and `authenticated`
  - `holidays`: SELECT open to `anon` and `authenticated`
  - `appointments`: UPDATE open (for doctor status changes) — policy: `FOR UPDATE USING (true) WITH CHECK (true)` for `authenticated` role
  - Enable RLS on both tables: `ALTER TABLE offices ENABLE ROW LEVEL SECURITY;` etc.

  f. Seed 9 offices from `SchedulePickerView.tsx`'s `ALL_OFFICES` array. Use `crypt('Welcome@123', gen_salt('bf'))` for `password_hash`. The `username` should be a slug (lowercase, hyphens) derived from the office name. The exact 9 names (verbatim from `ALL_OFFICES`):
  - `'Obstetrics & Gynecology (OB-GYNE)'` → username `ob-gyne`
  - `'Pediatrics (Pedia)'` → username `pediatrics`
  - `'General Surgery'` → username `general-surgery`
  - `'Orthopedics (Ortho)'` → username `orthopedics`
  - `'Family Medicine'` → username `family-medicine`
  - `'Adult Medicine / Internal Medicine'` → username `internal-medicine`
  - `'Dermatology (Derma)'` → username `dermatology`
  - `'Ophthalmology (Optha / Eye Clinic)'` → username `ophthalmology`
  - `'ENT (Ear, Nose, Throat)'` → username `ent`
  - Also seed `'PhilHealth Yakap Clinic'` → username `philhealth-yakap`

  Use `INSERT INTO offices ... ON CONFLICT (username) DO NOTHING` so the seed is idempotent.

  g. Seed 2025 + 2026 Philippine national holidays matching the exact dates already hardcoded in `SchedulePickerView.tsx`'s `HOLIDAYS` Set, plus add labels for each. Use `ON CONFLICT (date) DO NOTHING`.

  Verify: File is valid SQL (no application code imports it). `npm run build` passes — this file is not compiled.

---

- [ ] 3. **Append environment variables to `.env`**

  Append to the existing `c:\Users\Hamah\Downloads\WEB-SYSTEMS\OPD-System\apmc-frontend\.env` — DO NOT overwrite. The file currently only contains `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

  Generate values using Node.js `crypto.randomBytes` (not `Math.random`):
  - `JWT_SECRET`: 64-character random hex string → `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
  - `ADMIN_PASSWORD`: 16-character random base64url string → `node -e "console.log(require('crypto').randomBytes(12).toString('base64url'))"`
  - `HEAD_PASSWORD`: same generation

  Append exactly:
  ```
  # Staff Authentication
  JWT_SECRET=<generated-64-hex>
  SUPABASE_SERVICE_ROLE_KEY=REPLACE_WITH_YOUR_SUPABASE_SERVICE_ROLE_KEY
  ADMIN_USERNAME=apmc_admin
  ADMIN_PASSWORD=<generated-16-base64url>
  HEAD_USERNAME=apmc_head
  HEAD_PASSWORD=<generated-16-base64url>
  ```

  Files: `.env` (append only)

  Verify: `npm run build` still passes (env vars are read at runtime, not build time, except NEXT_PUBLIC_ ones).

---

- [ ] 4. **Create `lib/supabase-admin.ts`**

  Server-only Supabase client that uses `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS. Import this only from API routes, never from client components.

  Files: `lib/supabase-admin.ts` (new)

  ```ts
  import 'server-only';
  import { createClient } from '@supabase/supabase-js';

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  ```

  Verify: `npm run build` — no TypeScript errors. The `server-only` import will cause a build error if this module is accidentally imported in a client component.

---

- [ ] 5. **Create `lib/auth.ts`**

  JWT sign/verify using `jose@5`. Sign with `HS256`, read secret from `JWT_SECRET` env var.

  Files: `lib/auth.ts` (new)

  ```ts
  import 'server-only';
  import { SignJWT, jwtVerify } from 'jose';

  export type Role = 'doctor' | 'opd_head' | 'admin';

  export interface SessionPayload {
    role: Role;
    username: string;
    officeName?: string;   // for doctor role
    officeId?: string;     // for doctor role
    iat?: number;
    exp?: number;
  }

  const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

  export async function signToken(
    payload: Omit<SessionPayload, 'iat' | 'exp'>,
    expiresIn: string = '8h'
  ): Promise<string> {
    return new SignJWT(payload as Record<string, unknown>)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(expiresIn)
      .sign(secret);
  }

  export async function verifyToken(token: string): Promise<SessionPayload | null> {
    try {
      const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });
      return payload as unknown as SessionPayload;
    } catch {
      return null;
    }
  }
  ```

  Verify: `npm run build` — no TypeScript errors, `jose` import resolves.

---

- [ ] 6. **Create `proxy.ts` at the project root** (replaces `middleware.ts` in Next.js 16)

  Protect `/doctor/dashboard`, `/head/dashboard`, `/admin/dashboard`. Read JWT from httpOnly cookie `apmc_session`. Redirect unauthenticated/wrong-role requests to the respective login page. Do NOT protect login pages or API routes.

  Files: `proxy.ts` (new, at project root — same level as `app/`)

  Logic:
  - Export a named function `proxy(request: NextRequest)` — NOT `middleware`
  - `config.matcher` covers the three dashboard paths only
  - Read `request.cookies.get('apmc_session')?.value`
  - Call `verifyToken(token)` — but note: `proxy.ts` runs in the Node.js runtime (confirmed in Next.js 16 proxy docs: "Proxy defaults to using the Node.js runtime"); jose HS256 is safe to use here
  - If no token or null result: redirect to the appropriate login page based on pathname prefix (`/doctor/` → `/doctor/login`, `/head/` → `/head/login`, `/admin/` → `/admin/login`)
  - If token exists but role does not match the path prefix: redirect to the matching login page
  - Role-to-path mapping: `'doctor'` → `/doctor/dashboard`, `'opd_head'` → `/head/dashboard`, `'admin'` → `/admin/dashboard`
  - If authenticated with correct role: `return NextResponse.next()`

  ```ts
  import { NextResponse } from 'next/server';
  import type { NextRequest } from 'next/server';
  import { verifyToken } from '@/lib/auth';

  export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const token = request.cookies.get('apmc_session')?.value;

    const loginRedirect = (path: string) =>
      NextResponse.redirect(new URL(path, request.url));

    if (pathname.startsWith('/doctor/dashboard')) {
      if (!token) return loginRedirect('/doctor/login');
      const payload = await verifyToken(token);
      if (!payload || payload.role !== 'doctor') return loginRedirect('/doctor/login');
    }

    if (pathname.startsWith('/head/dashboard')) {
      if (!token) return loginRedirect('/head/login');
      const payload = await verifyToken(token);
      if (!payload || payload.role !== 'opd_head') return loginRedirect('/head/login');
    }

    if (pathname.startsWith('/admin/dashboard')) {
      if (!token) return loginRedirect('/admin/login');
      const payload = await verifyToken(token);
      if (!payload || payload.role !== 'admin') return loginRedirect('/admin/login');
    }

    return NextResponse.next();
  }

  export const config = {
    matcher: ['/doctor/dashboard', '/head/dashboard', '/admin/dashboard'],
  };
  ```

  Verify: `npm run build` — no errors. Navigating to `/doctor/dashboard` without a cookie should redirect to `/doctor/login`.

---

- [ ] 7. **Create public API routes for patient booking**

  These replace the hardcoded data in `SchedulePickerView.tsx`.

  Files:
  - `app/api/offices/route.ts` (new)
  - `app/api/holidays/route.ts` (new)

  **`app/api/offices/route.ts`**:
  - `GET`: query `supabase` (anon client) for `offices` where `is_active = true`, return `[{ id, name }]` ordered by `name`. Use the public anon client (not admin) since RLS SELECT is open to anon.

  **`app/api/holidays/route.ts`**:
  - `GET`: query `supabase` (anon client) for all `holidays`, return `{ dates: string[] }` where each element is `YYYY-MM-DD`. Order by `date`.

  Pattern to follow: `app/api/appointments/route.ts` — use `NextResponse.json()`, handle errors with `{ error: '...' }` + status 500.

  Verify: `npm run build` — no TypeScript errors. With Supabase configured, `GET /api/offices` and `GET /api/holidays` return JSON.

---

- [ ] 8. **Update `SchedulePickerView.tsx` to fetch offices and holidays dynamically**

  Replace the two hardcoded data sources. Keep all existing UI, calendar logic, slot logic, and props interface completely intact.

  Files: `components/booking/SchedulePickerView.tsx` (modify)

  Changes:
  a. Remove the `ALL_OFFICES` constant array (lines defining the 9-element array).
  b. Remove the `HOLIDAYS` Set constant and its hardcoded date strings.
  c. Add state: `const [fetchedOffices, setFetchedOffices] = useState<string[]>([])` and `const [holidaySet, setHolidaySet] = useState<Set<string>>(new Set())`.
  d. Add a `useEffect` on mount (empty deps `[]`) that fetches both endpoints in parallel:
     ```ts
     useEffect(() => {
       Promise.all([
         fetch('/api/offices').then(r => r.json()),
         fetch('/api/holidays').then(r => r.json()),
       ]).then(([officesData, holidaysData]) => {
         if (officesData && Array.isArray(officesData)) {
           setFetchedOffices(officesData.map((o: { name: string }) => o.name));
         }
         if (holidaysData?.dates && Array.isArray(holidaysData.dates)) {
           setHolidaySet(new Set<string>(holidaysData.dates));
         }
       }).catch(() => {
         // Fallback: keep empty state; calendar remains functional without holidays
       });
     }, []);
     ```
  e. Update the `offices` `useMemo` to read from `fetchedOffices` instead of `ALL_OFFICES`:
     ```ts
     const offices = useMemo(() => {
       if (category === 'philhealth-yakap') return [PHILHEALTH_OFFICE];
       return fetchedOffices;
     }, [category, fetchedOffices]);
     ```
  f. Replace every reference to `HOLIDAYS.has(dateStr)` with `holidaySet.has(dateStr)` in `calendarData` useMemo. There is exactly one such reference in the `isHoliday` line inside the day loop.
  g. Keep `PHILHEALTH_OFFICE` constant unchanged.
  h. Keep `SLOTS`, `TIME_SLOTS`, `formatSlotLabel`, `convertToFullSlotFormat`, `getFullSlotIndices`, `calendarData` useMemo, slot availability `useEffect`, and all JSX completely unchanged.

  Verify: `npm run build` — no TypeScript errors. Calendar still renders; office dropdown populates from API.

---

- [ ] 9. **Create Doctor login API route**

  Files: `app/api/doctor/login/route.ts` (new)

  - `POST`: read `{ username, password }` from request JSON
  - Query `supabaseAdmin` for the office matching `username` and `is_active = true`
  - Verify password using Supabase RPC or raw SQL: call a Supabase RPC `verify_password(plain, hash)` that runs `SELECT crypt($1, $2) = $2` — OR use `supabaseAdmin.from('offices').select('id, name, password_hash').eq('username', username).single()` then compare with a second RPC `crypt_check(plain, hash)`.
  - **Decision**: Use a direct SQL query via `supabaseAdmin.rpc('verify_office_password', { p_username: username, p_password: password })`. This RPC must be created in the schema SQL (add to `schema-staff.sql`): `CREATE OR REPLACE FUNCTION verify_office_password(p_username text, p_password text) RETURNS TABLE(id uuid, name text, is_active boolean) LANGUAGE sql SECURITY DEFINER AS $$ SELECT id, name, is_active FROM offices WHERE username = p_username AND crypt(p_password, password_hash) = password_hash AND is_active = true; $$;`
  - If RPC returns no row: return `{ error: 'Invalid credentials' }` status 401
  - If valid: `signToken({ role: 'doctor', username, officeName: office.name, officeId: office.id }, '8h')`
  - Set httpOnly cookie: `(await cookies()).set('apmc_session', token, { httpOnly: true, secure: true, sameSite: 'strict', path: '/', maxAge: 8 * 3600 })`
  - Return `{ success: true, officeName: office.name }`

  Verify: `npm run build` — no TypeScript errors.

---

- [ ] 10. **Create Doctor logout API route**

  Files: `app/api/doctor/logout/route.ts` (new)

  - `POST`: `(await cookies()).set('apmc_session', '', { httpOnly: true, secure: true, sameSite: 'strict', path: '/', maxAge: 0 })` — setting maxAge to 0 expires the cookie immediately (per Next.js 16 cookies docs)
  - Return `{ success: true }`

  Verify: `npm run build` — no TypeScript errors.

---

- [ ] 11. **Create Doctor appointments API routes**

  Files:
  - `app/api/doctor/appointments/route.ts` (new)
  - `app/api/doctor/appointments/[id]/status/route.ts` (new)

  **`app/api/doctor/appointments/route.ts`**:
  - `GET`: verify `apmc_session` cookie, confirm `role === 'doctor'`. Read `?date=YYYY-MM-DD` from `request.nextUrl.searchParams`. Query `supabaseAdmin` for appointments matching `office = payload.officeName` AND `date = date`, ordered by `slot` ASC then `created_at` ASC. Return the array.

  **`app/api/doctor/appointments/[id]/status/route.ts`**:
  - `PATCH`: verify session (role doctor). Await `params` (Next.js 16: params is a Promise). Read `{ status }` from request JSON. Validate `status` is one of `'present' | 'no-show' | 'done'`. Update `supabaseAdmin.from('appointments').update({ status }).eq('id', id)`. Return `{ success: true }`.

  Pattern: follow `app/api/appointments/route.ts` for error handling shape. Always `await params` — see Breaking Change #2 above.

  Verify: `npm run build` — no TypeScript errors.

---

- [ ] 12. **Create Doctor login page**

  Files: `app/doctor/login/page.tsx` (new)

  Server Component that renders a client login form component. Keep the page itself a Server Component (no `'use client'`); put the form logic in the page directly or in a collocated client component. For simplicity, make the page itself `'use client'` since it needs `useState` and `fetch`.

  UI (match emerald/slate aesthetic from `Header.tsx`):
  - Full-screen `min-h-screen bg-slate-50 flex items-center justify-center`
  - Centered card: `max-w-md w-full bg-white border border-slate-200 rounded-sm shadow-md p-8`
  - Header: APMC seal (40×40) + `'Doctor / Office Login'` (text-xl font-bold slate-900) + subtitle (text-sm slate-500)
  - Form fields: username and password inputs with `border-2 border-slate-300 focus:border-emerald-600` styling (same as `SchedulePickerView.tsx` inputs)
  - Submit button: `bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 px-6 w-full rounded-sm uppercase tracking-wide`
  - Error display: red-600 text-sm below the form
  - On success: `router.push('/doctor/dashboard')` (use `useRouter` from `next/navigation`)

  Verify: `npm run build` — no TypeScript errors. Page renders at `/doctor/login`.

---

- [ ] 13. **Create Doctor dashboard page**

  Files: `app/doctor/dashboard/page.tsx` (new)

  This is a `'use client'` page (needs `useState`, `useEffect`, timers). The proxy already guards this route.

  Layout:
  - Top header bar: `bg-slate-900 border-b-[3px] border-emerald-600` — show office name from session OR read via API (call `GET /api/doctor/appointments?date=today` on mount to confirm auth, redirect to login if 401). Show logout button (POST to `/api/doctor/logout` then `router.push('/doctor/login')`).
  - Date picker: `<input type="date" />` defaulting to today's date in `YYYY-MM-DD` format. On change, refetch appointments.
  - Queue list table:
    - Columns: Slot Time, Patient Name, Category badge, Status badge, Actions
    - Category badge: NCC=blue, FUC=amber, PHY=purple (short codes from `CATEGORY_CODES` in `app/api/appointments/route.ts`)
    - Status badge: `pending`=slate, `present`=emerald, `no-show`=red, `done`=blue
    - Action buttons per row: "Present" / "No Show" / "Done" — each calls `PATCH /api/doctor/appointments/[id]/status`
    - Clicking a row opens a modal with full patient details (all fields from the appointment record)
  - Empty state: centered slate icon + "No appointments for this date" message
  - Patient detail modal: fixed overlay, white card, close button, display all fields (full_name, contact_number, age, sex, chief_complaint, etc.)
  - 15-minute idle timeout with 60-second warning modal:
    - Reuse the exact same pattern from `app/booking/page.tsx` — the implementation there uses `mousemove`, `keydown`, `click`, `scroll` event listeners, a warning timer at (totalTime - 60s), a countdown interval, and a modal with "Continue Session" / "Logout" buttons
    - Total time: 15 min (900,000 ms), warning at 14 min (840,000 ms)
    - On timeout: call logout API then redirect to `/doctor/login`

  Verify: `npm run build` — no TypeScript errors. Page renders at `/doctor/dashboard` (redirects to login if no cookie).

---

- [ ] 14. **Create Admin login API route and logout**

  Files:
  - `app/api/admin/login/route.ts` (new)
  - `app/api/admin/logout/route.ts` (new)

  **`app/api/admin/login/route.ts`**:
  - `POST`: read `{ username, password }` from JSON
  - Compare against `process.env.ADMIN_USERNAME` and `process.env.ADMIN_PASSWORD` using timing-safe comparison: `import { timingSafeEqual } from 'crypto'; const a = Buffer.from(username); const b = Buffer.from(process.env.ADMIN_USERNAME!); const match = a.length === b.length && timingSafeEqual(a, b);` — do same for password
  - If mismatch: return `{ error: 'Invalid credentials' }` status 401
  - If valid: `signToken({ role: 'admin', username }, '8h')`, set `apmc_session` cookie (same options as doctor login), return `{ success: true }`

  **`app/api/admin/logout/route.ts`**:
  - `POST`: expire the cookie (maxAge: 0), return `{ success: true }`

  Verify: `npm run build` — no TypeScript errors.

---

- [ ] 15. **Create Admin CRUD API routes**

  Files (all new):
  - `app/api/admin/offices/route.ts`
  - `app/api/admin/offices/[id]/route.ts`
  - `app/api/admin/holidays/route.ts`
  - `app/api/admin/credentials/route.ts`
  - `app/api/admin/stats/route.ts`

  All routes must verify the `apmc_session` cookie has `role === 'admin'` before proceeding. Extract this into a small helper: `async function requireAdmin(request: Request): Promise<SessionPayload | null>`.

  **`app/api/admin/offices/route.ts`**:
  - `GET`: return all offices (including inactive) from `supabaseAdmin`, ordered by `name`
  - `POST`: create new office. Body: `{ name, username, slot_capacity? }`. Generate initial password: `crypto.randomBytes(12).toString('base64url')`. Hash it via Supabase RPC `hash_password(plain)` which runs `SELECT crypt($1, gen_salt('bf'))` — add this RPC to `schema-staff.sql`. Insert into `offices`. Return `{ office, generated_password }` — password shown only once.

  **`app/api/admin/offices/[id]/route.ts`**:
  - `PATCH`: update `name`, `username`, or `slot_capacity`. Await `params` (Breaking Change #2).
  - `DELETE`: toggle `is_active` (soft delete). Set `is_active = !current_value`.

  **`app/api/admin/holidays/route.ts`**:
  - `GET`: return all holidays ordered by `date`
  - `POST`: insert holiday. Body: `{ date: 'YYYY-MM-DD', label: string }`. Reject duplicates (Supabase will return unique constraint error — catch and return 409).
  - `DELETE`: body `{ id }` — delete holiday by id.

  **`app/api/admin/credentials/route.ts`**:
  - `POST`: generate credentials for an existing office (generate new password, hash it, update `offices.password_hash`). Body: `{ officeId }`. Return `{ generated_password }` once.
  - `PATCH`: reset password. Body: `{ officeId, newPassword? }`. If `newPassword` not provided, generate one with `crypto.randomBytes(12).toString('base64url')`. Hash and save. Return `{ generated_password }`.

  **`app/api/admin/stats/route.ts`**:
  - `GET`: return `{ totalAppointments, totalToday, byStatus: { pending, present, done, noShow }, byOffice: [{ name, count }] }`. Query `supabaseAdmin`.

  Verify: `npm run build` — no TypeScript errors.

---

- [ ] 16. **Create Admin login page**

  Files: `app/admin/login/page.tsx` (new)

  Same layout pattern as Doctor login page (step 12). Title: "Admin Login". On success: `router.push('/admin/dashboard')`.

  Verify: `npm run build` — no TypeScript errors.

---

- [ ] 17. **Create Admin dashboard page**

  Files: `app/admin/dashboard/page.tsx` (new)

  `'use client'` page with 4 tabs: Overview, Offices, Holidays, Credentials.

  Header: `bg-slate-900 border-b-[3px] border-emerald-600` with title "Admin Dashboard" and logout button.

  Tab navigation: horizontal tab bar, `border-b-2 border-slate-200`, active tab: `border-b-2 border-emerald-600 text-emerald-700 font-bold`, inactive: `text-slate-600 hover:text-slate-900`.

  **Overview tab**:
  - 4 stat cards: Total Appointments, Today's Appointments, Completed (Done), Active Offices
  - Each card: `bg-white border border-slate-200 rounded-sm p-6`, large number in emerald-600, label in slate-500 uppercase text-xs
  - Bar chart: pure CSS/Tailwind — a `div` container with `flex items-end gap-1`. Each bar is a `div` with `bg-emerald-600`, width proportional to count (use inline `style={{ height: '${pct}%' }}`), labeled with office name below (rotated or truncated). Container height: `h-40`. Show "Appointments by Office (All Time)".

  **Offices tab**:
  - Table: Name, Username, Capacity, Status (Active/Inactive badge), Actions
  - Actions: Edit button (inline form or modal), Toggle Active/Inactive button
  - "Add Office" button opens a form (inline or modal): name, username, slot_capacity fields
  - On create: display the generated password in a one-time alert modal with copy button

  **Holidays tab**:
  - List grouped by month (use `Intl.DateTimeFormat` to format dates)
  - "Add Holiday" form: date input + label input + submit
  - Each item has a Delete button

  **Credentials tab**:
  - Table of offices with "Reset Password" button per row
  - On reset: show generated password in a one-time modal with copy button ("Save this password — it won't be shown again")

  Verify: `npm run build` — no TypeScript errors. All tabs render at `/admin/dashboard`.

---

- [ ] 18. **Create OPD Head login API routes**

  Files:
  - `app/api/head/login/route.ts` (new)
  - `app/api/head/logout/route.ts` (new)

  Same pattern as Admin login (step 14) but compare against `HEAD_USERNAME` / `HEAD_PASSWORD` env vars and sign `{ role: 'opd_head', username }`.

  Verify: `npm run build` — no TypeScript errors.

---

- [ ] 19. **Create OPD Head data API routes**

  Files:
  - `app/api/head/appointments/route.ts` (new)
  - `app/api/head/stats/route.ts` (new)

  Both require `role === 'opd_head'` session check.

  **`app/api/head/appointments/route.ts`**:
  - `GET`: accept optional query params `?date=`, `?office=`, `?status=`, `?category=`
  - Query `supabaseAdmin.from('appointments').select('*')` with `.eq()` filters applied only when params are present
  - Order by `date DESC, slot ASC`
  - Return the array

  **`app/api/head/stats/route.ts`**:
  - `GET`: return same shape as Admin stats: `{ totalAppointments, totalToday, byStatus, byOffice }`

  Verify: `npm run build` — no TypeScript errors.

---

- [ ] 20. **Create OPD Head login page**

  Files: `app/head/login/page.tsx` (new)

  Same pattern as Doctor/Admin login. Title: "OPD Head Login". On success: `router.push('/head/dashboard')`.

  Verify: `npm run build` — no TypeScript errors.

---

- [ ] 21. **Create OPD Head dashboard page**

  Files: `app/head/dashboard/page.tsx` (new)

  `'use client'` page with 2 tabs: Overview, Appointments.

  Header: same `bg-slate-900 border-b-[3px] border-emerald-600` bar with title "OPD Head Dashboard" and logout.

  **Overview tab**:
  - Identical 4 stat cards + CSS bar chart as Admin Overview (reuse same layout pattern — do not extract a shared component, just repeat the Tailwind markup to keep each page self-contained and avoid cross-page dependencies)

  **Appointments tab**:
  - Filter row: date picker, office dropdown (fetched from `/api/offices`), status select, category select — all on one row, "Apply Filters" button
  - Full table: Queue ID, Patient Name, Office, Date, Slot, Category badge, Status badge
  - Print button: `window.print()` — add a `@media print` CSS block (inline `<style>` tag) that hides the header/tabs/filters and shows only the table
  - Pagination: client-side, 20 rows per page, "Previous / Next" buttons

  Verify: `npm run build` — no TypeScript errors. All tabs render at `/head/dashboard`.

---

- [ ] 22. **Run final build and fix all errors**

  From `c:\Users\Hamah\Downloads\WEB-SYSTEMS\OPD-System\apmc-frontend`:

  ```
  npm run build
  ```

  Expected outcome: 0 TypeScript errors, 0 compilation errors. All routes listed in build output:
  ```
  ○ /                          (static)
  ○ /booking                   (static → client)
  ○ /doctor/login
  ○ /doctor/dashboard
  ○ /admin/login
  ○ /admin/dashboard
  ○ /head/login
  ○ /head/dashboard
  λ /api/offices
  λ /api/holidays
  λ /api/appointments
  λ /api/slots
  λ /api/doctor/login
  λ /api/doctor/logout
  λ /api/doctor/appointments
  λ /api/doctor/appointments/[id]/status
  λ /api/admin/login
  λ /api/admin/logout
  λ /api/admin/offices
  λ /api/admin/offices/[id]
  λ /api/admin/holidays
  λ /api/admin/credentials
  λ /api/admin/stats
  λ /api/head/login
  λ /api/head/logout
  λ /api/head/appointments
  λ /api/head/stats
  ```

  Fix any TypeScript errors before signalling complete. Common errors to watch:
  - Forgetting `await params` on dynamic route handlers (Breaking Change #2)
  - Forgetting `await cookies()` (Breaking Change #3)
  - Missing `'use client'` on pages with `useState`/`useEffect`/`useRouter`
  - Importing `lib/auth.ts` or `lib/supabase-admin.ts` from a client component (blocked by `server-only`)

  Verify: `npm run build` exits with code 0 and prints "Compiled successfully".

---

## File Manifest (complete list)

### New files to create

| File | Purpose |
|------|---------|
| `supabase/schema-staff.sql` | DDL + RLS + seed data — run in Supabase SQL editor |
| `lib/supabase-admin.ts` | Service-role Supabase client (server-only) |
| `lib/auth.ts` | jose@5 JWT sign/verify (server-only) |
| `proxy.ts` | Next.js 16 route guard (replaces middleware.ts) |
| `app/api/offices/route.ts` | Public GET active offices |
| `app/api/holidays/route.ts` | Public GET all holiday dates |
| `app/api/doctor/login/route.ts` | POST doctor login |
| `app/api/doctor/logout/route.ts` | POST doctor logout |
| `app/api/doctor/appointments/route.ts` | GET appointments by office+date |
| `app/api/doctor/appointments/[id]/status/route.ts` | PATCH appointment status |
| `app/api/admin/login/route.ts` | POST admin login |
| `app/api/admin/logout/route.ts` | POST admin logout |
| `app/api/admin/offices/route.ts` | GET all + POST create office |
| `app/api/admin/offices/[id]/route.ts` | PATCH + DELETE (toggle) office |
| `app/api/admin/holidays/route.ts` | GET + POST + DELETE holiday |
| `app/api/admin/credentials/route.ts` | POST generate + PATCH reset password |
| `app/api/admin/stats/route.ts` | GET aggregate stats |
| `app/api/head/login/route.ts` | POST head login |
| `app/api/head/logout/route.ts` | POST head logout |
| `app/api/head/appointments/route.ts` | GET appointments with filters |
| `app/api/head/stats/route.ts` | GET aggregate stats |
| `app/doctor/login/page.tsx` | Doctor login UI |
| `app/doctor/dashboard/page.tsx` | Doctor queue management UI |
| `app/admin/login/page.tsx` | Admin login UI |
| `app/admin/dashboard/page.tsx` | Admin management UI |
| `app/head/login/page.tsx` | OPD Head login UI |
| `app/head/dashboard/page.tsx` | OPD Head reporting UI |

### Existing files to modify

| File | Change |
|------|--------|
| `.env` | Append new env vars (never overwrite) |
| `components/booking/SchedulePickerView.tsx` | Replace hardcoded ALL_OFFICES + HOLIDAYS with API fetches |
| `supabase/schema-staff.sql` | Also add helper RPCs (`verify_office_password`, `hash_password`) |

### Files NOT to touch

| File | Reason |
|------|--------|
| `app/api/appointments/route.ts` | Existing patient booking — no changes needed |
| `app/api/slots/route.ts` | Existing slot availability — no changes needed |
| `app/booking/page.tsx` | Patient booking flow — no changes needed |
| `components/layout/Header.tsx` | Public header — staff pages use their own headers |
| `lib/supabase.ts` | Public anon client — unchanged |
| `lib/validation.ts` | Existing validators — unchanged |
| `next.config.ts` | No changes needed |
| `app/layout.tsx` | Root layout — unchanged |

---

## Design Decisions

1. **`proxy.ts` not `middleware.ts`**: Next.js 16 deprecated `middleware.js` and renamed it to `proxy.js`. The export must be named `proxy`, not `middleware`. The proxy docs confirm Node.js runtime is used by default, so `jose` HS256 is safe there.

2. **`await params` everywhere**: Route handler dynamic params are a Promise in Next.js 16 (breaking change from v15.0.0-RC). Every dynamic route handler (`[id]`, `[slug]`) must `const { id } = await params`.

3. **`await cookies()` everywhere**: The `cookies()` function from `next/headers` is async in Next.js 16. Every route handler setting or reading cookies must `const cookieStore = await cookies()`.

4. **`jose@5` for JWT, not `jsonwebtoken`**: The task requires `jose@5`. The Next.js 16 authentication guide explicitly recommends jose for stateless sessions with HS256. `jsonwebtoken` does not support the Edge runtime and has no ESM build; jose@5 is ESM-first and works in both Node.js and Edge contexts.

5. **Supabase RPC for password verification**: bcrypt comparison must happen inside the database (pgcrypto's `crypt()`) because `bcryptjs` is not an approved dependency. A SECURITY DEFINER function `verify_office_password` keeps the comparison server-side and avoids shipping the password_hash to the application layer.

6. **Admin/Head credentials from env vars**: Admin and Head accounts are singleton accounts stored in env vars, not in the database. This keeps the DB schema simple and matches the task spec. Timing-safe comparison via Node.js `crypto.timingSafeEqual` prevents timing attacks.

7. **Bar chart in pure CSS/Tailwind**: The task explicitly forbids recharts. The bar chart uses `flex items-end` with per-bar `height` set as inline style (percentage of max). No canvas, no SVG library, no new deps.

8. **`SchedulePickerView.tsx` fetch on mount**: Both office list and holiday set are fetched in a single parallel `Promise.all` in `useEffect([], [])`. The component stays functional immediately (empty dropdowns, holidays not blocked) and populates as data arrives. No loading spinner is added to avoid changing existing UX.

9. **`server-only` guard on `lib/auth.ts` and `lib/supabase-admin.ts`**: Both files contain secrets. The `import 'server-only'` statement causes a hard build error if either is accidentally imported by a client component, providing a compile-time safety net.

10. **Cookie name `apmc_session` shared across all three roles**: A single cookie name simplifies the proxy check. The JWT payload's `role` field distinguishes doctors from admin/head. The proxy reads the cookie once per protected route group and checks the role against the path prefix.
