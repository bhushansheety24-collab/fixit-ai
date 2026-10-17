import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/api/response";
import { troubleshoot, type TroubleshootMessage } from "@/lib/ai/provider";
import { parseStoredAnalysis } from "@/services/analysis.service";

/**
 * Get or create the troubleshooting conversation for an analysis.
 * Enforces ownership.
 */
export async function getOrCreateConversation(userId: string, analysisId: string) {
  const analysis = await prisma.itemAnalysis.findFirst({
    where: { id: analysisId, userId },
    select: { id: true },
  });
  if (!analysis) throw new AppError("Analysis not found.", 404, "NOT_FOUND");

  const existing = await prisma.troubleshootingConversation.findFirst({
    where: { analysisId, userId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (existing) return existing;

  return prisma.troubleshootingConversation.create({
    data: { userId, analysisId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
}

export async function listMessages(userId: string, conversationId: string) {
  const conv = await prisma.troubleshootingConversation.findFirst({
    where: { id: conversationId, userId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!conv) throw new AppError("Conversation not found.", 404, "NOT_FOUND");
  return conv;
}

function buildAnalysisContext(analysis: {
  itemName: string;
  category: string;
  brand: string | null;
  model: string | null;
  condition: string | null;
  itemAge: number | null;
  problemDescription: string;
  symptoms: string | null;
  aiAnalysis: unknown;
}): string {
  const ai = parseStoredAnalysis(analysis.aiAnalysis);
  const lines = [
    `Item: ${analysis.itemName} (${analysis.category})`,
    analysis.brand ? `Brand: ${analysis.brand}` : "",
    analysis.model ? `Model: ${analysis.model}` : "",
    analysis.condition ? `Condition: ${analysis.condition}` : "",
    analysis.itemAge != null ? `Age (months): ${analysis.itemAge}` : "",
    `Problem: ${analysis.problemDescription}`,
    analysis.symptoms ? `Symptoms: ${analysis.symptoms}` : "",
  ];
  if (ai) {
    lines.push(
      `AI severity: ${ai.severity}`,
      `AI repairability: ${ai.repairability}`,
      ai.visibleDamage.length
        ? `Visible damage: ${ai.visibleDamage.join("; ")}`
        : "",
      ai.possibleCauses.length
        ? `Possible causes: ${ai.possibleCauses.map((c) => `${c.cause} (${Math.round(c.confidence * 100)}%)`).join("; ")}`
        : "",
      ai.safetyWarnings.length ? `Safety warnings: ${ai.safetyWarnings.join("; ")}` : "",
      ai.professionalSpecialization
        ? `Recommended specialist: ${ai.professionalSpecialization}`
        : "",
    );
  }
  return lines.filter(Boolean).join("\n");
}

export async function sendMessage(
  userId: string,
  conversationId: string,
  content: string,
) {
  const conv = await prisma.troubleshootingConversation.findFirst({
    where: { id: conversationId, userId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      analysis: true,
    },
  });
  if (!conv) throw new AppError("Conversation not found.", 404, "NOT_FOUND");

  // Persist the user's message first.
  await prisma.chatMessage.create({
    data: { conversationId, role: "user", content },
  });

  const history: TroubleshootMessage[] = conv.messages.map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content,
  }));
  history.push({ role: "user", content });

  const context = buildAnalysisContext(conv.analysis);

  const reply = await troubleshoot({
    analysisContext: context,
    messages: history.slice(-12), // keep recent turns for context
  });

  const assistantMessage = await prisma.chatMessage.create({
    data: { conversationId, role: "assistant", content: reply.content },
  });

  await prisma.troubleshootingConversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  return { message: assistantMessage, provider: reply.provider };
}

export async function clearConversation(userId: string, conversationId: string) {
  const conv = await prisma.troubleshootingConversation.findFirst({
    where: { id: conversationId, userId },
  });
  if (!conv) throw new AppError("Conversation not found.", 404, "NOT_FOUND");
  await prisma.chatMessage.deleteMany({ where: { conversationId } });
  return { ok: true };
}

export async function listConversations(userId: string, limit = 5) {
  return prisma.troubleshootingConversation.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: limit,
    include: {
      analysis: { select: { id: true, itemName: true, category: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
}
