"use client";

import { cn } from "cn";
import { Info } from "lucide-react";
import { Area, AreaChart, ReferenceLine, XAxis, YAxis } from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { SectionCard } from "../../../admin/_components/admin-primitives";
import type { ProjectDashboard } from "./project-dashboard-data";

const HIGH_USAGE_RATIO = 0.8;

const chartConfig = {
  spent: { color: "var(--chart-1)", label: "Spent" },
  projected: { color: "var(--chart-1)", label: "Projected" },
} satisfies ChartConfig;

const formatUsd = (value: number) => `$${value}`;

function UnitMeter({
  label,
  limit,
  unit,
  used,
}: {
  readonly label: string;
  readonly limit: number;
  readonly unit: string;
  readonly used: number;
}) {
  const isHigh = used / limit >= HIGH_USAGE_RATIO;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground text-xs tabular-nums">
          <span className={cn("font-medium text-foreground", isHigh && "text-amber-700 dark:text-amber-400")}>
            {used}
          </span>
          /{limit} {unit} · {limit - used} left
        </span>
      </div>
      <div className="flex gap-0.5" role="img" aria-label={`${label}: ${used} of ${limit} ${unit} used`}>
        {Array.from({ length: limit }, (_, index) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: meter cells are positional and never reorder.
            key={index}
            className={cn(
              "h-2 flex-1 rounded-[2px] bg-muted",
              index < used && (isHigh ? "bg-amber-500" : "bg-primary"),
            )}
          />
        ))}
      </div>
    </div>
  );
}

export function BudgetUsageCard({
  budgets,
  live,
}: {
  readonly budgets: ProjectDashboard["budgets"];
  readonly live?: boolean;
}) {
  const { exploration, looks, resources } = budgets;
  const remaining = resources.limit - resources.used;
  const isOverProjected = resources.projected > resources.limit;

  if (live) {
    return (
      <SectionCard title="Budget use" description="Latest run" className="h-full">
        {resources.limit > 0 ? (
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-muted-foreground text-xs">Resources remaining</p>
              <p className="text-2xl tabular-nums tracking-tight">
                ${Math.max(0, remaining).toFixed(2)}
                <span className="ml-1 text-muted-foreground text-sm">of ${resources.limit.toFixed(2)}</span>
              </p>
            </div>
            <p className="text-muted-foreground text-sm">Spent ${resources.used.toFixed(2)}</p>
            <Badge variant={remaining < 0 ? "destructive" : "secondary"}>
              {remaining < 0 ? "Budget exceeded" : "Within budget"}
            </Badge>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">No run budget yet.</p>
        )}
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Budget use"
      action={
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="About budgets">
              <Info />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Tracked per run. Budgets are not interchangeable.</TooltipContent>
        </Tooltip>
      }
      className="h-full"
      contentClassName="flex flex-1 flex-col justify-between gap-5"
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-muted-foreground text-xs">Resources remaining</p>
            <p className="text-2xl tabular-nums leading-tight tracking-tight">
              {formatUsd(remaining)}
              <span className="ml-1 text-muted-foreground text-sm">of {formatUsd(resources.limit)}</span>
            </p>
          </div>
          <Badge
            className={cn(
              isOverProjected
                ? "bg-destructive/10 text-destructive"
                : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
            )}
          >
            {isOverProjected ? "Projected over" : "On track"}
          </Badge>
        </div>

        <ChartContainer config={chartConfig} className="h-28 w-full">
          <AreaChart data={resources.burn} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="budget-spent-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-spent)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="var(--color-spent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="week" axisLine={false} tickLine={false} tickMargin={6} tick={{ fontSize: 11 }} />
            <YAxis hide domain={[0, Math.round(resources.limit * 1.1)]} />
            <ReferenceLine
              y={resources.limit}
              stroke="var(--muted-foreground)"
              strokeDasharray="3 3"
              label={{
                value: `Cap ${formatUsd(resources.limit)}`,
                position: "insideTopLeft",
                fontSize: 11,
                fill: "var(--muted-foreground)",
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  formatter={(value, name) => `${chartConfig[name as keyof typeof chartConfig]?.label}: $${value}`}
                />
              }
            />
            <Area
              dataKey="projected"
              type="monotone"
              stroke="var(--color-projected)"
              strokeDasharray="4 4"
              strokeWidth={2}
              fill="none"
              connectNulls
            />
            <Area
              dataKey="spent"
              type="monotone"
              stroke="var(--color-spent)"
              strokeWidth={2}
              fill="url(#budget-spent-fill)"
            />
          </AreaChart>
        </ChartContainer>
        <p className="text-muted-foreground text-xs">
          Projected <span className="font-medium text-foreground">{formatUsd(resources.projected)}</span> by run end
        </p>
      </div>

      <div className="flex flex-col gap-4 border-t pt-4">
        <UnitMeter label="Exploration" used={exploration.used} limit={exploration.limit} unit="analyses" />
        <UnitMeter label="Looks" used={looks.used} limit={looks.limit} unit="looks" />
      </div>
    </SectionCard>
  );
}
