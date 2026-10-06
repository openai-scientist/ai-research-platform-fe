"use client";

import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

import { AuthTextField } from "@/components/auth/auth-text-field";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { useAuth } from "@/hooks/use-auth";
import type { LoginRequest, VerificationPending } from "@/lib/api/services/fetch-auth";
import { notifyAuthError, notifyValidationError } from "@/lib/auth/form-errors";
import { registerSchema } from "@/lib/auth/schemas";

import { AuthStepHeading } from "./auth-step-heading";
import { useAuthCooldown } from "./use-auth-cooldown";
import { VerifyEmailForm } from "./verify-email-form";

export function RegisterForm() {
  const { register } = useAuth();
  const [verification, setVerification] = useState<{ credentials: LoginRequest; pending: VerificationPending } | null>(
    null,
  );
  const { remaining, setRemaining } = useAuthCooldown();
  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", display_name: "", password: "", confirmPassword: "" },
  });
  const busy = form.formState.isSubmitting;
  async function onSubmit(data: z.infer<typeof registerSchema>) {
    if (remaining > 0) return;
    form.clearErrors();
    try {
      const pending = await register({
        email: data.email,
        password: data.password,
        ...(data.display_name ? { display_name: data.display_name } : {}),
      });
      setVerification({ credentials: { email: pending.email, password: data.password }, pending });
      form.reset({ email: data.email, display_name: data.display_name, password: "", confirmPassword: "" });
      toast.success("Check your email for a verification code.");
    } catch (error) {
      const cooldown = notifyAuthError(error);
      if (cooldown !== null) setRemaining(cooldown);
    }
  }
  if (verification) {
    return <VerifyEmailForm {...verification} onBack={() => setVerification(null)} />;
  }
  return (
    <div className="flex flex-col gap-6">
      <AuthStepHeading title="Create your account" description="Please enter your details to register." />
      <form
        noValidate
        onSubmit={form.handleSubmit(onSubmit, notifyValidationError)}
        className="flex flex-col gap-4"
        aria-busy={busy}
      >
        <FieldGroup className="gap-4">
          <AuthTextField
            control={form.control}
            name="display_name"
            id="register-name"
            label="Display Name (optional)"
            autoComplete="name"
            disabled={busy}
          />
          <AuthTextField
            control={form.control}
            name="email"
            id="register-email"
            label="Email Address"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            disabled={busy}
          />
          <AuthTextField
            control={form.control}
            name="password"
            id="register-password"
            label="Password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            disabled={busy}
          />
          <AuthTextField
            control={form.control}
            name="confirmPassword"
            id="register-confirm-password"
            label="Confirm Password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            disabled={busy}
          />
        </FieldGroup>
        <Button className="w-full" type="submit" disabled={busy || remaining > 0}>
          {busy ? "Creating account..." : remaining > 0 ? `Try again in ${remaining}s` : "Register"}
        </Button>
      </form>
    </div>
  );
}
