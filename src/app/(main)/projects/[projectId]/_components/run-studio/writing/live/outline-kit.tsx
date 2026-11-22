"use client";
"use no memo";

/* ===== The look the outline screen shares with the other screens: its cards and heads, skeleton bars, a statement
   as a chip with its words on hover, and the scroll to what a click opened ===== */

import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Skeleton as Bar } from "@/components/ui/skeleton";

import { afterPaint, cn, Icon, RM } from "../lib";
import { typeChip, typeOf, wordsOf } from "./outline-data";
import { statement } from "./run";

/* ---------- the shared look of the outline screens, as the other screens have it ---------- */
/** A card: neutral, a state shown by its icon and at most a 1 px ring. */
export const CARD = "min-w-0 overflow-hidden rounded-xl bg-card text-card-foreground ring-1 ring-foreground/10";
/** The serif face of words as the paper will print them. */
export const SERIF = "font-(family-name:--font-lora)";
/** The work beside a side column that stays in view, scrolling on its own when it is the longer. */
export const COLUMNS = "grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]";
export const SIDE =
  "flex min-w-0 flex-col gap-2.5 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-11rem)] lg:-m-1 lg:overflow-y-auto lg:overscroll-contain lg:p-1 lg:[scrollbar-width:thin]";
/** A card's head: its icon and title, one plain line on what it is for, and its counts or state on the right. */
export function SectionHead({
  icon,
  title,
  purpose,
  aside,
  className,
}: {
  icon: string;
  title: ReactNode;
  purpose?: ReactNode;
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-wrap items-start gap-x-2.5 gap-y-2 border-b px-4 py-3", className)}>
      <Icon n={icon} className="mt-[3px] size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1 basis-48">
        <h3 className="font-semibold text-[15px] leading-[22px]">{title}</h3>
        {purpose && <p className="text-pretty text-muted-foreground text-xs leading-snug">{purpose}</p>}
      </div>
      {aside != null && (
        <div className="ml-auto flex shrink-0 items-center gap-2 text-muted-foreground text-xs tabular-nums">
          {aside}
        </div>
      )}
    </header>
  );
}
/** Skeleton bars standing where text will be, a calm placeholder of about its height. */
export function Bars({ n, last = "w-2/5", className }: { n: number; last?: string; className?: string }) {
  return (
    <span aria-hidden="true" className={cn("flex flex-col gap-2 py-1", className)}>
      {Array.from({ length: n }, (_, i) => (
        <Bar
          // biome-ignore lint/suspicious/noArrayIndexKey: placeholder bars never reorder
          key={i}
          className={cn("h-2.5 animate-none rounded-full", i === n - 1 ? last : "w-full")}
        />
      ))}
    </span>
  );
}

/** A statement as a chip of its type's colour: its words and status on hover, `onPick` on click. */
export function StatementChip({
  id,
  onPick,
  note,
  className,
}: {
  id: string;
  onPick?: () => void;
  /** A line under its words on hover, such as the section it is placed in. */
  note?: ReactNode;
  className?: string;
}) {
  const type = typeOf(id);
  const chip = typeChip(type ?? "");
  const st = statement(id);
  return (
    <HoverCard openDelay={120} closeDelay={60}>
      <HoverCardTrigger asChild>
        <Badge asChild className={cn("font-mono", chip.chip, className)}>
          <button
            type="button"
            onClick={onPick}
            aria-label={`${chip.name} ${id}${onPick ? ": show it" : ""}`}
            className={cn("outline-none", onPick ? "cursor-pointer" : "cursor-default")}
          >
            {id}
          </button>
        </Badge>
      </HoverCardTrigger>
      <HoverCardContent side="top" className="w-80 p-3">
        <span className="flex flex-wrap items-center gap-1.5 text-xs">
          <Badge className={cn("font-mono", chip.chip)}>{id}</Badge>
          <span className="text-muted-foreground">
            {chip.name}
            {st?.status ? ` · ${st.status.replace(/_/g, " ")}` : ""}
          </span>
        </span>
        <p className="mt-1.5 text-pretty text-[13px] leading-snug">
          {wordsOf(id) ?? <span className="text-muted-foreground">Not in the frozen graph</span>}
        </p>
        {note && <p className="mt-1.5 text-muted-foreground text-xs">{note}</p>}
      </HoverCardContent>
    </HoverCard>
  );
}

/**
 * Scrolls to what a click opened: once it is drawn, and again once a fold has finished opening (while it opens, the
 * page is not yet tall enough to bring it into view).
 */
export function scrollSoon(sel: string, block: ScrollLogicalPosition = "start") {
  const go = () => document.querySelector(sel)?.scrollIntoView({ behavior: RM() ? "auto" : "smooth", block });
  afterPaint(go);
  setTimeout(go, 320);
}
