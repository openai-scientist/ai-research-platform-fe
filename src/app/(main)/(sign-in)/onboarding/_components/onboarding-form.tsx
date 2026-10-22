"use client";

import { useEffect } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { AuthTextField } from "@/components/auth/auth-text-field";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { useAuth } from "@/hooks/use-auth";
import { notifyAuthError, notifyValidationError } from "@/lib/auth/form-errors";
import { onboardingSchema } from "@/lib/auth/schemas";

export function OnboardingForm({ suggestedName, email }: { suggestedName: string; email: string }) {
  const { completeOnboarding, logout } = useAuth();
  const form = useForm<z.infer<typeof onboardingSchema>>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: { display_name: suggestedName },
  });
  const busy = form.formState.isSubmitting;
  // The name is the only thing asked here: start typing straight away, over a suggestion if there is one.
  useEffect(() => {
    form.setFocus("display_name", { shouldSelect: true });
  }, [form]);
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
          label="Display name"
          autoComplete="name"
          placeholder="Your name"
          maxLength={200}
          disabled={busy}
        />
      </FieldGroup>
      <Button type="submit" disabled={busy}>
        {busy ? "Saving..." : "Continue"}
      </Button>
      <div className="flex flex-col items-center">
        <p className="wrap-anywhere text-center text-muted-foreground text-xs">Signed in as {email}</p>
        <Button type="button" variant="link" onClick={() => void logout()} disabled={busy}>
          Not you? Sign out
        </Button>
      </div>
    </form>
  );
}
