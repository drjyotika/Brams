import { NextRequest, NextResponse } from "next/server";
import { isEmailRecentlyVerified } from "../../../../lib/otp";
import { findPatientByLogin, markEmailVerified, recordPatientLogin } from "../../../../lib/patient-auth";
import { upsertPatient } from "../../../../lib/bookings";
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
 * Phone is the account key, so:
 *   • unused phone            → create a new account
 *   • phone with NO email yet → link this verified email (helps patients who
 *                               booked by phone before we captured an email)
 *   • phone that already has an email → reject (prevents account takeover)
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

    // If the email already belongs to an account, just sign that account in.
    const byEmail = await findPatientByLogin(email);
    const byPhone = await findPatientByLogin(phone);

    let patientId: string;

    if (byEmail) {
      if (byEmail.is_suspended) {
        return NextResponse.json({ error: "This account has been suspended. Please contact support." }, { status: 403 });
      }
      patientId = byEmail.id;
    } else if (byPhone) {
      if (byPhone.is_suspended) {
        return NextResponse.json({ error: "This account has been suspended. Please contact support." }, { status: 403 });
      }
      // Only link if the phone account has no email yet — otherwise refuse to
      // overwrite an existing account's email.
      if (byPhone.email && byPhone.email.toLowerCase() !== email) {
        return NextResponse.json(
          { error: "An account with this phone number already exists. Please sign in with its registered email address, or contact support." },
          { status: 409 },
        );
      }
      const linked = await upsertPatient({ full_name, phone, email });
      patientId = linked.id;
    } else {
      const created = await upsertPatient({ full_name, phone, email });
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
