import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchMembers } from "@/lib/api/services/fetch-members";
import { ApiError } from "@/types/api";

import { subscribeInviteCandidates } from "./invite-candidates";

class FakeSource {
  static CLOSED = 2;
  static instances: FakeSource[] = [];
  readyState = 1;
  onerror: (() => void) | null = null;
  close = vi.fn(() => {
    this.readyState = 2;
  });
  listeners = new Map<string, (event: { data: string }) => void>();
  constructor(
    public url: string,
    public options: EventSourceInit,
  ) {
    FakeSource.instances.push(this);
  }
  addEventListener(kind: string, listener: (event: { data: string }) => void) {
    this.listeners.set(kind, listener);
  }
  emit(kind: string, payload: unknown) {
    this.listeners.get(kind)?.({ data: JSON.stringify(payload) });
  }
}
const snapshot = {
  success: true as const,
  message: "OK",
  data: [{ id: "u", email: "u@example.com", display_name: null, avatar_url: null }],
  meta: { request_id: "stream", pagination: { total: 1, limit: 20, offset: 0 } },
};
function handlers() {
  return { onSnapshot: vi.fn(), onStatus: vi.fn(), onSessionEnded: vi.fn(), onAccessEnded: vi.fn(), onError: vi.fn() };
}
describe("invite candidate SSE lifecycle", () => {
  afterEach(() => vi.useRealTimers());
  beforeEach(() => {
    FakeSource.instances = [];
    vi.stubGlobal("EventSource", FakeSource);
    vi.stubGlobal("window", { location: { origin: "https://frontend.test" } });
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://backend.test/api/v1");
  });
  it("uses credentials and replaces each paginated snapshot without appending", () => {
    const listener = handlers();
    const stop = subscribeInviteCandidates("project/1", { q: "ngo dat", limit: 20, offset: 40 }, listener);
    const source = FakeSource.instances[0];
    const url = new URL(source.url);
    expect(url.pathname).toBe("/api/v1/projects/project%2F1/invite-candidates/stream");
    expect(url.searchParams.get("q")).toBe("ngo dat");
    expect(url.searchParams.get("offset")).toBe("40");
    expect(source.options.withCredentials).toBe(true);
    source.emit("invite-candidates", snapshot);
    source.emit("invite-candidates", {
      ...snapshot,
      data: [],
      meta: { ...snapshot.meta, pagination: { total: 0, limit: 20, offset: 40 } },
    });
    expect(listener.onSnapshot).toHaveBeenCalledTimes(2);
    expect(listener.onSnapshot.mock.lastCall?.[0].data).toEqual([]);
    stop();
    source.emit("invite-candidates", snapshot);
    expect(listener.onSnapshot).toHaveBeenCalledTimes(2);
    expect(source.close).toHaveBeenCalled();
  });
  it.each(["session-ended", "access-ended"])("closes on %s and ignores later snapshots", (kind) => {
    const listener = handlers();
    subscribeInviteCandidates("p", {}, listener);
    const source = FakeSource.instances[0];
    source.emit(kind, { code: "ROLE_REQUIRED" });
    expect(source.close).toHaveBeenCalledOnce();
    expect(kind === "session-ended" ? listener.onSessionEnded : listener.onAccessEnded).toHaveBeenCalledWith(
      "ROLE_REQUIRED",
    );
    source.emit("invite-candidates", snapshot);
    expect(listener.onSnapshot).not.toHaveBeenCalled();
  });
  it("diagnoses a repeated connection error once without polling and retains GET data", async () => {
    const get = vi.spyOn(fetchMembers, "getInviteCandidates").mockResolvedValue(snapshot);
    const listener = handlers();
    const stop = subscribeInviteCandidates("p", {}, listener);
    const source = FakeSource.instances[0];
    source.onerror?.();
    source.onerror?.();
    await vi.waitFor(() => expect(listener.onSnapshot).toHaveBeenCalled());
    source.onerror?.();
    expect(get).toHaveBeenCalledOnce();
    stop();
  });
  it("ends access when the one-off diagnostic GET confirms lost permission", async () => {
    vi.spyOn(fetchMembers, "getInviteCandidates").mockRejectedValue(
      new ApiError(403, "ROLE_REQUIRED", "PM access required"),
    );
    const listener = handlers();
    subscribeInviteCandidates("p", {}, listener);
    FakeSource.instances[0].onerror?.();
    await vi.waitFor(() => expect(listener.onAccessEnded).toHaveBeenCalledWith("ROLE_REQUIRED"));
    expect(FakeSource.instances[0].close).toHaveBeenCalledOnce();
  });
  it("ignores a diagnostic result that arrives after cleanup", async () => {
    const deferred = Promise.withResolvers<typeof snapshot>();
    const get = vi.spyOn(fetchMembers, "getInviteCandidates").mockReturnValue(deferred.promise);
    const listener = handlers();
    const stop = subscribeInviteCandidates("p", {}, listener);
    FakeSource.instances[0].onerror?.();
    const signal = get.mock.calls[0][2];
    stop();
    expect(signal?.aborted).toBe(true);
    deferred.resolve(snapshot);
    await deferred.promise;
    expect(listener.onSnapshot).not.toHaveBeenCalled();
  });
  it("does not overwrite a newer SSE snapshot with a late diagnostic GET", async () => {
    const deferred = Promise.withResolvers<typeof snapshot>();
    vi.spyOn(fetchMembers, "getInviteCandidates").mockReturnValue(deferred.promise);
    const listener = handlers();
    const stop = subscribeInviteCandidates("p", {}, listener);
    const source = FakeSource.instances[0];
    source.onerror?.();
    source.emit("invite-candidates", {
      ...snapshot,
      data: [],
      meta: { ...snapshot.meta, pagination: { total: 0, limit: 20, offset: 0 } },
    });
    deferred.resolve(snapshot);
    await deferred.promise;
    expect(listener.onSnapshot).toHaveBeenCalledOnce();
    expect(listener.onSnapshot.mock.lastCall?.[0].data).toEqual([]);
    stop();
  });
  it("honors Retry-After before reopening a rate-limited stream", async () => {
    vi.useFakeTimers();
    const get = vi
      .spyOn(fetchMembers, "getInviteCandidates")
      .mockRejectedValue(new ApiError(429, "RATE_LIMITED", "Wait", [], null, 30));
    const listener = handlers();
    const stop = subscribeInviteCandidates("p", {}, listener);
    FakeSource.instances[0].onerror?.();
    await vi.advanceTimersByTimeAsync(29000);
    expect(FakeSource.instances).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(FakeSource.instances).toHaveLength(2);
    expect(get).toHaveBeenCalledOnce();
    stop();
  });
});
