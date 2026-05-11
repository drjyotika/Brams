"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { PlanInfo } from "./index";
import styles from "./BookingFlow.module.scss";
import cStyles from "./StepConfirm.module.scss";

type Upload = {
  id: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
};

export function StepConfirm({
  plan,
  bookingId,
  scheduledDate,
  scheduledTime,
  patientName,
}: {
  plan: PlanInfo;
  bookingId: string;
  scheduledDate: string;
  scheduledTime: string;
  patientName: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploads, setUploads]     = useState<Upload[]>([]);
  const [uploading, setUploading] = useState(false);
  const [paying, setPaying]       = useState(false);
  const [paid, setPaid]           = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const consultationFee = plan.price_paise;
  const bookingFee      = 0;
  const total           = consultationFee + bookingFee;

  const dateLabel = new Date(scheduledDate).toLocaleDateString("en-IN", {
    weekday: "short",
    day:     "numeric",
    month:   "short",
    year:    "numeric",
  });
  const timeLabel = formatTime(scheduledTime);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch(`/api/bookings/${bookingId}/uploads`, {
          method: "POST",
          body:   form,
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Upload failed");
        }
        const data: Upload = await res.json();
        setUploads((u) => [...u, data]);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const pay = async () => {
    setPaying(true);
    setError(null);
    try {
      // Stub: real payment integration goes here. For now we mark it initiated.
      const res = await fetch(`/api/bookings/${bookingId}/payment`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ gateway: "manual", status: "initiated" }),
      });
      if (!res.ok) throw new Error("Failed to start payment");
      setPaid(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPaying(false);
    }
  };

  return (
    <div>
      <div className={styles.stepHeader}>
        <div>
          <span className={styles.stepEyebrow}>Step 3 of 3</span>
          <h1 className={styles.stepTitle}>Confirm Your Booking</h1>
          <p className={styles.stepSubtitle}>
            Review your details below. You can attach any reports or prior prescriptions
            (optional).
          </p>
        </div>
        <div className={styles.progress}>
          <span className={`${styles.progressDot} ${styles.progressDotActive}`} />
          <span className={`${styles.progressDot} ${styles.progressDotActive}`} />
          <span className={`${styles.progressDot} ${styles.progressDotActive}`} />
        </div>
      </div>

      <div className={styles.layout}>
        <div className={cStyles.confirmCard}>
          <div className={cStyles.headerRow}>
            <div>
              <p className={cStyles.brandLine}>Brams Mind Care</p>
              <p className={cStyles.subLine}>Professional Psychiatric Consultation</p>
            </div>
            <span className={cStyles.consultationBadge}>{plan.title}</span>
          </div>

          <div className={cStyles.detailGrid}>
            <div className={cStyles.detail}>
              <span className={cStyles.detailLabel}>For</span>
              <span className={cStyles.detailValue}>{patientName}</span>
            </div>
            <div className={cStyles.detail}>
              <span className={cStyles.detailLabel}>Date</span>
              <span className={cStyles.detailValue}>{dateLabel}</span>
            </div>
            <div className={cStyles.detail}>
              <span className={cStyles.detailLabel}>Time</span>
              <span className={cStyles.detailValue}>{timeLabel}</span>
            </div>
            <div className={cStyles.detail}>
              <span className={cStyles.detailLabel}>Mode</span>
              <span className={cStyles.detailValue}>Online Video Call</span>
            </div>
          </div>

          <div className={cStyles.uploadSection}>
            <h4>Upload reports (optional)</h4>
            <p className={cStyles.uploadHint}>
              PDF, JPG, or PNG &mdash; up to 10 MB each.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              multiple
              hidden
              onChange={(e) => handleUpload(e.target.files)}
            />
            <button
              type="button"
              className={cStyles.uploadBtn}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? "Uploading…" : "+ Choose Files"}
            </button>

            {uploads.length > 0 && (
              <ul className={cStyles.uploadList}>
                {uploads.map((u) => (
                  <li key={u.id}>
                    <a href={u.file_url} target="_blank" rel="noreferrer">{u.file_name}</a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={cStyles.secureBadge}>🔒 100% Secure & Confidential</div>
        </div>

        <div className={cStyles.payCard}>
          <h3 className={cStyles.payHeading}>Payment Summary</h3>

          <Row label="Consultation Fee" value={formatINR(consultationFee)} />
          {bookingFee > 0 && <Row label="Booking Fee" value={formatINR(bookingFee)} />}

          <div className={cStyles.divider} />

          <Row label="Total" value={formatINR(total)} strong />

          {error && <p className={cStyles.error}>{error}</p>}

          {paid ? (
            <div className={cStyles.successBox}>
              <h4>✓ Booking submitted</h4>
              <p>
                Your booking reference is{" "}
                <code>{bookingId.slice(0, 8)}</code>. We&rsquo;ll reach out shortly
                to confirm and share the video call link.
              </p>
              <Link href="/" className={cStyles.homeLink}>Return to home</Link>
            </div>
          ) : (
            <button
              type="button"
              className={cStyles.payBtn}
              onClick={pay}
              disabled={paying}
            >
              {paying ? "Processing…" : `Pay ${formatINR(total)} →`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={strong ? "row rowStrong" : "row"} style={{
      display: "flex",
      justifyContent: "space-between",
      padding: "8px 0",
      fontSize: strong ? 17 : 14,
      fontWeight: strong ? 700 : 400,
      fontFamily: strong ? "var(--font-display)" : undefined,
      color: strong ? "#1e1b24" : "#6b7280",
    }}>
      <span>{label}</span>
      <span style={{ color: strong ? "#745475" : "#1e1b24", fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function formatINR(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function formatTime(time24: string): string {
  if (!time24) return "—";
  const [h, m] = time24.split(":").map((s) => parseInt(s, 10));
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${String(m).padStart(2, "0")} ${ampm}`;
}
