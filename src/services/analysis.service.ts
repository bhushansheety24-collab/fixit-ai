import { prisma } from "@/lib/db/prisma";
import { analyzeItem, type AnalysisResult } from "@/lib/ai/provider";
import { aiAnalysisSchema, type AIAnalysis } from "@/lib/ai/schemas";
import type { CreateAnalysisInput } from "@/lib/validation/schemas";
import { AppError } from "@/lib/api/response";
import { Prisma } from "@prisma/client";

/**
 * Create an analysis row (PENDING), then run AI analysis and persist the
 * validated result. Route handlers never contain business logic — they call
 * these service functions.
 */

export async function createAnalysis(
  userId: string,
  input: CreateAnalysisInput,
) {
  return prisma.itemAnalysis.create({
    data: {
      userId,
      itemName: input.itemName,
      category: input.category,
      brand: input.brand || null,
      model: input.model || null,
      purchasePrice: input.purchasePrice != null ? new Prisma.Decimal(input.purchasePrice) : null,
      itemAge: input.itemAge ?? null,
      condition: input.condition || null,
      problemDescription: input.problemDescription,
      symptoms: input.symptoms || null,
      warrantyInfo: input.warrantyInfo || null,
      imageUrls: input.imageUrls,
      status: "PENDING",
    },
  });
}

export async function runAnalysis(
  userId: string,
  analysisId: string,
): Promise<AnalysisResult> {
  const analysis = await prisma.itemAnalysis.findFirst({
    where: { id: analysisId, userId },
  });
  if (!analysis) throw new AppError("Analysis not found.", 404, "NOT_FOUND");

  // Only PENDING or FAILED analyses can be run.
  if (analysis.status === "COMPLETED") {
    const parsed = aiAnalysisSchema.safeParse(analysis.aiAnalysis);
    if (parsed.success) {
      return {
        analysis: parsed.data,
        provider: (analysis.aiProvider as "openai-compatible" | "mock") ?? "mock",
        model: "cached",
      };
    }
  }

  try {
    const result = await analyzeItem({
      category: analysis.category,
      itemName: analysis.itemName,
      brand: analysis.brand,
      model: analysis.model,
      purchasePrice: analysis.purchasePrice ? Number(analysis.purchasePrice) : null,
      itemAge: analysis.itemAge,
      condition: analysis.condition,
      problemDescription: analysis.problemDescription,
      symptoms: analysis.symptoms,
      warrantyInfo: analysis.warrantyInfo,
      imageUrls: analysis.imageUrls,
    });

    await prisma.itemAnalysis.update({
      where: { id: analysisId },
      data: {
        aiAnalysis: result.analysis as unknown as Prisma.InputJsonValue,
        aiProvider: result.provider,
        severity: result.analysis.severity,
        repairability: result.analysis.repairability,
        status: "COMPLETED",
        error: null,
      },
    });

    return result;
  } catch (err) {
    await prisma.itemAnalysis.update({
      where: { id: analysisId },
      data: {
        status: "FAILED",
        error: err instanceof Error ? err.message : "Analysis failed.",
      },
    });
    throw err;
  }
}

export async function listAnalyses(
  userId: string,
  opts: { page?: number; pageSize?: number; category?: string } = {},
) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, opts.pageSize ?? 10));
  const where = {
    userId,
    ...(opts.category ? { category: opts.category } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.itemAnalysis.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.itemAnalysis.count({ where }),
  ]);
  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getAnalysisForUser(userId: string, id: string) {
  const analysis = await prisma.itemAnalysis.findFirst({
    where: { id, userId },
    include: {
      conversations: { orderBy: { updatedAt: "desc" }, take: 1 },
      sustainabilityEvent: true,
    },
  });
  if (!analysis) throw new AppError("Analysis not found.", 404, "NOT_FOUND");
  return analysis;
}

export async function updateAnalysis(
  userId: string,
  id: string,
  data: { itemName?: string; problemDescription?: string; symptoms?: string | null },
) {
  const existing = await prisma.itemAnalysis.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError("Analysis not found.", 404, "NOT_FOUND");
  return prisma.itemAnalysis.update({
    where: { id },
    data: {
      itemName: data.itemName ?? undefined,
      problemDescription: data.problemDescription ?? undefined,
      symptoms: data.symptoms ?? undefined,
    },
  });
}

export async function deleteAnalysis(userId: string, id: string) {
  const existing = await prisma.itemAnalysis.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError("Analysis not found.", 404, "NOT_FOUND");
  await prisma.itemAnalysis.delete({ where: { id } });
  return { ok: true };
}

/** Extract a typed AI analysis payload from a stored record (nullable). */
export function parseStoredAnalysis(value: unknown): AIAnalysis | null {
  const parsed = aiAnalysisSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
