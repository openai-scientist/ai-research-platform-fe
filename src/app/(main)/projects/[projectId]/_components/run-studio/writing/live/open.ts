/* ===== Which writing run is open in the studio, and how one is started, opened, left and replayed ===== */

import { useSyncExternalStore } from "react";

import { toast } from "sonner";

import apiService from "@/lib/api/core";
import { projectPath } from "@/lib/api/request";
import type { RunItem } from "@/lib/api/services/fetch-runs";
import { useRunStudio } from "@/lib/run-stream/run-store";
import type { ApiResult } from "@/types/api";

import { emit, HOST, leaveLive, startLive, subscribe } from "../engine";
import { playLive } from "./player";
import { DRAFT_PIPELINE, follow, GUIDED_PIPELINE, isDraftRun, LIVE, OUTLINE_PIPELINE, unfollow } from "./run";
import { showLiveDefs } from "./stages";

/** The writing run open on screen, if any. */
export const OPEN = { run: null as { projectId: string; run: RunItem } | null };
const openRun = () => OPEN.run;
export const useOpenRun = () => useSyncExternalStore(subscribe, openRun, () => null);

/** Opens a writing run in the studio and follows it. Opening the run already open keeps it as it is. */
export function openWritingRun(projectId: string, run: RunItem) {
  if (OPEN.run?.run.id === run.id) return;
  OPEN.run = { projectId, run };
  useRunStudio.setState({ writingRunId: run.id });
  showLiveDefs(isDraftRun(run));
  follow(projectId, run);
  startLive(run.id, LIVE.label, () => playLive());
  emit();
}
export function closeWritingRun() {
  OPEN.run = null;
  useRunStudio.setState({ writingRunId: null });
  unfollow();
  leaveLive();
  emit();
}
/** Plays the open run again from its first stage, at the pace of the preview (a finished run only). */
export function replayWritingRun() {
  const open = OPEN.run;
  if (!open) return;
  HOST.runId = null;
  showLiveDefs(isDraftRun(open.run));
  startLive(open.run.id, LIVE.label, () => playLive(true));
}

/**
 * Starts a writing run on the sample results and opens it: to the paper outline, or on to the first draft. Resolves to
 * false when the Platform refused it.
 */
export async function startWritingRun(projectId: string, mode: "auto" | "light" | "guided", draft = false) {
  const guided = mode === "guided";
  let pipeline = draft ? DRAFT_PIPELINE : OUTLINE_PIPELINE;
  if (guided) pipeline = GUIDED_PIPELINE;
  try {
    const { data: run } = (
      await apiService.post<ApiResult<RunItem>>(`${projectPath(projectId)}/runs`, {
        pipeline,
        review_mode: guided ? "light" : mode,
      })
    ).data;
    toast.success("Writing run started", {
      description: draft
        ? "The paper is outlined, then written section by section, from the sample results."
        : "The paper outline is built from the sample results.",
    });
    openWritingRun(projectId, run);
    return true;
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "The writing run could not be started. Please try again.");
    return false;
  }
}
