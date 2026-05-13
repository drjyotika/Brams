# Brams Mind Care — Test Credentials & Test Plan

This doc covers the full patient-login + email-verification + admin-account-management surface added in the recent work. Run the seed script once, then walk the test cases below.

---

## 1. One-time setup

### 1.1 Seed the test data

```bash
npm run seed:test-patients
```

The script:
- Adds the patient-auth columns to the `patients` table if they aren't there yet (idempotent).
- Upserts four test patients covering every account state.
- Prints a live OTP and magic-link token for the **Unverified** persona.

Re-run it any time you need a fresh OTP (the old one is overwritten).

### 1.2 Optional — capture real outbound emails

Real email goes through the standalone microservice in `services/email/`, which relays via SMTP and ships mail as `verification@bramsmindcare.com`. To exercise real delivery:

```bash
# Terminal 1 — start the email service
cd services/email
cp .env.example .env       # fill in SMTP creds + token
npm install
npm run dev

# Terminal 2 — Next.js
# Add these two lines to .env.local (token must match the service)
#   EMAIL_SERVICE_URL=http://localhost:4000
#   EMAIL_SERVICE_TOKEN=<same value as in services/email/.env>
npm run dev
```

Without `EMAIL_SERVICE_URL` set, the Next.js app simply console-logs the message — handy for local testing without booting the service.

### 1.3 Wipe test data when done

```sql
DELETE FROM patients WHERE phone LIKE '+9190000000%';
```

---

## 2. Test credentials

### Admin
Whatever `ADMIN_USERNAME` / `ADMIN_PASSWORD` you set when running `npm run migrate`. If you've forgotten, re-run `migrate` to reset the admin row — the script does an `ON CONFLICT … DO UPDATE` on the password hash.

Admin login: `http://localhost:3000/admin/login`

### Patients (all use password `Test1234`)

| Persona       | Email                  | Phone           | State        | Notes                                          |
|---------------|------------------------|-----------------|--------------|------------------------------------------------|
| **Verified**  | `verified@test.com`    | `+919000000001` | Verified     | Happy-path login → dashboard                   |
| **Unverified**| `unverified@test.com`  | `+919000000002` | Unverified   | Use the OTP printed by the seed script         |
| **Suspended** | `suspended@test.com`   | `+919000000003` | Suspended    | Login should be blocked                        |
| **Guest**     | `guest@test.com`       | `+919000000004` | No password  | Register flow should "claim" this row          |

You can sign in with **either email or phone**.

---

## 3. Test cases

Each case lists: **What to do** → **Expected result**. Anything in `code` is a URL, payload, or DB state.

### A. Patient registration

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| A1 | Happy-path register | Visit `/patient/login`, click **Register**, fill in fresh data, submit | Redirected to `/patient/verify`. Verification email logged to console (or sent via Resend). Patient row exists with `email_verified=false`, `password_hash` set, fresh `verification_otp`. |
| A2 | Duplicate phone | Re-submit the form using a phone that already has a registered account (e.g. `+919000000001`) | 400 response with message *"An account already exists for this phone or email. Please log in instead."* |
| A3 | Duplicate email | Submit with `verified@test.com` and an unused phone | Same duplicate-account error. |
| A4 | Claim existing booking (Guest) | Register using `guest@test.com` / `+919000000004` and a new password | Succeeds. The existing row gains a `password_hash` and a verification code. Old appointments / data preserved. |
| A5 | Weak password | Submit with `pwd` | 400 with *"Password must be at least 6 characters."* |
| A6 | Mismatched confirmation | Type different values in Password / Confirm fields | Client-side error *"Passwords do not match."* — no API call. |
| A7 | Invalid email | Submit `foo@bar` | 400 *"Please enter a valid email address."* |

### B. Email verification

Use the OTP / link printed by the seed script (or the one logged in the dev server console for a new registration).

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| B1 | Valid OTP | At `/patient/verify`, enter the 6-digit code | Success banner *"Email verified!"*, redirected to `/patient`. Row now has `email_verified=true`, `email_verified_at` set, `verification_*` cleared. |
| B2 | Magic link (same browser) | Open `/patient/verify?token=<token>` while signed in as the same patient | Auto-submits, lands on `/patient`. |
| B3 | Magic link (signed out) | Sign out, then open `/patient/verify?token=<token>` directly | Verification still succeeds (middleware exempts `/patient/verify`). |
| B4 | Magic link (different patient) | Sign in as A, open B's token URL | Verification succeeds for B. Response includes `is_current_user: false`. A's session is unchanged. |
| B5 | Invalid OTP | Enter `000000` | 400 *"Invalid or unknown verification code."* |
| B6 | Expired code | Wait > 30 min and try the OTP (or manually `UPDATE patients SET verification_expires_at = NOW() - INTERVAL '1 minute'`) | 400 *"This verification code has expired."* |
| B7 | Resend | On `/patient/verify`, click **Resend code** | New email logged / sent. Old OTP becomes invalid; the new one verifies successfully. |
| B8 | Re-verify after success | Try to verify again with an old code | 400 (codes were cleared on first success). |

### C. Patient login

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| C1 | Login (verified) by email | `verified@test.com` / `Test1234` | Lands on `/patient` dashboard. No banner. |
| C2 | Login (verified) by phone | `+919000000001` / `Test1234` | Same as C1. |
| C3 | Login (unverified) | `unverified@test.com` / `Test1234` | Redirected to `/patient/verify`. Yellow "Verify your email" banner shows on `/patient` if you navigate there manually. |
| C4 | Login (suspended) | `suspended@test.com` / `Test1234` | 403 with message *"Account suspended: Test suspension — payment dispute pending"*. No session cookie set. |
| C5 | Login (guest, no password) | `guest@test.com` / anything | 401 *"Invalid credentials."* (Same wording as wrong-password to avoid leaking which addresses are registered.) |
| C6 | Wrong password | `verified@test.com` / `wrong` | 401. `failed_login_count` increments. |
| C7 | Account lockout | Repeat C6 five times | 6th attempt returns 423 *"Account temporarily locked…"*. Verify `locked_until` is ~15 min ahead in DB. |
| C8 | Lockout auto-clears on success | Wait for `locked_until` to pass (or `UPDATE patients SET locked_until=NULL WHERE …`), then log in successfully | `failed_login_count` resets to 0, `locked_until` cleared, `last_login_at` updated. |

### D. Patient dashboard

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| D1 | Profile view | Login as verified | All KV pairs render. No banner. |
| D2 | Unverified banner | Login as unverified | Yellow banner with "Verify now →" link to `/patient/verify`. |
| D3 | Appointments empty state | Test user with no appointments | *"No appointments yet…"* placeholder shown. |
| D4 | Appointments populated | Add an appointment in the admin panel for a test user, refresh | Card shows date, time, plan title, status pill, payment pill. "Join" button appears only when `meeting_link` is set. |
| D5 | Logout | Click **Logout** | Cookie cleared; redirected to `/patient/login`. Hitting `/patient` again redirects to login (middleware). |
| D6 | Session expiry / tamper | Manually corrupt the `brams_patient_session` cookie | Next protected request 401s and redirects to login. |

### E. Admin patient management

Sign in at `/admin/login`, then go to `/admin/patients`.

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| E1 | Status column | Patients list page | Pills show `Verified` / `Unverified` / `Suspended` / `Guest` per the seeded data. |
| E2 | Open detail page | Click **Manage** on a patient | Two new panels render: **Patient Details** (with **Edit** button) and **Account Management**. |
| E3 | Inline edit | Click **Edit**, change name + city, click **Save changes** | Toast clears, panel re-renders with new values. DB row updated. |
| E4 | Duplicate email on edit | In E3 change email to a value another patient has | 409 with *"Phone or email is already in use…"*. No DB change. |
| E5 | Cancel edit | Open Edit, change a field, click **Cancel** | Reverts to original values; no PATCH fired. |
| E6 | Suspend | On a verified patient, click **Suspend account**, enter a reason | Status flips to red `Suspended` pill, reason banner shown. Try to log in as that patient → blocked with the same reason (Case C4). |
| E7 | Unsuspend | On a suspended patient, click **Unsuspend account** | Flips back. Login works again. |
| E8 | Resend verification | On an unverified patient, click **Resend verification email** | Toast *"Done."*. Email logged / delivered. New OTP stored in DB. |
| E9 | Manually mark verified | On an unverified patient, click **Mark email verified**, confirm | `email_verified=true`, banner gone from patient dashboard. |
| E10 | Reset password | Enter `NewPass99` in the reset box, click **Set password**, confirm | Password updates. Old password no longer logs in; new one does. |
| E11 | Clear password | Click **Clear password**, confirm | `password_hash` becomes NULL. Login fails. Registering the same email/phone now succeeds via the claim path (A4). |
| E12 | Delete (no appts) | Click **Delete patient** on a patient with zero appointments | Confirm prompt → deleted → redirected to list. Row gone from DB. |
| E13 | Delete (with appts) | Click **Delete patient** on a patient with appointments | 409 *"Cannot delete a patient with existing appointments…"*. Row preserved. |

### F. End-to-end happy path

This combined run-through exercises the full lifecycle:

1. Visit `/patient/login`, click **Register**.
2. Enter fresh details, submit → land on `/patient/verify`.
3. In the dev console, grab the OTP from the email log → enter it on the verify page → land on `/patient`.
4. Sign out → sign in again with the same credentials → straight to `/patient` (verified, no banner).
5. As admin, find the new patient in `/admin/patients`, suspend them.
6. Sign back in as the patient → blocked with the suspension reason.
7. Admin unsuspends, resets the password → patient logs in with the new password and reaches the dashboard.

---

## 4. Sanity SQL queries

Run these in your Neon console to verify state after each test:

```sql
-- Snapshot of all test patients
SELECT
  full_name, phone, email,
  email_verified, is_suspended,
  password_hash IS NOT NULL AS has_password,
  verification_otp, verification_expires_at,
  failed_login_count, locked_until, last_login_at
FROM patients
WHERE phone LIKE '+9190000000%'
ORDER BY phone;

-- Reset lockout / failed count for a patient
UPDATE patients
SET failed_login_count = 0, locked_until = NULL
WHERE email = 'verified@test.com';

-- Force-expire a verification code
UPDATE patients
SET verification_expires_at = NOW() - INTERVAL '1 minute'
WHERE email = 'unverified@test.com';
```
