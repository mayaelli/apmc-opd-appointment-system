# Staff-Side Build Notes

## Build Result
✅ `npm run build` — 0 TypeScript errors, 0 compilation errors  
Build tool: Next.js 16.4.0 (Turbopack)

## Files Created

### Database / Infrastructure
- `supabase/schema-staff.sql` — Full DDL: pgcrypto extension, offices table, holidays table, ALTER appointments add status, RLS policies, 4 RPC helper functions, 10 office seed rows, 38 Philippine national holiday seeds (2025 + 2026)

### Environment
- `.env` — Appended: `JWT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `HEAD_USERNAME`, `HEAD_PASSWORD`

### Library Files
- `lib/supabase-admin.ts` — Service-role Supabase client (server-only)
- `lib/auth.ts` — JWT sign/verify using jose@5 (server-only)

### Proxy (Auth Guard)
- `proxy.ts` — Next.js 16 proxy (replaces deprecated middleware.ts); protects `/doctor/dashboard`, `/head/dashboard`, `/admin/dashboard`

### Public API Routes
- `app/api/offices/route.ts` — GET active offices for booking form
- `app/api/holidays/route.ts` — GET holiday dates for booking form calendar

### Doctor API Routes
- `app/api/doctor/login/route.ts` — POST: pgcrypto RPC password verification, JWT cookie
- `app/api/doctor/logout/route.ts` — POST: clear session cookie
- `app/api/doctor/me/route.ts` — GET: return office info from JWT
- `app/api/doctor/appointments/route.ts` — GET: appointments for doctor's office by date
- `app/api/doctor/appointments/[id]/status/route.ts` — PATCH: update appointment status

### Admin API Routes
- `app/api/admin/login/route.ts` — POST: timing-safe env var comparison, JWT cookie
- `app/api/admin/logout/route.ts` — POST: clear session cookie
- `app/api/admin/offices/route.ts` — GET all offices; POST create with password
- `app/api/admin/offices/[id]/route.ts` — PATCH update; DELETE toggle active
- `app/api/admin/holidays/route.ts` — GET/POST/DELETE holidays
- `app/api/admin/credentials/route.ts` — POST/PATCH reset office passwords
- `app/api/admin/stats/route.ts` — GET dashboard statistics

### OPD Head API Routes
- `app/api/head/login/route.ts` — POST: timing-safe env var comparison
- `app/api/head/logout/route.ts` — POST: clear session cookie
- `app/api/head/appointments/route.ts` — GET with filters: date/office/status/category
- `app/api/head/stats/route.ts` — GET dashboard statistics

### Login Pages
- `app/doctor/login/page.tsx` — Doctor/Office login form
- `app/admin/login/page.tsx` — Admin login form
- `app/head/login/page.tsx` — OPD Head login form

### Dashboard Pages
- `app/doctor/dashboard/page.tsx` — Appointment queue table, status actions, patient detail modal, 15-min idle timeout
- `app/admin/dashboard/page.tsx` — 4 tabs: Overview (stats + bar chart), Offices (CRUD), Holidays (group by month), Credentials (password reset)
- `app/head/dashboard/page.tsx` — 2 tabs: Overview (stats + bar chart), Appointments (filters, pagination, print)

### Modified Files
- `components/booking/SchedulePickerView.tsx` — Removed hardcoded ALL_OFFICES and HOLIDAYS; added dynamic fetch from `/api/offices` and `/api/holidays` on mount

## Fixes Applied During Build

1. **`dynamic = 'force-dynamic'` incompatible with `cacheComponents`** — Removed all `dynamic` exports. With `cacheComponents: true`, cookies() calls outside try/catch naturally bail out of prerendering without needing the config.

2. **`new Date()` in client component initial state** — Moved `useState('')` (empty initial) and set date inside `useEffect` to avoid prerender error on `/doctor/dashboard`.

3. **`cookies()` inside try/catch caught the prerender bail-out throw** — Moved all `cookies()` / `requireAdmin()` / `requireHead()` calls to BEFORE the `try` block in GET handlers so the bail-out throw propagates correctly.

## Route Summary (29 routes)
All routes in the expected build output are present:
- Public: `/`, `/booking`, plus all API routes
- Doctor: `/doctor/login`, `/doctor/dashboard`, 5 API routes
- Admin: `/admin/login`, `/admin/dashboard`, 7 API routes  
- Head: `/head/login`, `/head/dashboard`, 4 API routes
- Proxy covers all three dashboard paths
