import type { ReactNode } from "react";
import type { NavData } from "../../lib/content";
import styles from "./TopNavBar.module.scss";
import { MobileMenu, type MobileMenuItem } from "./MobileMenu";

export type TopNavBarProps = {
  data: NavData;
  /** When true, omits the primary nav links (Specialized Services, etc.) on desktop. */
  hideLinks?: boolean;
  /** Custom CTA slot — when provided, replaces the default "Book Session" link. */
  ctaSlot?: ReactNode;
  /**
   * Items shown inside the mobile hamburger menu (visible <768px).
   * If omitted, no hamburger is rendered on mobile.
   */
  mobileMenuItems?: MobileMenuItem[];
};

export function TopNavBar({ data, hideLinks, ctaSlot, mobileMenuItems }: TopNavBarProps) {
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
        <div className={styles.right}>
          {ctaSlot ?? (
            <a href={data.cta.href} className={styles.cta}>
              {data.cta.label}
            </a>
          )}
          {mobileMenuItems && mobileMenuItems.length > 0 && (
            <MobileMenu items={mobileMenuItems} />
          )}
        </div>
      </div>
    </header>
  );
}
