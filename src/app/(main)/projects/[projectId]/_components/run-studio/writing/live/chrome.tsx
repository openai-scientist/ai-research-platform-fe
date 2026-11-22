"use client";
"use no memo";

/* ===== The studio around a live run: toolbar, stage track, steps, team, checkpoints and the stop sheet =====
   The same parts as the preview's (shell.tsx), read from the run on the engine: its stages, its model calls, the
   stops it opens and the checkpoints it scores. */

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { RunDisplayStatus } from "@/lib/run-stream/selectors";

import { CharterDocument } from "../../charter-panel";
import { PiAdviceCard } from "../../pi-advice";
import { Caret, PulseDot, StatusPill } from "../../run-bits";
import { AGENTS, isCode, screenIndex } from "../data/meta";
import { DEFS, emit, S } from "../engine";
import { AgentAvatar, cn, enter, Icon, M, pad2, WorkOrb } from "../lib";
import { TONE } from "../shared";
import { SCREEN_COPY } from "./copy";
import { checkpointOf, outlineSections } from "./draft-data";
import { WritingsToChoose } from "./draft-paper";
import { FrameChoices, JoinSummary } from "./frame-body";
import { type Objection, ObjectionsForm, readyObjections, StageReviewCard, WarrantsForm } from "./guided-stops";
import { replayWritingRun } from "./open";
import { heading } from "./outline-data";
import { answerStop, callKey, callLine, file, fill, LIVE, LIVE_STAGES, type LiveStop, type ModelCall } from "./run";
import { LIVE_BLOCKS, LIVE_SCREENS, type LiveScreen, LSTAGE } from "./stages";
import type { FrameChoiceKey } from "./types";

const viewKey = () => S.view ?? S.live;
export function setLiveView(key: string) {
  S.view = key === S.live ? null : key;
  emit();
}

/* ---------- the run's status and controls, in the header (as the research run's workspace has them) ---------- */
/** The run's state as the research workspace's status pill names it. */
export function liveStatus(): RunDisplayStatus {
  if (LIVE.failed || S.lifecycle === "failed") return "failed";
  if (LIVE.stop) return "waiting";
  if (LIVE.published) return "completed";
  return "running";
}
export function LiveRunControls() {
  return (
    <>
      <StatusPill status={liveStatus()} />
      <span
        className="whitespace-nowrap text-muted-foreground text-xs max-lg:hidden"
        title={
          LIVE.mode === "auto"
            ? "At each stop the run takes the recommended option and notes it under the stage."
            : "The run stops for you at each decision the record cannot settle."
        }
      >
        Stops for you <b className="font-medium text-foreground">{LIVE.mode === "auto" ? "never" : "when needed"}</b>
      </span>
      {LIVE.reconnecting && (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-amber-800 text-xs dark:text-amber-300">
          <PulseDot className="bg-amber-500" />
          Reconnecting
        </span>
      )}
      {LIVE.published && (
        <span className="flex items-center gap-2 max-md:hidden">
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            spacing={0}
            value={String(S.speed)}
            onValueChange={(v) => {
              if (!v) return;
              S.speed = Number(v);
              emit();
            }}
            aria-label="Replay speed"
          >
            {[1, 2, 4].map((v) => (
              <ToggleGroupItem key={v} value={String(v)} className="h-7 px-2 font-mono text-[11px]">
                {v}×
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={replayWritingRun}
            title="Play the run again from the intake, as it streamed"
          >
            <Icon n="rotate" />
            Replay
          </Button>
        </span>
      )}
    </>
  );
}

/* ---------- stage track ---------- */
/** The two branches' blocks take the hues they have on the process map. */
const BLOCK_HUE: Record<string, { text: string; line: string }> = {
  frame: { text: "text-teal-700 dark:text-teal-300", line: "bg-teal-500/50" },
  argue: { text: "text-violet-700 dark:text-violet-300", line: "bg-violet-500/50" },
};
/** Where the engine may ask you something, by screen (Light mode only). */
const ASKS: Record<string, string> = {
  frame: "The writing frame (F)",
  report: "An analysis outside the plan",
  evidence: "Start writing from this record",
  statements: "What an inconclusive result is",
  map: "Lock the claims (P1)",
  journal: "Whether the frame and the argument fit (J)",
  blueprint: "Story, sections, paragraphs, sentences (P2–P5)",
  paper: "Which writing of each section to keep; how strongly to word the findings; the title and abstract",
};
function progress(scr: LiveScreen) {
  let total = 0;
  let done = 0;
  for (const st of scr.stages) {
    total += st.steps.length + LIVE.calls.filter((c) => c.stage === st.id).length;
    done += S.st[st.id].done.length + LIVE.calls.filter((c) => c.stage === st.id && c.done).length;
  }
  return { total: Math.max(1, total), done };
}
/** Where each step and block label sits on the track's grid: the blocks in a row, except the two branches, which share
 * their columns, the writing frame (A) on the upper lane and the argument (B) on the lower. */
function trackPlaces(items: LiveScreen[]) {
  const lane = (block: number) => items.filter((s) => s.block === block);
  const a = lane(1);
  const b = lane(2);
  const width = Math.max(b.length, a.length, 1);
  const at: Record<string, { column: string; row: string; branch: boolean }> = {};
  const labels: { k: string; n: string; start: number; span: number; row: string }[] = [];
  let column = 1;
  let zone: { start: number; span: number } | null = null;
  LIVE_BLOCKS.forEach((blk, i) => {
    if (i === 1 || i === 2) {
      if (zone) return;
      zone = { start: column, span: width };
      const start = column;
      const spanA = a.length ? Math.floor(width / a.length) : width;
      a.forEach((s, j) => {
        at[s.key] = { column: `${start + j * spanA} / span ${spanA}`, row: "2", branch: true };
      });
      b.forEach((s, j) => {
        at[s.key] = { column: `${start + j}`, row: "4", branch: true };
      });
      labels.push({ k: LIVE_BLOCKS[1].k, n: LIVE_BLOCKS[1].n, start, span: width, row: "1" });
      labels.push({ k: LIVE_BLOCKS[2].k, n: LIVE_BLOCKS[2].n, start, span: width, row: "3" });
      column += width;
      return;
    }
    const own = lane(i);
    if (!own.length) return;
    labels.push({ k: blk.k, n: blk.n, start: column, span: own.length, row: "1" });
    for (const s of own) {
      at[s.key] = { column: String(column), row: "2 / span 3", branch: false };
      column += 1;
    }
  });
  return { at, labels, zone: zone as { start: number; span: number } | null, columns: column - 1 };
}

export function LiveTrack() {
  const items = LIVE_SCREENS;
  const liveIdx = items.findIndex((s) => s.key === S.live);
  const box = useRef<HTMLDivElement>(null);
  const viewing = viewKey();
  useEffect(() => {
    const el = box.current?.querySelector(`[data-track="${viewing}"]`);
    el?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [viewing]);
  const failed = S.lifecycle === "failed";
  const place = trackPlaces(items);
  return (
    <>
      {/* The track is the run's map: the input, then the two branches side by side (the writing frame above, the
          argument below), then the join, the outline and the draft. Narrower than its steps need, it scrolls sideways
          under the viewed step, with no scrollbar of its own across the studio. */}
      <div
        ref={box}
        className="overflow-x-auto overflow-y-hidden border-b px-4 pt-2.5 pb-3 [scrollbar-width:none] md:px-5 [&::-webkit-scrollbar]:hidden"
      >
        <ol
          className="grid gap-x-1.5 gap-y-1"
          style={{
            minWidth: `${place.columns * 112}px`,
            gridTemplateColumns: `repeat(${place.columns}, minmax(0, 1fr))`,
          }}
        >
          {place.zone && (
            <li
              aria-hidden
              className="-mx-1.5 -my-1 rounded-lg bg-muted/50 dark:bg-muted/30"
              style={{ gridColumn: `${place.zone.start} / span ${place.zone.span}`, gridRow: "1 / span 4" }}
            />
          )}
          {place.labels.map((l) => (
            <li
              key={l.k}
              aria-hidden
              className={cn(
                "flex items-center gap-2 font-semibold text-[11px] text-muted-foreground uppercase tracking-wide",
                BLOCK_HUE[l.k]?.text,
              )}
              style={{ gridColumn: `${l.start} / span ${l.span}`, gridRow: l.row }}
            >
              {l.n}
              <i className={cn("h-px flex-1 bg-border", BLOCK_HUE[l.k]?.line)} />
            </li>
          ))}
          {items.map((it, i) => {
            const { total, done } = progress(it);
            const isPast = it.stages.every((s) => S.st[s.id].status === "done") && !(i === liveIdx && LIVE.stop);
            const isLive = i === liveIdx && !S.done;
            const fill = isPast ? 100 : isLive ? Math.max(4, (done / total) * 100) : 0;
            const waiting = Boolean(LIVE.stop && it.stages.some((s) => s.id === LIVE.stop?.stage));
            const available = i <= Math.max(liveIdx, S.reached);
            const isViewed = viewing === it.key;
            const ask = LIVE.mode === "light" && ASKS[it.key];
            const later = failed && i > liveIdx;
            return (
              <li
                key={it.key}
                data-track={it.key}
                className={cn("relative min-w-0", place.at[it.key].branch ? "" : "self-center")}
                style={{ gridColumn: place.at[it.key].column, gridRow: place.at[it.key].row }}
              >
                <button
                  type="button"
                  disabled={!available}
                  onClick={() => setLiveView(it.key)}
                  title={SCREEN_COPY[it.key]?.why ?? it.title}
                  className={cn(
                    "flex h-full w-full flex-col gap-1.5 rounded-md px-1.5 py-1 text-left outline-none transition-colors hover:bg-background/70 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default disabled:hover:bg-transparent",
                    isViewed && "bg-background shadow-xs ring-1 ring-foreground/15 hover:bg-background",
                  )}
                >
                  <span className="flex min-w-0 flex-col pr-3">
                    <span
                      className={cn(
                        "line-clamp-2 font-medium text-xs leading-tight transition-colors",
                        isPast || isLive || isViewed ? "text-foreground" : "text-muted-foreground",
                        isViewed && "font-semibold",
                        later && "text-muted-foreground/50",
                      )}
                    >
                      {SCREEN_COPY[it.key]?.name ?? it.short}
                    </span>
                    <span className="truncate text-[10.5px] text-muted-foreground">
                      {SCREEN_COPY[it.key]?.tech ?? ""}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "relative mt-auto h-1 shrink-0 overflow-hidden rounded-full",
                      later ? "border-foreground/15 border-t-2 border-dashed bg-transparent" : "bg-muted",
                    )}
                  >
                    <i
                      className={cn(
                        "absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
                        failed && isLive
                          ? "bg-rose-500"
                          : waiting
                            ? "bg-amber-500"
                            : isLive
                              ? "bg-sky-500"
                              : "bg-foreground",
                      )}
                      style={{ width: `${fill}%` }}
                    />
                    {isLive && !waiting && !failed && (
                      <i className="sweep absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-sky-500/40 to-transparent" />
                    )}
                  </span>
                </button>
                {ask && (
                  <span
                    title={`You decide here: ${ask}`}
                    className={cn(
                      "absolute -right-2 bottom-[-5px] z-10 grid size-[18px] place-items-center rounded-full bg-background",
                      waiting ? "bg-amber-500 text-white" : isPast ? "text-muted-foreground" : "text-amber-500",
                    )}
                  >
                    {waiting && (
                      <span
                        aria-hidden
                        className="breathe absolute -inset-[3px] rounded-full border-2 border-amber-500"
                      />
                    )}
                    <Icon n="flag" className={cn("size-3", !isPast && !waiting && "fill-amber-500/25")} />
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </>
  );
}
export const liveScreen = (key: string) => LIVE_SCREENS.find((s) => s.key === key);
export const liveScreenNo = (key: string) =>
  `${pad2(LIVE_SCREENS.findIndex((s) => s.key === key) + 1)}/${pad2(LIVE_SCREENS.length)}`;

/* ---------- the aside: who works now, the stage's steps, the next stop, the checkpoints ---------- */
export function LiveTeam() {
  const calls = LIVE.calls.filter((c) => c.stage === S.stage);
  const cast = [...new Set(calls.map((c) => callKey(c.agent)))].filter((a) => !isCode(a));
  const running = calls.find((c) => !c.done);
  const active = running ? callKey(running.agent) : null;
  return (
    <div data-aside-team className="flex min-h-[53px] items-center gap-2 border-b px-3 py-3">
      <div className="flex min-w-0 flex-1 items-center">
        {cast.length === 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted p-0.5 pr-2">
            <AgentAvatar a="code" size="sm" className="size-6" />
            <span className="font-semibold text-muted-foreground text-xs">Code check · no AI</span>
          </span>
        )}
        {cast.map((a) => {
          const on = a === active;
          const g = AGENTS[a];
          return (
            <span
              key={a}
              className={cn(
                "inline-flex shrink-0 items-center rounded-full transition-all duration-300",
                on ? cn(g.soft.split(" ")[0], "mx-1 min-w-0 shrink gap-1.5 p-0.5 pr-2") : "-ml-1 first:ml-0",
              )}
            >
              <span className="relative">
                <AgentAvatar
                  a={a}
                  size="sm"
                  className={cn(
                    "transition-[opacity,filter] duration-300",
                    on ? "size-6" : "size-[22px] opacity-55 ring-2 ring-sidebar saturate-[.3]",
                  )}
                />
                {on && (
                  <span
                    className={cn(
                      "absolute -inset-[3px] animate-ping rounded-full opacity-40 ring-[1.5px] ring-current",
                      g.text,
                    )}
                  />
                )}
              </span>
              {on && (
                <M as="span" in="fade" className={cn("min-w-0 truncate font-semibold text-xs", g.text)}>
                  {g.name}
                </M>
              )}
            </span>
          );
        })}
      </div>
      <span className="shrink-0 font-mono text-[10.5px] text-muted-foreground">
        {SCREEN_COPY[LIVE_SCREENS.find((x) => x.stages.some((st) => st.id === S.stage))?.key ?? ""]?.name ??
          LSTAGE[S.stage]?.short}
      </span>
    </div>
  );
}

function CallStep({ c, last }: { c: ModelCall; last: boolean }) {
  const a = callKey(c.agent);
  const now = !c.done;
  return (
    <li
      className={cn(
        "relative grid grid-cols-[18px_1fr] gap-2.5 rounded-lg px-1 pb-3",
        !last &&
          cn(
            "before:absolute before:top-[22px] before:bottom-1 before:left-[13px] before:w-px",
            c.done ? "before:bg-foreground" : "before:bg-border",
          ),
      )}
    >
      <span
        className={cn(
          "mt-0.5 grid size-[18px] place-items-center rounded-full border bg-card transition-colors",
          c.done && "border-foreground bg-foreground text-background",
          now && "border-2 border-sky-500",
        )}
      >
        {c.done ? (
          <Icon n="check" className="size-2.5" sw={3.5} />
        ) : (
          <span className="beat size-1.5 rounded-full bg-sky-500" />
        )}
      </span>
      <span className="min-w-0">
        <b className="block font-medium text-[13px]">{c.label}</b>
        <small className={cn("text-[11.5px]", c.agent ? AGENTS[a].text : "text-muted-foreground")}>
          {AGENTS[a].name}
          {now && <span className="text-muted-foreground"> · working</span>}
        </small>
      </span>
    </li>
  );
}
/**
 * The calls as the aside lists them: the verifier reads each writing in batches, two passes a batch, so its calls in
 * a row are one line ("Verifier · 6 reads"), at work until the last is done.
 */
function grouped(calls: ModelCall[]): ModelCall[] {
  const out: ModelCall[] = [];
  let run: ModelCall[] = [];
  const close = () => {
    if (!run.length) return;
    const last = run[run.length - 1];
    out.push(
      run.length === 1
        ? run[0]
        : {
            ...run[0],
            label: `Verifier · ${run.length} reads`,
            done: run.every((c) => c.done) ? last.done : undefined,
          },
    );
    run = [];
  };
  for (const c of calls) {
    if (/^Verifier/.test(c.label)) run.push(c);
    else {
      close();
      out.push(c);
    }
  }
  close();
  return out;
}
/** The stage's work as it happened: the model calls the engine made, then what the screen shows of it. */
export function LiveSteps() {
  // The aside follows the screen you read: the stage at work, or every stage of a screen you went back to.
  const scr = liveScreen(viewKey());
  const current = !S.done && Boolean(scr?.stages.some((x) => x.id === S.stage));
  const sids = current || !scr ? [S.stage] : scr.stages.map((x) => x.id);
  const no = scr ? LIVE_SCREENS.findIndex((x) => x.key === scr.key) + 1 : 0;
  const copy = scr ? SCREEN_COPY[scr.key] : undefined;
  return (
    <div className="flex flex-col gap-3">
      {!current && copy && (
        <div className="rounded-xl bg-card p-3 ring-1 ring-foreground/10">
          <p className="font-medium text-muted-foreground text-xs">What to check here</p>
          <p className="mt-1 text-pretty text-[13px]">{copy.check}</p>
        </div>
      )}
      <div className="flex flex-col gap-2">
        <p className="flex justify-between font-medium text-muted-foreground text-xs">
          <span>{current ? "Steps in this stage" : "How this step was made"}</span>
          {no > 0 && (
            <span>
              {no} of {LIVE_SCREENS.length}
            </span>
          )}
        </p>
        <ol className="flex flex-col">
          {sids.flatMap((sid) => {
            const st = S.st[sid];
            const steps = DEFS.stage(sid).steps;
            const calls = grouped(LIVE.calls.filter((c) => c.stage === sid));
            return [
              ...calls.map((c, i) => (
                <CallStep key={`${c.task}:${c.seq}`} c={c} last={i === calls.length - 1 && steps.length === 0} />
              )),
              ...steps.map((x, i) => {
                const done = st.done.includes(x.id) || st.status === "done";
                const now = !done && st.cur === x.id && S.lifecycle !== "failed";
                return (
                  <li
                    key={`${sid}:${x.id}`}
                    className={cn(
                      "relative grid grid-cols-[18px_1fr] gap-2.5 rounded-lg px-1 pb-3 last:pb-0",
                      i < steps.length - 1 &&
                        cn(
                          "before:absolute before:top-[22px] before:bottom-1 before:left-[13px] before:w-px",
                          done ? "before:bg-foreground" : "before:bg-border",
                        ),
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 grid size-[18px] place-items-center rounded-full border bg-card transition-colors",
                        done && "border-foreground bg-foreground text-background",
                        now && "border-2 border-sky-500",
                      )}
                    >
                      {done && <Icon n="check" className="size-2.5" sw={3.5} />}
                      {now && <span className="beat size-1.5 rounded-full bg-sky-500" />}
                    </span>
                    <span className="min-w-0">
                      <b
                        className={cn(
                          "block font-medium text-[13px]",
                          !done && !now && "font-normal text-muted-foreground",
                        )}
                      >
                        {x.t}
                      </b>
                      <small className="text-[11.5px] text-muted-foreground">
                        {!x.a || isCode(x.a) ? "Code check · no AI" : AGENTS[x.a].name}
                      </small>
                    </span>
                  </li>
                );
              }),
            ];
          })}
        </ol>
      </div>
    </div>
  );
}

export function LiveNextStop() {
  if (LIVE.stop)
    return (
      <div className="grid grid-cols-[auto_1fr] gap-2.5 rounded-xl border border-amber-500/50 bg-amber-500/10 p-3 text-xs">
        <span className="grid size-7 place-items-center rounded-lg bg-amber-500/20 text-amber-800 dark:text-amber-300">
          <Icon n="flag" className="size-3.5" />
        </span>
        <span>
          <b className="block font-semibold text-[13px]">Waiting for you now</b>
          <span className="text-muted-foreground">{LIVE.stop.prompt}. Nothing runs until you answer.</span>
        </span>
      </div>
    );
  if (S.done || LIVE.failed) return null;
  const next = LIVE.mode === "light" ? LIVE_SCREENS.find((s, i) => i >= screenIndexLive() && ASKS[s.key]) : undefined;
  return (
    <div className="grid grid-cols-[auto_1fr] gap-2.5 rounded-xl border border-dashed p-3 text-xs">
      <span
        className={cn(
          "grid size-7 place-items-center rounded-lg",
          next ? "bg-amber-500/15 text-amber-800 dark:text-amber-300" : "bg-muted text-muted-foreground",
        )}
      >
        <Icon n={next ? "flag" : "play"} className="size-3.5" />
      </span>
      <span>
        <b className="block font-semibold text-[13px]">
          {LIVE.mode === "auto"
            ? "Auto mode: no stops for you"
            : next
              ? `Next place you may be asked: ${next.short}`
              : "No more stops"}
        </b>
        <span className="text-muted-foreground">
          {LIVE.mode === "auto"
            ? "At each stop the run takes the recommended option and notes it under the stage."
            : next
              ? `${ASKS[next.key]}. The run asks only when the record cannot settle it.`
              : "The run finishes on its own."}
        </span>
      </span>
    </div>
  );
}
const screenIndexLive = () =>
  Math.max(
    0,
    LIVE_SCREENS.findIndex((s) => s.key === S.live),
  );

const OUTLINE_CHECKPOINTS: [string, string][] = [
  ["F", "The writing frame"],
  ["P1", "The claims to lock"],
  ["J", "The frame and the argument"],
  ["P2", "The story"],
  ["P3", "The sections"],
  ["P4", "The paragraphs"],
  ["P5", "The sentences"],
];
/** A draft run's checks of each section it writes, then of the title and abstract (only those the outline has). */
const draftCheckpoints = (): [string, string][] => [
  ...outlineSections()
    .filter((s) => !s.byCode && s.planned.length)
    .map((s): [string, string] => [checkpointOf(s.id), `The ${heading(s.id)}`]),
  ["S:front", "The title and abstract"],
];
/** The checkpoints of the run: each scored on its rules, then approved by you, the PI or the run. */
export function LiveCheckpoints() {
  const [open, setOpen] = useState(false);
  const CHECKPOINTS = LIVE.draft ? [...OUTLINE_CHECKPOINTS, ...draftCheckpoints()] : OUTLINE_CHECKPOINTS;
  const scored = CHECKPOINTS.filter(([k]) => LIVE.checkpoints[k]).length;
  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left font-medium text-xs outline-none"
      >
        <Icon n="right" className={cn("size-3.5 text-muted-foreground transition-transform", open && "rotate-90")} />
        {LIVE.draft ? "Checkpoints of the outline and the draft" : "Checkpoints of the outline"}
        <span className="ml-auto font-mono text-[11px] text-muted-foreground">
          {scored} of {CHECKPOINTS.length} scored
        </span>
      </button>
      {open && (
        <ul className="flex flex-col gap-1.5 px-3 pb-3 text-xs">
          {CHECKPOINTS.map(([k, what]) => {
            const c = LIVE.checkpoints[k];
            const hard = c?.rows.filter((r) => r.kind === "H" && !r.passed).length ?? 0;
            const look = c?.rows.filter((r) => r.kind !== "H" && !r.passed).length ?? 0;
            return (
              <li key={k} className={cn("grid grid-cols-[14px_1fr] gap-2 px-1", !c && "text-muted-foreground")}>
                <span
                  className={cn(
                    "mt-1 size-2 rounded-full border-[1.5px]",
                    !c && "border-foreground/30",
                    c && hard === 0 && "border-emerald-500 bg-emerald-500",
                    c && hard > 0 && "border-rose-500 bg-rose-500",
                  )}
                />
                <span>
                  {k.startsWith("S:") ? (
                    <b className="font-medium">{what}</b>
                  ) : (
                    <>
                      <b className="font-medium">{k}</b> · {what}
                    </>
                  )}
                  <span className="block text-[11px] text-muted-foreground">
                    {c
                      ? `${c.rows.length} rules: ${hard ? `${hard} hard rule${hard > 1 ? "s" : ""} failed` : "every hard rule passes"}${look ? `, ${look} to look at` : ""}`
                      : "Not reached yet"}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ---------- the stop sheet ---------- */
const LABEL_BADGE: Record<string, string> = {
  IN: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  OUT: "bg-rose-500/12 text-rose-700 dark:text-rose-300",
  UNDEC: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
};
function minimize() {
  S.sheetMin = true;
  emit();
}
function ScoreRows({ checkpoint }: { checkpoint: string }) {
  const c = LIVE.checkpoints[checkpoint];
  if (!c) return null;
  const flagged = c.rows.filter((r) => !r.passed);
  return (
    <div className="flex flex-col gap-1.5">
      <p className="flex items-baseline justify-between gap-2 font-medium text-xs">
        <span>The rules this was checked on</span>
        <span className="font-normal text-muted-foreground tabular-nums">
          {c.rows.length - flagged.length} of {c.rows.length} pass
        </span>
      </p>
      {flagged.length === 0 ? (
        <p className="flex items-center gap-2 text-sm">
          <Icon n="circleCheck" className="size-3.5 text-emerald-600" />
          Every rule passes.
        </p>
      ) : (
        <ul className="flex flex-col gap-1 text-sm">
          {/* One rule may flag one place more than once, each with its own note. */}
          {flagged.map((r, i) => (
            <li key={`${r.rule}:${r.locator}:${i}`} className="flex items-start gap-2">
              <Icon
                n={r.kind === "H" ? "ban" : "alert"}
                className={cn("mt-1 size-3.5 shrink-0", r.kind === "H" ? "text-rose-600" : "text-amber-600")}
              />
              <span>
                <b className="font-medium">{r.rule}</b>
                {r.locator && <span className="font-mono text-muted-foreground text-xs"> · {r.locator}</span>}
                {r.note && <span className="text-muted-foreground"> — {r.note}</span>}
                {r.book_ref && <span className="block text-[11px] text-muted-foreground">{r.book_ref}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
function LockClaims() {
  const labels = file("EvaluationLabels.json")?.labels ?? [];
  if (!labels.length) return null;
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 flex w-full items-baseline justify-between gap-2 text-xs">
        <span className="font-medium">Claims to lock</span>
        <span className="text-muted-foreground tabular-nums">
          {labels.filter((l) => l.label === "IN").length} of {labels.length} IN
        </span>
      </legend>
      {labels.map((l) => (
        <div
          key={l.statement_id}
          className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 rounded-xl border border-foreground/15 px-3.5 py-2.5 text-sm"
        >
          <Badge className="bg-primary font-mono text-primary-foreground">{l.statement_id}</Badge>
          <span className="leading-snug">
            {fill(l.approved_text)}
            <span className="mt-0.5 block text-[11.5px] text-muted-foreground">
              {l.type} · worded to “{l.strength}”{l.reconstructed_warrant ? " · warrant reconstructed" : ""}
            </span>
          </span>
          <Badge className={cn("font-mono", LABEL_BADGE[l.label] ?? "")}>{l.label}</Badge>
        </div>
      ))}
    </fieldset>
  );
}
function CheckpointOptions({ checkpoint }: { checkpoint: string }) {
  const name = `Options_${checkpoint.replace(":", "-")}.json` as "Options_P2.json";
  const opts = file(name)?.options ?? [];
  if (!opts.length) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <p className="font-medium text-xs">The versions compared</p>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {opts.map((o) => (
          <li key={o.option_id} className="rounded-xl border px-3 py-2 text-xs">
            <b className="block font-medium text-[13px]">{o.label}</b>
            <span className="text-muted-foreground">
              {o.strategy} · {Math.round(o.kept * 100)}% kept{o.dropped ? `, ${o.dropped} dropped` : ""} ·{" "}
              {o.scorecard.h_failed ? `${o.scorecard.h_failed} hard rule failed` : "hard rules pass"} · score{" "}
              {o.scorecard.m_score.toFixed(2)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
function CharterView({ stop }: { stop: LiveStop }) {
  const c = stop.charter;
  if (!c)
    return (
      <div className="flex flex-col gap-2.5" role="status" aria-label="Reading the PI's charter">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-4/5" />
        <Skeleton className="mt-3 h-24 w-full" />
      </div>
    );
  return <CharterDocument charter={c} />;
}
const PI_HEADLINE: Partial<Record<LiveStop["kind"], string>> = {
  charter: "The PI recommends this charter",
  outcome: "The PI recommends accepting the stage",
  close: "The PI recommends closing the run",
};
const KIND_LINE: Record<LiveStop["kind"], string> = {
  question: "A question of the run",
  artifact_review: "Checkpoint P1 · the lock",
  charter: "Before writing starts",
  outcome: "The stage is done",
  close: "The run is done",
  failure: "Something failed",
};

/** A stage in the words of the screen that shows it. */
const stageName = (sid: string) => {
  const scr = LIVE_SCREENS.find((x) => x.stages.some((st) => st.id === sid));
  return (scr && SCREEN_COPY[scr.key]?.name) ?? sid;
};

export function LiveStopSheet({ stop }: { stop: LiveStop }) {
  const lock = stop.kind === "artifact_review";
  const pi = stop.kind === "charter" || stop.kind === "outcome" || stop.kind === "close" || stop.kind === "failure";
  // A decision left to you is taken on the PI's recommendation: until the PI has made one there is nothing to take.
  const drafting = pi && !stop.pi;
  const options = lock
    ? [
        { id: "approve", label: "Lock these claims" },
        { id: "comment", label: "Send them back with a note" },
      ]
    : stop.stepKey?.startsWith("review_")
      ? stop.options.map((o) => (o.id === "other" ? { ...o, label: "Write a note for the next stages" } : o))
      : stop.options;
  const [choice, setChoice] = useState(lock ? "approve" : (stop.recommended ?? options[0]?.id ?? ""));
  const [text, setText] = useState("");
  const [note, setNote] = useState("");
  // At the writing frame (F) and the join (J) you may change the frame's choices: they go with your answer.
  const framing = stop.checkpoint === "F" || stop.checkpoint === "J";
  const [edits, setEdits] = useState<Partial<Record<FrameChoiceKey, string>>>({});
  const editing = framing && Object.keys(edits).length > 0 && choice !== "again" && choice !== "other";
  // A guided run's review, your own objections in the debate, and the warrants no source states.
  const reviewing = Boolean(stop.stepKey?.startsWith("review_"));
  const objecting = stop.stepKey === "debate" && LIVE.objectable.length > 0 && stop.options.some((o) => o.id === "add");
  const warranting = stop.stepKey === "toulmin" && LIVE.openWarrants.length > 0;
  const [objections, setObjections] = useState<Objection[]>([]);
  const [warrants, setWarrants] = useState<Record<string, string>>({});
  const sheet = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => enter(sheet.current, "sheet"), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") minimize();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  if (S.sheetMin)
    return (
      <M
        in="pill"
        className="absolute bottom-4 left-1/2 z-30 flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-3 whitespace-nowrap rounded-full bg-card py-1.5 pr-1.5 pl-4 text-sm shadow-lg ring-1 ring-amber-500/60"
      >
        <PulseDot className="bg-amber-500" />
        <span className="truncate">
          <b className="font-semibold">Waiting for you:</b> {stop.prompt}
        </span>
        <Button
          type="button"
          size="sm"
          onClick={() => {
            S.sheetMin = false;
            emit();
          }}
        >
          <Icon n="up" />
          Answer
        </Button>
      </M>
    );
  const confirm = async () => {
    if (pi) {
      await answerStop({ action: "endorse", note: note.trim() || undefined });
      return;
    }
    if (lock) {
      if (choice === "comment" && !note.trim()) {
        toast.error("Write what the claims should change, so the run can argue them again.");
        return;
      }
      await answerStop(choice === "approve" ? { action: "approve" } : { action: "comment", text: note.trim() });
      return;
    }
    if (choice === "other" && !text.trim()) {
      toast.error(reviewing ? "Write your note, or continue." : "Type your answer, or pick one of the options.");
      return;
    }
    const sent = objecting && choice === "add" ? readyObjections(objections) : [];
    if (objecting && choice === "add" && !sent.length) {
      toast.error("Give each objection a claim, a question and at least a sentence.");
      return;
    }
    const reworded = Object.fromEntries(
      Object.entries(warrants).filter(
        ([k, v]) => v.trim() && v.trim() !== LIVE.openWarrants.find((w) => w.claim_id === k)?.warrant,
      ),
    );
    if (warranting && choice === "reword" && !Object.keys(reworded).length) {
      toast.error("Reword at least one warrant, or choose another option.");
      return;
    }
    await answerStop({
      action: "answer",
      option_id: choice,
      ...(choice === "other" ? { text: text.trim() } : note.trim() ? { text: note.trim() } : {}),
      // The run scores the frame again with your choices and takes it at once when no hard rule fails.
      ...(editing ? { params: { edits, approve: true } } : {}),
      ...(sent.length ? { params: { objections: sent } } : {}),
      ...(warranting && choice === "reword" ? { params: { warrants: reworded } } : {}),
    });
  };
  const cta = pi
    ? stop.kind === "charter"
      ? "Use this charter"
      : "Take the PI's recommendation"
    : lock
      ? choice === "approve"
        ? "Lock the claims"
        : "Send back"
      : editing
        ? "Apply and approve"
        : "Confirm";
  return (
    <>
      <button
        type="button"
        aria-label="Hide the stop to look at the work"
        tabIndex={-1}
        className="absolute inset-0 z-20 cursor-default bg-black/25 dark:bg-black/50"
        onClick={minimize}
      />
      <div
        ref={sheet}
        role="dialog"
        aria-label={stop.prompt}
        className="absolute inset-x-4 bottom-4 z-30 mx-auto flex max-h-[calc(100%-2rem)] max-w-[700px] flex-col overflow-hidden rounded-2xl bg-popover text-popover-foreground shadow-2xl ring-1 ring-foreground/10"
      >
        <div className="flex flex-col gap-3.5 overflow-y-auto px-5 pt-4.5 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={TONE.waiting.c}>
              <PulseDot className="bg-amber-500" />
              Your turn
            </Badge>
            <span className="text-muted-foreground text-xs">
              {stop.checkpoint
                ? stop.checkpoint.startsWith("S:")
                  ? "Section check"
                  : `Checkpoint ${stop.checkpoint}`
                : KIND_LINE[stop.kind]}
              {stop.kind !== "charter" && ` · ${stageName(stop.stage)}`}
            </span>
            <Button type="button" variant="ghost" size="sm" className="ml-auto" onClick={minimize}>
              <Icon n="down" />
              Hide to look at the work
            </Button>
          </div>
          <h3 className="text-balance font-semibold text-lg tracking-tight">{stop.prompt}</h3>
          {!pi && stop.why && (
            <div className="grid grid-cols-[auto_1fr] gap-2.5 rounded-xl bg-muted px-3 py-2.5 text-sm">
              <Icon n="info" className="mt-0.5 size-4 text-muted-foreground" />
              <p>
                <b className="font-semibold">Why the run stopped here.</b> {stop.why}
              </p>
            </div>
          )}
          {pi && stop.pi && (
            <PiAdviceCard
              advice={{
                consultationId: stop.consultationId ?? "",
                action: stop.pi.action,
                text: stop.pi.reason,
                ...(stop.pi.confidence != null ? { confidence: stop.pi.confidence } : {}),
              }}
              headline={PI_HEADLINE[stop.kind] ?? `The PI recommends to ${stop.pi.action}`}
            />
          )}
          {drafting && (
            <div className="flex items-center gap-3 rounded-xl border border-dashed px-3.5 py-3 text-sm">
              <WorkOrb state="composing" size={20} />
              <span>
                <b className="font-medium">The PI is reading the run to recommend.</b>{" "}
                <span className="text-muted-foreground">
                  {stop.kind === "charter"
                    ? "It drafts the charter from the case and the sample results; you approve it here."
                    : "Its recommendation and its reasons appear here."}
                </span>
              </span>
            </div>
          )}
          {stop.kind === "charter" && !drafting && <CharterView stop={stop} />}
          {stop.kind === "outcome" && !drafting && (
            <p className="text-sm">
              {LIVE.draft ? "The first draft is written" : "The outline is published"}:{" "}
              {String(LIVE.published?.sections ?? "")} sections, {String(LIVE.published?.paragraphs ?? "")} paragraphs
              and {String(LIVE.published?.sentences ?? "")} sentences,{" "}
              {LIVE.draft ? "not read back yet" : "each tied to its statements"}. The PI recommends to{" "}
              <b className="font-semibold">{stop.pi?.action ?? "accept"}</b> the stage.
            </p>
          )}
          {lock && <LockClaims />}
          {stop.checkpoint?.startsWith("S:") && <WritingsToChoose sec={stop.checkpoint.slice(2)} />}
          {stop.checkpoint && stop.checkpoint !== "P1" && !stop.checkpoint.startsWith("S:") && (
            <CheckpointOptions checkpoint={stop.checkpoint} />
          )}
          {stop.checkpoint === "J" && <JoinSummary />}
          {reviewing && stop.stepKey && <StageReviewCard stepKey={stop.stepKey} />}
          {warranting && <WarrantsForm reword={choice === "reword"} value={warrants} onChange={setWarrants} />}
          {framing && <FrameChoices edits={edits} onChange={setEdits} />}
          {stop.checkpoint && <ScoreRows checkpoint={stop.checkpoint} />}
          {!pi && (
            <RadioGroup value={choice} onValueChange={setChoice} className="gap-2" aria-label={stop.prompt}>
              {options.map((o) => (
                <label
                  key={o.id}
                  htmlFor={`stop-${o.id}`}
                  className={cn(
                    "grid cursor-pointer grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-xl border px-3.5 py-3 transition-[background-color,border-color,box-shadow] hover:bg-muted/60",
                    choice === o.id && "border-foreground ring-1 ring-foreground",
                  )}
                >
                  <RadioGroupItem id={`stop-${o.id}`} value={o.id} className="mt-0.5" />
                  <span className="flex flex-wrap items-center gap-2 font-semibold text-sm">
                    {o.label.replace(/\s*\(([^)]*)\)$/, "")}
                    {(o.id === stop.recommended || (lock && o.id === "approve")) && (
                      <Badge variant="secondary">Recommended</Badge>
                    )}
                  </span>
                  {/\(([^)]*)\)$/.test(o.label) && (
                    <span className="col-start-2 flex items-start gap-1.5 text-muted-foreground text-xs">
                      <Icon n="arrow" className="mt-0.5 size-3" />
                      {/\(([^)]*)\)$/.exec(o.label)?.[1]}
                    </span>
                  )}
                </label>
              ))}
            </RadioGroup>
          )}
          {objecting && choice === "add" && <ObjectionsForm value={objections} onChange={setObjections} />}
          {choice === "other" && !pi && !lock && (
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={reviewing ? "Your note for the next stages" : "Your answer"}
              aria-label={reviewing ? "Your note for the next stages" : "Your answer"}
            />
          )}
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              lock && choice === "comment"
                ? "What should change in the claims (required)"
                : "Optional: a note for the agents, kept with your decision"
            }
            aria-label="Note for the agents"
          />
        </div>
        <div className="flex items-center gap-3 border-t bg-popover px-5 py-3.5">
          <span className="flex-1 text-muted-foreground text-xs">
            {stop.sending
              ? "Sending your answer…"
              : drafting
                ? "You can answer once the PI has recommended."
                : "Nothing runs until you confirm."}
          </span>
          <Button type="button" data-confirm disabled={stop.sending || drafting} onClick={confirm}>
            {stop.sending ? "Sending…" : drafting ? "Waiting for the PI" : cta}
          </Button>
        </div>
      </div>
    </>
  );
}

/** The stage's line in the narration card when no agent is speaking. */
export const liveIdle = (sid: string) => LSTAGE[sid]?.lead ?? "";
export { callLine, screenIndex };
