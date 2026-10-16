"use client";

import { useState } from "react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMonitoringEvents, useMonitoringMetrics, useMonitoringServices } from "@/hooks/use-admin-monitoring-query";
import type { MonitoringEventsParams } from "@/lib/api/services/admin-monitoring-types";

import { useAdminAccess } from "../../_components/use-admin-access";
import { MonitoringConsole } from "./monitoring-console";
import { MonitoringEventDialog } from "./monitoring-events";
import { MonitoringFilters } from "./monitoring-filters";
import { useMonitoringStream } from "./use-monitoring-stream";

export function MonitoringScreen() {
  const { enabled: access } = useAdminAccess();
  const [paused, setPaused] = useState(false);
  const [filters, setFilters] = useState<MonitoringEventsParams>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [offset, setOffset] = useState(0);
  const [serviceOffset, setServiceOffset] = useState(0);
  const [selectedId, setSelectedId] = useState("");
  const [eventId, setEventId] = useState("");
  const [tab, setTab] = useState("real-time");
  const stream = useMonitoringStream({
    enabled: access,
    paused,
    serviceId: filters.service_id,
    environment: filters.environment,
  });
  const enabled = access && !stream.terminal;
  const servicesQuery = useMonitoringServices(
    { environment: filters.environment, limit: 20, offset: serviceOffset },
    enabled,
  );
  const services = enabled && !servicesQuery.isError ? (servicesQuery.data?.data ?? []) : [];
  const preferredId = selectedId || filters.service_id;
  const service = services.find((item) => item.id === preferredId) ?? services[0];
  const eventsQuery = useMonitoringEvents(
    { ...filters, service_id: tab === "events" ? service?.id : filters.service_id, limit: 20, offset },
    enabled,
  );
  const metricsQuery = useMonitoringMetrics(
    service?.id ?? "",
    { interval_seconds: 60 },
    enabled,
    service?.metrics_window_seconds,
  );
  const metrics = enabled && !metricsQuery.isError ? metricsQuery.data?.data : undefined;
  const events = enabled && !eventsQuery.isError ? (eventsQuery.data?.data ?? []) : [];
  const busy = servicesQuery.isFetching || eventsQuery.isFetching || metricsQuery.isFetching;
  function refresh() {
    if (!enabled) return;
    void servicesQuery.refetch();
    void eventsQuery.refetch();
    if (service) void metricsQuery.refetch();
  }
  return (
    <>
      <MonitoringConsole
        services={services}
        service={service}
        metrics={metrics}
        events={events}
        status={stream.status}
        pipeline={enabled && !paused ? stream.pipeline : null}
        paused={paused}
        enabled={enabled}
        pending={!stream.terminal && (!access || servicesQuery.isPending || eventsQuery.isPending)}
        failed={servicesQuery.isError || eventsQuery.isError}
        busy={busy}
        pagination={eventsQuery.data?.meta.pagination}
        offset={offset}
        onPage={setOffset}
        servicePagination={servicesQuery.data?.meta.pagination}
        serviceOffset={serviceOffset}
        onServicePage={(next) => {
          setServiceOffset(next);
          setSelectedId("");
        }}
        tab={tab}
        onTab={(next) => {
          setTab(next);
          setOffset(0);
        }}
        onSelect={(id) => {
          setSelectedId(id);
          setOffset(0);
        }}
        onPause={() => setPaused(!paused)}
        onRefresh={refresh}
        onFilter={() => setFiltersOpen(true)}
        onEvent={setEventId}
      />
      <Dialog open={filtersOpen && enabled} onOpenChange={setFiltersOpen}>
        <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Filter technical events</DialogTitle>
            <DialogDescription>
              Search logs by environment, service, time, or correlation IDs. The default window is 90 minutes.
            </DialogDescription>
          </DialogHeader>
          <MonitoringFilters
            services={services}
            filters={filters}
            busy={!enabled || eventsQuery.isFetching}
            onApply={(next) => {
              setFilters(next);
              setOffset(0);
              setServiceOffset(0);
              setSelectedId("");
              setEventId("");
              setFiltersOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
      {eventId && enabled && <MonitoringEventDialog id={eventId} enabled={enabled} onClose={() => setEventId("")} />}
    </>
  );
}
