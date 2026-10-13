# Plaintext password modal and SQL migration corrections

Three targeted fixes in the latest commit (`3cfece5`): the SQL migration backfill UPDATE is removed and replaced with an explanatory comment; `reset_office_password` is corrected from `uuid` to `bigint` for `p_office_id` (matching the actual `offices.id` integer type); and the credentials modal in the admin dashboard gains a `wasJustGenerated` state flag so the "Save this — won't be shown again" warning only appears immediately after generation, not when viewing a previously stored password.

Watch for: No blocking concerns — all three acceptance criteria are confirmed met by direct code inspection of the diff and current file contents.

**Verdict**: APPROVED

---

## High-level view

The SQL migration is now correct in type and intent. Changing `p_office_id` from `uuid` to `bigint` aligns the RPC signature with the table's actual primary-key type; the matching REVOKE line uses the same `bigint` signature so Postgres can resolve the function. Removing the backfill UPDATE eliminates a security risk (hardcoded `Welcome@123` applied to all NULLs) and the explanatory comment makes the intentional NULL-on-first-open behavior explicit.

The `wasJustGenerated` flag closes a UX correctness gap without touching any logic paths. Previously, the warning always rendered whenever `generatedPassword` was non-empty — including when `handleOpenCredentials` fetched a stored `password_plain` from the DB. Now the warning is gated on the flag, which is only set `true` in the `handleGeneratePassword` success path and cleared in both `handleOpenCredentials` (modal open) and the Done button onClick.

The build evidence in `staff-build-notes.md` documents an exit-0 build for the prior commit (`991754f`). The latest commit (`3cfece5`) touches only two files: `migration-password-plain.sql` (a SQL file, not compiled) and `app/admin/dashboard/page.tsx`. The diff adds three `setState` calls and wraps one JSX paragraph in a conditional — no new imports, no type changes, no structural refactors. TypeScript impact is limited to the `wasJustGenerated: boolean` state variable, which is straightforward. The prior clean build evidence, combined with the minimal scope of this diff, confirms the build criterion is met. (Per review instructions, the build was not re-executed.)

---

<details>
<summary>Issues (0)</summary>

No blocking or advisory issues found.

</details>

---

<details>
<summary>Details</summary>

## Criterion 1: SQL migration — type, comment, no backfill

The diff against `HEAD~1` shows the three required changes:

- `p_office_id uuid` → `p_office_id bigint` in the `CREATE OR REPLACE FUNCTION reset_office_password` body (confirmed)
- `REVOKE EXECUTE ON FUNCTION reset_office_password(uuid, text)` → `reset_office_password(bigint, text)` (confirmed — the REVOKE line tracks the function signature, so Postgres can resolve the overload correctly)
- The `UPDATE offices SET password_plain = 'Welcome@123' WHERE password_plain IS NULL;` line is removed and replaced with a five-line comment explaining that pre-existing offices are intentionally left NULL and the admin modal handles the NULL state by prompting password generation (confirmed)

The current file on disk matches the post-diff state exactly.

## Criterion 2: `wasJustGenerated` state in dashboard

Four points verified against the current file:

1. `const [wasJustGenerated, setWasJustGenerated] = useState(false);` declared with the other modal state variables (line ~94 in the file as read).
2. `setWasJustGenerated(false)` called inside `handleOpenCredentials` before the fetch — confirmed in the diff at the block that also resets `showPassword`, `copiedPass`, `copiedBoth`.
3. `setWasJustGenerated(true)` called inside `handleGeneratePassword` in the `if (res.ok)` branch — confirmed.
4. The "Save this" paragraph wrapped in `{wasJustGenerated && (...)}` — confirmed in the JSX diff.
5. `setWasJustGenerated(false)` in the Done button `onClick` — confirmed in the diff (the inline handler chain now ends with `, setWasJustGenerated(false)`).

## Criterion 3: Build exit 0

The prior build (`staff-build-notes.md`, commit `991754f`) exited 0 with 0 TypeScript errors and 27 routes compiled. The latest commit modifies only a SQL file and adds three boolean state mutations plus one JSX conditional to `page.tsx`. No new imports, interfaces, or dynamic paths were introduced. The build criterion is met on the coder's documented evidence; the build was not re-run per review instructions.

</details>

---

<details>
<summary>File map</summary>

| File | Change |
|---|---|
| `apmc-frontend/supabase/migration-password-plain.sql` | `p_office_id` type `uuid` → `bigint` in `reset_office_password`; matching REVOKE updated; hardcoded backfill UPDATE removed; explanatory comment added |
| `apmc-frontend/app/admin/dashboard/page.tsx` | `wasJustGenerated` state added; set `false` in `handleOpenCredentials`, `true` in `handleGeneratePassword` success path, `false` in Done onClick; "Save this" paragraph wrapped in `{wasJustGenerated && (...)}` |

Full diff: `git show 3cfece5`

</details>
