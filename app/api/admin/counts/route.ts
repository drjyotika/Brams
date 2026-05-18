import { NextResponse } from "next/server";
import { sql } from "../../../../lib/db";

/**
 * GET /api/admin/counts?patientsSince=ISO&appointmentsSince=ISO&helpSince=ISO&altSince=ISO
 *
 * Returns the number of records created AFTER each "since" timestamp.
 * The admin layout calls this to decide whether to show a badge on sidebar items.
 * Each count is fetched independently so a missing table never blocks the others.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const patientsSince     = searchParams.get("patientsSince");
  const appointmentsSince = searchParams.get("appointmentsSince");
  const helpSince         = searchParams.get("helpSince");
  const altSince          = searchParams.get("altSince");

  async function count(query: () => Promise<unknown[]>): Promise<number> {
    try {
      const rows = await query();
      return Number((rows[0] as { c: number } | undefined)?.c ?? 0);
    } catch {
      return 0;
    }
  }

  const [patients, appointments, helpRequests, altRequests] = await Promise.all([
    count(() =>
      patientsSince
        ? sql`SELECT COUNT(*)::int AS c FROM patients WHERE created_at > ${patientsSince}`
        : Promise.resolve([{ c: 0 }]),
    ),
    count(() =>
      appointmentsSince
        ? sql`SELECT COUNT(*)::int AS c FROM appointments WHERE created_at > ${appointmentsSince}`
        : Promise.resolve([{ c: 0 }]),
    ),
    count(() =>
      helpSince
        ? sql`SELECT COUNT(*)::int AS c FROM help_requests WHERE created_at > ${helpSince}`
        : Promise.resolve([{ c: 0 }]),
    ),
    count(() =>
      altSince
        ? sql`SELECT COUNT(*)::int AS c FROM alternative_appointment_requests WHERE created_at > ${altSince}`
        : Promise.resolve([{ c: 0 }]),
    ),
  ]);

  return NextResponse.json({ patients, appointments, helpRequests, altRequests });
}
