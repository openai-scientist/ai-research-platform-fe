import { projectPath, requestApi } from "../request";
import type { ListParams, MemberCreate, ProjectMemberItem, ProjectRole } from "../types";

const membersPath = (projectId: string) => `${projectPath(projectId)}/members`;
export const fetchMembers = {
  getList: (projectId: string, params?: ListParams, signal?: AbortSignal) =>
    requestApi<ProjectMemberItem[]>({ url: membersPath(projectId), params, signal }),
  create: (projectId: string, data: MemberCreate) =>
    requestApi<ProjectMemberItem>({ method: "POST", url: membersPath(projectId), data }),
  update: (projectId: string, membershipId: string, role: ProjectRole) =>
    requestApi<ProjectMemberItem>({
      method: "PUT",
      url: `${membersPath(projectId)}/${encodeURIComponent(membershipId)}`,
      data: { role },
    }),
  remove: (projectId: string, membershipId: string) =>
    requestApi<null>({ method: "DELETE", url: `${membersPath(projectId)}/${encodeURIComponent(membershipId)}` }),
};
