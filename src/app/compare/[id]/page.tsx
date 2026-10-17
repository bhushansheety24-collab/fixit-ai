import { requireUserPage } from "@/lib/auth/session";
import { getAnalysisForUser, parseStoredAnalysis } from "@/services/analysis.service";
import { CompareTool } from "@/components/comparison/compare-tool";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ComparePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUserPage();
  const { id } = await params;

  const analysis = await getAnalysisForUser(user.id, id).catch(() => null);
  if (!analysis) notFound();

  const ai = parseStoredAnalysis(analysis.aiAnalysis);

  return (
    <CompareTool
      analysis={{
        id: analysis.id,
        itemName: analysis.itemName,
        category: analysis.category,
        condition: analysis.condition,
        itemAgeMonths: analysis.itemAge,
        purchasePrice: analysis.purchasePrice
          ? Number(analysis.purchasePrice)
          : null,
        ai: ai
          ? {
              repairMin: ai.estimatedRepairCost.min,
              repairMax: ai.estimatedRepairCost.max,
              replaceMin: ai.estimatedReplacementCost.min,
              replaceMax: ai.estimatedReplacementCost.max,
              currency: ai.estimatedRepairCost.currency,
              repairability: ai.repairability,
              severity: ai.severity,
              safetyWarnings: ai.safetyWarnings,
            }
          : null,
      }}
    />
  );
}
