import { describe, it, expect } from "vitest";
import {
  estimateSustainability,
  CATEGORY_WEIGHT_GRAMS,
  CO2_KG_PER_KG_PRODUCT,
  SUSTAINABILITY_METHOD_VERSION,
} from "@/services/sustainability-engine";

describe("estimateSustainability", () => {
  it("estimates money saved as replacement − repair cost", () => {
    const est = estimateSustainability({
      category: "Electronics",
      activityType: "REPAIR",
      actualRepairCost: 400,
      estimatedReplacementCost: 1000,
    });

    expect(est.estimatedMoneySaved).toBe(600);
    expect(est.assumptions.join(" ")).toMatch(/replacement cost − actual repair cost/i);
  });

  it("never reports negative savings", () => {
    const est = estimateSustainability({
      category: "Electronics",
      activityType: "REPAIR",
      actualRepairCost: 1500,
      estimatedReplacementCost: 1000,
    });

    expect(est.estimatedMoneySaved).toBe(0);
  });

  it("uses category weight for waste avoided and the documented CO2 factor", () => {
    const est = estimateSustainability({
      category: "Home Appliances",
      activityType: "REPAIR",
      actualRepairCost: 100,
      estimatedReplacementCost: 500,
    });

    expect(est.estimatedWasteAvoidedGrams).toBe(CATEGORY_WEIGHT_GRAMS["Home Appliances"]);
    expect(est.estimatedCo2AvoidedKg).toBe(
      Math.round((CATEGORY_WEIGHT_GRAMS["Home Appliances"] / 1000) * CO2_KG_PER_KG_PRODUCT * 100) /
        100,
    );
  });

  it("falls back to the Other weight for unknown categories", () => {
    const est = estimateSustainability({
      category: "Something Else",
      activityType: "REUSE",
    });

    expect(est.estimatedWasteAvoidedGrams).toBe(CATEGORY_WEIGHT_GRAMS.Other);
  });

  it("produces no money or waste estimate for a replacement decision", () => {
    const est = estimateSustainability({
      category: "Electronics",
      activityType: "REPLACE",
      actualRepairCost: 400,
      estimatedReplacementCost: 1000,
    });

    expect(est.estimatedMoneySaved).toBeNull();
    expect(est.estimatedWasteAvoidedGrams).toBeNull();
    expect(est.estimatedCo2AvoidedKg).toBeNull();
  });

  it("always labels the output as an estimate with a versioned data source", () => {
    const est = estimateSustainability({ category: "Furniture", activityType: "REPAIR" });

    expect(est.calculationMethod).toMatch(/estimate/i);
    expect(est.dataSource).toContain(SUSTAINABILITY_METHOD_VERSION);
    expect(est.assumptions.length).toBeGreaterThan(0);
  });
});
