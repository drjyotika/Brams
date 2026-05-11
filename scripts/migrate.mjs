// Run once to create the users table and seed the initial admin account.
// Usage: node --env-file=.env.local scripts/migrate.mjs

import { neon } from "@neondatabase/serverless";
import crypto from "node:crypto";

const sql = neon(process.env.DATABASE_URL);

// ─── Hash helper (mirrors lib/users.ts) ───────────────────────────────────────

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

// ─── Create table ─────────────────────────────────────────────────────────────

console.log("⚙️   Running migration…");

await sql`
  CREATE EXTENSION IF NOT EXISTS "pgcrypto"
`;

await sql`
  CREATE TABLE IF NOT EXISTS users (
    id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    username            VARCHAR(100)  NOT NULL UNIQUE,
    password_hash       TEXT          NOT NULL,
    email               VARCHAR(255)  UNIQUE,
    full_name           VARCHAR(255),
    role                VARCHAR(50)   NOT NULL DEFAULT 'admin',
    is_active           BOOLEAN       NOT NULL DEFAULT true,
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    last_login_at       TIMESTAMPTZ,
    failed_login_count  INTEGER       NOT NULL DEFAULT 0,
    locked_until        TIMESTAMPTZ
  )
`;

await sql`
  CREATE INDEX IF NOT EXISTS idx_users_username ON users (username)
`;

console.log("✅  Table 'users' ready.");

// ─── Seed admin user ──────────────────────────────────────────────────────────

const username = process.env.ADMIN_USERNAME ?? "admin";
const password = process.env.ADMIN_PASSWORD ?? "";

if (!password) {
  console.error("❌  ADMIN_PASSWORD is not set — skipping seed.");
  process.exit(1);
}

const hash = hashPassword(password);

await sql`
  INSERT INTO users (username, password_hash, role, full_name)
  VALUES (
    ${username},
    ${hash},
    'admin',
    'Dr. Jyotika Kanwar'
  )
  ON CONFLICT (username) DO UPDATE
    SET password_hash = EXCLUDED.password_hash,
        updated_at    = NOW()
`;

console.log(`✅  Admin user '${username}' seeded.`);
console.log("🎉  Migration complete.");
