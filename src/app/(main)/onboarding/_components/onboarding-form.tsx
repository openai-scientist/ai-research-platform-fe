"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { AuthTextField } from "@/components/auth/auth-text-field";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { useAuth } from "@/hooks/use-auth";
import { notifyAuthError, notifyValidationError } from "@/lib/auth/form-errors";
import { onboardingSchema } from "@/lib/auth/schemas";

export function OnboardingForm({ suggestedName }: { suggestedName: string }) {
  const { completeOnboarding, logout } = useAuth();
  const form = useForm<z.infer<typeof onboardingSchema>>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: { display_name: suggestedName },
  });
  const busy = form.formState.isSubmitting;
  async function onSubmit(data: z.infer<typeof onboardingSchema>) {
    try {
      await completeOnboarding(data.display_name);
    } catch (error) {
      notifyAuthError(error);
    }
  }
  return (
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
          id="onboarding-name"
          label="Full name"
          autoComplete="name"
          placeholder="Your name"
          disabled={busy}
        />
      </FieldGroup>
      <Button type="submit" disabled={busy}>
        {busy ? "Saving..." : "Continue"}
      </Button>
      <Button type="button" variant="link" onClick={() => void logout()} disabled={busy}>
        Sign out
      </Button>
    </form>
  );
}
