import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ConnectionItem } from "@/lib/api/services/fetch-data-connections";
import { ApiError } from "@/types/api";

import type { GoogleConnectionResume } from "./google-connection-state";
import { useConnectionFlow } from "./use-connection-flow";

const {
  effects,
  updates,
  create,
  getSchemas,
  getTables,
  getList,
  getGooglePicker,
  openPicker,
  beginGoogle,
  invalidate,
  showError,
  access,
} = vi.hoisted(() => ({
  effects: [] as (() => void)[],
  updates: [] as { initial: unknown; set: ReturnType<typeof vi.fn> }[],
  create: vi.fn(),
  getSchemas: vi.fn(),
  getTables: vi.fn(),
  getList: vi.fn(),
  getGooglePicker: vi.fn(),
  openPicker: vi.fn(),
  beginGoogle: vi.fn(),
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
  fetchDataConnections: { create, getSchemas, getTables, getList, getGooglePicker },
}));
vi.mock("./google-picker", () => ({ openGooglePicker: openPicker }));
vi.mock("./google-connection-state", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./google-connection-state")>()),
  beginGoogleConnection: beginGoogle,
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

  function useRenderConnectionFlow(value: GoogleConnectionResume | null = resume, canWrite = true) {
    return useConnectionFlow("project-id", undefined, vi.fn(), canWrite, "user-id", true, value ?? undefined);
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
    getGooglePicker.mockResolvedValue({ data: { access_token: "short-lived", api_key: "key", app_id: "123" } });
    openPicker.mockResolvedValue({ id: "folder-id", name: "Study" });
    getList.mockResolvedValue({ data: [], meta: { pagination: null } });
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

  it("keeps a rejected source's grant and retries only on an explicit action", async () => {
    const error = new ApiError(422, "CONNECTION_FAILED", "This source cannot be read.");
    create.mockRejectedValueOnce(error);
    const flow = useRenderConnectionFlow();
    for (const setup of effects) setup();
    await vi.waitFor(() => expect(showError).toHaveBeenCalledWith(error, "project-id"));
    for (const setup of effects) setup();
    expect(create).toHaveBeenCalledOnce();
    expect(updates.find((state) => state.initial === grantId)?.set).not.toHaveBeenCalled();
    expect(updates[0].set).not.toHaveBeenCalledWith(2);
    await flow.chooseGoogleSource();
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

  it("allows consent before a source is chosen and restores the draft afterwards", async () => {
    const flow = useRenderConnectionFlow({ ...resume, name: "", target: "", grantId: undefined });
    await flow.authorizeGoogle();
    expect(beginGoogle).toHaveBeenCalledWith("project-id", "user-id", {
      action: "create",
      draft: { kind: "google_drive", name: "", target: "" },
    });
    expect(showError).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("opens the picker once after consent without submitting an empty source", async () => {
    openPicker.mockResolvedValue(null);
    useRenderConnectionFlow({ ...resume, target: "" });
    for (const setup of effects) setup();
    for (const setup of effects) setup();
    await vi.waitFor(() => expect(openPicker).toHaveBeenCalledOnce());
    expect(getGooglePicker).toHaveBeenCalledWith("project-id", grantId, expect.any(AbortSignal));
    expect(create).not.toHaveBeenCalled();
    expect(showError).not.toHaveBeenCalled();
  });

  it("creates the connection with the selected source's name and ID, ignoring an old draft name", async () => {
    openPicker.mockResolvedValue({ id: "selected-folder", name: "Study files" });
    const flow = useRenderConnectionFlow({ ...resume, name: "Old connection name", target: "" });
    await flow.chooseGoogleSource();
    expect(create).toHaveBeenCalledWith("project-id", {
      name: "Study files",
      kind: "google_drive",
      config: { folder: "selected-folder" },
      grant_id: grantId,
    });
    expect(updates[0].set).toHaveBeenCalledWith(2);
  });

  it("keeps the previous source when the picker is cancelled", async () => {
    openPicker.mockResolvedValue(null);
    const flow = useRenderConnectionFlow();
    await flow.chooseGoogleSource();
    expect(updates.find((state) => state.initial === flow.draft)?.set).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it.each(["google_drive", "google_sheets"] as const)(
    "starts %s authorization directly from provider selection without showing the details step",
    async (kind) => {
      const flow = useRenderConnectionFlow(null);
      flow.chooseKind(kind);
      await vi.waitFor(() => expect(beginGoogle).toHaveBeenCalled());
      expect(beginGoogle).toHaveBeenCalledWith("project-id", "user-id", {
        action: "create",
        draft: { kind, name: "", target: "" },
      });
      expect(updates[0].set).not.toHaveBeenCalledWith(1);
    },
  );

  it("adds the next available suffix when the source name already exists", async () => {
    create.mockRejectedValueOnce(new ApiError(409, "CONNECTION_NAME_EXISTS", "Already exists."));
    getList.mockResolvedValue({
      data: [{ name: "Study" }, { name: "Study (2)" }],
      meta: { pagination: null },
    });
    const flow = useRenderConnectionFlow();
    await flow.chooseGoogleSource();
    expect(create.mock.calls[1][1]).toMatchObject({ name: "Study (3)", grant_id: grantId });
    expect(showError).not.toHaveBeenCalled();
    expect(updates[0].set).toHaveBeenCalledWith(2);
  });

  it("keeps the details step for database providers", () => {
    const flow = useRenderConnectionFlow(null);
    flow.chooseKind("mysql");
    expect(updates[0].set).toHaveBeenCalledWith(1);
    expect(beginGoogle).not.toHaveBeenCalled();
  });
});
