import { NextRequest, NextResponse } from "next/server";
import { getAppointmentById, getPatientById, updateAppointment, type AppointmentStatus } from "../../../../../../lib/bookings";
import { createMeetEvent } from "../../../../../../lib/google-calendar";
import { sendEmail, buildFeedbackRequestEmail } from "../../../../../../lib/email";
import { sql } from "../../../../../../lib/db";

type Ctx = { params: Promise<{ id: string }> };

const VALID_STATUSES = ["pending", "confirmed", "completed", "cancelled", "no_show"];

// PATCH /api/admin/appointments/[id]/status
// Body: { status: string }
// Side-effects:
//   confirmed  → auto-generate Google Meet if no link set
//   completed  → send feedback email to patient (if email on file)
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id }    = await ctx.params;
  const { status } = await req.json() as { status: string };

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const appt = await getAppointmentById(id);
  if (!appt) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const patient = await getPatientById(appt.patient_id);
  if (!patient) return NextResponse.json({ error: "Patient not found." }, { status: 404 });

  // Update status
  await updateAppointment(id, { status: status as AppointmentStatus });

  let meetLink: string | null = appt.meeting_link;
  let meetError: string | null = null;
  let feedbackEmailSent = false;

  // ── Auto side-effects ──────────────────────────────────────────────────────

  // 1. Confirmed → generate Meet if none exists
  if (status === "confirmed" && !appt.meeting_link) {
    try {
      meetLink = await createMeetEvent({
        appointmentId:   appt.id,
        planTitle:       appt.plan_title,
        patientName:     patient.full_name,
        patientEmail:    patient.email,
        scheduledDate:   appt.scheduled_date,
        scheduledTime:   appt.scheduled_time,
        durationMinutes: appt.duration_minutes ?? 60,
      });
      await sql`UPDATE appointments SET meeting_link = ${meetLink}, updated_at = NOW() WHERE id = ${id}`;
    } catch (err) {
      meetError = err instanceof Error ? err.message : "Meet generation failed";
      console.error("[status/confirmed] meet gen failed:", err);
    }
  }

  // 2. Completed → send feedback email
  if (status === "completed" && patient.email) {
    const siteUrl  = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bramsmindcare.com";
    const dateStr  = typeof appt.scheduled_date === "string"
      ? appt.scheduled_date.slice(0, 10)
      : (appt.scheduled_date as Date).toISOString().slice(0, 10);

    const [y, m, d] = dateStr.split("-").map(Number);
    const formatted = new Date(y, m - 1, d).toLocaleDateString("en-IN", {
      weekday: "short", day: "numeric", month: "short", year: "numeric",
    });

    const email = buildFeedbackRequestEmail({
      patientName:   patient.full_name,
      planTitle:     appt.plan_title,
      scheduledDate: formatted,
      feedbackUrl:   `${siteUrl}/feedback/${id}`,
    });

    const result = await sendEmail({ to: patient.email, ...email });
    feedbackEmailSent = result.ok;
  }

  return NextResponse.json({
    ok:                true,
    status,
    meeting_link:      meetLink,
    meet_error:        meetError,
    feedback_email:    feedbackEmailSent,
  });
}
