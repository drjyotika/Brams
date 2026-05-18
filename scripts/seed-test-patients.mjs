// Seeds four test patient accounts covering every auth state so you can
// walk through the patient-login / verification / suspension / admin flows
// without registering a real human.
//
// Usage:
//   node --env-file=.env.local scripts/seed-test-patients.mjs
//
// Re-running is safe: it upserts on phone and prints fresh OTPs each run.

import { neon } from "@neondatabase/serverless";
import crypto from "node:crypto";

const sql = neon(process.env.DATABASE_URL);

// ─── Helpers (mirror lib/patient-auth.ts) ─────────────────────────────────────

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function generateOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

function generateToken() {
  return crypto.randomBytes(24).toString("hex");
}

// ─── Make sure the auth columns exist (idempotent) ────────────────────────────

console.log("⚙️   Ensuring patient auth columns…");

await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS password_hash      TEXT`;
await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS last_login_at      TIMESTAMPTZ`;
await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS failed_login_count INT NOT NULL DEFAULT 0`;
await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS locked_until       TIMESTAMPTZ`;
await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS email_verified          BOOLEAN     NOT NULL DEFAULT FALSE`;
await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS email_verified_at       TIMESTAMPTZ`;
await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS verification_otp        TEXT`;
await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS verification_token      TEXT`;
await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS verification_expires_at TIMESTAMPTZ`;
await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS is_suspended      BOOLEAN     NOT NULL DEFAULT FALSE`;
await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS suspended_at      TIMESTAMPTZ`;
await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS suspension_reason TEXT`;
await sql`CREATE UNIQUE INDEX IF NOT EXISTS patients_email_lower_unique ON patients (LOWER(email)) WHERE email IS NOT NULL`;

// ─── Define the four test personas ────────────────────────────────────────────

const PASSWORD       = "Test1234";
const passwordHash   = hashPassword(PASSWORD);

const verifiedExpiry   = new Date(Date.now() + 30 * 60 * 1000); // 30 min
const verifiedOtp      = generateOtp();
const verifiedToken    = generateToken();

const personas = [
  {
    key:         "verified",
    full_name:   "Verified Test User",
    phone:       "+919000000001",
    email:       "verified@test.com",
    city:        "Mumbai",
    age:         32,
    gender:      "female",
    password:    PASSWORD,
    verified:    true,
    suspended:   false,
    description: "Fully verified — happy-path login.",
  },
  {
    key:         "unverified",
    full_name:   "Unverified Test User",
    phone:       "+919000000002",
    email:       "unverified@test.com",
    city:        "Delhi",
    age:         28,
    gender:      "male",
    password:    PASSWORD,
    verified:    false,
    suspended:   false,
    otp:         verifiedOtp,
    token:       verifiedToken,
    expiresAt:   verifiedExpiry,
    description: "Has a fresh OTP — use it on /patient/verify.",
  },
  {
    key:         "suspended",
    full_name:   "Suspended Test User",
    phone:       "+919000000003",
    email:       "suspended@test.com",
    city:        "Bengaluru",
    age:         41,
    gender:      "female",
    password:    PASSWORD,
    verified:    true,
    suspended:   true,
    reason:      "Test suspension — payment dispute pending",
    description: "Login should be blocked with the suspension reason.",
  },
  {
    key:         "guest",
    full_name:   "Guest (No Account) User",
    phone:       "+919000000004",
    email:       "guest@test.com",
    city:        "Chennai",
    age:         36,
    gender:      "other",
    password:    null,           // no password — they booked without registering
    verified:    false,
    suspended:   false,
    description: "Booked without registering. Try the Register flow to claim.",
  },
];

// ─── Upsert each persona ──────────────────────────────────────────────────────

console.log("🌱  Seeding test patients…\n");

for (const p of personas) {
  // Step 1 — upsert the base row (full_name, phone, email, city, age, gender)
  await sql`
    INSERT INTO patients (full_name, age, gender, phone, email, city)
    VALUES (${p.full_name}, ${p.age}, ${p.gender}, ${p.phone}, ${p.email}, ${p.city})
    ON CONFLICT (phone) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      age       = EXCLUDED.age,
      gender    = EXCLUDED.gender,
      email     = EXCLUDED.email,
      city      = EXCLUDED.city,
      updated_at = NOW()
  `;

  // Step 2 — apply the auth-related state
  await sql`
    UPDATE patients SET
      password_hash           = ${p.password ? passwordHash : null},
      email_verified          = ${p.verified},
      email_verified_at       = ${p.verified ? new Date().toISOString() : null},
      verification_otp        = ${p.otp ?? null},
      verification_token      = ${p.token ?? null},
      verification_expires_at = ${p.expiresAt ? p.expiresAt.toISOString() : null},
      is_suspended            = ${p.suspended},
      suspended_at            = ${p.suspended ? new Date().toISOString() : null},
      suspension_reason       = ${p.reason ?? null},
      failed_login_count      = 0,
      locked_until            = NULL,
      updated_at              = NOW()
    WHERE phone = ${p.phone}
  `;
}

// ─── Print the credentials summary ────────────────────────────────────────────

console.log("✅  Done. Test credentials:\n");
console.log("┌──────────────┬─────────────────────────┬───────────────┬──────────┬─────────────┐");
console.log("│ Persona      │ Email                   │ Phone         │ Password │ State       │");
console.log("├──────────────┼─────────────────────────┼───────────────┼──────────┼─────────────┤");
for (const p of personas) {
  const state =
    p.suspended      ? "Suspended"
    : !p.password    ? "Guest"
    : !p.verified    ? "Unverified"
    :                  "Verified";
  console.log(
    `│ ${p.key.padEnd(12)} │ ${p.email.padEnd(23)} │ ${p.phone.padEnd(13)} │ ${(p.password ?? "—").padEnd(8)} │ ${state.padEnd(11)} │`,
  );
}
console.log("└──────────────┴─────────────────────────┴───────────────┴──────────┴─────────────┘");

console.log("\n🔐  Live verification code for `unverified@test.com`:");
console.log(`    OTP:   ${verifiedOtp}`);
console.log(`    Link:  /patient/verify?token=${verifiedToken}`);
console.log(`    Expires: ${verifiedExpiry.toISOString()}`);

console.log("\n💡  Notes:");
console.log("   • All test patients share password 'Test1234' (except the guest).");
console.log("   • Sign in with EITHER email OR phone.");
console.log("   • Re-run this script to issue a fresh OTP whenever you need one.");
console.log("   • To wipe test data:  DELETE FROM patients WHERE phone LIKE '+9190000000%';");
