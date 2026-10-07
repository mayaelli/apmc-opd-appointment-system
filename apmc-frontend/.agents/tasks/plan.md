# Implementation Plan: APMC OPD Elite Government-Grade UI Overhaul

This plan transforms all 10 components/pages to world-class institutional standard following passport.gov.ph design DNA: deep slate backgrounds, emerald accents, formal typography (Arial/system sans-serif), sharp borders, uppercase tracking-wide labels, and structured government-portal aesthetics.

## Overview

- **Project**: Next.js 16.4.0 App Router + React 19.3.0 + TypeScript + Tailwind CSS 4
- **Build Command**: `npm run build`
- **Test Command**: `npm run dev` (manual browser testing at http://localhost:3000)
- **Key Constraint**: Next.js 16.4.0 has breaking changes - AGENTS.md requires reading node_modules/next/dist/docs/ before coding
- **Existing Assets**: APMC seal logo confirmed at public/Amai_Pakpak_Medical_Center_seal.png

## Implementation Order

Features are ordered by dependency and page flow (landing → booking flow):

---

## Feature 1: Header & Footer Institutional Upgrade

**Files**: 
- components/layout/Header.tsx
- components/layout/Footer.tsx

**Changes**:

### Header.tsx
- Add amber-400 emergency notification strip at top (h-8, slate-800 bg): '⚠ For urgent medical emergencies, proceed directly to the Emergency Room or dial 911.'
- Change main header band: slate-900 bg (not white), white text, emerald-600 3px bottom border, h-20
- Logo area: seal + 'APMC Outpatient Department' title (white, bold, text-base) + 'Amai Pakpak Medical Center' subtitle (slate-300, text-xs)
- Right side: white outlined 'Official Portal' badge + vertical separator | + RP flag emoji + 'Republic of the Philippines' (slate-300, text-xs)
- Maintain sticky top-0 z-50

### Footer.tsx
- Replace single-line footer with formal institutional footer
- Dark slate-800 bg, white/slate-300 text, py-8, border-t-4 border-emerald-600
- Three-column grid (stack on mobile):
  - Left: 'APMC OPD System' heading + description + address placeholder
  - Center: 'Quick Links' (Home, Terms, Privacy, Requirements)
  - Right: 'Emergency Contacts' (ER, Hotline, 911 note)
- Bottom row: copyright '© 2026 Amai Pakpak Medical Center. All rights reserved.' (slate-400, text-xs) + 'Powered by APMC IT Department'

**TypeScript Notes**: No props changes. Both components remain standalone with no interface updates.

**Verify**: 
```bash
npm run build
# Must complete with 0 errors
npm run dev
# Navigate to http://localhost:3000
# Visually confirm: amber emergency strip at top, dark slate header with white text, emerald bottom border
# Scroll to bottom: dark slate footer with three columns (desktop), all sections render
# Test mobile viewport (375px): header and footer stack properly
```

---

## Feature 2: Landing Page & Terms Elite Redesign

**Files**:
- app/page.tsx
- components/terms/TermsAndConditionsView.tsx

**Changes**:

### app/page.tsx
- Change main wrapper to full-page slate-50 bg
- Add hero section at top (before TermsAndConditionsView):
  - slate-900 bg, py-12, text-center
  - Large seal image (80×80)
  - 'APMC Outpatient Department' h1 (text-3xl, font-bold, white)
  - 'Online Appointment & Queue Management System' subtitle (text-slate-300)
- Keep Header/Footer layout, ensure TermsAndConditionsView renders with mt-8

### TermsAndConditionsView.tsx
- Card wrapper: max-w-3xl centered, white bg, border border-slate-300, rounded-sm
- Replace emerald-700 header band with section header:
  - 'TERMS & CONDITIONS' (uppercase, tracking-wide, text-slate-400, text-xs)
  - h2 'Before You Proceed' (text-2xl, font-bold, slate-900)
- Terms content: border-l-4 border-emerald-600 bg-emerald-50/50 p-6 with numbered list
- Consent checkbox row: border-t border-slate-200 pt-6 mt-6
- CTA button: full-width sm:w-auto, emerald-700 bg hover:emerald-800, uppercase tracking-wide font-bold, py-3.5 px-8, rounded-sm, 'PROCEED TO BOOKING'

**TypeScript Notes**: No props changes. TermsAndConditionsView remains a client component with internal state.

**Verify**:
```bash
npm run build
# Must complete with 0 errors
npm run dev
# Navigate to http://localhost:3000
# Confirm: dark hero section at top with large seal, white title, subtitle
# Scroll to terms card: white card with border, section header (not colored band), emerald left accent
# Check consent checkbox and click 'PROCEED TO BOOKING' - should navigate to /booking
# Test responsive on tablet (768px) and mobile (375px)
```

---

## Feature 3: Booking Layout & Navigation Polish

**Files**:
- app/booking/page.tsx

**Changes**:

### Page Structure
- Change page bg to slate-100 (not slate-50)
- Below Header, add dark breadcrumb bar:
  - slate-800 bg, py-3, border-b border-slate-700
  - 'Home › Appointment Booking' (slate-300, text-xs)
- Add page title section:
  - slate-900 bg, py-6, border-b-4 border-emerald-600
  - Centered 'OPD Appointment System' (text-2xl, font-bold, white)
  - Subtitle 'Complete all steps to secure your digital queue pass.' (text-slate-300, text-sm)
- Grid layout: max-w-7xl mx-auto, gap-6, py-8
  - Left sidebar (1/3): sticky top-28 (not top-24)
  - Right content (2/3): white card, border border-slate-300, rounded-sm, shadow-lg, p-8

### Timeout Modal
- Keep existing logic (showTimeoutWarning state, 9min warning + 1min countdown, activity tracking)
- Visual upgrades:
  - Backdrop: bg-black/60 (darker)
  - Modal card: border-t-[6px] border-red-600 (thicker), rounded-sm, shadow-2xl, p-8
  - Icon: red-600 circle bg-red-100, text-3xl
  - Title: 'Session Timeout Warning' (text-xl, font-bold, slate-900)
  - Countdown: bg-red-600 (not red-50), white text, text-6xl font-mono font-black, py-6, rounded-sm, 'seconds remaining' (white, text-sm)
  - Buttons: 'Continue Session' (emerald-700 hover:emerald-800, white, uppercase, font-bold, py-3), 'Exit' (slate-300 border-2 hover:bg-slate-50, uppercase)

**TypeScript Notes**: No interface changes. Keep all existing state types, navigation guards, and timeout logic unchanged.

**Verify**:
```bash
npm run build
# Must complete with 0 errors
npm run dev
# Navigate to /booking
# Confirm: slate-100 bg, dark breadcrumb bar, slate-900 title section, 1/3 + 2/3 grid
# Test navigation guard: select category, click browser back - should show alert
# Wait 9 minutes (or temporarily reduce WARNING_TIME) - modal should appear with red accent
# Click 'Continue Session' - modal dismisses, flow continues
```

---

## Feature 4: Progress Tracker Elite Styling

**Files**:
- components/booking/BookingSidebarTracker.tsx

**Changes**:

### Header Band
- Change from emerald-700 to slate-900 bg
- py-4 px-5, border-b-4 border-emerald-600
- Seal image + 'APMC OPD' (white, font-bold, text-sm) + 'Appointment Progress' subtitle (slate-300, text-xs)

### Step Rows
- Each step: py-4 px-5, border-b border-slate-100 last:border-0
- Pending: white bg, slate-400 text, slate-200 circle
- Active: emerald-600 bg (not emerald-700), white text, white circle with emerald-600 number
- Completed: emerald-50 bg, emerald-700 text, emerald-600 circle with white check

### Bottom Reminder
- border-l-4 border-amber-500 bg-amber-50 mx-4 mb-4 px-4 py-3 text-xs amber-800

**TypeScript Notes**: Interface BookingSidebarTrackerProps unchanged (currentStep: number). Keep existing step array and logic.

**Verify**:
```bash
npm run build
# Must complete with 0 errors
npm run dev
# Navigate to /booking
# Confirm: sidebar on left with slate-900 header, emerald-600 bottom border
# Advance through steps: verify emerald-600 bg for active, emerald-50 for completed, white for pending
# Confirm seal image, step labels, amber reminder render correctly
# Test mobile (<1024px): sidebar stacks above content
```

---

## Feature 5: Category Selector Formal Design

**Files**:
- components/booking/CategorySelector.tsx

**Changes**:

### Section Header
- 'Step 1: Select Consultation Type' (uppercase, tracking-widest, text-xs, slate-400)
- h2 'Choose Your Visit Category' (text-xl, font-bold, slate-900, mt-1)

### Info Callout
- border-l-4 border-blue-500 bg-blue-50 p-4 text-sm blue-800 mb-6
- Text: 'Each category maintains independent scheduling and intake requirements.'

### Category Cards
- Unselected: border-2 border-slate-300 hover:border-slate-400 hover:bg-slate-50 cursor-pointer
- Selected: border-2 border-emerald-600 bg-emerald-50 ring-2 ring-emerald-600/20 border-l-[6px] border-l-emerald-600
- Badge: emerald-700 bg, white text, uppercase, text-xs font-bold, px-3 py-1, rounded-sm (not pill)
- Title: text-base font-bold slate-900
- Description: text-sm slate-600 mt-1
- Checkmark: emerald-600 circle with white check (selected) or slate-300 empty circle (unselected)

### Footer
- border-t border-slate-200 pt-6 mt-6
- Next button: emerald-700 hover:emerald-800 uppercase tracking-wide font-bold py-3 px-6 rounded-sm disabled:bg-slate-300

**TypeScript Notes**: Interface CategorySelectorProps unchanged. Keep existing categories array and selection logic.

**Verify**:
```bash
npm run build
# Must complete with 0 errors
npm run dev
# Navigate to /booking
# Confirm: uppercase 'Step 1' label, blue info callout above cards
# Click categories: verify border-2, ring-2 emerald accent, 6px left border on selection
# Confirm badge has rounded-sm (not pill) and uppercase text
# Click Next (after selecting) - should navigate to step 2
# Test hover on unselected cards: border-slate-400, bg-slate-50
```

---

## Feature 6: Schedule Picker Government-Grade UI

**Files**:
- components/booking/SchedulePickerView.tsx

**Changes**:

### Section Header
- 'Step 2: Office & Schedule' (uppercase, tracking-widest, text-xs, slate-400)
- h2 'Select Department, Date, and Time Slot' (text-xl, font-bold, slate-900, mt-1)

### Office Dropdown
- Label: 'ASSIGNED OFFICE / DEPARTMENT' (uppercase, tracking-widest, text-xs, slate-500, font-semibold, mb-2)
- Dropdown: border-2 border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 rounded-sm px-4 py-3 text-sm font-medium slate-900 bg-white
- Keep existing offices list (ALL_OFFICES for general, PHILHEALTH_OFFICE for philhealth-yakap)

### Calendar
- Label: 'APPOINTMENT DATE' (uppercase, tracking-widest, text-xs, slate-500, font-semibold, mb-3)
- Container: border-2 border-slate-300 rounded-sm overflow-hidden
- Month nav bar: slate-800 bg (not slate-50), white text, font-bold uppercase tracking-wide text-sm, py-3, border-b-2 border-emerald-600
- Day headers: slate-700 bg, white text, uppercase tracking-widest text-xs font-bold py-2
- Date cells:
  - Available weekday: white bg, emerald-700 font-semibold, hover:bg-emerald-50, border border-emerald-200, cursor-pointer
  - Selected: emerald-600 bg white text font-bold
  - Past/holiday/disabled: slate-100 bg slate-300 text cursor-not-allowed
  - Holiday indicator: small red-500 dot below date
- Legend row: slate-50 bg px-4 py-2 flex gap-5 text-xs slate-600
- Keep existing calendar logic (Mon-Fri only, HOLIDAYS Set, date calculation)

### Slot Limit Callout
- border-l-4 border-slate-500 bg-slate-50 p-4 text-sm slate-700 font-medium
- Text: '⚠ Slots are strictly limited to 2 patients per 30-minute interval. Fully booked slots cannot be selected.'

### Time Slot Grid
- Grid: 4 cols desktop, 3 tablet, 2 mobile, gap-3
- Available: white bg, border-2 border-slate-300, hover:border-emerald-600 hover:bg-emerald-50, text-sm font-semibold slate-900, px-3 py-2.5 rounded-sm
- Selected: emerald-600 bg white text font-bold border-2 border-emerald-600
- Full: slate-100 bg slate-300 text border-2 border-slate-200 cursor-not-allowed
- Time label: block font-bold
- Availability label: text-xs slate-500 (selected: emerald-100, full: slate-300)
- Keep existing SLOTS array (18 slots 08:00-16:30), formatSlotLabel, getFullSlotIndices

### Footer
- border-t-2 border-slate-200 pt-6 mt-8
- Back: slate-300 border-2 hover:bg-slate-50
- Next: emerald-700 hover:emerald-800 uppercase font-bold

**TypeScript Notes**: Interface SchedulePickerViewProps unchanged. Keep all existing props, calendar logic, and slot availability simulation.

**Verify**:
```bash
npm run build
# Must complete with 0 errors
npm run dev
# Complete step 1, arrive at step 2
# Confirm: uppercase section header, office dropdown with border-2 focus styling
# Select office, observe calendar: slate-800 nav, slate-700 day headers, emerald-700 weekday cells with borders
# Select date: confirm slot limit callout appears, time slot grid with border-2 styling
# Click slots: verify available (white, border-2), selected (emerald-600 bg), full (slate-100) states
# Navigate back/forward: confirm state persistence
# Test PhilHealth category: only PhilHealth Yakap Clinic in office dropdown
```

---

## Feature 7: Patient Details Formal Forms

**Files**:
- components/booking/PatientDetailsView.tsx

**Changes**:

### Main Section Header
- 'Step 3: Patient Details' (uppercase, tracking-widest, text-xs, slate-400)
- h2 'Provide Your Information' (text-xl, font-bold, slate-900, mt-1)
- Category badge row: 'Intake Form for:' (slate-600, text-sm) + emerald-700 bg white text uppercase text-xs font-bold px-3 py-1.5 rounded-sm badge

### Info Callout
- border-l-4 border-emerald-600 bg-emerald-50 p-4 mb-6 text-sm emerald-800
- Text: 'Please provide accurate details. This information will be used for your clinical intake and queue assignment.'

### Form Divider Header
- border-b-2 border-slate-200 pb-3 mb-6
- 'PATIENT INTAKE FORM' (uppercase, tracking-widest, text-xs, slate-500, font-bold)
- 'Fields marked with (*) are required' (text-xs, slate-400, mt-0.5)

### Shared Input/Label Styling (all three sub-forms)
- Labels: uppercase tracking-widest text-xs slate-500 font-semibold mb-1.5
- Inputs/textareas/selects: border-2 border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 rounded-sm px-4 py-3 text-sm font-medium slate-900 bg-white
- Required marker (*): red-600 font-bold
- Textarea char counter: slate-400 text-xs text-right mt-1
- Keep all existing form fields, validation logic, conditional rendering unchanged

### FormFooter
- border-t-2 border-slate-200 pt-6 mt-8
- Back: slate-300 border-2 hover:bg-slate-50
- Next: emerald-700 hover:emerald-800 uppercase font-bold py-3 px-6 disabled:slate-300

**TypeScript Notes**: Interface PatientDetailsViewProps unchanged. Keep all existing conditional form types (NewCheckupDetails, FollowUpDetails, PhilHealthYakapDetails) and validation logic.

**Verify**:
```bash
npm run build
# Must complete with 0 errors
npm run dev
# Complete steps 1-2 with 'New Check-up'
# Confirm step 3: uppercase header, emerald callout, border-b-2 divider, uppercase labels, border-2 inputs
# Fill form and submit: verify validation works, navigation to step 4 succeeds
# Restart with 'Follow-up': confirm follow-up form (previous doctor, purpose) renders with same styling
# Restart with 'PhilHealth Yakap': confirm PhilHealth form (PIN, service type) renders correctly
# Test focus on inputs: emerald-600 border and ring-2 appear
# Test validation: try submitting empty - disabled state prevents submission
```

---

## Feature 8: Digital Ticket Elite Pass

**Files**:
- components/booking/AppointmentTicketView.tsx

**Changes**:

### Card Wrapper
- max-w-2xl mx-auto, border-4 border-slate-300 (thicker), rounded-sm, overflow-hidden, shadow-2xl

### Header Band
- slate-900 bg (not emerald-700), py-6 px-6, border-b-4 border-emerald-600
- Left: seal image (48×48) + 'AMAI PAKPAK MEDICAL CENTER' (text-lg, font-bold, white, uppercase, tracking-wide) + 'Outpatient Department' subtitle (slate-300, text-xs)
- Right: 'CONFIRMED' badge (white border-2 border-white text-white font-bold uppercase text-xs px-4 py-2 rounded-sm)
- Add seal Image import (48×48, public/Amai_Pakpak_Medical_Center_seal.png)

### Queue ID Section
- emerald-600 bg (not emerald-50), py-6 px-6, border-b-2 border-emerald-700
- Label: 'QUEUE IDENTIFICATION NUMBER' (uppercase, tracking-widest, text-xs, emerald-200, font-bold, mb-2)
- Queue ID: text-4xl font-mono font-black white tracking-widest

### Patient Details Rows
- white bg, px-6 py-3, each row border-b border-slate-100 last:border-0
- TicketRow component: Label (uppercase tracking-widest text-xs slate-400 font-semibold w-40), Value (text-sm font-semibold slate-900)
- Keep existing rows (PATIENT NAME, CONSULTATION TYPE, ASSIGNED OFFICE, APPOINTMENT DATE with formatDateLong, TIME SLOT with formatTimeRange)

### Operational Warnings
- px-6 py-6 space-y-4
- Amber box: border-l-[6px] border-amber-500 (thicker) bg-amber-50 p-5 rounded-sm
  - '⚠ MANDATORY ARRIVAL POLICY' (uppercase, tracking-wide, text-xs, amber-900, font-bold, mb-2)
  - Warning text: text-sm amber-800 leading-relaxed
- Screenshot note: slate-700 bg (bg-slate-700) text-slate-50 p-4 rounded-sm text-sm flex items-start gap-2
  - '📷' + 'Screenshot or save this ticket for your records. No SMS confirmation will be sent.'

### Footer Action
- px-6 pb-6
- Button: full-width emerald-700 hover:emerald-800 uppercase font-bold tracking-wide py-4 text-sm rounded-sm 'BOOK ANOTHER APPOINTMENT'

**TypeScript Notes**: Interface AppointmentTicketViewProps unchanged. Keep all existing formatting functions (formatDateLong, formatTimeRange, CATEGORY_LABELS).

**Verify**:
```bash
npm run build
# Must complete with 0 errors
npm run dev
# Complete full booking flow (steps 1-3)
# Confirm ticket at step 4:
#   - Thick slate-300 border with heavy shadow
#   - slate-900 header with seal, APMC title, white CONFIRMED badge
#   - emerald-600 Queue ID section (NOT light emerald-50) with large white mono text
#   - Uppercase tracking-widest labels in patient details
#   - Amber warning with 6px left border and uppercase policy heading
#   - Screenshot note with dark slate-700 bg and light text
# Click 'BOOK ANOTHER APPOINTMENT': confirm onReset works, returns to step 1
# Take screenshot: verify high contrast for screenshot-friendliness
```

---

## Build & Test Commands

**Full Build Verification**:
```bash
cd c:\Users\Hamah\Downloads\WEB-SYSTEMS\OPD-System\apmc-frontend
npm run build
# Must complete with 0 TypeScript errors
```

**Development Testing**:
```bash
npm run dev
# Navigate to http://localhost:3000
# Test complete flow:
#   1. Landing page (/) - hero section, terms, proceed button
#   2. Booking page (/booking) - all 4 steps with new styling
#   3. Timeout modal (wait 9min or reduce WARNING_TIME temporarily)
#   4. Navigation guards (back button during booking)
#   5. Complete booking - verify ticket render
# Test responsive: mobile (375px), tablet (768px), desktop (1440px+)
```

**Manual Browser Testing Checklist**:
- [ ] Header: amber strip, slate-900 band, emerald bottom border
- [ ] Footer: slate-800 bg, three columns (desktop), copyright
- [ ] Landing: slate-900 hero, white terms card, emerald accents
- [ ] Booking breadcrumb: slate-800 bar, slate-900 title section
- [ ] Sidebar: slate-900 header, emerald-600 active, emerald-50 completed
- [ ] Step 1: blue info callout, border-2 cards, ring-2 selection
- [ ] Step 2: slate-800 calendar nav, emerald-700 weekday cells, border-2 slots
- [ ] Step 3: emerald info callout, uppercase labels, border-2 inputs
- [ ] Step 4: slate-900 header, emerald-600 Queue ID, 6px amber warning
- [ ] Timeout modal: red-600 accent, white countdown on red bg
- [ ] Navigation guards: "unsaved changes" alerts work
- [ ] Full flow completion: ticket generates, reset button works

---

## TypeScript Concerns

**No Breaking Changes**: All component interfaces remain unchanged. Existing props, state types, and function signatures are preserved. Only visual styling (className strings) modified.

**Type Safety**: 
- Keep strict TypeScript enabled
- Maintain existing type imports from app/types/appointment.ts
- Preserve AppointmentCategory union type
- Keep conditional detail types (NewCheckupDetails, FollowUpDetails, PhilHealthYakapDetails)

**Next.js 16.4.0 Specifics** (from node_modules/next/dist/docs/index.md):
- Uses React 19.3.0 canary with new JSX transform
- LayoutProps type from next (already used in app/layout.tsx)
- Image component from next/image (already used in Header, BookingSidebarTracker)
- Link component from next/link (already used in Header)
- useRouter from next/navigation (already used in booking/page.tsx, TermsAndConditionsView)

---

## Edit Order to Avoid Breakage

1. **Header & Footer** (FEAT-001) - Independent layout components, no dependencies
2. **Landing & Terms** (FEAT-002) - Depends on updated Header/Footer
3. **Booking Layout** (FEAT-003) - Page structure before child components
4. **Sidebar Tracker** (FEAT-004) - Used by booking page, style-only changes
5. **Category Selector** (FEAT-005) - Step 1 component
6. **Schedule Picker** (FEAT-006) - Step 2 component
7. **Patient Details** (FEAT-007) - Step 3 component
8. **Appointment Ticket** (FEAT-008) - Step 4 component, final in flow

**Rationale**: Layout components first (Header/Footer), then pages (landing, booking layout), then booking flow components in step order. Each feature is independently testable but builds on visual foundation of prior features.

---

## Notes

- **Tailwind CSS 4**: Uses @import and @theme inline syntax in globals.css (no separate config file)
- **Logo Asset**: Confirmed at public/Amai_Pakpak_Medical_Center_seal.png
- **No Test Framework**: Manual browser testing required
- **No Snapshots**: No generated files to commit
- **Windows PowerShell**: Environment uses PowerShell commands
- **AGENTS.md Warning**: Next.js 16.4.0 has breaking changes from training data

---

*End of Implementation Plan*

---

## Build Verification Results

**Date**: 2025-01-XX  
**Build Command**: `npm run build`  
**Status**: ✅ **PASSED**

```
▲ Next.js 16.4.0 (Turbopack)
✓ Compiled successfully in 1321ms
  Running TypeScript ...
  Finished TypeScript in 2.1s ...
✓ Collecting page data using 6 workers in 787ms
✓ Generating static pages using 6 workers (5/5) in 707ms
✓ Finalizing page optimization in 18ms

Route (app)
┌ ○ /
├ ○ /_not-found
└ ○ /booking
○  (Static)  prerendered as static content
```

**TypeScript Errors**: 0  
**Compilation Errors**: 0  
**Build Time**: ~4.8 seconds total

All 10 components successfully compiled with the elite government-grade institutional styling:
- ✅ Header.tsx - Dark slate-900 header with amber emergency strip
- ✅ Footer.tsx - Institutional three-column footer with emerald accent
- ✅ app/page.tsx - Hero section with centered seal and terms card
- ✅ TermsAndConditionsView.tsx - Formal terms with emerald left border
- ✅ app/booking/page.tsx - Slate-100 bg, breadcrumb bar, title section, upgraded timeout modal
- ✅ BookingSidebarTracker.tsx - Slate-900 header with emerald-600 active state
- ✅ CategorySelector.tsx - Border-2 cards with ring-2 selection, blue info callout
- ✅ SchedulePickerView.tsx - Slate-800 calendar nav, border-2 inputs, emerald-700 weekday cells
- ✅ PatientDetailsView.tsx - Emerald info callout, border-2 inputs, uppercase labels
- ✅ AppointmentTicketView.tsx - Border-4 ticket card, slate-900 header, emerald-600 Queue ID section

**Next Step**: Manual browser testing with `npm run dev` to verify visual rendering and user interactions.
