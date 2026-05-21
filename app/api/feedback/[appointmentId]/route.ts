import { NextRequest, NextResponse } from "next/server";
import { getAppointmentById } from "../../../../lib/bookings";
import { getFeedbackByAppointment, submitFeedback } from "../../../../lib/feedback";

type Ctx = { params: Promise<{ appointmentId: string }> };

// GET — check if feedback already submitted for this appointment
export async function GET(_req: NextRequest, ctx: Ctx) {
  const { appointmentId } = await ctx.params;
  const appt = await getAppointmentById(appointmentId);
  if (!appt) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const existing = await getFeedbackByAppointment(appointmentId);
  return NextResponse.json({
    appointment: {
      id:         appt.id,
      plan_title: appt.plan_title,
      status:     appt.status,
    },
    feedback: existing,
  });
}

// POST — submit feedback
export async function POST(req: NextRequest, ctx: Ctx) {
  const { appointmentId } = await ctx.params;
  const { rating, comments } = await req.json() as { rating: number; comments?: string };

  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be 1–5." }, { status: 400 });
  }

  const appt = await getAppointmentById(appointmentId);
  if (!appt) return NextResponse.json({ error: "Appointment not found." }, { status: 404 });

  await submitFeedback(appointmentId, appt.patient_id, rating, comments?.trim() || null);
  return NextResponse.json({ ok: true });
}
