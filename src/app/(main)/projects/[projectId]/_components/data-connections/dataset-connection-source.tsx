"use client";

import { useRef, useState } from "react";

import Link from "next/link";

import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { showConnectionError, useConnectionAccess, useInfiniteDataConnections } from "@/hooks/use-data-connections";
import { collectPages } from "@/lib/api/infinite-pagination";
import { projectKeys } from "@/lib/api/query-keys";
import { sameConnectionSource } from "@/lib/api/services/fetch-data-connections";
import {
  type DatasetItem,
  type DatasetVersionItem,
  fetchDatasets,
  type ImportConnectionSource,
} from "@/lib/api/services/fetch-datasets";
import { ApiError } from "@/types/api";

import { WorkspaceFormDialog } from "../workspace-form-dialog";
import { LoadMore } from "../workspace-ui";
import { CONNECTION_PROVIDERS } from "./connection-display";

export function DatasetVersionOrigin({ version }: { version: DatasetVersionItem }) {
  const origin = version.source_type === "connection" ? version.source : null;
  if (!origin) return <span className="text-muted-foreground text-xs">CSV upload</span>;
  return (
    <div className="flex min-w-0 flex-col gap-1 text-xs">
      <span>
        {origin.connection_name} · {CONNECTION_PROVIDERS[origin.connection_kind].label}
      </span>
      <span className="text-muted-foreground">
        {origin.source.type === "table" ? `${origin.source.schema}.${origin.source.name}` : "SELECT query"}
      </span>
      <span className="text-muted-foreground">Fetched {new Date(origin.fetched_at).toLocaleString("en-US")}</span>
    </div>
  );
}

function ReplacementConnection({
  projectId,
  pending,
  onRefresh,
}: {
  projectId: string;
  pending: boolean;
  onRefresh: (connectionId: string) => Promise<boolean>;
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
            <SelectTrigger id="refresh-connection" className="w-full">
              <SelectValue placeholder="Choose a connection" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {query.connections.map((connection) => (
                  <SelectItem key={connection.id} value={connection.id}>
                    {connection.name} · {CONNECTION_PROVIDERS[connection.kind].label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <FieldDescription>The selected database must support the saved table or SELECT query.</FieldDescription>
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

export function DatasetConnectionSource({
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
  const [showSql, setShowSql] = useState(false);
  const [missingConnection, setMissingConnection] = useState(false);
  const [needsReconciliation, setNeedsReconciliation] = useState(false);
  const locked = useRef(false);
  const pendingRefresh = useRef<{ baseline: number; input: ImportConnectionSource } | null>(null);

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

  async function refresh(connectionId: string) {
    if (!origin || !canWrite || locked.current || access.rateLimited || !access.configured || needsReconciliation)
      return false;
    locked.current = true;
    setPending(true);
    try {
      const current = (await fetchDatasets.getById(projectId, dataset.id)).data;
      const input = { connection_id: connectionId, source: origin.source };
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
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Source</CardTitle>
          {canWrite &&
            (needsReconciliation ? (
              <Button variant="outline" disabled={pending} onClick={() => void reload()}>
                {pending && <Spinner data-icon="inline-start" />}Reload versions
              </Button>
            ) : (
              access.configured && (
                <Button
                  variant="outline"
                  disabled={pending || access.rateLimited}
                  onClick={() => void refresh(origin.connection_id)}
                >
                  {pending ? <Spinner data-icon="inline-start" /> : <RefreshCw data-icon="inline-start" />}{" "}
                  {pending ? "Refreshing…" : "Refresh data"}
                </Button>
              )
            ))}
        </div>
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col gap-4">
        {dataset.latest_version && <DatasetVersionOrigin version={dataset.latest_version} />}
        {origin.source.type === "query" && (
          <div className="flex min-w-0 flex-col gap-2">
            <Button
              variant="ghost"
              className="self-start"
              onClick={() => setShowSql((value) => !value)}
              aria-expanded={showSql}
            >
              {showSql ? "Hide SQL query" : "View SQL query"}
            </Button>
            {showSql && (
              <pre className="max-h-56 overflow-auto rounded-lg bg-muted p-3 text-xs">
                <code>{origin.source.sql}</code>
              </pre>
            )}
          </div>
        )}
        <p className="text-pretty text-muted-foreground text-xs">
          Refresh imports the current source data into a new version. Existing versions remain available.
        </p>
        {missingConnection && canWrite && access.configured && (
          <ReplacementConnection projectId={projectId} pending={pending} onRefresh={refresh} />
        )}
      </CardContent>
    </Card>
  );
}
