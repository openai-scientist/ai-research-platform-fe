import { describe, expect, it } from "vitest";

import type { ProjectItem } from "@/lib/api/services/fetch-project";
import { ProjectRole, ProjectStatus } from "@/types/enums";

import { toManagerDashboard } from "./manager-dashboard-data";
import { createProjectPreview } from "./use-project-preview";

const project: ProjectItem = {
  id: "demo",
  name: "Demo Research Project",
  description: "Real description",
  domain: null,
  objective: null,
  tags: [],
  status: ProjectStatus.Draft,
  owner_user_id: "pm",
  my_role: ProjectRole.ProjectManager,
  created_at: "2026-10-03T10:00:00Z",
  updated_at: "2026-10-03T10:00:00Z",
};

describe("sample insights alongside backend data", () => {
  it("fills unsupported insights without replacing real empty runs, context, dataset or budget", () => {
    const sample = createProjectPreview();
    const result = toManagerDashboard(project, { runs: [], context: null, dataset: null }, sample);
    expect(result.experimentStats.total).toBe(0);
    expect(result.researchQuestion).toBe("No research context yet.");
    expect(result.datasetVersion).toBe("No dataset selected");
    expect(result.budgets.resources.limit).toBe(0);
    expect(result.outcomes).toEqual(sample.outcomes);
    expect(result.activeHypothesis).toEqual(sample.activeHypothesis);
    expect(result.report.sectionsDone).toBe(3);
    expect(result.sampleInsights).toBe(true);
    expect(result.objective).toBe("Real description");
  });

  it("creates independent sample fixtures for different projects", () => {
    const first = createProjectPreview();
    const second = createProjectPreview();
    first.warnings.splice(0, 1);
    first.report.sectionsDone = 6;
    expect(second.warnings).toHaveLength(3);
    expect(second.report.sectionsDone).toBe(3);
  });
});
