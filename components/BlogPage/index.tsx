import Link from "next/link";
import type { BlogPost } from "../../lib/blog";
import styles from "./BlogPage.module.scss";

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function BlogPage({
  posts,
  page,
  totalPages,
}: {
  posts: BlogPost[];
  page: number;
  totalPages: number;
}) {
  return (
    <main className={styles.page}>
      <section className={styles.intro}>
        <div className={styles.introInner}>
          <span className={styles.eyebrow}>FROM THE PRACTICE</span>
          <h1 className={styles.h1}>Insights on mental health &amp; wellbeing</h1>
          <p className={styles.lede}>
            Articles from Dr. Jyotika Kanwar on anxiety, depression, ADHD, trauma, and everyday mental wellness.
          </p>
        </div>
      </section>

      <section className={styles.list}>
        <div className={styles.listInner}>
          {posts.length === 0 ? (
            <p className={styles.empty}>No articles published yet — check back soon.</p>
          ) : (
            <div className={styles.grid}>
              {posts.map((post) => (
                <Link key={post.id} href={`/blog/${post.slug}`} className={styles.card}>
                  {post.cover_image && (
                    <div className={styles.cardImageWrap}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={post.cover_image} alt="" className={styles.cardImage} />
                    </div>
                  )}
                  <div className={styles.cardBody}>
                    {post.published_at && <span className={styles.cardDate}>{fmtDate(post.published_at)}</span>}
                    <h2 className={styles.cardTitle}>{post.title}</h2>
                    {post.excerpt && <p className={styles.cardExcerpt}>{post.excerpt}</p>}
                    <span className={styles.cardLink}>Read more <span aria-hidden="true">→</span></span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <nav className={styles.pagination} aria-label="Blog pagination">
              {page > 1 && (
                <Link href={page - 1 === 1 ? "/blog" : `/blog?page=${page - 1}`} className={styles.pageLink}>
                  ← Newer
                </Link>
              )}
              <span className={styles.pageStatus}>Page {page} of {totalPages}</span>
              {page < totalPages && (
                <Link href={`/blog?page=${page + 1}`} className={styles.pageLink}>
                  Older →
                </Link>
              )}
            </nav>
          )}
        </div>
      </section>
    </main>
  );
}
