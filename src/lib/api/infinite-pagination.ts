import type { ApiResult } from "@/types/api";

import type { ListParams } from "./types";

// Project-wide aggregates must finish pagination before filtering or selecting runs.
export async function collectPages<T>(fetchPage: (params: ListParams) => Promise<ApiResult<T[]>>) {
  const items: T[] = [];
  let offset = 0;
  for (;;) {
    const page = await fetchPage({ limit: 100, offset });
    items.push(...page.data);
    offset += page.data.length;
    if (!page.data.length || offset >= (page.meta.pagination?.total ?? offset)) return items;
  }
}

export interface InfinitePageResult<TItem> {
  items: TItem[];
  offset: number;
  limit: number;
  totalItems: number | null;
  nextOffset: number | undefined;
  response: ApiResult<TItem[]>;
}

export function normalizePageSize(pageSize = 20): number {
  return Number.isFinite(pageSize) ? Math.min(100, Math.max(1, Math.trunc(pageSize))) : 20;
}

export function toInfinitePage<TItem>(
  response: ApiResult<TItem[]>,
  requestedOffset: number,
  requestedLimit: number,
): InfinitePageResult<TItem> {
  const pagination = response.meta.pagination;
  const offset = pagination?.offset ?? requestedOffset;
  const limit = pagination?.limit ?? requestedLimit;
  const next = offset + limit;
  // Missing pagination, empty pages or a non-advancing offset must not cause an endless request loop.
  const hasNextPage =
    pagination !== null && response.data.length > 0 && limit > 0 && next > requestedOffset && next < pagination.total;
  return {
    items: response.data,
    offset,
    limit,
    totalItems: pagination?.total ?? null,
    nextOffset: hasNextPage ? next : undefined,
    response,
  };
}

export function flattenInfinitePages<TItem>(pages?: readonly InfinitePageResult<TItem>[]): TItem[] {
  return pages?.flatMap((page) => page.items) ?? [];
}
