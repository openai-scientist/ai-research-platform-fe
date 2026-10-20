"use client";

import { useEffect, useMemo, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { showConnectionError } from "@/hooks/use-data-connections";
import {
  fetchDataConnections,
  isTimeSeriesConnection,
  type TimeSeriesSource,
} from "@/lib/api/services/fetch-data-connections";

import { CONNECTION_PROVIDERS, ConnectionLogo } from "./connection-display";
import { buildSampleChart } from "./time-series-chart-model";
import { TimeSeriesChartSeries } from "./time-series-chart-series";
import { TimeSeriesSampleChart } from "./time-series-sample-chart";
import { validateTimeSeriesSelection, validateTimeSeriesSource } from "./time-series-source";
import { TimeSeriesSourceForm } from "./time-series-source-form";
import type { ConnectionFlowState } from "./use-connection-flow";

export function TimeSeriesSourceStep({ flow }: { flow: ConnectionFlowState }) {
  const source = useMemo(() => {
    if (!isTimeSeriesConnection(flow.kind) || flow.source?.type !== "timeseries" || !flow.columns.length) return null;
    try {
      validateTimeSeriesSource(flow.kind, flow.source);
      validateTimeSeriesSelection(flow.kind, flow.source, flow.columns);
      return flow.source;
    } catch {
      return null;
    }
  }, [flow.kind, flow.source, flow.columns]);
  const [settledSource, setSettledSource] = useState<TimeSeriesSource | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => setSettledSource(source), 500);
    return () => window.clearTimeout(timer);
  }, [source]);
  const projectId = flow.connection?.project_id ?? "";
  const connectionId = flow.connection?.id ?? "";
  const sample = useQuery({
    queryKey: ["time-series-sample", projectId, connectionId, settledSource],
    enabled: Boolean(connectionId && source && settledSource === source && !flow.disabled),
    queryFn: async ({ signal }) => {
      if (!settledSource) throw new Error("Choose data to preview.");
      return (await fetchDataConnections.preview(projectId, connectionId, settledSource, signal)).data;
    },
    retry: false,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
  useEffect(() => {
    if (sample.error) showConnectionError(sample.error, projectId);
  }, [sample.error, projectId]);
  const loading = Boolean(source && (source !== settledSource || sample.isFetching));
  const data = source && settledSource === source && !sample.isError ? sample.data : undefined;
  const chart = useMemo(() => buildSampleChart(source, data), [source, data]);
  const selection = JSON.stringify([flow.table, flow.timeSeriesDraft.fields, flow.timeSeriesDraft.tags]);
  const [visibility, setVisibility] = useState<{ selection: string; hidden: string[] }>({ selection, hidden: [] });
  const hidden = visibility.selection === selection ? visibility.hidden : [];
  if (!isTimeSeriesConnection(flow.kind)) return null;
  return (
    <section
      aria-label="Select time series data"
      className="h-full min-h-0 min-w-0 overflow-y-auto overscroll-contain p-1"
    >
      <TimeSeriesSourceForm
        layout="workspace"
        kind={flow.kind}
        name={flow.table}
        tables={flow.tables}
        columns={flow.columns}
        draft={flow.timeSeriesDraft}
        search={flow.tableSearch}
        disabled={flow.disabled}
        loading={flow.busy}
        onSearchChange={flow.setTableSearch}
        onSearch={() => void flow.searchTables()}
        onSelect={(name) => void flow.selectTable(name)}
        onChange={flow.setTimeSeriesDraft}
        toolbarLeading={
          <div className="flex min-w-0 items-center gap-3">
            <h1 className="max-w-64 truncate font-semibold text-lg" title={flow.connection?.name}>
              {flow.connection?.name ?? "Time series"}
            </h1>
            <span className="flex shrink-0 items-center gap-2 text-muted-foreground text-sm">
              <span className="[&_img]:size-5 [&_svg]:size-5">
                <ConnectionLogo kind={flow.kind} />
              </span>
              <span className="hidden xl:inline">{CONNECTION_PROVIDERS[flow.kind].label}</span>
            </span>
          </div>
        }
        toolbarActions={
          <Button
            disabled={flow.disabled || loading || !flow.table || data?.rows.length === 0}
            onClick={() => void flow.previewSource()}
          >
            {flow.busy ? <Spinner data-icon="inline-start" /> : null}Review rows
            <ArrowRight data-icon="inline-end" />
          </Button>
        }
        series={
          <TimeSeriesChartSeries
            chart={chart}
            hidden={hidden}
            loading={loading}
            onToggle={(key) => {
              setVisibility((current) => {
                const keys = current.selection === selection ? current.hidden : [];
                return {
                  selection,
                  hidden: keys.includes(key) ? keys.filter((item) => item !== key) : [...keys, key],
                };
              });
            }}
          />
        }
      >
        {(controls) => (
          <TimeSeriesSampleChart
            source={source}
            data={data}
            loading={loading}
            chart={chart}
            hidden={hidden}
            reloadDisabled={flow.disabled || loading || !source}
            onReload={() => void sample.refetch()}
            controls={controls}
          />
        )}
      </TimeSeriesSourceForm>
    </section>
  );
}
