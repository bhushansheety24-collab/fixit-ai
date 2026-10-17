/**
 * Image storage abstraction.
 *
 * - If Cloudinary credentials are configured, uploads go to Cloudinary.
 * - Otherwise (local development) images are written to `public/uploads`
 *   and served by Next.js. This is documented as local-only storage.
 *
 * Binary image data is never stored inside database records — only URLs.
 */

import { v2 as cloudinary } from "cloudinary";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
];

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB

export type StorageProvider = "cloudinary" | "s3" | "local";

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );
}

/** Any S3-compatible bucket (AWS S3, R2, MinIO, Supabase Storage, …). */
export function isS3Configured(): boolean {
  return Boolean(
    process.env.S3_BUCKET &&
      process.env.S3_REGION &&
      process.env.S3_ACCESS_KEY_ID &&
      process.env.S3_SECRET_ACCESS_KEY,
  );
}

export function getStorageProvider(): StorageProvider {
  if (isCloudinaryConfigured()) return "cloudinary";
  if (isS3Configured()) return "s3";
  return "local";
}

export class StorageError extends Error {
  code: "INVALID_TYPE" | "TOO_LARGE" | "UPLOAD_FAILED";
  constructor(message: string, code: StorageError["code"]) {
    super(message);
    this.name = "StorageError";
    this.code = code;
  }
}

export function validateImage(file: {
  type: string;
  size: number;
  name?: string;
}): void {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new StorageError(
      `Unsupported file type "${file.type || "unknown"}". Allowed: JPEG, PNG, WebP, GIF, HEIC.`,
      "INVALID_TYPE",
    );
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new StorageError(
      `Image is too large (max ${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)} MB).`,
      "TOO_LARGE",
    );
  }
}

let cloudinaryConfigured = false;
function ensureCloudinary() {
  if (!cloudinaryConfigured) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    cloudinaryConfigured = true;
  }
}

export interface UploadResult {
  url: string;
  provider: StorageProvider;
  publicId?: string;
  width?: number;
  height?: number;
  bytes?: number;
}

/**
 * Upload an image buffer and return a public URL.
 *
 * Provider order: Cloudinary → S3-compatible bucket → local disk (dev only).
 * Image binaries are never written to the database; callers persist the URL.
 */
export async function uploadImage(
  buffer: Buffer,
  filename: string,
  mimeType: string,
): Promise<UploadResult> {
  validateImage({ type: mimeType, size: buffer.byteLength, name: filename });

  const ext = path.extname(filename) || mimeToExt(mimeType);
  const key = `fixit-ai/uploads/${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;

  if (isCloudinaryConfigured()) {
    ensureCloudinary();
    try {
      const result = await new Promise<{
        secure_url: string;
        public_id: string;
        width: number;
        height: number;
        bytes: number;
      }>((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            { folder: "fixit-ai/uploads", resource_type: "image" },
            (error, res) => {
              if (error || !res) return reject(error);
              resolve(res as never);
            },
          )
          .end(buffer);
      });
      return {
        url: result.secure_url,
        provider: "cloudinary",
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
      };
    } catch {
      throw new StorageError("Image upload failed. Please retry.", "UPLOAD_FAILED");
    }
  }

  if (isS3Configured()) {
    try {
      const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
      const bucket = process.env.S3_BUCKET as string;
      const region = process.env.S3_REGION as string;
      const client = new S3Client({
        region,
        ...(process.env.S3_ENDPOINT
          ? { endpoint: process.env.S3_ENDPOINT, forcePathStyle: true }
          : {}),
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID as string,
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY as string,
        },
      });

      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
        }),
      );

      const base =
        process.env.S3_PUBLIC_BASE_URL ||
        (process.env.S3_ENDPOINT
          ? `${process.env.S3_ENDPOINT.replace(/\/$/, "")}/${bucket}`
          : `https://${bucket}.s3.${region}.amazonaws.com`);

      return {
        url: `${base}/${key}`,
        provider: "s3",
        publicId: key,
        bytes: buffer.byteLength,
      };
    } catch {
      throw new StorageError("Image upload failed. Please retry.", "UPLOAD_FAILED");
    }
  }

  // Local dev storage
  const dir = path.join(process.cwd(), "public", "uploads");
  const localName = path.basename(key);
  try {
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, localName), buffer);
  } catch {
    throw new StorageError(
      "Local image storage failed. Check write permissions for public/uploads.",
      "UPLOAD_FAILED",
    );
  }
  return { url: `/uploads/${localName}`, provider: "local", bytes: buffer.byteLength };
}

function mimeToExt(mime: string): string {
  switch (mime) {
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    default:
      return ".jpg";
  }
}
