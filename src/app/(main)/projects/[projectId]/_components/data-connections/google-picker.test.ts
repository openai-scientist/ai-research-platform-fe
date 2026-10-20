import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { openGooglePicker } from "./google-picker";

describe("Google Drive source selection", () => {
  let respond: (response: { action: string; docs?: { id: string; name: string; mimeType: string }[] }) => void;
  let visible: ReturnType<typeof vi.fn>;
  let dispose: ReturnType<typeof vi.fn>;
  let viewId: string;
  let foldersSelectable: boolean;

  class DocsView {
    constructor(id: string) {
      viewId = id;
    }
    setMode() {
      return this;
    }
    setMimeTypes() {
      return this;
    }
    setIncludeFolders() {
      return this;
    }
    setSelectFolderEnabled(enabled: boolean) {
      foldersSelectable = enabled;
      return this;
    }
  }

  class PickerBuilder {
    addView() {
      return this;
    }
    setOAuthToken() {
      return this;
    }
    setDeveloperKey() {
      return this;
    }
    setAppId() {
      return this;
    }
    setOrigin() {
      return this;
    }
    setLocale() {
      return this;
    }
    setTitle() {
      return this;
    }
    setSize() {
      return this;
    }
    setCallback(callback: typeof respond) {
      respond = callback;
      return this;
    }
    build() {
      return { setVisible: visible, dispose };
    }
  }

  beforeEach(() => {
    visible = vi.fn();
    dispose = vi.fn();
    foldersSelectable = false;
    vi.stubGlobal("window", {
      innerWidth: 1024,
      innerHeight: 768,
      location: { origin: "http://localhost:3000" },
      requestAnimationFrame: (callback: FrameRequestCallback) => {
        callback(0);
        return 1;
      },
      google: {
        picker: {
          Action: { PICKED: "picked", CANCEL: "cancel" },
          ViewId: { SPREADSHEETS: "spreadsheets", FOLDERS: "folders" },
          DocsViewMode: { LIST: "list" },
          DocsView,
          PickerBuilder,
        },
      },
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  const credentials = { access_token: "temporary-token", api_key: "public-key", app_id: "123" };

  it("returns the selected spreadsheet ID and disposes the Google dialog", async () => {
    const selection = openGooglePicker("google_sheets", credentials, new AbortController().signal, vi.fn());
    await vi.waitFor(() => expect(visible).toHaveBeenCalledWith(true));
    respond({
      action: "picked",
      docs: [{ id: "sheet-id", name: "Survey", mimeType: "application/vnd.google-apps.spreadsheet" }],
    });
    await expect(selection).resolves.toEqual({ id: "sheet-id", name: "Survey" });
    expect(dispose).toHaveBeenCalledOnce();
  });

  it("allows selecting a folder for Google Drive connections", async () => {
    const selection = openGooglePicker("google_drive", credentials, new AbortController().signal, vi.fn());
    await vi.waitFor(() => expect(visible).toHaveBeenCalled());
    expect(viewId).toBe("folders");
    expect(foldersSelectable).toBe(true);
    respond({
      action: "picked",
      docs: [{ id: "folder-id", name: "Research", mimeType: "application/vnd.google-apps.folder" }],
    });
    await expect(selection).resolves.toEqual({ id: "folder-id", name: "Research" });
  });

  it("rejects a file type that the connection cannot read", async () => {
    const selection = openGooglePicker("google_sheets", credentials, new AbortController().signal, vi.fn());
    const assertion = expect(selection).rejects.toThrow("Choose a Google Sheets spreadsheet.");
    await vi.waitFor(() => expect(visible).toHaveBeenCalled());
    respond({ action: "picked", docs: [{ id: "file-id", name: "Notes.pdf", mimeType: "application/pdf" }] });
    await assertion;
    expect(dispose).toHaveBeenCalledOnce();
  });

  it.each(["cancel", "abort"])("closes cleanly on %s without choosing a source", async (action) => {
    const controller = new AbortController();
    const selection = openGooglePicker("google_drive", credentials, controller.signal, vi.fn());
    await vi.waitFor(() => expect(visible).toHaveBeenCalled());
    if (action === "abort") controller.abort();
    else respond({ action: "cancel" });
    await expect(selection).resolves.toBeNull();
    expect(dispose).toHaveBeenCalledOnce();
  });
});
