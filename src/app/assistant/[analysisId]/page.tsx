import { notFound } from "next/navigation";
import { requireUserPage } from "@/lib/auth/session";
import { getAnalysisForUser } from "@/services/analysis.service";
import { getOrCreateConversation } from "@/services/troubleshooting.service";
import { ChatInterface } from "@/components/assistant/chat-interface";
import { isMockMode } from "@/lib/ai/provider";

export const dynamic = "force-dynamic";

export default async function AssistantPage({
  params,
}: {
  params: Promise<{ analysisId: string }>;
}) {
  const user = await requireUserPage();
  const { analysisId } = await params;

  const analysis = await getAnalysisForUser(user.id, analysisId).catch(() => null);
  if (!analysis) notFound();

  const conversation = await getOrCreateConversation(user.id, analysisId);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-6">
      <ChatInterface
        analysisId={analysis.id}
        analysisName={analysis.itemName}
        conversationId={conversation.id}
        isMock={isMockMode()}
        initialMessages={conversation.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          createdAt: m.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
