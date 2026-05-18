import { NextRequest, NextResponse } from "next/server";
import {
  updateAlternativeRequest,
  type AltRequestStatus,
} from "../../../../lib/alternative-requests";

const VALID_STATUSES: AltRequestStatus[] = ["new", "contacted", "resolved"];

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body   = await req.json() as { status?: string; admin_notes?: string };

    const status = body.status && VALID_STATUSES.includes(body.status as AltRequestStatus)
      ? (body.status as AltRequestStatus)
      : undefined;

    await updateAlternativeRequest(id, {
      status,
      admin_notes: body.admin_notes?.trim() || undefined,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
