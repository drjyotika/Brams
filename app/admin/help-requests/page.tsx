"use client";

import { useEffect, useState } from "react";
import styles from "../users/users.module.scss";

type HelpRequest = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  issue: string | null;
  message: string;
  source: string | null;
  status: "new" | "in_progress" | "resolved";
  admin_notes: string | null;
  created_at: string;
};

const STATUSES: HelpRequest["status"][] = ["new", "in_progress", "resolved"];

export default function HelpRequestsPage() {
  const [rows, setRows]       = useState<HelpRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId]   = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/help-requests")
      .then((r) => r.json())
      .then((d) => { setRows(d); setLoading(false); });
  };
  useEffect(load, []);

  const setStatus = async (id: string, status: HelpRequest["status"]) => {
    await fetch(`/api/help-requests/${id}`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ status }),
    });
    load();
  };

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Help Requests</h1>
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
                <th>Issue</th>
                <th>Source</th>
                <th>Status</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={7} className={styles.empty}>No help requests yet.</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{new Date(r.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</td>
                  <td className={styles.username}>{r.name}</td>
                  <td>
                    <div style={{ fontSize: 12, lineHeight: 1.5 }}>
                      {r.phone && <div>{r.phone}</div>}
                      {r.email && <div style={{ color: "#9b8fa0" }}>{r.email}</div>}
                      {!r.phone && !r.email && "—"}
                    </div>
                  </td>
                  <td>{r.issue ?? "—"}</td>
                  <td><code style={{ fontSize: 11, color: "#9b8fa0" }}>{r.source ?? "—"}</code></td>
                  <td>
                    <select
                      value={r.status}
                      onChange={(e) => setStatus(r.id, e.target.value as HelpRequest["status"])}
                      style={{
                        background: tone(r.status).bg,
                        color: tone(r.status).fg,
                        border: "none",
                        padding: "4px 10px",
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: "capitalize",
                        cursor: "pointer",
                      }}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ maxWidth: 320 }}>
                    {openId === r.id ? (
                      <>
                        <div style={{ whiteSpace: "pre-wrap", fontSize: 13, color: "#1e1b24" }}>{r.message}</div>
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
                        style={{
                          fontSize: 12, color: "#745475", background: "none",
                          border: "none", cursor: "pointer", padding: 0, fontWeight: 600,
                          textAlign: "left",
                        }}
                      >
                        {r.message.length > 60 ? r.message.slice(0, 60) + "…" : r.message}
                      </button>
                    )}
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

function tone(s: HelpRequest["status"]) {
  if (s === "resolved")    return { bg: "#dcfce7", fg: "#166534" };
  if (s === "in_progress") return { bg: "#dbeafe", fg: "#1e40af" };
  return                        { bg: "#fef3c7", fg: "#92400e" };
}
