"use client";

import { useEffect, useState } from "react";
import type { Appointment } from "../../../lib/bookings";
import styles from "./receipt.module.scss";

// ─── Types ────────────────────────────────────────────────────────────────────

type PatientInfo = {
  id:        string;
  full_name: string;
  phone:     string;
  email:     string | null;
  age:       number | null;
  gender:    string | null;
  city:      string | null;
};

type PaymentInfo = {
  gateway_payment_id: string | null;
  gateway_order_id:   string | null;
  amount_paise:       number;
  currency:           string;
  created_at:         string;
};

type ReceiptData = {
  appointment: Appointment;
  patient:     PatientInfo;
  payment:     PaymentInfo | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  // DB may return a full ISO timestamp for DATE columns — strip the time part
  // and construct a local date to avoid UTC-offset shifting.
  const datePart = iso.includes("T") ? iso.split("T")[0] : iso;
  const [y, m, d] = datePart.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
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
  const hh   = ((h + 11) % 12) + 1;
  return `${hh}:${String(m).padStart(2, "0")} ${ampm}`;
}

function formatINR(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ReceiptView({ bookingId }: { bookingId: string }) {
  const [data, setData]     = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/receipt/${bookingId}`)
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(body.error || "Booking not found.");
        }
        return r.json();
      })
      .then((d: ReceiptData) => setData(d))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [bookingId]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingMsg}>Loading receipt…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={styles.page}>
        <div className={styles.errorMsg}>
          <span>⚠️</span>
          <p>{error ?? "Receipt not found."}</p>
        </div>
      </div>
    );
  }

  const { appointment: appt, patient, payment } = data;
  const displayId = appt.id.slice(0, 8).toUpperCase();
  const originalFee  = appt.consultation_fee_paise;
  const discountPaise = appt.discount_paise ?? 0;
  const totalPaid    = payment?.amount_paise ?? appt.total_paise;

  return (
    <div className={styles.page}>
      {/* Print / Download button — hidden during print */}
      <div className={styles.printBar}>
        <span className={styles.printBarNote}>📋 Booking Receipt</span>
        <button
          type="button"
          className={styles.printBtn}
          onClick={() => window.print()}
        >
          🖨️ Print / Save as PDF
        </button>
      </div>

      {/* ── Receipt body ── */}
      <div className={styles.receipt}>
        {/* Header */}
        <div className={styles.receiptHeader}>
          <div className={styles.clinicInfo}>
            <h1 className={styles.clinicName}>Brams Mind Care</h1>
            <p className={styles.clinicTagline}>Dr. Jyotika Kanwar · Psychiatry &amp; Mental Wellness</p>
            <p className={styles.clinicContact}>info@bramsmindcare.com · bramsmindcare.com</p>
          </div>
          <div className={styles.receiptMeta}>
            <div className={styles.receiptBadge}>RECEIPT</div>
            <p className={styles.receiptId}>#{displayId}</p>
            {payment && (
              <p className={styles.receiptDate}>{formatDateTime(payment.created_at)}</p>
            )}
          </div>
        </div>

        <div className={styles.divider} />

        {/* Patient details */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Patient Details</h2>
          <div className={styles.detailGrid}>
            <DetailRow label="Name"   value={patient.full_name} />
            <DetailRow label="Phone"  value={patient.phone} />
            {patient.email && <DetailRow label="Email"  value={patient.email} />}
            {patient.age   && <DetailRow label="Age"    value={`${patient.age} years`} />}
            {patient.gender && <DetailRow label="Gender" value={capitalize(patient.gender)} />}
            {patient.city   && <DetailRow label="City"   value={patient.city} />}
          </div>
        </div>

        <div className={styles.divider} />

        {/* Appointment details */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Appointment Details</h2>
          <div className={styles.detailGrid}>
            <DetailRow label="Consultation"  value={appt.plan_title} />
            <DetailRow label="Date"          value={formatDate(appt.scheduled_date)} />
            <DetailRow label="Time"          value={formatTime(appt.scheduled_time)} />
            <DetailRow label="Mode"          value="Online Video Call" />
            <DetailRow label="Status"        value={capitalize(appt.status)} />
            {appt.reason_for_consultation && (
              <DetailRow label="Reason" value={appt.reason_for_consultation} />
            )}
          </div>
        </div>

        <div className={styles.divider} />

        {/* Payment details */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Payment Summary</h2>
          <div className={styles.payTable}>
            <div className={styles.payRow}>
              <span>Consultation Fee</span>
              <span>{formatINR(originalFee)}</span>
            </div>
            {discountPaise > 0 && (
              <div className={`${styles.payRow} ${styles.payRowDiscount}`}>
                <span>
                  Discount
                  {appt.coupon_code ? ` (${appt.coupon_code})` : ""}
                </span>
                <span>− {formatINR(discountPaise)}</span>
              </div>
            )}
            <div className={`${styles.payRow} ${styles.payRowTotal}`}>
              <span>Amount Paid</span>
              <span>{formatINR(totalPaid)}</span>
            </div>
          </div>

          {payment && (
            <div className={styles.paymentIds}>
              {payment.gateway_payment_id && (
                <p className={styles.paymentIdRow}>
                  <span>Payment ID</span>
                  <code>{payment.gateway_payment_id}</code>
                </p>
              )}
              {payment.gateway_order_id && (
                <p className={styles.paymentIdRow}>
                  <span>Order ID</span>
                  <code>{payment.gateway_order_id}</code>
                </p>
              )}
              <p className={styles.paymentIdRow}>
                <span>Currency</span>
                <code>{payment.currency}</code>
              </p>
            </div>
          )}
        </div>

        <div className={styles.divider} />

        {/* Footer */}
        <div className={styles.receiptFooter}>
          <p className={styles.footerLine}>
            Thank you for choosing Brams Mind Care. This is your official payment receipt.
          </p>
          <p className={styles.footerLine}>
            For any queries, please contact{" "}
            <a href="mailto:info@bramsmindcare.com">info@bramsmindcare.com</a>
          </p>
          <p className={styles.footerSmall}>
            Brams Mind Care · Booking ID: {appt.id}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.detailRow}>
      <span className={styles.detailLabel}>{label}</span>
      <span className={styles.detailValue}>{value}</span>
    </div>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
}
