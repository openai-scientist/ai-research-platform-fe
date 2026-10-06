"use client";

import { useEffect } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

import { AuthTextField } from "@/components/auth/auth-text-field";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { useAuth } from "@/hooks/use-auth";
import { useAuthCooldown } from "@/hooks/use-auth-cooldown";
import { notifyAuthError, notifyValidationError } from "@/lib/auth/form-errors";
import { resetPasswordSchema } from "@/lib/auth/schemas";
import { ApiError } from "@/types/api";

import { AuthStepHeading } from "./auth-step-heading";

export function NewPasswordForm({
  email,
  token,
  expiresAt,
  onRestart,
  onComplete,
}: {
  email: string;
  token: string;
  expiresAt: number;
  onRestart: () => void;
  onComplete: () => void;
}) {
  const { resetPassword } = useAuth();
  const cooldown = useAuthCooldown();
  const expiry = useAuthCooldown(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)));
  const form = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { new_password: "", confirmPassword: "" },
  });
  const busy = form.formState.isSubmitting;
  useEffect(() => {
    if (expiry.remaining > 0 || busy) return;
    toast.error("Your password reset session has expired. Please request and verify a new code.");
    onRestart();
  }, [expiry.remaining, busy, onRestart]);

  async function onSubmit(data: z.infer<typeof resetPasswordSchema>) {
    if (cooldown.remaining > 0) return;
    if (Date.now() >= expiresAt) {
      toast.error("Your password reset session has expired. Please request and verify a new code.");
      onRestart();
      return;
    }
    if (data.new_password === email.split("@")[0].toLowerCase()) {
      toast.error("Your new password must be different from the part of your email before @.");
      return;
    }
    try {
      await resetPassword({ email, reset_token: token, new_password: data.new_password });
      form.reset();
      onComplete();
      toast.success("Password reset successfully. Please sign in with your new password.");
    } catch (error) {
      const seconds = notifyAuthError(error);
      if (seconds !== null) cooldown.setRemaining(seconds);
      if (error instanceof ApiError && error.code === "RESET_TOKEN_INVALID") {
        form.reset();
        onRestart();
        toast.info("Please request and verify a new code to reset your password.");
      }
    }
  }
  return (
    <div className="flex flex-col gap-6">
      <AuthStepHeading title="Set a new password" description={`Choose a new password for ${email}.`} />
      <form
        noValidate
        onSubmit={form.handleSubmit(onSubmit, notifyValidationError)}
        className="flex flex-col gap-4"
        aria-busy={busy}
      >
        <FieldGroup className="gap-4">
          <AuthTextField
            control={form.control}
            name="new_password"
            id="reset-new-password"
            label="New Password"
            type="password"
            autoComplete="new-password"
            disabled={busy}
          />
          <AuthTextField
            control={form.control}
            name="confirmPassword"
            id="reset-confirm-password"
            label="Confirm Password"
            type="password"
            autoComplete="new-password"
            disabled={busy}
          />
        </FieldGroup>
        <p className="text-muted-foreground text-sm">
          Use 8–128 characters. Your password must differ from the part of your email before @.
        </p>
        <p className="text-muted-foreground text-sm tabular-nums" aria-live="off">
          Reset session expires in {Math.floor(expiry.remaining / 60)}:{String(expiry.remaining % 60).padStart(2, "0")}.
        </p>
        <Button type="submit" disabled={busy || cooldown.remaining > 0 || expiry.remaining === 0}>
          {busy ? "Resetting..." : cooldown.remaining > 0 ? `Try again in ${cooldown.remaining}s` : "Reset password"}
        </Button>
        <Button type="button" variant="link" onClick={onRestart} disabled={busy}>
          Back to verification
        </Button>
      </form>
    </div>
  );
}
