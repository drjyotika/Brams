import Link from "next/link";
import type { BlogPost } from "../../lib/blog";
import { renderMarkdown } from "../../lib/markdown";
import { ShareButtons } from "./ShareButtons";
import styles from "./BlogPostPage.module.scss";

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

export function BlogPostPage({ post, bookHref, url }: { post: BlogPost; bookHref: string; url: string }) {
  const html = renderMarkdown(post.body_markdown);

  return (
    <main className={styles.page}>
      <article className={styles.article}>
        <header className={styles.header}>
          <Link href="/blog" className={styles.back}>← All articles</Link>
          <h1 className={styles.h1}>{post.title}</h1>
          <div className={styles.meta}>
            <span>By Dr. Jyotika Kanwar</span>
            {post.published_at && (
              <>
                <span aria-hidden="true">·</span>
                <time dateTime={post.published_at}>{fmtDate(post.published_at)}</time>
              </>
            )}
          </div>
          {post.tags.length > 0 && (
            <div className={styles.tags}>
              {post.tags.map((t) => <span key={t} className={styles.tag}>{t}</span>)}
            </div>
          )}
          <ShareButtons url={url} title={post.title} />
        </header>

        {post.cover_image && (
          <div className={styles.coverWrap}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.cover_image} alt="" className={styles.cover} />
          </div>
        )}

        {/* Admin-authored Markdown — see lib/markdown.ts for the trust rationale. */}
        <div className={styles.body} dangerouslySetInnerHTML={{ __html: html }} />
      </article>

      <section className={styles.cta}>
        <div className={styles.ctaInner}>
          <h2 className={styles.ctaTitle}>Take the first step toward feeling better</h2>
          <p className={styles.ctaText}>
            Confidential, evidence-based care with Dr. Jyotika Kanwar — from the comfort of home.
          </p>
          <a href={bookHref} className={styles.ctaButton}>Book a consultation</a>
        </div>
      </section>
    </main>
  );
}
