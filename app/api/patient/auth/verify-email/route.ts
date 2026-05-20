import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  PATIENT_SESSION_COOKIE,
  verifyPatientToken,
} from "../../../../../lib/auth";
import { verifyEmailWithCode } from "../../../../../lib/patient-auth";
import { buildWelcomeEmail, sendEmail } from "../../../../../lib/email";

/**
 * POST /api/patient/auth/verify-email
 *
 * Body: { otp?: string; token?: string }
 *
 * Accepts either the 6-digit code the user typed or the link token from
 * their email.  On success, the patient's email_verified flag flips to TRUE.
 * Works whether or not the caller is signed in — clicking the link from a
 * different device must still verify.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<{
      otp:   string;
      token: string;
    }>;

    const result = await verifyEmailWithCode({
      otp:   body.otp,
      token: body.token,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Send welcome email after successful verification (fire-and-forget).
    if (result.patient.email) {
      const origin = new URL(req.url).origin;
      const tpl = buildWelcomeEmail({
        fullName: result.patient.full_name,
        loginUrl: `${origin}/patient`,
      });
      sendEmail({ to: result.patient.email, subject: tpl.subject, html: tpl.html, text: tpl.text })
        .catch((e) => console.error("[verify-email] welcome email failed:", e));
    }

    // Defensive: if the caller is signed in but as a different patient, we
    // still report success — the token holder owns that email, full stop.
    const jar     = await cookies();
    const cookie  = jar.get(PATIENT_SESSION_COOKIE)?.value;
    const sessionPatientId = cookie ? await verifyPatientToken(cookie) : null;

    return NextResponse.json({
      ok: true,
      verified_patient_id: result.patient.id,
      is_current_user:     sessionPatientId === result.patient.id,
    });
  } catch (err) {
    console.error("[patient/auth/verify-email]", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
