import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { handleApiError, jsonOk } from "@/lib/api/response";
import {
  getRepairRequestForUser,
  updateRepairRequest,
} from "@/services/repair-request.service";
import { updateRepairRequestSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const request = await getRepairRequestForUser(user.id, id);
    return jsonOk({ request });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await req.json();
    const input = updateRepairRequestSchema.parse(body);
    const isAdmin = user.role === "ADMIN";
    const request = await updateRepairRequest(
      user.id,
      id,
      {
        status: input.status,
        quotedPrice:
          input.quotedPrice !== undefined ? input.quotedPrice : undefined,
      },
      { isAdmin },
    );
    return jsonOk({ request });
  } catch (err) {
    return handleApiError(err);
  }
}
