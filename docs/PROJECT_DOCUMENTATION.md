# Brams Mind Care — Complete Project Documentation

> Online psychiatry practice for **Dr. Jyotika Kanwar**.
> Production: **https://bramsmindcare.com**
> Last updated: 2026-05-21

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture & Tech Stack](#2-architecture--tech-stack)
3. [Feature List](#3-feature-list)
4. [Database Structure](#4-database-structure)
5. [End-to-End Flows](#5-end-to-end-flows)
6. [Patient Journey](#6-patient-journey)
7. [Admin Journey](#7-admin-journey)
8. [Integrations](#8-integrations)
9. [Authentication & Security](#9-authentication--security)
10. [API Reference](#10-api-reference)
11. [Pages Reference](#11-pages-reference)
12. [Email System](#12-email-system)
13. [SEO / AEO / GEO](#13-seo--aeo--geo)
14. [Analytics (GA4)](#14-analytics-ga4)
15. [Deployment Strategy](#15-deployment-strategy)
16. [Environment Variables](#16-environment-variables)
17. [QC / Testing](#17-qc--testing)
18. [Cron Jobs & Automation](#18-cron-jobs--automation)
19. [Known Gaps & Future Work](#19-known-gaps--future-work)

---

## 1. Overview

Brams Mind Care is a single-doctor online psychiatry platform. Patients book and pay for video consultations, receive confirmation/reminder emails, join a Google Meet, and submit feedback. An admin panel lets the practice manage patients, appointments, payments, content, coupons, and communications.

**Three audiences:**
- **Public visitors** — homepage, booking, static pages (privacy, terms, etc.)
- **Patients** — authenticated dashboard (appointments, reports, reschedule, profile)
- **Admin** — full operational back office

---

## 2. Architecture & Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, React 19) |
| Language | TypeScript (strict) |
| Runtime | Node.js 24 (Vercel Fluid Compute) |
| Styling | SCSS Modules (`sass`) |
| Database | Neon PostgreSQL (`@neondatabase/serverless`) |
| File storage | AWS S3 (`@aws-sdk/client-s3`) — prescriptions/reports |
| Content storage | Vercel Blob (`@vercel/blob`) — site content JSON |
| Email | Resend (`resend`) |
| Payments | Razorpay Standard Checkout (`razorpay`) |
| Video calls | Google Calendar API + Meet (`googleapis`) |
| Hosting / CI | Vercel (Git-integrated, `main` = production) |

**Data flow at a glance:**
```
Browser ── Next.js App Router (RSC + client components)
             │
             ├── API Routes (/app/api/**) ── lib/* modules
             │                                  ├── lib/db.ts        → Neon Postgres
             │                                  ├── lib/s3.ts        → AWS S3
             │                                  ├── lib/storage.ts   → Vercel Blob
             │                                  ├── lib/email.ts     → Resend
             │                                  ├── lib/google-calendar.ts → Google Meet
             │                                  └── razorpay SDK     → Razorpay
             └── Static assets (/public, app/icon.png, app/apple-icon.png)
```

**Key lib modules:**
| Module | Responsibility |
|---|---|
| `lib/db.ts` | Neon SQL tagged-template client |
| `lib/auth.ts` | Admin + patient session tokens (JWT-style), cookies |
| `lib/patient-auth.ts` | Patient password hashing (scrypt), login lookup, lockout |
| `lib/users.ts` | Admin user CRUD |
| `lib/bookings.ts` | Patients, appointments, uploads, payments queries + `isUuid` guard |
| `lib/plans.ts` | Consultation plan parsing (price→paise, duration) |
| `lib/coupons.ts` | Coupon validation & redemption |
| `lib/otp.ts` | Booking email OTP issue/verify, rate limiting |
| `lib/email.ts` + `email-templates.ts` | Resend sending + all templates |
| `lib/google-calendar.ts` | OAuth2 client, Meet event creation |
| `lib/feedback.ts` | Feedback submit + retrieval |
| `lib/content.ts` / `lib/pages.ts` / `lib/settings.ts` | Editable site content, static pages, settings |
| `lib/s3.ts` / `lib/storage.ts` | File + content storage |
| `lib/help.ts` / `lib/alternative-requests.ts` | Help requests, alt-slot requests |

---

## 3. Feature List

### 3.1 Public
- Homepage with admin-editable content (hero, support, how-it-works, pricing, FAQ, footer)
- SEO/AEO: JSON-LD (MedicalOrganization, Physician, FAQPage, Website), OG tags, sitemap, robots
- Static pages: Privacy Policy, Terms, Confidentiality, Emergency Contact, Contact Us
- Contact form + "Need Help" modal
- Newsletter signup CTA

### 3.2 Booking (Public `/book`)
- 3-step flow: **Plan → Date & Time → Details + Payment**
- Homepage-style plan cards
- Calendar with availability (past/unavailable days disabled)
- Slot picker — **time only** (no duration shown)
- Email OTP verification on details step
- **Seamless login**: returning patient (verified email) auto-logs-in, form pre-fills, welcome banner
- Coupon code application (inline)
- Razorpay payment
- Success page: **Add to Calendar (.ics)** + **Download Receipt**
- Alternative-slot request modal (when no suitable time)

### 3.3 Patient Dashboard (`/patient`)
- Email + password login, email verification, forgot/reset password
- Tabs: Dashboard, Appointments, Reports, Profile
- Upcoming + past appointments
- **Join Call** button (when Meet link set)
- **Receipt** button (paid appointments)
- Reschedule (full-page, own appointments only, pending/confirmed only)
- Reports: view/download prescriptions
- Profile with email-verified badge

### 3.4 Admin Panel (`/admin`)
- Username/password login (lockout after failed attempts)
- **Content** editor (homepage), **Static Pages** editor
- **Patients**: list, detail, merge, password reset/clear, suspend
- **Appointments**:
  - Inline **status dropdown** (pending/confirmed/completed/cancelled/no_show)
  - **Auto-generate Google Meet** on status → confirmed
  - **Auto-send feedback email** on status → completed
  - **Video Link** column: Generate Meet / Paste link / Edit / Join
  - **Receipt** column (View)
  - Reports (uploaded files) expandable per row
- **Help Requests** viewer
- **Alt. Slot Requests** viewer
- **Coupons** CRUD
- **Newsletter** composer (with image upload)
- **Feedback** viewer (ratings, comments, average)
- **Settings** (email from/reply-to, etc.)
- **Users** (admin user management)

### 3.5 Receipt (`/receipt/[bookingId]`)
- Public, unguessable-UUID access (e-ticket model)
- Clinic header, patient details, appointment details, payment summary, payment IDs
- Print / Save as PDF (print-optimized, controls hidden in print)

### 3.6 Feedback (`/feedback/[appointmentId]`)
- Star rating (1–5) + optional comments
- One submission per appointment (duplicate guard)
- Branded, mobile-friendly form

### 3.7 Video Consultation
- Google Meet links created on Dr. Jyotika's calendar via OAuth2
- Patient added as calendar attendee (gets invite) when email on file
- Auto on confirm, or manual "Generate Meet", or manual paste

---

## 4. Database Structure

PostgreSQL (Neon). All IDs are UUID (`gen_random_uuid()`), all timestamps `timestamptz`.

### `patients`
Master patient record + auth fields.
`id, full_name, age, gender, phone (unique), email, city, notes, created_at, updated_at, password_hash, last_login_at, failed_login_count, locked_until, email_verified, email_verified_at, verification_otp, verification_token, verification_expires_at, is_suspended, suspended_at, suspension_reason`

### `appointments`
`id, patient_id→patients, plan_id, plan_title, scheduled_date (date), scheduled_time (time), duration_minutes, mode, reason_for_consultation, consultation_fee_paise, booking_fee_paise, total_paise, status, payment_status, meeting_link, admin_notes, created_at, updated_at, reminder_4h_sent_at, coupon_code, discount_paise`
- `status`: pending | confirmed | completed | cancelled | no_show
- `payment_status`: unpaid | paid | refunded | failed

### `payments`
`id, appointment_id→appointments, amount_paise, currency, gateway, gateway_payment_id, gateway_order_id, status, meta (jsonb), created_at, updated_at`
- `status`: initiated | success | failed | refunded

### `appointment_uploads`
Prescriptions/reports (stored in S3).
`id, appointment_id→appointments, file_name, file_url, file_size, mime_type, uploaded_at`

### `appointment_feedback`
`id, appointment_id→appointments (unique), patient_id→patients, rating (1–5), comments, created_at`

### `booking_email_otps`
`id, email, otp, created_at, expires_at, verified_at`

### `coupons`
`id, code (unique), description, discount_type (percent|flat), discount_value, min_amount_paise, max_uses, used_count, valid_from, valid_until, is_active, created_at, updated_at`

### `users`
Admin accounts.
`id, username (unique), password_hash, email, full_name, role, is_active, created_at, updated_at, last_login_at, failed_login_count, locked_until`

### `help_requests`
`id, name, phone, email, issue, message, source, status, admin_notes, created_at, updated_at`

### `alternative_appointment_requests`
`id, name, phone, email, plan_id, preferred_dates, notes, status, admin_notes, created_at, updated_at`

### `contact_submissions`
`id, name, email, phone, subject, message, created_at`

### `pages`
Editable static pages. `slug (pk), title, content, updated_at`

### `site_settings`
Key/value config. `key (pk), value, updated_at`

**Relationships:**
```
patients 1──∞ appointments 1──∞ payments
                   │
                   ├──∞ appointment_uploads
                   └──1  appointment_feedback ∞──1 patients
```

---

## 5. End-to-End Flows

### 5.1 Booking → Payment
```
1. Patient picks plan → date/time → fills details
2. (New) email OTP verification | (Returning) seamless login + prefill
3. POST /api/bookings            → creates appointment (status=pending, payment=unpaid)
4. POST /api/bookings/[id]/order → Razorpay order created
5. Razorpay Checkout modal → patient pays
6. POST /api/bookings/[id]/payment → signature verified, payment recorded,
                                      appointment payment_status=paid
7. Redirect → /book/success (Add to Calendar + Receipt)
8. Email: booking confirmation (Resend)
```

### 5.2 Confirm → Google Meet
```
Admin sets status → "confirmed"
   → PATCH /api/admin/appointments/[id]/status
   → if no meeting_link: createMeetEvent() via Google Calendar API
       - event on Dr. Jyotika's calendar
       - patient added as attendee (Calendar invite) if email present
   → meeting_link saved to appointment
   → patient dashboard shows "Join Call"
```

### 5.3 Completed → Feedback
```
Admin sets status → "completed"
   → PATCH /api/admin/appointments/[id]/status
   → if patient.email: send feedback request email (link to /feedback/[id])
Patient opens link → star rating + comments → POST /api/feedback/[id]
   → stored in appointment_feedback (one per appointment)
Admin → /admin/feedback shows all ratings + average
```

### 5.4 Reminders
```
Vercel Cron (hourly) → GET /api/cron/appointment-reminders
   → finds upcoming appointments within reminder window
   → sends reminder email (with Meet link if set)
   → marks reminder_4h_sent_at to avoid duplicates
```

---

## 6. Patient Journey

| Stage | Action | Where |
|---|---|---|
| Discover | Visit site, read content | `/` |
| Book | Plan → date/time → details | `/book` |
| Verify | Email OTP (or seamless login) | booking step 2 |
| Pay | Razorpay | Razorpay modal |
| Confirm | See success, add to calendar, get receipt | `/book/success` |
| Email | Booking confirmation | inbox |
| Manage | Login, view/reschedule appointments | `/patient` |
| Join | Click "Join Call" | Google Meet |
| Reminders | 24h / 1h before | inbox |
| Feedback | Star rating after session | `/feedback/[id]` |
| Records | Download prescriptions, receipts | `/patient`, `/receipt/[id]` |

---

## 7. Admin Journey

| Stage | Action | Where |
|---|---|---|
| Login | Username/password | `/admin/login` |
| Triage | See new bookings | `/admin/appointments` |
| Confirm | Status → confirmed (auto-Meet) | `/admin/appointments` |
| Consult | Click Join | Google Meet |
| Complete | Status → completed (auto-feedback email) | `/admin/appointments` |
| Records | Upload prescription | `/admin/patients/[id]` |
| Feedback | Review ratings | `/admin/feedback` |
| Content | Edit homepage / pages | `/admin/content`, `/admin/pages` |
| Marketing | Coupons, newsletter | `/admin/coupons`, `/admin/newsletter` |
| Requests | Help + alt-slot requests | `/admin/help-requests`, `/admin/alternative-requests` |

---

## 8. Integrations

| Service | Use | Key env |
|---|---|---|
| **Neon Postgres** | Primary DB | `DATABASE_URL` |
| **Razorpay** | Payments (live) | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID` |
| **Resend** | Transactional + broadcast email | `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO` |
| **Google Calendar/Meet** | Video links | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `GOOGLE_REDIRECT_URI` |
| **AWS S3** | Prescription/report files | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET` |
| **Vercel Blob** | Site content JSON | `BLOB_READ_WRITE_TOKEN` |
| **Google Analytics 4** | Traffic + booking-funnel analytics | `NEXT_PUBLIC_GA_ID` |

### Google Meet integration model
- **OAuth2 user credentials** (not service account — org policy blocks SA keys).
- One-time consent by Dr. Jyotika → refresh token stored in `GOOGLE_REFRESH_TOKEN`.
- Server uses refresh token to mint access tokens and create Calendar events with `conferenceData` (hangoutsMeet).
- One-time auth route: `/api/auth/google` → `/api/auth/google/callback`.

---

## 9. Authentication & Security

### Patient auth
- Email + password (scrypt hash, `{salt}:{hash}`)
- Cookie: `brams_patient_session` (httpOnly, 30-day)
- Email verification (OTP + magic link), forgot/reset password
- Account lockout after repeated failed logins; suspend support

### Admin auth
- Username + password (`users` table), `SESSION_COOKIE` + signed token
- All `/api/admin/**` and `/admin/**` gated; unauthenticated → redirect to `/admin/login`

### Booking OTP
- `booking_email_otps`, 6-digit, 10-min expiry, rate-limited (3 per 15 min)

### Hardening notes
- `isUuid()` guard prevents malformed IDs from causing 500s (returns clean 404)
- Receipt URL = unguessable UUID (e-ticket access model)
- Razorpay payment signature verified server-side
- Admin pages set `noindex`

---

## 10. API Reference

### Public / Booking
| Route | Method | Purpose |
|---|---|---|
| `/api/health` | GET | Health check (`ok:true`) |
| `/api/content` | GET | Site content JSON |
| `/api/plans`, `/api/plans/[id]` | GET | Consultation plans |
| `/api/booking-config` | GET | Booking schedule/config |
| `/api/bookings` | POST | Create appointment |
| `/api/bookings/[id]` | GET/PUT/DELETE | Appointment CRUD |
| `/api/bookings/[id]/order` | POST | Create Razorpay order |
| `/api/bookings/[id]/payment` | POST | Verify + record payment |
| `/api/bookings/[id]/uploads` | GET | Appointment files |
| `/api/coupons/validate` | POST | Validate coupon |
| `/api/otp/send`, `/api/otp/verify` | POST | Booking email OTP |
| `/api/receipt/[bookingId]` | GET | Receipt data |
| `/api/feedback/[appointmentId]` | GET/POST | Feedback fetch/submit |
| `/api/contact` | POST | Contact form |
| `/api/help-requests` | POST | Help request |
| `/api/alternative-requests` | POST | Alt-slot request |
| `/api/pages/[slug]` | GET | Static page content |

### Patient (authenticated)
| Route | Method | Purpose |
|---|---|---|
| `/api/patient/auth/login` | POST | Login |
| `/api/patient/auth/logout` | POST | Logout |
| `/api/patient/auth/register` | POST | Register |
| `/api/patient/auth/verify-email` | POST | Verify email |
| `/api/patient/auth/resend-verification` | POST | Resend OTP |
| `/api/patient/auth/forgot-password` | POST | Request reset |
| `/api/patient/auth/reset-password` | POST | Reset password |
| `/api/patient/me` | GET | Current patient |
| `/api/patient/reports` | GET | Patient reports |
| `/api/patient/appointments/[id]/reschedule` | PATCH | Reschedule |

### Admin (authenticated)
| Route | Method | Purpose |
|---|---|---|
| `/api/auth/login`, `/api/auth/logout` | POST | Admin login/logout |
| `/api/appointments` | GET | All appointments |
| `/api/admin/appointments/[id]/status` | PATCH | Status + auto Meet/feedback |
| `/api/admin/appointments/[id]/generate-meet` | POST | Manual Meet generation |
| `/api/admin/feedback` | GET | All feedback |
| `/api/admin/counts` | GET | Nav badge counts |
| `/api/admin/coupons`, `/api/admin/coupons/[id]` | * | Coupon CRUD |
| `/api/admin/newsletter`, `/upload` | POST | Newsletter send/image |
| `/api/admin/settings` | GET/PUT | Settings |
| `/api/patients`, `/api/patients/[id]` | * | Patient management |
| `/api/patients/[id]/actions` | POST | Reset/clear pw, suspend |
| `/api/patients/[id]/merge` | POST | Merge duplicates |
| `/api/patients/[id]/uploads` | POST | Upload prescription |
| `/api/users`, `/api/users/[id]` | * | Admin users |
| `/api/help-requests/[id]`, `/api/alternative-requests/[id]` | * | Request status |

### Integration / system
| Route | Method | Purpose |
|---|---|---|
| `/api/auth/google` | GET | Start Google OAuth (one-time) |
| `/api/auth/google/callback` | GET | OAuth callback → refresh token |
| `/api/cron/appointment-reminders` | GET | Hourly reminder cron |

---

## 11. Pages Reference

**Public:** `/`, `/book`, `/book/success`, `/book/failed`, `/contact`, `/privacy-policy`, `/terms`, `/confidentiality`, `/emergency-contact`, `/receipt/[bookingId]`, `/feedback/[appointmentId]`

**Patient:** `/patient`, `/patient/login`, `/patient/book`, `/patient/reschedule/[id]`, `/patient/verify`, `/patient/reset-password`

**Admin:** `/admin`, `/admin/login`, `/admin/content`, `/admin/pages`, `/admin/pages/[slug]`, `/admin/patients`, `/admin/patients/[id]`, `/admin/appointments`, `/admin/feedback`, `/admin/coupons`, `/admin/newsletter`, `/admin/help-requests`, `/admin/alternative-requests`, `/admin/settings`, `/admin/users`, `/admin/users/[id]`, `/admin/users/create`

---

## 12. Email System

All emails via **Resend**, from `info@bramsmindcare.com`. Templates in `lib/email-templates.ts` share one branded `layout()`.

| Template | Trigger |
|---|---|
| Verification | Patient email verify |
| Welcome | After verification |
| Appointment confirmation | Booking paid |
| Appointment reminder | Cron (24h/1h) |
| Forgot / reset password | Password flows |
| Suspension / reactivation | Admin actions |
| Newsletter | Admin broadcast |
| Contact notification / confirmation | Contact form |
| Help request notification / confirmation | Help request |
| Booking OTP | Booking step 2 |
| **Feedback request** | Status → completed |

**Deliverability (DNS):** SPF (`send.bramsmindcare.com` → amazonses.com), DKIM (`resend._domainkey`), DMARC (`_dmarc`).

---

## 13. SEO / AEO / GEO

Search, Answer-Engine, and Generative-Engine optimization are all implemented.

### 13.1 SEO (traditional search)
| Asset | File | Notes |
|---|---|---|
| Sitemap | `app/sitemap.ts` | Dynamic; public routes (`/`, `/book`, `/contact`, `/privacy-policy`, `/terms`, `/confidentiality`, `/emergency-contact`) |
| Robots | `app/robots.ts` | Allows `/`, disallows `/api`, `/admin`, `/patient`; links sitemap |
| PWA manifest | `app/manifest.ts` | App name, icons, theme color |
| Per-page metadata | `generateMetadata` in `app/page.tsx`, `book`, `contact`, `terms`, `privacy-policy`, `confidentiality`, `emergency-contact` | Titles, descriptions |
| Open Graph | `app/layout.tsx` | `og:title/description/image/url` (1200×630) |
| Twitter cards | `app/layout.tsx` | `summary_large_image` |
| Canonical URLs | metadata `alternates` | Prevents duplicate-content |
| Constants | `lib/seo.ts` | `SITE`, `DOCTOR`, `PUBLIC_ROUTES`, `NOINDEX_PATTERNS` |
| Admin/patient noindex | route metadata | `robots: { index:false }` on private areas |

### 13.2 AEO (Answer Engine Optimization)
Structured data so search/answer engines can extract rich answers — `components/JsonLd.tsx`, injected site-wide in `app/layout.tsx` + per-page:

| Schema | `@type` | Purpose |
|---|---|---|
| `OrganizationLd` | `MedicalOrganization` | Clinic identity, location, contact |
| `PhysicianLd` | `Physician` | Dr. Jyotika Kanwar + `MedicalTherapy` specialties (anxiety, depression, ADHD, trauma) |
| `WebsiteLd` | `WebSite` | Site-level entity + search action |
| `FaqLd` | `FAQPage` | FAQ Q&A pairs (rich results) |
| `ConsultationOffersLd` | `Offer`/service | Consultation plans as structured offers |
| `BreadcrumbsLd` | `BreadcrumbList` | Navigation breadcrumbs |

### 13.3 GEO (Generative Engine Optimization)
Makes the site ingestable by LLM-based assistants. In `app/robots.ts`, AI crawlers are **explicitly allowed** on public content (and blocked from private areas):

`GPTBot`, `OAI-SearchBot`, `ChatGPT-User` (OpenAI), `PerplexityBot` (Perplexity), `Google-Extended` (Gemini/Bard), `ClaudeBot`, `anthropic-ai` (Claude) — each `allow: ["/"]`, `disallow: ["/api/", "/admin/", "/patient/"]`.

Combined with the JSON-LD entities and FAQ schema, this lets generative engines cite Brams Mind Care accurately. Verified in QC section **I** (SEO/AEO/GEO).

---

## 14. Analytics (GA4)

Google Analytics 4 measures traffic and the booking funnel. Loaded via `@next/third-parties/google` and centralised in a thin event wrapper so event names/params stay consistent.

### 14.1 Setup
| Item | Value / File |
|---|---|
| Measurement ID | `G-S0TVR1C0Z7` |
| Env var | `NEXT_PUBLIC_GA_ID` (public; prod-only — tag is gated on it, so GA does not load locally where the var is unset) |
| Tag injection | `<GoogleAnalytics gaId={…} />` in `app/layout.tsx` (site-wide, non-blocking) |
| Event hub | `lib/analytics.ts` — wraps `sendGAEvent`; calls fail silently if GA isn't loaded |
| Auto-collected | GA4 Enhanced Measurement: `page_view`, `scroll`, outbound `click` (no code needed) |

### 14.2 Custom events
All custom events flow through `lib/analytics.ts`. Names follow GA4 recommended events where one exists (`begin_checkout`, `purchase`, `generate_lead`, `login`).

| Event | Fires when | Key params | Wired in |
|---|---|---|---|
| `begin_checkout` | "Pay" pressed → Razorpay opens | `item_name`, `value` (₹), `currency:"INR"` | `components/BookingFlow/StepDetails.tsx` |
| `purchase` | Payment verified (the conversion) | `transaction_id` (bookingId), `item_name`, `value`, `currency` | `StepDetails.tsx` |
| `payment_failed` | Razorpay `payment.failed` | `item_name` | `StepDetails.tsx` |
| `coupon_applied` | Valid coupon applied | `coupon` (code) | `StepDetails.tsx` |
| `generate_lead` | Contact / Need-Help / Alt-slot submit | `lead_source` (`contact_form` \| `need_help` \| `alternative_slot`) | `ContactForm`, `NeedHelpButton`, `AlternativeRequestModal` |
| `login` | Patient signs in | `method:"password"` | `app/patient/login/page.tsx` |
| `add_to_calendar` | "Add to Calendar" on success page | — | `components/BookingStatus/BookingSuccess.tsx` |
| `join_call` | "Join" / "Join Meeting" in dashboard | — | `app/patient/page.tsx` |
| `reschedule` | Reschedule confirmed | — | `app/patient/reschedule/[id]/PatientRescheduleFlow.tsx` |
| `feedback_submitted` | Feedback form submitted | `rating` (1–5) | `app/feedback/[appointmentId]/FeedbackForm.tsx` |

### 14.3 Verification
- **Automated (QC P1–P3):** GA4 tag present in production HTML, env-gated, non-blocking.
- **Manual (QC P4–P17):** open **GA4 → Realtime → Event count by Event name** (or DebugView) and perform each action to confirm the named event fires within ~30s.
- **Privacy:** no PII sent in event params (IDs and plan titles only; `transaction_id` is the booking UUID).

---

## 15. Deployment Strategy

- **Host:** Vercel (project `brams`, org `drjyotika-1563s-projects`), GitHub repo `drjyotika/Brams`.
- **Production branch:** `main` (Branch Tracking enabled).
- **Workflow:**
  ```
  feature branch → push → preview deployment (unique URL)
  merge to main  → automatic production deploy → bramsmindcare.com
  ```
- **Custom domain:** auto-assigned on production deploys (bramsmindcare.com).
- **Manual deploy (escape hatch):** `vercel --prod` deploys current code directly to production (bypasses branch tracking).
- **Build:** `next build`; `start`: `next start`. Local `dev` prepends `NODE_EXTRA_CA_CERTS=/etc/ssl/cert.pem` for Neon TLS on Node 24.
- **Config:** `vercel.json` defines the reminder cron.

> **Branch hygiene:** `main` is the source of truth and currently matches production. Always merge feature work into `main` to deploy.

---

## 16. Environment Variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon Postgres connection |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | Admin login |
| `AUTH_SECRET` | Session token signing |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Payments |
| `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO` | Email |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `GOOGLE_REDIRECT_URI` | Google Meet |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET` | File storage |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob (content) |
| `NEXT_PUBLIC_GA_ID` | Google Analytics 4 Measurement ID (`G-S0TVR1C0Z7`); prod-only |
| `NEXT_PUBLIC_SITE_URL`, `SITE_URL` | Absolute URLs (emails, OG, links) |

> Local values live in `.env.local` (gitignored). Production values are set in Vercel → Settings → Environment Variables. Local admin/patient test creds: `a@a.com` / `a`.

---

## 17. QC / Testing

- Catalog: `qa/test-cases.md` (sections A–P).
- Runner: `qa-tester` subagent via `/test-qc` (default target: production).
- **Sections:** A Infra, B Homepage, C Content, D Booking, E Payments, F Patient Auth, G Patient Dashboard, H Admin, I SEO, J Email, K Perf/Security, L Patient Sub-pages, M Receipt, N Google Meet, O Feedback, **P Analytics / GA4 events**.
- Types: `automated` (agent runs) / `manual` (human, e.g. Razorpay modal, GA4 Realtime).
- Severity: critical / major / minor.
- **Throttling note:** automated runs must space requests (browser UA + ~8s gaps); back-to-back bursts trip Vercel's bot mitigation (`X-Vercel-Mitigated: challenge`).

**Last run takeaways (post-deploy fixes):** UUID 500s converted to clean 404s across receipt/feedback/generate-meet/status; feedback feature deployed; GA4 events (section P) verified at the tag level; fixed `/patient/reset-password` being redirected to login while signed-out (middleware allow-list, found by QC F15).

---

## 18. Cron Jobs & Automation

| Job | Schedule | Endpoint | Action |
|---|---|---|---|
| Appointment reminders | hourly (`0 * * * *`) | `/api/cron/appointment-reminders` | Email reminders for upcoming appts; sets `reminder_4h_sent_at` |

**Auto-actions (not cron, event-driven via admin):**
- Status → confirmed ⇒ generate Meet link
- Status → completed ⇒ send feedback email

---

## 19. Known Gaps & Future Work

- **Meet link email to patient** — currently shown in dashboard + Calendar invite; no dedicated "your link is ready" email yet (reminder emails include it).
- **Admin API auth depth** — some `/api/bookings/[id]` mutations rely on the unguessable ID rather than a session check; consider adding admin-session verification.
- **Feedback email** depends on patient having an email on file.
- **DMARC** is `p=none` — consider tightening to `quarantine`/`reject` after monitoring.
- **`GOOGLE_REDIRECT_URI`** on production should point at the production callback; only needed if re-running the one-time OAuth.
- **Receipt/feedback** pages render error states client-side (200 shell) — acceptable, but SSR 404 could be cleaner.

---

*Generated from the live codebase and database schema on 2026-05-21. Updated 2026-05-21 to add Analytics (GA4) section 14 and QC section P.*
