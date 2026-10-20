"use client";

import type { ReactNode } from "react";

import type { DataTableColumn } from "@/components/data-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ProjectMemberItem } from "@/lib/api/services/fetch-members";
import type { AssignableProjectRole } from "@/lib/auth/project-access";

import { MemberActions } from "./member-actions";
import { InvitationActions, InvitationStatus, MemberIdentity, MemberRole } from "./member-rows";

const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

export function MembersTable({
  rows,
  ownerId,
  userId,
  invitations = false,
  busy,
  editable,
  onRoleChange,
  onRemove,
  onResend,
  toolbar,
}: {
  rows: ProjectMemberItem[];
  ownerId: string;
  userId: string;
  invitations?: boolean;
  busy: boolean;
  editable: (member: ProjectMemberItem) => boolean;
  onRoleChange: (member: ProjectMemberItem, role: AssignableProjectRole) => void;
  onRemove: (member: ProjectMemberItem) => Promise<unknown>;
  onResend: (member: ProjectMemberItem) => Promise<unknown>;
  toolbar: ReactNode;
}) {
  const columns: DataTableColumn<ProjectMemberItem>[] = [
    {
      id: "member",
      label: "Member",
      cellClassName: "min-w-52",
      cell: (member) => (
        <MemberIdentity member={member} you={member.user_id === userId} owner={member.user_id === ownerId} />
      ),
    },
    {
      id: "role",
      label: "Role",
      cellClassName: "w-44",
      cell: (member) => (
        <MemberRole
          member={member}
          editable={editable(member)}
          disabled={busy}
          onChange={(role) => onRoleChange(member, role)}
        />
      ),
    },
    {
      id: "date",
      label: invitations ? "Status" : "Added",
      cellClassName: "w-36 whitespace-nowrap text-muted-foreground tabular-nums",
      cell: (member) =>
        invitations ? (
          <InvitationStatus member={member} />
        ) : (
          <time dateTime={member.created_at}>{dateFormat.format(new Date(member.created_at))}</time>
        ),
    },
  ];
  if (rows.some(editable))
    columns.push({
      id: "actions",
      label: "Actions",
      align: "right",
      cell: (member) => {
        if (!editable(member)) return null;
        return invitations ? (
          <InvitationActions
            member={member}
            disabled={busy}
            onResend={() => onResend(member)}
            onCancel={() => onRemove(member)}
          />
        ) : (
          <div className="flex justify-end">
            <MemberActions member={member} disabled={busy} onRemove={() => onRemove(member)} />
          </div>
        );
      },
    });
  return (
    <div className="flex min-w-0 flex-col gap-4">
      {toolbar}
      <Table aria-label={invitations ? "Project invitations" : "Project members"}>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.id} scope="col" className={column.align === "right" ? "text-right" : undefined}>
                {column.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((member) => (
            <TableRow key={member.id}>
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  className={column.cellClassName ?? (column.align === "right" ? "text-right" : undefined)}
                >
                  {column.cell(member)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
