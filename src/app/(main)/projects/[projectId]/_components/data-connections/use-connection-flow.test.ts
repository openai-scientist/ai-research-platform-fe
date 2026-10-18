import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ConnectionItem } from "@/lib/api/services/fetch-data-connections";

import { useConnectionFlow } from "./use-connection-flow";

const { effects, updates, create, getSchemas, getTables, invalidate, showError, access, restoreDraft, toast } =
  vi.hoisted(() => ({
    effects: [] as (() => void)[],
    updates: [] as { initial: unknown; set: ReturnType<typeof vi.fn> }[],
    create: vi.fn(),
    getSchemas: vi.fn(),
    getTables: vi.fn(),
    invalidate: vi.fn(),
    showError: vi.fn(),
    access: vi.fn(),
    restoreDraft: vi.fn<(initial: unknown) => unknown>(),
    toast: { success: vi.fn() },
  }));

vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useState: (initial: unknown) => {
    const initialValue = typeof initial === "function" ? initial() : initial;
    const value =
      initialValue && typeof initialValue === "object" && "serviceAccountJson" in initialValue
        ? restoreDraft(initialValue)
        : initialValue;
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
vi.mock("sonner", () => ({ toast }));

describe("connecting a source and importing from it", () => {
  const saved = {
    id: "connection-id",
    name: "Rfam",
    kind: "mysql",
    config: {},
    last_error_code: null,
  } as ConnectionItem;

  beforeEach(() => {
    vi.clearAllMocks();
    effects.length = 0;
    updates.length = 0;
    restoreDraft.mockImplementation((value) => value);
    access.mockReturnValue({ configured: true, rateLimited: false, waitSeconds: 0, revokedConnectionIds: new Set() });
    create.mockResolvedValue({ data: saved });
    getSchemas.mockResolvedValue({ data: ["Rfam"] });
    getTables.mockResolvedValue({ data: [] });
    invalidate.mockResolvedValue(undefined);
  });

  it("fills URL and token missing from a draft preserved by Fast Refresh without losing input", () => {
    restoreDraft.mockImplementation((value) => {
      const previous = value as Record<string, unknown>;
      return Object.fromEntries(
        Object.entries({ ...previous, name: "My source", username: "reader" }).filter(
          ([key]) => key !== "url" && key !== "token",
        ),
      );
    });
    const flow = useConnectionFlow("project-id", undefined, vi.fn(), true, "postgres");
    expect(flow.draft.url.trim()).toBe("");
    expect(flow.draft.token).toBe("");
    expect(flow.draft.name).toBe("My source");
    expect(flow.draft.username).toBe("reader");
  });

  it("normalizes undefined time series fields and keeps populated credentials", () => {
    restoreDraft.mockImplementation((value) => ({ ...(value as object), url: undefined, token: undefined }));
    expect(useConnectionFlow("project-id", undefined, vi.fn(), true, "prometheus").draft).toMatchObject({
      url: "",
      token: "",
    });
    restoreDraft.mockImplementation((value) => ({
      ...(value as object),
      url: "https://metrics.example.com",
      token: "read-only-token",
    }));
    expect(useConnectionFlow("project-id", undefined, vi.fn(), true, "prometheus").draft).toMatchObject({
      url: "https://metrics.example.com",
      token: "read-only-token",
    });
  });

  it.each(["prometheus", "influxdb"] as const)("bypasses schema browsing for %s", async (kind) => {
    const flow = useConnectionFlow("project-id", { ...saved, kind }, vi.fn(), true);
    for (const setup of effects) setup();
    await vi.waitFor(() => expect(getTables).toHaveBeenCalledOnce());
    expect(getSchemas).not.toHaveBeenCalled();
    expect(getTables).toHaveBeenCalledWith("project-id", "connection-id", "default");
    expect(flow.isTimeSeries).toBe(true);
  });

  it("does not browse time series without contributor access", () => {
    useConnectionFlow("project-id", { ...saved, kind: "prometheus" }, vi.fn(), false);
    for (const setup of effects) setup();
    expect(getTables).not.toHaveBeenCalled();
    expect(getSchemas).not.toHaveBeenCalled();
  });

  it("opens a new provider on its details step and a saved connection on its source", () => {
    useConnectionFlow("project-id", undefined, vi.fn(), true, "mysql");
    expect(updates[0].initial).toBe(1);
    const start = updates.length;
    useConnectionFlow("project-id", saved, vi.fn(), true);
    expect(updates[start].initial).toBe(2);
  });

  it("goes on to choose a source once the connection is saved", async () => {
    restoreDraft.mockImplementation((value) => ({
      ...(value as object),
      name: "Rfam",
      host: "mysql-rfam-public.ebi.ac.uk",
      port: "4497",
      database: "Rfam",
      username: "rfamro",
    }));
    const flow = useConnectionFlow("project-id", undefined, vi.fn(), true, "mysql");
    await flow.connect();
    expect(create).toHaveBeenCalledOnce();
    expect(updates[0].set).toHaveBeenCalledWith(2);
    expect(toast.success).toHaveBeenCalledWith("Connection saved", { description: "Rfam" });
    expect(getSchemas).toHaveBeenCalledWith("project-id", "connection-id");
    expect(showError).not.toHaveBeenCalled();
  });

  it("goes on with the connection the project already has for the same source", async () => {
    restoreDraft.mockImplementation((value) => ({
      ...(value as object),
      name: "Rfam copy",
      host: "mysql-rfam-public.ebi.ac.uk",
      database: "Rfam",
      username: "rfamro",
    }));
    create.mockResolvedValue({ data: saved, reused: true });
    await useConnectionFlow("project-id", undefined, vi.fn(), true, "mysql").connect();
    expect(updates[0].set).toHaveBeenCalledWith(2);
    expect(toast.success).toHaveBeenCalledWith("Already connected", { description: "Rfam" });
  });

  it("waits when Retry-After is active", async () => {
    access.mockReturnValue({ configured: true, rateLimited: true, waitSeconds: 30, revokedConnectionIds: new Set() });
    await useConnectionFlow("project-id", undefined, vi.fn(), true, "mysql").connect();
    expect(create).not.toHaveBeenCalled();
  });
});
