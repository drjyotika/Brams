import type { ReactNode } from "react";
import { readContent } from "../../lib/storage";
import { TopNavBar } from "../TopNavBar";
import { Footer } from "../Footer";
import styles from "./PublicPageShell.module.scss";

export async function PublicPageShell({ title, children }: { title: string; children: ReactNode }) {
  const content = await readContent();
  return (
    <>
      <TopNavBar data={content.nav} />
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
