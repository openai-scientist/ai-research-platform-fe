import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AssignableProjectRole } from "@/lib/auth/project-access";
import { ProjectRole } from "@/types/enums";

import apiService from "../core";
import { fetchMembers } from "./fetch-members";

vi.mock("../core", () => ({ default: { post: vi.fn(), put: vi.fn() } }));

beforeEach(() => vi.clearAllMocks());

describe("project member role request guards", () => {
  it("leaves the invited role to the backend, which applies the project's allowed roles", async () => {
    vi.mocked(apiService.post).mockResolvedValue({ data: { success: true } } as Awaited<
      ReturnType<typeof apiService.post>
    >);
    const invite = { email: "member@example.com", role: ProjectRole.ProjectManager };
    await fetchMembers.create("project", invite);
    expect(apiService.post).toHaveBeenCalledWith("/projects/project/members", invite);
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
