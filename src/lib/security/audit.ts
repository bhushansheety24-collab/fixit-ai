import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";

/**
 * Append-only audit log for important administrative actions.
 * Never records sensitive values such as passwords or tokens.
 */
export async function auditLog(entry: {
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: entry.actorId ?? null,
        actorEmail: entry.actorEmail ?? null,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId ?? null,
        metadata: (entry.metadata ?? {}) as unknown as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    // Audit failures must never break the primary operation, but log server-side.
    console.error("[audit] Failed to write audit log:", err instanceof Error ? err.message : err);
  }
}

export async function listAuditLogs(opts: { limit?: number } = {}) {
  return prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: Math.min(200, opts.limit ?? 50),
  });
}
