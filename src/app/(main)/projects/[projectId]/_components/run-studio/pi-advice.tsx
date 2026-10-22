"use client";

import type { ReactNode } from "react";

import { cn } from "cn";
import { motion } from "motion/react";

import type { PiAdvice } from "@/lib/run-stream/contract";

import { AgentAvatar } from "./run-bits";

/** How sure the PI is, as a short bar and a percentage. */
function Confidence({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <span
      className="inline-flex items-center gap-1.5 text-muted-foreground text-xs tabular-nums"
      title="How sure the PI is"
    >
      <span className="relative h-1 w-10 overflow-hidden rounded-full bg-foreground/10">
        <motion.span
          className={cn(
            "absolute inset-y-0 left-0 rounded-full",
            pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-rose-500",
          )}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
      </span>
      {pct}% sure
    </span>
  );
}

/** The PI's advice at a stop: who says it, what it would do, how sure it is, and its reasoning. */
export function PiAdviceCard({
  advice,
  headline,
  action,
}: {
  advice: PiAdvice;
  /** Such as "The PI recommends accepting all 5". */
  headline: string;
  /** A control next to the headline, such as "Use the PI's pick". */
  action?: ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      aria-label="The PI's advice"
      className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 rounded-xl bg-muted/60 px-4 py-3.5 ring-1 ring-foreground/8 ring-inset"
    >
      <AgentAvatar agent="pi" size="lg" className="max-sm:size-7 sm:row-span-2" />
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
        <b className="font-semibold text-sm">{headline}</b>
        {advice.confidence !== undefined && <Confidence value={advice.confidence} />}
        {action && <span className="ml-auto">{action}</span>}
      </div>
      <p className="col-span-2 text-pretty text-[13.5px] text-foreground/85 leading-relaxed sm:col-span-1 sm:col-start-2">
        {advice.text}
      </p>
    </motion.section>
  );
}
