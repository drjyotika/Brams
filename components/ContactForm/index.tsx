"use client";

import { useState, type FormEvent } from "react";
import { trackLead } from "../../lib/analytics";
import styles from "./ContactForm.module.scss";

export function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "err">("idle");

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setStatus(res.ok ? "ok" : "err");
      if (res.ok) trackLead("contact_form");
    } catch { setStatus("err"); }
  };

  if (status === "ok") {
    return (
      <div className={styles.success}>
        <strong>Thank you!</strong> We've received your message and will be in touch shortly.
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label}>Name *</label>
          <input className={styles.input} value={form.name} onChange={set("name")} required />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Email *</label>
          <input className={styles.input} type="email" value={form.email} onChange={set("email")} required />
        </div>
      </div>
      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label}>Phone</label>
          <input className={styles.input} value={form.phone} onChange={set("phone")} />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Subject</label>
          <input className={styles.input} value={form.subject} onChange={set("subject")} />
        </div>
      </div>
      <div className={styles.field}>
        <label className={styles.label}>Message *</label>
        <textarea className={styles.textarea} value={form.message} onChange={set("message")} required rows={5} />
      </div>
      {status === "err" && <p className={styles.error}>Something went wrong. Please try again.</p>}
      <button type="submit" className={styles.btn} disabled={status === "sending"}>
        {status === "sending" ? "Sending…" : "Send Message"}
      </button>
    </form>
  );
}
