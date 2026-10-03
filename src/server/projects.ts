import { cache } from "react";

import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { getServerApiBaseUrl } from "@/lib/api/config";
import type { ProjectItem } from "@/lib/api/services/fetch-project";
import { AUTH_COOKIE_NAME } from "@/lib/auth/auth-config";
import { ApiError, type ApiResponse } from "@/types/api";

async function readProjectApi<T>(path: string) {
  const session = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  const response = await fetch(`${getServerApiBaseUrl()}${path}`, {
    headers: { Cookie: `${AUTH_COOKIE_NAME}=${session ?? ""}` },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  const body: ApiResponse<T> = await response.json();
  if (!body.success) {
    throw new ApiError(response.status, body.error.code, body.message, body.error.details, body.meta.request_id);
  }
  return body;
}

export const getWorkspaceProjects = cache(async () => {
  const projects: ProjectItem[] = [];
  let offset = 0;
  let total = 0;
  do {
    const result = await readProjectApi<ProjectItem[]>(`/projects?include_archived=true&limit=100&offset=${offset}`);
    projects.push(...result.data);
    offset += result.data.length;
    total = result.meta.pagination?.total ?? offset;
    if (!result.data.length) break;
  } while (offset < total);
  return projects;
});

export const getWorkspaceProject = cache(async (id: string) => {
  // Old bookmarks used project names as slugs; backend projects use UUIDs.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    const projects = await getWorkspaceProjects();
    const matches = projects.filter((item) => {
      const slug = item.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      return slug === id;
    });
    if (matches.length === 1) redirect(`/projects/${matches[0].id}`);
    notFound();
  }
  try {
    return (await readProjectApi<ProjectItem>(`/projects/${encodeURIComponent(id)}`)).data;
  } catch (error) {
    if (error instanceof ApiError && error.code === "NOT_FOUND") notFound();
    throw error;
  }
});
