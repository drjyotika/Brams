"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { API_BASE } from "../../../../lib/config";
import { BramsLoader } from "../../../../components/BramsLoader";
import adminStyles from "../../admin.module.scss";
import { PostForm, type PostFormValues } from "../PostForm";

type ApiPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image: string | null;
  body_markdown: string;
  meta_title: string | null;
  meta_description: string | null;
  tags: string[];
  status: "draft" | "published";
};

export default function EditBlogPostPage() {
  const { id } = useParams<{ id: string }>();
  const [values, setValues] = useState<PostFormValues | null>(null);
  const [error, setError]   = useState("");

  useEffect(() => {
    if (!id) return;
    fetch(`${API_BASE}/admin/blog/${id}`)
      .then(async (r) => {
        const d: ApiPost = await r.json();
        if (!r.ok) throw new Error((d as unknown as { error: string }).error ?? `HTTP ${r.status}`);
        setValues({
          id:                d.id,
          slug:              d.slug,
          title:             d.title,
          excerpt:           d.excerpt ?? "",
          cover_image:       d.cover_image ?? "",
          body_markdown:     d.body_markdown,
          meta_title:        d.meta_title ?? "",
          meta_description:  d.meta_description ?? "",
          tags:              d.tags.join(", "),
          status:            d.status,
        });
      })
      .catch((e) => setError((e as Error).message));
  }, [id]);

  return (
    <div>
      <div className={adminStyles.pageHeader}>
        <Link href="/admin/blog" style={{ fontSize: 13, color: "#9b8fa0" }}>← Blog</Link>
        <h1 className={adminStyles.pageTitle} style={{ marginTop: 8 }}>Edit Post</h1>
      </div>
      {error && <p style={{ color: "#dc2626" }}>{error}</p>}
      {!values && !error ? <BramsLoader /> : values && <PostForm initial={values} postId={id} />}
    </div>
  );
}
