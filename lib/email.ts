// Email sending — talks to the standalone Node service in `services/email/`
// over HTTP.  That service owns the SMTP credentials and the
// `From: verification@bramsmindcare.com` address, so this file stays free
// of any provider-specific logic.
//
// When EMAIL_SERVICE_URL isn't set (local dev without the microservice
// running), the message is logged to the console so flows like email
// verification can still be exercised end-to-end.

type SendInput = {
  to:       string;
  subject:  string;
  html:     string;
  text:     string;
  replyTo?: string;
};

export async function sendEmail(input: SendInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const url   = process.env.EMAIL_SERVICE_URL;
  const token = process.env.EMAIL_SERVICE_TOKEN;

  // ── Dev / no-service fallback ────────────────────────────────────────────
  if (!url) {
    console.warn(
      "\n[email] EMAIL_SERVICE_URL is not set — logging message to console.\n" +
      `        TO:      ${input.to}\n` +
      `        SUBJECT: ${input.subject}\n` +
      `        ${input.text.split("\n").join("\n        ")}\n`,
    );
    return { ok: true };
  }

  if (!token) {
    console.error("[email] EMAIL_SERVICE_TOKEN is missing — refusing to call the service unauthenticated.");
    return { ok: false, error: "Email service token not configured." };
  }

  try {
    const res = await fetch(`${url.replace(/\/+$/, "")}/send`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify(input),
      // 10s ceiling — SMTP hand-off should be fast.
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[email] service HTTP ${res.status}: ${body}`);
      return { ok: false, error: `Email service returned ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    console.error("[email] send failed:", err);
    return { ok: false, error: (err as Error).message };
  }
}

// ─── Verification email template ─────────────────────────────────────────────

export function buildVerificationEmail({
  fullName,
  otp,
  link,
}: {
  fullName: string;
  otp:      string;
  link:     string;
}): { subject: string; html: string; text: string } {
  const subject = "Verify your Brams Mind Care account";

  const text =
`Hi ${fullName},

Welcome to Brams Mind Care.

Your verification code is: ${otp}

You can either enter this code in the app, or click the link below to verify
instantly:

${link}

This code expires in 30 minutes. If you didn't create this account, you can
safely ignore this email.

— Brams Mind Care
`;

  const html = `<!DOCTYPE html>
<html>
  <body style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; background:#f9f9fb; padding:32px 16px; margin:0; color:#1a1c1d;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" width="100%" style="max-width:480px; background:#fff; border:1px solid rgba(207,195,204,.25); border-radius:16px; padding:36px 32px;">
      <tr><td>
        <h1 style="margin:0 0 8px; font-size:20px; color:#1a1c1d;">Verify your email</h1>
        <p style="margin:0 0 24px; font-size:14px; color:#71717a;">Hi ${escapeHtml(fullName)}, welcome to Brams Mind Care. Enter the code below to confirm your email address.</p>

        <div style="background:#f3f3f5; border-radius:12px; padding:20px; text-align:center; margin-bottom:24px;">
          <div style="font-size:11px; font-weight:700; color:#71717a; text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">Verification code</div>
          <div style="font-family:'SF Mono', Menlo, monospace; font-size:30px; font-weight:700; color:#745475; letter-spacing:6px;">${otp}</div>
        </div>

        <p style="margin:0 0 16px; font-size:14px; color:#4c444b; text-align:center;">…or verify instantly:</p>

        <p style="text-align:center; margin:0 0 24px;">
          <a href="${link}" style="display:inline-block; background:#745475; color:#fff; text-decoration:none; font-weight:700; padding:12px 24px; border-radius:12px; font-size:14px;">Verify Email</a>
        </p>

        <p style="margin:0 0 8px; font-size:12px; color:#a1a1aa; text-align:center;">This code expires in 30 minutes.</p>
        <p style="margin:0; font-size:11px; color:#a1a1aa; text-align:center;">If you didn't create this account, you can safely ignore this email.</p>
      </td></tr>
    </table>
  </body>
</html>`;

  return { subject, html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
