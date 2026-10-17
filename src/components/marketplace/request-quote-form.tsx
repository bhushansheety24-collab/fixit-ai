"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth/client";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CalendarClock, Info, LogIn } from "lucide-react";

interface AnalysisOption {
  id: string;
  itemName: string;
  category: string;
}

export function RequestQuoteForm({ professionalId }: { professionalId: string }) {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const { toast } = useToast();

  const [analyses, setAnalyses] = React.useState<AnalysisOption[]>([]);
  const [loadingAnalyses, setLoadingAnalyses] = React.useState(true);
  const [analysisId, setAnalysisId] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [date, setDate] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/analyses?pageSize=50");
        if (res.status === 401) {
          if (active) setError("Sign in to request a repair.");
          return;
        }
        const data = await res.json().catch(() => ({}));
        if (!active) return;
        if (res.ok) {
          setAnalyses(
            (data.items ?? []).map(
              (a: { id: string; itemName: string; category: string }) => ({
                id: a.id,
                itemName: a.itemName,
                category: a.category,
              }),
            ),
          );
        }
      } catch {
        /* ignore */
      } finally {
        if (active) setLoadingAnalyses(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!session) {
      router.push(`/sign-in?redirect=/professionals/${professionalId}`);
      return;
    }
    if (!analysisId) {
      setError("Select the analyzed item you want repaired.");
      return;
    }
    if (description.trim().length < 10) {
      setError("Describe the service you need (at least 10 characters).");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/repair-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisId,
          professionalId,
          description: description.trim(),
          requestedDate: date ? new Date(date).toISOString() : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (Array.isArray(data?.details)) {
          setError(data.details.map((d: { message: string }) => d.message).join(" "));
        } else {
          throw new Error(data?.error || "Could not submit the request.");
        }
        return;
      }
      toast({
        title: "Request sent",
        description: "You can track its status in Repair Requests.",
        variant: "success",
      });
      router.push(`/requests/${data.request.id}`);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not submit the request.";
      setError(msg);
      toast({ title: "Request failed", description: msg, variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  if (isPending) return <Skeletonish />;

  if (!session) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Sign in to request a repair</AlertTitle>
        <AlertDescription className="flex items-center gap-3">
          <span>Repair requests require an account so you can track their status.</span>
          <Button
            size="sm"
            onClick={() => router.push(`/sign-in?redirect=/professionals/${professionalId}`)}
          >
            <LogIn className="mr-2 h-4 w-4" />
            Sign in
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (loadingAnalyses) return <Skeletonish />;

  if (analyses.length === 0) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>No analyzed items yet</AlertTitle>
        <AlertDescription className="flex flex-wrap items-center gap-3">
          <span>Repair requests are linked to an analyzed item.</span>
          <Button size="sm" asChild>
            <a href="/analyze">Analyze an item first</a>
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="analysis">Item to repair</Label>
        <select
          id="analysis"
          className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={analysisId}
          onChange={(e) => setAnalysisId(e.target.value)}
        >
          <option value="">Select an analyzed item…</option>
          {analyses.map((a) => (
            <option key={a.id} value={a.id}>
              {a.itemName} ({a.category})
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="req-desc">Describe the service needed</Label>
        <Textarea
          id="req-desc"
          rows={3}
          placeholder="e.g. The washing machine drum does not spin…"
          value={description}
          maxLength={4000}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="req-date">Preferred date (optional)</Label>
        <Input
          id="req-date"
          type="datetime-local"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarClock className="mr-2 h-4 w-4" />}
        Request a quotation
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        This sends a request only — no payment is processed.
      </p>
    </form>
  );
}

function Skeletonish() {
  return (
    <div className="space-y-3">
      <div className="h-10 animate-pulse rounded-lg bg-muted" />
      <div className="h-20 animate-pulse rounded-lg bg-muted" />
      <div className="h-10 animate-pulse rounded-lg bg-muted" />
    </div>
  );
}
