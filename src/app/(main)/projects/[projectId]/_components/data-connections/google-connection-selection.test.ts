import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/types/api";

import { saveGoogleSelection } from "./google-connection-selection";

const { create, getList } = vi.hoisted(() => ({ create: vi.fn(), getList: vi.fn() }));
vi.mock("@/lib/api/services/fetch-data-connections", () => ({ fetchDataConnections: { create, getList } }));

describe("saving a source picked outside the import flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    create.mockResolvedValue({ data: { id: "saved-connection" } });
    getList.mockResolvedValue({ data: [], meta: { pagination: null } });
  });

  it.each(["google_sheets", "google_drive"] as const)(
    "saves %s using the selected ID and existing grant",
    async (kind) => {
      await expect(
        saveGoogleSelection("project", kind, "grant", { id: "selected-id", name: " Study " }),
      ).resolves.toEqual({
        id: "saved-connection",
      });
      expect(create).toHaveBeenCalledExactlyOnceWith("project", {
        name: "Study",
        kind,
        config: kind === "google_sheets" ? { spreadsheet: "selected-id" } : { folder: "selected-id" },
        grant_id: "grant",
      });
    },
  );

  it("uses the next available name without asking for Google consent again", async () => {
    create.mockRejectedValueOnce(new ApiError(409, "CONNECTION_NAME_EXISTS", "Already exists."));
    getList.mockResolvedValue({ data: [{ name: "Study" }, { name: "Study (2)" }], meta: { pagination: null } });
    await saveGoogleSelection("project", "google_sheets", "grant", { id: "sheet", name: "Study" });
    expect(create).toHaveBeenLastCalledWith("project", {
      name: "Study (3)",
      kind: "google_sheets",
      config: { spreadsheet: "sheet" },
      grant_id: "grant",
    });
  });

  it("does not replay a failed creation unless the server rejected a duplicate name", async () => {
    const error = new ApiError(0, "NETWORK_ERROR", "Connection lost.");
    create.mockRejectedValueOnce(error);
    await expect(saveGoogleSelection("project", "google_drive", "grant", { id: "folder", name: "Study" })).rejects.toBe(
      error,
    );
    expect(create).toHaveBeenCalledOnce();
    expect(getList).not.toHaveBeenCalled();
  });
});
