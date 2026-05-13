import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  PATIENT_SESSION_COOKIE,
  verifyPatientToken,
} from "../../../../../lib/auth";
import {
  findPatientForAuth,
  issueVerificationCode,
} from "../../../../../lib/patient-auth";
import { buildVerificationEmail, sendEmail } from "../../../../../lib/email";

/**
 * POST /api/patient/auth/resend-verification
 *
 * Re-issues an OTP + magic link for the currently signed-in patient and
 * emails it.  Requires an authenticated session so a third party can't
 * spam another patient's inbox.
 */
export async function POST(req: Request) {
  try {
    const jar   = await cookies();
    const token = jar.get(PATIENT_SESSION_COOKIE)?.value;
    if (!token) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }
    const patientId = await verifyPatientToken(token);
    if (!patientId) {
      return NextResponse.json({ error: "Invalid session." }, { status: 401 });
    }

    const patient = await findPatientForAuth(patientId);
    if (!patient || !patient.email) {
      return NextResponse.json({ error: "No email on file." }, { status: 400 });
    }
    if (patient.email_verified) {
      return NextResponse.json({ ok: true, already_verified: true });
    }

    const { otp, token: vToken } = await issueVerificationCode(patient.id);
    const origin = new URL(req.url).origin;
    const link   = `${origin}/patient/verify?token=${vToken}`;
    const tpl    = buildVerificationEmail({
      fullName: patient.full_name,
      otp,
      link,
    });
    const sent = await sendEmail({
      to:      patient.email,
      subject: tpl.subject,
      html:    tpl.html,
      text:    tpl.text,
    });
    if (!sent.ok) {
      return NextResponse.json({ error: sent.error }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[patient/auth/resend-verification]", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
