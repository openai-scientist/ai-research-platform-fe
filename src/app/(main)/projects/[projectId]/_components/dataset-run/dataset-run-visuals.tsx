"use client";

import type { ReactNode } from "react";

import { cn } from "cn";
import { Columns3 } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import type { DatasetVersionItem } from "@/lib/api/services/fetch-datasets";
import type { StepView } from "@/lib/run-stream/dataset-run-model";

import { ColumnKindIcon } from "../column-kind-icon";
import type { ColumnKind } from "../dataset-preview";
import { AnimatedNumber } from "../run-studio/animated-number";
import { RUN_EASE } from "../run-studio/run-track";
import { PendingLines } from "../run-studio/scenes/scene-ui";

/** A clause of a reason that ends in a list of column names, such as `no meaning for: a, b`. */
export function splitClause(clause: string): { label: string; columns: string[] } {
  const m = clause.match(/^(.*?):\s*([a-z]\w*(?:,\s*[a-z]\w*)*)\s*$/i);
  return m ? { label: m[1], columns: m[2].split(/,\s*/) } : { label: clause, columns: [] };
}

const reveal = (i: number) => ({
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: Math.min(i, 12) * 0.05, duration: 0.3, ease: RUN_EASE },
});

function Chip({ name, kind, tone }: { name: string; kind?: ColumnKind; tone?: "warn" }) {
  return (
    <motion.code
      {...reveal(0)}
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[11px]",
        tone === "warn" ? "bg-amber-500/15 text-amber-800 dark:text-amber-300" : "bg-muted",
      )}
    >
      {kind && <ColumnKindIcon kind={kind} className="size-3 text-muted-foreground" />}
      {name}
    </motion.code>
  );
}

function Box({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <p className="font-medium text-muted-foreground text-xs">{title}</p>
      {children}
    </div>
  );
}

/** The steward's plan for a step that has nothing to show yet: what it will do, in grey bars that shimmer. */
function Skeleton({ step, active, localWork }: { step: StepView; active: boolean; localWork: boolean }) {
  if (localWork) {
    return <p className="text-muted-foreground text-xs">Your Local Node is running this check.</p>;
  }
  return (
    <Box title={active ? "Working on it" : "What the steward will do"}>
      <div className="border-t pt-3">
        <p className="mb-2 text-muted-foreground text-xs">{step.explain}</p>
        <PendingLines lines={3} />
      </div>
    </Box>
  );
}

/** What code found, one line per clause of the reason, with the columns it names. */
function ReasonRows({ reason, rows }: { reason: string; rows: number }) {
  const reducedMotion = useReducedMotion();
  const clauses = reason.split(/;\s*/).filter(Boolean);
  return (
    <ul className="grid gap-2">
      {clauses.map((clause, i) => {
        const { label, columns } = splitClause(clause);
        const count = Number(clause.match(/(\d[\d,]*)\s+(?:failing\s+)?rows?/i)?.[1]?.replaceAll(",", ""));
        return (
          <motion.li key={clause} {...reveal(i)} className="grid gap-1.5 text-sm">
            <span className="flex gap-2 leading-relaxed">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-current opacity-50" />
              <span className="min-w-0 break-words">{label}</span>
            </span>
            {columns.length > 0 && (
              <span className="ml-3.5 flex flex-wrap gap-1.5">
                {columns.map((name) => (
                  <Chip key={name} name={name} tone="warn" />
                ))}
              </span>
            )}
            {Number.isFinite(count) && rows > 0 && (
              <span className="ml-3.5 flex items-center gap-2 text-muted-foreground text-xs">
                <span className="h-1.5 w-40 overflow-hidden rounded-full bg-muted">
                  <motion.i
                    className="block h-full rounded-full bg-rose-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (count / rows) * 100)}%` }}
                    transition={{ duration: reducedMotion ? 0 : 0.7, ease: RUN_EASE }}
                  />
                </span>
                <AnimatedNumber value={count} /> of {rows.toLocaleString("en-US")} rows
              </span>
            )}
          </motion.li>
        );
      })}
    </ul>
  );
}

/** What the step looks like, from what the engine really reported for it. */
export function StepVisual({
  step,
  version,
  localWork,
}: {
  step: StepView;
  version: DatasetVersionItem | undefined;
  localWork: boolean;
}) {
  const rows = version?.row_count ?? 0;
  const active = step.state === "now" || step.state === "asking";
  const reason = step.state === "done" ? "" : (step.reason ?? "");
  if (reason) return <ReasonRows reason={reason} rows={rows} />;
  if (step.state === "done")
    return (
      <p className="flex items-center gap-2 text-muted-foreground text-sm">
        <Columns3 className="size-4" /> Code found nothing left open here.
      </p>
    );
  return <Skeleton step={step} active={active} localWork={localWork} />;
}
