import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getApiBaseUrl } from "@/lib/api/config";
import { ApiService } from "@/lib/api/core";
import type { ProjectItem } from "@/lib/api/services/fetch-project";
import type { CurrentUser, SessionResult } from "@/lib/auth/types";
import type { ApiResult } from "@/types/api";
import { PlatformRole, ProjectRole } from "@/types/enums";

const baseURL = (process.env.API_TEST_URL ?? getApiBaseUrl()).replace(/\/+$/, "");
const apiBaseURL = baseURL.endsWith("/api/v1") ? baseURL : `${baseURL}/api/v1`;
const origin = process.env.API_TEST_ORIGIN ?? "http://localhost:3000";
const accounts = [
  { email: "admin@example.com", role: PlatformRole.PlatformAdmin },
  { email: "pm@example.com", role: ProjectRole.ProjectManager },
  { email: "researcher@example.com", role: ProjectRole.Researcher },
  { email: "reviewer@example.com", role: ProjectRole.Reviewer },
];

interface TestSession {
  api: ApiService;
  cookie: string;
}
const sessions: TestSession[] = [];

describe("live backend session and access", () => {
  beforeAll(async () => {
    const response = await fetch(`${apiBaseURL.replace(/\/api\/v1$/, "")}/openapi.json`, {
      signal: AbortSignal.timeout(10000),
    });
    expect(response.status).toBe(200);
    const spec = (await response.json()) as { info: { title: string }; paths: Record<string, Record<string, unknown>> };
    expect(spec.info.title).toBe("AI Research Platform API");
    for (const [route, methods] of [
      ["/auth/login", ["post"]],
      ["/auth/me", ["get"]],
      ["/auth/csrf-token", ["get"]],
      ["/auth/logout", ["post"]],
      ["/projects", ["get", "post"]],
      ["/users", ["get"]],
      ["/audit", ["get"]],
      ["/admin/usage/projects", ["get"]],
      ["/notifications/read-all", ["post"]],
    ] as const) {
      for (const method of methods)
        expect(spec.paths[`/api/v1${route}`]?.[method], `${method.toUpperCase()} ${route}`).toBeDefined();
    }
  });

  afterAll(async () => {
    for (const { api, cookie } of sessions) {
      await api.post("/auth/logout", undefined, { headers: { Cookie: cookie, Origin: origin } });
    }
  });

  it("rejects anonymous access with the documented error envelope", async () => {
    const api = new ApiService(apiBaseURL, 10000);
    await expect(api.get("/auth/me")).rejects.toMatchObject({ status: 401, code: "UNAUTHENTICATED" });
  });

  it("allows credentialed CORS from the frontend origin", async () => {
    const response = await fetch(`${apiBaseURL}/auth/login`, {
      method: "OPTIONS",
      headers: {
        Origin: origin,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
      },
      signal: AbortSignal.timeout(10000),
    });
    expect(response.ok).toBe(true);
    expect(response.headers.get("access-control-allow-origin")).toBe(origin);
    expect(response.headers.get("access-control-allow-credentials")).toBe("true");
  });

  it.each(accounts)("$email can sign in, read data with the correct role, and sign out", async ({ email, role }) => {
    const api = new ApiService(apiBaseURL, 10000);
    const login = await api.post<ApiResult<SessionResult>>(
      "/auth/login",
      { email, password: process.env.API_TEST_PASSWORD ?? "Password123!" },
      { headers: { Origin: origin } },
    );
    expect(login.data.success).toBe(true);
    expect(login.data.data.user.email).toBe(email);
    const setCookie = login.headers["set-cookie"] as string[] | undefined;
    expect(Boolean(setCookie?.some((value) => value.startsWith("platform_session=") && /httponly/i.test(value)))).toBe(
      true,
    );
    const cookie = (setCookie ?? []).map((value) => value.split(";")[0]).join("; ");
    const session = { api, cookie };
    sessions.push(session);
    api.setCsrfToken(login.data.data.csrf_token);
    const headers = { Cookie: cookie, Origin: origin };
    const current = await api.get<ApiResult<CurrentUser>>("/auth/me", undefined, { headers });
    expect(current.data.data.user.email).toBe(email);
    if (role === PlatformRole.PlatformAdmin) expect(current.data.data.user.platform_role).toBe(role);
    else
      expect(
        current.data.data.memberships.some(
          (membership) => membership.project_name === "Demo Research Project" && membership.role === role,
        ),
      ).toBe(true);

    const projects = await api.get<ApiResult<ProjectItem[]>>("/projects", { limit: 20, offset: 0 }, { headers });
    expect(projects.data.success).toBe(true);
    expect(Array.isArray(projects.data.data)).toBe(true);
    expect(projects.data.meta.pagination?.total).toBeGreaterThanOrEqual(1);
    const demo = projects.data.data.find((project) => project.name === "Demo Research Project");
    expect(demo).toBeDefined();
    if (demo) {
      for (const route of [
        `/projects/${demo.id}`,
        `/projects/${demo.id}/members`,
        `/projects/${demo.id}/datasets`,
        `/projects/${demo.id}/runs`,
      ]) {
        const response = await api.get<ApiResult<unknown>>(route, undefined, { headers });
        expect(response.data.success, route).toBe(true);
      }
    }
    if (role === PlatformRole.PlatformAdmin) {
      for (const route of ["/users", "/audit", "/admin/usage/projects"]) {
        const response = await api.get<ApiResult<unknown[]>>(route, { limit: 10, offset: 0 }, { headers });
        expect(response.data.success, route).toBe(true);
        expect(Array.isArray(response.data.data)).toBe(true);
      }
    } else {
      await expect(api.get("/users", undefined, { headers })).rejects.toMatchObject({ status: 403 });
    }

    const csrf = await api.get<ApiResult<{ csrf_token: string }>>("/auth/csrf-token", undefined, { headers });
    expect(typeof csrf.data.data.csrf_token).toBe("string");
    api.setCsrfToken(csrf.data.data.csrf_token);
    await api.post("/auth/logout", undefined, { headers });
    sessions.splice(sessions.indexOf(session), 1);
    await expect(api.get("/auth/me", undefined, { headers })).rejects.toMatchObject({
      status: 401,
      code: "SESSION_EXPIRED",
    });
    await expect(api.get("/auth/me")).rejects.toMatchObject({ status: 401, code: "UNAUTHENTICATED" });
  });
});
