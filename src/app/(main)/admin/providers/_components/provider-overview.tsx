"use client";

import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApiMutation, useApiQuery } from "@/hooks/use-api";
import { adminKeys } from "@/lib/api/query-keys";
import { fetchAdmin, type ModelProfile, type ModelRole, type ProviderMetrics } from "@/lib/api/services/fetch-admin";

import { AnalyticsKpiStrip } from "../../../dashboard/analytics/_components/analytics-kpi-strip";
import { RealtimeVisitors } from "../../../dashboard/analytics/_components/realtime-visitors";
import { TopTrafficSources, type TrafficSourceTab } from "../../../dashboard/analytics/_components/top-traffic-sources";
import { TrafficQuality } from "../../../dashboard/analytics/_components/traffic-quality";
import { formatJoinedDate } from "../../_components/admin-api-utils";
import { SectionCard } from "../../_components/admin-primitives";
import { KeyState, RUN_MODEL_DETAILS, RUN_MODEL_ROLES, useRunModelProfiles } from "../../_components/run-models";

const loadBreakdowns = [
  { value: "providers", label: "Providers", key: "by_provider" },
  { value: "models", label: "Models", key: "by_model" },
  { value: "capabilities", label: "Capabilities", key: "by_capability" },
] as const;
const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;
const countFormatter = new Intl.NumberFormat("en-US");
const dateFormatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const minuteFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

function chartSeries(metrics: ProviderMetrics | null | undefined) {
  if (!metrics) return { daily: [], recent: [], dayStart: 0 };
  const through = Date.parse(metrics.through);
  const today = Math.floor(through / DAY_MS) * DAY_MS;
  const dayStart = today - 13 * DAY_MS;
  const byDay = new Map(metrics.reliability.map((point) => [Date.parse(point.start), point]));
  const byMinute = new Map(metrics.recent_requests.map((point) => [Date.parse(point.start), point.requests]));
  return {
    dayStart,
    daily: Array.from({ length: 14 }, (_, index) => {
      const point = byDay.get(dayStart + index * DAY_MS);
      return {
        dayIndex: index + 1,
        actualQuality: point ? (point.successful_requests / point.requests) * 100 : null,
        baselineQuality: null,
      };
    }),
    recent: Array.from({ length: 30 }, (_, index) => {
      const minute = through - (30 - index) * MINUTE_MS;
      return { minute, visitors: byMinute.get(minute) ?? null };
    }),
  };
}

const reliabilityTicks = [1, 5, 9, 14];

export function ProviderOverview() {
  const models = useRunModelProfiles();
  const metricsQuery = useApiQuery(adminKeys.providerMetrics(), fetchAdmin.getProviderMetrics, {
    staleTime: 0,
    refetchInterval: (query) => (query.state.data === null ? false : 30_000),
  });
  const metrics = metricsQuery.data;
  const telemetryNote = metricsQuery.isPending
    ? "Loading provider telemetry…"
    : metrics === null
      ? "This backend version does not provide provider telemetry."
      : metricsQuery.isError && !metrics
        ? "Provider telemetry is unavailable."
        : "No gateway observations in this window.";
  const { daily, recent, dayStart } = chartSeries(metrics);
  const lastMinute = recent.at(-1)?.visitors;
  const providerLoadTabs: TrafficSourceTab[] = loadBreakdowns.map(({ value, label, key }) => {
    const data = (metrics?.[key] ?? []).slice(0, 8).map((item) => ({
      label: countFormatter.format(item.requests),
      source: item.label,
      visitors: item.requests,
    }));
    return { value, label, data, emptyText: data.length ? undefined : telemetryNote };
  });
  const profiles = Object.values(models.data ?? {}).filter((profile) => profile !== null);
  const endpoints = new Set(profiles.map((profile) => profile.base_url?.replace(/\/+$/, "")).filter(Boolean));
  const indicators = [
    { label: "Configured endpoints", value: String(endpoints.size), period: "Unique base URLs" },
    {
      label: "Configured model roles",
      value: `${profiles.length} / ${RUN_MODEL_ROLES.length}`,
      period: "Stage and Review",
    },
    {
      label: "Model roles with saved keys",
      value: String(profiles.filter((profile) => profile.has_api_key).length),
      period: "Saved credentials",
    },
    {
      label: "Requests today",
      value: metrics?.requests_today == null ? "—" : countFormatter.format(metrics.requests_today),
      period: metrics?.requests_today == null ? "No observations" : "Observed today (UTC)",
    },
    {
      label: "Average latency",
      value:
        metrics?.average_latency_ms == null
          ? "—"
          : `${countFormatter.format(Math.round(metrics.average_latency_ms))} ms`,
      period: metrics?.average_latency_ms == null ? "No observations" : "Observed today (UTC)",
    },
  ];

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {models.data ? (
        <AnalyticsKpiStrip
          items={indicators.map((item) => ({ ...item, change: "", direction: "up" as const, from: "" }))}
        />
      ) : (
        <ProfilesLoadState query={models} />
      )}
      <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-7">
          <TrafficQuality
            actualLabel="Observed success rate"
            chartData={daily}
            description="Success rate of observed gateway requests over the last 14 days (UTC)."
            emptyText={telemetryNote}
            showPoints
            title="Provider reliability"
            tooltipLabel="Success rate"
            tooltipLabelFormatter={(day) => dateFormatter.format(dayStart + (day - 1) * DAY_MS)}
            xDomain={[1, 14]}
            xTicks={metrics ? reliabilityTicks : []}
            xTickFormatter={(day) => dateFormatter.format(dayStart + (day - 1) * DAY_MS)}
            yDomain={[0, 100]}
          />
        </div>
        <div className="min-w-0 xl:col-span-5">
          <RealtimeVisitors
            breakdown={[]}
            chartLabel="Requests"
            data={recent}
            emptyText={telemetryNote}
            live={false}
            liveLabel={metrics?.observed_from ? "Observed" : "No observations"}
            title="Provider requests"
            unit="requests / min"
            value={lastMinute == null ? "—" : countFormatter.format(lastMinute)}
            tooltipLabelFormatter={(minute) => `${minuteFormatter.format(minute)} UTC`}
            yDomain={[0, "auto"]}
          />
        </div>
      </div>
      <TopTrafficSources tabs={providerLoadTabs} title="Provider load" valueLabel="Requests" />
    </div>
  );
}

type ProbeTarget = { role: ModelRole; profile: ModelProfile };

export function ConnectedProviders() {
  const models = useRunModelProfiles();
  const { data } = models;
  const targets = RUN_MODEL_ROLES.flatMap((role) => {
    const profile = data?.[role];
    return profile?.base_url && profile.model ? [{ role, profile }] : [];
  });
  const test = useApiMutation(async (profiles: ProbeTarget[]) => {
    const results = await Promise.allSettled(
      profiles.map(({ role, profile }) =>
        fetchAdmin.testModel(role, { base_url: profile.base_url ?? undefined, model: profile.model }),
      ),
    );
    return profiles.map(({ role, profile }, index) => {
      const result = results[index];
      const details = result.status === "fulfilled" ? result.value.data : null;
      return {
        role,
        profile,
        ok: details?.ok ?? false,
        latency: details?.latency_ms ?? null,
        checkedAt: new Date().toISOString(),
        message:
          details?.message ??
          (result.status === "rejected" && result.reason instanceof Error
            ? result.reason.message
            : "The connection test failed."),
      };
    });
  });

  return (
    <SectionCard
      title="Configured endpoints"
      description="Saved model connections by role. Test results are shown for this page session."
      toolbar={
        <div className="flex xl:justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={targets.length === 0 || test.isPending}
            onClick={() =>
              test.mutate(targets, {
                onSuccess: (results) => {
                  const failures = results.filter((result) => !result.ok);
                  if (failures.length === 0) {
                    toast.success(
                      results.length === 1 ? "Connection passed." : `${results.length} connections passed.`,
                    );
                  }
                  for (const failure of failures) {
                    toast.error(failure.message, { description: RUN_MODEL_DETAILS[failure.role].title });
                  }
                },
              })
            }
          >
            {test.isPending ? <Spinner data-icon="inline-start" /> : <RefreshCw data-icon="inline-start" />}
            {test.isPending ? "Testing connections…" : "Test all connections"}
          </Button>
        </div>
      }
    >
      {data ? (
        <div className="-mx-4 -mt-4 min-w-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Base URL</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>API key</TableHead>
                <TableHead>Last bulk test</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {RUN_MODEL_ROLES.map((role) => {
                const profile = data[role];
                const result = test.data?.find(
                  (item) =>
                    item.role === role &&
                    item.profile.base_url === profile?.base_url &&
                    item.profile.model === profile?.model &&
                    item.profile.updated_at === profile?.updated_at,
                );
                return (
                  <TableRow key={role}>
                    <TableCell className="font-medium">{RUN_MODEL_DETAILS[role].title}</TableCell>
                    <TableCell>{profile?.base_url ?? "Not configured"}</TableCell>
                    <TableCell>{profile?.model ?? "—"}</TableCell>
                    <TableCell>
                      <KeyState saved={Boolean(profile?.has_api_key)} />
                    </TableCell>
                    <TableCell>
                      {result ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={result.ok ? "secondary" : "destructive"}>
                            {result.ok ? "Passed" : "Failed"}
                          </Badge>
                          <span className="text-muted-foreground text-xs">
                            {formatJoinedDate(result.checkedAt)}
                            {result.latency !== null && ` · ${result.latency} ms`}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">{profile?.base_url ? "Not tested" : "—"}</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <ProfilesLoadState query={models} />
      )}
    </SectionCard>
  );
}

export function ModelCatalog() {
  const models = useRunModelProfiles();
  const configured = RUN_MODEL_ROLES.flatMap((role) => {
    const profile = models.data?.[role];
    return profile?.model ? [{ role, profile }] : [];
  });

  return (
    <SectionCard title="Configured models" description="Model IDs saved for the Stage and Review roles.">
      {!models.data ? (
        <ProfilesLoadState query={models} />
      ) : configured.length > 0 ? (
        <div className="-mx-4 -mt-4 min-w-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model ID</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configured.map(({ role, profile }) => (
                <TableRow key={role}>
                  <TableCell className="font-medium">{profile.model}</TableCell>
                  <TableCell>{RUN_MODEL_DETAILS[role].title}</TableCell>
                  <TableCell>{profile.updated_at ? formatJoinedDate(profile.updated_at) : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">Save a Stage or Review model to see it here.</p>
      )}
    </SectionCard>
  );
}

function ProfilesLoadState({ query }: { query: ReturnType<typeof useRunModelProfiles> }) {
  if (query.isError) {
    return (
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          Retry loading model connections
        </Button>
      </div>
    );
  }
  return <Skeleton role="status" aria-label="Loading model connections" className="h-24 w-full" />;
}
