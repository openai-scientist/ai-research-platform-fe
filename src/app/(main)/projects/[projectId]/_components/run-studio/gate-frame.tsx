"use client";

import { type ReactNode, useEffect } from "react";

import { cn } from "cn";
import { ChevronDown, ChevronUp } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { Button } from "@/components/ui/button";

import { PulseDot } from "./run-bits";

export function GateFrame({
  title,
  detail,
  badge = "Your turn",
  minimizedLabel = "Waiting for you:",
  reopenLabel = "Answer",
  minimized,
  onMinimize,
  wide,
  children,
}: {
  title: string;
  detail?: string;
  badge?: string;
  minimizedLabel?: string;
  reopenLabel?: string;
  minimized: boolean;
  onMinimize(minimized: boolean): void;
  wide?: boolean;
  children(header: ReactNode): ReactNode;
}) {
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (minimized) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (window.document.querySelector("[data-radix-popper-content-wrapper], [role='dialog'][data-state='open']"))
        return;
      onMinimize(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [minimized, onMinimize]);

  if (minimized)
    return (
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="absolute bottom-4 left-1/2 z-30 flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-3 whitespace-nowrap rounded-full bg-card py-1.5 pr-1.5 pl-4 text-sm shadow-lg ring-1 ring-amber-500/60"
      >
        <PulseDot className="bg-amber-500" />
        <span className="truncate">
          <b className="font-semibold">{minimizedLabel}</b> {title}
        </span>
        <Button size="sm" onClick={() => onMinimize(false)}>
          <ChevronUp />
          {reopenLabel}
        </Button>
      </motion.div>
    );

  const header = (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex h-6 items-center gap-2 rounded-full bg-amber-500/15 px-2.5 font-medium text-amber-800 text-xs dark:text-amber-300">
          <PulseDot className="bg-amber-500" />
          {badge}
        </span>
        {detail && <span className="text-muted-foreground text-xs">{detail}</span>}
        <Button variant="ghost" size="sm" className="ml-auto" onClick={() => onMinimize(true)}>
          <ChevronDown />
          Hide to look at the work
        </Button>
      </div>
      <h3 className="font-semibold text-lg tracking-tight">{title}</h3>
    </>
  );
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 z-20 bg-black/25 dark:bg-black/50"
      />
      <motion.div
        role="dialog"
        aria-label={title}
        initial={reducedMotion ? { opacity: 0 } : { y: "110%" }}
        animate={reducedMotion ? { opacity: 1 } : { y: 0 }}
        exit={reducedMotion ? { opacity: 0 } : { y: "110%" }}
        transition={{ type: "spring", stiffness: 260, damping: 30 }}
        className={cn(
          "absolute inset-x-4 bottom-4 z-30 mx-auto flex max-h-[calc(100%-2rem)] flex-col overflow-hidden rounded-2xl bg-popover text-popover-foreground shadow-2xl ring-1 ring-foreground/10",
          wide ? "max-w-[880px]" : "max-w-[700px]",
        )}
      >
        {children(header)}
      </motion.div>
    </>
  );
}
