"use client";

import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { AuthTextField } from "@/components/auth/auth-text-field";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { useAuth } from "@/hooks/use-auth";
import { notifyAuthError, notifyValidationError } from "@/lib/auth/form-errors";
import { changePasswordSchema } from "@/lib/auth/schemas";

export function RequiredPasswordForm() {
  const { changePassword, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const form = useForm<z.infer<typeof changePasswordSchema>>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { current_password: "", new_password: "", confirmPassword: "" },
  });
  const busy = loggingOut || form.formState.isSubmitting;
  async function onSubmit(data: z.infer<typeof changePasswordSchema>) {
    try {
      await changePassword({ current_password: data.current_password, new_password: data.new_password });
      form.reset();
    } catch (error) {
      notifyAuthError(error);
    }
  }
  async function signOut() {
    setLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      notifyAuthError(error);
    } finally {
      setLoggingOut(false);
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
          name="current_password"
          id="temporary-password"
          label="Current Password"
          type="password"
          autoComplete="current-password"
          disabled={busy}
        />
        <AuthTextField
          control={form.control}
          name="new_password"
          id="required-new-password"
          label="New Password"
          type="password"
          autoComplete="new-password"
          disabled={busy}
        />
        <AuthTextField
          control={form.control}
          name="confirmPassword"
          id="required-confirm-password"
          label="Confirm Password"
          type="password"
          autoComplete="new-password"
          disabled={busy}
        />
      </FieldGroup>
      <p className="text-muted-foreground text-sm">
        Use 8–128 characters. Choose a password different from your temporary password.
      </p>
      <Button type="submit" disabled={busy}>
        {form.formState.isSubmitting ? "Saving..." : "Change password"}
      </Button>
      <Button type="button" variant="destructive" disabled={busy} onClick={() => void signOut()}>
        {loggingOut ? "Signing out..." : "Sign out"}
      </Button>
    </form>
  );
}
