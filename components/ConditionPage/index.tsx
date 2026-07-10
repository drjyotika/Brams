import type { ConditionItem } from "../../lib/conditions";
import { Icon } from "../Icon";
import styles from "./ConditionPage.module.scss";

/**
 * Visible condition landing page. Rendered from admin-editable content and
 * mirrored by MedicalWebPage + FAQPage JSON-LD (see JsonLd → ConditionLd).
 */
export function ConditionPage({ data, bookHref }: { data: ConditionItem; bookHref: string }) {
  return (
    <main className={styles.page}>
      {/* ── Intro ─────────────────────────────────────────────────────────── */}
      <section className={styles.intro}>
        <div className={styles.introInner}>
          <span className={styles.eyebrow}>{data.name}</span>
          <h1 className={styles.h1}>{data.h1}</h1>
          <p className={styles.lede}>{data.intro}</p>
          <div className={styles.actions}>
            <a href={bookHref} className={styles.primary}>Book a consultation</a>
            <a href="/about" className={styles.secondary}>Meet Dr. Jyotika</a>
          </div>
        </div>
      </section>

      <section className={styles.body}>
        <div className={styles.bodyInner}>
          {/* ── Symptoms ────────────────────────────────────────────────── */}
          {data.symptoms.length > 0 && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>{data.symptomsTitle}</h2>
              <ul className={styles.symptoms}>
                {data.symptoms.map((s, i) => (
                  <li key={i} className={styles.symptom}>
                    <span className={styles.tick}><Icon name="check" size={14} strokeWidth={2.4} /></span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ── Treatment ───────────────────────────────────────────────── */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>{data.treatmentTitle}</h2>
            <p className={styles.treatment}>{data.treatment}</p>
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      {data.faqs.length > 0 && (
        <section className={styles.faq} aria-labelledby="cond-faq-title">
          <div className={styles.faqInner}>
            <h2 id="cond-faq-title" className={styles.faqTitle}>Frequently asked questions</h2>
            <div className={styles.faqList}>
              {data.faqs.map((f) => (
                <details key={f.id} id={`faq-${f.id}`} className={styles.item}>
                  <summary className={styles.question}>
                    <h3 className={styles.questionText}>{f.question}</h3>
                    <span className={styles.icon} aria-hidden="true" />
                  </summary>
                  <div className={styles.answer}><p>{f.answer}</p></div>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Closing CTA ───────────────────────────────────────────────────── */}
      <section className={styles.cta}>
        <div className={styles.ctaInner}>
          <h2 className={styles.ctaTitle}>Take the first step toward feeling better</h2>
          <p className={styles.ctaText}>
            Confidential, evidence-based care with Dr. Jyotika Kanwar — from the comfort of home.
          </p>
          <a href={bookHref} className={styles.primary}>Book a consultation</a>
        </div>
      </section>
    </main>
  );
}
