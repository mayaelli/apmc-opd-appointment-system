# APMC OPD System - Security Documentation

**Last Updated:** January 13, 2025  
**System Version:** 1.0.0  
**Status:** Development

---

## Table of Contents

1. [Implemented Security Measures](#implemented-security-measures)
2. [Pending Security Enhancements](#pending-security-enhancements)
3. [Security Testing Checklist](#security-testing-checklist)
4. [Incident Response](#incident-response)
5. [Version History](#version-history)

---

## Implemented Security Measures

### 1. Rate Limiting

**Status:** ACTIVE  
**Implementation Date:** January 13, 2025  
**File:** `lib/rate-limit.ts`

**Configuration:**
- Maximum Requests: 3 bookings per IP address
- Time Window: 10 minutes
- Storage: In-memory Map (suitable for development/small scale)
- Response Code: 429 (Too Many Requests)

**Behavior:**
- Tracks requests by IP address from `x-forwarded-for` or `x-real-ip` headers
- Returns user-friendly error message with remaining wait time
- Automatically cleans up expired entries every 5 minutes

**Error Message:**
```
Too many booking attempts. Please try again in X minutes.
```

**Production Recommendation:**
Upgrade to Redis-based rate limiting (Upstash Redis) for multi-server deployments.

---

### 2. Input Sanitization

**Status:** ACTIVE  
**Implementation Date:** January 13, 2025  
**File:** `lib/validation.ts`  
**Library:** isomorphic-dompurify v2.18.1

**Protected Fields:**
- Full Name
- Chief Complaint
- Previous Doctor
- Follow-up Purpose
- PhilHealth PIN
- Service Type
- Office Name

**Method:**
All user text inputs are sanitized using DOMPurify with strict configuration:
```typescript
DOMPurify.sanitize(input.trim(), { 
  ALLOWED_TAGS: [],    // Strip all HTML tags
  ALLOWED_ATTR: []     // Strip all attributes
});
```

**Protects Against:**
- Cross-Site Scripting (XSS)
- HTML injection
- Script tag injection
- Event handler injection

---

### 3. Input Validation

**Status:** ACTIVE  
**Implementation Date:** January 13, 2025  
**File:** `lib/validation.ts`, `app/api/appointments/route.ts`

#### 3.1 Name Validation

**Rules:**
- Minimum length: 3 characters
- Allowed characters: Letters (a-z, A-Z), spaces, periods, hyphens, apostrophes
- Pattern: `/^[a-zA-Z\s.'-]+$/`

**Error Message:**
```
Invalid name format. Please use letters only (at least 3 characters).
```

#### 3.2 Phone Number Validation

**Rules:**
- Philippine mobile format only
- Accepted formats:
  - `09XXXXXXXXX` (11 digits)
  - `+639XXXXXXXXX` (13 characters)
- Spaces, hyphens, and parentheses are stripped before validation

**Pattern:** `/^(09\d{9}|(\+639)\d{9})$/`

**Error Message:**
```
Invalid phone number format. Please use Philippine mobile format (09XX-XXX-XXXX).
```

#### 3.3 Date Validation

**Rules:**
- Date must be today or in the future
- Past dates are rejected at API level

**Error Message:**
```
Cannot book appointments in the past. Please select a future date.
```

#### 3.4 Age Validation

**Rules:**
- Minimum: 1 year
- Maximum: 120 years
- Must be a valid integer

**Error Message:**
```
Invalid age. Please enter a valid age between 1 and 120.
```

---

### 4. Duplicate Submission Prevention

**Status:** ACTIVE  
**Implementation Date:** January 13, 2025  
**File:** `app/booking/page.tsx`

**Method:**
- State flag `isSubmitting` prevents concurrent API calls
- Flag is set to `true` at submission start
- Reset to `false` on success or error
- Additional calls during submission are ignored with console log

**Protects Against:**
- Double-click submissions
- React Strict Mode double-renders
- Accidental rapid button clicks

---

### 5. Navigation Guards

**Status:** ACTIVE  
**Implementation Date:** January 13, 2025  
**File:** `app/booking/page.tsx`

#### 5.1 Browser Back Button Protection

**Triggers When:**
- User has unsaved data in steps 1-3
- User presses browser back button

**Behavior:**
- Pushes state to prevent navigation
- Shows confirmation dialog explaining data loss

**Message:**
```
Warning: Leaving Will Lose Your Progress

You are in the middle of booking an appointment. Using the back 
button will lose all your entered information.

Are you sure you want to leave?
```

#### 5.2 Browser Refresh Protection

**Method:** `beforeunload` event handler

**Triggers When:**
- User attempts to refresh page
- User attempts to close tab/window
- Active booking in progress (steps 1-3)

**Behavior:**
Browser shows native confirmation dialog

#### 5.3 Step Navigation Warnings

**Step 2 to Step 1:**
```
Warning: Going Back Will Lose Your Schedule

You have selected:
• Office: [office name]
• Date: [selected date]
• Time: [selected slot]

Are you sure you want to go back? All this information will be lost.
```

**Step 3 to Step 2:**
```
Warning: Going Back Will Lose Your Patient Information

You have filled out the patient intake form. Going back will 
erase all entered information.

Are you sure you want to go back?
```

**Ticket Exit Confirmation:**
```
Have you saved your ticket?

Please make sure you have:
✓ Taken a screenshot of your queue ticket
✓ Saved it for your records

Once you leave, you cannot view this ticket again.

Are you ready to return to the homepage?
```

---

### 6. Session Timeout

**Status:** ACTIVE  
**Implementation Date:** January 10, 2025  
**File:** `app/booking/page.tsx`

**Configuration:**
- Total session time: 10 minutes
- Warning displays at: 9 minutes
- Countdown duration: 60 seconds

**Triggers:**
- Mouse movement
- Keyboard input
- Click events
- Scroll events

**Behavior:**
- Modal overlay with countdown timer
- Options: "Continue Session" or "Exit"
- Auto-redirect to homepage on timeout

---

### 7. Supabase Row Level Security (RLS)

**Status:** ACTIVE  
**Implementation Date:** January 13, 2025  
**Database:** Supabase PostgreSQL

**Enabled Tables:**
- `appointments`
- `holidays`
- `offices`

**Current Policies:**

#### Appointments Table
- Read: Public (all users can view)
- Insert: Public (all users can create with valid data)
- Update: Disabled
- Delete: Disabled

#### Holidays Table
- Read: Public (all users can view)
- Insert: Admin only (via Supabase dashboard)
- Update: Admin only
- Delete: Admin only

#### Offices Table
- Read: Public (all users can view)
- Insert: Admin only
- Update: Admin only
- Delete: Admin only

**Note:** Current policies are permissive for development. Tighten before production.

---

## Pending Security Enhancements

### High Priority

1. **CAPTCHA Integration**
   - Status: Not Implemented
   - Recommendation: Cloudflare Turnstile (free, invisible)
   - Purpose: Prevent automated bot submissions
   - Estimated Implementation: 2 hours

2. **Duplicate Booking Prevention**
   - Status: Not Implemented
   - Rule: Block same phone number from booking multiple times on same date
   - Estimated Implementation: 30 minutes

3. **Supabase Key Protection**
   - Status: ~~Not Implemented~~ **CLARIFIED - Working as Intended**
   - Note: The `anon public` key is designed to be client-exposed
   - Protected by: Row Level Security (RLS) policies + rate limiting
   - Action: ~~Move sensitive operations to server-side~~ **Tighten RLS policies instead**
   - Reference: https://supabase.com/docs/guides/api/using-rls-policies
   - Estimated Implementation: 1 hour (RLS policy updates)

4. **Enhanced RLS Policies**
   - Status: Too Permissive
   - Action: Restrict reads to owned appointments only
   - Estimated Implementation: 1 hour

### Medium Priority

5. **Audit Logging**
   - Log all booking attempts with IP, timestamp, success/failure
   - Create `audit_log` table in Supabase
   - Estimated Implementation: 2 hours

6. **Weekend/Holiday Blocking**
   - Prevent bookings on weekends and holidays
   - Check against `holidays` table
   - Estimated Implementation: 1 hour

7. **Secure Queue ID Generation**
   - Replace `Math.random()` with `crypto.randomBytes()`
   - Estimated Implementation: 15 minutes

### Low Priority

8. **Email/SMS Notifications**
   - Send booking confirmation via email or SMS
   - Requires: Twilio or SendGrid integration
   - Estimated Implementation: 8 hours

9. **Admin Dashboard**
   - View all appointments
   - Update appointment status
   - Generate reports
   - Estimated Implementation: 40 hours

---

## Security Testing Checklist

### Input Validation Tests

- [ ] Submit booking with XSS payload in name field: `<script>alert('xss')</script>`
- [ ] Submit booking with SQL injection in name: `'; DROP TABLE appointments;--`
- [ ] Submit booking with invalid phone: `abc123456`
- [ ] Submit booking with international phone: `+1-555-1234`
- [ ] Submit booking with past date
- [ ] Submit booking with age = 0
- [ ] Submit booking with age = 999
- [ ] Submit booking with empty required fields

### Rate Limiting Tests

- [ ] Submit 3 bookings successfully
- [ ] Submit 4th booking within 10 minutes (should fail with 429)
- [ ] Wait 10 minutes and submit again (should succeed)
- [ ] Test rate limit from different IP address (should not affect)

### Navigation Tests

- [ ] Start booking, press browser back button (should warn)
- [ ] Start booking, press browser refresh (should warn)
- [ ] Complete booking, click "Return to Homepage" without confirming (should warn)
- [ ] Complete booking, go back to /booking (should start fresh at step 1)
- [ ] Fill Step 2, click Back button (should show specific warning with data)
- [ ] Fill Step 3, click Back button (should warn about form data loss)

### Session Timeout Tests

- [ ] Leave booking page idle for 9 minutes (warning should appear)
- [ ] Interact with page during countdown (should reset)
- [ ] Let countdown reach 0 (should auto-redirect to homepage)

### Double Submission Tests

- [ ] Double-click submit button rapidly (only one appointment should be created)
- [ ] Submit form, check Supabase for duplicates

---

## Incident Response

### If Rate Limit Abuse Detected

1. Check server logs for offending IP addresses
2. Add IP to blocklist (implement IP blocking if not present)
3. Consider reducing rate limit window or max requests
4. Monitor for continued abuse

### If XSS Attack Detected

1. Verify DOMPurify is up to date
2. Check if attack bypassed sanitization
3. Review and strengthen sanitization rules
4. Audit all user-submitted data in database

### If Spam Bookings Detected

1. Enable CAPTCHA immediately
2. Review rate limiting configuration
3. Check for patterns (same IP, same data, time intervals)
4. Implement stricter duplicate detection
5. Consider temporary manual approval for bookings

### If Database Breach Suspected

1. Immediately rotate all Supabase keys
2. Review RLS policies
3. Audit access logs in Supabase dashboard
4. Check for unauthorized data modifications
5. Notify affected users if patient data compromised

---

## Version History

### Version 1.2.0 - Staff Portal Addition

**Added:**
- Doctor, Admin, and OPD Head portals (auth, dashboards, queue management)
- JWT-based session (`apmc_session` httpOnly cookie, 8-hour expiry)
- `proxy.ts` route guard (Next.js 16 replacement for `middleware.ts`)
- Supabase service-role client for server-only operations
- pgcrypto-based password hashing for office credentials
- Admin CRUD for offices, holidays, and credential resets
- OPD Head read-only dashboard with appointment filters and print support
- Dynamic office and holiday data for the public booking form

**Security notes:**
- `apmc_session` cookie is marked `Secure` only when `NODE_ENV=production`.
  In development this is intentional (localhost is HTTP). **Staging environments
  must set `NODE_ENV=production`** (or explicitly override cookie options) to
  ensure the cookie is not transmitted in plaintext over HTTP.
- The four pgcrypto RPCs (`verify_office_password`, `create_office_with_password`,
  `hash_password`, `reset_office_password`) are restricted to the Supabase service
  role via `REVOKE EXECUTE … FROM PUBLIC, anon, authenticated` in
  `supabase/schema-staff.sql`. The public anon key cannot call these RPCs.
- Admin and OPD Head credentials are compared with `timingSafeEqual` from
  Node.js `crypto` to prevent timing-based username/password enumeration.

**Security Status:** Development-Ready  
**Production-Ready:** Pending (CAPTCHA, tighter RLS, Redis rate-limiting recommended)

---



**Added:**
- Loading modal during appointment submission
- Back button completely blocked on ticket page (Step 4)
- Enhanced state cleanup on page mount/unmount
- SessionStorage tracking for ticket display
- Clarified Supabase anon key security model

**Fixed:**
- Ticket page state briefly persisting on refresh
- Back button working on ticket page
- No visual feedback during submission
- Browser history management improved

**Security Status:** Development-Ready  
**Production-Ready:** Pending (CAPTCHA, enhanced RLS recommended)

---

### Version 1.0.0 - January 13, 2025

**Added:**
- Rate limiting (3 requests per 10 minutes per IP)
- Input sanitization with DOMPurify
- Name validation (letters only, min 3 chars)
- Phone validation (Philippine mobile format)
- Date validation (no past dates)
- Age validation (1-120 years)
- Duplicate submission prevention
- Navigation guards (back button, refresh, step warnings)
- Session timeout (10 minutes with 1-minute countdown)
- Supabase Row Level Security enabled
- Security documentation

**Security Status:** Development-Ready  
**Production-Ready:** No (pending CAPTCHA, enhanced RLS, audit logging)

---

## Maintenance Notes

**Review Frequency:** Monthly  
**Last Security Audit:** January 13, 2025  
**Next Scheduled Review:** February 13, 2025

**Dependencies to Monitor:**
- isomorphic-dompurify (XSS protection)
- @supabase/supabase-js (database client)
- Next.js (framework updates may affect security)

**Regular Tasks:**
1. Update npm packages monthly: `npm update`
2. Review Supabase audit logs weekly
3. Monitor rate limit hit rate
4. Review failed booking attempts for patterns
5. Test all security measures after major updates

---

**Document Owner:** Development Team  
**Contact:** [Add contact information]  
**Classification:** Internal Use Only
