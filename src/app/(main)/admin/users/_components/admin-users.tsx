"use client";

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

// Labels for the backend platform_role; null means the account has no platform-wide role.
const PLATFORM_ROLE_LABELS: Record<PlatformRole, string> = {
  [PlatformRole.PlatformAdmin]: "Platform Admin",
};
const NO_PLATFORM_ROLE_LABEL = "User";
const ROLE_OPTIONS = ["All", PLATFORM_ROLE_LABELS[PlatformRole.PlatformAdmin], NO_PLATFORM_ROLE_LABEL];
const STATUS_OPTIONS = ["All", "Active", "Suspended"];
const NO_OPTIONS: readonly string[] = [];

function toPlatformRole(label: string): PlatformRole | null {
  const match = Object.entries(PLATFORM_ROLE_LABELS).find(([, value]) => value === label);
  return match ? (match[0] as PlatformRole) : null;
}

export function AdminUsers() {
  const { enabled } = useAdminAccess();
  const users = useUsersQuery({ limit: 100 }, { enabled });
  const statusMutation = useUpdateUserStatusMutation();
  const roleMutation = useUpdatePlatformRoleMutation();
  const rows: UserRow[] = (users.data?.data ?? []).map((user) => ({
    id: user.id,
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
      { onSuccess: () => toast.success("User updated successfully.") },
    );
  };

  const changeRole = (user: UserRow, role: string) => {
    if (!user.id || roleMutation.isPending) return;
    roleMutation.mutate(
      { userId: user.id, role: toPlatformRole(role) },
      { onSuccess: () => toast.success("Role updated successfully.") },
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader
        title="Users"
        description="Manage the system accounts used by the ResearchLab AI platform."
        actions={
          <>
            {/* Mock: Export and Add User have no API yet. */}
            <Button variant="outline">
              <Download data-icon="inline-start" />
              Export
            </Button>
            <Button>
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
        compactToolbar
        description=""
        getDetailsHref={(user) => (user.id ? `/admin/users/${encodeURIComponent(user.id)}` : undefined)}
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
    </div>
  );
}
