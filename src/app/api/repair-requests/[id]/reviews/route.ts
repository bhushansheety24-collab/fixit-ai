import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { handleApiError, jsonOk } from "@/lib/api/response";
import { createReview } from "@/services/repair-request.service";
import { recalculateRating } from "@/services/professional.service";
import { createReviewSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await req.json();
    const input = createReviewSchema.parse(body);

    const review = await createReview(user.id, id, input);
    await recalculateRating(review.professionalId);
    return jsonOk({ review }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
