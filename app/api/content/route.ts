import { NextResponse } from "next/server";
import { readContent, writeContent, mergeContent } from "../../../lib/storage";
import type { SiteContent } from "../../../lib/content";

export async function GET() {
  const content = await readContent();
  return NextResponse.json(content);
}

// PUT replaces (or partially patches) the full content blob. Accepts either a
// complete SiteContent or any partial subset — missing keys keep their stored
// values, so the admin can save one section at a time.
export async function PUT(req: Request) {
  let body: Partial<SiteContent>;
  try {
    body = (await req.json()) as Partial<SiteContent>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const current = await readContent();
  const next = mergeContent(current, body);
  try {
    await writeContent(next);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const code = (err as NodeJS.ErrnoException).code ?? "unknown";
    console.error("[api/content] write failed", err);
    return NextResponse.json(
      { error: "Failed to write content", detail: message, code },
      { status: 500 }
    );
  }
  return NextResponse.json(next);
}
