"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { showConnectionError, useConnectionAccess } from "@/hooks/use-data-connections";
import { connectionKeys } from "@/lib/api/query-keys";
import {
  type ConnectionItem,
  fetchDataConnections,
  type GoogleConnectionKind,
} from "@/lib/api/services/fetch-data-connections";
import { ApiError } from "@/types/api";

import { saveGoogleSelection } from "./google-connection-selection";
import {
  beginGoogleConnection,
  consumeGoogleConnectionCallback,
  type GoogleConnectionResume,
  googleConnectionCallbackMessage,
  takeGoogleConnectionIntent,
} from "./google-connection-state";
import { openGooglePicker } from "./google-picker";

interface ReconnectRequest {
  connectionId: string;
  accountEmail: string;
  grantId?: string;
}

export function useGoogleConnectionCallback(
  projectId: string,
  userId: string,
  canWrite: boolean,
  onCreated: (connection: ConnectionItem) => void,
) {
  const queryClient = useQueryClient();
  const access = useConnectionAccess(projectId);
  const [reconnect, setReconnect] = useState<ReconnectRequest | null>(null);
  const [pending, setPending] = useState(false);
  const [creation, setCreation] = useState<GoogleConnectionResume | null>(null);
  const locked = useRef<boolean>(false);
  const attempted = useRef<GoogleConnectionResume | null>(null);
  const pickerRequest = useRef<AbortController | null>(null);

  useEffect(() => () => pickerRequest.current?.abort(), []);

  const chooseSource = useCallback(
    async (request: GoogleConnectionResume) => {
      if (locked.current || !request.grantId || !canWrite || !access.configured || access.rateLimited) return;
      locked.current = true;
      setPending(true);
      const controller = new AbortController();
      pickerRequest.current = controller;
      try {
        const { data } = await fetchDataConnections.getGooglePicker(projectId, request.grantId, controller.signal);
        const selected = await openGooglePicker(request.kind, data, controller.signal, () => undefined);
        if (!selected || controller.signal.aborted) return;
        const connection = await saveGoogleSelection(projectId, request.kind, request.grantId, selected);
        await queryClient.invalidateQueries({ queryKey: connectionKeys.project(projectId) });
        if (controller.signal.aborted) return;
        setCreation(null);
        toast.success("Connection saved.");
        // The import flow opens only after a file has been picked and its connection saved.
        onCreated(connection);
      } catch (error) {
        if (controller.signal.aborted) return;
        if (error instanceof ApiError && error.code === "GOOGLE_GRANT_INVALID")
          setCreation({ ...request, grantId: undefined });
        showConnectionError(error, projectId);
      } finally {
        pickerRequest.current = null;
        locked.current = false;
        if (!controller.signal.aborted) setPending(false);
      }
    },
    [access.configured, access.rateLimited, canWrite, onCreated, projectId, queryClient],
  );

  useEffect(() => {
    if (!creation?.grantId || attempted.current === creation || !canWrite || !access.configured || access.rateLimited)
      return;
    // Wait for the committed mount so Strict Mode cleanup cannot cancel and lose the callback.
    const timer = setTimeout(() => {
      if (attempted.current === creation) return;
      attempted.current = creation;
      void chooseSource(creation);
    }, 0);
    return () => clearTimeout(timer);
  }, [access.configured, access.rateLimited, canWrite, chooseSource, creation]);

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
      if (callback.grantId && !callback.error) setCreation({ ...intent.draft, grantId: callback.grantId });
    } else if (callback.grantId && !callback.error) {
      void reauthorize({ ...intent, grantId: callback.grantId });
    } else {
      setReconnect({ connectionId: intent.connectionId, accountEmail: intent.accountEmail });
    }
  }, [canWrite, projectId, reauthorize, userId]);

  function startCreate(kind: GoogleConnectionKind) {
    if (locked.current || !canWrite || !access.configured || access.rateLimited) return;
    if (creation?.kind === kind && creation.grantId) {
      void chooseSource(creation);
      return;
    }
    try {
      beginGoogleConnection(projectId, userId, { action: "create", draft: { kind, name: "", target: "" } });
    } catch (error) {
      showConnectionError(error, projectId);
    }
  }

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

  return { reconnect, setReconnect, pending, confirmReconnect, startCreate };
}
