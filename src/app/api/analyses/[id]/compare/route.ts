import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { handleApiError, jsonOk, jsonError } from "@/lib/api/response";
import { getAnalysisForUser, parseStoredAnalysis } from "@/services/analysis.service";
import { comparisonInputSchema } from "@/lib/validation/schemas";
import { evaluateRepairDecision } from "@/services/comparison.service";
import { recordSustainabilityEvent } from "@/services/sustainability.service";
import { z } from "zod";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const analysis = await getAnalysisForUser(user.id, id);
    const ai = parseStoredAnalysis(analysis.aiAnalysis);

    const body = await req.json().catch(() => ({}));

    // Build effective input: defaults from the stored analysis, overridden by
    // whatever the client explicitly provided.
    const defaults: Record<string, unknown> = {
      repairCost:
        ai?.estimatedRepairCost?.max != null && ai.estimatedRepairCost.min != null
          ? Math.round(
              (ai.estimatedRepairCost.min + ai.estimatedRepairCost.max) / 2,
            )
          : undefined,
      replacementCost:
        ai?.estimatedReplacementCost?.max != null &&
        ai.estimatedReplacementCost.min != null
          ? Math.round(
              (ai.estimatedReplacementCost.min + ai.estimatedReplacementCost.max) / 2,
            )
          : undefined,
      itemAgeMonths: analysis.itemAge ?? undefined,
      repairability: ai?.repairability ?? undefined,
      severity: ai?.severity ?? undefined,
      category: analysis.category,
    };

    const merged = { ...defaults, ...body };
    const input = comparisonInputSchema.parse(merged);

    const result = evaluateRepairDecision({
      ...input,
      category: analysis.category,
    });

    if (body.recordDecision === true) {
      await recordSustainabilityEvent({
        userId: user.id,
        analysisId: id,
        activityType:
          result.outcome === "REPAIR"
            ? "REPAIR"
            : result.outcome === "REPLACE"
              ? "REPLACE"
              : "REUSE",
        category: analysis.category,
        actualRepairCost: body.actualRepairCost ?? input.repairCost,
        estimatedReplacementCost: input.replacementCost,
      });
    }

    return jsonOk({ result, input });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(
        "Please provide valid repair and replacement costs to compare.",
        422,
        {
          code: "VALIDATION_ERROR",
          details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        },
      );
    }
    return handleApiError(err);
  }
}
