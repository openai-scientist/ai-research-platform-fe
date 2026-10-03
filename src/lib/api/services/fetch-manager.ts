import { ApiError, type ApiResult } from "@/types/api";

import type { ListParams } from "../types";
import { type DatasetItem, fetchDatasets } from "./fetch-datasets";
import { fetchResearchContext, type ResearchContextItem } from "./fetch-research-context";
import { fetchRuns, type RunItem } from "./fetch-runs";

export interface ManagerResearchData {
  runs: RunItem[];
  context: ResearchContextItem | null;
  dataset: DatasetItem | null;
}

async function getAllRuns(projectId: string, signal?: AbortSignal) {
  const runs: RunItem[] = [];
  let offset = 0;
  let total = 0;
  do {
    const params: ListParams = { limit: 100, offset };
    const result: ApiResult<RunItem[]> = await fetchRuns.getList(projectId, params, signal);
    runs.push(...result.data);
    offset += result.data.length;
    total = result.meta.pagination?.total ?? offset;
    if (!result.data.length) break;
  } while (offset < total);
  return runs;
}

export const fetchManager = {
  getResearch: async (projectId: string, signal?: AbortSignal): Promise<ManagerResearchData> => {
    const runs = await getAllRuns(projectId, signal);
    const latestRun = runs[0];
    const [context, dataset] = await Promise.all([
      (latestRun
        ? fetchResearchContext.getVersion(projectId, latestRun.research_context_version, signal)
        : fetchResearchContext.getLatest(projectId, signal)
      )
        .then((result) => result.data)
        .catch((error: unknown) => {
          if (error instanceof ApiError && error.code === "RESEARCH_CONTEXT_NOT_FOUND") return null;
          throw error;
        }),
      latestRun ? fetchDatasets.getById(projectId, latestRun.dataset_id, signal).then((result) => result.data) : null,
    ]);
    return { runs, context, dataset };
  },
};
