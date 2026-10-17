import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

/**
 * Get the current session (cached per request).
 */
export const getSession = cache(async () => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user?.id) return null;
    return session;
  } catch {
    return null;
  }
});

/**
 * Resolve the session plus the full DB user (with role).
 */
export const getCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session) return null;
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        createdAt: true,
      },
    });
    return user;
  } catch {
    return null;
  }
});

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

/** Throws 401 if not authenticated. Returns the DB user. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("You must be signed in.", 401);
  return user;
}

/** Throws 401/403 if not an admin. Returns the DB user. */
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    throw new AuthError("Admin access required.", 403);
  }
  return user;
}

/* -------------------- For server components (pages) -------------------- */

export type SafeUser = {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  image: string | null;
  createdAt: Date;
};

/**
 * Server-component guard: redirects to /sign-in when unauthenticated.
 * Use for protected pages. (APIs should use requireUser instead.)
 */
export async function requireUserPage(): Promise<SafeUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  return user as SafeUser;
}

/** Returns the user if signed in, otherwise null (no redirect). */
export async function getUserOrNull(): Promise<SafeUser | null> {
  const user = await getCurrentUser();
  return (user as SafeUser | null) ?? null;
}

/** Server-component guard: redirects to /dashboard unless admin. */
export async function requireAdminPage(): Promise<SafeUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (user.role !== "ADMIN") redirect("/dashboard");
  return user as SafeUser;
}
