"use client";

import { Fragment, useEffect, useRef, useState } from "react";

import { cn } from "cn";
import { Check, X } from "lucide-react";
import { motion } from "motion/react";

import { Button } from "@/components/ui/button";
import type { RejectedPaper, ShortlistPaper } from "@/lib/run-stream/contract";
import type { ScreenContent } from "@/lib/run-stream/run-state";

import { AgentCursor, launchFlight } from "../run-bits";
import { useReveal, useWorkspace } from "../workspace-context";
import { Bone, Pane, Placeholder } from "./scene-ui";

const W = 420;
const H = 290;
const PAD = { l: 34, r: 12, t: 12, b: 34 };
const px = (v: number) => PAD.l + v * (W - PAD.l - PAD.r);
const py = (v: number) => H - PAD.b - v * (H - PAD.t - PAD.b);

/** Rejected papers shown before "Show all". */
const REJECTED_SHOWN = 6;
/** Wrong-field words labelled on the chart; more would cover the points. */
const MAX_LABELS = 5;

const bars = (data: ScreenContent) => ({
  rMin: data.criteria?.relevanceMin ?? 0.7,
  qMin: data.criteria?.qualityMin ?? 0.5,
});

/**
 * Papers the reviewer rejected, each with a reason. Papers ranked below the shortlist cut, set aside before
 * scoring, or never scored are not rejections.
 */
function rejectedPapers(data: ScreenContent) {
  return data.rejected.filter((paper) => (paper.decision ?? "rejected") === "rejected");
}

/**
 * Rejected although their scores fit, inside the keep zone, for a reason such as the right words in the wrong
 * field. Every rejected paper is red; these are the ones drawn full size and labelled.
 */
function wrongField(data: ScreenContent) {
  const { rMin, qMin } = bars(data);
  const scores = new Map(data.points.map((p) => [p.id, p]));
  return rejectedPapers(data).filter((paper) => {
    const point = scores.get(paper.id);
    return !!point && point.relevance >= rMin && point.quality >= qMin;
  });
}

/** Wrong-field papers to label: at most a few, and never two labels on the same line. */
function labelled(data: ScreenContent) {
  const out: { paper: RejectedPaper; x: number; y: number }[] = [];
  for (const paper of wrongField(data)) {
    if (!paper.false_friend || out.length >= MAX_LABELS) continue;
    const point = data.points.find((p) => p.id === paper.id);
    if (!point) continue;
    const y = py(point.quality);
    if (out.some((l) => Math.abs(l.y - y) < 12)) continue;
    out.push({ paper, x: px(point.relevance), y });
  }
  return out;
}

function Scatter({ data, hover, live }: { data: ScreenContent; hover: string | null; live: boolean }) {
  const kept = new Set(data.kept.map((p) => p.id));
  const rejected = new Set(wrongField(data).map((p) => p.id));
  const rejectedLow = new Set(rejectedPapers(data).map((p) => p.id));
  // Cleared both bars but ranked below the papers kept for reading: in the zone, but not what it is about.
  const cut = new Set(data.rejected.filter((p) => p.decision === "below_cutoff").map((p) => p.id));
  const dropped = new Set(data.dropped);
  const { rMin, qMin } = bars(data);
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
        const isCut = cut.has(p.id) && !isKept;
        const isLow = rejectedLow.has(p.id) && !isRejected;
        const inZone = p.relevance >= rMin && p.quality >= qMin;
        const fresh = live && i >= firstNew.current;
        const r = hover === p.id ? 6.5 : isKept || isRejected ? 4.2 : isCut ? 2.6 : 3;
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
              isCut && "fill-card stroke-emerald-600/45",
              isLow && "fill-rose-500/45",
              !isKept &&
                !isRejected &&
                !isCut &&
                !isLow &&
                (inZone ? "fill-foreground/70" : "fill-muted-foreground/30"),
            )}
            strokeWidth={isKept && dropped.has(p.id) ? 1.6 : 1.2}
          />
        );
      })}
      {labelled(data).map(({ paper: p, x, y }) => {
        // A label left of a point near the left edge would run off the chart, so it goes on the right.
        const left = x > W / 2;
        const word = p.false_friend.length > 24 ? `${p.false_friend.slice(0, 23)}…` : p.false_friend;
        return (
          <motion.g key={p.id} initial={live ? { opacity: 0 } : false} animate={{ opacity: 1 }}>
            <text
              x={left ? x - 7 : x + 7}
              y={y + 3}
              textAnchor={left ? "end" : "start"}
              paintOrder="stroke"
              strokeWidth={3}
              strokeLinejoin="round"
              className="fill-rose-700 stroke-card font-semibold text-[8.5px] dark:fill-rose-300"
            >
              “{word}”
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

/** Rows held for the shortlist before any paper is kept. */
const FRAME_ROWS = 3;

function PendingPaper({ index, active }: { index: number; active: boolean }) {
  return (
    <li aria-hidden className="grid grid-cols-[20px_minmax(0,1fr)] gap-x-2.5 border-b py-2.5 last:border-0">
      <span className="pt-px font-mono text-[11px] text-muted-foreground/60 tabular-nums">
        {String(index + 1).padStart(2, "0")}
      </span>
      <span className="flex min-w-0 flex-col gap-2 pt-1">
        <Bone active={active} className="w-2/5" />
        <Bone active={active} className="h-2 w-4/5" />
        <Bone active={active} className="h-2 w-3/5" />
      </span>
    </li>
  );
}

function RejectedItem({ paper, live }: { paper: RejectedPaper; live: boolean }) {
  const word = paper.false_friend.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = word ? paper.title.split(new RegExp(`(${word})`, "i")) : [paper.title];
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
            word && part.toLowerCase() === paper.false_friend.toLowerCase() ? (
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
          {paper.venue && (
            <>
              <i>{paper.venue}</i> ·{" "}
            </>
          )}
          {paper.reason}
        </span>
      </span>
    </motion.li>
  );
}

export function ScreenScene({
  data,
  live,
  step,
}: {
  data: ScreenContent;
  live: boolean;
  /** The step running now, while the run is followed live. */
  step: string | null;
}) {
  const scene = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [allRejected, setAllRejected] = useState(false);
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

  const { rMin, qMin } = bars(data);
  const inZone = data.points.filter((p) => p.relevance >= rMin && p.quality >= qMin).length;
  // Red papers first (with a shared word before the rest), then those rejected below a bar.
  const wrong = wrongField(data).sort((a, b) => Number(!a.false_friend) - Number(!b.false_friend));
  const red = new Set(wrong.map((p) => p.id));
  const low = rejectedPapers(data).filter((p) => !red.has(p.id));
  const rejections = [...wrong, ...low];
  const wrongFieldOnly = !low.length && wrong.every((p) => p.false_friend);
  const belowCut = data.rejected.filter((p) => p.decision === "below_cutoff").length;
  const shownRejections = allRejected ? rejections : rejections.slice(0, REJECTED_SHOWN);

  let target: string | null = data.points.length ? "scatter" : null;
  const lastShown = shownRejections[shownRejections.length - 1];
  if (lastShown) target = `rejected:${lastShown.id}`;
  if (data.kept.length) target = `paper:${data.kept[data.kept.length - 1].id}`;

  return (
    <div ref={scene} className="relative flex flex-col gap-4">
      {data.criteria && (
        <motion.div
          initial={live ? { opacity: 0, y: 6 } : false}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center gap-1.5 text-xs"
        >
          <span className="mr-1 text-muted-foreground">Screening rules:</span>
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
          {/* The chart is drawn once the bars are known, so each score lands on the axes it is read against. */}
          {data.points.length || data.criteria ? (
            <Pane
              title="Relevance × quality"
              aside={
                data.points.length || data.criteria?.candidates
                  ? `${data.points.length} of ${data.criteria?.candidates ?? data.points.length} scored · ${inZone} in the keep zone`
                  : "no paper scored yet"
              }
            >
              <div data-cursor="scatter">
                <Scatter data={data} hover={hover} live={live} />
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground text-xs">
                <span className="inline-flex items-center gap-1.5">
                  <i className="size-2 rounded-full bg-emerald-500" />
                  Kept · {data.kept.length - data.dropped.length}
                </span>
                {wrong.length > 0 && (
                  <span className="inline-flex items-center gap-1.5">
                    <i className="size-2 rounded-full bg-rose-500" />
                    {wrong.every((p) => p.false_friend) ? "Wrong field" : "Rejected in the zone"} · {wrong.length}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <i className="size-2 rounded-full bg-rose-500/45" />
                  Rejected below a bar · {data.points.length - inZone}
                </span>
                {belowCut > 0 && (
                  <span className="inline-flex items-center gap-1.5">
                    <i className="size-2 rounded-full bg-card ring-1 ring-emerald-600/45 ring-inset" />
                    Below the shortlist cut · {belowCut}
                  </span>
                )}
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
          {rejections.length > 0 && (
            <Pane
              title={wrongFieldOnly ? "Same words, wrong field" : "Rejected"}
              aside={
                wrongFieldOnly
                  ? "cross-domain rejection"
                  : [wrong.length && `${wrong.length} in the keep zone`, low.length && `${low.length} below a bar`]
                      .filter(Boolean)
                      .join(" · ")
              }
            >
              <ul className="flex flex-col gap-1.5">
                {shownRejections.map((p) => (
                  <RejectedItem key={p.id} paper={p} live={live} />
                ))}
              </ul>
              {rejections.length > REJECTED_SHOWN && (
                <Button variant="ghost" size="xs" className="mt-2" onClick={() => setAllRejected((v) => !v)}>
                  {allRejected ? "Show fewer" : `Show all ${rejections.length}`}
                </Button>
              )}
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
            <Pane
              title="Shortlist"
              aside="each kept with a reason"
              className="flex flex-col xl:absolute xl:inset-0 [&>header]:shrink-0"
              action={
                <span className="rounded-full bg-background px-2 py-px font-mono font-semibold text-[11px] text-muted-foreground ring-1 ring-foreground/10">
                  0
                </span>
              }
            >
              <ol className="-mx-1 flex flex-col px-1">
                {Array.from({ length: FRAME_ROWS }, (_, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: empty rows have no ids
                  <PendingPaper key={i} index={i} active={step === "shortlist"} />
                ))}
              </ol>
              <p className="mt-3 text-center text-muted-foreground text-xs">
                Papers that clear both bars are kept here
              </p>
            </Pane>
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
