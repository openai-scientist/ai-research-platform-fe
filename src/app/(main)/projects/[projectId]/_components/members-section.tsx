"use client";

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";

import type { PaginationState } from "@tanstack/react-table";
import { format } from "date-fns";
import { toast } from "sonner";

import type { UserRow } from "@/app/(main)/dashboard/users/_components/data";
import { Users } from "@/app/(main)/dashboard/users/_components/users";
import { Button } from "@/components/ui/button";
import {
  useMembersQuery,
  useRemoveMemberMutation,
  useResendProjectInviteMutation,
  useUpdateMemberMutation,
} from "@/hooks/use-members-query";
import {
  ASSIGNABLE_PROJECT_ROLES,
  canManageProjectMember,
  isAssignableProjectRole,
  PROJECT_ROLE_LABELS,
} from "@/lib/auth/project-access";
import { type ProjectRole, ProjectStatus } from "@/types/enums";

import { InviteMemberDialog } from "./invite-member-dialog";
import { MemberActions } from "./member-actions";
import { perform, type WorkspaceProps } from "./workspace-ui";

const ROLE_LABELS = PROJECT_ROLE_LABELS;
const ROLE_OPTIONS = ["All", ...Object.values(ROLE_LABELS)];
const ROLE_CHOICES = ASSIGNABLE_PROJECT_ROLES.map((role) => ROLE_LABELS[role]);
const STATUS_OPTIONS = ["All", "Active", "Invited"];
const NO_OPTIONS: readonly string[] = [];
function toRole(label: string): ProjectRole | undefined {
  return Object.entries(ROLE_LABELS).find(([, value]) => value === label)?.[0] as ProjectRole | undefined;
}

export function MembersSection({ project, canManage, header }: WorkspaceProps & { header?: ReactNode }) {
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState({ role: "All", status: "All" });
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 });
  const [inviteOpen, setInviteOpen] = useState(false);
  const previousProjectId = useRef<string | undefined>(undefined);
  const closeInvite = useCallback(() => setInviteOpen(false), []);
  const validSearch = q.length <= 120;
  useEffect(() => {
    if (search.trim() === q) return;
    const timer = window.setTimeout(() => {
      const next = search.trim();
      setQ(next);
      setPagination((current) => ({ ...current, pageIndex: 0 }));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [search, q]);
  useEffect(() => {
    if (previousProjectId.current === project.id) return;
    previousProjectId.current = project.id;
    setSearch("");
    setQ("");
    setFilters({ role: "All", status: "All" });
    setPagination({ pageIndex: 0, pageSize: 50 });
    setInviteOpen(false);
  }, [project.id]);
  const query = useMembersQuery(
    project.id,
    {
      q: q || undefined,
      role: filters.role === "All" ? undefined : toRole(filters.role),
      status: filters.status === "All" ? undefined : filters.status === "Active" ? "active" : "invited",
      limit: pagination.pageSize,
      offset: pagination.pageIndex * pagination.pageSize,
    },
    { enabled: validSearch },
  );
  const total = query.data?.meta.pagination?.total ?? 0;
  useEffect(() => {
    if (!query.data || query.isFetching || query.isError) return;
    const lastPage = Math.max(0, Math.ceil(total / pagination.pageSize) - 1);
    if (pagination.pageIndex > lastPage) setPagination((current) => ({ ...current, pageIndex: lastPage }));
  }, [query.data, query.isFetching, query.isError, total, pagination.pageSize, pagination.pageIndex]);
  const resend = useResendProjectInviteMutation(project.id);
  const update = useUpdateMemberMutation(project.id);
  const remove = useRemoveMemberMutation(project.id);
  const writable = canManage && project.status !== ProjectStatus.Archived;
  const busy = resend.isPending || update.isPending || remove.isPending;
  const changing = search.trim() !== q;
  const rows: UserRow[] = (query.data?.data ?? []).map((member) => ({
    id: member.id,
    avatar_url: member.avatar_url,
    email: member.email,
    name: member.display_name ?? member.email,
    role: ROLE_LABELS[member.role],
    status: member.status === "active" ? "Active" : member.invite_expired ? "Expired invitation" : "Pending invite",
    joinedDate: format(new Date(member.created_at), "dd MMM yyyy, h:mm a"),
    team: "Platform",
    workspace: [],
  }));
  async function resendInvitation(id: string) {
    const result = await perform(() => resend.mutateAsync(id));
    if (result) {
      toast.success(result.message);
      if (result.data.invite_email_sent === false)
        toast.info("The invitation was renewed, but its email was not sent.");
    }
  }
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {header}
        {writable && (
          <Button className="shrink-0" disabled={busy} onClick={() => setInviteOpen(true)}>
            Invite member
          </Button>
        )}
      </div>
      {query.isError && (
        <Button
          variant="outline"
          className="self-start"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          Reload members
        </Button>
      )}
      <Users
        roleChangeDisabled={busy || changing || query.isFetching}
        compactToolbar
        title="All members"
        description=""
        entityLabel="members"
        nameColumnLabel="Member"
        joinedDateLabel="Created"
        roleFilterLabel="Project role"
        users={rows}
        roleOptions={ROLE_OPTIONS}
        getRoleChoices={(row) => {
          const member = query.data?.data.find((item) => item.id === row.id);
          return writable && member && canManageProjectMember(project, member) ? ROLE_CHOICES : NO_OPTIONS;
        }}
        statusOptions={STATUS_OPTIONS}
        teamOptions={NO_OPTIONS}
        workspaceOptions={NO_OPTIONS}
        showPrimaryActions={false}
        showViewControls={false}
        showActions={writable}
        server={{
          search,
          roleFilter: filters.role,
          statusFilter: filters.status,
          pagination,
          total,
          busy: changing || query.isFetching || (validSearch && query.isPending),
          onSearchChange: setSearch,
          onFilterChange: (filter, value) => {
            if (filter === "emailVerified") return;
            setFilters((current) => ({ ...current, [filter]: value }));
            setPagination((current) => ({ ...current, pageIndex: 0 }));
          },
          onPaginationChange: setPagination,
        }}
        onChangeRole={
          writable
            ? (row, label) => {
                const role = toRole(label);
                const membershipId = row.id;
                const member = query.data?.data.find((item) => item.id === membershipId);
                if (
                  !membershipId ||
                  !role ||
                  !isAssignableProjectRole(role) ||
                  !member ||
                  !canManageProjectMember(project, member) ||
                  busy ||
                  row.role === label
                )
                  return;
                void perform(() => update.mutateAsync({ membershipId, role }), "Member role updated.");
              }
            : undefined
        }
        renderActions={(row) => {
          const member = query.data?.data.find((item) => item.id === row.id);
          return member && writable && canManageProjectMember(project, member) ? (
            <MemberActions
              member={member}
              disabled={busy || query.isFetching || changing}
              onResend={() => resendInvitation(member.id)}
              onRemove={() =>
                perform(
                  () => remove.mutateAsync(member.id),
                  member.status === "invited" ? "Invitation cancelled." : "Member removed.",
                )
              }
            />
          ) : null;
        }}
      />
      {inviteOpen && writable && <InviteMemberDialog key={project.id} projectId={project.id} onClose={closeInvite} />}
    </div>
  );
}
