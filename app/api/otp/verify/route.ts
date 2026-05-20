import { NextRequest, NextResponse } from "next/server";
import { verifyOtp } from "../../../../lib/otp";

// POST /api/otp/verify
// Body: { email: string; otp: string }
// Returns: { verified: true } or { verified: false; error: string }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as { email?: string; otp?: string };
    const email = body.email?.trim() ?? "";
    const otp   = body.otp?.trim()   ?? "";

    if (!email || !otp) {
      return NextResponse.json(
        { verified: false, error: "Email and OTP are required." },
        { status: 400 },
      );
    }

    const result = await verifyOtp(email, otp);

    if (!result.verified) {
      return NextResponse.json({ verified: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ verified: true });
  } catch (e) {
    console.error("[otp/verify] failed:", e);
    return NextResponse.json(
      { verified: false, error: (e as Error).message },
      { status: 500 },
    );
  }
}
