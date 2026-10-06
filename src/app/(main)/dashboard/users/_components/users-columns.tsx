"use client";
import type { ReactNode } from "react";

import type { ColumnDef } from "@tanstack/react-table";
import { Subscribe } from "@tanstack/react-table";
import { cn } from "cn";
import { parse } from "date-fns";
import { Check, Clock, MoreHorizontal, X } from "lucide-react";

import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { resolveAvatarUrl } from "@/lib/auth/avatar";
import type { DataTableFeatures } from "@/lib/data-table-features";
import { getInitials } from "@/lib/utils";

import { statusMeta, type UserRow } from "./data";

function RoleCell({ role, team }: { role: string; team?: string }) {
  return (
    <div className="grid gap-0.5">
      <span className="whitespace-nowrap">{role}</span>
      {team ? <span className="text-muted-foreground text-xs">{team}</span> : null}
    </div>
  );
}

export function RoleSelect({
  user,
  choices,
  onChange,
  className = "w-40",
  disabled = false,
}: {
  user: UserRow;
  choices: readonly string[];
  onChange: (user: UserRow, role: string) => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <Select
      disabled={disabled}
      value={user.role}
      onValueChange={(value) => {
        if (value !== user.role) onChange(user, value);
      }}
    >
      <SelectTrigger size="sm" className={className} aria-label={`Role for ${user.name}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" align="start">
        <SelectGroup>
          {choices.map((choice) => (
            <SelectItem key={choice} value={choice}>
              {choice}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

export function StatusBadge({ status }: { status: UserRow["status"] }) {
  const meta = statusMeta[status];

  return (
    <Badge className={cn("gap-1.5 border px-2 py-1 font-medium", meta.badgeClass)} variant="outline">
      <span className={cn("size-1.5 rounded-full", meta.dotClass)} />
      {status}
    </Badge>
  );
}

export function getAvatarTone(name: string) {
  const tones = [
    "[&_[data-slot=avatar-fallback]]:bg-amber-100 [&_[data-slot=avatar-fallback]]:text-amber-700 after:border-amber-200 dark:[&_[data-slot=avatar-fallback]]:bg-amber-500/15 dark:[&_[data-slot=avatar-fallback]]:text-amber-300 dark:after:border-amber-500/20",
    "[&_[data-slot=avatar-fallback]]:bg-orange-100 [&_[data-slot=avatar-fallback]]:text-orange-700 after:border-orange-200 dark:[&_[data-slot=avatar-fallback]]:bg-orange-500/15 dark:[&_[data-slot=avatar-fallback]]:text-orange-300 dark:after:border-orange-500/20",
    "[&_[data-slot=avatar-fallback]]:bg-rose-100 [&_[data-slot=avatar-fallback]]:text-rose-700 after:border-rose-200 dark:[&_[data-slot=avatar-fallback]]:bg-rose-500/15 dark:[&_[data-slot=avatar-fallback]]:text-rose-300 dark:after:border-rose-500/20",
    "[&_[data-slot=avatar-fallback]]:bg-pink-100 [&_[data-slot=avatar-fallback]]:text-pink-700 after:border-pink-200 dark:[&_[data-slot=avatar-fallback]]:bg-pink-500/15 dark:[&_[data-slot=avatar-fallback]]:text-pink-300 dark:after:border-pink-500/20",
    "[&_[data-slot=avatar-fallback]]:bg-fuchsia-100 [&_[data-slot=avatar-fallback]]:text-fuchsia-700 after:border-fuchsia-200 dark:[&_[data-slot=avatar-fallback]]:bg-fuchsia-500/15 dark:[&_[data-slot=avatar-fallback]]:text-fuchsia-300 dark:after:border-fuchsia-500/20",
    "[&_[data-slot=avatar-fallback]]:bg-purple-100 [&_[data-slot=avatar-fallback]]:text-purple-700 after:border-purple-200 dark:[&_[data-slot=avatar-fallback]]:bg-purple-500/15 dark:[&_[data-slot=avatar-fallback]]:text-purple-300 dark:after:border-purple-500/20",
    "[&_[data-slot=avatar-fallback]]:bg-violet-100 [&_[data-slot=avatar-fallback]]:text-violet-700 after:border-violet-200 dark:[&_[data-slot=avatar-fallback]]:bg-violet-500/15 dark:[&_[data-slot=avatar-fallback]]:text-violet-300 dark:after:border-violet-500/20",
    "[&_[data-slot=avatar-fallback]]:bg-indigo-100 [&_[data-slot=avatar-fallback]]:text-indigo-700 after:border-indigo-200 dark:[&_[data-slot=avatar-fallback]]:bg-indigo-500/15 dark:[&_[data-slot=avatar-fallback]]:text-indigo-300 dark:after:border-indigo-500/20",
    "[&_[data-slot=avatar-fallback]]:bg-sky-100 [&_[data-slot=avatar-fallback]]:text-sky-700 after:border-sky-200 dark:[&_[data-slot=avatar-fallback]]:bg-sky-500/15 dark:[&_[data-slot=avatar-fallback]]:text-sky-300 dark:after:border-sky-500/20",
    "[&_[data-slot=avatar-fallback]]:bg-emerald-100 [&_[data-slot=avatar-fallback]]:text-emerald-700 after:border-emerald-200 dark:[&_[data-slot=avatar-fallback]]:bg-emerald-500/15 dark:[&_[data-slot=avatar-fallback]]:text-emerald-300 dark:after:border-emerald-500/20",
  ];

  return tones[name.length % tones.length];
}

function getLastActiveBadge(lastActive: number) {
  if (lastActive < 1) {
    return {
      className: "bg-green-600 text-green-950 [&>svg]:text-white",
      icon: Check,
    };
  }

  if (lastActive < 4 * 60) {
    return {
      className: "bg-amber-500 text-amber-950",
      icon: Clock,
    };
  }

  if (lastActive < 7 * 24 * 60) {
    return {
      className: "bg-destructive",
      icon: null,
    };
  }

  return {
    className: "bg-muted-foreground text-muted",
    icon: X,
  };
}

export function AvatarCell({
  lastActive,
  name,
  avatarUrl,
}: {
  lastActive?: number;
  name: string;
  avatarUrl?: string | null;
}) {
  const badge = lastActive === undefined ? null : getLastActiveBadge(lastActive);
  const BadgeIcon = badge?.icon;

  return (
    <Avatar size="lg" className={cn("font-medium", getAvatarTone(name))}>
      <AvatarImage src={resolveAvatarUrl(avatarUrl)} alt={name} crossOrigin="use-credentials" />
      <AvatarFallback>{getInitials(name)}</AvatarFallback>
      {badge && <AvatarBadge className={badge.className}>{BadgeIcon ? <BadgeIcon /> : null}</AvatarBadge>}
    </Avatar>
  );
}

function WorkspaceCell({ workspaces }: { workspaces: string[] }) {
  const [firstWorkspace, ...remainingWorkspaces] = workspaces;
  const remainingCount = remainingWorkspaces.length;

  return (
    <AvatarGroup className="*:data-[slot=avatar]:ring-0">
      {firstWorkspace ? (
        <Avatar className="after:rounded-sm">
          <AvatarFallback className="rounded-sm ring-0">{getInitials(firstWorkspace)}</AvatarFallback>
        </Avatar>
      ) : null}
      {remainingCount > 0 ? (
        <AvatarGroupCount className="rounded-sm border ring-card">+{remainingCount}</AvatarGroupCount>
      ) : null}
    </AvatarGroup>
  );
}

export function UserActionsMenu({ user, onToggleStatus }: { user: UserRow; onToggleStatus?: (user: UserRow) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={`Open actions for ${user.name}`}
          className="size-8 rounded-md text-muted-foreground hover:bg-muted/50"
          size="icon-sm"
          variant="ghost"
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem>View profile</DropdownMenuItem>
        <DropdownMenuItem>Edit user</DropdownMenuItem>
        <DropdownMenuItem>Manage team</DropdownMenuItem>
        <DropdownMenuItem>Resend invite</DropdownMenuItem>
        <DropdownMenuSeparator />
        {onToggleStatus && user.status !== "Active" ? (
          <DropdownMenuItem onSelect={() => onToggleStatus(user)}>Activate user</DropdownMenuItem>
        ) : (
          <DropdownMenuItem variant="destructive" onSelect={() => onToggleStatus?.(user)}>
            Deactivate user
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const workspaceColumn: ColumnDef<DataTableFeatures, UserRow> = {
  accessorKey: "workspace",
  header: "Workspace",
  filterFn: "arrIncludes",
  cell: ({ row }) => <WorkspaceCell workspaces={row.original.workspace} />,
};

export type UsersColumnsOptions = {
  readonly roleChangeDisabled?: boolean;
  readonly showActions?: boolean;
  readonly nameColumnLabel?: string;
  readonly joinedDateLabel?: string;
  readonly renderActions?: (user: UserRow) => ReactNode;
  readonly onChangeRole?: (user: UserRow, role: string) => void;
  readonly onToggleStatus?: (user: UserRow) => void;
  readonly roleChoices?: readonly string[];
  readonly showTeam?: boolean;
  readonly showWorkspace?: boolean;
};

export const createUsersColumns = ({
  roleChangeDisabled = false,
  showActions = true,
  nameColumnLabel = "User",
  joinedDateLabel = "Joined date",
  renderActions,
  onChangeRole,
  onToggleStatus,
  roleChoices = [],
  showTeam = true,
  showWorkspace = true,
}: UsersColumnsOptions = {}): ColumnDef<DataTableFeatures, UserRow>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <div className="flex items-center justify-center">
        <Subscribe
          source={table.atoms.rowSelection}
          selector={() =>
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected() && "indeterminate")
          }
        >
          {(checked) => (
            <Checkbox
              aria-label="Select all users"
              checked={checked}
              onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            />
          )}
        </Subscribe>
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <Subscribe source={row.table.atoms.rowSelection} selector={(selection) => Boolean(selection?.[row.id])}>
          {(checked) => (
            <Checkbox
              aria-label={`Select ${row.original.name}`}
              checked={checked}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
            />
          )}
        </Subscribe>
      </div>
    ),
    enableHiding: false,
    enableSorting: false,
  },
  {
    id: "search",
    accessorFn: (row) => `${row.name} ${row.email}`,
    filterFn: "includesString",
    enableHiding: true,
  },
  {
    accessorKey: "name",
    header: nameColumnLabel,
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <AvatarCell name={row.original.name} lastActive={row.original.lastActive} avatarUrl={row.original.avatar_url} />
        <div className="min-w-0">
          <div className="truncate font-medium text-foreground text-sm">{row.original.name}</div>
          <div className="truncate text-muted-foreground text-sm">{row.original.email}</div>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "role",
    header: showTeam ? "Role / Team" : "Role",
    filterFn: "equalsString",
    cell: ({ row }) =>
      onChangeRole && roleChoices.length > 0 ? (
        <RoleSelect user={row.original} choices={roleChoices} onChange={onChangeRole} disabled={roleChangeDisabled} />
      ) : (
        <RoleCell role={row.original.role} team={showTeam ? row.original.team : undefined} />
      ),
  },
  {
    accessorKey: "team",
    header: "Team",
    filterFn: "equalsString",
    cell: ({ row }) => <div className="text-sm">{row.original.team}</div>,
  },
  ...(showWorkspace ? [workspaceColumn] : []),
  {
    accessorKey: "status",
    header: "Status",
    filterFn: "equalsString",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    id: "joinedDate",
    accessorFn: (row) => parse(row.joinedDate, "dd MMM yyyy, h:mm a", new Date()).getTime(),
    header: joinedDateLabel,
    cell: ({ row }) => <div className="text-foreground text-sm">{row.original.joinedDate}</div>,
  },
  ...(!showActions
    ? []
    : [
        {
          id: "actions",
          header: () => <div className="text-right">Actions</div>,
          cell: ({ row }) => (
            <div className="text-right">
              {renderActions ? (
                renderActions(row.original)
              ) : (
                <UserActionsMenu user={row.original} onToggleStatus={onToggleStatus} />
              )}
            </div>
          ),
          enableHiding: false,
          enableSorting: false,
        } satisfies ColumnDef<DataTableFeatures, UserRow>,
      ]),
];

export const usersColumns = createUsersColumns();
