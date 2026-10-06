import { getLocalStorageValue, setLocalStorageValue } from "@/lib/local-storage.client";

export const RECENT_PROJECTS_CHANGED = "projects:recent-changed";

export interface RecentProjectVisit {
  id: string;
  openedAt: number;
}

export function getRecentProjectsSnapshot(userId: string) {
  return userId ? getLocalStorageValue(`recent-projects:${userId}`) : null;
}

export function parseRecentProjects(snapshot: string | null): RecentProjectVisit[] {
  try {
    const entries: unknown = JSON.parse(snapshot ?? "[]");
    if (!Array.isArray(entries)) return [];
    return entries.filter(
      (entry): entry is RecentProjectVisit =>
        typeof entry === "object" &&
        entry !== null &&
        "id" in entry &&
        typeof entry.id === "string" &&
        "openedAt" in entry &&
        typeof entry.openedAt === "number" &&
        Number.isFinite(entry.openedAt),
    );
  } catch {
    return [];
  }
}

export function rememberRecentProject(userId: string, projectId: string) {
  const visits = parseRecentProjects(getRecentProjectsSnapshot(userId));
  const next = [{ id: projectId, openedAt: Date.now() }, ...visits.filter((visit) => visit.id !== projectId)].slice(
    0,
    20,
  );
  setLocalStorageValue(`recent-projects:${userId}`, JSON.stringify(next));
  window.dispatchEvent(new Event(RECENT_PROJECTS_CHANGED));
}
