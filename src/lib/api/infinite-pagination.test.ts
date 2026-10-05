import { describe, expect, it, vi } from "vitest";

import { collectPages, flattenInfinitePages, normalizePageSize, toInfinitePage } from "./infinite-pagination";
import { success } from "./test-utils";

describe("offset-based infinite pagination", () => {
  it.each([
    [20, 20],
    [0, 1],
    [-10, 1],
    [101, 100],
    [2.9, 2],
    [NaN, 20],
    [Infinity, 20],
  ])("normalizes page size %s to the backend limit %s", (input, expected) => {
    expect(normalizePageSize(input)).toBe(expected);
  });

  it("uses the server offset/limit, keeps the envelope and flattens ordered pages", () => {
    const first = {
      ...success([{ id: "1" }, { id: "2" }]),
      meta: { request_id: "first", pagination: { total: 3, limit: 2, offset: 0 } },
    };
    const second = {
      ...success([{ id: "3" }]),
      meta: { request_id: "second", pagination: { total: 3, limit: 2, offset: 2 } },
    };
    const pages = [toInfinitePage(first, 0, 20), toInfinitePage(second, 2, 20)];
    expect(pages[0]).toMatchObject({ offset: 0, limit: 2, nextOffset: 2, totalItems: 3 });
    expect(pages[0].response).toBe(first);
    expect(pages[1].nextOffset).toBeUndefined();
    expect(flattenInfinitePages(pages)).toEqual([{ id: "1" }, { id: "2" }, { id: "3" }]);
  });

  it.each([
    { name: "empty page", rows: [], pagination: { total: 100, limit: 20, offset: 0 }, requestedOffset: 0 },
    { name: "last page", rows: [{ id: "1" }], pagination: { total: 1, limit: 20, offset: 0 }, requestedOffset: 0 },
    { name: "zero limit", rows: [{ id: "1" }], pagination: { total: 100, limit: 0, offset: 0 }, requestedOffset: 0 },
    {
      name: "non-advancing server offset",
      rows: [{ id: "1" }],
      pagination: { total: 100, limit: 20, offset: 0 },
      requestedOffset: 20,
    },
    { name: "no pagination", rows: [{ id: "1" }], pagination: null, requestedOffset: 0 },
  ])("stops for $name instead of looping", ({ rows, pagination, requestedOffset }) => {
    const page = toInfinitePage({ ...success(rows), meta: { request_id: "test", pagination } }, requestedOffset, 20);
    expect(page.nextOffset).toBeUndefined();
  });

  it("does not invent a total when pagination is absent", () => {
    expect(toInfinitePage(success([{ id: "1" }]), 0, 20).totalItems).toBeNull();
    expect(flattenInfinitePages()).toEqual([]);
  });
});

describe("complete project-wide pagination", () => {
  it("collects short pages in order until the backend total is reached", async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({
        ...success(["run-1"]),
        meta: { request_id: "first", pagination: { total: 3, limit: 100, offset: 0 } },
      })
      .mockResolvedValueOnce({
        ...success(["run-2", "run-3"]),
        meta: { request_id: "second", pagination: { total: 3, limit: 100, offset: 1 } },
      });

    expect(await collectPages(fetchPage)).toEqual(["run-1", "run-2", "run-3"]);
    expect(fetchPage).toHaveBeenNthCalledWith(1, { limit: 100, offset: 0 });
    expect(fetchPage).toHaveBeenNthCalledWith(2, { limit: 100, offset: 1 });
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it.each([
    { name: "missing pagination", response: success(["run-1"]), expected: ["run-1"] },
    {
      name: "empty page with a stale total",
      response: { ...success([]), meta: { request_id: "empty", pagination: { total: 100, limit: 100, offset: 0 } } },
      expected: [],
    },
  ])("stops fetching for $name", async ({ response, expected }) => {
    const fetchPage = vi.fn().mockResolvedValue(response);
    expect(await collectPages(fetchPage)).toEqual(expected);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it("propagates a later-page failure instead of returning an incomplete aggregate", async () => {
    const error = new Error("The next page could not be loaded.");
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({
        ...success(["run-1"]),
        meta: { request_id: "first", pagination: { total: 2, limit: 100, offset: 0 } },
      })
      .mockRejectedValueOnce(error);

    await expect(collectPages(fetchPage)).rejects.toBe(error);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });
});
