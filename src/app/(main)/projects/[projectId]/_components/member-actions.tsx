"use client";

import { useState } from "react";

import { MoreHorizontal, UserMinus } from "lucide-react";

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
  onRemove,
}: {
  member: ProjectMemberItem;
  disabled: boolean;
  onRemove: () => Promise<unknown>;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const name = member.display_name?.trim() || member.email;
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="icon-sm" disabled={disabled} aria-label={`Actions for ${name}`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuGroup>
            <DropdownMenuItem variant="destructive" disabled={disabled} onSelect={() => setConfirmOpen(true)}>
              <UserMinus />
              Remove from project
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Remove ${name}?`}
        description="They lose access to this project straight away. Their uploads and runs stay. You can invite them again later."
        confirmLabel="Remove"
        destructive
        onConfirm={() => {
          if (!disabled) void onRemove();
        }}
      />
    </>
  );
}
