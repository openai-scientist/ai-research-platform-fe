"use client";

import { useEffect, useRef, useState } from "react";

import { fetchArtifacts, type RunArtifactItem } from "@/lib/api/services/fetch-artifacts";
import { subscribeRunEvents } from "@/lib/realtime/run-events";
import type { LiveViewInput } from "@/lib/run-stream/live-views";
import type { PipelineEnvelope } from "@/lib/run-stream/pipeline-adapter";

/** Picks the artifact the mapper should read: the newest one, from the stage attempt when the schema belongs to it. */
export function pickArtifact(items: readonly RunArtifactItem[], stageRunId: string | null, scoped: boolean) {
  const pool = scoped && stageRunId ? items.filter((item) => item.stage_run_id === stageRunId) : items;
  return [...pool].sort((a, b) => a.created_at.localeCompare(b.created_at)).at(-1);
}

/**
 * The envelopes and artifact bodies the live-view mappers read, for one stage of a run.
 * `scoped` schemas come from the stage's own attempt; `upstream` schemas are the newest published by earlier stages.
 */
export function useLiveInput({
  projectId,
  runId,
  stageKey,
  scoped,
  upstream = [],
  live,
}: {
  projectId: string | undefined;
  runId: string | undefined;
  stageKey: string;
  scoped: readonly string[];
  upstream?: readonly string[];
  live: boolean;
}): LiveViewInput {
  const [events, setEvents] = useState<PipelineEnvelope[]>([]);
  const [artifacts, setArtifacts] = useState<Record<string, unknown>>({});
  const bodies = useRef(new Map<string, unknown>());
  const standardUpstream: Readonly<Record<string, readonly string[]>> = {
    experiment_design: ["dataset.snapshot/v1", "dataset.data_card/v1", "dataset.brief/v2"],
    execution: ["experiment_design.plan/v1", "experiment_design.lock/v1"],
  };
  const upstreamSchemas = [...new Set([...(standardUpstream[stageKey] ?? []), ...upstream])];
  const schemaKey = [...scoped, "|", ...upstreamSchemas].join(",");

  useEffect(() => {
    if (!projectId || !runId) return;
    setEvents([]);
    setArtifacts({});
    bodies.current.clear();
    let queue: PipelineEnvelope[] = [];
    let frame = 0;
    const flush = () => {
      frame = 0;
      const next = queue;
      queue = [];
      setEvents((current) => [...current, ...next]);
    };
    const stop = subscribeRunEvents(
      projectId,
      runId,
      { after: 0, live },
      {
        onEvents: (batch) => {
          queue.push(...(batch as unknown as PipelineEnvelope[]).filter((event) => event.stage_key === stageKey));
          if (queue.length && !frame) frame = requestAnimationFrame(flush);
        },
        onEnded: () => undefined,
        onSessionEnded: () => window.dispatchEvent(new Event("auth:expired")),
        // A stream that cannot be read leaves the card in its procedure preview; the run view reports the failure.
        onError: () => undefined,
      },
    );
    return () => {
      cancelAnimationFrame(frame);
      stop();
    };
  }, [projectId, runId, stageKey, live]);

  const stageRunId = events.findLast((event) => event.stage_run_id)?.stage_run_id ?? null;
  const lastSeq = events.at(-1)?.seq ?? 0;

  // Read the artifacts again a moment after new events, so a body that just landed replaces its preview.
  // biome-ignore lint/correctness/useExhaustiveDependencies: schemaKey stands for the schema lists.
  useEffect(() => {
    if (!projectId || !runId) return;
    const abort = new AbortController();
    const timer = setTimeout(async () => {
      const read = async (schema: string, isScoped: boolean) => {
        try {
          const list = await fetchArtifacts.getBySchema(projectId, runId, schema, abort.signal);
          const item = pickArtifact(list.data, stageRunId, isScoped);
          if (!item) return null;
          if (!bodies.current.has(item.id)) {
            const { blob } = await fetchArtifacts.download(projectId, runId, item.id, abort.signal);
            bodies.current.set(item.id, JSON.parse(await blob.text()));
          }
          return [schema, bodies.current.get(item.id)] as const;
        } catch {
          // Not published yet, or unreadable: the step stays a procedure preview.
          return null;
        }
      };
      const found = await Promise.all([
        ...scoped.map((s) => read(s, true)),
        ...upstreamSchemas.map((s) => read(s, false)),
      ]);
      if (abort.signal.aborted) return;
      const next = Object.fromEntries(found.filter((entry) => entry !== null));
      setArtifacts((current) =>
        Object.keys(next).length === Object.keys(current).length &&
        Object.entries(next).every(([key, value]) => current[key] === value)
          ? current
          : next,
      );
    }, 400);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [projectId, runId, stageRunId, lastSeq, schemaKey]);

  return { events, artifacts };
}
