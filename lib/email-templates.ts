// Transactional + broadcast email templates.
//
// All templates share a single visual `layout()` — branded header, body,
// optional CTA button, footer — so the styling stays in one place and new
// email types just need to supply their copy.
//
// Each builder returns `{ subject, html, text }` ready to hand to
// `sendEmail()` from `lib/email.ts`, which relays it to the email service
// (services/email/) for delivery as `verification@bramsmindcare.com`.

// ─── Public types ────────────────────────────────────────────────────────────

export type EmailMessage = {
  subject: string;
  html:    string;
  text:    string;
};

// ─── Brand config ────────────────────────────────────────────────────────────
//
// SITE_URL is read once so logo/CTA links resolve to a real host whether
// you're on localhost or production.  Override at deploy time:
//     SITE_URL=https://bramsmindcare.com

const SITE_URL =
  process.env.SITE_URL ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  "http://localhost:3000";

const BRAND = {
  name:          "Brams Mind Care",
  tagline:       "Confidential, evidence-based psychiatric care.",
  logoUrl:       `${SITE_URL}/logo.png`,
  supportEmail:  "support@bramsmindcare.com",
  primaryColor:  "#745475",
  darkColor:     "#553757",
  inkColor:      "#1a1c1d",
  softColor:     "#4c444b",
  mutedColor:    "#71717a",
  bgColor:       "#f9f9fb",
  cardBg:        "#ffffff",
  borderColor:   "rgba(207,195,204,.25)",
};

// ─── Shared layout ───────────────────────────────────────────────────────────

type LayoutOpts = {
  /** Hidden preview-text shown in inbox snippets (max ~90 chars). */
  preheader?: string;
  /** H1 inside the email card. */
  heading:    string;
  /** Single intro paragraph rendered above `content`. */
  intro?:     string;
  /** Pre-rendered HTML block (boxes, lists, etc.). */
  content?:   string;
  /** Optional pill-shaped CTA button below the content. */
  cta?:       { label: string; url: string };
  /** Replaces the default "Need help? Contact support…" footer copy. */
  footer?:    string;
};

function layout(opts: LayoutOpts): string {
  const preheader = opts.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;line-height:1px;">${escapeHtml(opts.preheader)}</div>`
    : "";

  const intro = opts.intro
    ? `<p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:${BRAND.mutedColor};">${opts.intro}</p>`
    : "";

  const content = opts.content ?? "";

  const cta = opts.cta
    ? `
        <p style="text-align:center;margin:24px 0 8px;">
          <a href="${escapeAttr(opts.cta.url)}" style="display:inline-block;background:${BRAND.primaryColor};color:#fff;text-decoration:none;font-weight:700;padding:13px 28px;border-radius:12px;font-size:14px;">${escapeHtml(opts.cta.label)}</a>
        </p>`
    : "";

  const footer = opts.footer
    ? `<p style="margin:0;font-size:11px;color:#a1a1aa;text-align:center;line-height:1.6;">${opts.footer}</p>`
    : `<p style="margin:0;font-size:11px;color:#a1a1aa;text-align:center;line-height:1.6;">
         Need help? Email <a href="mailto:${BRAND.supportEmail}" style="color:${BRAND.primaryColor};text-decoration:none;">${BRAND.supportEmail}</a>.<br/>
         © ${new Date().getFullYear()} ${BRAND.name}. ${BRAND.tagline}
       </p>`;

  return `<!DOCTYPE html>
<html>
  <body style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:${BRAND.bgColor};padding:32px 16px;margin:0;color:${BRAND.inkColor};">
    ${preheader}
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" width="100%" style="max-width:520px;margin:0 auto;">
      <!-- Brand header -->
      <tr><td style="text-align:center;padding:0 0 20px;">
        <img src="${escapeAttr(BRAND.logoUrl)}" alt="${escapeAttr(BRAND.name)}" width="120" style="max-width:120px;height:auto;display:inline-block;" />
      </td></tr>

      <!-- Card -->
      <tr><td style="background:${BRAND.cardBg};border:1px solid ${BRAND.borderColor};border-radius:16px;padding:36px 32px;">
        <h1 style="margin:0 0 12px;font-size:20px;color:${BRAND.inkColor};line-height:1.3;">${escapeHtml(opts.heading)}</h1>
        ${intro}
        ${content}
        ${cta}
      </td></tr>

      <!-- Footer -->
      <tr><td style="padding:20px 8px 0;">
        ${footer}
      </td></tr>
    </table>
  </body>
</html>`;
}

// ─── Plain-text wrapper ──────────────────────────────────────────────────────

function plainText(opts: {
  heading: string;
  intro?:  string;
  body?:   string;
  cta?:    { label: string; url: string };
  footer?: string;
}): string {
  const lines = [
    opts.heading,
    "═".repeat(Math.min(opts.heading.length, 40)),
    "",
  ];
  if (opts.intro)  lines.push(opts.intro, "");
  if (opts.body)   lines.push(opts.body, "");
  if (opts.cta)    lines.push(`${opts.cta.label}: ${opts.cta.url}`, "");
  lines.push("—");
  lines.push(opts.footer ?? `${BRAND.name} · ${BRAND.supportEmail}`);
  return lines.join("\n");
}

// ─── Re-usable content blocks ────────────────────────────────────────────────

/** Centered prominent code (e.g. OTP). */
function codeBlock(label: string, code: string): string {
  return `
    <div style="background:#f3f3f5;border-radius:12px;padding:20px;text-align:center;margin:0 0 20px;">
      <div style="font-size:11px;font-weight:700;color:${BRAND.mutedColor};text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">${escapeHtml(label)}</div>
      <div style="font-family:'SF Mono',Menlo,Consolas,monospace;font-size:30px;font-weight:700;color:${BRAND.primaryColor};letter-spacing:6px;">${escapeHtml(code)}</div>
    </div>`;
}

/** Tinted info card with rows of label/value pairs. */
function infoCard(rows: { label: string; value: string }[]): string {
  const inner = rows
    .map(
      (r) => `
      <tr>
        <td style="padding:6px 0;font-size:11px;font-weight:700;color:${BRAND.mutedColor};text-transform:uppercase;letter-spacing:0.4px;width:120px;vertical-align:top;">${escapeHtml(r.label)}</td>
        <td style="padding:6px 0;font-size:14px;color:${BRAND.inkColor};vertical-align:top;">${escapeHtml(r.value)}</td>
      </tr>`,
    )
    .join("");
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#faf8fb;border:1px solid ${BRAND.borderColor};border-radius:12px;padding:14px 18px;margin:0 0 20px;">
      ${inner}
    </table>`;
}

/** Yellow / red tinted callout for warnings (suspension, expiry, etc.). */
function callout(kind: "warn" | "danger" | "info", text: string): string {
  const palette = {
    warn:   { bg: "#fffbeb", border: "#fcd34d", fg: "#78350f" },
    danger: { bg: "#fef2f2", border: "#fecaca", fg: "#991b1b" },
    info:   { bg: "#eff6ff", border: "#bfdbfe", fg: "#1e40af" },
  }[kind];
  return `
    <div style="background:${palette.bg};border:1px solid ${palette.border};color:${palette.fg};border-radius:10px;padding:12px 14px;font-size:13px;line-height:1.55;margin:0 0 20px;">
      ${text}
    </div>`;
}

// ─── Date / time formatting helpers ──────────────────────────────────────────

/** "2026-05-13" → "Wed, 13 May 2026". Date is interpreted in IST. */
function formatDate(iso: string): string {
  try {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
      weekday: "short", day: "numeric", month: "short", year: "numeric",
    });
  } catch {
    return iso;
  }
}

/** "10:00" or "10:00:00" → "10:00 AM". */
function formatTime12(t: string): string {
  const [hStr, mStr] = t.split(":");
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, "0")}:${mStr ?? "00"} ${ampm}`;
}

// ─── 1. Verification email ───────────────────────────────────────────────────

export function buildVerificationEmail(input: {
  fullName: string;
  otp:      string;
  link:     string;
}): EmailMessage {
  const subject  = `Verify your ${BRAND.name} account`;
  const preheader = `Your verification code is ${input.otp}. Expires in 30 minutes.`;

  const content = codeBlock("Verification code", input.otp)
    + `<p style="margin:0 0 16px;font-size:13px;color:${BRAND.softColor};text-align:center;">…or verify instantly with one click:</p>`;

  const html = layout({
    preheader,
    heading:  "Verify your email",
    intro:    `Hi <strong>${escapeHtml(input.fullName)}</strong>, welcome to ${BRAND.name}. Enter the code below to confirm your email address.`,
    content,
    cta:      { label: "Verify Email", url: input.link },
    footer:   `This code expires in 30 minutes. If you didn't create this account, you can safely ignore this email.`,
  });

  const text = plainText({
    heading: "Verify your email",
    intro:   `Hi ${input.fullName},\n\nWelcome to ${BRAND.name}.`,
    body:    `Your verification code is: ${input.otp}\n\nOr verify instantly: ${input.link}\n\nThis code expires in 30 minutes.`,
  });

  return { subject, html, text };
}

// ─── 2. Welcome email (sent after verification succeeds) ─────────────────────

export function buildWelcomeEmail(input: {
  fullName: string;
  loginUrl: string;
}): EmailMessage {
  const subject = `Welcome to ${BRAND.name}, ${input.fullName.split(" ")[0]}!`;

  const html = layout({
    preheader: "Your account is all set. Here's what you can do next.",
    heading:   `Welcome to ${BRAND.name}`,
    intro:     `Hi <strong>${escapeHtml(input.fullName)}</strong>, your email is verified and your account is ready. You can now book consultations, view appointments, and manage your records in one place.`,
    content: `
      <ul style="margin:0 0 8px;padding-left:20px;font-size:14px;color:${BRAND.softColor};line-height:1.7;">
        <li>📅 Book online consultations at a time that suits you.</li>
        <li>📝 Access your prescriptions and reports after each session.</li>
        <li>🔔 Get reminders so you never miss an appointment.</li>
      </ul>`,
    cta:    { label: "Go to dashboard", url: input.loginUrl },
  });

  const text = plainText({
    heading: `Welcome to ${BRAND.name}`,
    intro:   `Hi ${input.fullName}, your email is verified and your account is ready.`,
    body:    "You can book online consultations, view appointments, and manage your records.",
    cta:     { label: "Open dashboard", url: input.loginUrl },
  });

  return { subject, html, text };
}

// ─── 3. Appointment confirmation ─────────────────────────────────────────────

export function buildAppointmentConfirmationEmail(input: {
  fullName:        string;
  planTitle:       string;
  scheduledDate:   string;  // "YYYY-MM-DD"
  scheduledTime:   string;  // "HH:MM" or "HH:MM:SS"
  durationMinutes: number;
  meetingLink?:    string | null;
  manageUrl:       string;
}): EmailMessage {
  const subject = `Booking confirmed — ${formatDate(input.scheduledDate)} at ${formatTime12(input.scheduledTime)}`;

  const rows = [
    { label: "Consultation", value: input.planTitle },
    { label: "Date",         value: formatDate(input.scheduledDate) },
    { label: "Time",         value: `${formatTime12(input.scheduledTime)} (${input.durationMinutes} min)` },
  ];
  if (input.meetingLink) rows.push({ label: "Meeting link", value: input.meetingLink });

  const html = layout({
    preheader: `Your ${input.planTitle} is booked. We'll send a reminder before the call.`,
    heading:   "Your booking is confirmed",
    intro:     `Hi <strong>${escapeHtml(input.fullName)}</strong>, your consultation has been booked. Here are the details:`,
    content:   infoCard(rows),
    cta:       input.meetingLink
      ? { label: "Join consultation", url: input.meetingLink }
      : { label: "Manage booking",    url: input.manageUrl   },
    footer: input.meetingLink
      ? `Tip: save this email — you'll receive a reminder before the call.`
      : `Your meeting link will be sent closer to the appointment time.`,
  });

  const text = plainText({
    heading: "Your booking is confirmed",
    intro:   `Hi ${input.fullName},`,
    body:    rows.map((r) => `${r.label}: ${r.value}`).join("\n"),
    cta:     input.meetingLink
      ? { label: "Join", url: input.meetingLink }
      : { label: "Manage booking", url: input.manageUrl },
  });

  return { subject, html, text };
}

// ─── 4. Appointment reminder ─────────────────────────────────────────────────

export function buildAppointmentReminderEmail(input: {
  fullName:      string;
  planTitle:     string;
  scheduledDate: string;
  scheduledTime: string;
  meetingLink?:  string | null;
  hoursUntil:    number; // 24, 2, 1, etc — drives the headline copy
  manageUrl:     string;
}): EmailMessage {
  const whenLabel =
    input.hoursUntil <= 1   ? "in less than an hour" :
    input.hoursUntil <= 2   ? "in about 2 hours"     :
    input.hoursUntil <= 24  ? "tomorrow"             :
                              `in ${Math.round(input.hoursUntil / 24)} days`;

  const subject = `Reminder — your consultation is ${whenLabel}`;

  const rows = [
    { label: "Consultation", value: input.planTitle },
    { label: "Date",         value: formatDate(input.scheduledDate) },
    { label: "Time",         value: formatTime12(input.scheduledTime) },
  ];
  if (input.meetingLink) rows.push({ label: "Meeting link", value: input.meetingLink });

  const html = layout({
    preheader: `Your ${input.planTitle} is ${whenLabel}.`,
    heading:   `Reminder — your consultation is ${whenLabel}`,
    intro:     `Hi <strong>${escapeHtml(input.fullName)}</strong>, this is a friendly reminder for your upcoming session with ${BRAND.name}.`,
    content:   infoCard(rows) + callout("info", "Please join 2–3 minutes early and find a quiet, private space."),
    cta:       input.meetingLink
      ? { label: "Join now", url: input.meetingLink }
      : { label: "View booking", url: input.manageUrl },
    footer:    `Need to reschedule? Reply to this email or visit your dashboard.`,
  });

  const text = plainText({
    heading: `Reminder — your consultation is ${whenLabel}`,
    intro:   `Hi ${input.fullName},`,
    body:    rows.map((r) => `${r.label}: ${r.value}`).join("\n"),
    cta:     input.meetingLink
      ? { label: "Join", url: input.meetingLink }
      : { label: "View booking", url: input.manageUrl },
  });

  return { subject, html, text };
}

// ─── 5. Password-reset notice (admin reset, no plaintext password) ───────────

export function buildPasswordResetEmail(input: {
  fullName:    string;
  resetByAdmin: boolean;
  loginUrl:    string;
}): EmailMessage {
  const subject = "Your password was changed";

  const intro = input.resetByAdmin
    ? `Hi <strong>${escapeHtml(input.fullName)}</strong>, an administrator has reset the password on your ${BRAND.name} account. Please log in with the new password we shared with you.`
    : `Hi <strong>${escapeHtml(input.fullName)}</strong>, your ${BRAND.name} account password was just changed.`;

  const html = layout({
    preheader: "Your account password was changed.",
    heading:   "Your password was changed",
    intro,
    content:   callout("warn", `If you did not expect this change, please contact us immediately at <a href="mailto:${BRAND.supportEmail}" style="color:inherit;">${BRAND.supportEmail}</a>.`),
    cta:       { label: "Sign in", url: input.loginUrl },
  });

  const text = plainText({
    heading: "Your password was changed",
    intro:   input.resetByAdmin
      ? `Hi ${input.fullName}, an administrator reset your password.`
      : `Hi ${input.fullName}, your password was just changed.`,
    body:    `If this wasn't you, contact us at ${BRAND.supportEmail} immediately.`,
    cta:     { label: "Sign in", url: input.loginUrl },
  });

  return { subject, html, text };
}

// ─── 6. Account suspended ────────────────────────────────────────────────────

export function buildSuspensionEmail(input: {
  fullName: string;
  reason?:  string | null;
}): EmailMessage {
  const subject = "Your account has been suspended";

  const html = layout({
    preheader: "Your account has been temporarily suspended.",
    heading:   "Account suspended",
    intro:     `Hi <strong>${escapeHtml(input.fullName)}</strong>, access to your ${BRAND.name} account has been suspended.`,
    content:   input.reason
      ? callout("danger", `<strong>Reason:</strong> ${escapeHtml(input.reason)}`)
      : callout("danger", "Please contact our support team for details."),
    cta:       { label: "Contact support", url: `mailto:${BRAND.supportEmail}` },
  });

  const text = plainText({
    heading: "Account suspended",
    intro:   `Hi ${input.fullName}, your ${BRAND.name} account has been suspended.`,
    body:    input.reason
      ? `Reason: ${input.reason}\n\nContact ${BRAND.supportEmail} for help.`
      : `Contact ${BRAND.supportEmail} for details.`,
  });

  return { subject, html, text };
}

// ─── 7. Account reactivated ──────────────────────────────────────────────────

export function buildAccountReactivatedEmail(input: {
  fullName: string;
  loginUrl: string;
}): EmailMessage {
  const subject = "Your account is active again";

  const html = layout({
    preheader: "Your account has been reactivated.",
    heading:   "Welcome back",
    intro:     `Hi <strong>${escapeHtml(input.fullName)}</strong>, your ${BRAND.name} account has been reactivated. You can sign in and resume booking consultations.`,
    cta:       { label: "Sign in", url: input.loginUrl },
  });

  const text = plainText({
    heading: "Welcome back",
    intro:   `Hi ${input.fullName}, your ${BRAND.name} account has been reactivated.`,
    cta:     { label: "Sign in", url: input.loginUrl },
  });

  return { subject, html, text };
}

// ─── 8. Newsletter / broadcast ───────────────────────────────────────────────

export function buildNewsletterEmail(input: {
  /** Optional personalisation — falls back to "there" if missing. */
  fullName?:      string | null;
  /** Real email subject line. */
  subject:        string;
  /** Inbox preview snippet (~90 chars). */
  preheader?:     string;
  /** Hero headline inside the card. */
  headline:       string;
  /** Body paragraphs — array becomes multiple <p>s, string is treated as one. */
  body:           string | string[];
  /** Optional call-to-action. */
  cta?:           { label: string; url: string };
  /** If supplied, adds an "Unsubscribe" link in the footer. */
  unsubscribeUrl?: string;
}): EmailMessage {
  const paragraphs = Array.isArray(input.body) ? input.body : [input.body];
  const content = paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 14px;font-size:14px;line-height:1.7;color:${BRAND.softColor};">${escapeHtmlAllowBreaks(p)}</p>`,
    )
    .join("");

  const footer = input.unsubscribeUrl
    ? `Don't want these updates? <a href="${escapeAttr(input.unsubscribeUrl)}" style="color:${BRAND.primaryColor};">Unsubscribe</a>.<br/>© ${new Date().getFullYear()} ${BRAND.name}.`
    : `© ${new Date().getFullYear()} ${BRAND.name}. ${BRAND.tagline}`;

  const html = layout({
    preheader: input.preheader,
    heading:   input.headline,
    intro:     `Hi <strong>${escapeHtml(input.fullName ?? "there")}</strong>,`,
    content,
    cta:       input.cta,
    footer,
  });

  const text = plainText({
    heading: input.headline,
    intro:   `Hi ${input.fullName ?? "there"},`,
    body:    paragraphs.join("\n\n"),
    cta:     input.cta,
    footer:  input.unsubscribeUrl
      ? `Unsubscribe: ${input.unsubscribeUrl}\n${BRAND.name}`
      : `${BRAND.name}`,
  });

  return { subject: input.subject, html, text };
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Like escapeHtml but preserves `\n` as `<br/>` for newsletter paragraphs. */
function escapeHtmlAllowBreaks(s: string): string {
  return escapeHtml(s).replace(/\n/g, "<br/>");
}

function escapeAttr(s: string): string {
  return s.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
