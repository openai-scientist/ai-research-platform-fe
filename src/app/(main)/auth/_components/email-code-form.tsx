"use client";

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
import { OtpCodeField } from "./otp-code-field";
import { useOtpChallenge } from "./use-otp-challenge";

const CODE_SENT_MESSAGE = "If the address can sign in, a code is on its way.";

export function EmailCodeForm({ pending, onBack }: { pending: VerificationPending; onBack: () => void }) {
  const { signInWithCode, startEmailSignIn } = useAuth();
  const challenge = useOtpChallenge(pending);
  const form = useForm<z.infer<typeof verificationSchema>>({
    resolver: zodResolver(verificationSchema),
    defaultValues: { code: "" },
  });
  const busy = challenge.resending || form.formState.isSubmitting;
  async function onSubmit(data: z.infer<typeof verificationSchema>) {
    if (busy || challenge.submitRemaining > 0) return;
    try {
      await signInWithCode({ email: pending.email, code: data.code });
      toast.success("Signed in successfully.");
    } catch (error) {
      if (error instanceof ApiError && error.code === "OTP_INVALID") {
        form.setValue("code", "");
        form.setError("code", { type: "server" });
        form.setFocus("code");
      }
      challenge.handleError(error);
    }
  }
  async function resendCode() {
    if (busy) return;
    await challenge.resendCode(
      () => startEmailSignIn(pending.email),
      () => {
        form.reset();
        form.setFocus("code");
      },
      CODE_SENT_MESSAGE,
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <AuthStepHeading
        title="Check your email"
        description={`Enter the 6-digit code sent to ${pending.email}, or open the sign-in link in that email.`}
      />
      <form
        noValidate
        onSubmit={form.handleSubmit(onSubmit, notifyValidationError)}
        className="flex flex-col gap-4"
        aria-busy={busy}
      >
        <FieldGroup>
          <OtpCodeField control={form.control} name="code" disabled={busy} />
        </FieldGroup>
        <p className="text-muted-foreground text-sm">
          The code and the link work for {Math.ceil(challenge.expires / 60)} minutes.
        </p>
        <Button type="submit" disabled={busy || challenge.submitRemaining > 0}>
          {form.formState.isSubmitting
            ? "Signing in..."
            : challenge.submitRemaining > 0
              ? `Try again in ${challenge.submitRemaining}s`
              : "Continue"}
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
