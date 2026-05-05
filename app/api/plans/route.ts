import { NextResponse } from "next/server";
import { readContent, writeContent } from "../../../lib/storage";
import type { PricingPlan } from "../../../lib/content";

export async function GET() {
  const content = await readContent();
  return NextResponse.json(content.pricing.plans);
}

// POST appends a new plan. Auto-generates an id if not provided.
export async function POST(req: Request) {
  let plan: PricingPlan;
  try {
    plan = (await req.json()) as PricingPlan;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!plan.title || !plan.price) {
    return NextResponse.json({ error: "title and price are required" }, { status: 400 });
  }

  const current = await readContent();
  const id = plan.id || `plan-${Date.now()}`;
  const next = {
    ...current,
    pricing: { ...current.pricing, plans: [...current.pricing.plans, { ...plan, id }] },
  };
  await writeContent(next);
  return NextResponse.json(next.pricing.plans, { status: 201 });
}

// PUT replaces the entire plans array — used by the admin's bulk save.
export async function PUT(req: Request) {
  let plans: PricingPlan[];
  try {
    plans = (await req.json()) as PricingPlan[];
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!Array.isArray(plans)) {
    return NextResponse.json({ error: "Body must be an array of plans" }, { status: 400 });
  }

  const current = await readContent();
  const next = { ...current, pricing: { ...current.pricing, plans } };
  await writeContent(next);
  return NextResponse.json(next.pricing.plans);
}
