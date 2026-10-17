import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { handleApiError, jsonOk } from "@/lib/api/response";
import { prisma } from "@/lib/db/prisma";
import { adminUsersQuerySchema } from "@/lib/validation/schemas";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const query = adminUsersQuerySchema.parse(
      Object.fromEntries(searchParams.entries()),
    );

    const where: Prisma.UserWhereInput = {
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: "insensitive" } },
              { email: { contains: query.q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(query.role ? { role: query.role } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          image: true,
          _count: { select: { analyses: true, repairRequests: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return jsonOk({
      items,
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.ceil(total / query.pageSize),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
