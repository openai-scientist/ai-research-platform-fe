"use client";

import type { ReactNode } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProjectMemberItem } from "@/lib/api/services/fetch-members";
import { resolveAvatarUrl } from "@/lib/auth/avatar";
import { type AssignableProjectRole, isAssignableProjectRole, PROJECT_ROLE_LABELS } from "@/lib/auth/project-access";
import { getInitials } from "@/lib/utils";

import { timeAgo } from "./dataset-format";
import { MemberActions } from "./member-actions";
import { RoleSelect } from "./workspace-ui";

const day = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

export const nameOf = (member: ProjectMemberItem) => member.display_name?.trim() || member.email;

export function MemberIdentity({ member, you, owner }: { member: ProjectMemberItem; you: boolean; owner: boolean }) {
  const name = nameOf(member);
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar className="size-9">
        <AvatarImage src={resolveAvatarUrl(member.avatar_url)} alt="" crossOrigin="use-credentials" />
        <AvatarFallback>{getInitials(name)}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-col">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate font-medium text-sm">{name}</span>
          {you && (
            <Badge variant="secondary" className="shrink-0">
              You
            </Badge>
          )}
          {owner && (
            <Badge variant="outline" className="shrink-0">
              Owner
            </Badge>
          )}
        </div>
        {name !== member.email && <span className="truncate text-muted-foreground text-xs">{member.email}</span>}
      </div>
    </div>
  );
}

function Row({
  person,
  role,
  date,
  actions,
}: {
  person: ReactNode;
  role: ReactNode;
  date: ReactNode;
  actions: ReactNode;
}) {
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 py-4">
      {person}
      <div className="flex justify-end">{actions}</div>
      {/* Compact rows are used when the Members content area is too narrow for a table. */}
      <div className="col-span-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 pl-12">
        <div className="min-w-0">{role}</div>
        <div className="text-muted-foreground text-sm tabular-nums">{date}</div>
      </div>
    </li>
  );
}

export function MemberRole({
  member,
  editable,
  disabled,
  onChange,
}: {
  member: ProjectMemberItem;
  editable: boolean;
  disabled: boolean;
  onChange: (role: AssignableProjectRole) => void;
}) {
  if (!editable || !isAssignableProjectRole(member.role))
    return <span className="text-sm">{PROJECT_ROLE_LABELS[member.role]}</span>;
  return (
    <RoleSelect
      label={`Role of ${nameOf(member)}`}
      value={member.role}
      disabled={disabled}
      className="h-8 w-40"
      onChange={(role) => {
        if (role !== member.role) onChange(role);
      }}
    />
  );
}

export function MemberRow({
  member,
  you,
  owner,
  editable,
  disabled,
  onRoleChange,
  onRemove,
}: {
  member: ProjectMemberItem;
  you: boolean;
  owner: boolean;
  editable: boolean;
  disabled: boolean;
  onRoleChange: (role: AssignableProjectRole) => void;
  onRemove: () => Promise<unknown>;
}) {
  return (
    <Row
      person={<MemberIdentity member={member} you={you} owner={owner} />}
      role={<MemberRole member={member} editable={editable} disabled={disabled} onChange={onRoleChange} />}
      date={<time dateTime={member.created_at}>{day.format(new Date(member.created_at))}</time>}
      actions={editable ? <MemberActions member={member} disabled={disabled} onRemove={onRemove} /> : null}
    />
  );
}

export function InvitationStatus({ member }: { member: ProjectMemberItem }) {
  const expires = member.invite_expires_at;
  if (member.invite_expired) return <Badge variant="destructive">Expired</Badge>;
  if (!expires) return "Waiting for a reply";
  return (
    <time dateTime={expires} title={new Date(expires).toLocaleString("en-US")}>
      Expires {timeAgo(expires)}
    </time>
  );
}

export function InvitationRow({
  member,
  editable,
  disabled,
  onRoleChange,
  onResend,
  onCancel,
}: {
  member: ProjectMemberItem;
  editable: boolean;
  disabled: boolean;
  onRoleChange: (role: AssignableProjectRole) => void;
  onResend: () => unknown;
  onCancel: () => unknown;
}) {
  return (
    <Row
      person={<MemberIdentity member={member} you={false} owner={false} />}
      role={<MemberRole member={member} editable={editable} disabled={disabled} onChange={onRoleChange} />}
      date={<InvitationStatus member={member} />}
      actions={
        editable ? (
          <InvitationActions member={member} disabled={disabled} onResend={onResend} onCancel={onCancel} />
        ) : null
      }
    />
  );
}

export function InvitationActions({
  member,
  disabled,
  onResend,
  onCancel,
}: {
  member: ProjectMemberItem;
  disabled: boolean;
  onResend: () => unknown;
  onCancel: () => unknown;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      {member.invite_expired && (
        <Button variant="outline" size="sm" disabled={disabled} onClick={() => void onResend()}>
          Resend
        </Button>
      )}
      <ConfirmDialog
        title="Cancel this invitation?"
        description={`${member.email} won't be able to join with it. You can invite them again later.`}
        confirmLabel="Cancel invitation"
        cancelLabel="Keep it"
        destructive
        onConfirm={() => void onCancel()}
        trigger={
          <Button variant="ghost" size="sm" disabled={disabled}>
            Cancel
          </Button>
        }
      />
    </div>
  );
}

export function RowsSkeleton({ rows }: { rows: number }) {
  return (
    <div className="flex flex-col gap-3 px-4 py-3" role="status" aria-label="Loading members">
      {Array.from({ length: rows }, (_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: placeholder rows never reorder
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="size-9 rounded-full" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="hidden h-4 w-32 sm:block" />
        </div>
      ))}
    </div>
  );
}
