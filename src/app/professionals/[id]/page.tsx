import Link from "next/link";
import { notFound } from "next/navigation";
import { getProfessional } from "@/services/professional.service";
import { RequestQuoteForm } from "@/components/marketplace/request-quote-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Star, MapPin, BadgeCheck, Clock, Phone, Mail, Globe, IndianRupee } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProfessionalProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const professional = await getProfessional(id).catch(() => null);
  if (!professional) notFound();

  const p = professional;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-6">
      <Link href="/professionals" className="text-sm text-muted-foreground hover:text-foreground">
        ← All professionals
      </Link>

      <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold md:text-3xl">{p.name}</h1>
            {p.verified ? (
              <Badge variant="success" className="flex items-center gap-1">
                <BadgeCheck className="h-3.5 w-3.5" />
                Verified
              </Badge>
            ) : null}
            {p.isDemo ? <Badge variant="secondary">Demo data</Badge> : null}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <strong className="text-foreground">{p.averageRating.toFixed(1)}</strong>
              ({p.reviewCount} review{p.reviewCount === 1 ? "" : "s"})
            </span>
            {p.serviceArea ? (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {p.serviceArea}
              </span>
            ) : null}
            {p.startingPrice != null ? (
              <span className="flex items-center gap-1">
                <IndianRupee className="h-4 w-4" />
                from {p.startingPrice.toLocaleString("en-IN")}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">About</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="whitespace-pre-wrap text-sm">{p.description}</p>
              <div className="flex flex-wrap gap-2">
                {p.specializations.map((s) => (
                  <Badge key={s} variant="outline">
                    {s}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Reviews</CardTitle>
              <CardDescription>
                {p.reviewCount === 0
                  ? "No reviews yet."
                  : `Showing ${p.reviews.length} of ${p.reviewCount}.`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {p.reviews.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Reviews can be left after a completed repair request.
                </p>
              ) : (
                p.reviews.map((r) => (
                  <div key={r.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{r.userName}</span>
                      <span className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={
                              i < r.rating
                                ? "h-3.5 w-3.5 fill-amber-400 text-amber-400"
                                : "h-3.5 w-3.5 text-muted-foreground/40"
                            }
                          />
                        ))}
                      </span>
                    </div>
                    {r.comment ? (
                      <p className="text-sm text-muted-foreground">{r.comment}</p>
                    ) : null}
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Request a repair</CardTitle>
              <CardDescription>
                Select an analyzed item and send a quotation request.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RequestQuoteForm professionalId={p.id} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {p.workingHours ? (
                <div className="flex items-start gap-2">
                  <Clock className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <span>{p.workingHours}</span>
                </div>
              ) : null}
              {p.contactEmail ? (
                <div className="flex items-start gap-2">
                  <Mail className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${p.contactEmail}`} className="break-all text-primary hover:underline">
                    {p.contactEmail}
                  </a>
                </div>
              ) : null}
              {p.contactPhone ? (
                <div className="flex items-start gap-2">
                  <Phone className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <span>{p.contactPhone}</span>
                </div>
              ) : null}
              {p.website ? (
                <div className="flex items-start gap-2">
                  <Globe className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <a
                    href={p.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all text-primary hover:underline"
                  >
                    {p.website}
                  </a>
                </div>
              ) : null}
              {!p.workingHours && !p.contactEmail && !p.contactPhone && !p.website ? (
                <p className="text-muted-foreground">No contact details provided.</p>
              ) : null}
              <Separator />
              <p className="text-xs text-muted-foreground">
                {p.verified
                  ? "Verification is set by an administrator."
                  : "This professional has not been verified yet."}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
