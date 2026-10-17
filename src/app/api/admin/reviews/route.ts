import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { handleApiError, jsonOk } from "@/lib/api/response";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { recalculateRating } from "@/services/professional.service";
import { auditLog } from "@/lib/security/audit";

export const runtime = "nodejs";

const querySchema = z.object({
  q: z.string().trim().max(200).optional(),
  hidden: z.enum(["true", "false"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const moderateSchema = z.object({ hidden: z.boolean() });

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const query = querySchema.parse(Object.fromEntries(searchParams.entries()));

    const where: Prisma.ReviewWhereInput = {
      ...(query.hidden !== undefined ? { hidden: query.hidden === "true" } : {}),
      ...(query.q
        ? {
            OR: [
              { comment: { contains: query.q, mode: "insensitive" } },
              { user: { email: { contains: query.q, mode: "insensitive" } } },
              {
                professional: {
                  name: { contains: query.q, mode: "insensitive" },
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.review.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          user: { select: { id: true, name: true, email: true } },
          professional: { select: { id: true, name: true } },
        },
      }),
      prisma.review.count({ where }),
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

/** PATCH /api/admin/reviews  { id, hidden } — hide/show a review. */
export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await req.json();
    const { id, hidden } = moderateSchema.extend({ id: z.string() }).parse(body);

    const review = await prisma.review.update({
      where: { id },
      data: { hidden },
    });
    await recalculateRating(review.professionalId);

    await auditLog({
      actorId: admin.id,
      actorEmail: admin.email,
      action: hidden ? "HIDE_REVIEW" : "SHOW_REVIEW",
      targetType: "Review",
      targetId: id,
    });

    return jsonOk({ review });
  } catch (err) {
    return handleApiError(err);
  }
}
