import type { NewsletterData } from "../../lib/content";
import styles from "./NewsletterCTA.module.scss";

export type NewsletterCTAProps = {
  data: NewsletterData;
};

export function NewsletterCTA({ data }: NewsletterCTAProps) {
  return (
    <div className={styles.outer}>
      <section className={styles.cta} aria-labelledby="cta-title">
        <div className={styles.body}>
          <h2 id="cta-title" className={styles.title}>
            {data.title}
          </h2>
          <p className={styles.description}>{data.description}</p>
        </div>
        <div className={styles.actions}>
          <a href="#consultations" className={styles.button}>
            {data.buttonLabel}
          </a>
        </div>
      </section>
    </div>
  );
}
