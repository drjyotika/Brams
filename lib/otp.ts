/**
 * Booking email OTP — generate, send, verify.
 *
 * Table: booking_email_otps
 *   email        – lower-cased recipient address
 *   otp          – 6-digit code
 *   expires_at   – 10 minutes from creation
 *   verified_at  – set when OTP is successfully verified
 *
 * Rate limit: max 3 OTPs per email per 15 minutes.
 */

import { sql } from "./db";

const OTP_EXPIRY_MIN    = 10;
const RATE_LIMIT_COUNT  = 3;
const RATE_LIMIT_MIN    = 15;

let schemaReady = false;

export async function ensureOtpSchema(): Promise<void> {
  if (schemaReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS booking_email_otps (
      id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      email       TEXT        NOT NULL,
      otp         CHAR(6)     NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at  TIMESTAMPTZ NOT NULL,
      verified_at TIMESTAMPTZ
    )
  `;
  // Index for fast per-email lookups
  await sql`
    CREATE INDEX IF NOT EXISTS idx_beo_email_created
    ON booking_email_otps (email, created_at DESC)
  `;
  schemaReady = true;
}

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ─── Create (send) ────────────────────────────────────────────────────────────

export async function createOtp(
  email: string,
): Promise<{ ok: true; otp: string } | { ok: false; error: string }> {
  await ensureOtpSchema();
  const normalised = email.toLowerCase().trim();

  // Rate-limit check
  const since = new Date(Date.now() - RATE_LIMIT_MIN * 60_000).toISOString();
  const [{ cnt }] = await sql`
    SELECT COUNT(*)::int AS cnt
    FROM booking_email_otps
    WHERE email = ${normalised}
      AND created_at > ${since}
  ` as { cnt: number }[];

  if (cnt >= RATE_LIMIT_COUNT) {
    return {
      ok:    false,
      error: `Too many OTP requests. Please wait a few minutes before trying again.`,
    };
  }

  const otp       = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MIN * 60_000).toISOString();

  await sql`
    INSERT INTO booking_email_otps (email, otp, expires_at)
    VALUES (${normalised}, ${otp}, ${expiresAt})
  `;

  return { ok: true, otp };
}

// ─── Verify ───────────────────────────────────────────────────────────────────

export async function verifyOtp(
  email: string,
  otp:   string,
): Promise<{ verified: true } | { verified: false; error: string }> {
  await ensureOtpSchema();
  const normalised = email.toLowerCase().trim();

  // Most-recent unexpired, unverified OTP for this email
  const rows = await sql`
    SELECT id, otp
    FROM booking_email_otps
    WHERE email       = ${normalised}
      AND expires_at  > NOW()
      AND verified_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1
  ` as { id: string; otp: string }[];

  if (rows.length === 0) {
    return {
      verified: false,
      error:    "OTP has expired or was not found. Please request a new one.",
    };
  }

  if (rows[0].otp !== otp.trim()) {
    return { verified: false, error: "Incorrect OTP. Please check and try again." };
  }

  // Mark as verified so the same OTP can't be reused
  await sql`
    UPDATE booking_email_otps
    SET verified_at = NOW()
    WHERE id = ${rows[0].id}
  `;

  return { verified: true };
}

// ─── Recently-verified check ────────────────────────────────────────────────

/**
 * True when this email had an OTP successfully verified within the last
 * `withinMinutes`. Lets the booking flow securely confirm the just-booked email
 * was proven (server-side) before marking the patient's email verified / logging
 * them in.
 */
export async function isEmailRecentlyVerified(
  email: string,
  withinMinutes = 20,
): Promise<boolean> {
  await ensureOtpSchema();
  const normalised = email.toLowerCase().trim();
  const since = new Date(Date.now() - withinMinutes * 60_000).toISOString();
  const rows = await sql`
    SELECT 1
    FROM booking_email_otps
    WHERE email        = ${normalised}
      AND verified_at IS NOT NULL
      AND verified_at  > ${since}
    LIMIT 1
  ` as unknown[];
  return rows.length > 0;
}
