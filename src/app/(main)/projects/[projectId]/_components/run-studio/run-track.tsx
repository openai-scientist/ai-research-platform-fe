"use client";

import { type ReactNode, useEffect, useId, useRef } from "react";

import { cn } from "cn";
import { ChevronDown, Flag } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { summarizeTrackStep } from "./pipeline-stage-selection";

export const RUN_EASE = [0.16, 1, 0.3, 1] as const;

export type TrackItem = {
  key: string;
  label: ReactNode;
  fullLabel?: string;
  past: boolean;
  live: boolean;
  waiting: boolean;
  fill: number;
  available: boolean;
  gate?: boolean;
};

function TrackProgress({ item, animate }: { item: TrackItem; animate: boolean }) {
  return (
    <span className="relative h-1 w-full overflow-hidden rounded-full bg-muted">
      <motion.i
        className={cn(
          "absolute inset-y-0 left-0 rounded-full",
          item.waiting ? "bg-amber-500" : item.live ? "bg-sky-500" : "bg-foreground",
        )}
        initial={false}
        animate={{ width: `${item.fill}%` }}
        transition={{ duration: animate ? 0.7 : 0, ease: RUN_EASE }}
      />
      {item.live && !item.waiting && animate && (
        <motion.i
          className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-sky-500/40 to-transparent"
          animate={{ x: ["-100%", "300%"] }}
          transition={{ duration: 1.6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        />
      )}
    </span>
  );
}

function CompactTrack({
  items,
  currentKey,
  viewKey,
  label,
  onView,
}: {
  items: TrackItem[];
  currentKey?: string | null;
  viewKey: string | null;
  label: string;
  onView(key: string): void;
}) {
  const step = summarizeTrackStep(items, viewKey, currentKey);
  if (!step) return null;
  return (
    <div className="min-w-0 sm:hidden">
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="relative h-9 w-full justify-start gap-0.5 px-1 pb-1.5 text-xs"
            aria-label={label}
          >
            <span className="flex min-w-0 flex-1 items-center gap-0.5">
              <span className="sr-only">
                Step {step.position} of {step.count}
              </span>
              <span aria-hidden className="shrink-0 text-muted-foreground text-[11px] tabular-nums">
                {step.position}/{step.count}
              </span>
              <span className="truncate">· {step.item.label}</span>
            </span>
            {step.item.gate && <Flag className={step.item.waiting ? "text-amber-600" : "text-muted-foreground"} />}
            <ChevronDown data-icon="inline-end" />
            <span className="absolute inset-x-1 bottom-0.5 flex">
              <TrackProgress item={step.item} animate={false} />
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent aria-label={label} className="w-56 motion-reduce:animate-none" collisionPadding={8}>
          <DropdownMenuRadioGroup value={step.item.key} onValueChange={onView}>
            {items.map((item) => (
              <DropdownMenuRadioItem key={item.key} value={item.key} disabled={!item.available} className="min-h-8">
                <span className="min-w-0 flex-1 truncate">{item.fullLabel ?? item.label}</span>
                {item.gate && (
                  <Flag
                    aria-label="Review stop"
                    className={item.waiting ? "text-amber-600" : "text-muted-foreground"}
                  />
                )}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function RunTrack({
  items,
  currentKey,
  viewKey,
  onView,
  label,
  minimumWidth = 620,
  minimumItemWidth = 104,
  inline = false,
}: {
  items: TrackItem[];
  currentKey?: string | null;
  viewKey: string | null;
  onView(key: string): void;
  label: string;
  minimumWidth?: number;
  minimumItemWidth?: number;
  inline?: boolean;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const underline = useId();
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    const container = scroller.current;
    const key = inline ? (viewKey ?? currentKey) : currentKey;
    const item = key && container?.querySelector<HTMLElement>(`[data-track="${CSS.escape(key)}"]`);
    if (!container?.clientWidth || !item) return;
    const target = item.getBoundingClientRect();
    const frame = container.getBoundingClientRect();
    if (!inline || target.left < frame.left || target.right > frame.right) {
      container.scrollTo({
        left: container.scrollLeft + target.left - frame.left + (target.width - frame.width) / 2,
        behavior: reducedMotion ? "instant" : "smooth",
      });
    }
  }, [currentKey, inline, reducedMotion, viewKey]);
  return (
    <>
      {inline && <CompactTrack items={items} currentKey={currentKey} viewKey={viewKey} label={label} onView={onView} />}
      <div
        ref={scroller}
        data-inline-steps={inline ? "" : undefined}
        className={cn(
          "overflow-x-auto overflow-y-hidden",
          inline ? "@container hidden [scrollbar-width:thin] sm:block" : "border-b px-4 pt-3 pb-3.5 md:px-5",
        )}
      >
        <ol
          aria-label={label}
          className={cn("flex gap-1.5", inline && "w-max min-w-full px-1 pt-1 pb-2")}
          style={inline ? undefined : { minWidth: Math.max(minimumWidth, items.length * minimumItemWidth) }}
        >
          {items.map((item) => {
            const { key, label, past, live, waiting, available, gate } = item;
            const viewing = key === viewKey;
            return (
              <motion.li
                key={key}
                layout
                data-track={key}
                initial={reducedMotion || inline ? false : { opacity: 0, flexGrow: 0.001 }}
                animate={{ opacity: 1, flexGrow: 1 }}
                transition={{ duration: 0.6, ease: RUN_EASE }}
                className={cn("relative min-w-0", inline ? "basis-auto" : "basis-0")}
              >
                <button
                  type="button"
                  disabled={!available}
                  onClick={() => onView(key)}
                  aria-current={viewing ? "step" : undefined}
                  title={inline ? item.fullLabel : undefined}
                  className="flex w-full flex-col gap-1.5 rounded py-0.5 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default"
                >
                  <span
                    className={cn(
                      "flex items-center gap-1.5 truncate font-medium text-xs transition-colors",
                      inline ? "pr-2" : "pr-3",
                      inline && gate && "pr-4",
                      past || live || viewing ? "text-foreground" : "text-muted-foreground",
                      viewing && "font-semibold",
                    )}
                  >
                    {inline && item.fullLabel ? (
                      <>
                        <span className="@min-[76rem]:hidden">{label}</span>
                        <span className="hidden @min-[76rem]:inline">{item.fullLabel}</span>
                      </>
                    ) : (
                      label
                    )}
                  </span>
                  <TrackProgress item={item} animate={!reducedMotion} />
                </button>
                {gate && (
                  <span
                    title="Stops for you here"
                    className={cn(
                      "absolute z-10 grid place-items-center rounded-full bg-background",
                      inline ? "right-0 bottom-[-3px] size-3.5" : "-right-2 bottom-[-5px] size-[18px]",
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
                    className={cn(
                      "absolute inset-x-0 h-0.5 rounded-full bg-foreground",
                      inline ? "right-1 -bottom-1.5" : "right-3 -bottom-3.5",
                    )}
                  />
                )}
              </motion.li>
            );
          })}
        </ol>
      </div>
    </>
  );
}
