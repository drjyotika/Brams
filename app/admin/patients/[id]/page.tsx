"use client";

import { useEffect, useState } from "react";
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

// ─── Pagination constants ─────────────────────────────────────────────────────

const APPT_PAGE_SIZE  = 10;
const APPT_PAGE_SIZES = [10, 20, 50];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [patient,       setPatient]       = useState<Patient | null>(null);
  const [appointments,  setAppointments]  = useState<Appointment[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [rxLoading,     setRxLoading]     = useState(true);

  // Appointment pagination
  const [apptPageSize, setApptPageSize] = useState(APPT_PAGE_SIZE);
  const [apptVisible,  setApptVisible]  = useState(APPT_PAGE_SIZE);

  // Image viewer modal (PDFs open in a new tab)
  const [viewing, setViewing] = useState<Prescription | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/patients/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setPatient(d.patient);
        setAppointments(d.appointments);
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/patients/${id}/uploads`)
      .then((r) => r.json())
      .then((d) => { setPrescriptions(Array.isArray(d) ? d : []); setRxLoading(false); });
  }, [id]);

  if (loading) return <BramsLoader />;
  if (!patient) return <p>Patient not found. <Link href="/admin/patients">← Back</Link></p>;

  // Appointment pagination
  const apptShown     = appointments.slice(0, apptVisible);
  const apptHasMore   = apptVisible < appointments.length;
  const apptRemaining = appointments.length - apptVisible;

  // Helper: open a file — PDFs go to a new tab, images open in the modal
  function openFile(rx: Prescription) {
    if (!rx.signed_url) return;
    const isPdf = (rx.mime_type === "application/pdf") ||
                  rx.file_name.toLowerCase().endsWith(".pdf");
    if (isPdf) {
      window.open(rx.signed_url, "_blank", "noopener,noreferrer");
    } else {
      setViewing(rx);
    }
  }

  return (
    <div>
      <div className={styles.pageHeader}>
        <Link href="/admin/patients" style={{ fontSize: 13, color: "#9b8fa0" }}>← All Patients</Link>
        <h1 className={styles.pageTitle} style={{ marginTop: 8 }}>{patient.full_name}</h1>
      </div>

      {/* ── Patient details ─────────────────────────────────────────────────── */}
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

      {/* ── Appointments ────────────────────────────────────────────────────── */}
      <div className={styles.panel} style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <h2 className={styles.panelTitle} style={{ margin: 0 }}>
            Appointments ({appointments.length})
          </h2>
          {appointments.length > APPT_PAGE_SIZE && (
            <select
              className={pStyles.pageSizeSelect}
              value={apptPageSize}
              onChange={(e) => { const n = Number(e.target.value); setApptPageSize(n); setApptVisible(n); }}
              aria-label="Appointments per page"
            >
              {APPT_PAGE_SIZES.map((n) => (
                <option key={n} value={n}>{n} per page</option>
              ))}
            </select>
          )}
        </div>

        {appointments.length === 0 ? (
          <p className={styles.panelHint}>No appointments yet.</p>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
              {apptShown.map((a) => {
                // Reports uploaded for this specific appointment
                const apptRx = rxLoading ? [] : prescriptions.filter((rx) => rx.appointment_id === a.id);

                return (
                  <div key={a.id} className={styles.cardArrayItem}>
                    {/* Header row */}
                    <div className={styles.cardArrayHead}>
                      <span>{a.plan_title}</span>
                      <span style={{ display: "flex", gap: 8 }}>
                        <StatusChip label={a.status}         tone={statusTone(a.status)} />
                        <StatusChip label={a.payment_status} tone={paymentTone(a.payment_status)} />
                      </span>
                    </div>

                    {/* Date / time / fee */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, fontSize: 13, color: "#6b7280" }}>
                      <KV k="Date"  v={new Date(a.scheduled_date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })} />
                      <KV k="Time"  v={a.scheduled_time.slice(0, 5)} />
                      <KV k="Total" v={`₹${(a.total_paise / 100).toLocaleString("en-IN")}`} />
                    </div>

                    {a.reason_for_consultation && (
                      <p style={{ marginTop: 10, fontSize: 13, color: "#6b7280" }}>
                        <strong style={{ color: "#1e1b24" }}>Reason: </strong>
                        {a.reason_for_consultation}
                      </p>
                    )}

                    {/* Reports for this appointment */}
                    {!rxLoading && apptRx.length > 0 && (
                      <div className={pStyles.apptReports}>
                        <div className={pStyles.apptReportsLabel}>
                          Reports / Prescriptions ({apptRx.length})
                        </div>
                        {apptRx.map((rx) => (
                          <div key={rx.id} className={pStyles.apptReportRow}>
                            <span className={pStyles.apptReportName} title={rx.file_name}>
                              {fileIcon(rx.mime_type)} {rx.file_name}
                              {rx.file_size && (
                                <span style={{ color: "#9b8fa0", marginLeft: 6, fontSize: 11 }}>
                                  {formatSize(rx.file_size)}
                                </span>
                              )}
                            </span>
                            <span className={pStyles.apptReportActions}>
                              <button
                                className={pStyles.rxViewBtn}
                                onClick={() => openFile(rx)}
                                disabled={!rx.signed_url}
                                title={(rx.mime_type === "application/pdf" || rx.file_name.toLowerCase().endsWith(".pdf"))
                                  ? "Opens in new tab"
                                  : "Preview"}
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
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Load more */}
            {apptHasMore && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
                <span className={pStyles.paginationCount}>
                  Showing <strong>{apptShown.length}</strong> of <strong>{appointments.length}</strong> appointments
                </span>
                <button
                  className={pStyles.loadMoreBtn}
                  onClick={() => setApptVisible((v) => Math.min(v + apptPageSize, appointments.length))}
                >
                  Load {Math.min(apptPageSize, apptRemaining)} more
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Image viewer modal (PDFs skip this and open in a new tab) */}
      {viewing && (
        <ImageModal prescription={viewing} onClose={() => setViewing(null)} />
      )}
    </div>
  );
}

// ─── Image preview modal (images only — PDFs open in new tab) ────────────────

function ImageModal({
  prescription: rx,
  onClose,
}: {
  prescription: Prescription;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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

  const isImage = rx.mime_type?.startsWith("image/");

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

        {/* Body */}
        <div className={pStyles.modalBody}>
          {isImage && rx.signed_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={rx.signed_url} alt={rx.file_name} className={pStyles.imagePreview} />
          ) : (
            <div className={pStyles.noPreview}>
              <div className={pStyles.noPreviewIcon}>📄</div>
              <strong>{rx.file_name}</strong>
              <p>Preview not available for this file type. Use the download button below.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={pStyles.modalFooter}>
          <button className={pStyles.modalCancelBtn} onClick={onClose}>Close</button>
          {rx.signed_url && (
            <a href={rx.signed_url} download={rx.file_name} className={pStyles.modalDownloadBtn}>
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
  if (mime === "application/pdf")                          return "📋";
  if (mime.startsWith("image/"))                           return "🖼️";
  if (mime.includes("word") || mime.includes("document"))  return "📝";
  if (mime.includes("sheet") || mime.includes("excel"))    return "📊";
  return "📄";
}

function formatSize(bytes: number): string {
  if (bytes < 1024)         return `${bytes} B`;
  if (bytes < 1024 * 1024)  return `${(bytes / 1024).toFixed(1)} KB`;
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
