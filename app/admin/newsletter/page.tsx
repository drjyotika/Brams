"use client";

import { useState } from "react";
import styles from "./newsletter.module.scss";

type SendResult = {
  ok:      boolean;
  total?:  number;
  sent?:   number;
  failed?: number;
  errors?: string[];
  error?:  string;
};

export default function NewsletterPage() {
  const [subject,         setSubject]         = useState("");
  const [preheader,       setPreheader]       = useState("");
  const [headline,        setHeadline]        = useState("");
  const [body,            setBody]            = useState("");
  const [ctaLabel,        setCtaLabel]        = useState("");
  const [ctaUrl,          setCtaUrl]          = useState("");
  const [unsubscribeUrl,  setUnsubscribeUrl]  = useState("");
  const [recipientMode,   setRecipientMode]   = useState<"all" | "custom">("all");
  const [customEmails,    setCustomEmails]    = useState("");
  const [sending,         setSending]         = useState(false);
  const [result,          setResult]          = useState<SendResult | null>(null);

  async function handleSend() {
    if (!subject.trim() || !headline.trim() || !body.trim()) return;
    if (ctaLabel.trim() && !ctaUrl.trim()) {
      setResult({ ok: false, error: "CTA URL is required when CTA label is set." });
      return;
    }
    const confirmMsg = recipientMode === "all"
      ? "Send this newsletter to ALL patients with an email address?"
      : `Send to ${customEmails.split(",").filter((e) => e.trim()).length} custom recipient(s)?`;
    if (!confirm(confirmMsg)) return;

    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/newsletter", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          subject:         subject.trim(),
          preheader:       preheader.trim() || undefined,
          headline:        headline.trim(),
          body:            body.trim(),
          ctaLabel:        ctaLabel.trim() || undefined,
          ctaUrl:          ctaUrl.trim()   || undefined,
          unsubscribeUrl:  unsubscribeUrl.trim() || undefined,
          recipientEmails: recipientMode === "custom" ? customEmails : undefined,
        }),
      });
      const data: SendResult = await res.json();
      setResult(data);
    } catch (e) {
      setResult({ ok: false, error: (e as Error).message });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Newsletter</h1>
      <p className={styles.sub}>
        Compose and send a broadcast email to patients. Each email is personalised
        with the patient&rsquo;s first name.
      </p>

      <div className={styles.card}>
        {/* Subject */}
        <div className={styles.field}>
          <label className={styles.label}>Subject *</label>
          <input
            className={styles.input}
            placeholder="e.g. Important update from Brams Mind Care"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        {/* Preheader */}
        <div className={styles.field}>
          <label className={styles.label}>Preheader</label>
          <span className={styles.hint}>Inbox preview text (~90 chars). Optional.</span>
          <input
            className={styles.input}
            placeholder="Short preview shown in inbox next to the subject…"
            value={preheader}
            onChange={(e) => setPreheader(e.target.value)}
            maxLength={100}
          />
        </div>

        {/* Headline */}
        <div className={styles.field}>
          <label className={styles.label}>Headline *</label>
          <span className={styles.hint}>Large heading inside the email card.</span>
          <input
            className={styles.input}
            placeholder="e.g. New session availability starting June"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
          />
        </div>

        {/* Body */}
        <div className={styles.field}>
          <label className={styles.label}>Body *</label>
          <span className={styles.hint}>Separate paragraphs with a blank line.</span>
          <textarea
            className={styles.textarea}
            style={{ minHeight: 160 }}
            placeholder={"First paragraph...\n\nSecond paragraph..."}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>

        <div className={styles.divider} />

        {/* CTA */}
        <div className={styles.row2}>
          <div className={styles.field}>
            <label className={styles.label}>CTA Button Label</label>
            <input
              className={styles.input}
              placeholder="e.g. Book a session"
              value={ctaLabel}
              onChange={(e) => setCtaLabel(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>CTA Button URL</label>
            <input
              className={styles.input}
              placeholder="https://bramsmindcare.com/book"
              value={ctaUrl}
              onChange={(e) => setCtaUrl(e.target.value)}
              disabled={!ctaLabel.trim()}
            />
          </div>
        </div>

        {/* Unsubscribe */}
        <div className={styles.field}>
          <label className={styles.label}>Unsubscribe URL</label>
          <span className={styles.hint}>Optional. Adds an unsubscribe link in the footer.</span>
          <input
            className={styles.input}
            placeholder="https://bramsmindcare.com/unsubscribe"
            value={unsubscribeUrl}
            onChange={(e) => setUnsubscribeUrl(e.target.value)}
          />
        </div>

        <div className={styles.divider} />

        {/* Recipients */}
        <div className={styles.field}>
          <label className={styles.label}>Recipients</label>
          <div className={styles.recipientToggle}>
            <button
              className={`${styles.toggleBtn} ${recipientMode === "all" ? styles.toggleBtnActive : ""}`}
              onClick={() => setRecipientMode("all")}
            >
              All patients with email
            </button>
            <button
              className={`${styles.toggleBtn} ${recipientMode === "custom" ? styles.toggleBtnActive : ""}`}
              onClick={() => setRecipientMode("custom")}
            >
              Custom list
            </button>
          </div>
          {recipientMode === "custom" && (
            <textarea
              className={styles.textarea}
              style={{ minHeight: 80 }}
              placeholder="email1@example.com, email2@example.com"
              value={customEmails}
              onChange={(e) => setCustomEmails(e.target.value)}
            />
          )}
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <button
            className={styles.sendBtn}
            onClick={handleSend}
            disabled={sending || !subject.trim() || !headline.trim() || !body.trim()}
          >
            {sending ? "Sending…" : "Send newsletter"}
          </button>
          {sending && <span style={{ fontSize: 13, color: "#71717a" }}>This may take a moment…</span>}
        </div>

        {/* Result */}
        {result && (
          <div className={`${styles.result} ${result.ok ? styles.success : styles.error}`}>
            {result.ok ? (
              <>
                ✓ Sent {result.sent} of {result.total} emails
                {result.failed ? ` (${result.failed} failed)` : ""}
                {result.errors && result.errors.length > 0 && (
                  <ul className={styles.errorList}>
                    {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                )}
              </>
            ) : (
              `Error: ${result.error}`
            )}
          </div>
        )}
      </div>
    </div>
  );
}
