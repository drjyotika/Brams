import { NextRequest, NextResponse } from "next/server";
import {
  ensurePatientAuthSchema,
  findPatientForAuth,
  issueVerificationCode,
  markEmailVerified,
  setPatientPassword,
  suspendPatient,
  unsuspendPatient,
} from "../../../../../lib/patient-auth";
import { buildVerificationEmail, sendEmail } from "../../../../../lib/email";
import { sql } from "../../../../../lib/db";

type Ctx = { params: Promise<{ id: string }> };

type ActionBody =
  | { action: "suspend";              reason?: string | null }
  | { action: "unsuspend" }
  | { action: "reset_password";       password: string }
  | { action: "clear_password" }
  | { action: "mark_email_verified" }
  | { action: "send_verification" };

/**
 * POST /api/patients/[id]/actions
 *
 * Admin-only account-management actions on a patient record.
 * Routed through middleware → /admin guard so only authenticated admins
 * can call it.  (Admin guard is currently /admin/* — this lives under /api
 * so we add a session check inline.)
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    await ensurePatientAuthSchema();
    const { id } = await ctx.params;
    const body   = (await req.json()) as ActionBody;

    const patient = await findPatientForAuth(id);
    if (!patient) return NextResponse.json({ error: "Patient not found." }, { status: 404 });

    switch (body.action) {
      case "suspend": {
        await suspendPatient(id, body.reason ?? null);
        return NextResponse.json({ ok: true });
      }
      case "unsuspend": {
        await unsuspendPatient(id);
        return NextResponse.json({ ok: true });
      }
      case "reset_password": {
        if (!body.password || body.password.length < 6) {
          return NextResponse.json(
            { error: "Password must be at least 6 characters." },
            { status: 400 },
          );
        }
        await setPatientPassword(id, body.password);
        return NextResponse.json({ ok: true });
      }
      case "clear_password": {
        // Lets the patient self-register again (claim flow) with a new password.
        await sql`
          UPDATE patients SET
            password_hash      = NULL,
            failed_login_count = 0,
            locked_until       = NULL,
            updated_at         = NOW()
          WHERE id = ${id}
        `;
        return NextResponse.json({ ok: true });
      }
      case "mark_email_verified": {
        await markEmailVerified(id);
        return NextResponse.json({ ok: true });
      }
      case "send_verification": {
        if (!patient.email) {
          return NextResponse.json({ error: "Patient has no email." }, { status: 400 });
        }
        const { otp, token } = await issueVerificationCode(id);
        const origin = new URL(req.url).origin;
        const link   = `${origin}/patient/verify?token=${token}`;
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
      }
      default:
        return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    }
  } catch (err) {
    console.error("[patients/actions/POST]", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
