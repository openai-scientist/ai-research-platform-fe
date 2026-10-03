"use client";

import { type UIEvent, useCallback, useMemo, useRef } from "react";

import {
  type InfiniteData,
  type QueryKey,
  type UseInfiniteQueryOptions,
  useInfiniteQuery,
} from "@tanstack/react-query";

import {
  flattenInfinitePages,
  type InfinitePageResult,
  normalizePageSize,
  toInfinitePage,
} from "@/lib/api/infinite-pagination";
import type { ApiResult, RequestParams } from "@/types/api";

import { shouldRetryApiQuery, useApiErrorToast } from "./use-api";

export { flattenInfinitePages, type InfinitePageResult } from "@/lib/api/infinite-pagination";

export type InfiniteFilters<T extends RequestParams> = T & { limit?: never; offset?: never };

export type InfiniteQueryOptions<TItem> = Omit<
  UseInfiniteQueryOptions<
    InfinitePageResult<TItem>,
    Error,
    InfiniteData<InfinitePageResult<TItem>, number>,
    QueryKey,
    number
  >,
  "queryKey" | "queryFn" | "initialPageParam" | "getNextPageParam" | "getPreviousPageParam" | "select" | "enabled"
> & {
  enabled?: boolean;
  pageSize?: number;
  scrollOffset?: number;
  silentErrorCodes?: readonly string[];
};

export interface UseInfinityScrollOptions<TItem, TFilters extends RequestParams = RequestParams>
  extends InfiniteQueryOptions<TItem> {
  queryKey: QueryKey;
  filters?: InfiniteFilters<TFilters>;
  fetchPage: (params: TFilters & { limit: number; offset: number }, signal: AbortSignal) => Promise<ApiResult<TItem[]>>;
}

export function useInfinityScroll<TItem, TFilters extends RequestParams = RequestParams>({
  queryKey,
  fetchPage,
  filters,
  pageSize = 20,
  scrollOffset = 16,
  enabled = true,
  silentErrorCodes,
  ...options
}: UseInfinityScrollOptions<TItem, TFilters>) {
  const limit = normalizePageSize(pageSize);
  // Pagination belongs to this hook. A caller's old limit/offset must not affect the cache or requests.
  const filterParams: RequestParams = filters ?? {};
  const { limit: _limit, offset: _offset, ...queryFilters } = filterParams;
  const key = [...queryKey, "infinite", queryFilters, limit];
  const query = useInfiniteQuery({
    retry: shouldRetryApiQuery,
    ...options,
    queryKey: key,
    initialPageParam: 0,
    queryFn: async ({ pageParam, signal }): Promise<InfinitePageResult<TItem>> => {
      const params = { ...queryFilters, limit, offset: pageParam } as TFilters & { limit: number; offset: number };
      return toInfinitePage(await fetchPage(params, signal), pageParam, limit);
    },
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    enabled: typeof window !== "undefined" && enabled,
  });
  useApiErrorToast(key, query.error, silentErrorCodes);

  const { fetchNextPage, hasNextPage, isFetching, isFetchNextPageError } = query;
  const pendingLoad = useRef(false);
  const loadMore = useCallback(async () => {
    if (!enabled || !hasNextPage || isFetching || pendingLoad.current) return;
    pendingLoad.current = true;
    try {
      // Repeated scroll events must neither cancel nor duplicate an active request.
      await fetchNextPage({ cancelRefetch: false });
    } finally {
      pendingLoad.current = false;
    }
  }, [enabled, hasNextPage, isFetching, fetchNextPage]);

  const onScrollToLoadMore = useCallback(
    (event: UIEvent<HTMLElement>) => {
      const element = event.currentTarget;
      const threshold = Number.isFinite(scrollOffset) ? Math.max(0, scrollOffset) : 16;
      const reachedBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - threshold;
      // An explicit loadMore() can retry a failed next page; scrolling must not keep retrying it automatically.
      if (reachedBottom && !isFetchNextPageError) void loadMore();
    },
    [loadMore, scrollOffset, isFetchNextPageError],
  );

  const items = useMemo(() => flattenInfinitePages(query.data?.pages), [query.data?.pages]);
  const totalItems = query.data?.pages.at(-1)?.totalItems ?? null;
  return { ...query, items, totalItems, loadMore, onScrollToLoadMore };
}
