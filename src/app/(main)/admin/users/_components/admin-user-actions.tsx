"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

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
import { useUpdatePlatformRoleMutation, useUpdateUserStatusMutation } from "@/hooks/use-admin-query";
import type { UserAdminItem } from "@/lib/api/types";
import { useAppDispatch } from "@/lib/redux/hooks";
import { restoreSession } from "@/lib/redux/slices/auth-slice";

export function AdminUserActions({
  user,
  currentUserId,
  enabled,
}: {
  user: UserAdminItem;
  currentUserId?: string;
  enabled: boolean;
}) {
  const [action, setAction] = useState<"status" | "role" | null>(null);
  const statusMutation = useUpdateUserStatusMutation();
  const roleMutation = useUpdatePlatformRoleMutation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const busy = statusMutation.isPending || roleMutation.isPending;
  const active = user.status === "active";
  const admin = user.platform_role === "platform_admin";
  const statusLabel = active ? "Suspend" : "Activate";
  const roleLabel = admin ? "Remove admin" : "Grant admin";
  const self = user.id === currentUserId;
  const statusDescription = active
    ? "This user will lose access to the platform."
    : "This user will be able to sign in again.";
  const roleDescription = admin
    ? "This user will lose platform-wide administrator access."
    : "This user will gain platform-wide administrator access.";
  const description = action === "status" ? statusDescription : roleDescription;
  const onSuccess = () => {
    setAction(null);
    toast.success("User updated successfully.");
    if (self) {
      void dispatch(restoreSession()).then(() => router.refresh());
    }
  };
  const confirm = () => {
    if (action === "status")
      statusMutation.mutate({ userId: user.id, status: active ? "suspended" : "active" }, { onSuccess });
    if (action === "role")
      roleMutation.mutate({ userId: user.id, role: admin ? null : "platform_admin" }, { onSuccess });
  };
  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          aria-label={`${statusLabel} ${user.email}`}
          disabled={!enabled || busy || !["active", "suspended"].includes(user.status)}
          onClick={() => setAction("status")}
        >
          {statusLabel}
        </Button>
        <Button
          size="sm"
          variant="outline"
          aria-label={`${roleLabel} for ${user.email}`}
          disabled={!enabled || busy}
          onClick={() => setAction("role")}
        >
          {roleLabel}
        </Button>
      </div>
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
