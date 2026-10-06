"use client";

import type { ReactNode } from "react";

import Link from "next/link";

import type { ReactTable } from "@tanstack/react-table";
import { cn } from "cn";
import { Copy } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { resolveAvatarUrl } from "@/lib/auth/avatar";
import type { DataTableFeatures } from "@/lib/data-table-features";
import { getInitials } from "@/lib/utils";

import type { UserRow } from "./data";
import { getAvatarTone, RoleSelect, StatusBadge } from "./users-columns";

type UsersGridProps = {
  readonly roleChangeDisabled?: boolean;
  readonly showActions?: boolean;
  readonly renderActions?: (user: UserRow) => ReactNode;
  readonly getDetailsHref?: (user: UserRow) => string | undefined;
  readonly onChangeRole?: (user: UserRow, role: string) => void;
  readonly onToggleStatus?: (user: UserRow) => void;
  readonly roleChoices?: readonly string[];
  readonly showTeam?: boolean;
  readonly table: ReactTable<DataTableFeatures, UserRow>;
};

async function copyEmail(email: string) {
  try {
    await navigator.clipboard.writeText(email);
    toast.success("Email copied.");
  } catch {
    toast.error("Could not copy the email.");
  }
}

export function UsersGrid({
  roleChangeDisabled = false,
  showActions = true,
  renderActions,
  getDetailsHref,
  onChangeRole,
  onToggleStatus,
  roleChoices = [],
  showTeam = true,
  table,
}: UsersGridProps) {
  const rows = table.getRowModel().rows;

  if (!rows.length) {
    return <div className="flex h-24 items-center justify-center text-muted-foreground text-sm">No results.</div>;
  }

  return (
    <div className="grid gap-4 px-4 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((row) => {
        const user = row.original;
        const href = getDetailsHref?.(user);

        return (
          <Card key={row.id}>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <Avatar size="lg" className={cn("size-12 font-medium", getAvatarTone(user.name))}>
                  <AvatarImage src={resolveAvatarUrl(user.avatar_url)} alt={user.name} crossOrigin="use-credentials" />
                  <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-base text-foreground">{user.name}</div>
                  {onChangeRole && roleChoices.length > 0 ? (
                    <RoleSelect
                      user={user}
                      choices={roleChoices}
                      onChange={onChangeRole}
                      className="mt-1 w-40"
                      disabled={roleChangeDisabled}
                    />
                  ) : (
                    <div className="truncate text-muted-foreground text-sm">
                      {showTeam ? `${user.role} · ${user.team}` : user.role}
                    </div>
                  )}
                </div>
                <StatusBadge status={user.status} />
              </div>

              <div className="flex items-center gap-2 rounded-lg bg-muted/50 py-1 pr-1 pl-3">
                <span className="min-w-0 flex-1 truncate text-sm">{user.email}</span>
                <Button
                  aria-label={`Copy ${user.email}`}
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => void copyEmail(user.email)}
                >
                  <Copy />
                </Button>
              </div>

              {showActions && <Separator />}

              {showActions &&
                (renderActions ? (
                  <div className="flex justify-end">{renderActions(user)}</div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {href ? (
                      <Button asChild variant="outline" size="sm">
                        <Link href={href}>View profile</Link>
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm">
                        View profile
                      </Button>
                    )}
                    {/* Mock: the backend has no invitation flow. */}
                    <Button variant="outline" size="sm">
                      Resend invite
                    </Button>
                    {user.status === "Active" ? (
                      <Button variant="destructive" size="sm" onClick={() => onToggleStatus?.(user)}>
                        Deactivate
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => onToggleStatus?.(user)}>
                        Activate
                      </Button>
                    )}
                  </div>
                ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
