/**
 * Smart Repair-vs-Replace decision engine.
 *
 * This is a DETERMINISTIC TypeScript engine — the LLM never makes the final
 * decision. It combines cost ratios, remaining useful life, repair
 * feasibility, safety, and user preferences using configurable,
 * category-specific rules.
 *
 * All monetary values are plain numbers in the item's currency.
 */

export type DecisionOutcome =
  | "REPAIR"
  | "REPLACE"
  | "INVESTIGATE_FURTHER"
  | "REUSE"
  | "RECYCLE"
  | "DISPOSE_RESPONSIBLY";

export interface DecisionInput {
  repairCost: number;
  replacementCost: number;
  /** Expected useful life remaining AFTER repair, in months. */
  remainingLifeMonths?: number | null;
  /** Expected useful life of a brand-new replacement, in months. */
  replacementLifeMonths?: number | null;
  warrantyStatus?: "in_warranty" | "out_of_warranty" | "unknown";
  itemAgeMonths?: number | null;
  repairAvailable?: boolean;
  budget?: number | null;
  sustainabilityPreference?: "prefer_repair" | "neutral" | "prefer_replace";
  /** AI-derived repairability signal (optional). */
  repairability?:
    | "likely_repairable"
    | "possibly_repairable"
    | "unlikely_repairable"
    | "not_repairable"
    | "unknown"
    | null;
  /** AI-derived severity (optional). */
  severity?: "minor" | "moderate" | "major" | "critical" | "unknown" | null;
  /** True when a safety risk makes DIY repair inappropriate. */
  safetyRisk?: boolean;
  /** Item category — selects the threshold rule set. */
  category?: string | null;
}

export interface DecisionFactor {
  label: string;
  detail: string;
  /** positive favours repair, negative favours replace, 0 is neutral */
  impact: number;
}

export interface DecisionResult {
  outcome: DecisionOutcome;
  /** 0..1 confidence in the recommendation. */
  confidence: number;
  repairRatio: number | null;
  costDifference: number | null;
  repairPercentOfReplacement: number | null;
  threshold: number;
  factors: DecisionFactor[];
  explanation: string[];
  /** Estimated value retained by repairing vs replacing (cost per month). */
  repairCostPerMonth: number | null;
  replaceCostPerMonth: number | null;
  warnings: string[];
  /** True when there is not enough information to give a firm recommendation. */
  uncertain: boolean;
  manualComparisonRecommended: boolean;
}

/**
 * Category-specific repair thresholds: if repairCost / replacementCost is
 * below the threshold, repair is generally cost-effective.
 * These are configurable heuristics, not universal truths.
 */
export const DEFAULT_CATEGORY_THRESHOLDS: Record<string, number> = {
  Electronics: 0.4,
  "Home Appliances": 0.45,
  Furniture: 0.5,
  Clothing: 0.35,
  Footwear: 0.35,
  Bicycles: 0.5,
  Vehicles: 0.45,
  "Household Items": 0.4,
  Other: 0.4,
};

export const DEFAULT_THRESHOLD = 0.4;

export function getCategoryThreshold(
  category?: string | null,
  overrides?: Record<string, number>,
): number {
  const table = { ...DEFAULT_CATEGORY_THRESHOLDS, ...(overrides ?? {}) };
  if (category && table[category] != null) return table[category];
  return overrides?.default ?? DEFAULT_THRESHOLD;
}

const HIGH_RISK_CATEGORIES = new Set([
  "Electronics",
  "Home Appliances",
  "Vehicles",
]);

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function evaluateRepairDecision(
  input: DecisionInput,
  options?: { thresholds?: Record<string, number> },
): DecisionResult {
  const repairCost = Math.max(0, input.repairCost || 0);
  const replacementCost = Math.max(0, input.replacementCost || 0);
  const threshold = getCategoryThreshold(input.category, options?.thresholds);

  const factors: DecisionFactor[] = [];
  const explanation: string[] = [];
  const warnings: string[] = [];

  // --- Safety first: never recommend a risky DIY repair ---
  const isHighRiskCategory =
    !!input.category && HIGH_RISK_CATEGORIES.has(input.category);
  if (isHighRiskCategory && (input.severity === "major" || input.severity === "critical")) {
    warnings.push(
      "This category often involves mains power, gas or other hazards. Have a qualified professional perform the repair.",
    );
  }

  if (input.safetyRisk || input.severity === "critical") {
    factors.push({
      label: "Safety risk",
      detail:
        "A safety-critical failure was flagged. Repair may be possible but must be done by a qualified professional.",
      impact: -1,
    });
    warnings.push(
      "This failure may involve a safety risk. Do not attempt DIY repair — consult a qualified professional.",
    );
  }

  // --- Guard against missing/absurd data ---
  const hasCosts = replacementCost > 0 && repairCost >= 0;
  if (!hasCosts || replacementCost <= 0) {
    return {
      outcome: repairCost > 0 ? "INVESTIGATE_FURTHER" : "INVESTIGATE_FURTHER",
      confidence: 0.2,
      repairRatio: null,
      costDifference: repairCost > 0 ? -repairCost : null,
      repairPercentOfReplacement: null,
      threshold,
      factors,
      explanation: [
        "A valid replacement cost estimate is required to compare repair versus replacement.",
      ],
      repairCostPerMonth: null,
      replaceCostPerMonth: null,
      warnings,
      uncertain: true,
      manualComparisonRecommended: true,
    };
  }

  const repairRatio = repairCost / replacementCost;
  const costDifference = replacementCost - repairCost;
  const repairPercentOfReplacement = round2(repairRatio * 100);

  // --- Cost factor ---
  if (repairRatio <= threshold) {
    factors.push({
      label: "Cost",
      detail: `Repair costs ${repairPercentOfReplacement}% of a replacement (below the ${Math.round(
        threshold * 100,
      )}% guideline), so repair is cost-effective.`,
      impact: 1,
    });
  } else if (repairRatio <= threshold + 0.15) {
    factors.push({
      label: "Cost",
      detail: `Repair costs ${repairPercentOfReplacement}% of a replacement, which is borderline.`,
      impact: 0,
    });
  } else {
    factors.push({
      label: "Cost",
      detail: `Repair costs ${repairPercentOfReplacement}% of a replacement (above the ${Math.round(
        threshold * 100,
      )}% guideline), so replacement may be more economical.`,
      impact: -1,
    });
  }

  // --- Remaining useful life / value per month ---
  let repairCostPerMonth: number | null = null;
  let replaceCostPerMonth: number | null = null;
  if (input.remainingLifeMonths && input.remainingLifeMonths > 0) {
    repairCostPerMonth = round2(repairCost / input.remainingLifeMonths);
  }
  const replacementLife =
    input.replacementLifeMonths && input.replacementLifeMonths > 0
      ? input.replacementLifeMonths
      : null;
  if (replacementLife) {
    replaceCostPerMonth = round2(replacementCost / replacementLife);
  }
  if (repairCostPerMonth != null && replaceCostPerMonth != null) {
    if (repairCostPerMonth < replaceCostPerMonth) {
      factors.push({
        label: "Value over time",
        detail: `Repair costs ~${repairCostPerMonth}/month vs ~${replaceCostPerMonth}/month for replacement.`,
        impact: 1,
      });
    } else {
      factors.push({
        label: "Value over time",
        detail: `Repair costs ~${repairCostPerMonth}/month vs ~${replaceCostPerMonth}/month for replacement.`,
        impact: -1,
      });
    }
  }

  // --- Repair availability ---
  if (input.repairAvailable === false) {
    factors.push({
      label: "Repair availability",
      detail: "No suitable repair professional was identified for this item.",
      impact: -2,
    });
    warnings.push("Repair may not be practically available for this item.");
  }

  // --- AI repairability signal ---
  if (input.repairability === "not_repairable") {
    factors.push({
      label: "Repairability",
      detail: "The assessment indicates the item is not repairable.",
      impact: -2,
    });
  } else if (input.repairability === "unlikely_repairable") {
    factors.push({
      label: "Repairability",
      detail: "The assessment indicates repair is unlikely to succeed.",
      impact: -1,
    });
  } else if (input.repairability === "likely_repairable") {
    factors.push({
      label: "Repairability",
      detail: "The assessment indicates the item is likely repairable.",
      impact: 1,
    });
  }

  // --- Warranty ---
  if (input.warrantyStatus === "in_warranty") {
    factors.push({
      label: "Warranty",
      detail: "The item may still be under warranty — check for free repair or replacement.",
      impact: 1,
    });
    explanation.push(
      "The item appears to be under warranty. Contact the manufacturer first — a covered repair or replacement may be free.",
    );
  }

  // --- Budget ---
  if (input.budget != null && input.budget >= 0) {
    if (repairCost > input.budget && replacementCost > input.budget) {
      factors.push({
        label: "Budget",
        detail: "Both options exceed the stated budget.",
        impact: 0,
      });
    } else if (repairCost > input.budget && replacementCost <= input.budget) {
      factors.push({
        label: "Budget",
        detail: "Repair exceeds the budget but replacement does not.",
        impact: -1,
      });
    } else if (repairCost <= input.budget && replacementCost > input.budget) {
      factors.push({
        label: "Budget",
        detail: "Repair fits within the budget but replacement does not.",
        impact: 1,
      });
    }
  }

  // --- Sustainability preference ---
  if (input.sustainabilityPreference === "prefer_repair") {
    factors.push({
      label: "Sustainability preference",
      detail: "You prefer to repair when it is reasonable to do so.",
      impact: 0.5,
    });
  } else if (input.sustainabilityPreference === "prefer_replace") {
    factors.push({
      label: "Sustainability preference",
      detail: "You prefer to replace when repair is not clearly better.",
      impact: -0.5,
    });
  }

  const score = factors.reduce((sum, f) => sum + f.impact, 0);

  // Determine outcome
  let outcome: DecisionOutcome;
  let confidence = 0.5;

  if (input.safetyRisk || input.severity === "critical") {
    // Cannot unconditionally recommend repair; escalate
    outcome = costDifference > 0 ? "INVESTIGATE_FURTHER" : "REPLACE";
    confidence = 0.5;
    explanation.push(
      "Because of the potential safety risk, get a professional assessment before deciding.",
    );
  } else if (score >= 2) {
    outcome = "REPAIR";
    confidence = Math.min(0.95, 0.6 + score * 0.08);
  } else if (score <= -2) {
    outcome = repairRatio >= 1 ? "REPLACE" : "INVESTIGATE_FURTHER";
    confidence = Math.min(0.9, 0.5 + Math.abs(score) * 0.08);
  } else {
    outcome = "INVESTIGATE_FURTHER";
    confidence = 0.45;
  }

  // Special-case: heavily damaged but repairable -> reuse/recycle hints
  if (
    (input.repairability === "not_repairable" ||
      input.repairability === "unlikely_repairable") &&
    input.severity === "major"
  ) {
    outcome = "REUSE";
    explanation.push(
      "The item may not be repairable, but parts or materials could be reused or recycled responsibly.",
    );
  }

  // Build human explanation
  if (outcome === "REPAIR") {
    explanation.push(
      `Repair is recommended: it costs about ${repairPercentOfReplacement}% of a replacement and retains roughly the item's remaining usefulness.`,
    );
  } else if (outcome === "REPLACE") {
    explanation.push(
      `Replacement is recommended: repairing costs about ${repairPercentOfReplacement}% of a replacement, which is unlikely to be worthwhile.`,
    );
  } else if (outcome === "INVESTIGATE_FURTHER") {
    explanation.push(
      "The evidence is mixed. Get a firm repair quote and compare it against replacement options before deciding.",
    );
  }

  const uncertain =
    (input.remainingLifeMonths == null || input.replacementLifeMonths == null) &&
    (repairRatio > threshold - 0.1 && repairRatio < threshold + 0.1);

  return {
    outcome,
    confidence: round2(confidence),
    repairRatio: round2(repairRatio),
    costDifference: round2(costDifference),
    repairPercentOfReplacement,
    threshold,
    factors,
    explanation,
    repairCostPerMonth,
    replaceCostPerMonth,
    warnings,
    uncertain,
    manualComparisonRecommended: outcome === "INVESTIGATE_FURTHER" || uncertain,
  };
}

export const OUTCOME_LABELS: Record<DecisionOutcome, string> = {
  REPAIR: "Repair",
  REPLACE: "Replace",
  INVESTIGATE_FURTHER: "Investigate Further",
  REUSE: "Reuse",
  RECYCLE: "Recycle",
  DISPOSE_RESPONSIBLY: "Recycle or Dispose Responsibly",
};
