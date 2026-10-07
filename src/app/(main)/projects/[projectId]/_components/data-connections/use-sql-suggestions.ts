"use client";

import { useEffect, useRef, useState } from "react";

import { showConnectionError } from "@/hooks/use-data-connections";
import {
  type ConnectionColumn,
  type ConnectionTable,
  fetchDataConnections,
} from "@/lib/api/services/fetch-data-connections";

import { type SqlCompletionContext, type SqlSuggestion, sqlIdentifier, sqlTableIdentifier } from "./sql-completion";
import type { ConnectionFlowState } from "./use-connection-flow";

export function useSqlSuggestions(flow: ConnectionFlowState, context: SqlCompletionContext | null, enabled: boolean) {
  const [items, setItems] = useState<SqlSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const tableCache = useRef(new Map<string, ConnectionTable[]>());
  const columnCache = useRef(new Map<string, ConnectionColumn[]>());
  const seedSchema = flow.schema || (flow.schemas.includes("public") ? "public" : (flow.schemas[0] ?? ""));
  const connection = flow.connection;
  const previousCatalog = useRef<{ connectionId: string | undefined; schemas: string[] } | null>(null);

  useEffect(() => {
    const connectionId = connection?.id;
    const schemas = flow.schemas;
    if (previousCatalog.current?.connectionId === connectionId && previousCatalog.current?.schemas === schemas) return;
    previousCatalog.current = { connectionId, schemas };
    tableCache.current.clear();
    columnCache.current.clear();
  }, [connection?.id, flow.schemas]);
  useEffect(() => {
    if (!connection || !flow.schema) return;
    if (flow.tables.length && !flow.tableSearch.trim())
      tableCache.current.set(JSON.stringify([connection.id, flow.schema, ""]), flow.tables);
    if (flow.table && flow.columns.length)
      columnCache.current.set(JSON.stringify([connection.id, flow.schema, flow.table]), flow.columns);
  }, [connection, flow.schema, flow.tables, flow.tableSearch, flow.table, flow.columns]);

  useEffect(() => {
    if (!connection || !context || !enabled || flow.disabled) {
      setItems([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setItems([]);
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const projectId = connection.project_id;
        const tables = async (schema: string, search?: string) => {
          const key = JSON.stringify([connection.id, schema, search ?? ""]);
          const cached = tableCache.current.get(key);
          if (cached) return cached;
          const result = await fetchDataConnections.getTables(
            projectId,
            connection.id,
            schema,
            search,
            controller.signal,
          );
          if (!controller.signal.aborted) tableCache.current.set(key, result.data);
          return result.data;
        };
        const candidates: SqlSuggestion[] = [];
        if (context.kind === "table") {
          const path = context.qualifier.split(".");
          const schema = context.qualifier ? path[path.length - 1] : seedSchema;
          if (!context.qualifier)
            for (const name of flow.schemas)
              candidates.push({
                key: `schema:${name}`,
                kind: "schema",
                label: name,
                detail: "Schema",
                insert: `${sqlIdentifier(name, flow.kind)}.`,
              });
          const localProject = path.length < 2 || path[0] === connection.config.project_id;
          if (schema && flow.schemas.includes(schema) && localProject) {
            let catalog = await tables(schema);
            if (catalog.length >= 500 && context.prefix.length >= 2) catalog = await tables(schema, context.prefix);
            for (const table of catalog)
              candidates.push({
                key: `table:${schema}.${table.name}`,
                kind: "table",
                label: table.name,
                detail: `${schema} · ${table.type}`,
                insert: context.quotedPath
                  ? sqlTableIdentifier(context.qualifier, table.name, flow.kind)
                  : context.qualifier
                    ? sqlIdentifier(table.name, flow.kind)
                    : sqlTableIdentifier(schema, table.name, flow.kind),
              });
          }
        } else {
          const references = context.references.length
            ? context.references
            : flow.table && flow.schema
              ? [{ schema: flow.schema, name: flow.table, alias: flow.table }]
              : [];
          const qualifier = context.qualifier.split(".").pop()?.toLowerCase();
          const targets = references
            .filter((ref) => !qualifier || [ref.alias, ref.name].some((name) => name.toLowerCase() === qualifier))
            .slice(0, 4);
          for (const ref of targets) {
            if (controller.signal.aborted) return;
            if (!flow.schemas.includes(ref.schema)) continue;
            if ("project" in ref && ref.project && ref.project !== connection.config.project_id) continue;
            const fullCatalog = tableCache.current.get(JSON.stringify([connection.id, ref.schema, ""]));
            const hasKnownTable = fullCatalog?.some((item) => item.name.toLowerCase() === ref.name.toLowerCase());
            const catalog =
              fullCatalog && (hasKnownTable || fullCatalog.length < 500)
                ? fullCatalog
                : await tables(ref.schema, ref.name);
            const table =
              catalog.find((item) => item.name === ref.name) ??
              catalog.find((item) => item.name.toLowerCase() === ref.name.toLowerCase());
            if (!table) continue;
            const key = JSON.stringify([connection.id, ref.schema, table.name]);
            let columns =
              ref.schema === flow.schema && table.name === flow.table && flow.columns.length
                ? flow.columns
                : columnCache.current.get(key);
            if (!columns) {
              columns = (
                await fetchDataConnections.getColumns(
                  projectId,
                  connection.id,
                  ref.schema,
                  table.name,
                  controller.signal,
                )
              ).data;
              if (!controller.signal.aborted) columnCache.current.set(key, columns);
            }
            for (const column of columns)
              candidates.push({
                key: `column:${ref.alias}.${column.name}`,
                kind: "column",
                label: column.name,
                detail: `${ref.alias} · ${column.type}`,
                insert:
                  context.qualifier || targets.length === 1
                    ? sqlIdentifier(column.name, flow.kind)
                    : `${"aliasQuoted" in ref && ref.aliasQuoted ? sqlIdentifier(ref.alias, flow.kind) : ref.alias}.${sqlIdentifier(column.name, flow.kind)}`,
              });
          }
        }
        if (!controller.signal.aborted) {
          const term = context.prefix.toLowerCase();
          const unique = Array.from(new Map(candidates.map((item) => [item.key, item])).values());
          setItems(unique.filter((item) => item.label.toLowerCase().startsWith(term)).slice(0, 50));
        }
      } catch (error) {
        if (!controller.signal.aborted) showConnectionError(error, connection.project_id);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [
    connection,
    context,
    enabled,
    flow.disabled,
    seedSchema,
    flow.schemas,
    flow.kind,
    flow.schema,
    flow.table,
    flow.columns,
  ]);

  return { items, loading };
}
