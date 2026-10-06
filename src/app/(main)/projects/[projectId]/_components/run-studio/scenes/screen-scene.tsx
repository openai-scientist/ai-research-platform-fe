"use client";

import { Fragment, useEffect, useRef, useState } from "react";

import { cn } from "cn";
import { Check, X } from "lucide-react";
import { motion } from "motion/react";

import type { RejectedPaper, ShortlistPaper } from "@/lib/run-stream/contract";
import type { ScreenContent } from "@/lib/run-stream/run-state";

import { AgentCursor, launchFlight } from "../run-bits";
import { useReveal, useWorkspace } from "../workspace-context";
import { Pane, Placeholder } from "./scene-ui";

const W = 420;
const H = 290;
const PAD = { l: 34, r: 12, t: 12, b: 34 };
const px = (v: number) => PAD.l + v * (W - PAD.l - PAD.r);
const py = (v: number) => H - PAD.b - v * (H - PAD.t - PAD.b);

function Scatter({ data, hover, live }: { data: ScreenContent; hover: string | null; live: boolean }) {
  const kept = new Set(data.kept.map((p) => p.id));
  const rejected = new Set(data.rejected.map((p) => p.id));
  const dropped = new Set(data.dropped);
  const rMin = data.criteria?.relevanceMin ?? 0.7;
  const qMin = data.criteria?.qualityMin ?? 0.5;
  const firstNew = useRef(data.points.length);
  useEffect(() => {
    firstNew.current = data.points.length;
  });
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label="Relevance and quality of every paper"
    >
      <rect
        x={px(rMin)}
        y={py(1)}
        width={px(1) - px(rMin)}
        height={py(qMin) - py(1)}
        rx={6}
        className="fill-emerald-500/8 stroke-emerald-500/40"
        strokeDasharray="3 3"
      />
      <text
        x={px(1) - 6}
        y={py(1) + 13}
        textAnchor="end"
        className="fill-emerald-700 font-semibold text-[9px] dark:fill-emerald-300"
      >
        keep zone
      </text>
      <text
        x={px(rMin)}
        y={py(0) - 4}
        textAnchor="middle"
        className="fill-emerald-700/80 font-mono text-[7.5px] dark:fill-emerald-300/80"
      >
        ≥ {rMin}
      </text>
      <line
        x1={px(rMin)}
        x2={px(rMin)}
        y1={py(qMin)}
        y2={py(0) - 12}
        className="stroke-emerald-500/30"
        strokeDasharray="2 3"
      />
      <line
        x1={PAD.l}
        x2={px(rMin)}
        y1={py(qMin)}
        y2={py(qMin)}
        className="stroke-emerald-500/30"
        strokeDasharray="2 3"
      />
      <text
        x={PAD.l + 4}
        y={py(qMin) - 3}
        className="fill-emerald-700/80 font-mono text-[7.5px] dark:fill-emerald-300/80"
      >
        quality ≥ {qMin}
      </text>
      <line x1={PAD.l} x2={W - PAD.r} y1={H - PAD.b} y2={H - PAD.b} className="stroke-border" />
      <line x1={PAD.l} x2={PAD.l} y1={PAD.t} y2={H - PAD.b} className="stroke-border" />
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <Fragment key={t}>
          <text x={px(t)} y={H - PAD.b + 13} textAnchor="middle" className="fill-muted-foreground font-mono text-[8px]">
            {t}
          </text>
          <text x={PAD.l - 6} y={py(t) + 3} textAnchor="end" className="fill-muted-foreground font-mono text-[8px]">
            {t}
          </text>
        </Fragment>
      ))}
      <text x={(PAD.l + W - PAD.r) / 2} y={H - 4} textAnchor="middle" className="fill-muted-foreground text-[9px]">
        Relevance to the sub-questions →
      </text>
      <text
        x={10}
        y={(PAD.t + H - PAD.b) / 2}
        textAnchor="middle"
        transform={`rotate(-90 10 ${(PAD.t + H - PAD.b) / 2})`}
        className="fill-muted-foreground text-[9px]"
      >
        Quality →
      </text>
      {data.points.map((p, i) => {
        const isKept = kept.has(p.id);
        const isRejected = rejected.has(p.id);
        const inZone = p.relevance >= rMin && p.quality >= qMin;
        const fresh = live && i >= firstNew.current;
        const r = hover === p.id ? 6.5 : isKept || isRejected ? 4.2 : 3;
        return (
          <motion.circle
            key={p.id}
            data-point={p.id}
            cx={px(p.relevance)}
            cy={py(p.quality)}
            initial={fresh ? { r: 0, opacity: 0 } : false}
            animate={{ r, opacity: 1 }}
            transition={{ delay: fresh ? (i % 24) * 0.012 : 0, type: "spring", stiffness: 400, damping: 20 }}
            className={cn(
              "transition-colors duration-500",
              isKept && !dropped.has(p.id) && "fill-emerald-500 stroke-card",
              isKept && dropped.has(p.id) && "fill-card stroke-amber-500",
              isRejected && "fill-rose-500 stroke-card",
              !isKept && !isRejected && (inZone ? "fill-foreground/70" : "fill-muted-foreground/30"),
            )}
            strokeWidth={isKept && dropped.has(p.id) ? 1.6 : 1.2}
          />
        );
      })}
      {data.rejected.map((p) => {
        const point = data.points.find((x) => x.id === p.id);
        if (!point) return null;
        return (
          <motion.g key={p.id} initial={live ? { opacity: 0 } : false} animate={{ opacity: 1 }}>
            <text
              x={px(point.relevance) - 7}
              y={py(point.quality) + 3}
              textAnchor="end"
              paintOrder="stroke"
              strokeWidth={3}
              strokeLinejoin="round"
              className="fill-rose-700 stroke-card font-semibold text-[8.5px] dark:fill-rose-300"
            >
              “{p.false_friend}”
            </text>
          </motion.g>
        );
      })}
    </svg>
  );
}

function Score({ label, value }: { label: string; value: number }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="relative h-1.5 w-12 rounded-full bg-muted">
        <motion.i
          className="absolute inset-y-0 left-0 rounded-full bg-foreground/70"
          initial={{ width: 0 }}
          animate={{ width: `${value * 100}%` }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        />
      </span>
      <span className="font-mono text-[10.5px] tabular-nums">{value.toFixed(2)}</span>
    </span>
  );
}

function ShortlistItem({
  paper,
  index,
  dropped,
  editing,
  live,
  onHover,
  onToggle,
}: {
  paper: ShortlistPaper;
  index: number;
  dropped: boolean;
  editing: boolean;
  live: boolean;
  onHover(id: string | null): void;
  onToggle(): void;
}) {
  return (
    <motion.li
      data-paper={paper.id}
      data-cursor={`paper:${paper.id}`}
      initial={live ? { opacity: 0, y: 8 } : false}
      animate={{ opacity: dropped ? 0.5 : 1, y: 0 }}
      transition={{ duration: 0.35 }}
      onMouseEnter={() => onHover(paper.id)}
      onMouseLeave={() => onHover(null)}
      onClick={editing ? onToggle : undefined}
      onKeyDown={editing ? (e) => (e.key === "Enter" || e.key === " ") && onToggle() : undefined}
      role={editing ? "button" : undefined}
      tabIndex={editing ? 0 : undefined}
      aria-pressed={editing ? dropped : undefined}
      className={cn(
        "grid grid-cols-[20px_minmax(0,1fr)] gap-x-2.5 gap-y-1 border-b py-2.5 last:border-0",
        editing && "-mx-2 cursor-pointer rounded-lg px-2 hover:bg-muted/70",
      )}
    >
      <span className="pt-px font-mono text-[11px] text-muted-foreground tabular-nums">
        {String(index + 1).padStart(2, "0")}
      </span>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
          <b className={cn("font-semibold", dropped && "line-through")}>{paper.citation}</b>
          {paper.seminal && (
            <span
              title="Kept despite its age, because the field is built on it"
              className="inline-flex h-5 items-center rounded-full bg-amber-500/15 px-2 font-medium text-[10.5px] text-amber-800 dark:text-amber-300"
            >
              Seminal
            </span>
          )}
          {dropped && <span className="font-semibold text-amber-800 text-xs dark:text-amber-300">Removed by you</span>}
          {paper.doi && !editing && (
            <a
              href={`https://doi.org/${paper.doi}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto inline-flex h-5 items-center rounded-md px-1.5 text-[11px] text-cyan-700 ring-1 ring-cyan-500/30 hover:bg-cyan-500/10 dark:text-cyan-300"
            >
              DOI
            </a>
          )}
        </span>
        <span className="truncate text-muted-foreground text-xs" title={paper.title}>
          {paper.title} · <i>{paper.venue}</i>, {paper.year}
        </span>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Score label="Relevance" value={paper.relevance} />
          <Score label="Quality" value={paper.quality} />
          <span className="ml-auto text-[11px] text-muted-foreground tabular-nums">
            via {paper.source} · {paper.citations.toLocaleString("en-US")} citations
          </span>
        </span>
        <span className="text-xs">
          <span className="text-muted-foreground">Kept because </span>
          {paper.reason.charAt(0).toLowerCase() + paper.reason.slice(1)}
        </span>
      </span>
    </motion.li>
  );
}

function RejectedItem({ paper, live }: { paper: RejectedPaper; live: boolean }) {
  const parts = paper.title.split(new RegExp(`(${paper.false_friend})`, "i"));
  return (
    <motion.li
      data-cursor={`rejected:${paper.id}`}
      initial={live ? { opacity: 0, x: -8 } : false}
      animate={{ opacity: 1, x: 0 }}
      className="grid grid-cols-[18px_minmax(0,1fr)] gap-2 rounded-lg bg-rose-500/6 px-2.5 py-2 text-xs"
    >
      <X className="mt-0.5 size-3.5 text-rose-600" />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="relative w-fit text-[12.5px] text-foreground leading-snug">
          {parts.map((part, i) =>
            part.toLowerCase() === paper.false_friend.toLowerCase() ? (
              <mark
                // biome-ignore lint/suspicious/noArrayIndexKey: title fragments have no ids
                key={i}
                className="rounded-sm bg-rose-500/20 px-0.5 font-semibold text-rose-800 dark:text-rose-200"
              >
                {part}
              </mark>
            ) : (
              // biome-ignore lint/suspicious/noArrayIndexKey: title fragments have no ids
              <Fragment key={i}>{part}</Fragment>
            ),
          )}
        </span>
        <span className="text-muted-foreground">
          <i>{paper.venue}</i> · {paper.reason}
        </span>
      </span>
    </motion.li>
  );
}

export function ScreenScene({ data, live }: { data: ScreenContent; live: boolean }) {
  const scene = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<string | null>(null);
  const { dropMode, dropped, toggleDrop } = useWorkspace();
  const editing = dropMode && live;
  useReveal(listRef, data.kept.length, live);
  const olRef = useRef<HTMLOListElement>(null);
  // While papers are being kept, the list follows the newest one.
  useEffect(() => {
    if (!live || !data.kept.length) return;
    olRef.current?.lastElementChild?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [data.kept.length, live]);

  // Each kept paper flies from its dot to the shortlist.
  const flown = useRef(data.kept.length);
  useEffect(() => {
    if (data.kept.length <= flown.current || !live) {
      flown.current = data.kept.length;
      return;
    }
    flown.current = data.kept.length;
    const paper = data.kept[data.kept.length - 1];
    const host = scene.current;
    launchFlight(
      host?.querySelector(`[data-point="${paper.id}"]`),
      host?.querySelector(`[data-paper="${paper.id}"]`),
      paper.citation.split(",")[0],
      "bg-emerald-600 text-white",
    );
  }, [data.kept, live]);

  const rMin = data.criteria?.relevanceMin ?? 0.7;
  const qMin = data.criteria?.qualityMin ?? 0.5;
  const inZone = data.points.filter((p) => p.relevance >= rMin && p.quality >= qMin).length;

  let target: string | null = data.points.length ? "scatter" : null;
  if (data.rejected.length) target = `rejected:${data.rejected[data.rejected.length - 1].id}`;
  if (data.kept.length) target = `paper:${data.kept[data.kept.length - 1].id}`;

  return (
    <div ref={scene} className="relative flex flex-col gap-4">
      {data.criteria && (
        <motion.div
          initial={live ? { opacity: 0, y: 6 } : false}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center gap-1.5 text-xs"
        >
          <span className="mr-1 text-muted-foreground">Six screening rules:</span>
          {data.criteria.rules.map((rule, i) => (
            <motion.span
              key={rule}
              initial={live ? { opacity: 0, scale: 0.85 } : false}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.08 }}
              className="inline-flex items-center gap-1 rounded-md bg-card px-2 py-0.5 ring-1 ring-foreground/10"
            >
              <Check className="size-3 text-emerald-600" />
              {rule}
            </motion.span>
          ))}
        </motion.div>
      )}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          {data.points.length ? (
            <Pane
              title="Relevance × quality"
              aside={`${data.points.length} of 214 scored · ${inZone} in the keep zone`}
            >
              <div data-cursor="scatter">
                <Scatter data={data} hover={hover} live={live} />
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground text-xs">
                <span className="inline-flex items-center gap-1.5">
                  <i className="size-2 rounded-full bg-emerald-500" />
                  Kept · {data.kept.length - data.dropped.length}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <i className="size-2 rounded-full bg-rose-500" />
                  Wrong field · {data.rejected.length}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <i className="size-2 rounded-full bg-muted-foreground/30" />
                  Below a bar · {data.points.length - inZone}
                </span>
                {data.dropped.length > 0 && (
                  <span className="inline-flex items-center gap-1.5">
                    <i className="size-2 rounded-full ring-[1.5px] ring-amber-500 ring-inset" />
                    Removed by you · {data.dropped.length}
                  </span>
                )}
              </div>
            </Pane>
          ) : (
            <Placeholder>Every paper gets a relevance and a quality score</Placeholder>
          )}
          {data.rejected.length > 0 && (
            <Pane title="Same words, wrong field" aside="cross-domain rejection">
              <ul className="flex flex-col gap-1.5">
                {data.rejected.map((p) => (
                  <RejectedItem key={p.id} paper={p} live={live} />
                ))}
              </ul>
            </Pane>
          )}
        </div>
        <div ref={listRef} className="relative min-h-80">
          {data.kept.length ? (
            <Pane
              title="Shortlist"
              aside="each kept with a reason"
              className={cn(
                "flex flex-col xl:absolute xl:inset-0 [&>header]:shrink-0",
                editing && "ring-3 ring-amber-500/40",
              )}
              action={
                <span className="rounded-full bg-background px-2 py-px font-mono font-semibold text-[11px] text-muted-foreground ring-1 ring-foreground/10">
                  {data.kept.length - (editing ? dropped.length : data.dropped.length)}
                </span>
              }
            >
              <ol ref={olRef} className="-mx-1 -mb-2 flex min-h-0 flex-col overflow-y-auto px-1 pb-2">
                {data.kept.map((paper, i) => (
                  <ShortlistItem
                    key={paper.id}
                    paper={paper}
                    index={i}
                    dropped={data.dropped.includes(paper.id) || (editing && dropped.includes(paper.id))}
                    editing={editing}
                    live={live}
                    onHover={setHover}
                    onToggle={() => toggleDrop(paper.id)}
                  />
                ))}
              </ol>
            </Pane>
          ) : (
            <Placeholder className="h-full">Papers that clear both bars are kept here</Placeholder>
          )}
        </div>
      </div>
      <AgentCursor
        agent={live ? "librarian" : null}
        container={scene}
        target={target}
        version={`${data.points.length}-${data.rejected.length}-${data.kept.length}`}
      />
    </div>
  );
}
