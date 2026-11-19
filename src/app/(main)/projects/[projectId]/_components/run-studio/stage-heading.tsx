"use client";

import type { ReactNode } from "react";

import { cn } from "cn";
import { ArrowRight, Check, FileText } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import type { AgentRole } from "@/lib/run-stream/contract";
import { pipelineLabel } from "@/lib/run-stream/selectors";

import { AgentAvatar, PulseDot } from "./run-bits";

export type StageOutput = {
  id: string;
  label: string;
  done: boolean;
  active: boolean;
};

export function StageLineage({ reads, writes }: { reads: string[]; writes: StageOutput[] }) {
  const reducedMotion = useReducedMotion();
  if (!reads.length && !writes.length) return null;
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs">
      <span className="text-muted-foreground">Builds on</span>
      {reads.map((read) => (
        <span key={read} className="inline-flex min-h-6 items-center rounded-md bg-muted px-2 text-foreground/80">
          {read}
        </span>
      ))}
      <ArrowRight className="size-3.5 text-muted-foreground" />
      <span className="text-muted-foreground">Writes</span>
      {writes.map(({ id, label, done, active }) => (
        <motion.span
          key={id}
          layout
          className={cn(
            "relative inline-flex h-6 items-center gap-1 overflow-hidden rounded-md border px-2 transition-colors duration-500",
            done
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
              : "border-foreground/20 border-dashed text-muted-foreground",
            active && "border-sky-500/50 border-solid text-foreground",
          )}
        >
          {active && !reducedMotion && (
            <motion.span
              aria-hidden
              className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-sky-500/15 to-transparent"
              initial={{ x: "-100%" }}
              animate={{ x: "220%" }}
              transition={{ duration: 1.4, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            />
          )}
          {done ? (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 20 }}
            >
              <Check className="size-3" />
            </motion.span>
          ) : (
            <FileText className="size-3" />
          )}
          <span className="relative">{label}</span>
        </motion.span>
      ))}
    </div>
  );
}

export function StageHeading({
  index,
  total,
  title,
  pipeline,
  purpose,
  cast,
  status,
  titleExtra,
  children,
}: {
  index: number;
  total: number;
  title: string;
  pipeline?: number[];
  purpose: string;
  cast: readonly AgentRole[];
  status: "done" | "ended" | "active" | "waiting" | "paused";
  titleExtra?: ReactNode;
  children?: ReactNode;
}) {
  const chip = pipelineLabel(pipeline);
  return (
    <header className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3.5 gap-y-2 border-b pb-3.5 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
      <span className="pt-1 font-mono text-muted-foreground text-xs">
        {String(index + 1).padStart(2, "0")}/{String(total).padStart(2, "0")}
      </span>
      <div className="min-w-0">
        <h2 className="flex flex-wrap items-center gap-2 font-semibold text-lg tracking-tight">
          {title}
          {chip && (
            <span className="rounded-md px-1.5 py-0.5 font-medium font-mono text-[11.5px] text-muted-foreground ring-1 ring-foreground/10">
              {chip}
            </span>
          )}
          {titleExtra}
        </h2>
        <p className="mt-1 max-w-[68ch] text-muted-foreground text-sm">{purpose}</p>
        {children}
      </div>
      <div className="col-start-2 flex items-center gap-3 sm:col-start-3 sm:pt-0.5">
        <div className="flex pl-2">
          {cast.map((role) => (
            <span key={role} className="-ml-2 rounded-full bg-background p-0.5">
              <AgentAvatar agent={role} />
            </span>
          ))}
        </div>
        {status === "done" ? (
          <motion.span
            initial={{ scale: 0.7 }}
            animate={{ scale: 1 }}
            className="inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full bg-emerald-500/12 px-2.5 font-medium text-emerald-700 text-xs dark:text-emerald-300"
          >
            <Check className="size-3" />
            Done
          </motion.span>
        ) : (
          <span
            className={cn(
              "inline-flex h-6 items-center gap-2 whitespace-nowrap rounded-full px-2.5 font-medium text-xs",
              status === "active" && "bg-sky-500/12 text-sky-700 dark:text-sky-300",
              status === "waiting" && "bg-amber-500/15 text-amber-800 dark:text-amber-300",
              (status === "ended" || status === "paused") && "bg-muted text-muted-foreground",
            )}
          >
            {status === "active" && <PulseDot className="bg-sky-500" />}
            {status === "waiting" && <PulseDot className="bg-amber-500" />}
            {{ active: "In progress", waiting: "Waiting", paused: "Paused", ended: "Not finished" }[status]}
          </span>
        )}
      </div>
    </header>
  );
}
