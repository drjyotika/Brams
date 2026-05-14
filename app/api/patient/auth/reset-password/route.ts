import { NextResponse } from "next/server";
import { sql } from "../../../../../lib/db";
import {
  ensurePatientAuthSchema,
  setPatientPassword,
  markEmailVerified,
} from "../../../../../lib/patient-auth";
import type { PatientAuthData } from "../../../../../lib/patient-auth";

/**
 * POST /api/patient/auth/reset-password
 * Body: { token, password }
 *
 * Validates the reset token, sets the new password, marks email verified,
 * and clears the token.
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
      return NextResponse.json({ error: "This reset link has expired. Please request a new one." }, { status: 400 });
    }

    // Set new password and clear the reset token
    await setPatientPassword(patient.id, password);
    await markEmailVerified(patient.id); // proves inbox access

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[patient/auth/reset-password]", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
