"use client";

import { createElement, useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { matchQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { NotificationToastLink } from "@/components/notification-toast-link";
import type { NotificationItem, NotificationSnapshot } from "@/lib/api/services/fetch-notifications";
import { getNotificationContent } from "@/lib/notification-content";
import { getNotificationQueryFilters, notificationChangesMembership } from "@/lib/realtime/notification-queries";
import { type NotificationConnectionStatus, subscribeNotifications } from "@/lib/realtime/signalr";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { restoreSession, selectAuth } from "@/lib/redux/slices/auth-slice";
import { useRunStudio } from "@/lib/run-stream/run-store";
import { NotificationKind } from "@/types/enums";

import { useMarkNotificationReadMutation } from "./use-notifications-query";

interface NotificationStreamState {
  sessionKey: string;
  snapshot: NotificationSnapshot | null;
  status: NotificationConnectionStatus;
}

const TOASTED_IDS_LIMIT = 200;
const toastedIdsKey = (userId: string) => `notification-toasted:${userId}`;

function loadToastedIds(userId: string): Set<string> {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(toastedIdsKey(userId)) ?? "[]");
    return new Set(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : []);
  } catch {
    return new Set();
  }
}

function saveToastedIds(userId: string, ids: Set<string>) {
  try {
    const key = toastedIdsKey(userId);
    // Merge with other tabs' writes so parallel tabs do not re-toast each other's notifications.
    const stored: unknown = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    if (Array.isArray(stored)) for (const id of stored) if (typeof id === "string") ids.add(id);
    window.localStorage.setItem(key, JSON.stringify([...ids].slice(-TOASTED_IDS_LIMIT)));
  } catch {
    // Storage can be blocked; in-session dedupe still applies.
  }
}

/** Existing realtime hook; the current backend transport is SSE, not a SignalR Hub. */
export function useSignalR() {
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { user, session, isAuthenticated } = useAppSelector(selectAuth);
  const userId = isAuthenticated ? user?.id : undefined;
  const sessionKey = userId ? `${userId}:${session?.created_at ?? ""}` : "";
  const [state, setState] = useState<NotificationStreamState | null>(null);
  const { mutate: markRead } = useMarkNotificationReadMutation();

  useEffect(() => {
    if (!userId) return;
    let active = true;
    const seenNotificationIds = new Set<string>();
    const toastedIds = loadToastedIds(userId);
    let hasBaseline = false;
    let baseline = 0;
    let persistToasted = false;
    const toastIds = new Set<string>();
    // The run each toast is about, to take it down once that run is opened.
    const runOfToast = new Map<string, { run: string; finish(): void }>();
    let pendingNotifications: NotificationItem[] = [];
    // Queue bursts so notifications beyond Sonner's three visible slots get shown.
    const showPendingNotifications = () => {
      while (active && toastIds.size < 3 && pendingNotifications.length > 0) {
        const notification = pendingNotifications.shift();
        if (!notification) break;
        // News about the run on screen is already in front of the person; it stays in the bell. The workspace drops
        // `?run=` from the address once it opens, so the open run comes from the run studio.
        const studio = useRunStudio.getState();
        if (notification.run_id && [studio.openRunId, studio.writingRunId].includes(notification.run_id)) continue;
        const invitation = notification.kind === NotificationKind.ProjectInvited;
        const { text, href } = getNotificationContent(notification);
        const toastId = `notification:${notification.id}`;
        toastIds.add(toastId);
        const finish = () => {
          runOfToast.delete(toastId);
          if (!toastIds.delete(toastId)) return;
          showPendingNotifications();
        };
        if (notification.run_id) runOfToast.set(toastId, { run: notification.run_id, finish });
        const title = createElement(
          NotificationToastLink,
          {
            href,
            text,
            onOpen: () => {
              if (active) markRead(notification.id);
              toast.dismiss(toastId);
              finish();
            },
          },
          invitation ? "Project invitation" : "New notification",
        );
        const budgetNotice =
          notification.kind === NotificationKind.BudgetWarning || notification.kind === NotificationKind.BudgetExceeded;
        const notify =
          notification.kind === NotificationKind.IntegrationFailed || budgetNotice ? toast.warning : toast.info;
        notify(title, {
          id: toastId,
          // News that arrives on its own stays out of the way of what the user is doing.
          position: "bottom-right",
          // Our motion uses wall time instead of a frozen browser animation timeline.
          className: "notification-toast transition-none! select-none",
          classNames: { description: "text-muted-foreground!" },
          description: text,
          duration: 12000,
          onAutoClose: finish,
          onDismiss: finish,
        });
      }
    };
    const unsubscribe = subscribeNotifications(userId, {
      onSnapshot: (snapshot) => {
        if (!active) return;
        const newNotifications: NotificationItem[] = [];
        // The first snapshot is backlog: it never toasts. Later ones toast only unread items that are newer than
        // that backlog and were never toasted before, in this session or an earlier one (persisted per user).
        const isBacklog = !hasBaseline;
        for (const notification of snapshot.items) {
          if (seenNotificationIds.has(notification.id)) continue;
          seenNotificationIds.add(notification.id);
          newNotifications.push(notification);
          const createdAt = Date.parse(notification.created_at);
          if (isBacklog) {
            if (createdAt > baseline) baseline = createdAt;
            continue;
          }
          if (notification.read_at !== null || !(createdAt > baseline) || toastedIds.has(notification.id)) continue;
          toastedIds.add(notification.id);
          persistToasted = true;
          pendingNotifications.push(notification);
        }
        hasBaseline = true;
        if (persistToasted) {
          persistToasted = false;
          saveToastedIds(userId, toastedIds);
        }
        const filters = newNotifications.flatMap(getNotificationQueryFilters);
        if (filters.length > 0) {
          // Match each cached query once, even when a snapshot contains a burst.
          void queryClient.invalidateQueries(
            { predicate: (query) => filters.some((filter) => matchQuery(filter, query)), refetchType: "active" },
            { cancelRefetch: false },
          );
        }
        if (newNotifications.some(notificationChangesMembership)) {
          void dispatch(restoreSession()).then((action) => {
            if (active && restoreSession.fulfilled.match(action)) router.refresh();
          });
        }
        // Do not toast queued items that were read or removed in another tab.
        const unreadIds = new Set(snapshot.items.filter((item) => item.read_at === null).map((item) => item.id));
        pendingNotifications = pendingNotifications.filter((item) => unreadIds.has(item.id));
        // A burst arriving together becomes one summary toast instead of a stack of look-alike toasts.
        const studio = useRunStudio.getState();
        const onScreenRuns = [studio.openRunId, studio.writingRunId];
        const burst = pendingNotifications.filter((item) => !(item.run_id && onScreenRuns.includes(item.run_id)));
        if (burst.length > 1) {
          pendingNotifications = [];
          toast.info(`${burst.length} new notifications`, {
            id: "notification:burst",
            position: "bottom-right",
            className: "notification-toast transition-none! select-none",
            classNames: { description: "text-muted-foreground!" },
            description: "Open the bell to review them.",
            duration: 12000,
          });
        }
        showPendingNotifications();
        setState({ sessionKey, snapshot, status: "connected" });
        toast.dismiss("notification-stream");
      },
      onStatus: (status) => {
        if (!active) return;
        setState((previous) => ({
          sessionKey,
          snapshot: previous?.sessionKey === sessionKey ? previous.snapshot : null,
          status,
        }));
      },
      onSessionEnded: (code) => {
        if (!active) return;
        setState(null);
        if (code === "USER_SUSPENDED") toast.error("Your account has been suspended.");
        window.dispatchEvent(new Event("auth:expired"));
      },
      onError: (error) => {
        if (active) toast.error(error.message, { id: "notification-stream" });
      },
    });
    // A toast about a run that opens afterwards (the page was still loading it) has nothing left to say.
    const unwatchOpenRun = useRunStudio.subscribe((studio) => {
      if (!studio.openRunId && !studio.writingRunId) return;
      for (const [id, { run, finish }] of runOfToast)
        if (run === studio.openRunId || run === studio.writingRunId) {
          toast.dismiss(id);
          finish();
        }
    });
    const stop = () => {
      active = false;
      unsubscribe();
      unwatchOpenRun();
      setState(null);
      toast.dismiss("notification-stream");
      for (const id of toastIds) toast.dismiss(id);
    };
    // Close immediately, including while a local logout awaits the next render.
    window.addEventListener("auth:expired", stop);
    return () => {
      stop();
      window.removeEventListener("auth:expired", stop);
    };
  }, [userId, sessionKey, markRead, queryClient, dispatch, router]);

  const current = state?.sessionKey === sessionKey ? state : null;
  return {
    items: current?.snapshot?.items ?? [],
    unreadCount: current?.snapshot?.unread_count ?? 0,
    hasSnapshot: current?.snapshot != null,
    status: current?.status ?? "connecting",
    isAuthenticated: Boolean(userId),
  };
}
