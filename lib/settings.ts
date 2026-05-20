/**
 * Site-wide settings backed by the `site_settings` DB table.
 * Uses a 60-second in-process cache so email sends don't hit the DB every time.
 *
 * All keys are namespaced (email_*, etc.) for easy extension.
 */

import { sql } from "./db";

// ─── Types ────────────────────────────────────────────────────────────────────

export type EmailSettings = {
  /** Full "From" string, e.g. "Brams Mind Care <info@bramsmindcare.com>" */
  fromEmail:    string;
  /** Reply-To address. Usually same as the info address. */
  replyToEmail: string;
  /** Where Contact form + Need Help alerts are delivered. */
  clinicEmail:  string;
  /** Dr. Jyotika's direct address (used for appointment-related replies). */
  doctorEmail:  string;
};

export const EMAIL_DEFAULTS: EmailSettings = {
  fromEmail:    "Brams Mind Care <info@bramsmindcare.com>",
  replyToEmail: "info@bramsmindcare.com",
  clinicEmail:  "info@bramsmindcare.com",
  doctorEmail:  "drjyotika@bramsmindcare.com",
};

// ─── Schema migration (idempotent) ───────────────────────────────────────────

let tableMigrated = false;

async function ensureTable(): Promise<void> {
  if (tableMigrated) return;
  await sql`
    CREATE TABLE IF NOT EXISTS site_settings (
      key        VARCHAR(100) PRIMARY KEY,
      value      TEXT         NOT NULL,
      updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `;
  tableMigrated = true;
}

// ─── In-process cache (60 s TTL) ─────────────────────────────────────────────

let _cache: { settings: EmailSettings; expiry: number } | null = null;

function invalidateCache() {
  _cache = null;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function getEmailSettings(): Promise<EmailSettings> {
  if (_cache && _cache.expiry > Date.now()) return _cache.settings;

  try {
    await ensureTable();
    const rows = await sql`
      SELECT key, value FROM site_settings
      WHERE key IN ('email_from', 'email_reply_to', 'email_clinic', 'email_doctor')
    `;
    const map: Record<string, string> = {};
    for (const r of rows as { key: string; value: string }[]) map[r.key] = r.value;

    const settings: EmailSettings = {
      fromEmail:    map["email_from"]     ?? EMAIL_DEFAULTS.fromEmail,
      replyToEmail: map["email_reply_to"] ?? EMAIL_DEFAULTS.replyToEmail,
      clinicEmail:  map["email_clinic"]   ?? EMAIL_DEFAULTS.clinicEmail,
      doctorEmail:  map["email_doctor"]   ?? EMAIL_DEFAULTS.doctorEmail,
    };

    _cache = { settings, expiry: Date.now() + 60_000 };
    return settings;
  } catch (e) {
    console.error("[settings] getEmailSettings failed, using defaults:", e);
    return EMAIL_DEFAULTS;
  }
}

export async function updateEmailSettings(
  updates: Partial<EmailSettings>,
): Promise<void> {
  await ensureTable();
  invalidateCache();

  const pairs: [string, string][] = [];
  if (updates.fromEmail    !== undefined) pairs.push(["email_from",     updates.fromEmail]);
  if (updates.replyToEmail !== undefined) pairs.push(["email_reply_to", updates.replyToEmail]);
  if (updates.clinicEmail  !== undefined) pairs.push(["email_clinic",   updates.clinicEmail]);
  if (updates.doctorEmail  !== undefined) pairs.push(["email_doctor",   updates.doctorEmail]);

  for (const [key, value] of pairs) {
    await sql`
      INSERT INTO site_settings (key, value)
      VALUES (${key}, ${value})
      ON CONFLICT (key) DO UPDATE
        SET value = ${value}, updated_at = NOW()
    `;
  }
}
