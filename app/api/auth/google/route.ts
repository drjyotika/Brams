import { NextResponse } from "next/server";
import { getAuthUrl } from "../../../../lib/google-calendar";

// GET /api/auth/google → redirects Dr. Jyotika to Google consent screen
export async function GET() {
  const url = getAuthUrl();
  return NextResponse.redirect(url);
}
