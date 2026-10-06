"use client";

import { useState } from "react";

import { toast } from "sonner";

import { ProfileEditor } from "@/components/auth/profile-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useInviteUserMutation } from "@/hooks/use-admin-query";
import { useAuthCooldown } from "@/hooks/use-auth-cooldown";
import type { UserAdminItem, UserCreated } from "@/lib/api/services/fetch-admin";
import { ApiError } from "@/types/api";
import { UserStatus } from "@/types/enums";

import { UserCredentials } from "./user-credentials";

export function EditUserDialog({ user, onClose }: { user: UserAdminItem; onClose: () => void }) {
  const [profileBusy, setProfileBusy] = useState(false);
  const [credentials, setCredentials] = useState<UserCreated | null>(null);
  const invite = useInviteUserMutation();
  const cooldown = useAuthCooldown(
    user.invite_sent_at ? Math.max(0, Math.ceil((Date.parse(user.invite_sent_at) + 60000 - Date.now()) / 1000)) : 0,
  );
  const busy = profileBusy || invite.isPending;
  async function resend() {
    if (busy || cooldown.remaining > 0) return;
    try {
      const response = await invite.mutateAsync(user.id);
      setCredentials(response.data);
      cooldown.setRemaining(60);
      if (response.data.invite_email_sent) toast.success(response.message);
      else toast.info("The sign-in email was not sent. You can share the temporary credentials manually.");
    } catch (error) {
      if (error instanceof ApiError && ["INVITE_COOLDOWN", "RATE_LIMITED"].includes(error.code)) {
        cooldown.setRemaining(error.retryAfter ?? 60);
      }
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
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
          <DialogTitle>Edit user</DialogTitle>
          <DialogDescription>Update the display name and profile picture.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{user.email_verified ? "Email verified" : "Email verification pending"}</Badge>
          {user.must_change_password && <Badge variant="secondary">Password change required</Badge>}
        </div>
        <ProfileEditor key={user.id} user={user} adminUserId={user.id} onBusyChange={setProfileBusy} />
        {user.must_change_password && (
          <>
            <Separator />
            <Button
              type="button"
              variant="outline"
              className="tabular-nums"
              onClick={() => void resend()}
              disabled={busy || cooldown.remaining > 0 || user.status === UserStatus.Suspended}
            >
              {invite.isPending
                ? "Sending..."
                : cooldown.remaining > 0
                  ? `Send again in ${cooldown.remaining}s`
                  : "Send sign-in details"}
            </Button>
            {credentials && <UserCredentials user={credentials} />}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
