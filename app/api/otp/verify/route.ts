import { NextRequest, NextResponse } from "next/server";
import { verifyOtp } from "../../../../lib/otp";
import { findPatientByLogin, recordPatientLogin } from "../../../../lib/patient-auth";
import {
  createPatientToken,
  PATIENT_SESSION_COOKIE,
  PATIENT_SESSION_MAX_AGE,
} from "../../../../lib/auth";

// POST /api/otp/verify
// Body: { email: string; otp: string }
// Returns: { verified: true; patient?: PatientProfile } | { verified: false; error: string }
//
// If the verified email belongs to a registered patient, we issue a patient
// session cookie so they are seamlessly logged in for the rest of the booking.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as { email?: string; otp?: string };
    const email = body.email?.trim() ?? "";
    const otp   = body.otp?.trim()   ?? "";

    if (!email || !otp) {
      return NextResponse.json(
        { verified: false, error: "Email and OTP are required." },
        { status: 400 },
      );
    }

    const result = await verifyOtp(email, otp);

    if (!result.verified) {
      return NextResponse.json({ verified: false, error: result.error }, { status: 400 });
    }

    // ── Seamless patient login ────────────────────────────────────────────────
    // If this email belongs to a registered patient, issue a session cookie so
    // the booking flow can pre-fill their details and they're logged in.
    const patient = await findPatientByLogin(email).catch(() => null);

    if (patient) {
      await recordPatientLogin(patient.id).catch(() => {});
      const token = await createPatientToken(patient.id);

      const res = NextResponse.json({
        verified: true,
        patient: {
          id:        patient.id,
          full_name: patient.full_name,
          phone:     patient.phone,
          email:     patient.email,
          age:       patient.age,
          gender:    patient.gender,
          city:      patient.city,
        },
      });

      res.cookies.set(PATIENT_SESSION_COOKIE, token, {
        httpOnly: true,
        secure:   process.env.NODE_ENV === "production",
        sameSite: "lax",
        path:     "/",
        maxAge:   PATIENT_SESSION_MAX_AGE,
      });

      return res;
    }

    // New / unregistered user — just confirm the OTP is valid.
    return NextResponse.json({ verified: true, patient: null });
  } catch (e) {
    console.error("[otp/verify] failed:", e);
    return NextResponse.json(
      { verified: false, error: (e as Error).message },
      { status: 500 },
    );
  }
}
