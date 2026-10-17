"use client";

import * as React from "react";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Send,
  Loader2,
  RotateCcw,
  Trash2,
  User,
  Bot,
  Info,
} from "lucide-react";
import Link from "next/link";

export interface ChatMessage {
  id: string;
  role: string;
  content: string;
  createdAt?: string;
}

const SUGGESTIONS = [
  "What could be causing this problem?",
  "Can I fix this myself?",
  "What tools might I need?",
  "How much could the repair cost?",
  "When should I contact a professional?",
];

export function ChatInterface({
  analysisId,
  analysisName,
  conversationId,
  initialMessages,
  isMock,
}: {
  analysisId: string;
  analysisName: string;
  conversationId: string | null;
  initialMessages: ChatMessage[];
  isMock: boolean;
}) {
  const { toast } = useToast();
  const [messages, setMessages] = React.useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [failedContent, setFailedContent] = React.useState<string | null>(null);
  const [clearing, setClearing] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || loading) return;
    setInput("");
    setError(null);
    setFailedContent(null);

    const optimistic: ChatMessage = {
      id: `tmp-${Date.now()}`,
      role: "user",
      content,
    };
    setMessages((prev) => [...prev, optimistic]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/troubleshoot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId, content }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "The assistant could not reply.");
      }
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== optimistic.id),
        { id: `u-${Date.now()}`, role: "user", content },
        { id: data.message.id, role: "assistant", content: data.message.content },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to send.";
      setError(msg);
      setFailedContent(content);
      toast({ title: "Message failed", description: msg, variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const retry = () => {
    if (failedContent) {
      const content = failedContent;
      setMessages((prev) => prev.filter((m) => m.id !== "tmp-failed"));
      // remove the optimistic failed user message before resending
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.role === "user" && last.content === content && last.id.startsWith("tmp-")) {
          return prev.slice(0, -1);
        }
        return prev;
      });
      void send(content);
    }
  };

  const clear = async () => {
    if (!conversationId) return;
    setClearing(true);
    try {
      const res = await fetch(`/api/conversations/${analysisId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not clear the conversation.");
      setMessages([]);
      toast({ title: "Conversation cleared", variant: "success" });
    } catch (err) {
      toast({
        title: "Could not clear",
        description: err instanceof Error ? err.message : "",
        variant: "error",
      });
    } finally {
      setClearing(false);
    }
  };

  const showSuggestions = messages.length === 0 && !loading;

  return (
    <div className="flex h-[calc(100vh-140px)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-1 py-3">
        <div>
          <p className="text-sm font-medium">Troubleshooting: {analysisName}</p>
          <Link href={`/analysis/${analysisId}`} className="text-xs text-primary hover:underline">
            View analysis report
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Auto-saved</Badge>
          <Button
            size="sm"
            variant="ghost"
            onClick={clear}
            disabled={clearing || messages.length === 0}
          >
            {clearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            <span className="ml-1 hidden sm:inline">Clear</span>
          </Button>
        </div>
      </div>

      {isMock ? (
        <div className="my-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          <strong>DEMO MODE:</strong> replies are simulated locally because no AI provider is
          configured. Configure `AI_API_KEY` for real answers.
        </div>
      ) : null}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto py-4">
        {showSuggestions ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Try one of these questions:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void send(s)}
                  className="rounded-full border px-3 py-1.5 text-sm transition-colors hover:border-primary hover:bg-accent/10"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.map((m) => (
          <Bubble key={m.id} role={m.role} content={m.content} />
        ))}

        {loading ? (
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Bot className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2 rounded-2xl border px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Thinking…</span>
            </div>
          </div>
        ) : null}
      </div>

      {/* Error + retry */}
      {error ? (
        <div className="mb-2">
          <Alert variant="destructive">
            <AlertTitle>Message not delivered</AlertTitle>
            <AlertDescription className="flex items-center justify-between gap-3">
              <span>{error}</span>
              <Button size="sm" variant="outline" onClick={retry}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      ) : null}

      {/* Input */}
      <form
        className="flex gap-2 border-t pt-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <input
          className="flex h-11 w-full flex-1 rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="Ask about your item…"
          value={input}
          maxLength={2000}
          onChange={(e) => setInput(e.target.value)}
          aria-label="Message"
        />
        <Button type="submit" size="icon" disabled={loading || !input.trim()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
      <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
        <Info className="h-3 w-3" />
        Guidance is informational and may be uncertain — never treat a repair as guaranteed.
      </p>
    </div>
  );
}

function Bubble({ role, content }: { role: string; content: string }) {
  const isUser = role === "user";
  return (
    <div className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser ? "bg-secondary" : "bg-primary/10 text-primary"
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div
        className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm ${
          isUser ? "bg-primary text-primary-foreground" : "border bg-card"
        }`}
      >
        {content}
      </div>
    </div>
  );
}
