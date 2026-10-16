import { z } from "zod";

import { getApiBaseUrl } from "@/lib/api/config";

const GOOGLE_RETURN_PAGES = ["connections", "datasets"] as const;
export type GoogleReturnPage = (typeof GOOGLE_RETURN_PAGES)[number];

const intentSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    // What to pick once signed in.
    kind: z.enum(["google_sheets", "google_drive"]),
    // The page that asked: Google always sends the browser back to the connections page.
    returnTo: z.enum(GOOGLE_RETURN_PAGES).default("connections"),
  }),
  z.object({
    action: z.literal("reauthorize"),
    connectionId: z.string().uuid(),
    accountEmail: z.string().max(320).default(""),
    // The page Reconnect was pressed on, to go back to once the access is renewed.
    returnTo: z.string().startsWith("/projects/").max(512).optional(),
  }),
]);
export type GoogleConnectionIntent = z.infer<typeof intentSchema>;

const storageKey = (projectId: string, userId: string) => `google-connection:${userId}:${projectId}`;

export function beginGoogleConnection(projectId: string, userId: string, intent: z.input<typeof intentSchema>) {
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

/**
 * Where Google's answer belongs when another page asked for it, so the page it landed on can pass it on
 * untouched; `null` when it belongs here or there is none.
 */
export function googleCallbackElsewhere(projectId: string, userId: string, page: GoogleReturnPage): string | null {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("google_grant") && !url.searchParams.has("error")) return null;
  try {
    const stored = sessionStorage.getItem(storageKey(projectId, userId));
    const result = stored ? intentSchema.safeParse(JSON.parse(stored)) : null;
    if (!result?.success || result.data.action !== "create" || result.data.returnTo === page) return null;
    return `/projects/${encodeURIComponent(projectId)}/${result.data.returnTo}${url.search}`;
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
