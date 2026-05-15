"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./patient.module.scss";
import { BookingModal } from "./BookingModal";

// ─── Types ────────────────────────────────────────────────────────────────────

type PatientInfo = {
  id:                string;
  full_name:         string;
  email:             string | null;
  phone:             string;
  age:               number | null;
  gender:            string | null;
  city:              string | null;
  created_at:        string;
  last_login_at:     string | null;
  email_verified:    boolean;
  email_verified_at: string | null;
  is_suspended:      boolean;
  suspension_reason: string | null;
};

type Appointment = {
  id:               string;
  plan_title:       string;
  scheduled_date:   string;
  scheduled_time:   string;
  duration_minutes: number;
  status:           string;
  payment_status:   string;
  total_paise:      number;
  meeting_link:     string | null;
};

type Report = {
  id:               string;
  appointment_id:   string;
  file_name:        string;
  file_url:         string;
  signed_url:       string | null;
  file_size:        number | null;
  mime_type:        string | null;
  uploaded_at:      string;
  appointment_date: string;
  appointment_time: string;
  plan_title:       string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso.slice(0, 10) + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
}

function fmtTime(t: string) {
  const [hStr, mStr] = t.split(":");
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, "0")}:${mStr} ${ampm}`;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(mime: string | null) {
  if (!mime) return "📄";
  if (mime === "application/pdf") return "📋";
  if (mime.startsWith("image/")) return "🖼️";
  if (mime.includes("word") || mime.includes("document")) return "📝";
  return "📄";
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function PatientDashboard() {
  const router = useRouter();

  const [patient,      setPatient]      = useState<PatientInfo | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [reports,      setReports]      = useState<Report[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [error,        setError]        = useState("");
  const [showBooking,  setShowBooking]  = useState(false);
  const [payingId,     setPayingId]     = useState<string | null>(null);
  const [payMsg,       setPayMsg]       = useState<Record<string, string>>({});

  const fetchMe = () =>
    fetch("/api/patient/me")
      .then(async (r) => {
        if (r.status === 401) { router.replace("/patient/login"); return null; }
        if (!r.ok) throw new Error((await r.json()).error ?? `HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (data) {
          setPatient(data.patient);
          setAppointments(data.appointments ?? []);
        }
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));

  useEffect(() => { void fetchMe(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetch("/api/patient/reports")
      .then(r => r.ok ? r.json() : [])
      .then(d => setReports(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setReportsLoading(false));
  }, []);

  const logout = async () => {
    await fetch("/api/patient/auth/logout", { method: "POST" });
    router.replace("/patient/login");
  };

  async function handlePay(appt: Appointment) {
    setPayingId(appt.id);
    setPayMsg(m => ({ ...m, [appt.id]: "" }));
    try {
      const res  = await fetch(`/api/bookings/${appt.id}/payment`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ gateway: "manual", status: "initiated" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Payment failed.");
      setPayMsg(m => ({ ...m, [appt.id]: "Payment initiated. Our team will confirm it shortly." }));
      // Refresh appointments
      fetchMe();
    } catch (e) {
      setPayMsg(m => ({ ...m, [appt.id]: (e as Error).message }));
    } finally {
      setPayingId(null);
    }
  }

  if (loading) return <div className={styles.loading}>Loading…</div>;
  if (error)   return <div className={styles.loading}>{error}</div>;
  if (!patient) return null;

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Welcome, {patient.full_name}</h1>
          <p className={styles.subtitle}>Your appointments and records</p>
        </div>
        <div className={styles.headerActions}>
          <button onClick={logout} className={styles.logoutBtn}>Logout</button>
        </div>
      </header>

      {/* Email verification banner */}
      {!patient.email_verified && (
        <div className={styles.verifyBanner}>
          <div>
            <strong>Verify your email.</strong>{" "}
            We sent a code to <span style={{ fontWeight: 600 }}>{patient.email ?? "your inbox"}</span>.
          </div>
          <a href="/patient/verify" className={styles.bannerBtn}>Verify now →</a>
        </div>
      )}

      {/* ── Appointments ─────────────────────────────────────────────────────── */}
      <section className={styles.profileCard}>
        <div className={styles.appointmentsHead}>
          <h2 className={styles.cardTitle}>Appointments ({appointments.length})</h2>
          <button className={styles.primaryBtn} onClick={() => setShowBooking(true)}>
            + Book new
          </button>
        </div>

        {appointments.length === 0 ? (
          <p className={styles.empty}>No appointments yet. Click &ldquo;Book new&rdquo; to get started.</p>
        ) : (
          <ul className={styles.appointmentList}>
            {appointments.map((a) => {
              const needsPay = a.payment_status === "unpaid" || a.payment_status === "pending";
              return (
                <li key={a.id} className={styles.appointment}>
                  <div className={styles.apptLeft}>
                    <div className={styles.apptDate}>{fmtDate(a.scheduled_date)}</div>
                    <div className={styles.apptTime}>
                      {fmtTime(a.scheduled_time)} · {a.duration_minutes} min
                    </div>
                  </div>
                  <div className={styles.apptMid}>
                    <div className={styles.apptPlan}>{a.plan_title}</div>
                    <div className={styles.statuses}>
                      <span className={`${styles.pill} ${styles[`status_${a.status}`] ?? ""}`}>
                        {a.status.replace(/_/g, " ")}
                      </span>
                      <span className={`${styles.pill} ${styles[`pay_${a.payment_status}`] ?? ""}`}>
                        {a.payment_status.replace(/_/g, " ")}
                      </span>
                    </div>
                    {payMsg[a.id] && (
                      <p style={{ margin: "6px 0 0", fontSize: 12, color: "#745475" }}>{payMsg[a.id]}</p>
                    )}
                  </div>
                  <div className={styles.apptRight}>
                    {needsPay ? (
                      <button
                        className={styles.primaryBtn}
                        disabled={payingId === a.id}
                        onClick={() => handlePay(a)}
                        title={`₹${(a.total_paise / 100).toLocaleString("en-IN")} due`}
                      >
                        {payingId === a.id ? "Processing…" : `Pay ₹${(a.total_paise / 100).toLocaleString("en-IN")}`}
                      </button>
                    ) : a.meeting_link ? (
                      <a href={a.meeting_link} target="_blank" rel="noreferrer" className={styles.primaryBtn}>
                        Join
                      </a>
                    ) : (
                      <span className={styles.muted}>Link pending</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ── Reports ──────────────────────────────────────────────────────────── */}
      <section className={styles.profileCard}>
        <h2 className={styles.cardTitle}>Reports & Prescriptions ({reports.length})</h2>

        {reportsLoading ? (
          <p className={styles.empty}>Loading reports…</p>
        ) : reports.length === 0 ? (
          <p className={styles.empty}>No reports uploaded yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {reports.map((r) => (
              <div key={r.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                gap: 12, padding: "12px 14px",
                border: "1px solid rgba(207,195,204,.3)", borderRadius: 10, background: "#faf9fb",
                flexWrap: "wrap",
              }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1e1b24", marginBottom: 2 }}>
                    {fileIcon(r.mime_type)} {r.file_name}
                    {r.file_size && (
                      <span style={{ color: "#9b8fa0", fontWeight: 400, marginLeft: 6, fontSize: 11 }}>
                        {formatSize(r.file_size)}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "#9b8fa0" }}>
                    {r.plan_title} · {fmtDate(r.appointment_date)}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  {r.signed_url && (
                    <>
                      <a
                        href={r.signed_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          padding: "6px 14px", background: "#f5f0f5",
                          border: "1px solid rgba(116,84,117,.3)", color: "#745475",
                          borderRadius: 6, fontSize: 12, fontWeight: 600,
                          textDecoration: "none",
                        }}
                      >
                        View
                      </a>
                      <a
                        href={r.signed_url}
                        download={r.file_name}
                        style={{
                          padding: "6px 14px", background: "#745475",
                          color: "#fff", borderRadius: 6, fontSize: 12,
                          fontWeight: 600, textDecoration: "none",
                        }}
                      >
                        ↓ Download
                      </a>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Profile ──────────────────────────────────────────────────────────── */}
      <section className={styles.profileCard}>
        <h2 className={styles.cardTitle}>Profile</h2>
        <div className={styles.profileGrid}>
          <div><span className={styles.label}>Name</span><span>{patient.full_name}</span></div>
          <div><span className={styles.label}>Phone</span><span>{patient.phone}</span></div>
          <div><span className={styles.label}>Email</span><span>{patient.email ?? "—"}</span></div>
          <div><span className={styles.label}>Age</span><span>{patient.age ?? "—"}</span></div>
          <div><span className={styles.label}>Gender</span><span>{patient.gender ?? "—"}</span></div>
          <div><span className={styles.label}>City</span><span>{patient.city ?? "—"}</span></div>
        </div>
      </section>

      {/* Booking modal */}
      {showBooking && (
        <BookingModal
          patient={patient}
          onClose={() => setShowBooking(false)}
          onBooked={() => { void fetchMe(); setShowBooking(false); }}
        />
      )}
    </div>
  );
}
