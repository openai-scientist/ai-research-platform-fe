import type { ProjectUsageItem } from "@/lib/api/services/fetch-admin";

/** Wording of each run status, most active first. */
const ORDER: [string, string][] = [
  ["running", "running"],
  ["queued", "queued"],
  ["awaiting_review", "awaiting review"],
  ["paused", "paused"],
  ["completed", "completed"],
  ["failed", "failed"],
  ["budget_exceeded", "over budget"],
  ["stopped", "stopped"],
];

/** "2 running, 5 completed": the runs of a project by status, or null when it has none. */
export function describeRuns(runsByStatus: ProjectUsageItem["runs_by_status"]): string | null {
  const known = new Set(ORDER.map(([status]) => status));
  const parts = ORDER.flatMap(([status, label]) => {
    const count = runsByStatus[status as keyof typeof runsByStatus];
    return count ? [`${count} ${label}`] : [];
  });
  // A status this app does not know yet is still counted, in plain words.
  for (const [status, count] of Object.entries(runsByStatus)) {
    if (!known.has(status) && count) parts.push(`${count} ${status.replaceAll("_", " ")}`);
  }
  return parts.length ? parts.join(", ") : null;
}
