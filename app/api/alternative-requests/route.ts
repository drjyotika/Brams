import { NextRequest, NextResponse } from "next/server";
import {
  createAlternativeRequest,
  getAllAlternativeRequests,
} from "../../../lib/alternative-requests";

export async function GET() {
  const rows = await getAllAlternativeRequests();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, email, plan_id, preferred_dates, notes } = body as {
      name?:            string;
      phone?:           string;
      email?:           string;
      plan_id?:         string;
      preferred_dates?: string;
      notes?:           string;
    };

    if (!name?.trim())  return NextResponse.json({ error: "name is required" },  { status: 400 });
    if (!phone?.trim()) return NextResponse.json({ error: "phone is required" }, { status: 400 });

    const row = await createAlternativeRequest({
      name:            name.trim(),
      phone:           phone.trim(),
      email:           email?.trim()           || null,
      plan_id:         plan_id?.trim()         || null,
      preferred_dates: preferred_dates?.trim() || null,
      notes:           notes?.trim()           || null,
    });

    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    console.error("[alternative-requests] POST failed:", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
