"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { BookingSuccessData } from "../../lib/content";
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

export function BookingSuccess({ data }: { data: BookingSuccessData }) {
  const params    = useSearchParams();
  const bookingId = params.get("id") ?? "";
  const planTitle = params.get("plan") ?? "Consultation";
  const date      = params.get("date") ?? "";
  const time      = params.get("time") ?? "";
  const name      = params.get("name") ?? "";

  const displayId = bookingId ? bookingId.slice(0, 8).toUpperCase() : "—";
  const dateLabel = formatDate(date);
  const timeLabel = formatTime(time);

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
              <span style={{ fontSize: 28 }} aria-hidden>📅</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className={styles.actionSection}>
          <a
            href={data.primaryCta.href || "#"}
            className={styles.joinBtn}
          >
            <span>🎥</span>
            {data.primaryCta.label}
          </a>

          <div className={styles.secondaryRow}>
            <button type="button" className={styles.secondaryBtn}>
              📅 {data.calendarLabel}
            </button>
            <button type="button" className={styles.secondaryBtn}>
              🧾 {data.receiptLabel}
            </button>
          </div>

          <Link href="/" className={styles.homeLink}>
            ← {data.homeLabel}
          </Link>
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
