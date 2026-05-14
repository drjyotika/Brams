import { NextRequest, NextResponse } from "next/server";
import { getAllPatients } from "../../../lib/bookings";
import { sql } from "../../../lib/db";

export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";

  if (q.length >= 2) {
    const pattern = `%${q}%`;
    const rows = await sql`
      SELECT id, full_name, phone, email, city,
             COALESCE(is_suspended, FALSE) AS is_suspended
      FROM patients
      WHERE full_name ILIKE ${pattern}
         OR phone     ILIKE ${pattern}
         OR email     ILIKE ${pattern}
      ORDER BY full_name
      LIMIT 20
    `;
    return NextResponse.json(rows);
  }

  const patients = await getAllPatients();
  return NextResponse.json(patients);
}
