import type { ProjectRole } from "@/lib/auth/types";
import type { ApiResult } from "@/types/api";

import apiService from "../core";
import { projectPath } from "../request";
import type { ListParams } from "../types";

export interface ProjectMemberItem {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  role: ProjectRole;
  created_at: string;
}

export interface CreateMemberRequest {
  email: string;
  role: ProjectRole;
}

export interface UpdateMemberRequest {
  role: ProjectRole;
}

export type MemberListResponse = ApiResult<ProjectMemberItem[]>;
export type MemberDetailResponse = ApiResult<ProjectMemberItem>;
export type EmptyResponse = ApiResult<null>;

const membersPath = (projectId: string) => `${projectPath(projectId)}/members`;
export const fetchMembers = {
  getList: async (projectId: string, params?: ListParams, signal?: AbortSignal): Promise<MemberListResponse> => {
    const response = await apiService.get<MemberListResponse>(membersPath(projectId), params, { signal });
    return response.data;
  },
  create: async (projectId: string, data: CreateMemberRequest): Promise<MemberDetailResponse> => {
    const response = await apiService.post<MemberDetailResponse>(membersPath(projectId), data);
    return response.data;
  },
  update: async (projectId: string, membershipId: string, data: UpdateMemberRequest): Promise<MemberDetailResponse> => {
    const response = await apiService.put<MemberDetailResponse>(
      `${membersPath(projectId)}/${encodeURIComponent(membershipId)}`,
      data,
    );
    return response.data;
  },
  remove: async (projectId: string, membershipId: string): Promise<EmptyResponse> => {
    const response = await apiService.delete<EmptyResponse>(
      `${membersPath(projectId)}/${encodeURIComponent(membershipId)}`,
    );
    return response.data;
  },
};
