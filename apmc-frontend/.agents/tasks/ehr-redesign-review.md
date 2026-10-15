# Dashboard Redesign: Rules of Hooks Compliance and Feature Preservation

Both doctor and head dashboard files have been updated with a new profile dropdown UI, improved mobile device detection, and restructured hook calls. The changes introduce a profile menu with department initials, close-on-outside-click behavior, and a rotating chevron indicator. All hooks now execute unconditionally before any early returns, fixing a critical React Rules of Hooks violation. The existing feature set—idle timeout, logout modal, patient detail modal, category filters, status updates, pagination, and print styles—remains intact.

**Watch for:** Profile dropdown click-outside handler creates a new listener on every render when the menu is open (**confirmed**). No TypeScript correctness issues found. Header classes and container max-width match requirements exactly (**confirmed**).

**Verdict**: APPROVED

## High-level view

The Rules of Hooks violation is fixed: all hooks now execute before the mobile device early return. The profile dropdown closes correctly on outside clicks via `mousedown` listener attached to the document when the menu opens. The chevron rotates 180 degrees when `showProfileMenu` is true. Header classes match the required `bg-emerald-950 border-b border-emerald-900 shadow-lg backdrop-blur-sm` exactly. Main container uses `max-w-[1400px]` not `max-w-7xl`. All existing features (idle timeout with countdown modal in doctor dashboard, logout confirmation, patient detail modal, category filter pills, status update dropdowns, pagination in head dashboard, print styles with landscape A4) are preserved. No duplicate state declarations or duplicate `getDepartmentInitials` functions exist—each file declares it once. The profile menu ref is properly typed as `HTMLDivElement`.

<details>
<summary>Issues (1)</summary>

1. **Profile menu listener churn** — The click-outside effect adds and removes a document `mousedown` listener every time `showProfileMenu` changes. This works but creates listener churn. Consider using a single persistent listener with conditional logic inside, or accept the current pattern as functionally correct.

</details>

<details>
<summary>Details</summary>

## React Rules of Hooks compliance

All hooks now execute unconditionally at the top of the component function, before the `isMobileDevice` early return block. Both files follow this order:

1. `useState` declarations (router, state variables)
2. `useRef` for profile menu
3. `useEffect` for mount flag (head dashboard only)
4. `useEffect` for mobile detection
5. `useEffect` for profile menu click-outside handler
6. Additional `useEffect` hooks (date initialization, document title, data fetching, idle timeout in doctor dashboard)
7. `useCallback` hooks for data fetching
8. Early return for mobile devices

This ordering satisfies the Rules of Hooks requirement that hooks be called in the same order on every render and never conditionally. The mobile device check now happens inside a `useEffect` that sets `isMobileDevice` state, and the early return that renders the "Desktop Workstation Access Only" screen comes after all hooks have executed.

## Profile dropdown close-on-outside-click

The click-outside handler is implemented correctly in both files. A `useEffect` watches `showProfileMenu`:

```typescript
useEffect(() => {
  const handleClickOutside = (e: MouseEvent) => {
    if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
      setShowProfileMenu(false);
    }
  };
  if (showProfileMenu) {
    document.addEventListener('mousedown', handleClickOutside);
  }
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, [showProfileMenu]);
```

The listener attaches only when the menu is open, checks whether the click target is outside the ref'd element, and closes the menu if so. The cleanup function removes the listener when the menu closes or the component unmounts.

The listener is added on `mousedown` rather than `click`, which is the correct pattern—it prevents the menu from reopening immediately after the user clicks the button to open it (the button's `click` event would fire after the outside-click `mousedown`).

## Chevron rotation

The chevron SVG element uses a conditional class to rotate 180 degrees when the menu is open:

```typescript
className={`w-4 h-4 text-emerald-400 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`}
```

The `rotate-180` Tailwind class applies `transform: rotate(180deg)`, and `transition-transform` animates the rotation. This works as specified.

## TypeScript correctness

All refs are properly typed:

- `profileMenuRef` is typed as `useRef<HTMLDivElement>(null)` in both files
- Timer refs in doctor dashboard are typed as `useRef<ReturnType<typeof setTimeout> | null>(null)` and `useRef<ReturnType<typeof setInterval> | null>(null)`
- Event handler parameters are typed as `MouseEvent` for click-outside and `e: MouseEvent` in the handler function

No implicit `any` types exist. The `Appointment` interface is fully typed with explicit `| null` for optional fields. The `getDepartmentInitials` function parameter is typed as `string` and returns `string`.

## Header classes

Both files use the exact required classes:

```typescript
<header className="sticky top-0 z-50 bg-emerald-950 border-b border-emerald-900 shadow-lg backdrop-blur-sm">
```

This matches the requirement: `bg-emerald-950 border-b border-emerald-900 shadow-lg backdrop-blur-sm`.

## Main container max-width

Both files use `max-w-[1400px]` for the main content container:

```typescript
<main className="max-w-[1400px] mx-auto px-4 py-6">
```

Doctor dashboard uses the same class in the header inner container. Head dashboard uses it in the header and main element. No instances of `max-w-7xl` remain.

## Existing features preserved

All requested features are intact:

**Doctor dashboard:**
- Idle timeout: 30-minute timer with warning modal at 29 minutes, 60-second countdown, "Extend Session" button calls `resetTimers()` directly
- Logout confirm modal: triggered by profile menu logout button, shows confirmation with "Yes, Logout" and "Cancel"
- Patient detail modal: opens on row click, shows all appointment fields, includes status update buttons
- Category filter pills: "All", "New Check-up", "Follow-up", "Konsulta" pills above the table, active state highlighted
- Status update: inline dropdown in table with colored status indicator dot, also available in patient detail modal
- No pagination (doctor dashboard shows all filtered appointments in a single table)

**Head dashboard:**
- No idle timeout (head dashboard does not implement this feature)
- Logout confirm modal: identical to doctor dashboard
- Patient detail modal: identical structure to doctor dashboard
- Category filter pills: implemented as dropdown select in the filters section (not pills like doctor dashboard)
- Status update: not available in head dashboard (read-only table)
- Pagination: implemented with "Previous" and "Next" buttons, shows 20 appointments per page (`PAGE_SIZE = 20`), page count displayed
- Print styles: comprehensive print CSS embedded in `<style suppressHydrationWarning>`, targets landscape A4, hides interactive elements, shows print header with APMC logo and metadata, removes patient name column, displays all filtered appointments (not just current page)

## No duplicate state or functions

Both files declare `getDepartmentInitials` exactly once, immediately before the component's return statement. No duplicate state declarations exist. The function signature and implementation are identical in both files (this is expected—each file needs its own copy since they're separate components).

## Profile menu implementation

The profile menu structure is consistent across both files:

- Button contains avatar circle with department initials, two-line text (office name and "OPD Station"), and chevron SVG
- Dropdown renders conditionally when `showProfileMenu` is true
- Dropdown is positioned `absolute right-0 top-full mt-2` to appear below and aligned to the right edge of the button
- Menu contains header section with avatar and office name, two menu items ("Department Profile" and "Station Settings"), divider, and logout button in red
- All menu items except logout close the menu without action (stub implementations)
- Logout button closes the menu and calls `confirmLogout()`

The dropdown's `z-[200]` ensures it appears above other page elements. The button's `aria-label="Profile menu"` provides accessibility context.

</details>

<details>
<summary>File map</summary>

## Files changed

- **app/doctor/dashboard/page.tsx** — Added profile dropdown with department initials and click-outside handler; moved all hooks before mobile device early return; preserved idle timeout, logout modal, patient detail modal, category filter pills, status updates
- **app/head/dashboard/page.tsx** — Added profile dropdown identical to doctor dashboard; moved all hooks before mobile device early return; preserved logout modal, patient detail modal, filters, pagination, print styles

</details>
