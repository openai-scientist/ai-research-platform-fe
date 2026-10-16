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
import { InvitationRow, MemberColumns, MemberRow, nameOf, RowsSkeleton } from "./member-rows";
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

export function MembersSection({ project, canManage, userId, header }: WorkspaceProps & { header?: ReactNode }) {
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [role, setRole] = useState<RoleFilter>("all");
  const [tab, setTab] = useState<"members" | "invitations">("members");
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
    <div className="grid w-full gap-2 sm:flex sm:w-auto sm:items-center">
      <InputGroup className="w-full sm:w-64">
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
        <SelectTrigger aria-label="Filter by role" className="w-full sm:w-40">
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
    if (list.isPending) return <RowsSkeleton rows={3} />;
    if (list.isError)
      return (
        <div className="p-4">
          <Button variant="outline" onClick={() => void list.refetch()}>
            Try again
          </Button>
        </div>
      );
    if (list.items.length) return null;
    return (
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
    );
  }

  const more = (list: typeof members) =>
    list.hasNextPage && (
      <div className="border-t p-3 text-center">
        <LoadMore visible pending={list.isFetchingNextPage} onClick={list.loadMore} />
      </div>
    );

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {header}
        {writable && (
          <Button className="shrink-0" onClick={() => setInviteOpen(true)}>
            <UserPlus data-icon="inline-start" />
            Invite member
          </Button>
        )}
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value === "invitations" ? "invitations" : "members")}
        className="flex min-w-0 flex-col gap-0 rounded-xl border bg-card"
      >
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b px-4 pt-3 pb-3 sm:pb-0">
          <TabsList variant="line" className="h-10 gap-4 p-0">
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
          </TabsList>
          <div className="w-full sm:w-auto sm:pb-3">{toolbar}</div>
        </div>

        <TabsContent value="members" className="flex flex-col">
          {status(members, <p>No members yet.</p>) ?? (
            <>
              <MemberColumns dateLabel="Added" />
              <ul className="divide-y">
                {ordered.map((member) => (
                  <MemberRow
                    key={member.id}
                    member={member}
                    you={member.user_id === userId}
                    owner={member.user_id === project.owner_user_id}
                    editable={editable(member)}
                    disabled={busy}
                    onRoleChange={(next) => changeRole(member, next)}
                    onRemove={() =>
                      perform(() => remove.mutateAsync(member.id), {
                        title: "Removed from the project",
                        description: nameOf(member),
                      })
                    }
                  />
                ))}
              </ul>
            </>
          )}
          {more(members)}
        </TabsContent>

        <TabsContent value="invitations" className="flex flex-col">
          {status(
            invitations,
            <>
              <MailX className="size-8 text-muted-foreground/70" aria-hidden="true" />
              <p>No pending invitations.</p>
              {writable && (
                <Button variant="outline" size="sm" onClick={() => setInviteOpen(true)}>
                  Invite member
                </Button>
              )}
            </>,
          ) ?? (
            <>
              <p className="border-b px-4 py-2.5 text-muted-foreground text-xs">
                People join with the role shown once they accept. An invitation lasts 24 hours.
              </p>
              <MemberColumns dateLabel="Status" />
              <ul className="divide-y">
                {invitations.items.map((member) => (
                  <InvitationRow
                    key={member.id}
                    member={member}
                    editable={editable(member)}
                    disabled={busy}
                    onRoleChange={(next) => changeRole(member, next)}
                    onResend={() => resendInvitation(member)}
                    onCancel={() =>
                      perform(() => remove.mutateAsync(member.id), {
                        title: "Invitation cancelled",
                        description: member.email,
                      })
                    }
                  />
                ))}
              </ul>
            </>
          )}
          {more(invitations)}
        </TabsContent>
      </Tabs>

      {inviteOpen && writable && <InviteMemberDialog key={project.id} projectId={project.id} onClose={closeInvite} />}
    </div>
  );
}
