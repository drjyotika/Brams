import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { getAppointmentById } from "../../../../../lib/bookings";
import {
  validateCoupon,
  applyCouponToAppointment,
  ensureCouponSchema,
} from "../../../../../lib/coupons";

type Ctx = { params: Promise<{ id: string }> };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let _rzp: Razorpay | null = null;
function rzp(): Razorpay {
  if (_rzp) return _rzp;
  const key_id     = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) throw new Error("Razorpay keys not configured");
  _rzp = new Razorpay({ key_id, key_secret });
  return _rzp;
}

/**
 * POST /api/bookings/[id]/order
 *
 * Body: { couponCode?: string }
 *
 * Creates a Razorpay order for the appointment, optionally applying a
 * coupon discount. The coupon is validated server-side before the order
 * is created, and stored on the appointment row.
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    await ensureCouponSchema();

    const appointment = await getAppointmentById(id);
    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    // Parse body (couponCode optional)
    let couponCode: string | undefined;
    try {
      const body = await req.json() as { couponCode?: string };
      couponCode = body.couponCode?.trim() || undefined;
    } catch { /* no body / empty body — fine */ }

    const originalAmount = appointment.total_paise;
    let finalAmount      = originalAmount;
    let discountPaise    = 0;
    let appliedCode: string | undefined;

    // Validate & apply coupon if provided
    if (couponCode) {
      const result = await validateCoupon(couponCode, originalAmount);
      if (!result.valid) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      discountPaise = result.discount_paise;
      finalAmount   = result.final_paise;
      appliedCode   = result.coupon.code;

      // Persist coupon on appointment before creating order
      await applyCouponToAppointment(id, appliedCode, discountPaise);
    } else {
      // Clear any previously stored coupon if order is re-created without one
      await applyCouponToAppointment(id, "", 0);
    }

    if (finalAmount < 100) {
      return NextResponse.json({ error: "Amount too low" }, { status: 400 });
    }

    const receipt = `a_${id.replace(/-/g, "")}`.slice(0, 40);
    const order   = await rzp().orders.create({
      amount:   finalAmount,
      currency: "INR",
      receipt,
    });

    return NextResponse.json({
      orderId:       order.id,
      amount:        order.amount,
      currency:      order.currency,
      keyId:         process.env.RAZORPAY_KEY_ID,
      discountPaise,
      originalAmount,
      couponApplied: appliedCode ?? null,
    });
  } catch (e) {
    const err = e as { message?: string; error?: { description?: string } };
    const msg = err.error?.description || err.message || "Failed to create order";
    console.error("[order] create failed:", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
