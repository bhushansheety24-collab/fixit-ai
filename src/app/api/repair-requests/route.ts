import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { handleApiError, jsonOk } from "@/lib/api/response";
import {
  createRepairRequest,
  listRepairRequests,
} from "@/services/repair-request.service";
import { createRepairRequestSchema, repairRequestStatuses } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const input = createRepairRequestSchema.parse(body);
    const request = await createRepairRequest(user.id, {
      analysisId: input.analysisId,
      professionalId: input.professionalId,
      description: input.description,
      requestedDate: input.requestedDate || null,
    });
    return jsonOk({ request }, { status: 201 });
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
    const statusParam = searchParams.get("status") || undefined;
    const status = repairRequestStatuses.includes(
      statusParam as (typeof repairRequestStatuses)[number],
    )
      ? (statusParam as (typeof repairRequestStatuses)[number])
      : undefined;
    const result = await listRepairRequests(user.id, {
      page,
      pageSize,
      status,
    });
    return jsonOk(result);
  } catch (err) {
    return handleApiError(err);
  }
}
