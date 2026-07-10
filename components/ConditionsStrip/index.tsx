import type { ConditionsData } from "../../lib/conditions";
import { Icon } from "../Icon";
import styles from "./ConditionsStrip.module.scss";

/** Homepage section linking to each condition landing page (internal linking + UX). */
export function ConditionsStrip({ data }: { data: ConditionsData }) {
  if (!data?.items?.length) return null;

  return (
    <section className={styles.section} id="conditions" aria-labelledby="conditions-title">
      <div className={styles.inner}>
        <header className={styles.head} data-reveal>
          <span className={styles.eyebrow}>{data.eyebrow}</span>
          <h2 id="conditions-title" className={styles.title}>{data.title}</h2>
          {data.description && <p className={styles.description}>{data.description}</p>}
        </header>

        <div className={styles.grid} data-reveal-stagger>
          {data.items.map((c) => (
            <a key={c.slug} href={`/conditions/${c.slug}`} className={styles.card} data-reveal>
              <span className={styles.cardName}>{c.name}</span>
              <span className={styles.cardLink}>
                Learn more <span aria-hidden="true">→</span>
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
