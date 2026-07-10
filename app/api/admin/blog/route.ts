import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "../../../../lib/auth";
import { listAllPosts, createPost, slugify } from "../../../../lib/blog";

async function requireAdmin() {
  const jar   = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  return token ? verifySessionToken(token) : false;
}

/** GET /api/admin/blog — all posts (draft + published) */
export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const posts = await listAllPosts();
  return NextResponse.json(posts);
}

/** POST /api/admin/blog */
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();

    if (!body.title?.trim())         return NextResponse.json({ error: "Title is required." },         { status: 400 });
    if (!body.body_markdown?.trim()) return NextResponse.json({ error: "Body content is required." },  { status: 400 });

    const slug = slugify(body.slug?.trim() || body.title);
    if (!slug) return NextResponse.json({ error: "Could not derive a valid slug from the title." }, { status: 400 });

    const post = await createPost({
      slug,
      title:             body.title.trim(),
      excerpt:           body.excerpt?.trim() || null,
      cover_image:       body.cover_image?.trim() || null,
      body_markdown:     body.body_markdown,
      meta_title:        body.meta_title?.trim() || null,
      meta_description:  body.meta_description?.trim() || null,
      tags:              Array.isArray(body.tags) ? body.tags : [],
      status:            body.status === "published" ? "published" : "draft",
    });

    return NextResponse.json(post, { status: 201 });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return NextResponse.json({ error: "A post with this slug already exists." }, { status: 409 });
    }
    console.error("[admin/blog] POST failed:", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
