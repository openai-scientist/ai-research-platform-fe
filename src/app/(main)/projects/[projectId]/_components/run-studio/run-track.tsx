"use client";

import { type ReactNode, useEffect, useId, useRef } from "react";

import { cn } from "cn";
import { Flag } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

export const RUN_EASE = [0.16, 1, 0.3, 1] as const;

export type TrackItem = {
  key: string;
  label: ReactNode;
  past: boolean;
  live: boolean;
  waiting: boolean;
  fill: number;
  available: boolean;
  gate?: boolean;
};

export function RunTrack({
  items,
  currentKey,
  viewKey,
  onView,
  label,
  minimumWidth = 620,
}: {
  items: TrackItem[];
  currentKey?: string | null;
  viewKey: string | null;
  onView(key: string): void;
  label: string;
  minimumWidth?: number;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const underline = useId();
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    const item = scroller.current?.querySelector<HTMLElement>(`[data-track="${currentKey}"]`);
    item?.scrollIntoView({ inline: "center", block: "nearest", behavior: reducedMotion ? "instant" : "smooth" });
  }, [currentKey, reducedMotion]);
  return (
    <div ref={scroller} className="overflow-x-auto overflow-y-hidden border-b px-4 pt-3 pb-3.5 md:px-5">
      <ol aria-label={label} className="flex gap-1.5" style={{ minWidth: Math.max(minimumWidth, items.length * 104) }}>
        {items.map(({ key, label, past, live, waiting, fill, available, gate }) => {
          const viewing = key === viewKey;
          return (
            <motion.li
              key={key}
              layout
              data-track={key}
              initial={reducedMotion ? false : { opacity: 0, flexGrow: 0.001 }}
              animate={{ opacity: 1, flexGrow: 1 }}
              transition={{ duration: 0.6, ease: RUN_EASE }}
              className="relative min-w-0 basis-0"
            >
              <button
                type="button"
                disabled={!available}
                onClick={() => onView(key)}
                aria-current={viewing ? "step" : undefined}
                className="flex w-full flex-col gap-1.5 rounded py-0.5 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default"
              >
                <span
                  className={cn(
                    "flex items-center gap-1.5 truncate pr-3 font-medium text-xs transition-colors",
                    past || live || viewing ? "text-foreground" : "text-muted-foreground",
                    viewing && "font-semibold",
                  )}
                >
                  {label}
                </span>
                <span className="relative h-1 overflow-hidden rounded-full bg-muted">
                  <motion.i
                    className={cn(
                      "absolute inset-y-0 left-0 rounded-full",
                      waiting ? "bg-amber-500" : live ? "bg-sky-500" : "bg-foreground",
                    )}
                    initial={false}
                    animate={{ width: `${fill}%` }}
                    transition={{ duration: reducedMotion ? 0 : 0.7, ease: RUN_EASE }}
                  />
                  {live && !waiting && !reducedMotion && (
                    <motion.i
                      className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-sky-500/40 to-transparent"
                      animate={{ x: ["-100%", "300%"] }}
                      transition={{ duration: 1.6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                    />
                  )}
                </span>
              </button>
              {gate && (
                <span
                  title="Stops for you here"
                  className={cn(
                    "absolute -right-2 bottom-[-5px] z-10 grid size-[18px] place-items-center rounded-full bg-background",
                    waiting ? "bg-amber-500 text-white" : past ? "text-muted-foreground" : "text-amber-500",
                  )}
                >
                  {waiting && !reducedMotion && (
                    <motion.span
                      aria-hidden
                      className="absolute -inset-[3px] rounded-full border-2 border-amber-500"
                      animate={{ opacity: [0.15, 0.8, 0.15] }}
                      transition={{ duration: 1.6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                    />
                  )}
                  <Flag className={cn("size-3", !past && !waiting && "fill-amber-500/25")} />
                  <span className="sr-only">You decide here</span>
                </span>
              )}
              {viewing && (
                <motion.span
                  layoutId={underline}
                  className="absolute inset-x-0 right-3 -bottom-3.5 h-0.5 rounded-full bg-foreground"
                />
              )}
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}
