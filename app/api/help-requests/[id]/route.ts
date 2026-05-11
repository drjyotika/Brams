import { NextRequest, NextResponse } from "next/server";
import {
  getHelpRequestById,
  updateHelpRequest,
  type HelpStatus,
} from "../../../../lib/help";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const row = await getHelpRequestById(id);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = (await req.json()) as { status?: HelpStatus; admin_notes?: string };
  await updateHelpRequest(id, body);
  return NextResponse.json({ ok: true });
}
