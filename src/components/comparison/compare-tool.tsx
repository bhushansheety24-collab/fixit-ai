"use client";

import * as React from "react";
import {
  evaluateRepairDecision,
  OUTCOME_LABELS,
  DEFAULT_CATEGORY_THRESHOLDS,
  type DecisionOutcome,
} from "@/services/comparison.service";
import { CATEGORY_WEIGHT_GRAMS } from "@/services/sustainability-engine";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/toast";
import {
  ArrowLeftRight,
  Check,
  Info,
  Loader2,
  Save,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";

export interface CompareAnalysis {
  id: string;
  itemName: string;
  category: string;
  condition: string | null;
  itemAgeMonths: number | null;
  purchasePrice: number | null;
  ai: {
    repairMin: number | null;
    repairMax: number | null;
    replaceMin: number | null;
    replaceMax: number | null;
    currency: string;
    repairability: "likely_repairable" | "possibly_repairable" | "unlikely_repairable" | "not_repairable" | "unknown";
    severity: "minor" | "moderate" | "major" | "critical" | "unknown";
    safetyWarnings: string[];
  } | null;
}

const outcomeStyles: Record<DecisionOutcome, string> = {
  REPAIR: "border-emerald-300 bg-emerald-50 text-emerald-900",
  REPLACE: "border-blue-300 bg-blue-50 text-blue-900",
  INVESTIGATE_FURTHER: "border-amber-300 bg-amber-50 text-amber-900",
  REUSE: "border-teal-300 bg-teal-50 text-teal-900",
  RECYCLE: "border-emerald-300 bg-emerald-50 text-emerald-900",
  DISPOSE_RESPONSIBLY: "border-slate-300 bg-slate-100 text-slate-900",
};

function avg(min: number | null, max: number | null): number | undefined {
  if (min == null && max == null) return undefined;
  if (min == null) return max ?? undefined;
  if (max == null) return min;
  return Math.round((min + max) / 2);
}

export function CompareTool({ analysis }: { analysis: CompareAnalysis | null }) {
  const { toast } = useToast();
  const ai = analysis?.ai ?? null;

  const [repairCost, setRepairCost] = React.useState<string>(
    ai ? String(avg(ai.repairMin, ai.repairMax) ?? "") : "",
  );
  const [replacementCost, setReplacementCost] = React.useState<string>(
    ai ? String(avg(ai.replaceMin, ai.replaceMax) ?? "") : "",
  );
  const [remainingLife, setRemainingLife] = React.useState<string>("");
  const [replacementLife, setReplacementLife] = React.useState<string>("");
  const [budget, setBudget] = React.useState<string>("");
  const [warranty, setWarranty] = React.useState<"in_warranty" | "out_of_warranty" | "unknown">(
    "unknown",
  );
  const [pref, setPref] = React.useState<"prefer_repair" | "neutral" | "prefer_replace">(
    "neutral",
  );
  const [repairAvailable, setRepairAvailable] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const num = (v: string) => (v.trim() === "" ? null : Number(v));
  const repairNum = num(repairCost);
  const replaceNum = num(replacementCost);

  const hasEnoughData = repairNum != null && replaceNum != null && replaceNum > 0;

  const result = React.useMemo(() => {
    if (!hasEnoughData) return null;
    return evaluateRepairDecision({
      repairCost: repairNum as number,
      replacementCost: replaceNum as number,
      remainingLifeMonths: num(remainingLife),
      replacementLifeMonths: num(replacementLife),
      warrantyStatus: warranty,
      itemAgeMonths: analysis?.itemAgeMonths ?? null,
      repairAvailable,
      budget: num(budget),
      sustainabilityPreference: pref,
      repairability: ai?.repairability ?? null,
      severity: ai?.severity ?? null,
      safetyRisk: (ai?.safetyWarnings.length ?? 0) > 0,
      category: analysis?.category ?? null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    hasEnoughData,
    repairCost,
    replacementCost,
    remainingLife,
    replacementLife,
    budget,
    warranty,
    pref,
    repairAvailable,
    analysis,
    ai,
  ]);

  const saveDecision = async () => {
    if (!analysis || !result) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/analyses/${analysis.id}/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repairCost: repairNum,
          replacementCost: replaceNum,
          remainingLifeMonths: num(remainingLife),
          replacementLifeMonths: num(replacementLife),
          warrantyStatus: warranty,
          itemAgeMonths: analysis.itemAgeMonths,
          repairAvailable,
          budget: num(budget),
          sustainabilityPreference: pref,
          recordDecision: true,
          actualRepairCost: repairNum,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not save the decision.");
      toast({
        title: "Decision saved",
        description: "Your sustainability impact has been updated.",
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Could not save",
        description: err instanceof Error ? err.message : "Please retry.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const threshold = analysis
    ? DEFAULT_CATEGORY_THRESHOLDS[analysis.category] ?? 0.4
    : 0.4;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-6">
      <div className="mb-6">
        <Link
          href={analysis ? `/analysis/${analysis.id}` : "/dashboard"}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back
        </Link>
        <h1 className="mt-2 text-2xl font-semibold md:text-3xl">
          Repair vs. Replace
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {analysis
            ? `Comparing options for “${analysis.itemName}” (${analysis.category}).`
            : "Enter your own costs to compare options with the deterministic decision engine."}
        </p>
      </div>

      {ai && ai.safetyWarnings.length > 0 ? (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Safety considerations detected</AlertTitle>
          <AlertDescription>
            <ul className="list-disc space-y-1 pl-5">
              {ai.safetyWarnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Inputs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your inputs</CardTitle>
            <CardDescription>
              Adjust the numbers to explore different scenarios.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="repairCost">Repair cost (₹)</Label>
                <Input
                  id="repairCost"
                  type="number"
                  min={0}
                  placeholder="e.g. 2500"
                  value={repairCost}
                  onChange={(e) => setRepairCost(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="replaceCost">Replacement cost (₹)</Label>
                <Input
                  id="replaceCost"
                  type="number"
                  min={0}
                  placeholder="e.g. 8000"
                  value={replacementCost}
                  onChange={(e) => setReplacementCost(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="remainingLife">Remaining life after repair (months)</Label>
                <Input
                  id="remainingLife"
                  type="number"
                  min={0}
                  placeholder="e.g. 36"
                  value={remainingLife}
                  onChange={(e) => setRemainingLife(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="replacementLife">New item lifespan (months)</Label>
                <Input
                  id="replacementLife"
                  type="number"
                  min={0}
                  placeholder="e.g. 72"
                  value={replacementLife}
                  onChange={(e) => setReplacementLife(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget">Your budget (₹, optional)</Label>
                <Input
                  id="budget"
                  type="number"
                  min={0}
                  placeholder="e.g. 5000"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="warranty">Warranty status</Label>
                <select
                  id="warranty"
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={warranty}
                  onChange={(e) => setWarranty(e.target.value as typeof warranty)}
                >
                  <option value="unknown">Unknown</option>
                  <option value="in_warranty">In warranty</option>
                  <option value="out_of_warranty">Out of warranty</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pref">Sustainability preference</Label>
              <select
                id="pref"
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={pref}
                onChange={(e) => setPref(e.target.value as typeof pref)}
              >
                <option value="prefer_repair">Prefer repair when reasonable</option>
                <option value="neutral">Neutral</option>
                <option value="prefer_replace">Prefer replace when repair isn&apos;t clearly better</option>
              </select>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input accent-[hsl(var(--primary))]"
                checked={repairAvailable}
                onChange={(e) => setRepairAvailable(e.target.checked)}
              />
              A suitable repair professional is available
            </label>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="space-y-4">
          {!result ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Enter a repair cost and a replacement cost to see the recommendation.
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className={outcomeStyles[result.outcome] + " border"}>
                <CardHeader>
                  <CardDescription className="text-current opacity-80">
                    Recommendation
                  </CardDescription>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <ArrowLeftRight className="h-6 w-6" />
                    {OUTCOME_LABELS[result.outcome]}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span>Engine confidence</span>
                      <span className="font-medium">
                        {Math.round(result.confidence * 100)}%
                      </span>
                    </div>
                    <Progress value={Math.round(result.confidence * 100)} />
                  </div>
                  <ul className="space-y-1 text-sm">
                    {result.explanation.map((e, i) => (
                      <li key={i}>• {e}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {result.warnings.length > 0 ? (
                <Alert variant="warning">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Warnings</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc space-y-1 pl-5">
                      {result.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              ) : null}

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Cost comparison</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <Row label="Repair cost" value={`₹${(repairNum ?? 0).toLocaleString("en-IN")}`} />
                  <Row
                    label="Replacement cost"
                    value={`₹${(replaceNum ?? 0).toLocaleString("en-IN")}`}
                  />
                  <Row
                    label="Difference"
                    value={
                      (result.costDifference ?? 0) >= 0
                        ? `Repair is ₹${(result.costDifference ?? 0).toLocaleString("en-IN")} cheaper`
                        : `Repair is ₹${Math.abs(result.costDifference ?? 0).toLocaleString("en-IN")} more expensive`
                    }
                  />
                  <Row
                    label="Repair as % of replacement"
                    value={`${result.repairPercentOfReplacement}% (threshold ${Math.round(
                      result.threshold * 100,
                    )}% for ${analysis?.category ?? "this category"})`}
                  />
                  {result.repairCostPerMonth != null ? (
                    <Row
                      label="Cost per month after repair"
                      value={`₹${result.repairCostPerMonth}`}
                    />
                  ) : null}
                  {result.replaceCostPerMonth != null ? (
                    <Row
                      label="Cost per month for new item"
                      value={`₹${result.replaceCostPerMonth}`}
                    />
                  ) : null}
                  <Separator className="!my-3" />
                  <p className="text-xs text-muted-foreground">
                    Waste avoided by repairing is estimated at{" "}
                    <strong>
                      {((CATEGORY_WEIGHT_GRAMS[analysis?.category ?? "Other"] ?? 2000) / 1000).toFixed(1)} kg
                    </strong>{" "}
                    of product (category-average weight — an estimate, not a measurement).
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Decision factors</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {result.factors.map((f, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${
                        f.impact > 0
                          ? "border-emerald-200 bg-emerald-50/50"
                          : f.impact < 0
                            ? "border-amber-200 bg-amber-50/50"
                            : ""
                      }`}
                    >
                      <div className="mt-0.5">
                        {f.impact > 0 ? (
                          <Check className="h-4 w-4 text-emerald-600" />
                        ) : f.impact < 0 ? (
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                        ) : (
                          <Info className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{f.label}</p>
                        <p className="text-muted-foreground">{f.detail}</p>
                      </div>
                    </div>
                  ))}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Badge variant="outline">Category threshold: {threshold * 100}%</Badge>
                    {result.manualComparisonRecommended ? (
                      <Badge variant="warning">Compare manually</Badge>
                    ) : null}
                  </div>
                </CardContent>
              </Card>

              {analysis ? (
                <Button className="w-full" onClick={saveDecision} disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save this decision to my sustainability record
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Sign in and analyze an item first to save decisions to your
                  sustainability record.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
