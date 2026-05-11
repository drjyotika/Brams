// Plan lookup — finds a PricingPlan by id from the live site content.

import { readContent } from "./storage";
import type { PricingPlan } from "./content";

/**
 * Parse a price string like "₹1,500" or "1500" into paise (integer).
 * Falls back to 0 if it can't be parsed.
 */
export function parsePriceToPaise(price: string): number {
  const cleaned = price.replace(/[^\d.]/g, "");
  const rupees = parseFloat(cleaned);
  if (Number.isNaN(rupees)) return 0;
  return Math.round(rupees * 100);
}

/**
 * Parse a unit string like "20–30 min" or "45–60 min" → upper bound in minutes.
 * Defaults to 30.
 */
export function parseDurationMinutes(unit: string): number {
  const match = unit.match(/(\d+)\s*(?:[–-]\s*(\d+))?\s*min/i);
  if (!match) return 30;
  return parseInt(match[2] ?? match[1], 10);
}

export async function getPlanById(planId: string): Promise<PricingPlan | null> {
  const content = await readContent();
  return content.pricing.plans.find((p) => p.id === planId) ?? null;
}

export async function getAllPlans(): Promise<PricingPlan[]> {
  const content = await readContent();
  return content.pricing.plans;
}
