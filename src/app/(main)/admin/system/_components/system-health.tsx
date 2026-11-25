"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Activity, CheckCircle2, Clock3, Gauge, RefreshCw, Server, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useAdminOverviewQuery, useMonitoringMetrics, useMonitoringServices } from "@/hooks/use-admin-monitoring-query";
import { useApiQuery } from "@/hooks/use-api";
import { adminKeys } from "@/lib/api/query-keys";
import type {
  MonitoringAlert,
  MonitoringMetricsPoint,
  MonitoringService,
  OverviewMetric,
} from "@/lib/api/services/admin-monitoring-types";
import { fetchAdmin } from "@/lib/api/services/fetch-admin";

import { RealtimeVisitors } from "../../../dashboard/analytics/_components/realtime-visitors";
import { TrafficQuality } from "../../../dashboard/analytics/_components/traffic-quality";
import {
  AdminPageHeader,
  InlineProgress,
  MetricCard,
  SectionCard,
  StatusBadge,
} from "../../_components/admin-primitives";

const REFRESH_MS = 30_000;
const UNAVAILABLE = "Unavailable";
const NOT_REPORTED = "Not reported by the backend";
const timeFormatter = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" });
const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});
const countFormatter = new Intl.NumberFormat("en-US");

function measured(metric: OverviewMetric | undefined): number | null {
  return metric?.available && metric.value !== null ? metric.value : null;
}

function elapsed(from: number, now: number) {
  const seconds = Math.max(0, Math.round((now - from) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.floor(seconds / 60)}m ago`;
}

function ServiceCard({
  name,
  metric,
  detail,
  status,
}: {
  readonly name: string;
  readonly metric: string | null;
  readonly detail: string;
  readonly status: "healthy" | "warning" | "critical" | "unknown" | null;
}) {
  return (
    <div className="rounded-xl border bg-muted/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Server className="size-4" />
        </div>
        {status === "healthy" && <StatusBadge status="Healthy" />}
        {status === "warning" && <StatusBadge status="Degraded" />}
        {status === "critical" && <StatusBadge status="Unavailable" />}
        {(status === "unknown" || status === null) && (
          <Badge variant="outline" className="text-muted-foreground">
            {status === "unknown" ? "Unknown" : UNAVAILABLE}
          </Badge>
        )}
      </div>
      <p className="mt-4 font-medium text-sm">{name}</p>
      <p className="mt-1 font-heading text-2xl tabular-nums">{metric ?? "—"}</p>
      <p className="mt-1 text-muted-foreground text-xs">{detail}</p>
    </div>
  );
}

function MiniHealth({ label, value }: { readonly label: string; readonly value: string | null }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className={value === null ? "mt-1 text-muted-foreground text-sm" : "mt-1 font-semibold tabular-nums"}>
        {value ?? UNAVAILABLE}
      </p>
    </div>
  );
}

function CapacityRow({ label, value }: { readonly label: string; readonly value: number | null }) {
  if (value === null) {
    return (
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="truncate">{label}</span>
        <span className="shrink-0 text-muted-foreground">{UNAVAILABLE}</span>
      </div>
    );
  }
  return <InlineProgress label={label} value={Math.min(100, Math.max(0, Math.round(value)))} />;
}

function incidentLevel(alert: MonitoringAlert): "Degraded" | "Unavailable" {
  return alert.severity === "critical" ? "Unavailable" : "Degraded";
}

function latestValue(points: readonly MonitoringMetricsPoint[], key: "cpu_percent" | "memory_percent" | "latency_ms") {
  for (let index = points.length - 1; index >= 0; index -= 1) {
    const value = points[index][key];
    if (value !== null) return value;
  }
  return null;
}

export function SystemHealth() {
  const runs = useAdminOverviewQuery({ section: "overview" }, true);
  const services = useMonitoringServices({}, true);
  const platformApi: MonitoringService | undefined =
    services.data?.data.find((service) => service.code === "platform-api") ?? services.data?.data[0];
  const metrics = useMonitoringMetrics(platformApi?.id ?? "", { interval_seconds: 60 }, Boolean(platformApi), 3600);
  const providers = useApiQuery(adminKeys.providerMetrics(), fetchAdmin.getProviderMetrics, { staleTime: 0 });

  const [now, setNow] = useState(() => Date.now());
  const [refreshing, setRefreshing] = useState(false);
  const refetchAll = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([runs.refetch(), services.refetch(), metrics.refetch(), providers.refetch()]);
    setNow(Date.now());
    setRefreshing(false);
  }, [runs, services, metrics, providers]);

  // Refresh the figures while the tab is visible; the elapsed label keeps counting.
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refetchAll();
      else setNow(Date.now());
    }, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [refetchAll]);

  const updatedAt = Math.max(runs.dataUpdatedAt, services.dataUpdatedAt, metrics.dataUpdatedAt);
  const loading = metrics.isPending;

  const runMetrics = runs.data?.data.metrics;
  const activeRuns = measured(runMetrics?.active_runs);
  const queuedRuns = measured(runMetrics?.queued_research_runs);

  const metricsData = metrics.data?.data;
  const points = useMemo(() => metricsData?.points ?? [], [metricsData]);
  const seriesAvailable =
    metricsData?.available === true && points.some((point) => point.request_rate_per_second !== null);
  const peak = Math.max(0, ...points.map((point) => point.request_rate_per_second ?? 0));
  const chartData = points.map((point, index) => ({
    dayIndex: index + 1,
    actualQuality: point.request_rate_per_second,
    baselineQuality: null,
  }));
  const recent = points.slice(-30).map((point) => ({
    minute: Date.parse(point.timestamp),
    visitors: point.request_rate_per_second === null ? null : Math.round(point.request_rate_per_second * 60),
  }));
  const lastMinute = recent.at(-1)?.visitors;
  const chartNote = metrics.isPending
    ? "Loading request telemetry…"
    : metricsData?.available === false
      ? "Request telemetry is incomplete for this window."
      : "No requests were observed in this window.";

  const providerMetrics = providers.data;
  const providerStatus: MonitoringService["status"] | null =
    providerMetrics?.failure_rate == null
      ? null
      : providerMetrics.failure_rate >= 0.1
        ? "critical"
        : providerMetrics.failure_rate >= 0.02
          ? "warning"
          : "healthy";

  const alerts = (services.data?.data ?? [])
    .flatMap((service) => service.alerts)
    .sort((a, b) => Date.parse(b.started_at) - Date.parse(a.started_at))
    .slice(0, 5);
  const recentPoints = points.slice(-15);
  const rates = recentPoints.flatMap((point) =>
    point.request_rate_per_second === null ? [] : [point.request_rate_per_second],
  );
  const errors = recentPoints.flatMap((point) => (point.error_rate_percent === null ? [] : [point.error_rate_percent]));
  const requestRate = rates.length ? rates.reduce((sum, value) => sum + value, 0) / rates.length : null;
  const errorRate = errors.length ? errors.reduce((sum, value) => sum + value, 0) / errors.length : null;
  const p95 = latestValue(points, "latency_ms");
  const cpu = latestValue(points, "cpu_percent");
  const memory = latestValue(points, "memory_percent");

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        eyebrow="Operations"
        title="System Health"
        description="Monitor infrastructure, runtime performance, sandbox capacity, and provider availability."
        actions={
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground text-xs">
              {updatedAt ? `Updated ${elapsed(updatedAt, now)}` : "Not updated yet"}
            </span>
            <Button size="sm" variant="outline" disabled={refreshing} onClick={() => void refetchAll()}>
              {refreshing ? <Spinner data-icon="inline-start" /> : <RefreshCw data-icon="inline-start" />}
              Refresh status
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="API latency"
          value={loading ? "—" : p95 === null ? UNAVAILABLE : `${Math.round(p95)}ms`}
          detail={p95 === null && !loading ? NOT_REPORTED : "p95 · latest minute"}
          icon={Gauge}
        />
        <MetricCard
          label="Service uptime"
          value={loading ? "—" : UNAVAILABLE}
          detail={NOT_REPORTED}
          icon={CheckCircle2}
        />
        <MetricCard
          label="Request rate"
          value={loading ? "—" : requestRate === null ? UNAVAILABLE : `${requestRate.toFixed(1)} req/s`}
          detail={requestRate === null && !loading ? NOT_REPORTED : "average · last 15 minutes"}
          icon={Activity}
        />
        <MetricCard
          label="Active agent runs"
          value={runs.isPending ? "—" : activeRuns === null ? UNAVAILABLE : countFormatter.format(activeRuns)}
          detail={activeRuns === null && !runs.isPending ? NOT_REPORTED : "currently running"}
          icon={Zap}
        />
        <MetricCard
          label="Queued runs"
          value={runs.isPending ? "—" : queuedRuns === null ? UNAVAILABLE : countFormatter.format(queuedRuns)}
          detail={queuedRuns === null && !runs.isPending ? NOT_REPORTED : "waiting to start"}
          icon={Clock3}
          trend="neutral"
        />
      </div>

      <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-7">
          <TrafficQuality
            actualLabel="Requests"
            chartData={seriesAvailable ? chartData : []}
            description="Requests per second handled by the platform API over the last hour."
            emptyText={chartNote}
            title="Request throughput"
            tooltipLabel="Requests per second"
            tooltipLabelFormatter={(index) => {
              const point = points[index - 1];
              return point ? timeFormatter.format(Date.parse(point.timestamp)) : "";
            }}
            xDomain={[1, Math.max(points.length, 2)]}
            xTicks={points.length > 3 ? [1, Math.ceil(points.length / 3), Math.ceil((points.length * 2) / 3)] : []}
            xTickFormatter={(index) => {
              const point = points[index - 1];
              return point ? timeFormatter.format(Date.parse(point.timestamp)) : "";
            }}
            yDomain={[0, Math.max(1, Math.ceil(peak * 1.2 * 10) / 10)]}
            yTickFormatter={(value) => value.toFixed(1)}
          />
        </div>
        <div className="min-w-0 xl:col-span-5">
          <RealtimeVisitors
            breakdown={[]}
            chartLabel="Requests"
            data={seriesAvailable ? recent : []}
            emptyText={chartNote}
            live={seriesAvailable}
            liveLabel={seriesAvailable ? "Receiving traffic" : "No observations"}
            title="Live request rate"
            tooltipLabelFormatter={(minute) => timeFormatter.format(minute)}
            unit="requests / min"
            value={lastMinute == null ? "—" : countFormatter.format(lastMinute)}
            yDomain={[0, "auto"]}
          />
        </div>
      </div>

      <SectionCard
        title="Service health"
        description="Current health across infrastructure and runtime components."
        action={
          errorRate !== null ? <Badge variant="outline">{errorRate.toFixed(2)}% request errors</Badge> : undefined
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ServiceCard
            name="Backend API"
            metric={metricsData || platformApi ? (p95 === null ? null : `${Math.round(p95)}ms`) : null}
            detail={p95 === null ? NOT_REPORTED : "p95 latency"}
            status={platformApi?.status ?? null}
          />
          <ServiceCard
            name="LLM providers"
            metric={
              providerMetrics?.failure_rate == null ? null : `${(providerMetrics.failure_rate * 100).toFixed(1)}%`
            }
            detail={providerMetrics?.failure_rate == null ? NOT_REPORTED : "gateway error rate today"}
            status={providerStatus}
          />
          <ServiceCard name="Database" metric={null} detail={NOT_REPORTED} status={null} />
          <ServiceCard name="Storage" metric={null} detail={NOT_REPORTED} status={null} />
          <ServiceCard name="Secure Sandbox" metric={null} detail={NOT_REPORTED} status={null} />
          <ServiceCard name="Queue / Worker" metric={null} detail={NOT_REPORTED} status={null} />
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-7">
          <SectionCard
            className="h-full"
            title="Runtime capacity"
            description="Execution pressure across the API and worker resources."
          >
            <div className="grid gap-5 xl:grid-cols-[1.15fr_1fr]">
              <div className="space-y-5">
                <CapacityRow label="CPU usage" value={cpu} />
                <CapacityRow label="Memory usage" value={memory} />
                <CapacityRow label="Queued executions" value={null} />
              </div>
              <div className="grid grid-cols-2 gap-4 rounded-xl border bg-muted/20 p-4">
                <MiniHealth
                  label="Active runs"
                  value={activeRuns === null ? null : countFormatter.format(activeRuns)}
                />
                <MiniHealth
                  label="Queued runs"
                  value={queuedRuns === null ? null : countFormatter.format(queuedRuns)}
                />
                <MiniHealth label="Active sandboxes" value={null} />
                <MiniHealth label="Average execution" value={null} />
              </div>
            </div>
          </SectionCard>
        </div>
        <div className="min-w-0 xl:col-span-5">
          <SectionCard
            className="h-full"
            title="Recent incidents"
            description="Alerts that affected reliability or execution."
          >
            {alerts.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {services.isPending ? "Loading alerts…" : "No alerts have been raised."}
              </p>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div key={alert.id} className="flex items-start gap-3 rounded-lg border p-3">
                    <StatusBadge status={incidentLevel(alert)} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm">{alert.message}</p>
                      <p className="mt-1 text-muted-foreground text-xs">
                        {dateTimeFormatter.format(Date.parse(alert.started_at))}
                        {alert.resolved_at ? " · Resolved" : " · Active"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
