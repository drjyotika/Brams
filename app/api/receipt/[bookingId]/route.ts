import { NextRequest, NextResponse } from "next/server";
import { getAppointmentById } from "../../../../lib/bookings";
import { sql } from "../../../../lib/db";

// GET /api/receipt/[bookingId]
// Returns full booking + patient + payment details for the printable receipt.
//
// Auth: The booking UUID itself serves as a bearer token — it's a
// unguessable random ID.  No additional session check is required for the
// receipt view (same model as airline e-tickets).
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  const { bookingId } = await params;

  if (!bookingId) {
    return NextResponse.json({ error: "Booking ID required." }, { status: 400 });
  }

  try {
    const appt = await getAppointmentById(bookingId);
    if (!appt) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    // Patient basic info
    const patientRows = await sql`
      SELECT id, full_name, phone, email, age, gender, city
      FROM patients
      WHERE id = ${appt.patient_id}
      LIMIT 1
    `;
    const patient = (patientRows[0] as {
      id: string;
      full_name: string;
      phone: string;
      email: string | null;
      age: number | null;
      gender: string | null;
      city: string | null;
    }) ?? null;

    // Latest successful payment record
    const payRows = await sql`
      SELECT gateway_payment_id, gateway_order_id, amount_paise, currency, created_at
      FROM payments
      WHERE appointment_id = ${bookingId}
        AND status = 'success'
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const payment = (payRows[0] as {
      gateway_payment_id: string | null;
      gateway_order_id:   string | null;
      amount_paise:       number;
      currency:           string;
      created_at:         Date;
    }) ?? null;

    return NextResponse.json({ appointment: appt, patient, payment });
  } catch (e) {
    console.error("[receipt] failed:", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
