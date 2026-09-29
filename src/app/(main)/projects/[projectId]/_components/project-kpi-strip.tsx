import type { ReactNode } from "react";

import { cn } from "cn";

import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { ProjectDashboard } from "./project-dashboard-data";

type Segment = { label: string; value: number; className: string; emphasize?: boolean };

function SegmentBar({ segments }: { readonly segments: readonly Segment[] }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        {total > 0 &&
          segments
            .filter((segment) => segment.value > 0)
            .map((segment) => (
              <div
                key={segment.label}
                className={cn("h-full", segment.className)}
                style={{ width: `${(segment.value / total) * 100}%` }}
              />
            ))}
      </div>
      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground text-xs">
        {segments.map((segment) => (
          <li key={segment.label} className="flex items-center gap-1.5">
            <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", segment.className)} />
            <span
              className={cn(
                "font-medium text-foreground tabular-nums",
                segment.emphasize && segment.value > 0 && "text-destructive",
              )}
            >
              {segment.value}
            </span>
            {segment.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function KpiCell({
  badge,
  children,
  label,
  unit,
  value,
}: {
  readonly badge?: ReactNode;
  readonly children: ReactNode;
  readonly label: string;
  readonly unit?: string;
  readonly value: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-normal text-muted-foreground text-sm">{label}</CardTitle>
        {badge && <CardAction>{badge}</CardAction>}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between gap-4">
        <p className="text-3xl leading-none tracking-tight tabular-nums">
          {value}
          {unit && <span className="ml-1 text-base text-muted-foreground">{unit}</span>}
        </p>
        {children}
      </CardContent>
    </Card>
  );
}

const reportBadgeClassNames: Record<ProjectDashboard["report"]["status"], string> = {
  "Not started": "bg-muted text-muted-foreground",
  Drafting: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  "In review": "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  Published: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
};

export function ProjectKpiStrip({ dashboard }: { readonly dashboard: ProjectDashboard }) {
  const { experimentStats: stats, outcomes, report, warnings } = dashboard;
  const finishedRuns = stats.completed + stats.failed;
  const successRate = finishedRuns === 0 ? 0 : Math.round((stats.completed / finishedRuns) * 100);
  const warningCount = (severity: ProjectDashboard["warnings"][number]["severity"]) =>
    warnings.filter((warning) => warning.severity === severity).length;
  const reportPercent = Math.round((report.sectionsDone / report.sectionsTotal) * 100);

  return (
    <div className="overflow-hidden rounded-xl bg-card shadow-xs ring-1 ring-foreground/10">
      <div className="grid divide-y *:data-[slot=card]:rounded-none *:data-[slot=card]:ring-0 md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-4">
        <KpiCell
          label="Experiments"
          value={String(stats.total)}
          badge={
            <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">{successRate}% success</Badge>
          }
        >
          <SegmentBar
            segments={[
              { label: "done", value: stats.completed, className: "bg-chart-3" },
              { label: "running", value: stats.running, className: "bg-chart-1" },
              { label: "review", value: stats.needsReview, className: "bg-chart-4" },
              { label: "failed", value: stats.failed, className: "bg-chart-2" },
            ]}
          />
        </KpiCell>

        <KpiCell
          label="Official outcomes"
          value={String(outcomes.finding + outcomes.negative + outcomes.inconclusive)}
        >
          <SegmentBar
            segments={[
              { label: "findings", value: outcomes.finding, className: "bg-chart-3" },
              { label: "negative", value: outcomes.negative, className: "bg-chart-4" },
              { label: "inconclusive", value: outcomes.inconclusive, className: "bg-chart-1" },
            ]}
          />
        </KpiCell>

        <KpiCell label="Unresolved warnings" value={String(warnings.length)}>
          <SegmentBar
            segments={[
              { label: "blocking", value: warningCount("Blocking"), className: "bg-chart-2", emphasize: true },
              { label: "warning", value: warningCount("Warning"), className: "bg-chart-4" },
              { label: "info", value: warningCount("Info"), className: "bg-chart-1" },
            ]}
          />
        </KpiCell>

        <KpiCell
          label="Report"
          value={`${report.sectionsDone}/${report.sectionsTotal}`}
          unit="sections"
          badge={<Badge className={reportBadgeClassNames[report.status]}>{report.status}</Badge>}
        >
          <div className="flex flex-col gap-2">
            <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
              <div className="h-full rounded-full bg-chart-3" style={{ width: `${reportPercent}%` }} />
            </div>
            <p className="truncate text-muted-foreground text-xs">
              <span className="font-medium text-foreground tabular-nums">{reportPercent}%</span> complete ·{" "}
              {report.detail}
            </p>
          </div>
        </KpiCell>
      </div>
    </div>
  );
}
