import { collectPages } from "@/lib/api/infinite-pagination";
import {
  type CreateConnectionRequest,
  fetchDataConnections,
  type GoogleConnectionKind,
} from "@/lib/api/services/fetch-data-connections";
import { ApiError } from "@/types/api";

import type { GooglePickerSelection } from "./google-picker";

/** Save the selected Google source before opening the import workspace. */
export async function saveGoogleSelection(
  projectId: string,
  kind: GoogleConnectionKind,
  grantId: string,
  selected: GooglePickerSelection,
) {
  const sourceName = selected.name.trim().slice(0, 120);
  const name = sourceName.length >= 2 ? sourceName : `${sourceName || "Google"} source`;
  const input: CreateConnectionRequest =
    kind === "google_sheets"
      ? { name, kind, config: { spreadsheet: selected.id }, grant_id: grantId }
      : { name, kind, config: { folder: selected.id }, grant_id: grantId };
  try {
    return (await fetchDataConnections.create(projectId, input)).data;
  } catch (error) {
    if (!(error instanceof ApiError) || error.code !== "CONNECTION_NAME_EXISTS") throw error;
    const existing = await collectPages((params) => fetchDataConnections.getList(projectId, params));
    const names = new Set(existing.map((item) => item.name.toLowerCase()));
    let available: string;
    let number = 2;
    do {
      const suffix = ` (${number++})`;
      available = `${name.slice(0, 120 - suffix.length)}${suffix}`;
    } while (names.has(available.toLowerCase()));
    return (await fetchDataConnections.create(projectId, { ...input, name: available })).data;
  }
}
