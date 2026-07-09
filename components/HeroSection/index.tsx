import type { HeroData } from "../../lib/content";
import { Icon } from "../Icon";
import { ParallaxLayer } from "../motion/ParallaxLayer";
import styles from "./HeroSection.module.scss";

export type HeroSectionProps = { data: HeroData };

export function HeroSection({ data }: HeroSectionProps) {
  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.inner}>

        {/* ── Left column: copy ─────────────────────────────────────────── */}
        <div className={styles.copy}>
          <span className={`${styles.eyebrow} hero-eyebrow-enter`}>
            {data.eyebrow}
          </span>

          <h1 id="hero-title" className={`${styles.title} hero-title-enter`}>
            {data.titleLead}
            <span>{data.titleAccent}</span>
          </h1>

          <p className={`${styles.description} hero-desc-enter`}>
            {data.description}
          </p>

          <div className={`${styles.actions} hero-actions-enter`}>
            <a href={data.primaryCta.href} className={styles.primary}>
              {data.primaryCta.label}
            </a>
            <a href={data.secondaryCta.href} className={styles.secondary}>
              {data.secondaryCta.label}
            </a>
          </div>
        </div>

        {/* ── Right column: portrait + badge (parallax) ────────────────── */}
        <ParallaxLayer
          speed={0.12}
          className={`${styles.portraitWrap} hero-portrait-enter`}
        >
          <div className={styles.portrait}>
            <picture>
              {/* Optimized formats for the default portrait (1.6 MB PNG →
                  76 KB WebP). Custom admin-set portraits use their own src. */}
              {data.portrait.src === "/hero.png" && (
                <>
                  <source srcSet="/hero.webp" type="image/webp" />
                  <source srcSet="/hero.jpg" type="image/jpeg" />
                </>
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={data.portrait.src} alt={data.portrait.alt} />
            </picture>
          </div>

          <a href="/about" className={`${styles.badge} hero-badge-enter`} aria-label="Read more about Dr. Jyotika Kanwar">
            <div className={styles.badgeRow}>
              <span className={styles.badgeIcon}>
                <Icon name="badge-check" size={18} />
              </span>
              <span className={styles.badgeLabel}>{data.badge.label}</span>
            </div>
            <p className={styles.badgeQuote}>&ldquo;{data.badge.quote}&rdquo;</p>
            <span className={styles.badgeLink}>Meet Dr. Jyotika <span aria-hidden="true">→</span></span>
          </a>
        </ParallaxLayer>

      </div>
    </section>
  );
}
