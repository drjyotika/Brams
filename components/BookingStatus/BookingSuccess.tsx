"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { BookingSuccessData } from "../../lib/content";
import { trackAddToCalendar } from "../../lib/analytics";
import styles from "./BookingStatus.module.scss";

function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", {
    weekday: "long",
    day:     "numeric",
    month:   "long",
    year:    "numeric",
  });
}

function formatTime(t: string): string {
  if (!t) return "—";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${String(m).padStart(2, "0")} ${ampm}`;
}

// ─── ICS generation ───────────────────────────────────────────────────────────

/**
 * Generates a RFC 5545-compliant ICS calendar event string.
 * Uses IST (UTC+5:30) as the event timezone so it appears at the right
 * local time regardless of where the user opens the file.
 */
function generateICS({
  bookingId,
  planTitle,
  date,
  time,
  durationMinutes,
  name,
}: {
  bookingId: string;
  planTitle: string;
  date: string;         // YYYY-MM-DD
  time: string;         // HH:MM or HH:MM:SS
  durationMinutes: number;
  name: string;
}): string {
  // Parse date + time into parts for IST formatting
  const [y, mo, d] = date.split("-").map(Number);
  const [h, min]   = time.split(":").map(Number);

  const pad = (n: number) => String(n).padStart(2, "0");

  // DTSTART local IST (TZID attached)
  const dtStart = `${y}${pad(mo)}${pad(d)}T${pad(h)}${pad(min)}00`;

  // Compute end time (add duration, carry hours)
  const totalMin = h * 60 + min + durationMinutes;
  const endH     = Math.floor(totalMin / 60) % 24;
  const endMin   = totalMin % 60;
  const dtEnd    = `${y}${pad(mo)}${pad(d)}T${pad(endH)}${pad(endMin)}00`;

  const uid = `${bookingId.slice(0, 8).toUpperCase()}-${Date.now()}@bramsmindcare.com`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Brams Mind Care//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    // VTIMEZONE block for IST (fixed offset +05:30, no DST)
    "BEGIN:VTIMEZONE",
    "TZID:Asia/Kolkata",
    "BEGIN:STANDARD",
    "DTSTART:19700101T000000",
    "TZOFFSETFROM:+0530",
    "TZOFFSETTO:+0530",
    "TZNAME:IST",
    "END:STANDARD",
    "END:VTIMEZONE",
    // Event
    "BEGIN:VEVENT",
    `DTSTART;TZID=Asia/Kolkata:${dtStart}`,
    `DTEND;TZID=Asia/Kolkata:${dtEnd}`,
    `SUMMARY:${planTitle} — Brams Mind Care`,
    `DESCRIPTION:Your appointment with Dr. Jyotika Kanwar\\nPlan: ${planTitle}\\nBooking ID: ${bookingId.slice(0, 8).toUpperCase()}\\nMode: Online Video Call\\nYou'll receive the meeting link shortly via email.`,
    "LOCATION:Online Video Call",
    `UID:${uid}`,
    "STATUS:CONFIRMED",
    "SEQUENCE:0",
    `ORGANIZER;CN=Brams Mind Care:mailto:info@bramsmindcare.com`,
    name ? `ATTENDEE;CN=${name}:mailto:noreply@bramsmindcare.com` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");

  return lines;
}

function downloadICS(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BookingSuccess({ data }: { data: BookingSuccessData }) {
  const params    = useSearchParams();
  const bookingId = params.get("id") ?? "";
  const planTitle = params.get("plan") ?? "Consultation";
  const date      = params.get("date") ?? "";
  const time      = params.get("time") ?? "";
  const name      = params.get("name") ?? "";
  const duration  = parseInt(params.get("duration") ?? "60", 10);

  const displayId = bookingId ? bookingId.slice(0, 8).toUpperCase() : "—";
  const dateLabel = formatDate(date);
  const timeLabel = formatTime(time);

  function handleAddToCalendar() {
    if (!date || !time) return;
    const ics = generateICS({
      bookingId:       bookingId || "booking",
      planTitle,
      date,
      time,
      durationMinutes: duration,
      name,
    });
    downloadICS(ics, `brams-appointment-${displayId}.ics`);
    trackAddToCalendar();
  }

  return (
    <div className={styles.successPage}>
      {/* Decorative blobs */}
      <div className={styles.blobA} aria-hidden />
      <div className={styles.blobB} aria-hidden />

      {/* Main card */}
      <div className={styles.successCard}>
        {/* Icon + heading */}
        <div className={styles.successHeader}>
          <div className={styles.iconCircle} aria-hidden>✅</div>
          <h1 className={styles.successTitle}>{data.title}</h1>
          <p className={styles.successSubtitle}>
            {name ? `${name}, your` : "Your"}{" "}
            {data.subtitle.replace(/^your/i, "").trimStart()}
          </p>
        </div>

        {/* Bento grid */}
        <div className={styles.bentoGrid}>
          <div className={styles.bentoCard}>
            <p className={styles.bentoLabel}>Booking ID</p>
            <p className={`${styles.bentoValue} ${styles.bentoValueAccent}`}>{displayId}</p>
          </div>

          <div className={styles.bentoCard}>
            <p className={styles.bentoLabel}>Consultation Type</p>
            <p className={styles.bentoValue}>{planTitle}</p>
          </div>

          <div className={`${styles.bentoCard} ${styles.bentoCardWide}`}>
            <div className={styles.bentoCardRow}>
              <div>
                <p className={styles.bentoLabel}>Date &amp; Time</p>
                <p className={styles.bentoValue}>
                  {dateLabel} &bull; {timeLabel}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions — driven by data.ctas array (admin-editable) */}
        <div className={styles.actionSection}>
          {/* Primary CTAs */}
          {data.ctas.filter((c) => c.variant === "primary").map((cta) => (
            <a key={cta.id} href={cta.href || "#"} className={styles.joinBtn}>
              {cta.emoji && <span aria-hidden>{cta.emoji}</span>}
              {cta.label}
            </a>
          ))}

          {/* ── Calendar + Receipt row (always shown) ── */}
          <div className={styles.utilRow}>
            <button
              type="button"
              className={styles.utilBtn}
              onClick={handleAddToCalendar}
              disabled={!date || !time}
            >
              Add to Calendar
            </button>

            {bookingId && (
              <a
                href={`/receipt/${bookingId}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.utilBtn}
              >
                Download Receipt
              </a>
            )}
          </div>

          {/* Text / link CTAs */}
          {data.ctas.filter((c) => c.variant === "text").map((cta) => (
            <Link key={cta.id} href={cta.href || "/"} className={styles.homeLink}>
              {cta.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Footer note */}
      <div className={styles.footerNote}>
        <p className={styles.footerNoteText}>
          {data.footerNote}{" "}
          <a
            href={`mailto:${data.supportEmail}`}
            className={styles.supportEmail}
          >
            {data.supportEmail}
          </a>.
        </p>
        <p className={styles.copyright}>{data.copyright}</p>
      </div>
    </div>
  );
}
