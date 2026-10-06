"use client";

import { useRef } from "react";

import { cn } from "cn";
import { ArrowRight, Check, FileText, Merge } from "lucide-react";
import { motion } from "motion/react";

import type { SearchContent } from "@/lib/run-stream/run-state";

import { AnimatedNumber } from "../animated-number";
import { AgentCursor, PulseDot } from "../run-bits";
import { useReveal } from "../workspace-context";
import { Pane, Placeholder, TypeText } from "./scene-ui";

const SOURCE_TONE: Record<string, string> = {
  openalex: "bg-cyan-600",
  s2: "bg-blue-600",
  arxiv: "bg-rose-600",
};

/** Heat for a cell: more hits, deeper colour. */
function heat(hits: number) {
  if (hits === 0) return "text-muted-foreground";
  if (hits < 5) return "bg-cyan-500/8";
  if (hits < 20) return "bg-cyan-500/16";
  if (hits < 35) return "bg-cyan-500/28";
  return "bg-cyan-500/40";
}

/** Dots for a query's length: the engines want 3 to 6 words. */
function WordMeter({ words }: { words: number }) {
  const ok = words >= 3 && words <= 6;
  return (
    <span className="flex items-center gap-1.5" title={`${words} words; 3 to 6 is the rule`}>
      <span className="flex gap-0.5">
        {Array.from({ length: 6 }, (_, i) => (
          <i
            key={i}
            className={cn(
              "size-1.5 rounded-full",
              i < words ? (ok ? "bg-emerald-500" : "bg-amber-500") : "bg-foreground/15",
            )}
          />
        ))}
      </span>
      <span className="text-[11px] text-muted-foreground tabular-nums">{words} words</span>
    </span>
  );
}

/** "2026-10-06T07:48:12Z" → "07:48 UTC". */
const utcTime = (iso: string) => `${iso.slice(11, 16)} UTC`;

/** Why the kept record won: a DOI first, then citations. */
function keptWhy(m: SearchContent["merged"][number]) {
  const kept = m.records.find((r) => r.source === m.kept);
  if (!kept) return "first found";
  const othersLackDoi = m.records.some((r) => r !== kept && !r.has_doi);
  const mostCited = m.records.every((r) => r.citations <= kept.citations);
  if (othersLackDoi && kept.has_doi && mostCited) return "it has a DOI and the most citations";
  if (othersLackDoi && kept.has_doi) return "it has a DOI";
  return "the most citations";
}

export function SearchScene({ data, live }: { data: SearchContent; live: boolean }) {
  const scene = useRef<HTMLDivElement>(null);
  const collectRef = useRef<HTMLDivElement>(null);
  const mergeRef = useRef<HTMLDivElement>(null);
  const sent = Object.keys(data.cells);
  useReveal(collectRef, sent.length > 0, live);
  useReveal(mergeRef, data.merged.length + (data.collected ? 1 : 0), live);

  const total = data.queries.length * data.sources.length;
  const raw = Object.values(data.cells).reduce<number>((a, v) => a + (v ?? 0), 0);
  const lastCell = sent[sent.length - 1];
  const bySource = (sourceId: string) => data.queries.reduce((a, q) => a + (data.cells[`${q.id}:${sourceId}`] ?? 0), 0);

  let target: string | null = data.queries.length ? `query:${data.queries[data.queries.length - 1].id}` : null;
  if (lastCell) target = `cell:${lastCell}`;
  if (data.merged.length) target = `merged:${data.merged.length - 1}`;
  if (data.collected) target = "files";

  return (
    <div ref={scene} className="relative flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-3">
        {data.strategies.map((strategy, si) => {
          const queries = data.queries.filter((q) => q.strategy_id === strategy.id);
          return (
            <motion.section
              key={strategy.id}
              initial={live ? { opacity: 0, y: 10 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="flex min-w-0 flex-col gap-2.5 rounded-xl bg-card p-4 ring-1 ring-foreground/10"
            >
              <header className="flex items-center gap-2 text-sm">
                <b className="inline-flex h-5 items-center rounded-md bg-cyan-500/12 px-1.5 font-mono font-semibold text-[11px] text-cyan-700 dark:text-cyan-300">
                  {strategy.id}
                </b>
                <b className="font-semibold">{strategy.title}</b>
                <span className="ml-auto text-[11px] text-muted-foreground">angle {si + 1} of 3</span>
              </header>
              <p className="-mt-1 text-muted-foreground text-xs">{strategy.why}</p>
              <ul className="flex flex-col gap-1.5">
                {queries.map((q) => (
                  <motion.li
                    key={q.id}
                    data-cursor={`query:${q.id}`}
                    initial={live ? { opacity: 0, x: -6 } : false}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2.5 rounded-lg bg-muted/60 px-2.5 py-1.5"
                  >
                    <TypeText
                      text={q.text}
                      live={live}
                      speed={70}
                      className="min-w-0 flex-1 truncate font-mono text-xs"
                    />
                    <WordMeter words={q.text.split(" ").length} />
                  </motion.li>
                ))}
              </ul>
              <span className="mt-auto flex items-center gap-1.5 border-t pt-2 text-[11px] text-muted-foreground">
                {queries.length} {queries.length === 1 ? "query" : "queries"}
                {queries.length > 0 && queries.every((q) => q.text.split(" ").length <= 6) && (
                  <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                    <Check className="size-3" />
                    all short enough
                  </span>
                )}
              </span>
            </motion.section>
          );
        })}
        {data.strategies.length > 0 &&
          data.strategies.length < 3 &&
          Array.from({ length: 3 - data.strategies.length }, (_, i) => (
            <Placeholder key={`angle-${data.strategies.length + i}`} className="h-full">
              Angle {data.strategies.length + i + 1} of 3
            </Placeholder>
          ))}
        {!data.strategies.length && (
          <Placeholder className="lg:col-span-3">Search angles are planned first</Placeholder>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)]">
        <div ref={collectRef} className="flex flex-col">
          {data.sources.length ? (
            <Pane
              title="Collecting"
              aside={`${(data.delayMs / 1000).toFixed(1)} s between requests, to respect each source · ${sent.length} of ${total} sent`}
              className="flex-1"
            >
              <div className="mb-3 flex h-2.5 items-center gap-1" aria-hidden>
                {Array.from({ length: total }, (_, i) => {
                  const key = sent[i];
                  const source = key?.split(":")[1];
                  const pending = key ? data.cells[key] === null : false;
                  return (
                    <motion.i
                      key={key ?? `slot-${i}`}
                      className={cn(
                        "w-full rounded-full",
                        key ? SOURCE_TONE[source ?? ""] : "bg-muted",
                        key ? "h-full" : "h-1",
                        pending && "animate-pulse",
                      )}
                      initial={key && live ? { scaleY: 0.2, opacity: 0 } : false}
                      animate={{ scaleY: 1, opacity: 1 }}
                      style={{ transformOrigin: "bottom" }}
                    />
                  );
                })}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-muted-foreground text-xs">
                    <tr className="border-b">
                      <th className="pr-3 pb-2 text-left font-medium">Query</th>
                      {data.sources.map((s) => (
                        <th key={s.id} className="whitespace-nowrap px-2 pb-2 text-right font-medium">
                          <span className="inline-flex items-center gap-1.5">
                            <i className={cn("size-2 rounded-sm", SOURCE_TONE[s.id])} />
                            {s.name}
                          </span>
                        </th>
                      ))}
                      <th className="pb-2 pl-2 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.queries.map((q) => {
                      const row = data.sources.map((s) => data.cells[`${q.id}:${s.id}`]);
                      const sum = row.reduce<number>((a, v) => a + (v ?? 0), 0);
                      return (
                        <tr key={q.id} className="border-b last:border-0">
                          <td className="max-w-56 truncate py-1.5 pr-3 font-mono text-xs">{q.text}</td>
                          {data.sources.map((s, i) => {
                            const v = row[i];
                            const key = `${q.id}:${s.id}`;
                            return (
                              <td key={s.id} data-cursor={`cell:${key}`} className="px-0.5 py-0.5 text-right">
                                {v === undefined ? (
                                  <span className="block px-2 py-1 text-muted-foreground/40">·</span>
                                ) : v === null ? (
                                  <span className="flex justify-end px-2 py-1.5">
                                    <PulseDot className={SOURCE_TONE[s.id]} />
                                  </span>
                                ) : (
                                  <motion.span
                                    initial={live ? { scale: 0.7, opacity: 0 } : false}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ type: "spring", stiffness: 500, damping: 24 }}
                                    className={cn(
                                      "ml-auto block w-fit min-w-10 rounded-md px-2 py-1 text-right font-mono text-xs tabular-nums transition-colors",
                                      heat(v),
                                    )}
                                  >
                                    {v}
                                  </motion.span>
                                )}
                              </td>
                            );
                          })}
                          <td className="py-1 pl-2 text-right font-mono font-semibold text-xs tabular-nums">
                            {row.some((v) => v !== undefined) ? sum : ""}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 font-mono font-semibold text-xs">
                      <td className="pt-2 pr-3 font-medium font-sans text-muted-foreground">All queries</td>
                      {data.sources.map((s) => (
                        <td key={s.id} className="px-2 pt-2 text-right tabular-nums">
                          <AnimatedNumber value={bySource(s.id)} duration={400} />
                        </td>
                      ))}
                      <td className="pt-2 pl-2 text-right tabular-nums">
                        <AnimatedNumber value={raw} duration={400} />
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Pane>
          ) : (
            <Placeholder>Each query then goes to every source</Placeholder>
          )}
        </div>

        <div ref={mergeRef} className="flex flex-col">
          {data.merged.length || data.collected ? (
            <Pane
              title="Merging duplicates"
              aside="same DOI, arXiv ID or title · keeps the record with a DOI, then most citations"
              className="flex-1"
            >
              <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 text-center">
                <span className="rounded-lg bg-muted/70 px-2 py-2">
                  <AnimatedNumber value={raw} className="block font-mono font-semibold text-xl tabular-nums" />
                  <span className="text-muted-foreground text-xs">hits</span>
                </span>
                <ArrowRight className="size-4 text-muted-foreground" />
                <span className="rounded-lg bg-cyan-500/12 px-2 py-2">
                  {data.collected ? (
                    <AnimatedNumber
                      value={data.collected.unique}
                      className="block font-mono font-semibold text-cyan-700 text-xl tabular-nums dark:text-cyan-300"
                    />
                  ) : (
                    <span className="block font-mono font-semibold text-muted-foreground text-xl">…</span>
                  )}
                  <span className="text-muted-foreground text-xs">unique papers</span>
                </span>
              </div>
              <ul className="flex flex-col gap-2">
                {data.merged.map((m, i) => (
                  <motion.li
                    key={m.title}
                    data-cursor={`merged:${i}`}
                    initial={live ? { opacity: 0, y: 6 } : false}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-1.5 rounded-lg border px-3 py-2 text-xs"
                  >
                    <span className="line-clamp-2 font-medium text-[12.5px] leading-snug">{m.title}</span>
                    <ul className="flex flex-col gap-1">
                      {m.records.map((r, k) => {
                        const kept = r.source === m.kept;
                        return (
                          <motion.li
                            key={r.record_id}
                            title={r.record_id}
                            initial={live ? { y: (k - (m.records.length - 1) / 2) * -10, opacity: 0 } : false}
                            animate={{ y: 0, opacity: kept ? 1 : 0.55 }}
                            transition={{ delay: live ? 0.15 + k * 0.1 : 0, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                            className={cn(
                              "grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 rounded-md px-2 py-1 transition-colors duration-500",
                              kept ? "bg-cyan-500/10 ring-1 ring-cyan-500/30" : "bg-muted/60",
                            )}
                          >
                            <span className="flex min-w-0 items-center gap-1.5">
                              {kept ? (
                                <Check className="size-3 shrink-0 text-cyan-700 dark:text-cyan-300" />
                              ) : (
                                <Merge className="size-3 shrink-0 text-muted-foreground" />
                              )}
                              <span className={cn("truncate", kept && "font-medium")}>{r.source}</span>
                            </span>
                            <span
                              className={cn(
                                "inline-flex h-4 items-center rounded px-1 text-[10px]",
                                r.has_doi
                                  ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
                                  : "bg-muted text-muted-foreground line-through",
                              )}
                            >
                              DOI
                            </span>
                            <span className="w-24 text-right text-muted-foreground tabular-nums">
                              {r.citations.toLocaleString("en-US")} citations
                            </span>
                          </motion.li>
                        );
                      })}
                    </ul>
                    <motion.span
                      initial={live ? { opacity: 0, y: 3 } : false}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: live ? 0.6 + m.records.length * 0.1 : 0 }}
                      className="text-[11px] text-muted-foreground"
                    >
                      {m.records.length} records → 1. Kept {m.kept}: {keptWhy(m)}.
                    </motion.span>
                  </motion.li>
                ))}
              </ul>
              {data.collected && (
                <div data-cursor="files" className="mt-3 flex flex-col gap-1.5 border-t pt-3">
                  <span className="text-muted-foreground text-xs">
                    {data.collected.duplicates} duplicates merged. Collected at {utcTime(data.collected.collected_at)},
                    with each paper's source, ID and citation count. Saved for the next stages:
                  </span>
                  {data.collected.files.map((f, i) => (
                    <motion.span
                      key={f.name}
                      initial={live ? { opacity: 0, x: -6 } : false}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.15 }}
                      className="flex items-center gap-2 text-xs"
                    >
                      <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                      <b className="shrink-0 font-medium">{f.name}</b>
                      <span className="truncate text-muted-foreground">{f.detail}</span>
                    </motion.span>
                  ))}
                </div>
              )}
            </Pane>
          ) : (
            <Placeholder>Papers found more than once are merged</Placeholder>
          )}
        </div>
      </div>
      <AgentCursor
        agent={live ? "librarian" : null}
        container={scene}
        target={target}
        version={`${data.queries.length}-${sent.length}-${data.merged.length}`}
      />
    </div>
  );
}
