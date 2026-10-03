"use client";

import { useEffect } from "react";

import { type QueryKey, type UseQueryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ApiError } from "@/types/api";

export type ApiQueryOptions<T> = Omit<UseQueryOptions<T, Error>, "queryKey" | "queryFn" | "enabled"> & {
  enabled?: boolean;
  silentErrorCodes?: readonly string[];
};

export function showApiError(error: unknown) {
  toast.error(error instanceof Error ? error.message : "Something went wrong. Please try again.");
}

export function shouldRetryApiQuery(count: number, error: Error): boolean {
  return count < 1 && !(error instanceof ApiError && error.status >= 400 && error.status < 500);
}

export function useApiErrorToast(queryKey: QueryKey, error: Error | null, silentErrorCodes?: readonly string[]) {
  const silent = error instanceof ApiError && Boolean(silentErrorCodes?.includes(error.code));
  const toastId = `api-query:${JSON.stringify(queryKey)}`;
  useEffect(() => {
    if (error && !silent) toast.error(error.message, { id: toastId });
  }, [error, silent, toastId]);
}

export function useApiQuery<T>(
  queryKey: QueryKey,
  queryFn: (signal: AbortSignal) => Promise<T>,
  options: ApiQueryOptions<T> = {},
) {
  const { silentErrorCodes, ...queryOptions } = options;
  const query = useQuery<T, Error>({
    retry: shouldRetryApiQuery,
    ...queryOptions,
    queryKey,
    queryFn: ({ signal }) => queryFn(signal),
    enabled: typeof window !== "undefined" && (options.enabled ?? true),
  });
  useApiErrorToast(queryKey, query.error, silentErrorCodes);
  return query;
}

export function useApiMutation<T, V = void>(
  mutationFn: (variables: V) => Promise<T>,
  invalidate: readonly QueryKey[] = [],
) {
  const queryClient = useQueryClient();
  return useMutation<T, Error, V>({
    mutationFn,
    retry: false,
    onSuccess: async () => {
      await Promise.all(invalidate.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
    },
    onError: showApiError,
  });
}
