"use client";

import { useEffect, useRef, useState } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useRunDetailQuery } from "@/hooks/use-runs-query";
import { projectKeys } from "@/lib/api/query-keys";
import { subscribeRunEvents } from "@/lib/realtime/run-events";
import { isActiveRun } from "@/lib/research-workspace";
import { applyDatasetEvent, type DatasetRunModel, emptyDatasetRun } from "@/lib/run-stream/dataset-run-model";
import type { PipelineEnvelope } from "@/lib/run-stream/pipeline-adapter";

const consultationsKey = (projectId: string, runId: string) =>
  projectKeys.run(projectId, runId).concat(["pi", "consultations"]);

/**
 * Reads the Dataset stage for its direct route. Run Studio folds the same envelopes from its own subscription.
 */
export function useDatasetRun(projectId: string, runId: string) {
  const query = useRunDetailQuery(projectId, runId);
  const queryClient = useQueryClient();
  const run = query.data?.data;
  const [model, setModel] = useState<DatasetRunModel>(emptyDatasetRun);
  const [loaded, setLoaded] = useState(false);
  const live = run ? isActiveRun(run.status) : null;
  const known = live !== null;
  const liveAtStart = useRef(live);
  if (!known) liveAtStart.current = null;
  else liveAtStart.current ??= live;

  useEffect(() => {
    // Subscribe once, when the run is known: a live stream for an open run, a read for a finished one.
    if (!known) return;
    const following = liveAtStart.current === true;
    let queue: PipelineEnvelope[] = [];
    let frame = 0;
    const flush = () => {
      frame = 0;
      const events = queue;
      queue = [];
      setModel((current) => events.reduce(applyDatasetEvent, current));
      // What the PI says changes the consultations (the plan to endorse, the stage outcome): read them again.
      if (events.some((event) => event.type.startsWith("pi.")))
        void queryClient.invalidateQueries({ queryKey: consultationsKey(projectId, runId) });
    };
    const stop = subscribeRunEvents(
      projectId,
      runId,
      { after: 0, live: following },
      {
        onEvents: (events) => {
          queue.push(
            ...(events as unknown as PipelineEnvelope[]).filter(
              (event) => !event.stage_key || event.stage_key === "dataset",
            ),
          );
          if (!frame) frame = requestAnimationFrame(flush);
        },
        onEnded: () => setLoaded(true),
        onSessionEnded: () => window.dispatchEvent(new Event("auth:expired")),
        onError: (error) => toast.error(error.message || "Unable to read the run's progress."),
      },
    );
    setLoaded(!following);
    return () => {
      cancelAnimationFrame(frame);
      stop();
    };
  }, [projectId, runId, known, queryClient]);

  return { run, model, query, loaded: loaded || live === false };
}
