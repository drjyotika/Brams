import { NextResponse } from "next/server";
import { sql } from "../../../../../lib/db";
import {
  ensurePatientAuthSchema,
  setPatientPassword,
  markEmailVerified,
} from "../../../../../lib/patient-auth";
import type { PatientAuthData } from "../../../../../lib/patient-auth";
import {
  PATIENT_SESSION_COOKIE,
  PATIENT_SESSION_MAX_AGE,
  createPatientToken,
} from "../../../../../lib/auth";

/**
 * POST /api/patient/auth/reset-password
 * Body: { token, password }
 *
 * Validates the reset token, sets the new password, marks email verified,
 * auto-signs the patient in, and returns a session cookie.
 * The client should then redirect to /patient/verify (which auto-forwards
 * to /patient since email is now marked verified).
 */
export async function POST(req: Request) {
  try {
    await ensurePatientAuthSchema();
    const { token, password } = (await req.json()) as {
      token?:    string;
      password?: string;
    };

    if (!token || !password) {
      return NextResponse.json({ error: "Token and password are required." }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    }

    const rows = await sql`
      SELECT * FROM patients
      WHERE verification_token = ${token.trim()}
      LIMIT 1
    `;
    const patient = (rows[0] as PatientAuthData) ?? null;

    if (!patient) {
      return NextResponse.json({ error: "Invalid or expired reset link." }, { status: 400 });
    }

    if (
      !patient.verification_expires_at ||
      new Date(patient.verification_expires_at) < new Date()
    ) {
      return NextResponse.json(
        { error: "This reset link has expired. Please request a new one." },
        { status: 400 },
      );
    }

    // Set new password, mark email verified (proves inbox access), clear token
    await setPatientPassword(patient.id, password);
    await markEmailVerified(patient.id);

    // Auto-sign in — patient goes straight to /patient/verify which
    // detects email_verified=true and bounces to /patient dashboard.
    const sessionToken = await createPatientToken(patient.id);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(PATIENT_SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "lax",
      path:     "/",
      maxAge:   PATIENT_SESSION_MAX_AGE,
    });
    return res;
  } catch (err) {
    console.error("[patient/auth/reset-password]", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
