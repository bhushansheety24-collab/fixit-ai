import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/api/response";
import { Prisma } from "@prisma/client";
import type { RepairRequestStatus } from "@/lib/validation/schemas";

/**
 * Allowed status transitions. Enforced server-side — clients can never invent
 * an arbitrary status change.
 */
export const ALLOWED_TRANSITIONS: Record<RepairRequestStatus, RepairRequestStatus[]> = {
  PENDING: ["QUOTE_PROVIDED", "ACCEPTED", "CANCELLED"],
  QUOTE_PROVIDED: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["SCHEDULED", "CANCELLED"],
  SCHEDULED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransition(
  from: RepairRequestStatus,
  to: RepairRequestStatus,
): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

/** A user may only cancel before work has started. */
const USER_CANCELLABLE: RepairRequestStatus[] = [
  "PENDING",
  "QUOTE_PROVIDED",
  "ACCEPTED",
  "SCHEDULED",
];

export async function createRepairRequest(
  userId: string,
  input: {
    analysisId: string;
    professionalId: string;
    description: string;
    requestedDate?: string | null;
  },
) {
  // Ownership: the analysis must belong to the user.
  const analysis = await prisma.itemAnalysis.findFirst({
    where: { id: input.analysisId, userId },
    select: { id: true },
  });
  if (!analysis) {
    throw new AppError("Analysed item not found.", 404, "NOT_FOUND");
  }

  const professional = await prisma.repairProfessional.findUnique({
    where: { id: input.professionalId },
    select: { id: true },
  });
  if (!professional) {
    throw new AppError("Repair professional not found.", 404, "NOT_FOUND");
  }

  const requestedDate = input.requestedDate
    ? new Date(input.requestedDate)
    : null;
  if (requestedDate && Number.isNaN(requestedDate.getTime())) {
    throw new AppError("Invalid requested date.", 422, "VALIDATION_ERROR");
  }

  return prisma.repairRequest.create({
    data: {
      userId,
      analysisId: input.analysisId,
      professionalId: input.professionalId,
      description: input.description,
      requestedDate,
      status: "PENDING",
      statusHistory: [
        { status: "PENDING", at: new Date().toISOString(), by: userId },
      ] as unknown as Prisma.InputJsonValue,
    },
  });
}

export async function listRepairRequests(
  userId: string,
  opts: { page?: number; pageSize?: number; status?: RepairRequestStatus } = {},
) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, opts.pageSize ?? 10));
  const where: Prisma.RepairRequestWhereInput = {
    userId,
    ...(opts.status ? { status: opts.status } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.repairRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        analysis: { select: { id: true, itemName: true, category: true } },
        professional: { select: { id: true, name: true, verified: true } },
      },
    }),
    prisma.repairRequest.count({ where }),
  ]);
  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getRepairRequestForUser(userId: string, id: string) {
  const req = await prisma.repairRequest.findFirst({
    where: { id, userId },
    include: {
      analysis: { select: { id: true, itemName: true, category: true } },
      professional: {
        select: {
          id: true,
          name: true,
          verified: true,
          contactEmail: true,
          contactPhone: true,
          serviceArea: true,
        },
      },
      review: true,
    },
  });
  if (!req) throw new AppError("Repair request not found.", 404, "NOT_FOUND");
  return req;
}

export async function updateRepairRequest(
  userId: string,
  id: string,
  input: { status?: RepairRequestStatus; quotedPrice?: number | null },
  opts: { isAdmin?: boolean } = {},
) {
  const existing = await prisma.repairRequest.findFirst({
    where: opts.isAdmin ? { id } : { id, userId },
  });
  if (!existing) throw new AppError("Repair request not found.", 404, "NOT_FOUND");

  const currentStatus = existing.status as RepairRequestStatus;
  const nextStatus = input.status ?? currentStatus;

  if (input.status && input.status !== currentStatus) {
    if (!canTransition(currentStatus, input.status)) {
      throw new AppError(
        `Cannot change status from ${currentStatus} to ${input.status}.`,
        409,
        "INVALID_TRANSITION",
      );
    }
    if (!opts.isAdmin) {
      // Non-admin users may only cancel eligible requests (and later accept quotes).
      const userAllowed: RepairRequestStatus[] = ["CANCELLED", "ACCEPTED", "COMPLETED"];
      if (!userAllowed.includes(input.status)) {
        throw new AppError(
          "You are not allowed to perform this status change.",
          403,
          "FORBIDDEN",
        );
      }
      if (input.status === "CANCELLED" && !USER_CANCELLABLE.includes(currentStatus)) {
        throw new AppError(
          "This request can no longer be cancelled.",
          409,
          "NOT_CANCELLABLE",
        );
      }
    }
  }

  const history = Array.isArray(existing.statusHistory)
    ? (existing.statusHistory as Prisma.JsonArray)
    : [];
  const newHistory =
    input.status && input.status !== currentStatus
      ? [
          ...history,
          {
            status: input.status,
            at: new Date().toISOString(),
            by: userId,
          },
        ]
      : history;

  return prisma.repairRequest.update({
    where: { id },
    data: {
      status: nextStatus,
      quotedPrice:
        input.quotedPrice === undefined
          ? undefined
          : input.quotedPrice != null
            ? new Prisma.Decimal(input.quotedPrice)
            : null,
      statusHistory: newHistory as Prisma.InputJsonValue,
    },
  });
}

export async function createReview(
  userId: string,
  repairRequestId: string,
  input: { rating: number; comment?: string | null },
) {
  const request = await prisma.repairRequest.findFirst({
    where: { id: repairRequestId, userId },
    include: { review: true },
  });
  if (!request) throw new AppError("Repair request not found.", 404, "NOT_FOUND");
  if (request.status !== "COMPLETED") {
    throw new AppError(
      "You can only review a completed repair.",
      409,
      "NOT_COMPLETED",
    );
  }
  if (request.review) {
    throw new AppError("This repair has already been reviewed.", 409, "ALREADY_REVIEWED");
  }

  return prisma.review.create({
    data: {
      userId,
      professionalId: request.professionalId,
      repairRequestId,
      rating: input.rating,
      comment: input.comment || null,
    },
  });
}
