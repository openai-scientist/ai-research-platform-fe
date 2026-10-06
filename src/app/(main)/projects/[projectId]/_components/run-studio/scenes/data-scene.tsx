"use client";

import { useRef, useState } from "react";

import { cn } from "cn";
import { Check, ChevronDown, FileSpreadsheet, Lock } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { DataIssue } from "@/lib/run-stream/contract";
import type { DataContent } from "@/lib/run-stream/run-state";

import { AnimatedNumber } from "../animated-number";
import { AgentCursor } from "../run-bits";
import { useReveal } from "../workspace-context";

const cellKey = (row: number, column: string) => `${row}:${column}`;

function cursorTarget(data: DataContent): string | null {
  if (data.version) return "version";
  const fixedIds = Object.keys(data.fixes);
  const lastFixed = data.issues.find((i) => i.id === fixedIds[fixedIds.length - 1]);
  const last = lastFixed ?? data.issues[data.issues.length - 1];
  if (last) {
    const cell =
      last.cells[0] ?? (last.rows[0] !== undefined ? { row: last.rows[0], column: data.columns[0]?.name ?? "" } : null);
    if (cell) return `cell:${cellKey(cell.row, cell.column)}`;
  }
  const profiled = Object.keys(data.profiled);
  return profiled.length ? `col:${profiled[profiled.length - 1]}` : null;
}

export function DataScene({ data, live }: { data: DataContent; live: boolean }) {
  const scene = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const [flash, setFlash] = useState<{ id: string; at: number } | null>(null);
  const target = cursorTarget(data);
  const versionRef = useRef<HTMLDivElement>(null);
  useReveal(versionRef, Boolean(data.version), live);

  const issueCells = new Map<string, DataIssue>();
  for (const issue of data.issues) for (const c of issue.cells) issueCells.set(cellKey(c.row, c.column), issue);
  const issueRows = new Map<number, DataIssue>();
  for (const issue of data.issues) for (const r of issue.rows) issueRows.set(r, issue);

  const jump = (issue: DataIssue) => {
    const row = issue.cells[0]?.row ?? issue.rows[0];
    const tr = grid.current?.querySelector<HTMLElement>(`tr[data-row="${row}"]`);
    if (tr && grid.current) grid.current.scrollTo({ top: Math.max(0, tr.offsetTop - 90), behavior: "smooth" });
    setFlash({ id: issue.id, at: Date.now() });
  };
  const flashing = (issue: DataIssue | undefined) => Boolean(issue && flash?.id === issue.id);
  const problems = data.issues.length - Object.keys(data.fixes).length;
  const profiledCount = Object.keys(data.profiled).length;
  const allProfiled = profiledCount > 0 && profiledCount === data.columns.length;

  return (
    <div ref={scene} className="relative flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid size-8 place-items-center rounded-lg bg-teal-500/12 text-teal-700 dark:text-teal-300">
          <FileSpreadsheet className="size-4" />
        </span>
        <div className="flex flex-wrap items-baseline gap-2.5">
          <span className="font-mono font-semibold text-sm">{data.file || "Opening the file…"}</span>
          <motion.span
            key={data.version ? "v2" : "v1"}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn(
              "rounded-md px-1.5 py-0.5 font-mono text-xs",
              data.version ? "bg-teal-500/15 text-teal-700 dark:text-teal-300" : "bg-muted text-muted-foreground",
            )}
          >
            {data.version ? `v${data.version.version} · cleaned` : "v1 · as uploaded"}
          </motion.span>
        </div>
        <dl className="ml-auto flex gap-6 text-right">
          <Stat label="Rows">{data.totalRows ? <AnimatedNumber value={data.rowsNow} /> : "–"}</Stat>
          <Stat label="Columns">{profiledCount || "–"}</Stat>
          <Stat label="Problems">{data.issues.length ? problems : "–"}</Stat>
          <Stat label="Clean cells">{data.version ? "100%" : allProfiled ? "98.6%" : "–"}</Stat>
        </dl>
      </div>

      <div className="flex min-h-12 flex-wrap items-stretch gap-2">
        {data.issues.length === 0 && (
          <p className="self-center text-muted-foreground text-xs">
            Problems show up here once every column is profiled. Click one to jump to it in the table.
          </p>
        )}
        <AnimatePresence>
          {data.issues.map((issue, i) => {
            const fixed = data.fixes[issue.id];
            return (
              <motion.button
                key={issue.id}
                type="button"
                layout
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 420, damping: 24 }}
                onClick={() => jump(issue)}
                className={cn(
                  "grid grid-cols-[22px_auto] items-center gap-2.5 rounded-xl border bg-card py-1.5 pr-3 pl-2 text-left outline-none transition-[border-color,box-shadow] hover:shadow-xs focus-visible:ring-3 focus-visible:ring-ring/50",
                )}
              >
                <span
                  className={cn(
                    "grid size-[22px] place-items-center rounded-md font-mono font-semibold text-[11px] transition-colors",
                    fixed && "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
                    !fixed && issue.tone === "error" && "bg-rose-500/12 text-rose-700 dark:text-rose-300",
                    !fixed && issue.tone === "warning" && "bg-amber-500/15 text-amber-800 dark:text-amber-300",
                  )}
                >
                  {fixed ? <Check className="size-3" strokeWidth={3} /> : i + 1}
                </span>
                <span className="flex flex-col leading-tight">
                  <span className="font-semibold text-xs">{issue.title}</span>
                  <span
                    className={cn(
                      "text-[11.5px]",
                      fixed ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground",
                    )}
                  >
                    {fixed ? fixed.fix : issue.detail}
                  </span>
                </span>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      <div ref={grid} className="relative -mx-4 max-h-[min(60vh,560px)] overflow-auto border-y md:-mx-8">
        <table className="w-full border-separate border-spacing-0 font-mono text-xs tabular-nums">
          <thead>
            <tr>
              <th className="sticky top-0 left-0 z-30 w-16 border-r border-b bg-background py-2.5 pr-3 pl-4 text-right font-normal text-[11px] text-muted-foreground md:pl-8">
                #
              </th>
              {data.columns.map((col) => {
                const clean = data.profiled[col.name];
                const issue = data.issues.find((i) => i.column === col.name);
                const fixed = issue && data.fixes[issue.id];
                const bad = issue && !fixed ? Math.max(issue.share, 2.5) : 0;
                return (
                  <th
                    key={col.name}
                    data-cursor={`col:${col.name}`}
                    className="sticky top-0 z-20 min-w-32 border-b bg-background px-3.5 pt-2.5 pb-2 text-left align-top font-semibold"
                  >
                    <span className="block pr-7">{col.name}</span>
                    <span
                      className={cn(
                        "mt-0.5 block font-medium font-sans text-[11px] text-muted-foreground transition-all duration-300",
                        clean === undefined ? "-translate-y-1 opacity-0" : "opacity-100",
                      )}
                    >
                      {col.type} · {col.unit}
                    </span>
                    <span className="mt-2 flex h-1 overflow-hidden rounded-full bg-muted">
                      <span
                        className="bg-emerald-500 transition-[width] duration-700 ease-out"
                        style={{ width: clean === undefined ? 0 : `${100 - bad}%` }}
                      />
                      <span
                        className={cn(
                          "transition-[width] duration-500 ease-out",
                          issue?.tone === "warning" ? "bg-amber-500" : "bg-rose-500",
                        )}
                        style={{ width: `${bad}%` }}
                      />
                    </span>
                    {issue && (
                      <motion.span
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className={cn(
                          "absolute top-2.5 right-2.5 grid h-[18px] min-w-5 place-items-center rounded-full px-1.5 font-semibold text-[10.5px]",
                          fixed && "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
                          !fixed && issue.tone === "error" && "bg-rose-500/12 text-rose-700 dark:text-rose-300",
                          !fixed && issue.tone === "warning" && "bg-amber-500/15 text-amber-800 dark:text-amber-300",
                        )}
                      >
                        {fixed ? <Check className="size-3" strokeWidth={3} /> : issue.affected_rows}
                      </motion.span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, r) => {
              const rowIssue = issueRows.get(r);
              const removed = data.removed.includes(r);
              const gone = removed && Boolean(data.version);
              return (
                <motion.tr
                  key={`${r}-${row[0]}`}
                  data-row={r}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(r, 16) * 0.026, duration: 0.35 }}
                  className="group/row"
                >
                  <td
                    className={cn(
                      "sticky left-0 z-10 border-r border-b bg-background pr-3 pl-4 text-right text-[11px] text-muted-foreground transition-all md:pl-8",
                      gone ? "py-0 text-[0px]" : "py-1.5",
                    )}
                  >
                    {r + 1}
                  </td>
                  {row.map((value, c) => {
                    const column = data.columns[c]?.name ?? "";
                    const key = cellKey(r, column);
                    const replaced = data.replaced[key];
                    const issue = issueCells.get(key) ?? (rowIssue && !rowIssue.cells.length ? rowIssue : undefined);
                    const open = issue && !data.fixes[issue.id] && !removed;
                    return (
                      <td
                        key={column}
                        data-cursor={`cell:${key}`}
                        className={cn("whitespace-nowrap border-b p-0", gone && "border-transparent")}
                      >
                        <div
                          className={cn(
                            "overflow-hidden px-3.5 transition-all duration-500",
                            gone ? "max-h-0 py-0 opacity-0" : "max-h-10 py-1.5",
                            "group-hover/row:bg-muted/60",
                            open &&
                              issue?.tone === "error" &&
                              "bg-rose-500/10 text-rose-700 ring-1 ring-rose-500/35 ring-inset dark:text-rose-300",
                            open &&
                              issue?.tone === "warning" &&
                              "bg-amber-500/12 text-amber-800 ring-1 ring-amber-500/40 ring-inset dark:text-amber-300",
                            replaced && "bg-emerald-500/10",
                            removed && !gone && "bg-rose-500/8 text-muted-foreground line-through",
                            flashing(issue) && "animate-pulse ring-2 ring-foreground ring-inset",
                          )}
                        >
                          {replaced ? (
                            <>
                              <s className="text-muted-foreground">{replaced.from}</s>
                              <motion.span
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="ml-1.5 inline-block font-semibold text-emerald-700 dark:text-emerald-300"
                              >
                                {replaced.to}
                              </motion.span>
                            </>
                          ) : (
                            value
                          )}
                        </div>
                      </td>
                    );
                  })}
                </motion.tr>
              );
            })}
          </tbody>
        </table>
        {data.rows.length > 0 && profiledCount < data.columns.length && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-12 h-11 bg-gradient-to-b from-transparent via-teal-500/15 to-teal-500/40"
            initial={{ y: 0, opacity: 1 }}
            animate={{ y: 460, opacity: [1, 1, 0] }}
            transition={{ duration: 1.9, ease: [0.2, 0.8, 0.2, 1] }}
          />
        )}
      </div>
      <div className="-mt-1 flex flex-wrap justify-between gap-3 text-muted-foreground text-xs">
        <span>
          Showing the first {data.rows.length} of {data.totalRows.toLocaleString("en-US")} rows. Scroll the table for
          more.
        </span>
        <span>
          {data.version
            ? `${data.removed.length} rows shown here were removed`
            : data.issues.length
              ? `${data.issues.length} problems in ${new Set(data.issues.map((i) => i.column)).size} columns`
              : allProfiled
                ? `${data.columns.length} columns profiled`
                : ""}
        </span>
      </div>

      <div ref={versionRef}>
        {data.version && (
          <Collapsible>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap items-center gap-4 rounded-xl border bg-card px-4 py-3"
            >
              <VersionNode version={1} detail={`As uploaded · ${data.totalRows.toLocaleString("en-US")} rows`} locked />
              <span className="flex w-36 flex-col items-center gap-0.5">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 140 12"
                  preserveAspectRatio="none"
                  className="h-3 w-full overflow-visible"
                >
                  <motion.path
                    d="M0 6H136 M130 1 L137 6 L130 11"
                    className="fill-none stroke-teal-600 dark:stroke-teal-400"
                    strokeWidth={1.5}
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.7 }}
                  />
                </svg>
                <span className="text-[11px] text-muted-foreground">
                  {data.version.fixes} fixes · −{data.version.removed} rows
                </span>
              </span>
              <motion.div
                data-cursor="version"
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.45, type: "spring", stiffness: 380, damping: 20 }}
                className="rounded-lg px-2.5 py-1.5 ring-1 ring-teal-600 dark:ring-teal-400"
              >
                <VersionNode
                  version={data.version.version}
                  detail={`Cleaned · ${data.version.rows.toLocaleString("en-US")} rows · sha256 ${data.version.sha256}`}
                  accent
                />
              </motion.div>
              <span className="inline-flex items-center gap-1.5 text-muted-foreground text-xs">
                <Lock className="size-3" />
                v1 is never overwritten. Every later stage uses v2.
              </span>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="ml-auto">
                  Change log
                  <ChevronDown />
                </Button>
              </CollapsibleTrigger>
            </motion.div>
            <CollapsibleContent>
              <div className="mt-2.5 overflow-x-auto rounded-xl border bg-card">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      {["#", "Change", "Column", "Rows affected", "How"].map((h) => (
                        <th key={h} className="whitespace-nowrap px-3.5 py-2 text-left font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.issues.map((issue, i) => (
                      <tr key={issue.id} className="border-t">
                        <td className="px-3.5 py-2 font-mono">{i + 1}</td>
                        <td className="px-3.5 py-2">
                          {issue.title}: {data.fixes[issue.id]?.fix.toLowerCase()}
                        </td>
                        <td className="px-3.5 py-2 font-mono">{issue.column}</td>
                        <td className="px-3.5 py-2 font-mono">{issue.affected_rows}</td>
                        <td className="px-3.5 py-2">{data.fixes[issue.id]?.method}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
      <AgentCursor agent={live ? "steward" : null} container={scene} target={target} version={data.rows.length} />
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-end">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="font-mono font-semibold text-[15px] tabular-nums">{children}</dd>
    </div>
  );
}

function VersionNode({
  version,
  detail,
  locked,
  accent,
}: {
  version: number;
  detail: string;
  locked?: boolean;
  accent?: boolean;
}) {
  return (
    <span className="flex flex-col gap-0.5 text-xs">
      <span
        className={cn(
          "flex items-center gap-1.5 font-mono font-semibold text-sm",
          accent && "text-teal-700 dark:text-teal-300",
        )}
      >
        {locked && <Lock className="size-3 text-muted-foreground" />}v{version}
      </span>
      <span className="text-muted-foreground">{detail}</span>
    </span>
  );
}
