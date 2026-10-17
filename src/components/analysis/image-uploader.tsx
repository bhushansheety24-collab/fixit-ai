"use client";

import * as React from "react";
import { useDropzone } from "react-dropzone";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { UploadCloud, X, Loader2, AlertCircle, Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

const MAX_MB = 8;
const ACCEPT: Record<string, string[]> = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "image/gif": [".gif"],
  "image/heic": [".heic", ".heif"],
};

export interface UploadedImage {
  url: string;
  fileName?: string;
}

export function ImageUploader({
  value,
  onChange,
  maxFiles = 6,
}: {
  value: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  maxFiles?: number;
}) {
  const { toast } = useToast();
  const [uploading, setUploading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);

  const uploadFiles = async (files: File[]) => {
    setError(null);
    const remaining = maxFiles - value.length;
    if (remaining <= 0) {
      setError(`You can upload up to ${maxFiles} images.`);
      return;
    }
    const toUpload = files.slice(0, remaining);
    if (files.length > toUpload.length) {
      setError(`Only ${remaining} image(s) can be added right now.`);
    }

    // Client-side validation before hitting the server
    for (const f of toUpload) {
      if (!Object.keys(ACCEPT).includes(f.type)) {
        setError(`"${f.name}" is not a supported image type.`);
        return;
      }
      if (f.size > MAX_MB * 1024 * 1024) {
        setError(`"${f.name}" is larger than ${MAX_MB} MB.`);
        return;
      }
    }

    setUploading(true);
    setProgress(15);

    try {
      const formData = new FormData();
      for (const f of toUpload) formData.append("files", f);
      setProgress(45);

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      setProgress(90);
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Upload failed.");
      }

      const newImages: UploadedImage[] = (data.images ?? []).map(
        (img: { url: string }) => ({ url: img.url }),
      );
      onChange([...value, ...newImages]);
      setProgress(100);
      toast({
        title: "Upload complete",
        description: `${newImages.length} image(s) added.`,
        variant: "success",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Please retry.");
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 600);
    }
  };

  const onDrop = React.useCallback(
    (accepted: File[]) => void uploadFiles(accepted),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [value],
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: ACCEPT,
    maxFiles,
    multiple: true,
    noClick: false,
    disabled: uploading,
    onDropRejected: (rejections) => {
      const msg = rejections
        .flatMap((r) => r.errors.map((e) => e.message))
        .slice(0, 2)
        .join(" ");
      setError(msg || "Some files could not be accepted.");
    },
  });

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-input bg-background hover:border-primary/50 hover:bg-accent/5",
          uploading && "pointer-events-none opacity-70",
        )}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        ) : (
          <UploadCloud className="h-8 w-8 text-muted-foreground" />
        )}
        <div>
          <p className="text-sm font-medium">
            {isDragActive ? "Drop the images here" : "Drag & drop images here"}
          </p>
          <p className="text-xs text-muted-foreground">
            or click to browse · JPEG, PNG, WebP, GIF · max {MAX_MB} MB each
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={(e) => {
            e.stopPropagation();
            open();
          }}
        >
          Choose images
        </Button>
      </div>

      {uploading ? <Progress value={progress} /> : null}

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Upload problem</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {value.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {value.map((img) => (
            <div
              key={img.url}
              className="group relative aspect-square overflow-hidden rounded-lg border"
            >
              <Image
                src={img.url}
                alt="Uploaded item"
                fill
                sizes="(max-width: 640px) 50vw, 200px"
                className="object-cover"
              />
              <button
                type="button"
                aria-label="Remove image"
                onClick={() => onChange(value.filter((i) => i.url !== img.url))}
                className="absolute right-1 top-1 rounded-full bg-black/60 p-1.5 text-white opacity-100 transition-opacity hover:bg-black"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {value.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          <ImageIcon className="mr-1 inline h-3 w-3" />
          Images help the AI assess visible damage — but you can continue without them.
        </p>
      ) : null}
    </div>
  );
}
