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
  elsewhere: vi.fn(),
  begin: vi.fn(),
  credentials: vi.fn(),
  pick: vi.fn(),
  save: vi.fn(),
  keep: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
  invalidate: vi.fn(),
  error: vi.fn(),
  created: vi.fn(),
  reauth: vi.fn(),
  push: vi.fn(),
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
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries: mocks.invalidate }) }));
vi.mock("@/hooks/use-data-connections", () => ({
  useConnectionAccess: () => ({ configured: true, rateLimited: false }),
  showConnectionError: mocks.error,
}));
vi.mock("@/lib/api/services/fetch-data-connections", () => ({
  fetchDataConnections: { getAccountPicker: mocks.credentials, reauthorize: mocks.reauth },
}));
vi.mock("./google-picker", () => ({ openGooglePicker: mocks.pick }));
vi.mock("./google-connection-selection", () => ({
  saveGoogleAccount: mocks.keep,
  saveGoogleFile: mocks.save,
  forgetRevokedFiles: vi.fn(),
}));
vi.mock("./google-connection-state", () => ({
  beginGoogleConnection: mocks.begin,
  consumeGoogleConnectionCallback: mocks.callback,
  googleCallbackElsewhere: mocks.elsewhere,
  takeGoogleConnectionIntent: mocks.intent,
  googleConnectionCallbackMessage: () => "Google authorization failed.",
}));
vi.mock("sonner", () => ({ toast: mocks.toast }));

const account = {
  id: "account-id",
  kind: "google",
  name: "Google account",
  config: { account_email: "dat@example.com" },
} as unknown as ConnectionItem;

// The page using the hook; most tests leave it to its default.
let page: "connections" | "datasets" | undefined;

function CallbackHarness(saved?: ConnectionItem) {
  mocks.cursor = 0;
  mocks.effects.length = 0;
  const result = useGoogleConnectionCallback("project", "user", true, saved, mocks.created, page);
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
  CallbackHarness(); // The callback records the grant; it does not save anything yet.
  const first = CallbackHarness();
  first.cleanup(); // Strict Mode discards the first setup before its deferred work starts.
  const active = CallbackHarness();
  await vi.runOnlyPendingTimersAsync();
  return active;
}

describe("picking Google files with the member's saved account", () => {
  const selected = { id: "sheet-id", name: "Study" };
  const connection = { id: "connection-id", kind: "google_sheets", name: "Study" } as ConnectionItem;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mocks.slots.length = 0;
    mocks.callback.mockReturnValueOnce({ grantId: "grant", error: null }).mockReturnValue(null);
    mocks.intent.mockReturnValue({ action: "create", kind: "google_sheets" });
    mocks.keep.mockResolvedValue({ connection: account, reused: false });
    mocks.credentials.mockResolvedValue({ data: { access_token: "temporary", api_key: "key", app_id: "123" } });
    mocks.pick.mockResolvedValue(null);
    mocks.save.mockResolvedValue({ connection, reused: false });
    mocks.invalidate.mockResolvedValue(undefined);
  });
  afterEach(() => vi.useRealTimers());

  it("keeps the account from the first sign-in, then opens Google Picker with it", async () => {
    let choose!: (selection: typeof selected) => void;
    mocks.pick.mockImplementation(
      () =>
        new Promise((resolve) => {
          choose = resolve;
        }),
    );
    await resumeConsent();
    expect(mocks.keep).toHaveBeenCalledExactlyOnceWith("project", "grant");
    expect(mocks.credentials).toHaveBeenCalledWith("project", "account-id", expect.any(AbortSignal));
    expect(mocks.save).not.toHaveBeenCalled();
    choose(selected);
    await vi.runOnlyPendingTimersAsync();
    expect(mocks.save).toHaveBeenCalledExactlyOnceWith("project", "google_sheets", "account-id", selected);
    expect(mocks.created).toHaveBeenCalledExactlyOnceWith({ connection, reused: false });
    expect(mocks.begin).not.toHaveBeenCalled();
  });

  it("opens Google Picker again without signing in once the account is saved", async () => {
    mocks.callback.mockReset().mockReturnValue(null);
    await CallbackHarness(account).result.startCreate("google_drive");
    await vi.runOnlyPendingTimersAsync();
    expect(mocks.begin).not.toHaveBeenCalled();
    expect(mocks.keep).not.toHaveBeenCalled();
    expect(mocks.pick).toHaveBeenCalledWith(
      "google_drive",
      expect.anything(),
      expect.any(AbortSignal),
      expect.any(Function),
    );
  });

  it("signs in first when the member has no Google account here", () => {
    mocks.callback.mockReset().mockReturnValue(null);
    CallbackHarness().result.startCreate("google_sheets");
    expect(mocks.begin).toHaveBeenCalledExactlyOnceWith("project", "user", {
      action: "create",
      kind: "google_sheets",
      returnTo: "connections",
    });
  });

  it("comes back to the Datasets page after signing in from there", () => {
    mocks.callback.mockReset().mockReturnValue(null);
    page = "datasets";
    CallbackHarness().result.startCreate("google_drive");
    page = undefined;
    expect(mocks.begin).toHaveBeenCalledWith("project", "user", expect.objectContaining({ returnTo: "datasets" }));
  });

  it("goes back to the page Reconnect was pressed on once the access is renewed", async () => {
    vi.stubGlobal("window", { location: { pathname: "/projects/project/connections" } });
    mocks.reauth.mockResolvedValue({ data: {} });
    for (const returnTo of ["/projects/project/datasets/dataset-id", "/projects/elsewhere/datasets"]) {
      mocks.slots.length = 0;
      mocks.push.mockClear();
      mocks.callback.mockReset().mockReturnValueOnce({ grantId: "grant", error: null }).mockReturnValue(null);
      mocks.intent.mockReturnValue({
        action: "reauthorize",
        connectionId: "connection-id",
        accountEmail: "dat@example.com",
        returnTo,
      });
      CallbackHarness();
      await vi.runOnlyPendingTimersAsync();
      expect(mocks.reauth).toHaveBeenLastCalledWith("project", "connection-id", "grant");
      // Only within the same project.
      if (returnTo.startsWith("/projects/project/")) expect(mocks.push).toHaveBeenCalledWith(returnTo);
      else expect(mocks.push).not.toHaveBeenCalled();
    }
    vi.unstubAllGlobals();
  });

  it("passes Google's answer on to the page that asked, without using it here", async () => {
    const replace = vi.fn();
    vi.stubGlobal("window", { location: { replace } });
    mocks.elsewhere.mockReturnValueOnce("/projects/project/datasets?google_grant=grant");
    CallbackHarness();
    await vi.runOnlyPendingTimersAsync();
    expect(replace).toHaveBeenCalledExactlyOnceWith("/projects/project/datasets?google_grant=grant");
    expect(mocks.callback).not.toHaveBeenCalled();
    expect(mocks.intent).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("asks to sign in again when the saved access was revoked", async () => {
    mocks.callback.mockReset().mockReturnValue(null);
    mocks.credentials.mockRejectedValueOnce(
      new ApiError(
        422,
        "CONNECTION_FAILED",
        "Google no longer accepts the stored access.",
        [],
        null,
        null,
        "access_revoked",
      ),
    );
    await CallbackHarness(account).result.startCreate("google_sheets");
    await vi.runOnlyPendingTimersAsync();
    expect(mocks.error).not.toHaveBeenCalled();
    expect(mocks.toast.error).toHaveBeenCalledWith("Your Google access has expired", expect.anything());
    expect(mocks.created).not.toHaveBeenCalled();
  });

  it("keeps the dialog closed when saving the picked file fails", async () => {
    const error = new ApiError(422, "CONNECTION_FAILED", "The source cannot be read.");
    mocks.pick.mockResolvedValue(selected);
    mocks.save.mockRejectedValueOnce(error);
    await resumeConsent();
    expect(mocks.error).toHaveBeenCalledWith(error, "project");
    expect(mocks.created).not.toHaveBeenCalled();
  });
});
