import { NextResponse } from "next/server";
import { sql } from "../../../lib/db";
import {
  buildContactNotificationEmail,
  buildContactConfirmationEmail,
  sendEmail,
} from "../../../lib/email";

const CLINIC_EMAIL = process.env.CLINIC_NOTIFICATION_EMAIL ?? "support@bramsmindcare.com";

export async function POST(req: Request) {
  try {
    const { name, email, phone, subject, message } = await req.json();
    if (!name || !email || !message) {
      return NextResponse.json({ error: "name, email and message are required." }, { status: 400 });
    }
    await sql`
      INSERT INTO contact_submissions (name, email, phone, subject, message)
      VALUES (${name}, ${email}, ${phone ?? null}, ${subject ?? null}, ${message})
    `;

    // Notify clinic + send user confirmation (fire-and-forget).
    const notifyTpl  = buildContactNotificationEmail({ name, email, phone, subject, message });
    const confirmTpl = buildContactConfirmationEmail({ name });
    Promise.all([
      sendEmail({ to: CLINIC_EMAIL, subject: notifyTpl.subject,  html: notifyTpl.html,  text: notifyTpl.text  }),
      sendEmail({ to: email,        subject: confirmTpl.subject, html: confirmTpl.html, text: confirmTpl.text }),
    ]).catch((e) => console.error("[api/contact] email failed:", e));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/contact POST]", err);
    return NextResponse.json({ error: "Failed to submit." }, { status: 500 });
  }
}
