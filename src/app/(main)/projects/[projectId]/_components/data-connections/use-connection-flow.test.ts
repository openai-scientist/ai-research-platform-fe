import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ConnectionItem } from "@/lib/api/services/fetch-data-connections";
import { ApiError } from "@/types/api";

import type { GoogleConnectionResume } from "./google-connection-state";
import { useConnectionFlow } from "./use-connection-flow";

const { effects, updates, create, getSchemas, getTables, invalidate, showError, access } = vi.hoisted(() => ({
  effects: [] as (() => void)[],
  updates: [] as { initial: unknown; set: ReturnType<typeof vi.fn> }[],
  create: vi.fn(),
  getSchemas: vi.fn(),
  getTables: vi.fn(),
  invalidate: vi.fn(),
  showError: vi.fn(),
  access: vi.fn(),
}));

vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useState: (initial: unknown) => {
    const value = typeof initial === "function" ? initial() : initial;
    const set = vi.fn();
    updates.push({ initial: value, set });
    return [value, set];
  },
  useRef: (current: unknown) => ({ current }),
  useMemo: (compute: () => unknown) => compute(),
  useCallback: (callback: unknown) => callback,
  useEffect: (setup: () => void) => effects.push(setup),
}));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries: invalidate }) }));
vi.mock("@/hooks/use-data-connections", () => ({ useConnectionAccess: access, showConnectionError: showError }));
vi.mock("@/lib/api/services/fetch-data-connections", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/services/fetch-data-connections")>()),
  fetchDataConnections: { create, getSchemas, getTables },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

describe("resuming Google connection creation", () => {
  const grantId = "b923cabc-0754-4384-88d5-151c9af46788";
  const resume: GoogleConnectionResume = { kind: "google_drive", name: "Study", target: "folder-id", grantId };
  const saved = {
    id: "connection-id",
    name: "Study",
    kind: "google_drive",
    config: {},
    last_error_code: null,
  } as ConnectionItem;

  function useRenderConnectionFlow(value: GoogleConnectionResume | undefined = resume, canWrite = true) {
    return useConnectionFlow("project-id", undefined, vi.fn(), canWrite, "user-id", true, value);
  }

  beforeEach(() => {
    vi.clearAllMocks();
    effects.length = 0;
    updates.length = 0;
    access.mockReturnValue({ configured: true, rateLimited: false, waitSeconds: 0, revokedConnectionIds: new Set() });
    create.mockResolvedValue({ data: saved });
    getSchemas.mockResolvedValue({ data: ["Spreadsheet"] });
    getTables.mockResolvedValue({ data: [] });
    invalidate.mockResolvedValue(undefined);
  });

  it.each(["google_drive", "google_sheets"] as const)(
    "creates %s once after consent, then advances and loads sources even if effects replay",
    async (kind) => {
      create.mockResolvedValue({ data: { ...saved, kind } });
      useRenderConnectionFlow({ ...resume, kind });
      for (const setup of effects) setup();
      for (const setup of effects) setup();
      await vi.waitFor(() => expect(getTables).toHaveBeenCalledOnce());
      expect(create).toHaveBeenCalledExactlyOnceWith("project-id", {
        name: "Study",
        kind,
        config: kind === "google_drive" ? { folder: "folder-id" } : { spreadsheet: "folder-id" },
        grant_id: grantId,
      });
      expect(updates[0].set).toHaveBeenCalledWith(2);
    },
  );

  it("keeps a rejected form's grant and retries only on an explicit action", async () => {
    const error = new ApiError(409, "CONNECTION_NAME_EXISTS", "Connection name already exists.");
    create.mockRejectedValueOnce(error);
    const flow = useRenderConnectionFlow();
    for (const setup of effects) setup();
    await vi.waitFor(() => expect(showError).toHaveBeenCalledWith(error, "project-id"));
    for (const setup of effects) setup();
    expect(create).toHaveBeenCalledOnce();
    expect(updates.find((state) => state.initial === grantId)?.set).not.toHaveBeenCalled();
    expect(updates[0].set).not.toHaveBeenCalledWith(2);
    await flow.connect();
    expect(create).toHaveBeenCalledTimes(2);
    expect(create.mock.calls[1][1].grant_id).toBe(grantId);
  });

  it("discards an expired grant and leaves the form open to authorize again", async () => {
    const error = new ApiError(422, "GOOGLE_GRANT_INVALID", "Reconnect your Google account.");
    create.mockRejectedValueOnce(error);
    useRenderConnectionFlow();
    for (const setup of effects) setup();
    await vi.waitFor(() => expect(showError).toHaveBeenCalled());
    expect(updates.find((state) => state.initial === grantId)?.set).toHaveBeenCalledWith(undefined);
    expect(updates[0].set).not.toHaveBeenCalledWith(2);
  });

  it.each([
    { callback: { ...resume, grantId: undefined }, canWrite: true },
    { callback: resume, canWrite: false },
  ])("does not create without a grant or contributor access: $canWrite", ({ callback, canWrite }) => {
    useRenderConnectionFlow(callback, canWrite);
    for (const setup of effects) setup();
    expect(create).not.toHaveBeenCalled();
  });

  it("waits when Retry-After is active", () => {
    access.mockReturnValue({ configured: true, rateLimited: true, waitSeconds: 30, revokedConnectionIds: new Set() });
    useRenderConnectionFlow();
    for (const setup of effects) setup();
    expect(create).not.toHaveBeenCalled();
  });

  it.each([
    { name: "", target: "folder-id", message: "Connection name must contain 2 to 120 characters." },
    { name: "Study", target: "", message: "Provide a Google URL or ID containing at most 2,048 characters." },
  ])("validates the form before leaving for Google: $message", async ({ name, target, message }) => {
    const flow = useRenderConnectionFlow({ ...resume, name, target, grantId: undefined });
    await flow.authorizeGoogle();
    expect(showError).toHaveBeenCalledWith(expect.objectContaining({ message }), "project-id");
    expect(create).not.toHaveBeenCalled();
  });
});
