import type { ApiResult } from "@/types/api";
import type { ProjectRole } from "@/types/enums";

import apiService from "../core";
import { projectPath } from "../request";

export interface ProjectAccessContext {
  settings_version: number;
  permissions: {
    can_invite: boolean;
    can_view_invite_candidates: boolean;
    can_manage_members: boolean;
    can_manage_settings: boolean;
    can_read_raw_datasets: boolean;
  };
  invitation: {
    default_role: "researcher" | "reviewer";
    allowed_roles: ProjectRole[];
    allowed_domains: string[];
    configured_expiry_days: string;
    effective_ttl_hours: number;
  } | null;
}

export async function fetchProjectAccess(projectId: string, signal?: AbortSignal) {
  const response = await apiService.get<ApiResult<ProjectAccessContext>>(
    `${projectPath(projectId)}/access-context`,
    undefined,
    { signal },
  );
  return response.data;
}
