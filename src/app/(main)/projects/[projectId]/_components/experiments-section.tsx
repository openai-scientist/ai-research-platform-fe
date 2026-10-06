"use client";

import { useEffect } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import { researchRunUrl } from "@/lib/research-workspace";

import { RunStudio } from "./run-studio/run-studio";
import type { WorkspaceProps } from "./workspace-ui";

// Runs come from a mock or the backend; `NEXT_PUBLIC_RUN_STREAM_SOURCE` picks which (see run-stream/features.ts).
export function ExperimentsSection({ project, canWrite }: WorkspaceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedRun = searchParams.get("run");
  useEffect(() => {
    if (selectedRun) {
      const hash = window.location.hash.slice(1);
      const section = ["artifacts", "comments", "frame-review"].includes(hash) ? hash : undefined;
      router.replace(
        `${researchRunUrl(project.id, selectedRun)}${section ? `/${section}` : ""}${section === "frame-review" ? "#frame-review" : ""}`,
      );
    }
  }, [project.id, selectedRun, router]);
  // A run starts from a topic, so the research context has no place here. Old links go to its own page.
  const toContext = searchParams.get("tab") === "context";
  useEffect(() => {
    const openContext = () => {
      if (toContext || window.location.hash === "#research-context") {
        router.replace(`/projects/${project.id}/experiments/context#research-context`, { scroll: false });
      }
    };
    openContext();
    window.addEventListener("hashchange", openContext);
    return () => window.removeEventListener("hashchange", openContext);
  }, [project.id, router, toContext]);
  if (selectedRun || toContext) return null;
  return <RunStudio projectId={project.id} canWrite={canWrite} />;
}
