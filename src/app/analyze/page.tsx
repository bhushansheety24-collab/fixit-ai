"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSession } from "@/lib/auth/client";
import { createAnalysisSchema, ITEM_CATEGORIES } from "@/lib/validation/schemas";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ImageUploader, type UploadedImage } from "@/components/analysis/image-uploader";
import {
  Monitor,
  Refrigerator,
  Sofa,
  Shirt,
  Footprints,
  Bike,
  Car,
  Home,
  Package,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Check,
  AlertCircle,
  RotateCcw,
} from "lucide-react";

const categoryIcons: Record<string, any> = {
  Electronics: Monitor,
  "Home Appliances": Refrigerator,
  Furniture: Sofa,
  Clothing: Shirt,
  Footwear: Footprints,
  Bicycles: Bike,
  Vehicles: Car,
  "Household Items": Home,
  Other: Package,
};

type FormValues = z.input<typeof createAnalysisSchema>;

const STEPS = ["Category", "Details", "Images", "Review"] as const;

export default function AnalyzePage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const { toast } = useToast();

  const [step, setStep] = React.useState(0);
  const [category, setCategory] = React.useState<string | null>(null);
  const [images, setImages] = React.useState<UploadedImage[]>([]);
  const [submitting, setSubmitting] = React.useState(false);
  const [retryError, setRetryError] = React.useState<{
    message: string;
    analysisId?: string;
  } | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(createAnalysisSchema) as unknown as Resolver<FormValues>,
    mode: "onBlur",
    defaultValues: {
      itemName: "",
      category: "Electronics",
      brand: "",
      model: "",
      purchasePrice: "",
      itemAge: "",
      condition: "",
      problemDescription: "",
      symptoms: "",
      warrantyInfo: "",
      imageUrls: [],
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    setError,
    trigger,
    formState: { errors },
  } = form;

  React.useEffect(() => {
    if (!isPending && !session) {
      router.replace("/sign-in?redirect=/analyze");
    }
  }, [isPending, session, router]);

  // Preview data for step 4
  const values = watch();

  const goNext = async () => {
    if (step === 0) {
      if (!category) {
        toast({ title: "Choose a category", variant: "warning" });
        return;
      }
      setStep(1);
      return;
    }
    if (step === 1) {
      const ok = await trigger([
        "itemName",
        "problemDescription",
        "purchasePrice",
        "itemAge",
        "brand",
        "model",
        "symptoms",
        "condition",
        "warrantyInfo",
      ]);
      if (!ok) {
        toast({ title: "Please fix the highlighted fields.", variant: "warning" });
        return;
      }
      setStep(2);
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const buildPayload = (data: FormValues) => ({
    itemName: data.itemName.trim(),
    category: category ?? "Other",
    brand: data.brand?.trim() || null,
    model: data.model?.trim() || null,
    purchasePrice:
      data.purchasePrice === "" || data.purchasePrice == null
        ? null
        : Number(data.purchasePrice),
    itemAge:
      data.itemAge === "" || data.itemAge == null ? null : Number(data.itemAge),
    condition: data.condition?.trim() || null,
    problemDescription: data.problemDescription.trim(),
    symptoms: data.symptoms?.trim() || null,
    warrantyInfo: data.warrantyInfo?.trim() || null,
    imageUrls: images.map((i) => i.url),
  });

  const runAnalysis = async (analysisId: string) => {
    setRetryError(null);
    const res = await fetch("/api/ai/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ analysisId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw Object.assign(new Error(data?.error || "AI analysis failed."), {
        analysisId,
        retryable: true,
      });
    }
    return data;
  };

  const onSubmit = handleSubmit(async (data) => {
    if (!category) return;
    setSubmitting(true);
    setRetryError(null);
    let analysisId: string | undefined;
    try {
      // 1. Persist the analysis
      const createRes = await fetch("/api/analyses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(data)),
      });
      const createData = await createRes.json().catch(() => ({}));
      if (!createRes.ok) {
        if (Array.isArray(createData.details)) {
          createData.details.forEach((d: { path: string; message: string }) => {
            setError(d.path as keyof FormValues, { message: d.message });
          });
        }
        throw new Error(createData?.error || "Could not save the analysis.");
      }
      analysisId = createData.analysis.id;
      if (!analysisId) {
        throw new Error("Could not save the analysis.");
      }

      // 2. Run the AI analysis
      await runAnalysis(analysisId);

      toast({ title: "Analysis complete", variant: "success" });
      router.push(`/analysis/${analysisId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Analysis failed.";
      setRetryError({ message, analysisId });
      toast({ title: "Analysis failed", description: message, variant: "error" });
    } finally {
      setSubmitting(false);
    }
  });

  const retryAnalysis = async () => {
    if (!retryError?.analysisId) return;
    setSubmitting(true);
    setRetryError(null);
    try {
      await runAnalysis(retryError.analysisId);
      toast({ title: "Analysis complete", variant: "success" });
      router.push(`/analysis/${retryError.analysisId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Analysis failed.";
      setRetryError({ message, analysisId: retryError.analysisId });
    } finally {
      setSubmitting(false);
    }
  };

  if (isPending) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Progress value={0} />
        <p className="mt-4 text-sm text-muted-foreground">Checking your session…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-6">
      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Analyze an item</h1>
            <p className="text-sm text-muted-foreground">
              Step {step + 1} of {STEPS.length} · {STEPS[step]}
            </p>
          </div>
          <Badge variant="secondary">
            {STEPS.map((s, i) => (
              <span
                key={s}
                className={i <= step ? "text-primary" : "text-muted-foreground"}
              >
                {i <= step ? "●" : "○"}
              </span>
            ))}
          </Badge>
        </div>
        <Progress value={((step + 1) / STEPS.length) * 100} />
      </div>

      {retryError ? (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Analysis could not be completed</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{retryError.message}</p>
            {retryError.analysisId ? (
              <div className="flex gap-2">
                <Button size="sm" onClick={retryAnalysis} disabled={submitting}>
                  {submitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="mr-2 h-4 w-4" />
                  )}
                  Retry analysis
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  asChild
                >
                  <a href={`/analysis/${retryError.analysisId}`}>View saved report</a>
                </Button>
              </div>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Step 0: Category */}
      {step === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Select a category</CardTitle>
            <CardDescription>
              This helps the AI focus its assessment and the decision engine choose
              an appropriate repair threshold.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {ITEM_CATEGORIES.map((cat) => {
                const Icon = categoryIcons[cat] ?? Package;
                const selected = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-sm font-medium transition-all hover:shadow-sm ${
                      selected
                        ? "border-primary bg-primary/5 text-primary"
                        : "hover:border-primary/40"
                    }`}
                  >
                    <Icon className="h-6 w-6" />
                    {cat}
                    {selected ? <Check className="h-4 w-4" /> : null}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Step 1: Details */}
      {step === 1 ? (
        <Card>
          <CardHeader>
            <CardTitle>Item details</CardTitle>
            <CardDescription>
              Provide as much context as possible for a better assessment.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Item name" error={errors.itemName?.message} required>
                  <Input
                    placeholder="e.g. Samsung Refrigerator"
                    {...register("itemName")}
                  />
                </Field>
                <Field label="Brand" error={errors.brand?.message}>
                  <Input placeholder="e.g. Samsung" {...register("brand")} />
                </Field>
                <Field label="Model" error={errors.model?.message}>
                  <Input placeholder="e.g. RS62" {...register("model")} />
                </Field>
                <Field label="Approx. purchase price (₹)" error={errors.purchasePrice?.message}>
                  <Input
                    type="number"
                    min={0}
                    placeholder="e.g. 25000"
                    {...register("purchasePrice")}
                  />
                </Field>
                <Field label="Approx. age (months)" error={errors.itemAge?.message}>
                  <Input
                    type="number"
                    min={0}
                    placeholder="e.g. 18"
                    {...register("itemAge")}
                  />
                </Field>
                <Field label="Item condition" error={errors.condition?.message}>
                  <select
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    {...register("condition")}
                  >
                    <option value="">Select condition</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                    <option value="Poor">Poor</option>
                    <option value="Barely working">Barely working</option>
                    <option value="Not working">Not working</option>
                  </select>
                </Field>
              </div>

              <Field
                label="Problem description"
                error={errors.problemDescription?.message}
                required
              >
                <Textarea
                  rows={4}
                  placeholder="Describe what's wrong…"
                  {...register("problemDescription")}
                />
              </Field>

              <Field label="Symptoms" error={errors.symptoms?.message}>
                <Textarea
                  rows={3}
                  placeholder="e.g. strange noise, not turning on"
                  {...register("symptoms")}
                />
              </Field>

              <Field label="Warranty / purchase info (optional)" error={errors.warrantyInfo?.message}>
                <Input placeholder="e.g. 2-year warranty" {...register("warrantyInfo")} />
              </Field>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {/* Step 2: Images */}
      {step === 2 ? (
        <Card>
          <CardHeader>
            <CardTitle>Upload photos</CardTitle>
            <CardDescription>
              Photos of the damage significantly improve the accuracy of the AI
              assessment.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ImageUploader value={images} onChange={setImages} />
          </CardContent>
        </Card>
      ) : null}

      {/* Step 3: Review */}
      {step === 3 ? (
        <Card>
          <CardHeader>
            <CardTitle>Review and submit</CardTitle>
            <CardDescription>Confirm the details before analysis.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <ReviewItem label="Category" value={category ?? "—"} />
              <ReviewItem label="Item" value={values.itemName || "—"} />
              <ReviewItem label="Brand / Model" value={`${values.brand || "—"} ${values.model || "—"}`} />
              <ReviewItem label="Price" value={values.purchasePrice ? `₹${values.purchasePrice}` : "—"} />
              <ReviewItem label="Age" value={values.itemAge ? `${values.itemAge} months` : "—"} />
              <ReviewItem label="Condition" value={values.condition || "—"} />
            </dl>
            <Separator />
            <div>
              <p className="mb-1 text-sm font-medium">Problem</p>
              <p className="text-sm text-muted-foreground">{values.problemDescription}</p>
            </div>
            <div>
              <p className="mb-1 text-sm font-medium">Photos</p>
              <p className="text-sm text-muted-foreground">
                {images.length} image(s) attached
              </p>
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                AI assessments are estimates, not verified diagnoses or quotes.
                Safety-critical repairs should always be handled by a qualified
                professional.
              </AlertDescription>
            </Alert>
            <form onSubmit={onSubmit}>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                {submitting ? "Analyzing…" : "Run AI analysis"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {/* Navigation */}
      <div className="mt-6 flex items-center justify-between">
        <Button
          variant="outline"
          onClick={goBack}
          disabled={step === 0 || submitting}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={goNext}>
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  const htmlFor = React.useId();
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor} className={error ? "text-destructive" : undefined}>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<any>, {
            id: htmlFor,
          })
        : children}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
