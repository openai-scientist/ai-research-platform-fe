"use client";
"use no memo";

/* ===== S04 live · the debate, laid out as the research run's hypothesis debate is =====
   One pane: the seats, then the conversation thread by thread beside a summary of where each claim stands. A thread
   is a claim and its critical questions: each question is one exchange, settled from the record by code, or argued
   (the critic challenges, the Proponent replies, the Judge rules). On a narrow screen the two sides are tabs. Every
   position is read from a turn's stance, what it replies to and the Judge's rulings; nothing is inferred from tone. */

import { type CSSProperties, Fragment, type ReactNode, useRef, useState } from "react";

import { motion } from "motion/react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";

import { wordDiff } from "../../scenes/debate-positions";
import { DSTANCE, RULING } from "../data/debate";
import { S } from "../engine";
import { AgentCursor, afterPaint, cn, Icon, M, q, RM, Strike } from "../lib";
import { Typed } from "../scenes-gather";
import { RoleAvatar, roleText, seatName, YOU } from "./argue-kit";
import { entityOf, Named, named } from "./argue-statements";
import { streaming, WorkingHere } from "./kit";
import { Bars } from "./outline-kit";
import { callKey, file, fill, has, LIVE, newest, says, statement } from "./run";
import { StatusPill, TONE, type Tone } from "./stage-kit";
import {
  type BarRow,
  Legend,
  type Part,
  Section,
  StageAccent,
  StatusStrip,
  SubHead,
  SWATCH,
  type Swatch,
  TailToggle,
  Takeaway,
  useAccent,
} from "./stage-visual";
import { Term } from "./term";
import type { DebateClaim, DebateRecordFile } from "./types";

/* ---------- the debate as turns: a claim, then each exchange's challenge, reply and ruling ---------- */
/** The list the player fills, one turn at a time. */
export const TURNS = "live.db.turns";
/** The turns typed out as they are heard; the rest show whole. */
export const TURNS_TYPED = new Set<string>();
/** The turns heard so far, as the player streams them; a finished stage shows every turn. */
export const HEARD = new Set<string>();

/* The debate as the engine writes it: a draft after the record pass and after each critic, reply and judge call, then
   the final record. The screen reads the newest of the two; a run that writes no draft has the final record only. */
export const DRAFT = "DebateRecordDraft.json" as const;
export const FINAL = "DebateRecord.json" as const;
export const debateSource = (): DebateRecordFile | undefined => {
  const n = newest(DRAFT, FINAL);
  if (n === DRAFT) return file(DRAFT);
  return n === FINAL ? file(FINAL) : undefined;
};
/** The draft is the newest: the debate is still being argued. */
export const drafting = () => newest(DRAFT, FINAL) === DRAFT;

export interface LiveTurn {
  id: string;
  /** the claim (thread) it belongs to */
  th: string;
  a: string;
  st: "propose" | "challenge" | "reply" | "defend" | "concede" | "rule" | "record";
  tx: string;
  /** the critical question its exchange asks */
  q?: string;
  /** whose question it is (a critic's key), for a question the record answers */
  of?: string;
  g?: string[];
  re?: string;
  on?: string;
  r?: string;
  qual?: string;
  round?: number;
  by?: string;
}
/** The seat of each critic; in a guided run, you raise objections of your own, argued like a critic's. */
export const CRITIC_AGENT: Record<string, string> = {
  method: "qm",
  statistics: "qs",
  scope: "qx",
  sources: "qo",
  researcher: YOU,
};
const CLAIM_ORDER = ["gap", "finding", "conclusion", "implication", "comparison"];

/** A claim as it was argued: the registry's wording, its numbers filled. */
export function stated(id: string) {
  const s = file("StatementRegistry.json")?.statements.find((x) => x.statement_id === id);
  return s ? fill(s.text) : says(id);
}
const typeOf = (id: string) =>
  file("StatementRegistry.json")?.statements.find((x) => x.statement_id === id)?.type ?? statement(id)?.type ?? "";
/** The claims in the order the lifecycle reads them: the gap, the findings, the conclusions, the implications. */
export function claimsInOrder(): DebateClaim[] {
  // Before the record is in, the claims are the registry's: every gap, finding, conclusion and implication that is
  // neither blocked nor deferred. Their schemes come with the record.
  const claims =
    debateSource()?.claims ??
    (file("StatementRegistry.json")?.statements ?? [])
      .filter((s) => CLAIM_ORDER.includes(s.type) && s.status !== "blocked" && s.status !== "deferred")
      .map((s) => ({ claim_id: s.statement_id, scheme: "", scheme_name: "" }));
  const rank = (c: DebateClaim) => {
    const i = CLAIM_ORDER.indexOf(typeOf(c.claim_id));
    return i < 0 ? CLAIM_ORDER.length : i;
  };
  return [...claims].sort((a, b) => rank(a) - rank(b) || claims.indexOf(a) - claims.indexOf(b));
}
/** Every turn of the debate, in the order it is heard: the claims first, then thread by thread. */
export function debateTurns(): LiveTurn[] {
  const rec = debateSource();
  if (!rec) return [];
  const claims = claimsInOrder();
  const turns: LiveTurn[] = claims.map((c) => {
    const s = statement(c.claim_id);
    return {
      id: `${c.claim_id}:claim`,
      th: c.claim_id,
      a: "aa",
      st: "propose",
      tx: stated(c.claim_id),
      g: [...(s?.keys ?? []), ...(s?.sources ?? [])],
    };
  });
  for (const c of claims) {
    const root = `${c.claim_id}:claim`;
    for (const x of rec.exchanges.filter((e) => e.claim_id === c.claim_id)) {
      const base = { th: c.claim_id, q: x.question };
      if (x.by === "record") {
        turns.push({
          ...base,
          id: `${x.exchange_id}:record`,
          a: "code",
          st: "record",
          tx: fill(x.ruling),
          of: CRITIC_AGENT[x.critic],
          g: x.reply_grounds,
          re: root,
          r: x.outcome,
          qual: x.qualifier,
        });
        continue;
      }
      const challenge = `${x.exchange_id}:challenge`;
      if (x.challenge)
        turns.push({
          ...base,
          id: challenge,
          a: CRITIC_AGENT[x.critic] ?? "qm",
          st: "challenge",
          tx: fill(x.challenge),
          g: x.challenge_grounds,
          re: root,
        });
      if (x.reply)
        turns.push({
          th: c.claim_id,
          id: `${x.exchange_id}:reply`,
          a: "aa",
          st: x.outcome === "conceded" ? "concede" : x.outcome ? "defend" : "reply",
          tx: fill(x.reply),
          g: x.reply_grounds,
          re: x.challenge ? challenge : root,
          round: x.rounds,
        });
      if (x.ruling && x.outcome)
        turns.push({
          th: c.claim_id,
          id: `${x.exchange_id}:ruling`,
          a: "jd",
          st: "rule",
          tx: fill(x.ruling),
          on: x.challenge ? challenge : root,
          r: x.outcome,
          qual: x.qualifier,
          by: x.by,
        });
    }
  }
  return turns;
}

/* ---------- stances, outcomes, positions ---------- */
/* A stance is who says what, not a verdict: its chip is neutral. Only an outcome takes a colour, in the one meaning of the
   screens: green it holds, amber it narrows the claim, red it stands against it, grey it does not count. */
const NEUTRAL = "bg-muted text-foreground/80";
const STANCE: Record<string, { label: string; icon: string; c: string }> = Object.fromEntries(
  Object.entries({
    ...DSTANCE,
    reply: { label: "Replies", icon: "msg" },
    record: { label: "From the record", icon: "fileCheck" },
  }).map(([k, v]) => [k, { label: v.label, icon: v.icon, c: NEUTRAL }]),
);
const STANCE_ORDER = ["propose", "challenge", "reply", "defend", "concede", "rule", "record"];
/** The Proponent's replies, before and after the Judge rules on them. */
const REPLY_STANCES = new Set(["reply", "defend", "concede"]);
const TALLY_NOUN: Record<string, string> = {
  propose: "claims stated",
  challenge: "challenges",
  reply: "replies awaiting a ruling",
  defend: "replies that defend",
  concede: "replies that concede",
  rule: "rulings",
  record: "answered from the record",
};
/* What an exchange came to: the Judge's ruling, or the record's answer. */
const OUTCOME: Record<string, { label: string; tone: Tone }> = {
  answered: { label: RULING.answered.label, tone: "ok" },
  conceded: { label: RULING.conceded.label, tone: "look" },
  upheld: { label: RULING.upheld.label, tone: "bad" },
  struck: { label: RULING.struck.label, tone: "none" },
  closed_from_record: { label: "Settled from the record", tone: "ok" },
  undecided: { label: "Undecided", tone: "look" },
};
const outcomeOf = (r: string | undefined) => OUTCOME[r ?? ""] ?? OUTCOME.answered;

export function threadState(th: string, turns: LiveTurn[]) {
  const mine = turns.filter((t) => t.th === th);
  const rulings = mine.filter((t) => t.st === "rule");
  // One root per exchange: the critic's challenge, or the record's answer.
  const roots = mine.filter((t) => t.st === "challenge" || t.st === "record");
  const outcomes = roots.map((c) => (c.st === "record" ? c.r : rulings.find((r) => r.on === c.id)?.r) ?? "open");
  // An exchange the record already holds but the screen has not heard yet is still open, not settled.
  if (mine.length) {
    const heard = new Set(roots.map((r) => r.id.replace(/:(challenge|record)$/, "")));
    for (const x of debateSource()?.exchanges ?? [])
      if (x.claim_id === th && (x.by === "record" || x.challenge) && !heard.has(x.exchange_id)) outcomes.push("open");
  }
  let status = "held";
  if (!mine.length) status = "pending";
  else if (outcomes.includes("undecided")) status = "deadlock";
  else if (outcomes.includes("upheld")) status = "upheld";
  else if (outcomes.includes("open")) status = "argued";
  else if (!roots.length) status = "proposed";
  else if (outcomes.includes("conceded")) status = "conceded";
  return { mine, rulings, roots, outcomes, status };
}
type ThreadState = ReturnType<typeof threadState>;
const THREAD_STATUS: Record<string, { label: string; tone: Tone }> = {
  pending: { label: "Waiting", tone: "none" },
  proposed: { label: "Stated", tone: "none" },
  argued: { label: "Being argued", tone: "none" },
  deadlock: { label: "Deadlock · you decide", tone: "look" },
  upheld: { label: "Objection upheld", tone: "bad" },
  conceded: { label: "Stands, narrowed", tone: "ok" },
  held: { label: "Stands", tone: "ok" },
};
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
/** One line under a claim's status saying what it rests on. */
function statusLine(ts: ThreadState) {
  const n = (r: string) => ts.outcomes.filter((x) => x === r).length;
  const record = n("closed_from_record") ? `, ${n("closed_from_record")} settled from the record` : "";
  switch (ts.status) {
    case "pending":
      return "Not stated yet";
    case "proposed":
      return "Stated; no critical question asked yet";
    case "argued":
      return `${plural(n("open"), "critical question")} still open`;
    case "deadlock":
      return "The Judge could not rule: you settle it";
    case "upheld":
      return `${plural(n("upheld"), "objection")} upheld: it cannot stand as written`;
    case "conceded":
      return `${plural(n("conceded"), "caveat")} kept, so the claim is narrowed${record}`;
    default:
      return `Stands on ${plural(ts.roots.length, "critical question")}${record}${n("struck") ? `, ${n("struck")} struck` : ""}`;
  }
}
function ThreadPill({ status }: { status: string }) {
  const meta = THREAD_STATUS[status];
  return <StatusPill tone={meta.tone}>{meta.label}</StatusPill>;
}
/** The claim as argued and as worded for the lock: removed words struck, words the concessions added marked amber. */
function Rewrite({ before, after }: { before: string; after: string }) {
  const parts = wordDiff(before, after);
  return (
    <span className="block text-pretty">
      {parts ? (
        parts.map((p, i) => {
          const key = `${i}-${p.kind}`;
          if (p.kind === "same") return <span key={key}>{p.text} </span>;
          if (p.kind === "del")
            return (
              <span key={key}>
                <Strike className="text-muted-foreground">{p.text}</Strike>{" "}
              </span>
            );
          return (
            <span key={key}>
              <span className="rounded-sm bg-amber-500/15 px-0.5 text-amber-900 dark:text-amber-100">
                {p.text}
              </span>{" "}
            </span>
          );
        })
      ) : (
        <span className="flex flex-col gap-1">
          <Strike className="text-muted-foreground">{before}</Strike>
          <span>{after}</span>
        </span>
      )}
    </span>
  );
}
/** Critical questions of a claim that are closed: by a ruling, or from the record. */
function cqClosed(th: string, ts: ThreadState) {
  const all = debateSource()?.exchanges.filter((x) => x.claim_id === th).length ?? 0;
  return [ts.outcomes.filter((o) => o !== "open" && o !== "undecided").length, all];
}
/* ---------- grounds: what a turn rests on, each id with the words it stands for ---------- */
interface Ground {
  kind: string;
  /** a few words on the chip */
  short: string;
  /** everything the run holds about it */
  title: string;
  body: string;
}
const GROUND_KIND: Record<string, { n: string; icon: string }> = {
  statement: { n: "Statement", icon: "quote" },
  ledger: { n: "Evidence ledger", icon: "table" },
  check: { n: "Assumption check", icon: "shield" },
  deviation: { n: "Deviation from the plan", icon: "alert" },
  flag: { n: "Flag in the record", icon: "flag" },
  lock: { n: "Protocol lock", icon: "lock" },
  source: { n: "Source", icon: "book" },
  record: { n: "The record", icon: "file" },
};
function groundOf(id: string): Ground {
  const s = statement(id);
  if (s) {
    const ent = entityOf(s.type);
    return { kind: "statement", short: ent.name, title: `${ent.name} ${id}`, body: fill(s.text) };
  }
  const v = file("EvidenceLedger.json")?.ledger.find((x) => x.key === id);
  if (v) return { kind: "ledger", short: v.printed, title: `${id} = ${v.printed}`, body: v.label };
  const erp = file("experiment_result.json");
  const check = erp?.results.checks.find((c) => c.check_id === id);
  if (check)
    return {
      kind: "check",
      short: `${check.assumption.replace(/\.$/, "")}: ${check.status.replace("_", " ")}`,
      title: `Assumption check ${id} · ${check.analysis_id}`,
      body: `${check.assumption}: ${check.status.replace("_", " ")}. ${check.evidence}`,
    };
  const dev = erp?.protocol.deviations.find((d) => d.deviation_id === id);
  const planned = file("DataReport.json")?.plan_vs_runs.deviations.find((d) => d.deviation_id === id);
  if (dev || planned) {
    const p = dev ?? planned;
    return {
      kind: "deviation",
      short: `planned ${p?.planned}, ran ${p?.ran}`,
      title: `Deviation ${id}`,
      body: [dev?.description, `Planned ${p?.planned}; ran ${p?.ran}.`, dev?.remediation].filter(Boolean).join(" "),
    };
  }
  const flag = erp?.results.flags.find((f) => f.flag_id === id);
  if (flag) return { kind: "flag", short: flag.severity, title: `Flag ${id}`, body: flag.rationale };
  if (id === "lock") {
    const lock = file("IntakeChecks.json")?.checks.find((c) => c.check_id === "lock");
    return {
      kind: "lock",
      short: "locked before the first run",
      title: "The protocol lock",
      body: lock ? `${lock.text}: ${lock.evidence}.` : "The protocol was locked before the first run.",
    };
  }
  const ref = file("EvidenceLedger.json")?.references.find((r) => r.key === id);
  if (ref) return { kind: "source", short: "", title: id, body: ref.title };
  return { kind: "record", short: "", title: id, body: "" };
}
function GroundChip({ id }: { id: string }) {
  const g = groundOf(id);
  const kind = GROUND_KIND[g.kind];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex max-w-full flex-wrap items-baseline gap-x-1 rounded-md px-1.5 py-px text-left text-xs leading-snug hover:bg-muted/70",
            NEUTRAL,
          )}
        >
          <Icon n={kind.icon} className="size-3 shrink-0 translate-y-0.5 text-muted-foreground" />
          <span className="font-medium font-mono">{id}</span>
          {g.short && <span className="min-w-0 opacity-80">{g.short}</span>}
        </button>
      </PopoverTrigger>
      {g.body && (
        <PopoverContent align="start" className="w-80 text-xs">
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Icon n={kind.icon} className="size-3" />
            {kind.n}
          </span>
          <b className="font-mono font-semibold text-[12px]">{g.title}</b>
          <p className="leading-snug">{g.body}</p>
        </PopoverContent>
      )}
    </Popover>
  );
}
function Grounds({ g, need }: { g: string[]; need: boolean }) {
  const ids = [...new Set(g)];
  if (!ids.length)
    return need ? <span className="block text-destructive text-xs">No ground given, so it is struck</span> : null;
  return (
    <span className="mt-1.5 flex flex-wrap items-center gap-1">
      <span className="mr-0.5 text-[11px] text-muted-foreground">Rests on</span>
      {ids.map((id) => (
        <GroundChip key={id} id={id} />
      ))}
    </span>
  );
}

/* ---------- the conversation ---------- */
/** A reply that stands on exactly the grounds of the challenge it answers. */
function sameGrounds(t: LiveTurn, parent: LiveTurn | undefined) {
  if (!parent || parent.st !== "challenge" || !t.g?.length || !parent.g?.length) return false;
  const a = new Set(t.g);
  const b = new Set(parent.g);
  return a.size === b.size && [...a].every((x) => b.has(x));
}
/** How deep a turn sits: a reply to a reply is indented twice; a ruling sits under what it rules on. */
function depthOf(t: LiveTurn, byId: Record<string, LiveTurn>) {
  let depth = 0;
  let at: LiveTurn | undefined = t;
  while (at && depth < 2) {
    const up: string | undefined = at.re ?? at.on;
    const parent: LiveTurn | undefined = up ? byId[up] : undefined;
    if (!parent) break;
    depth += 1;
    at = parent;
  }
  return depth;
}
/** The replies a turn drew, one chip per stance, with who gave them. */
function Reactions({ replies }: { replies: LiveTurn[] }) {
  if (!replies.length) return null;
  const groups = STANCE_ORDER.map((st) => ({
    st,
    agents: [...new Set(replies.filter((r) => r.st === st).map((r) => r.a))],
    n: replies.filter((r) => r.st === st).length,
  })).filter((g) => g.agents.length);
  return (
    <span className="mt-1.5 flex flex-wrap gap-1.5">
      {groups.map(({ st, agents, n }) => (
        <M
          as="span"
          key={st}
          in="fade"
          title={`${agents.map(seatName).join(" and ")}: ${STANCE[st].label.toLowerCase()}`}
          className={cn(
            "inline-flex h-6 items-center gap-1.5 rounded-full py-0.5 pr-1 pl-2 font-medium text-[11px]",
            STANCE[st].c,
          )}
        >
          <Icon n={STANCE[st].icon} className="size-3" />
          <span className="font-mono tabular-nums">{n}</span>
          <span className="flex -space-x-1.5">
            {agents.map((a) => (
              <span key={a} className="inline-flex rounded-full ring-2 ring-card">
                <RoleAvatar a={a} size="sm" />
              </span>
            ))}
          </span>
        </M>
      ))}
    </span>
  );
}
/** An exchange the record settled: the critic's question, and the record's answer in full. */
function RecordRow({ t, fresh }: { t: LiveTurn; fresh: boolean }) {
  const meta = outcomeOf(t.r);
  return (
    <M
      as="li"
      in="fade"
      dur={350}
      data-turn={t.id}
      data-cursor={`turn:${t.id}`}
      className="relative ml-6 grid grid-cols-[28px_minmax(0,1fr)] gap-2.5"
    >
      <span
        aria-hidden="true"
        className="absolute -top-2 -left-4 h-5 w-3 rounded-bl-md border-foreground/15 border-b border-l"
      />
      {fresh && (
        <span
          aria-hidden="true"
          className="flash pointer-events-none absolute -inset-x-1.5 -inset-y-1 rounded-xl bg-sky-500/10 ring-1 ring-sky-500/30"
        />
      )}
      <RoleAvatar a="code" />
      <div className="min-w-0">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
          <b className="font-semibold text-muted-foreground">The record</b>
          <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
          <span className="text-muted-foreground">on the {seatName(t.of ?? "qm")}’s question</span>
        </span>
        {t.q && (
          <p className="mt-0.5 flex max-w-[78ch] items-start gap-1.5 text-muted-foreground text-xs leading-snug">
            <Icon n="list" className="mt-px size-3" />
            <span>
              <b className="font-medium text-foreground/80">
                <Term t="critical question">Critical question</Term>:{" "}
              </b>
              {t.q}
            </span>
          </p>
        )}
        <p className="mt-0.5 max-w-[78ch] text-sm leading-snug">
          <Typed text={t.tx} on={streaming(TURNS, t.id) && TURNS_TYPED.has(t.id)} />
        </p>
        {t.qual && (
          <p className="mt-1 max-w-[78ch] text-muted-foreground text-xs leading-snug">
            <b className="font-medium text-foreground/80">
              <Term t="qualifier">Qualifier</Term> kept:{" "}
            </b>
            {fill(t.qual)}
          </p>
        )}
        <Grounds g={t.g ?? []} need={false} />
      </div>
    </M>
  );
}
function TurnRow({
  t,
  byId,
  replies,
  fresh,
}: {
  t: LiveTurn;
  byId: Record<string, LiveTurn>;
  replies: LiveTurn[];
  fresh: boolean;
}) {
  if (t.st === "record") return <RecordRow t={t} fresh={fresh} />;
  const depth = depthOf(t, byId);
  const parent = t.re ? byId[t.re] : t.on ? byId[t.on] : undefined;
  const ruled = t.st === "rule" ? outcomeOf(t.r) : null;
  const stance = STANCE[t.st];
  let to = "";
  if (parent && t.st === "rule")
    to = `on ${parent.a === YOU ? "your" : `the ${seatName(parent.a)}’s`} ${parent.st === "challenge" ? "challenge" : "claim"}`;
  else if (parent) to = `replying to ${parent.a === YOU ? "you" : `the ${seatName(parent.a)}`}`;
  return (
    <M
      as="li"
      in="fade"
      dur={350}
      data-turn={t.id}
      data-cursor={`turn:${t.id}`}
      className={cn(
        "relative grid grid-cols-[28px_minmax(0,1fr)] gap-2.5",
        depth === 1 && "ml-6",
        depth === 2 && "ml-12",
      )}
    >
      {depth > 0 && (
        <span
          aria-hidden="true"
          className="absolute -top-2 -left-4 h-5 w-3 rounded-bl-md border-foreground/15 border-b border-l"
        />
      )}
      {fresh && (
        <span
          aria-hidden="true"
          className="flash pointer-events-none absolute -inset-x-1.5 -inset-y-1 rounded-xl bg-sky-500/10 ring-1 ring-sky-500/30"
        />
      )}
      <RoleAvatar a={t.a} />
      <div className="min-w-0">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
          <b className={cn("font-semibold", roleText(t.a))}>{seatName(t.a)}</b>
          {ruled ? (
            <StatusPill tone={ruled.tone}>{ruled.label}</StatusPill>
          ) : (
            <span
              className={cn("inline-flex h-5 items-center gap-1 rounded-md px-1.5 font-medium text-[11.5px]", stance.c)}
            >
              <Icon n={stance.icon} className="size-3" />
              {t.a === YOU && t.st === "challenge" ? "Objects" : stance.label}
            </span>
          )}
          {Boolean(t.round && t.round > 1) && (
            <span className="inline-flex h-5 items-center rounded-md bg-muted px-1.5 font-medium text-[11px] text-muted-foreground">
              Round {t.round}
            </span>
          )}
          {to && <span className="text-muted-foreground">{to}</span>}
        </span>
        {t.q && (
          <p className="mt-0.5 flex max-w-[78ch] items-start gap-1.5 text-muted-foreground text-xs leading-snug">
            <Icon n="list" className="mt-px size-3" />
            <span>
              <b className="font-medium text-foreground/80">
                <Term t="critical question">Critical question</Term>:{" "}
              </b>
              {t.q}
            </span>
          </p>
        )}
        <p className="mt-0.5 max-w-[78ch] text-sm leading-snug">
          <Typed text={t.tx} on={streaming(TURNS, t.id) && TURNS_TYPED.has(t.id)} />
        </p>
        {t.qual && (
          <p className="mt-1 max-w-[78ch] text-muted-foreground text-xs leading-snug">
            <b className="font-medium text-foreground/80">
              <Term t="qualifier">Qualifier</Term> kept:{" "}
            </b>
            {fill(t.qual)}
          </p>
        )}
        {t.by === "researcher" && (
          <p className="mt-1 text-amber-800 text-xs dark:text-amber-300">
            <b className="font-medium">Settled by you </b>after the Judge could not rule.
          </p>
        )}
        {t.st !== "rule" &&
          (sameGrounds(t, parent) ? (
            <p className="mt-1 text-[11px] text-muted-foreground">Rests on the same grounds as the challenge</p>
          ) : (
            <Grounds g={t.g ?? []} need={t.st === "challenge"} />
          ))}
        <Reactions replies={replies} />
      </div>
    </M>
  );
}
/** A thread's turns before they are heard: the claim, and a challenge under it, in grey. */
function SkeletonTurns({ pulse }: { pulse: boolean }) {
  const line = cn("rounded-full", !pulse && "animate-none");
  return (
    <>
      <li aria-hidden="true" className="grid grid-cols-[28px_minmax(0,1fr)] gap-2.5">
        <span className="size-7 rounded-full bg-muted" />
        <span className="flex min-w-0 flex-col gap-2 pt-1">
          <Skeleton className={cn("h-2 w-1/4", line)} />
          <Skeleton className={cn("h-2.5", line)} />
          <Skeleton className={cn("h-2.5 w-3/5", line)} />
        </span>
      </li>
      <li aria-hidden="true" className="ml-6 grid grid-cols-[28px_minmax(0,1fr)] gap-2.5">
        <span className="size-7 rounded-full bg-muted" />
        <span className="flex min-w-0 flex-col gap-2 pt-1">
          <Skeleton className={cn("h-2 w-1/5", line)} />
          <Skeleton className={cn("h-2.5 w-11/12", line)} />
        </span>
      </li>
    </>
  );
}
/** The place of a turn still to come while the debate is argued: the reply or the ruling an exchange waits for. */
function AwaitedTurn({ depth, pulse }: { depth: 1 | 2; pulse: boolean }) {
  const line = cn("rounded-full", !pulse && "animate-none");
  return (
    <li
      aria-hidden="true"
      className={cn("grid grid-cols-[28px_minmax(0,1fr)] gap-2.5", depth === 1 ? "ml-6" : "ml-12")}
    >
      <span className="size-7 rounded-full bg-muted" />
      <span className="flex min-w-0 flex-col gap-2 pt-1">
        <Skeleton className={cn("h-2 w-1/5", line)} />
        <Skeleton className={cn("h-2.5 w-4/5", line)} />
      </span>
    </li>
  );
}
/* ---------- who holds which position on a claim, from the turns ---------- */
const POSITION: Record<string, { label: string; icon: string; c: string }> = {
  proposed: { label: "Proposed", icon: "bulb", c: "text-foreground/80" },
  replied: { label: "Replied", icon: "msg", c: "text-foreground/80" },
  defends: { label: "Defends it", icon: "shield", c: "text-foreground/80" },
  concedes: { label: "Concedes", icon: "check", c: TONE.look.text },
  objects: { label: "Objects", icon: "swords", c: "text-foreground/80" },
  upheld: { label: "Objection upheld", icon: "swords", c: TONE.bad.text },
  answered: { label: "Objection answered", icon: "swords", c: TONE.ok.text },
  conceded: { label: "Caveat kept", icon: "alert", c: TONE.look.text },
  struck: { label: "Struck", icon: "ban", c: "text-muted-foreground" },
  undecided: { label: "Deadlock", icon: "flag", c: TONE.look.text },
  ruled: { label: "Ruled", icon: "gavel", c: "text-foreground/80" },
  closed: { label: "Settled from the record", icon: "fileCheck", c: TONE.ok.text },
};
const AUTHOR_POS: Record<string, string> = {
  propose: "proposed",
  reply: "replied",
  defend: "defends",
  concede: "concedes",
};
function positionsOf(ts: ThreadState) {
  const order = [...new Set(ts.mine.map((t) => t.a))];
  return order.map((a) => {
    if (a === "aa") return { a, k: AUTHOR_POS[ts.mine.filter((t) => t.a === "aa").at(-1)?.st ?? "propose"] };
    if (a === "jd") return { a, k: "ruled", n: ts.rulings.length };
    if (a === "code") return { a, k: "closed", n: ts.mine.filter((t) => t.a === "code").length };
    const mine = ts.roots.filter((x) => x.a === a);
    const r = ts.rulings.filter((x) => mine.some((y) => y.id === x.on)).at(-1)?.r;
    return { a, k: r && POSITION[r] ? r : "objects" };
  });
}
function PositionChip({ a, k, n }: { a: string; k: string; n?: number }) {
  const meta = POSITION[k] ?? POSITION.objects;
  return (
    <M
      as="span"
      in="fade"
      dur={250}
      className="inline-flex h-6 items-center gap-1.5 rounded-full bg-muted/60 py-0.5 pr-2 pl-0.5 text-xs"
    >
      <RoleAvatar a={a} size="sm" />
      <span className="text-muted-foreground">{seatName(a)}</span>
      <M as="span" key={k} in="fade" dur={250} className={cn("inline-flex items-center gap-1 font-medium", meta.c)}>
        <Icon n={meta.icon} className="size-3" />
        {meta.label}
        {n ? ` ×${n}` : ""}
      </M>
    </M>
  );
}

/* ---------- outcomes as marks of the one colour system, for the charts and the strips ---------- */
const OUTCOME_ORDER = ["answered", "closed_from_record", "conceded", "undecided", "upheld", "struck"];
const OUTCOME_SWATCH: Record<string, Swatch> = {
  answered: "ok",
  closed_from_record: "okSoft",
  conceded: "look",
  undecided: "lookSoft",
  upheld: "bad",
  struck: "none",
};
/** The exchanges by outcome, in the chart's order; an outcome that never came is kept only if it matters (upheld). */
function outcomeParts(count: (o: string) => number): Part[] {
  return OUTCOME_ORDER.map((o) => ({
    key: o,
    label: outcomeOf(o).label,
    value: count(o),
    swatch: OUTCOME_SWATCH[o],
  })).filter((p) => p.value > 0 || p.key === "upheld");
}
/** What each exchange came to so far, from the turns heard: a ruling, or the record's answer. */
function heardOutcomes(turns: LiveTurn[]) {
  const out = new Map<string, string>();
  for (const t of turns) {
    if (t.st === "record" && t.r) out.set(t.id.replace(/:record$/, ""), t.r);
    if (t.st === "rule" && t.r) out.set(t.id.replace(/:ruling$/, ""), t.r);
  }
  return out;
}

/* ---------- the conversation: one block per claim, open; a long thread shows its first exchanges ---------- */
/** How many exchanges of a finished thread stand open; the rest open on a click. */
const FIRST_EXCHANGES = 2;
function Thread({
  c,
  turns,
  byId,
  replies,
  newest,
  live,
  pulse,
  awaiting,
  full,
  foldable,
  onToggle,
  flash,
  heard,
}: {
  c: DebateClaim;
  turns: LiveTurn[];
  byId: Record<string, LiveTurn>;
  replies: Map<string, LiveTurn[]>;
  newest?: string;
  live: boolean;
  pulse: boolean;
  /** The debate is still argued: a turn still to come keeps a grey place. */
  awaiting: boolean;
  /** Every turn shows: the debate is argued now, or the reader opened the rest. */
  full: boolean;
  /** The debate is over: a long thread may fold its tail. */
  foldable: boolean;
  onToggle(): void;
  flash?: number;
  heard: Map<string, string>;
}) {
  const th = c.claim_id;
  const ts = threadState(th, turns);
  const xs = debateSource()?.exchanges.filter((x) => x.claim_id === th) ?? [];
  // An exchange still waits for its reply, or for its ruling: its grey place follows its last turn.
  const ruled = (id: string) => ts.rulings.some((r) => r.on === id);
  const replied = (id: string) => ts.mine.some((x) => x.re === id && REPLY_STANCES.has(x.st));
  const awaitsAfter = (t: LiveTurn) =>
    (t.st === "challenge" && !replied(t.id) && !ruled(t.id)) ||
    (REPLY_STANCES.has(t.st) && Boolean(t.re) && !ruled(t.re ?? ""));
  const [closed, all] = cqClosed(th, ts);
  // A finished thread shows its claim and its first exchanges; the tail is the raw record, one click away.
  const rootAt = ts.mine.map((t, i) => (t.st === "challenge" || t.st === "record" ? i : -1)).filter((i) => i >= 0);
  const cut = !full && rootAt.length > FIRST_EXCHANGES ? rootAt[FIRST_EXCHANGES] : ts.mine.length;
  const shownTurns = ts.mine.slice(0, cut);
  const hidden = ts.mine.length - cut;
  const hiddenExchanges = Math.max(0, rootAt.length - FIRST_EXCHANGES);
  return (
    <div
      data-thread={th}
      className="relative flex scroll-mt-24 flex-col gap-3 border-t px-4 py-4 first:border-t-0 sm:px-5"
    >
      {flash !== undefined && (
        <span
          key={flash}
          aria-hidden="true"
          className="flash pointer-events-none absolute inset-0 z-10 bg-sky-500/10 ring-1 ring-sky-500/30 ring-inset"
        />
      )}
      <div className="flex flex-wrap items-start gap-x-3 gap-y-1.5">
        <div className="flex min-w-0 flex-1 basis-64 flex-col gap-0.5">
          <Named id={th} className="font-semibold text-[15px]" />
          <span className="text-pretty text-[12.5px] text-muted-foreground">
            {[c.scheme_name || "Waiting for its scheme", xs.length ? plural(xs.length, "critical question") : ""]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </div>
        <span className="flex flex-wrap items-center gap-2.5">
          {xs.length > 0 && (
            <StatusStrip
              label={`The critical questions of ${named(th)}, by outcome`}
              items={xs.map((x, i) => {
                const o = heard.get(x.exchange_id);
                return {
                  key: x.exchange_id,
                  swatch: o ? (OUTCOME_SWATCH[o] ?? "none") : "wait",
                  text: `Question ${i + 1}: ${o ? outcomeOf(o).label.toLowerCase() : "not settled yet"}`,
                };
              })}
            />
          )}
          {all > 0 && ts.mine.length > 0 && (
            <span className="text-[12.5px] text-muted-foreground tabular-nums">
              {closed} of {all} closed
            </span>
          )}
          <M as="span" key={ts.status} in="fade" dur={250}>
            <ThreadPill status={ts.status} />
          </M>
        </span>
      </div>
      {ts.mine.length > 0 && <p className="-mt-1 text-pretty text-[13px] text-muted-foreground">{statusLine(ts)}</p>}
      {ts.mine.length > 0 && (
        <span className="flex flex-wrap gap-1.5">
          {positionsOf(ts).map((p) => (
            <PositionChip key={p.a} a={p.a} k={p.k} n={p.n} />
          ))}
        </span>
      )}
      <ol className="flex min-w-0 flex-col gap-3">
        {shownTurns.map((t) => (
          <Fragment key={t.id}>
            <TurnRow t={t} byId={byId} replies={replies.get(t.id) ?? []} fresh={live && t.id === newest} />
            {awaiting && awaitsAfter(t) && <AwaitedTurn depth={2} pulse={pulse} />}
          </Fragment>
        ))}
        {awaiting && ts.mine.length > 0 && ts.mine.every((t) => t.st === "propose") && (
          <AwaitedTurn depth={1} pulse={pulse} />
        )}
        {!ts.mine.length && <SkeletonTurns pulse={pulse} />}
      </ol>
      {foldable && hiddenExchanges > 0 && (
        <TailToggle
          open={hidden === 0}
          onToggle={onToggle}
          more={hiddenExchanges}
          noun={`${hiddenExchanges === 1 ? "exchange" : "exchanges"}${hidden > 0 ? ` (${plural(hidden, "turn")})` : ""}`}
        />
      )}
    </div>
  );
}

/* ---------- the key result: whether each claim stands, and the wording the debate narrowed it to ---------- */
/** What the record came to for one claim: its exchanges by outcome, and whether it stands. */
function claimOutcome(th: string) {
  const rec = file(FINAL) ?? debateSource();
  const xs = (rec?.exchanges ?? []).filter((x) => x.claim_id === th);
  const by = (o: string) => xs.filter((x) => x.outcome === o);
  const ruling = file("Rulings.json")?.claims.find((c) => c.claim_id === th);
  return { xs, by, stands: ruling ? ruling.stands : by("upheld").length === 0 };
}
/** The claim as stated, and the wording for the lock once the debate is over (S07 writes it). */
function wordingOf(th: string, over: boolean) {
  const before = stated(th);
  const locked = over ? statement(th) : undefined;
  return { before, after: locked?.approved_text ? fill(locked.approved_text) : before };
}
/** What the debate does to the paper: the qualifier a claim's sentence carries, or that it cannot stand. */
function effectOf(th: string): { effect: ReactNode; tone: Tone } {
  const cards = file("ToulminCards.json")?.cards ?? [];
  const { by, stands } = claimOutcome(th);
  const kept = by("conceded").filter((x) => x.qualifier);
  const main = cards.find((k) => k.claim_id === th)?.main_qualifier;
  if (!stands)
    return { effect: `${plural(by("upheld").length, "objection")} upheld: it cannot stand as written.`, tone: "bad" };
  if (main) return { effect: <>its sentence carries “{fill(main)}”.</>, tone: kept.length ? "look" : "ok" };
  if (kept.length)
    return {
      effect: (
        <>
          its sentence carries what it conceded: “{fill(kept[0].qualifier)}”
          {kept.length > 1 ? `, and ${kept.length - 1} more` : ""}.
        </>
      ),
      tone: "look",
    };
  return { effect: "stands as stated.", tone: "ok" };
}
function ClaimRow({ c, over, onShow }: { c: DebateClaim; over: boolean; onShow(th: string): void }) {
  const th = c.claim_id;
  const { by, stands } = claimOutcome(th);
  const { before, after } = wordingOf(th, over);
  const conceded = by("conceded").length;
  const upheld = by("upheld").length;
  const { effect, tone } = effectOf(th);
  return (
    <li className="grid gap-x-5 gap-y-2.5 py-3.5 md:grid-cols-[11rem_minmax(0,1fr)]">
      <span className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1.5 md:flex-col md:items-start">
        <span className="flex min-w-0 flex-col gap-0.5">
          <Named id={th} className="font-semibold text-[14px]" />
          <span className="text-[12.5px] text-muted-foreground leading-snug">{c.scheme_name}</span>
        </span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <StatusPill tone={stands ? "ok" : "bad"}>{stands ? "Stands" : "Does not stand"}</StatusPill>
          {(conceded > 0 || upheld > 0) && (
            <span className="text-[12.5px] text-muted-foreground">
              {upheld ? `${upheld} upheld` : plural(conceded, "concession")}
            </span>
          )}
        </span>
      </span>
      <span className="flex min-w-0 flex-col gap-2">
        <span className="text-[14px] leading-[1.5]">
          {after !== before ? <Rewrite before={before} after={after} /> : <span className="text-pretty">{before}</span>}
        </span>
        <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <span className="flex min-w-0 items-baseline gap-2 text-[13px] leading-snug">
            <span className={cn("size-2 shrink-0 translate-y-[-1px] rounded-full", TONE[tone].dot)} />
            <span className="text-pretty">
              <b className="font-medium">In the paper:</b> {effect}
            </span>
          </span>
          <button
            type="button"
            onClick={() => onShow(th)}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[12.5px] text-muted-foreground underline-offset-2 hover:bg-muted hover:text-foreground"
          >
            Read the debate
            <Icon n="arrow" className="size-3" />
          </button>
        </span>
      </span>
    </li>
  );
}
/* ---------- the debate at a glance: who argues in which order, and a scoreboard of every question asked ---------- */
/** One step of how a claim is argued: who acts, what they do, and how many times they did it in this run. */
function HowArgued({ turns, claims, xs }: { turns: LiveTurn[]; claims: number; xs: DebateRecordFile["exchanges"] }) {
  const by = (st: LiveTurn["st"][]) => turns.filter((t) => st.includes(t.st)).length;
  const steps: { a: string[]; title: string; n: number; noun: string }[] = [
    { a: ["aa"], title: "The Proponent states each claim", n: claims, noun: claims === 1 ? "claim" : "claims" },
    { a: ["code"], title: "The record settles what it can", n: by(["record"]), noun: "closed by code" },
    {
      a: ["qm", "qs", "qx", "qo"],
      title: "Four critics ask its critical questions",
      n: by(["challenge"]),
      noun: by(["challenge"]) === 1 ? "challenge" : "challenges",
    },
    { a: ["aa"], title: "The Proponent answers each", n: by(["reply", "defend", "concede"]), noun: "replies" },
    { a: ["jd"], title: "The Judge rules on each", n: by(["rule"]), noun: by(["rule"]) === 1 ? "ruling" : "rulings" },
  ];
  return (
    <ol className="grid gap-2 @2xl:grid-cols-5">
      {steps.map((s, i) => (
        <li
          key={s.title}
          className="relative flex min-w-0 flex-col gap-2 rounded-lg bg-muted/40 px-3 py-2.5 ring-1 ring-foreground/5"
        >
          <span className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-muted-foreground">{i + 1}</span>
            <span className="flex -space-x-1.5">
              {s.a.map((a) => (
                <RoleAvatar key={a} a={a} size="sm" className="ring-2 ring-background" />
              ))}
            </span>
          </span>
          <span className="text-pretty font-medium text-[13px] leading-snug">{s.title}</span>
          <span className="flex items-baseline gap-1.5">
            <b className="font-semibold text-[18px] tabular-nums leading-none">
              {xs.length || turns.length ? s.n : "–"}
            </b>
            <span className="text-[12px] text-muted-foreground">{s.noun}</span>
          </span>
          {i < steps.length - 1 && (
            <Icon
              n="right"
              aria-hidden="true"
              className="absolute top-1/2 -right-2 z-10 hidden size-3.5 -translate-y-1/2 rounded-full bg-background text-muted-foreground @2xl:block"
            />
          )}
        </li>
      ))}
    </ol>
  );
}

/** The seats that ask questions, in the scoreboard's order: the record first, then each critic, then you. */
const ASKERS: { key: string; a: string; name: string }[] = [
  { key: "record", a: "code", name: "Record" },
  { key: "method", a: "qm", name: "Method" },
  { key: "statistics", a: "qs", name: "Statistics" },
  { key: "scope", a: "qx", name: "Scope" },
  { key: "sources", a: "qo", name: "Sources" },
  { key: "researcher", a: YOU, name: "You" },
];
/** Who asked an exchange's question: the record when code settled it, else its critic. */
const askerOf = (x: DebateRecordFile["exchanges"][number]) => (x.by === "record" ? "record" : x.critic);

function Dot({ outcome, title }: { outcome?: string; title: string }) {
  const sw = outcome ? OUTCOME_SWATCH[outcome] : undefined;
  return (
    <span
      role="img"
      aria-label={title}
      title={title}
      className={cn(
        "inline-block size-3 shrink-0 rounded-full transition-colors duration-300",
        sw && sw !== "accent" ? SWATCH[sw].bg : "ring-1 ring-foreground/25 ring-inset",
      )}
    />
  );
}

/** Every question asked, as a dot under the seat that asked it, claim by claim; the claim's verdict at the end. */
function Scoreboard({
  claims,
  xs,
  heard,
  ready,
  onShow,
}: {
  claims: DebateClaim[];
  xs: DebateRecordFile["exchanges"];
  heard: Map<string, string>;
  ready: boolean;
  onShow(th: string): void;
}) {
  const seats = ASKERS.filter((s) => s.key !== "researcher" || xs.some((x) => askerOf(x) === "researcher"));
  const cols = `minmax(9rem,1.4fr) repeat(${seats.length}, minmax(0,1fr)) minmax(7.5rem,1fr)`;
  const outcome = (x: DebateRecordFile["exchanges"][number]) => (ready ? x.outcome : heard.get(x.exchange_id));
  return (
    <div className="@container">
      <div
        className="hidden items-end gap-3 border-b pb-2 @3xl:grid"
        style={{ gridTemplateColumns: cols }}
        aria-hidden="true"
      >
        <span className="font-semibold text-[11px] text-muted-foreground uppercase tracking-wide">Claim</span>
        {seats.map((s) => (
          <span key={s.key} className="flex flex-col items-center gap-1 text-center">
            <RoleAvatar a={s.a} size="sm" />
            <span className="text-[11.5px] text-muted-foreground">{s.name}</span>
          </span>
        ))}
        <span className="text-right font-semibold text-[11px] text-muted-foreground uppercase tracking-wide">
          Verdict
        </span>
      </div>
      <ul className="flex flex-col divide-y">
        {claims.map((c) => {
          const mine = xs.filter((x) => x.claim_id === c.claim_id);
          const { stands, by } = claimOutcome(c.claim_id);
          const conceded = by("conceded").length;
          const upheld = by("upheld").length;
          const verdict = !ready ? null : !stands ? (
            <StatusPill tone="bad">Falls · {upheld} upheld</StatusPill>
          ) : conceded ? (
            <StatusPill tone="look">Stands, narrowed ×{conceded}</StatusPill>
          ) : (
            <StatusPill tone="ok">Stands as stated</StatusPill>
          );
          return (
            <li
              key={c.claim_id}
              className="grid items-center gap-x-3 gap-y-2 py-2.5 @3xl:grid-cols-[var(--cols)]"
              style={{ "--cols": cols } as CSSProperties}
            >
              <button
                type="button"
                onClick={() => onShow(c.claim_id)}
                className="min-w-0 text-left underline-offset-2 hover:underline"
              >
                <Named id={c.claim_id} className="font-medium text-[13.5px]" />
              </button>
              {seats.map((s) => {
                const asked = mine.filter((x) => askerOf(x) === s.key);
                return (
                  <span
                    key={s.key}
                    className={cn(
                      "flex flex-wrap items-center gap-1 @3xl:justify-center",
                      !asked.length && "@max-3xl:hidden",
                    )}
                  >
                    <span className="mr-1 text-[11.5px] text-muted-foreground @3xl:hidden">{s.name}</span>
                    {asked.length ? (
                      asked.map((x) => {
                        const o = outcome(x);
                        return (
                          <Dot
                            key={x.exchange_id}
                            outcome={o}
                            title={`${x.question}: ${o ? outcomeOf(o).label.toLowerCase() : "not settled yet"}`}
                          />
                        );
                      })
                    ) : (
                      <span className="text-[12px] text-muted-foreground/60">·</span>
                    )}
                  </span>
                );
              })}
              <span className="flex @3xl:justify-end">{verdict ?? <Skeleton className="h-5 w-24 rounded-full" />}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const CLAIM_KINDS = ["gap", "finding", "conclusion", "implication", "comparison"];
const KIND_PLURAL = (k: string, m: number) => `${m} ${k}${m === 1 ? "" : "s"}`;
function DebateOverview({
  claims,
  turns,
  ready,
  onShow,
}: {
  claims: DebateClaim[];
  turns: LiveTurn[];
  ready: boolean;
  onShow(th: string): void;
}) {
  const rec = file(FINAL) ?? debateSource();
  const xs = rec?.exchanges ?? [];
  // While the debate streams, the counts grow with the rulings heard; once it is over, they are the record's own.
  const heard = heardOutcomes(turns);
  const count = (o: string) =>
    ready ? xs.filter((x) => x.outcome === o).length : [...heard.values()].filter((v) => v === o).length;
  const _mine = xs.filter((x) => x.critic === "researcher");
  const rulings = file("Rulings.json")?.claims ?? [];
  const stand = rulings.length ? rulings.filter((c) => c.stands).length : claims.length - count("upheld");
  const _kinds = CLAIM_KINDS.map((k) => [k, claims.filter((c) => typeOf(c.claim_id) === k).length] as const)
    .filter(([, m]) => m > 0)
    .map(([k, m]) => KIND_PLURAL(k, m));
  const known = Boolean(debateSource());
  const _going = ready || heard.size > 0;
  const headline = `${stand === claims.length ? `All ${plural(claims.length, "claim")} stand` : `${stand} of ${plural(claims.length, "claim")} stand`}; ${
    count("conceded") ? `${plural(count("conceded"), "concession")} narrow their wording` : "none had to be narrowed"
  }${count("upheld") ? `, and ${plural(count("upheld"), "objection")} stood against them` : ", and no objection was upheld"}.`;
  const parts = outcomeParts(count);
  const _rows: BarRow[] = claims.map((c) => {
    const cx = xs.filter((x) => x.claim_id === c.claim_id);
    const of = (o: string) =>
      ready ? cx.filter((x) => x.outcome === o).length : cx.filter((x) => heard.get(x.exchange_id) === o).length;
    return {
      key: c.claim_id,
      name: named(c.claim_id),
      label: <Named id={c.claim_id} className="text-[13px]" />,
      parts: outcomeParts(of),
      total: cx.length,
      end: plural(cx.length, "question"),
    };
  });
  return (
    <Section
      icon="gavel"
      title="What the debate did"
      tells="Every claim faced the critical questions of its scheme; each question was answered, conceded, upheld against it, or settled from the record."
      data-rulings
    >
      <div className="@container flex flex-col gap-4 px-4 py-4 sm:px-5">
        <Takeaway ready={ready}>{headline}</Takeaway>
        <div className="flex flex-col gap-2">
          <SubHead
            title="How each claim is argued"
            tells="The same five steps for every claim, in this order; the counts are this run's."
          />
          <HowArgued turns={turns} claims={claims.length} xs={xs} />
        </div>
        <div className="flex flex-col gap-3 rounded-lg bg-muted/25 p-4 ring-1 ring-foreground/5">
          <SubHead
            title={`Every question asked: ${plural(xs.length, "dot")}, one per question`}
            tells="Each dot is a critical question, under the seat that asked it. Green: answered or settled, the claim holds as stated; amber: conceded, the claim's wording is narrowed; red: upheld, the claim falls."
          />
          {known ? (
            <Scoreboard claims={claims} xs={xs} heard={heard} ready={ready} onShow={onShow} />
          ) : (
            <Bars n={4} last="w-2/3" />
          )}
          {known && <Legend parts={parts} total={xs.length} />}
        </div>
      </div>
    </Section>
  );
}
function DebatePaper({
  claims,
  ready,
  over,
  onShow,
}: {
  claims: DebateClaim[];
  ready: boolean;
  over: boolean;
  onShow(th: string): void;
}) {
  return (
    <Section
      icon="pen"
      title="What it means for the paper"
      tells="Each claim as the paper will word it, and the qualifier its sentence must carry."
      aside={
        over ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="rounded-sm bg-amber-500/15 px-1 text-amber-900 dark:text-amber-100">added</span>
            <Strike className="text-muted-foreground">removed</Strike>
          </span>
        ) : undefined
      }
    >
      <div className="px-4 sm:px-5">
        {ready ? (
          <ul className="flex flex-col divide-y">
            {claims.map((c) => (
              <ClaimRow key={c.claim_id} c={c} over={over} onShow={onShow} />
            ))}
          </ul>
        ) : (
          <div className="flex flex-col gap-4 py-4">
            {(claims.length ? claims : [0, 1, 2]).map((c, i) => (
              <Bars key={typeof c === "number" ? c : c.claim_id} n={2} last={i % 2 ? "w-1/2" : "w-3/4"} />
            ))}
          </div>
        )}
      </div>
    </Section>
  );
}

/** Who sits at the debate, and what each asks of a claim. */
const DEBATE_SEATS: [string, string][] = [
  ["aa", "States each claim and answers"],
  ["qm", "Asks how the evidence was made"],
  ["qs", "Asks whether the numbers hold"],
  ["qx", "Asks how far a claim reaches"],
  ["qo", "Asks what the sources and the field accept"],
  ["jd", "Rules on every exchange"],
];

function Seats({ turns, speaking, you }: { turns: LiveTurn[]; speaking: string | null; you: boolean }) {
  const a = useAccent();
  const seats: [string, string][] = you ? [...DEBATE_SEATS, [YOU, "Raised objections of your own"]] : DEBATE_SEATS;
  const tally = STANCE_ORDER.map((k) => [k, turns.filter((t) => t.st === k).length] as const).filter(([, m]) => m);
  const most = Math.max(1, ...seats.map(([s]) => turns.filter((x) => x.a === s).length));
  return (
    <div className="flex flex-col gap-4 px-4 py-4 sm:px-5">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {seats.map(([s, asks]) => {
          const on = speaking === s;
          const said = turns.filter((x) => x.a === s).length;
          return (
            <span
              key={s}
              className={cn(
                "flex flex-col gap-2 rounded-lg px-3 py-2.5 ring-1 ring-inset transition-colors duration-300",
                on ? "bg-card ring-foreground/30" : "bg-muted/40 ring-foreground/5",
              )}
            >
              <span className="flex items-center gap-2.5">
                <RoleAvatar a={s} size="lg" />
                <span className="min-w-0 flex-1 leading-snug">
                  <b className={cn("block font-semibold text-[13.5px]", roleText(s))}>{seatName(s)}</b>
                  <span className="text-[12.5px] text-muted-foreground">{asks}</span>
                </span>
                {on ? (
                  <span className="flex gap-0.5" role="status" aria-label="Speaking">
                    {[0, 1, 2].map((i) => (
                      <motion.i
                        key={i}
                        className={cn("size-1 rounded-full bg-current", roleText(s))}
                        animate={{ opacity: [0.25, 1, 0.25] }}
                        transition={{ duration: 0.9, repeat: Number.POSITIVE_INFINITY, delay: i * 0.15 }}
                      />
                    ))}
                  </span>
                ) : (
                  <span className="flex flex-col items-end leading-none">
                    <b className="font-semibold text-lg">{said}</b>
                    <span className="text-[11.5px] text-muted-foreground">{said === 1 ? "turn" : "turns"}</span>
                  </span>
                )}
              </span>
              <span aria-hidden="true" className="block h-1 overflow-hidden rounded-full bg-foreground/[0.07]">
                <span
                  className={cn(
                    "block h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none",
                    a.mark,
                  )}
                  style={{ width: `${(said / most) * 100}%` }}
                />
              </span>
            </span>
          );
        })}
      </div>
      {tally.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {tally.map(([k, m]) => (
            <li
              key={k}
              className="inline-flex items-center gap-1.5 rounded-md bg-muted/50 px-2 py-1 text-[12.5px] ring-1 ring-foreground/5"
            >
              <Icon n={STANCE[k].icon} className="size-3.5 text-muted-foreground" />
              <b className="font-semibold">{m}</b>
              <span className="text-muted-foreground">{TALLY_NOUN[k]}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-pretty text-[12.5px] text-muted-foreground leading-snug">
        Positions come from each turn's stance, the turn it replies to and the Judge's rulings, not from tone. Every
        challenge needs a ground in the record; one without is struck.
      </p>
    </div>
  );
}

function Debate({ live }: { live: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const [flash, setFlash] = useState<{ th: string; n: number } | null>(null);
  /** Threads whose every exchange a reader opened ("Read the debate", or "Show more"). */
  const [asked, setAsked] = useState<Set<string>>(() => new Set());
  const st = S.st.S04;
  const claims = claimsInOrder();
  const every = debateTurns();
  const done = st.status === "done";
  const turns = done ? every : every.filter((t) => HEARD.has(t.id));
  const byId: Record<string, LiveTurn> = Object.fromEntries(turns.map((t) => [t.id, t]));
  const replies = new Map<string, LiveTurn[]>();
  for (const t of turns) {
    const to = t.re ?? t.on;
    if (to) replies.set(to, [...(replies.get(to) ?? []), t]);
  }
  const heard = heardOutcomes(turns);
  const newest = turns.at(-1)?.id;
  const show = (th: string) => {
    setAsked((s) => new Set(s).add(th));
    setFlash((f) => ({ th, n: (f?.n ?? 0) + 1 }));
    afterPaint(() =>
      q(`[data-thread="${th}"]`)?.scrollIntoView({ block: "start", behavior: RM() ? "auto" : "smooth" }),
    );
  };
  const toggle = (th: string) =>
    setAsked((s) => {
      const next = new Set(s);
      if (next.has(th)) next.delete(th);
      else next.add(th);
      return next;
    });
  const running = live && st.status === "running";
  // The seat of the turn being heard speaks; between turns, the seat of the model call at work.
  const call = LIVE.calls.find((x) => x.stage === "S04" && !x.done);
  const heardNow = S.now?.startsWith(`${TURNS}:`) ? every.find((t) => `${TURNS}:${t.id}` === S.now) : undefined;
  const speaking = running && S.lifecycle === "running" ? (heardNow?.a ?? (call ? callKey(call.agent) : null)) : null;
  // While the debate is argued, an exchange still waiting for its reply or ruling keeps a grey place.
  const awaiting = running && Boolean(file(DRAFT));
  const ready = Boolean(file(FINAL)) && has("Rulings.json") && (done || st.cur === "v5");
  const you = every.some((t) => t.a === YOU);
  return (
    <StageAccent accent="indigo">
      <div ref={host} className="relative flex min-w-0 flex-col gap-5" data-out="DebateRecord.json Rulings.json">
        {!ready && <WorkingHere sid="S04" />}
        <DebateOverview claims={claims} turns={turns} ready={ready} onShow={show} />
        <DebatePaper claims={claims} ready={ready} over={done} onShow={show} />
        <Section
          icon="users"
          title="Who argues"
          tells="The Proponent states each claim, four critics ask its critical questions, and a separate Judge rules on each exchange."
          aside={turns.length ? plural(turns.length, "turn") : undefined}
        >
          <Seats turns={turns} speaking={speaking} you={you} />
        </Section>
        <Section
          icon="msg"
          title="The debate, claim by claim"
          tells={
            <>
              Each claim answers the <Term t="critical question">critical questions</Term> of its scheme: who asked,
              what was answered, and how the Judge ruled.
            </>
          }
          aside={claims.length ? plural(claims.length, "claim") : undefined}
        >
          <div className="flex flex-col">
            {claims.map((c) => (
              <Thread
                key={c.claim_id}
                c={c}
                turns={turns}
                byId={byId}
                replies={replies}
                newest={newest}
                live={live}
                pulse={running}
                awaiting={awaiting}
                full={!done || asked.has(c.claim_id)}
                foldable={done}
                onToggle={() => toggle(c.claim_id)}
                flash={flash?.th === c.claim_id ? flash.n : undefined}
                heard={heard}
              />
            ))}
            {!claims.length &&
              [0, 1, 2].map((i) => (
                <div
                  key={i}
                  aria-hidden="true"
                  className="flex flex-col gap-2 border-t px-4 py-4 first:border-t-0 sm:px-5"
                >
                  <Bars n={2} last="w-2/5" />
                </div>
              ))}
          </div>
        </Section>
        <AgentCursor
          agent={speaking === YOU ? null : speaking}
          host={host}
          target={newest ? `turn:${newest}` : null}
          version={turns.length}
        />
      </div>
    </StageAccent>
  );
}

/** The debate screen: the claims and their threads stand from the start; the turns fill in as the record streams. */
export function DebateLive({ live }: { live: boolean }) {
  return <Debate live={live} />;
}
