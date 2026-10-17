import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/api/response";
import { Prisma } from "@prisma/client";
import type { ProfessionalQuery } from "@/lib/validation/schemas";

export interface ProfessionalListResult {
  items: Array<{
    id: string;
    name: string;
    description: string;
    specializations: string[];
    serviceArea: string | null;
    startingPrice: number | null;
    workingHours: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    website: string | null;
    profileImageUrl: string | null;
    verified: boolean;
    isDemo: boolean;
    averageRating: number;
    reviewCount: number;
  }>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function searchProfessionals(
  query: ProfessionalQuery,
  opts: { includeUnverified?: boolean } = {},
): Promise<ProfessionalListResult> {
  const where: Prisma.RepairProfessionalWhereInput = {};

  // Public listings only show verified professionals unless an admin explicitly
  // asks for unverified entries too.
  if (!opts.includeUnverified) {
    where.verified = true;
  }

  if (query.q) {
    where.OR = [
      { name: { contains: query.q, mode: "insensitive" } },
      { description: { contains: query.q, mode: "insensitive" } },
      { specializations: { has: query.q } },
    ];
  }
  if (query.category) {
    where.specializations = { has: query.category };
  }
  if (query.location) {
    where.serviceArea = { contains: query.location, mode: "insensitive" };
  }
  if (query.minRating != null) {
    where.averageRating = { gte: query.minRating };
  }
  if (query.maxPrice != null || query.minPrice != null) {
    where.startingPrice = {
      ...(query.maxPrice != null ? { lte: new Prisma.Decimal(query.maxPrice) } : {}),
      ...(query.minPrice != null ? { gte: new Prisma.Decimal(query.minPrice) } : {}),
    };
  }
  if (query.verifiedOnly || !opts.includeUnverified) {
    where.verified = true;
  }

  const orderBy: Prisma.RepairProfessionalOrderByWithRelationInput =
    query.sort === "price_asc"
      ? { startingPrice: "asc" }
      : query.sort === "price_desc"
        ? { startingPrice: "desc" }
        : query.sort === "newest"
          ? { createdAt: "desc" }
          : { averageRating: "desc" };

  const [rows, total] = await Promise.all([
    prisma.repairProfessional.findMany({
      where,
      orderBy,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.repairProfessional.count({ where }),
  ]);

  return {
    items: rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      specializations: r.specializations,
      serviceArea: r.serviceArea,
      startingPrice: r.startingPrice ? Number(r.startingPrice) : null,
      workingHours: r.workingHours,
      contactEmail: r.contactEmail,
      contactPhone: r.contactPhone,
      website: r.website,
      profileImageUrl: r.profileImageUrl,
      verified: r.verified,
      isDemo: r.isDemo,
      averageRating: r.averageRating,
      reviewCount: r.reviewCount,
    })),
    total,
    page: query.page,
    pageSize: query.pageSize,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

export async function getProfessional(id: string) {
  const professional = await prisma.repairProfessional.findUnique({
    where: { id },
    include: {
      reviews: {
        where: { hidden: false },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { user: { select: { name: true } } },
      },
    },
  });
  if (!professional) throw new AppError("Professional not found.", 404, "NOT_FOUND");
  return {
    ...professional,
    startingPrice: professional.startingPrice
      ? Number(professional.startingPrice)
      : null,
    reviews: professional.reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      userName: r.user.name,
    })),
  };
}

export async function createProfessional(
  data: {
    name: string;
    description: string;
    specializations: string[];
    serviceArea?: string | null;
    startingPrice?: number | null;
    workingHours?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
    website?: string | null;
    profileImageUrl?: string | null;
    isDemo?: boolean;
  },
  verified = false,
) {
  return prisma.repairProfessional.create({
    data: {
      name: data.name,
      description: data.description,
      specializations: data.specializations,
      serviceArea: data.serviceArea || null,
      startingPrice:
        data.startingPrice != null ? new Prisma.Decimal(data.startingPrice) : null,
      workingHours: data.workingHours || null,
      contactEmail: data.contactEmail || null,
      contactPhone: data.contactPhone || null,
      website: data.website || null,
      profileImageUrl: data.profileImageUrl || null,
      isDemo: data.isDemo ?? false,
      verified,
      verifiedAt: verified ? new Date() : null,
    },
  });
}

export async function updateProfessional(
  id: string,
  data: Partial<{
    name: string;
    description: string;
    specializations: string[];
    serviceArea: string | null;
    startingPrice: number | null;
    workingHours: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    website: string | null;
    profileImageUrl: string | null;
    verified: boolean;
    isDemo: boolean;
  }>,
) {
  const existing = await prisma.repairProfessional.findUnique({ where: { id } });
  if (!existing) throw new AppError("Professional not found.", 404, "NOT_FOUND");

  return prisma.repairProfessional.update({
    where: { id },
    data: {
      name: data.name ?? undefined,
      description: data.description ?? undefined,
      specializations: data.specializations ?? undefined,
      serviceArea: data.serviceArea === undefined ? undefined : data.serviceArea,
      startingPrice:
        data.startingPrice === undefined
          ? undefined
          : data.startingPrice != null
            ? new Prisma.Decimal(data.startingPrice)
            : null,
      workingHours: data.workingHours === undefined ? undefined : data.workingHours,
      contactEmail: data.contactEmail === undefined ? undefined : data.contactEmail,
      contactPhone: data.contactPhone === undefined ? undefined : data.contactPhone,
      website: data.website === undefined ? undefined : data.website,
      profileImageUrl:
        data.profileImageUrl === undefined ? undefined : data.profileImageUrl,
      isDemo: data.isDemo ?? undefined,
      verified: data.verified ?? undefined,
      verifiedAt:
        data.verified === undefined
          ? undefined
          : data.verified
            ? existing.verifiedAt ?? new Date()
            : null,
    },
  });
}

/** Recalculate a professional's aggregate rating from visible reviews. */
export async function recalculateRating(professionalId: string) {
  const agg = await prisma.review.aggregate({
    where: { professionalId, hidden: false },
    _avg: { rating: true },
    _count: { rating: true },
  });
  await prisma.repairProfessional.update({
    where: { id: professionalId },
    data: {
      averageRating: agg._avg.rating ?? 0,
      reviewCount: agg._count.rating ?? 0,
    },
  });
}
