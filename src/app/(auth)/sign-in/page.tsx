import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";
import { Skeleton } from "@/components/ui/skeleton";

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md px-4 py-12"><Skeleton className="h-[500px] w-full" /></div>}>
      <AuthForm mode="sign-in" />
    </Suspense>
  );
}
