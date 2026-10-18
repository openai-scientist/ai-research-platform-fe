"use client";

import { createContext, type ReactNode, useContext } from "react";

import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiMutation, useApiQuery } from "@/hooks/use-api";
import { projectAccessKey } from "@/hooks/use-project-access";
import { projectKeys } from "@/lib/api/query-keys";
import { fetchProject, type ProjectItem, type UpdateProjectRequest } from "@/lib/api/services/fetch-project";
import {
  fetchProjectSettings,
  type ProjectSettingsSnapshot,
  SETTINGS_SECTIONS,
  type SettingsSectionId,
  type SettingValues,
} from "@/lib/api/services/fetch-project-settings";
import { ApiError, type ApiResult } from "@/types/api";

const FIELD_NAMES: Record<string, Record<string, string>> = {
  access: {
    defaultRole: "default_role",
    expiry: "expiry_days",
    link: "join_link",
    approval: "join_approval",
    reviewersSeeData: "reviewers_see_data",
  },
  runs: { stageLimit: "stage_limit", pauseOnFailure: "pause_on_failure" },
  literature: { perRound: "per_round" },
  review: { selfApproval: "self_approval" },
  data: { sameName: "same_name" },
  spending: { warnAt: "warn_at", atLimit: "at_limit", billingEmail: "billing_email" },
};

export function settingsFormValues(section: string, values: SettingValues): SettingValues {
  const names = FIELD_NAMES[section] ?? {};
  const reverse = Object.fromEntries(Object.entries(names).map(([form, wire]) => [wire, form]));
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [reverse[key] ?? key, value]));
}

type SettingsContext = {
  project: ProjectItem;
  snapshot: ProjectSettingsSnapshot;
  pending: boolean;
  save: (
    section: string,
    values: SettingValues,
    version: number,
  ) => Promise<{ values: SettingValues; version: number } | { conflictVersion: number } | null>;
  updateProject: (values: UpdateProjectRequest) => Promise<boolean>;
};
const Context = createContext<SettingsContext | null>(null);

export function SettingsApiProvider({ project: initial, children }: { project: ProjectItem; children: ReactNode }) {
  const client = useQueryClient();
  const key = [...projectKeys.detail(initial.id), "settings"];
  const query = useApiQuery(key, (signal) => fetchProjectSettings.get(initial.id, signal));
  const saveMutation = useApiMutation((input: { section: SettingsSectionId; version: number; values: SettingValues }) =>
    fetchProjectSettings.update(initial.id, input.section, input.version, input.values),
  );
  const projectMutation = useApiMutation(
    (values: UpdateProjectRequest) => fetchProject.update(initial.id, values),
    [projectKeys.lists()],
  );
  if (!query.data) {
    if (query.isError)
      return (
        <Button variant="outline" onClick={() => void query.refetch()}>
          Reload settings
        </Button>
      );
    return (
      <div role="status" aria-label="Loading project settings" className="flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  const snapshot = query.data.data;
  const save = async (section: string, values: SettingValues, version: number) => {
    if (!SETTINGS_SECTIONS.includes(section as SettingsSectionId)) return null;
    const id = section as SettingsSectionId;
    const names = FIELD_NAMES[id] ?? {};
    const wire = Object.fromEntries(
      Object.entries(values)
        .map(([field, value]) => [names[field] ?? field, value])
        .filter(([field]) => typeof field === "string" && Object.hasOwn(snapshot.sections[id], field)),
    );
    try {
      const result = await saveMutation.mutateAsync({ section: id, version, values: wire });
      client.setQueryData<ApiResult<ProjectSettingsSnapshot>>(key, result);
      if (id === "access" || id === "data") {
        const datasets = { queryKey: [...projectKeys.detail(initial.id), "datasets"] };
        await client.cancelQueries(datasets);
        client.removeQueries(datasets);
        await client.invalidateQueries({ queryKey: projectAccessKey(initial.id) });
      }
      return { values: settingsFormValues(id, result.data.sections[id]), version: result.data.version };
    } catch (error) {
      if (error instanceof ApiError && error.code === "SETTINGS_VERSION_CONFLICT") {
        const latest = await query.refetch();
        if (latest.data) return { conflictVersion: latest.data.data.version };
      }
      return null;
    }
  };
  const updateProject = async (values: UpdateProjectRequest) => {
    try {
      const result = await projectMutation.mutateAsync(values);
      client.setQueryData(projectKeys.detail(initial.id), result);
      return true;
    } catch {
      return false;
    }
  };
  return (
    <Context.Provider
      value={{
        project: initial,
        snapshot,
        pending: saveMutation.isPending || projectMutation.isPending,
        save,
        updateProject,
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function useProjectSettings() {
  const context = useContext(Context);
  if (!context) throw new Error("Project settings require SettingsApiProvider.");
  return context;
}
