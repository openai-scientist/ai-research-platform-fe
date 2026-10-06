"use client";

import { useState } from "react";

import Link from "next/link";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

import { AuthTextField } from "@/components/auth/auth-text-field";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { useAuth } from "@/hooks/use-auth";
import type { VerificationPending } from "@/lib/api/services/fetch-auth";
import { notifyAuthError, notifyValidationError } from "@/lib/auth/form-errors";
import { emailSchema } from "@/lib/auth/schemas";

import { AuthStepHeading } from "./auth-step-heading";
import { ResetPasswordForm } from "./reset-password-form";
import { useAuthCooldown } from "./use-auth-cooldown";

export function ForgotPasswordForm() {
  const { forgotPassword } = useAuth();
  const [pending, setPending] = useState<VerificationPending | null>(null);
  const { remaining, setRemaining } = useAuthCooldown();
  const form = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });
  const busy = form.formState.isSubmitting;
  async function onSubmit(data: z.infer<typeof emailSchema>) {
    if (remaining > 0) return;
    try {
      setPending(await forgotPassword(data.email));
      toast.success("If an account exists for this email, a reset code is on its way.");
    } catch (error) {
      const seconds = notifyAuthError(error);
      if (seconds !== null) setRemaining(seconds);
    }
  }
  if (pending) return <ResetPasswordForm pending={pending} onBack={() => setPending(null)} />;
  return (
    <div className="flex flex-col gap-6">
      <AuthStepHeading title="Forgot your password?" description="Enter your email to request a password reset code." />
      <form
        noValidate
        onSubmit={form.handleSubmit(onSubmit, notifyValidationError)}
        className="flex flex-col gap-4"
        aria-busy={busy}
      >
        <FieldGroup>
          <AuthTextField
            control={form.control}
            name="email"
            id="reset-email"
            label="Email Address"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            disabled={busy}
          />
        </FieldGroup>
        <Button type="submit" disabled={busy || remaining > 0}>
          {busy ? "Sending..." : remaining > 0 ? `Try again in ${remaining}s` : "Send reset code"}
        </Button>
      </form>
      <Button variant="link" asChild>
        <Link href="/auth/login">Back to login</Link>
      </Button>
    </div>
  );
}
