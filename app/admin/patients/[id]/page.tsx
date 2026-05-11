"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import styles from "../../admin.module.scss";

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

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [patient,      setPatient]      = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/patients/${id}`)
      .then((r) => r.json())
      .then((d) => { setPatient(d.patient); setAppointments(d.appointments); setLoading(false); });
  }, [id]);

  if (loading)  return <p style={{ color: "#71717a" }}>Loading…</p>;
  if (!patient) return <p>Patient not found. <Link href="/admin/patients">← Back</Link></p>;

  return (
    <div>
      <div className={styles.pageHeader}>
        <Link href="/admin/patients" style={{ fontSize: 13, color: "#9b8fa0" }}>← All Patients</Link>
        <h1 className={styles.pageTitle} style={{ marginTop: 8 }}>{patient.full_name}</h1>
      </div>

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

      <div className={styles.panel}>
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
                  <KV k="Date" v={new Date(a.scheduled_date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })} />
                  <KV k="Time" v={a.scheduled_time.slice(0, 5)} />
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
    </div>
  );
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
