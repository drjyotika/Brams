import { NextRequest, NextResponse } from "next/server";
import {
  getPatientById,
  getAppointmentsForPatient,
} from "../../../../lib/bookings";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const patient = await getPatientById(id);
  if (!patient) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const appointments = await getAppointmentsForPatient(id);
  return NextResponse.json({ patient, appointments });
}
