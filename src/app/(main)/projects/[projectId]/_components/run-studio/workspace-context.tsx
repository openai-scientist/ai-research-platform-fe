"use client";

import { createContext, type RefObject, useContext, useEffect } from "react";

import type { RunState } from "@/lib/run-stream/run-state";
import type { RunSession } from "@/lib/run-stream/run-store";

export interface WorkspaceContextValue {
  session: RunSession;
  state: RunState;
  /** Auto-scroll keeps the newest work in view until the person scrolls away. */
  follow: boolean;
  setFollow(follow: boolean): void;
  /** Hypotheses picked for dropping while a `hypotheses` gate is in drop mode. */
  dropMode: boolean;
  dropped: string[];
  toggleDrop(id: string): void;
}

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("useWorkspace must be used inside the run workspace");
  return value;
}

/** Where a stage's long animations register while they run, so the live view waits for them before moving on. */
export const BusyContext = createContext<{ add(): () => void } | null>(null);

/** Counts this component as busy while `active` (outside a stage screen it does nothing). */
export function useBusy(active: boolean) {
  const busy = useContext(BusyContext);
  useEffect(() => {
    if (!active || !busy) return;
    return busy.add();
  }, [active, busy]);
}

/** Scrolls the element into view when `key` changes, if this stage is live and the workspace follows. */
export function useReveal(ref: RefObject<HTMLElement | null>, key: unknown, live: boolean) {
  const { follow } = useWorkspace();
  useEffect(() => {
    void key;
    if (!live || !follow) return;
    ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [ref, key, live, follow]);
}
