import { z } from "zod";

/**
 * Structured schema for AI-generated damage analysis.
 * AI output MUST be validated against this before saving or returning.
 */

export const moneyRangeSchema = z.object({
  min: z.number().nonnegative().nullable(),
  max: z.number().nonnegative().nullable(),
  currency: z.string().min(1).max(8).default("INR"),
});

export const possibleCauseSchema = z.object({
  cause: z.string().min(1).max(500),
  confidence: z.number().min(0).max(1),
});

export const aiAnalysisSchema = z.object({
  itemCategory: z.string().min(1).max(100),
  identifiedItem: z.string().min(1).max(300),
  visibleDamage: z.array(z.string().min(1).max(500)).max(30).default([]),
  possibleCauses: z.array(possibleCauseSchema).max(20).default([]),
  severity: z.enum(["minor", "moderate", "major", "critical", "unknown"]),
  confidence: z.number().min(0).max(1),
  repairability: z.enum([
    "likely_repairable",
    "possibly_repairable",
    "unlikely_repairable",
    "not_repairable",
    "unknown",
  ]),
  estimatedRepairCost: moneyRangeSchema,
  estimatedReplacementCost: moneyRangeSchema,
  recommendedActions: z.array(z.string().min(1).max(500)).max(20).default([]),
  safetyWarnings: z.array(z.string().min(1).max(500)).max(20).default([]),
  professionalSpecialization: z.string().max(200).nullable(),
  sustainabilityAdvice: z.string().max(1000).default(""),
  /** Set to true when the model could not reliably analyse the provided evidence. */
  insufficientEvidence: z.boolean().default(false),
  /** Free-form disclaimer the model can attach. */
  disclaimer: z.string().max(1000).optional(),
});

export type AIAnalysis = z.infer<typeof aiAnalysisSchema>;
export type MoneyRange = z.infer<typeof moneyRangeSchema>;
export type PossibleCause = z.infer<typeof possibleCauseSchema>;

export const SEVERITY_LABELS: Record<AIAnalysis["severity"], string> = {
  minor: "Minor",
  moderate: "Moderate",
  major: "Major",
  critical: "Critical",
  unknown: "Unknown",
};

export const REPAIRABILITY_LABELS: Record<AIAnalysis["repairability"], string> = {
  likely_repairable: "Likely repairable",
  possibly_repairable: "Possibly repairable",
  unlikely_repairable: "Unlikely to be repairable",
  not_repairable: "Not repairable",
  unknown: "Unknown",
};
