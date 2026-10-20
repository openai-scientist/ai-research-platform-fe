import { collectPages } from "../infinite-pagination";
import { type DatasetItem, fetchDatasets } from "./fetch-datasets";
import { fetchRuns, type RunItem } from "./fetch-runs";

export interface ManagerResearchData {
  runs: RunItem[];
  dataset: DatasetItem | null;
}

export const fetchManager = {
  getResearch: async (projectId: string, signal?: AbortSignal): Promise<ManagerResearchData> => {
    const runs = await collectPages((params) => fetchRuns.getList(projectId, params, signal));
    const latestRun = runs[0];
    const dataset = latestRun?.dataset_id
      ? (await fetchDatasets.getById(projectId, latestRun.dataset_id, signal)).data
      : null;
    return { runs, dataset };
  },
};
