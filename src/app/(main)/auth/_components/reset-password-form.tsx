"use client";

import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { useAuth } from "@/hooks/use-auth";
import type { VerificationPending } from "@/lib/api/services/fetch-auth";
import { notifyValidationError } from "@/lib/auth/form-errors";
import { verificationSchema } from "@/lib/auth/schemas";
import { ApiError } from "@/types/api";

import { AuthStepHeading } from "./auth-step-heading";
import { NewPasswordForm } from "./new-password-form";
import { OtpCodeField } from "./otp-code-field";
import { useOtpChallenge } from "./use-otp-challenge";

export function ResetPasswordForm({ pending, onBack }: { pending: VerificationPending; onBack: () => void }) {
  const { verifyResetPassword, forgotPassword } = useAuth();
  const [grant, setGrant] = useState<{ token: string; expiresAt: number } | null>(null);
  const [requiresNewCode, setRequiresNewCode] = useState(false);
  const challenge = useOtpChallenge(pending);
  const form = useForm<z.infer<typeof verificationSchema>>({
    resolver: zodResolver(verificationSchema),
    defaultValues: { code: "" },
  });
  const busy = challenge.resending || form.formState.isSubmitting;
  async function onSubmit(data: z.infer<typeof verificationSchema>) {
    if (busy || requiresNewCode || challenge.submitRemaining > 0) return;
    try {
      const result = await verifyResetPassword({ email: pending.email, code: data.code });
      if (!result.reset_token) {
        toast.error("Unable to verify the code. Please request a new code.");
        form.reset();
        setRequiresNewCode(true);
        return;
      }
      setGrant({ token: result.reset_token, expiresAt: Date.now() + result.expires_in_seconds * 1000 });
      form.reset();
    } catch (error) {
      if (error instanceof ApiError && error.code === "OTP_INVALID") {
        form.setValue("code", "");
        form.setError("code", { type: "server" });
        form.setFocus("code");
      }
      challenge.handleError(error);
      if (error instanceof ApiError && error.code === "NETWORK_ERROR") {
        form.reset();
        setRequiresNewCode(true);
        toast.info("Verification could not be confirmed. Please request a new code before trying again.");
      }
    }
  }
  async function resendCode() {
    if (busy) return;
    setGrant(null);
    await challenge.resendCode(
      () => forgotPassword(pending.email),
      () => {
        setRequiresNewCode(false);
        form.setValue("code", "");
        form.clearErrors("code");
        form.setFocus("code");
      },
      "If an account exists for this email, a reset code is on its way.",
    );
  }
  if (grant) {
    return (
      <NewPasswordForm
        email={pending.email}
        token={grant.token}
        expiresAt={grant.expiresAt}
        onRestart={() => {
          setGrant(null);
          setRequiresNewCode(true);
          form.reset();
        }}
        onComplete={() => {
          setGrant(null);
          onBack();
        }}
      />
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <AuthStepHeading
        title="Verify your reset code"
        description={`Enter the 6-digit code sent to ${pending.email} to continue.`}
      />
      <form
        noValidate
        onSubmit={form.handleSubmit(onSubmit, notifyValidationError)}
        className="flex flex-col gap-4"
        aria-busy={busy}
      >
        <FieldGroup className="gap-4">
          <OtpCodeField control={form.control} name="code" disabled={busy} />
        </FieldGroup>
        <p className="text-muted-foreground text-sm">
          Codes are valid for {Math.ceil(challenge.expires / 60)} minutes after sending.
        </p>
        <Button type="submit" disabled={busy || requiresNewCode || challenge.submitRemaining > 0}>
          {form.formState.isSubmitting
            ? "Verifying..."
            : challenge.submitRemaining > 0
              ? `Try again in ${challenge.submitRemaining}s`
              : requiresNewCode
                ? "Request a new code first"
                : "Verify code"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => void resendCode()}
          disabled={busy || challenge.resendRemaining > 0 || challenge.submitRemaining > 0}
          className="tabular-nums"
        >
          {challenge.resending
            ? "Sending..."
            : challenge.resendRemaining > 0
              ? `Resend code in ${challenge.resendRemaining}s`
              : "Resend code"}
        </Button>
        <Button type="button" variant="link" onClick={onBack} disabled={busy}>
          Use a different email
        </Button>
      </form>
    </div>
  );
}
