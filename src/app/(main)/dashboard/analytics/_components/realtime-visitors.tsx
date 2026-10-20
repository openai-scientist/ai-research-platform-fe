"use client";

import { cn } from "cn";
import { Ellipsis } from "lucide-react";
import { Bar, BarChart, type BarShapeProps, XAxis, YAxis } from "recharts";

import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";

type RealtimeDatum = {
  minute: number;
  visitors: number | null;
};

export type RealtimeBreakdownItem = {
  label: string;
  markerClassName: string;
  value: number;
};

const realtimeData: RealtimeDatum[] = [
  { minute: 1, visitors: 0 },
  { minute: 2, visitors: 6 },
  { minute: 3, visitors: 12 },
  { minute: 4, visitors: 20 },
  { minute: 5, visitors: 12 },
  { minute: 6, visitors: 0 },
  { minute: 7, visitors: 6 },
  { minute: 8, visitors: 6 },
  { minute: 9, visitors: 0 },
  { minute: 10, visitors: 4 },
  { minute: 11, visitors: 0 },
  { minute: 12, visitors: 20 },
  { minute: 13, visitors: 15 },
  { minute: 14, visitors: 4 },
  { minute: 15, visitors: 6 },
  { minute: 16, visitors: 0 },
  { minute: 17, visitors: 4 },
  { minute: 18, visitors: 12 },
  { minute: 19, visitors: 20 },
  { minute: 20, visitors: 0 },
  { minute: 21, visitors: 4 },
  { minute: 22, visitors: 20 },
  { minute: 23, visitors: 12 },
  { minute: 24, visitors: 0 },
  { minute: 25, visitors: 6 },
  { minute: 26, visitors: 6 },
  { minute: 27, visitors: 0 },
  { minute: 28, visitors: 20 },
  { minute: 29, visitors: 0 },
  { minute: 30, visitors: 4 },
];

const defaultBreakdown: RealtimeBreakdownItem[] = [
  { label: "United States", markerClassName: "flag:US", value: 14 },
  { label: "United Kingdom", markerClassName: "flag:GB", value: 4 },
  { label: "Canada", markerClassName: "flag:CA", value: 3 },
  { label: "India", markerClassName: "flag:IN", value: 3 },
];

function RealtimeBarShape(props: BarShapeProps) {
  const { height, payload, width, x, y } = props;
  const barPayload = payload as (typeof realtimeData)[number] | undefined;
  if (barPayload?.visitors == null) return <g />;
  const barHeightValue = Number(height);
  const barWidthValue = Number(width);
  const xValue = Number(x);
  const yValue = Number(y);
  const visitors = barPayload?.visitors ?? 0;
  const fill = "var(--color-visitors)";
  const fillOpacity = visitors >= 18 ? 0.95 : 0.4;
  const baselineFill = visitors === 0 ? "var(--destructive)" : fill;
  const baselineOpacity = visitors === 0 ? 1 : fillOpacity;
  const baselineY = yValue + barHeightValue - 2;
  const barGap = 4;
  const barHeight = Math.max(0, barHeightValue - barGap);

  return (
    <g>
      <rect
        x={xValue}
        y={baselineY}
        width={barWidthValue}
        height={2}
        rx={1}
        fill={baselineFill}
        fillOpacity={baselineOpacity}
      />
      {visitors > 0 && barHeight > 0 ? (
        <rect
          x={xValue}
          y={yValue}
          width={barWidthValue}
          height={barHeight}
          rx={2}
          fill={fill}
          fillOpacity={fillOpacity}
        />
      ) : null}
    </g>
  );
}

export function RealtimeVisitors({
  breakdown = defaultBreakdown,
  data = realtimeData,
  chartLabel = "Visitors",
  liveLabel = "Live",
  title = "Realtime Visitors",
  unit = "per minute",
  value = "24",
  live = true,
  emptyText,
  tooltipLabelFormatter,
  yDomain = [0, 22],
}: {
  readonly breakdown?: readonly RealtimeBreakdownItem[];
  readonly chartLabel?: string;
  readonly data?: readonly RealtimeDatum[];
  readonly liveLabel?: string;
  readonly title?: string;
  readonly unit?: string;
  readonly value?: string;
  readonly live?: boolean;
  readonly emptyText?: string;
  readonly tooltipLabelFormatter?: (value: number) => string;
  readonly yDomain?: [number, number | "auto"];
}) {
  const chartConfig = {
    visitors: {
      color: "var(--chart-3)",
      label: chartLabel,
    },
  } satisfies ChartConfig;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="font-normal">{title}</CardTitle>
        <CardAction>
          <Ellipsis className="size-4" />
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <div className="flex items-end justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl tabular-nums leading-none tracking-tight">{value}</span>
            <span className="text-muted-foreground text-sm">{unit}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <span className="relative flex size-2">
              {live && (
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-500 opacity-75" />
              )}
              <span
                className={cn(
                  "relative inline-flex size-2 rounded-full",
                  live ? "bg-green-500" : "bg-muted-foreground",
                )}
              />
            </span>
            <span>{liveLabel}</span>
          </div>
        </div>
        <div className="relative">
          <ChartContainer config={chartConfig} className="h-36 w-full">
            <BarChart data={[...data]} margin={{ bottom: 0, left: 0, right: 0, top: 0 }} barCategoryGap={3}>
              <XAxis dataKey="minute" hide />
              <YAxis hide domain={yDomain} />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    hideLabel={!tooltipLabelFormatter}
                    labelFormatter={(_, payload) => tooltipLabelFormatter?.(Number(payload[0]?.payload.minute))}
                  />
                }
              />
              <Bar dataKey="visitors" fill="var(--color-visitors)" shape={RealtimeBarShape} />
            </BarChart>
          </ChartContainer>
          {emptyText && !data.some((point) => point.visitors !== null) && (
            <Empty className="absolute inset-0 p-2">
              <EmptyHeader>
                <EmptyTitle>No historical data</EmptyTitle>
                <EmptyDescription>{emptyText}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </div>
        <div className="grid grid-cols-2">
          {breakdown.map((item, index) => (
            <div
              className={cn(
                "flex items-center gap-3 border-border/50",
                index < 2 ? "border-b pt-1 pb-4" : "pt-4 pb-1",
                index % 2 === 0 ? "border-r pr-5" : "pl-5",
              )}
              key={item.label}
            >
              <span
                aria-hidden="true"
                className={cn("shrink-0 rounded-xs text-lg ring-1 ring-foreground/10", item.markerClassName)}
              />
              <span className="min-w-0 flex-1 truncate text-sm">{item.label}</span>
              <span className="text-sm tabular-nums">{item.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
