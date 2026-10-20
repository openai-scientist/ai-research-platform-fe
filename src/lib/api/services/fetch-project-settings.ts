import type { ApiResult } from "@/types/api";

import apiService from "../core";
import { projectPath } from "../request";

export const SETTINGS_SECTIONS = [
  "general",
  "access",
  "runs",
  "models",
  "literature",
  "review",
  "data",
  "spending",
  "notifications",
] as const;
export type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number];
export type SettingValue = string | boolean | string[];
export type SettingValues = Record<string, SettingValue>;
export interface ProjectSettingsSnapshot {
  version: number;
  updated_at: string | null;
  updated_by_user_id: string | null;
  sections: Record<SettingsSectionId, SettingValues>;
  capabilities: Record<string, { supported: boolean; reason_code: string | null }>;
}
export const fetchProjectSettings = {
  get: async (projectId: string, signal?: AbortSignal) => {
    const response = await apiService.get<ApiResult<ProjectSettingsSnapshot>>(
      `${projectPath(projectId)}/settings`,
      undefined,
      { signal },
    );
    return response.data;
  },
  update: async (projectId: string, section: SettingsSectionId, version: number, values: SettingValues) => {
    const response = await apiService.patch<ApiResult<ProjectSettingsSnapshot>>(
      `${projectPath(projectId)}/settings/${section}`,
      { version, values },
    );
    return response.data;
  },
};
