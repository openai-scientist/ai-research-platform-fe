"use client";

import { useState } from "react";

import { toast } from "sonner";

import type { VerificationPending } from "@/lib/api/services/fetch-auth";
import { notifyAuthError } from "@/lib/auth/form-errors";

import { useAuthCooldown } from "./use-auth-cooldown";

export function useOtpChallenge(pending: VerificationPending, retryAfter = 0) {
  const [resending, setResending] = useState(false);
  const [expires, setExpires] = useState(pending.expires_in_seconds);
  const resend = useAuthCooldown(pending.resend_after_seconds);
  const submit = useAuthCooldown(retryAfter);
  const handleError = (error: unknown) => {
    const seconds = notifyAuthError(error);
    if (seconds !== null) {
      submit.setRemaining(seconds);
      resend.setRemaining(Math.max(resend.remaining, seconds));
    }
  };
  const resendCode = async (send: () => Promise<VerificationPending>, onSent: () => void, message: string) => {
    if (resending || resend.remaining > 0 || submit.remaining > 0) return;
    setResending(true);
    try {
      const result = await send();
      setExpires(result.expires_in_seconds);
      resend.setRemaining(result.resend_after_seconds);
      onSent();
      toast.success(message);
    } catch (error) {
      handleError(error);
    } finally {
      setResending(false);
    }
  };
  return {
    resending,
    expires,
    resendRemaining: resend.remaining,
    submitRemaining: submit.remaining,
    handleError,
    resendCode,
  };
}
