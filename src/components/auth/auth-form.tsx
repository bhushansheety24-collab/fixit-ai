"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Wrench, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/toast";

const baseSchema = z.object({
  name: z.string(),
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

type FormValues = z.infer<typeof baseSchema>;

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = React.useState(false);

  const redirectTo = searchParams.get("redirect") || "/dashboard";

  // One form instance keeps the register/errors types stable across modes;
  // sign-up-only rules are applied conditionally.
  const form = useForm<FormValues>({
    resolver: zodResolver(
      baseSchema.superRefine((values, ctx) => {
        if (mode !== "sign-up") return;
        if (values.name.trim().length < 2) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["name"],
            message: "Name must be at least 2 characters.",
          });
        }
        if (values.password.length < 8) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["password"],
            message: "Password must be at least 8 characters.",
          });
        }
      }),
    ),
    defaultValues: { name: "", email: "", password: "" },
  });

  // Lets end-to-end tests (and users on slow connections) know the form is
  // interactive. Before hydration a submit would be a full-page GET that loses
  // client-side validation.
  const [hydrated, setHydrated] = React.useState(false);
  React.useEffect(() => setHydrated(true), []);

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      if (mode === "sign-in") {
        const { error } = await authClient.signIn.email({
          email: values.email,
          password: values.password,
        });
        if (error) {
          setServerError(error.message || "Invalid email or password.");
          return;
        }
        toast({ title: "Signed in", variant: "success" });
        router.push(redirectTo);
        router.refresh();
      } else {
        const { error } = await authClient.signUp.email({
          name: values.name,
          email: values.email,
          password: values.password,
        });
        if (error) {
          setServerError(error.message || "Could not create your account.");
          return;
        }
        toast({ title: "Account created", variant: "success" });
        router.push(redirectTo);
        router.refresh();
      }
    } catch {
      setServerError("Something went wrong. Please try again.");
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setServerError(null);
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: redirectTo,
      });
    } catch {
      setServerError("Google sign-in is not available.");
      setGoogleLoading(false);
    }
  };

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;

  return (
    <div className="mx-auto flex min-h-[75vh] max-w-md items-center px-4 py-12">
      <Card className="w-full">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-green-700 text-white">
            <Wrench className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">
            {mode === "sign-in" ? "Welcome back" : "Create your account"}
          </CardTitle>
          <CardDescription>
            {mode === "sign-in"
              ? "Sign in to access your repair analyses."
              : "Start giving your belongings a second life."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {serverError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          ) : null}

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
            data-hydrated={hydrated}
            noValidate
          >
            {mode === "sign-up" ? (
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  autoComplete="name"
                  placeholder="Jane Doe"
                  {...register("name")}
                  aria-invalid={!!errors.name}
                />
                {errors.name ? (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                ) : null}
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                {...register("email")}
                aria-invalid={!!errors.email}
              />
              {errors.email ? (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                  placeholder="••••••••"
                  {...register("password")}
                  aria-invalid={!!errors.password}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password ? (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              ) : null}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {mode === "sign-in" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogle}
            disabled={googleLoading}
          >
            {googleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Continue with Google
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            {mode === "sign-in" ? (
              <>
                Don&apos;t have an account?{" "}
                <Link href="/sign-up" className="font-medium text-primary hover:underline">
                  Sign up
                </Link>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <Link href="/sign-in" className="font-medium text-primary hover:underline">
                  Sign in
                </Link>
              </>
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
