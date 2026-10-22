import { ProjectStatus, RunStatus } from "@/types/enums";

export function isActiveRun(status: RunStatus) {
  return [RunStatus.Queued, RunStatus.Running, RunStatus.AwaitingReview, RunStatus.Paused].includes(status);
}

export function blocksNewRun(status: ProjectStatus) {
  return [
    ProjectStatus.Researching,
    ProjectStatus.NeedsReview,
    ProjectStatus.Completed,
    ProjectStatus.Archived,
  ].includes(status);
}

/** A run opens in its workspace in the research flow. */
export function researchRunUrl(projectId: string, runId: string) {
  return `/projects/${encodeURIComponent(projectId)}/experiments?run=${encodeURIComponent(runId)}`;
}
