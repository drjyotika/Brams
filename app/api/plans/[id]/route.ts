import { NextResponse } from "next/server";
import { readContent, writeContent } from "../../../../lib/storage";
import type { PricingPlan } from "../../../../lib/content";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const content = await readContent();
  const plan = content.pricing.plans.find((p) => p.id === id);
  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  return NextResponse.json(plan);
}

export async function PUT(req: Request, { params }: Params) {
  const { id } = await params;
  let patch: Partial<PricingPlan>;
  try {
    patch = (await req.json()) as Partial<PricingPlan>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const current = await readContent();
  const idx = current.pricing.plans.findIndex((p) => p.id === id);
  if (idx === -1) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

  const updated = { ...current.pricing.plans[idx], ...patch, id };
  const plans = [...current.pricing.plans];
  plans[idx] = updated;
  const next = { ...current, pricing: { ...current.pricing, plans } };
  await writeContent(next);
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  const current = await readContent();
  const plans = current.pricing.plans.filter((p) => p.id !== id);
  if (plans.length === current.pricing.plans.length) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }
  const next = { ...current, pricing: { ...current.pricing, plans } };
  await writeContent(next);
  return NextResponse.json({ deleted: id });
}
