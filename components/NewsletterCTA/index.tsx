"use client";

import { useState, type FormEvent } from "react";
import type { NewsletterData } from "../../lib/content";
import styles from "./NewsletterCTA.module.scss";

export type NewsletterCTAProps = {
  data: NewsletterData;
  onSubscribe?: (email: string) => Promise<void> | void;
};

export function NewsletterCTA({ data, onSubscribe }: NewsletterCTAProps) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    try {
      await onSubscribe?.(email);
      setEmail("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.outer}>
      <section className={styles.cta} aria-labelledby="cta-title">
        <div className={styles.body}>
          <h2 id="cta-title" className={styles.title}>
            {data.title}
          </h2>
          <p className={styles.description}>{data.description}</p>
        </div>
        <form className={styles.form} onSubmit={handleSubmit}>
          <input
            type="email"
            required
            className={styles.input}
            placeholder={data.inputPlaceholder}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label={data.inputPlaceholder}
          />
          <button type="submit" className={styles.button} disabled={submitting}>
            {submitting ? "…" : data.buttonLabel}
          </button>
        </form>
      </section>
    </div>
  );
}
