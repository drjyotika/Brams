import type { ReactNode } from "react";
import type { NavData } from "../../lib/content";
import styles from "./TopNavBar.module.scss";

export type TopNavBarProps = {
  data: NavData;
  /** When true, omits the primary nav links (Specialized Services, etc.). */
  hideLinks?: boolean;
  /** Custom CTA slot — when provided, replaces the default "Book Session" link. */
  ctaSlot?: ReactNode;
};

export function TopNavBar({ data, hideLinks, ctaSlot }: TopNavBarProps) {
  return (
    <header className={styles.nav}>
      <div className={styles.inner}>
        <a href="/" className={styles.brand} aria-label={data.brand}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt={data.brand} className={styles.logo} />
        </a>
        {!hideLinks && (
          <nav className={styles.links} aria-label="Primary">
            {data.links.map((link, i) => (
              <a key={i} href={link.href} className={styles.link}>
                {link.label}
              </a>
            ))}
          </nav>
        )}
        {ctaSlot ?? (
          <a href={data.cta.href} className={styles.cta}>
            {data.cta.label}
          </a>
        )}
      </div>
    </header>
  );
}
