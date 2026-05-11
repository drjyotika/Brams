"use client";

import type { PlanInfo } from "./index";
import styles from "./ConsultationSummary.module.scss";

export function ConsultationSummary({
  plan,
  scheduledDate,
  scheduledTime,
}: {
  plan: PlanInfo;
  scheduledDate: string;
  scheduledTime: string;
}) {
  const dateLabel = scheduledDate
    ? new Date(scheduledDate).toLocaleDateString("en-IN", {
        weekday: "short",
        month:   "short",
        day:     "numeric",
        year:    "numeric",
      })
    : "—";

  const timeLabel = formatTime(scheduledTime);

  const consultationFee = plan.price_paise;
  const bookingFee      = 0;
  const totalPayable    = consultationFee + bookingFee;

  return (
    <div className={styles.card}>
      <div className={styles.privacyBox}>
        <strong>Privacy Note</strong>
        <p>
          Your information is encrypted and kept strictly confidential.
          Shared only with Dr. Kanwar for your care.
        </p>
      </div>

      <h3 className={styles.heading}>Consultation Summary</h3>

      <Row label="Consultation Type" value={plan.title} />
      <Row label="Date" value={dateLabel} />
      <Row label="Time" value={timeLabel} />
      <Row label="Mode" value="Online Video Call" />

      <div className={styles.divider} />

      <Row label="Consultation Fee" value={formatINR(consultationFee)} />
      {bookingFee > 0 && <Row label="Booking Fee" value={formatINR(bookingFee)} />}

      <div className={styles.divider} />

      <Row label="Total Payable" value={formatINR(totalPayable)} strong />
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`${styles.row} ${strong ? styles.rowStrong : ""}`}>
      <span className={styles.rowLabel}>{label}</span>
      <span className={styles.rowValue}>{value}</span>
    </div>
  );
}

function formatINR(paise: number): string {
  const rupees = paise / 100;
  return `₹${rupees.toLocaleString("en-IN")}`;
}

function formatTime(time24: string): string {
  if (!time24) return "—";
  const [h, m] = time24.split(":").map((s) => parseInt(s, 10));
  const ampm = h >= 12 ? "PM" : "AM";
  const hh   = ((h + 11) % 12) + 1;
  return `${hh}:${String(m).padStart(2, "0")} ${ampm}`;
}
