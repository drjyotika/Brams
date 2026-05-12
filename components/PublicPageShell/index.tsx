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
  return (
    <>
      <TopNavBar data={toHomeLinks(content.nav)} />
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
