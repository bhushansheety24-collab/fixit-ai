import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUserPage } from "@/lib/auth/session";
import { getRepairRequestForUser } from "@/services/repair-request.service";
import { RequestActions } from "@/components/requests/request-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { MapPin, Mail, Phone, Wrench, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

const statusVariant: Record<string, any> = {
  PENDING: "secondary",
  QUOTE_PROVIDED: "info",
  ACCEPTED: "info",
  SCHEDULED: "info",
  IN_PROGRESS: "warning",
  COMPLETED: "success",
  CANCELLED: "destructive",
};

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUserPage();
  const { id } = await params;

  const request = await getRepairRequestForUser(user.id, id).catch(() => null);
  if (!request) notFound();

  const history: Array<{ status: string; at: string; by?: string }> = Array.isArray(
    request.statusHistory,
  )
    ? (request.statusHistory as Array<{ status: string; at: string; by?: string }>)
    : [{ status: "PENDING", at: request.createdAt.toISOString() }];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 md:px-6">
      <Link href="/requests" className="text-sm text-muted-foreground hover:text-foreground">
        ← All requests
      </Link>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant={statusVariant[request.status] ?? "secondary"}>
              {request.status.replace("_", " ")}
            </Badge>
            {request.quotedPrice ? (
              <Badge variant="outline">
                ₹{Number(request.quotedPrice).toLocaleString("en-IN")}
              </Badge>
            ) : null}
          </div>
          <h1 className="text-2xl font-semibold">
            {request.analysis?.itemName} — {request.professional?.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Requested {new Date(request.createdAt).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Service description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{request.description}</p>
              {request.requestedDate ? (
                <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Preferred date:{" "}
                  {new Date(request.requestedDate).toLocaleString()}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status history</CardTitle>
              <CardDescription>Every status change is recorded on the server.</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-4">
                {history.map((h, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
                    <div>
                      <p className="text-sm font-medium">
                        {h.status.replace("_", " ")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(h.at).toLocaleString()}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <RequestActions
                requestId={request.id}
                status={request.status}
                canReview={request.status === "COMPLETED"}
                hasReview={!!request.review}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Item</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <p className="font-medium">{request.analysis?.itemName}</p>
              <p className="text-muted-foreground">{request.analysis?.category}</p>
              <Separator className="my-3" />
              <Link
                href={`/analysis/${request.analysis?.id}`}
                className="flex items-center gap-2 text-primary hover:underline"
              >
                <Wrench className="h-4 w-4" />
                View analysis report
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Professional</CardTitle>
              <CardDescription>
                {request.professional?.verified ? "Verified professional" : "Not yet verified"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Link
                href={`/professionals/${request.professional?.id}`}
                className="font-medium text-primary hover:underline"
              >
                {request.professional?.name}
              </Link>
              {request.professional?.serviceArea ? (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {request.professional.serviceArea}
                </p>
              ) : null}
              {request.professional?.contactEmail ? (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  {request.professional.contactEmail}
                </p>
              ) : null}
              {request.professional?.contactPhone ? (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  {request.professional.contactPhone}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
