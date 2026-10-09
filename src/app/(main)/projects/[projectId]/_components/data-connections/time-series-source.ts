import type {
  ConnectionColumn,
  TimeSeriesAggregate,
  TimeSeriesBucket,
  TimeSeriesConnectionKind,
  TimeSeriesSource,
} from "@/lib/api/services/fetch-data-connections";

export const TIME_SERIES_BUCKETS: Record<TimeSeriesBucket, { label: string; milliseconds: number }> = {
  "1m": { label: "1 minute", milliseconds: 60_000 },
  "5m": { label: "5 minutes", milliseconds: 300_000 },
  "15m": { label: "15 minutes", milliseconds: 900_000 },
  "1h": { label: "1 hour", milliseconds: 3_600_000 },
  "6h": { label: "6 hours", milliseconds: 21_600_000 },
  "1d": { label: "1 day", milliseconds: 86_400_000 },
  "1w": { label: "1 week", milliseconds: 604_800_000 },
};
export const TIME_SERIES_AGGREGATES: Record<TimeSeriesAggregate, string> = {
  mean: "Mean",
  sum: "Sum",
  min: "Minimum",
  max: "Maximum",
  count: "Count",
  increase: "Increase (estimated)",
};
export interface TimeSeriesDraft {
  fields: string[];
  tags: string[];
  start: string;
  end: string;
  bucket: TimeSeriesBucket | "raw";
  aggregate: TimeSeriesAggregate;
}

function localDateTime(value: string | number) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 23);
}

export function createTimeSeriesDraft(source?: TimeSeriesSource): TimeSeriesDraft {
  const now = Date.now();
  return {
    fields: source?.fields ?? [],
    tags: source?.tags ?? [],
    start: localDateTime(source?.start ?? now - 3_600_000),
    end: localDateTime(source?.end ?? now),
    bucket: source ? (source.bucket ?? "raw") : "5m",
    aggregate: source?.aggregate ?? "mean",
  };
}

export function isNumericTimeSeriesColumn(column: ConnectionColumn) {
  return ["float", "integer", "unsigned"].includes(column.type);
}

export function selectTimeSeriesMetric(
  kind: TimeSeriesConnectionKind,
  name: string,
  columns: ConnectionColumn[],
  draft: TimeSeriesDraft,
): TimeSeriesDraft {
  const field = columns.find((column) => column.role === "field" && column.name !== "time");
  let aggregate: TimeSeriesAggregate = "mean";
  if (kind === "prometheus" && name.endsWith("_total")) aggregate = "increase";
  else if (field && !isNumericTimeSeriesColumn(field)) aggregate = "count";
  return { ...draft, fields: kind === "influxdb" && field ? [field.name] : [], tags: [], aggregate };
}

export function buildTimeSeriesSource(
  kind: TimeSeriesConnectionKind,
  name: string,
  draft: TimeSeriesDraft,
): TimeSeriesSource {
  const iso = (value: string) => {
    const date = new Date(value);
    return value && Number.isFinite(date.getTime()) ? date.toISOString() : "";
  };
  return {
    type: "timeseries",
    name,
    fields: kind === "prometheus" ? [] : draft.fields,
    tags: draft.tags,
    start: iso(draft.start),
    end: iso(draft.end),
    bucket: draft.bucket === "raw" ? null : draft.bucket,
    aggregate: draft.bucket === "raw" ? null : draft.aggregate,
  };
}

function validateSelectionNames(
  kind: TimeSeriesConnectionKind,
  source: Pick<TimeSeriesSource, "name" | "fields" | "tags" | "aggregate">,
) {
  if (!source.name || source.name.length > 255)
    throw new Error("Choose a metric or measurement of at most 255 characters.");
  if (kind === "prometheus" && source.fields.length) throw new Error("Prometheus uses the value field automatically.");
  if (kind === "influxdb" && (!source.fields.length || source.fields.length > 20))
    throw new Error("Choose 1 to 20 fields.");
  if (source.tags.length > 10) throw new Error("Choose at most 10 tags.");
  const names = [...source.fields, ...source.tags];
  if (new Set(names).size !== names.length) throw new Error("Field and tag names must be unique.");
  if (names.includes("time") || (kind === "prometheus" && source.tags.includes("value")))
    throw new Error("The time and value output names are reserved.");
  if (kind === "influxdb" && source.aggregate === "increase")
    throw new Error("Increase is available only for Prometheus.");
}

export function validateTimeSeriesSource(kind: TimeSeriesConnectionKind, source: TimeSeriesSource) {
  validateSelectionNames(kind, source);
  if (kind === "prometheus" && !source.bucket) throw new Error("Prometheus requires a bucket.");
  if (Boolean(source.bucket) !== Boolean(source.aggregate)) throw new Error("Choose both a bucket and an aggregate.");
  const zoned = /(?:Z|[+-]\d{2}:\d{2})$/i;
  const start = Date.parse(source.start);
  const end = Date.parse(source.end);
  if (!zoned.test(source.start) || !zoned.test(source.end) || !Number.isFinite(start) || !Number.isFinite(end))
    throw new Error("Choose valid start and end times with a timezone.");
  if (start >= end) throw new Error("Start time must be before end time.");
  if (
    kind === "prometheus" &&
    source.bucket &&
    (end - start) / TIME_SERIES_BUCKETS[source.bucket].milliseconds > 11_000
  )
    throw new Error("Prometheus allows at most 11,000 buckets. Choose a larger bucket or a shorter time range.");
}

export function validateTimeSeriesSelection(
  kind: TimeSeriesConnectionKind,
  source: Pick<TimeSeriesSource, "name" | "fields" | "tags" | "aggregate">,
  columns: ConnectionColumn[],
) {
  validateSelectionNames(kind, source);
  const fields = columns.filter((column) => column.role === "field");
  const tags = columns.filter((column) => column.role === "tag");
  if (
    source.fields.some((name) => !fields.some((column) => column.name === name)) ||
    source.tags.some((name) => !tags.some((column) => column.name === name))
  )
    throw new Error("Reload columns and choose the available fields and tags.");
  if (
    source.aggregate &&
    source.aggregate !== "count" &&
    fields.some((column) => source.fields.includes(column.name) && !isNumericTimeSeriesColumn(column))
  )
    throw new Error("Fields that do not hold numbers require count or raw data.");
}
