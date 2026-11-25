import { getProjectAccess, PROJECT_ROLE_LABELS } from "@/lib/auth/project-access";
import { ProjectRole, ProjectStatus } from "@/types/enums";

/** What one prerequisite looks like to the person starting a run. */
/** `checking` is still loading; `unknown` could not be checked and never blocks. */
export type ReadinessStatus = "ready" | "attention" | "blocked" | "soon" | "unknown" | "checking";

export type ReadinessId = "access" | "dataset" | "data-use" | "provider-key" | "model" | "budget" | "capacity";

export interface ReadinessAction {
  label: string;
  href: string;
}

export interface ReadinessRow {
  id: ReadinessId;
  title: string;
  status: ReadinessStatus;
  /** One line with the concrete value. */
  reason: string;
  actions: ReadinessAction[];
}

/** A fact that is still loading, could not be loaded, or is known. */
export type Fact<T> = { state: "loading" } | { state: "error" } | { state: "ready"; value: T };

/**
 * Whether a run needs a dataset. A run that starts from a topic alone has none; only the `explore_dataset` intent does,
 * and the start form does not offer it. Flip this when a dataset becomes required.
 */
export const DATASET_REQUIRED = false;

export interface ReadinessFacts {
  projectId: string;
  /** Whether a run needs a dataset; see {@link DATASET_REQUIRED}. */
  datasetRequired: boolean;
  project: Fact<{ status: ProjectStatus; role: ProjectRole | null }>;
  datasets: Fact<{ name: string; ready: boolean; connectionId: string | null }[]>;
  /** Ids of data connections that last failed or were revoked. */
  unhealthyConnectionIds: Fact<string[]>;
  settings: Fact<{ model: string; concurrentLimit: number | null }>;
  spending: Fact<{
    capped: boolean;
    remaining: number | null;
    /** The backend reports the budget in tokens; older responses are in US dollars. */
    unit: "usd" | "tokens";
    enforced: boolean;
    exceeded: boolean;
  }>;
  /** Runs of the project that are queued, running, paused or waiting for review. */
  activeRuns: Fact<number>;
}

export interface Readiness {
  rows: ReadinessRow[];
  /** True while a prerequisite is still loading. */
  checking: boolean;
  /** No row is blocked and nothing is still loading. Rows that could not be checked never block. */
  canStart: boolean;
}

/** What the viewer may open: only a manager reaches Settings, and only a writer reaches the data pages. */
interface Viewer {
  manager: boolean;
  canWrite: boolean;
}

function viewerOf(fact: ReadinessFacts["project"]): Viewer {
  if (fact.state !== "ready") return { manager: false, canWrite: false };
  const { role, status } = fact.value;
  return { manager: role === ProjectRole.ProjectManager, canWrite: getProjectAccess(role, status).canWrite };
}

const COULD_NOT_CHECK = "Couldn't check this right now.";

export function formatBudget(amount: number, unit: "usd" | "tokens") {
  if (unit === "usd") return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
  return `${new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(amount)} tokens`;
}

function unknownRow(id: ReadinessId, title: string, fact: Fact<unknown>): ReadinessRow {
  return {
    id,
    title,
    status: fact.state === "loading" ? "checking" : "unknown",
    reason: fact.state === "loading" ? "Checking…" : COULD_NOT_CHECK,
    actions: [],
  };
}

function accessRow(base: string, fact: ReadinessFacts["project"]): ReadinessRow {
  const title = "Permission to start runs";
  if (fact.state !== "ready") return unknownRow("access", title, fact);
  const { status, role } = fact.value;
  const manager = role === ProjectRole.ProjectManager;
  const settings = manager ? [{ label: "Open project settings", href: `${base}/settings?tab=danger` }] : [];
  if (status === ProjectStatus.Archived) {
    return {
      id: "access",
      title,
      status: "blocked",
      reason: "This project is archived, so it is read-only.",
      actions: settings,
    };
  }
  if (status === ProjectStatus.Completed) {
    return {
      id: "access",
      title,
      status: "blocked",
      reason: "This project is completed. Reopen it to start new runs.",
      actions: settings,
    };
  }
  if (!getProjectAccess(role, status).canWrite) {
    return {
      id: "access",
      title,
      status: "blocked",
      reason: role
        ? `Your role (${PROJECT_ROLE_LABELS[role]}) can read this project but not start runs.`
        : "You don't have a role in this project.",
      actions: [],
    };
  }
  return {
    id: "access",
    title,
    status: "ready",
    reason: `You can start runs as ${role ? PROJECT_ROLE_LABELS[role] : "a member"}.`,
    actions: [],
  };
}

function datasetRow(base: string, facts: ReadinessFacts, viewer: Viewer): ReadinessRow {
  const title = "Dataset with a ready version";
  const { datasets, unhealthyConnectionIds } = facts;
  if (datasets.state !== "ready") return unknownRow("dataset", title, datasets);
  const ready = datasets.value.filter((dataset) => dataset.ready);
  if (!ready.length) {
    return {
      id: "dataset",
      title,
      status: facts.datasetRequired ? "blocked" : "attention",
      reason: facts.datasetRequired
        ? datasets.value.length
          ? "None of the datasets has a ready version yet."
          : "This project has no dataset yet."
        : "No dataset yet. Runs from a topic alone still work; add one to explore your own data.",
      actions: viewer.canWrite
        ? [
            { label: "Upload a dataset", href: `${base}/datasets#upload-dataset` },
            { label: "Connect a data source", href: `${base}/connections` },
          ]
        : [],
    };
  }
  const summary = `${ready.length} ${ready.length === 1 ? "dataset" : "datasets"} ready · ${ready[0].name}`;
  if (unhealthyConnectionIds.state === "ready") {
    const broken = new Set(unhealthyConnectionIds.value);
    const fromBroken = ready.filter((dataset) => dataset.connectionId && broken.has(dataset.connectionId));
    if (fromBroken.length === ready.length) {
      return {
        id: "dataset",
        title,
        status: "attention",
        reason: `${summary} · its data connection needs reconnecting.`,
        actions: viewer.canWrite ? [{ label: "Reconnect", href: `${base}/connections` }] : [],
      };
    }
  }
  return { id: "dataset", title, status: "ready", reason: summary, actions: [] };
}

/** The model is a platform default set by an admin; a member cannot change it, so this row never blocks or links. */
function modelRow(fact: ReadinessFacts["settings"]): ReadinessRow {
  const override = fact.state === "ready" ? fact.value.model.trim() : "";
  const custom = override !== "" && override !== "default";
  return {
    id: "model",
    title: "AI model",
    status: "ready",
    reason: custom ? `Project model: ${override} (set by your admin)` : "Platform default model (set by your admin)",
    actions: [],
  };
}

function budgetRow(base: string, fact: ReadinessFacts["spending"], viewer: Viewer): ReadinessRow {
  const title = "Budget";
  if (fact.state !== "ready") return unknownRow("budget", title, fact);
  const { capped, remaining, unit, enforced, exceeded } = fact.value;
  // Only a project manager sets the budget and can open Settings.
  const review = viewer.manager ? [{ label: "Review spending", href: `${base}/settings?tab=spending` }] : [];
  const askManager = viewer.manager ? "" : " Ask a project manager to adjust the budget.";
  // The run's cost is not estimated yet, so only what is left this month can be compared.
  const estimate = "Run estimate not available yet.";
  if (!capped) {
    return { id: "budget", title, status: "ready", reason: `No monthly limit is set. ${estimate}`, actions: [] };
  }
  if (remaining === null) {
    return {
      id: "budget",
      title,
      status: "attention",
      reason: `Remaining budget can't be determined yet. ${estimate}${askManager}`,
      actions: review,
    };
  }
  if (exceeded || remaining <= 0) {
    return {
      id: "budget",
      title,
      status: enforced ? "blocked" : "attention",
      reason: `${formatBudget(Math.max(remaining, 0), unit)} left this month.${
        viewer.manager ? " Asking for an exception is coming soon." : ""
      }${askManager}`,
      actions: review,
    };
  }
  return {
    id: "budget",
    title,
    status: "ready",
    reason: `${formatBudget(remaining, unit)} left this month. ${estimate}`,
    actions: [],
  };
}

function capacityRow(base: string, facts: ReadinessFacts, viewer: Viewer): ReadinessRow | null {
  const { settings, activeRuns } = facts;
  if (settings.state !== "ready" || settings.value.concurrentLimit === null) return null;
  const title = "Run capacity";
  if (activeRuns.state !== "ready") return unknownRow("capacity", title, activeRuns);
  const limit = settings.value.concurrentLimit;
  const used = activeRuns.value;
  if (used >= limit) {
    return {
      id: "capacity",
      title,
      status: "blocked",
      reason: `${used} of ${limit} runs are active. Wait for one to finish${viewer.manager ? " or raise the limit" : ""}.`,
      actions: viewer.manager ? [{ label: "Open run settings", href: `${base}/settings?tab=runs` }] : [],
    };
  }
  return { id: "capacity", title, status: "ready", reason: `${used} of ${limit} runs are active.`, actions: [] };
}

/** The admission checklist, in admission order: permission, data, model and credential, configuration, budget last. */
export function evaluateReadiness(facts: ReadinessFacts): Readiness {
  const base = `/projects/${encodeURIComponent(facts.projectId)}`;
  const viewer = viewerOf(facts.project);
  const rows: ReadinessRow[] = [
    accessRow(base, facts.project),
    datasetRow(base, facts, viewer),
    {
      id: "data-use",
      title: "Permission to use the data",
      status: "soon",
      reason: "Data-use grants are not enforced yet. Coming soon.",
      actions: [],
    },
    {
      id: "provider-key",
      title: "AI provider key",
      status: "ready",
      reason: "Uses the platform's key",
      actions: [],
    },
    modelRow(facts.settings),
    budgetRow(base, facts.spending, viewer),
  ];
  const capacity = capacityRow(base, facts, viewer);
  if (capacity) rows.push(capacity);
  const checking = rows.some((row) => row.status === "checking");
  return { rows, checking, canStart: !checking && !rows.some((row) => row.status === "blocked") };
}
