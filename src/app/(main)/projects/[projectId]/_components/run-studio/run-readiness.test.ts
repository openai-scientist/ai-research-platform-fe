import { describe, expect, it } from "vitest";

import { ProjectRole, ProjectStatus } from "@/types/enums";

import { DATASET_REQUIRED, evaluateReadiness, type ReadinessFacts, type ReadinessId } from "./run-readiness";

const ready: ReadinessFacts = {
  projectId: "p1",
  datasetRequired: false,
  project: { state: "ready", value: { status: ProjectStatus.DataReady, role: ProjectRole.Researcher } },
  datasets: { state: "ready", value: [{ name: "Survey 2024", ready: true, connectionId: null }] },
  unhealthyConnectionIds: { state: "ready", value: [] },
  settings: { state: "ready", value: { model: "default", concurrentLimit: null } },
  spending: { state: "ready", value: { capped: true, remaining: 3, unit: "usd", enforced: true, exceeded: false } },
  activeRuns: { state: "ready", value: 0 },
};

const asRole = (facts: ReadinessFacts, role: ProjectRole): ReadinessFacts => ({
  ...facts,
  project: { state: "ready", value: { status: ProjectStatus.DataReady, role } },
});
const manager = (facts: ReadinessFacts) => asRole(facts, ProjectRole.ProjectManager);
/** What the page panel lists: only rows that need action. */
const listed = (facts: ReadinessFacts) =>
  evaluateReadiness(facts)
    .rows.filter((r) => r.status === "blocked" || r.status === "attention")
    .map((r) => r.id);
const hrefs = (facts: ReadinessFacts) => evaluateReadiness(facts).rows.flatMap((r) => r.actions.map((a) => a.href));

const row = (facts: ReadinessFacts, id: ReadinessId) => evaluateReadiness(facts).rows.find((r) => r.id === id);

describe("evaluateReadiness", () => {
  it("lets a run start when every checkable item is ready; only data-use is coming soon", () => {
    const result = evaluateReadiness(ready);
    expect(result.canStart).toBe(true);
    expect(result.rows.map((r) => r.id)).toEqual(["access", "dataset", "data-use", "provider-key", "model", "budget"]);
    expect(row(ready, "data-use")?.status).toBe("soon");
    expect(row(ready, "provider-key")?.status).toBe("ready");
    expect(row(ready, "provider-key")?.reason).toBe("Uses the platform's key");
    expect(row(ready, "budget")?.reason).toContain("$3.00 left");
  });

  it("blocks a reviewer, and an archived project, without offering settings to a non-manager", () => {
    const reviewer: ReadinessFacts = {
      ...ready,
      project: { state: "ready", value: { status: ProjectStatus.DataReady, role: ProjectRole.Reviewer } },
    };
    expect(row(reviewer, "access")?.status).toBe("blocked");
    expect(row(reviewer, "access")?.actions).toEqual([]);
    const archived: ReadinessFacts = {
      ...ready,
      project: { state: "ready", value: { status: ProjectStatus.Archived, role: ProjectRole.ProjectManager } },
    };
    expect(evaluateReadiness(archived).canStart).toBe(false);
    expect(row(archived, "access")?.actions[0]?.href).toBe("/projects/p1/settings?tab=danger");
  });

  it("asks for a dataset without blocking, since a run from a topic alone needs none", () => {
    const none: ReadinessFacts = {
      ...ready,
      datasets: { state: "ready", value: [{ name: "Draft", ready: false, connectionId: null }] },
    };
    expect(row(none, "dataset")?.status).toBe("attention");
    expect(row(none, "dataset")?.reason).toContain("Runs from a topic alone still work");
    expect(evaluateReadiness(none).canStart).toBe(true);
    expect(row(none, "dataset")?.actions.map((a) => a.href)).toEqual([
      "/projects/p1/datasets#upload-dataset",
      "/projects/p1/connections",
    ]);
    const empty: ReadinessFacts = { ...ready, datasets: { state: "ready", value: [] } };
    expect(evaluateReadiness(empty).canStart).toBe(true);
    expect(DATASET_REQUIRED).toBe(false);
  });

  it("blocks without a ready dataset once a run requires one", () => {
    const required: ReadinessFacts = {
      ...ready,
      datasetRequired: true,
      datasets: { state: "ready", value: [{ name: "Draft", ready: false, connectionId: null }] },
    };
    expect(row(required, "dataset")?.status).toBe("blocked");
    expect(evaluateReadiness(required).canStart).toBe(false);
    expect(row(required, "dataset")?.actions).toHaveLength(2);
  });

  it("flags a dataset whose only connection is unhealthy as attention, not a block", () => {
    const facts: ReadinessFacts = {
      ...ready,
      datasets: { state: "ready", value: [{ name: "Orders", ready: true, connectionId: "c1" }] },
      unhealthyConnectionIds: { state: "ready", value: ["c1"] },
    };
    expect(row(facts, "dataset")?.status).toBe("attention");
    expect(row(facts, "dataset")?.actions[0]?.label).toBe("Reconnect");
    expect(evaluateReadiness(facts).canStart).toBe(true);
  });

  it("never blocks or links on the model: default, empty and missing are the platform default", () => {
    for (const model of ["default", "", " "]) {
      const facts: ReadinessFacts = { ...ready, settings: { state: "ready", value: { model, concurrentLimit: null } } };
      expect(row(facts, "model")?.status).toBe("ready");
      expect(row(facts, "model")?.reason).toBe("Platform default model (set by your admin)");
      expect(row(facts, "model")?.actions).toEqual([]);
    }
    const failed: ReadinessFacts = { ...ready, settings: { state: "error" } };
    expect(row(failed, "model")?.status).toBe("ready");
    const override: ReadinessFacts = {
      ...ready,
      settings: { state: "ready", value: { model: "claude-sonnet-5-5", concurrentLimit: null } },
    };
    expect(row(override, "model")?.reason).toContain("claude-sonnet-5-5");
    expect(row(override, "model")?.actions).toEqual([]);
  });

  it("never lists the model, the provider key or data-use in the panel", () => {
    const broken: ReadinessFacts = {
      ...manager(ready),
      datasets: { state: "ready", value: [] },
      spending: { state: "ready", value: { capped: true, remaining: 0, unit: "usd", enforced: true, exceeded: true } },
    };
    expect(listed(broken)).toEqual(["dataset", "budget"]);
  });

  it("words a token budget in tokens, not dollars", () => {
    const facts: ReadinessFacts = {
      ...ready,
      spending: {
        state: "ready",
        value: { capped: true, remaining: 24_500_000, unit: "tokens", enforced: true, exceeded: false },
      },
    };
    expect(row(facts, "budget")?.reason).toContain("24.5M tokens left");
  });

  it("blocks only an enforced exhausted budget", () => {
    const spent = (enforced: boolean): ReadinessFacts => ({
      ...manager(ready),
      spending: { state: "ready", value: { capped: true, remaining: 0, unit: "usd", enforced, exceeded: true } },
    });
    expect(row(spent(true), "budget")?.status).toBe("blocked");
    expect(row(spent(false), "budget")?.status).toBe("attention");
    expect(row(spent(true), "budget")?.actions[0]?.href).toBe("/projects/p1/settings?tab=spending");
  });

  it("sends only a project manager to Spending; a member is told to ask one", () => {
    const spent: ReadinessFacts = {
      ...ready,
      spending: { state: "ready", value: { capped: true, remaining: 0, unit: "usd", enforced: true, exceeded: true } },
    };
    const member = row(asRole(spent, ProjectRole.Researcher), "budget");
    expect(member?.status).toBe("blocked");
    expect(member?.actions).toEqual([]);
    expect(member?.reason.endsWith("Ask a project manager to adjust the budget.")).toBe(true);
    const pm = row(manager(spent), "budget");
    expect(pm?.actions[0]?.label).toBe("Review spending");
    expect(pm?.reason).not.toContain("Ask a project manager");
    const unknown = row(
      {
        ...spent,
        spending: {
          state: "ready",
          value: { capped: true, remaining: null, unit: "usd", enforced: true, exceeded: false },
        },
      },
      "budget",
    );
    expect(unknown?.actions).toEqual([]);
    expect(unknown?.reason.endsWith("Ask a project manager to adjust the budget.")).toBe(true);
  });

  it("never links a non-manager to Settings, whichever row needs action", () => {
    const worst: ReadinessFacts = {
      ...ready,
      project: { state: "ready", value: { status: ProjectStatus.Archived, role: ProjectRole.Researcher } },
      settings: { state: "ready", value: { model: "default", concurrentLimit: 1 } },
      activeRuns: { state: "ready", value: 1 },
      spending: { state: "ready", value: { capped: true, remaining: 0, unit: "usd", enforced: true, exceeded: true } },
    };
    for (const role of [ProjectRole.Researcher, ProjectRole.Reviewer]) {
      expect(hrefs(asRole(worst, role)).filter((href) => href.includes("/settings"))).toEqual([]);
    }
    const pm = {
      ...worst,
      project: { state: "ready", value: { status: ProjectStatus.DataReady, role: ProjectRole.ProjectManager } },
    } as ReadinessFacts;
    expect(hrefs(pm).filter((href) => href.includes("/settings")).length).toBeGreaterThanOrEqual(2);
  });

  it("offers dataset pages only to someone who may write", () => {
    const none: ReadinessFacts = { ...ready, datasets: { state: "ready", value: [] } };
    expect(row(asRole(none, ProjectRole.Reviewer), "dataset")?.actions).toEqual([]);
    expect(row(asRole(none, ProjectRole.Researcher), "dataset")?.actions).toHaveLength(2);
    expect(row({ ...none, project: { state: "loading" } }, "dataset")?.actions).toEqual([]);
  });

  it("counts active runs only when the project has a run limit", () => {
    expect(row(ready, "capacity")).toBeUndefined();
    const limited = (active: number): ReadinessFacts => ({
      ...ready,
      settings: { state: "ready", value: { model: "default", concurrentLimit: 2 } },
      activeRuns: { state: "ready", value: active },
    });
    expect(evaluateReadiness(limited(1)).canStart).toBe(true);
    expect(evaluateReadiness(limited(2)).canStart).toBe(false);
    expect(row(limited(2), "capacity")?.actions).toEqual([]);
    expect(row(manager(limited(2)), "capacity")?.actions[0]?.href).toBe("/projects/p1/settings?tab=runs");
  });

  it("waits while loading and never blocks on a prerequisite that could not be checked", () => {
    const loading: ReadinessFacts = { ...ready, spending: { state: "loading" } };
    expect(evaluateReadiness(loading).checking).toBe(true);
    expect(evaluateReadiness(loading).canStart).toBe(false);
    const failed: ReadinessFacts = { ...ready, spending: { state: "error" } };
    expect(row(failed, "budget")?.status).toBe("unknown");
    expect(evaluateReadiness(failed).canStart).toBe(true);
  });
});
