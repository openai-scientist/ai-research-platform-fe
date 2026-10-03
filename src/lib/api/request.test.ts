import { AxiosHeaders } from "axios";
import { describe, expect, it, vi } from "vitest";

import apiService from "./core";
import { requestDownload } from "./request";

describe("download response headers", () => {
  it.each([
    [undefined, null],
    ['attachment; filename="report.pdf"', "report.pdf"],
    ["attachment; filename=report.csv", "report.csv"],
    ["attachment; filename*=UTF-8''report%20final.pdf", "report final.pdf"],
    ["attachment; filename*=UTF-8''broken%ZZ.pdf", "broken%ZZ.pdf"],
  ])("parses %s without losing the downloaded file", async (disposition, filename) => {
    const blob = new Blob(["download"], { type: "application/pdf" });
    vi.spyOn(apiService, "get").mockResolvedValue({
      data: blob,
      status: 200,
      statusText: "OK",
      config: { headers: new AxiosHeaders() },
      headers: new AxiosHeaders(disposition ? { "content-disposition": disposition } : {}),
    });
    const result = await requestDownload("/download");
    expect(result).toEqual({ blob, filename, contentType: "application/pdf" });
  });
});
