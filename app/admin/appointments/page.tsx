"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
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
  meeting_link: string | null;
  upload_count: number;
  created_at: string;
  patient: {
    id: string;
    full_name: string;
    phone: string;
  };
  uploads?: Upload[];
};

type SortKey =
  | "date_desc" | "date_asc"
  | "created_desc" | "created_asc"
  | "patient_asc" | "patient_desc"
  | "status" | "payment";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "date_desc",    label: "Appt date (newest first)"   },
  { value: "date_asc",     label: "Appt date (oldest first)"   },
  { value: "created_desc", label: "Booking (recent first)"     },
  { value: "created_asc",  label: "Booking (oldest first)"     },
  { value: "patient_asc",  label: "Patient A → Z"              },
  { value: "patient_desc", label: "Patient Z → A"              },
  { value: "status",       label: "Status"                     },
  { value: "payment",      label: "Payment status"             },
];

function fmtDate(iso: string) {
  // Accept either "YYYY-MM-DD" or a full ISO timestamp; always parse as local midnight.
  const datePart = iso.slice(0, 10);
  return new Date(datePart + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
}

function sortAppointments(list: Appointment[], key: SortKey): Appointment[] {
  const a = [...list];
  switch (key) {
    case "date_desc":
      return a.sort((x, y) =>
        y.scheduled_date.localeCompare(x.scheduled_date) ||
        y.scheduled_time.localeCompare(x.scheduled_time));
    case "date_asc":
      return a.sort((x, y) =>
        x.scheduled_date.localeCompare(y.scheduled_date) ||
        x.scheduled_time.localeCompare(y.scheduled_time));
    case "created_desc":
      return a.sort((x, y) => y.created_at.localeCompare(x.created_at));
    case "created_asc":
      return a.sort((x, y) => x.created_at.localeCompare(y.created_at));
    case "patient_asc":
      return a.sort((x, y) => x.patient.full_name.localeCompare(y.patient.full_name));
    case "patient_desc":
      return a.sort((x, y) => y.patient.full_name.localeCompare(x.patient.full_name));
    case "status":
      return a.sort((x, y) => x.status.localeCompare(y.status));
    case "payment":
      return a.sort((x, y) => x.payment_status.localeCompare(y.payment_status));
    default:
      return a;
  }
}

export default function AppointmentsPage() {
  const [rows,    setRows]    = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("date_desc");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [uploadMap, setUploadMap] = useState<Record<string, Upload[]>>({});
  const [loadingUploads, setLoadingUploads] = useState<Set<string>>(new Set());

  // Video link inline editing
  const [linkEdit,   setLinkEdit]   = useState<Record<string, string>>({});
  const [linkSaving, setLinkSaving] = useState<Set<string>>(new Set());
  const [meetGenerating, setMeetGenerating] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/appointments")
      .then((r) => r.json())
      .then((d) => { setRows(d); setLoading(false); });
  }, []);

  const sorted = useMemo(() => sortAppointments(rows, sortKey), [rows, sortKey]);

  async function toggleReports(appointmentId: string) {
    if (expanded.has(appointmentId)) {
      setExpanded((prev) => { const s = new Set(prev); s.delete(appointmentId); return s; });
      return;
    }
    setExpanded((prev) => new Set(prev).add(appointmentId));
    if (uploadMap[appointmentId]) return;

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
    window.open(u.signed_url, "_blank", "noopener,noreferrer");
  }

  function openLinkEdit(apptId: string, current: string | null) {
    setLinkEdit((prev) => ({ ...prev, [apptId]: current ?? "" }));
  }

  function cancelLinkEdit(apptId: string) {
    setLinkEdit((prev) => { const n = { ...prev }; delete n[apptId]; return n; });
  }

  async function generateMeet(apptId: string) {
    setMeetGenerating((prev) => new Set(prev).add(apptId));
    try {
      const res  = await fetch(`/api/admin/appointments/${apptId}/generate-meet`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setRows((prev) =>
        prev.map((r) => r.id === apptId ? { ...r, meeting_link: data.meeting_link } : r)
      );
    } catch (err: unknown) {
      alert((err instanceof Error ? err.message : "Could not generate Meet link. Is GOOGLE_REFRESH_TOKEN set?"));
    } finally {
      setMeetGenerating((prev) => { const s = new Set(prev); s.delete(apptId); return s; });
    }
  }

  async function saveMeetingLink(apptId: string) {
    const url = (linkEdit[apptId] ?? "").trim();
    setLinkSaving((prev) => new Set(prev).add(apptId));
    try {
      const res = await fetch(`/api/bookings/${apptId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meeting_link: url || null }),
      });
      if (!res.ok) throw new Error("Failed");
      setRows((prev) =>
        prev.map((r) => r.id === apptId ? { ...r, meeting_link: url || null } : r)
      );
      cancelLinkEdit(apptId);
    } catch {
      alert("Could not save meeting link. Please try again.");
    } finally {
      setLinkSaving((prev) => { const s = new Set(prev); s.delete(apptId); return s; });
    }
  }

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Appointments</h1>
        {rows.length > 0 && (
          <select
            className={pStyles.pageSizeSelect}
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            aria-label="Sort by"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        )}
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
                <th>Video Link</th>
                <th>Reports</th>
                <th>Receipt</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <tr><td colSpan={11} className={styles.empty}>No appointments yet.</td></tr>
              )}
              {sorted.map((a) => (
                <Fragment key={a.id}>
                  <tr>
                    <td className={styles.username}>
                      <Link href={`/admin/patients/${a.patient.id}`}>{a.patient.full_name}</Link>
                    </td>
                    <td>{a.patient.phone}</td>
                    <td>{a.plan_title}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{fmtDate(a.scheduled_date)}</td>
                    <td>{a.scheduled_time.slice(0, 5)}</td>
                    <td>₹{(a.total_paise / 100).toLocaleString("en-IN")}</td>
                    <td><Chip s={a.status} /></td>
                    <td><Chip s={a.payment_status} /></td>
                    <td style={{ minWidth: 140 }}>
                      {a.id in linkEdit ? (
                        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                          <input
                            type="url"
                            value={linkEdit[a.id]}
                            onChange={(e) =>
                              setLinkEdit((prev) => ({ ...prev, [a.id]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveMeetingLink(a.id);
                              if (e.key === "Escape") cancelLinkEdit(a.id);
                            }}
                            placeholder="https://meet.google.com/…"
                            autoFocus
                            style={{
                              width: 220, fontSize: 11, padding: "3px 6px",
                              border: "1px solid #ccc", borderRadius: 4,
                            }}
                          />
                          <button
                            className={styles.editBtn}
                            onClick={() => saveMeetingLink(a.id)}
                            disabled={linkSaving.has(a.id)}
                            style={{ whiteSpace: "nowrap" }}
                          >
                            {linkSaving.has(a.id) ? "…" : "Save"}
                          </button>
                          <button
                            className={styles.editBtn}
                            onClick={() => cancelLinkEdit(a.id)}
                            style={{ whiteSpace: "nowrap" }}
                          >
                            ✕
                          </button>
                        </div>
                      ) : a.meeting_link ? (
                        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                          <a
                            href={a.meeting_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: 11, color: "#166534", fontWeight: 600 }}
                            title={a.meeting_link}
                          >
                            ✅ Join
                          </a>
                          <button
                            className={styles.editBtn}
                            onClick={() => openLinkEdit(a.id, a.meeting_link)}
                            style={{ whiteSpace: "nowrap" }}
                          >
                            Edit
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          <button
                            className={styles.editBtn}
                            onClick={() => generateMeet(a.id)}
                            disabled={meetGenerating.has(a.id)}
                            style={{ whiteSpace: "nowrap", background: "#4285f4", color: "#fff", border: "none" }}
                          >
                            {meetGenerating.has(a.id) ? "Creating…" : "🎥 Generate Meet"}
                          </button>
                          <button
                            className={styles.editBtn}
                            onClick={() => openLinkEdit(a.id, null)}
                            style={{ whiteSpace: "nowrap" }}
                          >
                            Paste link
                          </button>
                        </div>
                      )}
                    </td>
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
                    <td>
                      <a
                        href={`/receipt/${a.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.editBtn}
                        style={{ whiteSpace: "nowrap" }}
                      >
                        🧾 View
                      </a>
                    </td>
                  </tr>

                  {expanded.has(a.id) && (
                    <tr key={`${a.id}-uploads`}>
                      <td colSpan={11} style={{ padding: 0, background: "#faf9fb" }}>
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
                </Fragment>
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
