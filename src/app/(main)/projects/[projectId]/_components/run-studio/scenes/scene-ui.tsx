"use client";

import { type ReactNode, useEffect, useState } from "react";

import { cn } from "cn";
import { CircleCheck, CornerDownRight, type LucideIcon, Undo2 } from "lucide-react";
import { motion } from "motion/react";

import type { AgentRole } from "@/lib/run-stream/contract";

import { Caret } from "../run-bits";
import { AGENTS } from "../run-meta";
import { useBusy } from "../workspace-context";

export function Pane({
  title,
  aside,
  children,
  className,
  action,
}: {
  title: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className={cn("min-w-0 rounded-xl bg-card p-4 text-card-foreground ring-1 ring-foreground/10", className)}
    >
      <header className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        <b className="font-semibold">{title}</b>
        {aside && <span className="ml-auto text-muted-foreground text-xs">{aside}</span>}
        {action}
      </header>
      {children}
    </motion.section>
  );
}

export function Placeholder({
  icon,
  children,
  className,
}: {
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-18 items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-4 text-center text-muted-foreground text-sm",
        className,
      )}
    >
      {icon}
      {children}
    </div>
  );
}

/** A decision or note left in the scene, by you or by an agent. */
export function SceneNote({
  actor,
  title,
  text,
  note,
}: {
  actor: AgentRole | "you";
  title: string;
  text: string;
  note?: string;
}) {
  const who = actor === "you" ? "You" : (AGENTS[actor]?.name ?? actor);
  const { Icon, tone } = decisionMark(text);
  // "Approved the hypotheses." reads on from the name: "You approved the hypotheses."
  const verb = /^[A-Z][a-z]+ed\b/.test(text);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      aria-label={title}
      className="flex max-w-2xl items-start gap-2 border-t pt-2.5 text-muted-foreground text-sm"
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", tone)} aria-hidden />
      <div className="min-w-0">
        <p>
          <span className="font-medium text-foreground">{who}</span>
          {verb ? ` ${text.charAt(0).toLowerCase()}${text.slice(1)}` : ` · ${text}`}
        </p>
        {note && <p className="mt-1 border-l-2 pl-2 text-xs italic">“{note}”</p>}
      </div>
    </motion.div>
  );
}

/** Approving goes on; asking again goes back; anything else is a plain record. */
function decisionMark(text: string): { Icon: LucideIcon; tone: string } {
  if (text.startsWith("Approved")) return { Icon: CircleCheck, tone: "text-emerald-600 dark:text-emerald-400" };
  if (text.startsWith("Asked")) return { Icon: Undo2, tone: "text-amber-600 dark:text-amber-400" };
  return { Icon: CornerDownRight, tone: "text-muted-foreground" };
}

/** Types `text` out at `speed` characters a second while live; shows it whole otherwise. */
export function TypeText({
  text,
  live,
  speed = 110,
  className,
}: {
  text: any;
  live: boolean;
  speed?: number;
  className?: string;
}) {
  const safeText =
    typeof text === "string"
      ? text
      : typeof text === "object" && text !== null
        ? ((text as any).text ?? (text as any).value ?? (text as any).statement ?? JSON.stringify(text))
        : String(text ?? "");

  const [shown, setShown] = useState(live ? 0 : safeText.length);
  useEffect(() => {
    if (!live || typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(safeText.length);
      return;
    }
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const next = Math.min(safeText.length, Math.round(((now - t0) / 1000) * speed));
      setShown(next);
      if (next < safeText.length) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [safeText, live, speed]);
  // The live view does not move to the next stage while this is still being typed.
  useBusy(live && shown < safeText.length);
  return (
    <span className={className}>
      {safeText.slice(0, shown)}
      {shown < safeText.length && <Caret />}
    </span>
  );
}

/** Grey bars standing in for text that is about to be written. */
export function PendingLines({ lines = 2, className }: { lines?: number; className?: string }) {
  return (
    <span aria-hidden className={cn("flex flex-col gap-1.5 py-1", className)}>
      {Array.from({ length: lines }, (_, i) => (
        <span
          key={i}
          className={cn("h-2.5 animate-pulse rounded-full bg-muted", i === lines - 1 ? "w-2/5" : "w-full")}
        />
      ))}
    </span>
  );
}

/** A bar holding the place of a value still to come; it pulses only while that part is being worked on. */
export function Bone({ active, className }: { active: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("block h-2.5 rounded-full bg-muted", active && "motion-safe:animate-pulse", className)}
    />
  );
}

/** Text struck through in red. When `live`, the strike fades in so the change is noticed; it wraps with the text. */
export function Strike({ children, live, className }: { children: ReactNode; live: boolean; className?: string }) {
  const [on, setOn] = useState(!live);
  useEffect(() => {
    if (on) return;
    const timer = window.setTimeout(() => setOn(true), 60);
    return () => window.clearTimeout(timer);
  }, [on]);
  return (
    <span
      className={cn(
        "line-through decoration-1 transition-[text-decoration-color] duration-700",
        on ? "decoration-rose-500" : "decoration-transparent",
        className,
      )}
    >
      {children}
    </span>
  );
}
