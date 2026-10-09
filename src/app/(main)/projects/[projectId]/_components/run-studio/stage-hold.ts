"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** After its last change, a stage's short animations (cards filling in, dots flying, numbers counting) need this long. */
export const QUIET_MS = 1600;
/** A finished stage is never kept on screen longer than this once the next one has started. */
export const MAX_HOLD_MS = 8000;
const POLL_MS = 250;

/** Whether the live view may leave the stage it shows for the one now running. */
export function mayMoveOn(s: { busy: number; quietMs: number; heldMs: number; hidden: boolean }) {
  if (s.hidden) return true; // nobody is watching the animations
  if (s.heldMs >= MAX_HOLD_MS) return true; // never fall far behind the run
  return s.busy === 0 && s.quietMs >= QUIET_MS;
}

/** What the live view shows: a stage, and whether the run is still going there. */
export interface Followed {
  key: string | null;
  ended: boolean;
}

/**
 * The stage the live view follows. When the run moves to the next stage (or ends), the stage on screen stays until
 * its text has finished typing and it has been quiet for a moment, so the end of a stage is seen, not cut off.
 * `skip` moves on at once: a review stop needs the person now, and a stage they picked themselves needs no wait.
 */
export function useStageHold(key: string | null, ended: boolean, stages: Record<string, unknown>, skip: boolean) {
  const [shown, setShown] = useState<Followed>({ key, ended });
  const busy = useRef(0);
  const changedAt = useRef(Date.now());
  /** Long animations (text being typed) register here while they run. */
  const busyContext = useMemo(
    () => ({
      add: () => {
        busy.current += 1;
        return () => {
          busy.current -= 1;
        };
      },
    }),
    [],
  );

  const version = stages[shown.key ?? ""];
  useEffect(() => {
    void version;
    changedAt.current = Date.now();
  }, [version]);

  const same = shown.key === key && shown.ended === ended;
  useEffect(() => {
    if (same) return;
    if (skip || shown.key === null) {
      setShown({ key, ended });
      return;
    }
    const since = Date.now();
    const timer = window.setInterval(() => {
      const now = Date.now();
      const move = mayMoveOn({
        busy: busy.current,
        quietMs: now - changedAt.current,
        heldMs: now - since,
        hidden: document.visibilityState === "hidden",
      });
      if (move) setShown({ key, ended });
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [same, skip, shown.key, key, ended]);

  const release = useCallback(() => setShown({ key, ended }), [key, ended]);
  return { shown, holding: !same, release, busyContext };
}
