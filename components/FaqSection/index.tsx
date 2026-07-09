import type { FaqData } from "../../lib/faq";
import { faqAnchorId } from "../../lib/faq";
import styles from "./FaqSection.module.scss";

/**
 * Visible FAQ section. Uses native <details>/<summary> so the answers are in
 * the DOM (crawlable, no JS needed) and fully keyboard-accessible. Mirrors the
 * FAQPage JSON-LD (both driven by the admin-editable `faq` content).
 */
export function FaqSection({ data }: { data: FaqData }) {
  if (!data?.items?.length) return null;

  return (
    <section className={styles.section} id="faq" aria-labelledby="faq-title">
      <div className={styles.inner}>
        <header className={styles.head} data-reveal>
          <span className={styles.eyebrow}>FAQ</span>
          <h2 id="faq-title" className={styles.title}>
            {data.title}
          </h2>
          {data.description && (
            <p className={styles.description}>{data.description}</p>
          )}
        </header>

        <div className={styles.list} data-reveal-stagger>
          {data.items.map((item) => {
            const id = faqAnchorId(item.question);
            return (
              <details key={item.id} id={id} className={styles.item} data-reveal>
                <summary className={styles.question}>
                  {/* Heading gives crawlers a Q outline; deep-linking to the id
                      auto-expands this <details> in modern browsers. */}
                  <h3 className={styles.questionText}>{item.question}</h3>
                  <span className={styles.icon} aria-hidden="true" />
                </summary>
                <div className={styles.answer}>
                  <p>{item.answer}</p>
                </div>
              </details>
            );
          })}
        </div>
      </div>
    </section>
  );
}
