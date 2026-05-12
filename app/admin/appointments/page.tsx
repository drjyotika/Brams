"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "../users/users.module.scss";
import { BramsLoader } from "../../../components/BramsLoader";

type Appointment = {
  id: string;
  plan_title: string;
  scheduled_date: string;
  scheduled_time: string;
  total_paise: number;
  status: string;
  payment_status: string;
  patient: {
    id: string;
    full_name: string;
    phone: string;
  };
};

export default function AppointmentsPage() {
  const [rows, setRows]       = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/appointments")
      .then((r) => r.json())
      .then((d) => { setRows(d); setLoading(false); });
  }, []);

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
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={8} className={styles.empty}>No appointments yet.</td></tr>
              )}
              {rows.map((a) => (
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
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
