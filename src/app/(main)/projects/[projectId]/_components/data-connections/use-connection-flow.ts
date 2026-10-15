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
import { beginGoogleConnection, type GoogleConnectionResume } from "./google-connection-state";
import { openGooglePicker } from "./google-picker";
import {
  buildTimeSeriesSource,
  createTimeSeriesDraft,
  selectTimeSeriesMetric,
  type TimeSeriesDraft,
  validateTimeSeriesSelection,
  validateTimeSeriesSource,
} from "./time-series-source";

export type ConnectionStep = 0 | 1 | 2 | 3 | 4;

export function useConnectionFlow(
  projectId: string,
  initialConnection: ConnectionItem | undefined,
  onComplete: (dataset: DatasetItem) => void,
  canWrite: boolean,
  userId: string,
  googleAvailable: boolean,
  googleResume?: GoogleConnectionResume,
  /** The provider picked on the connections page; the flow opens on its details step. */
  initialKind?: ConnectionKind,
) {
  const queryClient = useQueryClient();
  const access = useConnectionAccess(projectId);
  const [step, setStep] = useState<ConnectionStep>(
    initialConnection ? 2 : initialKind && !isGoogleConnection(initialKind) ? 1 : 0,
  );
  const [kind, setKind] = useState<ConnectionKind>(
    initialConnection?.kind ?? googleResume?.kind ?? initialKind ?? "postgres",
  );
  const [storedDraft, setDraft] = useState({
    ...EMPTY_CONNECTION_DRAFT,
    ...(initialKind === "mysql" ? { port: "3306" } : {}),
    name: googleResume?.name ?? "",
    googleTarget: googleResume?.target ?? "",
  });
  // Fast Refresh can retain the draft from before time series fields were added.
  const draft =
    typeof storedDraft.url === "string" && typeof storedDraft.token === "string"
      ? storedDraft
      : { ...EMPTY_CONNECTION_DRAFT, ...storedDraft, url: storedDraft.url ?? "", token: storedDraft.token ?? "" };
  const [grantId, setGrantId] = useState(googleResume?.grantId);
  const [pickerOpen, setPickerOpen] = useState(false);
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
  const autoPickerAttempted = useRef(false);
  const pickerRequest = useRef<AbortController | null>(null);
  const pendingImport = useRef<{
    name: string;
    source: ConnectionSource;
    connectionId: string;
    previousIds: ReadonlySet<string>;
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
        if (error instanceof ApiError && error.code === "GOOGLE_GRANT_INVALID") setGrantId(undefined);
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

  useEffect(() => () => pickerRequest.current?.abort(), []);

  function chooseKind(next: ConnectionKind) {
    if (busyRef.current || !canWrite || !access.configured || access.rateLimited) return;
    if (isGoogleConnection(next) && !googleAvailable) return;
    setKind(next);
    setMode("table");
    if (next !== kind) setGrantId(undefined);
    if (next !== kind)
      setDraft((previous) => ({
        ...previous,
        port: next === "mysql" ? "3306" : "5432",
        password: "",
        token: "",
        username: "",
        url: "",
        serviceAccountJson: "",
        googleTarget: "",
      }));
    if (isGoogleConnection(next)) {
      if (next === kind && grantId) void chooseGoogleSource();
      else void authorizeGoogle(next);
    } else setStep(1);
  }

  const saveConnection = useCallback(
    async (input: CreateConnectionRequest, automaticName = false) => {
      let savedConnection: ConnectionItem;
      try {
        savedConnection = (await fetchDataConnections.create(projectId, input)).data;
      } catch (error) {
        if (!automaticName || !(error instanceof ApiError) || error.code !== "CONNECTION_NAME_EXISTS") throw error;
        const existing = await collectPages((params) => fetchDataConnections.getList(projectId, params));
        const names = new Set(existing.map((item) => item.name.toLowerCase()));
        let name: string;
        let number = 2;
        do {
          const suffix = ` (${number++})`;
          name = `${input.name.slice(0, 120 - suffix.length)}${suffix}`;
        } while (names.has(name.toLowerCase()));
        savedConnection = (await fetchDataConnections.create(projectId, { ...input, name })).data;
      }
      setConnection(savedConnection);
      setGrantId(undefined);
      setDraft((previous) => ({ ...previous, password: "", token: "", serviceAccountJson: "" }));
      setStep(2);
      toast.success("Connection saved.");
      await queryClient.invalidateQueries({ queryKey: connectionKeys.lists(projectId) });
      await loadCatalog(savedConnection);
    },
    [loadCatalog, projectId, queryClient],
  );

  const connect = () => run(() => saveConnection(createConnectionInput(kind, draft, grantId)));

  const chooseGoogleSource = useCallback(
    () =>
      run(async () => {
        if (!isGoogleConnection(kind) || !grantId) return;
        const controller = new AbortController();
        pickerRequest.current = controller;
        try {
          const { data } = await fetchDataConnections.getGooglePicker(projectId, grantId, controller.signal);
          const selected = await openGooglePicker(kind, data, controller.signal, () => setPickerOpen(true));
          if (!selected || controller.signal.aborted) return;
          const sourceName = selected.name.trim().slice(0, 120);
          const name = sourceName.length >= 2 ? sourceName : `${sourceName || "Google"} source`;
          const selectedDraft = { ...EMPTY_CONNECTION_DRAFT, name, googleTarget: selected.id };
          setDraft(selectedDraft);
          setPickerOpen(false);
          await saveConnection(createConnectionInput(kind, selectedDraft, grantId), true);
        } catch (error) {
          if (!controller.signal.aborted) throw error;
        } finally {
          pickerRequest.current = null;
          setPickerOpen(false);
        }
      }),
    [grantId, kind, projectId, run, saveConnection],
  );

  useEffect(() => {
    if (
      autoPickerAttempted.current ||
      !googleResume?.grantId ||
      grantId !== googleResume.grantId ||
      connection ||
      !canWrite ||
      !access.configured ||
      access.rateLimited
    )
      return;
    // Defer until the effect is committed: Strict Mode cleans up its first setup immediately.
    const attempt = setTimeout(() => {
      if (autoPickerAttempted.current) return;
      autoPickerAttempted.current = true;
      void chooseGoogleSource();
    }, 0);
    return () => clearTimeout(attempt);
  }, [access.configured, access.rateLimited, canWrite, chooseGoogleSource, connection, googleResume, grantId]);

  const authorizeGoogle = (provider: ConnectionKind = kind) =>
    run(async () => {
      if (!isGoogleConnection(provider) || !googleAvailable) return;
      beginGoogleConnection(projectId, userId, {
        action: "create",
        draft: { kind: provider, name: "", target: "" },
      });
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

  const needsReauthorization = Boolean(
    connection &&
      isGoogleConnection(connection.kind) &&
      (connection.last_error_code === "access_revoked" || access.revokedConnectionIds.has(connection.id)),
  );

  return {
    step,
    setStep,
    kind,
    googleAvailable,
    isGoogle: isGoogleConnection(kind),
    isTimeSeries: isTimeSeriesConnection(kind),
    timeSeriesDraft,
    setTimeSeriesDraft: (value: TimeSeriesDraft) => {
      setTimeSeriesDraft(value);
      setPreview(null);
    },
    grantId,
    pickerOpen,
    chooseGoogleSource,
    authorizeGoogle,
    needsReauthorization,
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
