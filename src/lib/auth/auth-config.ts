import { PlatformRole, ProjectRole } from "@/types/enums";

import type { CurrentUser } from "./types";

export const AUTH_COOKIE_NAME = "platform_session";
export const LOGIN_PATH = "/auth/login";
export const SESSION_INVALID_CODES = ["SESSION_EXPIRED", "UNAUTHENTICATED", "USER_SUSPENDED"];
export const USER_ROLES = ["SYSTEM_ADMIN", "PROJECT_MANAGER", "RESEARCHER", "REVIEWER"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export type AuthUser = CurrentUser["user"] & {
  name: string;
  // Adapter for existing screen props. Project permissions come from memberships.
  role: UserRole;
  memberships: CurrentUser["memberships"];
  session: CurrentUser["session"];
};

export function toAuthUser(current: CurrentUser, projectId?: string): AuthUser {
  const projectRole = current.memberships.find((membership) => membership.project_id === projectId)?.role;
  const roles: Record<ProjectRole, UserRole> = {
    [ProjectRole.ProjectManager]: "PROJECT_MANAGER",
    [ProjectRole.Researcher]: "RESEARCHER",
    [ProjectRole.Reviewer]: "REVIEWER",
  };
  let role: UserRole = "RESEARCHER";
  if (current.user.platform_role === PlatformRole.PlatformAdmin) role = "SYSTEM_ADMIN";
  else if (projectRole) role = roles[projectRole];
  return {
    ...current.user,
    name: current.user.display_name ?? current.user.email,
    role,
    memberships: current.memberships,
    session: current.session,
  };
}
export function canAccessProjects(role: UserRole) {
  return USER_ROLES.includes(role);
}
export function canCreateProject(role: UserRole) {
  // Creating a project makes its creator project_manager, regardless of roles in other projects.
  return USER_ROLES.includes(role);
}
export function getRoleHomePath(role: UserRole) {
  return role === "SYSTEM_ADMIN" ? "/admin" : "/projects";
}
