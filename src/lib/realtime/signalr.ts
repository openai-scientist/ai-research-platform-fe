// Retain the existing realtime module path. The backend handoff now uses SSE.
import { z } from "zod";

import { getApiBaseUrl } from "@/lib/api/config";
import { fetchAuth } from "@/lib/api/services/fetch-auth";
import type { NotificationSnapshot, SessionEndedCode } from "@/lib/api/services/fetch-notifications";
import { SESSION_INVALID_CODES } from "@/lib/auth/auth-config";
import { ApiError } from "@/types/api";
import { NotificationKind } from "@/types/enums";

export type NotificationConnectionStatus = "connecting" | "connected" | "reconnecting";

const snapshotSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      kind: z.enum(NotificationKind),
      project_id: z.string(),
      project_name: z.string(),
      run_id: z.string().nullable(),
      actor_user_id: z.string().nullable(),
      actor_display_name: z.string().nullable(),
      created_at: z.iso.datetime({ offset: true }),
      read_at: z.iso.datetime({ offset: true }).nullable(),
    }),
  ),
  unread_count: z.number().int().nonnegative(),
});
const sessionEndedSchema = z.object({
  code: z.enum(["SESSION_EXPIRED", "USER_SUSPENDED", "UNAUTHENTICATED"]),
});
const reconnectDelays = [1000, 2000, 5000, 10000, 30000];

interface NotificationHandlers {
  onSnapshot: (snapshot: NotificationSnapshot) => void;
  onStatus: (status: NotificationConnectionStatus) => void;
  onSessionEnded: (code: SessionEndedCode) => void;
  onError: (error: Error) => void;
}

// One owner per tab. Native EventSource reconnects transient network failures;
// only CLOSED connections need an authenticated recovery attempt.
export function subscribeNotifications(userId: string, handlers: NotificationHandlers) {
  let stream: EventSource | null = null;
  let disposed = false;
  let attempt = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  const controller = new AbortController();

  const closeStream = () => {
    if (!stream) return;
    stream.onopen = null;
    stream.onerror = null;
    stream.close();
    stream = null;
  };
  const stop = () => {
    disposed = true;
    clearTimeout(reconnectTimer);
    controller.abort();
    closeStream();
  };
  const endSession = (code: SessionEndedCode) => {
    stop();
    handlers.onSessionEnded(code);
  };

  const scheduleRecovery = (retryAfter = 0) => {
    if (disposed) return;
    closeStream();
    clearTimeout(reconnectTimer);
    handlers.onStatus("reconnecting");
    const delay = reconnectDelays[Math.min(attempt++, reconnectDelays.length - 1)];
    const recover = async () => {
      if (disposed) return;
      try {
        const current = await fetchAuth.me(controller.signal);
        if (disposed) return;
        if (current.user.id !== userId) {
          endSession("UNAUTHENTICATED");
          return;
        }
        connect();
      } catch (error) {
        if (disposed) return;
        if (error instanceof ApiError && SESSION_INVALID_CODES.includes(error.code)) {
          endSession(error.code as SessionEndedCode);
          return;
        }
        handlers.onError(error instanceof Error ? error : new Error("Unable to reconnect live notifications."));
        scheduleRecovery(error instanceof ApiError ? (error.retryAfter ?? 0) : 0);
      }
    };
    reconnectTimer = setTimeout(() => void recover(), Math.max(delay, retryAfter * 1000));
  };

  const connect = () => {
    if (disposed) return;
    try {
      const base = new URL(`${getApiBaseUrl()}/`, window.location.origin);
      const current = new EventSource(new URL("notifications/stream?limit=50", base), { withCredentials: true });
      stream = current;
      current.addEventListener("notifications", (event) => {
        if (disposed || stream !== current) return;
        try {
          const snapshot = snapshotSchema.parse(JSON.parse((event as MessageEvent<string>).data));
          attempt = 0;
          handlers.onSnapshot(snapshot);
          handlers.onStatus("connected");
        } catch {
          handlers.onError(new Error("Unable to load live notifications. Reconnecting."));
          scheduleRecovery();
        }
      });
      current.addEventListener("session-ended", (event) => {
        if (disposed || stream !== current) return;
        try {
          const { code } = sessionEndedSchema.parse(JSON.parse((event as MessageEvent<string>).data));
          endSession(code);
        } catch {
          scheduleRecovery();
        }
      });
      current.onerror = () => {
        if (disposed || stream !== current) return;
        handlers.onStatus("reconnecting");
        if (current.readyState === EventSource.CLOSED) scheduleRecovery();
      };
    } catch {
      handlers.onError(new Error("Unable to connect live notifications. Reconnecting."));
      scheduleRecovery();
    }
  };

  handlers.onStatus("connecting");
  connect();
  return stop;
}
