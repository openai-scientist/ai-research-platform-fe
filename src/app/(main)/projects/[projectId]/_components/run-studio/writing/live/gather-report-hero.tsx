"use client";
"use no memo";

/* ===== The claim ceiling as a picture: the frame's claim verbs, weakest first, with the ceiling marked. The verbs up
   to it may be written, the ceiling itself with care, and the stronger ones never. ===== */

import { cn, Icon } from "../lib";
import { LADDER, listed } from "./gather-data";
import { SubHead } from "./stage-visual";

/* Each step of the ladder in the one colour meaning: allowed holds, the ceiling is to write with care, past it never. */
const STEP = {
  allowed: {
    bar: "bg-emerald-400 dark:bg-emerald-500",
    box: "ring-foreground/10",
    icon: "check",
    ic: "text-emerald-600 dark:text-emerald-400",
    word: "Allowed",
  },
  ceiling: {
    bar: "bg-amber-500 dark:bg-amber-400",
    box: "bg-amber-50 ring-amber-500/50 dark:bg-amber-950/30 dark:ring-amber-400/40",
    icon: "alert",
    ic: "text-amber-600 dark:text-amber-400",
    word: "The ceiling",
  },
  never: {
    bar: "bg-stone-300 dark:bg-stone-600",
    box: "ring-foreground/10",
    icon: "ban",
    ic: "text-muted-foreground",
    word: "Never used",
  },
};

export function CeilingLadder({ strength }: { strength: string }) {
  const at = LADDER.findIndex((r) => r.k === strength);
  return (
    <div className="flex flex-col gap-2.5">
      <SubHead
        title="Claim verbs, weakest first"
        tells="A finding may use any verb up to the ceiling; the stronger ones are never written."
      />
      <ol
        aria-label={`The frame's claim verbs, weakest first: ${LADDER.map((r) => r.verb).join(", ")}. ${
          at >= 0
            ? `The ceiling is “${LADDER[at].verb}”${at < LADDER.length - 1 ? `; ${listed(LADDER.slice(at + 1).map((r) => `“${r.verb}”`))} never used` : ""}.`
            : "The record is blocked: no claim verb is allowed."
        }`}
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
      >
        {LADDER.map((r, i) => {
          const s = i === at ? STEP.ceiling : i > at ? STEP.never : STEP.allowed;
          const past = i > at;
          return (
            <li
              key={r.k}
              className={cn("flex min-w-0 flex-col gap-1.5 rounded-lg px-3 pt-2.5 pb-3 ring-1 ring-inset", s.box)}
            >
              <span aria-hidden="true" className={cn("h-1.5 rounded-full", s.bar)} />
              <span className="flex items-center justify-between gap-2">
                <b className={cn("font-semibold text-[15px]", past && "text-muted-foreground line-through")}>
                  {r.verb}
                </b>
                <span className="inline-flex items-center gap-1 text-[12px] text-muted-foreground">
                  <Icon n={s.icon} className={cn("size-3.5", s.ic)} />
                  {s.word}
                </span>
              </span>
              <span className="text-pretty text-[12.5px] text-muted-foreground leading-snug">{r.words}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
