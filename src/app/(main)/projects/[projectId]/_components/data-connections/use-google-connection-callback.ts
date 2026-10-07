"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { showConnectionError, useConnectionAccess } from "@/hooks/use-data-connections";
import { connectionKeys } from "@/lib/api/query-keys";
import { fetchDataConnections } from "@/lib/api/services/fetch-data-connections";
import { ApiError } from "@/types/api";

import {
  beginGoogleConnection,
  consumeGoogleConnectionCallback,
  type GoogleConnectionResume,
  googleConnectionCallbackMessage,
  takeGoogleConnectionIntent,
} from "./google-connection-state";

interface ReconnectRequest {
  connectionId: string;
  accountEmail: string;
  grantId?: string;
}

export function useGoogleConnectionCallback(
  projectId: string,
  userId: string,
  canWrite: boolean,
  onResume: (resume: GoogleConnectionResume) => void,
) {
  const queryClient = useQueryClient();
  const access = useConnectionAccess(projectId);
  const [reconnect, setReconnect] = useState<ReconnectRequest | null>(null);
  const [pending, setPending] = useState(false);
  const locked = useRef(false);

  const reauthorize = useCallback(
    async (request: ReconnectRequest & { grantId: string }) => {
      if (locked.current || !canWrite) return;
      locked.current = true;
      setPending(true);
      try {
        await fetchDataConnections.reauthorize(projectId, request.connectionId, request.grantId);
        setReconnect(null);
        await queryClient.invalidateQueries({ queryKey: connectionKeys.project(projectId) });
        toast.success("Google connection reauthorized. You can import or refresh data again.");
      } catch (error) {
        const restart =
          error instanceof ApiError &&
          (error.code === "GOOGLE_GRANT_INVALID" || error.code === "GOOGLE_ACCOUNT_MISMATCH");
        setReconnect({ ...request, grantId: restart ? undefined : request.grantId });
        showConnectionError(error, projectId);
      } finally {
        locked.current = false;
        setPending(false);
      }
    },
    [canWrite, projectId, queryClient],
  );

  useEffect(() => {
    const callback = consumeGoogleConnectionCallback();
    if (!callback) return;
    const intent = takeGoogleConnectionIntent(projectId, userId);
    if (!canWrite) {
      toast.error("This project is read-only. Google access cannot be used to create or reconnect a connection.");
      return;
    }
    if (callback.error) toast.error(googleConnectionCallbackMessage(callback.error));
    else if (!callback.grantId) toast.error("Google authorization is invalid. Please connect your account again.");
    if (!intent) {
      if (callback.grantId && !callback.error)
        toast.error("The Google connection form could not be restored. Please connect again.");
      return;
    }
    if (intent.action === "create") {
      onResume({ ...intent.draft, grantId: callback.error ? undefined : (callback.grantId ?? undefined) });
    } else if (callback.grantId && !callback.error) {
      void reauthorize({ ...intent, grantId: callback.grantId });
    } else {
      setReconnect({ connectionId: intent.connectionId, accountEmail: intent.accountEmail });
    }
  }, [canWrite, onResume, projectId, reauthorize, userId]);

  function confirmReconnect() {
    if (!reconnect || pending || !canWrite || access.rateLimited) return;
    if (reconnect.grantId) {
      void reauthorize({ ...reconnect, grantId: reconnect.grantId });
    } else {
      try {
        beginGoogleConnection(projectId, userId, {
          action: "reauthorize",
          connectionId: reconnect.connectionId,
          accountEmail: reconnect.accountEmail,
        });
      } catch (error) {
        showConnectionError(error, projectId);
      }
    }
  }

  return { reconnect, setReconnect, pending, confirmReconnect };
}
