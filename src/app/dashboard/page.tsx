import Link from "next/link";
import { requireUserPage } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Sparkles,
  MessageSquare,
  Users,
  BarChartBig,
  ArrowRight,
  CircleCheck,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUserPage();

  const [
    recentAnalyses,
    repairRequests,
    conversations,
    sustainabilityRecords,
    analysisCount,
    repairCount,
  ] = await Promise.all([
    prisma.itemAnalysis.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.repairRequest.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        professional: { select: { name: true, verified: true } },
        analysis: { select: { itemName: true } },
      },
    }),
    prisma.troubleshootingConversation.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      take: 3,
      include: {
        analysis: { select: { itemName: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
    prisma.sustainabilityRecord.findMany({
      where: { userId: user.id },
      select: {
        estimatedMoneySaved: true,
        estimatedWasteAvoided: true,
        activityType: true,
      },
    }),
    prisma.itemAnalysis.count({ where: { userId: user.id } }),
    prisma.repairRequest.count({
      where: { userId: user.id, status: { notIn: ["CANCELLED"] } },
    }),
  ]);

  const moneySaved = sustainabilityRecords.reduce(
    (sum, r) => sum + (r.estimatedMoneySaved ? Number(r.estimatedMoneySaved) : 0),
    0,
  );
  const wasteAvoided = sustainabilityRecords.reduce(
    (sum, r) => sum + (r.estimatedWasteAvoided ? Number(r.estimatedWasteAvoided) : 0),
    0,
  );
  const itemsRepaired = sustainabilityRecords.filter(
    (r) => r.activityType === "REPAIR",
  ).length;
  const itemsReused = sustainabilityRecords.filter(
    (r) => r.activityType === "REUSE" || r.activityType === "RECYCLE",
  ).length;

  const hasData = analysisCount > 0 || repairRequests.length > 0;

  return (
    <DashboardShell
      action={
        <Button asChild>
          <Link href="/analyze">
            <Sparkles className="h-4 w-4" />
            Analyze New Item
          </Link>
        </Button>
      }
    >
      {/* Welcome + quick stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total analyses
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{analysisCount}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active repair requests
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{repairCount}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Items repaired
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{itemsRepaired}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Estimated money saved
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {Math.round(moneySaved).toLocaleString()}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QuickAction
          href="/analyze"
          icon={Sparkles}
          label="Analyze Damage"
          hint="Upload a photo of a broken item"
        />
        <QuickAction
          href="/compare/new"
          icon={BarChartBig}
          label="Compare Repair Costs"
          hint="Repair vs replace decision engine"
        />
        <QuickAction
          href="/professionals"
          icon={Users}
          label="Find a Professional"
          hint="Browse repair specialists"
        />
        <QuickAction
          href="/sustainability"
          icon={CircleCheck}
          label="Sustainability Impact"
          hint="See money saved and waste avoided"
        />
      </div>

      {!hasData ? (
        <EmptyState
          title="Welcome to FixIt AI"
          description="You haven't analyzed anything yet. Start by uploading a photo of a damaged item to get an AI repair report."
          action={
            <Button asChild>
              <Link href="/analyze">
                Analyze an Item
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent analyses */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent analyses</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentAnalyses.length === 0 ? (
                <p className="text-sm text-muted-foreground">No analyses yet.</p>
              ) : (
                recentAnalyses.map((a) => (
                  <Link
                    key={a.id}
                    href={`/analysis/${a.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent/5"
                  >
                    <div>
                      <p className="text-sm font-medium">{a.itemName}</p>
                      <p className="text-xs text-muted-foreground">{a.category}</p>
                    </div>
                    <Badge
                      variant={
                        a.status === "COMPLETED"
                          ? "success"
                          : a.status === "FAILED"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {a.status === "COMPLETED" ? "Complete" : a.status}
                    </Badge>
                  </Link>
                ))
              )}
              <Button variant="outline" size="sm" asChild className="w-full">
                <Link href="/analyze">Analyze another item</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Repair requests */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Repair requests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {repairRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No repair requests yet.
                </p>
              ) : (
                repairRequests.map((r) => (
                  <Link
                    key={r.id}
                    href={`/requests/${r.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent/5"
                  >
                    <div>
                      <p className="text-sm font-medium">{r.analysis?.itemName}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.professional?.name}
                      </p>
                    </div>
                    <Badge
                      variant={
                        r.status === "COMPLETED"
                          ? "success"
                          : r.status === "CANCELLED"
                            ? "destructive"
                            : "info"
                      }
                    >
                      {r.status.replace("_", " ")}
                    </Badge>
                  </Link>
                ))
              )}
              <Button variant="outline" size="sm" asChild className="w-full">
                <Link href="/requests">View all requests</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Sustainability mini */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Estimated impact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Items repaired</span>
                <span className="font-medium">{itemsRepaired}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Items reused</span>
                <span className="font-medium">{itemsReused}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Est. waste avoided</span>
                <span className="font-medium">
                  {(wasteAvoided / 1000).toFixed(1)} kg
                </span>
              </div>
              <p className="pt-2 text-xs text-muted-foreground">
                Values are estimates based on documented calculations.
              </p>
              <Button variant="outline" size="sm" asChild className="w-full">
                <Link href="/sustainability">View sustainability dashboard</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Recent conversations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Recent troubleshooting chats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {conversations.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No conversations yet. Ask questions about an analysis.
                </p>
              ) : (
                conversations.map((c) => (
                  <Link
                    key={c.id}
                    href={`/assistant/${c.analysisId}`}
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent/5"
                  >
                    <div>
                      <p className="text-sm font-medium">{c.analysis?.itemName}</p>
                      <p className="line-clamp-1 text-xs text-muted-foreground">
                        {c.messages[0]?.content ?? "No messages"}
                      </p>
                    </div>
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardShell>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
  hint,
}: {
  href: string;
  icon: any;
  label: string;
  hint: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{label}</p>
        <p className="truncate text-xs text-muted-foreground">{hint}</p>
      </div>
      <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
    </Link>
  );
}
