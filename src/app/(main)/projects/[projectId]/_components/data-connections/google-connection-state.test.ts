import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  beginGoogleConnection,
  consumeGoogleConnectionCallback,
  googleCallbackElsewhere,
  takeGoogleConnectionIntent,
} from "./google-connection-state";

describe("Google connection handoff", () => {
  const assign = vi.fn();
  const replaceState = vi.fn();
  const values = new Map<string, string>();

  beforeEach(() => {
    vi.clearAllMocks();
    values.clear();
    vi.stubGlobal("sessionStorage", {
      setItem: (key: string, value: string) => values.set(key, value),
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => values.delete(key),
    });
    vi.stubGlobal("window", {
      location: { assign, href: "https://app.example.com/projects/p/connections" },
      history: { state: { key: "existing" }, replaceState },
    });
  });

  it.each(["google_sheets", "google_drive"] as const)("restores %s while stripping anything else", (kind) => {
    beginGoogleConnection("p", "u", {
      action: "create",
      kind,
      password: "secret",
      grantId: "secret-grant",
    } as unknown as Parameters<typeof beginGoogleConnection>[2]);
    expect(assign).toHaveBeenCalledWith("/api/v1/projects/p/connections/google/start");
    expect(takeGoogleConnectionIntent("p", "other-user")).toBeNull();
    expect(takeGoogleConnectionIntent("other-project", "u")).toBeNull();
    expect(takeGoogleConnectionIntent("p", "u")).toEqual({ action: "create", kind, returnTo: "connections" });
    expect(takeGoogleConnectionIntent("p", "u")).toBeNull();
  });

  it("restores a reconnection with its original account and connection ID", () => {
    const intent = {
      action: "reauthorize" as const,
      connectionId: "b923cabc-0754-4384-88d5-151c9af46788",
      accountEmail: "researcher@gmail.com",
    };
    beginGoogleConnection("p", "u", intent);
    expect(takeGoogleConnectionIntent("p", "u")).toEqual(intent);
  });

  it("consumes callback parameters once and preserves unrelated query parameters, hash and history state", () => {
    const grant = "b923cabc-0754-4384-88d5-151c9af46788";
    window.location.href = `https://app.example.com/projects/p/connections?google_grant=${grant}&view=all#sources`;
    replaceState.mockImplementation((_state: unknown, _title: string, path: string) => {
      window.location.href = new URL(path, "https://app.example.com").href;
    });
    expect(consumeGoogleConnectionCallback()).toEqual({ grantId: grant, error: null });
    expect(replaceState).toHaveBeenCalledWith({ key: "existing" }, "", "/projects/p/connections?view=all#sources");
    expect(consumeGoogleConnectionCallback()).toBeNull();
  });

  it("passes Google's answer on, untouched, to the page that asked for it", () => {
    const grant = "b923cabc-0754-4384-88d5-151c9af46788";
    const kind = "google_sheets";
    window.location.href = `https://app.example.com/projects/p/connections?google_grant=${grant}`;
    expect(googleCallbackElsewhere("p", "u", "connections")).toBeNull();

    beginGoogleConnection("p", "u", { action: "create", kind, returnTo: "datasets" });
    expect(googleCallbackElsewhere("p", "u", "connections")).toBe(`/projects/p/datasets?google_grant=${grant}`);
    expect(googleCallbackElsewhere("p", "u", "datasets")).toBeNull();
    expect(takeGoogleConnectionIntent("p", "u")).toMatchObject({ returnTo: "datasets" });

    beginGoogleConnection("p", "u", { action: "create", kind });
    expect(googleCallbackElsewhere("p", "u", "connections")).toBeNull();
    window.location.href = "https://app.example.com/projects/p/connections";
    beginGoogleConnection("p", "u", { action: "create", kind, returnTo: "datasets" });
    expect(googleCallbackElsewhere("p", "u", "connections")).toBeNull();
  });

  it("rejects malformed grants and handles error callbacks without a grant", () => {
    window.location.href = "https://app.example.com/projects?google_grant=invalid&error=GOOGLE_ACCESS_NOT_GRANTED";
    expect(consumeGoogleConnectionCallback()).toEqual({ grantId: null, error: "GOOGLE_ACCESS_NOT_GRANTED" });
    expect(replaceState).toHaveBeenCalledWith({ key: "existing" }, "", "/projects");
  });

  it("stops before navigation when session storage is unavailable", () => {
    vi.stubGlobal("sessionStorage", {
      setItem: () => {
        throw new Error("blocked");
      },
    });
    expect(() => beginGoogleConnection("p", "u", { action: "create", kind: "google_sheets" })).toThrow(
      "Allow browser session storage",
    );
    expect(assign).not.toHaveBeenCalled();
  });
});
