import { NextRequest, NextResponse } from "next/server";
import { sql } from "../../../../lib/db";
import { buildAppointmentReminderEmail, sendEmail } from "../../../../lib/email";

/**
 * GET /api/cron/appointment-reminders
 *
 * Called hourly by Vercel Cron. Finds all confirmed/paid appointments
 * starting in 3.5–4.5 hours (IST) that haven't had a 4-hour reminder sent
 * yet, and emails each patient.
 *
 * Protected by CRON_SECRET (set automatically by Vercel on Pro, or manually
 * in environment variables).
 */

const SITE_URL =
  process.env.SITE_URL ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  "https://bramsmindcare.com";

export async function GET(req: NextRequest) {
  // Verify Vercel cron secret
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Ensure reminder column exists (idempotent migration).
    await sql`
      ALTER TABLE appointments
      ADD COLUMN IF NOT EXISTS reminder_4h_sent_at TIMESTAMPTZ
    `;

    // Find appointments due for a 4-hour reminder:
    // - status confirmed or pending, payment paid
    // - patient has an email
    // - reminder not yet sent
    // - scheduled time (IST) is 3.5–4.5 hours from now UTC
    const rows = await sql`
      SELECT
        a.id,
        a.plan_title,
        a.scheduled_date,
        a.scheduled_time,
        a.duration_minutes,
        a.meeting_link,
        p.full_name,
        p.email
      FROM appointments a
      JOIN patients p ON p.id = a.patient_id
      WHERE
        a.status         IN ('confirmed', 'pending')
        AND a.payment_status = 'paid'
        AND p.email         IS NOT NULL
        AND a.reminder_4h_sent_at IS NULL
        AND (a.scheduled_date || ' ' || a.scheduled_time)::timestamp
              AT TIME ZONE 'Asia/Kolkata'
            BETWEEN NOW() + INTERVAL '3 hours 30 minutes'
                AND NOW() + INTERVAL '4 hours 30 minutes'
    `;

    if (rows.length === 0) {
      return NextResponse.json({ ok: true, sent: 0 });
    }

    let sent = 0;
    const errors: string[] = [];

    for (const row of rows as {
      id: string;
      plan_title: string;
      scheduled_date: string;
      scheduled_time: string;
      duration_minutes: number;
      meeting_link: string | null;
      full_name: string;
      email: string;
    }[]) {
      try {
        const tpl = buildAppointmentReminderEmail({
          fullName:      row.full_name,
          planTitle:     row.plan_title,
          scheduledDate: row.scheduled_date,
          scheduledTime: row.scheduled_time,
          meetingLink:   row.meeting_link,
          hoursUntil:    4,
          manageUrl:     `${SITE_URL}/patient`,
        });

        const result = await sendEmail({
          to:      row.email,
          subject: tpl.subject,
          html:    tpl.html,
          text:    tpl.text,
        });

        if (result.ok) {
          // Mark reminder as sent so we never double-send.
          await sql`
            UPDATE appointments
            SET reminder_4h_sent_at = NOW()
            WHERE id = ${row.id}
          `;
          sent++;
        } else {
          errors.push(`${row.id}: ${result.error}`);
        }
      } catch (e) {
        errors.push(`${row.id}: ${(e as Error).message}`);
      }
    }

    console.log(`[cron/reminders] sent=${sent} errors=${errors.length}`);
    return NextResponse.json({ ok: true, sent, errors: errors.length > 0 ? errors : undefined });
  } catch (e) {
    console.error("[cron/reminders] failed:", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
