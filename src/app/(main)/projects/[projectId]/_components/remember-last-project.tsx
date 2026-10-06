"use client";

import { useEffect } from "react";

import { setClientCookie } from "@/lib/cookie.client";
import { LAST_PROJECT_COOKIE_NAME } from "@/lib/projects/project-data";
import { rememberRecentProject } from "@/lib/projects/recent-projects";

export function RememberLastProject({ projectId, userId }: { readonly projectId: string; readonly userId: string }) {
  useEffect(() => {
    setClientCookie(LAST_PROJECT_COOKIE_NAME, projectId, 30);
    rememberRecentProject(userId, projectId);
  }, [projectId, userId]);

  return null;
}
