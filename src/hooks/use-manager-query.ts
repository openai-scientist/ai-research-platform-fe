"use client";

import { projectKeys } from "@/lib/api/query-keys";
import { type AuditListParams, type AuditListResponse, fetchAdmin } from "@/lib/api/services/fetch-admin";
import { fetchManager, type ManagerResearchData } from "@/lib/api/services/fetch-manager";

import { type ApiQueryOptions, useApiQuery } from "./use-api";

export function useManagerResearchQuery(projectId: string, options?: ApiQueryOptions<ManagerResearchData>) {
  return useApiQuery(projectKeys.managerResearch(projectId), (signal) => fetchManager.getResearch(projectId, signal), {
    ...options,
    enabled: Boolean(projectId) && (options?.enabled ?? true),
  });
}

export function useManagerAuditQuery(
  projectId: string,
  params?: Omit<AuditListParams, "project_id">,
  options?: ApiQueryOptions<AuditListResponse>,
) {
  return useApiQuery(
    [...projectKeys.detail(projectId), "audit", params],
    (signal) => fetchAdmin.getAudit({ ...params, project_id: projectId }, signal),
    { ...options, enabled: Boolean(projectId) && (options?.enabled ?? true) },
  );
}
