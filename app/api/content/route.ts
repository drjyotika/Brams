import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "../../../lib/auth";
import { readContent, writeContent, mergeContent } from "../../../lib/storage";
import type { SiteContent } from "../../../lib/content";

async function requireAdmin() {
  const jar   = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  return token ? verifySessionToken(token) : false;
}

// This route controls the entire site's homepage/FAQ/pricing/condition
// content, so both reading and writing it require an admin session — public
// pages read content directly via lib/storage.ts, not through this API.
export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const content = await readContent();
  return NextResponse.json(content);
}

// PUT replaces (or partially patches) the full content blob. Accepts either a
// complete SiteContent or any partial subset — missing keys keep their stored
// values, so the admin can save one section at a time.
export async function PUT(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
