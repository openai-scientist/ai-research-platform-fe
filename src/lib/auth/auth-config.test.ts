import { describe, expect, it } from "vitest";

import { PlatformRole, ProjectRole, UserStatus } from "@/types/enums";

import { canCreateProject, getRoleHomePath, PLATFORM_ROLE_LABELS, toAuthUser } from "./auth-config";
import type { CurrentUser } from "./types";

function session(platformRole = PlatformRole.User): CurrentUser {
  return {
    user: {
      id: "user-1",
      email: "user@example.com",
      display_name: "Member",
      avatar_url: null,
      status: UserStatus.Active,
      platform_role: platformRole,
      email_verified: true,
      must_change_password: false,
      created_at: "2026-10-08T00:00:00Z",
    },
    session: {
      created_at: "2026-10-08T00:00:00Z",
      last_seen_at: "2026-10-08T00:00:00Z",
      idle_expires_at: "2026-10-09T00:00:00Z",
      absolute_expires_at: "2026-10-10T00:00:00Z",
    },
    memberships: [
      { project_id: "owned", project_name: "Owned", role: ProjectRole.ProjectManager, archived: false },
      { project_id: "research", project_name: "Research", role: ProjectRole.Researcher, archived: false },
      { project_id: "review", project_name: "Review", role: ProjectRole.Reviewer, archived: false },
    ],
  };
}

describe("platform and project role separation", () => {
  it.each([undefined, "not-a-member"])("has no project role outside a membership (%s)", (projectId) => {
    const user = toAuthUser(session(), projectId);
    expect(user.projectRole).toBeNull();
    expect(user.platform_role).toBe(PlatformRole.User);
    expect(PLATFORM_ROLE_LABELS[user.platform_role]).toBe("User");
    expect("role" in user).toBe(false);
  });

  it.each([
    ["owned", ProjectRole.ProjectManager],
    ["research", ProjectRole.Researcher],
    ["review", ProjectRole.Reviewer],
  ] as const)("uses only the membership for %s", (projectId, role) => {
    const user = toAuthUser(session(), projectId);
    expect(user.projectRole).toBe(role);
    expect(user.platform_role).toBe(PlatformRole.User);
    expect(getRoleHomePath(user.platform_role)).toBe("/projects");
  });

  it("keeps Admin independent from a Researcher membership", () => {
    const user = toAuthUser(session(PlatformRole.PlatformAdmin), "research");
    expect(user.platform_role).toBe(PlatformRole.PlatformAdmin);
    expect(user.projectRole).toBe(ProjectRole.Researcher);
    expect(getRoleHomePath(user.platform_role)).toBe("/admin");
    expect(PLATFORM_ROLE_LABELS[user.platform_role]).toBe("Admin");
  });

  it("does not assign a project role to an Admin without membership", () => {
    expect(toAuthUser(session(PlatformRole.PlatformAdmin), "unknown").projectRole).toBeNull();
  });

  it.each([PlatformRole.User, PlatformRole.PlatformAdmin])("allows %s to create their own project", (role) => {
    expect(canCreateProject(role)).toBe(true);
  });

  it("does not accept a project role as a platform role", () => {
    expect(canCreateProject(ProjectRole.ProjectManager as unknown as PlatformRole)).toBe(false);
  });
});
