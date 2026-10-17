import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { handleApiError, jsonOk } from "@/lib/api/response";
import {
  searchProfessionals,
  createProfessional,
} from "@/services/professional.service";
import {
  adminProfessionalsQuerySchema,
  createProfessionalSchema,
} from "@/lib/validation/schemas";
import { auditLog } from "@/lib/security/audit";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const query = adminProfessionalsQuerySchema.parse(
      Object.fromEntries(searchParams.entries()),
    );
    // Admins must be able to see and moderate unverified professionals.
    const result = await searchProfessionals(query, { includeUnverified: true });
    return jsonOk(result);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await req.json();
    const input = createProfessionalSchema.parse(body);

    const professional = await createProfessional(
      {
        name: input.name,
        description: input.description,
        specializations: input.specializations,
        serviceArea: input.serviceArea ?? null,
        startingPrice: input.startingPrice ?? null,
        workingHours: input.workingHours ?? null,
        contactEmail: input.contactEmail || null,
        contactPhone: input.contactPhone || null,
        website: input.website || null,
        profileImageUrl: input.profileImageUrl || null,
        isDemo: input.isDemo,
      },
      false,
    );

    await auditLog({
      actorId: admin.id,
      action: "CREATE_PROFESSIONAL",
      targetType: "RepairProfessional",
      targetId: professional.id,
    });

    return jsonOk({ professional }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
