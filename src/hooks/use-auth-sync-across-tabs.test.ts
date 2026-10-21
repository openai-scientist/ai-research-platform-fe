import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { restoreSession } from "@/lib/redux/slices/auth-slice";

import { useAuthSyncAcrossTabs } from "./use-auth-sync-across-tabs";

const {
  effect,
  dispatch,
  cancelQueries,
  clearQueries,
  replace,
  routerReplace,
  routerRefresh,
  broadcast,
  setCsrfToken,
} = vi.hoisted(() => ({
  effect: vi.fn(),
  dispatch: vi.fn(),
  cancelQueries: vi.fn(),
  clearQueries: vi.fn(),
  replace: vi.fn(),
  routerReplace: vi.fn(),
  routerRefresh: vi.fn(),
  broadcast: vi.fn(),
  setCsrfToken: vi.fn(),
}));

vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useEffect: effect,
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/projects",
  useRouter: () => ({ replace: routerReplace, refresh: routerRefresh }),
}));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ cancelQueries, clear: clearQueries }),
}));
vi.mock("@/lib/api/core", () => ({ default: { setCsrfToken } }));
vi.mock("@/lib/redux/hooks", () => ({ useAppDispatch: () => dispatch }));
vi.mock("@/lib/auth/session-events", () => ({ AUTH_CHANNEL: "platform-auth", broadcastAuthChange: broadcast }));

describe("session termination", () => {
  let cleanup: (() => void) | undefined;
  let channel: { onmessage: ((event: MessageEvent<unknown>) => void) | null };
  let pending: ReturnType<typeof createPending>;

  function createPending() {
    const result = Promise.withResolvers<unknown>();
    return { ...result, request: Object.assign(result.promise, { abort: vi.fn() }) };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    pending = createPending();
    dispatch.mockReturnValue(pending.request);
    cancelQueries.mockResolvedValue(undefined);
    effect.mockImplementation((setup: () => () => void) => {
      cleanup = setup();
    });
    vi.stubGlobal("window", Object.assign(new EventTarget(), { location: { pathname: "/projects", replace } }));
    vi.stubGlobal(
      "BroadcastChannel",
      class {
        onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
        close = vi.fn();
        constructor() {
          channel = this;
        }
      },
    );
  });

  afterEach(() => cleanup?.());

  it("handles simultaneous expired requests with one navigation and one cross-tab announcement", () => {
    useAuthSyncAcrossTabs();
    window.dispatchEvent(new Event("auth:expired"));
    window.dispatchEvent(new Event("auth:expired"));

    expect(pending.request.abort).toHaveBeenCalledOnce();
    expect(cancelQueries).toHaveBeenCalledOnce();
    expect(clearQueries).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledExactlyOnceWith("/auth/login");
    expect(routerReplace).not.toHaveBeenCalled();
    expect(routerRefresh).not.toHaveBeenCalled();
    expect(broadcast).toHaveBeenCalledExactlyOnceWith("signed-out");
  });

  it("does not echo another tab's sign-out even when a pending local request also expires", () => {
    useAuthSyncAcrossTabs();
    channel.onmessage?.(new MessageEvent("message", { data: "signed-out" }));
    channel.onmessage?.(new MessageEvent("message", { data: "signed-out" }));
    window.dispatchEvent(new Event("auth:expired"));

    expect(replace).toHaveBeenCalledOnce();
    expect(cancelQueries).toHaveBeenCalledOnce();
    expect(broadcast).not.toHaveBeenCalled();
  });

  it("does not restore an ended session when the browser regains focus during navigation", () => {
    useAuthSyncAcrossTabs();
    window.dispatchEvent(new Event("auth:expired"));
    window.dispatchEvent(new Event("focus"));

    // One initial restore, followed by clearing Redux. Focus must not dispatch another restore.
    expect(dispatch).toHaveBeenCalledTimes(2);
  });

  it("ignores a late session restore that would otherwise redirect away from logout", async () => {
    useAuthSyncAcrossTabs();
    window.dispatchEvent(new Event("auth:expired"));
    pending.resolve({ type: restoreSession.fulfilled.type, payload: { user: { onboarded: false } } });
    await pending.promise;

    expect(routerReplace).not.toHaveBeenCalled();
    expect(routerRefresh).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledExactlyOnceWith("/auth/login");
  });
});
