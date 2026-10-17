import { prisma } from "@/lib/db/prisma";

export interface AdminStats {
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

export async function getAdminStats(): Promise<AdminStats> {
  const [
    users,
    admins,
    analyses,
    completedAnalyses,
    professionals,
    verifiedProfessionals,
    repairRequests,
    pendingRequests,
    reviews,
    conversations,
    sustainabilityRecords,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.itemAnalysis.count(),
    prisma.itemAnalysis.count({ where: { status: "COMPLETED" } }),
    prisma.repairProfessional.count(),
    prisma.repairProfessional.count({ where: { verified: true } }),
    prisma.repairRequest.count(),
    prisma.repairRequest.count({ where: { status: "PENDING" } }),
    prisma.review.count(),
    prisma.troubleshootingConversation.count(),
    prisma.sustainabilityRecord.count(),
  ]);

  // Analyses per day for the last 14 days
  const start = new Date();
  start.setDate(start.getDate() - 13);
  start.setHours(0, 0, 0, 0);
  const recent = await prisma.itemAnalysis.findMany({
    where: { createdAt: { gte: start } },
    select: { createdAt: true },
  });
  const byDay = new Map<string, number>();
  for (let i = 0; i < 14; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    byDay.set(d.toISOString().slice(0, 10), 0);
  }
  for (const a of recent) {
    const key = a.createdAt.toISOString().slice(0, 10);
    byDay.set(key, (byDay.get(key) ?? 0) + 1);
  }

  return {
    users,
    admins,
    analyses,
    completedAnalyses,
    professionals,
    verifiedProfessionals,
    repairRequests,
    pendingRequests,
    reviews,
    conversations,
    sustainabilityRecords,
    recentAnalyses: Array.from(byDay.entries()).map(([day, count]) => ({ day, count })),
  };
}
