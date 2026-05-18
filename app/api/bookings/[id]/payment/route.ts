import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  getAppointmentById,
  recordPayment,
  updateAppointment,
} from "../../../../../lib/bookings";

type Ctx = { params: Promise<{ id: string }> };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// POST /api/bookings/[id]/payment
// Verifies Razorpay signature and records the payment result.
// Body: { gateway_payment_id, gateway_order_id, razorpay_signature }
export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }
    const appointment = await getAppointmentById(id);
    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      gateway_payment_id?: string;
      gateway_order_id?:   string;
      razorpay_signature?: string;
    };

    const { gateway_payment_id, gateway_order_id, razorpay_signature } = body;

    if (!gateway_payment_id || !gateway_order_id || !razorpay_signature) {
      return NextResponse.json({ error: "Missing payment fields" }, { status: 400 });
    }

    // Verify HMAC-SHA256 signature
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(`${gateway_order_id}|${gateway_payment_id}`)
      .digest("hex");

    if (expected !== razorpay_signature) {
      await recordPayment({
        appointment_id:     id,
        amount_paise:       appointment.total_paise,
        gateway:            "razorpay",
        gateway_payment_id,
        gateway_order_id,
        status:             "failed",
        meta:               { reason: "signature_mismatch" },
      });
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
    }

    const payment = await recordPayment({
      appointment_id:     id,
      amount_paise:       appointment.total_paise,
      gateway:            "razorpay",
      gateway_payment_id,
      gateway_order_id,
      status:             "success",
    });

    await updateAppointment(id, { payment_status: "paid", status: "confirmed" });

    return NextResponse.json({ payment });
  } catch (e) {
    console.error("[payment] POST failed:", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
