import { NextRequest, NextResponse } from "next/server";
import { exchangeCode } from "../../../../../lib/google-calendar";

// GET /api/auth/google/callback?code=...
// Called by Google after Dr. Jyotika approves the consent screen.
// Displays the refresh_token — copy it to GOOGLE_REFRESH_TOKEN env var.
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "Missing code parameter." }, { status: 400 });
  }

  try {
    const tokens = await exchangeCode(code);

    if (!tokens.refresh_token) {
      return new NextResponse(
        `<html><body style="font-family:sans-serif;padding:40px">
          <h2>⚠️ No refresh token returned</h2>
          <p>This usually means the account already authorized this app once.
          Go to <a href="https://myaccount.google.com/permissions">Google Account Permissions</a>,
          revoke access for "Brams Calendar", then visit
          <a href="/api/auth/google">/api/auth/google</a> again.</p>
        </body></html>`,
        { headers: { "Content-Type": "text/html" } }
      );
    }

    return new NextResponse(
      `<html><body style="font-family:sans-serif;padding:40px;max-width:700px">
        <h2>✅ Authorization successful!</h2>
        <p>Copy the refresh token below and add it to your <code>.env.local</code>
        and Vercel environment variables as <strong>GOOGLE_REFRESH_TOKEN</strong>.</p>
        <p><strong>You only need to do this once.</strong></p>
        <hr/>
        <p style="font-size:13px;color:#555">GOOGLE_REFRESH_TOKEN=</p>
        <textarea rows="4" style="width:100%;font-size:13px;padding:8px;border:1px solid #ccc;border-radius:4px"
          onclick="this.select()">${tokens.refresh_token}</textarea>
        <hr/>
        <p style="color:#888;font-size:13px">Access token (not needed, expires in 1 hour):<br/>
        <code style="font-size:11px;word-break:break-all">${tokens.access_token}</code></p>
      </body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  } catch (err) {
    console.error("[google/callback]", err);
    return NextResponse.json({ error: "Failed to exchange code." }, { status: 500 });
  }
}
