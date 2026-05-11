import { NextResponse } from "next/server";
import { getAllPatients } from "../../../lib/bookings";

export async function GET() {
  const patients = await getAllPatients();
  return NextResponse.json(patients);
}
