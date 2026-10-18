"use client";

import type { AdminOverviewData, OverviewSection } from "@/lib/api/services/admin-monitoring-types";

import { AnalyticsKpiStrip } from "../../dashboard/analytics/_components/analytics-kpi-strip";
import { RealtimeVisitors } from "../../dashboard/analytics/_components/realtime-visitors";
import { TopPages } from "../../dashboard/analytics/_components/top-pages";
import { TopTrafficSources } from "../../dashboard/analytics/_components/top-traffic-sources";
import { TrafficQuality } from "../../dashboard/analytics/_components/traffic-quality";
import { formatTimestamp } from "./admin-api-utils";
import { InlineProgress, SectionCard } from "./admin-primitives";
import { breakdownTabs, liveBreakdown, overviewKpis } from "./overview-presentation";
import { availabilityReason, formatMeasurement, readableKey, TelemetryEmpty } from "./telemetry-ui";

type Props = { data?: AdminOverviewData; section: OverviewSection };

function formatBucketTime(timestamp: number, timezone?: string) {
  return new Date(timestamp).toLocaleString("en-US", {
    timeZone: timezone,
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function OverviewTrend({
  data,
  seriesKey,
  title,
  description,
  actualLabel,
  baselineLabel,
}: {
  data?: AdminOverviewData;
  seriesKey: string;
  title: string;
  description: string;
  actualLabel: string;
  baselineLabel: string;
}) {
  const series = data?.series.find((item) => item.key === seriesKey);
  const start = data ? Date.parse(data.window.from) : 0;
  const end = data ? Date.parse(data.window.to) : 1;
  const points = series?.available
    ? series.points.map((point) => ({
        dayIndex: Date.parse(point.timestamp),
        actualQuality: point.value,
        baselineQuality: point.target,
      }))
    : [];
  const max = Math.max(1, ...points.flatMap((point) => [point.actualQuality ?? 0, point.baselineQuality ?? 0]));
  return (
    <TrafficQuality
      title={title}
      description={description}
      actualLabel={actualLabel}
      baselineLabel={baselineLabel}
      chartData={points}
      tooltipLabel={title}
      tooltipLabelFormatter={(timestamp) => formatBucketTime(timestamp, data?.window.timezone)}
      showPoints
      xDomain={[start, end]}
      xTicks={[0.1, 0.35, 0.6, 0.85].map((fraction) => start + (end - start) * fraction)}
      xTickFormatter={(value) =>
        new Date(value).toLocaleDateString("en-US", {
          timeZone: data?.window.timezone,
          month: "short",
          day: "numeric",
        })
      }
      yDomain={[0, series?.unit === "percent" ? 100 : max]}
      yTickFormatter={(value) => formatMeasurement(value, series?.unit)}
      emptyText={
        !data
          ? "Loading…"
          : series?.available
            ? "No observations in this time window."
            : availabilityReason(
                data.unavailable_fields.find((item) => item.key === `series.${seriesKey}`)?.reason_code,
              )
      }
    />
  );
}

function RealtimeMetric({
  data,
  metricKey,
  seriesKey,
  breakdownKey,
  title,
  unit,
}: {
  data?: AdminOverviewData;
  metricKey: string;
  seriesKey: string;
  breakdownKey: string;
  title: string;
  unit: string;
}) {
  const metric = data?.metrics[metricKey];
  const series = data?.series.find((item) => item.key === seriesKey);
  return (
    <RealtimeVisitors
      title={title}
      chartLabel={seriesKey === "active_runs" ? "Runs in progress during bucket" : title}
      live={false}
      liveLabel="Snapshot"
      unit={unit}
      value={metric?.available ? formatMeasurement(metric.value) : "—"}
      data={
        series?.available
          ? series.points.map((point) => ({ minute: Date.parse(point.timestamp), visitors: point.value }))
          : []
      }
      tooltipLabelFormatter={(timestamp) => formatBucketTime(timestamp, data?.window.timezone)}
      breakdown={liveBreakdown(data, breakdownKey)}
      yDomain={[0, "auto"]}
      emptyText={
        !data
          ? "Loading…"
          : availabilityReason(data.unavailable_fields.find((item) => item.key === `series.${seriesKey}`)?.reason_code)
      }
    />
  );
}

function PortfolioProgress({ data, metricKey, label }: { data?: AdminOverviewData; metricKey: string; label: string }) {
  const metric = data?.metrics[metricKey];
  if (metric?.available && metric.value !== null) return <InlineProgress label={label} value={metric.value} />;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-4 text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground text-xs">Unavailable</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted" />
    </div>
  );
}

function RecentRuns({ data }: { data?: AdminOverviewData }) {
  return (
    <TopPages
      title="Recent experiment runs"
      viewsLabel="Status"
      timeLabel="Duration"
      bounceLabel="Project"
      rows={(data?.recent_runs ?? []).map((run) => ({
        id: run.id,
        path: `${run.id.slice(0, 8)} · ${run.topic ?? run.project_name}`,
        views: readableKey(run.status),
        time: run.duration_ms === null ? "—" : formatMeasurement(run.duration_ms, "ms"),
        bounce: run.project_name,
      }))}
      emptyText={!data ? "Loading…" : "No research runs in this time window."}
    />
  );
}

export function OverviewContent({ data, section }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <AnalyticsKpiStrip items={overviewKpis(section, data)} />
      {section === "overview" && (
        <>
          <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-12">
            <div className="min-w-0 xl:col-span-7">
              <OverviewTrend
                data={data}
                seriesKey="execution_reliability"
                title="Execution reliability"
                actualLabel="Successful runs"
                baselineLabel="Reliability target"
                description="Completed experiment runs against the platform reliability target."
              />
            </div>
            <div className="min-w-0 xl:col-span-5">
              <RealtimeMetric
                data={data}
                metricKey="active_runs"
                seriesKey="active_runs"
                breakdownKey="active_runs_by_service"
                title="Active experiment runs"
                unit="runs now"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-12">
            <div className="min-w-0 xl:col-span-7">
              <RecentRuns data={data} />
            </div>
            <div className="min-w-0 xl:col-span-5">
              <TopTrafficSources
                title="Platform activity"
                valueLabel="Activity"
                tabs={breakdownTabs(data, [
                  ["activity_by_service", "Services"],
                  ["token_usage_by_model", "Models"],
                  ["runs_by_project", "Projects"],
                ])}
              />
            </div>
          </div>
        </>
      )}
      {section === "operations" && (
        <>
          <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-12">
            <div className="min-w-0 xl:col-span-7">
              <OverviewTrend
                data={data}
                seriesKey="service_reliability"
                title="Service reliability"
                actualLabel="Observed uptime"
                baselineLabel="SLO target"
                description="Platform availability and service reliability across the selected time window."
              />
            </div>
            <div className="min-w-0 xl:col-span-5">
              <RealtimeMetric
                data={data}
                metricKey="request_rate"
                seriesKey="request_rate"
                breakdownKey="request_rate_by_service"
                title="Request throughput"
                unit="req/s"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-12">
            <div className="min-w-0 xl:col-span-5">
              <RealtimeMetric
                data={data}
                metricKey="queue_depth"
                seriesKey="queue_depth"
                breakdownKey="pending_jobs_by_queue"
                title="Queue depth"
                unit="jobs pending"
              />
            </div>
            <div className="min-w-0 xl:col-span-7">
              <TopTrafficSources
                title="Service load"
                valueLabel="Requests"
                tabs={breakdownTabs(data, [
                  ["requests_by_service", "Services"],
                  ["requests_by_region", "Regions"],
                  ["pending_jobs_by_queue", "Queues"],
                ])}
              />
            </div>
          </div>
          <TopPages
            title="Recent operational events"
            viewsLabel="Level"
            timeLabel="Duration"
            bounceLabel="Status"
            rows={(data?.recent_events ?? []).map((event) => ({
              id: event.id,
              path: `${event.message} · ${formatTimestamp(event.created_at)}`,
              views: event.level,
              time: event.duration_ms === null ? "—" : formatMeasurement(event.duration_ms, "ms"),
              bounce: event.status ?? "—",
            }))}
            emptyText={!data ? "Loading…" : "No technical events in this time window."}
          />
        </>
      )}
      {section === "projects" && (
        <>
          <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-12">
            <div className="min-w-0 xl:col-span-7">
              <OverviewTrend
                data={data}
                seriesKey="project_execution_health"
                title="Project execution health"
                actualLabel="Execution health"
                baselineLabel="Project target"
                description="Successful experiment execution across all research projects."
              />
            </div>
            <div className="min-w-0 xl:col-span-5">
              <RealtimeMetric
                data={data}
                metricKey="active_runs"
                seriesKey="active_runs"
                breakdownKey="active_runs_by_service"
                title="Live project runs"
                unit="runs now"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-12">
            <div className="min-w-0 xl:col-span-7">
              <TopTrafficSources
                title="Project workload"
                valueLabel="Runs"
                tabs={breakdownTabs(data, [
                  ["runs_by_project", "Runs"],
                  ["runs_by_owner", "Owners"],
                  ["projects_by_status", "Status"],
                ])}
              />
            </div>
            <div className="min-w-0 xl:col-span-5">
              <SectionCard
                title="Portfolio health"
                description="Current lifecycle and resource posture across projects."
              >
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ["total_projects", "Total projects"],
                    ["active_projects", "Active"],
                    ["projects_in_review", "In review"],
                    ["archived_projects", "Archived"],
                  ].map(([key, label]) => (
                    <div key={key} className="rounded-lg border p-3">
                      <p className="text-muted-foreground text-xs">{label}</p>
                      <p className="mt-1 font-heading text-2xl tabular-nums">
                        {data?.metrics[key]?.available ? formatMeasurement(data.metrics[key].value) : "—"}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex flex-col gap-4">
                  <PortfolioProgress data={data} metricKey="active_project_capacity" label="Active project capacity" />
                  <PortfolioProgress data={data} metricKey="review_completion" label="Review completion" />
                  <PortfolioProgress data={data} metricKey="monthly_budget_used" label="Monthly budget used" />
                </div>
              </SectionCard>
            </div>
          </div>
        </>
      )}
      {section === "governance" && (
        <>
          <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-12">
            <div className="min-w-0 xl:col-span-7">
              <OverviewTrend
                data={data}
                seriesKey="decision_gate_quality"
                title="Decision gate quality"
                actualLabel="Observed quality"
                baselineLabel="Governance target"
                description="Decision-gate quality against the governance baseline."
              />
            </div>
            <div className="min-w-0 xl:col-span-5">
              <TopTrafficSources
                title="Decision routing"
                valueLabel="Decisions"
                tabs={breakdownTabs(data, [
                  ["decisions_by_outcome", "Outcomes"],
                  ["decisions_by_type", "Decision types"],
                  ["decisions_by_routing", "Routing"],
                ])}
              />
            </div>
          </div>
          <SectionCard
            title="Recent governance activity"
            description="Decision records, overrides, and provenance changes across the platform."
          >
            <TelemetryEmpty
              description={
                !data
                  ? "Loading…"
                  : availabilityReason(
                      data.unavailable_fields.find((item) => item.key === "governance_events")?.reason_code,
                    )
              }
            />
          </SectionCard>
          <SectionCard
            title="Decision gates"
            description="Active providers and escalation rules for bounded decisions."
          >
            <TelemetryEmpty
              description={
                !data
                  ? "Loading…"
                  : availabilityReason(
                      data.unavailable_fields.find((item) => item.key === "decision_gates")?.reason_code,
                    )
              }
            />
          </SectionCard>
          <SectionCard title="Governance controls" description="Coverage and review safeguards for research decisions.">
            <div className="grid gap-5 md:grid-cols-3">
              <PortfolioProgress data={data} metricKey="audit_trail_completeness" label="Audit trail completeness" />
              <PortfolioProgress
                data={data}
                metricKey="provenance_linked_findings"
                label="Provenance linked to findings"
              />
              <PortfolioProgress data={data} metricKey="review_sla_within_target" label="Review SLA within target" />
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
}
