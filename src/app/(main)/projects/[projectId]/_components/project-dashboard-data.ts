import type { WorkspaceProject } from "@/lib/projects/project-data";
import { ProjectStatus } from "@/types/enums";

// Run lifecycle per PRD §40.8, condensed to the phases shown on the dashboard.
export const RUN_PHASES = [
  "Intake",
  "Protocol Frozen",
  "Exploring",
  "Batch Registered",
  "Confirming",
  "Assessing",
  "Reporting",
  "Completed",
] as const;

export type RunPhase = (typeof RUN_PHASES)[number];

export type WarningSeverity = "Blocking" | "Warning" | "Info";

export type ProjectDashboard = {
  objective: string;
  datasetVersion: string;
  researchQuestion: string;
  activeHypothesis: {
    id: string;
    statement: string;
    status: "Proposed" | "Unverified" | "Supported" | "Rejected" | "Inconclusive";
    origin: string;
  };
  runPhase: RunPhase;
  run: { id: string; startedAt: string };
  candidateHypotheses: { total: number; selected: number };
  nextMove: string;
  experimentStats: { total: number; completed: number; running: number; failed: number; needsReview: number };
  experimentActivity: { week: string; completed: number; failed: number; needsReview: number }[];
  outcomes: { finding: number; negative: number; inconclusive: number };
  budgets: {
    exploration: { used: number; limit: number };
    looks: { used: number; limit: number };
    resources: {
      used: number;
      limit: number;
      projected: number;
      burn: { week: string; spent?: number; projected?: number }[];
    };
  };
  recentExperiments: { id: string; title: string; method: string; state: string; updatedAt: string }[];
  recentFindings: {
    id: string;
    statement: string;
    outcome: string;
    claimLevel: string;
    status: string;
    updatedAt: string;
  }[];
  warnings: {
    title: string;
    source: string;
    detail: string;
    severity: WarningSeverity;
    section: "datasets" | "experiments" | "findings";
  }[];
  report: {
    status: "Not started" | "Drafting" | "In review" | "Published";
    detail: string;
    sectionsDone: number;
    sectionsTotal: number;
  };
};

const dashboards: Record<string, Omit<ProjectDashboard, "experimentStats" | "outcomes">> = {
  "protein-folding-study": {
    objective: "Determine whether agent-predicted structures match wet-lab stability measurements.",
    datasetVersion: "folding-assays v3.2",
    researchQuestion: "Does predicted pLDDT confidence associate with measured thermal stability (Tm)?",
    activeHypothesis: {
      id: "H-12",
      statement: "Sequences with mean pLDDT ≥ 85 have higher Tm than sequences below 85.",
      status: "Unverified",
      origin: "Pre-registered",
    },
    runPhase: "Exploring",
    run: { id: "Run 3", startedAt: "12 Sep" },
    candidateHypotheses: { total: 5, selected: 1 },
    nextMove: "Register confirmation batch",
    experimentActivity: [
      { week: "W1", completed: 3, failed: 1, needsReview: 0 },
      { week: "W2", completed: 5, failed: 0, needsReview: 1 },
      { week: "W3", completed: 4, failed: 2, needsReview: 0 },
      { week: "W4", completed: 7, failed: 1, needsReview: 1 },
      { week: "W5", completed: 6, failed: 0, needsReview: 2 },
      { week: "W6", completed: 8, failed: 1, needsReview: 1 },
    ],
    budgets: {
      exploration: { used: 14, limit: 20 },
      looks: { used: 2, limit: 5 },
      resources: {
        used: 312,
        limit: 500,
        projected: 410,
        burn: [
          { week: "W1", spent: 38 },
          { week: "W2", spent: 92 },
          { week: "W3", spent: 148 },
          { week: "W4", spent: 204 },
          { week: "W5", spent: 263 },
          { week: "W6", spent: 312, projected: 312 },
          { week: "W7", projected: 362 },
          { week: "W8", projected: 410 },
        ],
      },
    },
    recentExperiments: [
      {
        id: "EXP-2048",
        title: "Tm by pLDDT group",
        method: "Welch's t-test",
        state: "Validating",
        updatedAt: "12 min ago",
      },
      {
        id: "EXP-2047",
        title: "Tm vs sequence length",
        method: "Spearman correlation",
        state: "Running",
        updatedAt: "40 min ago",
      },
      {
        id: "EXP-2041",
        title: "Tm by expression host",
        method: "One-way ANOVA",
        state: "Needs Review",
        updatedAt: "3 hr ago",
      },
      {
        id: "EXP-2039",
        title: "Stability by fold class",
        method: "Kruskal–Wallis",
        state: "Completed",
        updatedAt: "Yesterday",
      },
    ],
    recentFindings: [
      {
        id: "FND-881",
        updatedAt: "1 hr ago",
        statement: "Folding confidence drops for sequences above 600 residues.",
        outcome: "Finding — supported",
        claimLevel: "Associational · held-out",
        status: "Needs Review",
      },
      {
        id: "FND-876",
        updatedAt: "Yesterday",
        statement: "Expression host has no practical effect on Tm.",
        outcome: "Negative result",
        claimLevel: "Associational · held-out",
        status: "Validated",
      },
      {
        id: "FND-870",
        updatedAt: "2 days ago",
        statement: "Fold class and stability association remains unclear.",
        outcome: "Inconclusive",
        claimLevel: "Associational · hypothesis-generating",
        status: "Inconclusive",
      },
    ],
    warnings: [
      {
        title: "Assumption check failed",
        source: "EXP-2041",
        detail: "Normality violated in group B",
        severity: "Warning",
        section: "experiments",
      },
      {
        title: "Possible leakage",
        source: "Dataset v3.2",
        detail: "assay_batch correlates with target",
        severity: "Blocking",
        section: "datasets",
      },
      {
        title: "Finding awaiting review",
        source: "FND-881",
        detail: "Review trigger fired",
        severity: "Info",
        section: "findings",
      },
    ],
    report: { status: "Drafting", detail: "Finding brief in progress", sectionsDone: 3, sectionsTotal: 6 },
  },
};

function getFallbackRunPhase(status: WorkspaceProject["status"]): RunPhase {
  if (status === ProjectStatus.Completed) {
    return "Completed";
  }
  if (status === ProjectStatus.NeedsReview) {
    return "Assessing";
  }
  return "Exploring";
}

function getFallbackReport(
  status: WorkspaceProject["status"],
  baseReport: ProjectDashboard["report"],
): ProjectDashboard["report"] {
  if (status === ProjectStatus.Completed) {
    return { status: "Published", detail: "Final research report published", sectionsDone: 6, sectionsTotal: 6 };
  }
  if (status === ProjectStatus.DataReady) {
    return { status: "Not started", detail: "No confirmation outcomes yet", sectionsDone: 0, sectionsTotal: 6 };
  }
  return baseReport;
}

function buildFallbackDashboard(project: WorkspaceProject): Omit<ProjectDashboard, "experimentStats" | "outcomes"> {
  const base = dashboards["protein-folding-study"];

  return {
    ...base,
    objective: project.description,
    runPhase: getFallbackRunPhase(project.status),
    report: getFallbackReport(project.status, base.report),
  };
}

export function getProjectDashboard(project: WorkspaceProject): ProjectDashboard {
  const dashboard = dashboards[project.id] ?? buildFallbackDashboard(project);
  const failed = Math.round(project.experiments * 0.12);
  const needsReview = Math.round(project.experiments * 0.08);
  const running = project.status === ProjectStatus.Completed || project.status === ProjectStatus.Archived ? 0 : 2;
  const negative = Math.round(project.findings * 0.3);
  const inconclusive = Math.round(project.findings * 0.2);

  return {
    ...dashboard,
    experimentStats: {
      total: project.experiments,
      completed: project.experiments - failed - needsReview - running,
      running,
      failed,
      needsReview,
    },
    outcomes: {
      finding: project.findings - negative - inconclusive,
      negative,
      inconclusive,
    },
  };
}
