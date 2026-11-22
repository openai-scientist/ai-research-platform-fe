"use client";
"use no memo";

/* ===== The ledger's two ways in, and what it holds against the package: the values by kind and the references by
   status as chips that narrow the ledger to what they count, and the values that conflict with the package, each held
   until the one who owns it settles it. The chips stand from the start and fill their counts as the ledger streams. */

import { Skeleton } from "@/components/ui/skeleton";

import { cn, Icon } from "../lib";
import { cap } from "./gather-data";
import { SWATCH, type Swatch } from "./stage-visual";
import { Term } from "./term";

/* ---------- the chips that narrow the ledger ---------- */
export interface Chip {
  key: string;
  name: string;
  /** How many it counts so far. */
  n: number;
  /** A reference's status in the one colour system; a kind of value has none. */
  swatch?: Exclude<Swatch, "accent">;
  /** The glossary term that defines it. */
  term?: string;
  /** What it is, in a few words, on hover. */
  tip: string;
}
function ChipRow({
  title,
  chips,
  active,
  onPick,
}: {
  title: string;
  chips: Chip[] | null;
  active: string | null;
  onPick(key: string): void;
}) {
  return (
    <div className="grid gap-x-4 gap-y-1.5 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:items-baseline">
      <span className="font-medium text-[12.5px] text-muted-foreground">{title}</span>
      {chips ? (
        <ul className="flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <li key={c.key}>
              <button
                type="button"
                onClick={() => onPick(c.key)}
                aria-pressed={active === c.key}
                title={c.tip}
                className={cn(
                  "inline-flex h-7 items-center gap-1.5 rounded-md bg-muted/40 px-2.5 text-[12.5px] outline-none ring-1 ring-foreground/10 transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
                  active === c.key && "bg-muted ring-2 ring-foreground/40",
                )}
              >
                {c.swatch && <span aria-hidden="true" className={cn("size-2.5 rounded-[3px]", SWATCH[c.swatch].bg)} />}
                <span>{c.name}</span>
                <b className="font-semibold tabular-nums">{c.n}</b>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <span aria-hidden="true" className="flex gap-1.5">
          {[16, 20, 14, 18].map((w) => (
            <Skeleton key={w} style={{ width: w * 4 }} className="h-7 animate-none rounded-md" />
          ))}
        </span>
      )}
    </div>
  );
}
/** The ledger's two ways in: a kind of value of the package, or a status of the research record's references. */
export function NarrowBar({
  values,
  refs,
  active,
  onValues,
  onRefs,
}: {
  values: Chip[] | null;
  refs: Chip[] | null;
  /** The chip the ledger is narrowed to, if any. */
  active: string | null;
  onValues(family: string): void;
  onRefs(group: string): void;
}) {
  return (
    <div className="flex flex-col gap-2.5 border-b bg-muted/20 px-4 py-3.5 sm:px-5">
      <ChipRow title="Values, by kind" chips={values} active={active} onPick={onValues} />
      <ChipRow title="Sources, by status" chips={refs} active={active} onPick={onRefs} />
      {refs?.some((r) => r.term) && (
        <p className="flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-muted-foreground sm:pl-[9.5rem]">
          {refs
            .filter((r) => r.term)
            .map((r) => (
              <Term key={r.key} t={r.term as string}>
                What “{r.name.toLowerCase()}” means
              </Term>
            ))}
        </p>
      )}
    </div>
  );
}

/** A value of the ledger that conflicts with the package: held until the one who owns it settles it. */
export interface Conflict {
  id: string;
  why: string;
  owner?: string;
}
/** The values that conflict with the package, one callout each: held until the one who owns it settles it. */
export function ConflictList({ conflicts, onConflict }: { conflicts: Conflict[]; onConflict(id: string): void }) {
  return (
    <>
      {conflicts.map((c) => (
        <div
          key={c.id}
          data-conflict
          className="grid scroll-mt-4 grid-cols-[1rem_minmax(0,1fr)] gap-2.5 rounded-lg bg-rose-50/60 p-3 ring-1 ring-rose-500/40 ring-inset dark:bg-rose-950/20"
        >
          <Icon n="ban" className="mt-0.5 size-4 text-rose-600 dark:text-rose-400" />
          <div className="min-w-0">
            <b className="block font-medium text-[13.5px] leading-snug">
              Value <span className="font-mono">{c.id}</span> conflicts with the package
            </b>
            <p className="mt-0.5 text-pretty text-[13px] text-muted-foreground leading-snug">
              {cap(c.why).replace(/\.?$/, ".")}
            </p>
            <p className="mt-1.5 text-xs">
              <span className="text-rose-700 dark:text-rose-300">
                Not printed until {c.owner ? `the ${c.owner} team settles it` : "it is settled"}
              </span>
              {" · "}
              <button
                type="button"
                onClick={() => onConflict(c.id)}
                className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                Show the record
              </button>
            </p>
          </div>
        </div>
      ))}
    </>
  );
}
