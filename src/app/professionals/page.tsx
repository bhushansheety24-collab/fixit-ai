import Link from "next/link";
import { Suspense } from "react";
import { searchProfessionals } from "@/services/professional.service";
import { professionalQuerySchema } from "@/lib/validation/schemas";
import { ProfessionalCard } from "@/components/marketplace/professional-card";
import { ProfessionalFilters } from "@/components/marketplace/professional-filters";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchX, ChevronLeft, ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProfessionalsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const parsed = professionalQuerySchema.safeParse(sp);
  const query = parsed.success ? parsed.data : professionalQuerySchema.parse({});

  const result = await searchProfessionals(query);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold md:text-3xl">Repair professionals</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Browse verified specialists, filter by category, location, price and rating, then
          send a repair request directly.
        </p>
      </div>

      <Suspense fallback={<Skeleton className="h-24 w-full" />}>
        <ProfessionalFilters />
      </Suspense>

      <div className="mt-6">
        {result.items.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="No repair professionals found"
            description={
              result.total === 0
                ? "No professionals have been added yet. Administrators can add professionals from the admin dashboard, or adjust your filters."
                : "No professionals match your current filters. Try widening your search."
            }
            action={
              <Button variant="outline" asChild>
                <Link href="/professionals">Clear filters</Link>
              </Button>
            }
          />
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {result.total} professional{result.total === 1 ? "" : "s"}
              </span>
              {(result.page > 1 || result.page < result.totalPages) && (
                <span>
                  Page {result.page} of {result.totalPages}
                </span>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {result.items.map((p) => (
                <ProfessionalCard
                  key={p.id}
                  professional={p}
                  categoryQuery={query.category}
                />
              ))}
            </div>

            {result.totalPages > 1 ? (
              <div className="mt-6 flex items-center justify-center gap-2">
                <Button variant="outline" size="sm" disabled={query.page <= 1} asChild={query.page > 1}>
                  {query.page > 1 ? (
                    <Link href={pageHref(sp, query.page - 1)}>
                      <ChevronLeft className="mr-1 h-4 w-4" />
                      Previous
                    </Link>
                  ) : (
                    <span>Previous</span>
                  )}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {query.page} / {result.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={query.page >= result.totalPages}
                  asChild={query.page < result.totalPages}
                >
                  {query.page < result.totalPages ? (
                    <Link href={pageHref(sp, query.page + 1)}>
                      Next
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Link>
                  ) : (
                    <span>Next</span>
                  )}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function pageHref(sp: Record<string, string | undefined>, page: number): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v) params.set(k, v);
  }
  params.set("page", String(page));
  const qs = params.toString();
  return `/professionals${qs ? `?${qs}` : ""}`;
}
