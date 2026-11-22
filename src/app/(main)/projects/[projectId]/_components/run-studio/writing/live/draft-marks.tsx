"use client";
"use no memo";

/* ===== A mark of a written sentence as the paper prints it: a ledger value (its row on hover), an exhibit by its
   number, a source by its key ===== */

import type { Piece } from "./draft-data";
import { exhibitTitle, labelOf, sourceOf } from "./outline-data";
import { citeName } from "./outline-paper";
import { printed } from "./run";

export function Mark({ p, nums }: { p: Piece; nums: Record<string, string> }) {
  if (p.k === "text") return p.text;
  if (p.k === "value") {
    const label = labelOf(p.key);
    const text = printed(p.key, p.form);
    // A mark the ledger does not hold prints as the key: shown so, never as a value.
    if (text === p.key)
      return (
        <span title="Not in the evidence ledger" className="font-mono text-[12px] text-amber-700 dark:text-amber-300">
          {`{{${p.key}}}`}
        </span>
      );
    return (
      <span
        title={label ? `${label} · ${p.key}` : p.key}
        className="rounded-[3px] bg-emerald-500/10 px-0.5 text-emerald-900 decoration-emerald-600/40 dark:text-emerald-100"
      >
        {text}
      </span>
    );
  }
  // What only the authors can supply: the draft leaves it to them, in plain view.
  if (p.k === "author")
    return (
      <span className="rounded-[3px] bg-amber-500/12 px-1 font-sans text-[12.5px] text-amber-800 dark:text-amber-300">
        To be completed by the authors: {p.text}
      </span>
    );
  if (p.k === "exhibit")
    return (
      <span title={exhibitTitle(p.key)} className="text-sky-800 dark:text-sky-200">
        {nums[p.key] ?? exhibitTitle(p.key)}
      </span>
    );
  return (
    <span className="font-sans text-[12px] text-cyan-700 dark:text-cyan-300">
      [
      {p.keys.map((k, i) => (
        <span key={k} title={sourceOf(k)?.title || k}>
          {i > 0 && "; "}
          {citeName(k)}
        </span>
      ))}
      ]
    </span>
  );
}
