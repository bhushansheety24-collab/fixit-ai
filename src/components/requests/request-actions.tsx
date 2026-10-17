"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, Ban, Check, CircleCheck, Star } from "lucide-react";

interface Props {
  requestId: string;
  status: string;
  canReview: boolean;
  hasReview: boolean;
}

export function RequestActions({ requestId, status, canReview, hasReview }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const patch = async (action: string, body: Record<string, unknown>) => {
    setLoading(action);
    setError(null);
    try {
      const res = await fetch(`/api/repair-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Action failed.");
      toast({ title: "Updated", description: data?.request?.status, variant: "success" });
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Action failed.";
      setError(msg);
      toast({ title: "Could not update", description: msg, variant: "error" });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded-lg border border-destructive/40 bg-red-50 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {status === "QUOTE_PROVIDED" ? (
          <Button
            onClick={() => patch("accept", { status: "ACCEPTED" })}
            disabled={loading !== null}
          >
            {loading === "accept" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
            Accept quotation
          </Button>
        ) : null}

        {status === "IN_PROGRESS" ? (
          <Button
            onClick={() => patch("complete", { status: "COMPLETED" })}
            disabled={loading !== null}
          >
            {loading === "complete" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CircleCheck className="mr-2 h-4 w-4" />}
            Confirm completion
          </Button>
        ) : null}

        {["PENDING", "QUOTE_PROVIDED", "ACCEPTED", "SCHEDULED"].includes(status) ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={loading !== null}>
                <Ban className="mr-2 h-4 w-4" />
                Cancel request
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel this repair request?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. The professional will be notified that you
                  cancelled.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep request</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => patch("cancel", { status: "CANCELLED" })}
                >
                  Cancel request
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
      </div>

      {canReview && !hasReview ? <ReviewForm requestId={requestId} /> : null}
    </div>
  );
}

function ReviewForm({ requestId }: { requestId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [rating, setRating] = React.useState(5);
  const [comment, setComment] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/repair-requests/${requestId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment: comment.trim() || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not submit review.");
      toast({ title: "Review submitted", variant: "success" });
      router.refresh();
    } catch (err) {
      toast({
        title: "Review failed",
        description: err instanceof Error ? err.message : "",
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-xl border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold">Review this repair</h3>
      <div className="mb-3 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`Rate ${n} star${n > 1 ? "s" : ""}`}
            onClick={() => setRating(n)}
          >
            <Star
              className={`h-6 w-6 transition-colors ${
                n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"
              }`}
            />
          </button>
        ))}
      </div>
      <Label htmlFor="review-comment">Comment (optional)</Label>
      <Textarea
        id="review-comment"
        rows={3}
        className="mt-2"
        maxLength={2000}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <Button type="submit" className="mt-3" disabled={submitting}>
        {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Submit review
      </Button>
    </form>
  );
}
