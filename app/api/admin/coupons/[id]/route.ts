import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "../../../../../lib/auth";
import { updateCoupon, deleteCoupon } from "../../../../../lib/coupons";

type Ctx = { params: Promise<{ id: string }> };

async function requireAdmin() {
  const jar   = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  return token ? verifySessionToken(token) : false;
}

/** PUT /api/admin/coupons/[id] */
export async function PUT(req: NextRequest, ctx: Ctx) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await ctx.params;
    const body   = await req.json();

    const updates: Parameters<typeof updateCoupon>[1] = {};
    if (body.code          !== undefined) updates.code             = body.code.trim();
    if (body.description   !== undefined) updates.description      = body.description?.trim() || null;
    if (body.discount_type !== undefined) updates.discount_type    = body.discount_type;
    if (body.discount_value != null)      updates.discount_value   = Math.round(body.discount_value);
    if (body.min_amount_inr != null)      updates.min_amount_paise = Math.round(body.min_amount_inr * 100);
    if (body.max_uses      !== undefined) updates.max_uses         = body.max_uses ? parseInt(body.max_uses, 10) : null;
    if (body.valid_from    !== undefined) updates.valid_from       = body.valid_from  || null;
    if (body.valid_until   !== undefined) updates.valid_until      = body.valid_until || null;
    if (body.is_active     !== undefined) updates.is_active        = body.is_active;

    const updated = await updateCoupon(id, updates);
    if (!updated) return NextResponse.json({ error: "Coupon not found." }, { status: 404 });

    return NextResponse.json(updated);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return NextResponse.json({ error: "A coupon with this code already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** DELETE /api/admin/coupons/[id] */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const deleted = await deleteCoupon(id);
  if (!deleted) return NextResponse.json({ error: "Coupon not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
