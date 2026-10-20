"use client";

import { useMemo, useState } from "react";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ConnectionLiveRequest, LiveWindow } from "@/lib/api/services/fetch-data-connections";

import { buildLiveChart, LIVE_WINDOWS } from "./time-series-live";
import { TIME_SERIES_AGGREGATES } from "./time-series-source";
import { useTimeSeriesLive } from "./use-time-series-live";

export function TimeSeriesLiveView({
  projectId,
  connectionId,
  selection,
  paused,
}: {
  projectId: string;
  connectionId: string;
  selection: Omit<ConnectionLiveRequest, "last">;
  paused: boolean;
}) {
  const [last, setLast] = useState<LiveWindow>("1h");
  const input = useMemo(() => ({ ...selection, last }), [selection, last]);
  const live = useTimeSeriesLive(projectId, connectionId, input, paused);
  const chart = useMemo(() => (live.data ? buildLiveChart(live.data) : null), [live.data]);
  const config = useMemo<ChartConfig>(
    () =>
      Object.fromEntries(
        (chart?.series ?? []).map((item, index) => [
          item.key,
          {
            label: item.label,
            color: `var(--chart-${(index % 5) + 1})`,
          },
        ]),
      ),
    [chart],
  );
  const utcTime = (value: number) =>
    new Date(value).toLocaleTimeString("en-US", { timeZone: "UTC", hour: "2-digit", minute: "2-digit" });
  let status = "Live updates";
  if (paused) status = "Live is paused while another request is running.";
  if (live.stopped) status = "Live stopped.";
  return (
    <section
      aria-label="Live time series"
      className="flex min-h-96 min-w-0 flex-col gap-4 rounded-xl border bg-card p-5 lg:min-h-0 lg:overflow-y-auto"
    >
      <header className="flex shrink-0 flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-1 text-muted-foreground text-xs">Live chart</p>
          <h2 className="break-all font-medium">{selection.name}</h2>
          <p className="text-muted-foreground text-xs">
            {selection.fields.join(", ") || "value"} · {TIME_SERIES_AGGREGATES[selection.aggregate]}
            {selection.tags.length > 0 && ` · by ${selection.tags.join(", ")}`}
          </p>
        </div>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={last}
          className="shrink-0 flex-wrap"
          aria-label="Live time window"
          disabled={paused || live.stopped}
          onValueChange={(value) => {
            if (value in LIVE_WINDOWS) setLast(value as LiveWindow);
          }}
        >
          {Object.entries(LIVE_WINDOWS).map(([value, item]) => (
            <ToggleGroupItem
              key={value}
              value={value}
              aria-label={item.label}
              className="hover:bg-muted data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-foreground"
              disabled={value === "15m" && selection.aggregate === "increase"}
            >
              <span className="sm:hidden">{value}</span>
              <span className="hidden sm:inline">{item.label}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </header>
      <p className="shrink-0 text-muted-foreground text-xs" role="status">
        {status}
        {live.updatedAt && ` · Updated ${utcTime(Date.parse(live.updatedAt))} UTC`}
        {` · Every ${LIVE_WINDOWS[last].interval / 1000} seconds`}
      </p>
      {live.stopped && live.retryable && (
        <Button variant="outline" className="self-start" disabled={paused} onClick={live.retry}>
          Retry live
        </Button>
      )}
      {!live.data && !live.stopped && <Skeleton className="min-h-72 w-full flex-1" />}
      {!live.data && live.stopped && (
        <Empty className="min-h-72 flex-1">
          <EmptyHeader>
            <EmptyTitle>Live chart is paused</EmptyTitle>
            <EmptyDescription>
              {live.retryable
                ? "Retry to load the chart again."
                : "Choose another metric or measurement to load the chart again."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
      {live.data && !live.data.rows.length && (
        <Empty className="min-h-72 flex-1">
          <EmptyHeader>
            <EmptyTitle>No points in this time range</EmptyTitle>
            <EmptyDescription>Try a longer window. Short buckets may contain too few samples.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
      {live.data?.rows.length && chart ? (
        <>
          <ChartContainer
            config={config}
            className="h-80 min-h-72 w-full flex-1 aspect-auto focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-card lg:h-auto"
            aria-label={`Live chart for ${selection.name}`}
          >
            <LineChart accessibilityLayer data={chart.points} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="time"
                type="number"
                scale="time"
                domain={[Date.parse(live.data.start), Date.parse(live.data.end)]}
                allowDataOverflow
                tickFormatter={utcTime}
                tick={{ fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                minTickGap={40}
              />
              <YAxis tick={{ fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={56} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name, item) => {
                      const point = item.payload as { time?: number } | undefined;
                      const raw =
                        point?.time !== undefined && typeof item.dataKey === "string"
                          ? chart.rawValues.get(point.time)?.[item.dataKey]
                          : undefined;
                      return (
                        <div className="flex w-full items-center justify-between gap-4">
                          <span className="text-muted-foreground">{name}</span>
                          <span className="font-mono tabular-nums">{raw ?? String(value)}</span>
                        </div>
                      );
                    }}
                    labelFormatter={(_label, payload) => {
                      const point = payload[0]?.payload as { time?: number } | undefined;
                      return point?.time ? `${new Date(point.time).toISOString()} UTC` : "";
                    }}
                  />
                }
              />
              {chart.series.map((item, index) => (
                <Line
                  key={item.key}
                  dataKey={item.key}
                  name={item.label}
                  type="linear"
                  stroke={`var(--color-${item.key})`}
                  strokeWidth={2}
                  strokeDasharray={index >= 5 ? `${2 + Math.floor(index / 5) * 2} 3` : undefined}
                  dot={{ r: 2 }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ChartContainer>
          <ul
            className="flex max-h-28 shrink-0 flex-wrap gap-x-4 gap-y-2 overflow-y-auto text-xs"
            aria-label="Chart series"
          >
            {chart.series.map((item) => (
              <li key={item.key} className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden="true"
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: config[item.key].color }}
                />
                <span className="break-all">{item.label}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {live.data?.truncated && (
        <Alert>
          <AlertTitle>Latest points are missing</AlertTitle>
          <AlertDescription>
            This window exceeds 2,000 rows. Select fewer tags to include the latest points.
          </AlertDescription>
        </Alert>
      )}
      {live.data && (
        <p className="shrink-0 border-t pt-3 text-muted-foreground text-xs">
          {new Date(live.data.start).toLocaleString("en-US", {
            timeZone: "UTC",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
          {" – "}
          {utcTime(Date.parse(live.data.end))} UTC · Bucket: {live.data.bucket}
          <span className="mt-1 block">Rolling live window. Import uses the dates in your settings.</span>
        </p>
      )}
    </section>
  );
}
