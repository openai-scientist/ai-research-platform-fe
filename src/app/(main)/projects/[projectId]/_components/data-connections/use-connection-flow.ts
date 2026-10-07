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
  fetchDataConnections,
  sameConnectionSource,
} from "@/lib/api/services/fetch-data-connections";
import { type DatasetItem, fetchDatasets } from "@/lib/api/services/fetch-datasets";
import { ApiError } from "@/types/api";

import { createConnectionInput, EMPTY_CONNECTION_DRAFT } from "./connection-form";

export type ConnectionStep = 0 | 1 | 2 | 3 | 4;

export function useConnectionFlow(
  projectId: string,
  initialConnection: ConnectionItem | undefined,
  onComplete: (dataset: DatasetItem) => void,
  canWrite: boolean,
) {
  const queryClient = useQueryClient();
  const access = useConnectionAccess(projectId);
  const [step, setStep] = useState<ConnectionStep>(initialConnection ? 2 : 0);
  const [kind, setKind] = useState<ConnectionKind>(initialConnection?.kind ?? "postgres");
  const [draft, setDraft] = useState({ ...EMPTY_CONNECTION_DRAFT });
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
    previousIds: ReadonlySet<string>;
  } | null>(null);
  const source = useMemo<ConnectionSource | null>(
    () =>
      mode === "query"
        ? sql.trim()
          ? { type: "query", sql: sql.trim() }
          : null
        : schema && table
          ? { type: "table", schema, name: table }
          : null,
    [mode, sql, schema, table],
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
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [canWrite, access.configured, access.rateLimited, projectId],
  );

  const loadCatalog = useCallback(
    async (item: ConnectionItem) => {
      setCatalogLoaded(false);
      setSchemas([]);
      setSchema("");
      setTables([]);
      setTable("");
      setColumns([]);
      setPreview(null);
      const result = await fetchDataConnections.getSchemas(projectId, item.id);
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

  useEffect(() => {
    if (!initialConnection || initialised.current) return;
    initialised.current = true;
    void run(() => loadCatalog(initialConnection));
  }, [initialConnection, run, loadCatalog]);

  function chooseKind(next: ConnectionKind) {
    setKind(next);
    if (next !== kind)
      setDraft((previous) => ({
        ...previous,
        port: next === "mysql" ? "3306" : "5432",
        password: "",
        serviceAccountJson: "",
      }));
    setStep(1);
  }

  const connect = () =>
    run(async () => {
      const input = createConnectionInput(kind, draft);
      const result = await fetchDataConnections.create(projectId, input);
      setConnection(result.data);
      setDraft((previous) => ({ ...previous, password: "", serviceAccountJson: "" }));
      setStep(2);
      toast.success("Connection saved.");
      await queryClient.invalidateQueries({ queryKey: connectionKeys.lists(projectId) });
      await loadCatalog(result.data);
    });

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
      setColumns((await fetchDataConnections.getColumns(projectId, connection.id, schema, value)).data);
    });

  const previewSource = () =>
    run(async () => {
      if (!connection || !source) throw new Error("Choose a table or enter a SELECT query.");
      if (source.type === "query" && source.sql.length > 20_000)
        throw new Error("SQL queries may contain at most 20,000 characters.");
      setPreview(null);
      const result = await fetchDataConnections.preview(projectId, connection.id, source);
      setPreview(result.data);
      if (!datasetName.trim()) setDatasetName(source.type === "table" ? source.name : `${connection.name} query`);
      setStep(3);
    });

  async function reconcileImport() {
    const pending = pendingImport.current;
    if (!pending) return;
    const datasets = await collectPages((params) => fetchDatasets.getList(projectId, params));
    const found = datasets.find(
      (item) =>
        !pending.previousIds.has(item.id) &&
        item.name.toLowerCase() === pending.name.toLowerCase() &&
        item.latest_version?.source?.connection_id === pending.connectionId &&
        sameConnectionSource(item.latest_version.source.source, pending.source),
    );
    if (found) {
      setReconcileRequired(false);
      pendingImport.current = null;
      await queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
      toast.success("The import completed. Opening the saved dataset.");
      onComplete(found);
      return;
    }
    setReconcileRequired(false);
    await queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
  }

  const importDataset = () =>
    run(async () => {
      if (reconcileRequired) return;
      if (!connection || !source || !preview) throw new Error("Preview your source before importing.");
      const name = datasetName.trim();
      if (name.length < 2 || name.length > 160) throw new Error("Dataset name must contain 2 to 160 characters.");
      if (description.length > 5000) throw new Error("Description must contain at most 5,000 characters.");
      const previous = await collectPages((params) => fetchDatasets.getList(projectId, params));
      pendingImport.current = {
        name,
        source,
        connectionId: connection.id,
        previousIds: new Set(previous.map((item) => item.id)),
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
        toast.success("Dataset imported.");
        onComplete(result.data);
      } catch (error) {
        if (error instanceof ApiError && error.status !== 0 && error.status < 500) throw error;
        // A dropped response can follow a successful import. Never send it again before reconciling the list.
        setReconcileRequired(true);
        showConnectionError(error, projectId);
        await reconcileImport();
      }
    });

  return {
    step,
    setStep,
    kind,
    chooseKind,
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
    disabled: busy || reconcileRequired || !canWrite || !access.configured || access.rateLimited,
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
