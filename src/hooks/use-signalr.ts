"use client";

import { useEffect, useState } from "react";

import { toast } from "sonner";

import type { NotificationSnapshot } from "@/lib/api/services/fetch-notifications";
import { type NotificationConnectionStatus, subscribeNotifications } from "@/lib/realtime/signalr";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectAuth } from "@/lib/redux/slices/auth-slice";

interface NotificationStreamState {
  sessionKey: string;
  snapshot: NotificationSnapshot | null;
  status: NotificationConnectionStatus;
}

/** Existing realtime hook; the current backend transport is SSE, not a SignalR Hub. */
export function useSignalR() {
  const { user, session, isAuthenticated } = useAppSelector(selectAuth);
  const userId = isAuthenticated ? user?.id : undefined;
  const sessionKey = userId ? `${userId}:${session?.created_at ?? ""}` : "";
  const [state, setState] = useState<NotificationStreamState | null>(null);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    const unsubscribe = subscribeNotifications(userId, {
      onSnapshot: (snapshot) => {
        if (active) setState({ sessionKey, snapshot, status: "connected" });
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
    };
    // Close immediately, including while a local logout awaits the next render.
    window.addEventListener("auth:expired", stop);
    return () => {
      active = false;
      unsubscribe();
      setState(null);
      toast.dismiss("notification-stream");
      window.removeEventListener("auth:expired", stop);
    };
  }, [userId, sessionKey]);

  const current = state?.sessionKey === sessionKey ? state : null;
  return {
    items: current?.snapshot?.items ?? [],
    unreadCount: current?.snapshot?.unread_count ?? 0,
    hasSnapshot: current?.snapshot != null,
    status: current?.status ?? "connecting",
    isAuthenticated: Boolean(userId),
  };
}
