"use client";

import { useEffect, useState } from "react";

import type { PaginationState } from "@tanstack/react-table";
import { format } from "date-fns";
import { Download, Plus, UserCheck, UserPlus, Users as UsersIcon, UserX } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useUpdatePlatformRoleMutation, useUpdateUserStatusMutation, useUsersQuery } from "@/hooks/use-admin-query";
import { PlatformRole, UserStatus } from "@/types/enums";

import type { UserRow } from "../../../dashboard/users/_components/data";
import { Users } from "../../../dashboard/users/_components/users";
import { AdminPageHeader, MetricCard } from "../../_components/admin-primitives";
import { useAdminAccess } from "../../_components/use-admin-access";
import { AdminUserActions } from "./admin-user-actions";
import { CreateUserDialog } from "./create-user-dialog";
import { EditUserDialog } from "./edit-user-dialog";

// Labels for the backend platform_role.
const PLATFORM_ROLE_LABELS: Record<PlatformRole, string> = {
  [PlatformRole.User]: "User",
  [PlatformRole.PlatformAdmin]: "Platform Admin",
};
const NO_PLATFORM_ROLE_LABEL = "User";
const ROLE_OPTIONS = ["All", PLATFORM_ROLE_LABELS[PlatformRole.PlatformAdmin], NO_PLATFORM_ROLE_LABEL];
const STATUS_OPTIONS = ["All", "Active", "Suspended"];
const NO_OPTIONS: readonly string[] = [];

function toPlatformRole(label: string): PlatformRole {
  const match = Object.entries(PLATFORM_ROLE_LABELS).find(([, value]) => value === label);
  return match ? (match[0] as PlatformRole) : PlatformRole.User;
}

export function AdminUsers() {
  const { enabled, currentUserId } = useAdminAccess();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({ role: "All", status: "All", emailVerified: "All" });
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 });
  const validSearch = query.length <= 120;
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const value = search.trim();
      setQuery(value);
      setPagination((current) => ({ ...current, pageIndex: 0 }));
      if (value.length > 120) toast.error("Search must contain at most 120 characters.");
    }, 350);
    return () => window.clearTimeout(timer);
  }, [search]);
  const selectedStatus = filters.status === "Active" ? UserStatus.Active : UserStatus.Suspended;
  const users = useUsersQuery(
    {
      q: query || undefined,
      status: filters.status === "All" ? undefined : selectedStatus,
      platform_role: filters.role === "All" ? undefined : toPlatformRole(filters.role),
      email_verified: filters.emailVerified === "All" ? undefined : filters.emailVerified === "Verified",
      limit: pagination.pageSize,
      offset: pagination.pageIndex * pagination.pageSize,
    },
    { enabled: enabled && validSearch },
  );
  const total = users.data?.meta.pagination?.total ?? 0;
  useEffect(() => {
    if (!users.data || !validSearch || users.isFetching || users.isError) return;
    const lastPage = Math.max(0, Math.ceil(total / pagination.pageSize) - 1);
    if (pagination.pageIndex > lastPage) setPagination((current) => ({ ...current, pageIndex: lastPage }));
  }, [users.data, users.isFetching, users.isError, validSearch, total, pagination.pageSize, pagination.pageIndex]);
  const statusMutation = useUpdateUserStatusMutation();
  const roleMutation = useUpdatePlatformRoleMutation();
  const editingUser = users.data?.data.find((item) => item.id === editingId);
  const rows: UserRow[] = (users.data?.data ?? []).map((user) => ({
    id: user.id,
    avatar_url: user.avatar_url,
    email: user.email,
    joinedDate: format(new Date(user.created_at), "dd MMM yyyy, h:mm a"),
    lastActive: 0,
    name: user.display_name ?? user.email,
    role: user.platform_role ? PLATFORM_ROLE_LABELS[user.platform_role] : NO_PLATFORM_ROLE_LABEL,
    status: user.status === UserStatus.Active ? "Active" : "Suspended",
    team: "Platform",
    workspace: ["ResearchLab AI"],
  }));

  const toggleStatus = (user: UserRow) => {
    if (!user.id || statusMutation.isPending) return;
    statusMutation.mutate(
      { userId: user.id, status: user.status === "Active" ? UserStatus.Suspended : UserStatus.Active },
      {
        onSuccess: () =>
          toast.success(`"${user.name}" ${user.status === "Active" ? "was suspended" : "was reactivated"}.`),
      },
    );
  };

  const changeRole = (user: UserRow, role: string) => {
    if (!user.id || roleMutation.isPending) return;
    const target = users.data?.data.find((item) => item.id === user.id);
    if (
      role === PLATFORM_ROLE_LABELS[PlatformRole.PlatformAdmin] &&
      target &&
      (!target.email_verified || target.must_change_password)
    ) {
      toast.error("The user must verify their email and change their temporary password before becoming an admin.");
      return;
    }
    roleMutation.mutate(
      { userId: user.id, role: toPlatformRole(role) },
      { onSuccess: () => toast.success(`Changed "${user.name}" to ${role}.`) },
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader
        title="Users"
        description="Manage the system accounts used by the ResearchLab AI platform."
        actions={
          <>
            {/* Export is not backed by an API yet. */}
            <Button variant="outline">
              <Download data-icon="inline-start" />
              Export
            </Button>
            <Button disabled={!enabled} onClick={() => setCreateOpen(true)}>
              <Plus data-icon="inline-start" />
              Add User
            </Button>
          </>
        }
      />

      {/* Placeholder values until the backend provides user statistics. */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <MetricCard label="Total users" value="—" icon={UsersIcon} />
        <MetricCard label="Active users" value="—" icon={UserCheck} />
        <MetricCard label="Suspended users" value="—" icon={UserX} />
        <MetricCard label="New this month" value="—" icon={UserPlus} />
      </div>

      <Users
        server={{
          search,
          roleFilter: filters.role,
          statusFilter: filters.status,
          emailVerifiedFilter: filters.emailVerified,
          pagination,
          total,
          busy: !enabled || search.trim() !== query || users.isFetching || (validSearch && users.isPending),
          onSearchChange: setSearch,
          onFilterChange: (filter, value) => {
            setFilters((current) => ({ ...current, [filter]: value }));
            setPagination((current) => ({ ...current, pageIndex: 0 }));
          },
          onPaginationChange: setPagination,
        }}
        compactToolbar
        description=""
        renderActions={(row) => {
          const user = users.data?.data.find((item) => item.id === row.id);
          return user ? (
            <AdminUserActions
              user={user}
              currentUserId={currentUserId}
              enabled={enabled && search.trim() === query && !users.isFetching}
              onEdit={() => setEditingId(user.id)}
            />
          ) : null;
        }}
        onChangeRole={changeRole}
        onToggleStatus={toggleStatus}
        roleOptions={ROLE_OPTIONS}
        showPrimaryActions={false}
        showViewControls={false}
        statusOptions={STATUS_OPTIONS}
        teamOptions={NO_OPTIONS}
        title="All users"
        users={rows}
        workspaceOptions={NO_OPTIONS}
      />
      {createOpen && <CreateUserDialog onClose={() => setCreateOpen(false)} />}
      {editingUser && <EditUserDialog user={editingUser} onClose={() => setEditingId(null)} />}
    </div>
  );
}
