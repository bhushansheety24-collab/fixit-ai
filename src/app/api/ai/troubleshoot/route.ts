import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { handleApiError, jsonOk, jsonError } from "@/lib/api/response";
import { sendMessage, getOrCreateConversation } from "@/services/troubleshooting.service";
import { sendMessageSchema } from "@/lib/validation/schemas";
import { rateLimit } from "@/lib/security/rate-limit";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  analysisId: z.string().min(1),
  content: sendMessageSchema.shape.content,
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    const limit = await rateLimit(`ai-troubleshoot:${user.id}`, 20, 60_000);
    if (!limit.allowed) {
      return jsonError(
        "You're sending messages too quickly. Please wait a moment.",
        429,
        { code: "RATE_LIMITED" },
      );
    }

    const body = await req.json();
    const { analysisId, content } = bodySchema.parse(body);

    // Ensures ownership + creates conversation if needed.
    const conversation = await getOrCreateConversation(user.id, analysisId);
    const result = await sendMessage(user.id, conversation.id, content);

    return jsonOk({
      conversationId: conversation.id,
      message: result.message,
      provider: result.provider,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
