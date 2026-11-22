"use client";
"use no memo";

/* ===== What the three data screens of a live run share: typing on a time budget, label rows, cards and their heroes ===== */

import { type ComponentProps, type ReactNode, type RefObject, useEffect, useState } from "react";

import { Caret } from "../../run-bits";
import { useTyping } from "../../scenes/scene-ui";
import { S, TYPE_CPS } from "../engine";
import { cn, Icon, RM } from "../lib";
import { Details, type Tone as KeyTone, StatusPill } from "./stage-kit";

/* ---------- the one colour meaning, for the statuses these screens read from their files ---------- */
/** A status of the files (ok, warn, bad, na) in the one colour meaning: holds, look at it, blocked, not claimed. */
export const keyTone = (k: string): KeyTone =>
  k === "ok" ? "ok" : k === "bad" ? "bad" : k === "warn" ? "look" : "none";
/** A status as a pill of the one colour meaning. */
export function Pill({ k, children }: { k: string; children: ReactNode }) {
  return <StatusPill tone={keyTone(k)}>{children}</StatusPill>;
}
/** A folded detail the screen can open by its name (a click elsewhere that shows what it holds). */
export function Fold({ name, ...props }: ComponentProps<typeof Details> & { name: string }) {
  return (
    <div data-fold={name} className="scroll-mt-4">
      <Details {...props} />
    </div>
  );
}
/** Opens a fold if it is closed, as a click on its head would; the reader closes it again the same way. */
export function openFold(name: string) {
  const head = document.querySelector<HTMLElement>(`[data-fold="${name}"] [data-slot="collapsible-trigger"]`);
  if (head?.getAttribute("aria-expanded") === "false") head.click();
}

/**
 * How fast a text is typed so it is done in `ms`: never slower than an agent types. A record's sentences are long;
 * typing each at the preview's pace would hold a stage for minutes, so a long one is typed faster, in the same time.
 */
export const paceFor = (text: string, ms: number) => Math.max(TYPE_CPS, (text.length / Math.max(ms, 1)) * 1000);

/**
 * Text written into a scene while its item streams (`on`): typed out at `cps`, the whole text keeping its room
 * underneath so a row never grows while it is typed. Otherwise it shows whole.
 */
export function LiveTyped({
  text,
  on,
  cps = TYPE_CPS,
  after = 0,
}: {
  text: string;
  on: boolean;
  cps?: number;
  after?: number;
}) {
  return on ? <Typing key={text} text={text} cps={cps} after={after} /> : text;
}
function Typing({ text, cps, after }: { text: string; cps: number; after: number }) {
  const n = Math.max(0, useTyping(text, after + text.length, true, cps * S.speed) - after);
  if (n >= text.length) return text;
  return (
    <span className="grid">
      <span aria-hidden="true" className="invisible col-start-1 row-start-1">
        {text}
      </span>
      <span className="col-start-1 row-start-1">
        {text.slice(0, n)}
        {n > 0 && <Caret />}
      </span>
    </span>
  );
}

/* A label and its value. */
export function Fact({ k, children, wide }: { k: string; children: ReactNode; wide?: boolean }) {
  return (
    <div
      className={cn(
        "grid gap-3 py-1.5 text-[13px] leading-snug first:pt-0 last:pb-0",
        wide ? "grid-cols-[7.5rem_minmax(0,1fr)]" : "grid-cols-[7rem_minmax(0,1fr)]",
        "max-sm:grid-cols-1 max-sm:gap-0.5",
      )}
    >
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}
export function SubHead({ children }: { children: ReactNode }) {
  return <h4 className="mt-4 mb-1.5 font-medium text-muted-foreground text-xs first:mt-0">{children}</h4>;
}

/** The serif face the research run gives its key statements. */
export const SERIF = "font-(family-name:--font-lora)";

/** A count kept in the run's state while a stage plays: the item being worked on now, by list. */
export const at = (list: string) => S.n[list] ?? 0;

/* ---------- the one layout of the screens: the outcome first, then the work beside a side column in view ---------- */
/** The work and a side column that stays in view (it scrolls on its own when it is the longer). */
export const COLUMNS = "grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]";
export const SIDE =
  "flex min-w-0 flex-col gap-4 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-11rem)] lg:-m-1 lg:overflow-y-auto lg:overscroll-contain lg:p-1 lg:[scrollbar-width:thin] [&>*]:shrink-0";
/** A card of the screens: neutral, a state shown by its icon and at most a 1 px ring. */
export const CARD = "min-w-0 overflow-hidden rounded-xl bg-card text-card-foreground ring-1 ring-foreground/10";

/** A section's header: its icon and title, one plain line of what it is for, and its counts or filters on the right. */
export function SectionHead({
  icon,
  title,
  purpose,
  aside,
  className,
  big,
}: {
  icon: string;
  title: ReactNode;
  purpose?: ReactNode;
  aside?: ReactNode;
  className?: string;
  /** A card's title rather than a section's: 15 px. */
  big?: boolean;
}) {
  return (
    <header className={cn("flex flex-wrap items-start gap-x-2.5 gap-y-2 border-b px-4 py-3", className)}>
      <Icon n={icon} className={cn("mt-0.5 size-4 shrink-0 text-muted-foreground", big && "mt-[3px]")} />
      <div className="min-w-0 flex-1 basis-48">
        <h3 className={cn("font-semibold leading-5", big ? "text-[15px] leading-[22px]" : "text-sm")}>{title}</h3>
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

/* ---------- long tables: every row there, scrolling inside a frame of fixed height ---------- */
/**
 * Put on the element that holds a kit Table: the table scrolls inside its card at a fixed height (shorter on a phone)
 * rather than hiding rows behind "Show all". Pair with STICKY_HEAD on its TableHeader.
 */
export const SCROLL_TABLE =
  "[&>[data-slot=table-container]]:max-h-[28rem] sm:[&>[data-slot=table-container]]:max-h-[38rem] [&>[data-slot=table-container]]:overflow-y-auto [&>[data-slot=table-container]]:overscroll-contain [&>[data-slot=table-container]]:[scrollbar-width:thin]";
/** A table's header that stays in view while its rows scroll, its rule drawn as a shadow so it scrolls along. */
export const STICKY_HEAD = "sticky top-0 z-10 bg-card shadow-[inset_0_-1px_0_var(--color-border)]";
/**
 * While a stage streams into a scrolling table, keeps the row being written (`sel`) in view inside the table's own
 * frame, without moving the page.
 */
export function useFollowRow(wrap: RefObject<HTMLElement | null>, sel: string | null) {
  useEffect(() => {
    if (!sel) return;
    const box = wrap.current?.querySelector<HTMLElement>("[data-slot=table-container]");
    const row = box?.querySelector<HTMLElement>(sel);
    if (!box || !row) return;
    const a = row.getBoundingClientRect();
    const b = box.getBoundingClientRect();
    if (a.top >= b.top + 40 && a.bottom <= b.bottom) return;
    box.scrollTo({ top: box.scrollTop + a.top - b.top - box.clientHeight / 3, behavior: RM() ? "auto" : "smooth" });
  }, [wrap, sel]);
}

/** The width of an element, kept as it resizes: a chart decides from it which labels fit. */
export function useWidth(ref: RefObject<HTMLElement | null>) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    setW(el.clientWidth);
    return () => ro.disconnect();
  }, [ref]);
  return w;
}
