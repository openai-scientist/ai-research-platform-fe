"use client";

import type { ReactNode } from "react";

import { cn } from "cn";
import { motion } from "motion/react";

import type { AgentRole } from "@/lib/run-stream/contract";

import { AgentAvatar } from "../run-bits";
import { AGENTS } from "../run-meta";

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
  const you = actor === "you";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "grid max-w-2xl grid-cols-[auto_1fr] gap-2.5 rounded-xl border px-3 py-2.5 text-sm",
        you ? "border-amber-500/40 bg-amber-500/10" : "bg-card",
      )}
    >
      {you ? (
        <span className="grid size-5 place-items-center rounded-full bg-amber-500/20 font-semibold text-[9px] text-amber-800 dark:text-amber-300">
          You
        </span>
      ) : (
        <AgentAvatar agent={actor} size="sm" />
      )}
      <div>
        <b className={cn("font-semibold text-xs", !you && AGENTS[actor].text)}>{title}</b>
        <p>{text}</p>
        {note && <p className="mt-0.5 text-muted-foreground text-xs italic">Note: “{note}”</p>}
      </div>
    </motion.div>
  );
}
