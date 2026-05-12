import { NextResponse } from "next/server";
import { sql } from "../../../lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  if (!date) {
    return NextResponse.json({ error: "date query param required (YYYY-MM-DD)" }, { status: 400 });
  }

  // Return time slots that are already booked on this date (excluding cancelled appointments)
  const rows = await sql`
    SELECT scheduled_time
    FROM appointments
    WHERE scheduled_date = ${date}
      AND status NOT IN ('cancelled')
  `;

  // Normalise to HH:MM:SS strings
  const booked = rows.map((r) => {
    const t: string = typeof r.scheduled_time === "string"
      ? r.scheduled_time
      : String(r.scheduled_time);
    return t.slice(0, 8);
  });

  return NextResponse.json({ booked });
}
