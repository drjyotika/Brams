// Email sending — SMTP relay via nodemailer.
//
// Ships transactional + broadcast mail as the address configured by
// EMAIL_FROM (e.g. `Brams Mind Care <info@bramsmindcare.com>`).
//
// Designed for Vercel Fluid Compute: the transporter is cached at module
// scope so it gets reused across warm invocations, avoiding the SMTP
// handshake on every send.  When SMTP_HOST is not set the message is
// logged to the console — handy for local dev when you don't want to
// configure SMTP at all.
//
// Required env vars (also set these in Vercel Project → Settings → Env):
//   SMTP_HOST       e.g. smtp.gmail.com
//   SMTP_PORT       587 (STARTTLS) or 465 (implicit TLS)
//   SMTP_SECURE     "true" for 465, otherwise "false"
//   SMTP_USER       full mailbox, e.g. info@bramsmindcare.com
//   SMTP_PASS       Google App Password (NOT the regular account password)
//   EMAIL_FROM      Brams Mind Care <info@bramsmindcare.com>
// Optional:
//   EMAIL_REPLY_TO  replies bounce here instead of the From address

import nodemailer, { type Transporter } from "nodemailer";

type SendInput = {
  to:       string | string[];
  subject:  string;
  html:     string;
  text:     string;
  replyTo?: string;
  cc?:      string | string[];
  bcc?:     string | string[];
};

// ─── Singleton transporter ───────────────────────────────────────────────────

let _transporter: Transporter | null = null;

function transporter(): Transporter {
  if (_transporter) return _transporter;

  _transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // Speeds up cold sends on Vercel — drops the long default handshake wait
    // when the remote is slow.  Tune up if you hit DNS-flaky regions.
    connectionTimeout: 8_000,
    greetingTimeout:   8_000,
    socketTimeout:    15_000,
  });

  return _transporter;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function sendEmail(
  input: SendInput,
): Promise<{ ok: true; messageId?: string } | { ok: false; error: string }> {
  // ── Dev / no-config fallback ─────────────────────────────────────────────
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn(
      "\n[email] SMTP not configured — logging message to console.\n" +
      `        TO:      ${Array.isArray(input.to) ? input.to.join(", ") : input.to}\n` +
      `        SUBJECT: ${input.subject}\n` +
      `        ${input.text.split("\n").join("\n        ")}\n`,
    );
    return { ok: true };
  }

  try {
    const info = await transporter().sendMail({
      from:    process.env.EMAIL_FROM,
      to:      input.to,
      subject: input.subject,
      html:    input.html,
      text:    input.text,
      cc:      input.cc,
      bcc:     input.bcc,
      replyTo: input.replyTo ?? process.env.EMAIL_REPLY_TO,
    });
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    console.error("[email] send failed:", err);
    return { ok: false, error: (err as Error).message };
  }
}

// ─── Template builders ───────────────────────────────────────────────────────
//
// Centralised in `./email-templates` so the shared visual layout lives in
// one place.  Re-exported here so the rest of the codebase can keep doing
// `import { buildVerificationEmail } from "lib/email"`.

export {
  type EmailMessage,
  buildVerificationEmail,
  buildForgotPasswordEmail,
  buildWelcomeEmail,
  buildAppointmentConfirmationEmail,
  buildAppointmentReminderEmail,
  buildPasswordResetEmail,
  buildSuspensionEmail,
  buildAccountReactivatedEmail,
  buildNewsletterEmail,
} from "./email-templates";
