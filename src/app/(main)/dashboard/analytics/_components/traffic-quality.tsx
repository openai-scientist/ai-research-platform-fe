"use client";

import { Ellipsis } from "lucide-react";
import { CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";

import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";

const qualitySeries = [
  { date: "2026-04-01T00:00:00.000Z", actualQuality: 0.4, baselineQuality: -1.2 },
  { date: "2026-04-01T08:00:00.000Z", actualQuality: 0.1, baselineQuality: -0.9 },
  { date: "2026-04-01T16:00:00.000Z", actualQuality: 0.8, baselineQuality: -1.4 },
  { date: "2026-04-02T00:00:00.000Z", actualQuality: 1.5, baselineQuality: -1.1 },
  { date: "2026-04-02T08:00:00.000Z", actualQuality: 2.4, baselineQuality: -0.7 },
  { date: "2026-04-02T16:00:00.000Z", actualQuality: 2.6, baselineQuality: -0.2 },
  { date: "2026-04-03T00:00:00.000Z", actualQuality: 2.3, baselineQuality: -0.5 },
  { date: "2026-04-03T08:00:00.000Z", actualQuality: 3.1, baselineQuality: 0.3 },
  { date: "2026-04-03T16:00:00.000Z", actualQuality: 2.8, baselineQuality: -0.1 },
  { date: "2026-04-04T00:00:00.000Z", actualQuality: 3.6, baselineQuality: 0.8 },
  { date: "2026-04-04T08:00:00.000Z", actualQuality: 2.9, baselineQuality: 0.2 },
  { date: "2026-04-04T16:00:00.000Z", actualQuality: 1.2, baselineQuality: 1 },
  { date: "2026-04-05T00:00:00.000Z", actualQuality: -0.4, baselineQuality: 1.6 },
  { date: "2026-04-05T08:00:00.000Z", actualQuality: -1.1, baselineQuality: 0.8 },
  { date: "2026-04-05T16:00:00.000Z", actualQuality: -0.2, baselineQuality: 0.4 },
  { date: "2026-04-06T00:00:00.000Z", actualQuality: -1.5, baselineQuality: 1.3 },
  { date: "2026-04-06T08:00:00.000Z", actualQuality: -2.2, baselineQuality: 2.2 },
  { date: "2026-04-06T16:00:00.000Z", actualQuality: -1.4, baselineQuality: 2.9 },
  { date: "2026-04-07T00:00:00.000Z", actualQuality: -2.8, baselineQuality: 1.1 },
  { date: "2026-04-07T08:00:00.000Z", actualQuality: -1.8, baselineQuality: 0.3 },
  { date: "2026-04-07T16:00:00.000Z", actualQuality: -4.7, baselineQuality: 1.8 },
  { date: "2026-04-08T00:00:00.000Z", actualQuality: -2.8, baselineQuality: 1.4 },
  { date: "2026-04-08T08:00:00.000Z", actualQuality: -0.9, baselineQuality: 2.3 },
  { date: "2026-04-08T16:00:00.000Z", actualQuality: 0.6, baselineQuality: 1.7 },
  { date: "2026-04-09T00:00:00.000Z", actualQuality: 1.3, baselineQuality: 2.6 },
  { date: "2026-04-09T08:00:00.000Z", actualQuality: -0.4, baselineQuality: 2.2 },
  { date: "2026-04-09T16:00:00.000Z", actualQuality: -1.5, baselineQuality: 3.2 },
  { date: "2026-04-10T00:00:00.000Z", actualQuality: 4.1, baselineQuality: 5.8 },
  { date: "2026-04-10T08:00:00.000Z", actualQuality: 3.4, baselineQuality: 4.7 },
  { date: "2026-04-10T16:00:00.000Z", actualQuality: 2.7, baselineQuality: 3.6 },
  { date: "2026-04-11T00:00:00.000Z", actualQuality: 3.5, baselineQuality: 4.2 },
  { date: "2026-04-11T08:00:00.000Z", actualQuality: 2.6, baselineQuality: 2.9 },
  { date: "2026-04-11T16:00:00.000Z", actualQuality: 3.2, baselineQuality: 3.7 },
  { date: "2026-04-12T00:00:00.000Z", actualQuality: 2.4, baselineQuality: 2.8 },
  { date: "2026-04-12T08:00:00.000Z", actualQuality: 3, baselineQuality: 3.4 },
  { date: "2026-04-12T16:00:00.000Z", actualQuality: -2, baselineQuality: 2.6 },
  { date: "2026-04-13T00:00:00.000Z", actualQuality: -1.2, baselineQuality: 4 },
  { date: "2026-04-13T08:00:00.000Z", actualQuality: 0.4, baselineQuality: 2.7 },
  { date: "2026-04-13T16:00:00.000Z", actualQuality: 1.8, baselineQuality: 3.6 },
  { date: "2026-04-14T00:00:00.000Z", actualQuality: 1.2, baselineQuality: 4.1 },
  { date: "2026-04-14T08:00:00.000Z", actualQuality: 2.8, baselineQuality: 2.5 },
  { date: "2026-04-14T16:00:00.000Z", actualQuality: 2.2, baselineQuality: 1.4 },
  { date: "2026-04-15T00:00:00.000Z", actualQuality: 3, baselineQuality: -0.4 },
  { date: "2026-04-15T08:00:00.000Z", actualQuality: 2.5, baselineQuality: -1.4 },
  { date: "2026-04-15T16:00:00.000Z", actualQuality: 4.3, baselineQuality: -0.8 },
  { date: "2026-04-16T00:00:00.000Z", actualQuality: 3.7, baselineQuality: -0.3 },
  { date: "2026-04-16T08:00:00.000Z", actualQuality: 2.9, baselineQuality: -1.2 },
  { date: "2026-04-16T16:00:00.000Z", actualQuality: 2.1, baselineQuality: -0.6 },
  { date: "2026-04-17T00:00:00.000Z", actualQuality: 1.6, baselineQuality: 0.1 },
  { date: "2026-04-17T08:00:00.000Z", actualQuality: 3, baselineQuality: 0.9 },
  { date: "2026-04-17T16:00:00.000Z", actualQuality: 3.4, baselineQuality: 1.4 },
  { date: "2026-04-18T00:00:00.000Z", actualQuality: 2.8, baselineQuality: 1.9 },
  { date: "2026-04-18T08:00:00.000Z", actualQuality: 4, baselineQuality: 2.6 },
  { date: "2026-04-18T16:00:00.000Z", actualQuality: 4.8, baselineQuality: 3.4 },
  { date: "2026-04-19T00:00:00.000Z", actualQuality: 5.2, baselineQuality: 4 },
  { date: "2026-04-19T08:00:00.000Z", actualQuality: 4.4, baselineQuality: 3.6 },
  { date: "2026-04-19T16:00:00.000Z", actualQuality: 4.8, baselineQuality: 4.7 },
  { date: "2026-04-20T00:00:00.000Z", actualQuality: 5.7, baselineQuality: 5.3 },
  { date: "2026-04-20T08:00:00.000Z", actualQuality: 4.6, baselineQuality: 4.8 },
  { date: "2026-04-20T16:00:00.000Z", actualQuality: 4.3, baselineQuality: 4.5 },
  { date: "2026-04-21T00:00:00.000Z", actualQuality: 4.9, baselineQuality: 5 },
  { date: "2026-04-21T08:00:00.000Z", actualQuality: 4.4, baselineQuality: 4.2 },
  { date: "2026-04-21T16:00:00.000Z", actualQuality: 5.3, baselineQuality: 5.6 },
  { date: "2026-04-22T00:00:00.000Z", actualQuality: 4.8, baselineQuality: 5.1 },
  { date: "2026-04-22T08:00:00.000Z", actualQuality: 4.2, baselineQuality: 4.7 },
  { date: "2026-04-22T16:00:00.000Z", actualQuality: 4.7, baselineQuality: 4.2 },
  { date: "2026-04-23T00:00:00.000Z", actualQuality: 5.4, baselineQuality: 5 },
  { date: "2026-04-23T08:00:00.000Z", actualQuality: 4.8, baselineQuality: 4.5 },
  { date: "2026-04-23T16:00:00.000Z", actualQuality: 5.6, baselineQuality: 5.8 },
  { date: "2026-04-24T00:00:00.000Z", actualQuality: 4.9, baselineQuality: 5.2 },
  { date: "2026-04-24T08:00:00.000Z", actualQuality: 5.2, baselineQuality: 4.7 },
  { date: "2026-04-24T16:00:00.000Z", actualQuality: 4.5, baselineQuality: 4.3 },
  { date: "2026-04-25T00:00:00.000Z", actualQuality: 4.9, baselineQuality: 5.1 },
  { date: "2026-04-25T08:00:00.000Z", actualQuality: 5.4, baselineQuality: 5.6 },
  { date: "2026-04-25T16:00:00.000Z", actualQuality: 4.8, baselineQuality: 5 },
  { date: "2026-04-26T00:00:00.000Z", actualQuality: 5.2, baselineQuality: 5.4 },
  { date: "2026-04-26T08:00:00.000Z", actualQuality: 4.7, baselineQuality: 4.8 },
  { date: "2026-04-26T16:00:00.000Z", actualQuality: 5.1, baselineQuality: 5.2 },
  { date: "2026-04-27T00:00:00.000Z", actualQuality: 4.5, baselineQuality: 4.7 },
  { date: "2026-04-27T08:00:00.000Z", actualQuality: 5, baselineQuality: 5.3 },
  { date: "2026-04-27T16:00:00.000Z", actualQuality: 4.6, baselineQuality: 5 },
  { date: "2026-04-28T00:00:00.000Z", actualQuality: 5.2, baselineQuality: 5.6 },
  { date: "2026-04-28T08:00:00.000Z", actualQuality: 4.4, baselineQuality: 5.1 },
  { date: "2026-04-28T16:00:00.000Z", actualQuality: 4.8, baselineQuality: 4.8 },
];

const defaultChartData = qualitySeries.map((item, index) => ({
  ...item,
  dayIndex: 1 + (index * 27) / (qualitySeries.length - 1),
}));

const defaultWeeklyTicks = [4, 11, 18, 25];

export type TrafficQualityPoint = {
  actualQuality: number | null;
  baselineQuality: number | null;
  dayIndex: number;
};

export interface TrafficQualityProps {
  actualLabel?: string;
  baselineLabel?: string;
  chartData?: readonly TrafficQualityPoint[];
  description?: string;
  title?: string;
  tooltipLabel?: string;
  xDomain?: [number, number];
  xTickFormatter?: (value: number) => string;
  xTicks?: number[];
  yDomain?: [number, number];
  yTickFormatter?: (value: number) => string;
  emptyText?: string;
}

function formatDefaultWeek(value: number) {
  const weekIndex = defaultWeeklyTicks.indexOf(value);

  return weekIndex >= 0 ? `Week ${weekIndex + 1}` : "";
}

export function TrafficQuality({
  actualLabel = "Actual quality",
  baselineLabel = "Baseline quality",
  chartData = defaultChartData,
  description,
  title = "Traffic Quality",
  tooltipLabel,
  xDomain = [1, 28],
  xTickFormatter = formatDefaultWeek,
  xTicks = defaultWeeklyTicks,
  yDomain = [-6, 6],
  yTickFormatter = (value) => `${value}%`,
  emptyText,
}: TrafficQualityProps) {
  const chartConfig = {
    actualQuality: {
      color: "var(--chart-3)",
      label: actualLabel,
    },
    baselineQuality: {
      color: "var(--muted-foreground)",
      label: baselineLabel,
    },
  } satisfies ChartConfig;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="font-normal">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        <CardAction>
          <Ellipsis className="size-4" />
        </CardAction>
      </CardHeader>

      <CardContent className="relative">
        <ChartContainer config={chartConfig} className="h-68 w-full">
          <ComposedChart data={[...chartData]} margin={{ bottom: 0, left: 0, right: 0, top: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="dayIndex"
              axisLine={false}
              domain={xDomain}
              interval={0}
              tickFormatter={xTickFormatter}
              tickLine={false}
              tickMargin={14}
              ticks={xTicks}
              type="number"
            />
            <YAxis
              axisLine={false}
              domain={yDomain}
              tickFormatter={yTickFormatter}
              tickLine={false}
              tickMargin={10}
              width={48}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent className="w-40" labelFormatter={() => tooltipLabel ?? title} />}
            />
            <Line
              dataKey="baselineQuality"
              dot={false}
              stroke="var(--color-baselineQuality)"
              strokeOpacity={0.65}
              strokeDasharray="4 4"
              strokeWidth={1.75}
              type="linear"
            />
            <Line
              dataKey="actualQuality"
              dot={false}
              activeDot={{ r: 4 }}
              stroke="var(--color-actualQuality)"
              strokeWidth={2.5}
              type="linear"
            />
          </ComposedChart>
        </ChartContainer>
        {emptyText && !chartData.some((point) => point.actualQuality !== null) && (
          <Empty className="absolute inset-0">
            <EmptyHeader>
              <EmptyTitle>Unavailable</EmptyTitle>
              <EmptyDescription>{emptyText}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </CardContent>
    </Card>
  );
}
