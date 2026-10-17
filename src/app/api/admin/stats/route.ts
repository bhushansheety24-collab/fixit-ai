import { requireAdmin } from "@/lib/auth/session";
import { handleApiError, jsonOk } from "@/lib/api/response";
import { getAdminStats } from "@/services/admin.service";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();
    const stats = await getAdminStats();
    return jsonOk({ stats });
  } catch (err) {
    return handleApiError(err);
  }
}
