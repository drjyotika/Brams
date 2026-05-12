"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createPortal } from "react-dom";
import styles  from "../../admin.module.scss";
import pStyles from "../patients.module.scss";
import { BramsLoader } from "../../../../components/BramsLoader";

// ─── Types ────────────────────────────────────────────────────────────────────

type Patient = {
  id: string;
  full_name: string;
  age: number | null;
  gender: string | null;
  phone: string;
  email: string | null;
  city: string | null;
  created_at: string;
};

type Appointment = {
  id: string;
  plan_id: string;
  plan_title: string;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  mode: string;
  reason_for_consultation: string | null;
  consultation_fee_paise: number;
  total_paise: number;
  status: string;
  payment_status: string;
  meeting_link: string | null;
  admin_notes: string | null;
  created_at: string;
};

type Prescription = {
  id: string;
  appointment_id: string;
  file_name: string;
  file_url: string;
  signed_url: string | null;
  file_size: number | null;
  mime_type: string | null;
  uploaded_at: string;
  appointment_date: string;
  appointment_time: string;
  plan_title: string;
};

const RX_PAGE_SIZE = 5;
const RX_PAGE_SIZES = [5, 10, 20, 50];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [patient,       setPatient]       = useState<Patient | null>(null);
  const [appointments,  setAppointments]  = useState<Appointment[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [rxLoading,     setRxLoading]     = useState(true);

  // Prescription pagination
  const [rxPageSize, setRxPageSize] = useState(RX_PAGE_SIZE);
  const [rxVisible,  setRxVisible]  = useState(RX_PAGE_SIZE);

  // Viewer modal
  const [viewing, setViewing] = useState<Prescription | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/patients/${id}`)
      .then((r) => r.json())
      .then((d) => { setPatient(d.patient); setAppointments(d.appointments); setLoading(false); });
  }, [id]);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/patients/${id}/uploads`)
      .then((r) => r.json())
      .then((d) => { setPrescriptions(Array.isArray(d) ? d : []); setRxLoading(false); });
  }, [id]);

  if (loading) return <BramsLoader />;
  if (!patient) return <p>Patient not found. <Link href="/admin/patients">← Back</Link></p>;

  const rxShown     = prescriptions.slice(0, rxVisible);
  const rxHasMore   = rxVisible < prescriptions.length;
  const rxRemaining = prescriptions.length - rxVisible;

  function handleRxPageSize(n: number) {
    setRxPageSize(n);
    setRxVisible(n);
  }

  return (
    <div>
      <div className={styles.pageHeader}>
        <Link href="/admin/patients" style={{ fontSize: 13, color: "#9b8fa0" }}>← All Patients</Link>
        <h1 className={styles.pageTitle} style={{ marginTop: 8 }}>{patient.full_name}</h1>
      </div>

      {/* Patient details */}
      <div className={styles.panel} style={{ marginBottom: 24 }}>
        <h2 className={styles.panelTitle}>Patient Details</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 12 }}>
          <KV k="Phone"  v={patient.phone} />
          <KV k="Email"  v={patient.email ?? "—"} />
          <KV k="Age"    v={patient.age?.toString() ?? "—"} />
          <KV k="Gender" v={patient.gender ?? "—"} />
          <KV k="City"   v={patient.city ?? "—"} />
          <KV k="Joined" v={new Date(patient.created_at).toLocaleDateString("en-IN")} />
        </div>
      </div>

      {/* Appointments */}
      <div className={styles.panel} style={{ marginBottom: 24 }}>
        <h2 className={styles.panelTitle}>Appointments ({appointments.length})</h2>
        {appointments.length === 0 ? (
          <p className={styles.panelHint}>No appointments yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
            {appointments.map((a) => (
              <div key={a.id} className={styles.cardArrayItem}>
                <div className={styles.cardArrayHead}>
                  <span>{a.plan_title}</span>
                  <span style={{ display: "flex", gap: 8 }}>
                    <StatusChip label={a.status}         tone={statusTone(a.status)} />
                    <StatusChip label={a.payment_status} tone={paymentTone(a.payment_status)} />
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, fontSize: 13, color: "#6b7280" }}>
                  <KV k="Date"  v={new Date(a.scheduled_date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })} />
                  <KV k="Time"  v={a.scheduled_time.slice(0, 5)} />
                  <KV k="Total" v={`₹${(a.total_paise / 100).toLocaleString("en-IN")}`} />
                </div>
                {a.reason_for_consultation && (
                  <p style={{ marginTop: 12, fontSize: 13, color: "#6b7280" }}>
                    <strong style={{ color: "#1e1b24" }}>Reason: </strong>
                    {a.reason_for_consultation}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Prescriptions / uploads */}
      <div className={styles.panel}>
        <h2 className={styles.panelTitle}>
          Prescriptions &amp; Reports
          {!rxLoading && prescriptions.length > 0 && (
            <span style={{ fontSize: 14, fontWeight: 400, color: "#9b8fa0", marginLeft: 8 }}>
              ({prescriptions.length} file{prescriptions.length !== 1 ? "s" : ""})
            </span>
          )}
        </h2>

        {rxLoading ? (
          <BramsLoader />
        ) : prescriptions.length === 0 ? (
          <p className={styles.panelHint} style={{ marginTop: 12 }}>
            No files uploaded yet.
          </p>
        ) : (
          <div className={pStyles.rxSection}>
            <table className={pStyles.rxTable}>
              <thead>
                <tr>
                  <th>File</th>
                  <th>Appointment</th>
                  <th>Uploaded</th>
                  <th>Size</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rxShown.map((rx) => (
                  <tr key={rx.id}>
                    <td>
                      <div className={pStyles.rxFileName} title={rx.file_name}>
                        {fileIcon(rx.mime_type)} {rx.file_name}
                      </div>
                    </td>
                    <td style={{ fontSize: 12 }}>
                      <div style={{ fontWeight: 600, color: "#1e1b24" }}>{rx.plan_title}</div>
                      <div style={{ color: "#9b8fa0" }}>
                        {new Date(rx.appointment_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        {" · "}{rx.appointment_time.slice(0, 5)}
                      </div>
                    </td>
                    <td style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                      {new Date(rx.uploaded_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                      {rx.file_size ? formatSize(rx.file_size) : "—"}
                    </td>
                    <td>
                      <div className={pStyles.rxActions}>
                        <button
                          className={pStyles.rxViewBtn}
                          onClick={() => setViewing(rx)}
                          disabled={!rx.signed_url}
                        >
                          View
                        </button>
                        {rx.signed_url && (
                          <a
                            href={rx.signed_url}
                            download={rx.file_name}
                            className={pStyles.rxDownloadBtn}
                          >
                            ↓ Download
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination bar */}
            <div className={pStyles.paginationBar}>
              <span className={pStyles.paginationCount}>
                Showing <strong>{rxShown.length}</strong> of <strong>{prescriptions.length}</strong> files
              </span>
              <div className={pStyles.paginationRight}>
                <select
                  className={pStyles.pageSizeSelect}
                  value={rxPageSize}
                  onChange={(e) => handleRxPageSize(Number(e.target.value))}
                  aria-label="Files per page"
                >
                  {RX_PAGE_SIZES.map((n) => (
                    <option key={n} value={n}>{n} per page</option>
                  ))}
                </select>
                {rxHasMore && (
                  <button
                    className={pStyles.loadMoreBtn}
                    onClick={() => setRxVisible((v) => Math.min(v + rxPageSize, prescriptions.length))}
                  >
                    Load {Math.min(rxPageSize, rxRemaining)} more
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Prescription viewer modal */}
      {viewing && (
        <PrescriptionModal
          prescription={viewing}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
}

// ─── Prescription viewer modal ────────────────────────────────────────────────

function PrescriptionModal({
  prescription: rx,
  onClose,
}: {
  prescription: Prescription;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Body scroll lock + Esc to close
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  if (!mounted) return null;

  const mime = rx.mime_type ?? "";
  const isPdf   = mime === "application/pdf" || rx.file_name.toLowerCase().endsWith(".pdf");
  const isImage = mime.startsWith("image/");

  return createPortal(
    <div
      className={pStyles.overlay}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={`Viewing ${rx.file_name}`}
    >
      <div className={pStyles.modal}>
        {/* Header */}
        <div className={pStyles.modalHeader}>
          <div style={{ minWidth: 0 }}>
            <h2 className={pStyles.modalTitle}>{rx.file_name}</h2>
            <p className={pStyles.modalMeta}>
              {rx.plan_title} · {new Date(rx.appointment_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              {rx.file_size && ` · ${formatSize(rx.file_size)}`}
            </p>
          </div>
          <button className={pStyles.modalClose} onClick={onClose} aria-label="Close">×</button>
        </div>

        {/* Body — preview */}
        <div className={pStyles.modalBody}>
          {isPdf && rx.signed_url ? (
            <iframe
              src={rx.signed_url}
              className={pStyles.pdfFrame}
              title={rx.file_name}
            />
          ) : isImage && rx.signed_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={rx.signed_url}
              alt={rx.file_name}
              className={pStyles.imagePreview}
            />
          ) : (
            <div className={pStyles.noPreview}>
              <div className={pStyles.noPreviewIcon}>📄</div>
              <strong>{rx.file_name}</strong>
              <p>Preview not available for this file type.<br />Use the download button below.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={pStyles.modalFooter}>
          <button className={pStyles.modalCancelBtn} onClick={onClose}>Close</button>
          {rx.signed_url && (
            <a
              href={rx.signed_url}
              download={rx.file_name}
              className={pStyles.modalDownloadBtn}
            >
              ↓ Download
            </a>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fileIcon(mime: string | null): string {
  if (!mime) return "📄";
  if (mime === "application/pdf")              return "📋";
  if (mime.startsWith("image/"))              return "🖼️";
  if (mime.includes("word") || mime.includes("document")) return "📝";
  if (mime.includes("sheet") || mime.includes("excel"))   return "📊";
  return "📄";
}

function formatSize(bytes: number): string {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#9b8fa0", letterSpacing: 0.5, textTransform: "uppercase" }}>{k}</div>
      <div style={{ fontSize: 14, color: "#1e1b24", fontWeight: 500 }}>{v}</div>
    </div>
  );
}

function StatusChip({ label, tone }: { label: string; tone: "ok" | "warn" | "err" | "neutral" }) {
  const colors: Record<typeof tone, { bg: string; fg: string }> = {
    ok:      { bg: "#dcfce7", fg: "#166534" },
    warn:    { bg: "#fef3c7", fg: "#92400e" },
    err:     { bg: "#fee2e2", fg: "#991b1b" },
    neutral: { bg: "#f3f4f6", fg: "#374151" },
  };
  const c = colors[tone];
  return (
    <span style={{
      background: c.bg, color: c.fg, padding: "3px 10px",
      borderRadius: 999, fontSize: 11, fontWeight: 700,
      textTransform: "capitalize", letterSpacing: 0.3,
    }}>{label.replace(/_/g, " ")}</span>
  );
}

function statusTone(s: string): "ok" | "warn" | "err" | "neutral" {
  if (s === "confirmed" || s === "completed") return "ok";
  if (s === "cancelled" || s === "no_show")   return "err";
  return "warn";
}

function paymentTone(s: string): "ok" | "warn" | "err" | "neutral" {
  if (s === "paid")     return "ok";
  if (s === "refunded") return "neutral";
  if (s === "failed")   return "err";
  return "warn";
}
