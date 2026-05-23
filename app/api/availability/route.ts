import { NextRequest, NextResponse } from "next/server";
import { getBookedTimes } from "../../../lib/bookings";

export const dynamic = "force-dynamic";

// GET /api/availability?date=YYYY-MM-DD
// Returns the already-booked time slots for a date so the booking UI can hide
// them. { booked: ["10:00:00", "11:30:00", ...] }
export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid or missing date" }, { status: 400 });
  }
  try {
    const booked = await getBookedTimes(date);
    return NextResponse.json(
      { booked },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error("[availability] GET failed:", e);
    return NextResponse.json({ error: "Failed to load availability" }, { status: 500 });
  }
}
