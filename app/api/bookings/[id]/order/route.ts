import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { getAppointmentById } from "../../../../../lib/bookings";

type Ctx = { params: Promise<{ id: string }> };

let _rzp: Razorpay | null = null;
function rzp(): Razorpay {
  if (_rzp) return _rzp;
  const key_id     = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) {
    throw new Error("Razorpay keys not configured");
  }
  _rzp = new Razorpay({ key_id, key_secret });
  return _rzp;
}

// POST /api/bookings/[id]/order — creates a Razorpay order for this appointment.
export async function POST(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const appointment = await getAppointmentById(id);
    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    const amount = appointment.total_paise;
    if (amount < 100) {
      return NextResponse.json({ error: "Amount too low" }, { status: 400 });
    }

    const order = await rzp().orders.create({
      amount,
      currency: "INR",
      receipt:  `appt_${id}`,
    });

    return NextResponse.json({
      orderId:  order.id,
      amount:   order.amount,
      currency: order.currency,
      keyId:    process.env.RAZORPAY_KEY_ID,
    });
  } catch (e) {
    console.error("[order] create failed:", e);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
