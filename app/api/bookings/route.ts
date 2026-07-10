import { NextRequest, NextResponse } from "next/server";
import {
  upsertPatient,
  createAppointment,
  type Gender,
} from "../../../lib/bookings";
import { getPlanById, parsePriceToPaise, parseDurationMinutes } from "../../../lib/plans";
import { isEmailRecentlyVerified } from "../../../lib/otp";
import { markEmailVerified } from "../../../lib/patient-auth";
import {
  createPatientToken,
  PATIENT_SESSION_COOKIE,
  PATIENT_SESSION_MAX_AGE,
} from "../../../lib/auth";

// POST /api/bookings
// Body: { plan_id, scheduled_date, scheduled_time, patient: {...}, reason? }
// Returns: { id, total_paise }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      plan_id,
      scheduled_date,
      scheduled_time,
      reason_for_consultation,
      patient,
    } = body as {
      plan_id: string;
      scheduled_date: string;
      scheduled_time: string;
      reason_for_consultation?: string;
      patient: {
        full_name: string;
        age?: number;
        gender?: Gender;
        phone: string;
        email?: string;
        city?: string;
      };
    };

    if (!plan_id || !scheduled_date || !scheduled_time || !patient?.full_name || !patient?.phone) {
      return NextResponse.json(
        { error: "Missing required fields (plan_id, scheduled_date, scheduled_time, patient.full_name, patient.phone)" },
        { status: 400 },
      );
    }

    const plan = await getPlanById(plan_id);
    if (!plan) {
      return NextResponse.json({ error: `Unknown plan_id: ${plan_id}` }, { status: 400 });
    }

    const consultationFeePaise = parsePriceToPaise(plan.price);
    const bookingFeePaise      = 0;
    const totalPaise           = consultationFeePaise + bookingFeePaise;
    const durationMinutes      = parseDurationMinutes(plan.unit);

    // 1. upsert patient (deduped by phone)
    const patientRow = await upsertPatient({
      full_name: patient.full_name.trim(),
      age:       patient.age ?? null,
      gender:    patient.gender ?? null,
      phone:     patient.phone.trim(),
      email:     patient.email?.trim() || null,
      city:      patient.city?.trim() || null,
    });

    // 2. create appointment
    const appointment = await createAppointment({
      patient_id:              patientRow.id,
      plan_id:                 plan.id,
      plan_title:              plan.title,
      scheduled_date,
      scheduled_time,
      duration_minutes:        durationMinutes,
      mode:                    "online",
      reason_for_consultation: reason_for_consultation ?? null,
      consultation_fee_paise:  consultationFeePaise,
      booking_fee_paise:       bookingFeePaise,
      total_paise:             totalPaise,
    });

    const res = NextResponse.json({
      id:                     appointment.id,
      patient_id:             patientRow.id,
      consultation_fee_paise: appointment.consultation_fee_paise,
      booking_fee_paise:      appointment.booking_fee_paise,
      total_paise:            appointment.total_paise,
      plan_title:             appointment.plan_title,
      scheduled_date:         appointment.scheduled_date,
      scheduled_time:         appointment.scheduled_time,
      duration_minutes:       appointment.duration_minutes,
    });

    // If the booking email was OTP-verified in this flow, mark the patient's
    // email verified and log them in (session cookie) so they land in the
    // dashboard from the confirmation screen — without a second verification.
    const bookingEmail = patient.email?.trim() || null;
    if (bookingEmail && (await isEmailRecentlyVerified(bookingEmail).catch(() => false))) {
      await markEmailVerified(patientRow.id).catch(() => {});
      try {
        const token = await createPatientToken(patientRow.id);
        res.cookies.set(PATIENT_SESSION_COOKIE, token, {
          httpOnly: true,
          secure:   process.env.NODE_ENV === "production",
          sameSite: "lax",
          path:     "/",
          maxAge:   PATIENT_SESSION_MAX_AGE,
        });
      } catch (e) {
        console.error("[bookings] session issue failed:", e);
      }
    }

    return res;
  } catch (e) {
    console.error("[bookings] POST failed:", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
