import { sql } from "./db";
import { HELP_ISSUE_OPTIONS, type HelpIssue, type HelpStatus } from "./help-types";

export { HELP_ISSUE_OPTIONS };
export type { HelpIssue, HelpStatus };

export type HelpRequest = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  issue: HelpIssue | null;
  message: string;
  source: string | null;
  status: HelpStatus;
  admin_notes: string | null;
  created_at: Date;
  updated_at: Date;
};

export async function createHelpRequest(input: {
  name: string;
  phone?: string | null;
  email?: string | null;
  issue?: HelpIssue | null;
  message: string;
  source?: string | null;
}): Promise<HelpRequest> {
  const rows = await sql`
    INSERT INTO help_requests (name, phone, email, issue, message, source)
    VALUES (${input.name}, ${input.phone ?? null}, ${input.email ?? null},
            ${input.issue ?? null}, ${input.message}, ${input.source ?? null})
    RETURNING *
  `;
  return rows[0] as HelpRequest;
}

export async function getAllHelpRequests(): Promise<HelpRequest[]> {
  const rows = await sql`
    SELECT * FROM help_requests ORDER BY created_at DESC
  `;
  return rows as HelpRequest[];
}

export async function getHelpRequestById(id: string): Promise<HelpRequest | null> {
  const rows = await sql`SELECT * FROM help_requests WHERE id = ${id} LIMIT 1`;
  return (rows[0] as HelpRequest) ?? null;
}

export async function updateHelpRequest(
  id: string,
  patch: Partial<Pick<HelpRequest, "status" | "admin_notes">>,
): Promise<void> {
  await sql`
    UPDATE help_requests SET
      status      = COALESCE(${patch.status      ?? null}, status),
      admin_notes = COALESCE(${patch.admin_notes ?? null}, admin_notes),
      updated_at  = NOW()
    WHERE id = ${id}
  `;
}
