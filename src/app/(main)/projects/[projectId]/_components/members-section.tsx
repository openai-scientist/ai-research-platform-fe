"use client";

import { type ReactNode, useCallback, useEffect, useState } from "react";

import { MailX, Search, SearchX, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useInfinityScroll } from "@/hooks/use-infinity-scroll";
import {
  useRemoveMemberMutation,
  useResendProjectInviteMutation,
  useUpdateMemberMutation,
} from "@/hooks/use-members-query";
import { projectKeys } from "@/lib/api/query-keys";
import { fetchMembers, type MemberListParams, type ProjectMemberItem } from "@/lib/api/services/fetch-members";
import { type AssignableProjectRole, canManageProjectMember, PROJECT_ROLE_LABELS } from "@/lib/auth/project-access";
import { ProjectRole, ProjectStatus } from "@/types/enums";

import { InviteMemberDialog } from "./invite-member-dialog";
import { InvitationRow, MemberRow, nameOf, RowsSkeleton } from "./member-rows";
import { MembersTable } from "./members-table";
import { LoadMore, perform, type WorkspaceProps } from "./workspace-ui";

const ROLES = [ProjectRole.ProjectManager, ProjectRole.Researcher, ProjectRole.Reviewer] as const;
type RoleFilter = "all" | ProjectRole;

type MemberFilters = Omit<MemberListParams, "limit" | "offset">;

function useMemberList(projectId: string, filters: MemberFilters) {
  return useInfinityScroll<ProjectMemberItem, MemberFilters>({
    queryKey: projectKeys.memberLists(projectId),
    fetchPage: (params, signal) => fetchMembers.getList(projectId, params, signal),
    filters,
    pageSize: 50,
  });
}

export function MembersSection({
  project,
  canManage,
  userId,
  header,
  accessPanel,
}: WorkspaceProps & {
  header?: ReactNode;
  accessPanel?: ReactNode;
}) {
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [role, setRole] = useState<RoleFilter>("all");
  const [tab, setTab] = useState<"members" | "invitations" | "access">("members");
  const [inviteOpen, setInviteOpen] = useState(false);
  const closeInvite = useCallback(() => setInviteOpen(false), []);
  useEffect(() => {
    const timer = window.setTimeout(() => setQ(search.trim().slice(0, 120)), 300);
    return () => window.clearTimeout(timer);
  }, [search]);
  // Another project starts from a clean slate.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset only when the project changes
  useEffect(() => {
    setSearch("");
    setQ("");
    setRole("all");
    setTab("members");
    setInviteOpen(false);
  }, [project.id]);

  const filters = { q: q || undefined, role: role === "all" ? undefined : role };
  const members = useMemberList(project.id, { ...filters, status: "active" });
  const invitations = useMemberList(project.id, { ...filters, status: "invited" });
  const update = useUpdateMemberMutation(project.id);
  const remove = useRemoveMemberMutation(project.id);
  const resend = useResendProjectInviteMutation(project.id);

  const writable = canManage && project.status !== ProjectStatus.Archived;
  const busy = update.isPending || remove.isPending || resend.isPending;
  const filtered = Boolean(q) || role !== "all";
  const editable = (member: ProjectMemberItem) => writable && canManageProjectMember(project, member);

  const changeRole = (member: ProjectMemberItem, next: AssignableProjectRole) =>
    void perform(() => update.mutateAsync({ membershipId: member.id, role: next }), {
      title: `Role changed to ${PROJECT_ROLE_LABELS[next]}`,
      description: nameOf(member),
    });
  async function resendInvitation(member: ProjectMemberItem) {
    const result = await perform(() => resend.mutateAsync(member.id));
    if (!result) return;
    toast.success("Invitation sent again", { description: member.email });
    if (result.data.invite_email_sent === false) toast.info("The invitation was renewed, but its email was not sent.");
  }

  const toolbar = (
    <div className="flex w-full flex-col gap-3 @2xl/members:flex-row @2xl/members:items-center @2xl/members:justify-between">
      {writable && (
        <Button type="button" onClick={() => setInviteOpen(true)}>
          <UserPlus data-icon="inline-start" />
          Invite member
        </Button>
      )}
      <div className="grid w-full gap-2 @lg/members:grid-cols-[minmax(0,1fr)_10rem] @2xl/members:ml-auto @2xl/members:w-auto">
        <InputGroup className="w-full @2xl/members:w-60">
          <InputGroupAddon align="inline-start">
            <Search aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            value={search}
            maxLength={120}
            placeholder="Search by name or email"
            aria-label="Search members"
            onChange={(event) => setSearch(event.target.value)}
          />
        </InputGroup>
        <Select value={role} onValueChange={(value) => setRole(value as RoleFilter)}>
          <SelectTrigger aria-label="Filter by role" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">All roles</SelectItem>
              {ROLES.map((value) => (
                <SelectItem key={value} value={value}>
                  {PROJECT_ROLE_LABELS[value]}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const invitationCount = invitations.totalItems ?? invitations.items.length;
  // The owner, then you, then everyone else in the order the server sent them.
  const rank = (member: ProjectMemberItem) => {
    if (member.user_id === project.owner_user_id) return 0;
    return member.user_id === userId ? 1 : 2;
  };
  const ordered = [...members.items].sort((a, b) => rank(a) - rank(b));
  const clearFilters = () => {
    setSearch("");
    setRole("all");
  };

  function status(list: typeof members, empty: ReactNode) {
    if (list.isPending)
      return (
        <div className="flex flex-col gap-4">
          {toolbar}
          <RowsSkeleton rows={3} />
        </div>
      );
    if (list.isError)
      return (
        <div className="flex flex-col gap-4">
          {toolbar}
          <Button variant="outline" onClick={() => void list.refetch()}>
            Try again
          </Button>
        </div>
      );
    if (list.items.length) return null;
    return (
      <div className="flex flex-col gap-4">
        {toolbar}
        <div className="flex flex-col items-center gap-3 px-4 py-14 text-center text-muted-foreground text-sm">
          {filtered ? (
            <>
              <SearchX className="size-8 text-muted-foreground/70" aria-hidden="true" />
              <p>Nobody here matches these filters.</p>
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            </>
          ) : (
            empty
          )}
        </div>
      </div>
    );
  }

  const more = (list: typeof members) =>
    list.hasNextPage && (
      <div className="border-t p-3 text-center">
        <LoadMore visible pending={list.isFetchingNextPage} onClick={list.loadMore} />
      </div>
    );

  const removeMember = (member: ProjectMemberItem) =>
    perform(() => remove.mutateAsync(member.id), {
      title: "Removed from the project",
      description: nameOf(member),
    });
  const cancelInvitation = (member: ProjectMemberItem) =>
    perform(() => remove.mutateAsync(member.id), {
      title: "Invitation cancelled",
      description: member.email,
    });

  return (
    <div className="@container/members flex min-w-0 max-w-5xl flex-col gap-6">
      {header}

      <Tabs
        value={tab}
        onValueChange={(value) => {
          if (value === "members" || value === "invitations" || (value === "access" && accessPanel)) setTab(value);
        }}
        className="flex min-w-0 flex-col gap-5"
      >
        <div className="min-w-0 overflow-x-auto border-b pb-1">
          <TabsList variant="line" className="h-10 gap-6 p-0">
            <TabsTrigger value="members" className="px-0.5 pb-2.5">
              Members
              {members.totalItems !== null && (
                <span className="text-muted-foreground tabular-nums">{members.totalItems}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="invitations" className="px-0.5 pb-2.5">
              Invitations
              {invitationCount > 0 && (
                <span className="rounded-full bg-muted px-1.5 text-foreground text-xs tabular-nums">
                  {invitationCount}
                </span>
              )}
            </TabsTrigger>
            {accessPanel && (
              <TabsTrigger value="access" className="px-0.5 pb-2.5">
                Access settings
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        <TabsContent value="members" className="flex min-w-0 flex-col gap-4">
          {status(members, <p>No members yet.</p>) ?? (
            <>
              <div className="hidden @3xl/members:block">
                <MembersTable
                  rows={ordered}
                  ownerId={project.owner_user_id}
                  userId={userId}
                  busy={busy}
                  editable={editable}
                  onRoleChange={changeRole}
                  onRemove={removeMember}
                  onResend={resendInvitation}
                  toolbar={toolbar}
                />
              </div>
              <div className="flex flex-col gap-4 @3xl/members:hidden">
                {toolbar}
                <ul className="divide-y border-y">
                  {ordered.map((member) => (
                    <MemberRow
                      key={member.id}
                      member={member}
                      you={member.user_id === userId}
                      owner={member.user_id === project.owner_user_id}
                      editable={editable(member)}
                      disabled={busy}
                      onRoleChange={(next) => changeRole(member, next)}
                      onRemove={() => removeMember(member)}
                    />
                  ))}
                </ul>
              </div>
            </>
          )}
          {more(members)}
        </TabsContent>

        <TabsContent value="invitations" className="flex min-w-0 flex-col gap-4">
          {status(
            invitations,
            <>
              <MailX className="size-8 text-muted-foreground/70" aria-hidden="true" />
              <p>No pending invitations.</p>
            </>,
          ) ?? (
            <>
              <p className="text-muted-foreground text-xs">
                People join with the role shown once they accept. Each invitation shows its expiry below. The project
                expiry policy is capped by the platform maximum.
              </p>
              <div className="hidden @3xl/members:block">
                <MembersTable
                  rows={invitations.items}
                  ownerId={project.owner_user_id}
                  userId={userId}
                  invitations
                  busy={busy}
                  editable={editable}
                  onRoleChange={changeRole}
                  onRemove={cancelInvitation}
                  onResend={resendInvitation}
                  toolbar={toolbar}
                />
              </div>
              <div className="flex flex-col gap-4 @3xl/members:hidden">
                {toolbar}
                <ul className="divide-y border-y">
                  {invitations.items.map((member) => (
                    <InvitationRow
                      key={member.id}
                      member={member}
                      editable={editable(member)}
                      disabled={busy}
                      onRoleChange={(next) => changeRole(member, next)}
                      onResend={() => resendInvitation(member)}
                      onCancel={() => cancelInvitation(member)}
                    />
                  ))}
                </ul>
              </div>
            </>
          )}
          {more(invitations)}
        </TabsContent>
        {accessPanel && <TabsContent value="access">{accessPanel}</TabsContent>}
      </Tabs>

      {inviteOpen && writable && <InviteMemberDialog key={project.id} projectId={project.id} onClose={closeInvite} />}
    </div>
  );
}
