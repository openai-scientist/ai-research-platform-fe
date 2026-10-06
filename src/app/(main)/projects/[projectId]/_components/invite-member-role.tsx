"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import type { InviteCandidate } from "@/lib/api/services/fetch-members";
import { resolveAvatarUrl } from "@/lib/auth/avatar";
import { getInitials } from "@/lib/utils";
import type { ProjectRole } from "@/types/enums";

import { RoleSelect } from "./workspace-ui";

export function InviteMemberRole({
  user,
  role,
  onRoleChange,
  pending,
}: {
  user: InviteCandidate;
  role: ProjectRole;
  onRoleChange: (role: ProjectRole) => void;
  pending: boolean;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarImage
            src={resolveAvatarUrl(user.avatar_url)}
            alt={user.display_name ?? user.email}
            crossOrigin="use-credentials"
          />
          <AvatarFallback>{getInitials(user.display_name ?? user.email)}</AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate font-medium text-sm">{user.display_name ?? user.email}</span>
          <span className="wrap-anywhere text-muted-foreground text-xs">{user.email}</span>
        </div>
      </div>
      <Field>
        <FieldLabel>Project role</FieldLabel>
        <RoleSelect label="Invited project role" value={role} onChange={onRoleChange} disabled={pending} />
        <FieldDescription>This role takes effect after the user accepts your invitation.</FieldDescription>
      </Field>
    </div>
  );
}
