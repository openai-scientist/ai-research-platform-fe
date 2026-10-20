import type { GoogleConnectionKind, GooglePickerCredentials } from "@/lib/api/services/fetch-data-connections";

export interface GooglePickerSelection {
  id: string;
  name: string;
}

interface PickerDocument extends GooglePickerSelection {
  mimeType: string;
}

interface PickerResponse {
  action: string;
  docs?: PickerDocument[];
}

interface PickerInstance {
  setVisible: (visible: boolean) => void;
  dispose: () => void;
}

interface PickerView {
  setMode: (mode: string) => PickerView;
  setMimeTypes: (types: string) => PickerView;
  setIncludeFolders: (include: boolean) => PickerView;
  setSelectFolderEnabled: (enabled: boolean) => PickerView;
}

interface PickerBuilder {
  addView: (view: PickerView) => PickerBuilder;
  setOAuthToken: (token: string) => PickerBuilder;
  setDeveloperKey: (key: string) => PickerBuilder;
  setAppId: (id: string) => PickerBuilder;
  setOrigin: (origin: string) => PickerBuilder;
  setLocale: (locale: string) => PickerBuilder;
  setTitle: (title: string) => PickerBuilder;
  setSize: (width: number, height: number) => PickerBuilder;
  setCallback: (callback: (response: PickerResponse) => void) => PickerBuilder;
  build: () => PickerInstance;
}

interface PickerApi {
  Action: { PICKED: string; CANCEL: string };
  ViewId: { SPREADSHEETS: string; FOLDERS: string };
  DocsViewMode: { LIST: string };
  DocsView: new (viewId: string) => PickerView;
  PickerBuilder: new () => PickerBuilder;
}

type PickerWindow = Window & {
  google?: { picker?: PickerApi };
  gapi?: {
    load: (
      name: string,
      options: { callback: () => void; onerror: () => void; timeout: number; ontimeout: () => void },
    ) => void;
  };
};

const PICKER_SCRIPT_ID = "google-picker-api";
const LOAD_TIMEOUT_MS = 15_000;
const SPREADSHEET_MIME = "application/vnd.google-apps.spreadsheet";
const FOLDER_MIME = "application/vnd.google-apps.folder";
let pickerLibrary: Promise<PickerApi> | undefined;

function loadGooglePicker(): Promise<PickerApi> {
  const pickerWindow = window as PickerWindow;
  if (pickerWindow.google?.picker) return Promise.resolve(pickerWindow.google.picker);
  if (pickerLibrary !== undefined) return pickerLibrary;

  pickerLibrary = new Promise<PickerApi>((resolve, reject) => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const script = document.createElement("script");
    script.id = PICKER_SCRIPT_ID;
    script.src = "https://apis.google.com/js/api.js";
    script.async = true;
    const fail = () => {
      clearTimeout(timeout);
      script.remove();
      reject(new Error("Google Drive file selection could not load. Please try again."));
    };
    const loadPicker = () => {
      clearTimeout(timeout);
      if (!pickerWindow.gapi) return fail();
      pickerWindow.gapi.load("picker", {
        callback: () => {
          const api = pickerWindow.google?.picker;
          if (api) resolve(api);
          else fail();
        },
        onerror: fail,
        timeout: LOAD_TIMEOUT_MS,
        ontimeout: fail,
      });
    };
    if (pickerWindow.gapi) loadPicker();
    else {
      script.onload = loadPicker;
      script.onerror = fail;
      timeout = setTimeout(fail, LOAD_TIMEOUT_MS);
      document.head.append(script);
    }
  }).catch((error: unknown) => {
    pickerLibrary = undefined;
    throw error;
  });
  return pickerLibrary;
}

export async function openGooglePicker(
  kind: GoogleConnectionKind,
  credentials: GooglePickerCredentials,
  signal: AbortSignal,
  onOpen: () => void,
): Promise<GooglePickerSelection | null> {
  const api = await loadGooglePicker();
  if (signal.aborted) return null;
  // Let React release the flow's focus trap before Google's external dialog receives focus.
  onOpen();
  await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
  await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
  if (signal.aborted) return null;

  return new Promise<GooglePickerSelection | null>((resolve, reject) => {
    let picker: PickerInstance | undefined;
    let settled = false;
    const finish = (selection: GooglePickerSelection | null, error?: Error) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener("abort", cancel);
      picker?.dispose();
      if (error) reject(error);
      else resolve(selection);
    };
    const cancel = () => finish(null);
    const isFolder = kind === "google_drive";
    const mimeType = isFolder ? FOLDER_MIME : SPREADSHEET_MIME;
    try {
      const view = new api.DocsView(isFolder ? api.ViewId.FOLDERS : api.ViewId.SPREADSHEETS)
        .setMode(api.DocsViewMode.LIST)
        .setMimeTypes(mimeType);
      if (isFolder) view.setIncludeFolders(true).setSelectFolderEnabled(true);
      picker = new api.PickerBuilder()
        .addView(view)
        .setOAuthToken(credentials.access_token)
        .setDeveloperKey(credentials.api_key)
        .setAppId(credentials.app_id)
        .setOrigin(window.location.origin)
        .setLocale("en")
        .setTitle(isFolder ? "Select a folder" : "Select a spreadsheet")
        .setSize(Math.min(960, window.innerWidth - 24), Math.min(640, window.innerHeight - 24))
        .setCallback((response) => {
          if (response.action === api.Action.CANCEL) return cancel();
          if (response.action !== api.Action.PICKED) return;
          const selected = response.docs?.[0];
          if (
            !selected ||
            selected.mimeType !== mimeType ||
            typeof selected.id !== "string" ||
            !/^[\w-]+$/.test(selected.id) ||
            typeof selected.name !== "string"
          ) {
            finish(null, new Error(isFolder ? "Choose a Google Drive folder." : "Choose a Google Sheets spreadsheet."));
            return;
          }
          finish({ id: selected.id, name: selected.name });
        })
        .build();
      signal.addEventListener("abort", cancel, { once: true });
      picker.setVisible(true);
    } catch (error) {
      finish(null, error instanceof Error ? error : new Error("Google Drive file selection could not open."));
    }
  });
}
