import type { SupportCard, SupportData, SupportTone } from "../../lib/content";
import { Icon } from "../Icon";
import styles from "./SpecializedSupport.module.scss";

const TONE_CLASS: Record<SupportTone, string> = {
  sky: styles.toneSky,
  lilac: styles.toneLilac,
  muted: styles.toneMuted,
  dark: styles.toneDark,
};

export type SpecializedSupportProps = { data: SupportData };

export function SpecializedSupport({ data }: SpecializedSupportProps) {
  return (
    <section className={styles.section} id="services" aria-labelledby="support-title">
      <div className={styles.inner}>
        <header className={styles.head}>
          <div className={styles.headText}>
            <h2 id="support-title" className={styles.title}>
              {data.title}
            </h2>
            <p className={styles.description}>{data.description}</p>
          </div>
          <a className={styles.viewAll} href={data.link.href}>
            {data.link.label}
            <Icon name="arrow-right" size={16} />
          </a>
        </header>

        <div className={styles.grid}>
          {data.cards.map((card) => (
            <Card key={card.id} card={card} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Card({ card }: { card: SupportCard }) {
  const cls = [styles.card, TONE_CLASS[card.tone], card.span === "wide" ? styles.cardWide : ""]
    .filter(Boolean)
    .join(" ");

  if (card.tone === "dark") {
    return (
      <article className={cls}>
        <div className={styles.darkBody}>
          <h3 className={styles.cardTitle}>{card.title}</h3>
          <p className={styles.cardBody}>{card.description}</p>
          {card.cta && (
            <a className={styles.cardCta} href={card.cta.href}>
              {card.cta.label}
            </a>
          )}
        </div>
        {card.imageSrc && (
          <div className={styles.cardImage}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={card.imageSrc} alt="" />
          </div>
        )}
      </article>
    );
  }

  return (
    <article className={cls}>
      <span className={styles.icon}>
        <Icon name={card.iconName} size={28} />
      </span>
      <h3 className={styles.cardTitle}>{card.title}</h3>
      <p className={styles.cardBody}>{card.description}</p>
      {card.imageSrc && (
        <div className={styles.cardImage}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={card.imageSrc} alt="" />
        </div>
      )}
      {card.meta && <div className={styles.cardMeta}>{card.meta}</div>}
    </article>
  );
}
