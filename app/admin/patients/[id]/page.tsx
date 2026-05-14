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
  notes: string | null;
  created_at: string;
  email_verified:    boolean | null;
  email_verified_at: string | null;
  is_suspended:      boolean | null;
  suspended_at:      string | null;
  suspension_reason: string | null;
  last_login_at:     string | null;
  password_hash:     string | null;
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
  const [loadError,     setLoadError]     = useState("");
  const [rxLoading,     setRxLoading]     = useState(true);

  // Appointment pagination
  const [apptPageSize, setApptPageSize] = useState(APPT_PAGE_SIZE);
  const [apptVisible,  setApptVisible]  = useState(APPT_PAGE_SIZE);

  // Image viewer modal (PDFs open in a new tab)
  const [viewing, setViewing] = useState<Prescription | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/patients/${id}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? `HTTP ${r.status}`);
        setPatient(d.patient);
        setAppointments(d.appointments ?? []);
        setLoading(false);
      })
      .catch((e) => { setLoadError((e as Error).message); setLoading(false); });
  }, [id]);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/patients/${id}/uploads`)
      .then((r) => r.json())
      .then((d) => { setPrescriptions(Array.isArray(d) ? d : []); setRxLoading(false); });
  }, [id]);

  if (loading) return <BramsLoader />;
  if (loadError) return (
    <div>
      <Link href="/admin/patients" style={{ fontSize: 13, color: "#9b8fa0" }}>← All Patients</Link>
      <p style={{ marginTop: 16, color: "#dc2626" }}>Failed to load patient: {loadError}</p>
    </div>
  );
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
      <PatientDetailsPanel patient={patient} onUpdated={setPatient} />

      {/* ── Account management ─────────────────────────────────────────────── */}
      <AccountManagementPanel patient={patient} onUpdated={setPatient} />

      {/* ── Merge patient ───────────────────────────────────────────────────── */}
      <MergePatientPanel primaryId={id} primaryName={patient.full_name} />

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

// ─── Patient details panel — view + inline edit ───────────────────────────────

function PatientDetailsPanel({
  patient,
  onUpdated,
}: {
  patient: Patient;
  onUpdated: (p: Patient) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState("");
  const [form,    setForm]    = useState({
    full_name: patient.full_name,
    age:       patient.age?.toString() ?? "",
    gender:    patient.gender ?? "",
    phone:     patient.phone,
    email:     patient.email ?? "",
    city:      patient.city ?? "",
    notes:     patient.notes ?? "",
  });

  function reset() {
    setForm({
      full_name: patient.full_name,
      age:       patient.age?.toString() ?? "",
      gender:    patient.gender ?? "",
      phone:     patient.phone,
      email:     patient.email ?? "",
      city:      patient.city ?? "",
      notes:     patient.notes ?? "",
    });
    setErr("");
    setEditing(false);
  }

  async function save() {
    setSaving(true);
    setErr("");
    try {
      const res = await fetch(`/api/patients/${patient.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          full_name: form.full_name.trim(),
          age:       form.age ? parseInt(form.age, 10) : null,
          gender:    form.gender || null,
          phone:     form.phone.trim(),
          email:     form.email.trim() || null,
          city:      form.city || null,
          notes:     form.notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? `HTTP ${res.status}`);
      } else {
        onUpdated(data.patient);
        setEditing(false);
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.panel} style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <h2 className={styles.panelTitle} style={{ margin: 0 }}>Patient Details</h2>
        {!editing ? (
          <button className={styles.secondary} onClick={() => setEditing(true)}>Edit</button>
        ) : (
          <span style={{ display: "flex", gap: 8 }}>
            <button className={styles.secondary} onClick={reset} disabled={saving}>Cancel</button>
            <button className={styles.primary}   onClick={save}  disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </span>
        )}
      </div>

      {err && <p style={{ color: "#dc2626", fontSize: 13, marginTop: 8 }}>{err}</p>}

      {!editing ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 12 }}>
          <KV k="Phone"  v={patient.phone} />
          <KV k="Email"  v={patient.email ?? "—"} />
          <KV k="Age"    v={patient.age?.toString() ?? "—"} />
          <KV k="Gender" v={patient.gender ?? "—"} />
          <KV k="City"   v={patient.city ?? "—"} />
          <KV k="Joined" v={new Date(patient.created_at).toLocaleDateString("en-IN")} />
          {patient.notes && <div style={{ gridColumn: "1 / -1" }}><KV k="Notes" v={patient.notes} /></div>}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
          <Field label="Full name"><input className={styles.input} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
          <Field label="Phone"><input className={styles.input} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Email"><input className={styles.input} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Age"><input className={styles.input} type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} /></Field>
          <Field label="Gender">
            <select className={styles.select} value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
              <option value="">—</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer-not-to-say">Prefer not to say</option>
            </select>
          </Field>
          <Field label="City"><input className={styles.input} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
          <div style={{ gridColumn: "1 / -1" }}>
            <Field label="Internal notes">
              <textarea
                className={styles.textarea}
                rows={3}
                value={form.notes}
                placeholder="Admin notes — not visible to the patient"
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Field>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: "#9b8fa0", letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</span>
      {children}
    </label>
  );
}

// ─── Account management panel — suspend / verify / password / delete ─────────

function AccountManagementPanel({
  patient,
  onUpdated,
}: {
  patient: Patient;
  onUpdated: (p: Patient) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [msg,  setMsg]  = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [newPwd, setNewPwd] = useState("");

  const suspended = !!patient.is_suspended;
  const verified  = !!patient.email_verified;
  const hasPwd    = !!patient.password_hash;

  async function doAction(action: string, payload: Record<string, unknown> = {}, prompt?: string) {
    if (prompt && !window.confirm(prompt)) return;
    setBusy(action);
    setMsg(null);
    try {
      const res = await fetch(`/api/patients/${patient.id}/actions`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ kind: "err", text: data.error ?? `HTTP ${res.status}` });
      } else {
        setMsg({ kind: "ok", text: "Done." });
        // Re-fetch the patient so the UI reflects the new flags
        const r = await fetch(`/api/patients/${patient.id}`);
        if (r.ok) {
          const next = await r.json();
          onUpdated(next.patient);
        }
        if (action === "reset_password") setNewPwd("");
      }
    } catch (e) {
      setMsg({ kind: "err", text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  async function deletePatient() {
    if (!window.confirm("Delete this patient permanently? This cannot be undone.")) return;
    setBusy("delete");
    setMsg(null);
    try {
      const res = await fetch(`/api/patients/${patient.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ kind: "err", text: data.error ?? `HTTP ${res.status}` });
      } else {
        window.location.href = "/admin/patients";
      }
    } catch (e) {
      setMsg({ kind: "err", text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  function suspend() {
    const reason = window.prompt("Reason for suspension (optional):") ?? "";
    void doAction("suspend", { reason: reason || null });
  }

  return (
    <div className={styles.panel} style={{ marginBottom: 24 }}>
      <h2 className={styles.panelTitle}>Account Management</h2>

      {/* Status row */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12, marginBottom: 16 }}>
        <Chip label={hasPwd ? "Registered" : "Guest (no account)"} tone={hasPwd ? "ok" : "neutral"} />
        {hasPwd && <Chip label={verified ? "Email verified" : "Email unverified"} tone={verified ? "ok" : "warn"} />}
        {suspended && <Chip label="Suspended" tone="err" />}
        {patient.last_login_at && (
          <span style={{ fontSize: 11, color: "#9b8fa0", alignSelf: "center" }}>
            Last login: {new Date(patient.last_login_at).toLocaleString("en-IN")}
          </span>
        )}
      </div>

      {suspended && patient.suspension_reason && (
        <p style={{ marginTop: 0, padding: "8px 12px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, fontSize: 12, color: "#991b1b" }}>
          <strong>Suspension reason:</strong> {patient.suspension_reason}
        </p>
      )}

      {/* Action buttons */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10, marginTop: 12 }}>
        {suspended ? (
          <button className={styles.secondary} disabled={busy === "unsuspend"} onClick={() => doAction("unsuspend")}>
            {busy === "unsuspend" ? "Unsuspending…" : "Unsuspend account"}
          </button>
        ) : (
          <button className={styles.danger} disabled={!hasPwd || busy === "suspend"} onClick={suspend}>
            {busy === "suspend" ? "Suspending…" : "Suspend account"}
          </button>
        )}

        {hasPwd && !verified && (
          <>
            <button
              className={styles.secondary}
              disabled={busy === "send_verification"}
              onClick={() => doAction("send_verification")}
            >
              {busy === "send_verification" ? "Sending…" : "Resend verification email"}
            </button>
            <button
              className={styles.secondary}
              disabled={busy === "mark_email_verified"}
              onClick={() => doAction("mark_email_verified", {}, "Manually mark this patient's email as verified?")}
            >
              {busy === "mark_email_verified" ? "Marking…" : "Mark email verified"}
            </button>
          </>
        )}

        {hasPwd && (
          <button
            className={styles.secondary}
            disabled={busy === "clear_password"}
            onClick={() => doAction("clear_password", {}, "Clear this patient's password? They'll need to register again to log in.")}
          >
            {busy === "clear_password" ? "Clearing…" : "Clear password"}
          </button>
        )}

        <button className={styles.danger} disabled={busy === "delete"} onClick={deletePatient}>
          {busy === "delete" ? "Deleting…" : "Delete patient"}
        </button>
      </div>

      {/* Reset password */}
      {hasPwd && (
        <div style={{ marginTop: 18, padding: 14, background: "#faf9fb", border: "1px solid rgba(207,195,204,.3)", borderRadius: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#1e1b24", marginBottom: 8 }}>Reset password</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              className={styles.input}
              placeholder="New password (min 6 chars)"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              style={{ flex: 1 }}
            />
            <button
              className={styles.primary}
              disabled={newPwd.length < 6 || busy === "reset_password"}
              onClick={() => doAction("reset_password", { password: newPwd }, "Set a new password for this patient?")}
            >
              {busy === "reset_password" ? "Saving…" : "Set password"}
            </button>
          </div>
          <p style={{ fontSize: 11, color: "#9b8fa0", marginTop: 6, marginBottom: 0 }}>
            Share the new password with the patient securely. They can change it after logging in.
          </p>
        </div>
      )}

      {msg && (
        <p style={{
          marginTop: 14, padding: "8px 12px", borderRadius: 8, fontSize: 12,
          background: msg.kind === "ok" ? "#dcfce7" : "#fef2f2",
          color:      msg.kind === "ok" ? "#065f46" : "#991b1b",
          border:     msg.kind === "ok" ? "1px solid #86efac" : "1px solid #fecaca",
        }}>
          {msg.text}
        </p>
      )}
    </div>
  );
}

// ─── Merge patient panel ──────────────────────────────────────────────────────

type PatientSearchResult = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  city: string | null;
  is_suspended: boolean;
};

function MergePatientPanel({
  primaryId,
  primaryName,
}: {
  primaryId: string;
  primaryName: string;
}) {
  const [open,      setOpen]      = useState(false);
  const [query,     setQuery]     = useState("");
  const [results,   setResults]   = useState<PatientSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected,  setSelected]  = useState<PatientSearchResult | null>(null);
  const [merging,   setMerging]   = useState(false);
  const [msg,       setMsg]       = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const debounceRef = { current: 0 as ReturnType<typeof setTimeout> };

  function handleQuery(value: string) {
    setQuery(value);
    setSelected(null);
    setMsg(null);
    clearTimeout(debounceRef.current);
    if (value.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/patients?q=${encodeURIComponent(value.trim())}`);
        const data: PatientSearchResult[] = await r.json();
        setResults(data.filter((p) => p.id !== primaryId));
      } finally {
        setSearching(false);
      }
    }, 300);
  }

  async function doMerge() {
    if (!selected) return;
    const confirmed = window.confirm(
      `Merge "${selected.full_name}" into "${primaryName}"?\n\n` +
      `• All appointments from "${selected.full_name}" will move to "${primaryName}".\n` +
      `• Empty fields on "${primaryName}" will be filled from "${selected.full_name}".\n` +
      `• "${selected.full_name}" will be permanently deleted.\n\n` +
      `This cannot be undone.`,
    );
    if (!confirmed) return;

    setMerging(true);
    setMsg(null);
    try {
      const res  = await fetch(`/api/patients/${primaryId}/merge`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ other_id: selected.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ kind: "err", text: data.error ?? `HTTP ${res.status}` });
      } else {
        setMsg({ kind: "ok", text: `Merged successfully. Page will refresh.` });
        setTimeout(() => window.location.reload(), 1200);
      }
    } catch (e) {
      setMsg({ kind: "err", text: (e as Error).message });
    } finally {
      setMerging(false);
    }
  }

  return (
    <div className={styles.panel} style={{ marginBottom: 24 }}>
      <div
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
        onClick={() => { setOpen((o) => !o); setMsg(null); }}
      >
        <h2 className={styles.panelTitle} style={{ margin: 0 }}>Merge Patient</h2>
        <span style={{ fontSize: 13, color: "#9b8fa0" }}>{open ? "▲ Hide" : "▼ Show"}</span>
      </div>

      {open && (
        <div style={{ marginTop: 14 }}>
          <p style={{ fontSize: 12, color: "#6b7280", marginTop: 0, marginBottom: 12 }}>
            Search for a duplicate patient to merge into <strong>{primaryName}</strong>.
            All their appointments will be reassigned here, then the duplicate record will be deleted.
          </p>

          {/* Search input */}
          <input
            className={styles.input}
            placeholder="Search by name, phone or email…"
            value={query}
            onChange={(e) => handleQuery(e.target.value)}
            style={{ width: "100%", boxSizing: "border-box" }}
          />

          {/* Results list */}
          {searching && (
            <p style={{ fontSize: 12, color: "#9b8fa0", marginTop: 8 }}>Searching…</p>
          )}
          {!searching && query.length >= 2 && results.length === 0 && (
            <p style={{ fontSize: 12, color: "#9b8fa0", marginTop: 8 }}>No patients found.</p>
          )}
          {results.length > 0 && !selected && (
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
              {results.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setSelected(p); setResults([]); }}
                  style={{
                    textAlign: "left", background: "#faf9fb",
                    border: "1px solid rgba(207,195,204,.4)", borderRadius: 8,
                    padding: "10px 14px", cursor: "pointer", fontSize: 13,
                  }}
                >
                  <strong>{p.full_name}</strong>
                  <span style={{ color: "#9b8fa0", marginLeft: 8 }}>{p.phone}</span>
                  {p.email && <span style={{ color: "#9b8fa0", marginLeft: 8 }}>{p.email}</span>}
                  {p.is_suspended && (
                    <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, color: "#991b1b", background: "#fee2e2", padding: "1px 6px", borderRadius: 99 }}>SUSPENDED</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Selected patient preview + confirm */}
          {selected && (
            <div style={{ marginTop: 12, padding: 14, background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#92400e", marginBottom: 8 }}>
                Selected for merge (will be deleted):
              </div>
              <div style={{ fontSize: 13, color: "#1e1b24" }}>
                <strong>{selected.full_name}</strong>
                <span style={{ color: "#6b7280", marginLeft: 8 }}>{selected.phone}</span>
                {selected.email && <span style={{ color: "#6b7280", marginLeft: 8 }}>{selected.email}</span>}
                {selected.city && <span style={{ color: "#6b7280", marginLeft: 8 }}>· {selected.city}</span>}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button
                  className={styles.danger}
                  disabled={merging}
                  onClick={doMerge}
                >
                  {merging ? "Merging…" : `Merge into ${primaryName}`}
                </button>
                <button
                  className={styles.secondary}
                  disabled={merging}
                  onClick={() => { setSelected(null); setQuery(""); setResults([]); }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {msg && (
            <p style={{
              marginTop: 12, padding: "8px 12px", borderRadius: 8, fontSize: 12,
              background: msg.kind === "ok" ? "#dcfce7" : "#fef2f2",
              color:      msg.kind === "ok" ? "#065f46" : "#991b1b",
              border:     msg.kind === "ok" ? "1px solid #86efac" : "1px solid #fecaca",
            }}>
              {msg.text}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Chip({ label, tone }: { label: string; tone: "ok" | "warn" | "err" | "neutral" }) {
  const colors: Record<typeof tone, { bg: string; fg: string }> = {
    ok:      { bg: "#dcfce7", fg: "#166534" },
    warn:    { bg: "#fef3c7", fg: "#92400e" },
    err:     { bg: "#fee2e2", fg: "#991b1b" },
    neutral: { bg: "#f3f4f6", fg: "#374151" },
  };
  const c = colors[tone];
  return (
    <span style={{
      background: c.bg, color: c.fg, padding: "4px 10px",
      borderRadius: 999, fontSize: 11, fontWeight: 700,
      textTransform: "uppercase", letterSpacing: 0.4,
    }}>{label}</span>
  );
}
