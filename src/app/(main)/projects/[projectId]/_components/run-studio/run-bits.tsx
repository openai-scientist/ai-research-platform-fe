"use client";

import { type RefObject, useEffect, useLayoutEffect, useRef, useState } from "react";

import { cn } from "cn";
import { motion } from "motion/react";

import type { AgentRole, Verdict } from "@/lib/run-stream/contract";
import type { RunDisplayStatus } from "@/lib/run-stream/selectors";

import { AGENTS, STATUS_TONE, VERDICT } from "./run-meta";

export function AgentAvatar({
  agent: role,
  size = "md",
  className,
}: {
  agent: AgentRole;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const agent = AGENTS[role];
  return (
    <span
      title={agent.name}
      className={cn(
        "relative inline-grid shrink-0 place-items-center rounded-full font-semibold ring-1 ring-inset",
        agent.soft,
        agent.text,
        size === "sm" && "size-5 text-[9px]",
        size === "md" && "size-7 text-[10.5px]",
        size === "lg" && "size-9 text-xs",
        className,
      )}
    >
      {agent.initials}
    </span>
  );
}

export function PulseDot({ className, pulse = true }: { className: string; pulse?: boolean }) {
  return (
    <span className="relative flex size-2 shrink-0">
      {pulse && (
        <span className={cn("absolute inline-flex size-full animate-ping rounded-full opacity-60", className)} />
      )}
      <span className={cn("relative inline-flex size-2 rounded-full", className)} />
    </span>
  );
}

export function StatusPill({ status, className }: { status: RunDisplayStatus; className?: string }) {
  const tone = STATUS_TONE[status];
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-2 rounded-full px-2.5 font-medium text-xs",
        tone.className,
        className,
      )}
    >
      <PulseDot className={tone.dot} pulse={status === "running" || status === "waiting"} />
      {tone.label}
    </span>
  );
}

export function VerdictBadge({ verdict, className }: { verdict: Verdict; className?: string }) {
  const tone = VERDICT[verdict];
  return (
    <motion.span
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 22 }}
      className={cn(
        "inline-flex h-5 w-fit items-center gap-1.5 rounded-full px-2 font-medium text-xs",
        tone.className,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", tone.dot)} />
      {tone.label}
    </motion.span>
  );
}

/**
 * An agent's pointer, like a collaborator's cursor in a shared doc. It glides to whichever element in
 * `container` matches `target` (a `data-cursor` value) and hides when there is none.
 */
export function AgentCursor({
  agent: role,
  container,
  target,
  version,
}: {
  agent: AgentRole | null;
  container: RefObject<HTMLElement | null>;
  target: string | null;
  /** Bump to re-measure when the target moves without changing. */
  version?: unknown;
}) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  useLayoutEffect(() => {
    void version;
    const host = container.current;
    const el = target && host ? host.querySelector<HTMLElement>(`[data-cursor="${CSS.escape(target)}"]`) : null;
    if (!host || !el) {
      setPos(null);
      return;
    }
    const measure = () => {
      const a = el.getBoundingClientRect();
      const b = host.getBoundingClientRect();
      if (!a.width && !a.height) return;
      setPos({ x: a.left - b.left + Math.min(a.width * 0.55, 90), y: a.top - b.top + Math.min(a.height * 0.6, 22) });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => observer.disconnect();
  }, [container, target, version]);

  if (!role || role === "code" || !pos) return null;
  const agent = AGENTS[role];
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute top-0 left-0 z-20 flex items-start"
      initial={{ x: pos.x + 40, y: pos.y + 30, opacity: 0 }}
      animate={{ x: pos.x, y: pos.y, opacity: 1 }}
      transition={{ type: "spring", stiffness: 140, damping: 20, mass: 0.8 }}
    >
      <svg aria-hidden="true" viewBox="0 0 18 18" className={cn("size-[18px] drop-shadow-sm", agent.text)}>
        <path
          d="M2.5 1.8 15.5 8.2 9.4 9.6 6.9 16z"
          className="fill-current stroke-background"
          strokeWidth={1.4}
          strokeLinejoin="round"
        />
      </svg>
      <span
        className={cn(
          "mt-3 -ml-1 whitespace-nowrap rounded-[2px_8px_8px_8px] px-1.5 py-1 font-semibold text-[11px] text-background leading-none shadow-sm",
          agent.solid,
        )}
      >
        {agent.name}
      </span>
    </motion.div>
  );
}

// ---------- flights: a chip that travels from where a value lives to where it is used ----------

interface Flight {
  id: number;
  from: DOMRect;
  to: DOMRect;
  label: string;
  tone: string;
}

const listeners = new Set<(flight: Flight) => void>();
let flightId = 0;

/** Sends a small labelled chip from one element to another. Does nothing if either is off screen. */
export function launchFlight(
  from: Element | null | undefined,
  to: Element | null | undefined,
  label: string,
  tone = "bg-foreground text-background",
) {
  if (!from || !to || listeners.size === 0) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const a = from.getBoundingClientRect();
  const b = to.getBoundingClientRect();
  if (!a.width || !b.width) return;
  const flight = { id: ++flightId, from: a, to: b, label, tone };
  for (const listener of listeners) listener(flight);
}

export function FlightLayer() {
  const [flights, setFlights] = useState<Flight[]>([]);
  useEffect(() => {
    const add = (flight: Flight) => setFlights((list) => [...list, flight]);
    listeners.add(add);
    return () => {
      listeners.delete(add);
    };
  }, []);
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[70]">
      {flights.map((f) => {
        const dx = f.to.left + 8 - f.from.left;
        const dy = f.to.top + 4 - f.from.top;
        return (
          <motion.span
            key={f.id}
            className={cn(
              "absolute whitespace-nowrap rounded-md px-2 py-1 font-mono font-semibold text-[11px] shadow-md",
              f.tone,
            )}
            style={{ left: f.from.left, top: f.from.top }}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0.9 }}
            animate={{
              x: [0, dx * 0.5, dx],
              y: [0, dy * 0.5 - 46, dy],
              opacity: [0, 1, 0.2],
              scale: [0.9, 1.06, 0.92],
            }}
            transition={{ duration: 0.85, ease: [0.45, 0, 0.2, 1], times: [0, 0.55, 1] }}
            onAnimationComplete={() => setFlights((list) => list.filter((x) => x.id !== f.id))}
          >
            {f.label}
          </motion.span>
        );
      })}
    </div>
  );
}

/** Streaming text caret. */
/** Characters a line types per second. */
const TYPE_RATE = 120;

/**
 * Types out a line that grows or is replaced while it is shown. What is there when it first renders shows at
 * once, so reopening a run does not replay its narration.
 */
export function TypedLine({ text, typing }: { text: string; typing: boolean }) {
  const [shown, setShown] = useState(text.length);
  const shownRef = useRef(text.length);
  const previous = useRef(text);
  useEffect(() => {
    const before = previous.current;
    previous.current = text;
    const instant =
      !typing || typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (instant || text === before) {
      shownRef.current = text.length;
      setShown(text.length);
      return;
    }
    // A line that grows keeps typing from where it is; a new line starts over.
    const from = text.startsWith(before) ? Math.min(shownRef.current, before.length) : 0;
    const t0 = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const next = Math.min(text.length, from + Math.round(((now - t0) / 1000) * TYPE_RATE));
      shownRef.current = next;
      setShown(next);
      if (next < text.length) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [text, typing]);
  return <>{text.slice(0, shown)}</>;
}

export function Caret({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("ml-0.5 inline-block h-[1.05em] w-0.5 animate-pulse bg-current align-[-0.15em]", className)}
    />
  );
}
