import { NextRequest, NextResponse } from "next/server";
import { sql } from "../../../../../lib/db";
import { getPatientById } from "../../../../../lib/bookings";
import { ensurePatientAuthSchema } from "../../../../../lib/patient-auth";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/patients/[id]/merge
 *
 * Merges `other_id` (secondary) into `[id]` (primary).
 *
 * - All appointments are reassigned from secondary → primary.
 * - Empty profile fields on primary are filled from secondary.
 * - Notes from both are concatenated (if both non-empty).
 * - The secondary patient record is deleted.
 * - Primary's phone / email are kept; secondary's are discarded.
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    await ensurePatientAuthSchema();
    const { id } = await ctx.params;
    const { other_id } = (await req.json()) as { other_id?: string };

    if (!other_id) {
      return NextResponse.json({ error: "other_id is required." }, { status: 400 });
    }
    if (other_id === id) {
      return NextResponse.json({ error: "Cannot merge a patient with themselves." }, { status: 400 });
    }

    const [primary, secondary] = await Promise.all([
      getPatientById(id),
      getPatientById(other_id),
    ]);

    if (!primary)   return NextResponse.json({ error: "Primary patient not found."   }, { status: 404 });
    if (!secondary) return NextResponse.json({ error: "Secondary patient not found." }, { status: 404 });

    // 1. Reassign all of secondary's appointments to primary.
    await sql`UPDATE appointments SET patient_id = ${id} WHERE patient_id = ${other_id}`;

    // 2. Delete the secondary record (safe now — no appointments remain).
    await sql`DELETE FROM patients WHERE id = ${other_id}`;

    // 3. Patch primary: fill blank fields from secondary.
    //    Primary's own values always win; secondary only fills gaps.
    const mergedNotes =
      primary.notes && secondary.notes
        ? `${primary.notes}\n---\n${secondary.notes}`
        : (primary.notes ?? secondary.notes);

    await sql`
      UPDATE patients SET
        age        = COALESCE(${primary.age},    ${secondary.age}),
        gender     = COALESCE(${primary.gender}, ${secondary.gender}),
        city       = COALESCE(${primary.city},   ${secondary.city}),
        email      = COALESCE(${primary.email},  ${secondary.email}),
        notes      = ${mergedNotes},
        updated_at = NOW()
      WHERE id = ${id}
    `;

    const updated = await getPatientById(id);
    return NextResponse.json({ patient: updated });
  } catch (err) {
    console.error("[patients/merge/POST]", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
