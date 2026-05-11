import type { PricingData, PricingPlan } from "../../lib/content";
import { Icon } from "../Icon";
import styles from "./PricingPlans.module.scss";

export type PricingPlansProps = { data: PricingData };

export function PricingPlans({ data }: PricingPlansProps) {
  return (
    <section className={styles.section} id="consultations" aria-labelledby="pricing-title">
      <div className={styles.inner}>
        <header className={styles.head}>
          <h2 id="pricing-title" className={styles.title}>
            {data.title}
          </h2>
        </header>

        <div className={styles.grid}>
          {data.plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      </div>
    </section>
  );
}

function PlanCard({ plan }: { plan: PricingPlan }) {
  const cls = [styles.plan, plan.highlighted ? styles.planFeatured : ""].filter(Boolean).join(" ");
  const btnCls = [styles.button, !plan.highlighted && plan.id === "follow-up" ? styles.basicBtn : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={cls}>
      {plan.badge && <span className={styles.badge}>{plan.badge}</span>}
      <span className={styles.eyebrow}>{plan.eyebrow}</span>
      <h3 className={styles.planTitle}>{plan.title}</h3>
      <div className={styles.priceRow}>
        <span className={styles.price}>{plan.price}</span>
        <span className={styles.unit}>{plan.unit}</span>
      </div>
      <ul className={styles.features}>
        {plan.features.map((f, i) => (
          <li key={i} className={styles.feature}>
            <span className={styles.featureIcon}>
              <Icon name="check" size={14} strokeWidth={2.4} />
            </span>
            {f}
          </li>
        ))}
      </ul>
      <a href={plan.cta.href} className={btnCls}>
        {plan.cta.label}
      </a>
    </article>
  );
}
