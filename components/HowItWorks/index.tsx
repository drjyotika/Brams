import type { HowItWorksData, StepCard } from "../../lib/content";
import { Icon } from "../Icon";
import styles from "./HowItWorks.module.scss";

const BG_CLASS: Record<StepCard["iconBg"], string> = {
  lilac: styles.bgLilac,
  sky: styles.bgSky,
  lime: styles.bgLime,
};

export type HowItWorksProps = { data: HowItWorksData };

export function HowItWorks({ data }: HowItWorksProps) {
  return (
    <section className={styles.section} id="approach" aria-labelledby="how-title">
      <div className={styles.inner}>
        <header className={styles.head}>
          <h2 id="how-title" className={styles.title}>
            {data.title}
          </h2>
          <p className={styles.description}>{data.description}</p>
        </header>

        <div className={styles.grid}>
          {data.steps.map((step) => (
            <div key={step.id} className={styles.step}>
              <span className={styles.bigNumber} aria-hidden>
                {step.number}
              </span>
              <article className={styles.card}>
                <div className={styles.iconRow}>
                  <div className={`${styles.iconBox} ${BG_CLASS[step.iconBg]}`}>
                    <Icon name={step.iconName} size={25} strokeWidth={2.2} />
                  </div>
                  <span className={styles.inlineNumber} aria-hidden>
                    {step.number}
                  </span>
                </div>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepBody}>{step.description}</p>
              </article>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
