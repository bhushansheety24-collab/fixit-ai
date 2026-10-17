import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { handleApiError, jsonOk, jsonError } from "@/lib/api/response";
import { uploadImage, validateImage, MAX_IMAGE_BYTES } from "@/lib/storage";
import { rateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

const MAX_FILES = 6;

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    const limit = await rateLimit(`upload:${user.id}`, 30, 60_000);
    if (!limit.allowed) {
      return jsonError("Too many uploads. Please wait a moment.", 429, {
        code: "RATE_LIMITED",
      });
    }

    const formData = await req.formData();
    const files = formData.getAll("files").filter((f): f is File => f instanceof File);

    if (files.length === 0) {
      return jsonError("No file provided.", 400, { code: "NO_FILE" });
    }
    if (files.length > MAX_FILES) {
      return jsonError(`You can upload up to ${MAX_FILES} images.`, 400, {
        code: "TOO_MANY_FILES",
      });
    }

    const total = files.reduce((sum, f) => sum + f.size, 0);
    if (total > MAX_IMAGE_BYTES * MAX_FILES) {
      return jsonError("Uploaded images exceed the maximum total size.", 400, {
        code: "TOO_LARGE",
      });
    }

    const results = [];
    for (const file of files) {
      validateImage({ type: file.type, size: file.size, name: file.name });
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await uploadImage(buffer, file.name, file.type);
      results.push(result);
    }

    return jsonOk({ images: results });
  } catch (err) {
    return handleApiError(err);
  }
}
