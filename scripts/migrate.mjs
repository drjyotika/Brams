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

// ─── Pages table ─────────────────────────────────────────────────────────────

await sql`
  CREATE TABLE IF NOT EXISTS pages (
    slug        VARCHAR(100)  PRIMARY KEY,
    title       VARCHAR(255)  NOT NULL,
    content     TEXT          NOT NULL DEFAULT '',
    updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
  )
`;

await sql`
  INSERT INTO pages (slug, title, content) VALUES
    ('privacy-policy',    'Privacy Policy',              ''),
    ('confidentiality',   'Confidentiality Agreement',   ''),
    ('terms',             'Terms of Service',            ''),
    ('emergency-contact', 'Emergency Contact',           ''),
    ('contact',           'Contact Us',                  '')
  ON CONFLICT (slug) DO NOTHING
`;

await sql`
  CREATE TABLE IF NOT EXISTS contact_submissions (
    id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    name       VARCHAR(255)  NOT NULL,
    email      VARCHAR(255)  NOT NULL,
    phone      VARCHAR(50),
    subject    VARCHAR(255),
    message    TEXT          NOT NULL,
    created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
  )
`;

console.log("✅  Tables 'pages' and 'contact_submissions' ready.");

// ─── Patients & Appointments ──────────────────────────────────────────────────

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

await sql`CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients (phone)`;
await sql`CREATE INDEX IF NOT EXISTS idx_patients_email ON patients (email)`;

await sql`
  CREATE TABLE IF NOT EXISTS appointments (
    id                      UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id              UUID         NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    plan_id                 VARCHAR(50)  NOT NULL,
    plan_title              VARCHAR(100) NOT NULL,
    scheduled_date          DATE         NOT NULL,
    scheduled_time          TIME         NOT NULL,
    duration_minutes        INTEGER      NOT NULL DEFAULT 30,
    mode                    VARCHAR(20)  NOT NULL DEFAULT 'online',
    reason_for_consultation TEXT,
    consultation_fee_paise  INTEGER      NOT NULL,
    booking_fee_paise       INTEGER      NOT NULL DEFAULT 0,
    total_paise             INTEGER      NOT NULL,
    status                  VARCHAR(20)  NOT NULL DEFAULT 'pending',
    payment_status          VARCHAR(20)  NOT NULL DEFAULT 'unpaid',
    meeting_link            TEXT,
    admin_notes             TEXT,
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  )
`;

await sql`CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments (patient_id)`;
await sql`CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments (scheduled_date)`;
await sql`CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments (status)`;

await sql`
  CREATE TABLE IF NOT EXISTS appointment_uploads (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id  UUID         NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    file_name       VARCHAR(255) NOT NULL,
    file_url        TEXT         NOT NULL,
    file_size       INTEGER,
    mime_type       VARCHAR(100),
    uploaded_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  )
`;

await sql`CREATE INDEX IF NOT EXISTS idx_uploads_appointment ON appointment_uploads (appointment_id)`;

await sql`
  CREATE TABLE IF NOT EXISTS payments (
    id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id     UUID         NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    amount_paise       INTEGER      NOT NULL,
    currency           VARCHAR(10)  NOT NULL DEFAULT 'INR',
    gateway            VARCHAR(30),
    gateway_payment_id VARCHAR(255),
    gateway_order_id   VARCHAR(255),
    status             VARCHAR(20)  NOT NULL DEFAULT 'initiated',
    meta               JSONB,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  )
`;

await sql`CREATE INDEX IF NOT EXISTS idx_payments_appointment ON payments (appointment_id)`;
await sql`CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (status)`;

console.log("✅  Tables 'patients', 'appointments', 'appointment_uploads', 'payments' ready.");

// ─── Help requests ────────────────────────────────────────────────────────────

await sql`
  CREATE TABLE IF NOT EXISTS help_requests (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255) NOT NULL,
    phone       VARCHAR(30),
    email       VARCHAR(255),
    issue       VARCHAR(100),
    message     TEXT         NOT NULL,
    source      VARCHAR(50),
    status      VARCHAR(20)  NOT NULL DEFAULT 'new',
    admin_notes TEXT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  )
`;

await sql`CREATE INDEX IF NOT EXISTS idx_help_status ON help_requests (status)`;
await sql`CREATE INDEX IF NOT EXISTS idx_help_created ON help_requests (created_at DESC)`;

console.log("✅  Table 'help_requests' ready.");
