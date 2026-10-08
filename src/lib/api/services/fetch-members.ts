import { type AssignableProjectRole, isAssignableProjectRole } from "@/lib/auth/project-access";
import type { ProjectRole } from "@/lib/auth/types";
import { ApiError, type ApiResult } from "@/types/api";

import apiService from "../core";
import { projectPath } from "../request";
import type { ListParams } from "../types";

export interface ProjectMemberItem {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  status: "invited" | "active";
  invite_sent_at: string | null;
  invite_expires_at: string | null;
  invite_expired: boolean;
  invite_email_sent?: boolean | null;
  role: ProjectRole;
  created_at: string;
}

export interface CreateMemberRequest {
  email: string;
  role: AssignableProjectRole;
}
export interface MemberListParams extends ListParams {
  q?: string;
  role?: ProjectRole;
  status?: "invited" | "active";
}

export interface UpdateMemberRequest {
  role: AssignableProjectRole;
}

export type MemberListResponse = ApiResult<ProjectMemberItem[]>;
export type MemberDetailResponse = ApiResult<ProjectMemberItem>;
export type EmptyResponse = ApiResult<null>;
export interface InviteCandidate {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
}
export interface InviteCandidateParams extends ListParams {
  q?: string;
}
export type InviteCandidatesResponse = ApiResult<InviteCandidate[]>;

const membersPath = (projectId: string) => `${projectPath(projectId)}/members`;

function requireAssignableRole(role: string) {
  if (!isAssignableProjectRole(role)) {
    throw new ApiError(400, "INVALID_PROJECT_MEMBER_ROLE", "Members can only be assigned Researcher or Reviewer.");
  }
}

export const fetchMembers = {
  getInviteCandidates: async (
    projectId: string,
    params?: InviteCandidateParams,
    signal?: AbortSignal,
  ): Promise<InviteCandidatesResponse> => {
    const response = await apiService.get<InviteCandidatesResponse>(
      `${projectPath(projectId)}/invite-candidates`,
      params,
      { signal },
    );
    return response.data;
  },
  resendInvite: async (projectId: string, membershipId: string): Promise<MemberDetailResponse> => {
    const response = await apiService.post<MemberDetailResponse>(
      `${membersPath(projectId)}/${encodeURIComponent(membershipId)}/invite`,
    );
    return response.data;
  },
  getList: async (projectId: string, params?: MemberListParams, signal?: AbortSignal): Promise<MemberListResponse> => {
    const response = await apiService.get<MemberListResponse>(membersPath(projectId), params, { signal });
    return response.data;
  },
  create: async (projectId: string, data: CreateMemberRequest): Promise<MemberDetailResponse> => {
    requireAssignableRole(data.role);
    const response = await apiService.post<MemberDetailResponse>(membersPath(projectId), data);
    return response.data;
  },
  update: async (projectId: string, membershipId: string, data: UpdateMemberRequest): Promise<MemberDetailResponse> => {
    requireAssignableRole(data.role);
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
