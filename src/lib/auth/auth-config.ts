import { PlatformRole, type ProjectRole } from "@/types/enums";

import type { CurrentUser } from "./types";

export const AUTH_COOKIE_NAME = "platform_session";
export const LOGIN_PATH = "/auth/login";
export const ONBOARDING_PATH = "/onboarding";
export const PUBLIC_AUTH_PATHS = [
  "/auth/email/start",
  "/auth/email/verify",
  "/auth/email/link-info",
  "/auth/email/verify-link",
];
export const SESSION_INVALID_CODES = ["SESSION_EXPIRED", "UNAUTHENTICATED", "USER_SUSPENDED"];
export const PLATFORM_ROLE_LABELS: Record<PlatformRole, string> = {
  [PlatformRole.PlatformAdmin]: "Admin",
  [PlatformRole.User]: "User",
};

export type AuthUser = CurrentUser["user"] & {
  name: string;
  projectRole: ProjectRole | null;
  memberships: CurrentUser["memberships"];
  session: CurrentUser["session"];
};

export function toAuthUser(current: CurrentUser, projectId?: string): AuthUser {
  const projectRole = current.memberships.find((membership) => membership.project_id === projectId)?.role ?? null;
  return {
    ...current.user,
    name: current.user.display_name ?? current.user.email,
    projectRole,
    memberships: current.memberships,
    session: current.session,
  };
}
export function canAccessProjects(role: PlatformRole) {
  return role === PlatformRole.User || role === PlatformRole.PlatformAdmin;
}
export function canCreateProject(role: PlatformRole) {
  // Creating a project makes its creator project_manager, regardless of roles in other projects.
  return canAccessProjects(role);
}
export function getRoleHomePath(role: PlatformRole) {
  return role === PlatformRole.PlatformAdmin ? "/admin" : "/projects";
}
