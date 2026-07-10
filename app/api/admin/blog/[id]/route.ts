import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "../../../../../lib/auth";
import { getPostById, updatePost, deletePost, slugify } from "../../../../../lib/blog";

type Ctx = { params: Promise<{ id: string }> };

async function requireAdmin() {
  const jar   = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  return token ? verifySessionToken(token) : false;
}

/** GET /api/admin/blog/[id] */
export async function GET(_req: NextRequest, ctx: Ctx) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const post = await getPostById(id);
  if (!post) return NextResponse.json({ error: "Post not found." }, { status: 404 });
  return NextResponse.json(post);
}

/** PUT /api/admin/blog/[id] */
export async function PUT(req: NextRequest, ctx: Ctx) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await ctx.params;
    const body   = await req.json();

    const updates: Parameters<typeof updatePost>[1] = {};
    if (body.slug             !== undefined) updates.slug             = slugify(body.slug);
    if (body.title            !== undefined) updates.title            = body.title.trim();
    if (body.excerpt          !== undefined) updates.excerpt          = body.excerpt?.trim() || null;
    if (body.cover_image      !== undefined) updates.cover_image      = body.cover_image?.trim() || null;
    if (body.body_markdown    !== undefined) updates.body_markdown    = body.body_markdown;
    if (body.meta_title       !== undefined) updates.meta_title       = body.meta_title?.trim() || null;
    if (body.meta_description !== undefined) updates.meta_description = body.meta_description?.trim() || null;
    if (body.tags             !== undefined) updates.tags             = Array.isArray(body.tags) ? body.tags : [];
    if (body.status           !== undefined) updates.status           = body.status === "published" ? "published" : "draft";

    const updated = await updatePost(id, updates);
    if (!updated) return NextResponse.json({ error: "Post not found." }, { status: 404 });

    return NextResponse.json(updated);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return NextResponse.json({ error: "A post with this slug already exists." }, { status: 409 });
    }
    console.error("[admin/blog/:id] PUT failed:", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** DELETE /api/admin/blog/[id] */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const deleted = await deletePost(id);
  if (!deleted) return NextResponse.json({ error: "Post not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
