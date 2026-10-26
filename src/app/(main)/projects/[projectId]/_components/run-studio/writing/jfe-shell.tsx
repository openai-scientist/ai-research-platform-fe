"use client";
"use no memo";

// The writing run keeps its state in module variables (engine.ts) and re-renders on emit(); the React Compiler
// would memoise these components on their props and never show a change.

import { type ComponentType, Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";

import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Caret, PulseDot } from "../run-bits";
import { Bar } from "./cases-ui";
import {
  JBLOCKS,
  JDEC,
  JLINEAGE,
  JONE,
  JORB,
  JRULES,
  JSCREENS,
  JSTAGE,
  JSTAGES,
  JSTOP_INFO,
  JSTOP_NO,
  JSTOP_STAGE,
  JTEAM,
} from "./data/jfe";
import type { ScreenDef } from "./data/meta";
import { AGENTS } from "./data/meta";
import { emit, J, jsettle, playScenario, S, scrollTop, setTrack, TRACK, UI } from "./engine";
import { CorpusScene, ParseScene } from "./jfe-corpus";
import { AnalyzeScene, AnnotateScene, ProfileView, PublishScene } from "./jfe-measure";
import { AgentAvatar, Bump, cn, enter, Icon, M, pad2, quiet, SceneNote, WorkOrb } from "./lib";
import { Advice, lifeOf, SUM_ICON, TONE, type Tone } from "./shared";

/* ===== the profile run's shell, and switching between the two runs ===== */
export const JSCENES: Record<string, ComponentType<{ live: boolean }>> = {
  corpus: CorpusScene,
  parse: ParseScene,
  annotate: AnnotateScene,
  analyze: AnalyzeScene,
  publish: PublishScene,
};
export const jViewKey = () => J.view ?? J.live;
export const jIdx = (key: string) => JSCREENS.findIndex((s) => s.key === key);
export function jSetView(key: string) {
  quiet();
  J.view = key === J.live && !J.done ? null : key;
  emit();
  scrollTop();
}
/* the state of each run, in the words the header uses */
export function runTone(t: "asw" | "jfe"): Tone {
  if (t === "jfe" && !J.started)
    return { label: "Starts at S08", c: "bg-muted text-muted-foreground", dot: "bg-muted-foreground/60" };
  if (t === "jfe")
    return J.failed
      ? TONE.failed
      : J.done
        ? { ...TONE.done, label: "Published" }
        : S.paused
          ? TONE.paused
          : TONE[J.lifecycle];
  if (S.jr.waiting)
    return { label: "Waiting for JFE", c: "bg-sky-500/12 text-sky-700 dark:text-sky-300", dot: "bg-sky-500" };
  return TONE[lifeOf()];
}

/* ---------- the two runs, side by side in the header ---------- */
export function RunSwitch() {
  const tabs: ["asw" | "jfe", string, string, string][] = [
    ["asw", "ASW-0412", "Manuscript", "Paper"],
    ["jfe", "JFE-IRJ-v2", "Journal profile", "Profile"],
  ];
  return (
    <>
      <Tabs value={TRACK} onValueChange={(v) => setTrack(v === "jfe" ? "jfe" : "asw")} className="shrink-0">
        <TabsList aria-label="Runs">
          {tabs.map(([k, id, label, short]) => {
            const on = TRACK === k;
            const tone = runTone(k);
            const pulse =
              !S.paused &&
              (k === "jfe"
                ? J.started && !J.done && !J.failed && J.lifecycle !== "blocked"
                : (S.lifecycle === "running" || S.lifecycle === "waiting") && !S.done && !S.jr.waiting);
            const waiting = (k === "jfe" ? J.lifecycle === "waiting" : S.lifecycle === "waiting") && !on;
            return (
              <Fragment key={k}>
                <TabsTrigger
                  value={k}
                  title={`${label} · ${tone.label}`}
                  className="flex-none gap-2 px-2.5 font-normal text-xs"
                >
                  <PulseDot className={tone.dot} pulse={pulse} />
                  <b className="font-mono font-semibold">{id}</b>
                  <span className="max-2xl:hidden">{label}</span>
                  <span className="max-sm:hidden 2xl:hidden">{short}</span>
                  {waiting && (
                    <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-amber-500 ring-2 ring-muted" />
                  )}
                </TabsTrigger>
              </Fragment>
            );
          })}
        </TabsList>
      </Tabs>
      <span className="min-w-0 flex-1 truncate text-muted-foreground text-sm max-xl:hidden">
        {TRACK === "jfe"
          ? "How IR Journal's research articles are written, 2021–2026 · built when ASW-0412 reaches S08"
          : "Fusing lexical and dense retrieval finds more evidence in long scientific papers"}
      </span>
    </>
  );
}

/* ---------- stage track ---------- */
export function JStageTrack() {
  const liveIdx = jIdx(J.live);
  const items: ScreenDef[] = [
    ...JSCREENS,
    { key: "profile", title: "The profile", short: "Profile", stages: [], block: 2 },
  ];
  const box = useRef<HTMLDivElement>(null);
  const viewing = jViewKey();
  useEffect(() => {
    box.current
      ?.querySelector(`[data-track="${viewing}"]`)
      ?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [viewing]);
  return (
    <div ref={box} className="overflow-x-auto overflow-y-hidden border-b px-4 pt-2.5 pb-3.5 md:px-5">
      <div style={{ minWidth: `${items.length * 96}px` }}>
        <div className="mb-1.5 flex gap-1.5 font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
          {JBLOCKS.map((b, i) => {
            const n = JSCREENS.filter((s) => s.block === i).length + (i === 2 ? 1 : 0);
            return (
              <span key={b} className="flex items-center gap-2" style={{ flex: `${n} 1 0` }}>
                {b}
                <i className="h-px flex-1 bg-border" />
              </span>
            );
          })}
        </div>
        <ol className="flex gap-1.5">
          {items.map((it, i) => {
            const isProfile = it.key === "profile";
            const sid = it.stages[0];
            const st = sid ? J.st[sid] : undefined;
            const total = sid ? JSTAGE[sid].steps.length : 1;
            const done = isProfile ? (J.done ? 1 : 0) : (st?.done.length ?? 0);
            const isPast = isProfile
              ? J.done
              : st?.status === "done" && !(i === liveIdx && (J.gate !== null || J.lifecycle === "blocked"));
            const isLive = !isProfile && i === liveIdx && !J.done;
            const fill = isPast ? 100 : isLive ? Math.max(4, (done / total) * 100) : 0;
            const waiting = isLive && Boolean(J.gate);
            const blocked = isLive && J.lifecycle === "blocked";
            const available = isProfile ? J.done : J.started && i <= J.reached;
            const isViewed = viewing === it.key;
            return (
              <li key={it.key} data-track={it.key} className="relative min-w-0 flex-1 basis-0">
                <button
                  type="button"
                  disabled={!available}
                  onClick={() => jSetView(it.key)}
                  className="flex w-full flex-col gap-1.5 rounded py-0.5 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default"
                >
                  <span
                    className={cn(
                      "flex items-center gap-1.5 truncate pr-3 font-medium text-xs transition-colors",
                      isPast || isLive || isViewed ? "text-foreground" : "text-muted-foreground",
                      isViewed && "font-semibold",
                    )}
                  >
                    {isProfile ? (
                      <Icon n="lock" className="size-3" />
                    ) : (
                      <span className="font-mono font-normal text-[10.5px] text-muted-foreground">{sid}</span>
                    )}
                    {it.short}
                  </span>
                  <span className="relative h-1 overflow-hidden rounded-full bg-muted">
                    <i
                      className={cn(
                        "absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
                        blocked ? "bg-rose-500" : waiting ? "bg-amber-500" : isLive ? "bg-sky-500" : "bg-foreground",
                      )}
                      style={{ width: `${fill}%` }}
                    />
                    {isLive && !waiting && !blocked && (
                      <i className="sweep absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-sky-500/40 to-transparent" />
                    )}
                  </span>
                </button>
                {(it.gate || it.check) && (
                  <span
                    title={it.gate ? `Stop ${JSTOP_NO[it.gate]} for you` : "A quick check for you"}
                    className={cn(
                      "absolute -right-2 bottom-[-5px] z-10 grid size-[18px] place-items-center rounded-full bg-background",
                      waiting ? "bg-amber-500 text-white" : isPast ? "text-muted-foreground" : "text-amber-500",
                    )}
                  >
                    {waiting && (
                      <span
                        aria-hidden="true"
                        className="breathe absolute -inset-[3px] rounded-full border-2 border-amber-500"
                      />
                    )}
                    {it.gate ? (
                      <Icon n="flag" className={cn("size-3", !isPast && !waiting && "fill-amber-500/25")} />
                    ) : (
                      <span className={cn("size-1.5 rounded-full", waiting ? "bg-white" : "bg-current")} />
                    )}
                  </span>
                )}
                {isViewed && (
                  <span className="absolute inset-x-0 right-3 -bottom-3.5 h-0.5 rounded-full bg-foreground" />
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

/* ---------- stage header ---------- */
export function JStageHeader({ scr }: { scr: ScreenDef }) {
  const sid = scr.stages[0];
  const sdef = JSTAGE[sid];
  const st = J.st[sid];
  const lin = JLINEAGE[sid];
  const waiting = J.gate && JSTOP_STAGE[J.gate.id] === sid;
  const blocked = J.lifecycle === "blocked" && scr.key === J.live;
  const done = st.status === "done" && !waiting;
  const cast = [...new Set(sdef.steps.flatMap((s) => (s.a ? [s.a] : [])))];
  return (
    <header className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3.5 gap-y-2 border-b pb-3.5 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
      <span className="pt-1 font-mono text-muted-foreground text-xs">
        {pad2(jIdx(scr.key) + 1)}/{pad2(JSCREENS.length)}
      </span>
      <div className="min-w-0">
        <h2 className="flex flex-wrap items-center gap-2 text-balance font-semibold text-lg tracking-tight">
          {sdef.title}
          <Badge title={sdef.mods} variant="outline" className="font-mono text-muted-foreground">
            {sid}
          </Badge>
        </h2>
        <p className="mt-1 max-w-[68ch] text-muted-foreground text-sm">{sdef.lead}</p>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs">
          <span className="text-muted-foreground">Builds on</span>
          {lin.reads.map((r) => (
            <span key={r} className="inline-flex h-6 items-center rounded-md bg-muted px-2 text-foreground/80">
              {r}
            </span>
          ))}
          <Icon n="arrow" className="size-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">Writes</span>
          {lin.writes.map(([name, step]) => {
            const made = st.done.includes(step);
            const making = !made && st.cur === step;
            return (
              <span
                key={name}
                className={cn(
                  "relative inline-flex h-6 items-center gap-1 overflow-hidden rounded-md border px-2 transition-colors duration-500",
                  made
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                    : "border-foreground/20 border-dashed text-muted-foreground",
                  making && "border-sky-500/50 border-solid text-foreground",
                )}
              >
                {making && (
                  <span
                    aria-hidden="true"
                    className="shimmer absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-sky-500/15 to-transparent"
                  />
                )}
                {made ? (
                  <M as="span" in="pop">
                    <Icon n="check" className="size-3" />
                  </M>
                ) : (
                  <Icon n="file" className="size-3" />
                )}
                <span className="relative">{name}</span>
              </span>
            );
          })}
        </div>
        {st.status === "done" && st.summary && (
          <M as="p" in="up4" className="mt-2 flex items-center gap-2 font-medium text-sm">
            <Icon n="circleCheck" className="size-3.5 text-emerald-600" />
            {st.summary}
          </M>
        )}
      </div>
      <div className="col-start-2 flex items-center gap-3 sm:col-start-3 sm:pt-0.5">
        <div className="flex pl-2">
          {cast.map((a) => (
            <span key={a} className="-ml-2 rounded-full bg-background p-0.5">
              <AgentAvatar a={a} />
            </span>
          ))}
        </div>
        {blocked ? (
          <Badge className="bg-rose-500/12 text-rose-700 dark:text-rose-300">
            <PulseDot className="bg-rose-500" pulse={false} />
            Held
          </Badge>
        ) : waiting ? (
          <Badge className="bg-amber-500/15 text-amber-800 dark:text-amber-300">
            <PulseDot className="bg-amber-500" />
            Your turn
          </Badge>
        ) : done ? (
          <M
            as="span"
            in="pop"
            className="inline-flex h-6 items-center gap-1.5 rounded-full bg-emerald-500/12 px-2.5 font-medium text-emerald-700 text-xs dark:text-emerald-300"
          >
            <Icon n="check" className="size-3" />
            Done
          </M>
        ) : st.status === "pending" ? (
          <Badge variant="secondary">Not started</Badge>
        ) : (
          <Badge className="bg-sky-500/12 text-sky-700 dark:text-sky-300">
            <PulseDot className="bg-sky-500" />
            In progress
          </Badge>
        )}
      </div>
    </header>
  );
}

/* ---------- the aside ---------- */
export function JTeam() {
  const active = J.done || J.gate || J.lifecycle === "blocked" ? null : J.msg?.actor;
  return (
    <div data-aside-team className="flex gap-px overflow-hidden border-b px-3 py-3">
      {JTEAM.map((role) => {
        const on = role === active;
        const g = AGENTS[role];
        return (
          <span
            key={role}
            className={cn(
              "inline-flex shrink-0 items-center rounded-full p-px transition-all duration-300",
              on && g.soft.split(" ")[0],
              on && "min-w-0 shrink gap-1.5 pr-2",
            )}
          >
            <span className="relative">
              <AgentAvatar
                a={role}
                size="sm"
                className={cn("size-6 transition-[opacity,filter] duration-300", !on && "opacity-50 saturate-[.3]")}
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
  );
}
export function JNowCard({ compact }: { compact?: boolean }) {
  if (!J.started)
    return (
      <div className="flex flex-col gap-2 rounded-xl bg-card p-3.5 ring-1 ring-foreground/10">
        <span className="text-muted-foreground text-xs">Not started</span>
        <h3 className="font-semibold text-[15px]">Starts when the manuscript reaches S08</h3>
        {!compact && (
          <p className="text-muted-foreground text-sm">
            ASW-0412 needs the profile at its journal step. The run moves here then, and back once it is published.
          </p>
        )}
      </div>
    );
  if (J.done)
    return (
      <div className="flex flex-col gap-2 rounded-xl bg-card p-3.5 ring-1 ring-foreground/10">
        <span className="text-muted-foreground text-xs">Finished</span>
        <h3 className="font-semibold text-[15px]">JFE-IRJ-v2 is published</h3>
        {!compact && (
          <>
            <p className="text-muted-foreground text-sm">
              The manuscript run ASW-0412 reads it at S08, where its frozen claims meet the journal.
            </p>
            <Button type="button" size="sm" className="w-fit" onClick={() => setTrack("asw")}>
              Open the manuscript
              <Icon n="arrow" />
            </Button>
          </>
        )}
      </div>
    );
  if (J.failed)
    return (
      <div className="flex flex-col gap-2 rounded-xl bg-card p-3.5 ring-1 ring-rose-500/40">
        <span className="text-rose-700 text-xs dark:text-rose-300">Stopped at {J.stage}</span>
        <h3 className="font-semibold text-[15px]">The profile could not be built</h3>
        {!compact && (
          <p className="text-muted-foreground text-sm">{J.failure} ASW writes with the publisher’s rules only.</p>
        )}
      </div>
    );
  if (J.lifecycle === "blocked")
    return (
      <div className="flex flex-col gap-2 rounded-xl bg-card p-3.5 ring-1 ring-rose-500/40">
        <span className="text-rose-700 text-xs dark:text-rose-300">Held</span>
        <p className="text-sm">{J.blocked?.why}</p>
        <Button type="button" size="sm" className="w-fit" onClick={() => jsettle("resume")}>
          {J.blocked?.button}
          <Icon n="arrow" />
        </Button>
      </div>
    );
  const sid = J.stage;
  const st = J.st[sid];
  const steps = JSTAGE[sid].steps;
  const step = steps.find((s) => s.id === st.cur);
  const index = step ? steps.indexOf(step) : -1;
  const speaker = J.msg?.actor;
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-card p-3.5 shadow-xs ring-1 ring-foreground/10">
      <div className="flex justify-between gap-2 text-muted-foreground text-xs">
        <b className="truncate font-medium text-foreground">
          <span className="font-mono font-normal text-muted-foreground">{sid}</span> · {JSTAGE[sid].name}
        </b>
        <span className="whitespace-nowrap">
          {step ? `Step ${index + 1} of ${steps.length}` : `${steps.length} steps`}
        </span>
      </div>
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3">
        <WorkOrb state={J.gate ? "listening" : JORB[sid]} size={compact ? 20 : 32} className="mt-0.5" />
        <div className="min-w-0">
          <M as="h3" key={st.cur ?? sid} in="up4" dur={220} className="font-semibold text-[15px] tracking-tight">
            {step?.t ?? JSTAGE[sid].title}
          </M>
          {!compact && (
            <p className="mt-1 min-h-5 text-sm leading-relaxed">
              {J.msg ? (
                <>
                  {J.msg.text}
                  {!J.msg.done && <Caret />}
                </>
              ) : (
                <span className="text-muted-foreground">{JONE[sid]}</span>
              )}
            </p>
          )}
          {speaker && !compact && (
            <p className="mt-1.5 flex items-center gap-x-1.5 text-[11px] text-muted-foreground">
              <span className={cn("size-1.5 rounded-full", AGENTS[speaker].solid)} />
              <span className={cn("font-medium", AGENTS[speaker].text)}>{AGENTS[speaker].name}</span>
            </p>
          )}
        </div>
      </div>
      {J.holding && (
        <M in="up4" className="flex flex-col gap-2 rounded-lg bg-muted px-3 py-2.5 text-xs">
          <span>
            Step done. Paused because <b>Pause each step</b> is on.
          </span>
          <Button type="button" size="sm" className="w-fit" onClick={() => jsettle("continue")}>
            Continue
            <Icon n="play" />
          </Button>
        </M>
      )}
    </div>
  );
}
export function JSteps() {
  if (J.done || !J.started) return null;
  const sid = J.stage;
  const st = J.st[sid];
  const steps = JSTAGE[sid].steps;
  return (
    <div className="flex flex-col gap-2">
      <p className="flex justify-between font-medium text-muted-foreground text-xs">
        <span>Steps in this stage</span>
        <span>
          Stage {JSTAGES.indexOf(JSTAGE[sid]) + 1} of {JSTAGES.length}
        </span>
      </p>
      <ol className="flex flex-col">
        {steps.map((s, i) => {
          const stop = s.gate || s.check;
          const done = st.done.includes(s.id);
          const now = st.cur === s.id && J.lifecycle !== "blocked";
          const asking = now && Boolean(stop && J.gate);
          const skipped = s.check && S.mode === "gates" && !done;
          return (
            <li
              key={s.id}
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
                  "mt-0.5 grid size-[18px] place-items-center rounded-full border transition-colors",
                  !done && !asking && "bg-card",
                  done && "border-foreground bg-foreground text-background",
                  now && !asking && "border-2 border-sky-500",
                  stop && !done && !now && "border-amber-500 text-amber-600",
                  asking && "border-amber-500 bg-amber-500 text-white",
                )}
              >
                {done && <Icon n="check" className="size-2.5" sw={3.5} />}
                {!done && stop && (!now || asking) && <Icon n="flag" className="size-2.5" />}
                {now && !asking && <span className="beat size-1.5 rounded-full bg-sky-500" />}
              </span>
              <span className="min-w-0">
                <b
                  className={cn("block font-medium text-[13px]", !done && !now && "font-normal text-muted-foreground")}
                >
                  {s.t}
                </b>
                <small
                  className={cn("text-[11.5px]", stop ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground")}
                >
                  {s.gate
                    ? `Stop ${JSTOP_NO[s.id]} · you decide, the run waits`
                    : s.check
                      ? skipped
                        ? "Quick check · taken on the recommendation"
                        : "Quick check · you decide"
                      : AGENTS[s.a ?? "or"].name}
                </small>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
export function JNextStop() {
  if (J.done || !J.started || J.lifecycle === "blocked") return null;
  if (J.gate)
    return (
      <div className="grid grid-cols-[auto_1fr] gap-2.5 rounded-xl border border-amber-500/50 bg-amber-500/10 p-3 text-xs">
        <span className="grid size-7 place-items-center rounded-lg bg-amber-500/20 text-amber-800 dark:text-amber-300">
          <Icon n="flag" className="size-3.5" />
        </span>
        <span>
          <b className="block font-semibold text-[13px]">Waiting for you now</b>
          <span className="text-muted-foreground">{JSTOP_INFO[J.gate.id].title}. Nothing runs until you answer.</span>
        </span>
      </div>
    );
  let n: { id: string; sid: string } | null = null;
  for (let i = JSTAGES.indexOf(JSTAGE[J.stage]); i < JSTAGES.length && !n; i++) {
    const sd = JSTAGES[i];
    for (const s of sd.steps)
      if (!n && !J.st[sd.id].done.includes(s.id) && (s.gate || (s.check && S.mode === "copilot")))
        n = { id: s.id, sid: sd.id };
  }
  return (
    <div className="grid grid-cols-[auto_1fr] gap-2.5 rounded-xl border border-dashed p-3 text-xs">
      <span
        className={cn(
          "grid size-7 place-items-center rounded-lg",
          n ? "bg-amber-500/15 text-amber-800 dark:text-amber-300" : "bg-muted text-muted-foreground",
        )}
      >
        <Icon n={n ? "flag" : "play"} className="size-3.5" />
      </span>
      <span>
        <b className="block font-semibold text-[13px]">
          {n ? `Next stop for you: ${JSTOP_INFO[n.id].title.toLowerCase()}` : "No more stops"}
        </b>
        <span className="text-muted-foreground">
          {n
            ? `In ${JSCREENS.find((s) => n && s.stages.includes(n.sid))?.short}. Until then the agents work on their own.`
            : "The run finishes on its own."}
        </span>
      </span>
    </div>
  );
}
export function JRulesCard() {
  const [open, setOpen] = useState(false);
  const checked = Object.keys(J.rules).length;
  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open ? "true" : "false"}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left font-medium text-xs outline-none"
      >
        <Icon n="right" className={cn("size-3.5 text-muted-foreground transition-transform", open && "rotate-90")} />
        Rules JFE never bends
        <span className="ml-auto font-mono text-[11px] text-muted-foreground">
          {checked} of {JRULES.length} checked
        </span>
      </button>
      {open && (
        <ul className="flex flex-col gap-1.5 px-3 pb-3 text-xs">
          {JRULES.map(([r, why], i) => {
            const s = J.rules[i];
            return (
              <li
                key={r}
                title={why}
                className={cn(
                  "grid grid-cols-[14px_1fr] gap-2 rounded px-1 transition-colors duration-500",
                  s ? "text-foreground" : "text-muted-foreground",
                  s === "hit" && "bg-amber-500/12",
                )}
              >
                <span
                  className={cn(
                    "mt-1 size-2 rounded-full border-[1.5px]",
                    s === "pass" && "border-emerald-500 bg-emerald-500",
                    s === "hit" && "border-amber-500 bg-amber-500",
                    !s && "border-foreground/30",
                  )}
                />
                <span>
                  {r}
                  <span className="block text-[11px] text-muted-foreground">{why}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
export function JActivity() {
  const end = useRef<HTMLLIElement>(null);
  const count = J.feed.length;
  useEffect(() => {
    void count;
    end.current?.scrollIntoView({ block: "nearest" });
  }, [count]);
  if (!J.feed.length) return <p className="text-muted-foreground text-xs">Nothing yet.</p>;
  return (
    <ol className="flex flex-col gap-3">
      {J.feed.map((it) => {
        const you = it.actor === "you";
        return (
          <M as="li" key={it.seq} in="up6" className="grid grid-cols-[auto_1fr] gap-2.5 text-xs">
            {you ? (
              <span className="grid size-5 place-items-center rounded-full bg-amber-500/20 font-semibold text-[8.5px] text-amber-800 dark:text-amber-300">
                You
              </span>
            ) : (
              <AgentAvatar a={it.actor} size="sm" />
            )}
            <div className={cn(it.kind === "event" && "text-muted-foreground")}>
              <b className={cn("font-semibold", you ? "text-amber-800 dark:text-amber-300" : AGENTS[it.actor].text)}>
                {you ? "You" : AGENTS[it.actor].name}
              </b>
              <span className="ml-1.5 font-mono text-[10.5px] text-muted-foreground">
                #{String(it.seq).padStart(4, "0")} · {it.stage}
              </span>
              <p className={cn("mt-px leading-relaxed", you && "font-medium text-foreground")}>{it.text}</p>
            </div>
          </M>
        );
      })}
      <li ref={end} aria-hidden className="list-none" />
    </ol>
  );
}
export function JAside() {
  const [tab, setTab] = useState("now");
  return (
    <div className="flex h-full min-h-0 flex-col">
      <JTeam />
      <Tabs value={tab} onValueChange={setTab} className="min-h-0 flex-1 gap-0">
        <TabsList variant="line" className="w-full justify-start border-b px-3">
          <TabsTrigger value="now" className="flex-none">
            Now
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex-none">
            Activity
            <Bump
              k={J.feed.length}
              className="rounded-full bg-muted px-1.5 font-mono font-semibold text-[10.5px] text-muted-foreground"
            >
              {J.feed.length}
            </Bump>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="now" className="min-h-0 overflow-y-auto">
          <div className="flex flex-col gap-3.5 p-3.5">
            <JNowCard />
            <JSteps />
            <JNextStop />
            <JRulesCard />
          </div>
        </TabsContent>
        <TabsContent value="activity" className="min-h-0 overflow-y-auto p-3.5">
          <JActivity />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------- the review stop ---------- */
export function JGateSheet({ id }: { id: string }) {
  const d = JDEC[id];
  const gate = id[1] === "G";
  const rec = d.opts.find((o) => o[3]) ?? d.opts[0];
  const [choice, setChoice] = useState(rec[0]);
  const [note, setNote] = useState("");
  const [checks, setChecks] = useState((d.checks ?? []).map(() => false));
  const sheet = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => enter(sheet.current, "sheet"), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        J.sheetMin = true;
        emit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  if (J.sheetMin)
    return (
      <M
        in="pill"
        className="absolute bottom-4 left-1/2 z-30 flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-3 whitespace-nowrap rounded-full bg-card py-1.5 pr-1.5 pl-4 text-sm shadow-lg ring-1 ring-amber-500/60"
      >
        <PulseDot className="bg-amber-500" />
        <span className="truncate">
          <b className="font-semibold">Waiting for you:</b> {JSTOP_INFO[id].title}
        </span>
        <Button
          type="button"
          size="sm"
          onClick={() => {
            J.sheetMin = false;
            emit();
          }}
        >
          <Icon n="up" />
          Answer
        </Button>
      </M>
    );
  const confirm = () => {
    if (id === "JG2" && choice === "pub" && checks.some((c) => !c)) {
      toast.error("Tick both statements before you publish.");
      return;
    }
    jsettle("answer", { opt: choice, note: note.trim() || undefined });
  };
  const label = choice === rec[0] ? (d.cta ?? "Confirm") : (d.opts.find((o) => o[0] === choice)?.[1] ?? "Confirm");
  return (
    <>
      <button
        type="button"
        aria-label="Hide the stop to look at the work"
        tabIndex={-1}
        className="absolute inset-0 z-20 cursor-default bg-black/25 dark:bg-black/50"
        onClick={() => {
          J.sheetMin = true;
          emit();
        }}
      />
      <div
        ref={sheet}
        role="dialog"
        aria-label={d.title}
        className="absolute inset-x-4 bottom-4 z-30 mx-auto flex max-h-[calc(100%-2rem)] max-w-[700px] flex-col overflow-hidden rounded-2xl bg-popover text-popover-foreground shadow-2xl ring-1 ring-foreground/10"
      >
        <div className="flex flex-col gap-3.5 overflow-y-auto px-5 pt-4.5 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={TONE.waiting.c}>
              <PulseDot className="bg-amber-500" />
              Your turn
            </Badge>
            <span className="text-muted-foreground text-xs">
              {gate ? `Stop ${JSTOP_NO[id]} of 2` : "Quick check"} · JFE-IRJ-v2
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="ml-auto"
              onClick={() => {
                J.sheetMin = true;
                emit();
              }}
            >
              <Icon n="down" />
              Hide to look at the work
            </Button>
          </div>
          <h3 className="text-balance font-semibold text-lg tracking-tight">{d.title}</h3>
          <div className="grid grid-cols-[auto_1fr] gap-2.5 rounded-xl bg-muted px-3 py-2.5 text-sm">
            <Icon n="info" className="mt-0.5 size-4 text-muted-foreground" />
            <p>
              <b className="font-semibold">Why JFE stopped here.</b> {d.why}
            </p>
          </div>
          {d.sum && (
            <ul className="flex flex-col gap-1.5 text-sm">
              {d.sum.map(([t, line]) => (
                <li key={line} className="flex items-start gap-2">
                  <Icon n={SUM_ICON[t][0]} className={cn("mt-1 size-3.5", SUM_ICON[t][1])} />
                  {line}
                </li>
              ))}
            </ul>
          )}
          <Advice d={d} />
          {d.checks && (
            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1.5 font-medium text-xs">Before you publish</legend>
              {d.checks.map((c, i) => (
                <label
                  key={c}
                  htmlFor={`publish-check-${i}`}
                  className="grid cursor-pointer grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition-colors hover:bg-muted/60"
                >
                  <Checkbox
                    id={`publish-check-${i}`}
                    checked={checks[i]}
                    onCheckedChange={() => setChecks(checks.map((v, k) => (k === i ? !v : v)))}
                    className="mt-0.5"
                  />
                  <span>{c}</span>
                </label>
              ))}
            </fieldset>
          )}
          <RadioGroup value={choice} onValueChange={setChoice} className="gap-2" aria-label={d.title}>
            {d.opts.map((o) => (
              <label
                key={o[0]}
                htmlFor={`jstop-${o[0]}`}
                className={cn(
                  "grid cursor-pointer grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-xl border px-3.5 py-3 transition-[background-color,border-color,box-shadow] hover:bg-muted/60",
                  choice === o[0] && "border-foreground ring-1 ring-foreground",
                )}
              >
                <RadioGroupItem id={`jstop-${o[0]}`} value={o[0]} className="row-span-2 mt-0.5" />
                <span className="flex flex-wrap items-center gap-2 font-semibold text-sm">
                  {o[1]}
                  {o[3] ? <Badge variant="secondary">Orchestrator recommends</Badge> : null}
                </span>
                <span className="flex items-start gap-1.5 text-muted-foreground text-xs">
                  <Icon n="arrow" className="mt-0.5 size-3" />
                  {o[2]}
                </span>
              </label>
            ))}
          </RadioGroup>
          <Input
            id="jfe-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional: a note for the agents, kept with your decision"
            aria-label="Note for the agents"
          />
        </div>
        <div className="flex items-center gap-3 border-t bg-popover px-5 py-3.5">
          <span className="flex-1 text-muted-foreground text-xs">Nothing runs until you confirm.</span>
          <Button type="button" data-confirm onClick={confirm}>
            {label}
          </Button>
        </div>
      </div>
    </>
  );
}

/* ---------- before the profile run starts ---------- */
function JNotStarted() {
  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <header className="flex flex-col gap-1 border-b pb-3.5">
        <h2 className="text-balance font-semibold text-lg tracking-tight">JFE-IRJ-v2 is built when it is needed</h2>
        <p className="max-w-[68ch] text-muted-foreground text-sm">
          The manuscript run reads the journal’s profile at its journal step, S08. When ASW-0412 gets there, this run
          starts, the view moves here to follow it, and goes back to the journal step once the profile is published.
        </p>
      </header>
      <ol className="divide-y overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
        {JSTAGES.map((sd) => (
          <li key={sd.id} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3 px-4 py-3 text-sm">
            <span className="pt-px font-mono text-muted-foreground text-xs">{sd.id}</span>
            <span className="min-w-0">
              <b className="block font-medium">{sd.title}</b>
              <span className="text-muted-foreground text-xs">{sd.steps.length} steps</span>
            </span>
          </li>
        ))}
      </ol>
      <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setTrack("asw")}>
        Open the manuscript
        <Icon n="arrow" />
      </Button>
    </div>
  );
}

/* ---------- a screen of the profile run ---------- */
export function JScreen({ k }: { k: string }) {
  const scr = JSCREENS.find((s) => s.key === k);
  if (k === "profile" || !scr) return <ProfileView />;
  const live = k === J.live && !J.view && !J.done;
  const Scene = JSCENES[k];
  const notes = J.decisions.filter((d) => scr.stages.includes(d.stage));
  return (
    <div className="flex flex-col gap-5">
      <JStageHeader scr={scr} />
      <Scene key={k} live={live} />
      {notes.map((n) => (
        <SceneNote
          key={n.seq}
          actor={n.actor}
          text={n.auto ? `${n.text.replace(/\.$/, "")} (skipped ahead)` : n.text}
          note={n.note}
        />
      ))}
    </div>
  );
}
export function JBody({ asideOpen = true }: { asideOpen?: boolean }) {
  const k = J.done && !J.view ? "profile" : jViewKey();
  const viewingOther = J.view && J.view !== J.live && !J.done;
  return (
    <div className={cn("grid min-h-0 flex-1", asideOpen && "lg:grid-cols-[minmax(0,1fr)_352px]")}>
      <div className="relative flex min-h-0 min-w-0 flex-col">
        <JStageTrack />
        {J.failed && (
          <Bar
            icon="ban"
            tone="rose"
            title="The profile run stopped"
            text={J.failure}
            meta="ASW-0412 is told at S08 and writes with the publisher’s rules only."
          >
            <Button type="button" variant="outline" size="sm" onClick={() => playScenario("happy", false)}>
              Back to the happy path
            </Button>
          </Bar>
        )}
        <div className="flex items-center gap-3 border-b px-4 py-2.5 lg:hidden">
          <div className="min-w-0 flex-1">
            <JNowCard compact={true} />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              UI.detailsOpen = true;
              emit();
            }}
          >
            <Icon n="panel" />
            Details
          </Button>
        </div>
        <div
          id="asw-scroller"
          className="min-h-0 flex-1 overflow-y-auto"
          onWheel={() => {
            UI.userScrollAt = performance.now();
          }}
          onTouchMove={() => {
            UI.userScrollAt = performance.now();
          }}
        >
          <div className="px-4 pt-5 pb-56 md:px-8">{J.started ? <JScreen key={k} k={k} /> : <JNotStarted />}</div>
        </div>
        {viewingOther && !J.gate && (
          <M
            in="pill"
            className="absolute bottom-4 left-1/2 z-10 flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-3 whitespace-nowrap rounded-full bg-card py-1.5 pr-1.5 pl-4 text-sm shadow-lg ring-1 ring-foreground/10"
          >
            <span className="truncate text-muted-foreground">
              Viewing{" "}
              <b className="font-semibold text-foreground">
                {JSCREENS.find((s) => s.key === J.view)?.short ?? "Profile"}
              </b>
            </span>
            <Button type="button" size="sm" onClick={() => jSetView(J.live)}>
              <PulseDot className="bg-sky-400" />
              Back to live
            </Button>
          </M>
        )}
        {J.lifecycle === "blocked" && (
          <M
            in="pill"
            className="absolute bottom-4 left-1/2 z-30 flex w-[min(640px,calc(100%-2rem))] -translate-x-1/2 flex-wrap items-center gap-2.5 rounded-2xl bg-card py-2.5 pr-2.5 pl-4 text-sm shadow-lg ring-1 ring-rose-500/50"
          >
            <PulseDot className="bg-rose-500" pulse={false} />
            <span className="min-w-40 flex-1">{J.blocked?.why}</span>
            <Button type="button" size="sm" onClick={() => jsettle("resume")}>
              {J.blocked?.button}
            </Button>
          </M>
        )}
        {J.gate && <JGateSheet key={J.gate.id + J.seq} id={J.gate.id} />}
      </div>
      {asideOpen && (
        <aside className="min-h-0 border-l bg-sidebar max-lg:hidden">
          <JAside />
        </aside>
      )}
    </div>
  );
}
