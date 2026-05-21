"use client";

import { useEffect, useState } from "react";
import styles from "../users/users.module.scss";
import { BramsLoader } from "../../../components/BramsLoader";

type Feedback = {
  id:             string;
  appointment_id: string;
  patient_name:   string;
  patient_email:  string | null;
  plan_title:     string;
  scheduled_date: string;
  scheduled_time: string;
  rating:         number;
  comments:       string | null;
  created_at:     string;
};

function fmtDate(iso: string) {
  const d = iso.slice(0, 10);
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function Stars({ rating }: { rating: number }) {
  return (
    <span>
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} style={{ fontSize: 16, opacity: s <= rating ? 1 : 0.2 }}>⭐</span>
      ))}
    </span>
  );
}

const LABELS = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

export default function FeedbackPage() {
  const [rows,    setRows]    = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/feedback")
      .then((r) => r.json())
      .then((d) => { setRows(Array.isArray(d) ? d : []); setLoading(false); });
  }, []);

  const avg = rows.length
    ? (rows.reduce((s, r) => s + r.rating, 0) / rows.length).toFixed(1)
    : null;

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Patient Feedback</h1>
        {rows.length > 0 && (
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "#71717a" }}>{rows.length} response{rows.length !== 1 ? "s" : ""}</span>
            {avg && (
              <span style={{
                background: "#f0fdf4", border: "1px solid #86efac", color: "#166534",
                borderRadius: 999, padding: "3px 12px", fontSize: 13, fontWeight: 700,
              }}>
                ⭐ {avg} avg
              </span>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <BramsLoader />
      ) : rows.length === 0 ? (
        <div className={styles.card} style={{ padding: "48px 32px", textAlign: "center", color: "#9b8fa0" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
          <p style={{ margin: 0, fontSize: 15 }}>No feedback received yet.</p>
          <p style={{ margin: "6px 0 0", fontSize: 13 }}>Feedback is sent automatically when an appointment is marked as Completed.</p>
        </div>
      ) : (
        <div className={styles.card}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Patient</th>
                <th>Plan</th>
                <th>Date</th>
                <th>Rating</th>
                <th>Comments</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((f) => (
                <tr key={f.id}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{f.patient_name}</div>
                    {f.patient_email && (
                      <div style={{ fontSize: 11, color: "#9b8fa0" }}>{f.patient_email}</div>
                    )}
                  </td>
                  <td style={{ fontSize: 13 }}>{f.plan_title}</td>
                  <td style={{ fontSize: 13, whiteSpace: "nowrap" }}>{fmtDate(f.scheduled_date)}</td>
                  <td>
                    <Stars rating={f.rating} />
                    <div style={{ fontSize: 11, color: "#9b8fa0", marginTop: 2 }}>
                      {LABELS[f.rating]}
                    </div>
                  </td>
                  <td style={{ fontSize: 13, color: f.comments ? "#1a1c1d" : "#9b8fa0", maxWidth: 280 }}>
                    {f.comments || <em>No comments</em>}
                  </td>
                  <td style={{ fontSize: 12, color: "#9b8fa0", whiteSpace: "nowrap" }}>
                    {new Date(f.created_at).toLocaleDateString("en-IN", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
