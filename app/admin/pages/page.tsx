import Link from "next/link";
import styles from "./pages.module.scss";

const PAGES = [
  { slug: "privacy-policy",    title: "Privacy Policy",           url: "/privacy-policy"    },
  { slug: "confidentiality",   title: "Confidentiality Agreement",url: "/confidentiality"   },
  { slug: "terms",             title: "Terms of Service",         url: "/terms"             },
  { slug: "emergency-contact", title: "Emergency Contact",        url: "/emergency-contact" },
  { slug: "contact",           title: "Contact Us",               url: "/contact"           },
];

export default function PagesListPage() {
  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Static Pages</h1>
      </div>
      <div className={styles.list}>
        {PAGES.map((p) => (
          <div key={p.slug} className={styles.row}>
            <div>
              <p className={styles.pageTitle}>{p.title}</p>
              <p className={styles.pageUrl}>{p.url}</p>
            </div>
            <div className={styles.actions}>
              <a href={p.url} target="_blank" rel="noreferrer" className={styles.previewBtn}>Preview ↗</a>
              <Link href={`/admin/pages/${p.slug}`} className={styles.editBtn}>Edit</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
