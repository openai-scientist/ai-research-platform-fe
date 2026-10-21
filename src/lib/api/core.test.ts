import axios, { AxiosError, CanceledError, type InternalAxiosRequestConfig } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PUBLIC_AUTH_PATHS } from "@/lib/auth/auth-config";
import { ApiError } from "@/types/api";

import { ApiService } from "./core";
import { failure, respond, success } from "./test-utils";

describe("session API client", () => {
  const adapter = vi.fn<(config: InternalAxiosRequestConfig) => Promise<ReturnType<typeof respond>>>();
  let api: ApiService;

  beforeEach(() => {
    adapter.mockReset();
    const create = axios.create;
    vi.spyOn(axios, "create").mockImplementation((config) => create({ ...config, adapter }));
    api = new ApiService("http://api.test/api/v1");
    adapter.mockImplementation(async (config) => respond(config, success(null)));
  });

  it("sends credentials, params and cancellation without attaching JWT", async () => {
    const signal = new AbortController().signal;
    await api.get("/projects", { limit: 20, offset: 40 }, { signal });
    const config = adapter.mock.calls[0][0];
    expect(config).toMatchObject({
      baseURL: "http://api.test/api/v1",
      withCredentials: true,
      params: { limit: 20, offset: 40 },
      signal,
    });
    expect(config.headers.has("Authorization")).toBe(false);
    expect(config.headers.has("X-CSRF-Token")).toBe(false);
  });

  it.each(PUBLIC_AUTH_PATHS)("exempts %s from CSRF", async (url) => {
    await api.post(url, { email: "test@example.com" });
    expect(adapter).toHaveBeenCalledTimes(1);
    expect(adapter.mock.calls[0][0].headers.has("X-CSRF-Token")).toBe(false);
  });

  it("shares one CSRF fetch between simultaneous mutations", async () => {
    adapter.mockImplementation(async (config) =>
      respond(config, success(config.url === "/auth/csrf-token" ? { csrf_token: "csrf" } : null)),
    );
    await Promise.all([api.post("/projects"), api.patch("/projects/p"), api.delete("/projects/p/members/m")]);
    expect(adapter.mock.calls.filter(([config]) => config.url === "/auth/csrf-token")).toHaveLength(1);
    const mutations = adapter.mock.calls.filter(([config]) => config.method !== "get");
    expect(mutations).toHaveLength(3);
    for (const [config] of mutations) expect(config.headers.get("X-CSRF-Token")).toBe("csrf");
  });

  it("does not overwrite a new session token with an older pending CSRF response", async () => {
    let release: (() => void) | undefined;
    const ready = Promise.withResolvers<void>();
    adapter.mockImplementation(async (config) => {
      if (config.url === "/auth/csrf-token") {
        await new Promise<void>((resolve) => {
          release = resolve;
          ready.resolve();
        });
        return respond(config, success({ csrf_token: "old" }));
      }
      return respond(config, success(null));
    });
    const mutation = api.post("/projects");
    await ready.promise;
    api.setCsrfToken("new");
    release?.();
    await mutation;
    expect(adapter.mock.calls.at(-1)?.[0].headers.get("X-CSRF-Token")).toBe("new");
  });

  it.each([200, 403])("refreshes invalid CSRF once for an error response with HTTP %s", async (status) => {
    api.setCsrfToken("old");
    let writes = 0;
    adapter.mockImplementation(async (config) => {
      if (config.url === "/auth/csrf-token") return respond(config, success({ csrf_token: "new" }));
      return ++writes === 1 ? respond(config, failure("CSRF_INVALID"), status) : respond(config, success(null));
    });
    await api.post("/projects");
    expect(writes).toBe(2);
    expect(adapter.mock.calls.at(-1)?.[0].headers.get("X-CSRF-Token")).toBe("new");
  });

  it("stops after a second CSRF rejection", async () => {
    api.setCsrfToken("old");
    adapter.mockImplementation(async (config) =>
      respond(
        config,
        config.url === "/auth/csrf-token" ? success({ csrf_token: "new" }) : failure("CSRF_INVALID"),
        config.url === "/auth/csrf-token" ? 200 : 403,
      ),
    );
    await expect(api.post("/projects")).rejects.toMatchObject({ code: "CSRF_INVALID" });
    expect(adapter.mock.calls.filter(([config]) => config.method === "post")).toHaveLength(2);
  });

  it.each(["VALIDATION_ERROR", "RUN_ACTIVE", "INTERNAL_ERROR"])("does not replay %s mutations", async (code) => {
    api.setCsrfToken("csrf");
    adapter.mockImplementation(async (config) => respond(config, failure(code), 500));
    await expect(api.post("/projects")).rejects.toBeInstanceOf(ApiError);
    expect(adapter).toHaveBeenCalledTimes(1);
  });

  it.each([200, 401, 403])("invalidates session by code for HTTP %s", async (status) => {
    const dispatchEvent = vi.fn();
    vi.stubGlobal("window", { dispatchEvent });
    api.setCsrfToken("old");
    adapter.mockImplementation(async (config) => respond(config, failure("USER_SUSPENDED"), status));
    await expect(api.get("/auth/me")).rejects.toMatchObject({ code: "USER_SUSPENDED", status });
    expect(dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "auth:expired" }));
    adapter.mockImplementation(async (config) =>
      respond(config, success(config.url === "/auth/csrf-token" ? { csrf_token: "new" } : null)),
    );
    await api.post("/projects");
    expect(adapter.mock.calls.at(-1)?.[0].headers.get("X-CSRF-Token")).toBe("new");
  });

  it("does not expire a session for invalid login credentials", async () => {
    const dispatchEvent = vi.fn();
    vi.stubGlobal("window", { dispatchEvent });
    adapter.mockImplementation(async (config) => respond(config, failure("INVALID_CREDENTIALS"), 401));
    await expect(api.post("/auth/email/start")).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
    expect(dispatchEvent).not.toHaveBeenCalled();
  });

  it.each([200, 429])("blocks the sign-in calls during Retry-After for HTTP %s", async (status) => {
    const now = vi.spyOn(Date, "now").mockReturnValue(100000);
    adapter.mockImplementation(async (config) =>
      respond(config, failure("RATE_LIMITED", "Wait for your next attempt"), status, { "retry-after": "30" }),
    );
    await expect(api.post("/auth/email/start")).rejects.toMatchObject({ code: "RATE_LIMITED", retryAfter: 30 });
    await expect(api.post("/auth/email/verify")).rejects.toMatchObject({
      message: "Wait for your next attempt",
      retryAfter: 30,
    });
    expect(adapter).toHaveBeenCalledTimes(1);
    now.mockReturnValue(131000);
    adapter.mockImplementation(async (config) => respond(config, success(null)));
    await api.post("/auth/email/start");
    expect(adapter).toHaveBeenCalledTimes(2);
  });

  it("parses HTTP-date Retry-After and retains validation details/request ID", async () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-10-03T00:00:00Z"));
    const body = failure("RATE_LIMITED");
    body.error.details = [{ field: "email", message: "Invalid email" }];
    adapter.mockImplementation(async (config) =>
      respond(config, body, 429, { "retry-after": "Sat, 03 Oct 2026 00:00:45 GMT" }),
    );
    await expect(api.get("/projects")).rejects.toMatchObject({
      retryAfter: 45,
      requestId: "test-request",
      details: body.error.details,
      message: body.message,
    });
  });

  it("decodes JSON error blobs from downloads", async () => {
    adapter.mockImplementation(async (config) =>
      respond(config, new Blob([JSON.stringify(failure("ARTIFACT_NOT_FOUND", "Artifact missing"))]), 404),
    );
    await expect(api.get("/download", undefined, { responseType: "blob" })).rejects.toMatchObject({
      code: "ARTIFACT_NOT_FOUND",
      message: "Artifact missing",
      status: 404,
    });
  });

  it("keeps cancellation recognizable and normalizes network errors", async () => {
    adapter.mockRejectedValueOnce(new CanceledError("Canceled"));
    await expect(api.get("/projects")).rejects.toSatisfy(axios.isCancel);
    adapter.mockRejectedValueOnce(new AxiosError("socket closed", "ERR_NETWORK"));
    await expect(api.get("/projects")).rejects.toMatchObject({ code: "NETWORK_ERROR", status: 0 });
  });

  it("uploads multipart with browser boundary and reports progress", async () => {
    api.setCsrfToken("csrf");
    const form = new FormData();
    form.append("file", new Blob(["a,b\n1,2"]), "data.csv");
    const progress = vi.fn();
    await api.upload("/projects/p/datasets", form, progress);
    const config = adapter.mock.calls[0][0];
    expect(config.data).toBe(form);
    expect(config.headers.get("Content-Type")).not.toBe("application/json");
    config.onUploadProgress?.({ loaded: 5, total: 10, bytes: 5, lengthComputable: true });
    expect(progress).toHaveBeenCalledWith(50);
  });
});
