import type { HeroData } from "../../lib/content";
import { Icon } from "../Icon";
import styles from "./HeroSection.module.scss";

export type HeroSectionProps = { data: HeroData };

export function HeroSection({ data }: HeroSectionProps) {
  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.inner}>
        <div>
          <span className={styles.eyebrow}>{data.eyebrow}</span>
          <h1 id="hero-title" className={styles.title}>
            {data.titleLead}
            <span>{data.titleAccent}</span>
          </h1>
          <p className={styles.description}>{data.description}</p>
          <div className={styles.actions}>
            <a href={data.primaryCta.href} className={styles.primary}>
              {data.primaryCta.label}
            </a>
            <a href={data.secondaryCta.href} className={styles.secondary}>
              {data.secondaryCta.label}
            </a>
          </div>
        </div>

        <div className={styles.portraitWrap}>
          <div className={styles.portrait}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={data.portrait.src} alt={data.portrait.alt} />
          </div>
          <div className={styles.badge}>
            <div className={styles.badgeRow}>
              <span className={styles.badgeIcon}>
                <Icon name="badge-check" size={18} />
              </span>
              <span className={styles.badgeLabel}>{data.badge.label}</span>
            </div>
            <p className={styles.badgeQuote}>&ldquo;{data.badge.quote}&rdquo;</p>
          </div>
        </div>
      </div>
    </section>
  );
}
