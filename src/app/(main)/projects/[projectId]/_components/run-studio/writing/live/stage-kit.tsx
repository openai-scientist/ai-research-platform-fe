"use client";
"use no memo";

/* ===== The shared parts of every stage screen, so a newcomer reads each the same way =====
   One colour meaning across the screens: green, it holds or passed; amber, look at it or it is written with care; red,
   blocked or failed; grey, not claimed. Teal and violet belong to the two branches only. The screen opens on its key
   result (what the stage found, in numbers a reader can check, and what it becomes in the paper); the detail behind it
   is folded and opens on a click. */

import { type ReactNode, useState } from "react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

import { cn, Icon } from "../lib";
import { Bars, CARD } from "./outline-kit";

export type Tone = "ok" | "look" | "bad" | "none";
/** The one meaning of each colour, for text, a soft fill and a dot. */
export const TONE: Record<Tone, { text: string; soft: string; dot: string }> = {
  ok: {
    text: "text-emerald-700 dark:text-emerald-300",
    soft: "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100",
    dot: "bg-emerald-500",
  },
  look: {
    text: "text-amber-700 dark:text-amber-300",
    soft: "bg-amber-50 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100",
    dot: "bg-amber-500",
  },
  bad: {
    text: "text-rose-700 dark:text-rose-300",
    soft: "bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-100",
    dot: "bg-rose-500",
  },
  none: { text: "text-muted-foreground", soft: "bg-muted text-muted-foreground", dot: "bg-foreground/25" },
};

export interface Figure {
  /** The number or word, as large as the card allows. */
  value: ReactNode;
  label: string;
  /** One short line under it: what the number means. */
  hint?: string;
  tone?: Tone;
}
export interface PaperEffect {
  /** What it is about, by its plain name first (the id second, in brackets). */
  item: string;
  /** What it becomes in the paper. */
  effect: string;
  tone?: Tone;
}

/**
 * The key result of a stage: the few figures that say what it found, the one sentence that says what it means, and
 * what it becomes in the paper. `ready`: the stage's files are in; before, the card stands as a calm skeleton.
 */
export function KeyResult({
  ready,
  headline,
  figures,
  effects = [],
  children,
}: {
  ready: boolean;
  headline?: ReactNode;
  figures: Figure[];
  effects?: PaperEffect[];
  children?: ReactNode;
}) {
  return (
    <section data-key-result className={cn(CARD, "scroll-mt-4")}>
      <header className="flex items-center gap-2 border-b px-4 py-2.5 sm:px-5">
        <Icon n="target" className="size-4 text-muted-foreground" />
        <h3 className="font-semibold text-[15px]">Key result</h3>
      </header>
      <div className="flex flex-col gap-4 px-4 py-4 sm:px-5">
        {ready && headline && (
          <p className="max-w-[72ch] text-pretty font-medium text-[15px] leading-snug">{headline}</p>
        )}
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-[repeat(auto-fit,minmax(9rem,1fr))]">
          {figures.map((f) => (
            <div key={f.label} className="flex min-w-0 flex-col gap-0.5">
              <dt className="text-muted-foreground text-xs">{f.label}</dt>
              <dd
                className={cn(
                  "font-semibold text-2xl tabular-nums leading-tight",
                  ready ? TONE[f.tone ?? "none"].text : "",
                  ready && !f.tone && "text-foreground",
                )}
              >
                {ready ? f.value : <Bars n={1} last="w-12" className="py-2" />}
              </dd>
              {ready && f.hint && <dd className="text-pretty text-muted-foreground text-xs leading-snug">{f.hint}</dd>}
            </div>
          ))}
        </dl>
        {ready && children}
        {ready && effects.length > 0 && (
          <div className="flex flex-col gap-1.5 rounded-lg bg-muted/60 px-3.5 py-3">
            <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">In the paper</span>
            <ul className="flex flex-col gap-1">
              {effects.map((e) => (
                <li
                  key={`${e.item}:${e.effect}`}
                  className="grid grid-cols-[0.5rem_minmax(0,1fr)] gap-2.5 text-[13.5px] leading-snug"
                >
                  <span className={cn("mt-1.5 size-2 rounded-full", TONE[e.tone ?? "none"].dot)} />
                  <span className="text-pretty">
                    <b className="font-medium">{e.item}</b> {e.effect}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * The detail behind the key result, folded: a title, a line on what it holds and a count; it opens on a click, and a
 * stage that streams into it opens it while it plays (`open`).
 */
export function Details({
  title,
  hint,
  aside,
  open,
  children,
  className,
}: {
  title: string;
  hint?: string;
  aside?: ReactNode;
  open?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const [mine, setMine] = useState(false);
  // Open while its stage plays, or once you open it: either one is enough.
  const isOpen = open === true || mine;
  return (
    <Collapsible open={isOpen} onOpenChange={setMine}>
      <section className={cn(CARD, className)}>
        <CollapsibleTrigger className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left outline-none hover:bg-muted/40 focus-visible:bg-muted/40 sm:px-5">
          <Icon
            n="down"
            className={cn("size-4 shrink-0 text-muted-foreground transition-transform", !isOpen && "-rotate-90")}
          />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="font-semibold text-sm">{title}</span>
            {hint && <span className="text-pretty text-muted-foreground text-xs">{hint}</span>}
          </span>
          {aside != null && <span className="shrink-0 text-muted-foreground text-xs tabular-nums">{aside}</span>}
        </CollapsibleTrigger>
        <CollapsibleContent className="border-t">{children}</CollapsibleContent>
      </section>
    </Collapsible>
  );
}

/** A status as a small pill in the one colour system, its word plain. */
export function StatusPill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1.5 whitespace-nowrap rounded-full px-2 font-medium text-[11.5px]",
        TONE[tone].soft,
      )}
    >
      <span className={cn("size-1.5 rounded-full", TONE[tone].dot)} />
      {children}
    </span>
  );
}
