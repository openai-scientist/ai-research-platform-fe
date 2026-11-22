"use client";
"use no memo";

/* ===== S03 live · every scientific statement on the fourth axis, sorted into lanes, its lifecycle drawn =====
   What the stage did first (how firmly the statements are written, lane by lane, each hypothesis's path and the five
   steps), then what it means for the paper, what each status allows, and the board of every statement. */

import { type CSSProperties, useEffect, useRef, useState } from "react";

import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { ENTITY } from "../data/meta";
import { S } from "../engine";
import { BOX_TYPES, type Box, type BoxNode, Diagram, type LinkEdge, useFresh } from "../flow";
import { AgentCursor, afterPaint, cn, Icon, M, q, RM, Strike, useMedia } from "../lib";
import { Typed } from "../scenes-gather";
import { nameOf, typeName } from "./graph-data";
import { shown, streaming, WorkingHere } from "./kit";
import { Bars, scrollSoon } from "./outline-kit";
import { agentKey, file, fill, printed, statement } from "./run";
import { type PaperEffect, StatusPill, type Tone } from "./stage-kit";
import {
  type BarRow,
  SubHead as ChartHead,
  EffectList,
  ResultGrid,
  Section,
  type Part as Slice,
  StageAccent,
  type Swatch,
  Takeaway,
} from "./stage-visual";
import { Term } from "./term";
import type { Statement } from "./types";

/* ---------- what the board is made of: lanes, types, statuses, origins ---------- */
/** The lists the player fills: arrived in the pile, sorted into the lanes; then statuses, links and blocks are shown. */
export const STM = {
  arrived: "live.stm.arrived",
  sorted: "live.stm.sorted",
  status: "live.stm.status",
  links: "live.stm.links",
  blocked: "live.stm.blocked",
};
/** Who labels the statements: the Statement Scientist, by the key the run gives it. */
export const SCIENTIST = agentKey("Statement Scientist");
/** The statements whose text is typed out as they are sorted; the rest show whole. */
export const STM_TYPED = new Set<string>();

/* The lanes, left to right as the lifecycle runs, and the types each takes in the order they are read. */
export const LANES: { title: string; types: string[] }[] = [
  { title: "Background · gap · question", types: ["background", "gap", "question", "objective"] },
  { title: "Hypothesis · assumption", types: ["hypothesis", "assumption"] },
  { title: "Finding", types: ["finding"] },
  { title: "Conclusion · implication", types: ["conclusion", "implication", "comparison"] },
  { title: "Limitation", types: ["limitation"] },
  { title: "Note", types: ["note"] },
];
const LIMITS = 4;
export const laneOf = (s: Statement) => {
  const i = LANES.findIndex((l) => l.types.includes(s.type));
  return i < 0 ? LANES.length - 1 : i;
};
/* Questions and objectives are not true or false: they frame the argument graph and never enter it. */
export const CONTEXT = new Set(["question", "objective"]);
/* The statements that are argued: the paper asserts them, so each must survive the debate. */
const ARGUED = new Set(["gap", "finding", "conclusion", "implication", "comparison"]);

/** Where a statement comes from: the record (code fixes it), the Statement Scientist, or the standard library. */
export const ORIGIN: Record<string, { label: string; group: string; long: string; icon: string }> = {
  record: {
    label: "From the record",
    group: "From the record",
    long: "The record: code fixes it from the experiment's results, the Statement Scientist words it",
    icon: "file",
  },
  model: {
    label: "Statement Scientist",
    group: "Added by the Statement Scientist",
    long: "Added by the Statement Scientist from the record and the sources",
    icon: "pen",
  },
  library: {
    label: "Standard statement",
    group: "Standard statements",
    long: "A standard statement on how a model that ranks people may be used, worded by code",
    icon: "book",
  },
};
const ORIGIN_ORDER = ["record", "model", "library"];
const originOf = (s: Statement) => ORIGIN[s.origin] ?? ORIGIN.record;

/* Each type with its tag and colour, as the research map colours them. */
const ENTITY_OF: Record<string, string> = {
  question: "RQ",
  objective: "OBJECTIVE",
  background: "BACKGROUND",
  gap: "GAP",
  hypothesis: "HYPOTHESIS",
  assumption: "ASSUMPTION",
  finding: "FINDING",
  conclusion: "CONCLUSION",
  implication: "IMPLICATION",
  comparison: "COMPARISON",
  limitation: "LIMITATION",
  warrant: "WARRANT",
};
const NOTE = { tag: "N", name: "Note", box: "", chip: "bg-teal-500/12 text-teal-700 dark:text-teal-300" };
/* A comparison of a finding with a prior study's result: drawn as the conclusions are, under its own name. */
const COMPARISON = { ...ENTITY.CONCLUSION, tag: "CMP", name: "Comparison" };
export const entityOf = (type: string) =>
  ENTITY[ENTITY_OF[type]] ??
  (type === "comparison" ? COMPARISON : undefined) ??
  (type === "note" ? NOTE : { ...ENTITY.FUTURE, name: type ? type[0].toUpperCase() + type.slice(1) : "Statement" });

/* What each status lets the paper do, in four meanings and the blocked, each one colour: firm green, written with care
   amber, not claimed grey, bounding a claim neutral, blocked red. Red is only for what is blocked. */
export type StatusGroup = "firm" | "care" | "none" | "bounded" | "blocked";
const STATUS_GROUP: Record<string, StatusGroup> = {
  established: "firm",
  supported: "firm",
  tested: "firm",
  approved: "firm",
  contradicted: "care",
  inconclusive: "care",
  exploratory: "care",
  proposed: "none",
  assumed: "none",
  deferred: "none",
  bounded: "bounded",
  blocked: "blocked",
};
/** Each group: its name, what it means, its tone and its segment of the bar (one hue a group). */
export const GROUPS: { k: StatusGroup; label: string; hint: string; tone: Tone; bar: string }[] = [
  {
    k: "firm",
    label: "Firm",
    hint: "Stated as known, as a result or as the aim",
    tone: "ok",
    bar: "bg-emerald-500 dark:bg-emerald-400",
  },
  {
    k: "care",
    label: "Written with care",
    hint: "Inconclusive or exploratory: hedged",
    tone: "look",
    bar: "bg-amber-500 dark:bg-amber-400",
  },
  {
    k: "none",
    label: "Not claimed",
    hint: "Proposed, assumed or deferred",
    tone: "none",
    bar: "bg-stone-300 dark:bg-stone-600",
  },
  {
    k: "bounded",
    label: "Bounds a claim",
    hint: "Limits the paper must state",
    tone: "none",
    bar: "bg-indigo-500 dark:bg-indigo-400",
  },
  {
    k: "blocked",
    label: "Blocked",
    hint: "Past the claim ceiling: never written",
    tone: "bad",
    bar: "bg-rose-500 dark:bg-rose-400",
  },
];
export const groupOf = (status: string): StatusGroup => STATUS_GROUP[status] ?? "none";
const toneOf = (status: string): Tone => GROUPS.find((g) => g.k === groupOf(status))?.tone ?? "none";
export const STATUS_ALLOWS: Record<string, string> = {
  approved: "Stated as the paper's question or aim.",
  established: "Stated as known: background with its citations, or a result with its numbers.",
  tested: "Named as a hypothesis; never written as a result.",
  deferred: "Named as planned and not tested, with the reason; never written as a result.",
  assumed: "Written as an assumption, with its scope.",
  supported: "May be stated as a finding, with its numbers.",
  inconclusive: "Reported with its interval; no claim of a difference.",
  contradicted: "Reported as a result against its hypothesis, with its numbers.",
  exploratory: "Reported as exploratory, at most “suggest”; never as a confirmed finding.",
  bounded: "A limit the paper must state; it bounds the claims it touches.",
  proposed: "Offered as a suggestion, never as a result.",
  blocked: "Never written: the claim ceiling forbids it.",
};
/** The statuses in the order of their groups: firm, with care, not claimed, bounded, blocked. */
const STATUS_ORDER = Object.keys(STATUS_GROUP);

/** A statement by the name it goes by, its id second: "Finding 1" and F1. */
export function Named({ id, className }: { id: string; className?: string }) {
  const name = nameOf(id);
  return (
    <span className={cn("inline-flex min-w-0 items-baseline gap-1.5", className)}>
      {name !== id && <span className="font-medium">{name}</span>}
      <span className={cn("font-mono text-[11px] text-muted-foreground", name === id && "font-medium text-foreground")}>
        {id}
      </span>
    </span>
  );
}
/** A statement's name for a line of text: "Finding 1 (F1)". */
export const named = (id: string) => (nameOf(id) === id ? id : `${nameOf(id)} (${id})`);

/** The statements in the order they are read on the board: lane by lane, type by type, limitations by origin. */
export function boardOrder(list: Statement[]) {
  const rank = (s: Statement) => {
    const lane = laneOf(s);
    return [
      lane,
      Math.max(0, LANES[lane].types.indexOf(s.type)),
      lane === LIMITS ? ORIGIN_ORDER.indexOf(s.origin) : 0,
      list.indexOf(s),
    ];
  };
  return [...list].sort((a, b) => {
    const [x, y] = [rank(a), rank(b)];
    for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] - y[i];
    return 0;
  });
}
/** A statement and every statement it follows from or leads to, along the lifecycle. */
export function chainOf(id: string, links: { from: string; to: string }[]) {
  const out = new Set([id]);
  const walk = (cur: string, down: boolean) => {
    for (const l of links) {
      const [from, to] = down ? [l.from, l.to] : [l.to, l.from];
      if (from === cur && !out.has(to)) {
        out.add(to);
        walk(to, down);
      }
    }
  };
  walk(id, true);
  walk(id, false);
  return out;
}

function StatusChip({ status }: { status: string }) {
  return <StatusPill tone={toneOf(status)}>{status.replace(/_/g, " ")}</StatusPill>;
}
function IdChip({ id, onPick, tone }: { id: string; onPick(id: string): void; tone?: string }) {
  return (
    <button
      type="button"
      onClick={() => onPick(id)}
      className={cn("rounded px-1.5 py-px font-mono text-[11px]", tone ?? "bg-muted hover:bg-muted/70")}
    >
      {id}
    </button>
  );
}

/* ---------- the selected statement: everything the registry holds about it ---------- */
function Selected({
  s,
  links,
  blockedOn,
  onPick,
}: {
  s: Statement;
  links: { from: string; to: string }[];
  blockedOn: boolean;
  onPick(id: string): void;
}) {
  const id = s.statement_id;
  const ent = entityOf(s.type);
  const status = s.status;
  const struck = s.status === "blocked" && blockedOn;
  // The wording for the lock comes later (S07): shown once the run has it.
  const locked = statement(id);
  const wording = locked?.approved_text && locked.approved_text !== s.text ? locked : null;
  const sources = file("EvidenceLedger.json")?.references ?? [];
  const from = links.filter((l) => l.to === id);
  const to = links.filter((l) => l.from === id);
  const hyp = s.hypothesis_id && s.hypothesis_id !== id && statement(s.hypothesis_id) ? s.hypothesis_id : null;
  const obligations = s.obligations.map((o) => (typeof o === "string" ? o : o.kind));
  const row = "text-muted-foreground";
  return (
    <M key={id} in="fade" dur={200} className="flex flex-col gap-2.5 text-[13px]">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Named id={id} className="text-sm" />
        <span className="text-muted-foreground text-xs">{ent.name}</span>
        <span className="ml-auto">
          <StatusChip status={status} />
        </span>
      </p>
      <p className="font-medium font-serif text-[15px] leading-snug">
        {struck ? <Strike>{fill(s.text)}</Strike> : fill(s.text)}
      </p>
      {wording && (
        <span className="block rounded-lg bg-muted/45 px-2.5 py-2 text-[13px] leading-snug">
          <span className="mb-1 flex items-center gap-1 font-medium text-muted-foreground text-xs">
            <Icon n="pen" className="size-3" />
            Worded for the lock{wording.approved_by === "researcher" ? " by you" : ""}
          </span>
          {fill(wording.approved_text)}
        </span>
      )}
      <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-xs">
        <span className={row}>The paper may</span>
        <span>{STATUS_ALLOWS[status] ?? "—"}</span>
        <span className={row}>Comes from</span>
        <span>{originOf(s).long}</span>
        <span className={row}>Argument map</span>
        <span>
          {CONTEXT.has(s.type)
            ? "Not drawn: it is context for the claims"
            : struck
              ? "Not drawn: it is blocked"
              : "Drawn as one of its statements"}
        </span>
        <span className={row}>Debate</span>
        <span>
          {ARGUED.has(s.type) && !struck && s.status !== "deferred" ? (
            <>
              Argued under the <Term t="critical question">critical questions</Term> of its scheme
            </>
          ) : (
            "Not argued: it is not a claim the paper asserts"
          )}
        </span>
        {struck && s.blocked_reason && (
          <>
            <span className="text-rose-700 dark:text-rose-300">Blocked because</span>
            <span>{s.blocked_reason}</span>
          </>
        )}
        {hyp && (
          <>
            <span className={row}>Hypothesis</span>
            <span className="flex flex-wrap items-center gap-1.5">
              <IdChip id={hyp} onPick={onPick} />
              <span className="text-muted-foreground">{fill(statement(hyp)?.text ?? "")}</span>
            </span>
          </>
        )}
        {s.analysis_ids.length > 0 && (
          <>
            <span className={row}>Analyses</span>
            <span className="font-mono text-[11px]">{s.analysis_ids.join(" · ")}</span>
          </>
        )}
        {s.keys.length > 0 && (
          <>
            <span className={cn(row, "col-span-2 mt-1")}>Numbers it rests on</span>
            <ul className="col-span-2 flex flex-col gap-1.5">
              {s.keys.map((k) => {
                const v = file("EvidenceLedger.json")?.ledger.find((x) => x.key === k);
                return (
                  <li key={k} className="rounded-md bg-muted/40 px-2 py-1.5">
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-mono text-[11px] text-muted-foreground">{k}</span>
                      <b className="font-semibold tabular-nums">{printed(k)}</b>
                    </span>
                    {v?.label && <span className="block text-muted-foreground leading-snug">{v.label}</span>}
                  </li>
                );
              })}
            </ul>
          </>
        )}
        {s.sources.length > 0 && (
          <>
            <span className={cn(row, "col-span-2 mt-1")}>Sources</span>
            <ul className="col-span-2 flex flex-col gap-1">
              {s.sources.map((k) => (
                <li key={k} className="leading-snug">
                  <span className="mr-2 font-mono text-[11px] text-muted-foreground">{k}</span>
                  {sources.find((r) => r.key === k)?.title ?? ""}
                </li>
              ))}
            </ul>
          </>
        )}
        {obligations.length > 0 && (
          <>
            <span className={row}>Must report</span>
            <span className="flex flex-wrap gap-1">
              {obligations.map((o) => (
                <span key={o} className="rounded bg-muted px-1.5 py-px font-mono text-[11px]">
                  {o}
                </span>
              ))}
            </span>
          </>
        )}
        {locked?.negation && (
          <>
            <span className={row}>Its negation</span>
            <span className="text-muted-foreground">{fill(locked.negation)}</span>
          </>
        )}
        <span className={row}>Follows from</span>
        <span className="flex flex-wrap gap-1">
          {from.map((l) => (
            <IdChip key={l.from} id={l.from} onPick={onPick} />
          ))}
          {!from.length && "—"}
        </span>
        <span className={row}>Leads to</span>
        <span className="flex flex-wrap gap-1">
          {to.map((l) => (
            <IdChip key={l.to} id={l.to} onPick={onPick} />
          ))}
          {!to.length && "—"}
        </span>
      </div>
    </M>
  );
}

/* ---------- the key result: how firmly each statement is written, and each hypothesis's path ---------- */
const PLURALS: Record<string, string> = { hypothesis: "hypotheses", analysis: "analyses", status: "statuses" };
const many = (n: number, word: string) => `${n} ${n === 1 ? word : (PLURALS[word] ?? `${word}s`)}`;
const listed = (parts: string[]) =>
  parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}` : (parts[0] ?? "");
const lowerFirst = (t: string) => t.replace(/^./, (c) => c.toLowerCase());

/** A statement on a hypothesis's path: its name, its status, its words on hover. */
function PathNode({ s }: { s: Statement }) {
  return (
    <HoverCard openDelay={120} closeDelay={60}>
      <HoverCardTrigger asChild>
        <span
          // biome-ignore lint/a11y/noNoninteractiveTabindex: its words open on keyboard focus too
          tabIndex={0}
          className="inline-flex min-w-0 cursor-default flex-wrap items-center gap-x-2 gap-y-1 rounded-md px-1 py-0.5 text-[13.5px] outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Named id={s.statement_id} />
          <StatusChip status={s.status} />
        </span>
      </HoverCardTrigger>
      <HoverCardContent side="top" className="w-80 p-3">
        <span className="flex items-center gap-2 text-xs">
          <Named id={s.statement_id} />
          <span className="ml-auto">
            <StatusChip status={s.status} />
          </span>
        </span>
        <p className="mt-1.5 text-pretty text-[13px] leading-snug">{fill(s.text)}</p>
        <p className="mt-1.5 text-pretty text-muted-foreground text-xs leading-snug">{STATUS_ALLOWS[s.status]}</p>
      </HoverCardContent>
    </HoverCard>
  );
}

/** What a hypothesis leads to along the lifecycle: its findings, their conclusions, their implications, and the limits
 * that name it. Read from the lifecycle links and each statement's hypothesis. */
function pathOf(h: Statement, all: Statement[], links: { from: string; to: string }[]) {
  const by = new Map(all.map((s) => [s.statement_id, s]));
  const next = (from: Statement[], type: string) => {
    const ids = new Set(from.map((s) => s.statement_id));
    return [...new Set(links.filter((l) => ids.has(l.from)).map((l) => l.to))]
      .map((id) => by.get(id))
      .filter((s): s is Statement => s?.type === type);
  };
  const own = (type: string) => all.filter((s) => s.type === type && s.hypothesis_id === h.statement_id);
  const findings = [...new Set([...next([h], "finding"), ...own("finding")])];
  const conclusions = next(findings, "conclusion");
  const implications = next(conclusions, "implication");
  const comparisons = [...new Set([...next(findings, "comparison"), ...own("comparison")])];
  return [[h], findings, conclusions, implications, comparisons, own("limitation")].filter((hop) => hop.length > 0);
}
/** The worst group among a hypothesis's findings: what it led to. */
function ledTo(path: Statement[][]) {
  const findings = path.flat().filter((s) => s.type === "finding");
  if (!findings.length) return null;
  const order: StatusGroup[] = ["blocked", "care", "none", "bounded", "firm"];
  return order.find((g) => findings.some((f) => groupOf(f.status) === g)) ?? "firm";
}

function HypothesisPaths({ all, links }: { all: Statement[]; links: { from: string; to: string }[] }) {
  const hyps = all.filter((s) => s.type === "hypothesis");
  if (!hyps.length) return null;
  return (
    <ol className="flex flex-col divide-y rounded-lg ring-1 ring-foreground/10">
      {hyps.map((h) => (
        <li key={h.statement_id} className="flex flex-wrap items-center gap-x-1 gap-y-1.5 px-2.5 py-2">
          {pathOf(h, all, links).map((hop, i) => (
            <span key={hop[0].statement_id} className="inline-flex min-w-0 flex-wrap items-center gap-x-1 gap-y-1">
              {i > 0 && <Icon n="arrow" className="mx-0.5 size-3.5 shrink-0 text-muted-foreground" />}
              {hop.map((s, j) => (
                <span key={s.statement_id} className="inline-flex items-center">
                  {j > 0 && <span className="mr-1 text-muted-foreground">,</span>}
                  <PathNode s={s} />
                </span>
              ))}
            </span>
          ))}
        </li>
      ))}
    </ol>
  );
}

function headlineOf(all: Statement[], links: { from: string; to: string }[], blocked: number) {
  const hyps = all.filter((s) => s.type === "hypothesis");
  const tail = blocked ? `${many(blocked, "statement")} blocked by the claim ceiling.` : "No statement is blocked.";
  if (!hyps.length) {
    const n = (g: StatusGroup) => all.filter((s) => groupOf(s.status) === g).length;
    return `${many(all.length, "statement")}: ${n("firm")} firm, ${n("care")} written with care. ${tail}`;
  }
  const led = hyps.map((h) => ledTo(pathOf(h, all, links)));
  const parts = [
    led.filter((g) => g === "firm").length && `${led.filter((g) => g === "firm").length} led to a firm finding`,
    led.filter((g) => g === "care").length &&
      `${led.filter((g) => g === "care").length} to a finding written with care`,
    led.filter((g) => g === "blocked").length && `${led.filter((g) => g === "blocked").length} to a blocked finding`,
    led.filter((g) => g === null).length && `${led.filter((g) => g === null).length} not tested`,
  ].filter((x): x is string => Boolean(x));
  return `Of ${many(hyps.length, "hypothesis")}, ${listed(parts)}. ${tail}`;
}

/** What the statuses do to the paper: each finding as it will be written, then the other statements by status. */
function effectsOf(all: Statement[]): PaperEffect[] {
  const findings = all.filter((s) => s.type === "finding");
  const out: PaperEffect[] = findings.map((f) => ({
    item: `${named(f.statement_id)}:`,
    effect: lowerFirst(STATUS_ALLOWS[f.status] ?? f.status),
    tone: toneOf(f.status),
  }));
  for (const k of ["contradicted", "exploratory", "proposed", "deferred", "assumed", "bounded", "blocked"]) {
    const xs = all.filter((s) => s.status === k && s.type !== "finding");
    if (!xs.length) continue;
    const types = [...new Set(xs.map((s) => s.type))];
    const item =
      xs.length === 1
        ? named(xs[0].statement_id)
        : `${listed(types.map((t) => many(xs.filter((s) => s.type === t).length, typeName(t).toLowerCase())))}${
            xs.length <= 3 ? ` (${xs.map((s) => s.statement_id).join(", ")})` : ""
          }`;
    out.push({ item: `${item}:`, effect: lowerFirst(STATUS_ALLOWS[k]), tone: toneOf(k) });
  }
  return out;
}

/* ---------- what the stage did: how firmly each statement is written, lane by lane, and its five steps ---------- */
/** A group of statuses as a mark of the one colour system: a limit that bounds a claim is a neutral mark. */
const GROUP_SWATCH: Record<StatusGroup, Swatch> = {
  firm: "ok",
  care: "look",
  none: "none",
  bounded: "accent",
  blocked: "bad",
};
const groupSlices = (list: Statement[]): Slice[] =>
  GROUPS.map((g) => ({
    key: g.k,
    label: g.label,
    value: list.filter((s) => groupOf(s.status) === g.k).length,
    swatch: GROUP_SWATCH[g.k],
  }));
/** The stage's steps, as the track names them, and the part of the screen each one fills. */
const STEPS: { k: string; title: string; sel: string }[] = [
  { k: "d1", title: "Collect every scientific statement", sel: "[data-board]" },
  { k: "d2", title: "Label each on the fourth axis", sel: "[data-board]" },
  { k: "d3", title: "Give each an epistemic status", sel: "[data-mix]" },
  { k: "d4", title: "Link the lifecycle", sel: "[data-board]" },
  { k: "d5", title: "Block what the claim ceiling forbids", sel: "[data-blocked]" },
];
interface Shown {
  all: Statement[];
  links: { from: string; to: string }[];
  arrived: number;
  nSorted: number;
  statusOn: boolean;
  linksOn: boolean;
  blockedOn: boolean;
}
function stepResult(k: string, o: Shown): { tone: Tone | "wait" | "now"; label: string } {
  const st = S.st.S03;
  const now = st?.status === "running" && st.cur === k;
  const wait = (busy: string, idle: string) => ({
    tone: now ? ("now" as const) : ("wait" as const),
    label: now ? busy : idle,
  });
  const total = o.all.length;
  if (!total) return wait("Working", "Not started yet");
  if (k === "d1")
    return o.arrived >= total
      ? { tone: "ok", label: many(total, "statement") }
      : wait(`${o.arrived} of ${total} collected`, "Not collected yet");
  if (k === "d2") {
    if (o.nSorted < total) return wait(`${o.nSorted} of ${total} labelled`, "Not labelled yet");
    const types = new Set(o.all.map((s) => s.type)).size;
    const lanes = new Set(o.all.map(laneOf)).size;
    return { tone: "ok", label: `${many(types, "type")} in ${many(lanes, "lane")}` };
  }
  if (k === "d3") {
    if (!o.statusOn) return wait("Giving each its status", "Not given yet");
    const care = o.all.filter((s) => groupOf(s.status) === "care").length;
    return {
      tone: "ok",
      label: `${many(new Set(o.all.map((s) => s.status)).size, "status")}${care ? ` · ${care} written with care` : ""}`,
    };
  }
  if (k === "d4")
    return o.linksOn ? { tone: "ok", label: many(o.links.length, "link") } : wait("Linking", "Not linked yet");
  if (!o.blockedOn) return wait("Checking the ceiling", "Not checked yet");
  const blocked = o.all.filter((s) => s.status === "blocked").length;
  return blocked
    ? { tone: "bad", label: `${many(blocked, "statement")} blocked` }
    : { tone: "ok", label: "None blocked" };
}

/* ---------- the classification: every statement in the cell of its kind and of how firmly it is written ---------- */
const CELL_TINT: Record<StatusGroup, string> = {
  firm: "bg-emerald-50/70 dark:bg-emerald-950/25",
  care: "bg-amber-50/70 dark:bg-amber-950/25",
  none: "bg-muted/40",
  bounded: "bg-indigo-50/70 dark:bg-indigo-950/25",
  blocked: "bg-rose-50/70 dark:bg-rose-950/25",
};
const CHIP_TINT: Record<StatusGroup, string> = {
  firm: "bg-emerald-100 text-emerald-950 ring-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-50 dark:ring-emerald-800",
  care: "bg-amber-100 text-amber-950 ring-amber-300 dark:bg-amber-900/50 dark:text-amber-50 dark:ring-amber-800",
  none: "bg-background text-foreground ring-foreground/15",
  bounded:
    "bg-indigo-100 text-indigo-950 ring-indigo-300 dark:bg-indigo-900/50 dark:text-indigo-50 dark:ring-indigo-800",
  blocked: "bg-rose-100 text-rose-950 ring-rose-300 dark:bg-rose-900/50 dark:text-rose-50 dark:ring-rose-800",
};
function ClassGrid({ all, statusOn, sorted }: { all: Statement[]; statusOn: boolean; sorted: number }) {
  const shown = all.slice(0, sorted);
  const lanes = LANES.map((l, li) => ({ l, li, xs: shown.filter((s) => laneOf(s) === li) })).filter((x) =>
    all.some((s) => laneOf(s) === x.li),
  );
  const groups = GROUPS.filter((g) => !statusOn || all.some((s) => groupOf(s.status) === g.k) || g.k === "blocked");
  const cols = `minmax(8.5rem,0.9fr) repeat(${groups.length}, minmax(0,1fr))`;
  return (
    <div className="@container">
      <div className="hidden gap-1.5 pb-1.5 @3xl:grid" style={{ gridTemplateColumns: cols }} aria-hidden="true">
        <span />
        {groups.map((g) => (
          <span key={g.k} className="flex flex-col gap-0.5 px-1">
            <span className="flex items-center gap-1.5 font-semibold text-[12.5px]">
              <span className={cn("size-2 rounded-full", g.bar)} />
              {g.label}
            </span>
            <span className="text-pretty text-[11.5px] text-muted-foreground leading-snug">{g.hint}</span>
          </span>
        ))}
      </div>
      <div className="flex flex-col gap-1.5">
        {lanes.map(({ l, li, xs }) => (
          <div
            key={l.title}
            className="grid gap-1.5 @max-3xl:rounded-lg @max-3xl:p-2 @max-3xl:ring-1 @max-3xl:ring-foreground/10 @3xl:grid-cols-[var(--cols)]"
            style={{ "--cols": cols } as CSSProperties}
          >
            <span className="flex items-center px-1 font-semibold text-[13px] leading-snug">{l.title}</span>
            {groups.map((g) => {
              const here = statusOn ? xs.filter((s) => groupOf(s.status) === g.k) : g.k === "none" ? xs : [];
              return (
                <span
                  key={g.k}
                  data-cell={`${li}:${g.k}`}
                  className={cn(
                    "flex min-h-11 flex-wrap content-start items-start gap-1 rounded-md p-1.5",
                    CELL_TINT[g.k],
                    !here.length && "@max-3xl:hidden",
                  )}
                >
                  <span className="w-full text-[11px] text-muted-foreground @3xl:hidden">{g.label}</span>
                  {here.map((s) => (
                    <span
                      key={s.statement_id}
                      title={`${nameOf(s.statement_id)}: ${fill(s.text)}`}
                      className={cn(
                        "inline-flex h-6 items-center rounded-md px-1.5 font-mono font-medium text-[11.5px] ring-1 ring-inset",
                        statusOn ? CHIP_TINT[g.k] : CHIP_TINT.none,
                      )}
                    >
                      {s.statement_id}
                    </span>
                  ))}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatementsOverview({ o, ready, onPick }: { o: Shown; ready: boolean; onPick(sel: string): void }) {
  const { all, links, statusOn, blockedOn } = o;
  const total = all.length;
  const known = total > 0;
  const n = (g: StatusGroup) => all.filter((s) => groupOf(s.status) === g).length;
  const by = (x: string) => all.filter((s) => s.origin === x).length;
  const from = listed(
    [
      by("record") && `${by("record")} from the record`,
      by("model") && `${by("model")} added by the Statement Scientist`,
      by("library") && `${by("library")} standard`,
    ].filter((x): x is string => Boolean(x)),
  );
  const sorted = all.slice(0, o.nSorted);
  const _slices = groupSlices(statusOn ? all : []);
  const _rows: BarRow[] = LANES.map((l, li) => {
    const every = all.filter((s) => laneOf(s) === li);
    const here = sorted.filter((s) => laneOf(s) === li);
    return {
      key: l.title,
      name: l.title,
      label: l.title,
      // Each lane fills with its statuses' colours once they are given; until then it counts what is sorted.
      parts: groupSlices(statusOn ? here : []),
      total: every.length,
      end:
        statusOn || here.length >= every.length
          ? many(every.length, "statement")
          : `${here.length} of ${every.length} sorted`,
    };
  }).filter((r) => r.total > 0);
  const blocked = n("blocked");
  return (
    <Section
      icon="target"
      title="What this stage did"
      tells="Every scientific statement of the study got a type on the fourth axis and a status that sets how firmly the paper may write it."
      data-overview
    >
      <div className="@container flex flex-col gap-4 px-4 py-4 sm:px-5">
        <Takeaway ready={ready}>{headlineOf(all, links, blocked)}</Takeaway>
        <div data-mix-chart className="flex flex-col gap-3 rounded-lg bg-muted/25 p-4 ring-1 ring-foreground/5">
          <ChartHead
            title={`Every statement, by kind and by how firmly the paper may write it: ${many(total, "statement")}`}
            tells={`Each chip is one statement (${from}), in the row of its kind and the column of its status. Hover a chip to read it.`}
          />
          {known ? <ClassGrid all={all} statusOn={statusOn} sorted={o.nSorted} /> : <Bars n={4} last="w-2/3" />}
          {known && !statusOn && (
            <p className="text-[12.5px] text-muted-foreground">
              Statuses are given next; until then each sits as not claimed.
            </p>
          )}
          {blockedOn && (
            <p className="text-[12.5px] text-muted-foreground">
              {blocked
                ? `${many(blocked, "statement")} past the claim ceiling: never written.`
                : "Nothing goes past the claim ceiling."}
            </p>
          )}
        </div>
        {all.some((s) => s.type === "hypothesis") && (
          <div className="flex flex-col gap-2">
            <ChartHead
              title="Each hypothesis, from question to conclusion"
              tells="What each hypothesis led to along the lifecycle. Hover a statement to read it."
            />
            {statusOn ? <HypothesisPaths all={all} links={links} /> : <Bars n={3} last="w-2/3" />}
          </div>
        )}
        <div className="flex flex-col gap-2">
          <ChartHead
            title="The five steps"
            tells="Each step of the labelling in order, with what it came to. Click one to read it in full."
          />
          <ResultGrid
            items={STEPS.map((x) => {
              const r = stepResult(x.k, o);
              return { key: x.k, title: x.title, result: r.label, tone: r.tone, onPick: () => onPick(x.sel) };
            })}
          />
        </div>
      </div>
    </Section>
  );
}

/* ---------- what it means for the paper: each finding as it will be written, and what is blocked ---------- */
function StatementsPaper({ all, ready, onShow }: { all: Statement[]; ready: boolean; onShow(id: string): void }) {
  const blocked = all.filter((s) => s.status === "blocked");
  const effects = ready
    ? effectsOf(all).map((e) => ({ key: e.item, item: e.item.replace(/:$/, ""), effect: e.effect, tone: e.tone }))
    : [];
  return (
    <Section
      icon="pen"
      title="What it means for the paper"
      tells="How each finding will be written, and what the other statements may and may not say."
    >
      <div data-blocked className="flex scroll-mt-4 flex-col gap-3 px-4 py-4 sm:px-5">
        {effects.length ? <EffectList items={effects} /> : <Bars n={3} last="w-1/2" className="py-1" />}
        {ready &&
          blocked.map((b) => (
            <div
              key={b.statement_id}
              className="grid grid-cols-[16px_minmax(0,1fr)_auto] items-start gap-2.5 rounded-lg bg-rose-50/60 px-3 py-2.5 ring-1 ring-rose-500/40 ring-inset dark:bg-rose-950/20"
            >
              <Icon n="ban" className="mt-0.5 size-4 text-rose-600 dark:text-rose-400" />
              <span className="min-w-0 text-sm leading-snug">
                <b className="font-medium">
                  {named(b.statement_id)} blocked by the <Term t="claim ceiling">claim ceiling</Term>
                </b>
                <span className="block text-muted-foreground text-xs">{b.blocked_reason ?? ""}</span>
                <Strike className="mt-1 block text-[13px] text-muted-foreground">{fill(b.text)}</Strike>
              </span>
              <button
                type="button"
                onClick={() => onShow(b.statement_id)}
                className="rounded-md px-2 py-1 text-muted-foreground text-xs hover:bg-muted hover:text-foreground"
              >
                Show it
              </button>
            </div>
          ))}
      </div>
    </Section>
  );
}

/* ---------- the statuses: what each one lets the paper write ---------- */
function StatusDetails({ all, statusOn }: { all: Statement[]; statusOn: boolean }) {
  const count = (k: string) => all.filter((s) => s.status === k).length;
  const groups = GROUPS.map((g) => ({
    ...g,
    statuses: STATUS_ORDER.filter((k) => groupOf(k) === g.k && count(k) > 0),
    n: all.filter((s) => groupOf(s.status) === g.k).length,
  })).filter((g) => g.n > 0);
  return (
    <Section
      icon="gauge"
      title="How firmly each statement is written"
      tells="Each status, how many statements carry it, and what it lets the paper write."
      aside={
        statusOn
          ? many(
              groups.reduce((n, g) => n + g.statuses.length, 0),
              "status",
            )
          : undefined
      }
      data-mix
      className="scroll-mt-4"
    >
      <div className="grid gap-x-8 gap-y-4 px-4 py-4 sm:px-5 md:grid-cols-2">
        {statusOn ? (
          groups.map((g) => (
            <section key={g.k} className="flex min-w-0 flex-col gap-1.5">
              <h4 className="flex items-center gap-2 font-semibold text-[13.5px]">
                <span className={cn("size-2.5 rounded-[3px]", g.bar)} />
                {g.label}
                <span className="font-normal text-muted-foreground tabular-nums">{g.n}</span>
              </h4>
              <ul className="flex flex-col">
                {g.statuses.map((k) => (
                  <li
                    key={k}
                    className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-baseline gap-3 border-t py-1.5 text-[13px] first:border-t-0"
                  >
                    <span className="flex items-center gap-1.5">
                      <StatusChip status={k} />
                      <span className="font-medium tabular-nums">{count(k)}</span>
                    </span>
                    <span className="text-pretty leading-snug">{STATUS_ALLOWS[k]}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))
        ) : (
          <Bars n={4} last="w-3/5" />
        )}
      </div>
    </Section>
  );
}

/* ---------- the board ---------- */
/* Lanes side by side, cards a fixed height so the links can be laid out. The board is drawn at its own size (its text
   at 12 px) and scrolls inside its card; each lane is as tall as its own cards. */
const SP_LANE = 272;
const SP_CARD = 128;
const SP_GAP = 12;
const SP_HEAD = 44;
const SP_GROUP = 26;
/** Places a lane keeps for the cards it will take, while the registry is not in. */
const SP_SLOTS = 3;

/** A card's place before its statement lands: the card's own size and layout, in grey. */
function SkeletonCard({ pulse, fixed }: { pulse: boolean; fixed: boolean }) {
  const line = cn("h-2.5 rounded-full", !pulse && "animate-none");
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex w-full flex-col gap-2 rounded-lg bg-card px-2.5 py-2.5 ring-1 ring-foreground/[0.06]",
        fixed ? "h-[128px]" : "h-[88px]",
      )}
    >
      <span className="flex items-center gap-1.5">
        <Skeleton className={cn("h-4 w-8 rounded", !pulse && "animate-none")} />
        <Skeleton className={cn(line, "w-10")} />
      </span>
      <Skeleton className={cn(line, "w-full")} />
      <Skeleton className={cn(line, "w-11/12")} />
      <Skeleton className={cn(line, "w-3/5")} />
    </div>
  );
}

/**
 * How a link runs between two cards: across the gap between lanes side to side; down a lane between neighbours;
 * around the cards between two that are further apart in one lane, along its right edge.
 */
function laneRoute(a: Box, b: Box) {
  if (a.x !== b.x)
    return {
      handles: b.x > a.x ? { sourceHandle: "rs", targetHandle: "lt" } : { sourceHandle: "ls", targetHandle: "rt" },
      data: {},
    };
  if (Math.abs(b.y - a.y) <= SP_CARD + SP_GAP + SP_GROUP)
    return {
      handles: b.y > a.y ? { sourceHandle: "b", targetHandle: "t" } : { sourceHandle: "ts", targetHandle: "bt" },
      data: {},
    };
  return { handles: { sourceHandle: "rs", targetHandle: "rt" }, data: { step: true, offset: 12 } };
}

function Board({ live }: { live: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const wide = useMedia("(min-width: 768px)");
  const [hov, setHov] = useState<string | null>(null);
  const [pin, setPin] = useState<string | null>(null);
  const [mix, setMix] = useState<StatusGroup | null>(null);
  const { fresh, seen } = useFresh(live);
  const st = S.st.S03;
  const all = boardOrder(file("StatementRegistry.json")?.statements ?? []);
  const ids = new Set(all.map((s) => s.statement_id));
  const links = (file("LifecycleLinks.json")?.links ?? []).filter((l) => ids.has(l.from) && ids.has(l.to));
  const total = all.length;
  const nSorted = shown("S03", STM.sorted, total);
  const arrived = Math.max(nSorted, shown("S03", STM.arrived, total));
  const statusOn = shown("S03", STM.status, 1) > 0;
  const linksOn = shown("S03", STM.links, 1) > 0;
  const blockedOn = shown("S03", STM.blocked, 1) > 0;
  const sorted = all.slice(0, nSorted);
  const pile = all.slice(nSorted, arrived);
  const focus = hov ?? pin;
  const chain = focus && linksOn ? chainOf(focus, links) : null;
  const blocked = all.filter((s) => s.status === "blocked");
  const selId = pin;
  const sel = statusOn ? all.find((s) => s.statement_id === selId) : undefined;
  const pick = (id: string) => setPin(ids.has(id) ? id : null);

  // Where the Statement Scientist is working now.
  let target: string | null = null;
  if (st.cur === "d1") target = "pile";
  if (st.cur === "d2" && nSorted) target = `sp:${all[nSorted - 1].statement_id}`;
  if (st.cur === "d3") target = `sp:${(all.find((s) => s.type === "finding") ?? all[0])?.statement_id}`;
  if (st.cur === "d4" && links[0]) target = `sp:${links[0].from}`;
  if (st.cur === "d5" && blocked[0]) target = `sp:${blocked[0].statement_id}`;

  const card = (s: Statement, i: number) => {
    const id = s.statement_id;
    const ent = entityOf(s.type);
    const struck = s.status === "blocked" && blockedOn;
    const status = s.status;
    const ctx = CONTEXT.has(s.type);
    const offChain = chain !== null && !chain.has(id);
    const offMix = mix !== null && groupOf(s.status) !== mix;
    const dim = offChain || offMix;
    const on = id === selId;
    const text = fill(s.text);
    const origin = originOf(s);
    return (
      <M
        as="button"
        type="button"
        key={id}
        in="card"
        data-wire={id}
        data-cursor={`sp:${id}`}
        onMouseEnter={() => setHov(id)}
        onMouseLeave={() => setHov(null)}
        onFocus={() => setHov(id)}
        onBlur={() => setHov(null)}
        onClick={() => setPin(pin === id ? null : id)}
        aria-pressed={on ? "true" : "false"}
        title={`${named(id)} · ${ent.name}\n${text}`}
        className={cn(
          "flex w-full flex-col gap-1.5 rounded-lg bg-card px-2.5 py-2 text-left text-[13px] ring-1 transition-[opacity,box-shadow] duration-300 hover:shadow-sm",
          wide && "h-[128px] overflow-hidden",
          on ? "ring-2 ring-foreground" : struck ? "ring-rose-500/40" : "ring-foreground/10",
          dim && "opacity-30",
        )}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="flex min-w-0 items-baseline gap-1.5">
            {nameOf(id) !== id && <span className="shrink-0 font-medium">{nameOf(id)}</span>}
            <span
              className={cn(
                "min-w-0 font-mono text-[11px] text-muted-foreground",
                wide ? "truncate whitespace-nowrap" : "break-all",
              )}
            >
              {id}
            </span>
          </span>
          {statusOn && (
            <M as="span" in="pop8" delay={(i % 6) * 0.05} className="ml-auto shrink-0">
              <StatusChip status={status} />
            </M>
          )}
        </span>
        <span className={cn("text-pretty leading-snug", wide && "line-clamp-3")}>
          {struck ? <Strike>{text}</Strike> : <Typed text={text} on={streaming(STM.sorted, id) && STM_TYPED.has(id)} />}
        </span>
        {statusOn && (
          <M as="span" in="up4" className="mt-auto flex items-center gap-1 text-[11px] text-muted-foreground">
            <Icon n={ctx ? "minus" : origin.icon} className="size-3 shrink-0" />
            {ctx ? "Context · stays outside the graph" : origin.label}
          </M>
        )}
      </M>
    );
  };

  /* Each lane, its cards in reading order; the limitation lane in groups by origin when it holds more than one. Every
     card has its place from the moment the registry is in (a skeleton until it is sorted); before that, a lane keeps a
     few places of the same size. */
  const known = all.length > 0;
  const pulse = live && st.status === "running";
  const lanes = LANES.map((l, li) => {
    const every = all.filter((s) => laneOf(s) === li);
    const cards = sorted.filter((s) => laneOf(s) === li);
    const shownIds = new Set(cards.map((s) => s.statement_id));
    const grouped = li === LIMITS && new Set(every.map((s) => s.origin)).size > 1;
    const slots: (Statement | null)[] = known ? every : Array.from({ length: SP_SLOTS }, () => null);
    const groups: { origin: string; y: number; n: number }[] = [];
    const slotY: number[] = [];
    let y = SP_HEAD;
    for (const s of slots) {
      if (s && grouped && groups.at(-1)?.origin !== s.origin) {
        groups.push({ origin: s.origin, y, n: 0 });
        y += SP_GROUP;
      }
      const g = groups.at(-1);
      if (s && g && shownIds.has(s.statement_id)) g.n += 1;
      slotY.push(y);
      y += SP_CARD + SP_GAP;
    }
    const ys = new Map(slots.flatMap((s, j) => (s ? [[s.statement_id, slotY[j]] as const] : [])));
    return { ...l, li, cards, shownIds, slots, slotY, groups: groups.filter((g) => g.n > 0), ys, bottom: y };
  });
  const laneH = Math.max(SP_HEAD + SP_CARD, ...lanes.map((l) => l.bottom)) + 4;
  const at = new Map<string, Box>();
  for (const l of lanes)
    for (const s of l.cards)
      at.set(s.statement_id, {
        x: l.li * SP_LANE + 10,
        y: l.ys.get(s.statement_id) ?? 0,
        w: SP_LANE - 36,
        h: SP_CARD,
      });
  const groupHead = (g: { origin: string; n: number }) => (
    <>
      <Icon n={ORIGIN[g.origin]?.icon ?? "file"} className="size-3 shrink-0" />
      <span>{ORIGIN[g.origin]?.group ?? g.origin}</span>
      <span className="ml-auto font-mono">{g.n}</span>
    </>
  );
  const count = (l: (typeof lanes)[number]) => (known ? l.cards.length : "");
  const boardNodes: BoxNode[] = [
    ...lanes.map(
      (l): BoxNode => ({
        id: `lane-${l.li}`,
        type: "box",
        position: { x: l.li * SP_LANE, y: 0 },
        width: SP_LANE - 16,
        zIndex: -1,
        selectable: false,
        data: {
          w: SP_LANE - 16,
          content: (
            <section
              data-lane={l.li}
              style={{ height: l.bottom + 4 }}
              className="pointer-events-none relative flex flex-col rounded-xl bg-foreground/[0.03] px-3 pt-2.5 ring-1 ring-foreground/10"
            >
              <header className="flex items-center gap-2 font-semibold text-[13px]">
                {l.title}
                <span className="ml-auto font-mono font-normal text-[11px] text-muted-foreground">{count(l)}</span>
              </header>
              {!l.slots.length && (
                <span className="mt-3 rounded-lg border border-dashed px-2 py-3 text-center text-[11px] text-muted-foreground">
                  —
                </span>
              )}
              {l.groups.map((g) => (
                <M
                  as="span"
                  in="fade"
                  key={g.origin}
                  style={{ top: g.y + 4 }}
                  className="absolute inset-x-3 flex items-center gap-1.5 text-[11px] text-muted-foreground"
                >
                  {groupHead(g)}
                </M>
              ))}
            </section>
          ),
        },
      }),
    ),
    ...lanes.flatMap((l) =>
      l.slots.map((s, j): BoxNode => {
        const x = l.li * SP_LANE + 10;
        const w = SP_LANE - 36;
        if (s && l.shownIds.has(s.statement_id))
          return {
            id: s.statement_id,
            type: "box",
            position: { x, y: l.slotY[j] },
            width: w,
            data: { w, content: card(s, all.indexOf(s)) },
          };
        return {
          id: `slot-${l.li}-${j}`,
          type: "box",
          position: { x, y: l.slotY[j] },
          width: w,
          selectable: false,
          data: { w, content: <SkeletonCard pulse={pulse} fixed /> },
        };
      }),
    ),
  ];
  const typeOf = (id: string) => all.find((s) => s.statement_id === id)?.type;
  const boardEdges: LinkEdge[] = linksOn
    ? links
        .filter((l) => at.has(l.from) && at.has(l.to))
        .map((l) => {
          const lim = typeOf(l.from) === "limitation";
          const on = Boolean(chain?.has(l.from) && chain.has(l.to));
          const id = `${l.from}-${l.to}`;
          const route = laneRoute(at.get(l.from) as Box, at.get(l.to) as Box);
          let opacity = 0.6;
          if (on) opacity = 1;
          else if (chain) opacity = 0.2;
          return {
            id,
            type: "link",
            source: l.from,
            target: l.to,
            ...route.handles,
            data: {
              ...route.data,
              stroke: lim ? "stroke-rose-500" : on ? "stroke-foreground" : "stroke-slate-400",
              fill: lim ? "fill-rose-500" : on ? "fill-foreground" : "fill-slate-400",
              dash: lim ? "4 4" : undefined,
              width: on ? 2 : 1.4,
              opacity: lim && !chain ? 0.7 : opacity,
              fresh: fresh(id),
            },
          };
        })
    : [];
  useEffect(() => seen(boardEdges.map((e) => e.id)));
  // The board at its own size: the canvas leaves room for React Flow's margin so it draws at 1:1 and scrolls in its card.
  const boardW = LANES.length * SP_LANE - 16;
  const canvasW = Math.ceil(boardW * 1.07);
  const canvasH = Math.ceil(laneH * 1.07);
  const panel = sel ? (
    <aside
      className={cn(
        "flex min-w-0 flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10",
        "lg:absolute lg:top-3 lg:right-3 lg:bottom-3 lg:z-10 lg:w-[340px] lg:overflow-y-auto lg:shadow-lg",
      )}
      aria-label={`Statement ${sel.statement_id}`}
    >
      <header className="flex items-center gap-2">
        <b className="font-semibold text-sm">Selected statement</b>
        <button
          type="button"
          onClick={() => setPin(null)}
          aria-label="Close the statement"
          className="ml-auto grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted"
        >
          <Icon n="x" className="size-4" />
        </button>
      </header>
      <Selected s={sel} links={links} blockedOn={blockedOn} onPick={pick} />
    </aside>
  ) : null;
  const show = (id: string) => {
    setPin(id);
    afterPaint(() => q("[data-board]")?.scrollIntoView({ block: "start", behavior: RM() ? "auto" : "smooth" }));
  };
  const groupCount = (g: StatusGroup) => all.filter((s) => groupOf(s.status) === g).length;
  return (
    <StageAccent accent="indigo">
      <div ref={host} className="relative flex flex-col gap-5">
        {!(known && blockedOn) && <WorkingHere sid="S03" task={/^statements/} />}
        <StatementsOverview
          o={{ all, links, arrived, nSorted, statusOn, linksOn, blockedOn }}
          ready={known && blockedOn}
          onPick={(sel) => scrollSoon(sel)}
        />
        <StatementsPaper all={all} ready={known && statusOn} onShow={show} />
        <StatusDetails all={all} statusOn={statusOn} />
        <Section
          icon="layers"
          title="Every statement, by type and lifecycle"
          tells="Each statement sits in the lane of its type; the arrows follow it from question to implication. Click one to read it whole."
          aside={known ? `${many(total, "statement")}${linksOn ? ` · ${many(links.length, "link")}` : ""}` : undefined}
          className="scroll-mt-4"
        >
          <div
            data-board
            data-out="StatementRegistry.json LifecycleLinks.json"
            data-cursor="pile"
            className="scroll-mt-4 p-4"
          >
            {statusOn && (
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                spacing={0}
                value={mix ?? "all"}
                onValueChange={(v) => setMix(!v || v === "all" ? null : (v as StatusGroup))}
                aria-label="Show statements of one group"
                className="mb-3.5 flex-wrap"
              >
                <ToggleGroupItem value="all" className="px-3">
                  All <span className="text-muted-foreground tabular-nums">{total}</span>
                </ToggleGroupItem>
                {GROUPS.filter((g) => groupCount(g.k) > 0).map((g) => (
                  <ToggleGroupItem key={g.k} value={g.k} className="gap-1.5 px-3">
                    <span className={cn("size-2 rounded-full", g.bar)} />
                    {g.label} <span className="text-muted-foreground tabular-nums">{groupCount(g.k)}</span>
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            )}
            {/* Incoming: the statements as they arrive, before each takes its lane. */}
            {!known ? (
              <ul aria-hidden="true" className="mb-3.5 flex flex-wrap gap-1.5">
                {[10, 12, 9, 14, 10, 16, 11, 9, 13, 10, 15, 12].map((w, i) => (
                  <Skeleton
                    // biome-ignore lint/suspicious/noArrayIndexKey: fixed placeholders
                    key={i}
                    style={{ width: w * 4 }}
                    className={cn("h-6 rounded-md", !pulse && "animate-none")}
                  />
                ))}
              </ul>
            ) : pile.length ? (
              <ul className="mb-3.5 flex flex-wrap gap-1.5">
                {pile.map((s) => (
                  <M
                    as="li"
                    key={s.statement_id}
                    in="pop8"
                    data-pile={s.statement_id}
                    title={fill(s.text)}
                    className="inline-flex h-6 items-center rounded-md bg-muted px-2 font-mono font-semibold text-[11px]"
                  >
                    {s.statement_id}
                  </M>
                ))}
              </ul>
            ) : null}
            {wide ? (
              <div className="relative">
                <div className="max-h-[min(80dvh,1100px)] overflow-auto rounded-lg ring-1 ring-foreground/[0.06]">
                  <Diagram
                    label="Statements by type, with their lifecycle links"
                    nodes={boardNodes}
                    edges={boardEdges}
                    nodeTypes={BOX_TYPES}
                    fitKey={`${laneH}-${linksOn}`}
                    className="rounded-none bg-transparent ring-0"
                    style={{ width: canvasW, height: canvasH }}
                  />
                </div>
                {panel}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                  {lanes.map((l) => (
                    <section
                      key={l.title}
                      data-lane={l.li}
                      className="flex min-w-0 flex-col gap-2 rounded-xl bg-foreground/[0.03] p-2.5 ring-1 ring-foreground/10"
                    >
                      <header className="flex items-center gap-2 px-1 pt-0.5 font-semibold text-[13px]">
                        {l.title}
                        <span className="ml-auto font-mono font-normal text-[11px] text-muted-foreground">
                          {count(l)}
                        </span>
                      </header>
                      {l.slots.map((s, j) => {
                        if (!s || !l.shownIds.has(s.statement_id))
                          // biome-ignore lint/suspicious/noArrayIndexKey: a place keeps its index until its card lands
                          return <SkeletonCard key={`slot-${j}`} pulse={pulse} fixed={false} />;
                        const g = l.groups.find((x) => l.slotY[j] === x.y + SP_GROUP);
                        return (
                          <div key={s.statement_id} className="flex min-w-0 flex-col gap-2">
                            {g && (
                              <span className="flex items-center gap-1.5 px-1 pt-1 text-[11px] text-muted-foreground">
                                {groupHead(g)}
                              </span>
                            )}
                            {card(s, all.indexOf(s))}
                          </div>
                        );
                      })}
                      {!l.slots.length && (
                        <span className="rounded-lg border border-dashed px-2 py-3 text-center text-[11px] text-muted-foreground">
                          —
                        </span>
                      )}
                    </section>
                  ))}
                </div>
                {panel}
              </div>
            )}
          </div>
        </Section>
        <AgentCursor
          agent={live && st.status === "running" ? SCIENTIST : null}
          host={host}
          target={target}
          version={`${arrived}-${nSorted}-${statusOn}-${linksOn}-${blockedOn}`}
        />
      </div>
    </StageAccent>
  );
}

/** The statements screen: the board stands from the start, its places filled as the registry streams in. */
export function StatementsLive({ live }: { live: boolean }) {
  return <Board live={live} />;
}
