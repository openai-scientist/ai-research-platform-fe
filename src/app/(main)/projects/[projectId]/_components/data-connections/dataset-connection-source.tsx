"use client";

import { useRef, useState } from "react";

import Link from "next/link";

import { useQueryClient } from "@tanstack/react-query";
import { cn } from "cn";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { showConnectionError, useConnectionAccess, useInfiniteDataConnections } from "@/hooks/use-data-connections";
import { collectPages } from "@/lib/api/infinite-pagination";
import { projectKeys } from "@/lib/api/query-keys";
import {
  type ConnectionSource,
  isGoogleConnection,
  isTimeSeriesConnection,
  sameConnectionSource,
} from "@/lib/api/services/fetch-data-connections";
import {
  type DatasetItem,
  type DatasetVersionItem,
  fetchDatasets,
  type ImportConnectionSource,
} from "@/lib/api/services/fetch-datasets";
import { ApiError } from "@/types/api";

import { WorkspaceFormDialog } from "../workspace-form-dialog";
import { LoadMore } from "../workspace-ui";
import { CONNECTION_PROVIDERS, connectionSourceLabel } from "./connection-display";
import { GoogleReconnectButton } from "./google-reconnect-button";
import { TimeSeriesRefreshDialog } from "./time-series-refresh-dialog";
import { TIME_SERIES_AGGREGATES, TIME_SERIES_BUCKETS } from "./time-series-source";

export function DatasetVersionOrigin({ version, compact = false }: { version: DatasetVersionItem; compact?: boolean }) {
  const origin = version.source_type === "connection" ? version.source : null;
  if (!origin) return <span className="text-muted-foreground text-xs">CSV upload</span>;
  return (
    <div className={cn("flex min-w-0 gap-1 text-xs", compact ? "flex-wrap items-baseline gap-x-2" : "flex-col")}>
      <span className="min-w-0 break-words">
        {origin.connection_name} · {CONNECTION_PROVIDERS[origin.connection_kind].label}
      </span>
      <span className="min-w-0 break-words text-muted-foreground">
        {compact && <span aria-hidden="true">· </span>}
        {connectionSourceLabel(origin.source)}
      </span>
      <time
        dateTime={origin.fetched_at}
        title={new Date(origin.fetched_at).toLocaleString("en-US")}
        className="text-muted-foreground"
      >
        {compact && <span aria-hidden="true">· </span>}
        Fetched{" "}
        {new Date(origin.fetched_at).toLocaleString(
          "en-US",
          compact ? { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" } : undefined,
        )}
      </time>
    </div>
  );
}

function ReplacementConnection({
  projectId,
  pending,
  onRefresh,
  sourceType,
}: {
  projectId: string;
  pending: boolean;
  onRefresh: (connectionId: string) => Promise<boolean>;
  sourceType: "table" | "query";
}) {
  const query = useInfiniteDataConnections(projectId);
  const access = useConnectionAccess(projectId);
  const [id, setId] = useState("");
  return (
    <WorkspaceFormDialog
      title="Choose connection"
      description="Use another saved connection with the dataset's original table or query."
      submitLabel="Refresh data"
      pending={pending}
      disabled={!id || access.rateLimited || !access.configured}
      onSubmit={() => onRefresh(id)}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="refresh-connection">Connection</FieldLabel>
          <Select value={id || undefined} disabled={pending || query.isPending} onValueChange={setId}>
            {query.isPending ? (
              <Skeleton className="h-8 w-full" role="status" aria-label="Loading connections" />
            ) : (
              <SelectTrigger id="refresh-connection" className="w-full">
                <SelectValue placeholder="Choose a connection" />
              </SelectTrigger>
            )}
            <SelectContent>
              <SelectGroup>
                {query.connections
                  .filter(
                    (connection) =>
                      // A member's Google account only picks files; it is not a source.
                      connection.kind !== "google" &&
                      !isTimeSeriesConnection(connection.kind) &&
                      (sourceType !== "query" || !isGoogleConnection(connection.kind)),
                  )
                  .map((connection) => (
                    <SelectItem key={connection.id} value={connection.id}>
                      {connection.name} · {CONNECTION_PROVIDERS[connection.kind].label}
                    </SelectItem>
                  ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <FieldDescription>The selected connection must support the saved source.</FieldDescription>
        </Field>
        <LoadMore visible={Boolean(query.hasNextPage)} pending={query.isFetching} onClick={query.loadMore} />
        {query.isError && (
          <Button variant="outline" type="button" disabled={access.rateLimited} onClick={() => void query.refetch()}>
            Reload connections
          </Button>
        )}
        <Button asChild variant="outline">
          <Link href={`/projects/${projectId}/connections`}>Manage connections</Link>
        </Button>
      </FieldGroup>
    </WorkspaceFormDialog>
  );
}

export function DatasetConnectionSource({ dataset }: { dataset: DatasetItem }) {
  const version = dataset.latest_version;
  const source = version?.source_type === "connection" ? version.source?.source : null;
  const [showSql, setShowSql] = useState(false);

  if (!version) return null;

  return (
    <section aria-label="Dataset source" className="flex min-w-0 flex-col gap-2">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="shrink-0 text-muted-foreground text-xs">Source</span>
          <DatasetVersionOrigin version={version} compact />
        </div>
        {source?.type === "query" && (
          <Button variant="ghost" size="sm" onClick={() => setShowSql((value) => !value)} aria-expanded={showSql}>
            {showSql ? "Hide SQL query" : "View SQL query"}
          </Button>
        )}
      </div>
      {source?.type === "query" && showSql && (
        <pre className="max-h-56 overflow-auto rounded-lg bg-muted p-3 text-xs">
          <code>{source.sql}</code>
        </pre>
      )}
      {source?.type === "timeseries" && (
        <dl className="grid gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Fields</dt>
            <dd className="break-words">{source.fields.join(", ") || "value"}</dd>
          </div>
          {source.tags.length > 0 && (
            <div>
              <dt className="text-muted-foreground">Split by</dt>
              <dd className="break-words">{source.tags.join(", ")}</dd>
            </div>
          )}
          <div>
            <dt className="text-muted-foreground">From (UTC)</dt>
            <dd>
              <time dateTime={source.start}>{new Date(source.start).toLocaleString("en-US", { timeZone: "UTC" })}</time>
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Until (UTC, exclusive)</dt>
            <dd>
              <time dateTime={source.end}>{new Date(source.end).toLocaleString("en-US", { timeZone: "UTC" })}</time>
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Aggregation</dt>
            <dd>
              {source.bucket && source.aggregate
                ? `${TIME_SERIES_BUCKETS[source.bucket].label} · ${TIME_SERIES_AGGREGATES[source.aggregate]}`
                : "Raw data"}
            </dd>
          </div>
        </dl>
      )}
    </section>
  );
}

export function DatasetConnectionActions({
  dataset,
  projectId,
  canWrite,
}: {
  dataset: DatasetItem;
  projectId: string;
  canWrite: boolean;
}) {
  const queryClient = useQueryClient();
  const access = useConnectionAccess(projectId);
  const origin = dataset.latest_version?.source_type === "connection" ? dataset.latest_version.source : null;
  const [pending, setPending] = useState(false);
  const [missingConnection, setMissingConnection] = useState(false);
  const [needsReconciliation, setNeedsReconciliation] = useState(false);
  const [timeSeriesRefreshOpen, setTimeSeriesRefreshOpen] = useState(false);
  const locked = useRef(false);
  const pendingRefresh = useRef<{ baseline: number; input: ImportConnectionSource } | null>(null);
  const refreshLabel = origin?.source.type === "timeseries" ? "Fetch new data" : "Refresh data";

  async function reconcile() {
    const previous = pendingRefresh.current;
    if (!previous) return false;
    const current = await fetchDatasets.getById(projectId, dataset.id);
    const versions = await collectPages((params) => fetchDatasets.getVersions(projectId, dataset.id, params));
    const completed = versions.some(
      (version) =>
        version.version_number > previous.baseline &&
        version.source?.connection_id === previous.input.connection_id &&
        sameConnectionSource(version.source.source, previous.input.source),
    );
    queryClient.setQueryData(projectKeys.dataset(projectId, dataset.id), current);
    await queryClient.invalidateQueries({ queryKey: projectKeys.dataset(projectId, dataset.id) });
    setNeedsReconciliation(false);
    if (completed) {
      pendingRefresh.current = null;
      setMissingConnection(false);
      toast.success("The refresh completed. The latest dataset version is available.");
    }
    return Boolean(completed);
  }

  async function refresh(connectionId: string, source: ConnectionSource | undefined = origin?.source) {
    if (
      !origin ||
      !source ||
      !canWrite ||
      locked.current ||
      access.rateLimited ||
      !access.configured ||
      needsReconciliation
    )
      return false;
    locked.current = true;
    setPending(true);
    try {
      const current = (await fetchDatasets.getById(projectId, dataset.id)).data;
      const input = { connection_id: connectionId, source };
      pendingRefresh.current = { baseline: current.latest_version?.version_number ?? 0, input };
      try {
        await fetchDatasets.importConnectionVersion(projectId, dataset.id, input);
      } catch (error) {
        if (error instanceof ApiError && error.code === "NOT_FOUND") setMissingConnection(true);
        if (error instanceof ApiError && error.status > 0 && error.status < 500) throw error;
        setNeedsReconciliation(true);
        showConnectionError(error, projectId);
        return await reconcile();
      }
      pendingRefresh.current = null;
      setMissingConnection(false);
      await queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
      toast.success("A new dataset version was imported.");
      return true;
    } catch (error) {
      showConnectionError(error, projectId);
      return false;
    } finally {
      locked.current = false;
      setPending(false);
    }
  }

  async function reload() {
    if (locked.current) return;
    locked.current = true;
    setPending(true);
    try {
      await reconcile();
    } catch (error) {
      showConnectionError(error, projectId);
    } finally {
      locked.current = false;
      setPending(false);
    }
  }

  if (!origin) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {canWrite &&
        (needsReconciliation ? (
          <Button variant="outline" disabled={pending} onClick={() => void reload()}>
            {pending && <Spinner data-icon="inline-start" />}Reload versions
          </Button>
        ) : (
          access.configured && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  disabled={pending || access.rateLimited}
                  onClick={() => {
                    if (origin.source.type === "timeseries") setTimeSeriesRefreshOpen(true);
                    else void refresh(origin.connection_id);
                  }}
                >
                  {pending ? <Spinner data-icon="inline-start" /> : <RefreshCw data-icon="inline-start" />}{" "}
                  {pending ? "Refreshing…" : refreshLabel}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Refresh imports the current source data into a new version. Existing versions remain available.
              </TooltipContent>
            </Tooltip>
          )
        ))}
      {missingConnection && canWrite && access.configured && origin.source.type !== "timeseries" && (
        <ReplacementConnection
          projectId={projectId}
          pending={pending}
          onRefresh={refresh}
          sourceType={origin.source.type}
        />
      )}
      {timeSeriesRefreshOpen &&
        canWrite &&
        access.configured &&
        origin.source.type === "timeseries" &&
        isTimeSeriesConnection(origin.connection_kind) && (
          <TimeSeriesRefreshDialog
            projectId={projectId}
            kind={origin.connection_kind}
            connectionId={origin.connection_id}
            source={origin.source}
            pending={pending}
            locked={needsReconciliation}
            onClose={() => setTimeSeriesRefreshOpen(false)}
            onRefresh={async (connectionId, source) => {
              const completed = await refresh(connectionId, source);
              if (completed) setTimeSeriesRefreshOpen(false);
              return completed;
            }}
          />
        )}
      {origin &&
        canWrite &&
        access.configured &&
        isGoogleConnection(origin.connection_kind) &&
        access.revokedConnectionIds.has(origin.connection_id) && (
          <GoogleReconnectButton projectId={projectId} connectionId={origin.connection_id} disabled={pending} />
        )}
    </div>
  );
}
