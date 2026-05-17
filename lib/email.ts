// Email sending via Resend (https://resend.com).
//
// Required env vars:
//   RESEND_API_KEY   API key from resend.com
//   EMAIL_FROM       Sender address, e.g. "Brams Mind Care <info@bramsmindcare.com>"
//                    Domain must be verified in the Resend dashboard.
// Optional:
//   EMAIL_REPLY_TO   Replies bounce here instead of the From address.

import { Resend } from "resend";

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
  if (!process.env.RESEND_API_KEY) {
    console.warn(
      "\n[email] RESEND_API_KEY not set — logging message to console.\n" +
      `        TO:      ${Array.isArray(input.to) ? input.to.join(", ") : input.to}\n` +
      `        SUBJECT: ${input.subject}\n` +
      `        ${input.text.split("\n").join("\n        ")}\n`,
    );
    return { ok: true };
  }

  try {
    const { data, error } = await client().emails.send({
      from:     process.env.EMAIL_FROM ?? "Brams Mind Care <info@bramsmindcare.com>",
      to:       Array.isArray(input.to) ? input.to : [input.to],
      subject:  input.subject,
      html:     input.html,
      text:     input.text,
      replyTo:  input.replyTo ?? process.env.EMAIL_REPLY_TO,
      cc:       input.cc ? (Array.isArray(input.cc) ? input.cc : [input.cc]) : undefined,
      bcc:      input.bcc ? (Array.isArray(input.bcc) ? input.bcc : [input.bcc]) : undefined,
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
  buildAppointmentReminderEmail,
  buildPasswordResetEmail,
  buildSuspensionEmail,
  buildAccountReactivatedEmail,
  buildNewsletterEmail,
} from "./email-templates";
