import { ApiError } from "@/types/api";

import { collectPages } from "../infinite-pagination";
import { type DatasetItem, fetchDatasets } from "./fetch-datasets";
import { fetchResearchContext, type ResearchContextItem } from "./fetch-research-context";
import { fetchRuns, type RunItem } from "./fetch-runs";

export interface ManagerResearchData {
  runs: RunItem[];
  context: ResearchContextItem | null;
  dataset: DatasetItem | null;
}

export const fetchManager = {
  getResearch: async (projectId: string, signal?: AbortSignal): Promise<ManagerResearchData> => {
    const runs = await collectPages((params) => fetchRuns.getList(projectId, params, signal));
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
