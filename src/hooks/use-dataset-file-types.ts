"use client";

import { projectKeys } from "@/lib/api/query-keys";
import { fetchProjectSettings } from "@/lib/api/services/fetch-project-settings";
import { DATASET_FILE_TYPES } from "@/lib/dataset-file";

import { useApiQuery } from "./use-api";
import { useProjectAccess } from "./use-project-access";

export function useDatasetFileTypes(projectId: string) {
  const access = useProjectAccess(projectId);
  const manager = Boolean(access.context?.permissions.can_manage_settings);
  const settings = useApiQuery(
    [...projectKeys.detail(projectId), "settings"],
    (signal) => fetchProjectSettings.get(projectId, signal),
    { enabled: manager },
  );
  const configured = settings.data?.data.sections.data.types;
  // The current access-context contract does not expose data.types to Researchers.
  // Offer the two real parsers there; the upload API enforces the project allowlist.
  const types =
    manager && Array.isArray(configured)
      ? DATASET_FILE_TYPES.filter((type) => configured.includes(type))
      : DATASET_FILE_TYPES;
  return { types, ready: Boolean(access.context) && (!manager || (Boolean(settings.data) && !settings.isError)) };
}
