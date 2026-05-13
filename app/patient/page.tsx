"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./patient.module.scss";

type Me = {
  patient: {
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
  appointments: {
    id:               string;
    plan_title:       string;
    scheduled_date:   string;
    scheduled_time:   string;
    duration_minutes: number;
    status:           string;
    payment_status:   string;
    meeting_link:     string | null;
  }[];
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    weekday: "short",
    day:     "numeric",
    month:   "short",
    year:    "numeric",
  });
}

function fmtTime(t: string): string {
  // "HH:MM:SS" → "HH:MM AM/PM"
  const [hStr, mStr] = t.split(":");
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, "0")}:${mStr} ${ampm}`;
}

export default function PatientDashboard() {
  const router = useRouter();
  const [me,      setMe]      = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    fetch("/api/patient/me")
      .then(async (r) => {
        if (r.status === 401) {
          router.replace("/patient/login");
          return null;
        }
        if (!r.ok) throw new Error((await r.json()).error ?? `HTTP ${r.status}`);
        return r.json();
      })
      .then((data: Me | null) => {
        if (data) setMe(data);
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [router]);

  const logout = async () => {
    await fetch("/api/patient/auth/logout", { method: "POST" });
    router.replace("/patient/login");
  };

  if (loading) return <div className={styles.loading}>Loading…</div>;
  if (error)   return <div className={styles.loading}>{error}</div>;
  if (!me)     return null;

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Welcome, {me.patient.full_name}</h1>
          <p className={styles.subtitle}>Your appointments and profile</p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/" className={styles.linkBtn}>← Home</Link>
          <button onClick={logout} className={styles.logoutBtn}>Logout</button>
        </div>
      </header>

      {!me.patient.email_verified && (
        <div className={styles.verifyBanner}>
          <div>
            <strong>Verify your email.</strong> We sent a code to{" "}
            <span style={{ fontWeight: 600 }}>{me.patient.email ?? "your inbox"}</span>.
            Verify to keep your appointments &amp; records linked to your account.
          </div>
          <Link href="/patient/verify" className={styles.bannerBtn}>Verify now →</Link>
        </div>
      )}

      <section className={styles.profileCard}>
        <h2 className={styles.cardTitle}>Profile</h2>
        <div className={styles.profileGrid}>
          <div><span className={styles.label}>Name</span><span>{me.patient.full_name}</span></div>
          <div><span className={styles.label}>Phone</span><span>{me.patient.phone}</span></div>
          <div><span className={styles.label}>Email</span><span>{me.patient.email ?? "—"}</span></div>
          <div><span className={styles.label}>Age</span><span>{me.patient.age ?? "—"}</span></div>
          <div><span className={styles.label}>Gender</span><span>{me.patient.gender ?? "—"}</span></div>
          <div><span className={styles.label}>City</span><span>{me.patient.city ?? "—"}</span></div>
        </div>
      </section>

      <section className={styles.profileCard}>
        <div className={styles.appointmentsHead}>
          <h2 className={styles.cardTitle}>Appointments ({me.appointments.length})</h2>
          <Link href="/#consultations" className={styles.primaryBtn}>+ Book new</Link>
        </div>

        {me.appointments.length === 0 ? (
          <p className={styles.empty}>No appointments yet. Book your first consultation from the homepage.</p>
        ) : (
          <ul className={styles.appointmentList}>
            {me.appointments.map((a) => (
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
                    <span className={`${styles.pill} ${styles[`status_${a.status}`] ?? ""}`}>{a.status}</span>
                    <span className={`${styles.pill} ${styles[`pay_${a.payment_status}`] ?? ""}`}>{a.payment_status}</span>
                  </div>
                </div>
                <div className={styles.apptRight}>
                  {a.meeting_link ? (
                    <a href={a.meeting_link} target="_blank" rel="noreferrer" className={styles.primaryBtn}>
                      Join
                    </a>
                  ) : (
                    <span className={styles.muted}>Link pending</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
