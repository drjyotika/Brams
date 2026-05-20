import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "../../../../lib/auth";
import { sql } from "../../../../lib/db";
import { buildNewsletterEmail, sendEmail } from "../../../../lib/email";

/**
 * POST /api/admin/newsletter
 *
 * Sends a newsletter to all patients with email addresses, or to a
 * specific list of email addresses if `recipientEmails` is provided.
 *
 * Body:
 *   subject         string   (required) email subject line
 *   preheader       string?  inbox preview text
 *   headline        string   (required) H1 inside the card
 *   body            string   (required) body text — blank lines = paragraph breaks
 *   ctaLabel        string?  CTA button label
 *   ctaUrl          string?  CTA button URL (required if ctaLabel provided)
 *   unsubscribeUrl  string?  unsubscribe link in footer
 *   recipientEmails string?  comma-separated list; omit to send to all patients
 */
export async function POST(req: NextRequest) {
  // Admin-only: verify session cookie
  const jar   = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token || !(await verifySessionToken(token))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json() as {
      subject:         string;
      preheader?:      string;
      headline:        string;
      body:            string;
      ctaLabel?:       string;
      ctaUrl?:         string;
      unsubscribeUrl?: string;
      recipientEmails?: string;
    };

    if (!body.subject?.trim() || !body.headline?.trim() || !body.body?.trim()) {
      return NextResponse.json({ error: "subject, headline and body are required." }, { status: 400 });
    }
    if (body.ctaLabel?.trim() && !body.ctaUrl?.trim()) {
      return NextResponse.json({ error: "ctaUrl is required when ctaLabel is provided." }, { status: 400 });
    }

    // Resolve recipients
    let recipients: { email: string; full_name: string | null }[] = [];

    if (body.recipientEmails?.trim()) {
      recipients = body.recipientEmails
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean)
        .map((email) => ({ email, full_name: null }));
    } else {
      const rows = await sql`
        SELECT email, full_name FROM patients
        WHERE email IS NOT NULL AND email != ''
        ORDER BY created_at
      `;
      recipients = rows as { email: string; full_name: string }[];
    }

    if (recipients.length === 0) {
      return NextResponse.json({ error: "No recipients found." }, { status: 400 });
    }

    // Split body into paragraphs on blank lines
    const paragraphs = body.body.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);

    let sent = 0;
    const errors: string[] = [];

    for (const recipient of recipients) {
      try {
        const tpl = buildNewsletterEmail({
          fullName:       recipient.full_name ?? null,
          subject:        body.subject.trim(),
          preheader:      body.preheader?.trim(),
          headline:       body.headline.trim(),
          body:           paragraphs,
          cta:            body.ctaLabel?.trim()
            ? { label: body.ctaLabel.trim(), url: body.ctaUrl!.trim() }
            : undefined,
          unsubscribeUrl: body.unsubscribeUrl?.trim() || undefined,
        });

        const result = await sendEmail({
          to:      recipient.email,
          subject: tpl.subject,
          html:    tpl.html,
          text:    tpl.text,
        });

        if (result.ok) sent++;
        else errors.push(`${recipient.email}: ${result.error}`);
      } catch (e) {
        errors.push(`${recipient.email}: ${(e as Error).message}`);
      }
    }

    return NextResponse.json({
      ok:    true,
      total: recipients.length,
      sent,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (e) {
    console.error("[admin/newsletter] POST failed:", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
