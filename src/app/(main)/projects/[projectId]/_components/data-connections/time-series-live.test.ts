import { afterEach, describe, expect, it, vi } from "vitest";

import type { ConnectionLiveData } from "@/lib/api/services/fetch-data-connections";
import { ApiError } from "@/types/api";

import { buildLiveChart, startLivePolling } from "./time-series-live";

const data: ConnectionLiveData = {
  columns: [
    { name: "time", type: "timestamp", role: "time" },
    { name: "host", type: "string", role: "tag" },
    { name: "value", type: "float", role: "field" },
  ],
  rows: [
    ["2026-10-08T00:01:00Z", "a", "1.123456789012345"],
    ["2026-10-08T00:03:00Z", "a", null],
    ["2026-10-08T00:01:00Z", "b", "2"],
  ],
  start: "2026-10-08T00:00:00Z",
  end: "2026-10-08T00:04:00Z",
  bucket: "1m",
  truncated: false,
};

afterEach(() => vi.useRealTimers());

describe("live chart windows", () => {
  it("uses full response bounds, separates tags and preserves missing buckets and null values", () => {
    const chart = buildLiveChart(data);
    expect(chart.points.map((point) => point.time)).toEqual(
      [0, 1, 2, 3].map((minute) => Date.parse(data.start) + minute * 60_000),
    );
    expect(chart.series.map((series) => series.label)).toEqual(["value · host=a", "value · host=b"]);
    expect(chart.points[0].s0).toBeNull();
    expect(chart.points[1].s0).toBe(1.123456789012345);
    expect(chart.rawValues.get(Date.parse("2026-10-08T00:01:00Z"))?.s0).toBe("1.123456789012345");
    expect(chart.points[2].s0).toBeNull();
    expect(chart.points[3].s0).toBeNull();
  });
});

describe("live polling lifecycle", () => {
  it("waits for a cancelled pending request to settle before resuming", async () => {
    vi.useFakeTimers();
    let resolve!: (data: ConnectionLiveData) => void;
    const request = vi.fn(
      () =>
        new Promise<ConnectionLiveData>((done) => {
          resolve = done;
        }),
    );
    const poller = startLivePolling({ request, interval: 15_000, onData: vi.fn(), onError: vi.fn(), onStop: vi.fn() });
    poller.setVisible(false);
    poller.setVisible(true);
    expect(request).toHaveBeenCalledOnce();
    resolve(data);
    await vi.advanceTimersByTimeAsync(0);
    expect(request).toHaveBeenCalledTimes(2);
    poller.dispose();
  });
  it("waits for the previous response and then a full interval", async () => {
    vi.useFakeTimers();
    let resolve!: (data: ConnectionLiveData) => void;
    const request = vi.fn(
      () =>
        new Promise<ConnectionLiveData>((done) => {
          resolve = done;
        }),
    );
    const onData = vi.fn();
    const poller = startLivePolling({ request, interval: 15_000, onData, onError: vi.fn(), onStop: vi.fn() });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(request).toHaveBeenCalledOnce();
    resolve(data);
    await vi.advanceTimersByTimeAsync(14_999);
    expect(request).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1);
    expect(request).toHaveBeenCalledTimes(2);
    poller.dispose();
  });

  it("aborts when hidden, discards its response and requests immediately when visible", async () => {
    vi.useFakeTimers();
    const request = vi.fn(async (_signal: AbortSignal) => data);
    const onData = vi.fn();
    const poller = startLivePolling({ request, interval: 60_000, onData, onError: vi.fn(), onStop: vi.fn() });
    poller.setVisible(false);
    await vi.advanceTimersByTimeAsync(120_000);
    expect(onData).not.toHaveBeenCalled();
    expect(request.mock.calls[0][0].aborted).toBe(true);
    poller.setVisible(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(request).toHaveBeenCalledTimes(2);
    expect(onData).toHaveBeenCalledOnce();
    poller.dispose();
  });

  it("skips CONNECTION_BUSY, honors Retry-After and stops on connection failures", async () => {
    vi.useFakeTimers();
    const request = vi
      .fn()
      .mockRejectedValueOnce(new ApiError(429, "CONNECTION_BUSY", "Busy"))
      .mockRejectedValueOnce(new ApiError(429, "RATE_LIMITED", "Wait", [], null, 30))
      .mockRejectedValueOnce(new ApiError(422, "CONNECTION_FAILED", "Failed"));
    const onError = vi.fn();
    const onStop = vi.fn();
    const poller = startLivePolling({ request, interval: 15_000, onData: vi.fn(), onError, onStop });
    await vi.advanceTimersByTimeAsync(15_000);
    expect(request).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(29_999);
    expect(request).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(onStop).toHaveBeenCalledWith(true);
    await vi.advanceTimersByTimeAsync(120_000);
    expect(request).toHaveBeenCalledTimes(3);
    poller.dispose();
  });

  it.each([401, 403, 404, 409])("stops permanently after HTTP %s", async (status) => {
    vi.useFakeTimers();
    const onStop = vi.fn();
    const poller = startLivePolling({
      request: vi.fn().mockRejectedValue(new ApiError(status, "NOT_FOUND", "Stopped")),
      interval: 15_000,
      onData: vi.fn(),
      onError: vi.fn(),
      onStop,
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(onStop).toHaveBeenCalledWith(false);
    poller.setVisible(false);
    poller.setVisible(true);
    expect(onStop).toHaveBeenCalledOnce();
    poller.dispose();
  });
});
