import { getRedirectUrl, unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { NextRequest } from "next/server";

import { describe, expect, it } from "vitest";

import { AUTH_COOKIE_NAME, REQUEST_PATH_HEADER } from "@/lib/auth/auth-config";

import { config, proxy } from "./proxy";

const ORIGIN = "https://scientist.example.com";

function request(path: string, { accept = "text/html", signedIn = false, method = "GET" } = {}) {
  const headers = new Headers({ accept });
  if (signedIn) headers.set("cookie", `${AUTH_COOKIE_NAME}=session`);
  return new NextRequest(`${ORIGIN}${path}`, { headers, method });
}

describe("proxy matcher", () => {
  it.each([
    ["/", true],
    ["/projects/abc", true],
    ["/__ora-404-probe-lw0y85pt", true],
    ["/llms.txt", false],
    ["/robots.txt", false],
    ["/sitemap.xml", false],
    ["/favicon.ico", false],
    ["/api/v1/auth/me", false],
    ["/_next/static/chunks/app.js", false],
  ])("%s → %s", (url, expected) => {
    expect(unstable_doesMiddlewareMatch({ config, url })).toBe(expected);
  });
});

describe("home page", () => {
  it("sends signed-out browsers to sign-in with a real redirect", () => {
    const response = proxy(request("/"));
    expect(response.status).toBe(307);
    expect(getRedirectUrl(response)).toBe(`${ORIGIN}/auth/login`);
    expect(response.headers.get("vary")).toContain("Accept");
  });

  it("lets signed-in browsers through to finish signing in", () => {
    const response = proxy(request("/", { signedIn: true }));
    expect(response.status).toBe(200);
    expect(getRedirectUrl(response)).toBeNull();
    expect(response.headers.get("vary")).toContain("Accept");
  });

  it("answers Markdown to agents that ask for it, signed in or not", async () => {
    for (const signedIn of [false, true]) {
      const response = proxy(request("/", { accept: "text/markdown", signedIn }));
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
      expect(response.headers.get("vary")).toBe("Accept");
      expect(await response.text()).toMatch(/^# /);
    }
  });

  it("keeps HTML for browsers that list Markdown below HTML", () => {
    const response = proxy(request("/", { accept: "text/html, text/markdown;q=0.5" }));
    expect(response.status).toBe(307);
  });
});

describe("missing pages", () => {
  it("returns a Markdown 404 to agents that ask for Markdown", async () => {
    const response = proxy(request("/__ora-404-probe-lw0y85pt", { accept: "text/markdown" }));
    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
    const body = await response.text();
    expect(body).toContain("Page not found");
    expect(body).toContain("/llms.txt");
  });

  it("leaves HTML 404s to the app", () => {
    const response = proxy(request("/__ora-404-probe-lw0y85pt"));
    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("does not answer for existing pages or for non-GET requests", () => {
    expect(proxy(request("/privacy", { accept: "text/markdown" })).headers.get("x-middleware-next")).toBe("1");
    const post = proxy(request("/__nowhere", { accept: "text/markdown", method: "POST" }));
    expect(post.headers.get("x-middleware-next")).toBe("1");
  });
});

describe("protected areas", () => {
  it("redirects signed-out visitors to sign-in and keeps where they were going", () => {
    const response = proxy(request("/projects/abc?tab=runs"));
    expect(response.status).toBe(307);
    expect(getRedirectUrl(response)).toBe(`${ORIGIN}/auth/login?next=%2Fprojects%2Fabc%3Ftab%3Druns`);
  });

  it("passes signed-in visitors on with the requested path", () => {
    const response = proxy(request("/onboarding", { signedIn: true }));
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get(`x-middleware-request-${REQUEST_PATH_HEADER}`)).toBe("/onboarding");
  });

  it("does not protect public pages", () => {
    const response = proxy(request("/auth/login"));
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
