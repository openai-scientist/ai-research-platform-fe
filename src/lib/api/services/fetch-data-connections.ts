import type { ApiResult } from "@/types/api";

import { clearConnectionRevocation, connectionRequest } from "../connection-runtime";
import apiService from "../core";
import { projectPath } from "../request";
import type { ListParams } from "../types";

/** `google` is a member's Google account, kept for them to pick spreadsheets and folders with. */
export type GoogleConnectionKind = "google" | "google_sheets" | "google_drive";
export type TimeSeriesConnectionKind = "prometheus" | "influxdb";
export type ConnectionKind = "postgres" | "mysql" | "bigquery" | GoogleConnectionKind | TimeSeriesConnectionKind;
export function isTimeSeriesConnection(kind: ConnectionKind): kind is TimeSeriesConnectionKind {
  return kind === "prometheus" || kind === "influxdb";
}
export function isGoogleConnection(kind: ConnectionKind): kind is GoogleConnectionKind {
  return kind === "google" || kind === "google_sheets" || kind === "google_drive";
}
export type ConnectionSsl = "require" | "verify-full" | "disable";
export type TimeSeriesBucket = "1m" | "5m" | "15m" | "1h" | "6h" | "1d" | "1w";
export type TimeSeriesAggregate = "mean" | "sum" | "min" | "max" | "count" | "increase";
export interface TimeSeriesSource {
  type: "timeseries";
  name: string;
  fields: string[];
  tags: string[];
  start: string;
  end: string;
  bucket: TimeSeriesBucket | null;
  aggregate: TimeSeriesAggregate | null;
}
export type ConnectionSource =
  | { type: "table"; schema: string; name: string }
  | { type: "query"; sql: string }
  | TimeSeriesSource;

export function sameConnectionSource(left: ConnectionSource, right: ConnectionSource) {
  if (left.type === "timeseries" && right.type === "timeseries") {
    return (
      left.name === right.name &&
      Date.parse(left.start) === Date.parse(right.start) &&
      Date.parse(left.end) === Date.parse(right.end) &&
      left.bucket === right.bucket &&
      left.aggregate === right.aggregate &&
      left.fields.length === right.fields.length &&
      left.fields.every((field, index) => field === right.fields[index]) &&
      left.tags.length === right.tags.length &&
      left.tags.every((tag, index) => tag === right.tags[index])
    );
  }
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
  // A member keeps their Google account from a fresh sign-in, then picks files with it.
  | { name?: string; kind: "google"; grant_id: string }
  | { name: string; kind: "google_sheets"; config: { spreadsheet: string }; account_id: string }
  | { name: string; kind: "google_drive"; config: { folder: string }; account_id: string }
  | { name: string; kind: "prometheus"; config: { url: string }; secret?: { username?: string; token?: string } }
  | {
      name: string;
      kind: "influxdb";
      config: { url: string; database: string };
      secret?: { token?: string; username?: string; password?: string };
    };
export interface ConnectionTable {
  schema: string;
  name: string;
  type: "table" | "view";
  column_count: number | null;
}
export interface ConnectionColumn {
  name: string;
  type: string;
  role: "time" | "field" | "tag" | null;
}
export interface GooglePickerCredentials {
  access_token: string;
  api_key: string;
  app_id: string;
}
export interface ConnectionPreview {
  columns: ConnectionColumn[];
  rows: (string | null)[][];
  truncated: boolean;
}
export type LiveWindow = "15m" | "1h" | "6h" | "24h";
export interface ConnectionLiveRequest {
  name: string;
  fields: string[];
  tags: string[];
  aggregate: TimeSeriesAggregate;
  last: LiveWindow;
}
export interface ConnectionLiveData extends ConnectionPreview {
  start: string;
  end: string;
  bucket: string;
}
export interface ConnectionListParams extends ListParams {
  q?: string;
}

const connectionsPath = (projectId: string) => `${projectPath(projectId)}/connections`;
const connectionPath = (projectId: string, id: string) => `${connectionsPath(projectId)}/${encodeURIComponent(id)}`;
const remoteTimeout = 75_000;

export const fetchDataConnections = {
  live: (projectId: string, id: string, input: ConnectionLiveRequest, signal?: AbortSignal) =>
    connectionRequest(
      projectId,
      async () =>
        (
          await apiService.post<ApiResult<ConnectionLiveData>>(`${connectionPath(projectId, id)}/live`, input, {
            timeout: remoteTimeout,
            signal,
          })
        ).data,
      signal,
      id,
    ),
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
  /** `reused`: the project already had this source (or this Google account), and that one answers. */
  create: (projectId: string, input: CreateConnectionRequest) =>
    connectionRequest(projectId, async () => {
      const response = await apiService.post<ApiResult<ConnectionItem>>(connectionsPath(projectId), input, {
        timeout: remoteTimeout,
      });
      return { ...response.data, reused: response.status === 200 };
    }),
  /** Google Picker with the member's own saved Google account. */
  getAccountPicker: (projectId: string, accountId: string, signal?: AbortSignal) =>
    connectionRequest(
      projectId,
      async () =>
        (
          await apiService.post<ApiResult<GooglePickerCredentials>>(
            `${connectionPath(projectId, accountId)}/picker`,
            undefined,
            { signal },
          )
        ).data,
      signal,
      accountId,
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
