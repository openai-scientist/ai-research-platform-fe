import { z } from "zod";

import { getApiBaseUrl } from "@/lib/api/config";
import type { GoogleConnectionKind } from "@/lib/api/services/fetch-data-connections";

const googleDraftSchema = z.object({
  kind: z.enum(["google_sheets", "google_drive"]),
  name: z.string().max(120),
  target: z.string().max(2048),
});
const intentSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), draft: googleDraftSchema }),
  z.object({
    action: z.literal("reauthorize"),
    connectionId: z.string().uuid(),
    accountEmail: z.string().max(320).default(""),
  }),
]);
export type GoogleConnectionIntent = z.infer<typeof intentSchema>;
export type GoogleConnectionResume = {
  kind: GoogleConnectionKind;
  name: string;
  target: string;
  grantId?: string;
};

const storageKey = (projectId: string, userId: string) => `google-connection:${userId}:${projectId}`;

export function beginGoogleConnection(projectId: string, userId: string, intent: GoogleConnectionIntent) {
  // Whitelist only Google fields. Database passwords, service account keys and grants are never stored.
  const safeIntent = intentSchema.parse(intent);
  try {
    sessionStorage.setItem(storageKey(projectId, userId), JSON.stringify(safeIntent));
  } catch {
    throw new Error("Allow browser session storage before connecting your Google account.");
  }
  window.location.assign(`${getApiBaseUrl()}/projects/${encodeURIComponent(projectId)}/connections/google/start`);
}

export function takeGoogleConnectionIntent(projectId: string, userId: string): GoogleConnectionIntent | null {
  try {
    const key = storageKey(projectId, userId);
    const stored = sessionStorage.getItem(key);
    sessionStorage.removeItem(key);
    if (!stored) return null;
    const result = intentSchema.safeParse(JSON.parse(stored));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function consumeGoogleConnectionCallback(): { grantId: string | null; error: string | null } | null {
  const url = new URL(window.location.href);
  const grantId = url.searchParams.get("google_grant");
  const error = url.searchParams.get("error");
  if (grantId === null && error === null) return null;
  url.searchParams.delete("google_grant");
  url.searchParams.delete("error");
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  return { grantId: grantId && z.string().uuid().safeParse(grantId).success ? grantId : null, error };
}

export function googleConnectionCallbackMessage(code: string): string {
  return code === "GOOGLE_ACCESS_NOT_GRANTED"
    ? "Select the permission to view Google Drive files on Google's consent screen, then try again."
    : "Google access could not be authorized. Please connect your Google account again.";
}
