import { NextRequest, NextResponse } from "next/server";
import { validateCoupon } from "../../../../lib/coupons";

/**
 * POST /api/coupons/validate
 * Public — no auth required (no sensitive data returned).
 *
 * Body: { code: string; amount_paise: number }
 * Returns discount details if valid, or an error message if not.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { code?: string; amount_paise?: number };

    if (!body.code?.trim()) {
      return NextResponse.json({ valid: false, error: "Please enter a coupon code." }, { status: 400 });
    }
    if (!body.amount_paise || body.amount_paise < 1) {
      return NextResponse.json({ valid: false, error: "Invalid amount." }, { status: 400 });
    }

    const result = await validateCoupon(body.code, body.amount_paise);

    if (!result.valid) {
      return NextResponse.json({ valid: false, error: result.error });
    }

    return NextResponse.json({
      valid:          true,
      code:           result.coupon.code,
      discount_type:  result.coupon.discount_type,
      discount_value: result.coupon.discount_value,
      discount_paise: result.discount_paise,
      final_paise:    result.final_paise,
    });
  } catch (e) {
    console.error("[coupons/validate] failed:", e);
    return NextResponse.json({ valid: false, error: "Server error." }, { status: 500 });
  }
}
