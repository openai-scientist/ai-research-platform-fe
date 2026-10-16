import { describe, expect, it, vi } from "vitest";

import { getApiBaseUrl } from "./config";
import { getServerApiBaseUrl } from "./server-config";

describe("API URL configuration", () => {
  it("sends the browser to this app's own origin, whatever the backend's address", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com");
    vi.stubEnv("API_URL", "http://backend:8000");
    expect(getApiBaseUrl()).toBe("/api/v1");
  });

  it.each([
    [undefined, undefined, "http://localhost:8000/api/v1"],
    [undefined, "http://localhost:6789/", "http://localhost:6789/api/v1"],
    [undefined, "https://api.example.com/api/v1///", "https://api.example.com/api/v1"],
    ["http://backend:8000/api/v1/", "https://api.example.com", "http://backend:8000/api/v1"],
  ])("reaches the backend from the server: API_URL %s, NEXT_PUBLIC_API_URL %s", (internal, external, expected) => {
    vi.stubEnv("API_URL", internal);
    vi.stubEnv("NEXT_PUBLIC_API_URL", external);
    expect(getServerApiBaseUrl()).toBe(expected);
  });
});
