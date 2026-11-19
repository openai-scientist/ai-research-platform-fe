"use client";

import { useApiQuery } from "@/hooks/use-api";
import { useRunsQuery } from "@/hooks/use-runs-query";
import { projectKeys } from "@/lib/api/query-keys";
import { datasetRunKeys, fetchDatasetRuns, runsOfVersion } from "@/lib/api/services/fetch-dataset-runs";
import { fetchRuns, type RunItem } from "@/lib/api/services/fetch-runs";
import { isActiveRun } from "@/lib/research-workspace";

/** The runs of one dataset version; polled while one of them is open. */
export function useVersionRuns(projectId: string, versionId: string | undefined) {
  const query = useRunsQuery(
    projectId,
    { limit: 100 },
    {
      refetchInterval: (state) =>
        !state.state.error &&
        runsOfVersion(state.state.data?.data ?? [], versionId).some((run) => isActiveRun(run.status))
          ? 8000
          : false,
    },
  );
  return { query, allRuns: query.data?.data ?? [], runs: runsOfVersion(query.data?.data ?? [], versionId) };
}

/** The data card and brief a run published. Aggregates only. */
export function useDatasetOutputs(projectId: string, run: RunItem | undefined) {
  return useApiQuery(
    run ? datasetRunKeys.outputs(projectId, run.id) : ["dataset-outputs", "none"],
    (signal) => fetchDatasetRuns.outputs(projectId, run?.id ?? "", signal),
    { enabled: Boolean(run) },
  );
}

export function useDatasetReviewFindings(projectId: string, runId?: string, artifactId?: string) {
  return useApiQuery(
    [...projectKeys.run(projectId, runId ?? ""), "dataset-review", artifactId],
    (signal) => fetchDatasetRuns.reviewFindings(projectId, runId ?? "", artifactId ?? "", signal),
    { enabled: Boolean(runId && artifactId) },
  );
}

export function useDatasetCard(projectId: string, runId?: string, artifactId?: string) {
  return useApiQuery(
    [...projectKeys.run(projectId, runId ?? ""), "dataset-card", artifactId],
    (signal) => fetchDatasetRuns.card(projectId, runId ?? "", artifactId, signal),
    { enabled: Boolean(runId) },
  );
}

export function useDatasetBriefAvailability(projectId: string, runId?: string) {
  return useApiQuery(
    [...projectKeys.run(projectId, runId ?? ""), "dataset-brief-available"],
    (signal) => fetchDatasetRuns.hasBrief(projectId, runId ?? "", signal),
    { enabled: Boolean(runId) },
  );
}

/** The run's consultations (what the PI asked the person), read while the run is open. */
export function useRunConsultations(projectId: string, run: RunItem | undefined) {
  const query = useApiQuery(
    [...projectKeys.run(projectId, run?.id ?? ""), "pi", "consultations"],
    (signal) => fetchRuns.getConsultations(projectId, run?.id ?? "", signal),
    { enabled: Boolean(run), ...(run && isActiveRun(run.status) ? { refetchInterval: 8000 } : {}) },
  );
  return [query.data?.data ?? []].flat();
}
