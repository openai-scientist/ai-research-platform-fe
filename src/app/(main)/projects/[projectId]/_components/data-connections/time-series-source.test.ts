import { describe, expect, it } from "vitest";

import type { TimeSeriesSource } from "@/lib/api/services/fetch-data-connections";

import {
  buildTimeSeriesSource,
  createTimeSeriesDraft,
  selectTimeSeriesMetric,
  validateTimeSeriesSelection,
  validateTimeSeriesSource,
} from "./time-series-source";

const source: TimeSeriesSource = {
  type: "timeseries",
  name: 'odd name "q"',
  fields: ["val ue"],
  tags: ["ta,g"],
  start: "2026-10-08T07:00:00Z",
  end: "2026-10-08T13:00:00Z",
  bucket: "5m",
  aggregate: "mean",
};

describe("time series source contract", () => {
  it("defaults counters to increase and nonnumeric fields to count", () => {
    const draft = createTimeSeriesDraft();
    expect(selectTimeSeriesMetric("prometheus", "requests_total", [], draft)).toMatchObject({
      fields: [],
      aggregate: "increase",
      tags: [],
    });
    expect(
      selectTimeSeriesMetric("influxdb", "status", [{ name: "message", type: "string", role: "field" }], draft),
    ).toMatchObject({ fields: ["message"], aggregate: "count" });
  });
  it("round trips saved UTC timestamps and keeps source names verbatim", () => {
    const built = buildTimeSeriesSource("influxdb", source.name, createTimeSeriesDraft(source));
    expect(built).toEqual({
      ...source,
      start: new Date(source.start).toISOString(),
      end: new Date(source.end).toISOString(),
    });
  });

  it("keeps both bucket and aggregate null for raw InfluxDB data", () => {
    const raw = buildTimeSeriesSource(
      "influxdb",
      source.name,
      createTimeSeriesDraft({ ...source, bucket: null, aggregate: null }),
    );
    expect(raw.bucket).toBeNull();
    expect(raw.aggregate).toBeNull();
    expect(() => validateTimeSeriesSource("influxdb", raw)).not.toThrow();
    expect(() => validateTimeSeriesSource("prometheus", { ...raw, fields: [] })).toThrow(/bucket/);
  });

  it("rejects numeric aggregation of string fields but allows count and raw data", () => {
    const columns = [
      { name: "val ue", type: "string", role: "field" as const },
      { name: "ta,g", type: "string", role: "tag" as const },
    ];
    expect(() => validateTimeSeriesSelection("influxdb", source, columns)).toThrow(/count/);
    expect(() => validateTimeSeriesSelection("influxdb", { ...source, aggregate: "count" }, columns)).not.toThrow();
    expect(() => validateTimeSeriesSelection("influxdb", { ...source, aggregate: null }, columns)).not.toThrow();
  });

  it("requires ordered zoned timestamps and enforces the Prometheus 11000 bucket limit", () => {
    expect(() => validateTimeSeriesSource("influxdb", { ...source, start: "2026-10-08T07:00" })).toThrow(/time/);
    expect(() => validateTimeSeriesSource("influxdb", { ...source, end: source.start })).toThrow(/before/);
    const large = {
      ...source,
      fields: [],
      start: "2026-10-01T00:00:00Z",
      end: "2026-10-09T00:00:00Z",
      bucket: "1m" as const,
    };
    expect(() => validateTimeSeriesSource("prometheus", large)).toThrow(/11,000/);
    expect(() => validateTimeSeriesSource("influxdb", { ...large, fields: ["value"] })).not.toThrow();
  });

  it("rejects duplicate and reserved output names and InfluxDB increase", () => {
    expect(() => validateTimeSeriesSource("influxdb", { ...source, tags: ["val ue"] })).toThrow(/unique/);
    expect(() => validateTimeSeriesSource("influxdb", { ...source, tags: ["time"] })).toThrow(/reserved/);
    expect(() => validateTimeSeriesSource("prometheus", { ...source, fields: [], tags: ["value"] })).toThrow(
      /reserved/,
    );
    expect(() => validateTimeSeriesSource("influxdb", { ...source, aggregate: "increase" })).toThrow(/Prometheus/);
  });
});
