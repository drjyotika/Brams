/**
 * Diagnostic: checks the production DB connection and patient schema.
 * Usage:
 *   DATABASE_URL="postgres://..." node scripts/check-prod-db.mjs
 *
 * Get DATABASE_URL from:
 *   Vercel Dashboard → Your Project → Settings → Environment Variables → DATABASE_URL
 */

import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("❌  DATABASE_URL is not set. Pass it inline:");
  console.error('   DATABASE_URL="postgres://..." node scripts/check-prod-db.mjs');
  process.exit(1);
}

const sql = neon(url);

// ── 1. Basic connectivity ─────────────────────────────────────────────────────
try {
  const [{ now }] = await sql`SELECT NOW() AS now`;
  console.log("✅  Connected to DB. Server time:", now);
} catch (err) {
  console.error("❌  Cannot connect:", err.message);
  process.exit(1);
}

// ── 2. patients table exists ──────────────────────────────────────────────────
try {
  const rows = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'patients'
    ORDER BY ordinal_position
  `;
  if (!rows.length) {
    console.error("❌  'patients' table does not exist — run: node scripts/migrate.mjs");
    process.exit(1);
  }
  const cols = rows.map((r) => r.column_name);
  console.log("✅  patients table found. Columns:", cols.join(", "));

  const authCols = [
    "password_hash", "email_verified", "verification_otp",
    "verification_token", "verification_expires_at",
    "is_suspended", "suspension_reason",
    "failed_login_count", "locked_until",
  ];
  const missing = authCols.filter((c) => !cols.includes(c));
  if (missing.length) {
    console.warn("⚠️   Missing auth columns (will be added automatically on first request):", missing.join(", "));
  } else {
    console.log("✅  All patient-auth columns present.");
  }
} catch (err) {
  console.error("❌  Schema check failed:", err.message);
}

// ── 3. Can INSERT + DELETE a test row ────────────────────────────────────────
try {
  const [row] = await sql`
    INSERT INTO patients (full_name, phone, email, password_hash)
    VALUES ('__diag_test__', '+919999999999', 'diag@test.invalid', 'dummy')
    RETURNING id
  `;
  await sql`DELETE FROM patients WHERE id = ${row.id}`;
  console.log("✅  INSERT + DELETE works. Registration flow should succeed.");
} catch (err) {
  console.error("❌  Test INSERT failed:", err.message);
  if (/password_hash/.test(err.message)) {
    console.error("   → The password_hash column is missing. Hit any API endpoint once to auto-migrate, or run migrate.mjs.");
  }
}

// ── 4. Env var checklist ──────────────────────────────────────────────────────
console.log("\n── Vercel env var checklist (set these in Project → Settings → Env Vars) ──");
const required = [
  "DATABASE_URL",
  "ADMIN_USERNAME",
  "ADMIN_PASSWORD",
  "AUTH_SECRET",
  "BLOB_READ_WRITE_TOKEN",
];
const smtp = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "EMAIL_FROM"];

for (const v of required) {
  console.log(process.env[v] ? `✅  ${v}` : `❌  ${v}  ← MISSING`);
}
console.log("SMTP (optional — falls back to console log if unset):");
for (const v of smtp) {
  console.log(process.env[v] ? `✅  ${v}` : `⚠️   ${v}  ← not set`);
}
