"use client";

import type { ReactNode } from "react";

import { cn } from "cn";
import { ArrowRight, Check, Columns3, FileText, HardDrive, ShieldCheck, Undo2 } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import type { DataCardVariable } from "@/lib/api/services/fetch-dataset-runs";
import type { DatasetVersionItem } from "@/lib/api/services/fetch-datasets";
import type { LocalNodeItem } from "@/lib/api/services/fetch-local-nodes";
import type { StepView } from "@/lib/run-stream/dataset-run-model";

import { ColumnKindIcon } from "../column-kind-icon";
import type { ColumnKind } from "../dataset-preview";
import { AnimatedNumber } from "../run-studio/animated-number";
import { RUN_EASE } from "../run-studio/run-track";
import { PendingLines } from "../run-studio/scenes/scene-ui";

const KIND: Record<DataCardVariable["type"], ColumnKind> = { numeric: "number", string: "text", date: "date" };

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
      <div className="rounded-lg border border-dashed p-3">
        <p className="mb-2 text-muted-foreground text-xs">{step.explain}</p>
        <PendingLines lines={3} />
      </div>
    </Box>
  );
}

function MissingBar({ missing, total }: { missing: number; total: number }) {
  const reducedMotion = useReducedMotion();
  const pct = total ? Math.round((missing / total) * 100) : 0;
  return (
    <span className="flex items-center gap-2">
      <span className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
        <motion.i
          className={cn("block h-full rounded-full", pct > 20 ? "bg-amber-500" : "bg-foreground/60")}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: reducedMotion ? 0 : 0.7, ease: RUN_EASE }}
        />
      </span>
      <span className="font-mono text-[11px] text-muted-foreground tabular-nums">{pct}%</span>
    </span>
  );
}

/** The variables with their type, role and how much is missing: the Local Node's card, or the published data card. */
function VariableTable({ variables }: { variables: DataCardVariable[] }) {
  return (
    <div className="overflow-x-auto rounded-lg ring-1 ring-foreground/10">
      <table className="w-full text-left text-xs">
        <thead className="bg-muted/50 text-muted-foreground">
          <tr>
            <th className="px-3 py-1.5 font-medium">Column</th>
            <th className="px-3 py-1.5 font-medium">Role</th>
            <th className="px-3 py-1.5 font-medium">Missing</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {variables.map((v, i) => (
            <motion.tr key={v.name} {...reveal(i)}>
              <td className="px-3 py-1.5 font-mono">
                <span className="inline-flex items-center gap-1.5">
                  <ColumnKindIcon kind={KIND[v.type]} className="size-3 text-muted-foreground" />
                  {v.name}
                </span>
              </td>
              <td className="px-3 py-1.5 text-muted-foreground">{v.role}</td>
              <td className="px-3 py-1.5">
                {v.summary.n_missing === null || v.summary.n_valid === null ? (
                  <span className="text-muted-foreground">withheld</span>
                ) : (
                  <MissingBar missing={v.summary.n_missing} total={v.summary.n_missing + v.summary.n_valid} />
                )}
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const DICTIONARY_PARTS = [
  { label: "Meaning", match: /meaning/i },
  { label: "Unit", match: /unit/i },
  { label: "Time axis", match: /time axis/i },
];

/** The dictionary as the engine reports it: each column against what is still missing, filling in as code re-checks. */
function DictionaryTable({ reason, columns }: { reason: string; columns: string[] }) {
  const clauses = reason.split(/;\s*/).filter(Boolean).map(splitClause);
  const names = [...new Set([...clauses.flatMap((c) => c.columns), ...columns])];
  if (!names.length) return null;
  return (
    <div className="overflow-x-auto rounded-lg ring-1 ring-foreground/10">
      <table className="w-full text-left text-xs">
        <thead className="bg-muted/50 text-muted-foreground">
          <tr>
            <th className="px-3 py-1.5 font-medium">Column</th>
            {DICTIONARY_PARTS.map((p) => (
              <th key={p.label} className="px-3 py-1.5 font-medium">
                {p.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {names.map((name, i) => (
            <motion.tr key={name} {...reveal(i)}>
              <td className="px-3 py-1.5 font-mono">{name}</td>
              {DICTIONARY_PARTS.map((p) => {
                const open = clauses.some((c) => p.match.test(c.label) && c.columns.includes(name));
                return (
                  <td key={p.label} className="px-3 py-1.5">
                    {open ? (
                      <span className="rounded-full bg-amber-500/15 px-1.5 py-px text-[11px] text-amber-800 dark:text-amber-300">
                        missing
                      </span>
                    ) : (
                      <Check className="size-3.5 text-emerald-600" strokeWidth={3} />
                    )}
                  </td>
                );
              })}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
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

/** Rows stay on the Local Node, pass the release gate, and the Platform sees what the gate lets through. */
function ReleaseFlow({
  version,
  node,
  state,
}: {
  version: DatasetVersionItem | undefined;
  node: LocalNodeItem | undefined;
  state: StepView["state"];
}) {
  const names = version?.column_names ?? [];
  const kinds = new Map(version?.local_card?.variables.map((v) => [v.name, KIND[v.type]]));
  const waiting = state === "asking";
  const reviewed = state === "done";
  const releaseStatus = waiting ? "Waits for your review" : "Pending";
  return (
    <div className="grid gap-3">
      <div className="grid items-stretch gap-2 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
        <div className="rounded-lg border p-3">
          <p className="mb-2 flex items-center gap-1.5 font-medium text-xs">
            <HardDrive className="size-3.5" /> Local Node · rows stay
          </p>
          <div className="flex flex-wrap gap-1.5">
            {names.slice(0, 12).map((name) => (
              <Chip key={name} name={name} kind={kinds.get(name)} />
            ))}
            {names.length > 12 && <span className="text-muted-foreground text-xs">+{names.length - 12} more</span>}
          </div>
        </div>
        <ArrowRight className="hidden size-4 self-center text-muted-foreground md:block" />
        <div
          className={cn(
            "relative grid place-content-center justify-items-center gap-1 rounded-lg border-2 p-3 text-center",
            waiting ? "border-amber-500 bg-amber-500/10" : "border-dashed",
          )}
        >
          {waiting && (
            <span className="absolute inset-0 animate-ping rounded-lg border-2 border-amber-500/40 motion-reduce:animate-none" />
          )}
          <ShieldCheck className={cn("size-5", waiting ? "text-amber-600" : "text-muted-foreground")} />
          <b className="text-xs">Release gate</b>
          <span className="text-[11px] text-muted-foreground">Counts rounded · rows withheld</span>
          <span className="font-medium text-[11px]">{reviewed ? "Reviewed" : releaseStatus}</span>
        </div>
        <ArrowRight className="hidden size-4 self-center text-muted-foreground md:block" />
        <div className="rounded-lg border p-3">
          <p className="mb-2 flex items-center gap-1.5 font-medium text-xs">
            <FileText className="size-3.5" /> Platform sees
          </p>
          <dl className="grid gap-1 text-xs">
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Rows</dt>
              <dd className="font-mono tabular-nums">
                {version ? `~${version.row_count.toLocaleString("en-US")}` : "–"}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Columns</dt>
              <dd className="font-mono tabular-nums">{names.length}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Raw rows</dt>
              <dd className="font-mono">never</dd>
            </div>
          </dl>
        </div>
      </div>
      {!reviewed && (Boolean(node) || waiting) && (
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground text-xs">
          {node && (
            <>
              <span>
                <b className="font-mono text-foreground tabular-nums">
                  <AnimatedNumber value={node.pending_reviews} />
                </b>{" "}
                waiting for review on {node.name}
              </span>
              <span>
                <b className="font-mono text-foreground tabular-nums">
                  <AnimatedNumber value={node.release_count} />
                </b>{" "}
                released so far
              </span>
            </>
          )}
          {waiting && (
            <span className="flex items-center gap-1">
              <Undo2 className="size-3" /> Open the Local Node app and go to Releases to approve.
            </span>
          )}
        </p>
      )}
    </div>
  );
}

/** What the step looks like, from what the engine really reported for it. */
export function StepVisual({
  step,
  version,
  variables,
  node,
  localWork,
}: {
  step: StepView;
  version: DatasetVersionItem | undefined;
  /** The published data card's variables, or the Local Node's card. */
  variables: DataCardVariable[] | undefined;
  node: LocalNodeItem | undefined;
  localWork: boolean;
}) {
  const names = version?.column_names ?? [];
  const rows = version?.row_count ?? 0;
  const active = step.state === "now" || step.state === "asking";
  const reason = step.state === "done" ? "" : (step.reason ?? "");
  if (step.key === "release") return <ReleaseFlow version={version} node={node} state={step.state} />;
  if (step.key === "dictionary") {
    return names.length || reason ? (
      <DictionaryTable reason={reason} columns={names} />
    ) : (
      <Skeleton step={step} active={active} localWork={localWork} />
    );
  }
  if (["sources", "table_model", "profile_quality", "disclosure"].includes(step.key)) {
    if (variables?.length && step.key !== "sources")
      return (
        <Box title={`${variables.length} variables`}>
          <VariableTable variables={variables} />
        </Box>
      );
    if (names.length)
      return (
        <Box title={`${names.length} columns in ${version?.original_filename ?? "the file"}`}>
          <div className="flex flex-wrap gap-1.5">
            {names.map((name) => (
              <Chip key={name} name={name} />
            ))}
          </div>
        </Box>
      );
  }
  if (reason) return <ReasonRows reason={reason} rows={rows} />;
  if (step.state === "done")
    return (
      <p className="flex items-center gap-2 text-muted-foreground text-sm">
        <Columns3 className="size-4" /> Code found nothing left open here.
      </p>
    );
  return <Skeleton step={step} active={active} localWork={localWork} />;
}
