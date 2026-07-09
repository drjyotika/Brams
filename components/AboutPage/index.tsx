import type { AboutData } from "../../lib/about";
import { Icon } from "../Icon";
import styles from "./AboutPage.module.scss";

/**
 * Visible "About Dr. Jyotika" authority page. Renders only the credential
 * fields that are filled in (registration, experience, memberships, languages)
 * so nothing unverified is shown.
 */
export function AboutPage({ data, bookHref }: { data: AboutData; bookHref: string }) {
  const hasRegistration = !!(data.registrationNumber || data.registrationCouncil);
  const showCredentials =
    hasRegistration ||
    !!data.experienceYears ||
    data.memberships.length > 0 ||
    data.languages.length > 0;

  return (
    <main className={styles.page}>
      {/* ── Intro ─────────────────────────────────────────────────────────── */}
      <section className={styles.intro}>
        <div className={styles.introInner}>
          <div className={styles.introCopy}>
            <span className={styles.eyebrow}>{data.eyebrow}</span>
            <h1 className={styles.name}>{data.name}</h1>
            <p className={styles.role}>{data.role}</p>
            <p className={styles.lede}>{data.intro}</p>
            <div className={styles.actions}>
              <a href={bookHref} className={styles.primary}>Book a consultation</a>
              <a href="/#consultations" className={styles.secondary}>View plans</a>
            </div>
          </div>

          <div className={styles.portraitWrap}>
            <div className={styles.portrait}>
              <picture>
                {data.photo === "/hero.png" && (
                  <>
                    <source srcSet="/hero.webp" type="image/webp" />
                    <source srcSet="/hero.jpg" type="image/jpeg" />
                  </>
                )}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={data.photo} alt={`${data.name}, ${data.role}`} />
              </picture>
            </div>
            {data.qualifications.length > 0 && (
              <div className={styles.badge}>
                <span className={styles.badgeIcon}><Icon name="badge-check" size={18} /></span>
                <span className={styles.badgeText}>
                  {data.qualifications.map((q) => q.label).join(" · ")}
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Detail grid ───────────────────────────────────────────────────── */}
      <section className={styles.detail}>
        <div className={styles.detailInner}>

          {data.qualifications.length > 0 && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Qualifications</h2>
              <ul className={styles.list}>
                {data.qualifications.map((q) => (
                  <li key={q.id} className={styles.listItem}>
                    <span className={styles.tick}><Icon name="check" size={14} strokeWidth={2.4} /></span>
                    {q.label}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.specialties.length > 0 && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Areas of focus</h2>
              <div className={styles.chips}>
                {data.specialties.map((s) => (
                  <span key={s} className={styles.chip}>{s}</span>
                ))}
              </div>
            </div>
          )}

          {showCredentials && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Credentials</h2>
              <dl className={styles.kv}>
                {hasRegistration && (
                  <div className={styles.kvRow}>
                    <dt>Medical registration</dt>
                    <dd>
                      {[data.registrationNumber, data.registrationCouncil].filter(Boolean).join(" · ")}
                    </dd>
                  </div>
                )}
                {data.experienceYears && (
                  <div className={styles.kvRow}>
                    <dt>Experience</dt>
                    <dd>{data.experienceYears} years</dd>
                  </div>
                )}
                {data.memberships.length > 0 && (
                  <div className={styles.kvRow}>
                    <dt>Memberships</dt>
                    <dd>{data.memberships.join(", ")}</dd>
                  </div>
                )}
                {data.languages.length > 0 && (
                  <div className={styles.kvRow}>
                    <dt>Consultation languages</dt>
                    <dd>{data.languages.join(", ")}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          <div className={`${styles.card} ${styles.approachCard}`}>
            <h2 className={styles.cardTitle}>Approach to care</h2>
            <p className={styles.approach}>{data.approach}</p>
          </div>
        </div>
      </section>
    </main>
  );
}
