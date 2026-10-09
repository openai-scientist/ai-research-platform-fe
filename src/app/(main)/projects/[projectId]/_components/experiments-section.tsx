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
  if (selectedRun) return null;
  return <RunStudio projectId={project.id} canWrite={canWrite} />;
}
