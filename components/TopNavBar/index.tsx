import type { NavData } from "../../lib/content";
import styles from "./TopNavBar.module.scss";

export type TopNavBarProps = { data: NavData };

export function TopNavBar({ data }: TopNavBarProps) {
  return (
    <header className={styles.nav}>
      <div className={styles.inner}>
        <a href="/" className={styles.brand} aria-label={data.brand}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt={data.brand} className={styles.logo} />
        </a>
        <nav className={styles.links} aria-label="Primary">
          {data.links.map((link) => (
            <a key={link.href} href={link.href} className={styles.link}>
              {link.label}
            </a>
          ))}
        </nav>
        <a href={data.cta.href} className={styles.cta}>
          {data.cta.label}
        </a>
      </div>
    </header>
  );
}
