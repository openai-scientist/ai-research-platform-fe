"use client";

import type { ReactNode } from "react";

import { RotateCcw } from "lucide-react";
import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from "recharts";

import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import type { ConnectionPreview, TimeSeriesSource } from "@/lib/api/services/fetch-data-connections";

import { formatChartValue, type TimeSeriesChartModel } from "./time-series-chart-model";

export function TimeSeriesSampleChart({
  source,
  data,
  loading,
  chart,
  hidden,
  reloadDisabled,
  onReload,
  controls,
}: {
  source: TimeSeriesSource | null;
  data?: ConnectionPreview;
  loading: boolean;
  chart: TimeSeriesChartModel | null;
  hidden: string[];
  reloadDisabled: boolean;
  onReload: () => void;
  controls?: ReactNode;
}) {
  const series = chart?.series.filter((item) => !hidden.includes(item.label)) ?? [];
  const latest = series.length === 1 ? series[0] : undefined;
  const acrossDays = source ? Date.parse(source.end) - Date.parse(source.start) >= 86_400_000 : false;
  const time = (value: number) =>
    new Date(value).toLocaleString("en-US", {
      ...(acrossDays ? { month: "short", day: "numeric" } : {}),
      hour: "2-digit",
      minute: "2-digit",
    });
  let title = "Choose your data to see the preview";
  let description = "Select a metric or measurement and a time period above.";
  if (data && !data.rows.length) {
    title = "No data in this time period";
    description = "Try another time period or a different metric.";
  } else if (data?.rows.length && !chart?.series.length) {
    title = "This selection contains text values";
    description = "Use Review rows to inspect the values, or open Chart options and set Calculate to Count.";
  } else if (chart?.series.length && !series.length) {
    title = "All series are hidden";
    description = "Open Chart options and show a series to display it on the chart.";
  } else if (source && !data) {
    title = "Data preview";
    description = "Your selected data will appear here. You can reload the preview when needed.";
  }
  return (
    <section
      aria-label="Data chart preview"
      aria-busy={loading}
      className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 p-4 lg:p-5"
    >
      <header className="flex shrink-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 basis-48">
          <h2 className="break-all font-medium text-sm">{source?.name ?? "Data preview"}</h2>
          {latest && !loading ? (
            <div className="mt-2 flex flex-wrap items-baseline gap-2">
              <span className="font-semibold text-2xl tabular-nums" title={latest.raw}>
                {formatChartValue(latest.value)}
              </span>
              <span className="text-muted-foreground text-xs">Last sample</span>
            </div>
          ) : series.length ? (
            <p className="mt-1 text-muted-foreground text-xs">{series.length} visible series</p>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          {controls}
          <Button
            variant="ghost"
            size="icon"
            disabled={reloadDisabled}
            onClick={onReload}
            aria-label="Reload preview"
            title="Reload preview"
          >
            <RotateCcw />
          </Button>
        </div>
      </header>
      {loading ? (
        <Skeleton className="h-80 w-full sm:h-96 lg:h-auto lg:min-h-48 lg:flex-1" />
      ) : chart && series.length ? (
        <div className="relative h-80 min-w-0 sm:h-96 lg:h-auto lg:min-h-48 lg:flex-1">
          <ChartContainer
            config={chart.config}
            className="absolute inset-0 h-full w-full aspect-auto focus-within:ring-2 focus-within:ring-ring"
            aria-label="Chart of sample rows"
          >
            <LineChart accessibilityLayer data={chart.points} margin={{ left: 8, right: 0, top: 12, bottom: 8 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" />
              <XAxis
                dataKey="time"
                type="number"
                scale="time"
                domain={[Date.parse(source?.start ?? ""), Date.parse(source?.end ?? "")]}
                allowDataOverflow
                tickFormatter={time}
                tick={{ fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                minTickGap={48}
              />
              <YAxis
                orientation="right"
                width={64}
                tickFormatter={formatChartValue}
                tick={{ fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
              />
              {latest && (
                <ReferenceLine y={latest.value} stroke={latest.color} strokeDasharray="3 4" strokeOpacity={0.6} />
              )}
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    className="max-w-[calc(100vw-4rem)]"
                    labelFormatter={(_label, payload) => {
                      const point = payload[0]?.payload as { time?: number } | undefined;
                      return point?.time !== undefined ? new Date(point.time).toLocaleString() : "";
                    }}
                    formatter={(value, name, item) => {
                      const point = item.payload as { time?: number } | undefined;
                      const raw =
                        point?.time !== undefined && typeof item.dataKey === "string"
                          ? chart.rawValues.get(point.time)?.[item.dataKey]
                          : undefined;
                      return (
                        <div className="flex w-full items-center justify-between gap-4">
                          <span className="min-w-0 flex-1 break-all">{name}</span>
                          <span className="max-w-40 break-all font-mono tabular-nums">{raw ?? String(value)}</span>
                        </div>
                      );
                    }}
                  />
                }
              />
              {series.map((item) => (
                <Line
                  key={item.key}
                  dataKey={item.key}
                  name={item.label}
                  type="linear"
                  stroke={`var(--color-${item.key})`}
                  strokeWidth={2}
                  strokeDasharray={item.dash}
                  dot={chart.points.length < 3 ? { r: 3 } : false}
                  activeDot={{ r: 4 }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ChartContainer>
        </div>
      ) : (
        <Empty className="min-h-80 flex-1 lg:min-h-48">
          <EmptyHeader>
            <EmptyTitle>{title}</EmptyTitle>
            <EmptyDescription>{description}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
      <footer className="flex shrink-0 flex-col gap-1 text-muted-foreground text-xs">
        {source && (
          <span className="break-words">
            {new Date(source.start).toLocaleString("en-US")} – {new Date(source.end).toLocaleString("en-US")}
            {" · Local time"}
          </span>
        )}
        {data?.truncated && (
          <span>First 100 rows only. Later points and some series may not appear in this sample.</span>
        )}
      </footer>
    </section>
  );
}
