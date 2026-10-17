import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { handleApiError, jsonOk } from "@/lib/api/response";
import { getSustainabilitySummary } from "@/services/sustainability.service";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const months = Number(searchParams.get("months") || 6);
    const summary = await getSustainabilitySummary(user.id, { months });
    return jsonOk({ summary });
  } catch (err) {
    return handleApiError(err);
  }
}
