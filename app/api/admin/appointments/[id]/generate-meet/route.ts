import { NextRequest, NextResponse } from "next/server";
import { getAppointmentById, getPatientById } from "../../../../../../lib/bookings";
import { createMeetEvent } from "../../../../../../lib/google-calendar";
import { sql } from "../../../../../../lib/db";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/admin/appointments/[id]/generate-meet
export async function POST(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;

  const appt = await getAppointmentById(id);
  if (!appt) return NextResponse.json({ error: "Appointment not found." }, { status: 404 });

  const patient = await getPatientById(appt.patient_id);
  if (!patient) return NextResponse.json({ error: "Patient not found." }, { status: 404 });

  try {
    const meetLink = await createMeetEvent({
      appointmentId:   appt.id,
      planTitle:       appt.plan_title,
      patientName:     patient.full_name,
      patientEmail:    patient.email,
      scheduledDate:   appt.scheduled_date,
      scheduledTime:   appt.scheduled_time,
      durationMinutes: appt.duration_minutes ?? 60,
    });

    // Persist the link
    await sql`
      UPDATE appointments
      SET meeting_link = ${meetLink}, updated_at = NOW()
      WHERE id = ${id}
    `;

    return NextResponse.json({ meeting_link: meetLink });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[generate-meet]", err);
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}
