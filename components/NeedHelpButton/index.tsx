"use client";

import { useEffect, useState } from "react";
import { HELP_ISSUE_OPTIONS } from "../../lib/help";
import styles from "./NeedHelpButton.module.scss";

export function NeedHelpButton({ source }: { source?: string }) {
  const [open, setOpen] = useState(false);

  // Close on Esc
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button type="button" className={styles.trigger} onClick={() => setOpen(true)}>
        Need Help?
      </button>
      {open && <HelpModal source={source} onClose={() => setOpen(false)} />}
    </>
  );
}

function HelpModal({
  source,
  onClose,
}: {
  source?: string;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name:    "",
    phone:   "",
    email:   "",
    issue:   "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const canSubmit = form.name.trim().length > 1 && form.message.trim().length > 5;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/help-requests", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          name:    form.name,
          phone:   form.phone || undefined,
          email:   form.email || undefined,
          issue:   form.issue || undefined,
          message: form.message,
          source:  source || (typeof window !== "undefined" ? window.location.pathname : undefined),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to submit");
      }
      setSubmitted(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={styles.modal}>
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">×</button>

        {submitted ? (
          <div className={styles.success}>
            <h3 id="help-title">Thanks — we&rsquo;ll get back to you soon</h3>
            <p>Your message has been received. Our team will reach out to you shortly.</p>
            <button type="button" className={styles.primaryBtn} onClick={onClose}>Close</button>
          </div>
        ) : (
          <>
            <header className={styles.header}>
              <h3 id="help-title">Need help?</h3>
              <p>Tell us what&rsquo;s going on and our team will reach out.</p>
            </header>

            <div className={styles.row2}>
              <Field label="Your name *">
                <input
                  className={styles.input}
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Full name"
                />
              </Field>
              <Field label="Phone">
                <input
                  className={styles.input}
                  type="tel"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="+91 9876 543 210"
                />
              </Field>
            </div>

            <div className={styles.row2}>
              <Field label="Email">
                <input
                  className={styles.input}
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="name@example.com"
                />
              </Field>
              <Field label="Issue">
                <select
                  className={styles.input}
                  value={form.issue}
                  onChange={(e) => set("issue", e.target.value)}
                >
                  <option value="">Select category…</option>
                  {HELP_ISSUE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Details *">
              <textarea
                className={styles.textarea}
                value={form.message}
                onChange={(e) => set("message", e.target.value)}
                placeholder="Briefly describe what's happening so we can help you faster…"
                rows={4}
              />
            </Field>

            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.actions}>
              <button type="button" className={styles.secondaryBtn} onClick={onClose}>Cancel</button>
              <button
                type="button"
                className={styles.primaryBtn}
                disabled={!canSubmit || submitting}
                onClick={submit}
              >
                {submitting ? "Sending…" : "Send request"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      {children}
    </label>
  );
}
