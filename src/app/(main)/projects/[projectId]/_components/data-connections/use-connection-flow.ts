"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { showConnectionError, useConnectionAccess } from "@/hooks/use-data-connections";
import { collectPages } from "@/lib/api/infinite-pagination";
import { connectionKeys, projectKeys } from "@/lib/api/query-keys";
import {
  type ConnectionColumn,
  type ConnectionItem,
  type ConnectionKind,
  type ConnectionPreview,
  type ConnectionSource,
  type ConnectionTable,
  type CreateConnectionRequest,
  fetchDataConnections,
  isGoogleConnection,
  isTimeSeriesConnection,
  sameConnectionSource,
} from "@/lib/api/services/fetch-data-connections";
import { type DatasetItem, fetchDatasets } from "@/lib/api/services/fetch-datasets";
import { ApiError } from "@/types/api";

import { createConnectionInput, EMPTY_CONNECTION_DRAFT } from "./connection-form";
import {
  buildTimeSeriesSource,
  createTimeSeriesDraft,
  selectTimeSeriesMetric,
  type TimeSeriesDraft,
  validateTimeSeriesSelection,
  validateTimeSeriesSource,
} from "./time-series-source";

export type ConnectionStep = 1 | 2 | 3;

export function useConnectionFlow(
  projectId: string,
  initialConnection: ConnectionItem | undefined,
  onComplete: (dataset: DatasetItem) => void,
  canWrite: boolean,
  /** The provider picked on the connections page; the flow opens on its details step. */
  initialKind?: ConnectionKind,
) {
  const queryClient = useQueryClient();
  const access = useConnectionAccess(projectId);
  const [step, setStep] = useState<ConnectionStep>(initialConnection ? 2 : 1);
  const kind = initialConnection?.kind ?? initialKind ?? "postgres";
  const [storedDraft, setDraft] = useState({
    ...EMPTY_CONNECTION_DRAFT,
    ...(initialKind === "mysql" ? { port: "3306" } : {}),
  });
  // Fast Refresh can retain the draft from before time series fields were added.
  const draft =
    typeof storedDraft.url === "string" && typeof storedDraft.token === "string"
      ? storedDraft
      : { ...EMPTY_CONNECTION_DRAFT, ...storedDraft, url: storedDraft.url ?? "", token: storedDraft.token ?? "" };
  const [connection, setConnection] = useState(initialConnection);
  const [schemas, setSchemas] = useState<string[]>([]);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [schema, setSchema] = useState("");
  const [tables, setTables] = useState<ConnectionTable[]>([]);
  const [columns, setColumns] = useState<ConnectionColumn[]>([]);
  const [table, setTable] = useState("");
  const [tableSearch, setTableSearch] = useState("");
  const [mode, setMode] = useState<"table" | "query">("table");
  const [sql, setSql] = useState("");
  const [timeSeriesDraft, setTimeSeriesDraft] = useState(createTimeSeriesDraft);
  const [preview, setPreview] = useState<ConnectionPreview | null>(null);
  const [datasetName, setDatasetName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [reconcileRequired, setReconcileRequired] = useState(false);
  const busyRef = useRef(false);
  const initialised = useRef(false);
  const pendingImport = useRef<{
    name: string;
    source: ConnectionSource;
    connectionId: string;
    previousVersions: ReadonlyMap<string, string | undefined>;
  } | null>(null);
  const source = useMemo<ConnectionSource | null>(() => {
    if (isTimeSeriesConnection(kind)) return table ? buildTimeSeriesSource(kind, table, timeSeriesDraft) : null;
    if (mode === "query" && !isGoogleConnection(kind)) return sql.trim() ? { type: "query", sql: sql.trim() } : null;
    return schema && table ? { type: "table", schema, name: table } : null;
  }, [mode, sql, schema, table, kind, timeSeriesDraft]);

  const loadCatalog = useCallback(
    async (item: ConnectionItem) => {
      setCatalogLoaded(false);
      setSchemas([]);
      setSchema("");
      setTables([]);
      setTable("");
      setColumns([]);
      setPreview(null);
      const result = isTimeSeriesConnection(item.kind)
        ? { data: ["default"] }
        : await fetchDataConnections.getSchemas(projectId, item.id);
      setCatalogLoaded(true);
      setSchemas(result.data);
      if (result.data.length === 1) {
        const selected = result.data[0];
        setSchema(selected);
        setTables((await fetchDataConnections.getTables(projectId, item.id, selected)).data);
      }
    },
    [projectId],
  );

  const run = useCallback(
    async (action: () => Promise<void>, reconciliation = false) => {
      if (busyRef.current || !canWrite || (!reconciliation && (!access.configured || access.rateLimited))) return;
      busyRef.current = true;
      setBusy(true);
      try {
        await action();
      } catch (error) {
        showConnectionError(error, projectId);
        if (connection && error instanceof ApiError && error.reason === "source_not_found") {
          setStep(2);
          try {
            await loadCatalog(connection);
          } catch (reloadError) {
            showConnectionError(reloadError, projectId);
          }
        }
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [canWrite, access.configured, access.rateLimited, projectId, connection, loadCatalog],
  );

  useEffect(() => {
    if (!initialConnection || initialised.current) return;
    initialised.current = true;
    void run(() => loadCatalog(initialConnection));
  }, [initialConnection, run, loadCatalog]);

  const saveConnection = useCallback(
    async (input: CreateConnectionRequest) => {
      const saved = await fetchDataConnections.create(projectId, input);
      const savedConnection = saved.data;
      setConnection(savedConnection);
      setDraft((previous) => ({ ...previous, password: "", token: "", serviceAccountJson: "" }));
      setStep(2);
      // The same server and user already connected: that connection is used, under its own name.
      toast.success(saved.reused ? "Already connected" : "Connection saved", { description: savedConnection.name });
      await queryClient.invalidateQueries({ queryKey: connectionKeys.lists(projectId) });
      await loadCatalog(savedConnection);
    },
    [loadCatalog, projectId, queryClient],
  );

  const connect = () => run(() => saveConnection(createConnectionInput(kind, draft)));

  const selectSchema = (value: string) =>
    run(async () => {
      if (!connection) return;
      setSchema(value);
      setTable("");
      setTables([]);
      setColumns([]);
      setPreview(null);
      setTableSearch("");
      setTables((await fetchDataConnections.getTables(projectId, connection.id, value)).data);
    });

  const searchTables = () =>
    run(async () => {
      if (!connection || !schema) return;
      setTable("");
      setColumns([]);
      setPreview(null);
      setTables(
        (await fetchDataConnections.getTables(projectId, connection.id, schema, tableSearch.trim() || undefined)).data,
      );
    });

  const selectTable = (value: string) =>
    run(async () => {
      if (!connection || !schema) return;
      setTable(value);
      setColumns([]);
      setPreview(null);
      const loaded = (await fetchDataConnections.getColumns(projectId, connection.id, schema, value)).data;
      setColumns(loaded);
      if (isTimeSeriesConnection(kind)) {
        setTimeSeriesDraft((previous) => selectTimeSeriesMetric(kind, value, loaded, previous));
      }
    });

  const previewSource = () =>
    run(async () => {
      if (!connection || !source)
        throw new Error(
          isGoogleConnection(kind) ? "Choose a file or spreadsheet tab." : "Choose a source before previewing.",
        );
      if (source.type === "query" && source.sql.length > 20_000)
        throw new Error("SQL queries may contain at most 20,000 characters.");
      if (source.type === "timeseries" && isTimeSeriesConnection(kind)) {
        validateTimeSeriesSource(kind, source);
        validateTimeSeriesSelection(kind, source, columns);
      }
      setPreview(null);
      const result = await fetchDataConnections.preview(projectId, connection.id, source);
      setPreview(result.data);
      if (!datasetName.trim()) setDatasetName(source.type === "query" ? `${connection.name} query` : source.name);
      setStep(3);
    });

  async function reconcileImport() {
    const pending = pendingImport.current;
    if (!pending) return;
    const datasets = await collectPages((params) => fetchDatasets.getList(projectId, params));
    const matches = datasets.filter(
      (item) =>
        (!pending.previousVersions.has(item.id) || pending.previousVersions.get(item.id) !== item.latest_version?.id) &&
        (item.name.toLowerCase() === pending.name.toLowerCase() ||
          item.name.toLowerCase().startsWith(`${pending.name.toLowerCase()} (`)) &&
        item.latest_version?.source?.connection_id === pending.connectionId &&
        sameConnectionSource(item.latest_version.source.source, pending.source),
    );
    const found = matches.length === 1 ? matches[0] : undefined;
    if (found) {
      setReconcileRequired(false);
      pendingImport.current = null;
      await queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
      toast.success("Dataset imported", { description: found.name });
      onComplete(found);
      return;
    }
    // An uncertain import may still finish. Keep reconciliation active rather than offer a duplicate POST.
    await queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
  }

  const importDataset = () =>
    run(async () => {
      if (reconcileRequired) return;
      if (!connection || !source || !preview?.rows.length)
        throw new Error("Preview a source with rows before importing.");
      const name = datasetName.trim();
      if (name.length < 2 || name.length > 160) throw new Error("Dataset name must contain 2 to 160 characters.");
      if (description.length > 5000) throw new Error("Description must contain at most 5,000 characters.");
      const previous = await collectPages((params) => fetchDatasets.getList(projectId, params));
      pendingImport.current = {
        name,
        source,
        connectionId: connection.id,
        previousVersions: new Map(previous.map((item) => [item.id, item.latest_version?.id])),
      };
      try {
        const result = await fetchDatasets.importConnection(projectId, {
          name,
          description: description.trim(),
          connection_id: connection.id,
          source,
        });
        pendingImport.current = null;
        await queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
        const titles = {
          created_version: "New version imported",
          created_copy: "Separate dataset imported",
          created_dataset: "Dataset imported",
        };
        toast.success(titles[result.meta.upload.outcome], { description: result.data.name });
        onComplete(result.data);
      } catch (error) {
        if (error instanceof ApiError && error.status !== 0 && error.status < 500) throw error;
        // A dropped response can follow a successful import. Never send it again before reconciling the list.
        setReconcileRequired(true);
        showConnectionError(error, projectId);
        await reconcileImport();
      }
    });

  const needsReauthorization = Boolean(
    connection &&
      isGoogleConnection(connection.kind) &&
      (connection.last_error_code === "access_revoked" || access.revokedConnectionIds.has(connection.id)),
  );

  return {
    step,
    setStep,
    kind,
    isGoogle: isGoogleConnection(kind),
    isTimeSeries: isTimeSeriesConnection(kind),
    timeSeriesDraft,
    setTimeSeriesDraft: (value: TimeSeriesDraft) => {
      setTimeSeriesDraft(value);
      setPreview(null);
    },
    needsReauthorization,
    draft,
    setDraft,
    connection,
    schemas,
    catalogLoaded,
    schema,
    tables,
    table,
    columns,
    tableSearch,
    setTableSearch,
    mode,
    setMode: (value: "table" | "query") => {
      if (value === "query" && (isGoogleConnection(kind) || isTimeSeriesConnection(kind))) return;
      setMode(value);
      setPreview(null);
    },
    sql,
    setSql: (value: string) => {
      setSql(value);
      setPreview(null);
    },
    source,
    preview,
    datasetName,
    setDatasetName,
    description,
    setDescription,
    busy,
    disabled:
      busy || reconcileRequired || needsReauthorization || !canWrite || !access.configured || access.rateLimited,
    waitSeconds: access.waitSeconds,
    configured: access.configured,
    reconcileRequired,
    connect,
    selectSchema,
    searchTables,
    selectTable,
    previewSource,
    importDataset,
    reloadCatalog: () => connection && run(() => loadCatalog(connection)),
    reconcileImport: () => run(reconcileImport, true),
  };
}

export type ConnectionFlowState = ReturnType<typeof useConnectionFlow>;
