"use client";

import { CalendarClock } from "lucide-react";

import { ManagementStatusBadge } from "@/components/management-status-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { InvitationItem } from "@/lib/api/services/fetch-invitations";
import { resolveAvatarUrl } from "@/lib/auth/avatar";
import { getInitials } from "@/lib/utils";

export function ProjectInvitationCard({
  invitation,
  disabled,
  action,
  onAnswer,
}: {
  invitation: InvitationItem;
  disabled: boolean;
  action?: "accept" | "decline";
  onAnswer: (invitation: InvitationItem, action: "accept" | "decline") => void;
}) {
  const inviter = invitation.invited_by_display_name ?? "Project manager";
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="min-w-0 wrap-anywhere">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h3 className="max-w-full wrap-anywhere">{invitation.project_name}</h3>
            <span className="font-normal text-muted-foreground capitalize">{invitation.role.replaceAll("_", " ")}</span>
          </div>
        </CardTitle>
        <CardAction className="row-span-1">
          <ManagementStatusBadge status={invitation.invite_expired ? "Expired" : "Pending"} />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex min-w-0 items-center gap-2">
            <Avatar>
              <AvatarImage
                src={resolveAvatarUrl(invitation.invited_by_avatar_url)}
                alt={inviter}
                crossOrigin="use-credentials"
              />
              <AvatarFallback>{getInitials(inviter)}</AvatarFallback>
            </Avatar>
            <p className="min-w-0 wrap-anywhere text-muted-foreground text-xs">
              Invited by <span className="text-foreground">{inviter}</span>
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <CalendarClock className="size-3.5 shrink-0" aria-hidden="true" />
            <p className="text-xs">
              Expires{" "}
              {invitation.invite_expires_at ? (
                <time dateTime={invitation.invite_expires_at}>
                  {new Date(invitation.invite_expires_at).toLocaleString("en-US")}
                </time>
              ) : (
                "—"
              )}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 justify-end gap-2">
          <Button size="sm" variant="outline" disabled={disabled} onClick={() => onAnswer(invitation, "decline")}>
            {action === "decline" ? "Declining..." : "Decline"}
          </Button>
          <Button
            size="sm"
            disabled={disabled || invitation.invite_expired}
            onClick={() => onAnswer(invitation, "accept")}
          >
            {action === "accept" ? "Accepting..." : "Accept"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
