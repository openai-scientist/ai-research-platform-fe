"use client";

import { useCallback, useId, useRef, useState } from "react";

import { cn } from "cn";
import { ArrowDownRight, ChevronDown, TriangleAlert } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { DataCardVariable } from "@/lib/api/services/fetch-dataset-runs";

import { ColumnKindIcon } from "../column-kind-icon";
import type { ColumnKind } from "../dataset-preview";
import { FLAG_HINTS, humanFlag, ROLE_LABEL } from "../dataset-review-state";
import { AgentCursor } from "../run-studio/run-bits";
import { RUN_EASE } from "../run-studio/run-track";
import { displayFieldName } from "./dataset-field-name";
import { splitClause } from "./dataset-run-visuals";
import { DatasetSkeleton } from "./dataset-skeleton";

const KIND: Record<DataCardVariable["type"], ColumnKind> = { numeric: "number", string: "text", date: "date" };

function Missing({
  variable,
  approximate,
  pending,
  live,
}: {
  variable?: DataCardVariable;
  approximate: boolean;
  pending: boolean;
  live: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const valid = variable?.summary.n_valid;
  const missing = variable?.summary.n_missing;
  if (pending)
    return (
      <div className="flex min-h-4 items-center justify-end">
        <DatasetSkeleton scan={live} className="h-2.5 w-12" />
        <span className="sr-only">{live ? "Measuring missing values" : "Pending profile"}</span>
      </div>
    );
  if (valid == null || missing == null) return <span>{variable ? "Withheld" : "—"}</span>;
  const total = valid + missing;
  if (!total) return <span>—</span>;
  const pct = (missing / total) * 100;
  return (
    <span className="flex items-center justify-end gap-2">
      <span className="hidden h-1 w-16 overflow-hidden rounded-full bg-muted sm:block" aria-hidden="true">
        <motion.span
          className={cn("block h-full rounded-full", pct >= 20 ? "bg-amber-500" : "bg-foreground/65")}
          initial={live && !reducedMotion ? { width: 0 } : false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: reducedMotion ? 0 : 0.45, ease: RUN_EASE }}
        />
      </span>
      <span className="font-mono tabular-nums">
        {approximate ? "≈" : ""}
        {pct.toLocaleString("en-US", { maximumFractionDigits: 1 })}%
      </span>
    </span>
  );
}

export function DatasetColumnEvidence({
  columnNames,
  variables,
  reason,
  agent,
  partialProfile = false,
  local,
  activeColumn,
  selectedColumn,
  pendingColumn,
  onSelectColumn,
}: {
  columnNames: readonly string[];
  variables?: readonly DataCardVariable[];
  reason?: string;
  agent: "steward" | "reviewer" | null;
  partialProfile?: boolean;
  local: boolean;
  activeColumn?: string;
  selectedColumn?: string;
  pendingColumn?: string;
  onSelectColumn?: (column: string) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const evidenceId = useId();
  const canvas = useRef<HTMLElement>(null);
  const [surfaceReady, setSurfaceReady] = useState(false);
  const attachCanvas = useCallback((element: HTMLElement | null) => {
    canvas.current = element;
    setSurfaceReady(Boolean(element));
  }, []);
  const rowButtons = useRef(new Map<string, HTMLButtonElement>());
  const reducedMotion = useReducedMotion();
  const byName = new Map(variables?.map((variable) => [variable.name, variable]));
  const names = [...new Set(variables?.length && !partialProfile ? variables.map(({ name }) => name) : columnNames)];
  const referenced = new Set(reason?.split(/;\s*/).flatMap((clause) => splitClause(clause).columns));
  const linked = names.filter((name) => referenced.has(name));
  const target = activeColumn ?? (agent ? [...referenced].find((name) => names.includes(name)) : undefined);

  function inspect(name: string) {
    setExpanded(name);
    const button = rowButtons.current.get(name);
    button?.scrollIntoView({ block: "nearest", behavior: reducedMotion ? "instant" : "smooth" });
    button?.focus({ preventScroll: true });
  }

  const aggregateLabel = local ? "Released aggregates · counts rounded" : "Profile aggregates";
  const sourceLabel = variables?.length ? aggregateLabel : "Source schema · profile pending";
  const profileLabel = partialProfile ? `${variables?.length ?? 0} of ${names.length} columns profiled` : sourceLabel;
  if (!names.length) return null;
  return (
    <section ref={attachCanvas} aria-label="Column evidence" className="relative min-w-0">
      {!onSelectColumn && (
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-2.5">
          <h3 className="font-medium text-sm">Column evidence</h3>
          <span className="text-muted-foreground text-xs">{profileLabel}</span>
        </div>
      )}
      {linked.length > 0 && (
        <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1 px-4 pb-2 text-muted-foreground text-xs">
          <span>Referenced in this check</span>
          {linked.map((name) => (
            <Button
              key={name}
              size="xs"
              type="button"
              variant="link"
              className="max-w-full"
              onClick={() => inspect(name)}
            >
              <ArrowDownRight data-icon="inline-start" />
              <span className="truncate">{displayFieldName(name)}</span>
            </Button>
          ))}
        </div>
      )}
      <Table className="table-fixed text-xs" aria-label="Dataset columns">
        <TableHeader className="bg-muted/40">
          <TableRow className="hover:bg-transparent">
            <TableHead scope="col" className="h-8 w-3/5 px-4 sm:w-1/2">
              Column
            </TableHead>
            <TableHead scope="col" className="hidden h-8 sm:table-cell">
              Role
            </TableHead>
            <TableHead scope="col" className="h-8 px-4 text-right">
              Missing
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {names.map((name) => {
            const variable = byName.get(name);
            const open = name === expanded;
            const linkedColumn = referenced.has(name);
            const role = variable && ROLE_LABEL[variable.role]?.split(" · ")[0];
            return (
              <ColumnRows
                key={name}
                name={name}
                variable={variable}
                role={role}
                open={open}
                selected={selectedColumn === name}
                evidenceId={evidenceId}
                linkedColumn={linkedColumn}
                live={target === name}
                local={local}
                pending={pendingColumn === name || (partialProfile && !variable)}
                onToggle={() => {
                  onSelectColumn?.(name);
                  setExpanded(open ? null : name);
                }}
                register={(button) => {
                  if (button) rowButtons.current.set(name, button);
                  else rowButtons.current.delete(name);
                }}
              />
            );
          })}
        </TableBody>
      </Table>
      {surfaceReady && !reducedMotion && !onSelectColumn && (
        <AgentCursor
          agent={agent}
          click
          container={canvas}
          target={target ? `dataset-column:${target}` : null}
          version={expanded}
        />
      )}
    </section>
  );
}

function ColumnRows({
  name,
  variable,
  role,
  open,
  selected,
  evidenceId,
  linkedColumn,
  live,
  local,
  pending,
  onToggle,
  register,
}: {
  name: string;
  variable?: DataCardVariable;
  role?: string;
  open: boolean;
  selected: boolean;
  evidenceId: string;
  linkedColumn: boolean;
  live: boolean;
  local: boolean;
  pending: boolean;
  onToggle: () => void;
  register: (element: HTMLButtonElement | null) => void;
}) {
  const flags = variable?.flags ?? [];
  const reducedMotion = useReducedMotion();
  return (
    <>
      <TableRow
        data-state={open || selected ? "selected" : undefined}
        className={cn(linkedColumn && !live && "bg-amber-500/8", live && "bg-sky-500/10 motion-safe:transition-colors")}
      >
        <TableCell className="px-3 py-0.5">
          <Button
            ref={register}
            data-cursor={`dataset-column:${name}`}
            variant="ghost"
            size="sm"
            type="button"
            aria-expanded={open}
            aria-controls={open ? evidenceId : undefined}
            className="max-w-full justify-start"
            onClick={onToggle}
          >
            {variable && <ColumnKindIcon kind={KIND[variable.type]} />}
            <span className="truncate">{displayFieldName(name)}</span>
            {linkedColumn && !live && (
              <TriangleAlert aria-label="Referenced in this check" className="text-amber-600 dark:text-amber-300" />
            )}
            <ChevronDown
              aria-hidden="true"
              className={cn("text-muted-foreground motion-safe:transition-transform", open && "rotate-180")}
            />
          </Button>
          {live && linkedColumn && <span className="sr-only">Current check</span>}
        </TableCell>
        <TableCell className="hidden text-muted-foreground sm:table-cell">{role ?? "—"}</TableCell>
        <TableCell data-profile-row-result={name} className="px-4 text-right text-muted-foreground">
          <motion.div
            key={pending ? "pending" : (variable?.name ?? "metadata")}
            initial={!pending && variable && !reducedMotion ? { opacity: 0, y: 5 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.3, ease: RUN_EASE }}
          >
            <Missing variable={variable} approximate={local} pending={pending} live={live} />
          </motion.div>
        </TableCell>
      </TableRow>
      {open && (
        <TableRow className="bg-muted/30 hover:bg-muted/30">
          <TableCell colSpan={3} className="whitespace-normal px-5 py-3">
            <div id={evidenceId} className="grid gap-1.5 text-muted-foreground">
              {variable ? (
                <>
                  {variable.label && <p className="wrap-anywhere font-medium text-foreground">{variable.label}</p>}
                  <p>{[variable.type, variable.measure, ROLE_LABEL[variable.role]].filter(Boolean).join(" · ")}</p>
                  {flags.length > 0 && (
                    <ul className="grid list-disc gap-1 pl-4">
                      {flags.map((flag) => (
                        <li key={flag}>{FLAG_HINTS[flag] ?? humanFlag(flag)}</li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <p>Only the column name has been reported.</p>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
