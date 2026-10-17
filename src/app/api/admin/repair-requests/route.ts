import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { handleApiError, jsonOk } from "@/lib/api/response";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { repairRequestStatuses } from "@/lib/validation/schemas";

export const runtime = "nodejs";

const querySchema = z.object({
  q: z.string().trim().max(200).optional(),
  status: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const query = querySchema.parse(Object.fromEntries(searchParams.entries()));

    const where: Prisma.RepairRequestWhereInput = {
      ...(repairRequestStatuses.includes(
        query.status as (typeof repairRequestStatuses)[number],
      )
        ? { status: query.status as never }
        : {}),
      ...(query.q
        ? {
            OR: [
              { description: { contains: query.q, mode: "insensitive" } },
              { user: { email: { contains: query.q, mode: "insensitive" } } },
              { professional: { name: { contains: query.q, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.repairRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          user: { select: { id: true, name: true, email: true } },
          professional: { select: { id: true, name: true, verified: true } },
          analysis: { select: { id: true, itemName: true, category: true } },
        },
      }),
      prisma.repairRequest.count({ where }),
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
