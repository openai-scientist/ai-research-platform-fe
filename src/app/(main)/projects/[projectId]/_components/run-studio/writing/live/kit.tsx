"use client";
"use no memo";

/* ===== What every live scene shares: how many items it shows, and the stage at work before its files are in ===== */

import { useEffect, useState } from "react";

import { Caret } from "../../run-bits";
import { AGENTS } from "../data/meta";
import { S, sleep, waitFor } from "../engine";
import { AgentAvatar, cn, Icon, M, WorkOrb } from "../lib";
import { callKey, callLine, has, LIVE, LIVE_STAGES, type ModelCall } from "./run";
import type { RunFileName } from "./types";

/**
 * How many items of a list a scene shows: as many as the player has streamed while the stage plays, every one once the
 * stage is done (a run opened later, or a stage the player passed while its files were still on their way).
 */
export function shown(sid: string, list: string, total: number) {
  return S.st[sid]?.status === "done" ? total : Math.min(total, S.n[list] ?? 0);
}
/** The item being streamed now, as `list:id`: its text is typed out. */
export const streaming = (list: string, id: string) => !S.fast && S.now === `${list}:${id}`;

/* ---------- the frame first, the files as they come ---------- */
/** Waits on the run until `cond` holds. */
export async function until(cond: () => boolean) {
  while (!cond()) await waitFor("live");
}
const later = (sid: string) => LIVE_STAGES.slice(LIVE_STAGES.indexOf(sid) + 1).some((x) => LIVE.begun.has(x));
/**
 * Waits for files of a stage, one step's at a time: a stage plays each part as its step publishes. False when the run
 * went on (or stopped) without them; the scene then leaves that part as it is.
 */
export async function need(sid: string, ...names: RunFileName[]) {
  const gone = () => Boolean(LIVE.failed) || (LIVE.finished.has(sid) && later(sid) && LIVE.caughtUp);
  await until(() => has(...names) || gone());
  if (!has(...names) && !LIVE.failed) await sleep(1500);
  return has(...names);
}
/** A part of the screen whose files are not in yet: the scene draws its skeleton there. */
export const pending = (...names: RunFileName[]) => !has(...names);

/**
 * Who works on a part of the screen right now, as the caption of its skeleton: the agent, what it does, for how long.
 * `task` picks the model call (e.g. /^contracts-introduction/); without it, the stage's call at work. Nothing while
 * no call runs (a code check, or a part waiting for an earlier step).
 */
export function WorkingHere({ sid, task, className }: { sid: string; task?: RegExp; className?: string }) {
  const c = LIVE.calls.find((x) => x.stage === sid && !x.done && (!task || task.test(x.task)));
  useTick(Boolean(c));
  if (!c) return null;
  const a = callKey(c.agent);
  return (
    <M
      in="fade"
      className={cn("flex min-w-0 items-start gap-2 text-muted-foreground text-xs", className)}
      data-working-here={c.task}
    >
      <span className="relative shrink-0">
        <AgentAvatar a={a} size="sm" />
        <span
          className={cn(
            "absolute -inset-[3px] animate-ping rounded-full opacity-30 ring-[1.5px] ring-current",
            AGENTS[a].text,
          )}
        />
      </span>
      <span className="min-w-0 text-pretty pt-0.5">{callLine(c.label, c.agent)}</span>
      <span className="shrink-0 pt-0.5 font-mono text-[11px] tabular-nums">{since(c.at)}</span>
    </M>
  );
}

/** The player has the stage's files and streams them (it sets this before it plays the stage). */
export const PLAYING = (sid: string) => `play:${sid}`;
/** The stage is at work on the engine and its files are not in yet: the scene shows its work instead. */
export const working = (sid: string) => S.st[sid]?.status !== "done" && !S.n[PLAYING(sid)];

function since(at: string, end?: string) {
  const s = Math.max(0, Math.round(((end ? Date.parse(end) : Date.now()) - Date.parse(at)) / 1000));
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
}
/** A clock that ticks while something runs. */
function useTick(on: boolean) {
  const [, set] = useState(0);
  useEffect(() => {
    if (!on) return;
    const t = setInterval(() => set((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [on]);
}

function CallRow({ c }: { c: ModelCall }) {
  const running = !c.done;
  useTick(running);
  const a = callKey(c.agent);
  return (
    <M as="li" in="up6" className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 py-2.5">
      <span className="relative">
        <AgentAvatar a={a} />
        {running && (
          <span
            className={cn(
              "absolute -inset-[3px] animate-ping rounded-full opacity-30 ring-[1.5px] ring-current",
              AGENTS[a].text,
            )}
          />
        )}
      </span>
      <span className="min-w-0">
        <b className="block font-medium text-[13px]">{c.label}</b>
        <span className="text-muted-foreground text-xs">
          {callLine(c.label, c.agent)}
          {running && <Caret />}
        </span>
      </span>
      <span
        className={cn(
          "inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2 font-mono text-[11px]",
          running
            ? "bg-sky-500/12 text-sky-700 dark:text-sky-300"
            : "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
        )}
      >
        {running ? <span className="beat size-1.5 rounded-full bg-sky-500" /> : <Icon n="check" className="size-3" />}
        {since(c.at, c.done)}
      </span>
    </M>
  );
}

/**
 * The stage at work on the engine, before it has published its files: who is working on what, and for how long. A
 * stage with no model call (code checks only) says so.
 */
export function StageWorking({ sid, what }: { sid: string; what: string }) {
  const calls = LIVE.calls.filter((c) => c.stage === sid);
  const running = calls.some((c) => !c.done);
  return (
    <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10" data-working={sid}>
      <header className="flex items-start gap-3">
        <WorkOrb state={running ? "searching" : "connecting"} size={32} />
        <div className="min-w-0">
          <b className="block font-semibold text-sm">{what}</b>
          <p className="mt-0.5 text-muted-foreground text-xs">
            {calls.length
              ? `${calls.filter((c) => c.done).length} of ${calls.length} model calls done. What they write appears here the moment the step publishes it.`
              : "Code checks, no AI. What they find appears here the moment the step publishes it."}
          </p>
        </div>
      </header>
      {calls.length > 0 && (
        <ol className="mt-2 divide-y">
          {calls.map((c) => (
            <CallRow key={`${c.task}:${c.seq}`} c={c} />
          ))}
        </ol>
      )}
    </section>
  );
}

/** A small count with its label, as the stage headers of the preview show them. */
export function Count({ n, label, tone }: { n: number | string; label: string; tone?: "ok" | "warn" | "bad" }) {
  return (
    <span className="flex flex-col">
      <span className="text-muted-foreground text-xs">{label}</span>
      <b
        className={cn(
          "font-semibold text-xl tabular-nums",
          tone === "ok" && "text-emerald-700 dark:text-emerald-300",
          tone === "warn" && "text-amber-700 dark:text-amber-300",
          tone === "bad" && "text-rose-700 dark:text-rose-300",
        )}
      >
        {n}
      </b>
    </span>
  );
}
