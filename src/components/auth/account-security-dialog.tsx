"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { notifyAuthError } from "@/lib/auth/form-errors";

import { ProfileEditor } from "./profile-editor";

export function AccountSecurityDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [profileBusy, setProfileBusy] = useState(false);
  const busy = loggingOut || profileBusy;
  const handleOpenChange = (value: boolean) => {
    if (busy) return;
    onOpenChange(value);
  };
  async function logoutAll() {
    setLoggingOut(true);
    try {
      await logout(true);
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
            <p className="text-muted-foreground text-sm">
              You sign in with a code sent to your email or with Google. Lost a device? Sign out everywhere.
            </p>
            <Button variant="outline" onClick={() => void logoutAll()} disabled={busy}>
              {loggingOut ? "Signing out..." : "Log out of all devices"}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
