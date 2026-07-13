import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "../../../../lib/auth";
import { listCoupons, createCoupon } from "../../../../lib/coupons";

async function requireAdmin() {
  const jar   = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  return token ? verifySessionToken(token) : false;
}

/** GET /api/admin/coupons */
export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const coupons = await listCoupons();
  return NextResponse.json(coupons);
}

/** POST /api/admin/coupons */
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();

    if (!body.code?.trim())       return NextResponse.json({ error: "Code is required." },            { status: 400 });
    if (!body.discount_type)      return NextResponse.json({ error: "Discount type is required." },   { status: 400 });
    if (body.discount_value == null || body.discount_value <= 0) {
      return NextResponse.json({ error: "Discount value must be greater than 0." }, { status: 400 });
    }
    if (body.discount_type === "percent" && body.discount_value > 100) {
      return NextResponse.json({ error: "Percentage discount cannot exceed 100%." }, { status: 400 });
    }

    const coupon = await createCoupon({
      code:             body.code.trim(),
      description:      body.description?.trim() || null,
      discount_type:    body.discount_type,
      discount_value:   Math.round(body.discount_value),
      min_amount_paise: Math.round((body.min_amount_inr ?? 0) * 100),
      max_uses:         body.max_uses ? parseInt(body.max_uses, 10) : null,
      valid_from:       body.valid_from  || null,
      valid_until:      body.valid_until || null,
      is_active:        body.is_active !== false,
      plan_ids:         Array.isArray(body.plan_ids) ? body.plan_ids : [],
    });

    return NextResponse.json(coupon, { status: 201 });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return NextResponse.json({ error: "A coupon with this code already exists." }, { status: 409 });
    }
    console.error("[admin/coupons] POST failed:", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
