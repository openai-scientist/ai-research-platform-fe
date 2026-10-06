import { z } from "zod";

import { getApiBaseUrl } from "@/lib/api/config";
import { projectPath } from "@/lib/api/request";
import {
  fetchMembers,
  type InviteCandidateParams,
  type InviteCandidatesResponse,
} from "@/lib/api/services/fetch-members";
import { SESSION_INVALID_CODES } from "@/lib/auth/auth-config";
import { ApiError } from "@/types/api";

const snapshotSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.array(
    z.object({
      id: z.string(),
      email: z.string(),
      display_name: z.string().nullable(),
      avatar_url: z.string().nullable(),
    }),
  ),
  meta: z.object({
    request_id: z.string(),
    pagination: z.object({
      total: z.number().int().nonnegative(),
      limit: z.number().int().positive().max(100),
      offset: z.number().int().nonnegative(),
    }),
  }),
});
interface CandidateHandlers {
  onSnapshot: (snapshot: InviteCandidatesResponse) => void;
  onStatus: (connected: boolean) => void;
  onSessionEnded: (code: string) => void;
  onAccessEnded: (code: string) => void;
  onError: (error: Error) => void;
}

export function subscribeInviteCandidates(
  projectId: string,
  params: InviteCandidateParams,
  handlers: CandidateHandlers,
) {
  let source: EventSource | null = null;
  let disposed = false;
  let diagnosing = false;
  let diagnosed = false;
  let snapshotVersion = 0;
  let reconnectAttempt = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const controller = new AbortController();
  const stop = () => {
    disposed = true;
    controller.abort();
    clearTimeout(timer);
    source?.close();
    source = null;
  };
  const end = (session: boolean, code: string) => {
    stop();
    if (session) handlers.onSessionEnded(code);
    else handlers.onAccessEnded(code);
  };
  const scheduleConnect = (seconds?: number) => {
    const delay = seconds ?? [1, 2, 5, 10, 30][Math.min(reconnectAttempt++, 4)];
    source?.close();
    source = null;
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!disposed) connect();
    }, delay * 1000);
  };
  const diagnose = async () => {
    if (disposed || diagnosing || diagnosed) return;
    diagnosing = true;
    diagnosed = true;
    const version = snapshotVersion;
    try {
      const snapshot = await fetchMembers.getInviteCandidates(projectId, params, controller.signal);
      if (disposed) return;
      if (version === snapshotVersion) handlers.onSnapshot(snapshot);
      if (source?.readyState === EventSource.CLOSED) scheduleConnect();
    } catch (error) {
      if (disposed) return;
      if (error instanceof ApiError && SESSION_INVALID_CODES.includes(error.code)) end(true, error.code);
      else if (error instanceof ApiError && [403, 404, 409].includes(error.status)) {
        handlers.onError(error);
        end(false, error.code);
      } else {
        handlers.onError(error instanceof Error ? error : new Error("Unable to refresh available users."));
        if (error instanceof ApiError && error.code === "RATE_LIMITED") scheduleConnect(error.retryAfter ?? 60);
        else if (source?.readyState === EventSource.CLOSED) scheduleConnect();
      }
    } finally {
      diagnosing = false;
    }
  };
  const connect = () => {
    if (disposed) return;
    const url = new URL(`${getApiBaseUrl()}${projectPath(projectId)}/invite-candidates/stream`, window.location.origin);
    url.searchParams.set("limit", String(params.limit ?? 50));
    url.searchParams.set("offset", String(params.offset ?? 0));
    if (params.q) url.searchParams.set("q", params.q);
    const current = new EventSource(url.href, { withCredentials: true });
    source = current;
    current.addEventListener("invite-candidates", (event) => {
      if (disposed || source !== current) return;
      try {
        const snapshot = snapshotSchema.parse(JSON.parse((event as MessageEvent<string>).data));
        snapshotVersion += 1;
        reconnectAttempt = 0;
        diagnosed = false;
        handlers.onSnapshot(snapshot);
        handlers.onStatus(true);
      } catch {
        handlers.onError(new Error("Unable to read the available users. Reconnecting."));
        handlers.onStatus(false);
        void diagnose();
        scheduleConnect();
      }
    });
    for (const kind of ["session-ended", "access-ended"]) {
      current.addEventListener(kind, (event) => {
        if (disposed || source !== current) return;
        let code = kind === "session-ended" ? "UNAUTHENTICATED" : "ROLE_REQUIRED";
        try {
          code = z.object({ code: z.string() }).parse(JSON.parse((event as MessageEvent<string>).data)).code;
        } catch {
          /* Closing is safer than retaining candidates after a malformed termination event. */
        }
        end(kind === "session-ended", code);
      });
    }
    current.onerror = () => {
      if (disposed || source !== current) return;
      handlers.onStatus(false);
      if (diagnosed && current.readyState === EventSource.CLOSED) scheduleConnect();
      else void diagnose();
    };
  };
  connect();
  return stop;
}
