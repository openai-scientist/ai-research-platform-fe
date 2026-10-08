import { ProjectRole, ProjectStatus } from "@/types/enums";

export const ASSIGNABLE_PROJECT_ROLES = [ProjectRole.Researcher, ProjectRole.Reviewer] as const;
export type AssignableProjectRole = (typeof ASSIGNABLE_PROJECT_ROLES)[number];

export const PROJECT_ROLE_LABELS: Record<ProjectRole, string> = {
  [ProjectRole.ProjectManager]: "Project Manager",
  [ProjectRole.Researcher]: "Researcher",
  [ProjectRole.Reviewer]: "Reviewer",
};

export function isAssignableProjectRole(role: string): role is AssignableProjectRole {
  return role === ProjectRole.Researcher || role === ProjectRole.Reviewer;
}

export function canManageProjectMember(
  project: { owner_user_id: string; status: ProjectStatus },
  member: { user_id: string; role: ProjectRole },
) {
  return (
    project.status !== ProjectStatus.Archived &&
    member.user_id !== project.owner_user_id &&
    member.role !== ProjectRole.ProjectManager
  );
}

export function getProjectAccess(role: ProjectRole | null | undefined, status: ProjectStatus) {
  const writable = status !== ProjectStatus.Archived;
  return {
    canRead: role === ProjectRole.ProjectManager || role === ProjectRole.Researcher || role === ProjectRole.Reviewer,
    canAccessSettings: role === ProjectRole.ProjectManager,
    canManage: writable && role === ProjectRole.ProjectManager,
    canWrite: writable && (role === ProjectRole.ProjectManager || role === ProjectRole.Researcher),
  };
}
