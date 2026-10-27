import { useSyncExternalStore } from "react";

import { toast } from "sonner";

import type { WritingEvent, WritingEventOf, WritingEventType } from "@/lib/run-stream/contract";

import { SCN } from "./data/cases";
import {
  ALLOC,
  BACKLOG,
  CAP_TRIES,
  CHECKS,
  COMMENTS,
  DEC,
  DISCLOSURE,
  DLT,
  FIT,
  FIT_RULES,
  MN,
  PLACEMENT,
  RERUNS,
  SECTIONS,
  SENTENCE_RULES,
  SP,
  STAGES,
  STOP_STAGE,
  STORY,
  TOU,
  TOUMAP,
} from "./data/core";
import { CLOSED_BY_RECORD, RULING, TURNS, TURNS_COUT, TURNS_K04, type Turn } from "./data/debate";
import { BAD_REF, CONTRACT, COVER_COLS, JOURNAL_DIFF, LEDGER, NUM_ROWS } from "./data/gather";
import { INC } from "./data/incidents";
import { INTAKE, INTAKE_LIMITS } from "./data/intake";
import {
  JALPHA,
  JARCH,
  JCONFOUND,
  JDEC,
  JDONE_TEXT,
  JFOREST,
  JHEADMAP,
  JINTRO,
  JMEASURE_ORDER,
  JPAGE,
  JPARSE_N,
  JRECIPES,
  JSCREEN_OF,
  JSCREENS,
  JSTAGE,
  JSTAGES,
  JSTOP_STAGE,
  JTREE,
} from "./data/jfe";
import { isGate, SCREEN_OF, STAGE, screenIndex } from "./data/meta";
import { PARAS, type Para } from "./data/paper";
import { CEILING, CHAIN, PLAN_VS_RUN, REPORT_FIELDS, TIMELINE, TIMELINE_LATE, TIMELINE_VERDICT } from "./data/report";
import { afterPaint, fly, q, quiet, RM } from "./lib";

/* ===== the writing run: its state, and the mock stream that drives it (like run-stream/mock/scenario) =====
 * One writing run is played at a time. It belongs to the research run it was opened from; opening it for another run
 * starts that one over. */

export type Lifecycle = "running" | "waiting" | "blocked" | "failed" | "done";
export type StageStatus = "pending" | "running" | "done" | "failed";
export interface StageRun {
  status: StageStatus;
  done: string[];
  cur: string | null;
  round: number;
  summary: string;
}
export interface Msg {
  /** The `message_id` of the narration it was streamed as. */
  id?: string;
  actor: string;
  text: string;
  done: boolean;
}
export interface FeedItem {
  seq: number;
  actor: string;
  text: string;
  kind: string;
  stage: string;
}
export interface DecisionRecord {
  seq: number;
  actor: string;
  text: string;
  note?: string;
  stage: string;
  id: string;
  auto?: boolean;
}
/** An answer at a stop: the option, the claims ticked at G1 and the wording chosen at G2. */
export interface Answer {
  opt: string;
  picks?: string[];
  words?: Record<string, string>;
  note?: string;
}
/** How a span of the paper stands: flagged by the read-back, changed (and later accepted), or changed twice. */
export type RevState = "flag" | "fix" | "final" | "final-keep" | "fix2" | "final2" | undefined;

const stagesOf = (ids: string[]) =>
  Object.fromEntries(
    ids.map((id): [string, StageRun] => [id, { status: "pending", done: [], cur: null, round: 1, summary: "" }]),
  );

export function freshState(prev?: { speed: number; mode: string; pauseEach: boolean }) {
  return {
    speed: prev?.speed ?? 1,
    mode: prev?.mode ?? "copilot",
    pauseEach: prev?.pauseEach ?? false,
    scn: "happy",
    started: true,
    paused: false,
    fast: false,
    holding: false,
    lifecycle: "running" as Lifecycle,
    blocked: null as { why: string; button: string } | null,
    failure: null as string | null,
    inc: null as { key: string; sid: string; seq: number } | null,
    incs: [] as { key: string; sid: string; opt: string }[],
    live: "handoff",
    reached: 0,
    view: null as string | null,
    tab: "run",
    stage: "S00",
    st: stagesOf(STAGES.map((s) => s.id)),
    msg: null as Msg | null,
    /** Every event of this run so far, in the shape of the run-stream contract. */
    events: [] as WritingEvent[],
    /** The item being written now, as `list:item_id`: its text is typed out on screen. */
    now: null as string | null,
    gate: null as { id: string } | null,
    sheetMin: false,
    feed: [] as FeedItem[],
    seq: 0,
    decisions: [] as DecisionRecord[],
    rules: {} as Record<number, "pass" | "hit">,
    retries: { G1: 0, G2: 0 },
    up: {
      /** Parts of the run's output on screen, in INTAKE order. */
      open: 0,
      /** Checks finished, in INTAKE_CHECKS order. */
      done: 0,
      /** The check being made now. */
      at: null as string | null,
      /** Limits named at the end. */
      named: 0,
      /** A check that failed and holds the stage (an unhappy case). */
      bad: null as string | null,
      fixed: false,
    },
    rp: {
      fields: 0,
      tl: 0,
      tlDone: false,
      chain: 0,
      chainDone: false,
      plan: 0,
      planDone: false,
      ceil: 0,
      late: false,
      a4: null as string | null,
      h3: null as string | null,
      dev: null as string | null,
      tune: null as string | null,
    },
    ceil: { expl: false },
    ev: { refs: 0, rows: 0, recomp: 0, ready: 0, mis: null as string | null },
    stm: {
      arrived: 0,
      sorted: 0,
      status: false,
      links: false,
      blocked: false,
      f3: "finding" as "finding" | "limitation",
    },
    db: { turns: [] as string[], th: null as string | null, k04: null as string | null, closed: 0, round: 1 },
    tou: {
      cards: 0,
      parts: {} as Record<string, number>,
      focus: null as string | null,
      recon: false,
      tied: false,
      scope: false,
      narrowed: false,
    },
    map: {
      n: [] as string[],
      s: [] as string[],
      e: [] as string[],
      checked: [] as string[],
      numbers: 0,
      tested: false,
      conf: false,
      frozen: false,
      version: 1,
      removed: false,
      ext: false,
      sweep: false,
      back: [] as string[],
    },
    asp: { labels: {} as Record<string, string>, phase: 0, rerun: false, answered: [] as string[] },
    c: { restated: false, hedged: false },
    jr: {
      waiting: false,
      loaded: false,
      rulesOnly: false,
      rules: 0,
      habits: 0,
      conflict: false,
      place: 0,
      tmap: 0,
      sent: 0,
      variants: false,
      budgets: false,
      approved: false,
      shaped: false,
      /** Lines of the contract written out. */
      lines: 0,
    },
    bp: {
      page: false,
      story: 0,
      placed: 0,
      moves: false,
      aligned: false,
      briefs: 0,
      roles: false,
      blocked: false,
      risk: false,
      alt: false,
    },
    pp: {
      typed: {} as Record<string, number>,
      writing: {} as Record<string, string>,
      used: {} as Record<string, number>,
      table: 0,
      fig: false,
      rev: {} as Record<string, RevState>,
      flags: {} as Record<string, number>,
      comments: 0,
      typeset: false,
      draft: 1,
      sig: null as "ins" | "rev" | null,
    },
    rv: { reading: false, rebuilt: false, delta: 0, rolled: false, fixed: false },
    fit: { rows: 0, moves: false, edits: 0, exceptions: false },
    rev: { notes: 0, orig: false, disagree: false, backlog: 0, choice: null as string | null },
    fix: { rerun: false, patches: 0, sdiff: false, reruns: 0, snap: false, tries: 0, reverted: false, edited: false },
    so: { checks: 0, refs: false, ai: 0, ledger: false, signed: false },
    g2: { f1: "indicate", f2: "indicate", f3: "no clear gain" } as Record<string, string>,
    picked: ["F1", "F2", "F3", "C"],
    done: false,
  };
}
export type AswState = ReturnType<typeof freshState>;

export function jFresh() {
  return {
    /** The profile run starts when the manuscript run reaches S08 and needs it, not before. */
    started: false,
    lifecycle: "running" as Lifecycle,
    blocked: null as { why: string; button: string } | null,
    holding: false,
    live: "corpus",
    reached: 0,
    view: null as string | null,
    stage: "J1",
    st: stagesOf(JSTAGES.map((s) => s.id)),
    msg: null as Msg | null,
    gate: null as { id: string } | null,
    sheetMin: false,
    feed: [] as FeedItem[],
    seq: 0,
    decisions: [] as DecisionRecord[],
    rules: {} as Record<number, "pass" | "hit">,
    fast: false,
    done: false,
    failMode: false,
    failed: false,
    failure: null as string | null,
    cp: { phase: 0 },
    pr: { fetched: 0, page: 0, tree: 0, strip: false, map: 0, queue: 0, failed: false, audit: false },
    an: { a: 0, b: 0, alpha: 0, disputed: false, relabel: false, prov: false, reg: 0, trail: false },
    az: {
      swarm: false,
      violin: false,
      heat: 0,
      order: false,
      forest: 0,
      conf: 0,
      abs: null as string | null,
      hold: false,
      arch: 0,
    },
    pb: { labels: false, rules: 0, recipes: 0, diff: false, frozen: false },
  };
}
export type JfeState = ReturnType<typeof jFresh>;

/** The manuscript run and the profile run. Reassigned on start and on every scenario. */
export let S: AswState = freshState();
export let J: JfeState = jFresh();
/** which run is on screen: the profile ("jfe") or the manuscript ("asw") */
export let TRACK: "asw" | "jfe" = "asw";
/** while a run is fast-forwarded, renders wait until it lands */
export let QUIET = false;
/** the stage a scenario lands on; until then the run replays with no waiting and no rendering */
export let FF: string | null = null;

/** What the screen around the run says about it: which research run it belongs to, and whether it is in view. */
export const HOST = {
  runId: null as string | null,
  label: "",
  /** The writing view is on screen; stops it opens need no toast. */
  visible: false,
  /** Brings the writing view to the screen, from a toast. */
  open: null as (() => void) | null,
};
/** Things only the screen keeps: the details sheet on phones, the open side sheet, when you last scrolled. */
export const UI = {
  /** Set from a toast while the workspace is closed: the workspace opens on the writing view. */
  wantView: false,
  /** The writing preview, played without a research run, is on screen. */
  preview: false,
  detailsOpen: false,
  sheet: null as string | null,
  userScrollAt: 0,
};

/* ---------- every change re-renders the view that subscribes ---------- */
const listeners = new Set<() => void>();
let version = 0;
export function emit() {
  if (QUIET) return;
  version += 1;
  for (const l of listeners) l();
}
export function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
export const getVersion = () => version;
/** Re-renders a component on every change of the writing run. */
export function useWritingRun() {
  return useSyncExternalStore(subscribe, getVersion, getVersion);
}
/** How far the manuscript run has come, for the research run's own track: 0 to 1. */
export function writingProgress() {
  const steps = STAGES.reduce((n, s) => n + s.steps.length, 0);
  const done = STAGES.reduce((n, s) => n + S.st[s.id].done.length, 0);
  return S.done ? 1 : done / steps;
}

/* ---------- time that can be cancelled (Start over), paused, sped up and skipped ---------- */
export const STOP = { stop: true };
interface Timer {
  t?: ReturnType<typeof setTimeout>;
  rej(reason: unknown): void;
}
interface Wait {
  kind: string;
  res(value: unknown): void;
  rej(reason: unknown): void;
}
export const RUN = { gen: 0, timers: new Set<Timer>(), waits: new Set<Wait>() };
export async function sleep(ms: number): Promise<void> {
  const g = RUN.gen;
  if (S.fast) {
    if (g !== RUN.gen) throw STOP;
    return;
  }
  while (S.paused) await waitFor("unpause");
  return new Promise<void>((res, rej) => {
    const w: Timer = { rej };
    w.t = setTimeout(() => {
      RUN.timers.delete(w);
      g === RUN.gen ? res() : rej(STOP);
    }, ms / S.speed);
    RUN.timers.add(w);
  });
}
/** A promise someone else settles: an answer at a stop, Continue, Resume, a way out of an incident. */
export function waitFor<T = unknown>(kind: string) {
  const g = RUN.gen;
  return new Promise<T>((res, rej) => {
    RUN.waits.add({ kind, res: (v) => (g === RUN.gen ? res(v as T) : rej(STOP)), rej });
  });
}
export function settle(kind: string, value?: unknown) {
  for (const w of [...RUN.waits])
    if (w.kind === kind) {
      RUN.waits.delete(w);
      w.res(value);
    }
}
export function cancelAll() {
  RUN.gen++;
  for (const w of RUN.timers) {
    clearTimeout(w.t);
    w.rej(STOP);
  }
  for (const w of RUN.waits) w.rej(STOP);
  RUN.timers.clear();
  RUN.waits.clear();
}
export function setPaused(on: boolean) {
  S.paused = on;
  if (!on) {
    settle("unpause");
    jsettle("unpause");
  }
  emit();
}

/* ---------- what the scene can see ---------- */
export const following = () => TRACK === "asw" && !S.fast && (!S.view || S.view === S.live) && S.tab === "run";
/** Scrolls what the agents just did into view, once it is drawn, unless you scrolled away a moment ago. */
export function reveal(sel: string, block: ScrollLogicalPosition = "nearest") {
  afterPaint(() => {
    if (!following() || performance.now() - UI.userScrollAt < 2500) return;
    const el = q(sel);
    const box = q("#asw-scroller");
    if (!el || !box) return;
    const a = el.getBoundingClientRect();
    const b = box.getBoundingClientRect();
    if (a.top >= b.top + 40 && a.bottom <= b.bottom - 40) return;
    el.scrollIntoView({ block, behavior: RM() ? "auto" : "smooth" });
  });
}
export const flyIn = (from: string, to: string, label: string, tone?: string) => {
  if (following()) fly(from, to, label, tone);
};

/* ---------- the event stream: every change a scene shows comes as an event of the run-stream contract ---------- */
/** Characters a second at which an agent's text is typed out: the pace of a debate turn in a research run. */
export const TYPE_CPS = 150;
/** How long `text` takes to be typed out at normal speed. */
export const typeMs = (text: string) => (text.length / TYPE_CPS) * 1000;
/** Whether the item `id` of `list` is being written now, so its text is typed out rather than shown whole. */
export const typing = (list: string, id: string | number) => !S.fast && S.now === `${list}:${id}`;

const seenMessages = new Set<string>();
let messageCount = 0;
/** Each list a scene fills, and how it takes its next item: the reducer half of `writing.item`. */
const LISTS: Record<string, (p: WritingEventOf<"writing.item">["payload"]) => void> = {
  "up.done": (p) => {
    S.up.done = p.index + 1;
  },
  "up.named": (p) => {
    S.up.named = p.index + 1;
  },
  "rp.fields": (p) => {
    S.rp.fields = p.index + 1;
  },
  "rp.tl": (p) => {
    S.rp.tl = p.index + 1;
  },
  "rp.verdict": () => {
    S.rp.tlDone = true;
  },
  "rp.plan": (p) => {
    S.rp.plan = p.index + 1;
  },
  "rp.ceil": (p) => {
    S.rp.ceil = p.index + 1;
  },
  "ev.rows": (p) => {
    S.ev.rows = p.index + 1;
  },
  "stm.sorted": (p) => {
    S.stm.sorted = p.index + 1;
  },
  "db.turns": (p) => {
    S.db.turns.push(p.item_id);
    S.db.th = p.value ?? null;
  },
  "tou.parts": (p) => {
    if (p.value) S.tou.parts[p.value] = p.index + 1;
  },
  "asp.labels": (p) => {
    if (p.value) S.asp.labels[p.item_id] = p.value;
  },
  "jr.rules": (p) => {
    S.jr.rules = p.index + 1;
  },
  "jr.habits": (p) => {
    S.jr.habits = p.index + 1;
  },
  "jr.place": (p) => {
    S.jr.place = p.index + 1;
  },
  "jr.tmap": (p) => {
    S.jr.tmap = p.index + 1;
  },
  "jr.sent": (p) => {
    S.jr.sent = p.index + 1;
  },
  "jr.lines": (p) => {
    S.jr.lines = p.index + 1;
  },
};
/** Applies one event to the run's state, as `applyRunEvent` does for a research run. */
function applyWriting(ev: WritingEvent) {
  const st = ev.stage_key ? S.st[ev.stage_key] : undefined;
  switch (ev.type) {
    case "stage.started":
      if (st) {
        st.status = "running";
        st.cur = null;
      }
      break;
    case "stage.completed":
      if (st) {
        st.status = "done";
        st.cur = null;
        st.summary = ev.payload.summary;
      }
      S.now = null;
      break;
    case "step.started":
      if (st) st.cur = ev.payload.step_id;
      S.now = null;
      break;
    case "step.completed":
      if (st) st.done = st.done.filter((x) => x !== ev.payload.step_id).concat(ev.payload.step_id);
      S.now = null;
      break;
    case "agent.message": {
      const { message_id: id, delta, done } = ev.payload;
      // A message that another one has taken over from keeps streaming out of sight; the card shows the newest.
      if (S.msg?.id === id) S.msg.text += delta;
      else if (!seenMessages.has(id)) S.msg = { id, actor: ev.actor ?? "or", text: delta, done: false };
      seenMessages.add(id);
      if (done && S.msg?.id === id) S.msg.done = true;
      break;
    }
    case "writing.item":
      LISTS[ev.payload.list]?.(ev.payload);
      S.now = `${ev.payload.list}:${ev.payload.item_id}`;
      break;
  }
}
/** Sends an event of this run: it is recorded, applied and drawn. */
export function send<T extends WritingEventType>(
  type: T,
  payload: WritingEventOf<T>["payload"],
  actor?: string,
  stage = S.stage,
) {
  const ev = {
    seq: S.events.length + 1,
    run_id: HOST.runId ?? "",
    ts: new Date().toISOString(),
    type,
    stage_key: stage,
    actor,
    payload,
  } as WritingEvent;
  S.events.push(ev);
  applyWriting(ev);
  emit();
  return ev;
}
/**
 * An agent fills item `index` of a scene's list, writing `text` into it. The screen types the text out; the next item
 * waits until it is typed and at least `wait` ms have passed, then `beat` ms more for it to be read.
 */
export async function item(
  list: string,
  index: number,
  o: { id?: string; text?: string; value?: string; actor?: string; wait?: number; beat?: number } = {},
) {
  const text = o.text ?? "";
  send(
    "writing.item",
    { list, index, item_id: o.id ?? String(index), text, ...(o.value ? { value: o.value } : {}) },
    o.actor,
  );
  await sleep(Math.max(o.wait ?? 0, typeMs(text)) + (o.beat ?? 0));
}

/* ---------- narration, steps, stages ---------- */
export const stepDef = (sid: string, id: string) => STAGE[sid].steps.find((s) => s.id === id);
/** Narration, streamed two words at a time as a research run's mock stream sends it. */
export async function say(actor: string, text: string) {
  const id = `m${++messageCount}`;
  if (S.fast) {
    send("agent.message", { message_id: id, delta: text, done: true }, actor);
    return;
  }
  const words = text.split(/(?<= )/);
  for (let i = 0; i < words.length; i += 2) {
    const done = i + 2 >= words.length;
    send("agent.message", { message_id: id, delta: words.slice(i, i + 2).join(""), ...(done ? { done } : {}) }, actor);
    if (!done) await sleep(45);
  }
}
/** Narration that streams while the run goes on: the reason for a stop, the turn being heard. */
export function tell(actor: string, text: string) {
  say(actor, text).catch(() => undefined); // Start over cancels it mid-line
}
export function log(actor: string, text: string, kind = "event") {
  S.seq += 1;
  S.feed.push({ seq: S.seq, actor, text, kind, stage: S.stage });
}
export async function step(
  sid: string,
  id: string,
  body?: () => Promise<void>,
  opts: { actor?: string; text?: string; log?: boolean } = {},
) {
  const def = stepDef(sid, id);
  const actor = opts.actor ?? def?.a ?? "or";
  const line = opts.text ?? def?.x ?? "";
  send("step.started", { step_id: id }, actor, sid);
  const talk = say(actor, line);
  talk.catch(() => undefined); // a cancelled body leaves the narration unawaited
  if (body) await body();
  await talk;
  send("step.completed", { step_id: id }, actor, sid);
  if (opts.log !== false) log(actor, line);
  emit();
  await sleep(420);
  if (S.pauseEach && !S.fast) {
    S.holding = true;
    emit();
    await waitFor("continue");
    S.holding = false;
    emit();
  }
}
export function openStage(sid: string) {
  S.stage = sid;
  const scr = SCREEN_OF[sid];
  if (S.live !== scr) {
    S.live = scr;
    S.reached = Math.max(S.reached, screenIndex(scr));
    if (S.view === scr) S.view = null;
    if (!S.view && TRACK === "asw") scrollTop();
  }
  send("stage.started", { round: S.st[sid].round }, undefined, sid);
  if (FF === sid) land();
  emit();
}
export function closeStage(sid: string, summary: string) {
  send("stage.completed", { summary }, undefined, sid);
}
export function scrollTop() {
  afterPaint(() => q("#asw-scroller")?.scrollTo({ top: 0, behavior: "auto" }));
}
/* the scenario has reached the stage where it breaks: show it, settled, and play on live */
export function land() {
  FF = null;
  S.fast = false;
  QUIET = false;
  S.view = null;
  quiet();
  emit();
  scrollTop();
}

/* ---------- stops ---------- */
export const DONE_TEXT: Record<string, string> = {
  "G0:go": "Started from this record.",
  "G0:hold": "Held the run until the timing log is added.",
  "G1:lock": "Locked the claims and froze graph v1.",
  "G1:back": "Sent claims back to be argued again.",
  "G2:use": "Chose the wording of the findings.",
  "G2:back": "Sent Results back for re-analysis.",
  "G3:sign": "Signed the manuscript.",
  "G3:hold": "Held the signature.",
  "K01:x": "Kept A4 as an exploratory analysis.",
  "K01:drop": "Left A4 out of the paper.",
  "K03:f": "Kept Finding 3 as a finding with an inconclusive result.",
  "K03:l": "Moved Finding 3 to the limitations.",
  "K04:q": "Narrowed the Conclusion to English NLP papers like those in QASPER.",
  "K04:r": "Dropped the reconstructed warrant on the Conclusion.",
  "K08:ok": "Approved the journal contract for IR Journal.",
  "K08:other": "Asked for another journal.",
  "K09:ok": "Approved the storyline.",
  "K09:re": "Asked for a different storyline.",
  "K12:n": "Narrowed 4.1 to the locked claim.",
  "K12:k": "Kept “either retriever alone” and asked for a new claim.",
  "K14:m": "Took the method reviewer's advice: rerun within length bins.",
  "K14:e": "Took the evidence reviewer's advice: keep the line in Limits.",
};
export async function ask(id: string): Promise<Answer> {
  const d = DEC[id];
  const sid = STOP_STAGE[id];
  S.st[sid].cur = id;
  const rec = d.opts.find((o) => o[3]) ?? d.opts[0];
  if (S.fast || (!isGate(id) && S.mode === "gates")) {
    const text = DONE_TEXT[`${id}:${rec[0]}`];
    if (!S.fast) await say("or", `Quick check taken on the recommendation: ${rec[1]}.`);
    S.seq += 1;
    S.decisions.push({ seq: S.seq, actor: S.fast ? "or" : "or", text, stage: sid, id, auto: S.fast });
    S.feed.push({ seq: S.seq, actor: "or", text, kind: "decision", stage: sid });
    S.st[sid].done.push(id);
    if (id === "G0") S.rules[0] = "pass";
    emit();
    return { opt: rec[0], picks: ["F1", "F2", "F3", "C"], words: { ...S.g2 } };
  }
  tell("or", d.why);
  S.gate = { id };
  tellAway("asw", d.title);
  S.sheetMin = false;
  S.lifecycle = "waiting";
  log("or", `Stopped for you: ${d.title}`);
  emit();
  const answer = await waitFor<Answer>("answer");
  S.gate = null;
  S.lifecycle = "running";
  const text = DONE_TEXT[`${id}:${answer.opt}`];
  S.decisions.push({ seq: ++S.seq, actor: "you", text, note: answer.note, stage: sid, id });
  S.feed.push({ seq: S.seq, actor: "you", text, kind: "decision", stage: sid });
  S.st[sid].done = S.st[sid].done.filter((x) => x !== id).concat(id);
  emit();
  await sleep(300);
  return answer;
}
export async function blockedUntilResume(why: string, button: string) {
  S.lifecycle = "blocked";
  S.blocked = { why, button };
  emit();
  await waitFor("resume");
  S.blocked = null;
  S.lifecycle = "running";
  emit();
}

/* ---------- unhappy cases: the run finds something wrong, says what, and waits for a way out ---------- */
export async function incident(key: string): Promise<string> {
  const def = INC[key];
  S.inc = { key, sid: S.stage, seq: S.seq + 1 };
  tellAway("asw", def.title);
  S.lifecycle = "blocked";
  tell(def.det[0], def.text);
  log(def.det[0], `Unhappy case · ${def.title}`);
  emit();
  reveal("[data-incident]", "start");
  const opt = await waitFor<string>("incident");
  const o = def.opts.find((x) => x[0] === opt) ?? def.opts[0];
  S.incs.push({ key, sid: S.inc.sid, opt });
  S.decisions.push({ seq: ++S.seq, actor: "you", text: o[4], stage: S.inc.sid, id: SCN[key]?.code ?? key });
  S.feed.push({ seq: S.seq, actor: "you", text: o[4], kind: "decision", stage: S.inc.sid });
  S.inc = null;
  S.lifecycle = "running";
  emit();
  return opt;
}
/* the run ends here, as failed; nothing after this stage happens */
export function failRun(text: string): never {
  S.lifecycle = "failed";
  S.failure = text;
  S.msg = null;
  S.st[S.stage].status = "failed";
  log("or", `Run stopped. ${text}`);
  emit();
  throw STOP;
}

/* ---------- S00 · receive the run's output and check each part of it ---------- */
async function checkParts(stepId: "a1" | "a2" | "a3") {
  for (const sec of INTAKE.filter((x) => x.step === stepId)) {
    reveal(`[data-sec="${sec.k}"]`);
    for (const c of sec.checks) {
      S.up.at = c.id;
      emit();
      reveal(`[data-cursor="chk:${c.id}"]`);
      await sleep(380);
      if (c.id === "ap" && S.scn === "schema" && !S.up.fixed) {
        S.up.bad = "ap";
        emit();
        await sleep(500);
        const o = await incident("schema");
        if (o === "stop") failRun("Stopped at S00: plan.md has no analysis plan (B.7), a must field of rrp/v1.");
        S.up.fixed = true;
        S.up.bad = null;
        await say(
          "code",
          "plan.md v2 received. §4 Analysis plan is present; the hash chain from 14 Sep holds. The check passes.",
        );
        await sleep(400);
      }
      if (c.id === "owner" && S.scn === "own") {
        S.up.bad = "owner";
        emit();
        await sleep(600);
        const o = await incident("own");
        if (o === "restart") {
          playScenario("happy", false);
          throw STOP;
        }
        failRun("Stopped at S00: the record has no owner, so ASW may not write from it.");
      }
      await item("up.done", S.up.done, { id: c.id, text: c.ev, actor: "code", wait: c.s === "ok" ? 140 : 420 });
    }
  }
  S.up.at = null;
}
export async function s00() {
  openStage("S00");
  await step("S00", "a0", async () => {
    for (let i = 1; i <= INTAKE.length; i++) {
      S.up.open = i;
      emit();
      await sleep(160);
    }
  });
  await step("S00", "a1", () => checkParts("a1"));
  await step("S00", "a2", () => checkParts("a2"));
  await step("S00", "a3", () => checkParts("a3"));
  await step("S00", "a4", async () => {
    for (let i = 0; i < INTAKE_LIMITS.length; i++) {
      if (i === 0) reveal("[data-limits]");
      await sleep(450);
      const l = INTAKE_LIMITS[i];
      await item("up.named", i, { id: l.sec, text: l.head + l.paper + l.you, wait: 500 });
    }
  });
  closeStage("S00", "8 parts of the run's output checked; 3 limits named, none filled in.");
}

/* ---------- S01 · the standard data report ---------- */
export async function s01() {
  openStage("S01");
  const rp = S.rp;
  await step("S01", "r1", async () => {
    for (let i = 1; i <= REPORT_FIELDS.length; i++) {
      const f = REPORT_FIELDS[i - 1];
      // The view moves once per part, to show the whole part being filled, not once every few fields.
      if (i === 1 || REPORT_FIELDS[i - 2].part !== f.part) reveal(`[data-part="${f.part}"]`);
      await item("rp.fields", i - 1, { id: f.id, text: f.v, wait: 110 });
    }
  });
  const late = S.scn === "late";
  await step(
    "S01",
    "r2",
    async () => {
      const tl = late ? TIMELINE_LATE : TIMELINE;
      reveal("[data-timeline]", "center");
      for (let i = 1; i <= tl.length; i++)
        await item("rp.tl", i - 1, { text: tl[i - 1].x + tl[i - 1].sub, actor: "code", wait: 330 });
      await item("rp.verdict", 0, { text: late ? TIMELINE_VERDICT.late : TIMELINE_VERDICT.ok, actor: "code" });
      if (late) {
        await sleep(600);
        const o = await incident("late");
        if (o === "stop") failRun("Stopped at S01: the plan was locked after the runs began.");
        S.ceil.expl = true;
        rp.late = true;
        emit();
      }
    },
    late ? { text: "plan.md was locked at 21:10 on 15 Sep. The first trace started at 08:41 that morning." } : {},
  );
  await step("S01", "r3", async () => {
    reveal("[data-chain]", "center");
    for (let i = 1; i <= CHAIN.length; i++) {
      rp.chain = i;
      emit();
      await sleep(320);
      if (S.scn === "orphan" && CHAIN[i - 1].h === "H3" && !rp.h3) {
        await sleep(400);
        const o = await incident("orphan");
        if (o === "wait") {
          rp.h3 = "waiting";
          emit();
          await blockedUntilResume(
            "Held until H3’s result arrives. Nothing is argued meanwhile.",
            "The result has arrived",
          );
          await say(
            "ds",
            "Rows 22–24 arrived and link end to end: H3 → A5 → rows 22–24 → traces t01–t15. H3 is reported in the supplement.",
          );
          rp.h3 = "arrived";
        } else rp.h3 = "named";
        emit();
      }
    }
    rp.chainDone = true;
    emit();
  });
  await step("S01", "r4", async () => {
    reveal("[data-planrun]", "center");
    for (let i = 1; i <= PLAN_VS_RUN.length; i++) {
      const row = PLAN_VS_RUN[i - 1][0];
      await item("rp.plan", i - 1, { id: row, text: PLAN_VS_RUN[i - 1][2], actor: "code", wait: 300 });
      if (S.scn === "dev" && row === "Bootstrap" && !rp.dev) {
        await sleep(400);
        const o = await incident("dev");
        rp.dev = o === "rerun" ? "rerunning" : "declared";
        emit();
        if (o === "rerun") {
          await say(
            "code",
            "Rerunning the paired bootstrap from the 15 traces with 10,000 resamples. Row 13: 0.059 to 0.093, as the plan expects.",
          );
          rp.dev = "rerun";
          emit();
        }
      }
      if (S.scn === "tune" && row === "Fusion constant" && !rp.tune) {
        await sleep(400);
        const o = await incident("tune");
        rp.tune = o === "retune" ? "retuning" : "declared";
        emit();
        if (o === "retune") {
          await say(
            "code",
            "Sweeping k over 10, 30, 60 and 100 on the 1,402 dev questions. k = 60 is best again (recall at 10: 0.701). Test numbers stand.",
          );
          rp.tune = "retuned";
          emit();
        }
      }
    }
    rp.planDone = true;
    emit();
  });
  const a = await ask("K01");
  rp.a4 = a.opt;
  emit();
  await step("S01", "r5", async () => {
    reveal("[data-ceiling]", "center");
    for (let i = 1; i <= CEILING.length; i++)
      await item("rp.ceil", i - 1, { text: CEILING[i - 1].v + CEILING[i - 1].why, wait: 260 });
    S.rules[3] = "pass";
  });
  closeStage(
    "S01",
    late
      ? "33 fields laid out; every analysis exploratory; claim ceiling set."
      : "33 fields laid out, 24 of 24 must present; the claim ceiling is set.",
  );
}

/* ---------- S02 · evidence ledger, then stop 1 ---------- */
export async function s02() {
  openStage("S02");
  await step("S02", "b1", async () => {
    for (let i = 1; i <= 31; i++) {
      S.ev.refs = i;
      emit();
      await sleep(i === BAD_REF + 1 ? 500 : 55);
    }
  });
  await step("S02", "b2", async () => {
    for (let i = 1; i <= LEDGER.length; i++) {
      reveal("[data-matrix]");
      await item("ev.rows", i - 1, { id: LEDGER[i - 1].id, text: LEDGER[i - 1].v, wait: 300 });
    }
  });
  await step("S02", "b3", async () => {
    for (let i = 1; i <= NUM_ROWS.length; i++) {
      S.ev.recomp = i;
      if (S.scn === "drift" && NUM_ROWS[i - 1] === "EV-05" && !S.ev.mis) {
        S.ev.mis = "found";
        emit();
        reveal("[data-recheck]");
        await sleep(1400);
        const o = await incident("drift");
        if (o === "hold") {
          S.ev.mis = "held";
          emit();
          await blockedUntilResume(
            "Held until the owner checks results.csv row 13. Results 4.1 waits.",
            "The owner confirmed 0.076",
          );
        }
        S.ev.mis = "fixed";
        emit();
        await sleep(700);
        continue;
      }
      emit();
      reveal("[data-recheck]");
      await sleep(1000);
    }
  });
  await step("S02", "b4", async () => {
    reveal('[data-col-foot="r4"]');
    for (let i = 1; i <= COVER_COLS.length; i++) {
      S.ev.ready = i;
      emit();
      await sleep(COVER_COLS[i - 1].k === "r4" ? 700 : 240);
    }
    S.rules[2] = "hit";
    emit();
  });
  closeStage("S02", "31 references, 91 evidence spans, every number recomputed from the traces.");
  for (;;) {
    const a = await ask("G0");
    if (a.opt === "go") break;
    await blockedUntilResume(
      "Held at stop 1 until the timing log is added. Nothing is argued or written meanwhile.",
      "Open stop 1 again",
    );
  }
}

/* ---------- S03 · the fourth axis ---------- */
export async function s03(round = 1) {
  openStage("S03");
  S.st.S03.round = round;
  const fast = round > 1 ? 0.35 : 1;
  await step("S03", "d1", async () => {
    for (let i = 1; i <= SP.length; i++) {
      S.stm.arrived = i;
      emit();
      await sleep(90 * fast);
    }
  });
  await step("S03", "d2", async () => {
    for (let i = 1; i <= SP.length; i++) {
      flyIn(
        `[data-pile="${SP[i - 1][0]}"]`,
        `[data-lane="${laneOf(SP[i - 1])}"]`,
        SP[i - 1][0],
        "bg-foreground text-background",
      );
      await sleep(260 * fast);
      await item("stm.sorted", i - 1, { id: SP[i - 1][0], text: round === 1 ? SP[i - 1][3] : "" });
    }
  });
  await step("S03", "d3", async () => {
    S.stm.status = true;
    S.rules[3] = "pass";
    emit();
    await sleep(900 * fast);
  });
  await step("S03", "d4", async () => {
    S.stm.links = true;
    emit();
    reveal("[data-chain]");
    await sleep(1200 * fast);
  });
  await step("S03", "d5", async () => {
    S.stm.blocked = true;
    emit();
    await sleep(800 * fast);
  });
  if (round === 1) {
    const a = await ask("K03");
    if (a.opt === "l") {
      S.stm.f3 = "limitation";
      emit();
      await sleep(600);
    }
  }
  closeStage(
    "S03",
    S.stm.f3 === "finding"
      ? "16 statements labelled; 2 kept as context; 1 implication blocked."
      : "16 statements labelled; Finding 3 now a limitation.",
  );
}
export const laneOf = (sp: (string | number)[]) => (sp[0] === "SP-10" && S.stm.f3 === "limitation" ? 4 : sp[2]);

/* ---------- S04 · the debate ---------- */
export const TURN_BY: Record<string, Turn> = Object.fromEntries(
  [...TURNS, ...TURNS_K04.q, ...TURNS_COUT].map((t) => [t.id, t]),
);
/** The turns heard so far. T38–T40 depend on how you settled the deadlock at K04. */
export const turnsShown = (): Turn[] =>
  S.db.turns.flatMap((id) => {
    const t = ["T38", "T39", "T40"].includes(id)
      ? TURNS_K04[S.db.k04 ?? "q"].find((x) => x.id === id)
      : (TURN_BY[id] ?? TURNS_RESTATE.find((x) => x.id === id));
    return t ? [t] : [];
  });
/** A turn of the debate: typed out in the thread while the speaker is heard in the narration. A turn heard again, after
 * claims were sent back, shows whole. */
export async function speakTurn(t: Turn, pace = 1) {
  if (t.st === "rule" && t.r && t.r !== "unresolved") log("jd", `${RULING[t.r].label} · ${t.tx}`);
  const typed = pace >= 0.7;
  if (typed) tell(t.a, t.tx);
  const done = item("db.turns", S.db.turns.length, {
    id: t.id,
    text: typed ? t.tx : "",
    value: t.th,
    actor: t.a,
    wait: (typed ? 0 : 520 + t.tx.length * 9) * pace,
    beat: typed ? 420 * pace : 0,
  });
  reveal(`[data-turn="${t.id}"]`, "center");
  await done;
}
export async function s04(round = 1) {
  openStage("S04");
  S.st.S04.round = round;
  S.db.round = round;
  const pace = round > 1 ? 0.3 : 1;
  if (round > 1) S.db.turns = [];
  const byThread = (th: string) => TURNS.filter((t) => t.th === th && t.st !== "propose");
  await step("S04", "v1", async () => {
    for (const t of TURNS.filter((x) => x.st === "propose")) await speakTurn(t, pace * 0.7);
  });
  await step("S04", "v2", async () => {
    for (const t of byThread("GAP")) await speakTurn(t, pace);
  });
  await step("S04", "v3", async () => {
    for (const t of [...byThread("F1"), ...byThread("F2")]) await speakTurn(t, pace);
  });
  await step("S04", "v4", async () => {
    for (const t of byThread("F3")) await speakTurn(t, pace);
  });
  await step("S04", "v5", async () => {
    for (const t of byThread("C")) await speakTurn(t, pace);
  });
  const a = round > 1 && S.db.k04 ? { opt: S.db.k04 } : await ask("K04");
  S.db.k04 = a.opt;
  S.tou.narrowed = true;
  for (const t of TURNS_K04[a.opt]) await speakTurn(t, pace);
  if (S.scn === "cout") for (const t of TURNS_COUT) await speakTurn(t, pace);
  await step("S04", "v6", async () => {
    for (let i = 1; i <= CLOSED_BY_RECORD.length; i++) {
      S.db.closed = i;
      emit();
      await sleep(160 * pace);
    }
    S.rules[4] = "pass";
  });
  closeStage(
    "S04",
    S.scn === "cout"
      ? "40 turns and 4 more: 12 challenges ruled, one counterexample upheld against the Conclusion."
      : "40 turns: 13 challenges ruled, 1 struck, 1 answer rejected, 1 deadlock settled by you.",
  );
}
/* the Conclusion, restated after scenario U8 and argued again */
export const TURNS_RESTATE: Turn[] = [
  {
    id: "T45",
    th: "C",
    a: "aa",
    st: "propose",
    tx: "Fusion finds more evidence than BM25 on QASPER; against dense retrieval the evidence is mixed.",
    g: [
      ["led", "F1"],
      ["src", "Lee et al., 2024 (example)"],
    ],
  },
  {
    id: "T46",
    th: "C",
    a: "ql",
    st: "concede",
    re: "T45",
    tx: "The counterexample is about dense retrieval, and the claim no longer says anything against it. Satisfied.",
    g: [["src", "Lee et al., 2024 (example)"]],
  },
  {
    id: "T47",
    th: "C",
    a: "jd",
    st: "rule",
    on: "T41",
    r: "conceded",
    tx: "Conceded. CA4 no longer applies to the restated Conclusion.",
    fx: "CA4 withdrawn · C restated",
  },
];

/* ---------- S05 · Toulmin ---------- */
export async function s05(round = 1) {
  openStage("S05");
  S.st.S05.round = round;
  const fast = round > 1 ? 0.35 : 1;
  await step("S05", "e1", async () => {
    const keys = ["F1", "F2", "F3", "C"];
    for (let i = 0; i < 4; i++) {
      S.tou.focus = keys[i];
      S.tou.cards = i + 1;
      for (let n = 1; n <= 6; n++) {
        const part = TOU_ORDER[n - 1];
        await item("tou.parts", n - 1, {
          id: `${keys[i]}:${part}`,
          value: keys[i],
          text: round === 1 ? touText(keys[i], part) : "",
          wait: 280 * fast,
        });
      }
      await sleep(320 * fast);
    }
  });
  await step("S05", "e2", async () => {
    S.tou.focus = "F3";
    S.tou.recon = true;
    emit();
    await sleep(1000 * fast);
    S.tou.focus = "C";
    S.tou.scope = true;
    emit();
    await sleep(900 * fast);
  });
  await step("S05", "e3", async () => {
    S.tou.tied = true;
    emit();
    await sleep(1100 * fast);
  });
  closeStage("S05", "Four claims in six parts each; every part tied to its ruling; two warrants reconstructed.");
}

/** The parts of a Toulmin card in the order they are written: data, so, claim; then what holds it up, and what would
 * undo it. */
export const TOU_ORDER = ["data", "qual", "claim", "war", "back", "reb"] as const;
function touText(k: string, part: (typeof TOU_ORDER)[number]) {
  const c = TOU[k];
  return part === "reb" ? c.reb.replace(/^Unless /, "") : c[part];
}

/* ---------- S06 · the AIF graph ---------- */
export const MAP_NODES = [
  "GAP",
  "RQ",
  "OBJ",
  "ASM",
  "H1",
  "H2",
  "H4",
  "F1",
  "F2",
  "F3",
  "C",
  "IMP",
  "X",
  "L1",
  "L2",
  "L3",
];
export const MAP_EVID = ["E1", "E2", "E3", "W1"];
export async function s06(round = 1) {
  openStage("S06");
  S.st.S06.round = round;
  const fast = round > 1 ? 0.3 : 1;
  S.map.frozen = false;
  await step("S06", "f1", async () => {
    S.map.n = [];
    for (const id of [...MAP_NODES, ...(S.scn === "cout" && !S.c.restated ? ["CX"] : [])]) {
      S.map.n.push(id);
      emit();
      await sleep(140 * fast);
    }
  });
  await step("S06", "f2", async () => {
    for (const id of MAP_EVID) {
      S.map.n.push(id);
      emit();
      await sleep(240 * fast);
    }
    for (const id of ["RA1", "RA2", "RA3", "RA4", "RA5", "RA6"]) {
      S.map.s.push(id);
      emit();
      await sleep(220 * fast);
    }
  });
  await step("S06", "f3", async () => {
    for (const id of ["CA1", "CA2", "CA3", "PA1", ...(S.scn === "cout" && !S.c.restated ? ["CA4"] : [])]) {
      S.map.s.push(id);
      emit();
      await sleep(360 * fast);
    }
  });
  await step("S06", "f4", async () => {
    S.map.removed = true;
    emit();
    await sleep(900 * fast);
  });
  await step("S06", "f5", async () => {
    S.map.ext = true;
    emit();
    await sleep(800 * fast);
  });
  closeStage("S06", "20 statements, 10 schemes; the inference with no premise removed.");
}

/* ---------- S07 · ASPIC+, then stop 2 ---------- */
/** Why a statement has its ASPIC+ label, in one line. */
export function aspWhy(id: string, l = S.asp.labels[id]) {
  const after = S.asp.phase >= 3 || S.asp.rerun;
  const W: Record<string, string> = {
    GAP: "The rebut from Bruch et al. failed at T07.",
    F1:
      l === "OUT"
        ? "The undercut CA1 from T15 stands: the interval is on the wrong unit."
        : after
          ? "CA1 answered: the interval by paper, 0.054–0.098, still excludes zero."
          : "",
    F2: "The rebuttal was conceded at T24; no attack stands.",
    F3: "Qualified as “no clear gain” at T30; no attack stands.",
    C:
      l === "UND"
        ? "CA4 from T44 and C defeat each other: no preference."
        : l === "OUT"
          ? "It rests on F1, which is OUT."
          : S.c.restated
            ? "Restated against BM25 only; CA4 no longer reaches it."
            : "Narrowed at K04; both premises IN.",
    IMP:
      l === "OUT"
        ? "It rests on the Conclusion."
        : l === "UND"
          ? "Follows the Conclusion."
          : "Proposed; it rests on the Conclusion.",
    H4: "Defeated by F3: PA1 prefers the evidence.",
    ASM: "Undermined: 23% of questions share a paper. No claim rests on it after the rerun.",
  };
  return W[id];
}

export const LABEL_ORDER = [
  "GAP",
  "H1",
  "H2",
  "H4",
  "ASM",
  "E1",
  "E2",
  "E3",
  "W1",
  "L1",
  "L2",
  "L3",
  "F2",
  "F3",
  "F1",
  "C",
  "IMP",
];
export function firstLabels() {
  const L: Record<string, string> = {
    GAP: "IN",
    H1: "IN",
    H2: "IN",
    H4: "OUT",
    ASM: "OUT",
    E1: "IN",
    E2: "IN",
    E3: "IN",
    W1: "IN",
    L1: "IN",
    L2: "IN",
    L3: "IN",
    F2: "IN",
    F3: "IN",
    F1: "OUT",
    C: "OUT",
    IMP: "OUT",
  };
  return L;
}
export async function s07(round = 1, lock = true) {
  openStage("S07");
  S.st.S07.round = round;
  const fast = round > 1 ? 0.35 : 1;
  S.map.checked = [];
  S.map.numbers = 0;
  S.map.tested = false;
  S.map.conf = false;
  S.asp = { labels: {}, phase: 0, rerun: S.asp.rerun && round > 1, answered: round > 1 ? S.asp.answered : [] };
  await step("S07", "g1", async () => {
    S.map.sweep = true;
    emit();
    const order = [...MAP_NODES, ...MAP_EVID].sort((a, b) => MN[a].x - MN[b].x || MN[a].y - MN[b].y);
    for (const id of order) {
      if (id === "X") continue;
      S.map.checked.push(id);
      emit();
      await sleep(110 * fast);
    }
    S.map.sweep = false;
    emit();
  });
  await step("S07", "g2", async () => {
    for (let i = 1; i <= 12; i++) {
      S.map.numbers = i;
      emit();
      await sleep(85 * fast);
    }
  });
  const answeredBefore = S.asp.rerun;
  const L = firstLabels();
  if (answeredBefore) Object.assign(L, { F1: "IN", C: "IN", IMP: "IN" });
  if (S.scn === "cout" && !S.c.restated) Object.assign(L, { C: "UND", IMP: "UND" });
  await step(
    "S07",
    "g3",
    async () => {
      S.asp.phase = 1;
      for (const [i, id] of LABEL_ORDER.entries()) {
        const value = answeredBefore || !["F1", "C", "IMP"].includes(id) ? L[id] : "OUT";
        await item("asp.labels", i, {
          id,
          value,
          text: round === 1 ? (aspWhy(id, value) ?? "") : "",
          wait: 150 * fast,
        });
      }
      S.map.tested = true;
      emit();
    },
    answeredBefore
      ? {
          text: S.c.restated
            ? "The restated Conclusion is IN: CA4 no longer reaches it. F1, F2 and F3 stay IN."
            : "Every claim is IN; the interval was already recomputed by paper.",
        }
      : {},
  );
  if (!answeredBefore)
    await step("S07", "g4", async () => {
      S.asp.phase = 2;
      emit();
      await sleep(1500 * fast);
      S.asp.rerun = true;
      S.asp.answered = ["CA1"];
      for (const [i, id] of ["F1", "C", "IMP"].entries()) {
        const value = S.scn === "cout" && id !== "F1" && !S.c.restated ? "UND" : "IN";
        await item("asp.labels", LABEL_ORDER.length + i, {
          id,
          value,
          text: aspWhy(id, value) ?? "",
          actor: "code",
          wait: 380 * fast,
        });
      }
      S.asp.phase = 3;
      S.rules[5] = "pass";
      emit();
    });
  else S.st.S07.done.push("g4");
  if (S.scn === "cout" && !S.c.restated && !S.c.hedged) {
    await sleep(500);
    const o = await incident("cout");
    if (o === "restate") {
      S.c.restated = true;
      await restateConclusion();
      return;
    }
    S.c.hedged = true;
    emit();
  }
  await step("S07", "g5", async () => {
    S.map.conf = true;
    emit();
    reveal("[data-conf]");
    await sleep(1000 * fast);
  });
  closeStage(
    "S07",
    S.c.hedged
      ? "Labelled under ASPIC+: F1–F3 IN; the Conclusion undecided, kept as an open question."
      : "Labelled under ASPIC+: one undercut answered from the traces; every claim IN.",
  );
  if (lock) await lockClaims();
}
/* U8: the Conclusion goes back to S03, is argued again on its own thread, redrawn and evaluated */
export async function restateConclusion() {
  await say(
    "or",
    "The Conclusion goes back to S03 and is restated against BM25 only. Only its thread is argued again.",
  );
  const round = S.st.S03.round + 1;
  for (const id of ["S03", "S04", "S05", "S06", "S07"])
    S.st[id] = { ...S.st[id], status: "pending", done: [], cur: null, round };
  S.map = {
    ...S.map,
    n: [],
    s: [],
    checked: [],
    numbers: 0,
    tested: false,
    conf: false,
    removed: false,
    ext: false,
    version: S.map.version + 1,
  };
  S.stm = { ...S.stm, arrived: 0, sorted: 0, status: false, links: false, blocked: false };
  S.tou = { ...S.tou, cards: 0, parts: {}, focus: null, recon: false, tied: false };
  emit();
  await s03(round);
  openStage("S04");
  S.st.S04.round = round;
  for (const t of TURNS_RESTATE) await speakTurn(t, 0.5);
  S.st.S04.done = STAGE.S04.steps.map((s) => s.id);
  closeStage("S04", "The restated Conclusion heard again: the counterexample no longer applies.");
  await s05(round);
  await s06(round);
  await s07(round);
}
/* Stop 2 can send claims back: the statements, the debate and the graph are rebuilt, then evaluated again. */
export async function lockClaims() {
  for (;;) {
    const a = await ask("G1");
    if (a.opt === "lock") {
      S.map.frozen = true;
      S.rules[0] = "pass";
      emit();
      return;
    }
    S.retries.G1 += 1;
    const picks = a.picks ?? [];
    S.map.back =
      picks.length && picks.length < 4
        ? ["F1", "F2", "F3", "C"].filter((k) => !picks.includes(k))
        : ["F1", "F2", "F3", "C"];
    await rebuildArgument(
      `Arguing ${S.map.back.length === 4 ? "every claim" : S.map.back.join(", ")} again, from the statements up.`,
    );
  }
}
export async function rebuildArgument(line: string) {
  const round = S.st.S03.round + 1;
  for (const id of ["S03", "S04", "S05", "S06", "S07"])
    S.st[id] = { status: "pending", done: [], cur: null, round, summary: "" };
  S.map = {
    ...S.map,
    n: [],
    s: [],
    checked: [],
    numbers: 0,
    tested: false,
    conf: false,
    removed: false,
    ext: false,
    version: S.map.version + 1,
  };
  S.stm = { ...S.stm, arrived: 0, sorted: 0, status: false, links: false, blocked: false };
  S.tou = { ...S.tou, cards: 0, parts: {}, focus: null, recon: false, tied: false, scope: false };
  emit();
  await say("or", line);
  await s03(round);
  await s04(round);
  await s05(round);
  await s06(round);
  /* stop 2 is asked again by the loop that sent the claims back */
  await s07(round, false);
  S.map.back = [];
}

/* ---------- S08 · the journal merge: the profile is built when the manuscript needs it ---------- */
/**
 * The manuscript reaches the journal and needs its profile. If it is not published yet, the profile run starts now: the
 * view moves to it and follows it to the end, then comes back to the journal step, where the merge streams on.
 */
export async function waitForProfile() {
  if (J.done || J.failed) return;
  const g = RUN.gen;
  S.jr.waiting = true;
  log("js", "IR Journal has no published profile yet. JFE-IRJ-v2 is built now.");
  emit();
  if (S.fast) await jPublishNow();
  else {
    await say("js", "IR Journal has no published profile yet. Building JFE-IRJ-v2 from its papers first.");
    if (g !== RUN.gen) throw STOP;
    setTrack("jfe");
    if (!J.started) {
      J.started = true;
      emit();
      await jmain();
    }
  }
  // Skipped ahead or started over meanwhile: the profile run that counts settles it. A manuscript run that was started
  // over meanwhile stops here.
  for (;;) {
    if (g !== RUN.gen) throw STOP;
    if (J.done || J.failed) break;
    await waitFor("profile");
  }
  S.jr.waiting = false;
  S.view = null;
  setTrack("asw");
  emit();
}
export async function s08(round = 1) {
  openStage("S08");
  S.st.S08.round = round;
  await waitForProfile();
  await step(
    "S08",
    "c0",
    async () => {
      if (J.failed) {
        await sleep(500);
        const o = await incident("nojfe");
        if (o === "stop")
          failRun("Stopped at S08: the journal profile could not be built, and you chose another journal.");
        S.jr.rulesOnly = true;
      }
      S.jr.loaded = true;
      emit();
      await sleep(700);
    },
    J.failed
      ? { text: "JFE-IRJ-v2 failed at J1: too few research articles. Only the publisher’s rules are available." }
      : {},
  );
  const j = S.jr;
  await step("S08", "c1", async () => {
    for (let i = 1; i <= JOURNAL_DIFF.length; i++)
      await item("jr.rules", i - 1, { text: JOURNAL_DIFF[i - 1].rule ?? "", wait: 180 });
  });
  await step(
    "S08",
    "c2",
    async () => {
      if (!j.rulesOnly)
        for (let i = 1; i <= JOURNAL_DIFF.length; i++)
          await item("jr.habits", i - 1, { text: JOURNAL_DIFF[i - 1].habit, wait: 180 });
      j.conflict = true;
      emit();
      await sleep(800);
    },
    j.rulesOnly ? { text: "No habits to separate: the contract is built from the rules alone." } : {},
  );
  await step("S08", "c3", async () => {
    reveal("[data-place]", "center");
    for (let i = 1; i <= PLACEMENT.length; i++) {
      const [, def, jfe, here] = PLACEMENT[i - 1];
      await item("jr.place", i - 1, { text: def + (j.rulesOnly ? "" : jfe) + here, wait: 230 });
    }
  });
  await step(
    "S08",
    "c4",
    async () => {
      reveal("[data-tmap]", "center");
      for (let i = 1; i <= TOUMAP.length; i++) {
        const [, habit, line] = TOUMAP[i - 1];
        await item("jr.tmap", i - 1, { text: (j.rulesOnly ? "" : habit) + line, wait: 260 });
      }
    },
    j.rulesOnly
      ? { text: "Without a profile, each Toulmin part follows the rules and the defaults of the fourth axis." }
      : {},
  );
  await step("S08", "c5", async () => {
    j.variants = true;
    emit();
    reveal("[data-budget]");
    await sleep(700);
    j.budgets = true;
    emit();
    await sleep(500);
    for (let i = 1; i <= SENTENCE_RULES.length; i++) {
      const [, v, kind] = SENTENCE_RULES[i - 1];
      await item("jr.sent", i - 1, { text: j.rulesOnly && kind !== "rule" ? "" : v, wait: 200 });
    }
  });
  const a = await ask("K08");
  if (a.opt === "other") {
    await say("js", "The brief names only IR Journal. Reading its rules again in case a newer version applies.");
    Object.assign(S.jr, {
      rules: 0,
      habits: 0,
      conflict: false,
      place: 0,
      tmap: 0,
      sent: 0,
      variants: false,
      budgets: false,
      lines: 0,
    });
    return s08(round + 1);
  }
  j.approved = true;
  await step("S08", "c6", async () => {
    j.shaped = true;
    emit();
    reveal("[data-contract]");
    await sleep(500);
    const lines = CONTRACT.filter(([, , kind]) => !j.rulesOnly || kind === "rule");
    for (const [i, [n, text]] of lines.entries()) await item("jr.lines", i, { id: n, text, wait: 160 });
  });
  closeStage(
    "S08",
    j.rulesOnly
      ? "Contract from the publisher’s rules alone; every statement type placed."
      : "Rules and habits merged; every statement type placed; one conflict settled by the rule.",
  );
}

/* ---------- S09–S10 · outline and contracts: the paper appears only now ---------- */
export async function s09(round = 1) {
  openStage("S09");
  S.st.S09.round = round;
  await step("S09", "h1", async () => {
    S.bp.page = true;
    emit();
    await sleep(700);
    for (let i = 1; i <= STORY.length; i++) {
      S.bp.story = i;
      emit();
      await sleep(220);
    }
  });
  await step("S09", "h2", async () => {
    for (let i = 1; i <= ALLOC.length; i++) {
      const [sec, sps] = ALLOC[i - 1];
      await sleep(520);
      S.bp.placed = i;
      emit();
    }
  });
  await step("S09", "h3", async () => {
    S.bp.moves = true;
    emit();
    await sleep(900);
  });
  await step("S09", "h4", async () => {
    S.bp.aligned = true;
    emit();
    await sleep(800);
  });
  const a = await ask("K09");
  if (a.opt === "re") {
    S.bp.alt = true;
    emit();
    await say(
      "rp",
      "Another order: Finding 2 first, because the spread effect is the more surprising result. The question still leads.",
    );
    await sleep(600);
    S.bp.alt = false;
    emit();
    await ask("K09");
  }
  closeStage("S09", "Storyline set; every frozen statement has a section.");
}
export async function s10() {
  openStage("S10");
  const ids = briefIds();
  await step(
    "S10",
    "i1",
    async () => {
      for (let i = 1; i <= ids.length; i++) {
        S.bp.briefs = i;
        emit();
        reveal(`[data-para="${ids[i - 1]}"]`);
        await sleep(80);
      }
    },
    { text: `${ids.length} paragraphs inside the word budgets, the abstract last.` },
  );
  await step("S10", "i2", async () => {
    S.bp.roles = true;
    emit();
    await sleep(900);
  });
  await step("S10", "i3", async () => {
    S.bp.blocked = true;
    emit();
    reveal('[data-para="RES-4"]', "center");
    await sleep(900);
  });
  await step("S10", "i4", async () => {
    S.bp.risk = true;
    emit();
    await sleep(1000);
  });
  closeStage("S10", "Every paragraph has a contract; 4.4 is blocked for lack of evidence.");
}

/* ---------- S11–S12 · drafting, then reading back ---------- */
export async function typePara(writer: string, id: string, pace = 1) {
  const p = PARAS.find((x) => x.id === id);
  if (!p?.s?.length) return;
  S.pp.writing[writer] = id;
  S.pp.typed[id] = 0;
  emit();
  reveal(`[data-para="${id}"]`, "center");
  const toks = paraTokens(p);
  /* a long paragraph streams in bigger pieces, so each takes about the same time on the page */
  const chars = toks.reduce((n, t) => n + (t.k === "t" || t.k === "r" ? tokLen(t) : 0), 0);
  const chunk = Math.max(3, Math.ceil(chars / 40));
  let unit = 0;
  for (const t of toks) {
    const len = tokLen(t);
    if (t.k === "n") {
      unit += 1;
      S.pp.typed[id] = unit;
      S.pp.used[t.e] = (S.pp.used[t.e] ?? 0) + 1;
      emit();
      await sleep(300);
      continue;
    }
    if (t.k === "c" || t.k === "lab") {
      unit += 1;
      S.pp.typed[id] = unit;
      emit();
      await sleep(60);
      continue;
    }
    let left = len;
    while (left > 0) {
      const n = Math.min(left, chunk);
      left -= n;
      unit += n;
      S.pp.typed[id] = unit;
      emit();
      await sleep(22 * pace);
    }
  }
  S.pp.typed[id] = Infinity;
  delete S.pp.writing[writer];
  emit();
  await sleep(200);
}
export async function writeMany(writer: string, ids: string[]) {
  for (const id of ids) await typePara(writer, id);
}
export const resultIds = () => secIds("RES");
export async function s11() {
  openStage("S11");
  await step("S11", "j1", async () => {
    S.rules[1] = "pass";
    await Promise.all([writeMany("mw", secIds("MET")), writeMany("rw", resultIds())]);
  });
  await step("S11", "j2", async () => {
    reveal('[data-para="TAB1"]', "center");
    for (let i = 1; i <= 6; i++) {
      S.pp.table = i;
      emit();
      await sleep(160);
    }
    S.pp.fig = true;
    emit();
    await sleep(900);
  });
  await step("S11", "j3", async () => {
    S.pp.rev.g1 = "fix";
    emit();
    reveal('[data-rev="g1"]', "center");
    await sleep(900);
  });
  await step("S11", "j4", async () => {
    S.rules[2] = "pass";
    reveal('[data-para="RES-4"]', "center");
    await sleep(700);
  });
  for (;;) {
    const a = await ask("G2");
    if (a.opt === "use") {
      if (a.words) S.g2 = { ...S.g2, ...a.words };
      if (S.ceil.expl) S.g2 = { ...S.g2, f1: "suggest", f2: "suggest" };
      break;
    }
    S.retries.G2 += 1;
    for (const id of secIds("RES")) delete S.pp.typed[id];
    S.pp.table = 0;
    S.pp.fig = false;
    S.pp.rev.g1 = undefined;
    emit();
    await say(
      "sw",
      "Section 4, Tables 1 and 2 and Figure 2 are erased. The analysis is checked again, then the Results writer starts over.",
    );
    await sleep(500);
    await writeMany("rw", resultIds());
    for (let i = 1; i <= 6; i++) {
      S.pp.table = i;
      emit();
      await sleep(120);
    }
    S.pp.fig = true;
    S.pp.rev.g1 = "fix";
    emit();
  }
  await step("S11", "j5", async () => {
    await Promise.all([
      writeMany("dw", secIds("DIS")),
      writeMany("mw", [...secIds("INT"), ...secIds("REL")]),
      writeMany("rw", secIds("CON")),
    ]);
  });
  await step("S11", "j6", async () => {
    await typePara("mw", "ABS");
  });
  closeStage("S11", "Draft 1: every number copied from the ledger; 4.4 left empty.");
}
export async function s12() {
  openStage("S12");
  await step("S12", "k1", async () => {
    S.rv.reading = true;
    emit();
    scrollTop();
    await sleep(2600);
    S.rv.reading = false;
    S.rv.rebuilt = true;
    emit();
  });
  await step("S12", "k2", async () => {
    const flags: [string, number][] = [
      ["drift", 1],
      ["sc", 2],
      ["om", 3],
      ["cd", 4],
      ["ten", 5],
    ];
    for (let i = 1; i <= DLT.length; i++) {
      S.rv.delta = i;
      emit();
      await sleep(240);
    }
    for (const [id, n] of flags) {
      S.pp.rev[id] = "flag";
      S.pp.flags[id] = n;
      emit();
      await sleep(260);
    }
  });
  await step("S12", "k3", async () => {
    reveal('[data-rev="drift"]', "center");
    await sleep(500);
    S.pp.rev.drift = "fix";
    S.rv.rolled = true;
    emit();
    await sleep(1400);
    S.pp.rev.drift = "final";
    emit();
  });
  await step("S12", "k4", async () => {
    for (const id of ["cd", "om", "ten"]) {
      S.pp.rev[id] = "fix";
      emit();
      reveal(`[data-rev="${id}"]`, "center");
      await sleep(700);
    }
    S.rv.fixed = true;
    emit();
  });
  reveal('[data-rev="sc"]', "center");
  const a = await ask("K12");
  if (a.opt === "k") {
    await rebuildArgument(
      "A new claim about the dense retriever is needed. Arguing it from the statements up, then stop 2 again.",
    );
    await lockClaims();
    openStage("S12");
    S.pp.rev.sc = "final-keep";
  } else S.pp.rev.sc = "fix";
  emit();
  await sleep(600);
  closeStage("S12", "Read back against graph v1: 1 rollback, 3 fixes, 1 wording settled.");
}

/* ---------- S13–S14 · journal fit, peer review ---------- */
export async function s13() {
  openStage("S13");
  const rulesOnly = S.jr.rulesOnly;
  await step(
    "S13",
    "l1",
    async () => {
      const n = rulesOnly ? FIT_RULES.length : FIT.length;
      for (let i = 1; i <= n; i++) {
        S.fit.rows = i;
        emit();
        await sleep(190);
      }
    },
    rulesOnly ? { text: "No profile, so no bands: the draft is checked against the publisher’s six rules." } : {},
  );
  await step(
    "S13",
    "l2",
    async () => {
      S.fit.moves = !rulesOnly;
      emit();
      await sleep(rulesOnly ? 400 : 900);
    },
    rulesOnly ? { text: "No move order to compare with: the profile was never built." } : {},
  );
  await step("S13", "l3", async () => {
    S.fit.edits = 1;
    S.pp.rev.rel = "fix";
    emit();
    reveal('[data-rev="rel"]', "center");
    await sleep(700);
    S.fit.edits = 2;
    S.pp.rev.dis = "fix";
    emit();
    reveal('[data-rev="dis"]', "center");
    await sleep(700);
    S.fit.edits = 3;
    S.pp.sig = "ins";
    emit();
    reveal("[data-sig]", "center");
    await sleep(900);
  });
  await step("S13", "l4", async () => {
    S.pp.sig = "rev";
    S.rules[6] = "hit";
    emit();
    await sleep(1300);
    S.pp.sig = null;
    S.rules[6] = "pass";
    emit();
  });
  await step(
    "S13",
    "l5",
    async () => {
      S.fit.exceptions = true;
      emit();
      await sleep(800);
    },
    rulesOnly ? { text: "No exceptions to list: without a profile there is no usual range." } : {},
  );
  closeStage(
    "S13",
    rulesOnly
      ? "Six rules pass; two style edits kept, one reverted."
      : "Two style edits kept, one reverted; two exceptions reported.",
  );
}
export async function s14() {
  openStage("S14");
  await step("S14", "m1", async () => {
    for (let i = 0; i < 7; i++) {
      S.rev.notes = i + 1;
      emit();
      await sleep(420);
    }
    for (let i = 1; i <= COMMENTS.length; i++) {
      S.pp.comments = i;
      emit();
      await sleep(180);
    }
  });
  await step("S14", "m2", async () => {
    S.rev.orig = true;
    emit();
    await sleep(900);
  });
  await step("S14", "m3", async () => {
    S.rev.disagree = true;
    emit();
    await sleep(1000);
  });
  const a = await ask("K14");
  S.rev.choice = a.opt;
  emit();
  await step("S14", "m4", async () => {
    for (let i = 1; i <= BACKLOG.length; i++) {
      S.rev.backlog = i;
      emit();
      await sleep(260);
    }
  });
  closeStage("S14", "Three reviews kept as written; five issues ranked and routed.");
}

/* ---------- S15–S16 · targeted revision, sign-off ---------- */
export const patchIds = () =>
  S.rev.choice === "e"
    ? ["k60", "orig", "absci"]
    : S.fix.reverted
      ? ["k60", "orig", "absci"]
      : ["strat", "om", "k60", "orig", "absci"];
export async function s15() {
  openStage("S15");
  const rerun = S.rev.choice !== "e";
  await step(
    "S15",
    "n1",
    async () => {
      S.fix.rerun = rerun;
      emit();
      await sleep(1200);
    },
    rerun ? {} : { actor: "re", text: "No rerun: you chose to keep the line in Limits. Section 4.2 stays as it was." },
  );
  if (rerun && S.scn === "cap") {
    for (let r = 1; r <= 3; r++) {
      S.fix.tries = r;
      emit();
      await say("re", `Round ${r}: patching 4.2. ${CAP_TRIES[r - 1][1]}.`);
      await sleep(600);
    }
    const o = await incident("cap");
    if (o === "revert") S.fix.reverted = true;
    else {
      S.fix.edited = true;
      await say(
        "rv",
        "Your sentence for 4.2 is read back once against the frozen graph: it says what F2 says, with the new interval. Pass.",
      );
    }
    emit();
  }
  const ids = patchIds();
  await step(
    "S15",
    "n2",
    async () => {
      for (let i = 0; i < ids.length; i++) {
        S.fix.patches = i + 1;
        S.pp.rev[ids[i]] = ids[i] === "om" ? "fix2" : "fix";
        emit();
        reveal(`[data-rev="${ids[i]}"]`, "center");
        await sleep(650);
      }
    },
    {
      text:
        ids.length === 5
          ? "Five patches across 4.2, 5.2, 3.1, 1.1 and the Abstract."
          : "Three patches across 3.1, 1.1 and the Abstract.",
    },
  );
  await step("S15", "n3", async () => {
    S.fix.sdiff = true;
    emit();
    await sleep(900);
  });
  await step("S15", "n4", async () => {
    for (let i = 1; i <= RERUNS.length; i++) {
      S.fix.reruns = i;
      emit();
      await sleep(320);
    }
  });
  await step("S15", "n5", async () => {
    S.fix.snap = true;
    S.pp.draft = 2;
    emit();
    await sleep(700);
  });
  closeStage(
    "S15",
    ids.length === 5
      ? "Five patches; a new analysis answers F2’s caveat; no claim moved."
      : "Three patches; no claim moved.",
  );
}
export async function s16() {
  openStage("S16");
  await step("S16", "o1", async () => {
    for (let i = 1; i <= CHECKS.length; i++) {
      S.so.checks = i;
      emit();
      await sleep(240);
    }
  });
  await step("S16", "o2", async () => {
    S.so.refs = true;
    emit();
    await sleep(800);
  });
  await step("S16", "o3", async () => {
    reveal("[data-ai]", "center");
    for (let i = 0; i <= DISCLOSURE.length; i += 5) {
      S.so.ai = i;
      emit();
      await sleep(18);
    }
    S.so.ai = DISCLOSURE.length;
    emit();
  });
  await step("S16", "o4", async () => {
    S.so.ledger = true;
    emit();
    await sleep(800);
  });
  for (;;) {
    const a = await ask("G3");
    if (a.opt === "sign") break;
    await blockedUntilResume(
      "Not signed. Nothing is marked submission-ready and export stays locked.",
      "Open stop 4 again",
    );
  }
  S.so.signed = true;
  S.rules[7] = "pass";
  for (const k of Object.keys(S.pp.rev)) {
    if (S.pp.rev[k] === "fix") S.pp.rev[k] = "final";
    if (S.pp.rev[k] === "fix2") S.pp.rev[k] = "final2";
  }
  S.pp.typeset = true;
  closeStage("S16", "Signed by you. The submission package is built; ASW never submits it.");
  S.lifecycle = "done";
  S.done = true;
  S.msg = null;
  log("or", "Run complete. The manuscript is submission-ready.");
  emit();
}

export async function main() {
  try {
    await s00();
    await s01();
    await s02();
    await s03();
    await s04();
    await s05();
    await s06();
    await s07();
    await s08();
    await s09();
    await s10();
    await s11();
    await s12();
    await s13();
    await s14();
    await s15();
    await s16();
  } catch (e) {
    if (e !== STOP) console.error(e);
  }
}

/* ---------- scenarios: the happy path, or one thing wrong ---------- */
/* The run restarts with the scenario; unless asked to start from the top, it replays silently to where it breaks. */
export function playScenario(key: string, skip = true) {
  cancelAll();
  const prev = S;
  S = freshState(prev);
  S.scn = key;
  for (const k in TOKS) delete TOKS[k];
  if (key === "nojfe") void jFailNow();
  else if (!J.done) {
    jcancel();
    J = jFresh();
  }
  if (skip && key !== "happy") {
    FF = SCN[key].stage;
    S.fast = true;
    QUIET = true;
  } else FF = null;
  TRACK = "asw";
  quiet();
  emit();
  scrollTop();
  void main();
}
export function restart() {
  playScenario(S.scn, false);
}

/* ---------- start ---------- */
/**
 * Starts the writing run for a research run: the manuscript run. The journal-profile run starts when the manuscript
 * reaches S08. Opening it again for the same research run keeps what is there; for another one, everything starts over.
 */
export function startWriting(runId: string, label: string) {
  if (HOST.runId === runId) return;
  cancelAll();
  jcancel();
  HOST.runId = runId;
  HOST.label = label;
  S = freshState(S);
  J = jFresh();
  FF = null;
  QUIET = false;
  TRACK = "asw";
  for (const k in TOKS) delete TOKS[k];
  emit();
  void main();
}
/* ---------- the preview: the writing stage on its own, without a research run ---------- */
export const PREVIEW_RUN_ID = "writing-preview";
export function openWritingPreview() {
  startWriting(PREVIEW_RUN_ID, "RUN-25CD");
  UI.preview = true;
  emit();
}
export function closeWritingPreview() {
  UI.preview = false;
  emit();
}
const previewOpen = () => UI.preview;
/** Whether the preview is on screen. */
export const useWritingPreviewOpen = () => useSyncExternalStore(subscribe, previewOpen, () => false);
const previewState = () => {
  if (HOST.runId !== PREVIEW_RUN_ID) return "idle";
  if (S.done) return "done";
  return S.gate || J.gate || S.lifecycle === "blocked" || J.lifecycle === "blocked" ? "waiting" : "live";
};
/** How far the preview has come: not started, playing, waiting for you, or signed. */
export const useWritingPreviewState = () => useSyncExternalStore(subscribe, previewState, () => "idle" as const);

/** The research run the writing run belongs to, if one was started. */
export const writingRunId = () => HOST.runId;

/* ===== JFE: the journal-profile run, with its own clock so it never disturbs the manuscript run ===== */

/* ---------- the profile run's own clock ---------- */
export const JR = { gen: 0, timers: new Set<Timer>(), waits: new Set<Wait>() };
export async function jsleep(ms: number): Promise<void> {
  const g = JR.gen;
  if (J.fast) {
    if (g !== JR.gen) throw STOP;
    return;
  }
  while (S.paused) await jwait("unpause");
  return new Promise<void>((res, rej) => {
    const w: Timer = { rej };
    w.t = setTimeout(() => {
      JR.timers.delete(w);
      g === JR.gen ? res() : rej(STOP);
    }, ms / S.speed);
    JR.timers.add(w);
  });
}
export function jwait<T = unknown>(kind: string) {
  const g = JR.gen;
  return new Promise<T>((res, rej) => {
    JR.waits.add({ kind, res: (v) => (g === JR.gen ? res(v as T) : rej(STOP)), rej });
  });
}
export function jsettle(kind: string, value?: unknown) {
  for (const w of [...JR.waits])
    if (w.kind === kind) {
      JR.waits.delete(w);
      w.res(value);
    }
}
export function jcancel() {
  JR.gen++;
  for (const w of JR.timers) {
    clearTimeout(w.t);
    w.rej(STOP);
  }
  for (const w of JR.waits) w.rej(STOP);
  JR.timers.clear();
  JR.waits.clear();
}

/* ---------- what the profile scenes can see ---------- */
export const jfollowing = () => TRACK === "jfe" && (!J.view || J.view === J.live);
export function jreveal(sel: string, block: ScrollLogicalPosition = "nearest") {
  if (!jfollowing() || J.fast || performance.now() - UI.userScrollAt < 2500) return;
  const el = q(sel);
  const box = q("#asw-scroller");
  if (!el || !box) return;
  const a = el.getBoundingClientRect();
  const b = box.getBoundingClientRect();
  if (a.top >= b.top + 40 && a.bottom <= b.bottom - 40) return;
  el.scrollIntoView({ block, behavior: RM() ? "auto" : "smooth" });
}
export const jflyIn = (from: string, to: string, label: string, tone?: string) => {
  if (jfollowing() && !J.fast) fly(from, to, label, tone);
};

/* ---------- narration, steps, stages ---------- */
export async function jsay(actor: string, text: string) {
  if (J.fast) {
    J.msg = { actor, text, done: true };
    return;
  }
  // Streamed as the manuscript run's narration is: two words at a time.
  const msg: Msg = { actor, text: "", done: false };
  J.msg = msg;
  emit();
  const words = text.split(/(?<= )/);
  for (let i = 0; i < words.length; i += 2) {
    msg.text += words.slice(i, i + 2).join("");
    emit();
    if (i + 2 < words.length) await jsleep(45);
  }
  msg.done = true;
  emit();
}
export function jlog(actor: string, text: string, kind = "event") {
  J.seq += 1;
  J.feed.push({ seq: J.seq, actor, text, kind, stage: J.stage });
}
export async function jstep(sid: string, id: string, body?: () => Promise<void>) {
  const st = J.st[sid];
  const def = JSTAGE[sid].steps.find((s) => s.id === id);
  const actor = def?.a ?? "or";
  const line = def?.x ?? "";
  st.cur = id;
  emit();
  const talk = jsay(actor, line);
  talk.catch(() => undefined); // a cancelled body leaves the narration unawaited
  if (body) await body();
  await talk;
  st.done = st.done.filter((x) => x !== id).concat(id);
  jlog(actor, line);
  emit();
  await jsleep(420);
  if (S.pauseEach && !J.fast) {
    J.holding = true;
    emit();
    await jwait("continue");
    J.holding = false;
    emit();
  }
}
export function jopen(sid: string) {
  J.stage = sid;
  const scr = JSCREEN_OF[sid];
  if (J.live !== scr) {
    J.live = scr;
    J.reached = Math.max(
      J.reached,
      JSCREENS.findIndex((s) => s.key === scr),
    );
    if (J.view === scr) J.view = null;
    if (!J.view && TRACK === "jfe") scrollTop();
  }
  J.st[sid].status = "running";
  J.st[sid].cur = null;
  emit();
}
export function jclose(sid: string, summary: string) {
  Object.assign(J.st[sid], { status: "done", cur: null, summary });
  emit();
}
export async function jask(id: string): Promise<Answer> {
  const d = JDEC[id];
  const sid = JSTOP_STAGE[id];
  const gate = id[1] === "G";
  J.st[sid].cur = id;
  const rec = d.opts.find((o) => o[3]) ?? d.opts[0];
  if (J.fast || (!gate && S.mode === "gates")) {
    const text = JDONE_TEXT[`${id}:${rec[0]}`];
    if (!J.fast) await jsay("or", `Quick check taken on the recommendation: ${rec[1]}.`);
    J.seq += 1;
    J.decisions.push({ seq: J.seq, actor: "or", text, stage: sid, id, auto: J.fast });
    J.feed.push({ seq: J.seq, actor: "or", text, kind: "decision", stage: sid });
    J.st[sid].done.push(id);
    emit();
    return { opt: rec[0] };
  }
  J.msg = { actor: "or", text: d.why, done: true };
  J.gate = { id };
  tellAway("jfe", d.title);
  J.sheetMin = false;
  J.lifecycle = "waiting";
  jlog("or", `Stopped for you: ${d.title}`);
  emit();
  const answer = await jwait<Answer>("answer");
  J.gate = null;
  J.lifecycle = "running";
  const text = JDONE_TEXT[`${id}:${answer.opt}`];
  J.seq += 1;
  J.decisions.push({ seq: J.seq, actor: "you", text, note: answer.note, stage: sid, id });
  J.feed.push({ seq: J.seq, actor: "you", text, kind: "decision", stage: sid });
  J.st[sid].done = J.st[sid].done.filter((x) => x !== id).concat(id);
  emit();
  await jsleep(300);
  return answer;
}
export async function jblocked(why: string, button: string) {
  J.lifecycle = "blocked";
  J.blocked = { why, button };
  emit();
  await jwait("resume");
  J.blocked = null;
  J.lifecycle = "running";
  emit();
}

/* ---------- J1 · corpus ---------- */
export async function jfe1() {
  jopen("J1");
  const phase = (n: number, ms: number) => async () => {
    J.cp.phase = n;
    emit();
    await jsleep(ms);
  };
  await jstep("J1", "p1", phase(1, 2300));
  await jstep("J1", "p2", phase(2, 2700));
  await jstep("J1", "p3", phase(3, 2000));
  if (J.failMode)
    return jfail(
      "Only 74 research articles of 2021–2026 pass the type, length and rights filters. A profile needs at least 150.",
    );
  await jstep("J1", "p4", async () => {
    J.cp.phase = 4;
    emit();
    jreveal("[data-wall]");
    await jsleep(2400);
  });
  await jstep("J1", "p5", phase(5, 2200));
  await jstep("J1", "p6", phase(6, 1700));
  J.rules[1] = "pass";
  jclose("J1", "223 papers and 102 controls kept; 25 dropped for rights, 65 held out.");
  for (;;) {
    const a = await jask("JG1");
    if (a.opt === "go") break;
    await jblocked("Held at stop 1. Nothing is parsed until a curator releases the corpus.", "Open stop 1 again");
  }
}

/* ---------- J2 · parsing ---------- */
export async function jfe2() {
  jopen("J2");
  await jstep("J2", "q1", async () => {
    for (let i = 25; i <= JPARSE_N; i += 25) {
      J.pr.fetched = Math.min(i, JPARSE_N);
      emit();
      await jsleep(70);
    }
  });
  await jstep("J2", "q2", async () => {
    for (let i = 1; i <= JPAGE.length; i++) {
      J.pr.page = i;
      emit();
      await jsleep(240);
    }
    for (let i = 1; i <= JTREE.length; i++) {
      J.pr.tree = i;
      emit();
      await jsleep(150);
    }
  });
  await jstep("J2", "q3", async () => {
    J.pr.strip = true;
    J.rules[2] = "pass";
    emit();
    await jsleep(1700);
  });
  await jstep("J2", "q4", async () => {
    jreveal("[data-headmap]");
    for (let i = 1; i <= JHEADMAP.length; i++) {
      J.pr.map = i;
      emit();
      jflyIn(
        `[data-hm-raw="${i - 1}"]`,
        `[data-hm-can="${i - 1}"]`,
        JHEADMAP[i - 1][1].join(" + "),
        "bg-sky-600 text-white",
      );
      await jsleep(380);
    }
  });
  await jstep("J2", "q5", async () => {
    jreveal("[data-queue]");
    for (let i = 13; i <= JPARSE_N; i += 13) {
      J.pr.queue = i;
      emit();
      await jsleep(70);
    }
    J.pr.failed = true;
    emit();
    await jsleep(500);
  });
  await jstep("J2", "q6", async () => {
    J.pr.audit = true;
    emit();
    await jsleep(1400);
  });
  jclose("J2", "308 papers read: 212 from IR Journal, 96 controls. 17 dropped, each with its reason.");
}

/* ---------- J3 · annotation and measurement ---------- */
export async function jfe3() {
  jopen("J3");
  await jstep("J3", "r1", async () => {
    for (let i = 1; i <= JINTRO.length; i++) {
      J.an.a = i;
      emit();
      await jsleep(620);
    }
  });
  await jstep("J3", "r2", async () => {
    for (let i = 1; i <= JINTRO.length; i++) {
      J.an.b = i;
      emit();
      await jsleep(300);
    }
  });
  await jstep("J3", "r3", async () => {
    jreveal("[data-alpha]");
    for (let i = 1; i <= JALPHA.length; i++) {
      J.an.alpha = i;
      emit();
      await jsleep(260);
    }
    J.an.disputed = true;
    emit();
    await jsleep(700);
  });
  const a = await jask("JK3");
  if (a.opt === "relabel") {
    await jsay(
      "an",
      "Guideline v1.3: a sentence that names a prior result and sets this paper against it is Compare, with Interpret as the second label.",
    );
    J.an.relabel = true;
  } else J.an.prov = true;
  emit();
  await jsleep(900);
  await jstep("J3", "r4", async () => {
    jreveal("[data-registry]");
    for (let i = 1; i <= JMEASURE_ORDER.length; i++) {
      J.an.reg = i;
      emit();
      await jsleep(48);
    }
    J.rules[4] = "pass";
    emit();
  });
  await jstep("J3", "r5", async () => {
    J.an.trail = true;
    emit();
    await jsleep(1500);
  });
  jclose(
    "J3",
    J.an.prov
      ? "Moves labelled; one Discussion move kept provisional. 64 features measured."
      : "Moves labelled and agreed. 64 features measured on 308 papers.",
  );
}

/* ---------- J4 · statistics ---------- */
export async function jfe4() {
  jopen("J4");
  await jstep("J4", "s1", async () => {
    J.az.swarm = true;
    emit();
    await jsleep(1700);
    J.az.violin = true;
    J.rules[0] = "pass";
    emit();
    await jsleep(900);
  });
  await jstep("J4", "s2", async () => {
    for (let c = 1; c <= 10; c++) {
      J.az.heat = c;
      emit();
      await jsleep(140);
    }
    J.az.order = true;
    emit();
    await jsleep(700);
  });
  await jstep("J4", "s3", async () => {
    jreveal("[data-forest]");
    for (let i = 1; i <= JFOREST.length; i++) {
      J.az.forest = i;
      emit();
      await jsleep(380);
    }
  });
  await jstep("J4", "s4", async () => {
    jreveal("[data-confound]");
    for (let i = 1; i <= JCONFOUND.length; i++) {
      J.az.conf = i;
      emit();
      await jsleep(700);
    }
  });
  J.rules[3] = "hit";
  emit();
  const a = await jask("JK4");
  J.az.abs = a.opt;
  J.rules[3] = "pass";
  emit();
  await jstep("J4", "s5", async () => {
    J.az.hold = true;
    emit();
    await jsleep(1400);
  });
  await jstep("J4", "s6", async () => {
    jreveal("[data-arch]");
    for (let i = 1; i <= JARCH.length; i++) {
      J.az.arch = i;
      emit();
      await jsleep(380);
    }
  });
  jclose("J4", "6 features validated as distinctive, 3 explained by other causes, 6 archetypes.");
}

/* ---------- J5 · review and publication ---------- */
export async function jfe5() {
  jopen("J5");
  await jstep("J5", "t1", async () => {
    J.pb.labels = true;
    emit();
    await jsleep(1300);
  });
  await jstep("J5", "t2", async () => {
    for (let i = 1; i <= 3; i++) {
      J.pb.rules = i;
      emit();
      await jsleep(600);
    }
  });
  await jstep("J5", "t3", async () => {
    jreveal("[data-recipes]");
    for (let i = 1; i <= JRECIPES.length; i++) {
      J.pb.recipes = i;
      emit();
      await jsleep(340);
    }
  });
  await jstep("J5", "t4", async () => {
    J.pb.diff = true;
    emit();
    jreveal("[data-diff]");
    await jsleep(1200);
  });
  for (;;) {
    const a = await jask("JG2");
    if (a.opt === "pub") break;
    await jblocked("Not published. The draft stays editable, and no writing run can use it.", "Open stop 2 again");
  }
  await jstep("J5", "t5", async () => {
    J.pb.frozen = true;
    J.rules[5] = "pass";
    emit();
    jreveal("[data-sheet]", "start");
    await jsleep(1500);
  });
  jclose("J5", "JFE-IRJ-v2 published and frozen.");
  J.lifecycle = "done";
  J.done = true;
  J.msg = null;
  if (jfollowing()) scrollTop();
  jlog("or", "Profile published. ASW-0412 reads it at S08.");
  emit();
  settle("profile");
}

export async function jmain() {
  try {
    await jfe1();
    await jfe2();
    await jfe3();
    await jfe4();
    await jfe5();
  } catch (e) {
    if (e !== STOP) console.error(e);
  }
}
export function jrestart() {
  jcancel();
  J = jFresh();
  quiet();
  emit();
  scrollTop();
  if (!S.jr.waiting) return;
  J.started = true;
  void jmain();
}
/* Skip ahead: replay the profile run with no waiting, every stop taken on the recommendation. */
export async function jPublishNow() {
  if (J.done) return;
  jcancel();
  J = jFresh();
  J.started = true;
  J.fast = true;
  QUIET = true;
  try {
    await jmain();
  } finally {
    J.fast = false;
    QUIET = Boolean(FF);
  }
  emit();
  settle("profile");
}
/* scenario U9: the profile run cannot find enough papers and stops at J1 */
export async function jFailNow() {
  jcancel();
  J = jFresh();
  J.started = true;
  J.failMode = true;
  J.fast = true;
  QUIET = true;
  try {
    await jmain();
  } finally {
    J.fast = false;
    QUIET = Boolean(FF);
  }
  emit();
}
export function jfail(text: string): never {
  J.failed = true;
  J.lifecycle = "failed";
  J.failure = text;
  J.msg = null;
  J.st[J.stage].status = "failed";
  jlog("or", `Profile run stopped. ${text}`);
  emit();
  settle("profile");
  throw STOP;
}

/* ===== the manuscript (paper-page): skeleton → briefs → typed text → tracked changes → typeset ===== */

/* sentences that exist only in some scenarios */
export const WHEN: Record<string, () => boolean> = {
  orphan: () => S.scn === "orphan" && S.rp.h3 === "named",
  notorphan: () => !WHEN.orphan(),
  late: () => S.ceil.expl,
  notlate: () => !S.ceil.expl,
  a4: () => S.rp.a4 !== "drop",
  a4drop: () => S.rp.a4 === "drop",
};

export const paraOn = (p: { when?: string }) => !p.when || WHEN[p.when]();

/* the paragraph's label in briefs and notes: its subsection, then its place in it */
export const paraLabel = (p: Para) => ((p.k ?? 1) > 1 ? `${p.n}·${p.k}` : (p.n ?? ""));

/* paragraphs that get a written brief at S10, in page order */
export const briefIds = () => PARAS.filter((p) => p.n !== undefined && paraOn(p)).map((p) => p.id);

/* Finding 3 moved to the limitations: all of 4.3 goes with it */
export const movedOut = (p: Para) => p.n === "4.3" && S.stm.f3 === "limitation";

/* the paragraphs one section's writer drafts, in order */
export const secIds = (k: string) =>
  PARAS.filter((p) => p.sec === k && p.s?.length && paraOn(p) && !movedOut(p)).map((p) => p.id);

export const ROLE_OF: Record<string, string> = {
  BG: "Background",
  GAP: "Gap",
  RQ: "Question",
  CTR: "Contribution",
  ROAD: "Roadmap",
  REL: "Prior work",
  M: "Method",
  F1: "Finding 1",
  F2: "Finding 2",
  F3: "Finding 3",
  C: "Claim",
  EXP: "Exploratory",
  LIM: "Limit",
  IMP: "Implication",
};

export const paraRoles = (p: Para) => [
  ...new Set(
    (p.s ?? [])
      .filter((x) => !x.when || WHEN[x.when]())
      .map((x) => ROLE_OF[x.p])
      .filter(Boolean),
  ),
];

export const paraWords = (p: Para) =>
  paraTokens(p).reduce(
    (n, t) =>
      n +
      (t.k === "t"
        ? t.t.split(/\s+/).filter(Boolean).length
        : t.k === "r"
          ? (t.t || "").split(/\s+/).filter(Boolean).length
          : t.k === "n" || t.k === "v"
            ? 1
            : 0),
    0,
  );

/** A piece of a paragraph as it is typed: a label, text, a number, a citation, a changing span, chosen wording. */
export type Tok =
  | { k: "lab"; t: string; si: number; key: string }
  | { k: "t"; t: string; si: number; key: string }
  | { k: "n"; n: string; e: string; id?: string; f?: string; si: number; key: string }
  | { k: "c"; c: number; si: number; key: string }
  | { k: "r"; id: string; t: string; f: string; g?: string; si: number; key: string }
  | { k: "v"; v: string; si: number; key: string };
export const TOKS: Record<string, Tok[]> = {};

export function paraTokens(p: Para): Tok[] {
  if (TOKS[p.id]) return TOKS[p.id];
  const out: Tok[] = [];
  (p.s ?? []).forEach((sen, si) => {
    if (sen.when && !WHEN[sen.when]()) return;
    if (sen.lab) out.push({ k: "lab", t: sen.lab, si, key: `${p.id}-${si}-lab` });
    sen.x.forEach((x, xi) => {
      const key = `${p.id}-${si}-${xi}`;
      if (typeof x === "string") out.push({ k: "t", t: x, si, key });
      else if ("n" in x) out.push({ k: "n", n: x.n, e: x.e, id: x.id, f: x.f, si, key });
      else if ("c" in x) out.push({ k: "c", c: x.c, si, key });
      else if ("r" in x) out.push({ k: "r", id: x.r, t: x.t, f: x.f, g: x.g, si, key });
      else out.push({ k: "v", v: x.v, si, key });
    });
  });
  TOKS[p.id] = out;
  return out;
}

export function tokLen(t: Tok) {
  if (t.k === "t") return t.t.length;
  if (t.k === "r") return t.t.length;
  if (t.k === "v") return S.g2[t.v].length;
  return 1;
}

export const SEC_OF: Record<string, [string, string, string, string]> = Object.fromEntries(
  SECTIONS.map((s) => [s[0], s]),
);

export const SEC_ORDER = ["ABS", "INT", "REL", "MET", "RES", "DIS", "CON"];

export const PARA_BY: Record<string, Para> = Object.fromEntries(PARAS.map((p) => [p.id, p]));

/** A run you are not looking at needs you: news that arrives on its own, so it shows bottom right. */
export function tellAway(run: "asw" | "jfe", title: string) {
  if (QUIET || (HOST.visible && TRACK === run)) return;
  toast.warning(`${run === "jfe" ? "JFE-IRJ-v2" : "ASW-0412"} needs you`, {
    description: title,
    position: "bottom-right",
    duration: 12_000,
    action: {
      label: "Review now",
      onClick: () => {
        setTrack(run);
        HOST.open?.();
      },
    },
  });
}

export function setTrack(t: "asw" | "jfe") {
  if (TRACK === t) return;
  quiet();
  TRACK = t;
  UI.detailsOpen = false;
  emit();
  scrollTop();
}

/* each check on a Toulmin card, and when it can be judged */
export const TOU_CHECKS: [string, (k: string) => boolean][] = [
  ["Data traces to the ledger", () => true],
  ["Warrant written in a source", (k) => !TOU[k].recon],
  ["Backing comes from an answered challenge", () => true],
  ["Qualifier fits the claim ceiling", (k) => !TOU[k].scope || S.tou.narrowed],
  ["Every upheld or conceded challenge is a rebuttal", () => true],
];
