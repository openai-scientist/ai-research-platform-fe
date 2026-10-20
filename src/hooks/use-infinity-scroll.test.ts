import { createElement, type UIEvent } from "react";

import { InfiniteQueryObserver, QueryClient, type QueryKey } from "@tanstack/react-query";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { InfinitePageResult } from "@/lib/api/infinite-pagination";
import { success } from "@/lib/api/test-utils";
import { ApiError } from "@/types/api";

import { type InfiniteFilters, type UseInfinityScrollOptions, useInfinityScroll } from "./use-infinity-scroll";

const { querySpy } = vi.hoisted(() => ({ querySpy: vi.fn() }));
vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return { ...actual, useInfiniteQuery: querySpy };
});

interface Item {
  id: string;
}
interface Filters {
  [key: string]: string | number | undefined;
  email?: string;
}
interface CapturedOptions {
  queryKey: QueryKey;
  initialPageParam: number;
  enabled: boolean;
  queryFn: (context: { pageParam: number; signal: AbortSignal }) => Promise<InfinitePageResult<Item>>;
  getNextPageParam: (lastPage: InfinitePageResult<Item>) => number | undefined;
  retry: (count: number, error: Error) => boolean;
}

function renderHook(options: UseInfinityScrollOptions<Item, Filters>) {
  let result!: ReturnType<typeof useInfinityScroll<Item, Filters>>;
  function Harness() {
    result = useInfinityScroll(options);
    return null;
  }
  renderToString(createElement(Harness));
  return { result, config: querySpy.mock.calls.at(-1)?.[0] as CapturedOptions };
}

function scrollEvent(scrollTop = 90): UIEvent<HTMLElement> {
  return { currentTarget: { scrollTop, clientHeight: 100, scrollHeight: 200 } } as UIEvent<HTMLElement>;
}

describe("useInfinityScroll", () => {
  const fetchNextPage = vi.fn();
  const fetchPage = vi.fn<UseInfinityScrollOptions<Item, Filters>["fetchPage"]>();

  beforeEach(() => {
    querySpy.mockReset();
    fetchNextPage.mockReset();
    fetchNextPage.mockResolvedValue({});
    fetchPage.mockReset();
    fetchPage.mockResolvedValue(success([]));
    querySpy.mockReturnValue({
      data: undefined,
      error: null,
      hasNextPage: true,
      isFetching: false,
      isFetchNextPageError: false,
      fetchNextPage,
    });
  });

  it("starts at zero, forwards AbortSignal and owns pagination params", async () => {
    vi.stubGlobal("window", {});
    const { config } = renderHook({
      queryKey: ["admin", "users"],
      fetchPage,
      // Simulate an untyped caller passing stale pagination; TypeScript consumers cannot pass these fields.
      filters: { email: "a@example.com", limit: 3, offset: 500 } as unknown as InfiniteFilters<Filters>,
      pageSize: 10,
    });
    const signal = new AbortController().signal;
    await config.queryFn({ pageParam: 0, signal });
    expect(config.initialPageParam).toBe(0);
    expect(config.enabled).toBe(true);
    expect(config.queryKey).toEqual(["admin", "users", "infinite", { email: "a@example.com" }, 10]);
    expect(fetchPage).toHaveBeenCalledWith({ email: "a@example.com", limit: 10, offset: 0 }, signal);
  });

  it("isolates ordinary queries, filters and page sizes in the cache", () => {
    const base = { queryKey: ["projects", "list"], fetchPage };
    const first = renderHook({ ...base, filters: { email: "a" }, pageSize: 10 }).config;
    const second = renderHook({ ...base, filters: { email: "b" }, pageSize: 10 }).config;
    const third = renderHook({ ...base, filters: { email: "a" }, pageSize: 20 }).config;
    expect(first.queryKey).not.toEqual(base.queryKey);
    expect(first.queryKey).not.toEqual(second.queryKey);
    expect(first.queryKey).not.toEqual(third.queryKey);
    expect(first.queryKey.slice(0, 2)).toEqual(base.queryKey);
  });

  it("does not enable queries on the server or when disabled", () => {
    expect(renderHook({ queryKey: ["users"], fetchPage }).config.enabled).toBe(false);
    vi.stubGlobal("window", {});
    expect(renderHook({ queryKey: ["users"], fetchPage, enabled: false }).config.enabled).toBe(false);
  });

  it("fetches and appends real QueryClient pages until the backend total is reached", async () => {
    fetchPage.mockImplementation(async ({ offset, limit }) => ({
      ...success(offset === 0 ? [{ id: "1" }, { id: "2" }] : [{ id: "3" }]),
      meta: { request_id: `page-${offset}`, pagination: { total: 3, limit, offset } },
    }));
    const { config } = renderHook({ queryKey: ["users"], fetchPage, pageSize: 2 });
    const client = new QueryClient();
    const observer = new InfiniteQueryObserver(client, { ...config, retry: false });
    await observer.refetch();
    const result = await observer.fetchNextPage();
    expect(result.data?.pages.flatMap((page) => page.items)).toEqual([{ id: "1" }, { id: "2" }, { id: "3" }]);
    expect(result.hasNextPage).toBe(false);
    await observer.fetchNextPage();
    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(fetchPage.mock.calls.map(([params]) => params.offset)).toEqual([0, 2]);
    observer.destroy();
    client.clear();
  });

  it("resets pagination when filters change and remains invalidatable by the base key", async () => {
    fetchPage.mockImplementation(async ({ email, offset, limit }) => ({
      ...success([{ id: `${email}-${offset}` }]),
      meta: { request_id: "page", pagination: { total: 2, offset, limit } },
    }));
    const base = { queryKey: ["admin", "users"], fetchPage, pageSize: 1 };
    const client = new QueryClient();
    const observer = new InfiniteQueryObserver(client, {
      ...renderHook({ ...base, filters: { email: "a" } }).config,
      retry: false,
    });
    await observer.refetch();
    await observer.fetchNextPage();
    observer.setOptions({ ...renderHook({ ...base, filters: { email: "b" } }).config, retry: false });
    const result = await observer.refetch();
    expect(result.data?.pages.flatMap((page) => page.items)).toEqual([{ id: "b-0" }]);
    expect(fetchPage.mock.calls.at(-1)?.[0].offset).toBe(0);
    await client.invalidateQueries({ queryKey: ["admin", "users"], refetchType: "none" });
    expect(client.getQueryState(renderHook({ ...base, filters: { email: "b" } }).config.queryKey)?.isInvalidated).toBe(
      true,
    );
    observer.destroy();
    client.clear();
  });

  it("ignores early scroll and coalesces repeated near-bottom events", async () => {
    const pending = Promise.withResolvers<void>();
    fetchNextPage.mockReturnValue(pending.promise);
    const { result } = renderHook({ queryKey: ["users"], fetchPage });
    result.onScrollToLoadMore(scrollEvent(0));
    expect(fetchNextPage).not.toHaveBeenCalled();
    result.onScrollToLoadMore(scrollEvent());
    result.onScrollToLoadMore(scrollEvent());
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
    expect(fetchNextPage).toHaveBeenCalledWith({ cancelRefetch: false });
    pending.resolve();
    await pending.promise;
  });

  it.each([{ hasNextPage: false }, { isFetching: true }, { isFetchNextPageError: true }])(
    "does not autoload when blocked by %j",
    async (state) => {
      querySpy.mockReturnValue({
        data: undefined,
        error: null,
        hasNextPage: true,
        isFetching: false,
        isFetchNextPageError: false,
        fetchNextPage,
        ...state,
      });
      const { result } = renderHook({ queryKey: ["users"], fetchPage });
      result.onScrollToLoadMore(scrollEvent());
      expect(fetchNextPage).not.toHaveBeenCalled();
    },
  );

  it("allows explicit retry of a next-page failure", async () => {
    querySpy.mockReturnValue({
      data: undefined,
      error: null,
      hasNextPage: true,
      isFetching: false,
      isFetchNextPageError: true,
      fetchNextPage,
    });
    await renderHook({ queryKey: ["users"], fetchPage }).result.loadMore();
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it("does not retry rate limits or other HTTP 4xx", () => {
    const { config } = renderHook({ queryKey: ["users"], fetchPage });
    expect(config.retry(0, new ApiError(429, "RATE_LIMITED", "Wait"))).toBe(false);
    expect(config.retry(0, new ApiError(401, "UNAUTHENTICATED", "Login"))).toBe(false);
    expect(config.retry(0, new ApiError(0, "NETWORK_ERROR", "Offline"))).toBe(true);
    expect(config.retry(1, new Error("Offline"))).toBe(false);
  });
});
