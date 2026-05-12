"use client";

import { useEffect, useState } from "react";
import styles from "../users/users.module.scss";

type AltRequest = {
  id:              string;
  name:            string;
  phone:           string;
  email:           string | null;
  plan_id:         string | null;
  preferred_dates: string | null;
  notes:           string | null;
  status:          "new" | "contacted" | "resolved";
  admin_notes:     string | null;
  created_at:      string;
};

const STATUSES: AltRequest["status"][] = ["new", "contacted", "resolved"];

export default function AlternativeRequestsPage() {
  const [rows, setRows]       = useState<AltRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId]   = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/alternative-requests")
      .then((r) => r.json())
      .then((d) => { setRows(d); setLoading(false); });
  };
  useEffect(load, []);

  const setStatus = async (id: string, status: AltRequest["status"]) => {
    await fetch(`/api/alternative-requests/${id}`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ status }),
    });
    load();
  };

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Alternative Appointment Requests</h1>
      </div>

      {loading ? (
        <p className={styles.loading}>Loading…</p>
      ) : (
        <div className={styles.card}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Received</th>
                <th>Name</th>
                <th>Contact</th>
                <th>Plan</th>
                <th>Preferred Availability</th>
                <th>Notes</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className={styles.empty}>
                    No alternative requests yet.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {new Date(r.created_at).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </td>

                  <td className={styles.username}>{r.name}</td>

                  <td>
                    <div style={{ fontSize: 12, lineHeight: 1.6 }}>
                      <div>{r.phone}</div>
                      {r.email && (
                        <div style={{ color: "#9b8fa0" }}>{r.email}</div>
                      )}
                    </div>
                  </td>

                  <td>
                    {r.plan_id ? (
                      <code style={{ fontSize: 11, color: "#9b8fa0" }}>
                        {r.plan_id}
                      </code>
                    ) : "—"}
                  </td>

                  {/* Preferred dates — expandable */}
                  <td style={{ maxWidth: 220 }}>
                    {openId === r.id ? (
                      <>
                        <div style={{ whiteSpace: "pre-wrap", fontSize: 13, color: "#1e1b24" }}>
                          {r.preferred_dates ?? "—"}
                        </div>
                        <button
                          onClick={() => setOpenId(null)}
                          style={{ marginTop: 6, fontSize: 11, color: "#9b8fa0", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                        >
                          Hide
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setOpenId(r.id)}
                        style={{ fontSize: 12, color: "#745475", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 600, textAlign: "left" }}
                      >
                        {r.preferred_dates
                          ? r.preferred_dates.length > 55
                            ? r.preferred_dates.slice(0, 55) + "…"
                            : r.preferred_dates
                          : "—"}
                      </button>
                    )}
                  </td>

                  <td style={{ maxWidth: 180, fontSize: 12, color: "#6b7280" }}>
                    {r.notes
                      ? r.notes.length > 60
                        ? r.notes.slice(0, 60) + "…"
                        : r.notes
                      : "—"}
                  </td>

                  <td>
                    <select
                      value={r.status}
                      onChange={(e) => setStatus(r.id, e.target.value as AltRequest["status"])}
                      style={{
                        background:    tone(r.status).bg,
                        color:         tone(r.status).fg,
                        border:        "none",
                        padding:       "4px 10px",
                        borderRadius:  999,
                        fontSize:      11,
                        fontWeight:    700,
                        textTransform: "capitalize",
                        cursor:        "pointer",
                      }}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
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

function tone(s: AltRequest["status"]) {
  if (s === "resolved")  return { bg: "#dcfce7", fg: "#166534" };
  if (s === "contacted") return { bg: "#dbeafe", fg: "#1e40af" };
  return                        { bg: "#fef3c7", fg: "#92400e" };
}
