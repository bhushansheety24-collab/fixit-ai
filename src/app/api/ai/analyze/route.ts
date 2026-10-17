import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { handleApiError, jsonOk, jsonError } from "@/lib/api/response";
import { runAnalysis } from "@/services/analysis.service";
import { rateLimit } from "@/lib/security/rate-limit";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({ analysisId: z.string().min(1) });

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    // Rate limit AI calls per user.
    const limit = await rateLimit(`ai-analyze:${user.id}`, 10, 60_000);
    if (!limit.allowed) {
      return jsonError(
        "You've reached the analysis limit. Please wait a minute and retry.",
        429,
        { code: "RATE_LIMITED" },
      );
    }

    const body = await req.json();
    const { analysisId } = bodySchema.parse(body);

    const result = await runAnalysis(user.id, analysisId);
    return jsonOk({
      analysis: result.analysis,
      provider: result.provider,
      model: result.model,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
