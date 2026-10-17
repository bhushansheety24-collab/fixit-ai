"use client";

import { createAuthClient } from "better-auth/react";

/**
 * Browser auth client.
 *
 * The base URL is intentionally NOT pinned to NEXT_PUBLIC_APP_URL: Better Auth
 * defaults to the current page origin, so sign-in works on localhost, on any
 * port, and on preview deployments without rebuilding. Set
 * NEXT_PUBLIC_AUTH_URL only if the auth API is served from a different
 * origin than the app itself.
 */
export const authClient = createAuthClient(
  process.env.NEXT_PUBLIC_AUTH_URL
    ? { baseURL: process.env.NEXT_PUBLIC_AUTH_URL }
    : {},
);

export const { useSession, signIn, signUp, signOut } = authClient;
