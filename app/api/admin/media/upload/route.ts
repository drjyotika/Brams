import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "../../../../../lib/auth";

/**
 * POST /api/admin/media/upload  (admin-only)
 *
 * Uploads an image to the (private) Vercel Blob store under `site-media/` and
 * returns a STABLE public proxy URL (`/api/media/site-media/…`) that serves the
 * private blob through our own domain — because the store rejects public access
 * and pre-signed URLs 403.
 */
export async function POST(req: NextRequest) {
  const jar   = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token || !(await verifySessionToken(token))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "BLOB_READ_WRITE_TOKEN not configured. Image upload is unavailable." },
      { status: 503 },
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided." }, { status: 400 });

    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: "Only JPEG, PNG, GIF and WebP images are allowed." }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Image must be under 5 MB." }, { status: 400 });
    }

    const { put } = await import("@vercel/blob");
    const ext  = (file.name.split(".").pop() ?? "jpg").toLowerCase();
    const name = `site-media/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    // Private store — matches how site content is written (see lib/storage.ts).
    const blob = await put(name, file.stream(), {
      access:          "private",
      contentType:     file.type,
      addRandomSuffix: false,
    });

    // Return a proxy URL served publicly by /api/media/[...path].
    return NextResponse.json({ ok: true, url: `/api/media/${blob.pathname}` });
  } catch (e) {
    console.error("[media/upload] failed:", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
