import { projectPath, requestApi } from "../request";
import type { ProjectCreate, ProjectItem, ProjectListParams, ProjectPatch } from "../types";

export type Project = ProjectItem;

export const fetchProject = {
  getList: (params?: ProjectListParams, signal?: AbortSignal) =>
    requestApi<ProjectItem[]>({ url: "/projects", params, signal }),
  getById: (id: string, signal?: AbortSignal) => requestApi<ProjectItem>({ url: projectPath(id), signal }),
  create: (data: ProjectCreate) => requestApi<ProjectItem>({ method: "POST", url: "/projects", data }),
  update: (id: string, data: ProjectPatch) => requestApi<ProjectItem>({ method: "PATCH", url: projectPath(id), data }),
  archive: (id: string) => requestApi<ProjectItem>({ method: "POST", url: `${projectPath(id)}/archive` }),
  restore: (id: string) => requestApi<ProjectItem>({ method: "POST", url: `${projectPath(id)}/restore` }),
  complete: (id: string) => requestApi<ProjectItem>({ method: "POST", url: `${projectPath(id)}/complete` }),
  reopen: (id: string) => requestApi<ProjectItem>({ method: "POST", url: `${projectPath(id)}/reopen` }),
};
