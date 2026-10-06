"use client";

import { useState } from "react";

import { MoreHorizontal } from "lucide-react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ProjectMemberItem } from "@/lib/api/services/fetch-members";

export function MemberActions({
  member,
  disabled,
  onResend,
  onRemove,
}: {
  member: ProjectMemberItem;
  disabled: boolean;
  onResend: () => Promise<void>;
  onRemove: () => Promise<unknown>;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const pending = member.status === "invited";
  const label = pending ? "Cancel invitation" : "Remove member";
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={disabled}
            aria-label={"Actions for " + member.email}
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            {pending && member.invite_expired && (
              <DropdownMenuItem disabled={disabled} onSelect={() => void onResend()}>
                Resend invitation
              </DropdownMenuItem>
            )}
            <DropdownMenuItem variant="destructive" disabled={disabled} onSelect={() => setConfirmOpen(true)}>
              {label}
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={label}
        description={
          pending ? "Cancel the invitation for " + member.email + "?" : "Remove " + member.email + " from this project?"
        }
        confirmLabel={label}
        onConfirm={() => {
          if (!disabled) void onRemove();
        }}
      />
    </>
  );
}
