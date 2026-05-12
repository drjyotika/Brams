"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles  from "../users/users.module.scss";
import pStyles from "../patients/patients.module.scss";
import { BramsLoader } from "../../../components/BramsLoader";

type Upload = {
  id: string;
  file_name: string;
  file_url: string;
  signed_url: string | null;
  file_size: number | null;
  mime_type: string | null;
};

type Appointment = {
  id: string;
  plan_title: string;
  scheduled_date: string;
  scheduled_time: string;
  total_paise: number;
  status: string;
  payment_status: string;
  upload_count: number;
  patient: {
    id: string;
    full_name: string;
    phone: string;
  };
  uploads?: Upload[];
};

export default function AppointmentsPage() {
  const [rows,    setRows]    = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  // Track which appointment rows have their uploads expanded
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  // Cache fetched uploads per appointment id
  const [uploadMap, setUploadMap] = useState<Record<string, Upload[]>>({});
  const [loadingUploads, setLoadingUploads] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/appointments")
      .then((r) => r.json())
      .then((d) => { setRows(d); setLoading(false); });
  }, []);

  async function toggleReports(appointmentId: string) {
    if (expanded.has(appointmentId)) {
      setExpanded((prev) => { const s = new Set(prev); s.delete(appointmentId); return s; });
      return;
    }
    // Expand and fetch uploads if not cached
    setExpanded((prev) => new Set(prev).add(appointmentId));
    if (uploadMap[appointmentId]) return; // already fetched

    setLoadingUploads((prev) => new Set(prev).add(appointmentId));
    try {
      const res  = await fetch(`/api/bookings/${appointmentId}/uploads`);
      const data = await res.json();
      setUploadMap((prev) => ({ ...prev, [appointmentId]: Array.isArray(data) ? data : [] }));
    } finally {
      setLoadingUploads((prev) => { const s = new Set(prev); s.delete(appointmentId); return s; });
    }
  }

  function openFile(u: Upload) {
    if (!u.signed_url) return;
    const isPdf = u.mime_type === "application/pdf" || u.file_name.toLowerCase().endsWith(".pdf");
    if (isPdf) {
      window.open(u.signed_url, "_blank", "noopener,noreferrer");
    } else {
      window.open(u.signed_url, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Appointments</h1>
      </div>

      {loading ? (
        <BramsLoader />
      ) : (
        <div className={styles.card}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Patient</th>
                <th>Phone</th>
                <th>Plan</th>
                <th>Date</th>
                <th>Time</th>
                <th>Total</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Reports</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={9} className={styles.empty}>No appointments yet.</td></tr>
              )}
              {rows.map((a) => (
                <>
                  <tr key={a.id}>
                    <td className={styles.username}>
                      <Link href={`/admin/patients/${a.patient.id}`}>{a.patient.full_name}</Link>
                    </td>
                    <td>{a.patient.phone}</td>
                    <td>{a.plan_title}</td>
                    <td>{new Date(a.scheduled_date).toLocaleDateString("en-IN")}</td>
                    <td>{a.scheduled_time.slice(0, 5)}</td>
                    <td>₹{(a.total_paise / 100).toLocaleString("en-IN")}</td>
                    <td><Chip s={a.status} /></td>
                    <td><Chip s={a.payment_status} /></td>
                    <td>
                      {a.upload_count > 0 && (
                        <button
                          className={styles.editBtn}
                          onClick={() => toggleReports(a.id)}
                          style={{ whiteSpace: "nowrap" }}
                        >
                          {expanded.has(a.id) ? "Hide" : "Reports"}
                        </button>
                      )}
                    </td>
                  </tr>

                  {/* Inline expanded reports row */}
                  {expanded.has(a.id) && (
                    <tr key={`${a.id}-uploads`}>
                      <td colSpan={9} style={{ padding: 0, background: "#faf9fb" }}>
                        <div style={{ padding: "12px 16px" }}>
                          {loadingUploads.has(a.id) ? (
                            <span style={{ fontSize: 13, color: "#9b8fa0" }}>Loading reports…</span>
                          ) : !uploadMap[a.id] || uploadMap[a.id].length === 0 ? (
                            <span style={{ fontSize: 13, color: "#9b8fa0" }}>No reports uploaded for this appointment.</span>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              {uploadMap[a.id].map((u) => (
                                <div key={u.id} className={pStyles.apptReportRow}>
                                  <span className={pStyles.apptReportName} title={u.file_name}>
                                    {fileIcon(u.mime_type)} {u.file_name}
                                    {u.file_size && (
                                      <span style={{ color: "#9b8fa0", marginLeft: 6, fontSize: 11 }}>
                                        {formatSize(u.file_size)}
                                      </span>
                                    )}
                                  </span>
                                  <span className={pStyles.apptReportActions}>
                                    <button
                                      className={pStyles.rxViewBtn}
                                      onClick={() => openFile(u)}
                                      disabled={!u.signed_url}
                                    >
                                      View
                                    </button>
                                    {u.signed_url && (
                                      <a
                                        href={u.signed_url}
                                        download={u.file_name}
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
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fileIcon(mime: string | null): string {
  if (!mime) return "📄";
  if (mime === "application/pdf")                         return "📋";
  if (mime.startsWith("image/"))                          return "🖼️";
  if (mime.includes("word") || mime.includes("document")) return "📝";
  if (mime.includes("sheet") || mime.includes("excel"))   return "📊";
  return "📄";
}

function formatSize(bytes: number): string {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function Chip({ s }: { s: string }) {
  const tones: Record<string, { bg: string; fg: string }> = {
    pending:   { bg: "#fef3c7", fg: "#92400e" },
    confirmed: { bg: "#dcfce7", fg: "#166534" },
    completed: { bg: "#dcfce7", fg: "#166534" },
    cancelled: { bg: "#fee2e2", fg: "#991b1b" },
    no_show:   { bg: "#fee2e2", fg: "#991b1b" },
    unpaid:    { bg: "#fef3c7", fg: "#92400e" },
    paid:      { bg: "#dcfce7", fg: "#166534" },
    refunded:  { bg: "#f3f4f6", fg: "#374151" },
    failed:    { bg: "#fee2e2", fg: "#991b1b" },
  };
  const c = tones[s] ?? { bg: "#f3f4f6", fg: "#374151" };
  return (
    <span style={{
      background: c.bg, color: c.fg, padding: "3px 10px",
      borderRadius: 999, fontSize: 11, fontWeight: 700,
      textTransform: "capitalize", letterSpacing: 0.3,
    }}>{s.replace(/_/g, " ")}</span>
  );
}
