import type { ConnectionLiveData, LiveWindow } from "@/lib/api/services/fetch-data-connections";
import { ApiError } from "@/types/api";

export const LIVE_WINDOWS: Record<LiveWindow, { label: string; interval: number }> = {
  "15m": { label: "15 minutes", interval: 15_000 },
  "1h": { label: "1 hour", interval: 60_000 },
  "6h": { label: "6 hours", interval: 300_000 },
  "24h": { label: "24 hours", interval: 900_000 },
};

export function buildLiveChart(data: ConnectionLiveData, fillBuckets = true) {
  const timeIndex = data.columns.findIndex((column) => column.role === "time");
  const tags = data.columns.flatMap((column, index) => (column.role === "tag" ? [{ name: column.name, index }] : []));
  const fields = data.columns.flatMap((column, index) =>
    column.role === "field" ? [{ name: column.name, index }] : [],
  );
  const series: { key: string; label: string }[] = [];
  const identities = new Map<string, string>();
  const points = new Map<number, Record<string, number | null> & { time: number }>();
  const rawValues = new Map<number, Record<string, string | null>>();
  const durations: Record<string, number> = { "15s": 15_000, "1m": 60_000, "5m": 300_000, "15m": 900_000 };
  const start = Date.parse(data.start);
  const end = Date.parse(data.end);
  const step = durations[data.bucket];
  if (fillBuckets && step) for (let time = start; time < end; time += step) points.set(time, { time });
  for (const row of data.rows) {
    const time = Date.parse(row[timeIndex] ?? "");
    if (!Number.isFinite(time) || time < start || time >= end) continue;
    const point = points.get(time) ?? { time };
    for (const field of fields) {
      const identity = JSON.stringify([field.name, ...tags.map((tag) => row[tag.index])]);
      let key = identities.get(identity);
      if (!key) {
        key = `s${series.length}`;
        identities.set(identity, key);
        series.push({
          key,
          label: [field.name, ...tags.map((tag) => `${tag.name}=${row[tag.index] ?? "(missing)"}`)].join(" · "),
        });
      }
      const cell = row[field.index];
      const raw = rawValues.get(time) ?? {};
      raw[key] = cell ?? null;
      rawValues.set(time, raw);
      const value = cell === null || cell === undefined || cell === "" ? Number.NaN : Number(cell);
      point[key] = Number.isFinite(value) ? value : null;
    }
    points.set(time, point);
  }
  return {
    series,
    rawValues,
    points: [...points.values()]
      .sort((left, right) => left.time - right.time)
      .map((point) => {
        for (const item of series) if (!(item.key in point)) point[item.key] = null;
        return point;
      }),
  };
}

export function startLivePolling({
  request,
  interval,
  onData,
  onError,
  onStop,
  visible = true,
}: {
  request: (signal: AbortSignal) => Promise<ConnectionLiveData>;
  interval: number;
  onData: (data: ConnectionLiveData) => void;
  onError: (error: unknown) => void;
  onStop: (retryable: boolean) => void;
  visible?: boolean;
}) {
  let disposed = false;
  let stopped = false;
  let showing = visible;
  let controller: AbortController | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let retryAt = 0;
  const clear = () => {
    clearTimeout(timer);
    controller?.abort();
  };
  const schedule = (delay: number) => {
    if (!disposed && !stopped && showing) timer = setTimeout(() => void poll(), delay);
  };
  async function poll() {
    if (disposed || stopped || !showing || controller) return;
    if (retryAt > Date.now()) {
      schedule(retryAt - Date.now());
      return;
    }
    const current = new AbortController();
    controller = current;
    let delay = interval;
    try {
      const data = await request(current.signal);
      if (!current.signal.aborted && !disposed) onData(data);
    } catch (error) {
      if (current.signal.aborted || disposed) return;
      if (error instanceof ApiError && error.code === "CONNECTION_BUSY") {
        // Skip this window while another remote read owns the connection.
      } else if (error instanceof ApiError && error.code === "RATE_LIMITED") {
        delay = error.retryAfter === null ? interval : Math.max(1000, error.retryAfter * 1000);
        retryAt = Date.now() + delay;
        onError(error);
      } else {
        stopped = true;
        const terminal =
          error instanceof ApiError &&
          ([401, 403, 404, 409].includes(error.status) || error.code === "CONNECTIONS_NOT_CONFIGURED");
        onError(error);
        onStop(!terminal);
      }
    } finally {
      if (controller === current) controller = undefined;
      schedule(current.signal.aborted ? 0 : delay);
    }
  }
  if (showing) void poll();
  return {
    setVisible(value: boolean) {
      if (showing === value || disposed || stopped) return;
      showing = value;
      clear();
      if (value) void poll();
    },
    dispose() {
      disposed = true;
      clear();
    },
  };
}
