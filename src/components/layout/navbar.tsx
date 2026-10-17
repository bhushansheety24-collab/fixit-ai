"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Wrench, Menu, LogOut, LayoutDashboard, Sparkles, Shield } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

function UserMenu() {
  const { data: session } = useSession();
  const router = useRouter();
  const user = session?.user;

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="ghost" asChild>
          <Link href="/sign-in">Sign In</Link>
        </Button>
        <Button asChild>
          <Link href="/sign-up">Get Started</Link>
        </Button>
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  const nameInitial = (user.name || user.email || "U").charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.image || undefined} alt={user.name || "User"} />
            <AvatarFallback>{nameInitial}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">{user.name || user.email}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard">
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/requests">
            <Wrench className="h-4 w-4" />
            Repair Requests
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/sustainability">
            <Sparkles className="h-4 w-4" />
            Sustainability
          </Link>
        </DropdownMenuItem>
        {(user as { role?: string }).role === "ADMIN" ? (
          <DropdownMenuItem asChild>
            <Link href="/admin">
              <Shield className="h-4 w-4" />
              Admin Dashboard
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-600 to-green-700 text-white shadow-sm">
              <Wrench className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold">FixIt AI</span>
          </Link>
          <div className="hidden items-center gap-1 md:flex">
            <Link
              href="/analyze"
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground",
                pathname.startsWith("/analyze") && "text-foreground",
              )}
            >
              Analyze an Item
            </Link>
            <Link
              href="/professionals"
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground",
                pathname.startsWith("/professionals") && "text-foreground",
              )}
            >
              Find Professionals
            </Link>
            <Link
              href="/sustainability"
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground",
                pathname.startsWith("/sustainability") && "text-foreground",
              )}
            >
              Sustainability
            </Link>
            <Link
              href="/compare/new"
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground",
                pathname.startsWith("/compare") && "text-foreground",
              )}
            >
              Compare
            </Link>
          </div>
        </div>
        <div className="hidden items-center gap-3 md:flex">
          <UserMenu />
        </div>
        <button
          className="flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-accent/10 hover:text-foreground md:hidden"
          aria-label="Toggle navigation"
          onClick={() => setOpen((o) => !o)}
        >
          <Menu className="h-5 w-5" />
        </button>
      </nav>
      {open ? (
        <div className="border-t bg-background md:hidden">
          <div className="flex flex-col gap-1 px-4 py-2">
            <Link href="/analyze" className="rounded-md px-2 py-2 text-sm font-medium">
              Analyze
            </Link>
            <Link href="/professionals" className="rounded-md px-2 py-2 text-sm font-medium">
              Find Professionals
            </Link>
            <Link href="/sustainability" className="rounded-md px-2 py-2 text-sm font-medium">
              Sustainability
            </Link>
            <div className="mt-2 flex items-center gap-2">
              <UserMenu />
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
