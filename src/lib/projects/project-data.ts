import { ProjectStatus } from "@/types/enums";

export { ProjectStatus } from "@/types/enums";

export const LAST_PROJECT_COOKIE_NAME = "research_platform_last_project";

// Project states per PRD FR-PROJ-03.

export type WorkspaceProject = {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  ownerName: string;
  memberEmails: string[];
  datasets: number;
  experiments: number;
  findings: number;
  updatedAt: string;
};

export type ProjectSummary = Pick<WorkspaceProject, "id" | "name" | "status">;

// In-memory mock store. Projects created at runtime live until the server restarts.
const projects: WorkspaceProject[] = [
  {
    id: "protein-folding-study",
    name: "Protein Folding Study",
    description: "Benchmarking structure prediction agents against curated wet-lab folding results.",
    status: ProjectStatus.Researching,
    ownerName: "Project Manager",
    memberEmails: ["manager@gmail.com", "researcher@gmail.com"],
    datasets: 14,
    experiments: 46,
    findings: 18,
    updatedAt: "4 min ago",
  },
  {
    id: "clinical-trial-signals",
    name: "Clinical Trial Signals",
    description: "Detecting early efficacy and safety signals across multi-site clinical trial reports.",
    status: ProjectStatus.NeedsReview,
    ownerName: "Project Manager",
    memberEmails: ["manager@gmail.com", "researcher@gmail.com"],
    datasets: 22,
    experiments: 73,
    findings: 31,
    updatedAt: "2 hr ago",
  },
  {
    id: "climate-risk-model",
    name: "Climate Risk Model",
    description: "Scenario-based regional climate risk scoring with retrieval over IPCC assessment reports.",
    status: ProjectStatus.DataReady,
    ownerName: "Project Manager",
    memberEmails: ["manager@gmail.com"],
    datasets: 8,
    experiments: 28,
    findings: 11,
    updatedAt: "42 min ago",
  },
  {
    id: "retrieval-quality",
    name: "Retrieval Quality",
    description: "Measuring citation precision and recall of literature retrieval pipelines.",
    status: ProjectStatus.Completed,
    ownerName: "Noah Williams",
    memberEmails: ["researcher@gmail.com"],
    datasets: 6,
    experiments: 22,
    findings: 9,
    updatedAt: "3 hr ago",
  },
  {
    id: "materials-discovery",
    name: "Materials Discovery",
    description: "Screening candidate battery materials with generative models and simulation feedback.",
    status: ProjectStatus.Archived,
    ownerName: "Project Manager",
    memberEmails: ["manager@gmail.com", "researcher@gmail.com"],
    datasets: 5,
    experiments: 19,
    findings: 7,
    updatedAt: "12 Sep 2026",
  },
];

export function getProjectsForUser(email: string): WorkspaceProject[] {
  return projects.filter((project) => project.memberEmails.includes(email));
}

export function findProjectForUser(projectId: string, email: string): WorkspaceProject | undefined {
  return getProjectsForUser(email).find((project) => project.id === projectId);
}

export function toProjectSummary({ id, name, status }: WorkspaceProject): ProjectSummary {
  return { id, name, status };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createUniqueProjectId(name: string) {
  const baseId = slugify(name) || "project";
  let projectId = baseId;
  let suffix = 2;

  while (projects.some((project) => project.id === projectId)) {
    projectId = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return projectId;
}

export function addProject(input: { name: string; description: string; ownerEmail: string; ownerName: string }) {
  const project: WorkspaceProject = {
    id: createUniqueProjectId(input.name),
    name: input.name,
    description: input.description,
    status: ProjectStatus.Draft,
    ownerName: input.ownerName,
    memberEmails: [input.ownerEmail],
    datasets: 0,
    experiments: 0,
    findings: 0,
    updatedAt: "Just now",
  };

  projects.unshift(project);
  return project;
}
