import { NextRequest, NextResponse } from "next/server";
import { isEmailRecentlyVerified } from "../../../../lib/otp";
import {
  findPatientByEmail,
  createPatientAccount,
  markEmailVerified,
  recordPatientLogin,
} from "../../../../lib/patient-auth";
import {
  createPatientToken,
  PATIENT_SESSION_COOKIE,
  PATIENT_SESSION_MAX_AGE,
} from "../../../../lib/auth";

/**
 * POST /api/patient/complete-signup
 * Body: { email, full_name, phone }
 *
 * Finishes a passwordless sign-up when someone verified an OTP for an email
 * that has no account yet. Email ownership is proven server-side via a recent
 * OTP verification (booking_email_otps.verified_at); we never trust the client.
 *
 * Identity is the EMAIL address, full stop — phone is only ever stored as a
 * contact field on the new row. We never look accounts up by phone or link/merge
 * based on it, so two different (individually email-verified) people can never
 * collide just because they share or mistype a phone number. If the entered
 * phone happens to collide with someone else's account (it's a unique column),
 * that's surfaced as a clear error rather than silently merging identities.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      email?: string; full_name?: string; phone?: string;
    };
    const email     = body.email?.trim().toLowerCase() ?? "";
    const full_name = body.full_name?.trim() ?? "";
    const phone     = body.phone?.trim() ?? "";

    if (!email || !full_name || !phone) {
      return NextResponse.json({ error: "Name, phone and email are all required." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    if (phone.replace(/\D/g, "").length < 8) {
      return NextResponse.json({ error: "Please enter a valid phone number." }, { status: 400 });
    }

    // Proof of email ownership (OTP verified within the last 20 min).
    if (!(await isEmailRecentlyVerified(email))) {
      return NextResponse.json({ error: "Please verify your email again before continuing." }, { status: 401 });
    }

    // If the email already belongs to an account, just sign that account in —
    // strictly by email, no phone matching.
    const existing = await findPatientByEmail(email);

    let patientId: string;

    if (existing) {
      if (existing.is_suspended) {
        return NextResponse.json({ error: "This account has been suspended. Please contact support." }, { status: 403 });
      }
      patientId = existing.id;
    } else {
      const created = await createPatientAccount({ full_name, phone, email });
      if (!created.ok) {
        return NextResponse.json({ error: created.error }, { status: 409 });
      }
      patientId = created.id;
    }

    await markEmailVerified(patientId).catch(() => {});
    await recordPatientLogin(patientId).catch(() => {});
    const token = await createPatientToken(patientId);

    const res = NextResponse.json({ ok: true });
    res.cookies.set(PATIENT_SESSION_COOKIE, token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "lax",
      path:     "/",
      maxAge:   PATIENT_SESSION_MAX_AGE,
    });
    return res;
  } catch (e) {
    console.error("[patient/complete-signup] failed:", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
