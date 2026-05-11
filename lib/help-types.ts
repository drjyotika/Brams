// Help-request types & constants — no server-side imports, safe for client.

export const HELP_ISSUE_OPTIONS = [
  "Booking issue",
  "Payment issue",
  "Reschedule / Cancel",
  "Technical problem",
  "Medical emergency",
  "Other",
] as const;

export type HelpIssue  = (typeof HELP_ISSUE_OPTIONS)[number];
export type HelpStatus = "new" | "in_progress" | "resolved";
