import { ApiError } from "@/types/api";

interface ConnectionAccess {
  configured: boolean;
  retryAt: number;
  revokedConnectionIds: ReadonlySet<string>;
}

const initialAccess: ConnectionAccess = { configured: true, retryAt: 0, revokedConnectionIds: new Set() };
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

export function recordConnectionError(projectId: string, error: unknown, connectionId?: string) {
  if (!(error instanceof ApiError)) return;
  const previous = getConnectionAccess(projectId);
  const next = {
    revokedConnectionIds:
      connectionId && error.reason === "access_revoked" && !previous.revokedConnectionIds.has(connectionId)
        ? new Set([...previous.revokedConnectionIds, connectionId])
        : previous.revokedConnectionIds,
    configured: previous.configured && error.code !== "CONNECTIONS_NOT_CONFIGURED",
    retryAt:
      (error.code === "RATE_LIMITED" || error.reason === "rate_limited") && error.retryAfter !== null
        ? Date.now() + error.retryAfter * 1000
        : previous.retryAt,
  };
  if (
    next.configured !== previous.configured ||
    next.retryAt !== previous.retryAt ||
    next.revokedConnectionIds !== previous.revokedConnectionIds
  ) {
    access.set(projectId, next);
    for (const listener of listeners) listener();
  }
}

export function clearConnectionRevocation(projectId: string, connectionId: string) {
  const previous = getConnectionAccess(projectId);
  if (!previous.revokedConnectionIds.has(connectionId)) return;
  const revokedConnectionIds = new Set(previous.revokedConnectionIds);
  revokedConnectionIds.delete(connectionId);
  access.set(projectId, { ...previous, revokedConnectionIds });
  for (const listener of listeners) listener();
}

// A project's remote data source operations run one at a time, including calls from other mounted screens.
export async function connectionRequest<T>(
  projectId: string,
  request: () => Promise<T>,
  signal?: AbortSignal,
  connectionId?: string,
) {
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
        recordConnectionError(projectId, error, connectionId);
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
