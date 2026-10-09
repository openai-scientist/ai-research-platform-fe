"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { showConnectionError, useConnectionAccess, useInfiniteDataConnections } from "@/hooks/use-data-connections";
import {
  type ConnectionColumn,
  type ConnectionPreview,
  type ConnectionTable,
  fetchDataConnections,
  type TimeSeriesConnectionKind,
  type TimeSeriesSource,
} from "@/lib/api/services/fetch-data-connections";
import { ApiError } from "@/types/api";

import { WorkspaceFormDialog } from "../workspace-form-dialog";
import { LoadMore } from "../workspace-ui";
import { CONNECTION_PROVIDERS } from "./connection-display";
import { ConnectionPreviewStep } from "./connection-preview-step";
import {
  buildTimeSeriesSource,
  createTimeSeriesDraft,
  selectTimeSeriesMetric,
  type TimeSeriesDraft,
  validateTimeSeriesSelection,
  validateTimeSeriesSource,
} from "./time-series-source";
import { TimeSeriesSourceForm } from "./time-series-source-form";

export function TimeSeriesRefreshDialog({
  projectId,
  kind,
  connectionId: initialId,
  source: initialSource,
  pending,
  locked,
  onClose,
  onRefresh,
}: {
  projectId: string;
  kind: TimeSeriesConnectionKind;
  connectionId: string;
  source: TimeSeriesSource;
  pending: boolean;
  locked: boolean;
  onClose: () => void;
  onRefresh: (connectionId: string, source: TimeSeriesSource) => Promise<boolean>;
}) {
  const access = useConnectionAccess(projectId);
  const connections = useInfiniteDataConnections(projectId);
  const [connectionId, setConnectionId] = useState(initialId);
  const [name, setName] = useState(initialSource.name);
  const [draft, setDraft] = useState(() => createTimeSeriesDraft(initialSource));
  const [tables, setTables] = useState<ConnectionTable[]>([]);
  const [columns, setColumns] = useState<ConnectionColumn[]>([]);
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState<ConnectionPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const operation = useRef<AbortController | null>(null);
  const loadedKey = useRef("");
  const [reload, setReload] = useState(0);
  const disabled = busy || pending || locked || access.rateLimited || !access.configured;
  const source = buildTimeSeriesSource(kind, name, draft);

  useEffect(() => {
    if (!access.configured || access.rateLimited || locked) return;
    const key = `${projectId}:${connectionId}:${reload}`;
    if (loadedKey.current === key) return;
    const controller = new AbortController();
    operation.current = controller;
    busyRef.current = true;
    setBusy(true);
    setColumns([]);
    setTables([]);
    setPreview(null);
    const load = async () => {
      try {
        const connection = (await fetchDataConnections.getById(projectId, connectionId, controller.signal)).data;
        if (connection.kind !== kind) throw new Error("Choose a connection of the same time series kind.");
        const available = (
          await fetchDataConnections.getTables(projectId, connectionId, "default", undefined, controller.signal)
        ).data;
        if (!controller.signal.aborted) setTables(available);
        const loaded = (
          await fetchDataConnections.getColumns(
            projectId,
            connectionId,
            "default",
            initialSource.name,
            controller.signal,
          )
        ).data;
        if (controller.signal.aborted) return;
        setTables(
          available.some((table) => table.name === initialSource.name)
            ? available
            : [
                { schema: "default", name: initialSource.name, type: "table", column_count: loaded.length },
                ...available,
              ],
        );
        setName(initialSource.name);
        setDraft(createTimeSeriesDraft(initialSource));
        setColumns(loaded);
        loadedKey.current = key;
      } catch (error) {
        if (!controller.signal.aborted) showConnectionError(error, projectId);
      } finally {
        if (!controller.signal.aborted) {
          busyRef.current = false;
          setBusy(false);
        }
      }
    };
    void load();
    return () => {
      controller.abort();
      busyRef.current = false;
    };
  }, [projectId, connectionId, kind, initialSource, access.configured, access.rateLimited, locked, reload]);

  async function run(action: (signal: AbortSignal) => Promise<void>) {
    if (busyRef.current || disabled) return;
    const controller = new AbortController();
    operation.current = controller;
    busyRef.current = true;
    setBusy(true);
    try {
      await action(controller.signal);
    } catch (error) {
      if (!controller.signal.aborted) {
        showConnectionError(error, projectId);
        if (error instanceof ApiError && error.code === "SOURCE_INVALID" && error.reason === "source_not_found") {
          setColumns([]);
          setPreview(null);
          setReload((value) => value + 1);
        }
      }
    } finally {
      if (!controller.signal.aborted) {
        busyRef.current = false;
        setBusy(false);
      }
    }
  }
  useEffect(() => () => operation.current?.abort(), []);
  const change = (next: TimeSeriesDraft) => {
    setDraft(next);
    setPreview(null);
  };
  return (
    <WorkspaceFormDialog
      title="Fetch new time series data"
      description="The saved source uses a fixed time range. Move the dates forward and preview before importing a new version."
      open
      showTrigger={false}
      expandable
      contentClassName="sm:max-w-4xl"
      pending={busy || pending}
      disabled={disabled || !preview?.rows.length}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      submitLabel="Import new version"
      onSubmit={async () => {
        if (disabled || !preview?.rows.length) return false;
        try {
          validateTimeSeriesSource(kind, source);
          validateTimeSeriesSelection(kind, source, columns);
          return await onRefresh(connectionId, source);
        } catch (error) {
          showConnectionError(error, projectId);
          return false;
        }
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="timeseries-refresh-connection">Connection</FieldLabel>
          <Select
            value={connectionId}
            disabled={disabled}
            onValueChange={(value) => {
              setConnectionId(value);
              setPreview(null);
              setColumns([]);
            }}
          >
            <SelectTrigger id="timeseries-refresh-connection" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {!connections.connections.some((item) => item.id === connectionId) && (
                  <SelectItem value={connectionId}>Saved {CONNECTION_PROVIDERS[kind].label} connection</SelectItem>
                )}
                {connections.connections
                  .filter((item) => item.kind === kind)
                  .map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <FieldDescription>
            Choose another {CONNECTION_PROVIDERS[kind].label} connection if the original was deleted.
          </FieldDescription>
          <Button
            type="button"
            variant="ghost"
            className="self-start"
            disabled={disabled}
            onClick={() => setReload((value) => value + 1)}
          >
            Reload source
          </Button>
          <LoadMore
            visible={Boolean(connections.hasNextPage)}
            pending={connections.isFetching || disabled}
            onClick={connections.loadMore}
          />
        </Field>
        <TimeSeriesSourceForm
          kind={kind}
          name={name}
          tables={tables}
          columns={columns}
          draft={draft}
          search={search}
          disabled={disabled}
          loading={busy}
          onChange={change}
          onSearchChange={setSearch}
          onSearch={() =>
            void run(async (signal) => {
              setPreview(null);
              setTables(
                (
                  await fetchDataConnections.getTables(
                    projectId,
                    connectionId,
                    "default",
                    search.trim() || undefined,
                    signal,
                  )
                ).data,
              );
              setName("");
              setColumns([]);
              change({ ...draft, fields: [], tags: [] });
            })
          }
          onSelect={(value) =>
            void run(async (signal) => {
              setPreview(null);
              setName(value);
              setColumns([]);
              const loaded = (await fetchDataConnections.getColumns(projectId, connectionId, "default", value, signal))
                .data;
              setColumns(loaded);
              change(selectTimeSeriesMetric(kind, value, loaded, draft));
            })
          }
        />
        <Button
          type="button"
          variant="outline"
          className="self-start"
          disabled={disabled || !name || !columns.length}
          onClick={() =>
            void run(async (signal) => {
              validateTimeSeriesSource(kind, source);
              validateTimeSeriesSelection(kind, source, columns);
              setPreview(null);
              setPreview((await fetchDataConnections.preview(projectId, connectionId, source, signal)).data);
            })
          }
        >
          {busy && <Spinner data-icon="inline-start" />}Preview data
        </Button>
        {preview && (
          <div className="h-80 min-h-0">
            <ConnectionPreviewStep preview={preview} timeSeries />
          </div>
        )}
      </FieldGroup>
    </WorkspaceFormDialog>
  );
}
