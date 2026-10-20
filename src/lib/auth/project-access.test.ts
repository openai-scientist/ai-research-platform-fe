import { describe, expect, it } from "vitest";

import { ProjectRole, ProjectStatus } from "@/types/enums";

import {
  ASSIGNABLE_PROJECT_ROLES,
  canManageProjectMember,
  getProjectAccess,
  isAssignableProjectRole,
} from "./project-access";

describe("project access follows the project's membership", () => {
  it.each([
    [ProjectRole.ProjectManager, true, true, true],
    [ProjectRole.Researcher, true, true, false],
    [ProjectRole.Reviewer, true, false, false],
    [null, false, false, false],
    [undefined, false, false, false],
  ] as const)("%s has the expected read, write and manage access", (role, canRead, canWrite, canManage) => {
    expect(getProjectAccess(role, ProjectStatus.Draft)).toEqual({
      canRead,
      canWrite,
      canManage,
      canAccessSettings: role === ProjectRole.ProjectManager,
    });
  });

  it.each(Object.values(ProjectRole))("makes archived projects read-only for %s", (role) => {
    expect(getProjectAccess(role, ProjectStatus.Archived)).toEqual({
      canRead: true,
      canWrite: false,
      canManage: false,
      canAccessSettings: role === ProjectRole.ProjectManager,
    });
  });

  it("does not treat a platform Admin as a project membership", () => {
    expect(getProjectAccess("platform_admin" as ProjectRole, ProjectStatus.Draft)).toEqual({
      canRead: false,
      canAccessSettings: false,
      canWrite: false,
      canManage: false,
    });
  });
});

describe("only Researcher and Reviewer can be assigned", () => {
  it("excludes PM from member assignment", () => {
    expect(ASSIGNABLE_PROJECT_ROLES).toEqual([ProjectRole.Researcher, ProjectRole.Reviewer]);
    expect(isAssignableProjectRole(ProjectRole.ProjectManager)).toBe(false);
    expect(isAssignableProjectRole("platform_admin")).toBe(false);
  });

  it.each(ASSIGNABLE_PROJECT_ROLES)("allows an ordinary %s member to be managed", (role) => {
    expect(
      canManageProjectMember({ owner_user_id: "owner", status: ProjectStatus.Draft }, { user_id: "member", role }),
    ).toBe(true);
  });

  it.each(Object.values(ProjectRole))("protects the creator even when their recorded role is %s", (role) => {
    expect(
      canManageProjectMember({ owner_user_id: "owner", status: ProjectStatus.Draft }, { user_id: "owner", role }),
    ).toBe(false);
  });

  it("protects existing PM memberships", () => {
    expect(
      canManageProjectMember(
        { owner_user_id: "owner", status: ProjectStatus.Draft },
        { user_id: "another-pm", role: ProjectRole.ProjectManager },
      ),
    ).toBe(false);
  });

  it("blocks member management in an archived project", () => {
    expect(
      canManageProjectMember(
        { owner_user_id: "owner", status: ProjectStatus.Archived },
        { user_id: "member", role: ProjectRole.Researcher },
      ),
    ).toBe(false);
  });
});
