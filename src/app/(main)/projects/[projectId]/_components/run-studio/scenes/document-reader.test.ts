import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const download = vi.fn();
vi.mock("@/lib/api/services/fetch-artifacts", () => ({
  fetchArtifacts: { download: (...args: unknown[]) => download(...args) },
}));

import { documentQuery, documentState } from "./document-reader";

const source = { projectId: "p", runId: "r" };
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("documentState", () => {
  it("is loading only while pending, and never after an error", () => {
    expect(documentState({ status: "pending", data: undefined })).toBe("loading");
    expect(documentState({ status: "error", data: undefined })).toBe("unavailable");
    expect(documentState({ status: "success", data: "# Report" })).toBe("ready");
    expect(documentState({ status: "success", data: "" })).toBe("unavailable");
  });
});

describe("the reader's request", () => {
  beforeEach(() => download.mockReset());

  it("goes from loading to loaded", async () => {
    download.mockResolvedValue({ blob: new Blob(["# Results"]) });
    const observer = new QueryObserver(new QueryClient(), documentQuery(source, "a1"));
    expect(documentState(observer.getCurrentResult())).toBe("loading");
    const unsubscribe = observer.subscribe(() => undefined);
    await settle();
    expect(observer.getCurrentResult().data).toBe("# Results");
    expect(documentState(observer.getCurrentResult())).toBe("ready");
    unsubscribe();
  });

  it("does not hand its own cancel signal to the download", async () => {
    download.mockResolvedValue({ blob: new Blob(["x"]) });
    const client = new QueryClient();
    await client.fetchQuery(documentQuery(source, "a3"));
    expect(download).toHaveBeenCalledWith("p", "r", "a3");
  });
});
