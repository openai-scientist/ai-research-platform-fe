"use client";
"use no memo";

// The writing run keeps its state in module variables (engine.ts) and re-renders on emit(); the React Compiler
// would memoise these components on their props and never show a change.

import { type ComponentType, type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";

import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { Caret, PulseDot } from "../run-bits";
import {
  AgentsSheet,
  ContractView,
  openSheet,
  RecoveryBar,
  ScenarioSheet,
  ScenarioStrip,
  ScreenIncidents,
  ScreenTabs,
} from "./cases-ui";
import { SCN } from "./data/cases";
import {
  ASW_RULES,
  BLOCKS,
  blockOfStage,
  CLAIMS,
  type ClaimDef,
  DEC,
  type DecOption,
  LINEAGE,
  ONE,
  REVIEW_MODES,
  STAGES,
  STOP_STAGE,
} from "./data/core";
import { INC } from "./data/incidents";
import {
  AGENTS,
  BLOCK_TEAM,
  isCode,
  isGate,
  ROSTER_COUNT,
  SCREENS,
  type ScreenDef,
  STAGE,
  STAGE_IDX,
  STOP_INFO,
  STOP_NO,
  screenIndex,
  screenOfStage,
  stageRange,
} from "./data/meta";
import {
  emit,
  HOST,
  J,
  jPublishNow,
  jrestart,
  jsettle,
  playScenario,
  restart,
  S,
  scrollTop,
  setPaused,
  setTrack,
  settle,
  TRACK,
  UI,
  useWritingRun,
} from "./engine";
import { JAside, JBody, jSetView, RunSwitch, runTone } from "./jfe-shell";
import { AgentAvatar, Bump, cn, DEV, enter, Icon, M, pad2, quiet, SceneNote, WorkOrb } from "./lib";
import {
  EvidenceScene,
  HandoffScene,
  JournalScene,
  LABEL_TXT,
  MapScene,
  StatementsScene,
  ToulminScene,
} from "./scenes-gather";
import { DataReportScene, DebateScene } from "./scenes-report-debate";
import { BlueprintScene, FinalPaper, ReviewScene, SignoffScene, WriteScene } from "./scenes-write";
import { Advice, SUM_ICON, TONE } from "./shared";

import "./writing.css";

/* ===== the writing run's studio: its toolbar, stage track, stage header, aside and stops (as run-workspace) ===== */
const ORB_OF_STAGE: Record<string, string> = {
  S00: "connecting",
  S01: "searching",
  S02: "searching",
  S03: "connecting",
  S04: "solving",
  S05: "solving",
  S06: "weaving",
  S07: "searching",
  S08: "shaping",
  S09: "shaping",
  S10: "composing",
  S11: "composing",
  S12: "searching",
  S13: "shaping",
  S14: "solving",
  S15: "composing",
  S16: "shaping",
};

/* ---------- view switching ---------- */
export function setView(key: string) {
  quiet();
  S.view = key === S.live && !S.done ? null : key;
  if (key === S.live) S.view = null;
  emit();
  scrollTop();
}
const viewKey = () => S.view ?? S.live;

/* ---------- the toolbar under the research run's track ---------- */
function Toolbar() {
  const tone = runTone(TRACK);
  const life =
    TRACK === "jfe"
      ? J.failed
        ? "failed"
        : J.done
          ? "done"
          : J.started
            ? J.lifecycle
            : "idle"
      : S.done
        ? "done"
        : S.lifecycle;
  const moving = life === "running" || life === "waiting";
  const ended = TRACK === "asw" && (S.done || S.lifecycle === "failed");
  const scn = SCN[S.scn];
  return (
    <div className="flex min-h-12 flex-wrap items-center gap-x-2.5 gap-y-1.5 border-b px-3 py-2 md:flex-nowrap md:pr-4">
      <RunSwitch />
      <Badge className={cn("shrink-0", tone.c)}>
        <PulseDot className={tone.dot} pulse={moving && !S.paused} />
        <span className="max-sm:hidden md:max-lg:hidden">{tone.label}</span>
      </Badge>
      <span
        title="Experiments are not run yet, so the writing stage works from an example research record (RUN-25CD)."
        className="inline-flex h-6 shrink-0 cursor-help items-center gap-1.5 whitespace-nowrap rounded-full border border-dashed px-2.5 text-muted-foreground text-xs max-xl:hidden"
      >
        <Icon n="info" className="size-3" />
        <span className="2xl:hidden">Preview</span>
        <span className="max-2xl:hidden">Preview · example record</span>
      </span>
      <div className="ml-auto flex min-w-0 items-center gap-2 max-sm:gap-1.5 max-md:w-full max-md:justify-between">
        {DEV && (
          <Button
            type="button"
            onClick={() => openSheet("scn")}
            title="Development only: play the happy path or one unhappy case"
            variant="outline"
            size="sm"
            className={cn(
              "min-w-0 max-w-[220px] shrink max-sm:max-w-[150px]",
              S.scn !== "happy" && "border-amber-500/60 bg-amber-500/8",
            )}
          >
            <Icon n={S.scn === "happy" ? "check" : "alert"} />
            <span className="truncate">{S.scn === "happy" ? "Happy path" : `${scn.code} · ${scn.t}`}</span>
            <Icon n="down" className="opacity-60" />
          </Button>
        )}
        <Button
          type="button"
          onClick={() => openSheet("team")}
          title="Who works here, and how the debate works"
          variant="ghost"
          size="sm"
        >
          <Icon n="users" />
          <span className="max-lg:hidden">{ROSTER_COUNT} agents</span>
        </Button>
        <span className="flex items-center gap-1.5 whitespace-nowrap text-muted-foreground text-xs max-xl:hidden">
          <label htmlFor="asw-review-mode">Review mode</label>
          <NativeSelect
            id="asw-review-mode"
            size="sm"
            className="text-foreground"
            value={S.mode}
            onChange={(e) => {
              S.mode = e.target.value;
              emit();
            }}
          >
            {Object.entries(REVIEW_MODES).map(([k, m]) => (
              <NativeSelectOption key={k} value={k}>
                {m.n}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </span>
        <span className="flex items-center gap-2 whitespace-nowrap text-xs max-lg:hidden">
          <Switch
            id="asw-pause-each"
            checked={S.pauseEach}
            onCheckedChange={(v) => {
              S.pauseEach = v;
              if (!v && S.holding) settle("continue");
              if (!v && J.holding) jsettle("continue");
              emit();
            }}
          />
          <label htmlFor="asw-pause-each" className="cursor-pointer">
            Pause each step
          </label>
        </span>
        <Button
          type="button"
          disabled={ended || Boolean(S.gate)}
          title="Pause or resume (Space)"
          variant="outline"
          size="sm"
          onClick={() => setPaused(!S.paused)}
        >
          <Icon n={S.paused ? "play" : "pause"} />
          <span className="max-sm:hidden">{S.paused ? "Resume" : "Pause"}</span>
        </Button>
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
          aria-label="Speed"
        >
          {[1, 2, 4].map((v) => (
            <ToggleGroupItem key={v} value={String(v)} className="h-7 px-2 font-mono text-[11px]">
              {v}×
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Button
          type="button"
          aria-label={TRACK === "jfe" ? "Start the profile run over" : "Start the manuscript run over"}
          variant="ghost"
          size="icon-sm"
          title="Start over"
          onClick={TRACK === "jfe" ? jrestart : restart}
        >
          <Icon n="rotate" />
        </Button>
      </div>
    </div>
  );
}

/* ---------- stage track: a bar per screen, a flag where the run stops for you ---------- */
function screenProgress(scr: ScreenDef) {
  let total = 0;
  let done = 0;
  for (const id of scr.stages) {
    total += STAGE[id].steps.length;
    done += S.st[id].done.length;
  }
  return { total, done };
}
function StageTrack() {
  const liveIdx = screenIndex(S.live);
  const items: ScreenDef[] = [...SCREENS, { key: "paper", short: "Paper", title: "The paper", stages: [], block: 3 }];
  const box = useRef<HTMLDivElement>(null);
  const viewing = viewKey();
  useEffect(() => {
    const el = box.current?.querySelector(`[data-track="${viewing}"]`);
    el?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [viewing]);
  const failed = S.lifecycle === "failed";
  return (
    <div ref={box} className="overflow-x-auto overflow-y-hidden border-b px-4 pt-2.5 pb-3.5 md:px-5">
      <div style={{ minWidth: `${items.length * 92}px` }}>
        <div className="mb-1.5 flex gap-1.5 font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
          {BLOCKS.map((b, i) => {
            const n = items.filter((s) => s.block === i).length;
            return (
              <span key={b.k} className="flex items-center gap-2" style={{ flex: `${n} 1 0` }}>
                {b.n}
                <i className="h-px flex-1 bg-border" />
              </span>
            );
          })}
        </div>
        <ol className="flex gap-1.5">
          {items.map((it, i) => {
            const isPaper = it.key === "paper";
            const { total, done } = isPaper ? { total: 1, done: S.done ? 1 : 0 } : screenProgress(it);
            const isPast = isPaper
              ? S.done
              : it.stages.every((s) => S.st[s].status === "done") &&
                !(i === liveIdx && (S.gate ?? S.lifecycle === "blocked"));
            const isLive = !isPaper && i === liveIdx && !S.done;
            const fill = isPast ? 100 : isLive ? Math.max(4, (done / total) * 100) : 0;
            const waiting = isLive && Boolean(S.gate);
            const blocked = isLive && (S.lifecycle === "blocked" || failed);
            const available = isPaper ? S.done : i <= S.reached;
            const isViewed = viewing === it.key;
            const round = isPaper ? 1 : Math.max(...it.stages.map((s) => S.st[s].round));
            const later = failed && i > liveIdx;
            return (
              <li key={it.key} data-track={it.key} className="relative min-w-0 flex-1 basis-0">
                <button
                  type="button"
                  disabled={!available}
                  onClick={() => setView(it.key)}
                  className="flex w-full flex-col gap-1.5 rounded py-0.5 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default"
                >
                  <span
                    className={cn(
                      "flex items-center gap-1.5 truncate pr-3 font-medium text-xs transition-colors",
                      isPast || isLive || isViewed ? "text-foreground" : "text-muted-foreground",
                      isViewed && "font-semibold",
                      later && "text-muted-foreground/50",
                    )}
                  >
                    {round > 1 && (
                      <Badge variant="secondary" className="font-mono">
                        R{round}
                      </Badge>
                    )}
                    {isPaper && <Icon n="circleCheck" className="size-3" />}
                    {it.short}
                  </span>
                  <span
                    className={cn(
                      "relative h-1 overflow-hidden rounded-full",
                      later ? "border-foreground/15 border-t-2 border-dashed bg-transparent" : "bg-muted",
                    )}
                  >
                    <i
                      className={cn(
                        "absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
                        blocked ? "bg-rose-500" : waiting ? "bg-amber-500" : isLive ? "bg-sky-500" : "bg-foreground",
                      )}
                      style={{ width: `${fill}%` }}
                    />
                    {isLive && !waiting && !blocked && !S.paused && (
                      <i className="sweep absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-sky-500/40 to-transparent" />
                    )}
                  </span>
                </button>
                {(it.gate || it.check) && (
                  <span
                    title={it.gate ? `Stop ${STOP_NO[it.gate]} for you` : "A quick check for you"}
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
function Lineage({ scr }: { scr: ScreenDef }) {
  const reads = [...new Set(scr.stages.flatMap((id) => LINEAGE[id].reads))];
  const writes = scr.stages.flatMap((id) => LINEAGE[id].writes.map(([name, step]) => ({ sid: id, name, step })));
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs">
      <span className="text-muted-foreground">Builds on</span>
      {reads.map((r) => (
        <span key={r} className="inline-flex h-6 items-center rounded-md bg-muted px-2 text-foreground/80">
          {r}
        </span>
      ))}
      <Icon n="arrow" className="size-3.5 text-muted-foreground" />
      <span className="text-muted-foreground">Writes</span>
      {writes.map(({ sid, name, step }) => {
        const st = S.st[sid];
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
                aria-hidden
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
  );
}
function StagePill({
  failed,
  blocked,
  waiting,
  done,
}: {
  failed: boolean;
  blocked: boolean;
  waiting: boolean;
  done: boolean;
}) {
  if (failed) return <Badge className="bg-rose-500/12 text-rose-700 dark:text-rose-300">Stopped here</Badge>;
  if (blocked)
    return (
      <Badge className="bg-rose-500/12 text-rose-700 dark:text-rose-300">
        <PulseDot className="bg-rose-500" />
        Needs you
      </Badge>
    );
  if (waiting)
    return (
      <Badge className="bg-amber-500/15 text-amber-800 dark:text-amber-300">
        <PulseDot className="bg-amber-500" />
        Your turn
      </Badge>
    );
  if (done)
    return (
      <M
        as="span"
        in="pop"
        className="inline-flex h-6 items-center gap-1.5 rounded-full bg-emerald-500/12 px-2.5 font-medium text-emerald-700 text-xs dark:text-emerald-300"
      >
        <Icon n="check" className="size-3" />
        Done
      </M>
    );
  return (
    <Badge className="bg-sky-500/12 text-sky-700 dark:text-sky-300">
      <PulseDot className="bg-sky-500" pulse={!S.paused} />
      {S.paused ? "Paused" : "In progress"}
    </Badge>
  );
}
function StageHeader({ scr }: { scr: ScreenDef }) {
  const idx = screenIndex(scr.key);
  const sts = scr.stages.map((id) => S.st[id]);
  const waiting = Boolean(S.gate && scr.stages.includes(STOP_STAGE[S.gate.id]));
  const done = sts.every((s) => s.status === "done") && !waiting;
  const failed = sts.some((s) => s.status === "failed");
  const runningSid =
    scr.stages.find((id) => S.st[id].status === "running" || S.st[id].status === "failed") ??
    scr.stages[scr.stages.length - 1];
  const blocked = S.lifecycle === "blocked" && scr.key === S.live;
  const round = Math.max(...sts.map((s) => s.round));
  const cast = [...new Set(scr.stages.flatMap((id) => STAGE[id].steps.flatMap((s) => (s.a ? [s.a] : []))))];
  return (
    <header className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3.5 gap-y-2 border-b pb-3.5 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
      <span className="pt-1 font-mono text-muted-foreground text-xs">
        {pad2(idx + 1)}/{pad2(SCREENS.length)}
      </span>
      <div className="min-w-0">
        <h2 className="flex flex-wrap items-center gap-2 text-balance font-semibold text-lg tracking-tight">
          {scr.title}
          <Badge
            title="Writing stages this screen covers"
            variant="outline"
            className="font-mono text-muted-foreground"
          >
            {stageRange(scr)}
          </Badge>
          {round > 1 && (
            <Badge variant="secondary" className="font-mono">
              Round {round} · argued again
            </Badge>
          )}
        </h2>
        <p className="mt-1 max-w-[68ch] text-muted-foreground text-sm">{STAGE[runningSid].lead}</p>
        <Lineage scr={scr} />
        {sts.map(
          (s, i) =>
            s.status === "done" &&
            s.summary && (
              <M as="p" key={scr.stages[i]} in="up4" className="mt-2 flex items-center gap-2 font-medium text-sm">
                <Icon n="circleCheck" className="size-3.5 text-emerald-600" />
                <span className="font-mono font-normal text-[11px] text-muted-foreground">{scr.stages[i]}</span>
                {s.summary}
              </M>
            ),
        )}
      </div>
      <div className="col-start-2 flex items-center gap-3 sm:col-start-3 sm:pt-0.5">
        <div className="flex pl-2">
          {cast.slice(0, 6).map((a) => (
            <span key={a} className="-ml-2 rounded-full bg-background p-0.5">
              <AgentAvatar a={a} />
            </span>
          ))}
        </div>
        <StagePill failed={failed} blocked={blocked} waiting={waiting} done={done} />
      </div>
    </header>
  );
}

/* ---------- the aside ---------- */
const teamActor = (a: string) => (a === "mw" || a === "rw" || a === "dw" ? "sw" : a);
function Team() {
  const active =
    S.done || S.gate || S.lifecycle === "blocked" || S.lifecycle === "failed" ? null : (S.msg?.actor ?? null);
  const block = Math.max(0, blockOfStage(S.stage));
  const team = BLOCK_TEAM[block];
  const shown = active && !team.includes(teamActor(active)) && !isCode(active) ? [...team, active] : team;
  return (
    <div data-aside-team className="flex items-center gap-2 border-b px-3 py-3">
      <div className="flex min-w-0 flex-1 items-center">
        {shown.map((role) => {
          const on = role === active || (role === "sw" && active != null && ["mw", "rw", "dw"].includes(active));
          const who = role === "sw" && on && active ? active : role;
          const g = AGENTS[who];
          return (
            <span
              key={role}
              className={cn(
                "inline-flex shrink-0 items-center rounded-full transition-all duration-300",
                on ? cn(g.soft.split(" ")[0], "mx-1 min-w-0 shrink gap-1.5 p-0.5 pr-2") : "-ml-1 first:ml-0",
              )}
            >
              <span className="relative">
                <AgentAvatar
                  a={who}
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
        {active && isCode(active) && (
          <span className="mx-1 inline-flex min-w-0 items-center gap-1.5 rounded-full bg-muted p-0.5 pr-2">
            <AgentAvatar a="code" size="sm" className="size-6" />
            <span className="truncate font-semibold text-muted-foreground text-xs">Code check</span>
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={() => openSheet("team")}
        title="All agents"
        className="shrink-0 rounded-md px-1.5 py-1 font-mono text-[10.5px] text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        {BLOCKS[block].n} · {team.length}/{ROSTER_COUNT}
      </button>
    </div>
  );
}
export function NowCard({ compact }: { compact?: boolean }) {
  if (S.done)
    return (
      <div className="flex flex-col gap-2 rounded-xl bg-card p-3.5 ring-1 ring-foreground/10">
        <span className="text-muted-foreground text-xs">Finished</span>
        <h3 className="font-semibold text-[15px]">Signed and submission-ready</h3>
        {!compact && (
          <p className="text-muted-foreground text-sm">
            Open <b className="font-medium text-foreground">Paper</b> in the track to read it. Use the stages to look
            back at any part of the writing run.
          </p>
        )}
      </div>
    );
  if (S.lifecycle === "failed")
    return (
      <div className="flex flex-col gap-2 rounded-xl bg-card p-3.5 ring-1 ring-rose-500/40">
        <span className="text-rose-700 text-xs dark:text-rose-300">Stopped</span>
        <h3 className="font-semibold text-[15px]">The writing run stopped at {S.stage}</h3>
        {!compact && <p className="text-muted-foreground text-sm">{S.failure}</p>}
      </div>
    );
  if (S.inc) {
    const d = INC[S.inc.key];
    return (
      <div
        className={cn(
          "flex flex-col gap-2 rounded-xl bg-card p-3.5 ring-1",
          d.tone === "rose" ? "ring-rose-500/40" : "ring-amber-500/50",
        )}
      >
        <span
          className={cn(
            "text-xs",
            d.tone === "rose" ? "text-rose-700 dark:text-rose-300" : "text-amber-800 dark:text-amber-300",
          )}
        >
          Unhappy case · {SCN[S.inc.key]?.code} · {S.inc.sid}
        </span>
        <h3 className="font-semibold text-[15px]">{d.title}</h3>
        {!compact && (
          <p className="text-muted-foreground text-sm">{d.text} Choose a way out in the bar above the stage.</p>
        )}
      </div>
    );
  }
  if (S.lifecycle === "blocked")
    return (
      <div className="flex flex-col gap-2 rounded-xl bg-card p-3.5 ring-1 ring-amber-500/40">
        <span className="text-amber-800 text-xs dark:text-amber-300">Held</span>
        <p className="text-sm">{S.blocked?.why}</p>
        <Button type="button" size="sm" className="w-fit" onClick={() => settle("resume")}>
          {S.blocked?.button}
          <Icon n="arrow" />
        </Button>
      </div>
    );
  const sid = S.stage;
  const st = S.st[sid];
  const steps = STAGE[sid].steps;
  const step = steps.find((s) => s.id === st.cur);
  const index = step ? steps.indexOf(step) : -1;
  const speaker = S.msg?.actor;
  const moving = (S.lifecycle === "running" || S.lifecycle === "waiting") && !S.paused;
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-card p-3.5 shadow-xs ring-1 ring-foreground/10">
      <div className="flex justify-between gap-2 text-muted-foreground text-xs">
        <b className="truncate font-medium text-foreground">
          <span className="font-mono font-normal text-muted-foreground">{sid}</span> · {STAGE[sid].name}
          {st.round > 1 ? ` · Round ${st.round}` : ""}
        </b>
        <span className="whitespace-nowrap">
          {S.paused ? "Paused" : step ? `Step ${index + 1} of ${steps.length}` : `${steps.length} steps`}
        </span>
      </div>
      <div className={cn("grid items-start gap-x-3", moving && "grid-cols-[auto_minmax(0,1fr)]")}>
        {moving && (
          <WorkOrb
            state={S.gate || S.jr.waiting ? "listening" : ORB_OF_STAGE[sid]}
            size={compact ? 20 : 32}
            className="mt-0.5"
          />
        )}
        <div className="min-w-0">
          <M
            as="h3"
            key={st.cur ?? sid}
            in="up4"
            dur={220}
            // On a phone the card sits above the stage: one line, so a longer step name never moves the page.
            className={cn("font-semibold text-[15px] tracking-tight", compact && "truncate")}
          >
            {S.jr.waiting ? "Waiting for the journal profile" : (step?.t ?? STAGE[sid].title)}
          </M>
          {!compact && (
            <p className="mt-1 min-h-5 text-sm leading-relaxed">
              {S.msg ? (
                <>
                  {S.msg.text}
                  {!S.msg.done && <Caret />}
                </>
              ) : (
                <span className="text-muted-foreground">{ONE[sid]}</span>
              )}
            </p>
          )}
          {speaker && !compact && (
            <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-muted-foreground">
              <span className={cn("size-1.5 rounded-full", AGENTS[speaker].solid)} />
              <span className={cn("font-medium", AGENTS[speaker].text)}>
                {isCode(speaker) ? "Code check · no AI" : AGENTS[speaker].name}
              </span>
            </p>
          )}
        </div>
      </div>
      {S.paused && (
        <M in="up4" className="flex flex-col gap-2 rounded-lg bg-muted px-3 py-2.5 text-xs">
          <span>Paused. Nothing moves until you resume.</span>
          <Button type="button" size="sm" className="w-fit" onClick={() => setPaused(false)}>
            Resume
            <Icon n="play" />
          </Button>
        </M>
      )}
      {S.holding && (
        <M in="up4" className="flex flex-col gap-2 rounded-lg bg-muted px-3 py-2.5 text-xs">
          <span>
            Step done. Paused because <b>Pause each step</b> is on.
          </span>
          <Button type="button" size="sm" className="w-fit" onClick={() => settle("continue")}>
            Continue
            <Icon n="play" />
          </Button>
        </M>
      )}
    </div>
  );
}
function stepNote(s: { id: string; a?: string; gate?: boolean; check?: boolean }, broke: boolean, skipped: boolean) {
  if (broke) return "Stopped here · needs you";
  if (s.gate) return `Stop ${STOP_NO[s.id]} · you decide, the run waits`;
  if (s.check) return skipped ? "Quick check · taken on the recommendation" : "Quick check · you decide";
  if (!s.a || isCode(s.a)) return "Code check · no AI";
  return AGENTS[s.a].name;
}
function Steps() {
  if (S.done) return null;
  const sid = S.stage;
  const st = S.st[sid];
  const steps = STAGE[sid].steps;
  /* where the run stands still: the current step, or the next one if the current one has finished */
  const stuck = S.lifecycle === "blocked" || Boolean(S.inc);
  const curIdx = steps.findIndex((s) => s.id === st.cur);
  const brokeAt = !stuck
    ? -1
    : curIdx >= 0 && st.cur && !st.done.includes(st.cur)
      ? curIdx
      : steps.findIndex((s, i) => i > curIdx && !st.done.includes(s.id));
  return (
    <div className="flex flex-col gap-2">
      <p className="flex justify-between font-medium text-muted-foreground text-xs">
        <span>Steps in this stage</span>
        <span>
          Stage {STAGE_IDX[sid] + 1} of {STAGES.length}
        </span>
      </p>
      <ol className="flex flex-col">
        {steps.map((s, i) => {
          const stop = s.gate || s.check;
          const done = st.done.includes(s.id);
          const broke = i === brokeAt;
          const now = (st.cur === s.id && S.lifecycle !== "failed" && !stuck) || broke;
          const asking = now && Boolean(stop && S.gate);
          const skipped = Boolean(s.check && S.mode === "gates" && !done);
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
                  now && !asking && !broke && "border-2 border-sky-500",
                  broke && "border-2 border-rose-500",
                  stop && !done && !now && "border-amber-500 text-amber-600",
                  asking && "border-amber-500 bg-amber-500 text-white",
                )}
              >
                {done && <Icon n="check" className="size-2.5" sw={3.5} />}
                {!done && stop && (!now || asking) && <Icon n="flag" className="size-2.5" />}
                {now && !asking && !broke && <span className="beat size-1.5 rounded-full bg-sky-500" />}
                {broke && <span className="size-1.5 rounded-full bg-rose-500" />}
              </span>
              <span className="min-w-0">
                <b
                  className={cn("block font-medium text-[13px]", !done && !now && "font-normal text-muted-foreground")}
                >
                  {s.t}
                </b>
                <small
                  className={cn(
                    "text-[11.5px]",
                    broke
                      ? "text-rose-700 dark:text-rose-300"
                      : stop
                        ? "text-amber-700 dark:text-amber-300"
                        : "text-muted-foreground",
                  )}
                >
                  {stepNote(s, broke, skipped)}
                </small>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
function nextStop() {
  const start = STAGE_IDX[S.stage];
  let away = 0;
  for (let i = start; i < STAGES.length; i++) {
    const st = S.st[STAGES[i].id];
    for (const s of STAGES[i].steps) {
      if (st.done.includes(s.id) || (i === start && st.cur === s.id)) continue;
      away += 1;
      if (s.gate || (s.check && S.mode === "copilot"))
        return { id: s.id, away: i === start ? away : null, stage: STAGES[i] };
    }
  }
  return null;
}
function NextStop() {
  if (S.done || S.lifecycle === "blocked" || S.lifecycle === "failed") return null;
  if (S.gate)
    return (
      <div className="grid grid-cols-[auto_1fr] gap-2.5 rounded-xl border border-amber-500/50 bg-amber-500/10 p-3 text-xs">
        <span className="grid size-7 place-items-center rounded-lg bg-amber-500/20 text-amber-800 dark:text-amber-300">
          <Icon n="flag" className="size-3.5" />
        </span>
        <span>
          <b className="block font-semibold text-[13px]">Waiting for you now</b>
          <span className="text-muted-foreground">{STOP_INFO[S.gate.id].title}. Nothing runs until you answer.</span>
        </span>
      </div>
    );
  const n = nextStop();
  const when = n
    ? n.away === null
      ? `In ${screenOfStage(n.stage.id)?.short}`
      : n.away <= 1
        ? "Right after this step"
        : `In ${n.away} steps, in this stage`
    : "";
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
          {n ? `Next stop for you: ${STOP_INFO[n.id].title.toLowerCase()}` : "No more stops"}
        </b>
        <span className="text-muted-foreground">
          {n ? `${when}. Until then the agents work on their own.` : "The run finishes on its own."}
        </span>
      </span>
    </div>
  );
}
function Rules() {
  const [open, setOpen] = useState(false);
  const checked = Object.keys(S.rules).length;
  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left font-medium text-xs outline-none"
      >
        <Icon n="right" className={cn("size-3.5 text-muted-foreground transition-transform", open && "rotate-90")} />
        Rules ASW never bends
        <span className="ml-auto font-mono text-[11px] text-muted-foreground">
          {checked} of {ASW_RULES.length} checked
        </span>
      </button>
      {open && (
        <ul className="flex flex-col gap-1.5 px-3 pb-3 text-xs">
          {ASW_RULES.map(([r, why], i) => {
            const s = S.rules[i];
            return (
              <li
                key={r}
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
function Activity() {
  const end = useRef<HTMLLIElement>(null);
  const count = S.feed.length;
  useEffect(() => {
    void count;
    end.current?.scrollIntoView({ block: "nearest" });
  }, [count]);
  if (!S.feed.length) return <p className="text-muted-foreground text-xs">Nothing yet.</p>;
  return (
    <ol className="flex flex-col gap-3">
      {S.feed.map((it) => {
        const you = it.actor === "you";
        const who = teamActor(it.actor);
        return (
          <M as="li" key={it.seq} in="up6" className="grid grid-cols-[auto_1fr] gap-2.5 text-xs">
            {you ? (
              <span className="grid size-5 place-items-center rounded-full bg-amber-500/20 font-semibold text-[8.5px] text-amber-800 dark:text-amber-300">
                You
              </span>
            ) : (
              <AgentAvatar a={who} size="sm" />
            )}
            <div className={cn(it.kind === "event" && "text-muted-foreground")}>
              <b className={cn("font-semibold", you ? "text-amber-800 dark:text-amber-300" : AGENTS[who].text)}>
                {you ? "You" : isCode(it.actor) ? "Code check" : AGENTS[who].name}
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
function Aside() {
  const [tab, setTab] = useState("now");
  return (
    <div className="flex h-full min-h-0 flex-col">
      <Team />
      <Tabs value={tab} onValueChange={setTab} className="min-h-0 flex-1 gap-0">
        <TabsList variant="line" className="w-full justify-start border-b px-3">
          <TabsTrigger value="now" className="flex-none">
            Now
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex-none">
            Activity
            <Bump
              k={S.feed.length}
              className="rounded-full bg-muted px-1.5 font-mono font-semibold text-[10.5px] text-muted-foreground"
            >
              {S.feed.length}
            </Bump>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="now" className="min-h-0 overflow-y-auto">
          <div className="flex flex-col gap-3.5 p-3.5">
            <NowCard />
            <Steps />
            <NextStop />
            <Rules />
          </div>
        </TabsContent>
        <TabsContent value="activity" className="min-h-0 overflow-y-auto p-3.5">
          <Activity />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------- the review stop ---------- */
/** What a claim reads like at stop 2, after the debate and ASPIC+. */
const claimAtG1 = (c: ClaimDef) => (c.k === "C" ? (S.c.restated ? c.t3 : S.tou.narrowed ? c.t2 : c.t) : c.t);
function minimizeStop() {
  S.sheetMin = true;
  emit();
}
/* ASPIC+ labels as badges, and why a wording is off the table */
const LABEL_BADGE: Record<string, string> = {
  IN: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  OUT: "bg-rose-500/12 text-rose-700 dark:text-rose-300",
  UND: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
};
const CONCEDED = "Conceded at T30: the test could miss gains below about 0.06";
const ABOVE_CEILING = "Above the claim ceiling from the data report";

function GateSheet({ id }: { id: string }) {
  const d = DEC[id];
  const gate = isGate(id);
  const rec = d.opts.find((o) => o[3]) ?? d.opts[0];
  const [choice, setChoice] = useState(rec[0]);
  const [note, setNote] = useState("");
  const [own, setOwn] = useState(false);
  const [picks, setPicks] = useState(["F1", "F2", "F3", "C"]);
  const [words, setWords] = useState<Record<string, string>>(
    S.ceil.expl ? { ...S.g2, f1: "suggest", f2: "suggest" } : { ...S.g2 },
  );
  const [checks, setChecks] = useState([false, false]);
  const sheet = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => enter(sheet.current, "sheet"), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") minimizeStop();
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
          <b className="font-semibold">Waiting for you:</b> {STOP_INFO[id].title}
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
  const disabled = (o: DecOption) => o[0] === "back" && id === "G1" && S.retries.G1 >= 3;
  const confirm = () => {
    const opt = d.opts.find((o) => o[0] === choice);
    if (!opt || disabled(opt)) return;
    if (id === "G0" && choice === "go" && !own) {
      toast.error("Confirm that you own this research before writing starts.");
      return;
    }
    if (id === "G1" && choice === "lock" && picks.length < 4) {
      toast.error("Tick every claim to lock them, or send the unticked ones back.");
      return;
    }
    if (id === "G3" && choice === "sign" && checks.some((c) => !c)) {
      toast.error("Tick both statements before you sign.");
      return;
    }
    if (id === "G1" && choice === "lock") S.picked = picks;
    settle("answer", { opt: choice, note: note.trim() || undefined, picks, words });
  };
  const label =
    id === "G1" && choice === "lock"
      ? `Lock ${picks.length} claims`
      : choice === rec[0]
        ? (d.cta ?? "Confirm")
        : (d.opts.find((o) => o[0] === choice)?.[1] ?? "Confirm");
  const g3first =
    S.rev.choice === "e"
      ? "I accept that students who stopped attending stay a stated limitation in 5.2"
      : S.fix.reverted
        ? "I accept that 4.1 is reverted and comment 1 stays open"
        : d.checks?.[0];
  return (
    <>
      <button
        type="button"
        aria-label="Hide the stop to look at the work"
        tabIndex={-1}
        className="absolute inset-0 z-20 cursor-default bg-black/25 dark:bg-black/50"
        onClick={minimizeStop}
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
              {gate ? `Stop ${STOP_NO[id]} of 4` : "Quick check"} · {STOP_STAGE[id]} · {REVIEW_MODES[S.mode].n} mode
            </span>
            <Button type="button" variant="ghost" size="sm" className="ml-auto" onClick={minimizeStop}>
              <Icon n="down" />
              Hide to look at the work
            </Button>
          </div>
          <h3 className="text-balance font-semibold text-lg tracking-tight">{d.title}</h3>
          <div className="grid grid-cols-[auto_1fr] gap-2.5 rounded-xl bg-muted px-3 py-2.5 text-sm">
            <Icon n="info" className="mt-0.5 size-4 text-muted-foreground" />
            <p>
              <b className="font-semibold">Why ASW stopped here.</b> {d.why}
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
          {id === "G1" && (
            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1.5 flex w-full items-baseline justify-between gap-2 text-xs">
                <span className="font-medium">Claims to lock</span>
                <span className="text-muted-foreground tabular-nums">{picks.length} of 4 picked</span>
              </legend>
              {CLAIMS.map((c) => {
                const on = picks.includes(c.k);
                const lab = S.asp.labels[c.k];
                return (
                  <label
                    key={c.k}
                    htmlFor={`lock-${c.k}`}
                    className={cn(
                      "grid cursor-pointer grid-cols-[auto_auto_minmax(0,1fr)_auto] items-start gap-x-3 rounded-xl border px-3.5 py-2.5 text-sm transition-colors hover:bg-muted/60",
                      on ? "border-foreground/15" : "border-dashed",
                    )}
                  >
                    <Checkbox
                      id={`lock-${c.k}`}
                      checked={on}
                      onCheckedChange={() => setPicks(on ? picks.filter((x) => x !== c.k) : [...picks, c.k])}
                      className="mt-0.5"
                    />
                    <Badge
                      className={cn(
                        "font-mono transition-colors",
                        on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {c.k}
                    </Badge>
                    <span className={cn("leading-snug transition-colors", !on && "text-muted-foreground line-through")}>
                      {claimAtG1(c)}
                    </span>
                    {lab && <Badge className={cn("font-mono", LABEL_BADGE[lab])}>{LABEL_TXT[lab]}</Badge>}
                  </label>
                );
              })}
              {S.c.hedged && (
                <p className="text-[11.5px] text-amber-800 dark:text-amber-300">
                  The Conclusion is undecided: locked, it may appear only as a hedged open question, never in the
                  Abstract.
                </p>
              )}
            </fieldset>
          )}
          {id === "G2" && d.words && (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1.5 font-medium text-xs">
                Wording of each finding
                {S.ceil.expl ? " · the ceiling allows at most “suggest”" : " · the ceiling allows at most “indicate”"}
              </legend>
              {d.words
                .filter((w) => !(w[0] === "f3" && S.stm.f3 === "limitation"))
                .map(([k, name, sentence, choices]) => (
                  <div key={k} className="flex flex-col gap-1.5 rounded-xl border px-3.5 py-2.5">
                    <span className="flex flex-wrap items-center gap-2 text-xs">
                      <b className="font-semibold">{name}</b>
                      <ToggleGroup
                        type="single"
                        variant="outline"
                        size="sm"
                        spacing={0}
                        value={words[k]}
                        onValueChange={(v) => v && setWords({ ...words, [k]: v })}
                        aria-label={`Wording of ${name}`}
                        className="ml-auto bg-background"
                      >
                        {choices.map((c) => {
                          const over = k === "f3" ? c === "no gain" : c === "show" || (S.ceil.expl && c === "indicate");
                          return (
                            <ToggleGroupItem
                              key={c}
                              value={c}
                              disabled={over}
                              title={over ? (k === "f3" ? CONCEDED : ABOVE_CEILING) : undefined}
                              className="h-6 px-2 text-[11.5px] disabled:line-through"
                            >
                              {c}
                            </ToggleGroupItem>
                          );
                        })}
                      </ToggleGroup>
                    </span>
                    <span className="font-serif text-[14px] leading-snug">
                      {sentence.split("{w}")[0]}
                      <b className="rounded-sm bg-sky-500/10 px-0.5 font-semibold text-sky-800 dark:text-sky-200">
                        {words[k]}
                      </b>
                      {sentence.split("{w}")[1]}
                    </span>
                  </div>
                ))}
            </fieldset>
          )}
          {id === "G3" && d.checks && (
            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1.5 font-medium text-xs">Before you sign</legend>
              {d.checks.map((c, i) => (
                <label
                  key={c}
                  htmlFor={`sign-check-${i}`}
                  className="grid cursor-pointer grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition-colors hover:bg-muted/60"
                >
                  <Checkbox
                    id={`sign-check-${i}`}
                    checked={checks[i]}
                    onCheckedChange={() => setChecks(checks.map((v, j) => (j === i ? !v : v)))}
                    className="mt-0.5"
                  />
                  <span>{i === 0 ? g3first : c}</span>
                </label>
              ))}
            </fieldset>
          )}
          {id === "G0" && (
            <label
              htmlFor="own-research"
              className="grid cursor-pointer grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition-colors hover:bg-muted/60"
            >
              <Checkbox
                id="own-research"
                checked={own}
                onCheckedChange={(v) => setOwn(v === true)}
                className="mt-0.5"
              />
              <span>{d.own}</span>
            </label>
          )}
          <RadioGroup value={choice} onValueChange={setChoice} className="gap-2" aria-label={d.title}>
            {d.opts.map((o) => {
              const off = disabled(o);
              return (
                <label
                  key={o[0]}
                  htmlFor={`stop-${o[0]}`}
                  className={cn(
                    "grid cursor-pointer grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-xl border px-3.5 py-3 transition-[background-color,border-color,box-shadow] hover:bg-muted/60",
                    choice === o[0] && "border-foreground ring-1 ring-foreground",
                    off && "cursor-not-allowed opacity-50",
                  )}
                >
                  <RadioGroupItem id={`stop-${o[0]}`} value={o[0]} disabled={off} className="row-span-2 mt-0.5" />
                  <span className="flex flex-wrap items-center gap-2 font-semibold text-sm">
                    {o[1]}
                    {o[3] ? <Badge variant="secondary">Orchestrator recommends</Badge> : null}
                  </span>
                  <span className="flex items-start gap-1.5 text-muted-foreground text-xs">
                    <Icon n="arrow" className="mt-0.5 size-3" />
                    {off ? "All three retries are used. Lock the claims or start over." : o[2]}
                  </span>
                </label>
              );
            })}
          </RadioGroup>
          <Input
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

/* ---------- the scene for a screen ---------- */
const SCENES: Record<string, ComponentType<{ live: boolean }>> = {
  handoff: HandoffScene,
  report: DataReportScene,
  evidence: EvidenceScene,
  statements: StatementsScene,
  debate: DebateScene,
  reasoning: ToulminScene,
  map: MapScene,
  journal: JournalScene,
  blueprint: BlueprintScene,
  write: WriteScene,
  review: ReviewScene,
  signoff: SignoffScene,
};
function Screen({ k }: { k: string }) {
  const scr = SCREENS.find((s) => s.key === k);
  if (k === "paper" || !scr)
    return (
      <div className="flex flex-col gap-5">
        <header className="flex flex-wrap items-start gap-3 border-b pb-3.5">
          <Icon n="circleCheck" className="mt-1 size-4 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-lg tracking-tight">The paper</h2>
            <p className="mt-1 text-muted-foreground text-sm">
              Signed by you. Every number points back to the evidence ledger; hover one to see its row.
            </p>
          </div>
          <Badge className="bg-emerald-500/12 text-emerald-700 dark:text-emerald-300">
            <Icon n="check" className="size-3" />
            Submission-ready
          </Badge>
        </header>
        <FinalPaper />
      </div>
    );
  const live = k === S.live && !S.view && !S.done && S.tab === "run";
  const Scene = SCENES[k];
  const notes = S.decisions.filter((d) => scr.stages.includes(d.stage));
  return (
    <div className="flex flex-col gap-5">
      <StageHeader scr={scr} />
      <ScreenTabs scr={scr} />
      {S.tab === "contract" ? (
        <ContractView scr={scr} />
      ) : (
        <>
          <ScreenIncidents scr={scr} />
          <Scene key={k} live={live} />
          {notes.map((n) => (
            <SceneNote
              key={n.seq}
              actor={n.actor}
              text={n.auto ? `${n.text.replace(/\.$/, "")} (skipped ahead)` : n.text}
              note={n.note}
            />
          ))}
        </>
      )}
    </div>
  );
}
const screenName = (key: string) =>
  key === "paper" ? "The paper" : (SCREENS.find((s) => s.key === key)?.short ?? key);

/** The scrolling column the scenes sit in. A wheel or a swipe stops the view following the agents for a moment. */
function Scroller({ children }: { children: ReactNode }) {
  const note = () => {
    UI.userScrollAt = performance.now();
  };
  return (
    <div id="asw-scroller" className="min-h-0 flex-1 overflow-y-auto" onWheel={note} onTouchMove={note}>
      <div className="px-4 pt-5 pb-56 md:px-8">{children}</div>
    </div>
  );
}
function DetailsButton() {
  return (
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
  );
}
function AswBody({ asideOpen }: { asideOpen: boolean }) {
  const k = viewKey();
  const viewingOther = Boolean(S.view && S.view !== S.live);
  return (
    <div className={cn("grid min-h-0 flex-1", asideOpen && "lg:grid-cols-[minmax(0,1fr)_352px]")}>
      <div className="relative flex min-h-0 min-w-0 flex-col">
        <StageTrack />
        {DEV && <ScenarioStrip />}
        <RecoveryBar />
        <div className={cn("flex items-center gap-3 border-b px-4 py-2.5 lg:hidden", S.inc && "max-lg:hidden")}>
          <div className="min-w-0 flex-1">
            <NowCard compact />
          </div>
          <DetailsButton />
        </div>
        <Scroller>
          <Screen key={k} k={k} />
        </Scroller>
        {viewingOther && !S.gate && (
          <M
            in="pill"
            className="absolute bottom-4 left-1/2 z-10 flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-3 whitespace-nowrap rounded-full bg-card py-1.5 pr-1.5 pl-4 text-sm shadow-lg ring-1 ring-foreground/10"
          >
            <span className="truncate text-muted-foreground">
              Viewing <b className="font-semibold text-foreground">{screenName(S.view ?? "")}</b>
            </span>
            <Button type="button" size="sm" onClick={() => setView(S.live)}>
              {!S.done && <PulseDot className="bg-sky-400" />}
              {S.done ? "Back to sign-off" : `Live: ${screenName(S.live)}`}
              <Icon n="arrow" />
            </Button>
          </M>
        )}
        {S.gate && <GateSheet key={S.gate.id + S.seq} id={S.gate.id} />}
      </div>
      {asideOpen && (
        <aside className="min-h-0 border-l bg-sidebar max-lg:hidden">
          <Aside />
        </aside>
      )}
    </div>
  );
}
/** On a phone the aside opens as a sheet from the bottom. */
function DetailsSheet() {
  return (
    <Sheet
      open={UI.detailsOpen}
      onOpenChange={(open) => {
        UI.detailsOpen = open;
        emit();
      }}
    >
      {/* The team row leaves room for the sheet's close button. */}
      <SheetContent side="bottom" className="h-[80vh] p-0 [&_[data-aside-team]]:pr-12">
        <SheetHeader className="sr-only">
          <SheetTitle>Steps and activity</SheetTitle>
        </SheetHeader>
        {TRACK === "jfe" ? <JAside /> : <Aside />}
      </SheetContent>
    </Sheet>
  );
}

/**
 * The writing stage of a research run: the manuscript run (ASW) and, beside it, the journal-profile run (JFE), each with
 * its own track, stops and aside.
 */
export function WritingStudio({ asideOpen = true }: { asideOpen?: boolean }) {
  useWritingRun();
  // Stops it opens need no toast while it is on screen.
  useEffect(() => {
    HOST.visible = true;
    return () => {
      HOST.visible = false;
    };
  }, []);
  // Space pauses or resumes the writing run, as it does a research run.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (e.key !== " " || target?.closest("input, textarea, button, select, [role=radio], [role=switch]")) return;
      if (S.gate || S.done || S.lifecycle === "failed") return;
      e.preventDefault();
      setPaused(!S.paused);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useDevHooks();
  return (
    <section aria-label="Writing stage" className="asw relative flex min-h-0 flex-1 flex-col">
      <Toolbar />
      {TRACK === "jfe" ? <JBody asideOpen={asideOpen} /> : <AswBody asideOpen={asideOpen} />}
      <DetailsSheet />
      {UI.sheet === "team" && <AgentsSheet />}
      {DEV && UI.sheet === "scn" && <ScenarioSheet />}
    </section>
  );
}

/* While developing, the writing run can be driven from the console and by browser tests. */
declare global {
  interface Window {
    __asw?: Record<string, unknown>;
  }
}
function useDevHooks() {
  useEffect(() => {
    if (!DEV) return;
    window.__asw = {
      S: () => S,
      J: () => J,
      answer: (opt: string, extra: object = {}) =>
        settle("answer", { opt, picks: ["F1", "F2", "F3", "C"], words: { ...S.g2 }, ...extra }),
      janswer: (opt: string) => jsettle("answer", { opt }),
      way: (opt: string) => settle("incident", opt),
      resume: () => settle("resume"),
      jresume: () => jsettle("resume"),
      cont: () => settle("continue"),
      speed: (n: number) => {
        S.speed = n;
        emit();
      },
      view: setView,
      jview: jSetView,
      tab: (t: string) => {
        S.tab = t;
        emit();
      },
      sheet: openSheet,
      play: playScenario,
      pause: setPaused,
      publishNow: jPublishNow,
      track: setTrack,
      restart,
    };
    return () => {
      window.__asw = undefined;
    };
  }, []);
}
