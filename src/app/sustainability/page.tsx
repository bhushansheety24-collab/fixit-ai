import Link from "next/link";
import { requireUserPage } from "@/lib/auth/session";
import {
  getSustainabilitySummary,
  getSustainabilityHistory,
} from "@/services/sustainability.service";
import {
  ActivityChart,
  CategoryChart,
} from "@/components/sustainability/charts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Recycle,
  PiggyBank,
  Trash2,
  Wrench,
  RefreshCcw,
  Info,
} from "lucide-react";

export const dynamic = "force-dynamic";

function formatKg(grams: number): string {
  return grams >= 1000 ? `${(grams / 1000).toFixed(1)} kg` : `${Math.round(grams)} g`;
}

export default async function SustainabilityPage() {
  const user = await requireUserPage();
  const [summary, history] = await Promise.all([
    getSustainabilitySummary(user.id),
    getSustainabilityHistory(user.id, { pageSize: 10 }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold md:text-3xl">Sustainability impact</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Derived entirely from your own repair activity. All financial and waste figures
            are documented estimates, not verified measurements.
          </p>
        </div>
        <Button asChild>
          <Link href="/analyze">Analyze another item</Link>
        </Button>
      </div>

      {!summary.hasData ? (
        <div className="space-y-6">
          <EmptyState
            icon={Recycle}
            title="No sustainability activity yet"
            description="Complete an analysis and record a repair decision, and your impact metrics will appear here."
            action={
              <Button asChild>
                <Link href="/analyze">Start your first analysis</Link>
              </Button>
            }
          />
          <MethodologyCard summary={summary} />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              icon={Wrench}
              label="Items repaired"
              value={String(summary.itemsRepaired)}
              hint="measured from your recorded decisions"
            />
            <MetricCard
              icon={RefreshCcw}
              label="Items reused"
              value={String(summary.itemsReused)}
              hint="reused or recycled decisions"
            />
            <MetricCard
              icon={PiggyBank}
              label="Est. money saved"
              value={`₹${summary.totalEstimatedMoneySaved.toLocaleString("en-IN")}`}
              hint="estimate: replacement − repair cost"
            />
            <MetricCard
              icon={Trash2}
              label="Est. waste avoided"
              value={formatKg(summary.totalEstimatedWasteAvoidedGrams)}
              hint="estimate: category-average weight"
            />
          </div>

          {/* Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Monthly repair activity</CardTitle>
                <CardDescription>Last 6 months — counted from saved records</CardDescription>
              </CardHeader>
              <CardContent>
                <ActivityChart data={summary.monthlyActivity} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Category breakdown</CardTitle>
                <CardDescription>Distribution of your repair decisions</CardDescription>
              </CardHeader>
              <CardContent>
                <CategoryChart data={summary.categoryBreakdown} />
              </CardContent>
            </Card>
          </div>

          {/* Decisions */}
          <div className="grid gap-6 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Decisions summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Row label="Repair decisions" value={String(summary.itemsRepaired)} />
                <Row label="Reuse / recycle decisions" value={String(summary.itemsReused)} />
                <Row label="Replacement decisions" value={String(summary.itemsReplaced)} />
                <Row label="Total records" value={String(summary.decisionsRecorded)} />
                <Separator />
                <Row
                  label="Est. CO₂e avoided"
                  value={`${summary.totalEstimatedCo2AvoidedKg} kg`}
                />
                <p className="text-xs text-muted-foreground">
                  CO₂e figures are indicative only and should not be treated as verified
                  carbon offsets.
                </p>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Recent activity</CardTitle>
                <CardDescription>Latest sustainability records</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {history.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No records yet.</p>
                ) : (
                  history.items.map((r) => (
                    <div
                      key={r.id}
                      className="flex flex-col gap-1 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          <Link href={`/analysis/${r.analysisId}`} className="hover:underline">
                            {r.itemName}
                          </Link>
                          <span className="ml-2 text-muted-foreground">· {r.category}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(r.createdAt).toLocaleDateString()} · {r.calculationMethod}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            r.activityType === "REPAIR"
                              ? "success"
                              : r.activityType === "REPLACE"
                                ? "secondary"
                                : "info"
                          }
                        >
                          {r.activityType}
                        </Badge>
                        {r.estimatedMoneySaved ? (
                          <span className="text-sm font-medium">
                            +₹{r.estimatedMoneySaved.toLocaleString("en-IN")}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <MethodologyCard summary={summary} />
        </div>
      )}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: any;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardDescription className="text-sm">{label}</CardDescription>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function MethodologyCard({ summary }: { summary: { methodology: any } }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Info className="h-4 w-4 text-primary" />
          How these numbers are calculated
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {summary.methodology.disclaimers.map((d: string, i: number) => (
            <li key={i}>{d}</li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">
          Method version: <strong>{summary.methodology.methodVersion}</strong> · Data source:{" "}
          <strong>{summary.methodology.dataSource}</strong>
        </p>
        <p className="text-xs text-muted-foreground">
          The methodology is modular and can be upgraded as better data becomes available.
        </p>
      </CardContent>
    </Card>
  );
}
