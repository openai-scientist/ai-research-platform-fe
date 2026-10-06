import { create } from "zustand";

import type { GateAnswer, ReviewMode, RunEvent, RunInput } from "./contract";
import { MockRun } from "./mock/mock-run";
import { applyRunEvent } from "./reducer";
import { initialRunState, type RunState } from "./run-state";

export interface RunSession {
  runId: string;
  projectId: string;
  /** Short label shown in the UI, such as `RUN-3F9C`. */
  label: string;
  source: "mock";
  speed: number;
  state: RunState;
}

interface RunStudioState {
  sessions: Record<string, RunSession>;
  /** The run each project is working on, if any. A project works on one run at a time. */
  activeRun: Record<string, string>;
  /** Run whose workspace is open, and the element it opened from. */
  openRunId: string | null;
  openFrom: DOMRect | null;
  startRun(projectId: string, mode: ReviewMode, input: RunInput): string;
  answerGate(runId: string, gateId: string, answer: GateAnswer): void;
  pause(runId: string): void;
  resume(runId: string): void;
  setSpeed(runId: string, speed: number): void;
  openWorkspace(runId: string, from?: Element | null): void;
  closeWorkspace(): void;
  discardRun(projectId: string): void;
}

// Live streams sit outside React state; only the folded state goes into the store.
const streams = new Map<string, MockRun>();
const queue = new Map<string, RunEvent[]>();
let frame = 0;

export const useRunStudio = create<RunStudioState>()((set, get) => {
  // Many events can arrive within one frame (streamed text); fold them in one update.
  const flush = () => {
    frame = 0;
    const pending = [...queue.entries()];
    queue.clear();
    set((store) => {
      const sessions = { ...store.sessions };
      for (const [runId, events] of pending) {
        const session = sessions[runId];
        if (!session) continue;
        sessions[runId] = { ...session, state: events.reduce(applyRunEvent, session.state) };
      }
      return { sessions };
    });
  };
  const receive = (event: RunEvent) => {
    const list = queue.get(event.run_id) ?? [];
    list.push(event);
    queue.set(event.run_id, list);
    if (!frame)
      frame =
        typeof requestAnimationFrame === "function"
          ? requestAnimationFrame(flush)
          : (setTimeout(flush, 16) as unknown as number);
  };

  return {
    sessions: {},
    activeRun: {},
    openRunId: null,
    openFrom: null,
    startRun(projectId, mode, input) {
      const previous = get().activeRun[projectId];
      if (previous) streams.get(previous)?.dispose();
      const runId = crypto.randomUUID();
      const label = `RUN-${runId.slice(0, 4).toUpperCase()}`;
      const run = new MockRun(label, mode, (event) => receive({ ...event, run_id: runId }), input);
      streams.set(runId, run);
      set((store) => ({
        sessions: {
          ...store.sessions,
          [runId]: { runId, projectId, label, source: "mock", speed: 1, state: initialRunState(runId) },
        },
        activeRun: { ...store.activeRun, [projectId]: runId },
      }));
      run.start();
      return runId;
    },
    answerGate(runId, gateId, answer) {
      streams.get(runId)?.answerGate(gateId, answer);
    },
    pause(runId) {
      streams.get(runId)?.pause();
    },
    resume(runId) {
      streams.get(runId)?.resume();
    },
    setSpeed(runId, speed) {
      streams.get(runId)?.setSpeed(speed);
      set((store) => {
        const session = store.sessions[runId];
        return session ? { sessions: { ...store.sessions, [runId]: { ...session, speed } } } : {};
      });
    },
    openWorkspace(runId, from) {
      set({ openRunId: runId, openFrom: from ? from.getBoundingClientRect() : null });
    },
    closeWorkspace() {
      set({ openRunId: null });
    },
    discardRun(projectId) {
      const runId = get().activeRun[projectId];
      if (!runId) return;
      streams.get(runId)?.dispose();
      streams.delete(runId);
      set((store) => {
        const { [projectId]: _gone, ...activeRun } = store.activeRun;
        const { [runId]: _session, ...sessions } = store.sessions;
        return { activeRun, sessions, openRunId: store.openRunId === runId ? null : store.openRunId };
      });
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
