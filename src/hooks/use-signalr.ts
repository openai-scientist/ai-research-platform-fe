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
import { NotificationKind } from "@/types/enums";

import { useMarkNotificationReadMutation } from "./use-notifications-query";

interface NotificationStreamState {
  sessionKey: string;
  snapshot: NotificationSnapshot | null;
  status: NotificationConnectionStatus;
}

/** Existing realtime hook; the current backend transport is SSE, not a SignalR Hub. */
export function useSignalR() {
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { user, session, isAuthenticated } = useAppSelector(selectAuth);
  const userId = isAuthenticated && !user?.must_change_password ? user?.id : undefined;
  const sessionKey = userId ? `${userId}:${session?.created_at ?? ""}` : "";
  const [state, setState] = useState<NotificationStreamState | null>(null);
  const { mutate: markRead } = useMarkNotificationReadMutation();

  useEffect(() => {
    if (!userId) return;
    let active = true;
    const seenNotificationIds = new Set<string>();
    const toastIds = new Set<string>();
    let pendingNotifications: NotificationItem[] = [];
    // Queue bursts so notifications beyond Sonner's three visible slots get shown.
    const showPendingNotifications = () => {
      while (active && toastIds.size < 3 && pendingNotifications.length > 0) {
        const notification = pendingNotifications.shift();
        if (!notification) break;
        const invitation = notification.kind === NotificationKind.ProjectInvited;
        const { text, href } = getNotificationContent(notification);
        const toastId = `notification:${notification.id}`;
        toastIds.add(toastId);
        const finish = () => {
          if (!toastIds.delete(toastId)) return;
          showPendingNotifications();
        };
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
        const notify = notification.kind === NotificationKind.IntegrationFailed ? toast.warning : toast.info;
        notify(title, {
          id: toastId,
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
        // Show every unread kind, including the first snapshot. Retain IDs across
        // reconnects and read updates so the same notification only toasts once.
        for (const notification of snapshot.items) {
          if (seenNotificationIds.has(notification.id)) continue;
          seenNotificationIds.add(notification.id);
          newNotifications.push(notification);
          if (notification.read_at !== null) continue;
          pendingNotifications.push(notification);
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
    const stop = () => {
      active = false;
      unsubscribe();
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
