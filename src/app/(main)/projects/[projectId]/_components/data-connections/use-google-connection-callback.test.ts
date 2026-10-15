import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ConnectionItem } from "@/lib/api/services/fetch-data-connections";
import { ApiError } from "@/types/api";

import { useGoogleConnectionCallback } from "./use-google-connection-callback";

const mocks = vi.hoisted(() => ({
  slots: [] as unknown[],
  cursor: 0,
  effects: [] as (() => undefined | (() => void))[],
  callback: vi.fn(),
  intent: vi.fn(),
  begin: vi.fn(),
  credentials: vi.fn(),
  pick: vi.fn(),
  save: vi.fn(),
  invalidate: vi.fn(),
  error: vi.fn(),
  created: vi.fn(),
}));

vi.mock("react", () => ({
  useState: (initial: unknown) => {
    const index = mocks.cursor++;
    if (!(index in mocks.slots)) mocks.slots[index] = initial;
    return [
      mocks.slots[index],
      (value: unknown) => {
        mocks.slots[index] = value;
      },
    ];
  },
  useRef: (initial: unknown) => {
    const index = mocks.cursor++;
    if (!(index in mocks.slots)) mocks.slots[index] = { current: initial };
    return mocks.slots[index];
  },
  useEffect: (setup: () => undefined | (() => void)) => mocks.effects.push(setup),
  useCallback: (callback: unknown) => callback,
}));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries: mocks.invalidate }) }));
vi.mock("@/hooks/use-data-connections", () => ({
  useConnectionAccess: () => ({ configured: true, rateLimited: false }),
  showConnectionError: mocks.error,
}));
vi.mock("@/lib/api/services/fetch-data-connections", () => ({
  fetchDataConnections: { getGooglePicker: mocks.credentials },
}));
vi.mock("./google-picker", () => ({ openGooglePicker: mocks.pick }));
vi.mock("./google-connection-selection", () => ({ saveGoogleSelection: mocks.save }));
vi.mock("./google-connection-state", () => ({
  beginGoogleConnection: mocks.begin,
  consumeGoogleConnectionCallback: mocks.callback,
  takeGoogleConnectionIntent: mocks.intent,
  googleConnectionCallbackMessage: () => "Google authorization failed.",
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function CallbackHarness() {
  mocks.cursor = 0;
  mocks.effects.length = 0;
  const result = useGoogleConnectionCallback("project", "user", true, mocks.created);
  const cleanups = mocks.effects.map((setup) => setup());
  return {
    result,
    cleanup: () => {
      cleanups.forEach((cleanup) => {
        cleanup?.();
      });
    },
  };
}

async function resumeConsent() {
  CallbackHarness(); // The callback records the grant; it does not open the import flow.
  const first = CallbackHarness();
  first.cleanup(); // Strict Mode discards the first setup before its deferred picker opens.
  const active = CallbackHarness();
  await vi.runOnlyPendingTimersAsync();
  return active;
}

describe("choosing a Google file before entering the import flow", () => {
  const selected = { id: "sheet-id", name: "Study" };
  const connection = { id: "connection-id", kind: "google_sheets", name: "Study" } as ConnectionItem;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mocks.slots.length = 0;
    mocks.callback.mockReturnValueOnce({ grantId: "grant", error: null }).mockReturnValue(null);
    mocks.intent.mockReturnValue({ action: "create", draft: { kind: "google_sheets", name: "", target: "" } });
    mocks.credentials.mockResolvedValue({ data: { access_token: "temporary", api_key: "key", app_id: "123" } });
    mocks.pick.mockResolvedValue(null);
    mocks.save.mockResolvedValue(connection);
    mocks.invalidate.mockResolvedValue(undefined);
  });
  afterEach(() => vi.useRealTimers());

  it("waits for Google selection and a saved connection before opening the flow", async () => {
    let choose!: (selection: typeof selected) => void;
    mocks.pick.mockImplementation(
      () =>
        new Promise((resolve) => {
          choose = resolve;
        }),
    );
    await resumeConsent();
    expect(mocks.pick).toHaveBeenCalledOnce();
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.created).not.toHaveBeenCalled();
    choose(selected);
    await vi.runOnlyPendingTimersAsync();
    expect(mocks.save).toHaveBeenCalledExactlyOnceWith("project", "google_sheets", "grant", selected);
    expect(mocks.created).toHaveBeenCalledExactlyOnceWith(connection);
    expect(mocks.begin).not.toHaveBeenCalled();
  });

  it("stays outside on cancel and reuses the grant when the provider is clicked again", async () => {
    await resumeConsent();
    expect(mocks.created).not.toHaveBeenCalled();
    expect(mocks.save).not.toHaveBeenCalled();
    await CallbackHarness().result.startCreate("google_sheets");
    await vi.runOnlyPendingTimersAsync();
    expect(mocks.pick).toHaveBeenCalledTimes(2);
    expect(mocks.begin).not.toHaveBeenCalled();
    expect(mocks.created).not.toHaveBeenCalled();
  });

  it("keeps the import flow closed when saving the selected file fails", async () => {
    const error = new ApiError(422, "CONNECTION_FAILED", "The source cannot be read.");
    mocks.pick.mockResolvedValue(selected);
    mocks.save.mockRejectedValueOnce(error);
    await resumeConsent();
    expect(mocks.error).toHaveBeenCalledWith(error, "project");
    expect(mocks.created).not.toHaveBeenCalled();
    expect(mocks.begin).not.toHaveBeenCalled();
  });

  it("requires consent again only when the previous grant has expired", async () => {
    mocks.credentials.mockRejectedValueOnce(new ApiError(422, "GOOGLE_GRANT_INVALID", "Expired grant."));
    await resumeConsent();
    CallbackHarness().result.startCreate("google_sheets");
    expect(mocks.begin).toHaveBeenCalledExactlyOnceWith("project", "user", {
      action: "create",
      draft: { kind: "google_sheets", name: "", target: "" },
    });
    expect(mocks.created).not.toHaveBeenCalled();
  });
});
