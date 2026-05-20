/**
 * Coupon / promo-code library.
 *
 * DB table: coupons
 * Appointment columns added by ensureCouponSchema():
 *   coupon_code     VARCHAR(50)
 *   discount_paise  INTEGER NOT NULL DEFAULT 0
 */

import { sql } from "./db";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DiscountType = "percent" | "fixed";

export type Coupon = {
  id:               string;
  code:             string;          // stored UPPERCASE
  description:      string | null;
  discount_type:    DiscountType;
  discount_value:   number;          // percent: 1-100 | fixed: paise
  min_amount_paise: number;
  max_uses:         number | null;   // null = unlimited
  used_count:       number;
  valid_from:       string | null;   // ISO date "YYYY-MM-DD"
  valid_until:      string | null;
  is_active:        boolean;
  created_at:       string;
  updated_at:       string;
};

export type ValidateResult =
  | { valid: true;  coupon: Coupon; discount_paise: number; final_paise: number }
  | { valid: false; error: string };

// ─── Schema (idempotent) ──────────────────────────────────────────────────────

let schemaMigrated = false;

export async function ensureCouponSchema(): Promise<void> {
  if (schemaMigrated) return;

  await sql`
    CREATE TABLE IF NOT EXISTS coupons (
      id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      code             VARCHAR(50) UNIQUE NOT NULL,
      description      TEXT,
      discount_type    VARCHAR(10) NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
      discount_value   INTEGER     NOT NULL,
      min_amount_paise INTEGER     NOT NULL DEFAULT 0,
      max_uses         INTEGER,
      used_count       INTEGER     NOT NULL DEFAULT 0,
      valid_from       DATE,
      valid_until      DATE,
      is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  // Add coupon tracking columns to appointments
  await sql`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS coupon_code    VARCHAR(50)`;
  await sql`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS discount_paise INTEGER NOT NULL DEFAULT 0`;

  schemaMigrated = true;
}

// ─── Validation ───────────────────────────────────────────────────────────────

export async function validateCoupon(
  code: string,
  amountPaise: number,
): Promise<ValidateResult> {
  await ensureCouponSchema();

  const upper = code.trim().toUpperCase();
  const rows  = await sql`SELECT * FROM coupons WHERE code = ${upper} LIMIT 1`;
  const coupon = rows[0] as Coupon | undefined;

  if (!coupon)         return { valid: false, error: "Invalid coupon code." };
  if (!coupon.is_active) return { valid: false, error: "This coupon is no longer active." };

  const today = new Date().toISOString().slice(0, 10);
  if (coupon.valid_from  && today < coupon.valid_from)  return { valid: false, error: "This coupon is not yet valid." };
  if (coupon.valid_until && today > coupon.valid_until) return { valid: false, error: "This coupon has expired." };

  if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
    return { valid: false, error: "This coupon has reached its usage limit." };
  }

  if (amountPaise < coupon.min_amount_paise) {
    const minINR = `₹${(coupon.min_amount_paise / 100).toLocaleString("en-IN")}`;
    return { valid: false, error: `Minimum order of ${minINR} required for this coupon.` };
  }

  const discount_paise =
    coupon.discount_type === "percent"
      ? Math.floor((amountPaise * coupon.discount_value) / 100)
      : Math.min(coupon.discount_value, amountPaise);

  const final_paise = Math.max(amountPaise - discount_paise, 100); // Razorpay minimum ₹1

  return { valid: true, coupon, discount_paise, final_paise };
}

// ─── Apply (on order creation) ────────────────────────────────────────────────

/** Stores coupon + discount on the appointment row. */
export async function applyCouponToAppointment(
  appointmentId: string,
  couponCode:    string,
  discountPaise: number,
): Promise<void> {
  await sql`
    UPDATE appointments
    SET coupon_code    = ${couponCode.toUpperCase()},
        discount_paise = ${discountPaise},
        updated_at     = NOW()
    WHERE id = ${appointmentId}
  `;
}

/** Increments used_count after a successful payment. */
export async function incrementCouponUsage(code: string): Promise<void> {
  await sql`
    UPDATE coupons
    SET used_count = used_count + 1,
        updated_at = NOW()
    WHERE code = ${code.toUpperCase()}
  `;
}

// ─── Admin CRUD ───────────────────────────────────────────────────────────────

export async function listCoupons(): Promise<Coupon[]> {
  await ensureCouponSchema();
  const rows = await sql`SELECT * FROM coupons ORDER BY created_at DESC`;
  return rows as Coupon[];
}

export async function createCoupon(input: {
  code:             string;
  description?:     string | null;
  discount_type:    DiscountType;
  discount_value:   number;
  min_amount_paise: number;
  max_uses?:        number | null;
  valid_from?:      string | null;
  valid_until?:     string | null;
  is_active:        boolean;
}): Promise<Coupon> {
  await ensureCouponSchema();
  const rows = await sql`
    INSERT INTO coupons
      (code, description, discount_type, discount_value, min_amount_paise,
       max_uses, valid_from, valid_until, is_active)
    VALUES (
      ${input.code.toUpperCase()},
      ${input.description ?? null},
      ${input.discount_type},
      ${input.discount_value},
      ${input.min_amount_paise},
      ${input.max_uses ?? null},
      ${input.valid_from  ?? null},
      ${input.valid_until ?? null},
      ${input.is_active}
    )
    RETURNING *
  `;
  return rows[0] as Coupon;
}

export async function updateCoupon(
  id:    string,
  input: Partial<Omit<Coupon, "id" | "used_count" | "created_at" | "updated_at">>,
): Promise<Coupon | null> {
  await ensureCouponSchema();
  const rows = await sql`
    UPDATE coupons SET
      code             = COALESCE(${input.code?.toUpperCase() ?? null},          code),
      description      = COALESCE(${input.description ?? null},                  description),
      discount_type    = COALESCE(${input.discount_type ?? null},                 discount_type),
      discount_value   = COALESCE(${input.discount_value ?? null},                discount_value),
      min_amount_paise = COALESCE(${input.min_amount_paise ?? null},              min_amount_paise),
      max_uses         = CASE WHEN ${input.max_uses !== undefined} THEN ${input.max_uses ?? null} ELSE max_uses END,
      valid_from       = CASE WHEN ${input.valid_from  !== undefined} THEN ${input.valid_from  ?? null} ELSE valid_from  END,
      valid_until      = CASE WHEN ${input.valid_until !== undefined} THEN ${input.valid_until ?? null} ELSE valid_until END,
      is_active        = COALESCE(${input.is_active ?? null},                     is_active),
      updated_at       = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  return (rows[0] as Coupon) ?? null;
}

export async function deleteCoupon(id: string): Promise<boolean> {
  await ensureCouponSchema();
  const rows = await sql`DELETE FROM coupons WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}
