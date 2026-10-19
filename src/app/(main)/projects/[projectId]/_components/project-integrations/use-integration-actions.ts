"use client";

import { useEffect, useRef, useState } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { showApiError } from "@/hooks/use-api";
import { projectAccessKey } from "@/hooks/use-project-access";
import { integrationKeys, projectKeys } from "@/lib/api/query-keys";
import {
  type CreateIntegrationRequest,
  fetchProjectIntegrations,
  type UpdateIntegrationRequest,
} from "@/lib/api/services/fetch-project-integrations";
import { ApiError } from "@/types/api";

export function useIntegrationActions(projectId: string) {
  const client = useQueryClient();
  const lock = useRef(false);
  const [pending, setPending] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const testLock = useRef(false);
  const retryAtRef = useRef(0);
  const [retryAt, setRetryAt] = useState(0);

  useEffect(() => {
    if (!retryAt) return;
    const timeout = window.setTimeout(
      () => {
        retryAtRef.current = 0;
        setRetryAt(0);
      },
      Math.max(0, retryAt - Date.now()),
    );
    return () => window.clearTimeout(timeout);
  }, [retryAt]);

  const onError = (error: unknown) => {
    showApiError(error);
    if (error instanceof ApiError && ["ROLE_REQUIRED", "PROJECT_ARCHIVED", "NOT_FOUND"].includes(error.code)) {
      void client.invalidateQueries({ queryKey: projectAccessKey(projectId) });
      void client.invalidateQueries({ queryKey: projectKeys.detail(projectId), exact: true });
    }
  };

  // Keep webhook secrets out of the React Query mutation cache and persistent drafts.
  const write = async <T>(action: () => Promise<T>, message: string, name: string) => {
    if (lock.current) return undefined;
    lock.current = true;
    setPending(true);
    try {
      const result = await action();
      void client.invalidateQueries({ queryKey: integrationKeys.project(projectId) });
      toast.success(message, { description: name });
      return result;
    } catch (error) {
      onError(error);
      return undefined;
    } finally {
      lock.current = false;
      setPending(false);
    }
  };

  return {
    pending,
    testing,
    testingId,
    testBlocked: testing || retryAt > 0,
    retryAt,
    create: (input: CreateIntegrationRequest) =>
      write(() => fetchProjectIntegrations.create(projectId, input), "Integration added", input.name),
    update: (id: string, input: UpdateIntegrationRequest, name: string) =>
      write(() => fetchProjectIntegrations.update(projectId, id, input), "Integration updated", name),
    remove: (id: string, name: string) =>
      write(() => fetchProjectIntegrations.remove(projectId, id), "Integration removed", name),
    test: async (
      input: { provider: string; webhook_url: string } | { id: string },
      providerLabel: string,
      onUnreadable?: () => void,
    ) => {
      if (testLock.current || Date.now() < retryAtRef.current) return false;
      testLock.current = true;
      setTesting(true);
      setTestingId("id" in input ? input.id : null);
      try {
        const { data } = await fetchProjectIntegrations.test(projectId, input);
        if (!data.ok) {
          toast.error(data.error.message);
          return false;
        }
        toast.success("Test message sent", { description: `Check your ${providerLabel} channel.` });
        return true;
      } catch (error) {
        onError(error);
        if (error instanceof ApiError && error.code === "INTEGRATION_URL_UNREADABLE") onUnreadable?.();
        if (error instanceof ApiError && error.code === "INTEGRATION_TEST_RATE_LIMITED") {
          const until = Date.now() + Math.max(1, error.retryAfter ?? 60) * 1000;
          retryAtRef.current = until;
          setRetryAt(until);
        }
        return false;
      } finally {
        testLock.current = false;
        setTesting(false);
        setTestingId(null);
      }
    },
  };
}

export type IntegrationActions = ReturnType<typeof useIntegrationActions>;
