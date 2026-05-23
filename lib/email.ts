// Email sending via Resend (https://resend.com).
//
// "From" and "Reply-To" are read from the DB settings table at send time
// (60-second cache) so admins can change them without a redeploy.
// Env vars EMAIL_FROM / EMAIL_REPLY_TO act as a fallback only.

import { Resend } from "resend";
import { getEmailSettings, EMAIL_DEFAULTS } from "./settings";

type SendInput = {
  to:       string | string[];
  subject:  string;
  html:     string;
  text:     string;
  replyTo?: string;
  cc?:      string | string[];
  bcc?:     string | string[];
};

let _client: Resend | null = null;
function client(): Resend {
  if (!_client) _client = new Resend(process.env.RESEND_API_KEY);
  return _client;
}

export async function sendEmail(
  input: SendInput,
): Promise<{ ok: true; messageId?: string } | { ok: false; error: string }> {
  // Resolve from/reply-to: DB settings → env var → hard default
  let from    = process.env.EMAIL_FROM    ?? EMAIL_DEFAULTS.fromEmail;
  let replyTo = input.replyTo ?? process.env.EMAIL_REPLY_TO;

  try {
    const settings = await getEmailSettings();
    from    = settings.fromEmail;
    replyTo = input.replyTo ?? settings.replyToEmail;
  } catch { /* use env / default fallback */ }

  if (!process.env.RESEND_API_KEY) {
    console.warn(
      "\n[email] RESEND_API_KEY not set — logging message to console.\n" +
      `        FROM:    ${from}\n` +
      `        TO:      ${Array.isArray(input.to) ? input.to.join(", ") : input.to}\n` +
      `        SUBJECT: ${input.subject}\n` +
      `        ${input.text.split("\n").join("\n        ")}\n`,
    );
    return { ok: true };
  }

  try {
    const { data, error } = await client().emails.send({
      from,
      to:      Array.isArray(input.to) ? input.to : [input.to],
      subject: input.subject,
      html:    input.html,
      text:    input.text,
      replyTo,
      cc:  input.cc  ? (Array.isArray(input.cc)  ? input.cc  : [input.cc])  : undefined,
      bcc: input.bcc ? (Array.isArray(input.bcc) ? input.bcc : [input.bcc]) : undefined,
    });

    if (error) {
      console.error("[email] send failed:", error);
      return { ok: false, error: error.message };
    }

    return { ok: true, messageId: data?.id };
  } catch (err) {
    console.error("[email] send failed:", err);
    return { ok: false, error: (err as Error).message };
  }
}

export {
  type EmailMessage,
  buildVerificationEmail,
  buildForgotPasswordEmail,
  buildWelcomeEmail,
  buildAppointmentConfirmationEmail,
  buildAppointmentAdminNotificationEmail,
  buildAppointmentReminderEmail,
  buildPasswordResetEmail,
  buildSuspensionEmail,
  buildAccountReactivatedEmail,
  buildNewsletterEmail,
  buildContactNotificationEmail,
  buildContactConfirmationEmail,
  buildHelpRequestNotificationEmail,
  buildHelpRequestConfirmationEmail,
  buildFeedbackRequestEmail,
} from "./email-templates";
