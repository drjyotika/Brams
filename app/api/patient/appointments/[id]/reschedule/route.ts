import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PATIENT_SESSION_COOKIE, verifyPatientToken } from "../../../../../../lib/auth";
import { getAppointmentById, updateAppointment } from "../../../../../../lib/bookings";
import { rescheduleMeetEventForAppointment } from "../../../../../../lib/google-calendar";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/patient/appointments/[id]/reschedule
 * Body: { scheduled_date: string (YYYY-MM-DD), scheduled_time: string (HH:mm:ss) }
 *
 * Patients can only reschedule their own non-cancelled, non-completed appointments.
 * The Google Meet/calendar event is moved to the new time (keeping the same Meet
 * link) and the patient is re-notified via the calendar invite.
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const jar       = await cookies();
    const token     = jar.get(PATIENT_SESSION_COOKIE)?.value;
    if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const patientId = await verifyPatientToken(token);
    if (!patientId) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

    const { id } = await ctx.params;
    const appt = await getAppointmentById(id);

    if (!appt) return NextResponse.json({ error: "Appointment not found." }, { status: 404 });
    if (appt.patient_id !== patientId)
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });

    if (["cancelled", "completed", "no_show"].includes(appt.status))
      return NextResponse.json({ error: "This appointment cannot be rescheduled." }, { status: 400 });

    const { scheduled_date, scheduled_time } = await req.json() as {
      scheduled_date: string;
      scheduled_time: string;
    };

    if (!scheduled_date || !scheduled_time)
      return NextResponse.json({ error: "Date and time are required." }, { status: 400 });

    // Move to the new slot first (status + existing Meet link are preserved).
    await updateAppointment(id, { scheduled_date, scheduled_time });

    // Move the Google Meet/calendar event to the new time. Non-fatal — a Google
    // hiccup must not block the reschedule the patient already committed to.
    const { meetLink, error } = await rescheduleMeetEventForAppointment(id);
    if (error) console.error("[patient/reschedule] meet move failed:", error);

    return NextResponse.json({ ok: true, meeting_link: meetLink });
  } catch (e) {
    console.error("[patient/reschedule]", e);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
