import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError } from "@/lib/auth/session";
import { AIProviderError } from "@/lib/ai/provider";
import { StorageError } from "@/lib/storage";

export interface ApiError {
  error: string;
  code?: string;
  details?: unknown;
}

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function jsonError(
  message: string,
  status = 400,
  extra?: { code?: string; details?: unknown },
) {
  return NextResponse.json<ApiError>(
    { error: message, code: extra?.code, details: extra?.details },
    { status },
  );
}

export class AppError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status = 400, code?: string) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
  }
}

/**
 * Central error mapper. Never leaks stack traces or secrets to clients.
 */
export function handleApiError(err: unknown) {
  if (err instanceof ZodError) {
    return jsonError("Validation failed.", 422, {
      code: "VALIDATION_ERROR",
      details: err.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    });
  }

  if (err instanceof AuthError) {
    return jsonError(err.message, err.status, { code: "AUTH_ERROR" });
  }

  if (err instanceof AppError) {
    return jsonError(err.message, err.status, { code: err.code });
  }

  if (err instanceof AIProviderError) {
    const status =
      err.code === "RATE_LIMIT"
        ? 429
        : err.code === "TIMEOUT"
          ? 504
          : err.code === "NO_KEY"
            ? 503
            : 502;
    return jsonError(err.message, status, {
      code: err.code,
    });
  }

  if (err instanceof StorageError) {
    const status = err.code === "INVALID_TYPE" || err.code === "TOO_LARGE" ? 400 : 502;
    return jsonError(err.message, status, { code: err.code });
  }

  // Log server-side diagnostics (no sensitive data)
  console.error("[api] Unhandled error:", err instanceof Error ? err.message : err);
  return jsonError("Something went wrong. Please try again.", 500, {
    code: "INTERNAL_ERROR",
  });
}
