"use client";

import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { notifyAuthError, notifyValidationError } from "@/lib/auth/form-errors";
import { changePasswordSchema } from "@/lib/auth/schemas";

import { AuthTextField } from "./auth-text-field";
import { ProfileEditor } from "./profile-editor";

export function AccountSecurityDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { user, changePassword, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [profileBusy, setProfileBusy] = useState(false);
  const form = useForm<z.infer<typeof changePasswordSchema>>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { current_password: "", new_password: "", confirmPassword: "" },
  });
  const busy = loggingOut || profileBusy || form.formState.isSubmitting;
  const handleOpenChange = (value: boolean) => {
    if (busy) return;
    if (!value) form.reset();
    onOpenChange(value);
  };
  async function onSubmit(data: z.infer<typeof changePasswordSchema>) {
    form.clearErrors();
    try {
      await changePassword({ current_password: data.current_password, new_password: data.new_password });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      notifyAuthError(error);
    }
  }
  async function logoutAll() {
    setLoggingOut(true);
    form.clearErrors();
    try {
      await logout(true);
      form.reset();
      onOpenChange(false);
    } catch (error) {
      notifyAuthError(error);
    } finally {
      setLoggingOut(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg"
        showCloseButton={!busy}
        onEscapeKeyDown={(event) => {
          if (busy) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (busy) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Account</DialogTitle>
          <DialogDescription>Manage your profile, picture, and account security.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="profile">
          <TabsList>
            <TabsTrigger value="profile" disabled={busy}>
              Profile
            </TabsTrigger>
            <TabsTrigger value="security" disabled={busy}>
              Security
            </TabsTrigger>
          </TabsList>
          <TabsContent value="profile">
            {user ? (
              <ProfileEditor key={user.id} user={user} onBusyChange={setProfileBusy} />
            ) : (
              <Skeleton className="h-64 w-full" />
            )}
          </TabsContent>
          <TabsContent value="security" className="flex flex-col gap-4">
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
                  id="current-password"
                  label="Current Password"
                  type="password"
                  autoComplete="current-password"
                  disabled={busy}
                />
                <AuthTextField
                  control={form.control}
                  name="new_password"
                  id="new-password"
                  label="New Password"
                  type="password"
                  autoComplete="new-password"
                  disabled={busy}
                />
                <AuthTextField
                  control={form.control}
                  name="confirmPassword"
                  id="confirm-new-password"
                  label="Confirm Password"
                  type="password"
                  autoComplete="new-password"
                  disabled={busy}
                />
              </FieldGroup>
              <p className="text-muted-foreground text-sm">
                Use 8–128 characters. Other devices will be signed out after changing your password.
              </p>
              <Button type="submit" disabled={busy}>
                {form.formState.isSubmitting ? "Saving..." : "Change password"}
              </Button>
            </form>
            <Separator />
            <Button variant="outline" onClick={() => void logoutAll()} disabled={busy}>
              {loggingOut ? "Signing out..." : "Log out of all devices"}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
