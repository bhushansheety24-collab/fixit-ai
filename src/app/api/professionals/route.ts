import { NextRequest } from "next/server";
import { handleApiError, jsonOk } from "@/lib/api/response";
import { searchProfessionals } from "@/services/professional.service";
import { professionalQuerySchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = Object.fromEntries(searchParams.entries());
    const parsed = professionalQuerySchema.parse(query);
    const result = await searchProfessionals(parsed);
    return jsonOk(result);
  } catch (err) {
    return handleApiError(err);
  }
}
