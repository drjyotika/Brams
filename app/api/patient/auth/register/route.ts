import { NextResponse } from "next/server";
import {
  issueVerificationCode,
  registerPatient,
} from "../../../../../lib/patient-auth";
import {
  PATIENT_SESSION_COOKIE,
  PATIENT_SESSION_MAX_AGE,
  createPatientToken,
} from "../../../../../lib/auth";
import { buildVerificationEmail, sendEmail } from "../../../../../lib/email";

/**
 * POST /api/patient/auth/register
 *
 * Body: { full_name, phone, email, password }
 *
 * Creates a new patient row (or claims an existing anonymous booking),
 * sends a verification email containing both a 6-digit OTP and a magic
 * link, and signs the user in with their email marked unverified.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<{
      full_name: string;
      phone:     string;
      email:     string;
      password:  string;
    }>;

    if (!body.full_name || !body.phone || !body.email || !body.password) {
      return NextResponse.json(
        { error: "Name, phone, email and password are required." },
        { status: 400 },
      );
    }

    const result = await registerPatient({
      full_name: body.full_name,
      phone:     body.phone,
      email:     body.email,
      password:  body.password,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Issue and email a verification code.
    const { otp, token } = await issueVerificationCode(result.patient.id);
    const origin = new URL(req.url).origin;
    const link   = `${origin}/patient/verify?token=${token}`;
    const tpl    = buildVerificationEmail({
      fullName: result.patient.full_name,
      otp,
      link,
    });
    // Don't fail registration if email delivery hiccups — the user is signed
    // in and can request a resend from the verify screen.
    await sendEmail({
      to:      result.patient.email!,
      subject: tpl.subject,
      html:    tpl.html,
      text:    tpl.text,
    });

    const sessionToken = await createPatientToken(result.patient.id);
    const res = NextResponse.json({
      ok: true,
      patient: {
        id:             result.patient.id,
        full_name:      result.patient.full_name,
        email:          result.patient.email,
        phone:          result.patient.phone,
        email_verified: result.patient.email_verified ?? false,
      },
    });
    res.cookies.set(PATIENT_SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "lax",
      path:     "/",
      maxAge:   PATIENT_SESSION_MAX_AGE,
    });
    return res;
  } catch (err) {
    console.error("[patient/auth/register]", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
