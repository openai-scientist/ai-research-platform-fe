import type { ManagerResearchData } from "@/lib/api/services/fetch-manager";
import type { ProjectItem } from "@/lib/api/services/fetch-project";
import { RunStatus } from "@/types/enums";

import type { ProjectDashboard } from "./project-dashboard-data";
import type { ProjectPreview } from "./use-project-preview";

export function toManagerDashboard(
  project: ProjectItem,
  data: ManagerResearchData,
  preview?: ProjectPreview,
): ProjectDashboard {
  const { runs, context, dataset } = data;
  const latest = runs[0];
  const count = (...states: RunStatus[]) => runs.filter((run) => states.includes(run.status)).length;
  const activity = new Map<string, ProjectDashboard["experimentActivity"][number]>();
  for (const run of runs) {
    const date = new Date(run.created_at);
    date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
    const week = date.toISOString().slice(0, 10);
    const bucket = activity.get(week) ?? { week, completed: 0, failed: 0, needsReview: 0 };
    if (run.status === RunStatus.Completed) bucket.completed++;
    if ([RunStatus.Failed, RunStatus.BudgetExceeded].includes(run.status)) bucket.failed++;
    if (run.status === RunStatus.AwaitingReview) bucket.needsReview++;
    activity.set(week, bucket);
  }
  return {
    live: true,
    objective: project.objective ?? project.description ?? "No objective provided.",
    datasetVersion: latest && dataset ? `${dataset.name} v${latest.dataset_version_number}` : "No dataset selected",
    researchQuestion: context?.body ?? "No research context yet.",
    sampleInsights: Boolean(preview),
    activeHypothesis: preview?.activeHypothesis ?? {
      id: "",
      statement: "Hypothesis details are not available yet.",
      status: "Unverified",
      origin: "",
    },
    runPhase: preview?.runPhase ?? "Intake",
    run: {
      id: latest ? `Run ${latest.id.slice(0, 8)}` : "No runs yet",
      startedAt: latest?.started_at ?? latest?.created_at ?? "",
    },
    candidateHypotheses: preview?.candidateHypotheses ?? { total: 0, selected: 0 },
    nextMove: latest?.status === RunStatus.AwaitingReview ? "Review the pending frame" : "Open experiments",
    experimentStats: {
      total: runs.length,
      completed: count(RunStatus.Completed),
      running: count(RunStatus.Queued, RunStatus.Running),
      failed: count(RunStatus.Failed, RunStatus.BudgetExceeded),
      needsReview: count(RunStatus.AwaitingReview),
    },
    experimentActivity: [...activity.values()].sort((a, b) => a.week.localeCompare(b.week)).slice(-6),
    outcomes: preview?.outcomes ?? { finding: 0, negative: 0, inconclusive: 0 },
    budgets: {
      exploration: { used: 0, limit: 0 },
      looks: { used: 0, limit: 0 },
      resources: {
        // Convert decimal strings only for chart presentation; no monetary aggregation.
        used: Number(latest?.cost_usd ?? 0),
        limit: Number(latest?.budget_usd ?? 0),
        projected: Number(latest?.cost_usd ?? 0),
        burn: [],
      },
    },
    recentExperiments: runs.slice(0, 3).map((run) => ({
      id: run.id,
      title: `Run ${run.id.slice(0, 8)}`,
      method: "",
      state: run.status.replaceAll("_", " "),
      updatedAt: new Date(run.updated_at).toLocaleDateString("en-US"),
    })),
    recentFindings: preview?.recentFindings ?? [],
    warnings: preview?.warnings ?? [],
    report: preview?.report ?? {
      status: "Not started",
      detail: "Report progress is not available yet.",
      sectionsDone: 0,
      sectionsTotal: 0,
    },
  };
}
