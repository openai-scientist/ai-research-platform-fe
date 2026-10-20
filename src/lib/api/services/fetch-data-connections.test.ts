import { beforeEach, describe, expect, it, vi } from "vitest";

import apiService from "../core";
import { success } from "../test-utils";
import {
  type ConnectionLiveData,
  fetchDataConnections,
  sameConnectionSource,
  type TimeSeriesSource,
} from "./fetch-data-connections";

vi.mock("../core", () => ({ default: { post: vi.fn() } }));

beforeEach(() => vi.clearAllMocks());

describe("time series API contracts", () => {
  it("posts a cancellable flat live request through the project connection endpoint", async () => {
    const input = {
      name: "requests_total",
      fields: [],
      tags: ["job"],
      aggregate: "increase" as const,
      last: "1h" as const,
    };
    const signal = new AbortController().signal;
    const data: ConnectionLiveData = {
      columns: [],
      rows: [],
      truncated: false,
      start: "2026-10-08T00:00:00Z",
      end: "2026-10-08T01:00:00Z",
      bucket: "1m",
    };
    vi.mocked(apiService.post).mockResolvedValue({ data: success(data) } as Awaited<
      ReturnType<typeof apiService.post>
    >);
    expect(await fetchDataConnections.live("project /1", "connection/1", input, signal)).toEqual(success(data));
    expect(apiService.post).toHaveBeenCalledWith("/projects/project%20%2F1/connections/connection%2F1/live", input, {
      timeout: 75_000,
      signal,
    });
  });

  it("reconciles normalized timezones without matching a different interval or field order", () => {
    const source: TimeSeriesSource = {
      type: "timeseries",
      name: "latency",
      fields: ["value", "p95"],
      tags: ["host"],
      start: "2026-10-08T07:00:00.000Z",
      end: "2026-10-08T13:00:00.000Z",
      bucket: "5m",
      aggregate: "mean",
    };
    expect(
      sameConnectionSource(source, { ...source, start: "2026-10-08T14:00:00+07:00", end: "2026-10-08T13:00:00Z" }),
    ).toBe(true);
    expect(sameConnectionSource(source, { ...source, end: "2026-10-08T14:00:00Z" })).toBe(false);
    expect(sameConnectionSource(source, { ...source, fields: ["p95", "value"] })).toBe(false);
    expect(sameConnectionSource(source, { type: "table", schema: "default", name: "latency" })).toBe(false);
  });
});
