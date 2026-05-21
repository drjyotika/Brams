import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  PATIENT_SESSION_COOKIE,
  SESSION_COOKIE,
  verifyPatientToken,
  verifySessionToken,
} from "./lib/auth";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ─── Admin guard ───────────────────────────────────────────────────────────
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (token && (await verifySessionToken(token))) return NextResponse.next();

    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }

  // ─── Patient guard ─────────────────────────────────────────────────────────
  // /patient/login, /patient/verify and /patient/reset-password must stay
  // reachable while signed-out so a magic-link or password-reset link clicked
  // from email can complete verification / set a new password.
  if (
    pathname.startsWith("/patient") &&
    !pathname.startsWith("/patient/login") &&
    !pathname.startsWith("/patient/verify") &&
    !pathname.startsWith("/patient/reset-password")
  ) {
    const token = req.cookies.get(PATIENT_SESSION_COOKIE)?.value;
    if (token && (await verifyPatientToken(token))) return NextResponse.next();

    const url = req.nextUrl.clone();
    url.pathname = "/patient/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/patient/:path*"],
};
