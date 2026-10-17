import { NextRequest } from "next/server";
import { handleApiError, jsonOk } from "@/lib/api/response";
import { getProfessional } from "@/services/professional.service";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const professional = await getProfessional(id);
    return jsonOk({ professional });
  } catch (err) {
    return handleApiError(err);
  }
}
