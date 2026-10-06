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

export function researchRunUrl(projectId: string, runId: string, section?: "comments" | "frame-review" | "artifacts") {
  const base = `/projects/${encodeURIComponent(projectId)}/experiments/runs/${encodeURIComponent(runId)}`;
  return section ? `${base}/${section}` : base;
}

export const runSections = [
  { value: "artifacts", label: "Artifacts" },
  { value: "frame-review", label: "Frame reviews" },
  { value: "comments", label: "Comments" },
] as const;
export type RunSection = (typeof runSections)[number]["value"];
