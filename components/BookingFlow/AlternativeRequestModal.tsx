"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { PlanInfo } from "./index";
// Reuse the same modal chrome + form styles as NeedHelpButton
import styles from "../NeedHelpButton/NeedHelpButton.module.scss";

type Props = {
  plan: PlanInfo;
  onClose: () => void;
};

export function AlternativeRequestModal({ plan, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Lock body scroll + Esc to close
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="alt-req-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <ModalBody plan={plan} onClose={onClose} />
    </div>,
    document.body,
  );
}

function ModalBody({ plan, onClose }: Props) {
  const [form, setForm] = useState({
    name:            "",
    phone:           "",
    email:           "",
    preferred_dates: "",
    notes:           "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const set = <K extends keyof typeof form>(k: K, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const canSubmit =
    form.name.trim().length > 1 &&
    form.phone.trim().length >= 7 &&
    form.preferred_dates.trim().length > 2;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/alternative-requests", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:            form.name.trim(),
          phone:           form.phone.trim(),
          email:           form.email.trim() || undefined,
          plan_id:         plan.id,
          preferred_dates: form.preferred_dates.trim(),
          notes:           form.notes.trim() || undefined,
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
    <div className={styles.modal}>
      <button
        type="button"
        className={styles.closeBtn}
        onClick={onClose}
        aria-label="Close"
      >
        ×
      </button>

      {submitted ? (
        <div className={styles.success}>
          <h3 id="alt-req-title">Request received ✓</h3>
          <p>
            We&rsquo;ve noted your preferred availability for a{" "}
            <strong>{plan.title}</strong> consultation. Our team will reach out
            shortly to confirm a time that works for you.
          </p>
          <button type="button" className={styles.primaryBtn} onClick={onClose}>
            Close
          </button>
        </div>
      ) : (
        <>
          <header className={styles.header}>
            <h3 id="alt-req-title">Request an alternative slot</h3>
            <p>
              Tell us when you&rsquo;re available and we&rsquo;ll find a{" "}
              <strong>{plan.title}</strong> slot that works for you.
            </p>
          </header>

          <div className={styles.row2}>
            <Field label="Full name *">
              <input
                className={styles.input}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Your full name"
              />
            </Field>
            <Field label="Phone number *">
              <input
                className={styles.input}
                type="tel"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+91 9876 543 210"
              />
            </Field>
          </div>

          <Field label="Email">
            <input
              className={styles.input}
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="name@example.com"
            />
          </Field>

          <Field label="Preferred dates / times *">
            <textarea
              className={styles.textarea}
              value={form.preferred_dates}
              onChange={(e) => set("preferred_dates", e.target.value)}
              placeholder="e.g. Weekday mornings, after 5 PM on Tue/Thu, any Saturday…"
              rows={3}
            />
          </Field>

          <Field label="Anything else we should know?">
            <textarea
              className={styles.textarea}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Reason for consultation, urgency, language preference, etc."
              rows={2}
            />
          </Field>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={onClose}
            >
              Cancel
            </button>
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
