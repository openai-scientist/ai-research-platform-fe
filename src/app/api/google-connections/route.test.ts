import { describe, expect, it, vi } from "vitest";

import { GET } from "./route";

describe("Google connections availability", () => {
  it.each([
    { status: 401, available: true },
    { status: 404, available: false },
    { status: 302, available: false },
  ])(
    "reports availability from HTTP $status without forwarding credentials or following redirects",
    async ({ status, available }) => {
      const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status }));
      vi.stubGlobal("fetch", fetchMock);
      vi.stubEnv("API_URL", "http://backend.test/api/v1");
      const response = await GET();
      expect(await response.json()).toEqual({ available });
      expect(fetchMock).toHaveBeenCalledWith(
        "http://backend.test/api/v1/projects/00000000-0000-0000-0000-000000000000/connections/google/start",
        { redirect: "manual", cache: "no-store", signal: expect.any(AbortSignal) },
      );
    },
  );
  it("keeps availability failures transient and uncached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Offline")));
    const response = await GET();
    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});
