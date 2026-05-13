import { NextResponse } from "next/server";
import {
  findPatientByLogin,
  isPatientLocked,
  recordPatientFailedLogin,
  recordPatientLogin,
  verifyPassword,
} from "../../../../../lib/patient-auth";
import {
  PATIENT_SESSION_COOKIE,
  PATIENT_SESSION_MAX_AGE,
  createPatientToken,
} from "../../../../../lib/auth";

/**
 * POST /api/patient/auth/login
 *
 * Body: { loginId: string (phone OR email), password: string }
 *
 * Sets the `brams_patient_session` cookie on success.
 */
export async function POST(req: Request) {
  try {
    const { loginId, password } = (await req.json()) as {
      loginId?: string;
      password?: string;
    };

    if (!loginId || !password) {
      return NextResponse.json(
        { error: "Phone/email and password are required." },
        { status: 400 },
      );
    }

    const patient = await findPatientByLogin(loginId);

    // Constant-ish response for both "no such patient" and "no password set"
    // so we don't leak which phones/emails exist.
    if (!patient || !patient.password_hash) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    // Suspended accounts can't log in at all — admin must unsuspend.
    if (patient.is_suspended) {
      return NextResponse.json(
        {
          error: patient.suspension_reason
            ? `Account suspended: ${patient.suspension_reason}`
            : "This account has been suspended. Please contact support.",
        },
        { status: 403 },
      );
    }

    if (isPatientLocked(patient)) {
      return NextResponse.json(
        { error: "Account temporarily locked. Please try again in a few minutes." },
        { status: 423 },
      );
    }

    if (!verifyPassword(password, patient.password_hash)) {
      await recordPatientFailedLogin(patient.id);
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    await recordPatientLogin(patient.id);
    const token = await createPatientToken(patient.id);
    const res = NextResponse.json({
      ok:             true,
      email_verified: patient.email_verified ?? false,
      patient: {
        id:             patient.id,
        full_name:      patient.full_name,
        email:          patient.email,
        phone:          patient.phone,
        email_verified: patient.email_verified ?? false,
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
  } catch (err) {
    console.error("[patient/auth/login]", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
