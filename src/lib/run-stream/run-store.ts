import { toast } from "sonner";
import { create } from "zustand";

import { fetchRuns, type RunItem, runProblem, runTitle } from "@/lib/api/services/fetch-runs";
import { isActiveRun } from "@/lib/research-workspace";
import { ApiError } from "@/types/api";
import { RunStatus } from "@/types/enums";

import { ApiRun } from "./api-run";
import type { GateAnswer, ReviewMode, RunCommands, RunEvent, RunInput } from "./contract";
import { applyRunEvent } from "./reducer";
import { initialRunState, type RunState } from "./run-state";

/** A run on the backend, followed through its events. */
export interface RunSession {
  runId: string;
  projectId: string;
  /** Short label shown in the UI, such as `RUN-3F9C`. */
  label: string;
  /** A pipeline run: stages on engines, which can't be paused yet. */
  pipeline: boolean;
  /** When the run was created, ISO 8601. */
  createdAt: string;
  /** Has taken in a live event. Until then its events are history, such as a reload replaying how it ended. */
  followed?: boolean;
  state: RunState;
}

interface RunStudioState {
  sessions: Record<string, RunSession>;
  /** The run each project is working on, if any. A project works on one run at a time. */
  activeRun: Record<string, string>;
  /** Run whose workspace is open, and the element it opened from. */
  openRunId: string | null;
  openFrom: DOMRect | null;
  /** Starts a run and makes it the project's run. Resolves to the run to open, or null when none started. */
  startRun(projectId: string, mode: ReviewMode, input: RunInput): Promise<string | null>;
  /** Shows a run from the backend. `active` makes it the project's run; otherwise it can only be opened. */
  attachRun(projectId: string, run: RunItem, active: boolean): void;
  /** Resolves to false when the answer was not recorded. */
  answerGate(runId: string, gateId: string, answer: GateAnswer): Promise<boolean>;
  pause(runId: string): void;
  resume(runId: string): void;
  /** Follows a run's live events again, after it was started again from an end (a rerun, a budget raise). */
  follow(runId: string): void;
  openWorkspace(runId: string, from?: Element | null): void;
  closeWorkspace(): void;
}

export interface Stream extends RunCommands {
  dispose(): void;
  follow?(): void;
}

const labelOf = (runId: string) => `RUN-${runId.slice(0, 4).toUpperCase()}`;

// Live streams sit outside React state; only the folded state goes into the store.
const streams = new Map<string, Stream>();
const queue = new Map<string, RunEvent[]>();
const followed = new Set<string>();
let frame = 0;

export const useRunStudio = create<RunStudioState>()((set, get) => {
  // Many events can arrive within one frame (streamed text, a replayed run); fold them in one update.
  const flush = () => {
    frame = 0;
    const pending = [...queue.entries()];
    const live = new Set(followed);
    queue.clear();
    followed.clear();
    set((store) => {
      const sessions = { ...store.sessions };
      for (const [runId, events] of pending) {
        const session = sessions[runId];
        if (!session) continue;
        sessions[runId] = {
          ...session,
          ...(live.has(runId) ? { followed: true } : {}),
          state: events.reduce(applyRunEvent, session.state),
        };
      }
      return { sessions };
    });
  };
  const receive = (event: RunEvent, live: boolean) => {
    if (live) followed.add(event.run_id);
    const list = queue.get(event.run_id) ?? [];
    list.push(event);
    queue.set(event.run_id, list);
    if (!frame)
      frame =
        typeof requestAnimationFrame === "function"
          ? requestAnimationFrame(flush)
          : (setTimeout(flush, 16) as unknown as number);
  };
  // Adds a session. As the project's run, it replaces the one before it.
  const track = (session: RunSession, stream: Stream, active: boolean) => {
    const { projectId, runId } = session;
    const previous = active ? get().activeRun[projectId] : undefined;
    const replaced = previous && previous !== runId ? previous : undefined;
    if (replaced) {
      streams.get(replaced)?.dispose();
      streams.delete(replaced);
    }
    streams.set(runId, stream);
    set((store) => {
      const { [replaced ?? ""]: _gone, ...sessions } = store.sessions;
      return {
        sessions: { ...sessions, [runId]: session },
        activeRun: active ? { ...store.activeRun, [projectId]: runId } : store.activeRun,
        openRunId: store.openRunId === replaced ? null : store.openRunId,
      };
    });
  };

  return {
    sessions: {},
    activeRun: {},
    openRunId: null,
    openFrom: null,
    async startRun(projectId, mode, input) {
      try {
        const { data: run } = await fetchRuns.create(projectId, {
          problem: input.problem,
          intent: input.intent,
          context: input.context,
          constraints: input.constraints,
          references: input.references,
          domains: input.domains,
          // The Platform stops at its gates in `light` and at none in `auto`.
          review_mode: mode === "auto" ? "auto" : "light",
        });
        get().attachRun(projectId, run, true);
        return run.id;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to start the run. Please try again.");
        if (!(error instanceof ApiError && error.code === "RUN_ACTIVE")) return null;
        // The project already has a run going: show that one instead.
        try {
          const running = (await fetchRuns.getList(projectId, { limit: 1 })).data[0];
          if (!running || !runProblem(running)) return null;
          get().attachRun(projectId, running, true);
          return running.id;
        } catch {
          return null;
        }
      }
    },
    attachRun(projectId, run, active) {
      if (get().sessions[run.id]) {
        if (active) set((store) => ({ activeRun: { ...store.activeRun, [projectId]: run.id } }));
        return;
      }
      const failed = [RunStatus.Failed, RunStatus.BudgetExceeded, RunStatus.Stopped].includes(run.status);
      const mode = run.review_mode ?? "light";
      const pipeline = Boolean(run.pipeline_key);
      const stream = new ApiRun(
        projectId,
        run.id,
        (events, live) => {
          for (const event of events) receive(event, live);
        },
        pipeline ? { topic: runTitle(run) ?? "", domains: run.domains ?? [], mode } : undefined,
      );
      track(
        {
          runId: run.id,
          projectId,
          label: run.label ?? labelOf(run.id),
          pipeline,
          createdAt: run.created_at,
          // What the run already says about itself, until its events arrive.
          state: {
            ...initialRunState(run.id),
            topic: runTitle(run) ?? "",
            domains: run.domains ?? [],
            mode,
            ...(run.status === RunStatus.Completed ? { completed: true, lifecycle: "completed" as const } : {}),
            ...(failed
              ? {
                  lifecycle: "failed" as const,
                  failure: run.failure_message ?? undefined,
                  ...(run.status === RunStatus.Stopped ? { stopped: true } : {}),
                }
              : {}),
          },
        },
        stream,
        active,
      );
      stream.start(isActiveRun(run.status));
    },
    async answerGate(runId, gateId, answer) {
      const stream = streams.get(runId);
      if (!stream) return false;
      return (await stream.answerGate(gateId, answer)) !== false;
    },
    pause(runId) {
      streams.get(runId)?.pause();
    },
    resume(runId) {
      streams.get(runId)?.resume();
    },
    follow(runId) {
      streams.get(runId)?.follow?.();
    },
    openWorkspace(runId, from) {
      set({ openRunId: runId, openFrom: from ? from.getBoundingClientRect() : null });
    },
    closeWorkspace() {
      set({ openRunId: null });
    },
  };
});

export function useProjectRun(projectId: string) {
  return useRunStudio((store) => {
    const runId = store.activeRun[projectId];
    return runId ? store.sessions[runId] : undefined;
  });
}

export function useRunSession(runId: string | null) {
  return useRunStudio((store) => (runId ? store.sessions[runId] : undefined));
}
