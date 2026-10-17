import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { handleApiError, jsonOk } from "@/lib/api/response";
import { createAnalysis, listAnalyses } from "@/services/analysis.service";
import { createAnalysisSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const input = createAnalysisSchema.parse(body);
    const analysis = await createAnalysis(user.id, input);
    return jsonOk({ analysis }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get("page") || 1);
    const pageSize = Number(searchParams.get("pageSize") || 10);
    const category = searchParams.get("category") || undefined;
    const result = await listAnalyses(user.id, { page, pageSize, category });
    return jsonOk(result);
  } catch (err) {
    return handleApiError(err);
  }
}
