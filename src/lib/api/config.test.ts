import { describe, expect, it, vi } from "vitest";

import { getApiBaseUrl, getServerApiBaseUrl } from "./config";

describe("API URL configuration", () => {
  it.each([
    [undefined, "http://localhost:8000/api/v1"],
    ["http://localhost:6789/", "http://localhost:6789/api/v1"],
    ["https://api.example.com/api/v1///", "https://api.example.com/api/v1"],
  ])("normalizes %s without duplicating the API prefix", (value, expected) => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", value);
    expect(getApiBaseUrl()).toBe(expected);
  });

  it("supports a separate internal backend address for server session validation", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com");
    vi.stubEnv("API_URL", "http://backend:8000/api/v1/");
    expect(getServerApiBaseUrl()).toBe("http://backend:8000/api/v1");
    expect(getApiBaseUrl()).toBe("https://api.example.com/api/v1");
  });
});
