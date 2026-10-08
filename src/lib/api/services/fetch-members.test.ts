import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AssignableProjectRole } from "@/lib/auth/project-access";
import { ProjectRole } from "@/types/enums";

import apiService from "../core";
import { fetchMembers } from "./fetch-members";

vi.mock("../core", () => ({ default: { post: vi.fn(), put: vi.fn() } }));

beforeEach(() => vi.clearAllMocks());

describe("project member role request guards", () => {
  it("rejects inviting a PM before sending a request", async () => {
    await expect(
      fetchMembers.create("project", {
        email: "member@example.com",
        role: ProjectRole.ProjectManager as AssignableProjectRole,
      }),
    ).rejects.toMatchObject({ code: "INVALID_PROJECT_MEMBER_ROLE" });
    expect(apiService.post).not.toHaveBeenCalled();
  });

  it("rejects assigning PM before sending a request", async () => {
    await expect(
      fetchMembers.update("project", "member", {
        role: ProjectRole.ProjectManager as AssignableProjectRole,
      }),
    ).rejects.toMatchObject({ code: "INVALID_PROJECT_MEMBER_ROLE" });
    expect(apiService.put).not.toHaveBeenCalled();
  });

  it.each([ProjectRole.Researcher, ProjectRole.Reviewer] as const)(
    "sends the project-scoped %s role unchanged",
    async (role) => {
      vi.mocked(apiService.put).mockResolvedValue({ data: { success: true } } as Awaited<
        ReturnType<typeof apiService.put>
      >);
      await fetchMembers.update("project", "member", { role });
      expect(apiService.put).toHaveBeenCalledWith("/projects/project/members/member", { role });
    },
  );
});
