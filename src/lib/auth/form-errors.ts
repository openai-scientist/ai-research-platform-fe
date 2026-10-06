import type { FieldErrors, FieldValues } from "react-hook-form";
import { toast } from "sonner";

import { ApiError } from "@/types/api";

export function notifyAuthError(error: unknown): number | null {
  if (error instanceof ApiError) {
    const cooldown = error.code === "RATE_LIMITED" ? (error.retryAfter ?? 60) : null;
    const message =
      error.message ||
      (error.code === "OTP_INVALID"
        ? "The code is invalid or has expired. Please request a new code."
        : "Unable to complete the request. Please try again.");
    toast.error(cooldown !== null ? `${message} Try again in ${cooldown} seconds.` : message);
    if (error.code === "VALIDATION_ERROR" && error.details.length > 0) {
      toast.error(error.details.map((detail) => `${detail.field}: ${detail.message}`).join("\n"));
    }
    return cooldown;
  }
  toast.error("Unable to connect to the server. Please try again.");
  return null;
}

export function notifyValidationError<T extends FieldValues>(errors: FieldErrors<T>) {
  for (const error of Object.values(errors)) {
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
      toast.error(error.message);
      return;
    }
  }
  toast.error("Please check the form and try again.");
}
