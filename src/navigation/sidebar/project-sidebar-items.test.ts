import { describe, expect, it } from "vitest";

import { ProjectRole } from "@/types/enums";

import { getProjectSidebarItems } from "./project-sidebar-items";

describe("project settings navigation", () => {
  it.each([
    [ProjectRole.ProjectManager, true],
    [ProjectRole.Researcher, false],
    [ProjectRole.Reviewer, false],
    [null, false],
  ] as const)("shows Settings for %s: %s", (role, visible) => {
    const items = getProjectSidebarItems("project", role).flatMap((group) => group.items);
    expect(items.some((item) => item.id === "project-settings")).toBe(visible);
  });
});
