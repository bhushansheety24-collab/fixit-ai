import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { handleApiError, jsonOk } from "@/lib/api/response";
import { getSustainabilityHistory } from "@/services/sustainability.service";
import { sustainabilityHistoryQuerySchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const query = sustainabilityHistoryQuerySchema.parse(
      Object.fromEntries(searchParams.entries()),
    );
    const result = await getSustainabilityHistory(user.id, query);
    return jsonOk(result);
  } catch (err) {
    return handleApiError(err);
  }
}
