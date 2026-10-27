"use client";
"use no memo";

// The writing run keeps its state in module variables (engine.ts) and re-renders on emit(); the React Compiler
// would memoise these components on their props and never show a change.
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

import { COVER_CELLS, COVER_COLS, COVER_ROWS, LEDGER, LEDGER_COL, NUM_ROWS, READY_WHY, RECHECK } from "./data/gather";
import { S } from "./engine";
import { cn, Icon, M, useMedia } from "./lib";

/* ===== Gather hero: the evidence coverage matrix ===== */
/* ---------- S01 hero · coverage: which source can carry which part of the paper ---------- */
export const COVER_KIND: Record<string, { cell: string; swatch: string; label: string }> = {
  num: {
    cell: "bg-teal-500/12 text-teal-800 dark:text-teal-300",
    swatch: "bg-teal-500/40",
    label: "Number",
  },
  quote: {
    cell: "bg-indigo-500/12 text-indigo-700 dark:text-indigo-300",
    swatch: "bg-indigo-500/40",
    label: "Quote",
  },
  cite: {
    cell: "bg-amber-500/8 text-amber-800 ring-1 ring-amber-500/50 ring-inset dark:text-amber-300",
    swatch: "ring-1 ring-amber-500 ring-inset",
    label: "Cite only",
  },
  gap: {
    cell: "border border-rose-500/60 border-dashed bg-rose-500/5 text-rose-700 dark:text-rose-300",
    swatch: "border border-rose-500 border-dashed",
    label: "Missing",
  },
};
/** A number whose value was recomputed from the traces: the cell fills in. */
const CHECKED_CELL = "bg-teal-600 text-white dark:bg-teal-500 dark:text-teal-950";

export function coverState() {
  const e = S.ev;
  const at = (rows: number) => Math.ceil((rows / LEDGER.length) * COVER_CELLS.length);
  const shown = at(e.rows);
  const vis = new Set(COVER_CELLS.slice(0, shown).map((c) => `${c.ri}:${c.col}`));
  const checked = new Set(NUM_ROWS.slice(0, e.recomp).map((id) => LEDGER_COL[id]));
  if (e.recomp >= NUM_ROWS.length) checked.add("dis");
  return {
    shown,
    /** How many cells were on screen before the last batch: the new ones enter one after another from here. */
    before: at(Math.max(0, e.rows - 1)),
    vis,
    checked,
    decided: (ci: number) => ci < e.ready,
    blocked: e.ready > COVER_COLS.findIndex((c) => c.k === "r4"),
  };
}
/** One cell: how many spans a source gives a section, in the colour of what kind of evidence it is. */
function CoverCount({
  n,
  k,
  checked,
  delay,
  picked,
}: {
  n: number;
  k: string;
  checked: boolean;
  delay: number;
  picked: boolean;
}) {
  return (
    <M
      as="span"
      in="fade"
      dur={260}
      delay={delay}
      className={cn(
        "inline-flex h-6 min-w-7 items-center justify-center gap-0.5 rounded-md px-1 font-medium font-mono text-[11px] tabular-nums transition-colors duration-500 sm:h-7 sm:min-w-9 sm:px-1.5",
        checked ? CHECKED_CELL : COVER_KIND[k].cell,
        picked && "ring-2 ring-foreground/40 ring-offset-1 ring-offset-card",
      )}
    >
      {k === "gap" ? (
        <Icon n="x" className="size-3" sw={2.5} />
      ) : (
        <>
          {checked && <Icon n="check" className="size-2.5 max-sm:hidden" sw={3} />}
          {n}
        </>
      )}
    </M>
  );
}
/** A cell of the coverage matrix: a source (row) and a section (column). */
export interface CoverCell {
  ri: number;
  col: string;
}
export function CoverageMatrix({
  live,
  cell,
  onCell,
}: {
  live: boolean;
  cell: CoverCell | null;
  onCell(cell: CoverCell | null): void;
}) {
  const st = S.st.S02;
  const narrow = useMedia("(max-width: 639px)");
  const [hov, setHov] = useState<CoverCell | null>(null);
  const cs = coverState();
  const indexing = live && st.cur === "b2" && st.status === "running";
  const sweep = indexing && cs.shown ? COVER_CELLS[Math.min(cs.shown, COVER_CELLS.length) - 1].col : null;
  const cols = narrow
    ? `minmax(76px,1.2fr) repeat(8,minmax(30px,1fr))`
    : `minmax(132px,1.7fr) repeat(8,minmax(40px,1fr)) 36px`;
  const total = (k: string) => COVER_ROWS.reduce((s, r, ri) => s + (cs.vis.has(`${ri}:${k}`) ? r.c[k] : 0), 0);
  const rowTotal = (r: (typeof COVER_ROWS)[number], ri: number) =>
    COVER_COLS.reduce((s, c) => s + (cs.vis.has(`${ri}:${c.k}`) ? (r.c[c.k] ?? 0) : 0), 0);
  const focus = hov ?? cell;
  const blockedCol = (k: string) => k === "r4" && cs.blocked;
  // The column being indexed, the blocked column and the row and column under the pointer take a quiet tint.
  const tint = (k: string, ri?: number) =>
    cn(
      "transition-colors duration-300",
      blockedCol(k) && "bg-rose-500/[0.05]",
      k === sweep && "bg-sky-500/[0.06]",
      focus && (focus.col === k || (ri != null && focus.ri === ri)) && "bg-muted/60",
    );
  const order = (ri: number, k: string) => COVER_CELLS.findIndex((c) => c.ri === ri && c.col === k);
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: clears a hover highlight; the cells are buttons and take focus themselves
    <div data-matrix className="overflow-x-auto" onMouseLeave={() => setHov(null)}>
      <table
        className="grid min-w-[316px]"
        style={{ gridTemplateColumns: cols }}
        aria-label="Evidence spans by source and section"
      >
        <thead className="contents">
          <tr className="contents">
            <th
              scope="col"
              className="flex items-end pb-2 pl-1 font-medium text-[10.5px] text-muted-foreground uppercase tracking-wide"
            >
              Source
            </th>
            {COVER_COLS.map((c) => (
              <th
                key={c.k}
                scope="col"
                title={c.full}
                data-cursor={`col:${c.k}`}
                className={cn("flex flex-col items-center justify-end rounded-t-md pt-1.5 pb-2 font-normal", tint(c.k))}
              >
                <span
                  className={cn(
                    "font-medium text-[11px] sm:text-[12px]",
                    blockedCol(c.k) ? "text-rose-700 dark:text-rose-300" : "text-foreground",
                  )}
                >
                  {narrow ? c.s : c.n}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                  {total(c.k) || (c.k === "r4" && cs.vis.has(`10:r4`) ? "0" : "–")}
                </span>
              </th>
            ))}
            {!narrow && (
              <th
                scope="col"
                className="flex items-end justify-end pr-1 pb-2 font-medium text-[10.5px] text-muted-foreground uppercase tracking-wide"
              >
                All
              </th>
            )}
          </tr>
        </thead>
        <tbody className="contents">
          {COVER_ROWS.map((r, ri) => (
            <tr key={r.src} className="contents">
              <th
                scope="row"
                className={cn(
                  "flex min-w-0 flex-col justify-center border-t py-1 pr-2 pl-1 text-left font-normal",
                  focus && focus.ri === ri && "bg-muted/60",
                  "transition-colors duration-300",
                )}
              >
                <b
                  className={cn(
                    "block truncate font-medium text-[11.5px] sm:text-[12.5px]",
                    r.k === "gap" && "text-rose-700 dark:text-rose-300",
                    r.k === "cite" && "text-amber-800 dark:text-amber-300",
                  )}
                  title={r.src}
                >
                  {narrow ? r.short : r.src}
                </b>
                {!narrow && <span className="block truncate text-[10.5px] text-muted-foreground">{r.sub}</span>}
              </th>
              {COVER_COLS.map((c) => {
                const has = c.k in r.c;
                const on = has && cs.vis.has(`${ri}:${c.k}`);
                const picked = Boolean(cell && cell.ri === ri && cell.col === c.k);
                const i = order(ri, c.k);
                return (
                  <td key={c.k} className="contents">
                    <button
                      type="button"
                      disabled={!on}
                      data-cell={`${ri}:${c.k}`}
                      data-cursor={`cell:${ri}:${c.k}`}
                      onMouseEnter={() => setHov({ ri, col: c.k })}
                      onClick={() => onCell(picked ? null : { ri, col: c.k })}
                      aria-pressed={on ? picked : undefined}
                      aria-label={
                        on
                          ? `${r.src} in ${c.full}: ${r.k === "gap" ? "missing" : `${r.c[c.k]} spans`}`
                          : `${r.src} in ${c.full}: none`
                      }
                      className={cn(
                        "grid h-10 place-items-center border-t outline-none focus-visible:bg-muted sm:h-11",
                        tint(c.k, ri),
                        on ? "cursor-pointer" : "cursor-default",
                      )}
                    >
                      {on ? (
                        <CoverCount
                          n={r.c[c.k]}
                          k={r.k}
                          checked={r.k === "num" && cs.checked.has(c.k)}
                          picked={picked}
                          // A batch of cells arrives together; they enter in reading order, not all at once.
                          delay={indexing && i >= cs.before ? (i - cs.before) * 0.09 : 0}
                        />
                      ) : (
                        <span className="size-1 rounded-full bg-foreground/15" />
                      )}
                    </button>
                  </td>
                );
              })}
              {!narrow && (
                <td
                  className={cn(
                    "flex items-center justify-end border-t pr-1 font-mono text-[11px] tabular-nums",
                    r.k === "gap" ? "text-rose-700 dark:text-rose-300" : "text-muted-foreground",
                    focus && focus.ri === ri && "bg-muted/60",
                  )}
                >
                  {r.k === "gap" ? (cs.vis.has(`${ri}:r4`) ? "0" : "") : rowTotal(r, ri) || ""}
                </td>
              )}
            </tr>
          ))}
          <tr className="contents">
            <th scope="row" className="flex items-center border-t py-2.5 pl-1 font-medium text-[11.5px] sm:text-[12px]">
              May be written
            </th>
            {COVER_COLS.map((c, ci) => {
              const d = cs.decided(ci);
              return (
                <td
                  key={c.k}
                  data-cursor={`foot:${c.k}`}
                  data-col-foot={c.k}
                  title={d ? READY_WHY[c.k] : ""}
                  className={cn("grid place-items-center rounded-b-md border-t py-2.5", tint(c.k))}
                >
                  {!d ? (
                    <span className="size-1 rounded-full bg-foreground/15" />
                  ) : c.k === "r4" ? (
                    <M as="span" in="fade" dur={260} role="img" aria-label="Blocked: no source">
                      <Icon n="ban" className="size-4 text-rose-600 dark:text-rose-400" />
                    </M>
                  ) : (
                    <M as="span" in="fade" dur={260} role="img" aria-label="May be written">
                      <Icon n="circleCheck" className="size-4 text-emerald-600 dark:text-emerald-400" />
                    </M>
                  )}
                </td>
              );
            })}
            {!narrow && (
              <td className="flex items-center justify-end border-t pr-1 font-medium font-mono text-[11px] tabular-nums">
                {COVER_COLS.reduce((s, c) => s + total(c.k), 0)}
              </td>
            )}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/* The re-check: the number the run reported, the number recomputed from the raw rows, and whether they agree. */
export function RecheckBand({ live }: { live: boolean }) {
  const e = S.ev;
  const st = S.st.S02;
  const n = e.recomp;
  const all = n === NUM_ROWS.length;
  const id = n ? NUM_ROWS[n - 1] : null;
  const r = id ? LEDGER.find((x) => x.id === id) : undefined;
  const active = live && st.cur === "b3" && st.status === "running";
  const mis = id === "EV-05" ? e.mis : null;
  const drift = mis === "found" || mis === "held";
  let verdict: { label: string; icon: string; tone: string };
  if (drift)
    verdict = {
      label: "Mismatch",
      icon: "alert",
      tone: "bg-destructive/10 text-destructive dark:bg-destructive/20",
    };
  else if (mis === "fixed")
    verdict = {
      label: "Trace value used",
      icon: "corner",
      tone: "bg-sky-500/12 text-sky-700 dark:text-sky-300",
    };
  else
    verdict = {
      label: all ? "No drift" : "Match",
      icon: "circleCheck",
      tone: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
    };
  let note = "Numbers are recomputed from the traces once they are indexed.";
  if (drift) note = "Row 21 differs from what the traces give. Blocked until you choose.";
  else if (all && e.mis === "fixed")
    note = "Every number recomputed from the traces; row 21 superseded by the trace value.";
  else if (all) note = "Every number recomputed from the traces; none drifted.";
  else if (n) note = "Recomputing each number from the 20 traces, not from the run’s summary.";
  return (
    <div
      data-recheck
      data-cursor="recheck"
      className={cn("border-t px-3.5 py-3 transition-colors duration-500", active && "bg-sky-500/[0.04]")}
    >
      <div className="mb-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <b className="font-semibold text-[12.5px]">Re-check</b>
        <span className="min-w-0 flex-1 text-muted-foreground text-xs max-sm:order-last max-sm:basis-full">{note}</span>
        {r && (
          <Badge className={cn("h-6 px-2.5", verdict.tone)}>
            <Icon n={verdict.icon} />
            {verdict.label}
          </Badge>
        )}
        <span className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground tabular-nums">
          <Progress
            value={(n / NUM_ROWS.length) * 100}
            aria-label={`${n} of ${NUM_ROWS.length} numbers re-checked`}
            className={cn(
              "h-1.5 w-24",
              all && !drift
                ? "[&>[data-slot=progress-indicator]]:bg-emerald-500"
                : "[&>[data-slot=progress-indicator]]:bg-sky-500",
            )}
          />
          {n}/{NUM_ROWS.length}
        </span>
      </div>
      {r ? (
        <div className="grid grid-cols-[minmax(0,1fr)] items-stretch gap-2 sm:grid-cols-[minmax(0,1fr)_16px_minmax(0,1fr)] sm:items-center sm:gap-3">
          <div
            className={cn(
              "min-w-0 rounded-lg px-3 py-2 transition-colors duration-300",
              drift ? "bg-rose-500/10 ring-1 ring-rose-500/40" : "bg-muted/60",
            )}
          >
            <span className="block text-[10.5px] text-muted-foreground">
              Reported by the run · {r.id}
              {drift ? " · results.csv row 21" : ""}
            </span>
            <span
              className={cn(
                "block truncate font-mono font-semibold text-[15px] tabular-nums",
                drift && "text-rose-700 dark:text-rose-300",
                mis === "fixed" && "text-muted-foreground line-through",
              )}
            >
              {drift || mis === "fixed" ? "0.081, CI 0.059–0.093" : r.v}
            </span>
          </div>
          <span className="hidden justify-center text-muted-foreground sm:flex">
            <Icon n="right" className="size-4" />
          </span>
          <div className="min-w-0 rounded-lg px-3 py-2 ring-1 ring-foreground/10">
            <span className="block text-[10.5px] text-muted-foreground">Recomputed · results.csv {r.at}</span>
            <span className="block truncate font-mono font-semibold text-[15px] tabular-nums">{RECHECK[r.id]}</span>
          </div>
        </div>
      ) : (
        <p className="rounded-lg border border-dashed px-3 py-2.5 text-muted-foreground text-xs">
          Waiting for the numbers to be indexed.
        </p>
      )}
    </div>
  );
}
