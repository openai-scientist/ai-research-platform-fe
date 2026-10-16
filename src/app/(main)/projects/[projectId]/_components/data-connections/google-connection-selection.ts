import { clearConnectionRevocation } from "@/lib/api/connection-runtime";
import { collectPages } from "@/lib/api/infinite-pagination";
import {
  type ConnectionItem,
  type CreateConnectionRequest,
  fetchDataConnections,
} from "@/lib/api/services/fetch-data-connections";

import type { GooglePickerSelection } from "./google-picker";

export interface GoogleSelectionResult {
  connection: ConnectionItem;
  /** The project already had it, and it is used instead of a new one. */
  reused: boolean;
}

/** The kinds a picked Google file or folder becomes. */
export type GoogleFileKind = "google_sheets" | "google_drive";

/**
 * Forget that the files picked with this connection's Google account, by its creator, lost access: renewing the
 * account or one of them renews them all on the server.
 */
export function forgetRevokedFiles(projectId: string, renewed: ConnectionItem, connections: ConnectionItem[]) {
  for (const item of connections) {
    if (
      (item.kind === "google_sheets" || item.kind === "google_drive") &&
      item.created_by_user_id === renewed.created_by_user_id &&
      item.config.google_subject === renewed.config.google_subject
    )
      clearConnectionRevocation(projectId, item.id);
  }
}

/**
 * Keep the member's Google account from a fresh sign-in. The same account again renews the one they have, and
 * the server gives its new access to the files they picked with it, so those work again here too.
 */
export async function saveGoogleAccount(projectId: string, grantId: string): Promise<GoogleSelectionResult> {
  const before = await collectPages((params) => fetchDataConnections.getList(projectId, params));
  const connection = (await fetchDataConnections.create(projectId, { kind: "google", grant_id: grantId })).data;
  forgetRevokedFiles(projectId, connection, before);
  return { connection, reused: before.some((item) => item.id === connection.id) };
}

/**
 * Save a spreadsheet or folder picked with the member's saved Google account. One the project is already
 * connected to is used again, unless it lost its Google access.
 */
export async function saveGoogleFile(
  projectId: string,
  kind: GoogleFileKind,
  accountId: string,
  selected: GooglePickerSelection,
): Promise<GoogleSelectionResult> {
  const existing = await collectPages((params) => fetchDataConnections.getList(projectId, params));
  const targetKey = kind === "google_sheets" ? "spreadsheet_id" : "folder_id";
  const match = existing.find(
    (item) => item.kind === kind && item.config[targetKey] === selected.id && item.last_error_code !== "access_revoked",
  );
  if (match) return { connection: match, reused: true };

  const sourceName = selected.name.trim().slice(0, 120);
  const base = sourceName.length >= 2 ? sourceName : `${sourceName || "Google"} source`;
  // A different file with the same name gets " (2)", " (3)" and so on.
  const names = new Set(existing.map((item) => item.name.toLowerCase()));
  let name = base;
  for (let number = 2; names.has(name.toLowerCase()); number++) {
    const suffix = ` (${number})`;
    name = `${base.slice(0, 120 - suffix.length)}${suffix}`;
  }
  const input: CreateConnectionRequest =
    kind === "google_sheets"
      ? { name, kind, config: { spreadsheet: selected.id }, account_id: accountId }
      : { name, kind, config: { folder: selected.id }, account_id: accountId };
  return { connection: (await fetchDataConnections.create(projectId, input)).data, reused: false };
}
