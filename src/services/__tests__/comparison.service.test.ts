import { describe, it, expect } from "vitest";
import {
  evaluateRepairDecision,
  getCategoryThreshold,
  DEFAULT_CATEGORY_THRESHOLDS,
  OUTCOME_LABELS,
} from "@/services/comparison.service";

describe("getCategoryThreshold", () => {
  it("returns the category-specific threshold", () => {
    expect(getCategoryThreshold("Electronics")).toBe(0.4);
    expect(getCategoryThreshold("Furniture")).toBe(0.5);
    expect(getCategoryThreshold("Clothing")).toBe(0.35);
  });

  it("falls back to the default for unknown or missing categories", () => {
    expect(getCategoryThreshold("Unknown Thing")).toBe(0.4);
    expect(getCategoryThreshold(null)).toBe(0.4);
    expect(getCategoryThreshold(undefined)).toBe(0.4);
  });

  it("honours overrides", () => {
    expect(getCategoryThreshold("Electronics", { Electronics: 0.7 })).toBe(0.7);
    expect(getCategoryThreshold("Whatever", { default: 0.25 })).toBe(0.25);
  });

  it("has a threshold for every documented category", () => {
    for (const [category, value] of Object.entries(DEFAULT_CATEGORY_THRESHOLDS)) {
      expect(value).toBeGreaterThan(0);
      expect(value).toBeLessThan(1);
      expect(typeof category).toBe("string");
    }
  });
});

describe("evaluateRepairDecision", () => {
  it("recommends repair for a cheap, clearly repairable item", () => {
    const result = evaluateRepairDecision({
      repairCost: 100,
      replacementCost: 1000,
      remainingLifeMonths: 24,
      replacementLifeMonths: 48,
      category: "Electronics",
      repairability: "likely_repairable",
      severity: "minor",
    });

    expect(result.outcome).toBe("REPAIR");
    expect(result.confidence).toBeGreaterThan(0.5);
    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(result.repairRatio).toBe(0.1);
    expect(result.threshold).toBe(0.4);
    expect(result.uncertain).toBe(false);
    expect(result.explanation.length).toBeGreaterThan(0);
  });

  it("never recommends repair when repair costs more than replacement", () => {
    const result = evaluateRepairDecision({
      repairCost: 1500,
      replacementCost: 1000,
      category: "Electronics",
      repairability: "likely_repairable",
      severity: "minor",
    });

    expect(result.outcome).not.toBe("REPAIR");
    expect(result.repairRatio).toBeGreaterThan(1);
    expect(result.costDifference).toBeLessThan(0);
  });

  it("returns INVESTIGATE_FURTHER when replacement cost is missing", () => {
    const result = evaluateRepairDecision({
      repairCost: 200,
      replacementCost: 0,
      category: "Electronics",
    });

    expect(result.outcome).toBe("INVESTIGATE_FURTHER");
    expect(result.uncertain).toBe(true);
    expect(result.manualComparisonRecommended).toBe(true);
    expect(result.repairRatio).toBeNull();
    expect(result.confidence).toBeLessThanOrEqual(0.3);
  });

  it("blocks a firm repair recommendation when a safety risk is flagged", () => {
    const result = evaluateRepairDecision({
      repairCost: 50,
      replacementCost: 1000,
      category: "Home Appliances",
      safetyRisk: true,
      repairability: "likely_repairable",
    });

    expect(result.outcome).not.toBe("REPAIR");
    expect(result.warnings.join(" ")).toMatch(/do not attempt diy repair/i);
    expect(result.explanation.join(" ")).toMatch(/professional assessment/i);
  });

  it("escalates critical severity even when repair is very cheap", () => {
    const result = evaluateRepairDecision({
      repairCost: 10,
      replacementCost: 1000,
      category: "Electronics",
      severity: "critical",
    });

    expect(result.outcome).not.toBe("REPAIR");
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("suggests reuse when the item is not repairable and badly damaged", () => {
    const result = evaluateRepairDecision({
      repairCost: 400,
      replacementCost: 1000,
      category: "Electronics",
      repairability: "not_repairable",
      severity: "major",
    });

    expect(result.outcome).toBe("REUSE");
    expect(result.explanation.join(" ")).toMatch(/reused or recycled/i);
  });

  it("adds a warranty explanation for in-warranty items", () => {
    const result = evaluateRepairDecision({
      repairCost: 800,
      replacementCost: 1000,
      category: "Electronics",
      warrantyStatus: "in_warranty",
    });

    expect(result.explanation.join(" ")).toMatch(/under warranty/i);
    expect(result.factors.some((f) => f.label === "Warranty")).toBe(true);
  });

  it("flags repair unavailability against repair", () => {
    const result = evaluateRepairDecision({
      repairCost: 100,
      replacementCost: 1000,
      category: "Electronics",
      repairAvailable: false,
    });

    expect(result.factors.find((f) => f.label === "Repair availability")?.impact).toBeLessThan(0);
    expect(result.warnings.join(" ")).toMatch(/not be practically available/i);
  });

  it("respects budget constraints in both directions", () => {
    // Repair is over budget, replacement fits -> against repair.
    const repairTooDear = evaluateRepairDecision({
      repairCost: 500,
      replacementCost: 250,
      budget: 300,
      category: "Electronics",
    });
    expect(repairTooDear.factors.find((f) => f.label === "Budget")?.impact).toBe(-1);

    // Repair fits, replacement is over budget -> favours repair.
    const replaceTooDear = evaluateRepairDecision({
      repairCost: 300,
      replacementCost: 2000,
      budget: 500,
      category: "Electronics",
    });
    expect(replaceTooDear.factors.find((f) => f.label === "Budget")?.impact).toBe(1);

    // Both over budget -> neutral.
    const bothOver = evaluateRepairDecision({
      repairCost: 900,
      replacementCost: 1000,
      budget: 100,
      category: "Electronics",
    });
    expect(bothOver.factors.find((f) => f.label === "Budget")?.impact).toBe(0);
  });

  it("warns about high-risk categories for major damage, without changing a cheap repair outcome", () => {
    const result = evaluateRepairDecision({
      repairCost: 100,
      replacementCost: 1000,
      remainingLifeMonths: 24,
      replacementLifeMonths: 48,
      category: "Home Appliances",
      severity: "major",
      repairability: "likely_repairable",
    });

    expect(result.outcome).toBe("REPAIR");
    expect(result.warnings.join(" ")).toMatch(/qualified professional/i);
  });

  it("is deterministic — identical input produces identical output", () => {
    const input = {
      repairCost: 450,
      replacementCost: 1000,
      remainingLifeMonths: 18,
      replacementLifeMonths: 36,
      category: "Home Appliances",
      repairability: "possibly_repairable" as const,
      severity: "moderate" as const,
    };
    expect(evaluateRepairDecision(input)).toEqual(evaluateRepairDecision(input));
  });

  it("always produces a valid confidence and a labelled outcome", () => {
    const inputs = [
      { repairCost: 0, replacementCost: 0 },
      { repairCost: 10, replacementCost: 10 },
      { repairCost: 9999, replacementCost: 1 },
      { repairCost: 500, replacementCost: 500, remainingLifeMonths: 1 },
    ];
    for (const input of inputs) {
      const result = evaluateRepairDecision(input);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(OUTCOME_LABELS[result.outcome]).toBeTruthy();
    }
  });
});
