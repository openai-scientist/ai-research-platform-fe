import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ApiResult } from "@/types/api";
import { ApiError } from "@/types/api";
import { RunStatus } from "@/types/enums";

import { fetchManager } from "./fetch-manager";
import type { RunItem } from "./fetch-runs";

const mocks = vi.hoisted(() => ({ runs: vi.fn(), latest: vi.fn(), version: vi.fn(), dataset: vi.fn() }));
vi.mock("./fetch-runs", () => ({ fetchRuns: { getList: mocks.runs } }));
vi.mock("./fetch-research-context", () => ({
  fetchResearchContext: { getLatest: mocks.latest, getVersion: mocks.version },
}));
vi.mock("./fetch-datasets", () => ({ fetchDatasets: { getById: mocks.dataset } }));

function page(data: RunItem[], total = data.length): ApiResult<RunItem[]> {
  return {
    success: true,
    message: "OK",
    data,
    meta: { request_id: "test", pagination: { total, limit: 100, offset: 0 } },
  };
}

const run: RunItem = {
  id: "run-1",
  project_id: "project-1",
  dataset_id: "dataset-1",
  dataset_version_id: "version-2",
  dataset_version_number: 2,
  research_context_id: "context-1",
  research_context_version: 3,
  created_by_user_id: "pm-1",
  status: RunStatus.Completed,
  auto_review: false,
  budget_usd: "5.00",
  cost_usd: "1.00",
  failure_message: null,
  created_at: "2026-10-03T10:00:00Z",
  started_at: "2026-10-03T10:00:00Z",
  finished_at: "2026-10-03T10:01:00Z",
  updated_at: "2026-10-03T10:01:00Z",
};

describe("manager research API boundaries", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.dataset.mockResolvedValue({ data: { id: "dataset-1" } });
  });

  it("collects all run pages and reads the exact context version of the latest run", async () => {
    mocks.runs.mockResolvedValueOnce(page([run], 2)).mockResolvedValueOnce(page([{ ...run, id: "run-2" }], 2));
    mocks.version.mockResolvedValue({ data: { version_number: 3 } });
    const signal = new AbortController().signal;
    const result = await fetchManager.getResearch("project-1", signal);
    expect(result.runs).toHaveLength(2);
    expect(mocks.runs).toHaveBeenNthCalledWith(2, "project-1", { limit: 100, offset: 1 }, signal);
    expect(mocks.version).toHaveBeenCalledWith("project-1", 3, signal);
    expect(mocks.latest).not.toHaveBeenCalled();
    expect(mocks.dataset).toHaveBeenCalledWith("project-1", "dataset-1", signal);
  });

  it("keeps an empty backend project empty when no context exists", async () => {
    mocks.runs.mockResolvedValue(page([]));
    mocks.latest.mockRejectedValue(new ApiError(404, "RESEARCH_CONTEXT_NOT_FOUND", "No context"));
    expect(await fetchManager.getResearch("project-1")).toEqual({ runs: [], context: null, dataset: null });
    expect(mocks.dataset).not.toHaveBeenCalled();
  });

  it.each([new ApiError(403, "ROLE_REQUIRED", "Access denied"), new Error("Network unavailable")])(
    "propagates context errors instead of returning mock data: %s",
    async (error) => {
      mocks.runs.mockResolvedValue(page([]));
      mocks.latest.mockRejectedValue(error);
      await expect(fetchManager.getResearch("project-1")).rejects.toBe(error);
    },
  );

  it("stops pagination on an empty page even if the advertised total is stale", async () => {
    mocks.runs.mockResolvedValue(page([], 100));
    mocks.latest.mockResolvedValue({ data: { version_number: 1 } });
    await fetchManager.getResearch("project-1");
    expect(mocks.runs).toHaveBeenCalledTimes(1);
  });
});
