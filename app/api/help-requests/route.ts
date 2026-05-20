import { NextRequest, NextResponse } from "next/server";
import {
  createHelpRequest,
  getAllHelpRequests,
  HELP_ISSUE_OPTIONS,
  type HelpIssue,
} from "../../../lib/help";
import {
  buildHelpRequestNotificationEmail,
  buildHelpRequestConfirmationEmail,
  sendEmail,
} from "../../../lib/email";

const CLINIC_EMAIL = process.env.CLINIC_NOTIFICATION_EMAIL ?? "support@bramsmindcare.com";

export async function GET() {
  const rows = await getAllHelpRequests();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, email, issue, message, source } = body as {
      name?: string;
      phone?: string;
      email?: string;
      issue?: string;
      message?: string;
      source?: string;
    };

    if (!name?.trim() || !message?.trim()) {
      return NextResponse.json(
        { error: "name and message are required" },
        { status: 400 },
      );
    }

    const issueValue: HelpIssue | null =
      issue && HELP_ISSUE_OPTIONS.includes(issue as HelpIssue)
        ? (issue as HelpIssue)
        : null;

    const cleanEmail = email?.trim() || null;
    const row = await createHelpRequest({
      name:    name.trim(),
      phone:   phone?.trim() || null,
      email:   cleanEmail,
      issue:   issueValue,
      message: message.trim(),
      source:  source?.trim() || null,
    });

    // Notify clinic + optionally confirm to the requester (fire-and-forget).
    const notifyTpl = buildHelpRequestNotificationEmail({
      name: name.trim(), phone: phone?.trim(), email: cleanEmail,
      issue: issueValue, message: message.trim(), source: source?.trim(),
    });
    const emailJobs: Promise<unknown>[] = [
      sendEmail({ to: CLINIC_EMAIL, subject: notifyTpl.subject, html: notifyTpl.html, text: notifyTpl.text }),
    ];
    if (cleanEmail) {
      const confirmTpl = buildHelpRequestConfirmationEmail({ name: name.trim() });
      emailJobs.push(sendEmail({ to: cleanEmail, subject: confirmTpl.subject, html: confirmTpl.html, text: confirmTpl.text }));
    }
    Promise.all(emailJobs).catch((e) => console.error("[help-requests] email failed:", e));

    return NextResponse.json(row);
  } catch (e) {
    console.error("[help-requests] POST failed:", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
