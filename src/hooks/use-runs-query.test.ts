import { AxiosHeaders } from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";

import apiService from "@/lib/api/core";
import { fetchRuns, type LocalNodeReview } from "@/lib/api/services/fetch-runs";

import { hasPendingLocalNodeReview } from "./use-runs-query";

afterEach(() => vi.restoreAllMocks());

describe("Run Studio Local Node review", () => {
  it("reads each run's active stage independently, even for the same dataset version", async () => {
    const first: LocalNodeReview = {
      job_id: "first-job",
      dataset_version_id: "shared-node-dataset",
      stage_run_id: "first-stage",
      review_state: "pending",
    };
    const second: LocalNodeReview = {
      ...first,
      job_id: "second-job",
      stage_run_id: "second-stage",
      review_state: "resolved",
    };
    const response = (data: LocalNodeReview[]) => ({
      data: { data },
      status: 200,
      statusText: "OK",
      headers: new AxiosHeaders(),
      config: { headers: new AxiosHeaders() },
    });
    const get = vi
      .spyOn(apiService, "get")
      .mockResolvedValueOnce(response([first]))
      .mockResolvedValueOnce(response([second]))
      .mockResolvedValueOnce(response([{ ...first, review_state: "resolved" }]));

    const load = (run: string, stage: string) => fetchRuns.getLocalNodeReviews("project", run, stage);
    expect(hasPendingLocalNodeReview((await load("one", "first-stage")).data, "first-stage")).toBe(true);
    expect(hasPendingLocalNodeReview((await load("two", "second-stage")).data, "second-stage")).toBe(false);
    expect(hasPendingLocalNodeReview((await load("one", "first-stage")).data, "first-stage")).toBe(false);
    expect(hasPendingLocalNodeReview([first], "earlier-or-other-stage")).toBe(false);
    expect(get).toHaveBeenNthCalledWith(
      1,
      "/projects/project/runs/one/local-node-reviews",
      {
        stage_run_id: "first-stage",
      },
      { signal: undefined },
    );
    expect(get).toHaveBeenNthCalledWith(
      2,
      "/projects/project/runs/two/local-node-reviews",
      {
        stage_run_id: "second-stage",
      },
      { signal: undefined },
    );
  });
});
