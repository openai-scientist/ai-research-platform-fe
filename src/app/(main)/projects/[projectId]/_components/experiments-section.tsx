"use client";

import { useEffect } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import { toast } from "sonner";

import { fetchRuns } from "@/lib/api/services/fetch-runs";
import { isActiveRun, researchRunUrl } from "@/lib/research-workspace";
import { useRunStudio } from "@/lib/run-stream/run-store";

import { RunStudio } from "./run-studio/run-studio";
import type { WorkspaceProps } from "./workspace-ui";

// Runs live on the backend; the workspace follows them through their events.
export function ExperimentsSection({ project, canWrite }: WorkspaceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedRun = searchParams.get("run");
  const attachRun = useRunStudio((s) => s.attachRun);
  const openWorkspace = useRunStudio((s) => s.openWorkspace);
  // `?run=` (from a notification or an old link): a run started from a topic opens in its workspace here, any other
  // run on its own page.
  useEffect(() => {
    if (!selectedRun) return;
    const hash = window.location.hash.slice(1);
    const section = ["artifacts", "comments", "frame-review"].includes(hash) ? hash : undefined;
    const runPage = `${researchRunUrl(project.id, selectedRun)}${section ? `/${section}` : ""}${section === "frame-review" ? "#frame-review" : ""}`;
    let current = true;
    fetchRuns
      .getById(project.id, selectedRun)
      .then(({ data: run }) => {
        if (!current) return;
        if (!run.topic) {
          router.replace(runPage);
          return;
        }
        attachRun(project.id, run, isActiveRun(run.status));
        openWorkspace(run.id);
        router.replace(`/projects/${encodeURIComponent(project.id)}/experiments`);
      })
      .catch((error: unknown) => {
        if (!current) return;
        toast.error(error instanceof Error ? error.message : "Unable to open the run. Please try again.");
        router.replace(`/projects/${encodeURIComponent(project.id)}/experiments`);
      });
    return () => {
      current = false;
    };
  }, [project.id, selectedRun, router, attachRun, openWorkspace]);
  if (selectedRun) return null;
  return <RunStudio projectId={project.id} canWrite={canWrite} />;
}
