import type { FooterData } from "../../lib/content";
import styles from "./Footer.module.scss";

export type FooterProps = { data: FooterData };

export function Footer({ data }: FooterProps) {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brandCol}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt={data.brand} className={styles.logo} />
          <p className={styles.copy}>{data.copyright}</p>
        </div>
        <div className={styles.linksGrid}>
          {data.columns.map((col, idx) => (
            <div key={idx} className={styles.col}>
              {col.links.map((link) => (
                <a key={link.href} href={link.href} className={styles.link}>
                  {link.label}
                </a>
              ))}
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}
