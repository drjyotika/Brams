/**
 * Blog engine — DB-backed (not the site-content JSON blob), since posts
 * accumulate indefinitely and long-form bodies would bloat and slow down the
 * single content blob every page reads. Mirrors lib/coupons.ts: a dedicated
 * table + admin CRUD, consistent with how the rest of the app stores
 * unbounded, growing data.
 *
 * Table: blog_posts
 */

import { sql } from "./db";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PostStatus = "draft" | "published";

export type BlogPost = {
  id:               string;
  slug:             string;
  title:            string;
  excerpt:          string | null;
  cover_image:      string | null;
  body_markdown:    string;
  meta_title:       string | null;
  meta_description: string | null;
  tags:             string[];
  status:           PostStatus;
  published_at:     string | null;
  created_at:       string;
  updated_at:       string;
};

export type BlogPostInput = {
  slug:             string;
  title:            string;
  excerpt?:         string | null;
  cover_image?:     string | null;
  body_markdown:    string;
  meta_title?:      string | null;
  meta_description?: string | null;
  tags?:            string[];
  status?:          PostStatus;
};

// ─── Schema (idempotent) ──────────────────────────────────────────────────────

let schemaMigrated = false;

export async function ensureBlogSchema(): Promise<void> {
  if (schemaMigrated) return;

  await sql`
    CREATE TABLE IF NOT EXISTS blog_posts (
      id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      slug              VARCHAR(200) UNIQUE NOT NULL,
      title             TEXT        NOT NULL,
      excerpt           TEXT,
      cover_image       TEXT,
      body_markdown     TEXT        NOT NULL,
      meta_title        TEXT,
      meta_description  TEXT,
      tags              TEXT        NOT NULL DEFAULT '',
      status            VARCHAR(10) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
      published_at      TIMESTAMPTZ,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_blog_posts_status_pub ON blog_posts (status, published_at DESC)`;

  schemaMigrated = true;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tagsToArray(tags: string): string[] {
  return tags.split(",").map((t) => t.trim()).filter(Boolean);
}

function rowToPost(row: Record<string, unknown>): BlogPost {
  return {
    id:               row.id as string,
    slug:             row.slug as string,
    title:            row.title as string,
    excerpt:          (row.excerpt as string) ?? null,
    cover_image:      (row.cover_image as string) ?? null,
    body_markdown:    row.body_markdown as string,
    meta_title:       (row.meta_title as string) ?? null,
    meta_description: (row.meta_description as string) ?? null,
    tags:             tagsToArray((row.tags as string) ?? ""),
    status:           row.status as PostStatus,
    published_at:     row.published_at ? new Date(row.published_at as string).toISOString() : null,
    created_at:       new Date(row.created_at as string).toISOString(),
    updated_at:       new Date(row.updated_at as string).toISOString(),
  };
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180);
}

// ─── Admin: list / read / write ────────────────────────────────────────────────

export async function listAllPosts(): Promise<BlogPost[]> {
  await ensureBlogSchema();
  const rows = await sql`SELECT * FROM blog_posts ORDER BY created_at DESC`;
  return rows.map(rowToPost);
}

export async function getPostById(id: string): Promise<BlogPost | null> {
  await ensureBlogSchema();
  const rows = await sql`SELECT * FROM blog_posts WHERE id = ${id} LIMIT 1`;
  return rows[0] ? rowToPost(rows[0]) : null;
}

export async function createPost(input: BlogPostInput): Promise<BlogPost> {
  await ensureBlogSchema();
  const status      = input.status ?? "draft";
  const publishedAt = status === "published" ? new Date().toISOString() : null;
  const rows = await sql`
    INSERT INTO blog_posts (
      slug, title, excerpt, cover_image, body_markdown,
      meta_title, meta_description, tags, status, published_at
    ) VALUES (
      ${input.slug}, ${input.title}, ${input.excerpt ?? null}, ${input.cover_image ?? null}, ${input.body_markdown},
      ${input.meta_title ?? null}, ${input.meta_description ?? null}, ${(input.tags ?? []).join(", ")},
      ${status}, ${publishedAt}
    )
    RETURNING *
  `;
  return rowToPost(rows[0]);
}

export async function updatePost(
  id: string,
  patch: Partial<BlogPostInput>,
): Promise<BlogPost | null> {
  await ensureBlogSchema();

  // Stamp published_at the first time a post transitions into "published".
  let publishedAt: string | null = null;
  if (patch.status === "published") {
    const existing = await getPostById(id);
    publishedAt = existing?.published_at ?? new Date().toISOString();
  }

  const rows = await sql`
    UPDATE blog_posts SET
      slug              = COALESCE(${patch.slug ?? null}, slug),
      title             = COALESCE(${patch.title ?? null}, title),
      excerpt           = COALESCE(${patch.excerpt ?? null}, excerpt),
      cover_image       = COALESCE(${patch.cover_image ?? null}, cover_image),
      body_markdown     = COALESCE(${patch.body_markdown ?? null}, body_markdown),
      meta_title        = COALESCE(${patch.meta_title ?? null}, meta_title),
      meta_description  = COALESCE(${patch.meta_description ?? null}, meta_description),
      tags              = COALESCE(${patch.tags ? patch.tags.join(", ") : null}, tags),
      status            = COALESCE(${patch.status ?? null}, status),
      published_at      = COALESCE(${publishedAt}, published_at),
      updated_at        = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0] ? rowToPost(rows[0]) : null;
}

export async function deletePost(id: string): Promise<boolean> {
  await ensureBlogSchema();
  const rows = await sql`DELETE FROM blog_posts WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}

// ─── Public: published posts ───────────────────────────────────────────────────

export async function listPublishedPosts(input: {
  limit?:  number;
  offset?: number;
} = {}): Promise<{ posts: BlogPost[]; total: number }> {
  await ensureBlogSchema();
  const limit  = input.limit  ?? 12;
  const offset = input.offset ?? 0;

  const [rows, countRows] = await Promise.all([
    sql`
      SELECT * FROM blog_posts
      WHERE status = 'published'
      ORDER BY published_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `,
    sql`SELECT COUNT(*)::int AS cnt FROM blog_posts WHERE status = 'published'`,
  ]);

  return {
    posts: rows.map(rowToPost),
    total: (countRows[0] as { cnt: number }).cnt,
  };
}

export async function getPublishedPostBySlug(slug: string): Promise<BlogPost | null> {
  await ensureBlogSchema();
  const rows = await sql`
    SELECT * FROM blog_posts WHERE slug = ${slug} AND status = 'published' LIMIT 1
  `;
  return rows[0] ? rowToPost(rows[0]) : null;
}

/** All published slugs — used to build the sitemap. */
export async function listPublishedSlugs(): Promise<{ slug: string; updated_at: string }[]> {
  await ensureBlogSchema();
  const rows = await sql`
    SELECT slug, updated_at FROM blog_posts WHERE status = 'published' ORDER BY published_at DESC
  `;
  return rows.map((r) => ({ slug: r.slug as string, updated_at: new Date(r.updated_at as string).toISOString() }));
}
