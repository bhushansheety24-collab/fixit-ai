"use client";

import * as React from "react";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Wrench,
  Package,
  Star,
  Plus,
  Search,
  BadgeCheck,
  BadgeX,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MessageSquare,
  Activity,
} from "lucide-react";

interface Stats {
  users: number;
  admins: number;
  analyses: number;
  completedAnalyses: number;
  professionals: number;
  verifiedProfessionals: number;
  repairRequests: number;
  pendingRequests: number;
  reviews: number;
  conversations: number;
  sustainabilityRecords: number;
  recentAnalyses: Array<{ day: string; count: number }>;
}

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data;
}

export function AdminDashboard() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold md:text-3xl">Admin dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All actions here are authorized server-side against your ADMIN role.
        </p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="professionals">Professionals</TabsTrigger>
          <TabsTrigger value="requests">Repair requests</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab />
        </TabsContent>
        <TabsContent value="users">
          <UsersTab />
        </TabsContent>
        <TabsContent value="professionals">
          <ProfessionalsTab />
        </TabsContent>
        <TabsContent value="requests">
          <RequestsTab />
        </TabsContent>
        <TabsContent value="reviews">
          <ReviewsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ----------------------------- Overview ----------------------------- */

function OverviewTab() {
  const [stats, setStats] = React.useState<Stats | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      try {
        const data = await api("/api/admin/stats");
        setStats(data.stats);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load stats.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <EmptyState title="Could not load statistics" description={error} />
    );
  }
  if (!stats) return null;

  const cards = [
    { icon: Users, label: "Users", value: stats.users },
    { icon: Package, label: "Analyses", value: stats.analyses },
    { icon: Activity, label: "Completed analyses", value: stats.completedAnalyses },
    { icon: Wrench, label: "Professionals", value: stats.professionals },
    { icon: BadgeCheck, label: "Verified professionals", value: stats.verifiedProfessionals },
    { icon: Wrench, label: "Repair requests", value: stats.repairRequests },
    { icon: Star, label: "Reviews", value: stats.reviews },
    { icon: MessageSquare, label: "AI conversations", value: stats.conversations },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardDescription className="text-sm">{c.label}</CardDescription>
              <c.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Analyses created (last 14 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2">
            {stats.recentAnalyses.map((d) => (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-primary/70"
                  style={{ height: `${Math.max(4, d.count * 14)}px` }}
                  title={`${d.day}: ${d.count}`}
                />
                <span className="text-[10px] text-muted-foreground">{d.day.slice(5)}</span>
                <span className="text-[10px] font-medium">{d.count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------ Users ------------------------------ */

function UsersTab() {
  const [q, setQ] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const params = new URLSearchParams({ page: String(page), pageSize: "10" });
        if (query) params.set("q", query);
        const res = await api(`/api/admin/users?${params}`);
        if (active) setData(res);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Failed.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [page, query]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Users</CardTitle>
        <CardDescription>{data ? `${data.total} total` : ""}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="relative"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setQuery(q.trim());
          }}
        >
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name or email…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </form>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {loading ? (
          <Skeleton className="h-40" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Analyses</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.items ?? []).map((u: any) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Badge variant={u.role === "ADMIN" ? "destructive" : "secondary"}>
                      {u.role}
                    </Badge>
                  </TableCell>
                  <TableCell>{u._count?.analyses ?? 0}</TableCell>
                  <TableCell>{new Date(u.createdAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <Pagination page={page} totalPages={data?.totalPages ?? 1} setPage={setPage} />
      </CardContent>
    </Card>
  );
}

/* --------------------------- Professionals --------------------------- */

function ProfessionalsTab() {
  const { toast } = useToast();
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState<any>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api("/api/admin/professionals?pageSize=50");
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const toggleVerified = async (id: string, verified: boolean) => {
    setBusy(id);
    try {
      await api(`/api/admin/professionals/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ verified }),
      });
      toast({ title: verified ? "Professional verified" : "Verification removed", variant: "success" });
      await load();
    } catch (err) {
      toast({
        title: "Action failed",
        description: err instanceof Error ? err.message : "",
        variant: "error",
      });
    } finally {
      setBusy(null);
    }
  };

  const remove = async (id: string) => {
    setBusy(id);
    try {
      await api(`/api/admin/professionals/${id}`, { method: "DELETE" });
      toast({ title: "Professional deleted", variant: "success" });
      setDeleting(null);
      await load();
    } catch (err) {
      toast({
        title: "Delete failed",
        description: err instanceof Error ? err.message : "",
        variant: "error",
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <AddProfessionalDialog onCreated={load} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Professionals</CardTitle>
          <CardDescription>
            {data ? `${data.total} total · verification is set by admins` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}
          {loading ? (
            <Skeleton className="h-40" />
          ) : (data?.items ?? []).length === 0 ? (
            <EmptyState
              icon={Wrench}
              title="No professionals yet"
              description="Add the first repair professional to populate the marketplace."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Specializations</TableHead>
                  <TableHead>Service area</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.items ?? []).map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {p.name}
                      {p.isDemo ? (
                        <Badge variant="secondary" className="ml-2">
                          Demo
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {p.specializations.join(", ")}
                    </TableCell>
                    <TableCell>{p.serviceArea ?? "—"}</TableCell>
                    <TableCell>{p.averageRating.toFixed(1)} ({p.reviewCount})</TableCell>
                    <TableCell>
                      <Badge variant={p.verified ? "success" : "secondary"}>
                        {p.verified ? "Verified" : "Unverified"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy === p.id}
                          onClick={() => void toggleVerified(p.id, !p.verified)}
                        >
                          {p.verified ? <BadgeX className="h-4 w-4" /> : <BadgeCheck className="h-4 w-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy === p.id}
                          onClick={() => setDeleting(p)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the professional. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleting && void remove(deleting.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AddProfessionalDialog({ onCreated }: { onCreated: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [form, setForm] = React.useState({
    name: "",
    description: "",
    specializations: "",
    serviceArea: "",
    startingPrice: "",
    workingHours: "",
    contactEmail: "",
    contactPhone: "",
    website: "",
    isDemo: true,
  });

  const set = (k: string) => (e: React.ChangeEvent<any>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api("/api/admin/professionals", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim(),
          specializations: form.specializations
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          serviceArea: form.serviceArea.trim() || null,
          startingPrice: form.startingPrice ? Number(form.startingPrice) : null,
          workingHours: form.workingHours.trim() || null,
          contactEmail: form.contactEmail.trim() || null,
          contactPhone: form.contactPhone.trim() || null,
          website: form.website.trim() || null,
          isDemo: form.isDemo,
        }),
      });
      toast({ title: "Professional added", variant: "success" });
      setOpen(false);
      setForm({ ...form, name: "", description: "", specializations: "" });
      onCreated();
    } catch (err) {
      toast({
        title: "Could not add professional",
        description: err instanceof Error ? err.message : "",
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add professional
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add repair professional</DialogTitle>
          <DialogDescription>
            New professionals start unverified until an admin verifies them.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <Field label="Name">
            <Input value={form.name} onChange={set("name")} required minLength={2} />
          </Field>
          <Field label="Description">
            <textarea
              className="flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={form.description}
              onChange={set("description")}
              required
              minLength={10}
            />
          </Field>
          <Field label="Specializations (comma separated)">
            <Input
              placeholder="Electronics, Home Appliances"
              value={form.specializations}
              onChange={set("specializations")}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Service area">
              <Input value={form.serviceArea} onChange={set("serviceArea")} />
            </Field>
            <Field label="Starting price (₹)">
              <Input type="number" min={0} value={form.startingPrice} onChange={set("startingPrice")} />
            </Field>
            <Field label="Working hours">
              <Input placeholder="Mon-Sat 09:00-18:00" value={form.workingHours} onChange={set("workingHours")} />
            </Field>
            <Field label="Contact email">
              <Input type="email" value={form.contactEmail} onChange={set("contactEmail")} />
            </Field>
            <Field label="Contact phone">
              <Input value={form.contactPhone} onChange={set("contactPhone")} />
            </Field>
            <Field label="Website">
              <Input type="url" placeholder="https://" value={form.website} onChange={set("website")} />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isDemo}
              onChange={(e) => setForm((f) => ({ ...f, isDemo: e.target.checked }))}
              className="h-4 w-4"
            />
            Mark as demo data
          </label>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Add professional
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ----------------------------- Requests ----------------------------- */

function RequestsTab() {
  const { toast } = useToast();
  const [q, setQ] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const params = new URLSearchParams({ page: String(page), pageSize: "15" });
        if (query) params.set("q", query);
        const res = await api(`/api/admin/repair-requests?${params}`);
        if (active) setData(res);
      } catch {
        if (active) toast({ title: "Failed to load requests", variant: "error" });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [page, query, toast]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Repair requests</CardTitle>
        <CardDescription>{data ? `${data.total} total` : ""}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="relative"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setQuery(q.trim());
          }}
        >
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search description, user or professional…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </form>

        {loading ? (
          <Skeleton className="h-40" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Professional</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.items ?? []).map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.analysis?.itemName ?? "—"}</TableCell>
                  <TableCell>{r.user?.email}</TableCell>
                  <TableCell>{r.professional?.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{r.status.replace("_", " ")}</Badge>
                  </TableCell>
                  <TableCell>{new Date(r.createdAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <Pagination page={page} totalPages={data?.totalPages ?? 1} setPage={setPage} />
      </CardContent>
    </Card>
  );
}

/* ------------------------------ Reviews ------------------------------ */

function ReviewsTab() {
  const { toast } = useToast();
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await api("/api/admin/reviews?pageSize=50");
      setData(res);
    } catch {
      toast({ title: "Failed to load reviews", variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const moderate = async (id: string, hidden: boolean) => {
    setBusy(id);
    try {
      await api("/api/admin/reviews", {
        method: "PATCH",
        body: JSON.stringify({ id, hidden }),
      });
      toast({ title: hidden ? "Review hidden" : "Review restored", variant: "success" });
      await load();
    } catch (err) {
      toast({
        title: "Action failed",
        description: err instanceof Error ? err.message : "",
        variant: "error",
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Reviews</CardTitle>
        <CardDescription>{data ? `${data.total} total` : ""} · hide inappropriate reviews</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-40" />
        ) : (data?.items ?? []).length === 0 ? (
          <EmptyState title="No reviews yet" description="Reviews appear after completed repairs." />
        ) : (
          <div className="space-y-3">
            {(data?.items ?? []).map((r: any) => (
              <div key={r.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">
                      {r.user?.email} → {r.professional?.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.rating}★ · {new Date(r.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.hidden ? <Badge variant="destructive">Hidden</Badge> : null}
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === r.id}
                      onClick={() => void moderate(r.id, !r.hidden)}
                    >
                      {busy === r.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : r.hidden ? (
                        "Restore"
                      ) : (
                        "Hide"
                      )}
                    </Button>
                  </div>
                </div>
                {r.comment ? <p className="mt-2 text-sm">{r.comment}</p> : null}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------ Helpers ------------------------------ */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  setPage,
}: {
  page: number;
  totalPages: number;
  setPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-3">
      <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-sm text-muted-foreground">
        {page} / {totalPages}
      </span>
      <Button
        size="sm"
        variant="outline"
        disabled={page >= totalPages}
        onClick={() => setPage(page + 1)}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
