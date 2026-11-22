"use client";

import { useState } from "react";

import { cn } from "cn";
import { ArrowRight, BookOpen, ChevronRight, CircleDashed, EyeOff, KeyRound, Target } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { DataCardVariable } from "@/lib/api/services/fetch-dataset-runs";

import { ColumnKindIcon } from "./column-kind-icon";
import type { ColumnKind } from "./dataset-preview";
import {
  FLAG_HINTS,
  humanFlag,
  type IssueGroup,
  type PrivacyChip,
  type RoleKind,
  readiness,
  roleKind,
  variableLevel,
} from "./dataset-review-state";

const kindOf = (type: DataCardVariable["type"]): ColumnKind =>
  type === "numeric" ? "number" : type === "date" ? "date" : "text";

const LEVEL = {
  ready: { label: "Ready", bar: "bg-emerald-500", dot: "bg-emerald-500" },
  check: { label: "Check", bar: "bg-amber-500", dot: "bg-amber-500" },
  important: { label: "Important", bar: "bg-rose-500", dot: "bg-rose-500" },
} as const;

const ROLE: Record<RoleKind, { label: string; hint: string; chip: string }> = {
  target: {
    label: "Target",
    hint: "The outcome the research tries to explain.",
    chip: "bg-primary text-primary-foreground",
  },
  input: { label: "Input", hint: "Explains the outcome.", chip: "bg-sky-500/15 text-sky-800 dark:text-sky-300" },
  key: {
    label: "Key",
    hint: "Identifies a row. Used to join sources, never analysed.",
    chip: "bg-violet-500/15 text-violet-800 dark:text-violet-300",
  },
  none: { label: "None", hint: "No role assigned yet.", chip: "bg-muted text-muted-foreground" },
  other: { label: "Other", hint: "Groups or splits the rows.", chip: "bg-muted text-muted-foreground" },
};

const pct = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0);
const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });

/** The whole card in one line: how many variables are ready, and how many need a look. */
export function ReadinessBar({ variables }: { variables: DataCardVariable[] }) {
  const r = readiness(variables);
  const segments = (["ready", "check", "important"] as const).filter((k) => r[k] > 0);
  return (
    <div>
      <p className="font-semibold text-lg tabular-nums">
        {r.total} variables · {r.ready} ready
        {r.check + r.important > 0 && ` · ${r.check + r.important} need attention`}
      </p>
      <div
        role="img"
        aria-label={`${r.ready} ready, ${r.check} to check, ${r.important} important of ${r.total}`}
        className="mt-2 flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-muted"
      >
        {segments.map((k) => (
          <motion.i
            key={k}
            className={cn("h-full", LEVEL[k].bar)}
            initial={{ width: 0 }}
            animate={{ width: `${(r[k] / r.total) * 100}%` }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          />
        ))}
      </div>
      <p className="mt-1.5 flex flex-wrap gap-x-4 text-muted-foreground text-xs">
        {(["ready", "check", "important"] as const).map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <i className={cn("size-2 rounded-full", LEVEL[k].dot)} />
            {LEVEL[k].label} {r[k]}
          </span>
        ))}
      </p>
    </div>
  );
}

function Completeness({ valid, missing }: { valid: number | null; missing: number | null }) {
  if (valid == null || missing == null) return <span className="text-muted-foreground text-xs">withheld</span>;
  const total = valid + missing;
  const done = 100 - pct(missing, total);
  return (
    <span className="flex items-center gap-2">
      <span className="flex h-2 w-16 shrink-0 overflow-hidden rounded-full bg-amber-500/30">
        <motion.i
          className="h-full bg-emerald-500"
          initial={{ width: 0 }}
          animate={{ width: `${done}%` }}
          transition={{ duration: 0.6 }}
        />
      </span>
      <span className="whitespace-nowrap text-xs tabular-nums">{done}% complete</span>
    </span>
  );
}

/** Distinct values on a log scale, so 2 and 1,200 can share one small bar. */
function Distinct({ distinct, rows }: { distinct: number | null | undefined; rows: number }) {
  if (distinct == null) return <span className="text-muted-foreground text-xs">{stat(distinct)}</span>;
  const width = rows > 1 ? Math.max(4, (Math.log10(Math.max(1, distinct)) / Math.log10(rows)) * 100) : 100;
  return (
    <span className="flex items-center gap-2" title="Distinct values, log scale">
      <span className="h-1.5 w-14 overflow-hidden rounded-full bg-muted">
        <i className="block h-full rounded-full bg-foreground/50" style={{ width: `${Math.min(100, width)}%` }} />
      </span>
      <span className="text-xs tabular-nums">{fmt(distinct)}</span>
    </span>
  );
}

/** Mean as a dot and one standard deviation either side as a whisker, on an axis from 0 to mean + 3 sd. */
function MeanSd({
  mean,
  sd,
  topCoded,
}: {
  mean: number | null | undefined;
  sd: number | null | undefined;
  topCoded: boolean;
}) {
  if (mean == null) return <span className="text-muted-foreground text-xs">{stat(mean)}</span>;
  const spread = sd ?? 0;
  const max = Math.max(mean + 3 * spread, mean * 1.5, 1e-9);
  const at = (value: number) => `${Math.max(0, Math.min(100, (value / max) * 100))}%`;
  return (
    <span
      className="flex items-center gap-2"
      title={`Mean ${fmt(mean)}${sd == null ? "" : `, standard deviation ${fmt(sd)}`}`}
    >
      <span className="relative h-4 w-24">
        <i className="absolute top-1/2 right-0 left-0 h-px bg-border" />
        {sd != null && (
          <i
            className="absolute top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-foreground/40"
            style={{ left: at(mean - sd), width: `calc(${at(mean + sd)} - ${at(mean - sd)})` }}
          />
        )}
        <i
          className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground"
          style={{ left: at(mean) }}
        />
        {topCoded && (
          <Tooltip>
            <TooltipTrigger asChild>
              <i className="absolute top-0 right-0 h-4 w-1.5 cursor-help rounded-r border-amber-500 border-r-2 border-y-2" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">{FLAG_HINTS.top_coded}</TooltipContent>
          </Tooltip>
        )}
      </span>
      <span className="text-xs tabular-nums">
        {fmt(mean)}
        {sd != null && ` ± ${fmt(sd)}`}
      </span>
    </span>
  );
}

const stat = (value: number | null | undefined) => {
  if (value === undefined) return "Not computed";
  return value === null ? "Withheld" : fmt(value);
};

function Detail({ v, rows }: { v: DataCardVariable; rows: number }) {
  const flags = v.flags.filter((f) => f !== "levels_withheld");
  return (
    <div className="grid gap-3 border-t bg-muted/30 px-3 py-3 text-xs sm:grid-cols-2">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        <dt className="text-muted-foreground">Valid</dt>
        <dd className="tabular-nums">{v.summary.n_valid == null ? "Withheld" : fmt(v.summary.n_valid)}</dd>
        <dt className="text-muted-foreground">Missing</dt>
        <dd className="tabular-nums">{v.summary.n_missing == null ? "Withheld" : fmt(v.summary.n_missing)}</dd>
        <dt className="text-muted-foreground">Distinct</dt>
        <dd className="tabular-nums">
          {v.summary.n_distinct == null ? stat(v.summary.n_distinct) : `~${fmt(v.summary.n_distinct)}`}
        </dd>
        <dt className="text-muted-foreground">Mean / SD</dt>
        <dd className="tabular-nums">
          {stat(v.summary.mean)} / {stat(v.summary.sd)}
        </dd>
        <dt className="text-muted-foreground">Type</dt>
        <dd className="capitalize">
          {v.type} · {v.measure}
        </dd>
      </dl>
      <div className="space-y-1.5">
        <p>
          <b className="font-medium">{ROLE[roleKind(v)].label}.</b> {ROLE[roleKind(v)].hint}
        </p>
        {v.flags.includes("levels_withheld") && (
          <p className="text-muted-foreground">Category values stay on the Local Node; only counts and means leave.</p>
        )}
        {flags.map((flag) => (
          <p key={flag}>
            <b className="font-medium">{humanFlag(flag)}.</b>{" "}
            <span className="text-muted-foreground">{FLAG_HINTS[flag] ?? "This flag came with the data card."}</span>
          </p>
        ))}
        {rows > 0 && v.summary.n_distinct === rows && (
          <p className="text-muted-foreground">Every row has its own value.</p>
        )}
      </div>
    </div>
  );
}

/** One row per variable: type, name, role, how complete, how many distinct values, mean and spread. */
export function VariableMatrix({
  variables,
  rows,
  compact = false,
  formatName,
}: {
  variables: DataCardVariable[];
  rows: number;
  compact?: boolean;
  formatName?: (name: string) => string;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const compactGrid = "grid-cols-[minmax(0,1.15fr)_3.5rem_4rem_minmax(0,1fr)]";
  const fullGrid = "@min-[42rem]:grid-cols-[minmax(0,1.4fr)_5.5rem_9.5rem_7rem_11rem_1rem]";
  if (!variables.length) return <p className="text-muted-foreground text-sm">No variable summaries were published.</p>;
  return (
    <div className="@container overflow-hidden rounded-lg border">
      <div
        className={cn(
          "items-center gap-2 bg-muted px-2.5 py-1.5 font-medium text-muted-foreground text-xs",
          compact ? cn("grid", compactGrid) : cn("hidden @min-[42rem]:grid", fullGrid),
        )}
      >
        <span>Variable</span>
        <span>Role</span>
        {compact ? (
          <>
            <span>Missing</span>
            <span>Flags</span>
          </>
        ) : (
          <>
            <span>Completeness</span>
            <span>Distinct</span>
            <span>Mean ± SD</span>
            <span className="sr-only">Status</span>
          </>
        )}
      </div>
      <ul aria-label="Variables" className="divide-y">
        {variables.map((v, index) => {
          const role = ROLE[roleKind(v)];
          const level = variableLevel(v);
          const isOpen = open === v.name;
          const top = v.flags.includes("top_coded");
          return (
            <li key={`${v.name}:${index}`} data-cursor={`col:${v.name}`}>
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : v.name)}
                className={cn(
                  "grid w-full items-center text-left outline-none hover:bg-muted/50 focus-visible:bg-muted/50",
                  compact
                    ? cn("gap-2 px-2.5 py-1", compactGrid)
                    : cn("grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1.5 px-3 py-2.5", fullGrid),
                )}
              >
                <span className="flex min-w-0 items-center gap-2 font-medium text-sm">
                  {!compact && (
                    <ColumnKindIcon kind={kindOf(v.type)} className="size-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="flex min-w-0 flex-col">
                    <span
                      className={compact ? "wrap-anywhere text-xs" : "truncate"}
                      title={formatName?.(v.name) ?? v.name}
                    >
                      {formatName?.(v.name) ?? v.name}
                    </span>
                    {compact && <span className="font-normal text-muted-foreground text-xs capitalize">{v.type}</span>}
                  </span>
                  {!compact && roleKind(v) === "target" && (
                    <Target className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                  )}
                  {!compact && roleKind(v) === "key" && (
                    <KeyRound className="size-3.5 shrink-0 text-violet-600" aria-hidden="true" />
                  )}
                </span>
                <span className={cn("flex items-center gap-2", !compact && "justify-end @min-[42rem]:contents")}>
                  <span
                    title={role.hint}
                    className={cn("w-fit rounded-full px-2 py-0.5 font-medium text-[11px]", role.chip)}
                  >
                    {role.label}
                  </span>
                  {!compact && (
                    <i
                      title={LEVEL[level].label}
                      className={cn(
                        "size-2.5 rounded-full @min-[42rem]:order-last @min-[42rem]:justify-self-end",
                        LEVEL[level].dot,
                      )}
                    />
                  )}
                </span>
                {compact ? (
                  <>
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {v.summary.n_missing != null && v.summary.n_valid != null
                        ? `${pct(v.summary.n_missing, v.summary.n_missing + v.summary.n_valid)}%`
                        : stat(v.summary.n_missing)}
                    </span>
                    <span className="wrap-anywhere text-muted-foreground text-xs">
                      {v.flags.length ? v.flags.map(humanFlag).join(", ") : "None"}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="col-span-2 @min-[42rem]:col-span-1">
                      <Completeness valid={v.summary.n_valid} missing={v.summary.n_missing} />
                    </span>
                    <span className="hidden @min-[42rem]:block">
                      <Distinct distinct={v.summary.n_distinct} rows={rows} />
                    </span>
                    <span className="hidden @min-[42rem]:block">
                      <MeanSd mean={v.summary.mean} sd={v.summary.sd} topCoded={top} />
                    </span>
                  </>
                )}
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <Detail v={v} rows={rows} />
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
      {!compact && (
        <p className="border-t bg-muted/30 px-3 py-2 text-muted-foreground text-xs">
          Target is the outcome to explain, Input explains it, Key identifies rows and is not analysed, None has no role
          yet. The amber bracket on a mean means its largest values were grouped for privacy.
        </p>
      )}
    </div>
  );
}

/** Which variables explain which: inputs flow into the target; keys and unassigned variables stand apart. */
export function RoleDiagram({
  variables,
  formatName,
}: {
  variables: DataCardVariable[];
  formatName?: (name: string) => string;
}) {
  const by = (k: RoleKind) => variables.filter((v) => roleKind(v) === k);
  const target = by("target");
  const inputs = by("input");
  const keys = by("key");
  const rest = [...by("none"), ...by("other")];
  if (!target.length && !inputs.length) return null;
  const pill = (name: string, cls: string, index: number) => (
    <span key={`${name}:${index}`} className={cn("rounded-md px-2 py-1 font-mono text-xs", cls)}>
      {formatName?.(name) ?? name}
    </span>
  );
  return (
    <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
      <div>
        <p className="mb-1.5 text-muted-foreground text-xs">Inputs · explain</p>
        <div className="flex flex-wrap gap-1.5">
          {inputs.length ? (
            inputs.map((v, i) => pill(v.name, "bg-sky-500/15", i))
          ) : (
            <span className="text-muted-foreground text-xs">None assigned</span>
          )}
        </div>
      </div>
      <ArrowRight
        className="size-5 rotate-90 justify-self-center text-muted-foreground md:rotate-0"
        aria-hidden="true"
      />
      <div>
        <p className="mb-1.5 text-muted-foreground text-xs">Target · outcome</p>
        <div className="flex flex-wrap gap-1.5">
          {target.length ? (
            target.map((v, i) => pill(v.name, "bg-primary text-primary-foreground", i))
          ) : (
            <span className="text-muted-foreground text-xs">None assigned</span>
          )}
        </div>
      </div>
      {(keys.length > 0 || rest.length > 0) && (
        <div className="grid gap-2 border-t pt-3 text-xs md:col-span-3 md:grid-cols-2">
          {keys.length > 0 && (
            <p className="flex flex-wrap items-center gap-1.5">
              <KeyRound className="size-3.5 text-violet-600" aria-hidden="true" />
              <span className="text-muted-foreground">Keys, used to join, not analysed:</span>
              {keys.map((v, i) => pill(v.name, "bg-violet-500/15", i))}
            </p>
          )}
          {rest.length > 0 && (
            <p className="flex flex-wrap items-center gap-1.5">
              <span className="text-muted-foreground">No role yet:</span>
              {rest.map((v, i) => pill(v.name, "bg-muted", i))}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

const GROUP_ICON = { missing: CircleDashed, privacy: EyeOff, dictionary: BookOpen, other: CircleDashed } as const;
const SEVERITY_DOT = { high: "bg-rose-500", medium: "bg-amber-500", info: "bg-muted-foreground/50" } as const;
const SEVERITY_TEXT = { high: "Important", medium: "Check", info: "Note" } as const;

/** What needs a look, in four cards; each opens to its details. */
export function IssueCards({ groups }: { groups: IssueGroup[] }) {
  return (
    <div className="grid gap-3">
      {groups.map((g) => {
        const Icon = GROUP_ICON[g.id];
        return (
          <details key={g.id} className="group rounded-xl border bg-card">
            <summary className="flex cursor-pointer list-none items-start gap-3 rounded-xl p-3 outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2 font-medium text-sm">
                  {g.label}
                  <span className="rounded-full bg-muted px-1.5 font-mono text-[11px] tabular-nums">
                    {g.items.length}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground text-xs">
                    <i className={cn("size-2 rounded-full", SEVERITY_DOT[g.severity])} />
                    {SEVERITY_TEXT[g.severity]}
                  </span>
                </span>
                <span className="mt-0.5 block text-muted-foreground text-xs">{g.summary}</span>
              </span>
              <ChevronRight className="mt-1 size-4 text-muted-foreground transition-transform group-open:rotate-90 motion-reduce:transition-none" />
            </summary>
            <ul className="grid gap-1.5 border-t px-4 py-3 text-sm">
              {g.items.map((item) => (
                <li key={item.text} className="flex gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
                  {item.hint ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help underline decoration-dotted underline-offset-4">{item.text}</span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">{item.hint}</TooltipContent>
                    </Tooltip>
                  ) : (
                    item.text
                  )}
                </li>
              ))}
            </ul>
          </details>
        );
      })}
    </div>
  );
}

/** The disclosure rules in force, as chips; hover for the card's own sentence. */
export function PrivacyChips({ chips }: { chips: PrivacyChip[] }) {
  if (!chips.length) return null;
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Privacy rules in force">
      {chips.map((chip) => (
        <li key={chip.label}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex h-7 cursor-help items-center gap-1.5 rounded-full border px-3 text-xs">
                <EyeOff className="size-3 text-muted-foreground" aria-hidden="true" />
                {chip.label}
                {chip.count !== undefined && <b className="font-mono tabular-nums">{chip.count}</b>}
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">{chip.hint}</TooltipContent>
          </Tooltip>
        </li>
      ))}
    </ul>
  );
}
