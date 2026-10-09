import { describe, expect, it } from "vitest";

import { createTimeSeriesConnection } from "./time-series-connection";

const draft = { url: "https://metrics.example.com/prefix", database: "bench", token: "", username: "", password: "" };

describe("time series connection credentials", () => {
  it("omits empty secrets and sends only URL for Prometheus", () => {
    expect(createTimeSeriesConnection("prometheus", draft, "Metrics")).toEqual({
      name: "Metrics",
      kind: "prometheus",
      config: { url: draft.url },
    });
  });
  it("supports token auth, Prometheus Basic auth and paired InfluxDB 1.8 credentials", () => {
    expect(
      createTimeSeriesConnection("prometheus", { ...draft, token: "secret", username: "reader" }, "Metrics").secret,
    ).toEqual({ username: "reader", token: "secret" });
    expect(createTimeSeriesConnection("influxdb", { ...draft, token: "secret" }, "Metrics").secret).toEqual({
      token: "secret",
    });
    expect(
      createTimeSeriesConnection("influxdb", { ...draft, username: "reader", password: "a b" }, "Metrics").secret,
    ).toEqual({ username: "reader", password: "a b" });
  });
  it("rejects credential combinations and unsafe URL syntax before connecting", () => {
    expect(() => createTimeSeriesConnection("influxdb", { ...draft, username: "reader" }, "Metrics")).toThrow(
      /together/,
    );
    expect(() =>
      createTimeSeriesConnection(
        "influxdb",
        { ...draft, username: "reader", password: "pw", token: "token" },
        "Metrics",
      ),
    ).toThrow(/combine/);
    for (const url of [
      "ftp://example.com",
      "https://u:p@example.com",
      "https://example.com/?x=1",
      "https://example.com/#x",
      "https://example.com/a b",
    ]) {
      expect(() => createTimeSeriesConnection("prometheus", { ...draft, url }, "Metrics")).toThrow();
    }
  });
});
