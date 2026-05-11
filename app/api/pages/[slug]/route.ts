import { NextResponse } from "next/server";
import { getPage, updatePage } from "../../../../lib/pages";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const page = await getPage(slug);
    if (!page) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json(page);
  } catch (err) {
    return NextResponse.json({ error: "Failed." }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const { content } = await req.json();
    await updatePage(slug, content ?? "");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/pages PUT]", err);
    return NextResponse.json({ error: "Failed to update page." }, { status: 500 });
  }
}
