import { sql } from "./db";

export type AltRequestStatus = "new" | "contacted" | "resolved";

export type AlternativeRequest = {
  id:              string;
  name:            string;
  phone:           string;
  email:           string | null;
  plan_id:         string | null;
  preferred_dates: string | null;
  notes:           string | null;
  status:          AltRequestStatus;
  admin_notes:     string | null;
  created_at:      Date;
  updated_at:      Date;
};

// Create the table if it doesn't exist yet (called lazily on first use).
async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS alternative_appointment_requests (
      id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      name            TEXT        NOT NULL,
      phone           TEXT        NOT NULL,
      email           TEXT,
      plan_id         TEXT,
      preferred_dates TEXT,
      notes           TEXT,
      status          TEXT        NOT NULL DEFAULT 'new',
      admin_notes     TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

export async function createAlternativeRequest(input: {
  name:            string;
  phone:           string;
  email?:          string | null;
  plan_id?:        string | null;
  preferred_dates?: string | null;
  notes?:          string | null;
}): Promise<AlternativeRequest> {
  await ensureTable();
  const rows = await sql`
    INSERT INTO alternative_appointment_requests
      (name, phone, email, plan_id, preferred_dates, notes)
    VALUES
      (${input.name}, ${input.phone}, ${input.email ?? null},
       ${input.plan_id ?? null}, ${input.preferred_dates ?? null},
       ${input.notes ?? null})
    RETURNING *
  `;
  return rows[0] as AlternativeRequest;
}

export async function getAllAlternativeRequests(): Promise<AlternativeRequest[]> {
  await ensureTable();
  const rows = await sql`
    SELECT * FROM alternative_appointment_requests
    ORDER BY created_at DESC
  `;
  return rows as AlternativeRequest[];
}

export async function updateAlternativeRequest(
  id: string,
  patch: Partial<Pick<AlternativeRequest, "status" | "admin_notes">>,
): Promise<void> {
  await sql`
    UPDATE alternative_appointment_requests SET
      status      = COALESCE(${patch.status      ?? null}, status),
      admin_notes = COALESCE(${patch.admin_notes ?? null}, admin_notes),
      updated_at  = NOW()
    WHERE id = ${id}
  `;
}
