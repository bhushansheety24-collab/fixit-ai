import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { estimateSustainability } from "@/services/sustainability-engine";
import type { SustainabilityActivityType } from "@prisma/client";

/**
 * Record a sustainability event for an activity. Idempotent per analysis:
 * an analysis can only produce one sustainability record (unique analysisId).
 */
export async function recordSustainabilityEvent(input: {
  userId: string;
  analysisId: string;
  activityType: SustainabilityActivityType;
  category?: string | null;
  actualRepairCost?: number | null;
  estimatedReplacementCost?: number | null;
}) {
  const estimate = estimateSustainability({
    category: input.category,
    activityType: input.activityType,
    actualRepairCost: input.actualRepairCost ?? null,
    estimatedReplacementCost: input.estimatedReplacementCost ?? null,
  });

  // Avoid duplicate records: unique on analysisId -> upsert.
  return prisma.sustainabilityRecord.upsert({
    where: { analysisId: input.analysisId },
    create: {
      userId: input.userId,
      analysisId: input.analysisId,
      activityType: input.activityType,
      actualRepairCost:
        input.actualRepairCost != null ? new Prisma.Decimal(input.actualRepairCost) : null,
      estimatedReplacementCost:
        input.estimatedReplacementCost != null
          ? new Prisma.Decimal(input.estimatedReplacementCost)
          : null,
      estimatedMoneySaved:
        estimate.estimatedMoneySaved != null
          ? new Prisma.Decimal(estimate.estimatedMoneySaved)
          : null,
      estimatedWasteAvoided:
        estimate.estimatedWasteAvoidedGrams != null
          ? new Prisma.Decimal(estimate.estimatedWasteAvoidedGrams)
          : null,
      calculationMethod: estimate.calculationMethod,
      dataSource: estimate.dataSource,
    },
    update: {
      activityType: input.activityType,
      actualRepairCost:
        input.actualRepairCost != null ? new Prisma.Decimal(input.actualRepairCost) : null,
      estimatedReplacementCost:
        input.estimatedReplacementCost != null
          ? new Prisma.Decimal(input.estimatedReplacementCost)
          : null,
      estimatedMoneySaved:
        estimate.estimatedMoneySaved != null
          ? new Prisma.Decimal(estimate.estimatedMoneySaved)
          : null,
      estimatedWasteAvoided:
        estimate.estimatedWasteAvoidedGrams != null
          ? new Prisma.Decimal(estimate.estimatedWasteAvoidedGrams)
          : null,
      calculationMethod: estimate.calculationMethod,
      dataSource: estimate.dataSource,
    },
  });
}

export interface SustainabilitySummary {
  itemsRepaired: number;
  itemsReused: number;
  itemsReplaced: number;
  totalEstimatedMoneySaved: number;
  totalEstimatedWasteAvoidedGrams: number;
  totalEstimatedCo2AvoidedKg: number;
  decisionsRecorded: number;
  monthlyActivity: Array<{ month: string; repairs: number; reuse: number; replace: number }>;
  categoryBreakdown: Array<{ category: string; count: number; wasteAvoidedGrams: number }>;
  hasData: boolean;
  /** Methodology metadata so UI can label values as estimates. */
  methodology: {
    methodVersion: string;
    dataSource: string;
    disclaimers: string[];
  };
}

const CO2_PER_KG = 5.5; // must match sustainability-engine for consistency

export async function getSustainabilitySummary(
  userId: string,
  opts: { months?: number } = {},
): Promise<SustainabilitySummary> {
  const months = opts.months ?? 6;

  const records = await prisma.sustainabilityRecord.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { analysis: { select: { category: true } } },
  });

  let itemsRepaired = 0;
  let itemsReused = 0;
  let itemsReplaced = 0;
  let moneySaved = 0;
  let wasteAvoided = 0;

  for (const r of records) {
    if (r.activityType === "REPAIR") itemsRepaired += 1;
    if (r.activityType === "REUSE" || r.activityType === "RECYCLE") itemsReused += 1;
    if (r.activityType === "REPLACE") itemsReplaced += 1;
    if (r.estimatedMoneySaved) moneySaved += Number(r.estimatedMoneySaved);
    if (r.estimatedWasteAvoided) wasteAvoided += Number(r.estimatedWasteAvoided);
  }

  // Monthly activity over the last N months
  const now = new Date();
  const buckets: Array<{ month: string; repairs: number; reuse: number; replace: number }> =
    [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      month: d.toLocaleString("en-US", { month: "short", year: "2-digit" }),
      repairs: 0,
      reuse: 0,
      replace: 0,
    });
  }
  const monthIndex = (date: Date) => {
    const diff =
      (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
    return months - 1 - diff;
  };
  for (const r of records) {
    const idx = monthIndex(new Date(r.createdAt));
    if (idx < 0 || idx >= buckets.length) continue;
    if (r.activityType === "REPAIR") buckets[idx].repairs += 1;
    else if (r.activityType === "REPLACE") buckets[idx].replace += 1;
    else buckets[idx].reuse += 1;
  }

  // Category breakdown
  const categoryMap = new Map<string, { count: number; wasteAvoidedGrams: number }>();
  for (const r of records) {
    const cat = r.analysis?.category ?? "Other";
    const entry = categoryMap.get(cat) ?? { count: 0, wasteAvoidedGrams: 0 };
    entry.count += 1;
    entry.wasteAvoidedGrams += r.estimatedWasteAvoided
      ? Number(r.estimatedWasteAvoided)
      : 0;
    categoryMap.set(cat, entry);
  }

  return {
    itemsRepaired,
    itemsReused,
    itemsReplaced,
    totalEstimatedMoneySaved: Math.round(moneySaved),
    totalEstimatedWasteAvoidedGrams: Math.round(wasteAvoided),
    totalEstimatedCo2AvoidedKg: Math.round((wasteAvoided / 1000) * CO2_PER_KG * 10) / 10,
    decisionsRecorded: records.length,
    monthlyActivity: buckets,
    categoryBreakdown: Array.from(categoryMap.entries()).map(([category, v]) => ({
      category,
      count: v.count,
      wasteAvoidedGrams: Math.round(v.wasteAvoidedGrams),
    })),
    hasData: records.length > 0,
    methodology: {
      methodVersion: "estimate-v1",
      dataSource: "fixit-ai/estimate-v1",
      disclaimers: [
        "All values are ESTIMATES derived from category-average product weights, not measured data.",
        "Money saved = estimated replacement cost − actual repair cost.",
        "CO₂e avoided is indicative only and should not be treated as a verified carbon offset.",
      ],
    },
  };
}

export async function getSustainabilityHistory(
  userId: string,
  opts: { page?: number; pageSize?: number; activityType?: SustainabilityActivityType } = {},
) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 20));
  const where: Prisma.SustainabilityRecordWhereInput = {
    userId,
    ...(opts.activityType ? { activityType: opts.activityType } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.sustainabilityRecord.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        analysis: { select: { id: true, itemName: true, category: true } },
      },
    }),
    prisma.sustainabilityRecord.count({ where }),
  ]);
  return {
    items: items.map((r) => ({
      id: r.id,
      analysisId: r.analysisId,
      itemName: r.analysis?.itemName ?? "Unknown item",
      category: r.analysis?.category ?? "Other",
      activityType: r.activityType,
      actualRepairCost: r.actualRepairCost ? Number(r.actualRepairCost) : null,
      estimatedReplacementCost: r.estimatedReplacementCost
        ? Number(r.estimatedReplacementCost)
        : null,
      estimatedMoneySaved: r.estimatedMoneySaved ? Number(r.estimatedMoneySaved) : null,
      estimatedWasteAvoidedGrams: r.estimatedWasteAvoided
        ? Number(r.estimatedWasteAvoided)
        : null,
      calculationMethod: r.calculationMethod,
      dataSource: r.dataSource,
      createdAt: r.createdAt,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
