import { z } from "zod";

export const ITEM_CATEGORIES = [
  "Electronics",
  "Home Appliances",
  "Furniture",
  "Clothing",
  "Footwear",
  "Bicycles",
  "Vehicles",
  "Household Items",
  "Other",
] as const;

export const itemCategorySchema = z.enum(ITEM_CATEGORIES);

/**
 * Money entered in a form. Accepts a number, a numeric string, or `null`
 * (empty field) and normalises empty input to `null`.
 *
 * Note: `.optional()` alone only permits `undefined` — form clients send
 * `null` for empty fields, so `null` must be part of the union.
 */
export const moneySchema = z
  .union([z.number(), z.string(), z.null()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === null || v === "") return null;
    const n = typeof v === "string" ? Number(v.trim()) : v;
    return Number.isFinite(n) ? n : null;
  })
  .refine((v) => v === null || (v >= 0 && v <= 100_000_000), {
    message: "Enter a valid non-negative amount.",
  });

/* ---------------- Analyses ---------------- */

export const createAnalysisSchema = z.object({
  itemName: z.string().trim().min(2, "Item name is too short.").max(200),
  category: itemCategorySchema,
  brand: z.string().trim().max(120).optional().nullable(),
  model: z.string().trim().max(120).optional().nullable(),
  purchasePrice: moneySchema,
  itemAge: z
    .union([z.number(), z.string(), z.null()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === null || v === "") return null;
      const n = typeof v === "string" ? Number(v.trim()) : v;
      return Number.isFinite(n) ? Math.round(n) : null;
    })
    .refine((v) => v === null || (v >= 0 && v <= 1200), {
      message: "Enter a valid age in months.",
    }),
  condition: z.string().trim().max(60).optional().nullable(),
  problemDescription: z
    .string()
    .trim()
    .min(10, "Please describe the problem in at least 10 characters.")
    .max(4000),
  symptoms: z.string().trim().max(2000).optional().nullable(),
  warrantyInfo: z.string().trim().max(1000).optional().nullable(),
  imageUrls: z.array(z.string().max(2048)).max(6).default([]),
});

export type CreateAnalysisInput = z.infer<typeof createAnalysisSchema>;

export const updateAnalysisSchema = z.object({
  itemName: z.string().trim().min(2).max(200).optional(),
  problemDescription: z.string().trim().min(10).max(4000).optional(),
  symptoms: z.string().trim().max(2000).optional().nullable(),
});

/* ---------------- Repair comparison ---------------- */

export const categoryThresholdsSchema = z.record(z.string(), z.number().min(0).max(1));

export const comparisonInputSchema = z.object({
  repairCost: z.coerce.number().min(0).max(100_000_000),
  replacementCost: z.coerce.number().min(0).max(100_000_000),
  remainingLifeMonths: z.coerce.number().min(0).max(600).optional().nullable(),
  replacementLifeMonths: z.coerce.number().min(0).max(600).optional().nullable(),
  warrantyStatus: z
    .enum(["in_warranty", "out_of_warranty", "unknown"])
    .default("unknown"),
  itemAgeMonths: z.coerce.number().min(0).max(1200).optional().nullable(),
  repairAvailable: z.boolean().default(true),
  budget: z.coerce.number().min(0).max(100_000_000).optional().nullable(),
  sustainabilityPreference: z
    .enum(["prefer_repair", "neutral", "prefer_replace"])
    .default("neutral"),
});

export type ComparisonInput = z.infer<typeof comparisonInputSchema>;

/* ---------------- Troubleshooting ---------------- */

export const sendMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Message cannot be empty.")
    .max(2000, "Message is too long (max 2000 characters)."),
});

/* ---------------- Repair professionals ---------------- */

export const professionalQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  category: z.string().trim().max(80).optional(),
  location: z.string().trim().max(120).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  verifiedOnly: z.coerce.boolean().optional(),
  sort: z
    .enum(["rating", "price_asc", "price_desc", "newest"])
    .default("rating"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});

export type ProfessionalQuery = z.infer<typeof professionalQuerySchema>;

export const createProfessionalSchema = z.object({
  name: z.string().trim().min(2).max(200),
  description: z.string().trim().min(10).max(4000),
  specializations: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  serviceArea: z.string().trim().max(200).optional().nullable(),
  startingPrice: moneySchema,
  workingHours: z.string().trim().max(200).optional().nullable(),
  contactEmail: z.string().trim().email().max(200).optional().nullable().or(z.literal("")),
  contactPhone: z.string().trim().max(40).optional().nullable().or(z.literal("")),
  website: z.string().trim().url().max(300).optional().nullable().or(z.literal("")),
  profileImageUrl: z.string().trim().max(2048).optional().nullable().or(z.literal("")),
  isDemo: z.boolean().default(false),
});

export const updateProfessionalSchema = createProfessionalSchema.partial().extend({
  /** Admin-only: toggle verification badge. */
  verified: z.boolean().optional(),
});

/* ---------------- Repair requests ---------------- */

export const repairRequestStatuses = [
  "PENDING",
  "QUOTE_PROVIDED",
  "ACCEPTED",
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;

export type RepairRequestStatus = (typeof repairRequestStatuses)[number];

export const createRepairRequestSchema = z.object({
  analysisId: z.string().min(1, "Select an analysed item."),
  professionalId: z.string().min(1, "Select a repair professional."),
  description: z.string().trim().min(10, "Describe the service needed.").max(4000),
  requestedDate: z
    .string()
    .datetime({ offset: true })
    .optional()
    .nullable()
    .or(z.literal("")),
});

export const updateRepairRequestSchema = z.object({
  status: z.enum(repairRequestStatuses).optional(),
  quotedPrice: moneySchema,
});

/* ---------------- Reviews ---------------- */

export const createReviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional().nullable(),
});

/* ---------------- Admin ---------------- */

export const adminUsersQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  role: z.enum(["USER", "ADMIN"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const adminProfessionalsQuerySchema = professionalQuerySchema.extend({
  verified: z.coerce.boolean().optional(),
});

/* ---------------- Sustainability ---------------- */

export const sustainabilityHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  activityType: z.enum(["REPAIR", "REPLACE", "REUSE", "RECYCLE"]).optional(),
});
