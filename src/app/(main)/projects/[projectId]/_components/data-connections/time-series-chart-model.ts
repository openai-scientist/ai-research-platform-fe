import type { ChartConfig } from "@/components/ui/chart";
import type { ConnectionPreview, TimeSeriesSource } from "@/lib/api/services/fetch-data-connections";

import { buildLiveChart } from "./time-series-live";

const valueFormatter = new Intl.NumberFormat("en-US", { maximumSignificantDigits: 6, notation: "compact" });

export function buildSampleChart(source: TimeSeriesSource | null, data?: ConnectionPreview) {
  if (!source || !data) return null;
  const chart = buildLiveChart(
    { ...data, start: source.start, end: source.end, bucket: source.bucket ?? "raw" },
    false,
  );
  const series = chart.series.flatMap((item, index) => {
    for (let pointIndex = chart.points.length - 1; pointIndex >= 0; pointIndex--) {
      const point = chart.points[pointIndex];
      const value = point[item.key];
      if (typeof value === "number") {
        return [
          {
            ...item,
            color: chart.series.length === 1 ? "var(--primary)" : `var(--chart-${(index % 5) + 1})`,
            dash: index >= 5 ? `${2 + Math.floor(index / 5) * 2} 3` : undefined,
            value,
            raw: chart.rawValues.get(point.time)?.[item.key] ?? String(value),
            time: point.time,
          },
        ];
      }
    }
    return [];
  });
  const config: ChartConfig = Object.fromEntries(
    series.map((item) => [item.key, { label: item.label, color: item.color }]),
  );
  return { ...chart, series, config };
}

export type TimeSeriesChartModel = NonNullable<ReturnType<typeof buildSampleChart>>;

export function formatChartValue(value: number) {
  return valueFormatter.format(value);
}
