"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
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

export function BookingSuccess() {
  const params     = useSearchParams();
  const bookingId  = params.get("id") ?? "";
  const planTitle  = params.get("plan") ?? "Consultation";
  const date       = params.get("date") ?? "";
  const time       = params.get("time") ?? "";
  const name       = params.get("name") ?? "";

  const displayId  = bookingId ? bookingId.slice(0, 8).toUpperCase() : "—";
  const dateLabel  = formatDate(date);
  const timeLabel  = formatTime(time);

  return (
    <div className={styles.successPage}>
      {/* Decorative blobs */}
      <div className={styles.blobA} aria-hidden />
      <div className={styles.blobB} aria-hidden />

      {/* Brand logo */}
      <div className={styles.successLogo}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Brams Mind Care" className={styles.logoImg} />
      </div>

      {/* Main card */}
      <div className={styles.successCard}>
        {/* Icon + heading */}
        <div className={styles.successHeader}>
          <div className={styles.iconCircle} aria-hidden>✅</div>
          <h1 className={styles.successTitle}>Booking Confirmed</h1>
          <p className={styles.successSubtitle}>
            {name ? `${name}, your` : "Your"} consultation has been successfully
            booked. You will receive the meeting link via email / WhatsApp.
          </p>
        </div>

        {/* Bento grid */}
        <div className={styles.bentoGrid}>
          {/* Booking ID */}
          <div className={styles.bentoCard}>
            <p className={styles.bentoLabel}>Booking ID</p>
            <p className={`${styles.bentoValue} ${styles.bentoValueAccent}`}>
              {displayId}
            </p>
          </div>

          {/* Consultation type */}
          <div className={styles.bentoCard}>
            <p className={styles.bentoLabel}>Consultation Type</p>
            <p className={styles.bentoValue}>{planTitle}</p>
          </div>

          {/* Date & time — full width */}
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
          {/* Primary — Join Consultation (stub link, can wire to video URL later) */}
          <button type="button" className={styles.joinBtn}>
            <span>🎥</span>
            Join Consultation
          </button>

          {/* Secondary row */}
          <div className={styles.secondaryRow}>
            <button type="button" className={styles.secondaryBtn}>
              📅 Add to Calendar
            </button>
            <button type="button" className={styles.secondaryBtn}>
              🧾 Download Receipt
            </button>
          </div>

          {/* Home link */}
          <Link href="/" className={styles.homeLink}>
            ← Back to Home
          </Link>
        </div>
      </div>

      {/* Footer note */}
      <div className={styles.footerNote}>
        <p className={styles.footerNoteText}>
          If you have any urgent concerns prior to your session, please contact
          our support desk directly at{" "}
          <a href="mailto:support@bramsmindcare.com" className={styles.supportEmail}>
            support@bramsmindcare.com
          </a>.
        </p>
        <p className={styles.copyright}>
          © 2024 Brams Mind Care. Professional Psychiatric Care.
        </p>
      </div>
    </div>
  );
}
