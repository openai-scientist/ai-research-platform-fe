import type { ApiResult } from "@/types/api";

import { clearConnectionRevocation, connectionRequest } from "../connection-runtime";
import apiService from "../core";
import { projectPath } from "../request";
import type { ListParams } from "../types";

export type GoogleConnectionKind = "google_sheets" | "google_drive";
export type ConnectionKind = "postgres" | "mysql" | "bigquery" | GoogleConnectionKind;
export function isGoogleConnection(kind: ConnectionKind): kind is GoogleConnectionKind {
  return kind === "google_sheets" || kind === "google_drive";
}
export type ConnectionSsl = "require" | "verify-full" | "disable";
export type ConnectionSource = { type: "table"; schema: string; name: string } | { type: "query"; sql: string };

export function sameConnectionSource(left: ConnectionSource, right: ConnectionSource) {
  return left.type === "table" && right.type === "table"
    ? left.schema === right.schema && left.name === right.name
    : left.type === "query" && right.type === "query" && left.sql === right.sql;
}
export interface ConnectionItem {
  id: string;
  project_id: string;
  name: string;
  kind: ConnectionKind;
  config: Record<string, unknown>;
  last_tested_at: string | null;
  last_error_code: string | null;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
}
export type CreateConnectionRequest =
  | {
      name: string;
      kind: "postgres" | "mysql";
      config: { host: string; port?: number; database: string; username: string; ssl?: ConnectionSsl };
      secret: { password?: string };
    }
  | {
      name: string;
      kind: "bigquery";
      config?: { project_id?: string; location?: string };
      secret: { service_account_json: string };
    }
  | { name: string; kind: "google_sheets"; config: { spreadsheet: string }; grant_id: string }
  | { name: string; kind: "google_drive"; config: { folder: string }; grant_id: string };
export interface ConnectionTable {
  schema: string;
  name: string;
  type: "table" | "view";
  column_count: number | null;
}
export interface ConnectionColumn {
  name: string;
  type: string;
}
export interface ConnectionPreview {
  columns: ConnectionColumn[];
  rows: (string | null)[][];
  truncated: boolean;
}
export interface ConnectionListParams extends ListParams {
  q?: string;
}

const connectionsPath = (projectId: string) => `${projectPath(projectId)}/connections`;
const connectionPath = (projectId: string, id: string) => `${connectionsPath(projectId)}/${encodeURIComponent(id)}`;
const remoteTimeout = 75_000;

export const fetchDataConnections = {
  getList: (projectId: string, params?: ConnectionListParams, signal?: AbortSignal) =>
    connectionRequest(
      projectId,
      async () =>
        (await apiService.get<ApiResult<ConnectionItem[]>>(connectionsPath(projectId), params, { signal })).data,
      signal,
    ),
  getById: (projectId: string, id: string, signal?: AbortSignal) =>
    connectionRequest(
      projectId,
      async () =>
        (await apiService.get<ApiResult<ConnectionItem>>(connectionPath(projectId, id), undefined, { signal })).data,
      signal,
      id,
    ),
  create: (projectId: string, input: CreateConnectionRequest) =>
    connectionRequest(
      projectId,
      async () =>
        (
          await apiService.post<ApiResult<ConnectionItem>>(connectionsPath(projectId), input, {
            timeout: remoteTimeout,
          })
        ).data,
    ),
  rename: (projectId: string, id: string, name: string) =>
    connectionRequest(
      projectId,
      async () => (await apiService.patch<ApiResult<ConnectionItem>>(connectionPath(projectId, id), { name })).data,
    ),
  reauthorize: (projectId: string, id: string, grantId: string) =>
    connectionRequest(projectId, async () => {
      const response = await apiService.post<ApiResult<ConnectionItem>>(
        `${connectionPath(projectId, id)}/reauthorize`,
        { grant_id: grantId },
        { timeout: remoteTimeout },
      );
      clearConnectionRevocation(projectId, id);
      return response.data;
    }),
  remove: (projectId: string, id: string) =>
    connectionRequest(
      projectId,
      async () => (await apiService.delete<ApiResult<null>>(connectionPath(projectId, id))).data,
    ),
  test: (projectId: string, id: string) =>
    connectionRequest(
      projectId,
      async () =>
        (
          await apiService.post<ApiResult<ConnectionItem>>(`${connectionPath(projectId, id)}/test`, undefined, {
            timeout: remoteTimeout,
          })
        ).data,
      undefined,
      id,
    ),
  getSchemas: (projectId: string, id: string, signal?: AbortSignal) =>
    connectionRequest(
      projectId,
      async () =>
        (
          await apiService.get<ApiResult<string[]>>(`${connectionPath(projectId, id)}/schemas`, undefined, {
            timeout: remoteTimeout,
            signal,
          })
        ).data,
      signal,
      id,
    ),
  getTables: (projectId: string, id: string, schema: string, search?: string, signal?: AbortSignal) =>
    connectionRequest(
      projectId,
      async () =>
        (
          await apiService.get<ApiResult<ConnectionTable[]>>(
            `${connectionPath(projectId, id)}/tables`,
            { schema, search },
            {
              timeout: remoteTimeout,
              signal,
            },
          )
        ).data,
      signal,
      id,
    ),
  getColumns: (projectId: string, id: string, schema: string, table: string, signal?: AbortSignal) =>
    connectionRequest(
      projectId,
      async () =>
        (
          await apiService.get<ApiResult<ConnectionColumn[]>>(
            `${connectionPath(projectId, id)}/columns`,
            { schema, table },
            {
              timeout: remoteTimeout,
              signal,
            },
          )
        ).data,
      signal,
      id,
    ),
  preview: (projectId: string, id: string, source: ConnectionSource, signal?: AbortSignal) =>
    connectionRequest(
      projectId,
      async () =>
        (
          await apiService.post<ApiResult<ConnectionPreview>>(
            `${connectionPath(projectId, id)}/preview`,
            { source },
            {
              timeout: remoteTimeout,
              signal,
            },
          )
        ).data,
      signal,
      id,
    ),
};
