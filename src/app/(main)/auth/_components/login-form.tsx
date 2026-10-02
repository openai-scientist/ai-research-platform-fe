"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

import { AuthTextField } from "@/components/auth/auth-text-field";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { useAuth } from "@/hooks/use-auth";
import { notifyAuthError, notifyValidationError } from "@/lib/auth/form-errors";
import { loginSchema } from "@/lib/auth/schemas";

import { useAuthCooldown } from "./use-auth-cooldown";

export function LoginForm() {
  const { login } = useAuth();
  const { remaining, setRemaining } = useAuthCooldown();
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const busy = form.formState.isSubmitting;
  async function onSubmit(data: z.infer<typeof loginSchema>) {
    if (remaining > 0) return;
    form.clearErrors();
    try {
      await login(data);
      toast.success("Signed in successfully.");
    } catch (error) {
      const cooldown = notifyAuthError(error);
      if (cooldown !== null) setRemaining(cooldown);
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
          name="email"
          id="login-email"
          label="Email Address"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          disabled={busy}
        />
        <AuthTextField
          control={form.control}
          name="password"
          id="login-password"
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          disabled={busy}
        />
      </FieldGroup>
      <Button className="w-full" type="submit" disabled={busy || remaining > 0}>
        {busy ? "Signing in..." : remaining > 0 ? `Try again in ${remaining}s` : "Login"}
      </Button>
    </form>
  );
}
