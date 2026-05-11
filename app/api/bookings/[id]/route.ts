import { NextRequest, NextResponse } from "next/server";
import {
  getAppointmentById,
  getPatientById,
  getUploadsForAppointment,
  updateAppointment,
} from "../../../../lib/bookings";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/bookings/[id] → appointment + patient + uploads
export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const appointment = await getAppointmentById(id);
  if (!appointment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const [patient, uploads] = await Promise.all([
    getPatientById(appointment.patient_id),
    getUploadsForAppointment(id),
  ]);
  return NextResponse.json({ appointment, patient, uploads });
}

// PUT /api/bookings/[id] → update status / payment / meeting link / notes
export async function PUT(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await req.json();
  await updateAppointment(id, {
    status:         body.status,
    payment_status: body.payment_status,
    meeting_link:   body.meeting_link,
    admin_notes:    body.admin_notes,
  });
  return NextResponse.json({ ok: true });
}
