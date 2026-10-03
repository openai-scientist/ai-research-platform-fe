"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ProjectStatus } from "@/types/enums";

import { getProjectDashboard, type ProjectDashboard } from "./project-dashboard-data";

export type ProjectPreview = Pick<
  ProjectDashboard,
  "activeHypothesis" | "candidateHypotheses" | "runPhase" | "outcomes" | "recentFindings" | "warnings" | "report"
>;

const previews = new Map<string, ProjectPreview>();

export function createProjectPreview(): ProjectPreview {
  const sample = getProjectDashboard({
    id: "protein-folding-study",
    name: "Sample research",
    description: "",
    status: ProjectStatus.Researching,
    ownerName: "",
    memberEmails: [],
    datasets: 14,
    experiments: 46,
    findings: 18,
    updatedAt: "",
  });
  return structuredClone({
    activeHypothesis: sample.activeHypothesis,
    candidateHypotheses: sample.candidateHypotheses,
    runPhase: sample.runPhase,
    outcomes: sample.outcomes,
    recentFindings: sample.recentFindings,
    warnings: sample.warnings,
    report: sample.report,
  });
}

function readPreview(projectId: string): ProjectPreview {
  const cached = previews.get(projectId);
  if (cached) return cached;
  const initial = createProjectPreview();
  previews.set(projectId, initial);
  return initial;
}

export function useProjectPreview(projectId: string) {
  const queryClient = useQueryClient();
  const queryKey = ["project-preview", projectId];
  const query = useQuery({ queryKey, queryFn: () => readPreview(projectId), enabled: typeof window !== "undefined" });
  const update = useMutation({
    mutationFn: async (change: (current: ProjectPreview) => ProjectPreview) => {
      const next = change(structuredClone(readPreview(projectId)));
      previews.set(projectId, next);
      return next;
    },
    onSuccess: (next) => {
      queryClient.setQueryData(queryKey, next);
      toast.success("Sample research updated.");
    },
  });
  return { ...query, update };
}
