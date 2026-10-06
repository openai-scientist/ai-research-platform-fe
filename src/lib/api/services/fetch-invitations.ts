import type { ProjectRole } from "@/lib/auth/types";
import type { ApiResult } from "@/types/api";

import apiService from "../core";
import type { ListParams } from "../types";

export interface InvitationItem {
  id: string;
  project_id: string;
  project_name: string;
  role: ProjectRole;
  invited_by_user_id: string;
  invited_by_display_name: string | null;
  invited_by_avatar_url: string | null;
  invite_sent_at: string | null;
  invite_expires_at: string | null;
  invite_expired: boolean;
}
export interface InvitationListParams extends ListParams {
  q?: string;
}
export const fetchInvitations = {
  getList: async (params?: InvitationListParams, signal?: AbortSignal): Promise<ApiResult<InvitationItem[]>> => {
    const response = await apiService.get<ApiResult<InvitationItem[]>>("/invitations", params, { signal });
    return response.data;
  },
  answer: async (id: string, action: "accept" | "decline"): Promise<ApiResult<InvitationItem>> => {
    const response = await apiService.post<ApiResult<InvitationItem>>(
      `/invitations/${encodeURIComponent(id)}/${action}`,
    );
    return response.data;
  },
};
