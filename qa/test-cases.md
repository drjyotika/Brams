# Brams Mind Care — QC / QA Test Cases

Last updated: 2026-05-21
Target environment by default: **production** (`https://bramsmindcare.com`)
Run via the `/test-qc` slash command or by invoking the `qa-tester` subagent.

---

## How to read this file

Every test has:
- **ID** — stable identifier (use this in pass/fail reports)
- **Type** — `automated` (agent can fully execute) or `manual` (needs human input, e.g. clicking the Razorpay modal)
- **Steps / Check** — what to run / what to assert
- **Severity** — `critical` (blocks ship) / `major` / `minor`

When run by the agent, **manual** cases are listed in the report as `SKIPPED — needs human` with the reason and what to test by hand.

---

## A. Infrastructure & Connectivity

| ID | Type | Severity | Check |
|---|---|---|---|
| **A1** | automated | critical | `GET https://bramsmindcare.com/api/health` returns 200 with `ok: true` |
| **A2** | automated | critical | `GET https://bramsmindcare.com/` returns 200 and HTML contains `<html` |
| **A3** | automated | major | `GET https://bramsmindcare.com/robots.txt` returns 200 with `User-agent` |
| **A4** | automated | major | `GET https://bramsmindcare.com/sitemap.xml` returns 200 and valid XML |
| **A5** | automated | minor | `GET https://bramsmindcare.com/manifest.webmanifest` returns 200 JSON |
| **A6** | automated | major | Homepage HTML contains JSON-LD (`<script type="application/ld+json">`) |

## B. Homepage — Public

| ID | Type | Severity | Check |
|---|---|---|---|
| **B1** | automated | critical | Homepage renders all sections: hero, support, howItWorks, pricing, footer |
| **B2** | automated | critical | Nav contains "Book Consultation" CTA and "Login" link (desktop) |
| **B3** | automated | major | Hero text matches admin-edited content (titleLead, titleAccent from `/api/content`) |
| **B4** | automated | major | Footer links to `/privacy-policy`, `/terms`, `/confidentiality`, `/emergency-contact` |
| **B5** | manual | minor | Mobile view (<768px): hamburger icon on LEFT, no border, just the bars |
| **B6** | manual | minor | Hamburger opens slide-in panel with Login + nav links + Book CTA |

## C. Content Pipeline (Admin → Public)

| ID | Type | Severity | Check |
|---|---|---|---|
| **C1** | automated | critical | `GET /api/content` returns full SiteContent JSON (not just defaults — check `nav.cta.label === "Book Consultation"`) |
| **C2** | automated | critical | Vercel Blob `brams-content.json` exists and was updated within last 30 days |
| **C3** | automated | major | `/api/content` and homepage HTML show identical hero text (no caching drift) |
| **C4** | manual | major | Save in `/admin/content` returns success AND `/api/content` reflects the change within 5s |

## D. Booking Flow (/book) — Public

| ID | Type | Severity | Check |
|---|---|---|---|
| **D1** | automated | critical | `GET /book` returns 200 |
| **D2** | automated | critical | `/book` HTML contains "Step 1 of 3" and "Choose Date & Time" |
| **D3** | automated | major | `/book` shows Login link in header on desktop |
| **D4** | manual | critical | Date picker shows current month with future dates clickable |
| **D5** | manual | critical | Pick a slot → slot button shows **time only** (e.g. "10:00 AM") with **no "X min" duration text** |
| **D6** | manual | critical | Pick a slot → Continue → Step 2 (Details) form loads |
| **D7** | manual | critical | Fill details → Continue → Step 3 (Confirm) shows plan + total; payment summary card has **no Duration row** |
| **D8** | manual | critical | Click "Pay" → Razorpay modal opens (uses test mode key `rzp_test_SqVZf1MmyKwXlt`) |
| **D9** | manual | critical | Pay with test card `4111 1111 1111 1111`, CVV `123`, future expiry → success page |
| **D10** | manual | critical | Success page shows **"📅 Add to Calendar"** and **"🧾 Download Receipt"** buttons |
| **D11** | manual | major | "Add to Calendar" downloads a `.ics` file with correct date, time and Meet link (if set) |
| **D12** | manual | major | Close modal without paying → stays on Step 3, no navigation |
| **D13** | manual | major | OTP verify for returning patient → form pre-fills with saved details + welcome banner appears |

## E. Payment APIs

| ID | Type | Severity | Check |
|---|---|---|---|
| **E1** | automated | critical | `POST /api/bookings/INVALID_ID/order` returns 404 with "Appointment not found" |
| **E2** | automated | critical | Razorpay credentials in env work — direct API call to Razorpay returns 200 |
| **E3** | automated | major | `POST /api/bookings/INVALID_ID/payment` with bad signature returns 400 or 404 |

## F. Patient Auth

### F.1 — Login page

| ID | Type | Severity | Check |
|---|---|---|---|
| **F1** | automated | critical | `GET /patient/login` returns 200 |
| **F2** | automated | critical | Login page HTML contains "Sign In" tab and "Forgot Password" link, NO "Register" tab |
| **F3** | automated | critical | Login page input field accepts email (`type="email"`), not phone |
| **F4** | automated | major | `POST /api/patient/auth/login` with bad creds returns 401 with `{error}` |
| **F5** | automated | major | `POST /api/patient/auth/login` with no body returns 400 |
| **F6** | manual | critical | Valid email + password → 200, sets `brams_patient_session` cookie, redirects to `/patient` (or `/patient/verify` if unverified) |
| **F7** | manual | major | Locked account (5+ failed attempts) returns "account locked" message |
| **F8** | manual | major | Suspended account returns "account suspended" message with reason |

### F.2 — Registration & email verification

| ID | Type | Severity | Check |
|---|---|---|---|
| **F9** | automated | critical | `GET /patient/verify` returns 200 |
| **F10** | manual | critical | Register a new patient (via booking flow) → receive OTP email in inbox (NOT spam) via Resend |
| **F11** | manual | critical | Enter 6-digit OTP → `POST /api/patient/auth/verify-email` returns 200, redirects to `/patient` |
| **F12** | manual | major | Magic link (`?token=...` in URL) auto-submits and verifies on page load |
| **F13** | manual | major | "Resend code" calls `/api/patient/auth/resend-verification`, new email arrives |
| **F14** | manual | minor | Wrong OTP shows error; expired OTP (>30 min) shows "expired" message |

### F.3 — Forgot / reset password

| ID | Type | Severity | Check |
|---|---|---|---|
| **F15** | automated | critical | `GET /patient/reset-password` returns 200 |
| **F16** | automated | major | `POST /api/patient/auth/forgot-password` with any input always returns 200 (doesn't leak account existence) |
| **F17** | manual | critical | "Forgot Password" with valid email → reset email arrives within 1 min |
| **F18** | manual | critical | Reset link in email opens `/patient/reset-password?token=...`, sets new password, auto-signs in |
| **F19** | manual | major | Expired reset token (>30 min) shows clear error |

### F.4 — Logout

| ID | Type | Severity | Check |
|---|---|---|---|
| **F20** | automated | major | `POST /api/patient/auth/logout` clears the session cookie (response `Set-Cookie` has past `Expires`) |

## G. Patient Dashboard (/patient)

### G.1 — Access control & header

| ID | Type | Severity | Check |
|---|---|---|---|
| **G1** | automated | critical | `GET /patient` without session → redirects to `/patient/login` (302/307) |
| **G2** | automated | major | `GET /api/patient/me` without session returns 401 |
| **G3** | manual | critical | Logged in: header shows Brams logo + Book Consultation CTA + Logout |
| **G4** | manual | critical | NO profile/settings buttons in header — only Logout |
| **G5** | manual | major | Mobile (<768px): brand logo visible, hamburger on LEFT with nav items + Logout (red) inside |
| **G6** | manual | minor | "Back to homepage" link has NO ← arrow |

### G.2 — Dashboard tab

| ID | Type | Severity | Check |
|---|---|---|---|
| **G7** | manual | critical | Default tab is "Dashboard", shows greeting with patient name |
| **G8** | manual | major | Shows upcoming appointments summary card |
| **G9** | manual | major | Shows recent reports summary card |
| **G10** | manual | minor | Empty state when no appointments exist — friendly message, "Book Consultation" CTA |

### G.3 — Appointments tab

| ID | Type | Severity | Check |
|---|---|---|---|
| **G11** | manual | critical | Appointments tab lists all patient's appointments (upcoming + past), sorted newest first |
| **G12** | manual | critical | Each row shows: plan title, date/time, payment status pill, action buttons |
| **G13** | manual | critical | "Reschedule" button navigates to `/patient/reschedule/[id]` (full page, NOT modal) |
| **G14** | manual | major | "Join" link visible only when meeting_link is set on appointment |
| **G15** | manual | major | **"🧾 Receipt"** button visible for paid appointments; opens `/receipt/[bookingId]` in new tab |
| **G16** | manual | minor | Cancelled / completed appointments are visually distinguished (greyed, badge) |

### G.4 — Reports tab

| ID | Type | Severity | Check |
|---|---|---|---|
| **G16** | manual | critical | Reports tab lists all uploaded reports across appointments |
| **G17** | manual | critical | Mobile: reports list has NO horizontal scroll (overflow hidden, min-width: 0) |
| **G18** | manual | major | Each report shows: file name, upload date, appointment context, view/download link |
| **G19** | automated | major | `GET /api/patient/reports` without session returns 401 |
| **G20** | manual | minor | Empty state when no reports — explanatory message |

### G.5 — Profile tab

| ID | Type | Severity | Check |
|---|---|---|---|
| **G21** | manual | critical | Profile tab shows: full name, email, phone, age, gender, city |
| **G22** | manual | major | Email shows verification badge (✓ verified) when `email_verified=true` |
| **G23** | manual | major | "Logout" button at bottom of profile (in addition to header) |
| **G24** | manual | minor | No stray "+ Book new" or "+" buttons anywhere in the dashboard |

## L. Patient Sub-Pages

### L.1 — Patient booking (/patient/book)

| ID | Type | Severity | Check |
|---|---|---|---|
| **L1** | automated | critical | `GET /patient/book` returns 200 (or 307 to login if no session) |
| **L2** | manual | critical | Logged-in: same 3-step flow as `/book` but prefilled with patient details |
| **L3** | manual | critical | After payment success → redirects to `/patient` (not `/book/success`) |
| **L4** | manual | major | Header shows logged-in patient context (no Login button) |

### L.2 — Reschedule (/patient/reschedule/[id])

| ID | Type | Severity | Check |
|---|---|---|---|
| **L5** | automated | critical | `GET /patient/reschedule/invalid-id` returns 404 or redirects gracefully |
| **L6** | manual | critical | Full page (not modal) with date/time picker for the existing appointment |
| **L7** | manual | critical | Shows current appointment details (plan, current date/time) for context |
| **L8** | manual | critical | Pick new slot → submit → `PATCH /api/patient/appointments/[id]/reschedule` succeeds |
| **L9** | manual | major | On success, redirects back to `/patient` with the appointment now showing new date/time |
| **L10** | manual | major | Reschedule only allowed for status `pending` or `confirmed` appointments (not completed/cancelled) |
| **L11** | manual | minor | Can only reschedule own appointments — attempting another patient's ID returns 403/404 |

### L.3 — Verify page (/patient/verify)

| ID | Type | Severity | Check |
|---|---|---|---|
| **L12** | manual | critical | Shows masked email of current patient (from `/api/patient/me`) |
| **L13** | manual | critical | OTP input: 6 digits, numeric only, `inputMode="numeric"`, `autocomplete="one-time-code"` |
| **L14** | manual | major | After verification, BramsLoader shows briefly then redirects to `/patient` |

### L.4 — Reset password page (/patient/reset-password)

| ID | Type | Severity | Check |
|---|---|---|---|
| **L15** | manual | critical | Missing or invalid `?token=` shows clear error before allowing password entry |
| **L16** | manual | critical | New password + confirm match → submits → auto signs in → `/patient` |
| **L17** | manual | major | Password strength validation: minimum length enforced |

## H. Admin Panel (/admin)

| ID | Type | Severity | Check |
|---|---|---|---|
| **H1** | automated | critical | `GET /admin` redirects unauthenticated users to admin login |
| **H2** | automated | major | Admin page sets `noindex` metadata (no SEO indexing) |
| **H3** | manual | critical | Admin login works with `ADMIN_USERNAME` / `ADMIN_PASSWORD` |
| **H4** | manual | major | Patients tab: guest-status patients show Reset/Clear Password actions |
| **H5** | manual | major | Appointments tab: no React key warnings in console |
| **H6** | manual | minor | "Back to homepage" link has NO ← arrow (just text) |
| **H7** | manual | critical | Appointments tab: Status column shows a **dropdown** (pending/confirmed/completed/cancelled/no_show) |
| **H8** | manual | critical | Change status to **"confirmed"** → Meet link auto-generates, Video Link column updates to **"✅ Join"** without page refresh |
| **H9** | manual | critical | Change status to **"completed"** → feedback email sent to patient (check inbox within 1 min) |
| **H10** | manual | major | Video Link column: **"🎥 Generate Meet"** button (blue) and **"Paste link"** button shown when no link set |
| **H11** | manual | major | "Paste link" inline editor: input + Save + ✕; Enter key saves, Escape cancels |
| **H12** | manual | major | Once link is set: **"✅ Join"** (clickable) + **"Edit"** button; Edit allows changing the link |
| **H13** | manual | major | Receipt column: **"🧾 View"** opens `/receipt/[bookingId]` in new tab for every appointment |
| **H14** | automated | major | `GET /admin/feedback` returns 200 (within admin shell) |
| **H15** | manual | major | Admin nav Comms section contains **"Feedback"** link → `/admin/feedback` |
| **H16** | manual | major | Feedback page: shows all submitted feedbacks with patient name, plan, date, star rating, comments |
| **H17** | manual | major | Feedback page: shows average rating chip (e.g. "⭐ 4.5 avg") when feedbacks exist |
| **H18** | manual | minor | Feedback page: empty state shows friendly message when no feedbacks yet |

## I. SEO / AEO / GEO

| ID | Type | Severity | Check |
|---|---|---|---|
| **I1** | automated | major | Homepage `<head>` contains `<title>` and `<meta name="description">` |
| **I2** | automated | major | Homepage contains `MedicalOrganization` JSON-LD schema |
| **I3** | automated | major | Homepage contains `Physician` JSON-LD schema for Dr. Jyotika Kanwar |
| **I4** | automated | major | Homepage contains `FAQPage` JSON-LD schema |
| **I5** | automated | minor | Open Graph tags present (`og:title`, `og:description`, `og:url`) |
| **I6** | automated | minor | Canonical URL set on homepage |

## J. Email Deliverability

| ID | Type | Severity | Check |
|---|---|---|---|
| **J1** | automated | critical | DNS: `dig TXT send.bramsmindcare.com` includes `v=spf1 include:amazonses.com` (Resend's envelope-sender subdomain — apex SPF is optional) |
| **J2** | automated | critical | DNS: `dig TXT resend._domainkey.bramsmindcare.com` returns DKIM key |
| **J3** | automated | major | DNS: `dig TXT _dmarc.bramsmindcare.com` includes `v=DMARC1` |
| **J4** | manual | major | OTP email actually lands in inbox (not spam) on Gmail, Outlook, Yahoo |

## K. Performance & Security

| ID | Type | Severity | Check |
|---|---|---|---|
| **K1** | automated | major | All pages served over HTTPS (no mixed content) |
| **K2** | automated | major | Production build has no source maps exposed (`*.map` 404s) |
| **K3** | automated | minor | Homepage HTML response < 500 KB |
| **K4** | automated | minor | Response includes `cache-control` header (any value) |

---

## M. Booking Receipt

| ID | Type | Severity | Check |
|---|---|---|---|
| **M1** | automated | critical | `GET /receipt/FAKE-ID` returns 200 (page loads — API returns error gracefully inside) |
| **M2** | automated | critical | `GET /api/receipt/FAKE-ID` returns 404 with `{ error }` JSON |
| **M3** | manual | critical | Valid receipt URL `/receipt/[bookingId]` shows: clinic header, RECEIPT badge, booking ID (first 8 chars uppercased) |
| **M4** | manual | critical | Receipt shows **Patient Details**: name, phone, email (if set), age, gender, city |
| **M5** | manual | critical | Receipt shows **Appointment Details**: plan, date, time, mode ("Online Video Call"), status — **no Duration row** |
| **M6** | manual | critical | Receipt shows **Payment Summary**: consultation fee, discount (if any), amount paid |
| **M7** | manual | critical | Receipt shows Payment IDs (gateway_payment_id, gateway_order_id) when payment exists |
| **M8** | manual | major | **"🖨️ Print / Save as PDF"** button opens browser print dialog |
| **M9** | manual | major | Print button and top bar are **hidden** in print/PDF preview (only receipt body prints) |
| **M10** | manual | major | Date on receipt shows correctly as "Monday, 19 May 2026" (not "Invalid Date") |
| **M11** | manual | minor | Receipt footer shows clinic contact email as a mailto link |

---

## N. Google Meet / Video Call Flow

| ID | Type | Severity | Check |
|---|---|---|---|
| **N1** | automated | major | `POST /api/admin/appointments/FAKE-ID/generate-meet` returns 404 |
| **N2** | automated | major | `PATCH /api/admin/appointments/FAKE-ID/status` with invalid status returns 400 |
| **N3** | manual | critical | Admin: change status to **"confirmed"** on appointment without a link → Meet link auto-generates within 5s |
| **N4** | manual | critical | Auto-generated Meet link starts with `https://meet.google.com/` |
| **N5** | manual | critical | After auto-generation: Video Link column shows **"✅ Join"** (clickable) without page refresh |
| **N6** | manual | critical | Patient dashboard shows **"Join Call"** button after Meet link is set |
| **N7** | manual | critical | "Join Call" button links to the correct `meet.google.com` URL |
| **N8** | manual | major | Google Calendar (drjyotika@bramsmindcare.com) shows a new event with patient name, plan title, date/time |
| **N9** | manual | major | If patient has email on file → they receive a Google Calendar invite |
| **N10** | manual | major | Changing status to "confirmed" when link **already exists** → does **not** overwrite existing link |
| **N11** | manual | major | Manual "🎥 Generate Meet" button (for already-confirmed appointments with no link) generates link on click |
| **N12** | manual | minor | If Meet generation fails (e.g. invalid token) → status still updates, alert shows specific error |

---

## O. Feedback Flow

| ID | Type | Severity | Check |
|---|---|---|---|
| **O1** | automated | critical | `GET /feedback/FAKE-ID` returns 200 (page loads, shows error state gracefully) |
| **O2** | automated | critical | `GET /api/feedback/FAKE-ID` returns 404 with `{ error }` JSON |
| **O3** | manual | critical | Admin marks appointment **"completed"** → patient receives feedback email within 1 min |
| **O4** | manual | critical | Feedback email contains **"Share Your Feedback"** CTA button linking to `/feedback/[appointmentId]` |
| **O5** | manual | critical | Feedback page loads correctly from email link; shows plan title and Dr. Jyotika's name |
| **O6** | manual | critical | Star rating: click star 4 → shows "Very Good" label; all stars 1–4 highlight |
| **O7** | manual | critical | Submit without selecting a star → button stays disabled |
| **O8** | manual | critical | Select rating + (optional) comments → Submit → thank you screen shown |
| **O9** | manual | critical | Revisiting the same feedback URL after submission → shows **"Already submitted"** screen |
| **O10** | manual | major | Feedback appears in **Admin → Feedback** table immediately after submission |
| **O11** | manual | major | Admin feedback table shows: patient name, plan, date, star rating, label (e.g. "Excellent"), comments |
| **O12** | manual | major | Average rating chip updates correctly after new feedbacks are added |
| **O13** | manual | major | Feedback with no comments shows italic *"No comments"* in admin table |
| **O14** | manual | minor | Feedback page is mobile-friendly (stars tappable, textarea resizable, button full-width) |
| **O15** | manual | minor | Feedback page shows Brams Mind Care logo at top |

## P. Analytics / GA4 Events

Custom events are sent via `lib/analytics.ts` (`sendGAEvent` from `@next/third-parties/google`). GA4 Measurement ID: **`G-S0TVR1C0Z7`** (set in prod via `NEXT_PUBLIC_GA_ID`). To verify manual cases, open **GA4 → Reports → Realtime → Event count by Event name** (or DebugView) in a second window while performing each action.

| ID | Type | Severity | Check |
|---|---|---|---|
| **P1** | automated | critical | Production homepage HTML / network loads the GA4 tag — `gtag/js?id=G-S0TVR1C0Z7` (or `googletagmanager.com/gtag`) is referenced |
| **P2** | automated | major | GA4 only loads in prod: tag is gated on `NEXT_PUBLIC_GA_ID`, so it must be absent when the env var is unset (no hard-coded ID outside the env-gated `<GoogleAnalytics>`) |
| **P3** | automated | minor | GA tag does **not** block render — present near `</html>`, page still returns 200 and full HTML |
| **P4** | manual | critical | Click **Pay** in booking → `begin_checkout` fires with `item_name`, `value` (INR rupees), `currency: "INR"` |
| **P5** | manual | critical | Payment succeeds → `purchase` fires with `transaction_id` (bookingId), `item_name`, `value`, `currency: "INR"` |
| **P6** | manual | major | Razorpay payment fails/closed-with-error → `payment_failed` fires with `item_name` |
| **P7** | manual | major | Apply a valid coupon → `coupon_applied` fires with `coupon` = code |
| **P8** | manual | major | Submit **Contact form** → `generate_lead` fires with `lead_source: "contact_form"` |
| **P9** | manual | major | Submit **Need Help** → `generate_lead` fires with `lead_source: "need_help"` |
| **P10** | manual | major | Submit **Request Alternative Slot** → `generate_lead` fires with `lead_source: "alternative_slot"` |
| **P11** | manual | critical | Successful patient login → `login` fires with `method: "password"` |
| **P12** | manual | major | Booking success → **Add to Calendar** → `add_to_calendar` fires |
| **P13** | manual | major | Patient dashboard → click **Join Meeting / Join** → `join_call` fires (both Join links) |
| **P14** | manual | major | Complete a reschedule → `reschedule` fires |
| **P15** | manual | major | Submit feedback → `feedback_submitted` fires with `rating` (1–5) |
| **P16** | manual | minor | All custom events appear under **GA4 → Realtime → Events** within ~30s of the action |
| **P17** | manual | minor | Enhanced Measurement auto-events still fire: `page_view` on navigation, `scroll`, outbound `click` |
