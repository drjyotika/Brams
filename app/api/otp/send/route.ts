import { NextRequest, NextResponse } from "next/server";
import { createOtp } from "../../../../lib/otp";
import { sendEmail } from "../../../../lib/email";
import { buildBookingOtpEmail } from "../../../../lib/email-templates";

// POST /api/otp/send
// Body: { email: string }
// Sends a 6-digit OTP to the supplied address for booking email verification.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as { email?: string };
    const email = body.email?.trim() ?? "";

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
    }

    // Generate + store OTP (rate-limited)
    const result = await createOtp(email);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 429 });
    }

    // Send email (fire-and-forget style — but we still await so errors bubble)
    const tpl = buildBookingOtpEmail({ email, otp: result.otp });
    await sendEmail({ to: email, subject: tpl.subject, html: tpl.html, text: tpl.text });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[otp/send] failed:", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
