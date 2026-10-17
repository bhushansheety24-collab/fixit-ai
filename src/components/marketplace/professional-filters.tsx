"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, SlidersHorizontal } from "lucide-react";
import { ITEM_CATEGORIES } from "@/lib/validation/schemas";

const SORT_OPTIONS = [
  { value: "rating", label: "Highest rated" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "newest", label: "Newest" },
];

export function ProfessionalFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = React.useState(false);

  const [q, setQ] = React.useState(searchParams.get("q") ?? "");
  const [category, setCategory] = React.useState(searchParams.get("category") ?? "");
  const [location, setLocation] = React.useState(searchParams.get("location") ?? "");
  const [sort, setSort] = React.useState(searchParams.get("sort") ?? "rating");
  const [minRating, setMinRating] = React.useState(searchParams.get("minRating") ?? "");

  const apply = (next?: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    const values = {
      q,
      category,
      location,
      sort,
      minRating,
      ...next,
    };
    for (const [k, v] of Object.entries(values)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    params.delete("page");
    router.push(`/professionals?${params.toString()}`);
  };

  const reset = () => {
    setQ("");
    setCategory("");
    setLocation("");
    setSort("rating");
    setMinRating("");
    router.push("/professionals");
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <form
          className="relative flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            apply();
          }}
        >
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name, service or specialty…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search professionals"
          />
        </form>
        <Button variant="outline" onClick={() => setOpen((o) => !o)}>
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          Filters
        </Button>
      </div>

      {open ? (
        <div className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="f-cat">
              Item category
            </label>
            <select
              id="f-cat"
              className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All categories</option>
              {ITEM_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="f-loc">
              Location
            </label>
            <Input
              id="f-loc"
              placeholder="e.g. Mumbai"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="f-rate">
              Minimum rating
            </label>
            <select
              id="f-rate"
              className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={minRating}
              onChange={(e) => setMinRating(e.target.value)}
            >
              <option value="">Any</option>
              <option value="4">4+ stars</option>
              <option value="4.5">4.5+ stars</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="f-sort">
              Sort by
            </label>
            <select
              id="f-sort"
              className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
            <Button size="sm" onClick={() => apply()}>
              Apply filters
            </Button>
            <Button size="sm" variant="ghost" onClick={reset}>
              Reset
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
