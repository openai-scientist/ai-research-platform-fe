"use client";
"use no memo";

/* ===== The journal merge, live: the frozen claims meet the journal's rules =====
   The screen reads top to bottom: what the stage did (whether the frame and the argument fit, how many statements are
   placed and where, its seven steps), what it means for the paper (what each section carries, and the hypothesis left
   without a place), then the full detail in open sections: the join's three checks, the publisher's rules, where each
   statement goes (one row per section, its word budget on one shared scale, its statements as chips; a deferred
   hypothesis names the limitation that carries it), where each statement type may go, where each part of an argument is
   written, the sentence rules, and the contract section by section. A run without a measured journal profile (the
   generic one) has rules and no habits, so nothing to settle between them. Each part keeps its size as a skeleton until
   its step plays. */

import { type ReactNode, useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Skeleton as Bar } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { S } from "../engine";
import { afterPaint, canEnter, cn, Icon, M, RM } from "../lib";
import { TABLE_PAD, Typed } from "../scenes-gather";
import { FL, JoinPanel, WordAxis, WordRange, wordScale } from "./frame-body";
import { shown, streaming } from "./kit";
import {
  byId,
  byTypeOrder,
  cap,
  heading,
  joined,
  L,
  moveName,
  paperTree,
  plural,
  treeParagraphs,
  typeChip,
  typeOf,
  wordsOf,
} from "./outline-data";
import { Bars, StatementChip, scrollSoon } from "./outline-kit";
import { file, statement } from "./run";
import type { Tone } from "./stage-kit";
import {
  type BarRow,
  EffectList,
  Meter,
  type Part,
  ResultGrid,
  Section,
  StageAccent,
  SubHead,
  Takeaway,
  useAccent,
} from "./stage-visual";
import { Term } from "./term";
import type { ContractSection, JournalWritingContractFile } from "./types";

const SID = "S08";
const count = (list: string, total: number) => shown(SID, list, total);
const n = (x: number) => x.toLocaleString("en-US");

/* A statement with its words, as the detail lists it. */
export function StatementLine({ id, extra, picked }: { id: string; extra?: ReactNode; picked?: boolean }) {
  const chip = typeChip(typeOf(id) ?? "");
  return (
    <span
      data-stmt={id}
      className={cn(
        "grid scroll-mt-24 grid-cols-[auto_minmax(0,1fr)] items-start gap-2 rounded-md transition-shadow duration-500",
        picked && "ring-2 ring-ring/50 ring-offset-4 ring-offset-card",
      )}
    >
      <Badge className={cn("mt-px font-mono", chip.chip)}>{id}</Badge>
      <span className="text-pretty text-[13.5px] leading-5">
        {wordsOf(id) ?? <span className="text-muted-foreground">Not in the frozen graph</span>}
        {extra}
      </span>
    </span>
  );
}

/* ---------- what the scene knows before the contract: the engine's parts and the generic contract's counts ---------- */
const PARTS = ["data", "qualifier", "warrant", "backing", "rebuttal"];
const SECTIONS_AHEAD = 8;
const SENTENCE_RULES_AHEAD = 10;

/* ---------- what the scene reads ---------- */
const CITATION: Record<string, string> = { author_year: "Author–year", numbered: "Numbered", numeric: "Numbered" };
/** The rules of the contract, topic by topic, in the order the step reads them. */
export function ruleRows(c: JournalWritingContractFile) {
  const [a0, a1] = c.rules.abstract.words;
  const [w0, w1] = c.rules.words;
  return [
    { t: "Article", rule: cap(c.article_type) },
    { t: "Length", rule: `${n(w0)}–${n(w1)} words in all` },
    {
      t: "Abstract",
      rule: `${c.rules.abstract.form === "paragraph" ? "One paragraph" : cap(c.rules.abstract.form)}, ${a0}–${a1} words`,
    },
    { t: "Citations", rule: CITATION[c.rules.citation_style] ?? cap(c.rules.citation_style.replace(/_/g, " ")) },
  ];
}
/** Each statement type, where the contract puts it, and the statements of this paper with the section each went to. */
export function placementRows(c: JournalWritingContractFile) {
  const placed = file("PlacementMap.json")?.placement ?? {};
  const frozen = file("FrozenGraph_v1.json")?.statements ?? [];
  const types = [...new Set([...Object.keys(c.placement), ...Object.keys(placed).map((id) => typeOf(id) ?? "")])]
    .filter(Boolean)
    .sort(byTypeOrder);
  return types.map((type) => ({
    type,
    homes: c.placement[type] ?? [],
    here: Object.entries(placed)
      .filter(([id]) => typeOf(id) === type)
      .map(([id, sec]) => ({ id, sec: sec as string | null })),
    // A deferred hypothesis gets no place: its limitation carries it.
    deferred:
      type === "hypothesis"
        ? frozen.filter((s) => s.type === "hypothesis" && s.status === "deferred" && !(s.statement_id in placed))
        : [],
  }));
}
const TOU = ["data", "qualifier", "claim", "warrant", "backing", "rebuttal"];
export const argumentRows = (c: JournalWritingContractFile) =>
  Object.entries(c.argument_map).sort(([a], [b]) => {
    const i = (k: string) => (TOU.includes(k) ? TOU.indexOf(k) : TOU.length);
    return i(a) - i(b);
  });
/** What came of setting the profile's habits against the rules. */
const conflictsLine = (c: JournalWritingContractFile) =>
  c.conflicts.length ? `${plural(c.conflicts.length, "conflict")}, each settled by the rule` : "None to settle";
const noProfile = (c: JournalWritingContractFile) =>
  !Object.keys((c.habits as Record<string, unknown> | undefined) ?? {}).length;
/** The order of the types, then of the ids: how a section's chips line up. */
const byTypeThenId = (a: string, b: string) => byTypeOrder(typeOf(a) ?? "", typeOf(b) ?? "") || byId(a, b);
/** Each deferred hypothesis with the limitation of the frozen graph that carries it, and where that one goes. */
function carriers() {
  const frozen = file("FrozenGraph_v1.json")?.statements ?? [];
  const placed = file("PlacementMap.json")?.placement ?? {};
  const deferred = frozen.filter(
    (s) => s.type === "hypothesis" && s.status === "deferred" && !(s.statement_id in placed),
  );
  return deferred
    .map((h) => {
      const lim = frozen.find(
        (s) => s.type === "limitation" && s.hypothesis_id != null && s.hypothesis_id === h.hypothesis_id,
      );
      return { id: h.statement_id, lim: lim?.statement_id, sec: lim ? (placed[lim.statement_id] ?? null) : null };
    })
    .sort((a, b) => byId(a.id, b.id));
}
/** The contract once the stage plays it: before, the screen stands with its parts in skeleton. */
const contractShown = () => (count(L.rules, 1) > 0 ? file("JournalWritingContract.json") : undefined);
/** The statement types placed so far, as the stage streams them. */
function placedTypes(c?: JournalWritingContractFile) {
  const rows = c ? placementRows(c) : [];
  return new Set(rows.slice(0, c ? count(L.place, rows.length) : 0).map((r) => r.type));
}

/* ---------- what the stage did: the takeaway, its figures and charts, and its seven steps ---------- */
const STEPS: { k: string; title: string; sel: string }[] = [
  { k: "c0", title: "Check that the frame and the argument fit", sel: "[data-join]" },
  { k: "c1", title: "Read the publisher's rules", sel: "[data-rules]" },
  { k: "c2", title: "Place each statement type", sel: "[data-place]" },
  { k: "c3", title: "Map the parts of the argument", sel: "[data-tmap]" },
  { k: "c4", title: "Set the structure and the word budgets", sel: "[data-place]" },
  { k: "c5", title: "Set the sentence rules", sel: "[data-sent]" },
  { k: "c6", title: "Write the contract", sel: "[data-contract]" },
];
function stepResult(k: string, c?: JournalWritingContractFile): { tone: Tone | "wait" | "now"; result: string } {
  const st = S.st[SID];
  const now = st?.status === "running" && st.cur === k;
  const idle = { tone: now ? ("now" as const) : ("wait" as const), result: now ? "At work" : "Not done yet" };
  const r = file("JoinReport.json");
  if (k === "c0") {
    if (!r)
      return st?.status === "done" ? { tone: "none", result: "Not checked: the run came before the join check" } : idle;
    if (count(FL.join, r.findings.length) < r.findings.length) return idle;
    const { passed, failed_hard, to_look_at } = r.coverage;
    if (failed_hard) return { tone: "bad", result: `${plural(failed_hard, "hard rule")} failed` };
    if (to_look_at) return { tone: "look", result: `${passed} pass, ${to_look_at} to look at` };
    return { tone: "ok", result: `All ${plural(passed, "check")} pass` };
  }
  if (!c) return idle;
  const sec = c.rules.sections;
  if (k === "c1") {
    if (count(L.rules, ruleRows(c).length) < ruleRows(c).length) return idle;
    return noProfile(c)
      ? { tone: "look", result: "Rules alone: no journal profile measured" }
      : { tone: "ok", result: conflictsLine(c) };
  }
  if (k === "c2") {
    const rows = placementRows(c);
    if (count(L.place, rows.length) < rows.length) return idle;
    const placed = Object.keys(file("PlacementMap.json")?.placement ?? {}).length;
    return { tone: "ok", result: `${plural(placed, "statement")}, ${plural(rows.length, "type")}` };
  }
  if (k === "c3") {
    const rows = argumentRows(c);
    if (count(L.tmap, rows.length) < rows.length) return idle;
    return { tone: "ok", result: `${plural(rows.length, "part")}, each with its place` };
  }
  if (k === "c4") {
    if (count(L.budget, 1) < 1) return idle;
    return {
      tone: "ok",
      result: `${plural(sec.length, "section")}, ${n(c.rules.words[0])}–${n(c.rules.words[1])} words`,
    };
  }
  if (k === "c5") {
    if (count(L.sent, c.sentence_rules.length) < c.sentence_rules.length) return idle;
    return { tone: "ok", result: plural(c.sentence_rules.length, "sentence rule") };
  }
  if (count(L.lines, sec.length) < sec.length) return idle;
  return { tone: "ok", result: `${plural(sec.length, "section")} written` };
}

/** The join's checks by result, for the chart. */
function joinParts(passed: number, look: number, hard: number): Part[] {
  return [
    { key: "ok", label: "Passed", value: passed, swatch: "ok" },
    { key: "look", label: "To look at", value: look, swatch: "look" },
    { key: "bad", label: "Hard rule failed", value: hard, swatch: "bad" },
  ];
}

/* ---------- the paper laid out left to right: each section a column, each statement placed in it a chip ---------- */
const TYPE_CHIP: Record<string, string> = {
  finding:
    "bg-emerald-100 text-emerald-950 ring-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-50 dark:ring-emerald-800",
  conclusion: "bg-sky-100 text-sky-950 ring-sky-300 dark:bg-sky-900/50 dark:text-sky-50 dark:ring-sky-800",
  implication: "bg-sky-100 text-sky-950 ring-sky-300 dark:bg-sky-900/50 dark:text-sky-50 dark:ring-sky-800",
  comparison:
    "bg-violet-100 text-violet-950 ring-violet-300 dark:bg-violet-900/50 dark:text-violet-50 dark:ring-violet-800",
  limitation:
    "bg-indigo-100 text-indigo-950 ring-indigo-300 dark:bg-indigo-900/50 dark:text-indigo-50 dark:ring-indigo-800",
  gap: "bg-amber-100 text-amber-950 ring-amber-300 dark:bg-amber-900/50 dark:text-amber-50 dark:ring-amber-800",
};
function PaperColumns({
  secs,
  placed,
  types,
  carried,
}: {
  secs: { section_id: string; heading: string; required: boolean }[];
  placed: [string, string][];
  types: Set<string>;
  carried: { id: string }[];
}) {
  return (
    <div className="flex flex-col gap-2">
      <ol className="grid gap-2 @2xl:grid-cols-4 @5xl:grid-cols-8">
        {secs.map((s, i) => {
          const here = placed.filter(([id, sec]) => sec === s.section_id);
          const on = here.filter(([id]) => types.has(typeOf(id) ?? ""));
          return (
            <li
              key={s.section_id}
              className="flex min-w-0 flex-col gap-1.5 rounded-lg bg-card p-2 ring-1 ring-foreground/10"
            >
              <span className="flex items-baseline justify-between gap-1">
                <span className="min-w-0 truncate font-semibold text-[12.5px]">
                  <span className="mr-1 font-mono font-normal text-[10.5px] text-muted-foreground">{i + 1}</span>
                  {s.heading}
                </span>
                <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">{here.length}</span>
              </span>
              {!s.required && <span className="-mt-1 text-[10.5px] text-muted-foreground">optional</span>}
              <span className="flex min-h-8 flex-wrap content-start gap-1">
                {on.map(([id]) => (
                  <span
                    key={id}
                    title={plainName(id)}
                    className={cn(
                      "inline-flex h-5 items-center rounded px-1 font-mono font-medium text-[10.5px] ring-1 ring-inset",
                      TYPE_CHIP[typeOf(id) ?? ""] ?? "bg-muted text-foreground ring-foreground/10",
                    )}
                  >
                    {id}
                  </span>
                ))}
                {!here.length && <span className="text-[11px] text-muted-foreground">framing only</span>}
              </span>
            </li>
          );
        })}
      </ol>
      {carried.length > 0 && (
        <p className="text-[12.5px] text-muted-foreground">
          No place of its own:{" "}
          {carried.map((d, i) => (
            <span key={d.id}>
              {i > 0 && ", "}
              <b className="font-mono font-medium text-foreground">{d.id}</b>
            </span>
          ))}{" "}
          (deferred, carried by its limitation).
        </p>
      )}
      <p className="flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] text-muted-foreground">
        {[
          ["finding", "finding"],
          ["conclusion", "conclusion · implication"],
          ["comparison", "comparison with prior work"],
          ["gap", "gap"],
          ["limitation", "limitation"],
        ].map(([k, label]) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <span className={cn("size-2.5 rounded-sm ring-1 ring-inset", TYPE_CHIP[k])} />
            {label}
          </span>
        ))}
      </p>
    </div>
  );
}

function JournalOverview() {
  const r = file("JoinReport.json");
  const c = contractShown();
  const placement = file("PlacementMap.json")?.placement;
  const rows = c ? placementRows(c) : [];
  const ready =
    S.st[SID]?.status === "done"
      ? Boolean(c && placement)
      : Boolean(c && placement) && count(L.place, rows.length) === rows.length;
  const secs = c?.rules.sections ?? [];
  const placed = Object.entries(placement ?? {});
  const carried = carriers();
  const deferred = new Set(carried.map((d) => d.id));
  const frozen = file("FrozenGraph_v1.json")?.statements ?? [];
  const homeless = frozen.filter((s) => !(s.statement_id in (placement ?? {})) && !deferred.has(s.statement_id)).length;
  const joinOn = r ? count(FL.join, r.findings.length) : 0;
  const joinIn = Boolean(r) && joinOn >= (r?.findings.length ?? 0);
  // While the check streams, its counts grow with the findings shown; once shown, they are the report's own.
  const seen = (r?.findings ?? []).slice(0, joinOn);
  const passed = joinIn ? (r?.coverage.passed ?? 0) : seen.filter((x) => x.passed).length;
  const hard = joinIn ? (r?.coverage.failed_hard ?? 0) : seen.filter((x) => !x.passed && x.kind === "H").length;
  const look = joinIn ? (r?.coverage.to_look_at ?? 0) : seen.filter((x) => !x.passed && x.kind !== "H").length;
  const total = r ? r.coverage.passed + r.coverage.failed_hard + r.coverage.to_look_at : 0;
  let checksTone: Tone = "ok";
  if (hard) checksTone = "bad";
  else if (look) checksTone = "look";
  let _checksHint = "Every check holds";
  if (hard) _checksHint = `${plural(hard, "hard rule")} failed`;
  else if (look) _checksHint = `${plural(look, "point")} to look at`;
  let headline: string;
  if (hard)
    headline = `The frame and the argument do not fit yet: ${plural(hard, "hard rule")} failed. The check below names where to fix ${hard === 1 ? "it" : "each"}.`;
  else
    headline = `${r ? "The frame and the argument fit" : "The argument is placed in the frame"}${
      look ? `, with ${plural(look, "point")} to look at` : ""
    }: ${
      homeless
        ? `${plural(homeless, "statement")} of the frozen graph still ${homeless === 1 ? "has" : "have"} no section.`
        : `every statement the paper writes has its section${
            carried.length
              ? `, and ${plural(carried.length, "deferred hypothesis", "deferred hypotheses")} rides on its limitation`
              : ""
          }.`
    }`;
  // The bars grow with the statement types placed so far.
  const types = placedTypes(c);
  const bars: BarRow[] = secs.map((s) => {
    const k = placed.filter(([id, sec]) => sec === s.section_id && types.has(typeOf(id) ?? "")).length;
    const all = placed.filter(([, sec]) => sec === s.section_id).length;
    return {
      key: s.section_id,
      name: s.heading,
      label: (
        <>
          {s.heading}
          {!s.required && <span className="text-muted-foreground"> · optional</span>}
        </>
      ),
      parts: [{ key: "placed", label: "Statements placed", value: k, swatch: "accent" }],
      total: all,
      end: all ? plural(all, "statement") : "None of its own",
    };
  });
  if (carried.length)
    bars.push({
      key: "deferred",
      name: "No place: deferred",
      label: <span className="text-muted-foreground">No place: deferred</span>,
      parts: [
        { key: "deferred", label: "Deferred", value: types.has("hypothesis") ? carried.length : 0, swatch: "none" },
      ],
      total: carried.length,
      end: plural(carried.length, "hypothesis", "hypotheses"),
    });
  const _parts = joinParts(passed, look, hard);
  return (
    <Section
      icon="target"
      title="What this stage did"
      tells="Code joined the writing frame with the locked argument: it checked that they fit, then placed every statement in the section that takes it and wrote the contract every writer works inside."
      data-key-result
    >
      <div className="@container flex flex-col gap-4 px-4 py-4 sm:px-5">
        <Takeaway ready={ready}>{headline}</Takeaway>
        <div className="flex flex-col gap-2.5 rounded-lg bg-muted/25 p-4 ring-1 ring-foreground/5">
          <SubHead
            title="Where each statement goes in the paper"
            tells="The sections in reading order, as the contract sets them; each chip is a statement of the locked argument placed in the one section that takes it. Hover a chip for its name."
            aside={frozen.length ? `${placed.length} of ${frozen.length} placed` : undefined}
          />
          {c ? (
            <PaperColumns secs={secs} placed={placed} types={types} carried={carried} />
          ) : (
            <Bars n={4} last="w-2/3" />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg px-4 py-3 ring-1 ring-foreground/10">
          <span className="font-semibold text-[13px]">Do the frame and the argument fit?</span>
          {r ? (
            <>
              <span className="text-[13px]">
                <b
                  className={cn(
                    "font-semibold tabular-nums",
                    passed === total ? "text-emerald-700 dark:text-emerald-300" : "",
                  )}
                >
                  {passed}
                </b>{" "}
                of {total} checks pass
              </span>
              {look > 0 && (
                <span className="text-[13px] text-amber-700 dark:text-amber-300">
                  {plural(look, "point")} to look at
                </span>
              )}
              {hard > 0 && (
                <span className="text-[13px] text-rose-700 dark:text-rose-300">{plural(hard, "hard rule")} failed</span>
              )}
              <span className="min-w-40 flex-1">
                <Meter value={passed} max={total} tone={checksTone} label="Join checks passed" />
              </span>
            </>
          ) : (
            <span className="text-[13px] text-muted-foreground">This run was made before the join check.</span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <SubHead
            title="The seven steps"
            tells="Each step in order, with what it set. Click one to read it in full."
          />
          <ResultGrid
            items={STEPS.map((x) => {
              const res = stepResult(x.k, c);
              return { key: x.k, title: x.title, result: res.result, tone: res.tone, onPick: () => scrollSoon(x.sel) };
            })}
          />
        </div>
      </div>
    </Section>
  );
}

/** A statement by its plain name first and its id after: "Hypothesis 4 (H4)". */
export function plainName(id: string) {
  const name = typeChip(typeOf(id) ?? "").name;
  const num = id.replace(/^[A-Za-z]+/, "");
  return `${name}${/^\d+$/.test(num) ? ` ${num}` : ""} (${id})`;
}
const plainOnly = (id: string) => {
  const name = typeChip(typeOf(id) ?? "").name;
  const num = id.replace(/^[A-Za-z]+/, "");
  return `${name}${/^\d+$/.test(num) ? ` ${num}` : ""}`;
};

/* ---------- what it means for the paper: what each section carries, and what has no place ---------- */
function JournalPaper() {
  const c = contractShown();
  const placement = file("PlacementMap.json")?.placement ?? {};
  const types = placedTypes(c);
  const secs = c?.rules.sections ?? [];
  const placed = Object.entries(placement).filter(([id]) => types.has(typeOf(id) ?? ""));
  const done = Boolean(c) && count(L.place, c ? placementRows(c).length : 0) >= (c ? placementRows(c).length : 1);
  const carries = secs.map((s) => ({ s, ids: placed.filter(([, sec]) => sec === s.section_id).map(([id]) => id) }));
  const items: { key: string; item: ReactNode; effect: ReactNode; tone?: Tone; id?: string }[] = carries
    .filter((x) => x.ids.length)
    .map(({ s, ids }) => {
      const kinds = [...new Set(ids.map((id) => typeChip(typeOf(id) ?? "").name.toLowerCase()))];
      return {
        key: s.section_id,
        item: s.heading,
        effect: `carries ${plural(ids.length, "statement")}: ${joined(kinds)}.`,
        tone: "ok" as Tone,
      };
    });
  const empty = carries.filter((x) => !x.ids.length).map((x) => x.s.heading);
  if (done && empty.length)
    items.push({
      key: "empty",
      item: joined(empty),
      effect: `${empty.length === 1 ? "carries" : "carry"} no statement of ${empty.length === 1 ? "its" : "their"} own: ${
        empty.length === 1 ? "it is" : "they are"
      } written from the record or restate what other sections place.`,
      tone: "none",
    });
  if (types.has("hypothesis"))
    for (const d of carriers())
      items.push({
        key: d.id,
        item: plainOnly(d.id),
        id: d.id,
        effect: `has no section: it was not tested${
          d.lim ? `, and its limitation (${d.lim}) carries it${d.sec ? ` in ${heading(d.sec)}` : ""}` : ""
        }.`,
        tone: "none",
      });
  return (
    <Section
      icon="pen"
      title="What it means for the paper"
      tells="Which section will state each statement of the argument, so no claim is written twice or left out."
    >
      <div className="px-4 py-3 sm:px-5">
        {items.length ? <EffectList items={items} /> : <Bars n={4} last="w-1/2" className="py-2" />}
      </div>
    </Section>
  );
}

/* ---------- the publisher's rules: what the journal asks of every paper of this type ---------- */
function RulesSection({ now }: { now: ReactNode }) {
  const c = contractShown();
  const rules = c ? ruleRows(c) : [];
  const on = c ? count(L.rules, rules.length) : 0;
  return (
    <Section
      icon="book"
      title="The publisher's rules"
      tells={
        <>
          What the journal asks of every paper of this type. They make the{" "}
          <Term t="writing contract">writing contract</Term>; a measured profile's habits are kept apart from them.
        </>
      }
      now={now}
      aside={
        c && (
          <Badge variant="outline" className="font-normal">
            {c.journal}
          </Badge>
        )
      }
      data-rules
    >
      <div className="flex flex-col gap-3 px-4 py-4 sm:px-5">
        <dl className="grid grid-cols-2 gap-2.5 lg:grid-cols-5">
          {(rules.length ? rules : ["Article", "Length", "Abstract", "Citations"].map((t) => ({ t, rule: "" }))).map(
            (r, i) => (
              <div
                key={r.t}
                className="flex min-w-0 flex-col gap-1 rounded-lg bg-muted/40 px-3.5 py-3 ring-1 ring-foreground/5"
              >
                <dt className="text-[12.5px] text-muted-foreground">{r.t}</dt>
                <dd className="font-semibold text-[15px] leading-snug">
                  {i < on ? (
                    <Typed text={r.rule} on={streaming(L.rules, r.t)} />
                  ) : (
                    <Bar className="mt-1.5 h-2.5 w-3/4 animate-none rounded-full" />
                  )}
                </dd>
              </div>
            ),
          )}
          <div className="col-span-2 flex min-w-0 flex-col gap-1 rounded-lg bg-muted/40 px-3.5 py-3 ring-1 ring-foreground/5 lg:col-span-1">
            <dt className="text-[12.5px] text-muted-foreground">Habits against the rules</dt>
            <dd className="font-semibold text-[15px] leading-snug">
              {c && on === rules.length ? (
                conflictsLine(c)
              ) : (
                <Bar className="mt-1.5 h-2.5 w-2/3 animate-none rounded-full" />
              )}
            </dd>
          </div>
        </dl>
        {c && on === rules.length && (
          <p className="text-pretty text-[13px] text-muted-foreground">
            {noProfile(c)
              ? `${c.journal}: no journal profile was measured for this run, so the publisher's rules alone make the contract.`
              : `${c.journal}: the ${c.profile} profile's habits are kept apart from the rules.`}
          </p>
        )}
      </div>
    </Section>
  );
}

/* ---------- where each statement goes: each section, its word budget and the statements placed in it ---------- */
type Pick = (sec: string, id?: string) => void;
/* The grid the rows share: the section, its budget on the axis, the range in words, the statements. */
const ROW = "@3xl:grid-cols-[10rem_minmax(0,1fr)_5.5rem_minmax(0,1.2fr)]";

function PlacementSection({ onPick, now }: { onPick: Pick; now: ReactNode }) {
  const a = useAccent();
  const c = contractShown();
  const secs = c?.rules.sections ?? [];
  const rows = c ? placementRows(c) : [];
  const typesOn = c ? count(L.place, rows.length) : 0;
  const types = placedTypes(c);
  const placement = file("PlacementMap.json")?.placement ?? {};
  const ids = Object.keys(placement);
  const budgets = Boolean(c) && count(L.budget, 1) > 0;
  const carried = carriers();
  const deferredOn = types.has("hypothesis");
  const placingDone = Boolean(c) && typesOn === rows.length;
  const { end, ticks } = wordScale(Math.max(...secs.map((s) => s.words[1] ?? 0), 1));
  const legendTypes = [...new Set([...ids.map((id) => typeOf(id) ?? ""), ...(carried.length ? ["hypothesis"] : [])])]
    .filter(Boolean)
    .sort(byTypeOrder);
  return (
    <Section
      icon="layers"
      title="Where each statement goes"
      tells="Each section in reading order, its word budget on one scale, and the statements of the argument placed in it. Click a section or a statement to read its contract."
      now={now}
      aside={c ? plural(ids.length, "statement") : undefined}
      data-place
      data-budget
      data-out="JournalWritingContract.json PlacementMap.json"
    >
      <div className="@container flex flex-col gap-4 px-4 py-4 sm:px-5">
        {/* The legend first: what a bar and a chip stand for. */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12.5px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className={cn("h-2 w-7 rounded-full", a.mark)} />
            Word budget, fewest to most
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className={cn("h-2 w-7 rounded-full opacity-40", a.mark)} />
            Optional section
          </span>
          {legendTypes.length > 0 && <span aria-hidden="true" className="h-3 w-px bg-border max-sm:hidden" />}
          {legendTypes.map((t) => {
            const chip = typeChip(t);
            return (
              <span key={t} className="inline-flex items-center gap-1">
                <span className={cn("rounded px-1 font-medium font-mono text-[11px] leading-4", chip.chip)}>
                  {chip.tag}
                </span>
                {chip.name}
              </span>
            );
          })}
        </div>
        <div>
          <div
            aria-hidden="true"
            className={cn("@3xl:grid hidden gap-x-4 pb-1.5 text-[12px] text-muted-foreground", ROW)}
          >
            <span>Section</span>
            <WordAxis end={end} ticks={ticks} />
            <span className="text-right">Words</span>
            <span>Statements placed</span>
          </div>
          <p className="@3xl:hidden pb-1.5 text-[12px] text-muted-foreground">
            Each bar on one scale, from 0 to {n(end)} words.
          </p>
          <ol className="border-t">
            {(c ? secs : Array.from({ length: SECTIONS_AHEAD }, () => null)).map((s, i) => {
              if (!s)
                return (
                  <li
                    // biome-ignore lint/suspicious/noArrayIndexKey: skeleton rows never reorder
                    key={i}
                    aria-hidden="true"
                    className={cn(
                      "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 border-b py-3",
                      ROW,
                    )}
                  >
                    <Bar className="h-3 w-24 animate-none rounded-full" />
                    <Bar className="@3xl:order-none order-3 @3xl:col-span-1 col-span-2 h-2 w-1/2 animate-none rounded-full" />
                    <Bar className="@3xl:order-none order-2 ml-auto h-2.5 w-14 animate-none rounded-full" />
                    <span className="@3xl:order-none order-4 @3xl:col-span-1 col-span-2 flex gap-1">
                      <Bar className="h-5 w-10 animate-none rounded-md" />
                      <Bar className="h-5 w-10 animate-none rounded-md" />
                    </span>
                  </li>
                );
              const here = ids.filter((id) => placement[id] === s.section_id).sort(byTypeThenId);
              const shownHere = here.filter((id) => types.has(typeOf(id) ?? ""));
              const waiting = here.length - shownHere.length;
              return (
                <li
                  key={s.section_id}
                  data-row={s.section_id}
                  className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 border-b py-3", ROW)}
                >
                  <button
                    type="button"
                    onClick={() => onPick(s.section_id)}
                    className="min-w-0 rounded-sm text-left outline-none hover:underline hover:underline-offset-2 focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <b className="flex items-baseline gap-2 font-medium text-[14px] leading-5">
                      <span className="font-mono font-normal text-[12px] text-muted-foreground">{i + 1}</span>
                      {s.heading}
                    </b>
                    <span className="block pl-[1.1rem] text-[12px] text-muted-foreground leading-4">
                      {budgets ? (
                        <>
                          {s.required ? "Required" : "Optional"}
                          {s.single_paragraph ? " · one paragraph" : ""}
                        </>
                      ) : (
                        <Bar className="mt-1 h-2 w-14 animate-none rounded-full" />
                      )}
                    </span>
                  </button>
                  <span className="@3xl:order-none order-3 @3xl:col-span-1 col-span-2 min-w-0">
                    <WordRange
                      words={s.words}
                      optional={!s.required}
                      end={end}
                      ticks={ticks}
                      drawn={budgets}
                      delay={i * 0.06}
                      label={s.heading}
                    />
                  </span>
                  <span className="@3xl:order-none order-2 text-right font-mono text-[12px] tabular-nums">
                    {budgets ? (
                      `${n(s.words[0])}–${n(s.words[1])}`
                    ) : (
                      <Bar className="ml-auto h-2.5 w-14 animate-none rounded-full" />
                    )}
                  </span>
                  <span className="@3xl:order-none order-4 @3xl:col-span-1 col-span-2 flex min-w-0 flex-wrap items-center gap-1">
                    {shownHere.map((id, k) => (
                      <M key={id} as="span" in="fade" delay={canEnter() ? k * 0.04 : 0} className="inline-flex">
                        <StatementChip id={id} onPick={() => onPick(s.section_id, id)} />
                      </M>
                    ))}
                    {Array.from({ length: waiting }, (_, k) => (
                      <Bar
                        // biome-ignore lint/suspicious/noArrayIndexKey: placeholders of chips still to place
                        key={k}
                        aria-hidden="true"
                        className="h-5 w-10 animate-none rounded-md"
                      />
                    ))}
                    {!here.length && placingDone && (
                      <span className="text-[12.5px] text-muted-foreground">No statement of the frozen graph</span>
                    )}
                  </span>
                </li>
              );
            })}
            {c && carried.length > 0 && (
              <li
                data-row="deferred"
                className={cn("grid grid-cols-[minmax(0,1fr)] items-center gap-x-4 gap-y-2 py-3", ROW)}
              >
                <span className="min-w-0">
                  <b className="block font-medium text-[14px] text-muted-foreground leading-5">No place</b>
                  <span className="block text-[12px] text-muted-foreground leading-4">
                    {carried.length === 1 ? "A deferred hypothesis" : "Deferred hypotheses"}
                  </span>
                </span>
                <span className="@3xl:col-span-2 text-pretty text-[12.5px] text-muted-foreground leading-snug">
                  {deferredOn ? (
                    <>
                      Not tested in this study;{" "}
                      {carried.length === 1 ? "its limitation carries it" : "each is carried by its limitation"}
                      {carried[0]?.sec ? ` in ${heading(carried[0].sec)}` : ""}.
                    </>
                  ) : (
                    <Bar className="h-2.5 w-3/4 animate-none rounded-full" />
                  )}
                </span>
                <span className="flex min-w-0 flex-wrap items-center gap-1">
                  {deferredOn
                    ? carried.map((d) => (
                        <M key={d.id} as="span" in="fade" className="inline-flex">
                          <StatementChip
                            id={d.id}
                            onPick={d.lim && d.sec ? () => onPick(d.sec as string, d.lim) : undefined}
                          />
                        </M>
                      ))
                    : carried.map((d) => (
                        <Bar key={d.id} aria-hidden="true" className="h-5 w-10 animate-none rounded-md" />
                      ))}
                </span>
              </li>
            )}
          </ol>
        </div>
      </div>
    </Section>
  );
}

/* The contract's rule for each statement type: where a type may go, and where this paper's statements of it went. */
function TypesSection() {
  const c = contractShown();
  const rows = c ? placementRows(c) : [];
  const on = c ? count(L.place, rows.length) : 0;
  return (
    <Section
      icon="list"
      title="Where each statement type may go"
      tells="The contract's home for each type of statement, and where this paper's statements of that type went."
      aside={rows.length ? plural(rows.length, "type") : undefined}
    >
      <Table className="table-fixed text-[13.5px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[32%] pl-4 sm:pl-5">Statement type</TableHead>
            <TableHead>The contract puts it in</TableHead>
            <TableHead className="pr-4 max-sm:hidden sm:pr-5">In this paper</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {c
            ? rows.map((r, i) => {
                const chip = typeChip(r.type);
                const order = c.rules.sections.map((x) => x.section_id);
                const bySec = Object.entries(Object.groupBy(r.here, (x) => x.sec ?? "none")).sort(
                  ([x], [y]) => order.indexOf(x) - order.indexOf(y),
                );
                const parts = bySec.map(
                  ([sec, xs]) => `${xs?.length ?? 0} in ${sec === "none" ? "no section" : heading(sec)}`,
                );
                if (r.deferred.length) parts.push(`${r.deferred.length} deferred, no place`);
                const inPaper = parts.join(" · ") || "None among the frozen statements";
                return (
                  <TableRow key={r.type}>
                    <TableCell className={cn(TABLE_PAD, "sm:first:pl-5")}>
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <Badge className={cn("font-mono", chip.chip)}>{chip.tag}</Badge>
                        {chip.name}
                      </span>
                    </TableCell>
                    <TableCell className={cn(TABLE_PAD, "leading-5")}>
                      {i < on ? (
                        <>
                          {r.homes.map(heading).join(" or ") || "No place"}
                          <span className="mt-0.5 block text-[12.5px] text-muted-foreground sm:hidden">{inPaper}</span>
                        </>
                      ) : (
                        <Bars n={1} />
                      )}
                    </TableCell>
                    <TableCell className={cn(TABLE_PAD, "text-muted-foreground leading-5 max-sm:hidden sm:last:pr-5")}>
                      {i < on ? inPaper : <Bars n={1} />}
                    </TableCell>
                  </TableRow>
                );
              })
            : Array.from({ length: 6 }, (_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: skeleton rows never reorder
                <TableRow key={i} aria-hidden="true" className="hover:bg-transparent">
                  <TableCell className={cn(TABLE_PAD, "sm:first:pl-5")}>
                    <Bars n={1} last="w-3/5" />
                  </TableCell>
                  <TableCell className={TABLE_PAD}>
                    <Bars n={1} last="w-1/2" />
                  </TableCell>
                  <TableCell className={cn(TABLE_PAD, "max-sm:hidden sm:last:pr-5")}>
                    <Bars n={1} last="w-2/3" />
                  </TableCell>
                </TableRow>
              ))}
        </TableBody>
      </Table>
    </Section>
  );
}

/* ---------- c3 · each part of a Toulmin argument and the place in the paper it is written ---------- */
function ArgumentSection({ now }: { now: ReactNode }) {
  const c = contractShown();
  const rows = c ? argumentRows(c) : PARTS.map((part) => [part, ""] as [string, string]);
  const on = c ? count(L.tmap, rows.length) : 0;
  return (
    <Section
      icon="graph"
      title="Where each part of the argument is written"
      tells={
        <>
          Each part of a <Term t="toulmin">Toulmin</Term> argument, and the place in the paper that carries it.
        </>
      }
      now={now}
      aside={c ? plural(rows.length, "part") : undefined}
      data-tmap
    >
      <dl className="grid gap-2.5 px-4 py-4 sm:grid-cols-2 sm:px-5 xl:grid-cols-5">
        {rows.map(([part, line], i) => (
          <div
            key={part}
            className="flex min-w-0 flex-col gap-1 rounded-lg bg-muted/40 px-3.5 py-3 ring-1 ring-foreground/5"
          >
            <dt className="font-semibold text-[13.5px]">
              <Term t={part}>{cap(part)}</Term>
            </dt>
            <dd className="text-pretty text-[13px] text-muted-foreground leading-snug">
              {i < on ? <Typed text={cap(line)} on={streaming(L.tmap, part)} /> : <Bars n={2} last="w-2/3" />}
            </dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}

/* ---------- c5 · the sentence rules every writer follows ---------- */
function SentenceSection({ now }: { now: ReactNode }) {
  const a = useAccent();
  const c = contractShown();
  const rows = c?.sentence_rules ?? Array.from({ length: SENTENCE_RULES_AHEAD }, () => "");
  const on = c ? count(L.sent, rows.length) : 0;
  return (
    <Section
      icon="pen"
      title="Sentence rules"
      tells="How every sentence of the paper reads, whoever writes it."
      now={now}
      aside={c ? plural(rows.length, "rule") : undefined}
      data-sent
    >
      <ol className="grid gap-x-8 gap-y-2.5 px-4 py-4 sm:px-5 md:grid-cols-2">
        {rows.map((text, i) => {
          const id = String(i);
          return (
            <li key={id} className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-2 text-[13.5px] leading-snug">
              <span
                className={cn(
                  "grid size-5 place-items-center rounded-md font-mono text-[11px] tabular-nums",
                  i < on ? a.chip : "bg-muted text-muted-foreground/60",
                )}
              >
                {i + 1}
              </span>
              {i < on ? (
                <span className="text-pretty">
                  <Typed text={text} on={streaming(L.sent, id)} />
                </span>
              ) : (
                <Bars n={1} last="w-4/5" />
              )}
            </li>
          );
        })}
      </ol>
      {c && noProfile(c) && (
        <p className="border-t px-4 py-2.5 text-[12.5px] text-muted-foreground sm:px-5">
          Habits for tense, voice and length need a journal profile; the tense of each section is a rule, in its
          contract below.
        </p>
      )}
    </Section>
  );
}

/* ---------- c6 · the contract every writer works inside, section by section ---------- */
/* The skeleton a section is planned in: each slot and the statement types it takes. */
export function SlotsOf({ slots }: { slots: { name: string; takes?: string[]; source?: string }[] }) {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {slots.map((x) => (
        <Badge key={x.name} variant="outline" title={x.source} className="font-normal">
          {x.name}
          {x.takes?.length ? (
            <span className="text-muted-foreground"> · {x.takes.map((t) => t.replace(/_/g, " ")).join(", ")}</span>
          ) : null}
        </Badge>
      ))}
    </span>
  );
}
export function MoveChain({ moves }: { moves: string[] }) {
  return (
    <span className="flex flex-wrap items-center gap-1">
      {moves.map((m, i) => (
        <span key={m} className="inline-flex items-center gap-1">
          {i > 0 && <Icon n="right" className="size-3 text-muted-foreground" />}
          <span className="rounded-md bg-muted px-1.5 py-px text-[12.5px] leading-5">{moveName(m)}</span>
        </span>
      ))}
    </span>
  );
}

/* One section in the list: its number and heading on one line, and "optional" where it may be left out. */
function SectionTab({
  s,
  index,
  selected,
  written,
  structured,
  onPick,
}: {
  s: ContractSection;
  index: number;
  selected: boolean;
  /** Its contract is written: before, the tab stands dimmed. */
  written: boolean;
  /** The structure is set, so whether it is required is known. */
  structured: boolean;
  onPick(): void;
}) {
  const a = useAccent();
  return (
    <button
      type="button"
      role="tab"
      id={`sec-tab-${s.section_id}`}
      aria-selected={selected}
      aria-controls="sec-panel"
      onClick={onPick}
      className={cn(
        "relative flex shrink-0 items-center gap-2.5 rounded-lg px-2 py-1.5 text-left outline-none transition-[background-color,opacity] duration-300 focus-visible:ring-2 focus-visible:ring-ring lg:w-full",
        selected ? a.soft : "hover:bg-muted/50",
        !written && "opacity-60",
      )}
    >
      {selected && (
        <span
          aria-hidden="true"
          className={cn("absolute inset-y-1.5 left-0 w-0.5 rounded-full max-lg:hidden", a.mark)}
        />
      )}
      <span
        className={cn(
          "grid size-7 shrink-0 place-items-center rounded-md font-mono text-xs",
          selected ? a.chip : "bg-background text-muted-foreground ring-1 ring-foreground/10",
        )}
      >
        {index + 1}
      </span>
      <span className="flex min-w-0 flex-1 items-baseline gap-1.5 whitespace-nowrap">
        <b className="truncate font-medium text-[13.5px]">{s.heading}</b>
        {structured && !s.required && <span className="shrink-0 text-[12px] text-muted-foreground">optional</span>}
      </span>
    </button>
  );
}

/** Paragraph numbers as the outline prints them: "paragraph 7.1", "paragraphs 6.1–6.3". */
function paragraphsLabel(ns: string[]) {
  if (ns.length < 2) return `paragraph ${ns[0] ?? ""}`;
  return `paragraphs ${ns.length > 2 ? `${ns[0]}–${ns[ns.length - 1]}` : ns.join(" and ")}`;
}
/** Where a statement is placed, for the hover of a chip that a section restates. */
function homeOf(id: string) {
  const sec = file("PlacementMap.json")?.placement[id];
  if (sec) return `Placed in ${heading(sec)}`;
  return statement(id)?.status === "deferred" ? "Deferred: no section of its own" : "No section of its own";
}
type Note = { kind: "restates"; ids: string[]; paras: string[] } | { kind: "line"; icon: string; text: string };
/**
 * Why a section with no statement placed in it still has something to say, from the run's files: the outline restates
 * statements placed elsewhere in it, code writes it from the record, the outline leaves it out, or, before the outline
 * is made, the contract lets it restate what other sections place.
 */
function noteOf(s: ContractSection): Note {
  const tree = paperTree();
  const node = tree?.sections.find((x) => x.template === s.section_id);
  if (node?.written_by === "code") return { kind: "line", icon: "file", text: "Written by code from the record." };
  const ids = [...new Set((node?.paragraphs ?? []).flatMap((p) => p.sentences.flatMap((x) => x.statements)))];
  if (node && ids.length) {
    const paras = treeParagraphs(tree)
      .filter((x) => x.sec === s.section_id)
      .map((x) => x.n);
    return { kind: "restates", ids, paras };
  }
  const bp = file("ManuscriptBlueprint.json");
  if (bp && !bp.sections.some((x) => x.section_id === s.section_id))
    return {
      kind: "line",
      icon: "minus",
      text: `Left out of this paper's outline${s.required ? "" : " (optional)"}.`,
    };
  // Before the outline plans it: a section the contract names as one home among others for a type.
  const homes = Object.values(file("JournalWritingContract.json")?.placement ?? {});
  if (!node && homes.some((h) => h.length > 1 && h.includes(s.section_id)))
    return { kind: "line", icon: "info", text: "Restates statements placed elsewhere; the outline plans which." };
  return { kind: "line", icon: "info", text: "No statement of the frozen graph is placed here." };
}

/* The chosen section: its budget, what it does, the moves it makes and its tense, and the statements placed in it. A
 * section with no statement of its own is one column, saying why from the run's files. */
function SectionPanel({
  s,
  index,
  total,
  written,
  structured,
  typing,
  here,
  picked,
}: {
  s: ContractSection;
  index: number;
  total: number;
  written: boolean;
  structured: boolean;
  typing: boolean;
  here: string[];
  picked: string | null;
}) {
  const note = here.length ? null : noteOf(s);
  return (
    <M
      key={s.section_id}
      in="fade"
      dur={220}
      id="sec-panel"
      role="tabpanel"
      aria-labelledby={`sec-tab-${s.section_id}`}
      data-sec={s.section_id}
      className="@container min-w-0 scroll-mt-4"
    >
      <header className="border-b bg-card px-5 pt-4 pb-3.5 lg:sticky lg:top-0 lg:z-10">
        <p className="text-[12.5px] text-muted-foreground tabular-nums">
          Section {index + 1} of {total}
          {structured &&
            ` · ${n(s.words[0])}–${n(s.words[1])} words · ${s.required ? "Required" : "Optional"}${
              s.single_paragraph ? " · one paragraph" : ""
            }`}
        </p>
        <h4 className="mt-0.5 font-semibold text-lg leading-tight">{s.heading}</h4>
        <div className="mt-1.5 max-w-3xl text-pretty text-[13.5px] leading-relaxed">
          {written ? <Typed text={s.guidance} on={typing} /> : <Bars n={2} last="w-3/5" />}
        </div>
      </header>
      <div className={cn("grid gap-x-8 gap-y-5 px-5 py-4", here.length > 0 && "@3xl:grid-cols-2")}>
        <div className="flex min-w-0 flex-col gap-3">
          {written ? (
            <dl className="grid grid-cols-[4.5rem_minmax(0,1fr)] content-start items-start gap-x-3 gap-y-2.5 text-[13.5px]">
              <dt className="pt-0.5 text-[12.5px] text-muted-foreground">Moves</dt>
              <dd>
                <MoveChain moves={s.moves} />
              </dd>
              <dt className="pt-0.5 text-[12.5px] text-muted-foreground">Tense</dt>
              <dd className="leading-snug">{s.tense}</dd>
              {s.slots.length > 0 && (
                <>
                  <dt className="pt-0.5 text-[12.5px] text-muted-foreground">Skeleton</dt>
                  <dd>
                    <SlotsOf slots={s.slots} />
                  </dd>
                </>
              )}
            </dl>
          ) : (
            <Bars n={2} last="w-1/2" />
          )}
          {note?.kind === "line" && (
            <p className="flex items-center gap-2 text-[13.5px] text-muted-foreground">
              <Icon n={note.icon} className="size-3.5" />
              {note.text}
            </p>
          )}
          {note?.kind === "restates" && (
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1.5 text-[13.5px] text-muted-foreground">
              <span>Restates what other sections place:</span>
              {note.ids.map((id) => (
                <StatementChip key={id} id={id} note={homeOf(id)} />
              ))}
              <span>· {paragraphsLabel(note.paras)} of the Outline</span>
            </div>
          )}
        </div>
        {here.length > 0 && (
          <div className="min-w-0">
            <h5 className="mb-2 font-medium text-[12.5px] text-muted-foreground">
              Statements placed here ({here.length})
            </h5>
            <ul className="flex flex-col gap-2">
              {here.map((id) => (
                <li key={id}>
                  <StatementLine id={id} picked={picked === id} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </M>
  );
}

/* c6 · the writing contract as an inspector: the sections down the side, the chosen one's contract beside them. */
function ContractSectionView({
  chosen,
  onChoose,
  picked,
  pickedAt,
  now,
}: {
  chosen: string | null;
  onChoose(sec: string): void;
  picked: string | null;
  /** When the statement was picked in the shape: each pick brings it into view again. */
  pickedAt: number;
  now: ReactNode;
}) {
  const c = contractShown();
  const secs = c?.rules.sections ?? [];
  const on = c ? count(L.lines, secs.length) : 0;
  const structured = Boolean(c) && count(L.budget, 1) > 0;
  const placement = file("PlacementMap.json")?.placement ?? {};
  // The section on show: the one a person chose; while the contract is written, the one being written; else the first.
  const st = S.st[SID];
  const writing = st?.status === "running" && st.cur === "c6" ? secs[Math.max(0, on - 1)]?.section_id : undefined;
  const shownSec = chosen ?? writing ?? secs[0]?.section_id;
  const index = Math.max(
    0,
    secs.findIndex((s) => s.section_id === shownSec),
  );
  const s = secs[index];
  // On a narrow screen the sections scroll sideways: keep the one on show in sight. A section opens at its top.
  const tabs = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: follows the section on show
  useEffect(() => {
    panel.current?.scrollTo({ top: 0 });
    const list = tabs.current;
    const el = list?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!list || !el || list.scrollWidth <= list.clientWidth) return;
    const left = list.scrollLeft + el.getBoundingClientRect().left - list.getBoundingClientRect().left - 8;
    list.scrollTo({ left, behavior: RM() ? "auto" : "smooth" });
  }, [shownSec]);
  // A statement picked in the shape: the section into view on the page, and the statement into view inside the panel,
  // under its head. Where the panel has no frame of its own (a phone), the page brings the statement into view.
  // biome-ignore lint/correctness/useExhaustiveDependencies: each pick, once
  useEffect(() => {
    if (!picked || !pickedAt) return;
    afterPaint(() => {
      const box = panel.current;
      const el = box?.querySelector<HTMLElement>(`[data-stmt="${CSS.escape(picked)}"]`);
      if (!box || !el) return;
      const behavior = RM() ? "auto" : "smooth";
      if (getComputedStyle(box).overflowY !== "auto") {
        el.scrollIntoView({ behavior, block: "center" });
        return;
      }
      box.closest("[data-contract]")?.scrollIntoView({ behavior, block: "start" });
      const head = box.querySelector("header")?.offsetHeight ?? 0;
      const top = box.scrollTop + el.getBoundingClientRect().top - box.getBoundingClientRect().top - head - 16;
      box.scrollTo({ top, behavior });
    });
  }, [pickedAt]);
  return (
    <Section
      icon="file"
      title="Section by section"
      tells="The writing contract every writer works inside: what each section does, its moves, its tense and the statements it carries. Pick a section on the left."
      now={now}
      aside={c ? plural(secs.length, "section") : undefined}
      data-contract
    >
      {/* A frame of its own on a wide screen: the list of sections beside the chosen one, which scrolls inside. */}
      <div className="grid lg:h-[30rem] lg:grid-cols-[15rem_minmax(0,1fr)]">
        <div
          ref={tabs}
          role="tablist"
          aria-label="Sections of the paper"
          aria-orientation="vertical"
          className="flex gap-1 overflow-x-auto border-b p-2 [scrollbar-width:thin] lg:flex-col lg:gap-0.5 lg:overflow-y-auto lg:border-b-0"
        >
          {c
            ? secs.map((x, i) => (
                <SectionTab
                  key={x.section_id}
                  s={x}
                  index={i}
                  selected={x.section_id === shownSec}
                  written={i < on}
                  structured={structured}
                  onPick={() => onChoose(x.section_id)}
                />
              ))
            : Array.from({ length: SECTIONS_AHEAD }, (_, i) => (
                <span
                  // biome-ignore lint/suspicious/noArrayIndexKey: skeleton tabs never reorder
                  key={i}
                  aria-hidden="true"
                  className="flex shrink-0 items-center gap-2.5 rounded-lg px-2 py-1.5 lg:w-full"
                >
                  <span className="grid size-7 shrink-0 place-items-center rounded-md bg-muted font-mono text-muted-foreground/50 text-xs">
                    {i + 1}
                  </span>
                  <Bar className="h-2.5 w-24 animate-none rounded-full" />
                </span>
              ))}
        </div>
        <div className="relative min-w-0 lg:border-l">
          <div
            ref={panel}
            className="overscroll-contain [scrollbar-width:thin] lg:absolute lg:inset-0 lg:overflow-y-auto"
          >
            {s ? (
              <SectionPanel
                s={s}
                index={index}
                total={secs.length}
                written={index < on}
                structured={structured}
                typing={streaming(L.lines, s.section_id)}
                here={Object.keys(placement)
                  .filter((id) => placement[id] === s.section_id)
                  .sort(byTypeThenId)}
                picked={picked}
              />
            ) : (
              <div aria-hidden="true" className="flex flex-col gap-3 px-5 py-4">
                <Bar className="h-2.5 w-24 animate-none rounded-full" />
                <Bar className="h-4 w-40 animate-none rounded-full" />
                <Bars n={3} last="w-3/5" />
              </div>
            )}
          </div>
        </div>
      </div>
    </Section>
  );
}

/** What the stage is doing in a part right now, while it plays. */
function journalNow(k: string) {
  const st = S.st[SID];
  if (st?.status !== "running" || st.cur !== k) return null;
  const c = file("JournalWritingContract.json");
  if (!c) return null;
  const last = (list: string) => Math.max(0, (S.n[list] ?? 0) - 1);
  if (k === "c1") {
    const r = ruleRows(c)[last(L.rules)];
    return r ? `Reading the publisher's rules · ${r.t}: ${r.rule}` : null;
  }
  if (k === "c2") {
    const r = placementRows(c)[last(L.place)];
    return r
      ? `Placing each ${typeChip(r.type).name.toLowerCase()} · ${r.homes.map(heading).join(" or ") || "no place"}`
      : null;
  }
  if (k === "c3") {
    const r = argumentRows(c)[last(L.tmap)];
    return r ? `Mapping the ${r[0]} · ${r[1]}` : null;
  }
  if (k === "c4") return "Setting the structure and each section's word budget";
  if (k === "c5") return "Setting the sentence rules";
  const s = c.rules.sections[last(L.lines)];
  return s ? `Writing the contract of ${s.heading}` : null;
}

/** The journal merge, top to bottom: what it did, what it means for the paper, then every part in full. */
export function JournalBody() {
  // The section a person chose, and the statement they picked from the shape; a new run starts on the first section.
  const [touched, setTouched] = useState<{ run: unknown; sec: string | null; picked: string | null; at: number }>({
    run: S,
    sec: null,
    picked: null,
    at: 0,
  });
  const chosen = touched.run === S ? touched.sec : null;
  const picked = touched.run === S ? touched.picked : null;
  const at = touched.run === S ? touched.at : 0;
  // A pick shows the contract: a statement is brought into view inside its panel, a section brings the part into view.
  const pick: Pick = (sec, id) => {
    setTouched({ run: S, sec, picked: id ?? null, at: Date.now() });
    if (!id) scrollSoon("[data-contract]");
  };
  const placingNow = journalNow("c2") ?? journalNow("c4");
  return (
    <StageAccent accent="indigo">
      <div className="flex min-w-0 flex-col gap-5">
        <JournalOverview />
        <JournalPaper />
        <JoinPanel />
        <RulesSection now={journalNow("c1")} />
        <PlacementSection onPick={pick} now={placingNow} />
        <TypesSection />
        <ArgumentSection now={journalNow("c3")} />
        <SentenceSection now={journalNow("c5")} />
        <ContractSectionView
          chosen={chosen}
          onChoose={(sec) => setTouched({ run: S, sec, picked, at })}
          picked={picked}
          pickedAt={at}
          now={journalNow("c6")}
        />
      </div>
    </StageAccent>
  );
}
