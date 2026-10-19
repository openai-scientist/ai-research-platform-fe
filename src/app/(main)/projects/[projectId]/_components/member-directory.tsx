"use client";

import { type ReactNode, useCallback, useEffect, useState } from "react";

import { LayoutGrid, Search, Table2, UserPlus, Users } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useInfinityScroll } from "@/hooks/use-infinity-scroll";
import { useProjectAccess } from "@/hooks/use-project-access";
import { projectKeys } from "@/lib/api/query-keys";
import { fetchMembers, type MemberListParams, type ProjectMemberItem } from "@/lib/api/services/fetch-members";
import { resolveAvatarUrl } from "@/lib/auth/avatar";
import { PROJECT_ROLE_LABELS } from "@/lib/auth/project-access";
import { getInitials } from "@/lib/utils";
import { ProjectStatus } from "@/types/enums";

import { InviteMemberDialog } from "./invite-member-dialog";
import { MemberDirectoryTable } from "./member-directory-table";
import type { WorkspaceProps } from "./workspace-ui";

function MemberProfile({ member, owner, you }: { member: ProjectMemberItem; owner: boolean; you: boolean }) {
  const name = member.display_name?.trim() || member.email;
  return (
    <Card className="h-full">
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-3">
          <Avatar className="size-14">
            <AvatarImage src={resolveAvatarUrl(member.avatar_url)} alt="" crossOrigin="use-credentials" />
            <AvatarFallback>{getInitials(name)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-wrap justify-end gap-1.5">
            {owner && <Badge variant="outline">Owner</Badge>}
            {you && <Badge variant="outline">You</Badge>}
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <CardTitle className="break-words [overflow-wrap:anywhere]">
            <h3>{name}</h3>
          </CardTitle>
          {name !== member.email && <CardDescription className="break-all">{member.email}</CardDescription>}
        </div>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-muted-foreground text-sm">Project role</span>
        <Badge variant="default" className="h-7 px-3">
          {PROJECT_ROLE_LABELS[member.role]}
        </Badge>
      </CardContent>
      <CardFooter className="mt-auto">
        <p className="text-muted-foreground text-xs">
          Added{" "}
          <time dateTime={member.created_at}>
            {new Date(member.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </time>
        </p>
      </CardFooter>
    </Card>
  );
}

/** Team directory for project members. Management remains in the PM settings screen. */
export function MemberDirectory({ project, userId, header }: WorkspaceProps & { header?: ReactNode }) {
  const access = useProjectAccess(project.id);
  const invitationDefaults = access.context?.invitation;
  const canInvite =
    project.status !== ProjectStatus.Archived && Boolean(access.context?.permissions.can_invite && invitationDefaults);
  const [inviteOpen, setInviteOpen] = useState(false);
  const closeInvite = useCallback(() => setInviteOpen(false), []);
  const [view, setView] = useState<"cards" | "table">("cards");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => setQ(search.trim().slice(0, 120)), 300);
    return () => window.clearTimeout(timer);
  }, [search]);
  const members = useInfinityScroll<ProjectMemberItem, MemberListParams>({
    queryKey: projectKeys.memberLists(project.id),
    fetchPage: (params, signal) => fetchMembers.getList(project.id, params, signal),
    filters: { status: "active", q: q || undefined },
    pageSize: 50,
  });
  const rank = (member: ProjectMemberItem) => {
    if (member.user_id === project.owner_user_id) return 0;
    return member.user_id === userId ? 1 : 2;
  };
  const ordered = [...members.items].sort((left, right) => rank(left) - rank(right));
  const total = members.totalItems;
  const countLabel = total === 1 ? "member" : "members";

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        {header}
        {canInvite && (
          <Button className="self-start" onClick={() => setInviteOpen(true)}>
            <UserPlus data-icon="inline-start" />
            Invite member
          </Button>
        )}
      </div>
      <section aria-label="Project team" className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-medium text-muted-foreground text-sm" aria-live="polite">
            {total === null ? "Project team" : `${total} ${countLabel}`}
          </h2>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <InputGroup className="w-full sm:w-72">
              <InputGroupAddon align="inline-start">
                <Search aria-hidden="true" />
              </InputGroupAddon>
              <InputGroupInput
                type="search"
                value={search}
                maxLength={120}
                placeholder="Search members"
                aria-label="Search members by name or email"
                onChange={(event) => setSearch(event.target.value)}
              />
            </InputGroup>
            <ToggleGroup
              type="single"
              variant="outline"
              spacing={0}
              value={view}
              aria-label="Member view"
              className="self-end sm:self-auto"
              onValueChange={(value) => {
                if (value === "cards" || value === "table") setView(value);
              }}
            >
              <ToggleGroupItem value="cards" aria-label="Show member cards">
                <LayoutGrid />
                Cards
              </ToggleGroupItem>
              <ToggleGroupItem value="table" aria-label="Show member table">
                <Table2 />
                Table
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
        {members.isPending && view === "table" && (
          <div role="status" aria-label="Loading members">
            <Skeleton className="h-44 w-full" />
          </div>
        )}
        {members.isPending && view === "cards" && (
          <div
            role="status"
            aria-label="Loading members"
            className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,20rem),1fr))] gap-4"
          >
            {[0, 1].map((row) => (
              <div key={row} className="flex flex-col gap-4 rounded-xl border p-4">
                <Skeleton className="size-14 rounded-full" />
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-4 w-48 max-w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        )}
        {members.isError && !members.items.length && (
          <Button variant="outline" className="self-start" onClick={() => void members.refetch()}>
            Reload members
          </Button>
        )}
        {!members.isPending && !members.isError && !members.items.length && (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Users />
              </EmptyMedia>
              <EmptyTitle>{q ? "No matching members" : "No members to show"}</EmptyTitle>
              <EmptyDescription>
                {q ? "Try a different name or email address." : "People who join this project will appear here."}
              </EmptyDescription>
            </EmptyHeader>
            {q && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setQ("");
                }}
              >
                Clear search
              </Button>
            )}
          </Empty>
        )}
        {ordered.length > 0 && view === "table" && (
          <MemberDirectoryTable members={ordered} ownerId={project.owner_user_id} userId={userId} />
        )}
        {ordered.length > 0 && view === "cards" && (
          <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,20rem),1fr))] gap-4">
            {ordered.map((member) => (
              <li key={member.id} className="min-w-0">
                <MemberProfile
                  member={member}
                  owner={member.user_id === project.owner_user_id}
                  you={member.user_id === userId}
                />
              </li>
            ))}
          </ul>
        )}
        {members.hasNextPage && (
          <Button
            variant="outline"
            className="self-center"
            disabled={members.isFetchingNextPage}
            onClick={() => void members.loadMore()}
          >
            {members.isFetchingNextPage ? "Loading…" : "Load more members"}
          </Button>
        )}
      </section>
      {inviteOpen && canInvite && invitationDefaults && (
        <InviteMemberDialog projectId={project.id} defaults={invitationDefaults} onClose={closeInvite} />
      )}
    </div>
  );
}
