"use client";

import { useId } from "react";

import { cn } from "cn";

import { Checkbox } from "@/components/ui/checkbox";
import { FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";

import { formatChartValue, type TimeSeriesChartModel } from "./time-series-chart-model";

export function TimeSeriesChartSeries({
  chart,
  hidden,
  loading,
  onToggle,
}: {
  chart: TimeSeriesChartModel | null;
  hidden: string[];
  loading: boolean;
  onToggle: (key: string) => void;
}) {
  const id = useId();
  return (
    <FieldSet className="min-w-0 gap-3">
      <FieldLegend variant="label" className="mb-0">
        Series
      </FieldLegend>
      {loading ? (
        <section className="flex flex-col gap-2" aria-label="Loading series">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </section>
      ) : chart?.series.length ? (
        <>
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Show on chart</span>
            <span>Last sample</span>
          </div>
          <FieldGroup className="gap-1">
            {chart.series.map((item) => (
              <FieldLabel
                key={item.key}
                htmlFor={`${id}-${item.key}`}
                className={cn(
                  "flex min-h-9 w-full min-w-0 cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted",
                  hidden.includes(item.label) && "text-muted-foreground",
                )}
              >
                <Checkbox
                  id={`${id}-${item.key}`}
                  checked={!hidden.includes(item.label)}
                  onCheckedChange={() => onToggle(item.label)}
                  aria-label={`Show ${item.label} on chart`}
                />
                <svg width="16" height="8" aria-hidden="true" className="shrink-0">
                  <line x1="0" y1="4" x2="16" y2="4" stroke={item.color} strokeWidth="2" strokeDasharray={item.dash} />
                </svg>
                <span className="min-w-0 flex-1 truncate" title={item.label}>
                  {item.label}
                </span>
                <span
                  className="max-w-28 shrink-0 truncate font-mono text-xs tabular-nums"
                  title={`${item.raw} · ${new Date(item.time).toLocaleString("en-US")}`}
                >
                  {formatChartValue(item.value)}
                </span>
              </FieldLabel>
            ))}
          </FieldGroup>
          <FieldDescription>Visibility affects the chart only. All selected data is imported.</FieldDescription>
        </>
      ) : (
        <FieldDescription>Numeric series appear here after you select data.</FieldDescription>
      )}
    </FieldSet>
  );
}
