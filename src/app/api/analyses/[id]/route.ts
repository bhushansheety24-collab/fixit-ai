import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { handleApiError, jsonOk } from "@/lib/api/response";
import {
  getAnalysisForUser,
  updateAnalysis,
  deleteAnalysis,
} from "@/services/analysis.service";
import { updateAnalysisSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const analysis = await getAnalysisForUser(user.id, id);
    return jsonOk({ analysis });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await req.json();
    const input = updateAnalysisSchema.parse(body);
    const analysis = await updateAnalysis(user.id, id, input);
    return jsonOk({ analysis });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await deleteAnalysis(user.id, id);
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
