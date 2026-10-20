"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

import { SectionCard } from "../../../admin/_components/admin-primitives";
import type { ProjectDashboard } from "./project-dashboard-data";

const chartConfig = {
  // Same theme chart tokens as the experiments meter in the KPI strip.
  completed: { color: "var(--chart-3)", label: "Completed" },
  needsReview: { color: "var(--chart-4)", label: "Needs review" },
  failed: { color: "var(--chart-2)", label: "Failed (technical)" },
} satisfies ChartConfig;

export function ExperimentActivityCard({ activity }: { readonly activity: ProjectDashboard["experimentActivity"] }) {
  return (
    <SectionCard title="Experiment runs per week" className="h-full" contentClassName="flex flex-1 flex-col">
      {activity.length === 0 && <p className="text-muted-foreground text-sm">No runs yet.</p>}
      {/* Grows with the neighbouring budget card; aspect-auto drops the container's default aspect-video. */}
      <ChartContainer config={chartConfig} className="aspect-auto min-h-64 w-full flex-1">
        <BarChart accessibilityLayer data={activity} margin={{ left: -20, right: 0, top: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="week" axisLine={false} tickLine={false} tickMargin={10} tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} axisLine={false} tickLine={false} tickMargin={8} tick={{ fontSize: 12 }} />
          <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar dataKey="completed" stackId="runs" fill="var(--color-completed)" />
          <Bar dataKey="needsReview" stackId="runs" fill="var(--color-needsReview)" />
          <Bar dataKey="failed" stackId="runs" fill="var(--color-failed)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartContainer>
    </SectionCard>
  );
}
