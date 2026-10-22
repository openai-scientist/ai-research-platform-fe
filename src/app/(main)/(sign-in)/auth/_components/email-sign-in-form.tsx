"use client";

import { Suspense, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { AuthTextField } from "@/components/auth/auth-text-field";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { useAuth } from "@/hooks/use-auth";
import { useAuthCooldown } from "@/hooks/use-auth-cooldown";
import type { VerificationPending } from "@/lib/api/services/fetch-auth";
import { notifyAuthError, notifyValidationError } from "@/lib/auth/form-errors";
import { emailSchema } from "@/lib/auth/schemas";

import { GoogleOptionSkeleton } from "./auth-skeletons";
import { AuthStepHeading } from "./auth-step-heading";
import { EmailCodeForm } from "./email-code-form";
import { GoogleSignInOption } from "./social-auth/google-button";

export function EmailSignInForm({ googleSignInAvailable }: { googleSignInAvailable: Promise<boolean> }) {
  const { startEmailSignIn } = useAuth();
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
      // The next screen says where the code went; no toast repeats it.
      setPending(await startEmailSignIn(data.email));
    } catch (error) {
      const cooldown = notifyAuthError(error);
      if (cooldown !== null) setRemaining(cooldown);
    }
  }
  if (pending) {
    return <EmailCodeForm pending={pending} onBack={() => setPending(null)} />;
  }
  return (
    <div className="flex flex-col gap-6">
      <AuthStepHeading
        title="Sign in or create an account"
        description="Enter your email and we will send you a code."
      />
      <Suspense fallback={<GoogleOptionSkeleton label="Loading sign-in options" />}>
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
            id="sign-in-email"
            label="Email address"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            disabled={busy}
          />
        </FieldGroup>
        <Button className="w-full" type="submit" disabled={busy || remaining > 0}>
          {busy ? "Sending code..." : remaining > 0 ? `Try again in ${remaining}s` : "Continue with email"}
        </Button>
      </form>
    </div>
  );
}
