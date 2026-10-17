"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function RetryAnalysisButton({ analysisId }: { analysisId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);

  const retry = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Analysis failed. Please retry.");
      }
      toast({ title: "Analysis complete", variant: "success" });
      router.refresh();
    } catch (err) {
      toast({
        title: "Analysis failed",
        description: err instanceof Error ? err.message : "Please retry.",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={retry} disabled={loading}>
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
      {loading ? "Analyzing…" : "Retry analysis"}
    </Button>
  );
}
