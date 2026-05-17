# Brams Mind Care — QC / QA Test Cases

Last updated: 2026-05-17
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
| **D5** | manual | critical | Pick a slot → Continue → Step 2 (Details) form loads |
| **D6** | manual | critical | Fill details → Continue → Step 3 (Confirm) shows plan + total |
| **D7** | manual | critical | Click "Pay" → Razorpay modal opens (uses test mode key `rzp_test_SqVZf1MmyKwXlt`) |
| **D8** | manual | critical | Pay with test card `4111 1111 1111 1111`, CVV `123`, future expiry → success page |
| **D9** | manual | major | Close modal without paying → stays on Step 3, no navigation |

## E. Payment APIs

| ID | Type | Severity | Check |
|---|---|---|---|
| **E1** | automated | critical | `POST /api/bookings/INVALID_ID/order` returns 404 with "Appointment not found" |
| **E2** | automated | critical | Razorpay credentials in env work — direct API call to Razorpay returns 200 |
| **E3** | automated | major | `POST /api/bookings/INVALID_ID/payment` with bad signature returns 400 or 404 |

## F. Patient Auth

| ID | Type | Severity | Check |
|---|---|---|---|
| **F1** | automated | critical | `GET /patient/login` returns 200 |
| **F2** | automated | critical | Login page HTML contains "Sign In" tab and "Forgot Password" link, NO "Register" tab |
| **F3** | automated | critical | Login page input field accepts email (not phone) |
| **F4** | automated | major | `POST /api/patient/auth/login` with bad creds returns 401 |
| **F5** | manual | critical | Register a new patient → receive OTP email in inbox (NOT spam) via Resend |
| **F6** | manual | critical | Enter OTP → email verified → redirected to `/patient` |
| **F7** | manual | major | "Forgot Password" sends reset email; reset link works and signs in |

## G. Patient Dashboard (/patient)

| ID | Type | Severity | Check |
|---|---|---|---|
| **G1** | automated | critical | `GET /patient` redirects unauthenticated users to `/patient/login` |
| **G2** | manual | critical | Logged in: dashboard shows tabs Dashboard / Appointments / Reports / Profile |
| **G3** | manual | critical | Logout button visible (NOT profile/settings buttons) |
| **G4** | manual | major | Mobile: hamburger menu with brand logo visible, nav items + Logout (red) inside |
| **G5** | manual | major | "Book Consultation" navigates to `/patient/book` (full page, NOT modal) |
| **G6** | manual | major | Click "Reschedule" on appointment → `/patient/reschedule/[id]` full page (NOT modal) |
| **G7** | manual | minor | Reports section: no horizontal scroll on mobile |
| **G8** | manual | minor | No stray "+ Book new" or "+" buttons anywhere |

## H. Admin Panel (/admin)

| ID | Type | Severity | Check |
|---|---|---|---|
| **H1** | automated | critical | `GET /admin` redirects unauthenticated users to admin login |
| **H2** | automated | major | Admin page sets `noindex` metadata (no SEO indexing) |
| **H3** | manual | critical | Admin login works with `ADMIN_USERNAME` / `ADMIN_PASSWORD` |
| **H4** | manual | major | Patients tab: guest-status patients show Reset/Clear Password actions |
| **H5** | manual | major | Appointments tab: no React key warnings in console |
| **H6** | manual | minor | "Back to homepage" link has NO ← arrow (just text) |

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
| **J1** | automated | critical | DNS: `dig TXT bramsmindcare.com` includes `v=spf1` with `amazonses.com` |
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
