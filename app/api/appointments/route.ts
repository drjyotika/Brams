import { NextResponse } from "next/server";
import { getAllAppointments } from "../../../lib/bookings";

export async function GET() {
  const appointments = await getAllAppointments();
  return NextResponse.json(appointments);
}
