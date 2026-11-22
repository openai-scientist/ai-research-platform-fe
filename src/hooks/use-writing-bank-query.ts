"use client";

import { useQueryClient } from "@tanstack/react-query";

import { writingBankKeys } from "@/lib/api/query-keys";
import {
  fetchWritingBank,
  WRITING_BANK_ERRORS,
  type WritingBankDefault,
  type WritingBankStatus,
} from "@/lib/api/services/fetch-writing-bank";

import { type ApiQueryOptions, useApiMutation, useApiQuery } from "./use-api";

/** The screens explain these states themselves (status line, empty states), so they raise no toast. */
const EXPLAINED = [WRITING_BANK_ERRORS.notConfigured, WRITING_BANK_ERRORS.unavailable, WRITING_BANK_ERRORS.notFound];

/** A context's blueprint is about 1 MB: keep it for a while instead of refetching on every visit. */
const CONTENT_STALE_MS = 5 * 60 * 1000;

export function useWritingBankStatusQuery(options?: ApiQueryOptions<WritingBankStatus>) {
  return useApiQuery(
    writingBankKeys.status(),
    async (signal) => (await fetchWritingBank.getStatus(signal)).data,
    options,
  );
}

export function useWritingBankJournalsQuery(enabled: boolean) {
  return useApiQuery(writingBankKeys.journals(), async (signal) => (await fetchWritingBank.getJournals(signal)).data, {
    enabled,
    silentErrorCodes: EXPLAINED,
  });
}

export function useWritingBankJournalQuery(journalId: string | null | undefined, enabled: boolean) {
  return useApiQuery(
    writingBankKeys.journal(journalId ?? ""),
    async (signal) => (await fetchWritingBank.getJournal(journalId ?? "", signal)).data,
    { enabled: enabled && Boolean(journalId), silentErrorCodes: EXPLAINED },
  );
}

export function useWritingBankContextQuery(journalId: string, contextId: string, enabled: boolean) {
  return useApiQuery(
    writingBankKeys.context(journalId, contextId),
    async (signal) => (await fetchWritingBank.getContext(journalId, contextId, signal)).data,
    { enabled, silentErrorCodes: EXPLAINED, staleTime: CONTENT_STALE_MS },
  );
}

/** The kinds of convergence check a writing plan is held to; they change only with the bank. */
export function useWritingBankChecksQuery(enabled: boolean) {
  return useApiQuery(writingBankKeys.checks(), async (signal) => (await fetchWritingBank.getChecks(signal)).data, {
    enabled,
    silentErrorCodes: EXPLAINED,
    staleTime: CONTENT_STALE_MS,
  });
}

/** Every entry of one bank; a release never changes, so the list is kept for long. */
export function useWritingBankLibraryQuery(collection: string, enabled: boolean) {
  return useApiQuery(
    writingBankKeys.library(collection),
    async (signal) => (await fetchWritingBank.getLibrary(collection, signal)).data,
    { enabled, silentErrorCodes: EXPLAINED, staleTime: CONTENT_STALE_MS },
  );
}

/** One bank entry in full with its links; an entry of a release never changes, so it is kept for long. */
export function useWritingBankEntryQuery(collection: string | null, id: string | null) {
  return useApiQuery(
    writingBankKeys.entry(collection ?? "", id ?? ""),
    async (signal) => (await fetchWritingBank.getEntry(collection ?? "", id ?? "", signal)).data,
    { enabled: Boolean(collection && id), silentErrorCodes: EXPLAINED, staleTime: CONTENT_STALE_MS },
  );
}

export function useUpdateJournalSettingsMutation() {
  return useApiMutation(
    (data: { journalId: string; enabled: boolean }) => fetchWritingBank.updateJournal(data.journalId, data.enabled),
    [writingBankKeys.all],
  );
}

export function useUpdateContextSettingsMutation() {
  return useApiMutation(
    (data: { journalId: string; contextId: string; enabled: boolean }) =>
      fetchWritingBank.updateContext(data.journalId, data.contextId, data.enabled),
    [writingBankKeys.all],
  );
}

export function useSetWritingBankDefaultMutation() {
  return useApiMutation(
    (value: WritingBankDefault | null) => fetchWritingBank.setDefault(value),
    [writingBankKeys.all],
  );
}

/** Re-reads the bank release now. The new status is written straight into the cache; everything else refetches. */
export function useRefreshWritingBankMutation() {
  const queryClient = useQueryClient();
  return useApiMutation(async () => {
    const result = await fetchWritingBank.refresh();
    queryClient.setQueryData(writingBankKeys.status(), result.data);
    return result;
  }, [writingBankKeys.all]);
}
