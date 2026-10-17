import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { handleApiError, jsonOk, jsonError } from "@/lib/api/response";
import { updateProfessional } from "@/services/professional.service";
import { updateProfessionalSchema } from "@/lib/validation/schemas";
import { prisma } from "@/lib/db/prisma";
import { auditLog } from "@/lib/security/audit";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const input = updateProfessionalSchema.parse(body);

    const professional = await updateProfessional(id, {
      ...input,
      contactEmail: input.contactEmail === undefined ? undefined : input.contactEmail || null,
      contactPhone: input.contactPhone === undefined ? undefined : input.contactPhone || null,
      website: input.website === undefined ? undefined : input.website || null,
      profileImageUrl:
        input.profileImageUrl === undefined ? undefined : input.profileImageUrl || null,
      serviceArea: input.serviceArea === undefined ? undefined : input.serviceArea ?? null,
      startingPrice: input.startingPrice ?? undefined,
      workingHours: input.workingHours === undefined ? undefined : input.workingHours ?? null,
    });

    await auditLog({
      actorId: admin.id,
      actorEmail: admin.email,
      action:
        input.verified !== undefined
          ? input.verified
            ? "VERIFY_PROFESSIONAL"
            : "UNVERIFY_PROFESSIONAL"
          : "UPDATE_PROFESSIONAL",
      targetType: "RepairProfessional",
      targetId: id,
      metadata: { name: professional.name },
    });

    return jsonOk({ professional });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    const existing = await prisma.repairProfessional.findUnique({ where: { id } });
    if (!existing) {
      return jsonError("Not found", 404, { code: "NOT_FOUND" });
    }

    await prisma.repairProfessional.delete({ where: { id } });

    await auditLog({
      actorId: admin.id,
      actorEmail: admin.email,
      action: "DELETE_PROFESSIONAL",
      targetType: "RepairProfessional",
      targetId: id,
      metadata: { name: existing.name },
    });

    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
