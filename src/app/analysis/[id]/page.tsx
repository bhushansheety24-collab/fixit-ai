import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUserPage } from "@/lib/auth/session";
import { getAnalysisForUser, parseStoredAnalysis } from "@/services/analysis.service";
import { ReportActions } from "@/components/analysis/report-actions";
import { RetryAnalysisButton } from "@/components/analysis/retry-analysis-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle,
  Leaf,
  Wrench,
  Target,
  Info,
  CircleHelp,
  ShieldCheck,
  FileWarning,
} from "lucide-react";
import {
  SEVERITY_LABELS,
  REPAIRABILITY_LABELS,
} from "@/lib/ai/schemas";

export const dynamic = "force-dynamic";

const severityVariant: Record<string, any> = {
  minor: "success",
  moderate: "warning",
  major: "destructive",
  critical: "destructive",
  unknown: "secondary",
};

const repairabilityVariant: Record<string, any> = {
  likely_repairable: "success",
  possibly_repairable: "info",
  unlikely_repairable: "warning",
  not_repairable: "destructive",
  unknown: "secondary",
};

function formatMoney(amount: number | null | undefined, currency = "INR") {
  if (amount == null) return "—";
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

export default async function AnalysisReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUserPage();
  const { id } = await params;

  const analysis = await getAnalysisForUser(user.id, id).catch(() => null);
  if (!analysis) notFound();

  const ai = parseStoredAnalysis(analysis.aiAnalysis);
  const isMock = analysis.aiProvider === "mock";

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant={severityVariant[analysis.severity ?? "unknown"] ?? "secondary"}>
              {SEVERITY_LABELS[analysis.severity ?? "unknown"] ?? "Unknown"} severity
            </Badge>
            <Badge
              variant={repairabilityVariant[analysis.repairability ?? "unknown"] ?? "secondary"}
            >
              {REPAIRABILITY_LABELS[analysis.repairability ?? "unknown"] ??
                "Unknown repairability"}
            </Badge>
            <Badge variant="outline">
              {analysis.status === "COMPLETED"
                ? "Analysis complete"
                : analysis.status === "FAILED"
                  ? "Analysis failed"
                  : "Analysis pending"}
            </Badge>
          </div>
          <h1 className="text-2xl font-semibold md:text-3xl">{analysis.itemName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {analysis.category}
            {analysis.brand ? ` · ${analysis.brand}` : ""}
            {analysis.model ? ` · ${analysis.model}` : ""} · Reported{" "}
            {new Date(analysis.createdAt).toLocaleDateString()}
          </p>
        </div>
        <ReportActions analysisId={analysis.id} category={analysis.category} />
      </div>

      {/* Provider notices */}
      {isMock ? (
        <Alert variant="warning" className="mb-6">
          <Info className="h-4 w-4" />
          <AlertTitle>DEMO MODE — simulated analysis</AlertTitle>
          <AlertDescription>
            No AI provider is configured (`AI_API_KEY` is unset), so this report was
            generated locally as clearly-labelled example data. It is NOT a real AI
            assessment.
          </AlertDescription>
        </Alert>
      ) : null}

      {analysis.status === "FAILED" ? (
        <Alert variant="destructive" className="mb-6">
          <FileWarning className="h-4 w-4" />
          <AlertTitle>The AI analysis could not be completed</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{analysis.error || "An unknown error occurred."}</p>
            <RetryAnalysisButton analysisId={analysis.id} />
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: details */}
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Uploaded images</CardTitle>
            </CardHeader>
            <CardContent>
              {analysis.imageUrls.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No images were uploaded for this item.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {analysis.imageUrls.map((url, i) => (
                    <div
                      key={url}
                      className="relative aspect-square overflow-hidden rounded-lg border"
                    >
                      <Image
                        src={url}
                        alt={`Item image ${i + 1}`}
                        fill
                        sizes="(max-width: 768px) 50vw, 200px"
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Item details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <DetailRow label="Category" value={analysis.category} />
              <DetailRow label="Brand" value={analysis.brand} />
              <DetailRow label="Model" value={analysis.model} />
              <DetailRow
                label="Purchase price"
                value={
                  analysis.purchasePrice
                    ? formatMoney(Number(analysis.purchasePrice))
                    : null
                }
              />
              <DetailRow
                label="Age"
                value={analysis.itemAge != null ? `${analysis.itemAge} months` : null}
              />
              <DetailRow label="Condition" value={analysis.condition} />
              <Separator className="!my-3" />
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Problem</p>
                <p className="whitespace-pre-wrap">{analysis.problemDescription}</p>
              </div>
              {analysis.symptoms ? (
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Symptoms</p>
                  <p className="whitespace-pre-wrap">{analysis.symptoms}</p>
                </div>
              ) : null}
              {analysis.warrantyInfo ? (
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Warranty info</p>
                  <p className="whitespace-pre-wrap">{analysis.warrantyInfo}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        {/* Right column: AI report */}
        <div className="space-y-6 lg:col-span-2">
          {!ai ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No analysis results are available yet.
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Assessment header */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">AI damage assessment</CardTitle>
                    <Badge variant="secondary" className="capitalize">
                      {isMock ? "Demo data" : "AI generated"}
                    </Badge>
                  </div>
                  <CardDescription>
                    Identified item: <strong>{ai.identifiedItem}</strong> · Confidence:{" "}
                    <strong>{Math.round(ai.confidence * 100)}%</strong>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Overall confidence</span>
                      <span className="font-medium">{Math.round(ai.confidence * 100)}%</span>
                    </div>
                    <Progress value={Math.round(ai.confidence * 100)} />
                  </div>

                  {ai.insufficientEvidence ? (
                    <Alert variant="warning">
                      <CircleHelp className="h-4 w-4" />
                      <AlertTitle>Insufficient evidence</AlertTitle>
                      <AlertDescription>
                        The AI could not reliably assess this item from the available
                        evidence, so findings may be limited or uncertain.
                      </AlertDescription>
                    </Alert>
                  ) : null}

                  {/* Visible damage */}
                  <div>
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                      <Target className="h-4 w-4 text-primary" />
                      Visible damage observations
                    </h3>
                    {ai.visibleDamage.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No visible damage was identified.
                      </p>
                    ) : (
                      <ul className="space-y-1 text-sm">
                        {ai.visibleDamage.map((d, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                            <span>{d}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Possible causes */}
                  <div>
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                      <CircleHelp className="h-4 w-4 text-primary" />
                      Possible causes
                      <span className="text-xs font-normal text-muted-foreground">
                        (distinct from visible observations)
                      </span>
                    </h3>
                    {ai.possibleCauses.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No likely causes were determined.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {ai.possibleCauses.map((c, i) => (
                          <div key={i} className="rounded-lg border p-3">
                            <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                              <span>{c.cause}</span>
                              <Badge variant="secondary" className="shrink-0">
                                {Math.round(c.confidence * 100)}%
                              </Badge>
                            </div>
                            <Progress value={Math.round(c.confidence * 100)} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {ai.disclaimer ? (
                    <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                      {ai.disclaimer}
                    </p>
                  ) : null}
                </CardContent>
              </Card>

              {/* Safety warnings */}
              {ai.safetyWarnings.length > 0 ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Safety warnings</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc space-y-1 pl-5">
                      {ai.safetyWarnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              ) : null}

              {/* Costs & repairability */}
              <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Estimated repair cost</CardDescription>
                    <CardTitle className="text-xl text-emerald-700">
                      {ai.estimatedRepairCost.min == null &&
                      ai.estimatedRepairCost.max == null
                        ? "Unknown"
                        : `${formatMoney(ai.estimatedRepairCost.min, ai.estimatedRepairCost.currency)} – ${formatMoney(ai.estimatedRepairCost.max, ai.estimatedRepairCost.currency)}`}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground">
                    Estimate only — not a verified quote.
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Estimated replacement cost</CardDescription>
                    <CardTitle className="text-xl">
                      {ai.estimatedReplacementCost.min == null &&
                      ai.estimatedReplacementCost.max == null
                        ? "Unknown"
                        : `${formatMoney(ai.estimatedReplacementCost.min, ai.estimatedReplacementCost.currency)} – ${formatMoney(ai.estimatedReplacementCost.max, ai.estimatedReplacementCost.currency)}`}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground">
                    Estimate only — not a verified quote.
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Repairability</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Badge variant={repairabilityVariant[ai.repairability] ?? "secondary"}>
                      {REPAIRABILITY_LABELS[ai.repairability]}
                    </Badge>
                    <Badge variant={severityVariant[ai.severity] ?? "secondary"}>
                      Severity: {SEVERITY_LABELS[ai.severity]}
                    </Badge>
                  </div>

                  {ai.recommendedActions.length > 0 ? (
                    <div>
                      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                        <Wrench className="h-4 w-4 text-primary" />
                        Recommended next steps
                      </h3>
                      <ol className="list-decimal space-y-1 pl-5 text-sm">
                        {ai.recommendedActions.map((a, i) => (
                          <li key={i}>{a}</li>
                        ))}
                      </ol>
                    </div>
                  ) : null}

                  {ai.professionalSpecialization ? (
                    <div>
                      <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        Recommended professional
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Look for a specialist in: <strong>{ai.professionalSpecialization}</strong>
                      </p>
                      <div className="mt-2">
                        <Button size="sm" variant="outline" asChild>
                          <Link
                            href={`/professionals?category=${encodeURIComponent(ai.identifiedItem)}`}
                          >
                            Find professionals
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              {/* Sustainability */}
              {ai.sustainabilityAdvice ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Leaf className="h-4 w-4 text-emerald-600" />
                      Sustainability advice
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{ai.sustainabilityAdvice}</p>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Repairing usually extends product life and avoids waste compared with
                      buying new.
                    </p>
                  </CardContent>
                </Card>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
