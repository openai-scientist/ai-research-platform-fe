"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "cn";
import { ScanLine, ShieldCheck } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import type { DataCardVariable } from "@/lib/api/services/fetch-dataset-runs";

import { AgentCursor, launchFlight } from "../run-studio/run-bits";
import { RUN_EASE } from "../run-studio/run-track";
import { DatasetColumnEvidence } from "./dataset-column-evidence";
import { displayFieldName } from "./dataset-field-name";
import { DatasetReveal, DatasetSkeleton } from "./dataset-skeleton";

const number = (value: number) => value.toLocaleString("en-US", { maximumFractionDigits: 1 });
const beats = { missing: 260, total: 550, compute: 1450, result: 2160 };

type Position = "source" | "formula" | "result" | "posted";

export function DatasetProfileBench({
  columns,
  variables,
  active,
  working,
  local,
  agent,
}: {
  columns: readonly string[];
  variables: readonly DataCardVariable[];
  active?: string;
  working: boolean;
  local: boolean;
  agent: "steward" | "reviewer" | null;
}) {
  const reduced = useReducedMotion();
  const host = useRef<HTMLElement>(null);
  const [inspection, setInspection] = useState<{ column: string; beat?: string }>();
  const [position, setPosition] = useState<{ id: string; lane: Position }>();
  const names = [...new Set([...columns, ...variables.map(({ name }) => name)])];
  const focus =
    inspection && inspection.beat === active && names.includes(inspection.column)
      ? inspection.column
      : active && names.includes(active)
        ? active
        : (variables[0]?.name ?? names[0]);
  const field = variables.find(({ name }) => name === focus);
  const valid = field?.summary.n_valid;
  const missing = field?.summary.n_missing;
  const counts =
    valid != null && missing != null && valid >= 0 && missing >= 0 ? { missing, total: valid + missing } : null;
  const percent = counts && counts.total > 0 ? (counts.missing / counts.total) * 100 : null;
  const scanning = working && focus === active && !field;
  const withheld = field && (missing == null || valid == null);
  const approximate = local ? "≈" : "";
  const value = percent === null ? undefined : `${approximate}${number(percent)}%`;
  const missingLabel = counts ? `${approximate}${number(counts.missing)}` : undefined;
  const totalLabel = counts ? `${approximate}${number(counts.total)}` : undefined;
  const animating = working && focus === active && !reduced && value !== undefined;
  const sequence = animating ? `${focus}:${missingLabel}:${totalLabel}` : undefined;
  const lane = sequence && position?.id === sequence ? position.lane : "source";

  useEffect(() => {
    if (!sequence || !missingLabel || !totalLabel || !value) return;
    function flight(source: string, destination: string, label: string, tone: string) {
      const from = host.current?.querySelector(`[data-profile-origin="${source}"]`);
      const selector =
        destination === "row"
          ? `[data-profile-row-result="${CSS.escape(focus ?? "")}"]`
          : `[data-profile-destination="${destination}"]`;
      const to = host.current?.querySelector(selector);
      const visible = [from, to].every((node) => {
        const rect = node?.getBoundingClientRect();
        return rect && rect.top >= 0 && rect.bottom <= window.innerHeight;
      });
      if (visible) launchFlight(from, to, label, tone);
    }
    const timers = [
      window.setTimeout(() => {
        setPosition({ id: sequence, lane: "formula" });
        flight("missing", "missing", missingLabel, "bg-amber-800 text-white");
      }, beats.missing),
      window.setTimeout(() => flight("total", "total", totalLabel, "bg-sky-800 text-white"), beats.total),
      window.setTimeout(() => flight("formula", "result", value, "bg-emerald-800 text-white"), beats.compute),
      window.setTimeout(() => setPosition({ id: sequence, lane: "result" }), beats.result),
      window.setTimeout(() => flight("result", "row", value, "bg-emerald-800 text-white"), beats.result + 180),
      window.setTimeout(() => setPosition({ id: sequence, lane: "posted" }), beats.result + 980),
    ];
    return () => {
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, [focus, missingLabel, sequence, totalLabel, value]);

  if (!focus) return <p className="text-muted-foreground text-sm">Waiting for the released column names.</p>;
  const flagged = field?.flags.includes("high_missing");
  const hasResult = value !== undefined;
  const sourceCounts = [
    { label: "Missing", key: "missing", value: missingLabel },
    { label: "Total", key: "total", value: totalLabel },
  ];
  const cursorTarget =
    scanning || (sequence && (lane === "result" || lane === "posted"))
      ? `dataset-column:${focus}`
      : sequence
        ? `bench:${lane}`
        : null;
  return (
    <section ref={host} aria-label="Missingness analysis" className="relative">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 pt-4 pb-2.5 sm:px-5">
        <h4 className="flex items-center gap-2 font-semibold text-sm">
          <ScanLine aria-hidden="true" className="size-4 text-sky-700 dark:text-sky-300" />
          Where are responses missing?
        </h4>
        <span className="text-muted-foreground text-xs tabular-nums">
          {variables.length}/{names.length} columns read
        </span>
      </div>
      <DatasetColumnEvidence
        columnNames={columns}
        variables={variables}
        agent={null}
        local={local}
        partialProfile={working || variables.length < names.length}
        activeColumn={working ? active : undefined}
        pendingColumn={sequence && lane !== "posted" ? focus : undefined}
        selectedColumn={focus}
        onSelectColumn={(column) => setInspection({ column, beat: active })}
      />

      <div key={focus} className="border-t px-4 pt-4 pb-5 sm:px-5">
        <div data-cursor="bench:source">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-x-5 gap-y-1 text-xs">
            <h5
              className={cn(
                "font-medium",
                (scanning || (sequence && lane === "source")) && "text-sky-800 dark:text-sky-200",
              )}
            >
              Released counts · {displayFieldName(focus)}
            </h5>
            <dl className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              {sourceCounts.map(({ label, key, value: operand }) => (
                <div key={key} className="flex items-baseline gap-1.5">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-mono font-semibold tabular-nums">
                    {operand !== undefined ? (
                      <span
                        data-profile-origin={key}
                        className={key === "missing" ? "text-amber-900 dark:text-amber-200" : ""}
                      >
                        {operand}
                      </span>
                    ) : scanning ? (
                      <DatasetSkeleton className="inline-block h-2.5 w-10 align-middle" />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <div aria-hidden="true" className="relative h-4 overflow-hidden rounded-sm bg-muted">
            {hasResult && (
              <>
                <span className="absolute inset-0 bg-sky-600/35 dark:bg-sky-400/40" />
                <motion.span
                  key={value}
                  className="absolute inset-0 origin-left bg-amber-500/85"
                  initial={animating ? { scaleX: 0 } : false}
                  animate={{ scaleX: (percent ?? 0) / 100 }}
                  transition={{ duration: 0.58, ease: "easeOut" }}
                />
              </>
            )}
            {[25, 50, 75].map((tick) => (
              <span key={tick} className="absolute inset-y-0 w-px bg-background/80" style={{ left: `${tick}%` }} />
            ))}
            {scanning && !reduced && (
              <motion.span
                className="pointer-events-none absolute inset-y-0 left-0 w-1/5 bg-linear-to-r from-transparent via-sky-600/40 to-transparent"
                initial={{ x: "-100%" }}
                animate={{ x: "500%" }}
                transition={{ duration: 0.92, ease: "linear", repeat: Number.POSITIVE_INFINITY }}
              />
            )}
          </div>
          <div
            aria-hidden="true"
            className="relative mt-1 flex justify-between font-mono text-[10px] text-muted-foreground tabular-nums"
          >
            {[0, 25, 50, 75, 100].map((value) => (
              <span key={value}>{value}%</span>
            ))}
          </div>
          {hasResult && (
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground text-xs">
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className="size-1.5 rounded-sm bg-amber-500/85" /> Missing
              </span>
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className="size-1.5 rounded-sm bg-sky-600/35 dark:bg-sky-400/40" /> Present
              </span>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-3 border-t pt-4 sm:mt-5 sm:gap-x-5 sm:pt-5">
          <div data-cursor="bench:formula" className="min-w-0">
            <h5
              className={cn(
                "mb-2 text-xs text-muted-foreground",
                sequence && lane === "formula" && "font-medium text-sky-800 dark:text-sky-200",
              )}
            >
              Missing ÷ total × 100
            </h5>
            {withheld ? (
              <p className="text-muted-foreground text-sm">
                Calculation blocked. The required counts were not released.
              </p>
            ) : (
              <div
                data-profile-origin="formula"
                className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-lg tabular-nums sm:gap-x-3 sm:text-2xl"
              >
                {sourceCounts.map(({ label, key, value: operand }, i) => (
                  <div key={key} className="contents">
                    {i > 0 && (
                      <span aria-hidden="true" className="text-muted-foreground">
                        ÷
                      </span>
                    )}
                    <div className="min-w-0" data-profile-destination={key}>
                      <span className="sr-only">{label} count </span>
                      {operand !== undefined ? (
                        <DatasetReveal delay={animating ? 970 + i * 290 : undefined}>{operand}</DatasetReveal>
                      ) : scanning ? (
                        <DatasetSkeleton className="h-4 w-10 sm:w-14" />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </div>
                ))}
                <span className="text-muted-foreground">
                  <span aria-hidden="true">×</span> 100
                </span>
              </div>
            )}
          </div>
          {!withheld && (
            <span aria-hidden="true" className="self-end pb-0.5 font-mono text-lg text-muted-foreground sm:text-2xl">
              =
            </span>
          )}
          <div data-cursor="bench:result" className="min-w-0">
            <h5 className="mb-2 text-muted-foreground text-xs">Missing rate</h5>
            <div data-profile-destination="result" data-profile-origin="result" className="min-w-0">
              {hasResult ? (
                <DatasetReveal delay={animating ? beats.result : undefined}>
                  <p
                    className={cn(
                      "wrap-anywhere font-mono font-semibold text-xl tabular-nums sm:text-3xl",
                      flagged ? "text-amber-900 dark:text-amber-200" : "text-sky-900 dark:text-sky-200",
                    )}
                  >
                    {value}
                  </p>
                </DatasetReveal>
              ) : withheld ? (
                <p className="flex items-center gap-1.5 font-semibold text-sm">
                  <ShieldCheck aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" /> Unknown
                </p>
              ) : scanning ? (
                <DatasetSkeleton className="mb-1 h-5 w-14 sm:w-20" />
              ) : (
                <p className="text-muted-foreground text-xs">{field ? "No values reported" : "Profile pending"}</p>
              )}
            </div>
          </div>
        </div>

        <p className="mt-3 min-h-4 text-muted-foreground text-xs" aria-live="polite">
          {scanning
            ? "Reading the released counts"
            : withheld
              ? local
                ? "Withheld by the Local Node. Carry the missing rate forward as unknown."
                : "Counts unavailable. Carry the missing rate forward as unknown."
              : hasResult && (!sequence || lane === "result" || lane === "posted")
                ? flagged
                  ? "Flag for review. Coverage may affect comparisons using this field."
                  : percent === 0
                    ? "The released profile reports no missing values."
                    : "Carry this rate into the cleaning and fitness checks."
                : null}
        </p>
      </div>

      {!reduced && <AgentCursor agent={agent} container={host} target={cursorTarget} click />}
    </section>
  );
}
