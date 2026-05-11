import { NextRequest, NextResponse } from "next/server";
import {
  getAppointmentById,
  recordPayment,
  updateAppointment,
} from "../../../../../lib/bookings";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/bookings/[id]/payment
// Stub: records a manual / pending payment until a gateway is wired.
// Body: { gateway?, gateway_payment_id?, gateway_order_id?, status? }
export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const appointment = await getAppointmentById(id);
    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      gateway?: string;
      gateway_payment_id?: string;
      gateway_order_id?: string;
      status?: "initiated" | "success" | "failed";
      meta?: unknown;
    };

    const payment = await recordPayment({
      appointment_id:     id,
      amount_paise:       appointment.total_paise,
      gateway:            body.gateway ?? "manual",
      gateway_payment_id: body.gateway_payment_id,
      gateway_order_id:   body.gateway_order_id,
      status:             body.status ?? "initiated",
      meta:               body.meta,
    });

    // Reflect on appointment.
    if (payment.status === "success") {
      await updateAppointment(id, { payment_status: "paid", status: "confirmed" });
    }

    return NextResponse.json({ payment });
  } catch (e) {
    console.error("[payment] POST failed:", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
