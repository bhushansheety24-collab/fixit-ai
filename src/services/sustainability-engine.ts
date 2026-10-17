/**
 * Sustainability estimation model.
 *
 * IMPORTANT: these values are ESTIMATES with a documented, replaceable
 * methodology — they are NOT verified measurements. Every record stores the
 * `calculationMethod` and `dataSource` so the methodology is auditable.
 *
 * The model is intentionally modular: swap `CATEGORY_WEIGHT_GRAMS` or
 * `CO2_FACTOR` to improve accuracy without changing callers.
 */

export const SUSTAINABILITY_METHOD_VERSION = "estimate-v1";

/** Typical product weight by category (grams). Sourced from public
 *  average product-weight references; intended as rough estimates. */
export const CATEGORY_WEIGHT_GRAMS: Record<string, number> = {
  Electronics: 1200,
  "Home Appliances": 12000,
  Furniture: 20000,
  Clothing: 500,
  Footwear: 800,
  Bicycles: 12000,
  Vehicles: 150000,
  "Household Items": 1500,
  Other: 2000,
};

/** Approximate kg CO2e avoided per kg of product not manufactured.
 *  Rough order-of-magnitude figure used only for indicative estimates. */
export const CO2_KG_PER_KG_PRODUCT = 5.5;

export interface SustainabilityEstimateInput {
  category?: string | null;
  activityType: "REPAIR" | "REPLACE" | "REUSE" | "RECYCLE";
  actualRepairCost?: number | null;
  estimatedReplacementCost?: number | null;
  /** Optional explicit weight from a trusted source (grams). */
  knownWeightGrams?: number | null;
}

export interface SustainabilityEstimate {
  estimatedMoneySaved: number | null;
  estimatedWasteAvoidedGrams: number | null;
  estimatedCo2AvoidedKg: number | null;
  calculationMethod: string;
  dataSource: string;
  assumptions: string[];
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/**
 * Estimate the sustainability impact of an activity.
 * Money saved is estimated as replacement cost − actual repair cost.
 * Waste avoided uses category weight (repair/reuse extend the item's life).
 */
export function estimateSustainability(
  input: SustainabilityEstimateInput,
): SustainabilityEstimate {
  const assumptions: string[] = [];
  let estimatedMoneySaved: number | null = null;
  let estimatedWasteAvoidedGrams: number | null = null;

  if (
    input.actualRepairCost != null &&
    input.estimatedReplacementCost != null &&
    (input.activityType === "REPAIR" || input.activityType === "REUSE")
  ) {
    estimatedMoneySaved = round2(
      Math.max(0, input.estimatedReplacementCost - input.actualRepairCost),
    );
    assumptions.push(
      "Money saved = estimated replacement cost − actual repair cost.",
    );
  }

  if (input.activityType === "REPAIR" || input.activityType === "REUSE") {
    const weight =
      input.knownWeightGrams ??
      (input.category ? CATEGORY_WEIGHT_GRAMS[input.category] : undefined) ??
      CATEGORY_WEIGHT_GRAMS.Other;
    estimatedWasteAvoidedGrams = weight;
    assumptions.push(
      `Waste avoided estimated from typical ${input.category || "product"} weight (${weight} g).`,
    );
  }

  const estimatedCo2AvoidedKg =
    estimatedWasteAvoidedGrams != null
      ? round2((estimatedWasteAvoidedGrams / 1000) * CO2_KG_PER_KG_PRODUCT)
      : null;

  if (estimatedCo2AvoidedKg != null) {
    assumptions.push(
      `CO₂e avoided ≈ waste avoided (kg) × ${CO2_KG_PER_KG_PRODUCT} kg CO₂e/kg — an indicative factor only.`,
    );
  }

  return {
    estimatedMoneySaved,
    estimatedWasteAvoidedGrams,
    estimatedCo2AvoidedKg,
    calculationMethod:
      "Estimate: replacement cost − repair cost; category-weight based waste avoidance.",
    dataSource: `fixit-ai/${SUSTAINABILITY_METHOD_VERSION}`,
    assumptions,
  };
}
