"use client";

import { Fragment } from "react";

import Link from "next/link";

import { cn } from "cn";
import { Activity, Download, Filter, Pause, Play, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { APP_CONFIG } from "@/config/app-config";
import { useAcknowledgeMonitoringAlert } from "@/hooks/use-admin-monitoring-query";
import type {
  MonitoringEvent,
  MonitoringMetricsData,
  MonitoringPipeline,
  MonitoringService,
} from "@/lib/api/services/admin-monitoring-types";
import { ApiError, type Pagination } from "@/types/api";

import { AdminApiPagination } from "../../_components/admin-api-table";
import { formatTimestamp } from "../../_components/admin-api-utils";
import { MonitoringSignals, MonitorSignal } from "./monitoring-signals";

type Props = {
  services: MonitoringService[];
  service?: MonitoringService;
  metrics?: MonitoringMetricsData;
  events: MonitoringEvent[];
  status: string;
  pipeline: MonitoringPipeline | null;
  paused: boolean;
  enabled: boolean;
  pending: boolean;
  busy: boolean;
  failed: boolean;
  pagination?: Pagination | null;
  offset: number;
  onPage: (offset: number) => void;
  servicePagination?: Pagination | null;
  serviceOffset: number;
  onServicePage: (offset: number) => void;
  tab: string;
  onTab: (tab: string) => void;
  onSelect: (id: string) => void;
  onPause: () => void;
  onRefresh: () => void;
  onFilter: () => void;
  onEvent: (id: string) => void;
};

function ServiceTile({
  service,
  active,
  metrics,
  onSelect,
}: {
  service: MonitoringService;
  active: boolean;
  metrics?: MonitoringMetricsData;
  onSelect: (id: string) => void;
}) {
  const alert = service.alerts.some((item) => !item.acknowledged_at);
  return (
    <button
      type="button"
      onClick={() => onSelect(service.id)}
      aria-pressed={active}
      aria-label={`Open ${service.name}`}
      className={cn(
        "flex min-h-36 min-w-0 flex-col bg-card p-2 text-left text-card-foreground hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active && "ring-2 ring-primary ring-inset",
      )}
    >
      <div className="flex w-full items-start justify-between gap-2">
        <span className="truncate font-medium text-sm">
          {service.code} {service.name}
        </span>
        <Badge className="shrink-0 rounded-none" variant={service.status === "critical" ? "destructive" : "outline"}>
          {alert ? "Alert" : service.status}
        </Badge>
      </div>
      <div className="flex w-full flex-1 items-center">
        <MonitorSignal compact metrics={metrics} metricKey="request_rate_per_second" kind="ecg" />
      </div>
      <dl className="mt-auto grid w-full min-w-0 grid-cols-2 divide-x divide-border tabular-nums">
        <div className="min-w-0 pr-2">
          <dt className="text-lime-500 text-xs dark:text-lime-400">REQ/S</dt>
          <dd className="text-right font-medium text-lime-500 text-xl leading-none dark:text-lime-400">
            {service.metrics.available && service.metrics.request_rate_per_second !== null
              ? service.metrics.request_rate_per_second.toLocaleString("en-US", { maximumFractionDigits: 2 })
              : "—"}
          </dd>
        </div>
        <div className="min-w-0 pl-2">
          <dt className="text-cyan-500 text-xs dark:text-cyan-400">ERR</dt>
          <dd className="text-right font-medium text-cyan-500 text-xl leading-none dark:text-cyan-400">
            {service.metrics.available && service.metrics.error_rate_percent !== null
              ? `${service.metrics.error_rate_percent.toLocaleString("en-US", { maximumFractionDigits: 2 })}%`
              : "—"}
          </dd>
        </div>
      </dl>
    </button>
  );
}

export function MonitoringConsole(props: Props) {
  const { service, services, metrics, events } = props;
  const acknowledge = useAcknowledgeMonitoringAlert();
  async function acknowledgeAlert(id: string) {
    try {
      await acknowledge.mutateAsync(id);
      toast.success("Alert acknowledged", { description: "The alert remains active until it recovers." });
    } catch (error) {
      if (error instanceof ApiError && (error.code === "ALERT_RESOLVED" || error.code === "NOT_FOUND"))
        props.onRefresh();
    }
  }
  function exportEvents() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(events, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "monitoring-events.json";
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success(`${events.length} events exported.`);
  }
  return (
    <div
      className="flex min-h-[calc(100svh-var(--dashboard-header-height))] min-w-0 flex-col"
      data-content-padding="false"
    >
      <div className="grid min-h-10 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-2 py-2 text-sm lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:py-0">
        <div className="truncate">{APP_CONFIG.name.toUpperCase()} LOG MONITORING</div>
        <div className="whitespace-nowrap">{props.servicePagination?.total ?? services.length} Services</div>
        <div className="col-span-2 flex flex-wrap items-center justify-between gap-3 text-muted-foreground lg:col-span-1 lg:justify-end">
          <span className="tabular-nums">
            {service?.observed_at ? formatTimestamp(service.observed_at) : "Waiting for observations"}
          </span>
          <span className="inline-flex items-center gap-1" title={`Stream: ${props.status}`}>
            <Activity className="size-4" />
            <span className="sr-only">Stream:</span>
            {props.status}
          </span>
          <span
            className="inline-flex items-center gap-1"
            title={`Audit pipeline: ${props.pipeline?.audit_pipeline_status ?? "unknown"}`}
          >
            <ShieldCheck className="size-4" />
            <span className="sr-only">Audit pipeline:</span>
            {props.pipeline?.audit_pipeline_status ?? "unknown"}
          </span>
        </div>
      </div>
      <Separator />
      <div className="grid min-h-0 min-w-0 flex-1 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <aside className="flex min-w-0 flex-col">
          <div className="grid grid-cols-2 content-start *:border-r *:border-b *:border-border *:even:border-r-0">
            {props.pending && services.length === 0 ? (
              <>
                <Skeleton className="h-36 w-full rounded-none" />
                <Skeleton className="h-36 w-full rounded-none" />
              </>
            ) : (
              services.map((item) => (
                <ServiceTile
                  key={item.id}
                  service={item}
                  active={service?.id === item.id}
                  metrics={service?.id === item.id ? metrics : undefined}
                  onSelect={props.onSelect}
                />
              ))
            )}
          </div>
          {!props.pending && !props.failed && services.length === 0 && props.enabled && (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>No services</EmptyTitle>
                <EmptyDescription>No services match the selected environment.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
          {(props.servicePagination?.total ?? 0) > 20 && (
            <AdminApiPagination
              pagination={props.servicePagination}
              offset={props.serviceOffset}
              limit={20}
              busy={props.busy || !props.enabled}
              onPage={props.onServicePage}
            />
          )}
        </aside>
        <div className="flex min-h-0 min-w-0 flex-col border-border lg:border-l">
          <div className="flex min-h-11 flex-wrap items-center gap-4 bg-muted/50 px-3 py-1">
            <div className="flex min-w-0 items-center gap-3 font-medium">
              <Badge className="rounded-none" variant="outline">
                {service?.code ?? "Service"}
              </Badge>
              <span className="truncate text-lg">{service?.name ?? "Select a service"}</span>
            </div>
            <span className="text-muted-foreground text-sm">
              {service ? `${service.environment} · ${service.category}` : ""}
            </span>
            <div className="ml-auto flex items-center gap-1">
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Filter logs"
                onClick={props.onFilter}
                disabled={!props.enabled}
              >
                <Filter />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Refresh monitoring"
                onClick={props.onRefresh}
                disabled={props.busy || !props.enabled}
              >
                <RefreshCw />
              </Button>
            </div>
          </div>
          <Separator />
          {service?.alerts.map((alert) => (
            <Alert
              key={alert.id}
              className={cn(
                "min-h-9 rounded-none border-x-0 border-t-0 pr-32",
                !alert.acknowledged_at
                  ? "border-amber-500 bg-amber-400 text-amber-950"
                  : "border-border bg-muted text-foreground",
              )}
            >
              <AlertTitle>{alert.message}</AlertTitle>
              <AlertDescription>Since {formatTimestamp(alert.started_at)}</AlertDescription>
              <AlertAction className="top-1/2 -translate-y-1/2">
                <Button
                  className="rounded-none"
                  variant="secondary"
                  size="sm"
                  disabled={!props.enabled || acknowledge.isPending || Boolean(alert.acknowledged_at)}
                  onClick={() => void acknowledgeAlert(alert.id)}
                >
                  {alert.acknowledged_at ? "Acknowledged" : "Acknowledge"}
                </Button>
              </AlertAction>
            </Alert>
          ))}
          {service && <MonitoringSignals service={service} metrics={metrics} />}
          <Tabs value={props.tab} onValueChange={props.onTab} className="min-h-0 min-w-0 flex-1 gap-0">
            <div className="min-w-0 overflow-x-auto">
              <TabsList
                className="w-full justify-start gap-0 border-b p-0 *:h-full *:max-w-32 *:rounded-none *:border-0 *:border-r *:border-border *:after:-bottom-px!"
                variant="line"
              >
                <TabsTrigger value="real-time">Live stream</TabsTrigger>
                <TabsTrigger value="events">Event review</TabsTrigger>
                <TabsTrigger value="trends">Trends</TabsTrigger>
                <TabsTrigger value="disclosure">Payload</TabsTrigger>
              </TabsList>
            </div>
            {(
              [
                ["real-time", events],
                ["events", events],
              ] as const
            ).map(([tab, rows]) => (
              <TabsContent key={tab} value={tab} className="m-0 flex min-h-44 flex-1 flex-col overflow-hidden">
                <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-4 py-2">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs">
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        props.status === "live" ? "animate-pulse bg-emerald-500" : "bg-muted-foreground",
                      )}
                    />
                    {tab === "real-time" ? `Stream ${props.status}` : "Events matching current filters"}
                  </div>
                  <Button size="sm" variant="outline" disabled={!props.enabled} onClick={props.onPause}>
                    {props.paused ? <Play data-icon="inline-start" /> : <Pause data-icon="inline-start" />}
                    {props.paused ? "Resume" : "Pause"}
                  </Button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <div className="grid grid-cols-[4rem_4rem_minmax(0,1fr)] bg-muted/40 px-4 py-2 font-medium text-muted-foreground text-xs">
                    <span>Time</span>
                    <span>Level</span>
                    <span>Event</span>
                  </div>
                  <Separator />
                  {rows.map((event) => (
                    <Fragment key={event.id}>
                      <button
                        type="button"
                        onClick={() => props.onEvent(event.id)}
                        className="grid min-h-11 w-full grid-cols-[4rem_4rem_minmax(0,1fr)] items-center gap-2 px-4 py-2 text-left text-sm hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring"
                        aria-label={`View event ${event.id}`}
                      >
                        <span
                          className="font-mono text-muted-foreground text-xs tabular-nums"
                          title={formatTimestamp(event.created_at)}
                        >
                          {new Date(event.created_at).toLocaleTimeString("en-US", { hour12: false })}
                        </span>
                        <span
                          className={cn(
                            "font-mono text-xs",
                            event.level === "ERROR" && "text-destructive",
                            event.level === "WARN" && "text-amber-600 dark:text-amber-400",
                          )}
                        >
                          {event.level}
                        </span>
                        <span className="flex min-w-0 flex-col gap-1">
                          <span className="truncate">{event.message}</span>
                          <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground text-xs">
                            <span className="break-all">{event.service}</span>
                            {event.source && <Badge variant="outline">{event.source}</Badge>}
                            {event.event_type && <span className="break-all">{event.event_type}</span>}
                          </span>
                        </span>
                      </button>
                      <Separator />
                    </Fragment>
                  ))}
                  {!props.pending && !props.failed && rows.length === 0 && props.enabled && (
                    <Empty>
                      <EmptyHeader>
                        <EmptyTitle>No events</EmptyTitle>
                        <EmptyDescription>No events match the current filters.</EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  )}
                </div>
                {((props.pagination?.total ?? 0) > 20 || props.offset > 0) && (
                  <AdminApiPagination
                    pagination={props.pagination}
                    offset={props.offset}
                    limit={20}
                    busy={props.busy || !props.enabled || props.failed}
                    onPage={props.onPage}
                  />
                )}
              </TabsContent>
            ))}
            <TabsContent value="trends" className="m-0">
              <div className="px-3 py-2 text-muted-foreground text-xs">
                Last {service ? service.metrics_window_seconds / 60 : "—"} minutes · 1-minute intervals · 45-second
                capture delay
              </div>
              {service && <MonitoringSignals service={service} metrics={metrics} />}
            </TabsContent>
            <TabsContent value="disclosure" className="m-0">
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>Event payload</EmptyTitle>
                  <EmptyDescription>
                    Select a log entry to inspect its sanitized payload and correlation IDs.
                  </EmptyDescription>
                </EmptyHeader>
                {events[0] && (
                  <Button variant="outline" onClick={() => props.onEvent(events[0].id)}>
                    Inspect latest event
                  </Button>
                )}
              </Empty>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <Separator />
      <footer className="flex flex-wrap gap-2 p-2 *:data-[slot=button]:h-11 *:data-[slot=button]:min-w-32 *:data-[slot=button]:flex-1 *:data-[slot=button]:rounded-none">
        <Button asChild variant="outline">
          <Link href="/admin">Overview</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin/projects">Run history</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin/logs">Decision audit</Link>
        </Button>
        <Button variant="outline" onClick={() => props.onTab("events")}>
          Trace review
        </Button>
        <Button variant="outline" onClick={() => props.onTab("trends")}>
          Trends
        </Button>
        <Button variant="outline" onClick={exportEvents} disabled={!props.enabled || events.length === 0}>
          <Download data-icon="inline-start" />
          Export
        </Button>
        <Button variant="outline" onClick={props.onPause} disabled={!props.enabled}>
          {props.paused ? <Play data-icon="inline-start" /> : <Pause data-icon="inline-start" />}
          {props.paused ? "Resume" : "Pause"}
        </Button>
        <Badge className="h-11 min-w-44 flex-1 rounded-none text-muted-foreground" variant="outline">
          Telemetry pipeline {props.paused ? "paused" : (props.pipeline?.telemetry_connected ?? "unknown")}
        </Badge>
      </footer>
    </div>
  );
}
