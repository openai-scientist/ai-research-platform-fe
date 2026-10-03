import { describe, expect, it } from "vitest";

import { flattenInfinitePages, normalizePageSize, toInfinitePage } from "./infinite-pagination";
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
