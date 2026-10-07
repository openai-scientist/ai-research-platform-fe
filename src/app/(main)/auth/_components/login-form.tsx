"use client";

import { Suspense, useState } from "react";

import Link from "next/link";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

import { AuthTextField } from "@/components/auth/auth-text-field";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { useAuth } from "@/hooks/use-auth";
import { useAuthCooldown } from "@/hooks/use-auth-cooldown";
import type { LoginRequest, VerificationPending } from "@/lib/api/services/fetch-auth";
import { notifyAuthError, notifyValidationError } from "@/lib/auth/form-errors";
import { loginSchema } from "@/lib/auth/schemas";
import { ApiError } from "@/types/api";

import { AuthStepHeading } from "./auth-step-heading";
import { GoogleSignInOption } from "./social-auth/google-button";
import { VerifyEmailForm } from "./verify-email-form";

export function LoginForm({ googleSignInAvailable }: { googleSignInAvailable: Promise<boolean> }) {
  const { login, resendVerification } = useAuth();
  const [verification, setVerification] = useState<{
    credentials: LoginRequest;
    pending: VerificationPending;
    retryAfter: number;
  } | null>(null);
  const { remaining, setRemaining } = useAuthCooldown();
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const busy = form.formState.isSubmitting;
  async function onSubmit(data: z.infer<typeof loginSchema>) {
    if (remaining > 0) return;
    form.clearErrors();
    try {
      await login(data);
      toast.success("Signed in successfully.");
    } catch (error) {
      if (error instanceof ApiError && error.code === "EMAIL_NOT_VERIFIED") {
        let pending: VerificationPending = { email: data.email, expires_in_seconds: 600, resend_after_seconds: 0 };
        let retryAfter = 0;
        try {
          pending = await resendVerification(data.email);
          toast.success("If your email is awaiting verification, a code is on its way.");
        } catch (resendError) {
          retryAfter = notifyAuthError(resendError) ?? 0;
          pending.resend_after_seconds = retryAfter;
        }
        setVerification({ credentials: data, pending, retryAfter });
        form.reset({ email: data.email, password: "" });
        return;
      }
      const cooldown = notifyAuthError(error);
      if (cooldown !== null) setRemaining(cooldown);
    }
  }
  if (verification) {
    return <VerifyEmailForm {...verification} onBack={() => setVerification(null)} />;
  }
  return (
    <div className="flex flex-col gap-6">
      <AuthStepHeading title="Login to your account" description="Please enter your details to login." />
      <Suspense fallback={null}>
        <GoogleSignInOption availability={googleSignInAvailable} disabled={busy} />
      </Suspense>
      <form
        noValidate
        onSubmit={form.handleSubmit(onSubmit, notifyValidationError)}
        className="flex flex-col gap-4"
        aria-busy={busy}
      >
        <FieldGroup className="gap-4">
          <AuthTextField
            control={form.control}
            name="email"
            id="login-email"
            label="Email Address"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            disabled={busy}
          />
          <AuthTextField
            control={form.control}
            name="password"
            id="login-password"
            label="Password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            disabled={busy}
          />
        </FieldGroup>
        <Link href="/auth/forgot-password" className="self-end text-sm text-primary hover:underline">
          Forgot password?
        </Link>
        <Button className="w-full" type="submit" disabled={busy || remaining > 0}>
          {busy ? "Signing in..." : remaining > 0 ? `Try again in ${remaining}s` : "Login"}
        </Button>
      </form>
    </div>
  );
}
