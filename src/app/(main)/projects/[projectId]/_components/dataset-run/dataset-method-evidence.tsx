import { Check, FileCheck, Fingerprint, GitBranch } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { displayFieldName } from "./dataset-field-name";
import { DatasetReveal } from "./dataset-skeleton";

const number = (value: number) => value.toLocaleString("en-US");

export interface SourceMethodEvidence {
  rows: number;
  columns: number;
  unit?: string | null;
  repeatedKey: string;
  units: number;
}

export interface PartitionMethodEvidence {
  sourceRows: number;
  completeRows: number;
  minimumConfirmation: number;
  withReserve: number;
  withoutReserve: number;
  explorationUnits: number;
  confirmationUnits: number;
  effectSize: number;
  alpha: number;
  power: number;
}

export function SourceMethod({
  evidence,
  table,
  animate: live,
}: {
  evidence: SourceMethodEvidence;
  table: boolean;
  animate: boolean;
}) {
  const reduced = useReducedMotion();
  const animate = live && !reduced;
  return (
    <div className="border-t px-4 py-4 sm:px-5">
      <h4 className="flex items-center gap-2 font-semibold text-sm">
        {table ? (
          <GitBranch aria-hidden className="size-4 text-muted-foreground" />
        ) : (
          <FileCheck aria-hidden className="size-4 text-muted-foreground" />
        )}
        {table ? "What does a row represent?" : "Verify the primary source"}
      </h4>
      {table ? (
        <dl className="mt-3 grid gap-3 border-y py-3 sm:grid-cols-3">
          {[
            ["Row grain", evidence.unit ?? "Awaiting table model"],
            ["Group by", displayFieldName(evidence.repeatedKey)],
            ["Distinct units", number(evidence.units)],
          ].map(([label, value], index) => (
            <div key={label}>
              <dt className="font-medium text-muted-foreground text-xs">{label}</dt>
              <dd className="mt-1 wrap-anywhere text-sm">
                <DatasetReveal delay={animate ? 250 + index * 240 : undefined}>{value}</DatasetReveal>
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <div className="mt-3 grid gap-2 border-y py-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <Fingerprint aria-hidden className="size-4 text-muted-foreground" />
            <span className="font-medium">File integrity</span>
            <span className="text-muted-foreground">
              {number(evidence.rows)} observations · {evidence.columns} fields
            </span>
          </div>
          <div className="relative overflow-hidden text-muted-foreground text-xs">
            <DatasetReveal delay={animate ? 330 : undefined}>
              Compare the released summary with the registered source.
            </DatasetReveal>
            {animate && (
              <motion.span
                aria-hidden
                className="absolute inset-y-0 left-0 w-1/5 bg-linear-to-r from-transparent via-sky-500/30 to-transparent"
                initial={{ x: "-100%" }}
                animate={{ x: "510%" }}
                transition={{ delay: 0.25, duration: 0.95 }}
              />
            )}
          </div>
          <DatasetReveal delay={animate ? 1150 : undefined}>
            <div className="flex items-center gap-1.5 text-emerald-800 text-xs dark:text-emerald-300">
              <Check aria-hidden className="size-3.5" /> Released schema matches the primary file
            </div>
          </DatasetReveal>
        </div>
      )}
    </div>
  );
}

export function PartitionBasis({ basis, animate }: { basis: PartitionMethodEvidence; animate: boolean }) {
  return (
    <div className="grid gap-2 border-t pt-3">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
        <strong className="font-mono tabular-nums">{number(basis.sourceRows)}</strong>
        <span className="text-muted-foreground">observations</span>
        <span aria-hidden className="text-muted-foreground">
          →
        </span>
        <strong className="font-mono tabular-nums">{number(basis.completeRows)}</strong>
        <span className="text-muted-foreground">with both measurements</span>
      </div>
      <div className="grid gap-2">
        <p className="text-muted-foreground text-xs">
          Projected confirmation count
          <span className="ml-2 font-medium text-foreground">
            Planning minimum · {number(basis.minimumConfirmation)}
          </span>
        </p>
        {[
          { name: "With reserve", rows: basis.withReserve },
          { name: "Without reserve", rows: basis.withoutReserve },
        ].map(({ name, rows }, index) => {
          const ok = rows >= basis.minimumConfirmation;
          return (
            <div key={name} className="grid grid-cols-[7rem_minmax(0,1fr)_auto] items-center gap-2 text-xs">
              <span>{name}</span>
              <div aria-hidden className="relative h-2 rounded-xs bg-muted">
                <motion.span
                  className={
                    ok
                      ? "absolute inset-0 origin-left rounded-xs bg-sky-600/70"
                      : "absolute inset-0 origin-left rounded-xs bg-amber-600/65"
                  }
                  initial={animate ? { scaleX: 0 } : false}
                  animate={{ scaleX: rows / basis.completeRows }}
                  transition={{ delay: animate ? index * 0.3 : 0, duration: 0.55 }}
                />
                <span
                  className="absolute inset-y-[-3px] w-px bg-foreground/80"
                  style={{ left: `${(basis.minimumConfirmation / basis.completeRows) * 100}%` }}
                />
              </div>
              <span className="text-right tabular-nums">
                {number(rows)} <span className="text-muted-foreground">{ok ? "· Meets" : "· Below"}</span>
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-muted-foreground text-xs">
        Planning assumption · two equal groups, d = {basis.effectSize}, α = {basis.alpha}, {basis.power * 100}% power.
        Each rider stays in one split.
      </p>
    </div>
  );
}
