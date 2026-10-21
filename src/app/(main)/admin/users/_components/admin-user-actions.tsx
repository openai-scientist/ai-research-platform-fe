"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUpdatePlatformRoleMutation, useUpdateUserStatusMutation } from "@/hooks/use-admin-query";
import type { UserAdminItem } from "@/lib/api/services/fetch-admin";
import { useAppDispatch } from "@/lib/redux/hooks";
import { restoreSession } from "@/lib/redux/slices/auth-slice";
import { PlatformRole, UserStatus } from "@/types/enums";

export function AdminUserActions({
  user,
  currentUserId,
  enabled,
  onEdit,
}: {
  user: UserAdminItem;
  currentUserId?: string;
  enabled: boolean;
  onEdit?: () => void;
}) {
  const [action, setAction] = useState<"status" | "role" | null>(null);
  const statusMutation = useUpdateUserStatusMutation();
  const roleMutation = useUpdatePlatformRoleMutation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const busy = statusMutation.isPending || roleMutation.isPending;
  const active = user.status === UserStatus.Active;
  const admin = user.platform_role === PlatformRole.PlatformAdmin;
  const statusLabel = active ? "Suspend" : "Activate";
  const roleLabel = admin ? "Remove admin" : "Grant admin";
  const self = user.id === currentUserId;
  const canGrantAdmin = admin || user.email_verified;
  const statusDescription = active
    ? "This user will lose access to the platform."
    : "This user will be able to sign in again.";
  const roleDescription = admin
    ? "This user will lose platform-wide administrator access."
    : "This user will gain platform-wide administrator access.";
  const description = action === "status" ? statusDescription : roleDescription;
  const onSuccess = () => {
    setAction(null);
    const who = user.display_name?.trim() || user.email;
    const title =
      action === "status"
        ? `User ${active ? "suspended" : "reactivated"}`
        : `${admin ? "Admin access removed" : "Admin access granted"}`;
    toast.success(title, { description: who });
    if (self) {
      void dispatch(restoreSession()).then(() => router.refresh());
    }
  };
  const confirm = () => {
    if (action === "status")
      statusMutation.mutate(
        { userId: user.id, status: active ? UserStatus.Suspended : UserStatus.Active },
        { onSuccess },
      );
    if (action === "role")
      roleMutation.mutate(
        { userId: user.id, role: admin ? PlatformRole.User : PlatformRole.PlatformAdmin },
        { onSuccess },
      );
  };
  return (
    <>
      {onEdit ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={!enabled || busy}
              aria-label={`Actions for ${user.email}`}
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuItem onSelect={onEdit}>Edit profile</DropdownMenuItem>
              <DropdownMenuItem disabled={!canGrantAdmin} onSelect={() => setAction("role")}>
                {roleLabel}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem variant={active ? "destructive" : "default"} onSelect={() => setAction("status")}>
                {statusLabel}
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            aria-label={`${statusLabel} ${user.email}`}
            disabled={!enabled || busy || ![UserStatus.Active, UserStatus.Suspended].includes(user.status)}
            onClick={() => setAction("status")}
          >
            {statusLabel}
          </Button>
          <Button
            size="sm"
            variant="outline"
            aria-label={`${roleLabel} for ${user.email}`}
            disabled={!enabled || busy || !canGrantAdmin}
            onClick={() => setAction("role")}
          >
            {roleLabel}
          </Button>
        </div>
      )}
      <AlertDialog
        open={action !== null}
        onOpenChange={(open) => {
          if (!open && !busy) setAction(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{action === "status" ? statusLabel : roleLabel} user?</AlertDialogTitle>
            <AlertDialogDescription>
              {user.email}. {description}
              {self && " You are changing your own account. Your current access may end immediately."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!enabled || busy}
              onClick={(event) => {
                event.preventDefault();
                confirm();
              }}
            >
              {busy ? "Saving..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
