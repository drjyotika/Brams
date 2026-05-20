"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import styles from "./patient.module.scss";
import { BramsLoader } from "../../components/BramsLoader";
import { TopNavBar } from "../../components/TopNavBar";
import { defaultContent } from "../../lib/content";

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

type ActiveTab = "dashboard" | "appointments" | "reports" | "profile";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso.slice(0, 10) + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function fmtDateShort(iso: string) {
  return new Date(iso.slice(0, 10) + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric", month: "short",
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

function isUpcoming(appt: Appointment) {
  const now = new Date();
  const apptDate = new Date(appt.scheduled_date.slice(0, 10) + "T" + appt.scheduled_time);
  return apptDate >= now && !["cancelled", "no_show"].includes(appt.status);
}

// ─── Nav items ────────────────────────────────────────────────────────────────

const NAV: { id: ActiveTab; label: string; icon: string }[] = [
  { id: "dashboard",    label: "Dashboard",    icon: "⊞" },
  { id: "appointments", label: "Appointments", icon: "📅" },
  { id: "reports",      label: "Files & Reports", icon: "📁" },
  { id: "profile",      label: "Profile",      icon: "👤" },
];

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function PatientDashboard() {
  const router = useRouter();

  const [patient,        setPatient]        = useState<PatientInfo | null>(null);
  const [appointments,   setAppointments]   = useState<Appointment[]>([]);
  const [reports,        setReports]        = useState<Report[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [error,          setError]          = useState("");
  const [activeTab,      setActiveTab]      = useState<ActiveTab>("dashboard");
  const [payingId,         setPayingId]         = useState<string | null>(null);
  const [payMsg,           setPayMsg]           = useState<Record<string, string>>({});

  const fetchMe = useCallback(() => {
    return fetch("/api/patient/me")
      .then(async (r) => {
        if (r.status === 401) { router.replace("/patient/login"); return null; }
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(body?.error ?? `Server error (HTTP ${r.status}). Please try again shortly.`);
        }
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
  }, [router]);

  useEffect(() => { void fetchMe(); }, [fetchMe]);

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
      setPayMsg(m => ({ ...m, [appt.id]: "Payment initiated — our team will confirm shortly." }));
      void fetchMe();
    } catch (e) {
      setPayMsg(m => ({ ...m, [appt.id]: (e as Error).message }));
    } finally {
      setPayingId(null);
    }
  }

  if (loading) return <BramsLoader fullPage />;
  if (error)   return <div className={styles.loading}>{error}</div>;
  if (!patient) return null;

  // Derived data
  const nextAppt       = appointments.find(isUpcoming) ?? null;
  const completed      = appointments.filter(a => a.status === "completed").length;
  const totalAppts     = appointments.length;
  const progressPct    = totalAppts > 0 ? Math.round((completed / totalAppts) * 100) : 0;
  const needsPay       = (a: Appointment) => a.payment_status === "unpaid" || a.payment_status === "pending";
  const pendingPayment = appointments.filter(needsPay);
  const isNewPatient   = totalAppts === 0;

  // Greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = patient.full_name.split(" ")[0];

  // ── Sidebar ────────────────────────────────────────────────────────────────
  const Sidebar = (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarLogo}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <a href="/"><img src="/logo.png" alt="Brams Mind Care" /></a>
      </div>
      <nav className={styles.sidebarNav}>
        {NAV.map(item => (
          <button
            key={item.id}
            className={`${styles.navItem} ${activeTab === item.id ? styles.navItemActive : ""}`}
            onClick={() => setActiveTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className={styles.sidebarBottom}>
        <button className={styles.navItem} onClick={logout}>
          Logout
        </button>
      </div>
    </aside>
  );

  // ── Dashboard tab ──────────────────────────────────────────────────────────
  const DashboardContent = (
    <>
      {/* Greeting */}
      <div className={styles.greeting}>
        <span className={styles.greetingText}>{greeting}, {firstName} 👋</span>
        <span className={styles.greetingSubtext}>Here&apos;s a summary of your health journey.</span>
      </div>

      {/* Payment pending alert */}
      {pendingPayment.length > 0 && (
        <div className={styles.payAlert}>
          <div className={styles.payAlertLeft}>
            <span className={styles.payAlertIcon}>⚠️</span>
            <div>
              <strong>Payment pending</strong> on {pendingPayment.length} appointment{pendingPayment.length > 1 ? "s" : ""}.
              Your slot is reserved but needs payment to be confirmed.
            </div>
          </div>
          <button
            className={styles.payAlertBtn}
            onClick={() => setActiveTab("appointments")}
          >
            Pay now →
          </button>
        </div>
      )}

      {/* New patient empty state */}
      {isNewPatient ? (
        <div className={styles.onboardCard}>
          <div className={styles.onboardIcon}>🌿</div>
          <h2 className={styles.onboardTitle}>Welcome to Brams Mind Care</h2>
          <p className={styles.onboardText}>
            You&apos;re all set! Book your first session with Dr. Jyotika Kanwar and start your wellness journey.
          </p>
          <button className={styles.onboardBtn} onClick={() => router.push("/patient/book")}>
            Book My First Session
          </button>
        </div>
      ) : (
      <>
      {/* Hero row */}
      <div className={styles.heroRow}>
        {/* Next appointment card */}
        <div className={styles.heroCard}>
          <div className={styles.heroBg} />
          <div className={styles.heroLabel}>Next Appointment</div>

          {nextAppt ? (
            <>
              <h2 className={styles.heroTitle}>{nextAppt.plan_title}</h2>
              <div className={styles.heroPills}>
                <span className={styles.heroPill}>📅 {fmtDate(nextAppt.scheduled_date)}</span>
                <span className={styles.heroPill}>🕐 {fmtTime(nextAppt.scheduled_time)}</span>
                <span className={styles.heroPill}>⏱ {nextAppt.duration_minutes} min</span>
              </div>
              <div className={styles.heroActions}>
                {needsPay(nextAppt) ? (
                  <>
                    <button
                      className={styles.payBtn}
                      disabled={payingId === nextAppt.id}
                      onClick={() => handlePay(nextAppt)}
                    >
                      {payingId === nextAppt.id ? "Processing…" : `Pay ₹${(nextAppt.total_paise / 100).toLocaleString("en-IN")}`}
                    </button>
                    {payMsg[nextAppt.id] && (
                      <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 12 }}>
                        {payMsg[nextAppt.id]}
                      </span>
                    )}
                  </>
                ) : nextAppt.meeting_link ? (
                  <a
                    href={nextAppt.meeting_link}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.joinBtn}
                  >
                    Join Meeting
                  </a>
                ) : (
                  <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }}>Meeting link pending</span>
                )}
                <button
                  className={styles.rescheduleBtn}
                  onClick={() => router.push(`/patient/reschedule/${nextAppt.id}`)}
                >
                  Reschedule
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className={styles.heroTitle}>No upcoming appointments</h2>
              <div className={styles.heroEmpty}>
                <p className={styles.heroEmptyText}>Book a session with Dr. Jyotika Kanwar to get started.</p>
                <button className={styles.bookBtn} onClick={() => router.push("/patient/book")}>
                  Book a Session
                </button>
              </div>
            </>
          )}
        </div>

        {/* Stats column */}
        <div className={styles.statsCol}>
          {/* Session progress */}
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Session Progress</div>
            <div className={styles.statValue}>{completed}</div>
            <div className={styles.statSub}>of {totalAppts} sessions completed</div>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
            </div>
          </div>

          {/* Reports / Prescriptions */}
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Files & Reports</div>
            <div className={styles.statValue}>{reports.length}</div>
            <div className={styles.statSub}>
              {reports.length === 1 ? "document" : "documents"} uploaded
            </div>
            {reports.length > 0 && (
              <button className={styles.statLink} onClick={() => setActiveTab("reports")}>
                View all →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className={styles.bottomRow}>
        {/* Medical Reports */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHead}>
            <h3 className={styles.sectionTitle}>Recent Reports</h3>
            {reports.length > 3 && (
              <button className={styles.seeAll} onClick={() => setActiveTab("reports")}>
                See all
              </button>
            )}
          </div>

          {reportsLoading ? (
            <BramsLoader />
          ) : reports.length === 0 ? (
            <p className={styles.empty}>No reports yet.</p>
          ) : (
            reports.slice(0, 3).map(r => (
              <div key={r.id} className={styles.reportItem}>
                <div className={styles.reportIcon}>{fileIcon(r.mime_type)}</div>
                <div className={styles.reportInfo}>
                  <div className={styles.reportName}>{r.file_name}</div>
                  <div className={styles.reportMeta}>
                    {r.plan_title} · {fmtDateShort(r.appointment_date)}
                    {r.file_size ? ` · ${formatSize(r.file_size)}` : ""}
                  </div>
                </div>
                {r.signed_url && (
                  <div className={styles.reportActions}>
                    <a href={r.signed_url} target="_blank" rel="noreferrer" className={`${styles.reportBtn} ${styles.view}`}>View</a>
                    <a href={r.signed_url} download={r.file_name} className={`${styles.reportBtn} ${styles.download}`}>↓</a>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Recent History */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHead}>
            <h3 className={styles.sectionTitle}>Recent History</h3>
            {appointments.length > 4 && (
              <button className={styles.seeAll} onClick={() => setActiveTab("appointments")}>
                See all
              </button>
            )}
          </div>

          {appointments.length === 0 ? (
            <p className={styles.empty}>No appointments yet.</p>
          ) : (
            <table className={styles.historyTable}>
              <thead>
                <tr>
                  <th className={styles.historyTh}>Date</th>
                  <th className={styles.historyTh}>Session</th>
                  <th className={styles.historyTh}>Status</th>
                </tr>
              </thead>
              <tbody>
                {appointments.slice(0, 4).map(a => (
                  <tr key={a.id} className={styles.historyTr}>
                    <td className={styles.historyTd}>
                      <span className={styles.historyDate}>{fmtDateShort(a.scheduled_date)}</span>
                      <span className={styles.historyTime}>{fmtTime(a.scheduled_time)}</span>
                    </td>
                    <td className={styles.historyTd}>
                      <span className={styles.historyPlan}>{a.plan_title}</span>
                    </td>
                    <td className={styles.historyTd}>
                      <span className={`${styles.pill} ${styles[`status_${a.status}` as keyof typeof styles] ?? ""}`}>
                        {a.status.replace(/_/g, " ")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      </>
      )}
    </>
  );

  // ── Appointments tab ───────────────────────────────────────────────────────
  const AppointmentsContent = (
    <div className={styles.sectionCard}>
      <div className={styles.sectionHead}>
        <h3 className={styles.sectionTitle}>All Appointments ({appointments.length})</h3>
      </div>

      {appointments.length === 0 ? (
        <p className={styles.empty}>No appointments yet. Book your first session!</p>
      ) : (
        <div className={styles.apptFull}>
          {appointments.map(a => {
            const np = needsPay(a);
            return (
              <div key={a.id} className={styles.apptCard}>
                <div className={styles.apptCardLeft}>
                  <div className={styles.apptCardPlan}>{a.plan_title}</div>
                  <div className={styles.apptCardMeta}>
                    {fmtDate(a.scheduled_date)} · {fmtTime(a.scheduled_time)} · {a.duration_minutes} min
                  </div>
                  <div className={styles.apptCardPills}>
                    <span className={`${styles.pill} ${styles[`status_${a.status}` as keyof typeof styles] ?? ""}`}>
                      {a.status.replace(/_/g, " ")}
                    </span>
                    <span className={`${styles.pill} ${styles[`pay_${a.payment_status}` as keyof typeof styles] ?? ""}`}>
                      {a.payment_status.replace(/_/g, " ")}
                    </span>
                  </div>
                  {payMsg[a.id] && <p className={styles.payMsg}>{payMsg[a.id]}</p>}
                </div>
                <div className={styles.apptCardRight}>
                  {np ? (
                    <button
                      className={styles.primaryBtn}
                      disabled={payingId === a.id}
                      onClick={() => handlePay(a)}
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
                  {/* Reschedule — only for upcoming, non-terminal appointments */}
                  {!["cancelled", "completed", "no_show"].includes(a.status) && (
                    <button
                      className={styles.rescheduleCardBtn}
                      onClick={() => router.push(`/patient/reschedule/${a.id}`)}
                    >
                      Reschedule
                    </button>
                  )}
                  {/* Receipt — only for paid appointments */}
                  {a.payment_status === "paid" && (
                    <a
                      href={`/receipt/${a.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.rescheduleCardBtn}
                    >
                      🧾 Receipt
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ── Reports tab ────────────────────────────────────────────────────────────
  const ReportsContent = (
    <div className={styles.sectionCard}>
      <div className={styles.sectionHead}>
        <h3 className={styles.sectionTitle}>Files & Reports ({reports.length})</h3>
      </div>

      {reportsLoading ? (
        <BramsLoader />
      ) : reports.length === 0 ? (
        <p className={styles.empty}>No reports uploaded yet. Reports shared by your doctor will appear here.</p>
      ) : (
        reports.map(r => (
          <div key={r.id} className={styles.reportItem}>
            <div className={styles.reportIcon}>{fileIcon(r.mime_type)}</div>
            <div className={styles.reportInfo}>
              <div className={styles.reportName}>{r.file_name}</div>
              <div className={styles.reportMeta}>
                {r.plan_title} · {fmtDate(r.appointment_date)}
                {r.file_size ? ` · ${formatSize(r.file_size)}` : ""}
              </div>
            </div>
            {r.signed_url && (
              <div className={styles.reportActions}>
                <a href={r.signed_url} target="_blank" rel="noreferrer" className={`${styles.reportBtn} ${styles.view}`}>View</a>
                <a href={r.signed_url} download={r.file_name} className={`${styles.reportBtn} ${styles.download}`}>↓ Download</a>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );

  // ── Profile tab ────────────────────────────────────────────────────────────
  const ProfileContent = (
    <div className={styles.sectionCard}>
      <div className={styles.sectionHead}>
        <h3 className={styles.sectionTitle}>Your Profile</h3>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px" }}>
        {[
          ["Name",   patient.full_name],
          ["Phone",  patient.phone],
          ["Email",  patient.email ?? "—"],
          ["Age",    patient.age?.toString() ?? "—"],
          ["Gender", patient.gender ?? "—"],
          ["City",   patient.city ?? "—"],
        ].map(([label, value]) => (
          <div key={label} style={{
            display: "flex", justifyContent: "space-between", alignItems: "baseline",
            gap: 12, paddingBottom: 10, borderBottom: "1px dashed rgba(207,195,204,.3)",
            fontSize: 14, color: "#1e1b24",
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#9b8fa0" }}>{label}</span>
            <span>{value}</span>
          </div>
        ))}
      </div>

      {!patient.email_verified && patient.email && (
        <div style={{ marginTop: 20, padding: "14px 16px", background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, color: "#78350f" }}>
            <strong>Email not verified.</strong> Verify to receive appointment confirmations.
          </span>
          <a href="/patient/verify" style={{ padding: "8px 14px", background: "#745475", color: "#fff", borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
            Verify now →
          </a>
        </div>
      )}

      <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(207,195,204,.2)" }}>
        <button
          onClick={logout}
          style={{ padding: "10px 20px", border: "1px solid rgba(220,38,38,.25)", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#dc2626", background: "none", cursor: "pointer" }}
        >
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className={styles.shell}>
      {/* Mobile-only header: logo + hamburger + CTA (sidebar replaces this on desktop) */}
      <div className={styles.mobileHeader}>
        <TopNavBar
          data={defaultContent.nav}
          hideLinks
          ctaSlot={
            <a href="/patient/book" className="topnav-primary-cta">
              Book Consultation
            </a>
          }
          mobileMenuItems={[
            ...NAV.map((item) => ({
              label:  item.label,
              active: activeTab === item.id,
              onClick: () => setActiveTab(item.id),
            })),
            { label: "Logout", onClick: logout, variant: "danger" as const },
          ]}
        />
      </div>

      {Sidebar}

      <div className={styles.main}>
        {/* Desktop-only header above main content area */}
        <header className={styles.topBar}>
          <div className={styles.topBarLeft} />
          <div className={styles.topBarRight}>
            <button className={styles.bookConsultBtn} onClick={() => router.push("/patient/book")}>
              Book Consultation
            </button>
          </div>
        </header>

        {/* Email verification banner */}
        {!patient.email_verified && activeTab === "dashboard" && (
          <div style={{ padding: "12px 32px 0" }}>
            <div className={styles.verifyBanner}>
              <div>
                <strong>Verify your email.</strong>{" "}
                We sent a code to <strong>{patient.email ?? "your inbox"}</strong>.
              </div>
              <a href="/patient/verify" className={styles.bannerBtn}>Verify now →</a>
            </div>
          </div>
        )}

        {/* Content canvas */}
        <main className={styles.canvas}>
          {activeTab === "dashboard"    && DashboardContent}
          {activeTab === "appointments" && AppointmentsContent}
          {activeTab === "reports"      && ReportsContent}
          {activeTab === "profile"      && ProfileContent}
        </main>
      </div>

      {/* Mobile nav is in the TopNavBar hamburger menu (above) */}

    </div>
  );
}
