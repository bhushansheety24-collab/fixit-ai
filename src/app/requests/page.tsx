import Link from "next/link";
import { requireUserPage } from "@/lib/auth/session";
import { listRepairRequests } from "@/services/repair-request.service";
import { repairRequestStatuses } from "@/lib/validation/schemas";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { Wrench, ChevronLeft, ChevronRight, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

const statusVariant: Record<string, BadgeProps["variant"]> = {
  PENDING: "secondary",
  QUOTE_PROVIDED: "info",
  ACCEPTED: "info",
  SCHEDULED: "info",
  IN_PROGRESS: "warning",
  COMPLETED: "success",
  CANCELLED: "destructive",
};

function StatusLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
        active
          ? "border-transparent bg-primary text-primary-foreground"
          : "bg-transparent text-foreground hover:bg-accent/10"
      }`}
    >
      {label}
    </Link>
  );
}

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const user = await requireUserPage();
  const sp = await searchParams;
  const page = Number(sp.page || 1);
  const status = repairRequestStatuses.includes(sp.status as never)
    ? (sp.status as (typeof repairRequestStatuses)[number])
    : undefined;

  const result = await listRepairRequests(user.id, { page, status });

  const href = (next: number, nextStatus?: string) => {
    const p = new URLSearchParams();
    if (next > 1) p.set("page", String(next));
    if (nextStatus) p.set("status", nextStatus);
    const qs = p.toString();
    return `/requests${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 md:px-6">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Repair requests</h1>
          <p className="text-sm text-muted-foreground">
            Track quotation, scheduling and completion status.
          </p>
        </div>
        <Button asChild>
          <Link href="/professionals">Find a professional</Link>
        </Button>
      </div>

      {/* Status filter */}
      <div className="mb-6 flex flex-wrap gap-2">
        <StatusLink href="/requests" label="All" active={!status} />
        {repairRequestStatuses.map((s) => (
          <StatusLink
            key={s}
            href={`/requests?status=${s}`}
            label={s.replace("_", " ")}
            active={status === s}
          />
        ))}
      </div>

      {result.items.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title={status ? `No ${status.replace("_", " ").toLowerCase()} requests` : "No repair requests yet"}
          description="When you request a repair from a professional, it will show up here so you can track its progress."
          action={
            <Button asChild>
              <Link href="/professionals">Browse repair professionals</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {result.items.map((r) => (
            <Link key={r.id} href={`/requests/${r.id}`}>
              <Card className="mb-3 transition-all hover:border-primary/40 hover:shadow-md">
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {r.analysis?.itemName ?? "Item"} — {r.professional?.name}
                    </p>
                    <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                      {r.description}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(r.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                    <Badge variant={statusVariant[r.status]}>
                      {r.status.replace("_", " ")}
                    </Badge>
                    {r.quotedPrice ? (
                      <span className="text-sm font-semibold">
                        ₹{Number(r.quotedPrice).toLocaleString("en-IN")}
                      </span>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}

          {result.totalPages > 1 ? (
            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" size="sm" asChild={page > 1} disabled={page <= 1}>
                {page > 1 ? (
                  <Link href={href(page - 1, status)}>
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Previous
                  </Link>
                ) : (
                  <span>Previous</span>
                )}
              </Button>
              <span className="text-sm text-muted-foreground">
                {page} / {result.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                asChild={page < result.totalPages}
                disabled={page >= result.totalPages}
              >
                {page < result.totalPages ? (
                  <Link href={href(page + 1, status)}>
                    Next
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                ) : (
                  <span>Next</span>
                )}
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
