import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { handleApiError, jsonOk } from "@/lib/api/response";
import {
  getOrCreateConversation,
  clearConversation,
} from "@/services/troubleshooting.service";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ analysisId: string }> },
) {
  try {
    const user = await requireUser();
    const { analysisId } = await params;
    const conversation = await getOrCreateConversation(user.id, analysisId);
    return jsonOk({ conversation });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ analysisId: string }> },
) {
  try {
    const user = await requireUser();
    const { analysisId } = await params;
    const conversation = await getOrCreateConversation(user.id, analysisId);
    await clearConversation(user.id, conversation.id);
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
