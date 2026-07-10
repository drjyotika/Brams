import { NextRequest } from "next/server";

type Ctx = { params: Promise<{ path: string[] }> };

/**
 * GET /api/media/[...path]
 *
 * Public image proxy. Streams an image stored in the PRIVATE Vercel Blob store
 * (fetched server-side with the Bearer token) so it can be loaded by browsers.
 * Restricted to the `site-media/` namespace and image content-types so it can
 * never expose site content JSON or other blobs. Long-cached (filenames are
 * unique/immutable) so the blob is fetched rarely.
 */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  const pathname = (path ?? []).join("/");

  if (!pathname.startsWith("site-media/")) {
    return new Response("Not found", { status: 404 });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: pathname });
    const found = blobs.find((b) => b.pathname === pathname);
    if (!found) return new Response("Not found", { status: 404 });

    const res = await fetch(found.url, {
      headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
      cache:   "no-store",
    });
    if (!res.ok || !res.body) return new Response("Not found", { status: 404 });

    const contentType = res.headers.get("content-type") ?? "application/octet-stream";
    if (!contentType.startsWith("image/")) {
      return new Response("Not found", { status: 404 });
    }

    return new Response(res.body, {
      headers: {
        "Content-Type":  contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (e) {
    console.error("[media proxy] failed:", e);
    return new Response("Not found", { status: 404 });
  }
}
