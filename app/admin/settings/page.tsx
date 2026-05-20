"use client";

import { useEffect, useState } from "react";
import styles from "./settings.module.scss";

type EmailSettings = {
  fromEmail:    string;
  replyToEmail: string;
  clinicEmail:  string;
  doctorEmail:  string;
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<EmailSettings>({
    fromEmail:    "",
    replyToEmail: "",
    clinicEmail:  "",
    doctorEmail:  "",
  });
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [toast,   setToast]   = useState<{ type: "success" | "error"; msg: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data: EmailSettings) => { setSettings(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function set(key: keyof EmailSettings, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setToast(null);
  }

  async function save() {
    setSaving(true);
    setToast(null);
    try {
      const res  = await fetch("/api/admin/settings", {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.ok) {
        setToast({ type: "success", msg: "Settings saved." });
      } else {
        setToast({ type: "error", msg: data.error ?? "Save failed." });
      }
    } catch (e) {
      setToast({ type: "error", msg: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p style={{ color: "#71717a", fontSize: 14 }}>Loading…</p>;

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Email Settings</h1>
      <p className={styles.sub}>
        Configure the addresses used for all outgoing emails. Changes take
        effect immediately — no redeploy needed.
      </p>

      <div className={styles.card}>
        <p className={styles.cardTitle}>Sending addresses</p>

        <div className={styles.field}>
          <label className={styles.label}>From address</label>
          <span className={styles.hint}>
            Shown as the sender in patients&apos; inboxes. Format:{" "}
            <code>Name &lt;email@domain.com&gt;</code>
          </span>
          <input
            className={styles.input}
            value={settings.fromEmail}
            onChange={(e) => set("fromEmail", e.target.value)}
            placeholder="Brams Mind Care <info@bramsmindcare.com>"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Reply-To address</label>
          <span className={styles.hint}>
            Where patient replies land. Usually the same as From.
          </span>
          <input
            className={styles.input}
            value={settings.replyToEmail}
            onChange={(e) => set("replyToEmail", e.target.value)}
            placeholder="info@bramsmindcare.com"
          />
        </div>
      </div>

      <div className={styles.card}>
        <p className={styles.cardTitle}>Notification recipients</p>

        <div className={styles.field}>
          <label className={styles.label}>Clinic notification email</label>
          <span className={styles.hint}>
            Receives alerts from the Contact form and &ldquo;Need Help&rdquo; form.
          </span>
          <input
            className={styles.input}
            value={settings.clinicEmail}
            onChange={(e) => set("clinicEmail", e.target.value)}
            placeholder="info@bramsmindcare.com"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Doctor&apos;s email</label>
          <span className={styles.hint}>
            Dr. Jyotika&apos;s direct address — used as reply-to on appointment emails.
          </span>
          <input
            className={styles.input}
            value={settings.doctorEmail}
            onChange={(e) => set("doctorEmail", e.target.value)}
            placeholder="drjyotika@bramsmindcare.com"
          />
        </div>
      </div>

      <div className={styles.actions}>
        <button className={styles.saveBtn} onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save settings"}
        </button>
        {toast && (
          <span className={`${styles.toast} ${styles[toast.type]}`}>
            {toast.msg}
          </span>
        )}
      </div>
    </div>
  );
}
