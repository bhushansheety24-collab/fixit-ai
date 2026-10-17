import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard,
  Sparkles,
  Wrench,
  Users,
  Shield,
  BarChartBig,
} from "lucide-react";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/analyze", label: "Analyze Item", icon: Sparkles },
  { href: "/requests", label: "Repair Requests", icon: Wrench },
  { href: "/professionals", label: "Repair Professionals", icon: Users },
  { href: "/sustainability", label: "Sustainability", icon: BarChartBig },
  { href: "/admin", label: "Admin", icon: Shield, adminOnly: true },
];

export function DashboardShell({
  children,
  isAdmin = false,
  loading = false,
  action,
}: {
  children: React.ReactNode;
  isAdmin?: boolean;
  loading?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 md:flex-row md:px-6">
      <aside className="w-full rounded-xl border bg-card p-4 md:w-72 md:self-start">
        <nav className="flex flex-col gap-1">
          {links.map((link) => {
            if (link.adminOnly && !isAdmin) return null;
            const Icon = link.icon;
            return (
              <Button
                key={link.href}
                variant="ghost"
                asChild
                className="justify-start gap-3"
              >
                <Link href={link.href}>
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              </Button>
            );
          })}
        </nav>
      </aside>
      <section className="flex-1">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Manage your analyses, repair requests and sustainability impact.
            </p>
          </div>
          {loading ? <Skeleton className="h-10 w-40" /> : action}
        </div>
        <Separator className="mb-6" />
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-40 w-full" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-6">{children}</div>
        )}
      </section>
    </div>
  );
}
