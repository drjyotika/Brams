import { NextRequest, NextResponse } from "next/server";
import { sql } from "../../../../lib/db";
import {
  getPatientById,
  getAppointmentsForPatient,
} from "../../../../lib/bookings";
import { ensurePatientAuthSchema } from "../../../../lib/patient-auth";

type Ctx = { params: Promise<{ id: string }> };

// ─── Read ────────────────────────────────────────────────────────────────────

export async function GET(_req: NextRequest, ctx: Ctx) {
  await ensurePatientAuthSchema();
  const { id } = await ctx.params;
  const patient = await getPatientById(id);
  if (!patient) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const appointments = await getAppointmentsForPatient(id);
  return NextResponse.json({ patient, appointments });
}

// ─── Edit ────────────────────────────────────────────────────────────────────

type PatchBody = Partial<{
  full_name: string;
  age:       number | null;
  gender:    string | null;
  phone:     string;
  email:     string | null;
  city:      string | null;
  notes:     string | null;
}>;

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    await ensurePatientAuthSchema();
    const { id } = await ctx.params;
    const body   = (await req.json()) as PatchBody;

    const existing = await getPatientById(id);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const next = {
      full_name: body.full_name ?? existing.full_name,
      age:       body.age       === undefined ? existing.age       : body.age,
      gender:    body.gender    === undefined ? existing.gender    : body.gender,
      phone:     body.phone     ?? existing.phone,
      email:     body.email     === undefined ? existing.email     : (body.email ? body.email.trim().toLowerCase() : null),
      city:      body.city      === undefined ? existing.city      : body.city,
      notes:     body.notes     === undefined ? existing.notes     : body.notes,
    };

    try {
      await sql`
        UPDATE patients SET
          full_name  = ${next.full_name},
          age        = ${next.age},
          gender     = ${next.gender},
          phone      = ${next.phone},
          email      = ${next.email},
          city       = ${next.city},
          notes      = ${next.notes},
          updated_at = NOW()
        WHERE id = ${id}
      `;
    } catch (err) {
      const msg = (err as Error).message ?? "";
      if (/unique|duplicate/i.test(msg)) {
        return NextResponse.json(
          { error: "Phone or email is already in use by another patient." },
          { status: 409 },
        );
      }
      throw err;
    }

    const updated = await getPatientById(id);
    return NextResponse.json({ patient: updated });
  } catch (err) {
    console.error("[patients/PATCH]", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

// ─── Delete ──────────────────────────────────────────────────────────────────

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;

    // Refuse to delete if the patient has appointments — admin should
    // cancel/reassign first to keep historical records consistent.
    const appts = await sql`SELECT COUNT(*)::int AS c FROM appointments WHERE patient_id = ${id}`;
    if ((appts[0] as { c: number }).c > 0) {
      return NextResponse.json(
        { error: "Cannot delete a patient with existing appointments. Suspend the account instead." },
        { status: 409 },
      );
    }

    await sql`DELETE FROM patients WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[patients/DELETE]", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
