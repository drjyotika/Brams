import { NextResponse } from "next/server";
import { findPatientByLogin, issuePasswordResetToken } from "../../../../../lib/patient-auth";
import { buildForgotPasswordEmail, sendEmail } from "../../../../../lib/email";

/**
 * POST /api/patient/auth/forgot-password
 * Body: { loginId }  — phone or email
 *
 * Always returns 200 so we don't leak whether an account exists.
 */
export async function POST(req: Request) {
  try {
    const { loginId } = (await req.json()) as { loginId?: string };

    if (!loginId?.trim()) {
      return NextResponse.json({ ok: true }); // silent
    }

    const patient = await findPatientByLogin(loginId.trim());

    // No account or guest (no password set) → silent success
    if (!patient || !patient.password_hash) {
      return NextResponse.json({ ok: true });
    }

    const token     = await issuePasswordResetToken(patient.id);
    const origin    = new URL(req.url).origin;
    const resetLink = `${origin}/patient/reset-password?token=${token}`;

    const tpl = buildForgotPasswordEmail({
      fullName:  patient.full_name,
      resetLink,
    });

    await sendEmail({
      to:      patient.email ?? "",
      subject: tpl.subject,
      html:    tpl.html,
      text:    tpl.text,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[patient/auth/forgot-password]", err);
    return NextResponse.json({ ok: true }); // never reveal errors
  }
}
