import { describe, expect, it } from "vitest";

import { GET } from "./route";

describe("/llms.txt", () => {
  it("serves the agent guide as Markdown", async () => {
    const response = GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
    const body = await response.text();
    expect(body).toMatch(/^# /);
    expect(body).toContain("When to use");
  });
});
