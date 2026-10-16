import { beforeEach, describe, expect, it, vi } from "vitest";

import { saveGoogleAccount, saveGoogleFile } from "./google-connection-selection";

const { create, getList, clear } = vi.hoisted(() => ({ create: vi.fn(), getList: vi.fn(), clear: vi.fn() }));
vi.mock("@/lib/api/services/fetch-data-connections", () => ({ fetchDataConnections: { create, getList } }));
vi.mock("@/lib/api/connection-runtime", () => ({ clearConnectionRevocation: clear }));

const listed = (data: object[]) => getList.mockResolvedValue({ data, meta: { pagination: null } });

describe("keeping the member's Google account", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    create.mockResolvedValue({ data: { id: "account" } });
  });

  it("creates it from the grant alone", async () => {
    listed([]);
    await expect(saveGoogleAccount("project", "grant")).resolves.toEqual({
      connection: { id: "account" },
      reused: false,
    });
    expect(create).toHaveBeenCalledExactlyOnceWith("project", { kind: "google", grant_id: "grant" });
  });

  it("forgets that the files picked with the same account lost access, and no others", async () => {
    create.mockResolvedValue({
      data: { id: "account", kind: "google", created_by_user_id: "me", config: { google_subject: "sub" } },
    });
    const file = (id: string, created_by_user_id: string, google_subject: string, kind = "google_sheets") => ({
      id,
      kind,
      created_by_user_id,
      config: { google_subject },
    });
    listed([
      file("mine", "me", "sub"),
      file("my-folder", "me", "sub", "google_drive"),
      file("other-account", "me", "sub-2"),
      file("theirs", "them", "sub"),
      file("database", "me", "sub", "postgres"),
    ]);
    await saveGoogleAccount("project", "grant");
    expect(clear.mock.calls).toEqual([
      ["project", "mine"],
      ["project", "my-folder"],
    ]);
  });

  it("says so when the same account renewed the one already saved", async () => {
    listed([{ id: "account", kind: "google", name: "Google account", config: {} }]);
    await expect(saveGoogleAccount("project", "grant")).resolves.toEqual({
      connection: { id: "account" },
      reused: true,
    });
  });
});

describe("saving a spreadsheet or folder picked with the account", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    create.mockResolvedValue({ data: { id: "saved-connection" } });
    listed([]);
  });

  it.each(["google_sheets", "google_drive"] as const)("saves %s with the account's access", async (kind) => {
    await expect(saveGoogleFile("project", kind, "account", { id: "selected-id", name: " Study " })).resolves.toEqual({
      connection: { id: "saved-connection" },
      reused: false,
    });
    expect(create).toHaveBeenCalledExactlyOnceWith("project", {
      name: "Study",
      kind,
      config: kind === "google_sheets" ? { spreadsheet: "selected-id" } : { folder: "selected-id" },
      account_id: "account",
    });
  });

  it("uses the next available name when another file has the same name", async () => {
    listed([
      { id: "a", kind: "google_sheets", name: "Study", config: { spreadsheet_id: "other" } },
      { id: "b", kind: "google_sheets", name: "Study (2)", config: { spreadsheet_id: "another" } },
    ]);
    await saveGoogleFile("project", "google_sheets", "account", { id: "sheet", name: "Study" });
    expect(create).toHaveBeenLastCalledWith("project", expect.objectContaining({ name: "Study (3)" }));
  });

  it("returns the existing connection when the same file is picked again", async () => {
    const existing = { id: "a", kind: "google_sheets", name: "Study", config: { spreadsheet_id: "sheet" } };
    listed([existing]);
    await expect(
      saveGoogleFile("project", "google_sheets", "account", { id: "sheet", name: "Study" }),
    ).resolves.toEqual({ connection: existing, reused: true });
    expect(create).not.toHaveBeenCalled();
  });

  it("adds a new connection when the one to that file lost its Google access", async () => {
    listed([
      {
        id: "a",
        kind: "google_sheets",
        name: "Study",
        config: { spreadsheet_id: "sheet" },
        last_error_code: "access_revoked",
      },
    ]);
    await saveGoogleFile("project", "google_sheets", "account", { id: "sheet", name: "Study" });
    expect(create).toHaveBeenCalledWith("project", expect.objectContaining({ name: "Study (2)" }));
  });

  it("does not match a folder against a spreadsheet with the same ID", async () => {
    listed([{ id: "a", kind: "google_sheets", name: "Study", config: { spreadsheet_id: "same" } }]);
    await saveGoogleFile("project", "google_drive", "account", { id: "same", name: "Folder" });
    expect(create).toHaveBeenCalledOnce();
  });
});
