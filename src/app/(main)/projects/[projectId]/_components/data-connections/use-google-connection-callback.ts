"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useRouter } from "next/navigation";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { showConnectionError, useConnectionAccess } from "@/hooks/use-data-connections";
import { collectPages } from "@/lib/api/infinite-pagination";
import { connectionKeys } from "@/lib/api/query-keys";
import { type ConnectionItem, fetchDataConnections } from "@/lib/api/services/fetch-data-connections";
import { ApiError } from "@/types/api";

import {
  forgetRevokedFiles,
  type GoogleFileKind,
  type GoogleSelectionResult,
  saveGoogleAccount,
  saveGoogleFile,
} from "./google-connection-selection";
import {
  beginGoogleConnection,
  consumeGoogleConnectionCallback,
  type GoogleReturnPage,
  googleCallbackElsewhere,
  googleConnectionCallbackMessage,
  takeGoogleConnectionIntent,
} from "./google-connection-state";
import { openGooglePicker } from "./google-picker";

interface ReconnectRequest {
  connectionId: string;
  accountEmail: string;
  grantId?: string;
  /** The page Reconnect was pressed on. */
  returnTo?: string;
}

/** What to do with Google: keep an account from a fresh sign-in (`grantId`), then pick a spreadsheet or folder. */
interface GoogleRequest {
  kind: GoogleFileKind;
  grantId?: string;
  /** Runs just before Google Picker shows, to close whatever would trap its focus. */
  onOpen?: () => void;
}

/**
 * The member's Google account in this project and what it picks. Signing in keeps the account; each spreadsheet
 * or folder picked with it then becomes a connection of the project, without signing in again.
 */
export function useGoogleConnectionCallback(
  projectId: string,
  userId: string,
  canWrite: boolean,
  /** The member's saved Google account here, if they have one. */
  account: ConnectionItem | undefined,
  /** Announces a picked spreadsheet or folder; the caller words the toast. */
  onCreated: (result: GoogleSelectionResult) => void,
  /** The page using it, where signing in comes back to. */
  page: GoogleReturnPage = "connections",
) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const access = useConnectionAccess(projectId);
  const [reconnect, setReconnect] = useState<ReconnectRequest | null>(null);
  const [pending, setPending] = useState(false);
  const [creation, setCreation] = useState<GoogleRequest | null>(null);
  const locked = useRef<boolean>(false);
  const attempted = useRef<GoogleRequest | null>(null);
  const pickerRequest = useRef<AbortController | null>(null);

  useEffect(() => () => pickerRequest.current?.abort(), []);

  const signIn = useCallback(
    (kind: GoogleFileKind) => {
      try {
        beginGoogleConnection(projectId, userId, { action: "create", kind, returnTo: page });
      } catch (error) {
        showConnectionError(error, projectId);
      }
    },
    [page, projectId, userId],
  );

  const chooseSource = useCallback(
    async (request: GoogleRequest) => {
      if (locked.current || !canWrite || !access.configured || access.rateLimited) return;
      locked.current = true;
      setPending(true);
      const controller = new AbortController();
      pickerRequest.current = controller;
      try {
        let saved = account;
        if (request.grantId) {
          saved = (await saveGoogleAccount(projectId, request.grantId)).connection;
          // The grant is spent: picking again uses the saved account.
          setCreation(null);
          await queryClient.invalidateQueries({ queryKey: connectionKeys.project(projectId) });
        }
        if (!saved) return;
        const { data } = await fetchDataConnections.getAccountPicker(projectId, saved.id, controller.signal);
        const selected = await openGooglePicker(
          request.kind,
          data,
          controller.signal,
          request.onOpen ?? (() => undefined),
        );
        if (!selected || controller.signal.aborted) return;
        const result = await saveGoogleFile(projectId, request.kind, saved.id, selected);
        await queryClient.invalidateQueries({ queryKey: connectionKeys.project(projectId) });
        if (controller.signal.aborted) return;
        setCreation(null);
        onCreated(result);
      } catch (error) {
        if (controller.signal.aborted) return;
        if (error instanceof ApiError && error.code === "GOOGLE_GRANT_INVALID") setCreation(null);
        if (error instanceof ApiError && error.reason === "access_revoked") {
          // Signing in with the same account again renews it, then the picker opens.
          toast.error("Your Google access has expired", {
            description: "Sign in with Google again to keep picking files.",
            action: { label: "Sign in", onClick: () => signIn(request.kind) },
          });
          return;
        }
        showConnectionError(error, projectId);
      } finally {
        pickerRequest.current = null;
        locked.current = false;
        if (!controller.signal.aborted) setPending(false);
      }
    },
    [access.configured, access.rateLimited, account, canWrite, onCreated, projectId, queryClient, signIn],
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
        const renewed = (await fetchDataConnections.reauthorize(projectId, request.connectionId, request.grantId)).data;
        setReconnect(null);
        // Its creator's other files of the same Google account were renewed with it.
        if (renewed.created_by_user_id === userId)
          forgetRevokedFiles(
            projectId,
            renewed,
            await collectPages((params) => fetchDataConnections.getList(projectId, params)),
          );
        await queryClient.invalidateQueries({ queryKey: connectionKeys.project(projectId) });
        toast.success("Google connection reauthorized. You can import or refresh data again.");
        // Google always comes back to the connections page: return to where Reconnect was pressed.
        const back = request.returnTo;
        if (back?.startsWith(`/projects/${projectId}/`) && back !== window.location.pathname) router.push(back);
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
    [canWrite, projectId, queryClient, router, userId],
  );

  useEffect(() => {
    const elsewhere = googleCallbackElsewhere(projectId, userId, page);
    if (elsewhere) {
      window.location.replace(elsewhere);
      return;
    }
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
    const granted = callback.grantId && !callback.error ? callback.grantId : null;
    if (intent.action === "create") {
      if (granted) setCreation({ kind: intent.kind, grantId: granted });
    } else if (granted) {
      void reauthorize({ ...intent, grantId: granted });
    } else {
      setReconnect({
        connectionId: intent.connectionId,
        accountEmail: intent.accountEmail,
        returnTo: intent.returnTo,
      });
    }
  }, [canWrite, page, projectId, reauthorize, userId]);

  /** Pick a spreadsheet or folder: with the saved account, or after signing in when there is none yet. */
  function startCreate(kind: GoogleFileKind, onOpen?: () => void) {
    if (locked.current || !canWrite || !access.configured || access.rateLimited) return;
    if (account) void chooseSource({ kind, onOpen });
    else if (creation?.grantId) void chooseSource({ ...creation, kind, onOpen });
    else signIn(kind);
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
          returnTo: reconnect.returnTo,
        });
      } catch (error) {
        showConnectionError(error, projectId);
      }
    }
  }

  return { reconnect, setReconnect, pending, confirmReconnect, startCreate };
}
