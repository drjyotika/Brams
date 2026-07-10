"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { API_BASE } from "../../../lib/config";
import { BramsLoader } from "../../../components/BramsLoader";
import adminStyles from "../admin.module.scss";
import styles from "./blog.module.scss";

type PostStatus = "draft" | "published";

type BlogPost = {
  id: string;
  slug: string;
  title: string;
  status: PostStatus;
  published_at: string | null;
  updated_at: string;
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function BlogListPage() {
  const [posts, setPosts]     = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/admin/blog`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? `HTTP ${r.status}`);
        setPosts(d);
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string, title: string) {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`${API_BASE}/admin/blog/${id}`, { method: "DELETE" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? `HTTP ${res.status}`);
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) return <BramsLoader />;

  return (
    <div>
      <div className={adminStyles.pageHeader} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 className={adminStyles.pageTitle}>Blog</h1>
        </div>
        <Link href="/admin/blog/new" className={adminStyles.primary}>+ New Post</Link>
      </div>

      {error && <p style={{ color: "#dc2626", marginBottom: 16 }}>{error}</p>}

      <div className={adminStyles.panel}>
        {posts.length === 0 ? (
          <p className={styles.empty}>No posts yet. Create your first one.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Published</th>
                <th>Updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className={styles.titleCell}>{p.title}</div>
                    <div className={styles.slugCell}>/blog/{p.slug}</div>
                  </td>
                  <td>
                    <span className={`${styles.pill} ${p.status === "published" ? styles.pillPublished : styles.pillDraft}`}>
                      {p.status}
                    </span>
                  </td>
                  <td>{fmtDate(p.published_at)}</td>
                  <td>{fmtDate(p.updated_at)}</td>
                  <td>
                    <div className={styles.rowActions}>
                      <Link href={`/admin/blog/${p.id}`} className={styles.rowLink}>Edit</Link>
                      {p.status === "published" && (
                        <a href={`/blog/${p.slug}`} target="_blank" rel="noreferrer" className={styles.rowLink}>View</a>
                      )}
                      <button
                        type="button"
                        className={adminStyles.danger}
                        onClick={() => handleDelete(p.id, p.title)}
                        disabled={deletingId === p.id}
                      >
                        {deletingId === p.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
