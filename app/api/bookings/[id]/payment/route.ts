import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  getAppointmentById,
  getPatientById,
  recordPayment,
  updateAppointment,
} from "../../../../../lib/bookings";
import {
  buildAppointmentConfirmationEmail,
  buildAppointmentAdminNotificationEmail,
  sendEmail,
} from "../../../../../lib/email";
import { ensureMeetLinkForAppointment } from "../../../../../lib/google-calendar";

// Clinic addresses that should receive a copy of every new booking.
const CLINIC_NOTIFY = ["drjyotika@bramsmindcare.com", "info@bramsmindcare.com"];
import { incrementCouponUsage } from "../../../../../lib/coupons";

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

    // Auto-generate the Google Meet link for this now-confirmed upcoming
    // appointment (on drjyotika@bramsmindcare.com's calendar). Non-fatal — a
    // Google hiccup must never break the already-recorded payment. The link is
    // awaited so the confirmation email below can include it.
    const { meetLink } = await ensureMeetLinkForAppointment(id);

    // Increment coupon usage count if one was applied (fire-and-forget).
    if (appointment.coupon_code) {
      incrementCouponUsage(appointment.coupon_code)
        .catch((e) => console.error("[payment] coupon increment failed:", e));
    }

    // Send confirmation (patient) + notification (clinic) emails.
    // Awaited — on serverless, un-awaited work after the response is returned
    // can be killed before the email actually sends. Wrapped so an email
    // failure never breaks the (already-recorded) payment confirmation.
    try {
      const patient = await getPatientById(appointment.patient_id);
      const origin  = new URL(req.url).origin;

      // 1) Patient confirmation
      if (patient?.email) {
        const tpl = buildAppointmentConfirmationEmail({
          fullName:        patient.full_name,
          planTitle:       appointment.plan_title,
          scheduledDate:   appointment.scheduled_date,
          scheduledTime:   appointment.scheduled_time,
          durationMinutes: appointment.duration_minutes,
          meetingLink:     meetLink ?? appointment.meeting_link,
          manageUrl:       `${origin}/patient`,
        });
        await sendEmail({ to: patient.email, subject: tpl.subject, html: tpl.html, text: tpl.text });
      }

      // 2) Clinic notification → drjyotika@ + info@
      const adminTpl = buildAppointmentAdminNotificationEmail({
        bookingId:       id,
        patientName:     patient?.full_name ?? "Unknown",
        patientEmail:    patient?.email,
        patientPhone:    patient?.phone,
        planTitle:       appointment.plan_title,
        scheduledDate:   appointment.scheduled_date,
        scheduledTime:   appointment.scheduled_time,
        durationMinutes: appointment.duration_minutes,
        amountPaise:     appointment.total_paise,
      });
      await sendEmail({ to: CLINIC_NOTIFY, subject: adminTpl.subject, html: adminTpl.html, text: adminTpl.text });
    } catch (e) {
      console.error("[payment] booking emails failed:", e);
    }

    return NextResponse.json({ payment });
  } catch (e) {
    console.error("[payment] POST failed:", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
