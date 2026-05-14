// Patient authentication — separate from the admin `users` table.  Patients
// log in with their phone OR email (case-insensitive) plus a password that
// is stored as a scrypt hash on the `patients` row.

import crypto from "node:crypto";
import { sql } from "./db";
import type { Patient } from "./bookings";

// ─── Types ───────────────────────────────────────────────────────────────────

export type PatientAuthData = Patient & {
  password_hash:           string | null;
  last_login_at:           Date | null;
  failed_login_count:      number;
  locked_until:            Date | null;
  email_verified:          boolean;
  email_verified_at:       Date | null;
  verification_otp:        string | null;
  verification_token:      string | null;
  verification_expires_at: Date | null;
  is_suspended:            boolean;
  suspended_at:            Date | null;
  suspension_reason:       string | null;
};

// ─── Schema migration ────────────────────────────────────────────────────────
//
// Fully idempotent: creates the patients table if it doesn't exist, then adds
// auth columns with ADD COLUMN IF NOT EXISTS.  Safe to run on every cold start;
// cached in-process after the first successful run.

let migrated = false;

export async function ensurePatientAuthSchema(): Promise<void> {
  if (migrated) return;

  // Base table — matches migrate.mjs exactly; no-op if already present.
  await sql`
    CREATE TABLE IF NOT EXISTS patients (
      id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
      full_name   VARCHAR(255) NOT NULL,
      age         INTEGER,
      gender      VARCHAR(20),
      phone       VARCHAR(30)  NOT NULL UNIQUE,
      email       VARCHAR(255),
      city        VARCHAR(100),
      notes       TEXT,
      created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `;

  // Authentication columns
  await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS password_hash      TEXT`;
  await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS last_login_at      TIMESTAMPTZ`;
  await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS failed_login_count INT NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS locked_until       TIMESTAMPTZ`;

  // Email verification
  await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS email_verified          BOOLEAN     NOT NULL DEFAULT FALSE`;
  await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS email_verified_at       TIMESTAMPTZ`;
  await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS verification_otp        TEXT`;
  await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS verification_token      TEXT`;
  await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS verification_expires_at TIMESTAMPTZ`;

  // Account suspension
  await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS is_suspended      BOOLEAN     NOT NULL DEFAULT FALSE`;
  await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS suspended_at      TIMESTAMPTZ`;
  await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS suspension_reason TEXT`;

  // Case-insensitive unique email index (allows multiple NULLs)
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS patients_email_lower_unique
      ON patients (LOWER(email))
      WHERE email IS NOT NULL
  `;

  // Fast lookup by verification token
  await sql`
    CREATE INDEX IF NOT EXISTS patients_verification_token_idx
      ON patients (verification_token)
      WHERE verification_token IS NOT NULL
  `;

  migrated = true;
}

// ─── Verification helpers ────────────────────────────────────────────────────

const VERIFICATION_TTL_MINUTES = 30;

/** Six-digit numeric OTP, uniform 100000-999999. */
export function generateOtp(): string {
  return String(crypto.randomInt(100000, 1000000));
}

/** URL-safe random token for click-through verification. */
export function generateVerificationToken(): string {
  return crypto.randomBytes(24).toString("hex");
}

/**
 * Issues a fresh OTP + token for the given patient, sets a 30 min expiry,
 * and returns both for use in the email body.  Any previous code is
 * overwritten — only the latest is valid.
 */
export async function issueVerificationCode(
  patientId: string,
): Promise<{ otp: string; token: string }> {
  await ensurePatientAuthSchema();
  const otp       = generateOtp();
  const token     = generateVerificationToken();
  const expiresAt = new Date(Date.now() + VERIFICATION_TTL_MINUTES * 60 * 1000);
  await sql`
    UPDATE patients SET
      verification_otp        = ${otp},
      verification_token      = ${token},
      verification_expires_at = ${expiresAt.toISOString()},
      updated_at              = NOW()
    WHERE id = ${patientId}
  `;
  return { otp, token };
}

export type VerifyResult =
  | { ok: true;  patient: PatientAuthData }
  | { ok: false; error: string };

/**
 * Marks the patient as verified if the supplied OTP or token matches and
 * hasn't expired.  Clears the stored code on success.
 */
export async function verifyEmailWithCode(input: {
  otp?:   string;
  token?: string;
}): Promise<VerifyResult> {
  await ensurePatientAuthSchema();

  const otp   = input.otp?.trim();
  const token = input.token?.trim();

  if (!otp && !token) {
    return { ok: false, error: "Verification code or token is required." };
  }

  // Locate the matching patient row.  We accept either credential and
  // confirm expiry server-side.
  const rows = await sql`
    SELECT * FROM patients
    WHERE (${otp ?? null}::TEXT IS NOT NULL AND verification_otp = ${otp ?? null})
       OR (${token ?? null}::TEXT IS NOT NULL AND verification_token = ${token ?? null})
    LIMIT 1
  `;
  const match = (rows[0] as PatientAuthData) ?? null;
  if (!match) return { ok: false, error: "Invalid or unknown verification code." };

  if (match.email_verified) {
    return { ok: true, patient: match };
  }

  if (!match.verification_expires_at || new Date(match.verification_expires_at) < new Date()) {
    return { ok: false, error: "This verification code has expired. Please request a new one." };
  }

  // Mark verified, clear the codes.
  const updated = await sql`
    UPDATE patients SET
      email_verified          = TRUE,
      email_verified_at       = NOW(),
      verification_otp        = NULL,
      verification_token      = NULL,
      verification_expires_at = NULL,
      updated_at              = NOW()
    WHERE id = ${match.id}
    RETURNING *
  `;
  return { ok: true, patient: updated[0] as PatientAuthData };
}

// ─── Suspension helpers ──────────────────────────────────────────────────────

export async function suspendPatient(id: string, reason: string | null): Promise<void> {
  await ensurePatientAuthSchema();
  await sql`
    UPDATE patients SET
      is_suspended      = TRUE,
      suspended_at      = NOW(),
      suspension_reason = ${reason},
      updated_at        = NOW()
    WHERE id = ${id}
  `;
}

export async function unsuspendPatient(id: string): Promise<void> {
  await ensurePatientAuthSchema();
  await sql`
    UPDATE patients SET
      is_suspended      = FALSE,
      suspended_at      = NULL,
      suspension_reason = NULL,
      failed_login_count = 0,
      locked_until       = NULL,
      updated_at         = NOW()
    WHERE id = ${id}
  `;
}

/** Admin override — manually mark an email as verified (e.g. user lost the email). */
export async function markEmailVerified(id: string): Promise<void> {
  await ensurePatientAuthSchema();
  await sql`
    UPDATE patients SET
      email_verified          = TRUE,
      email_verified_at       = NOW(),
      verification_otp        = NULL,
      verification_token      = NULL,
      verification_expires_at = NULL,
      updated_at              = NOW()
    WHERE id = ${id}
  `;
}

// ─── Password helpers ────────────────────────────────────────────────────────

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(plain: string, stored: string | null): boolean {
  if (!stored) return false;
  try {
    const [salt, hash] = stored.split(":");
    const derived = crypto.scryptSync(plain, salt, 64);
    return crypto.timingSafeEqual(Buffer.from(hash, "hex"), derived);
  } catch {
    return false;
  }
}

// ─── Lookup ──────────────────────────────────────────────────────────────────

/** Find a patient by phone OR email (case-insensitive). */
export async function findPatientByLogin(loginId: string): Promise<PatientAuthData | null> {
  await ensurePatientAuthSchema();
  const value = loginId.trim();
  if (!value) return null;
  const rows = await sql`
    SELECT * FROM patients
    WHERE phone = ${value} OR LOWER(email) = LOWER(${value})
    LIMIT 1
  `;
  return (rows[0] as PatientAuthData) ?? null;
}

export async function findPatientForAuth(id: string): Promise<PatientAuthData | null> {
  const rows = await sql`SELECT * FROM patients WHERE id = ${id} LIMIT 1`;
  return (rows[0] as PatientAuthData) ?? null;
}

// ─── Login tracking ──────────────────────────────────────────────────────────

export async function recordPatientLogin(id: string): Promise<void> {
  await sql`
    UPDATE patients
    SET last_login_at      = NOW(),
        failed_login_count = 0,
        locked_until       = NULL,
        updated_at         = NOW()
    WHERE id = ${id}
  `;
}

export async function recordPatientFailedLogin(id: string): Promise<void> {
  await sql`
    UPDATE patients
    SET failed_login_count = failed_login_count + 1,
        locked_until = CASE WHEN failed_login_count + 1 >= 5
          THEN NOW() + INTERVAL '15 minutes' ELSE locked_until END,
        updated_at = NOW()
    WHERE id = ${id}
  `;
}

export function isPatientLocked(p: PatientAuthData): boolean {
  if (!p.locked_until) return false;
  return new Date(p.locked_until) > new Date();
}

// ─── Registration ────────────────────────────────────────────────────────────

export type RegisterInput = {
  full_name: string;
  phone:     string;
  email:     string;
  password:  string;
};

export type RegisterResult =
  | { ok: true;  patient: PatientAuthData }
  | { ok: false; error: string };

/**
 * Registers a new patient.  Behaviour:
 *  - If no patient row matches the phone/email → INSERT.
 *  - If a row matches AND already has a password_hash → reject (already registered).
 *  - If a row matches but has no password (booked without an account) → claim it
 *    by filling in name/email and setting the password.
 */
export async function registerPatient(input: RegisterInput): Promise<RegisterResult> {
  await ensurePatientAuthSchema();

  const full_name = input.full_name.trim();
  const phone     = input.phone.trim();
  const email     = input.email.trim().toLowerCase();
  const password  = input.password;

  if (!full_name || !phone || !email || !password) {
    return { ok: false, error: "Name, phone, email and password are required." };
  }
  if (password.length < 6) {
    return { ok: false, error: "Password must be at least 6 characters." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Please enter a valid email address." };
  }

  // Look for an existing row that already claims this phone OR email.
  const matchRows = await sql`
    SELECT * FROM patients
    WHERE phone = ${phone} OR LOWER(email) = ${email}
    LIMIT 1
  `;
  const existing = (matchRows[0] as PatientAuthData) ?? null;
  const password_hash = hashPassword(password);

  if (existing) {
    if (existing.password_hash) {
      return {
        ok: false,
        error: "An account already exists for this phone or email. Please log in instead.",
      };
    }
    // Claim the existing row
    const rows = await sql`
      UPDATE patients SET
        full_name     = ${full_name},
        phone         = ${phone},
        email         = ${email},
        password_hash = ${password_hash},
        updated_at    = NOW()
      WHERE id = ${existing.id}
      RETURNING *
    `;
    return { ok: true, patient: rows[0] as PatientAuthData };
  }

  try {
    const rows = await sql`
      INSERT INTO patients (full_name, phone, email, password_hash)
      VALUES (${full_name}, ${phone}, ${email}, ${password_hash})
      RETURNING *
    `;
    return { ok: true, patient: rows[0] as PatientAuthData };
  } catch (err) {
    const msg = (err as Error).message ?? "";
    if (/unique|duplicate/i.test(msg)) {
      return {
        ok: false,
        error: "An account already exists for this phone or email.",
      };
    }
    throw err;
  }
}

/** Admin / patient profile helper for changing the stored password. */
export async function setPatientPassword(id: string, password: string): Promise<void> {
  await ensurePatientAuthSchema();
  if (password.length < 6) throw new Error("Password must be at least 6 characters.");
  const hash = hashPassword(password);
  await sql`
    UPDATE patients
    SET password_hash      = ${hash},
        failed_login_count = 0,
        locked_until       = NULL,
        updated_at         = NOW()
    WHERE id = ${id}
  `;
}
