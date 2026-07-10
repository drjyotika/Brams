"use client";

import Link from "next/link";
import adminStyles from "../../admin.module.scss";
import { PostForm, EMPTY_POST } from "../PostForm";

export default function NewBlogPostPage() {
  return (
    <div>
      <div className={adminStyles.pageHeader}>
        <Link href="/admin/blog" style={{ fontSize: 13, color: "#9b8fa0" }}>← Blog</Link>
        <h1 className={adminStyles.pageTitle} style={{ marginTop: 8 }}>New Post</h1>
      </div>
      <PostForm initial={EMPTY_POST} />
    </div>
  );
}
