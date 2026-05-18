import type { ReactNode } from "react";
import type { NavData } from "../../lib/content";
import { readContent } from "../../lib/storage";
import { TopNavBar } from "../TopNavBar";
import { Footer } from "../Footer";
import styles from "./PublicPageShell.module.scss";

/** Prefix bare `#hash` hrefs with `/` so they point to homepage sections. */
function toHomeLinks(nav: NavData): NavData {
  const fix = (href: string) => (href.startsWith("#") ? `/${href}` : href);
  return {
    ...nav,
    links: nav.links.map((l) => ({ ...l, href: fix(l.href) })),
    cta: { ...nav.cta, href: fix(nav.cta.href) },
  };
}

export async function PublicPageShell({ title, children }: { title: string; children: ReactNode }) {
  const content = await readContent();
  const nav = toHomeLinks(content.nav);
  return (
    <>
      <TopNavBar
        data={nav}
        ctaSlot={
          <div className="topnav-cta-row">
            <a href="/patient/login" className="topnav-login-link">Login</a>
            <a href={nav.cta.href} className="topnav-primary-cta">{nav.cta.label}</a>
          </div>
        }
        mobileMenuItems={[
          { label: "Login", href: "/patient/login" },
          ...nav.links.map((l) => ({ label: l.label, href: l.href })),
        ]}
      />
      <main className={styles.main}>
        <div className={styles.container}>
          <h1 className={styles.title}>{title}</h1>
          <div className={styles.body}>{children}</div>
        </div>
      </main>
      <Footer data={content.footer} />
    </>
  );
}
