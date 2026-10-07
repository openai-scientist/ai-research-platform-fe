import { ApiError } from "@/types/api";

interface ConnectionAccess {
  configured: boolean;
  retryAt: number;
}

const initialAccess: ConnectionAccess = { configured: true, retryAt: 0 };
const access = new Map<string, ConnectionAccess>();
const listeners = new Set<() => void>();
const queues = new Map<string, Promise<unknown>>();

export function getConnectionAccess(projectId: string): ConnectionAccess {
  return access.get(projectId) ?? initialAccess;
}

export function subscribeConnectionAccess(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function recordConnectionError(projectId: string, error: unknown) {
  if (!(error instanceof ApiError)) return;
  const previous = getConnectionAccess(projectId);
  const next = {
    configured: previous.configured && error.code !== "CONNECTIONS_NOT_CONFIGURED",
    retryAt:
      error.code === "RATE_LIMITED" && error.retryAfter !== null
        ? Date.now() + error.retryAfter * 1000
        : previous.retryAt,
  };
  if (next.configured !== previous.configured || next.retryAt !== previous.retryAt) {
    access.set(projectId, next);
    for (const listener of listeners) listener();
  }
}

// A project's remote-database operations run one at a time, including calls from other mounted screens.
export async function connectionRequest<T>(projectId: string, request: () => Promise<T>, signal?: AbortSignal) {
  const previous = queues.get(projectId) ?? Promise.resolve();
  const pending = previous
    .catch(() => undefined)
    .then(async () => {
      if (signal?.aborted) throw new DOMException("The request was cancelled.", "AbortError");
      const wait = getConnectionAccess(projectId).retryAt - Date.now();
      if (wait > 0)
        throw new ApiError(429, "RATE_LIMITED", "Please wait before trying again.", [], null, Math.ceil(wait / 1000));
      try {
        return await request();
      } catch (error) {
        recordConnectionError(projectId, error);
        throw error;
      }
    });
  queues.set(projectId, pending);
  try {
    return await pending;
  } finally {
    if (queues.get(projectId) === pending) queues.delete(projectId);
  }
}
