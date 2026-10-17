import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, MapPin, BadgeCheck, Clock, IndianRupee } from "lucide-react";

export interface ProfessionalCardData {
  id: string;
  name: string;
  description: string;
  specializations: string[];
  serviceArea: string | null;
  startingPrice: number | null;
  workingHours: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
  profileImageUrl: string | null;
  verified: boolean;
  isDemo: boolean;
  averageRating: number;
  reviewCount: number;
}

export function ProfessionalCard({
  professional,
  categoryQuery,
}: {
  professional: ProfessionalCardData;
  categoryQuery?: string;
}) {
  const p = professional;
  return (
    <Link
      href={`/professionals/${p.id}${categoryQuery ? `?returnCategory=${encodeURIComponent(categoryQuery)}` : ""}`}
      className="block h-full"
    >
      <Card className="h-full transition-all hover:border-primary/40 hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="truncate">{p.name}</span>
                {p.verified ? (
                  <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-600" aria-label="Verified" />
                ) : null}
              </CardTitle>
              <CardDescription className="mt-1 flex flex-wrap items-center gap-3 text-xs">
                <span className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  {p.averageRating.toFixed(1)}
                  <span className="text-muted-foreground">({p.reviewCount})</span>
                </span>
                {p.serviceArea ? (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {p.serviceArea}
                  </span>
                ) : null}
              </CardDescription>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              {p.verified ? <Badge variant="success">Verified</Badge> : null}
              {p.isDemo ? <Badge variant="secondary">Demo data</Badge> : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="line-clamp-3 text-sm text-muted-foreground">{p.description}</p>
          <div className="flex flex-wrap gap-1.5">
            {p.specializations.slice(0, 4).map((s) => (
              <Badge key={s} variant="outline" className="text-xs">
                {s}
              </Badge>
            ))}
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            {p.startingPrice != null ? (
              <span className="flex items-center gap-1">
                <IndianRupee className="h-3.5 w-3.5" />
                from {p.startingPrice.toLocaleString("en-IN")}
              </span>
            ) : (
              <span>Price on request</span>
            )}
            {p.workingHours ? (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {p.workingHours}
              </span>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
