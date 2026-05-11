import { NextRequest, NextResponse } from "next/server";
import {
  createHelpRequest,
  getAllHelpRequests,
  HELP_ISSUE_OPTIONS,
  type HelpIssue,
} from "../../../lib/help";

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

    const row = await createHelpRequest({
      name:    name.trim(),
      phone:   phone?.trim() || null,
      email:   email?.trim() || null,
      issue:   issueValue,
      message: message.trim(),
      source:  source?.trim() || null,
    });

    return NextResponse.json(row);
  } catch (e) {
    console.error("[help-requests] POST failed:", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
