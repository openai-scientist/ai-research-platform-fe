"use client";

import { useEffect } from "react";

import { setClientCookie } from "@/lib/cookie.client";
import { LAST_PROJECT_COOKIE_NAME } from "@/lib/projects/project-data";

export function RememberLastProject({ projectId }: { readonly projectId: string }) {
  useEffect(() => {
    setClientCookie(LAST_PROJECT_COOKIE_NAME, projectId, 30);
  }, [projectId]);

  return null;
}
