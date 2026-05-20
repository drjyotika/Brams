import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "../../../../../lib/auth";

/**
 * POST /api/admin/newsletter/upload
 *
 * Accepts a multipart/form-data with a single `file` field (image).
 * Uploads it to Vercel Blob with public access (required so email clients
 * can fetch the image) and returns the public URL.
 */
export async function POST(req: NextRequest) {
  // Admin-only
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

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    // Validate MIME type
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowed.includes(file.type)) {
      return NextResponse.json(
        { error: "Only JPEG, PNG, GIF and WebP images are allowed." },
        { status: 400 },
      );
    }

    // 5 MB limit
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Image must be under 5 MB." }, { status: 400 });
    }

    const { put } = await import("@vercel/blob");

    const ext  = file.name.split(".").pop() ?? "jpg";
    const name = `newsletter/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const blob = await put(name, file.stream(), {
      access:         "public",   // Must be public for email clients to load it
      contentType:    file.type,
      addRandomSuffix: false,
    });

    return NextResponse.json({ ok: true, url: blob.url, contentType: file.type, size: file.size });
  } catch (e) {
    console.error("[newsletter/upload] failed:", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
