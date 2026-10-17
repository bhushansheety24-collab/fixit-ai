import { describe, it, expect } from "vitest";
import { aiAnalysisSchema, SEVERITY_LABELS, REPAIRABILITY_LABELS } from "@/lib/ai/schemas";

const validPayload = {
  itemCategory: "Home Appliances",
  identifiedItem: "Electric kettle",
  visibleDamage: ["Cord frayed near plug"],
  possibleCauses: [{ cause: "Damaged heating element", confidence: 0.6 }],
  severity: "moderate",
  confidence: 0.72,
  repairability: "possibly_repairable",
  estimatedRepairCost: { min: 500, max: 900, currency: "INR" },
  estimatedReplacementCost: { min: 1500, max: 2200, currency: "INR" },
  recommendedActions: ["Inspect the element"],
  safetyWarnings: ["Unplug before testing"],
  professionalSpecialization: "Home Appliances",
  sustainabilityAdvice: "Repairing extends the kettle's life.",
  insufficientEvidence: false,
};

describe("aiAnalysisSchema", () => {
  it("accepts a well-formed model response", () => {
    const parsed = aiAnalysisSchema.safeParse(validPayload);
    expect(parsed.success).toBe(true);
  });

  it("applies defaults for optional arrays", () => {
    const parsed = aiAnalysisSchema.safeParse({
      ...validPayload,
      visibleDamage: undefined,
      possibleCauses: undefined,
      recommendedActions: undefined,
      safetyWarnings: undefined,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.visibleDamage).toEqual([]);
      expect(parsed.data.safetyWarnings).toEqual([]);
    }
  });

  it("rejects confidence outside 0..1", () => {
    expect(aiAnalysisSchema.safeParse({ ...validPayload, confidence: 1.5 }).success).toBe(false);
    expect(aiAnalysisSchema.safeParse({ ...validPayload, confidence: -0.1 }).success).toBe(false);
  });

  it("rejects unknown severity and repairability values", () => {
    expect(aiAnalysisSchema.safeParse({ ...validPayload, severity: "catastrophic" }).success).toBe(
      false,
    );
    expect(
      aiAnalysisSchema.safeParse({ ...validPayload, repairability: "maybe" }).success,
    ).toBe(false);
  });

  it("rejects negative costs", () => {
    expect(
      aiAnalysisSchema.safeParse({
        ...validPayload,
        estimatedRepairCost: { min: -5, max: null, currency: "INR" },
      }).success,
    ).toBe(false);
  });

  it("rejects a completely malformed payload", () => {
    expect(aiAnalysisSchema.safeParse({ hello: "world" }).success).toBe(false);
    expect(aiAnalysisSchema.safeParse(null).success).toBe(false);
  });

  it("labels cover every enum member", () => {
    for (const severity of ["minor", "moderate", "major", "critical", "unknown"] as const) {
      expect(SEVERITY_LABELS[severity]).toBeTruthy();
    }
    for (const repairability of [
      "likely_repairable",
      "possibly_repairable",
      "unlikely_repairable",
      "not_repairable",
      "unknown",
    ] as const) {
      expect(REPAIRABILITY_LABELS[repairability]).toBeTruthy();
    }
  });
});
