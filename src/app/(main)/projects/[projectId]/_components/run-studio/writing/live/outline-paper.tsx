"use client";
"use no memo";

/* ===== S09–S10 · the paper outline, live: the story, the sections, every paragraph and sentence planned =====
   The screen opens on its key result: the main point in the paper's own words, the paragraphs and sentences planned,
   the ones to read first, and what the plan does to the paper. Under it, the paper at a glance: one row per section,
   each paragraph a block as wide as its sentences, the ones to read first in amber; a block opens its plan. The rest
   is folded, each fold opened while its stage plays into it: the story, the storyline, the reasons and objections,
   the sections' moves, the paragraph plans (the page), the checks, the prior studies and the word policies. The text
   of the paper is not written here: every line is a plan, in the words of the statements it carries. The frame stands
   as a skeleton from the moment the stage opens; each section's blocks land as the Planner plans that section. */

import { type ReactNode, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { S } from "../engine";
import { AgentCursor, canEnter, cn, Icon, M } from "../lib";
import { Typed } from "../scenes-gather";
import { shown, streaming, WorkingHere } from "./kit";
import {
  ackOf,
  CHECKPOINT_TITLE,
  cap,
  cardOf,
  exhibitNumbers,
  exhibitTitle,
  fmtWords,
  HIGH_RISK,
  heading,
  isExhibit,
  joined,
  L,
  labelOf,
  moveName,
  paperTree,
  paraNumber,
  plural,
  printedOf,
  RULE_TEXT,
  ruleGroups,
  scorecardOf,
  sourceOf,
  storyPlan,
  treeParagraphs,
  typeChip,
  typeOf,
  warrantOf,
  wordsOf,
} from "./outline-data";
import { Bars, SERIF, StatementChip, scrollSoon } from "./outline-kit";
import { file, has, LIVE } from "./run";
import { StatusPill, TONE, type Tone } from "./stage-kit";
import { type BarRow, BarRows, EffectList, ResultGrid, Section, StageAccent, SubHead, Takeaway } from "./stage-visual";
import { Term } from "./term";
import type { Scorecard, StoryPlanFile, TreeParagraph, TreeSection, TreeSentence } from "./types";

/* ---------- how much of each part is on screen ---------- */
const c9 = (list: string, total: number) => shown("S09", list, total);
const c10 = (list: string, total: number) => shown("S10", list, total);
/** The model call of the stage at work on a part (its task id starts so), and whether one ran and is done. */
const callsOf = (sid: string, prefix: string) => LIVE.calls.filter((c) => c.stage === sid && c.task.startsWith(prefix));

/* A table inside a fold, edge to edge, as the workspace's tables are. */
const RC = "py-2.5 align-top whitespace-normal first:pl-4 last:pr-4 sm:first:pl-5 sm:last:pr-5";
function FoldTable({ head, children }: { head: [string, string?][]; children: ReactNode }) {
  return (
    <div className="border-t first:border-t-0">
      <Table className="table-fixed text-[13.5px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {head.map(([h, w]) => (
              <TableHead
                key={h}
                className={cn(
                  "h-9 text-[12.5px] text-muted-foreground first:pl-4 last:pr-4 sm:last:pr-5 sm:first:pl-5",
                  w,
                )}
              >
                {h}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>{children}</TableBody>
      </Table>
    </div>
  );
}

/* ---------- ids with their words ---------- */
/** An id as a chip in its statement type's colour; the paragraph's point is marked. */
export function IdChip({ id, point = false }: { id: string; point?: boolean }) {
  const t = typeOf(id);
  const chip = typeChip(t ?? "");
  let label = id;
  if (warrantOf(id)) label = `Warrant · ${id.slice(2)}`;
  else if (ackOf(id)) label = "Objection";
  return (
    <Badge
      title={point ? "The paragraph's point" : chip.name}
      className={cn("font-mono", chip.chip, point && "ring-1 ring-current")}
    >
      {label}
    </Badge>
  );
}
/** A statement, warrant or objection with its words, in full. `serif` sets the words as the paper's own; an
 * objection's question is never the paper's, so it stays plain and muted. */
export function IdWords({
  id,
  point,
  serif = false,
  size = "text-[13px]",
}: {
  id: string;
  point?: boolean;
  serif?: boolean;
  size?: string;
}) {
  const a = ackOf(id);
  return (
    <span className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2">
      <span className="mt-px">
        <IdChip id={id} point={point} />
      </span>
      {a ? (
        <span className={cn(size, "leading-snug")}>
          <span className="font-sans text-[13px] text-muted-foreground">{a.objection}</span>{" "}
          <span className={cn(serif && "font-serif")}>{a.answer}</span>
        </span>
      ) : (
        <span className={cn(size, "leading-snug", serif && "font-serif")}>
          {wordsOf(id) ?? <span className="text-muted-foreground">Not in the frozen graph</span>}
        </span>
      )}
    </span>
  );
}
/** A ledger value as the ledger labels it: shortened to its name, the whole label on hover. */
function short(label: string, key: string) {
  let s = label.split(/;| \(/)[0].replace(/,\s*$/, "").replace(/_/g, " ");
  if (s.length > 64) s = s.split(",")[0];
  // The two ends of a range share their label: the key says which end it is.
  if (key.endsWith(".lo") && !/low end/.test(s)) s += ", low end";
  if (key.endsWith(".hi") && !/high end/.test(s)) s += ", high end";
  return s;
}
export function Value({ k, again = false }: { k: string; again?: boolean }) {
  const label = labelOf(k);
  if (again)
    return (
      <span
        title={label ? `${label} · ${k}` : k}
        className="whitespace-nowrap rounded-md bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[11.5px] text-emerald-800 leading-tight dark:text-emerald-200"
      >
        {printedOf(k)}
      </span>
    );
  return (
    <span
      title={label ? `${label} · ${k}` : k}
      className="inline-flex max-w-full items-baseline gap-1 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[11.5px] leading-tight"
    >
      <span className="min-w-0 text-muted-foreground">{short(label, k) || k}</span>
      <b className="whitespace-nowrap font-medium font-mono text-emerald-800 dark:text-emerald-200">{printedOf(k)}</b>
    </span>
  );
}
export function Exhibit({ k, n }: { k: string; n?: string }) {
  return (
    <span
      title={exhibitTitle(k)}
      className="inline-flex items-center rounded-md bg-sky-500/10 px-1.5 py-0.5 font-medium text-[11.5px] text-sky-800 leading-tight dark:text-sky-200"
    >
      {n ?? exhibitTitle(k)}
    </span>
  );
}
/** A source key as a reader names it: "martins2023" is Martins 2023. */
/** A source as the paper names it ("Andika Putra et al., 2025"); from its key when the run gives no name. */
export const citeName = (k: string) => {
  const named = sourceOf(k)?.cited_as;
  if (named) return named;
  const m = /^([a-z]+?)(\d{4})([a-z]?)$/.exec(k);
  return m ? `${cap(m[1])} ${m[2]}${m[3]}` : k;
};
export function Cite({ k }: { k: string }) {
  const ref = sourceOf(k);
  return (
    <span title={ref?.title || k} className="font-sans text-[11.5px] text-cyan-700 dark:text-cyan-300">
      [{citeName(k)}]
    </span>
  );
}
export const isValue = (k: string) => !isExhibit(k);

/* ---------- the story, above the page ---------- */
const OCAR = [
  ["opening", "Opening"],
  ["challenge", "Challenge"],
  ["action", "Action"],
  ["resolution", "Resolution"],
] as const;
const READER: [keyof StoryPlanFile["reader"], (v: unknown) => string | null][] = [
  ["who", (v) => (v ? `${cap(String(v))} readers` : null)],
  ["field", (v) => (v ? `In ${v}` : null)],
  ["knows_problem", (v) => (v ? `The problem: ${String(v).replace(/_/g, " ")} to them` : null)],
  ["expects", (v) => (v ? `They expect ${v} use` : null)],
  ["must_convince_it_matters", (v) => (v ? "Must be convinced it matters" : null)],
  ["contradicts_beliefs", (v) => (v ? `Contradicts: ${v}` : null)],
];
/** Each line of the story, as the stage streams it. */
function storyRows(sp: StoryPlanFile) {
  const rows: { k: string; label: string; body: ReactNode }[] = [];
  // The main point heads the screen, in the paper at a glance.
  if (sp.significance)
    if (sp.significance)
      rows.push({
        k: "matters",
        label: "Why it matters",
        body: <IdWords id={sp.significance} serif size="text-[15px]" />,
      });
  const p = sp.problem;
  rows.push({
    k: "problem",
    label: "The problem",
    body: (
      <dl className="grid gap-x-3 gap-y-2 text-[13px] sm:grid-cols-[96px_minmax(0,1fr)]">
        {p.context.length > 0 && (
          <>
            <dt className="text-muted-foreground text-xs">Context</dt>
            <dd className="flex flex-col gap-1.5">
              {p.context.map((x) => (
                <IdWords key={x} id={x} />
              ))}
            </dd>
          </>
        )}
        {p.condition && (
          <>
            <dt className="text-muted-foreground text-xs">Condition</dt>
            <dd>
              <IdWords id={p.condition} />
            </dd>
          </>
        )}
        {p.consequence && (
          <>
            <dt className="text-muted-foreground text-xs">Consequence</dt>
            <dd className="flex flex-wrap items-baseline gap-2">
              <span className="leading-snug">{cap(p.consequence.span)}</span>
              <Badge variant="outline" className="font-normal">
                {p.consequence.kind}
              </Badge>
            </dd>
          </>
        )}
        {p.response && (
          <>
            <dt className="text-muted-foreground text-xs">Response</dt>
            <dd className="leading-snug">
              {p.response === "point" ? "The main point above" : (wordsOf(p.response) ?? p.response)}
            </dd>
          </>
        )}
      </dl>
    ),
  });
  // The engine leaves it out when the premises cannot build it.
  const t = sp.three_step;
  if (t)
    rows.push({
      k: "sentence",
      label: "In one sentence",
      body: (
        <p className="text-sm leading-relaxed">
          {t.topic}, {t.question}, {t.significance}.
        </p>
      ),
    });
  if (sp.key_terms.length)
    rows.push({
      k: "terms",
      label: "Key terms",
      body: (
        <span className="flex flex-wrap gap-1.5">
          {sp.key_terms.map((x) => (
            <Badge key={x} variant="secondary" className="font-normal">
              {x}
            </Badge>
          ))}
        </span>
      ),
    });
  const reader = READER.map(([k, f]) => f(sp.reader[k])).filter((x): x is string => Boolean(x));
  if (reader.length)
    rows.push({
      k: "reader",
      label: "The reader",
      body: (
        <span className="flex flex-wrap gap-1.5">
          {reader.map((x) => (
            <Badge key={x} variant="outline" className="font-normal">
              {x}
            </Badge>
          ))}
        </span>
      ),
    });
  if (sp.further_research.length)
    rows.push({
      k: "further",
      label: "Left for further research",
      body: (
        <div className="flex flex-col gap-1.5">
          {sp.further_research.map((x) => (
            <IdWords key={x} id={x} />
          ))}
        </div>
      ),
    });
  if (sp.omissions.length) {
    const by = Object.groupBy(sp.omissions, (o) => o.reason);
    const said = by["said-elsewhere"]?.length ?? 0;
    const low = by["low-priority"] ?? [];
    rows.push({
      k: "left",
      label: "Left out of this story",
      body: (
        <p className="text-[13px] text-muted-foreground leading-snug">
          {sp.omissions.length} questions a reader may ask{said ? `: ${said} answered elsewhere in the paper` : ""}
          {low.length
            ? `, ${low.length} left as low priority (${low.map((o) => o.item.replace(/[._]/g, " ")).join(", ")})`
            : ""}
          .
        </p>
      ),
    });
  }
  if (sp.warnings.length)
    rows.push({
      k: "warnings",
      label: "Warnings",
      body: (
        <ul className="flex flex-col gap-1 text-[13px]">
          {sp.warnings.map((w) => (
            <li key={w} className="flex items-start gap-1.5 text-amber-800 dark:text-amber-300">
              <Icon n="alert" className="mt-0.5 size-3.5" />
              {w}
            </li>
          ))}
        </ul>
      ),
    });
  return rows;
}
export const storyLength = (sp: StoryPlanFile) => storyRows(sp).length;

/* The parts of a story, with about the lines each takes, for the skeleton before the story is planned. */
const STORY_AHEAD: [string, number][] = [
  ["Why it matters", 2],
  ["The problem", 4],
  ["In one sentence", 2],
  ["Key terms", 1],
  ["The reader", 1],
  ["Left for further research", 3],
  ["Left out of this story", 1],
];
const STORY_LINES: Record<string, number> = { matters: 2, problem: 4, sentence: 2, further: 3 };
function StoryBody() {
  const story = storyPlan();
  const sp = story?.plan;
  const options = story?.draft ? Object.entries(story.draft.options) : [];
  const rows = sp ? storyRows(sp) : [];
  const on = c9(L.story, rows.length);
  const ahead: [string, number][] = rows.length ? rows.map((r) => [r.label, STORY_LINES[r.k] ?? 1]) : STORY_AHEAD;
  return (
    <div data-cursor="story" className="scroll-mt-4 px-4 py-3.5 sm:px-5">
      <dl className="flex flex-col">
        {ahead.map(([label, lines], i) => {
          const r = rows[i];
          const filled = r && i < on;
          return (
            <M
              key={r?.k ?? label}
              in={filled ? "up6" : "fade"}
              className="grid gap-x-4 gap-y-1.5 border-t py-3 first:border-t-0 first:pt-0 last:pb-0 sm:grid-cols-[128px_minmax(0,1fr)]"
            >
              <dt className="self-start pt-0.5 text-muted-foreground text-xs">{label}</dt>
              <dd className="min-w-0">{filled ? r.body : <Bars n={lines} last="w-3/5" className="max-w-3xl" />}</dd>
            </M>
          );
        })}
      </dl>
      {sp && on >= rows.length && options.length > 0 && <StoryOptions plan={sp} options={options} />}
    </div>
  );
}

/* What another story changes from the one planned: its main point, its consequence, its key terms, its arc. */
function storyDiff(plan: StoryPlanFile, o: StoryPlanFile) {
  const out: [string, string][] = [];
  if (o.message !== plan.message) out.push(["Main point", o.message ? (wordsOf(o.message) ?? o.message) : "None"]);
  else out.push(["Main point", `The same as the story above${o.message ? ` (${o.message})` : ""}`]);
  if (o.significance !== plan.significance && o.significance)
    out.push(["Why it matters", wordsOf(o.significance) ?? o.significance]);
  const span = (x: StoryPlanFile) => x.problem.consequence?.span ?? "";
  if (span(o) !== span(plan)) out.push(["Consequence", span(o) ? cap(span(o)) : "None"]);
  const terms = (x: StoryPlanFile) => [...x.key_terms].sort().join("|");
  if (terms(o) !== terms(plan)) out.push(["Key terms", o.key_terms.join(", ")]);
  const arc = (x: StoryPlanFile) => OCAR.map(([k]) => x.ocar[k].join(",")).join("|");
  if (arc(o) !== arc(plan))
    out.push(["Storyline", OCAR.map(([k, name]) => `${name}: ${o.ocar[k].join(", ") || "none"}`).join(" · ")]);
  return out;
}
/* The other stories the Planner tried, compared with the planned one at the story check. */
function StoryOptions({
  plan,
  options,
}: {
  plan: StoryPlanFile;
  options: [string, StoryPlanFile & { label: string }][];
}) {
  return (
    <M in="fade" className="mt-3 rounded-lg px-3 py-2.5 text-[13px] ring-1 ring-foreground/10">
      <b className="block font-medium">Other stories the Planner tried</b>
      <span className="block text-muted-foreground text-xs">
        Compared with the story above at the story check (P2).
      </span>
      <ul className="mt-2 flex flex-col gap-2.5">
        {options.map(([id, o]) => {
          const diff = storyDiff(plan, o);
          return (
            <M as="li" key={id} in="fade" className="flex flex-col gap-1">
              <span className="flex flex-wrap items-baseline gap-x-2">
                <Badge variant="outline" className="font-mono">
                  {id}
                </Badge>
                <span className="font-medium">{o.label}</span>
              </span>
              <dl className="grid gap-x-3 gap-y-0.5 text-xs sm:grid-cols-[96px_minmax(0,1fr)]">
                {diff.map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="leading-snug">{v}</dd>
                  </div>
                ))}
              </dl>
              {diff.length === 1 && (
                <span className="text-muted-foreground text-xs">The same problem, key terms and storyline.</span>
              )}
            </M>
          );
        })}
      </ul>
    </M>
  );
}

/* ---------- the paper at a glance: the hero ---------- */
/* The fewest sentences a row's scale holds: a short first section does not stretch the scale the later ones need. */
const SCALE_FLOOR = 24;
type Para = ReturnType<typeof treeParagraphs>[number];

/* A paragraph's block: amber when it is one to read first, neutral else; dark text on a light fill either way. */
const GLANCE_LOOK =
  "bg-amber-100 text-amber-950 ring-amber-400 hover:bg-amber-200/70 dark:bg-amber-950/40 dark:text-amber-100 dark:ring-amber-500/60 dark:hover:bg-amber-900/50";
const GLANCE_PLAIN = "bg-muted text-foreground ring-foreground/15 hover:bg-foreground/10";

/* One paragraph as a block, as wide as its sentences on the scale every row shares; amber when it is one to read
 * first. Its job and risk on hover; a click opens its plan on the page below. */
function Block({ x, scale, onPick, delay }: { x: Para; scale: number; onPick(id: string): void; delay: number }) {
  const p = x.p;
  const k = p.sentences.length;
  const high = p.risk >= HIGH_RISK;
  return (
    <M
      as="span"
      in="fade"
      delay={delay}
      className="flex shrink-0"
      style={{ width: `calc((100% + 4px) * ${Math.max(1, k)} / ${scale} - 4px)` }}
    >
      <HoverCard openDelay={120} closeDelay={60}>
        <HoverCardTrigger asChild>
          <button
            type="button"
            data-block={p.paragraph_id}
            data-cursor={`para:${p.paragraph_id}`}
            onClick={() => onPick(p.paragraph_id)}
            aria-label={`Paragraph ${x.n}: ${plural(k, "sentence")}, risk ${p.risk}${high ? ", read it first" : ""}. Show its plan`}
            className={cn(
              "@container flex h-9 w-full min-w-0 items-center overflow-hidden rounded-md px-1.5 font-medium text-[12.5px] tabular-nums outline-none ring-1 ring-inset transition-colors focus-visible:ring-2 focus-visible:ring-ring",
              high ? GLANCE_LOOK : GLANCE_PLAIN,
              p.state === "author" && "outline-dashed outline-1 outline-foreground/40 -outline-offset-1",
            )}
          >
            {/* A block too narrow for its number keeps it for the hover and the reader's tap. */}
            <span className="@min-[1.375rem]:inline hidden">{x.n}</span>
          </button>
        </HoverCardTrigger>
        <HoverCardContent side="top" className="w-80 p-3">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <b className="font-mono font-semibold">{x.n}</b>
            <span className="text-muted-foreground">
              {heading(x.sec)} · {plural(k, "sentence")} · risk {p.risk}
            </span>
            {high && <StatusPill tone="look">Read first</StatusPill>}
          </span>
          <p className="mt-1.5 text-pretty text-[13px] leading-snug">{p.job}</p>
          {p.state === "author" && <p className="mt-1 text-muted-foreground text-xs">The authors write it.</p>}
        </HoverCardContent>
      </HoverCard>
    </M>
  );
}
/* Blocks standing where a section's paragraphs will be: their own widths once the plan is in, a calm guess before. */
function BlockSkeletons({ widths, scale, pulse }: { widths: number[]; scale: number; pulse?: boolean }) {
  return (
    <>
      {widths.map((k, i) => (
        <Skeleton
          // biome-ignore lint/suspicious/noArrayIndexKey: placeholders never reorder
          key={i}
          aria-hidden="true"
          className={cn("h-9 shrink-0 rounded-md", !pulse && "animate-none")}
          style={{ width: `calc((100% + 4px) * ${k} / ${scale} - 4px)` }}
        />
      ))}
    </>
  );
}

function PaperGlance({
  onPick,
  onSection,
  now,
}: {
  onPick(id: string): void;
  onSection(sec: string): void;
  now: ReactNode;
}) {
  const c = file("JournalWritingContract.json");
  const bp = file("ManuscriptBlueprint.json");
  const placed = bp ? c9(L.sec, bp.sections.length) : 0;
  const shownTree = paperTree();
  const draft = shownTree?.draft ?? null;
  const paras = treeParagraphs(shownTree);
  const parasOn = shownTree ? c10(L.para, paras.length) : 0;
  // Before the outline is laid out, one row per section of the journal contract.
  const rows = bp && placed ? bp.sections.map((s) => s.section_id) : (c?.rules.sections.map((s) => s.section_id) ?? []);
  const sentencesOf = (sec: string) => paras.filter((x) => x.sec === sec).reduce((k, x) => k + x.p.sentences.length, 0);
  const scale = Math.max(SCALE_FLOOR, ...rows.map(sentencesOf));
  return (
    <Section
      icon="layers"
      title="The paper at a glance"
      tells="Each section as a row, each paragraph as a block as wide as its sentences; amber blocks are the ones to read first. Click a block for its plan."
      now={now}
      aside={
        draft ? (
          <Badge
            variant="outline"
            title="Planned by the Planner section by section; the paragraphs check scores them once every section is planned."
            className="font-normal"
          >
            Not checked yet
          </Badge>
        ) : parasOn ? (
          plural(parasOn, "paragraph")
        ) : undefined
      }
      data-glance
      data-out="ManuscriptBlueprint.json SectionContracts.json ManuscriptTree.json ManuscriptTreeDraft.json"
    >
      <div className="flex flex-col gap-5 p-4 sm:p-5">
        <div className="flex flex-col gap-2.5">
          {/* The legend first: what a block and its colour stand for. */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className={cn("h-3.5 w-8 rounded-[4px] ring-1 ring-inset", GLANCE_PLAIN)} />A paragraph, as wide as
              its sentences
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className={cn("h-3.5 w-8 rounded-[4px] ring-1 ring-inset", GLANCE_LOOK)} />
              <span>
                <Term t="paragraph risk">Risk</Term> {HIGH_RISK} or more: read it first
              </span>
            </span>
            <span className="max-sm:hidden">Hover a block for its job; click it for its plan.</span>
            <span className="sm:hidden">Tap a block for its plan; the row scrolls sideways.</span>
          </div>
          <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:thin] sm:-mx-5 sm:px-5">
            <ol data-cursor="risk" className="min-w-[36rem] border-t">
              {(rows.length ? rows : Array.from({ length: 7 }, (_, i) => `ahead-${i}`)).map((sec, si) => {
                const known = rows.length > 0;
                const laidOut = Boolean(bp) && si < placed;
                const node = laidOut ? shownTree?.sections.find((x) => x.template === sec) : undefined;
                const mine = paras.filter((x) => x.sec === sec);
                const shownHere = mine.filter((x) => x.index < parasOn);
                const byCode = node?.written_by === "code";
                const planning = callsOf("S10", `contracts-${sec}`).some((x) => !x.done);
                let track: ReactNode;
                if (byCode)
                  track = (
                    <span className="flex h-9 items-center gap-1.5 text-muted-foreground text-xs">
                      <Icon n="file" className="size-3.5" />
                      Written by code from the record
                    </span>
                  );
                else if (node && mine.length)
                  track = (
                    <>
                      {shownHere.map((x, k) => (
                        <Block
                          key={x.p.uid}
                          x={x}
                          scale={scale}
                          onPick={onPick}
                          delay={canEnter() ? Math.min(k, 8) * 0.05 : 0}
                        />
                      ))}
                      <BlockSkeletons
                        widths={mine.slice(shownHere.length).map((x) => Math.max(1, x.p.sentences.length))}
                        scale={scale}
                      />
                    </>
                  );
                else if (planning && laidOut)
                  track = <WorkingHere sid="S10" task={new RegExp(`^contracts-${sec}`)} className="h-9 items-center" />;
                else track = <BlockSkeletons widths={[3, 4, 2]} scale={scale} />;
                return (
                  <li
                    key={sec}
                    data-row={known ? sec : undefined}
                    className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-x-3 border-b py-2 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:gap-x-4"
                  >
                    {known ? (
                      <button
                        type="button"
                        data-cursor={`sec:${sec}`}
                        onClick={() => onSection(sec)}
                        disabled={!laidOut}
                        className="sticky left-0 z-10 flex min-w-0 items-baseline gap-2 rounded-sm bg-card py-1 text-left font-medium text-sm leading-5 outline-none focus-visible:ring-2 focus-visible:ring-ring enabled:hover:underline enabled:hover:underline-offset-2 disabled:text-muted-foreground"
                      >
                        <span className="font-mono font-normal text-muted-foreground text-xs">{si + 1}</span>
                        <span className="min-w-0 break-words">{heading(sec)}</span>
                      </button>
                    ) : (
                      <Skeleton aria-hidden="true" className="h-3 w-24 animate-none rounded-full" />
                    )}
                    <span className="flex min-w-0 gap-1">{track}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ---------- the page ---------- */
const FUNCTION: Record<string, string> = {
  further_research: "Further research",
  placeholder: "For the authors",
};
export const fnName = (f: string) => FUNCTION[f] ?? cap(f.replace(/_/g, " "));
export const SHAPE: Record<string, [string, string]> = {
  "TS-D": ["point first", "A topic sentence states the point, the rest develops it"],
  LD: ["point first", "Its lead, one sentence or a few, ends on the point the rest develops"],
  LDR: ["point last", "It opens on an argument, develops it, and resolves on the point"],
  OCAR: ["point last", "It sets the stage without arguing, then builds to the point"],
};

/* One sentence of a paragraph's plan: its job, the statements it carries in their words, its values and sources.
 * What an earlier sentence of the paragraph already showed in full is named again in brief. */
function SentenceRow({ x, point, plan }: { x: TreeSentence; point: string | null; plan: SentencePlan }) {
  const { seen, cites, moved } = plan;
  const values = x.keys.filter(isValue);
  const exhibits = x.keys.filter(isExhibit);
  const nums = exhibitNumbers();
  // A source is named once in a paragraph: by its title where it stands alone, as a mark beside a statement.
  const titled = x.statements.length ? [] : cites;
  const chips = x.statements.length ? cites : [];
  return (
    <M
      as="li"
      in="up4"
      className="grid grid-cols-[6.25rem_minmax(0,1fr)] gap-x-2.5 border-foreground/10 border-t py-2 first:border-t-0 max-sm:grid-cols-1 max-sm:gap-y-1"
    >
      <span className="pt-0.5 font-medium text-[11px] text-muted-foreground uppercase tracking-wide">
        {fnName(x.function)}
      </span>
      <span className="flex min-w-0 flex-col gap-1.5">
        {x.statements.map((id) =>
          plan.again[id] ? (
            <span key={id} className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <IdChip id={id} point={id === point} />
              <span className="font-sans text-[13px] text-muted-foreground">{plan.again[id]}</span>
            </span>
          ) : (
            <IdWords key={id} id={id} point={id === point} serif size="text-[14px]" />
          ),
        )}
        {titled.map((k) => (
          <span key={k} className="flex items-baseline gap-2 text-[13px] leading-snug">
            <Cite k={k} />
            <span>{sourceOf(k)?.title || "A source of the evidence ledger"}</span>
          </span>
        ))}
        {moved.n > 0 && (
          <span className="text-muted-foreground text-xs">
            Cites {moved.n === 1 ? "a source" : `${moved.n} sources`} named {moved.where} in this paragraph
          </span>
        )}
        {(values.length > 0 || exhibits.length > 0 || chips.length > 0) && (
          <span className="flex flex-wrap items-center gap-1.5">
            {values.map((k) => (
              <Value key={k} k={k} again={seen.has(`v:${k}`)} />
            ))}
            {exhibits.map((k) => (
              <Exhibit key={k} k={k} n={nums[k]} />
            ))}
            {chips.map((k) => (
              <Cite key={k} k={k} />
            ))}
          </span>
        )}
        {x.terms.length > 0 && (
          <span className="text-[11.5px] text-muted-foreground leading-snug">
            Terms:{" "}
            {x.terms.map((t, i) => (
              <span key={t.term}>
                {i > 0 && " · "}
                <span className={cn(t.placement === "define" && "font-medium text-violet-700 dark:text-violet-300")}>
                  {t.term}
                </span>
                {t.placement !== "known" && ` (${t.placement === "define" ? "defined here" : "reminded"})`}
              </span>
            ))}
          </span>
        )}
      </span>
    </M>
  );
}
interface SentencePlan {
  /** What the sentences before it already showed in full: statements, and values as `v:key`. */
  seen: Set<string>;
  /** The sources this sentence names. */
  cites: string[];
  /** The sources it cites that another sentence of the paragraph names, and where that sentence stands. */
  moved: { n: number; where: string };
  /** Nothing to show: no statement, value, source or term (a qualification the writer words from the paragraph). */
  bare: boolean;
  /** Each item an earlier sentence of the paragraph showed in full, with where: "the same objection as the topic
   * sentence". */
  again: Record<string, string>;
}
/** What a carried item is, in a word: an objection, a warrant, or its statement type. */
function kindOf(id: string) {
  if (ackOf(id)) return "objection";
  if (warrantOf(id)) return "warrant";
  const t = typeOf(id);
  return t ? typeChip(t).name.toLowerCase() : "statement";
}
/** How each sentence of a paragraph shows: what was shown before it, which sources it names, whether it is bare. */
export function planSentences(p: TreeParagraph): SentencePlan[] {
  const xs = p.sentences;
  // Each source's home: the sentence where it stands alone, else the first that cites it.
  const home: Record<string, number> = {};
  for (const k of new Set(xs.flatMap((x) => x.cites))) {
    const alone = xs.findIndex((x) => !x.statements.length && x.cites.length === 1 && x.cites[0] === k);
    home[k] = alone >= 0 ? alone : xs.findIndex((x) => x.cites.includes(k));
  }
  // A sentence by its job; by its place too where the paragraph has two of that job.
  const nameOf = (j: number) => {
    const fn = fnName(xs[j].function).toLowerCase();
    return xs.filter((y) => y.function === xs[j].function).length > 1
      ? `sentence ${j + 1} (${fn})`
      : `the ${fn} sentence`;
  };
  const first: Record<string, number> = {};
  const seen = new Set<string>();
  return xs.map((x, i) => {
    const before = new Set(seen);
    const again: Record<string, string> = {};
    for (const id of x.statements) {
      if (id in first) again[id] = `the same ${kindOf(id)} as ${nameOf(first[id])}`;
      else first[id] = i;
      seen.add(id);
    }
    for (const k of x.keys) seen.add(`v:${k}`);
    const cites = x.cites.filter((k) => home[k] === i);
    const away = x.cites.filter((k) => home[k] !== i).map((k) => home[k]);
    let where = "elsewhere";
    if (away.length && away.every((h) => h > i)) where = "below";
    if (away.length && away.every((h) => h < i)) where = "above";
    const bare = !x.statements.length && !x.keys.length && !x.cites.length && !x.terms.length;
    return { seen: before, cites, moved: { n: away.length, where }, bare, again };
  });
}
const article = (word: string) => (/^[aeiou]/i.test(word) ? `an ${word}` : `a ${word}`);

/* A paragraph before it is written: its number and job, what it does, and each sentence it will have. */
function Brief({
  p,
  n,
  sentences,
  typing,
  picked,
}: {
  p: TreeParagraph;
  n: string;
  sentences: number;
  typing: boolean;
  picked?: boolean;
}) {
  const [shape, why] = SHAPE[p.shape] ?? [p.shape, ""];
  const plans = planSentences(p);
  const bare = p.sentences.filter((_, i) => plans[i].bare).map((x) => fnName(x.function).toLowerCase());
  const meta = [
    p.argument_role && [cap(p.argument_role.replace(/_/g, " ")), "What it does for the argument"],
    p.ocar && [p.ocar, "Its place in the story"],
    [shape, `${why} · pattern ${p.pattern}`],
    p.moves.length && [p.moves.map(moveName).join(", "), "The moves it makes"],
  ].filter(Boolean) as [string, string][];
  return (
    <M
      in="fade"
      data-para={p.paragraph_id}
      data-cursor={`para:${p.paragraph_id}`}
      className={cn(
        "mb-3 grid scroll-mt-4 grid-cols-[3.25rem_minmax(0,1fr)] gap-x-3 gap-y-1 rounded-lg bg-muted/60 px-3 py-2.5 font-sans text-[13px] ring-inset transition-shadow duration-500 max-sm:grid-cols-[2.5rem_minmax(0,1fr)]",
        picked && "ring-2 ring-ring/60",
      )}
    >
      <span className="text-muted-foreground tabular-nums">{n}</span>
      <span className="font-medium text-foreground/90 leading-snug">
        <Typed text={p.job} on={typing} />
      </span>
      <span className="col-start-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-muted-foreground text-xs">
        {meta.map(([t, title], i) => (
          <span key={title} title={title}>
            {i > 0 && <span className="mr-1.5">·</span>}
            {t}
          </span>
        ))}
        {p.risk >= HIGH_RISK && (
          <span className="ml-1">
            <StatusPill tone="look">Risk {p.risk}: read first</StatusPill>
          </span>
        )}
        {p.state === "author" && <StatusPill tone="look">The authors write it</StatusPill>}
      </span>
      {p.link_in && (
        <span className="col-start-2 text-muted-foreground text-xs">
          Picks up “{p.link_in}” from the paragraph before
        </span>
      )}
      {sentences > 0 && (
        <ol className="col-start-2 mt-1 flex flex-col max-sm:col-span-2 max-sm:col-start-1">
          {p.sentences
            .slice(0, sentences)
            .map((x, i) => (plans[i].bare ? null : <SentenceRow key={x.uid} x={x} point={p.point} plan={plans[i]} />))}
        </ol>
      )}
      {bare.length > 0 && sentences >= p.sentences.length && (
        <span className="col-start-2 mt-0.5 text-[11.5px] text-muted-foreground max-sm:col-span-2 max-sm:col-start-1">
          {bare.length === 1
            ? `Also ${article(bare[0])} sentence, with nothing assigned to it.`
            : `Also ${bare.length} sentences with nothing assigned to them: ${bare.join(", ")}.`}
        </span>
      )}
      {(p.obligations?.length ?? 0) > 0 && sentences >= p.sentences.length && (
        <span className="col-start-2 mt-1 text-[11.5px] text-muted-foreground max-sm:col-span-2 max-sm:col-start-1">
          Must report: {p.obligations?.map((o) => o.replace(/-/g, " ")).join(" · ")}
        </span>
      )}
      {p.needs.length > 0 && (
        <span className={cn("col-start-2 mt-1 flex items-start gap-1.5 text-[13px]", TONE.look.text)}>
          <Icon n="alert" className="mt-0.5 size-3" />
          The authors complete: {p.needs.join(", ")}
        </span>
      )}
    </M>
  );
}

/* An exhibit's place on the page, before it is drawn. */
function ExhibitBox({ k, n }: { k: string; n?: string }) {
  return (
    <M
      in="fade"
      data-exhibit={k}
      className="mb-3 flex items-center gap-2 rounded-lg px-3 py-2.5 font-sans text-muted-foreground text-xs ring-1 ring-foreground/10 ring-inset"
    >
      <Icon n="table" className="size-3.5" />
      <span>
        {n && <b className="font-medium text-foreground">{n}. </b>}
        {exhibitTitle(k)}
      </span>
    </M>
  );
}
function Lines({ n, pulse }: { n: number; pulse: boolean }) {
  return (
    <div className="mb-3 flex flex-col gap-2 py-1">
      {Array.from({ length: n }, (_, i) => (
        <Skeleton
          // biome-ignore lint/suspicious/noArrayIndexKey: placeholder lines never reorder
          key={i}
          aria-hidden="true"
          className={cn("h-2.5 rounded-full", !pulse && "animate-none", i === n - 1 ? "w-2/5" : "w-full")}
        />
      ))}
    </div>
  );
}

/* A section of the page before the outline has laid it out: its heading and budget from the journal contract. */
function SectionAhead({ id, n, words, optional }: { id: string; n: number; words?: number[]; optional?: boolean }) {
  return (
    <section className="relative" data-sec={id}>
      <h3 className="mt-7 mb-1.5 flex flex-wrap items-baseline gap-x-2.5 font-sans font-semibold text-[15px] text-muted-foreground tracking-tight">
        {n}. {heading(id)}
        <span className="font-normal text-xs">
          {fmtWords(words)}
          {optional && " · optional"}
        </span>
      </h3>
      <Lines n={3} pulse={false} />
    </section>
  );
}

/* The other versions of a section the paragraphs check compares with the one planned, before the check. */
function SectionOptions({ options }: { options: [string, { label: string; sections: TreeSection[] }][] }) {
  return (
    <M in="fade" className="mb-3 rounded-lg px-3 py-2.5 font-sans text-[13px] ring-1 ring-foreground/10">
      <b className="block font-medium">Other versions of this section</b>
      <span className="block text-muted-foreground text-xs">
        Planned for the paragraphs check (P4), which compares them with the one above.
      </span>
      <ul className="mt-2 flex flex-col gap-2.5">
        {options.map(([id, o]) => {
          const ps = o.sections.flatMap((x) => x.paragraphs);
          return (
            <li key={id} className="flex flex-col gap-1">
              <span className="flex flex-wrap items-baseline gap-x-2">
                <Badge variant="outline" className="font-mono">
                  {id}
                </Badge>
                <span className="font-medium">{o.label}</span>
                <span className="text-muted-foreground text-xs">{ps.length} paragraphs</span>
              </span>
              <ol className="flex flex-col gap-0.5 pl-1 text-muted-foreground text-xs">
                {ps.map((x, i) => (
                  <li key={x.uid} className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-1">
                    <span className="tabular-nums">{i + 1}</span>
                    <span>{x.job}</span>
                  </li>
                ))}
              </ol>
            </li>
          );
        })}
      </ul>
    </M>
  );
}

function PaperOutline({ picked }: { picked: string | null }) {
  const c = file("JournalWritingContract.json");
  const bp = file("ManuscriptBlueprint.json");
  const sc = file("SectionContracts.json");
  // The checked tree, or the draft the planner sends section by section before the paragraphs check.
  const tree = paperTree();
  const draft = tree?.draft ?? null;
  const version = file("ManuscriptTree.json")?.version;
  const sections = bp?.sections ?? [];
  const placed = c9(L.sec, sections.length);
  const titled = Boolean(bp) && c9(L.title, 1) > 0;
  const paras = treeParagraphs(tree);
  const parasOn = tree ? c10(L.para, paras.length) : 0;
  const sentTotal = paras.reduce((k, x) => k + x.p.sentences.length, 0);
  const sentOn = tree ? c10(L.sentence, sentTotal) : 0;
  const nums = exhibitNumbers();
  const budget = (id: string) =>
    sc?.sections.find((x) => x.section_id === id)?.words ?? c?.rules.sections.find((x) => x.section_id === id)?.words;
  // Before the outline is laid out, the page has one section per section of the journal contract.
  const ahead = c?.rules.sections ?? [];
  return (
    <article
      data-page
      className="relative min-w-0 px-4 pt-6 pb-8 font-serif text-[15.5px] leading-[1.72] sm:px-10 sm:pt-8"
    >
      <header className="mb-2 border-b pb-5 font-sans">
        <p className="flex flex-wrap items-center justify-between gap-2 text-muted-foreground text-xs">
          <span>
            {c?.journal ?? "Research article"}
            {c ? ` · ${cap(c.article_type)}` : ""}
          </span>
          <span>
            {draft ? "Outline, planned section by section" : `Outline${version ? ` · tree v${version}` : ""}`}
          </span>
        </p>
        {bp && titled ? (
          <h2 className={cn(SERIF, "mt-3 text-balance font-semibold text-[23px] leading-snug tracking-tight")}>
            <Typed text={bp.working_title} on={streaming(L.title, "t")} />
          </h2>
        ) : (
          <div className="mt-4 flex flex-col gap-2.5">
            <Skeleton className="h-4 w-4/5 animate-none rounded-full" />
            <Skeleton className="h-4 w-1/2 animate-none rounded-full" />
          </div>
        )}
        {bp && titled && bp.contributions.length > 0 ? (
          <M in="fade" className="mt-4">
            <span className="font-medium text-muted-foreground text-xs">Contributions</span>
            <ol className="mt-1 flex list-decimal flex-col gap-1 pl-4 text-[13px] leading-snug">
              {bp.contributions.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ol>
          </M>
        ) : (
          <div className="mt-4">
            <span className="font-medium text-muted-foreground/60 text-xs">Contributions</span>
            <Bars n={2} last="w-3/5" className="mt-1" />
          </div>
        )}
        {!placed && <WorkingHere sid="S09" task={/^outline/} className="mt-4" />}
      </header>
      {!placed &&
        ahead.map((x, i) => (
          <SectionAhead key={x.section_id} id={x.section_id} n={i + 1} words={x.words} optional={!x.required} />
        ))}
      {placed > 0 &&
        sections.map((sec, si) => {
          if (si >= placed)
            return <SectionAhead key={sec.section_id} id={sec.section_id} n={si + 1} words={budget(sec.section_id)} />;
          const node = tree?.sections.find((x) => x.template === sec.section_id);
          const mine = paras.filter((x) => x.sec === sec.section_id);
          const on = mine.filter((x) => x.index < parasOn);
          const byCode = node?.written_by === "code";
          // The section's paragraph plan: being made now, or made and waiting for the others to be checked.
          const calls = callsOf("S10", `contracts-${sec.section_id}`);
          const planning = calls.some((x) => !x.done);
          // A run without the section-by-section draft shows a planned section only with the checked tree.
          const planned = !node && !has("ManuscriptTreeDraft.json") && calls.length > 0 && !planning;
          const unchecked = Boolean(draft && node);
          const options = sec.section_id === "discussion" && draft ? Object.entries(draft.options) : [];
          const named = new Set<string>();
          const after: Record<string, string[]> = {};
          for (const x of mine)
            for (const k of x.p.sentences.flatMap((s) => s.keys).filter(isExhibit))
              if (!named.has(k)) {
                named.add(k);
                after[x.p.paragraph_id] = [...(after[x.p.paragraph_id] ?? []), k];
              }
          // Before the paragraphs, a section's exhibits close it; after, each follows the paragraph that names it first.
          let tail = sec.exhibits;
          if (node) tail = on.length === mine.length ? sec.exhibits.filter((k) => !named.has(k)) : [];
          return (
            <M as="section" key={sec.section_id} in="up6" className="relative scroll-mt-4" data-sec={sec.section_id}>
              <h3 className="mt-7 mb-1.5 flex flex-wrap items-baseline gap-x-2.5 font-sans font-semibold text-[15px] tracking-tight">
                {si + 1}. {heading(sec.section_id)}
                <span className="font-normal text-muted-foreground text-xs">
                  {fmtWords(budget(sec.section_id))}
                  {sec.statements.length > 0 && ` · carries ${plural(sec.statements.length, "statement")}`}
                  {sec.exhibits.length > 0 && ` · ${plural(sec.exhibits.length, "exhibit")}`}
                </span>
                {unchecked && (
                  <Badge
                    variant="outline"
                    title="Planned by the Planner; the paragraphs check scores it once every section is planned."
                    className="self-center font-normal text-muted-foreground"
                  >
                    Not checked yet
                  </Badge>
                )}
              </h3>
              <p className="mb-3 font-sans text-[13px] text-muted-foreground leading-snug">{sec.purpose}</p>
              {!node && (
                <WorkingHere
                  sid="S10"
                  task={new RegExp(`^contracts-${sec.section_id}`)}
                  className="mb-3 rounded-lg bg-muted/60 px-3 py-2 font-sans"
                />
              )}
              {planned && (
                <p className="mb-3 flex items-center gap-2 font-sans text-muted-foreground text-xs">
                  <Icon n="check" className="size-3.5 text-emerald-600" />
                  Its paragraphs are planned; they show here once every section is planned and checked.
                </p>
              )}
              {byCode && (
                <p className="mb-3 flex items-start gap-2 rounded-lg bg-muted/60 px-3 py-2.5 font-sans text-[13px]">
                  <Icon n="file" className="mt-0.5 size-3.5 text-muted-foreground" />
                  <span>
                    Written by code from the record when the paper is drafted, not planned paragraph by paragraph.
                  </span>
                </p>
              )}
              {(byCode || !on.length) && sec.statements.length > 0 && (
                <ul className="mb-3 flex flex-col gap-1.5 font-sans">
                  {sec.statements.map((id) => (
                    <li key={id}>
                      <IdWords id={id} />
                    </li>
                  ))}
                </ul>
              )}
              {!byCode && !on.length && <Lines n={node ? 3 : 2} pulse={planning} />}
              {on.map((x) => (
                <div key={x.p.uid}>
                  <Brief
                    p={x.p}
                    n={x.n}
                    sentences={Math.max(0, Math.min(x.p.sentences.length, sentOn - x.first))}
                    typing={streaming(L.para, x.p.paragraph_id)}
                    picked={picked === x.p.paragraph_id}
                  />
                  {(after[x.p.paragraph_id] ?? []).map((k) => (
                    <ExhibitBox key={k} k={k} n={nums[k]} />
                  ))}
                </div>
              ))}
              {!byCode && on.length > 0 && on.length < mine.length && <Lines n={2} pulse={false} />}
              {tail.map((k) => (
                <ExhibitBox key={k} k={k} n={nums[k]} />
              ))}
              {options.length > 0 && on.length === mine.length && <SectionOptions options={options} />}
            </M>
          );
        })}
    </article>
  );
}

/* ---------- the folds behind the key result ---------- */
/** One plain line on what a fold holds, above its table or list. */
const Lead = ({ children }: { children: ReactNode }) => (
  <p className="text-pretty px-4 py-3 text-[13px] text-muted-foreground leading-relaxed sm:px-5">{children}</p>
);

/** How each structure tells the story (Schimel, Writing Science, 4.2 and 7.3): its name, and what it does to the paper. */
const STRUCTURE: Record<string, [string, string]> = {
  OCAR: ["straight OCAR", "the Introduction ends on its challenge, and the conclusions come after the evidence"],
  "telegraphed OCAR": [
    "telegraphed OCAR",
    "after a full Introduction, a brief overview of the conclusions, then the argument develops",
  ],
  LDR: ["LDR", "it leads with the answer, develops it, then resolves"],
};
const structureLine = (k: string) => {
  const [name, what] = STRUCTURE[k] ?? [k, ""];
  return `Told as ${name}${what ? `: ${what}` : ""}.`;
};

function StorylineBody() {
  const sp = storyPlan()?.plan;
  const on = sp ? c9(L.beats, OCAR.length) : 0;
  return (
    <div data-cursor="beats" className="pb-1">
      {sp?.structure && <Lead>{structureLine(sp.structure)}</Lead>}
      <FoldTable head={[["Beat", "w-28 sm:w-36"], ["Statements"]]}>
        {OCAR.map(([k, name], i) =>
          !sp || i >= on ? (
            <TableRow key={k} className="hover:bg-transparent">
              <TableCell className={cn(RC, "font-medium text-muted-foreground")}>{name}</TableCell>
              <TableCell className={RC}>
                <Bars n={2} last="w-1/2" />
              </TableCell>
            </TableRow>
          ) : (
            <M as={TableRow} key={k} in="fade">
              <TableCell className={cn(RC, "font-medium")}>{name}</TableCell>
              <TableCell className={RC}>
                <span className="flex flex-col gap-1.5">
                  {sp.ocar[k].length ? (
                    sp.ocar[k].map((id) => <IdWords key={id} id={id} />)
                  ) : (
                    <span className="text-muted-foreground">Nothing planned</span>
                  )}
                </span>
              </TableCell>
            </M>
          ),
        )}
      </FoldTable>
    </div>
  );
}

function ReasonsBody() {
  const sp = storyPlan()?.plan;
  const on = sp ? c9(L.reasons, 1) > 0 : false;
  const although = sp
    ? Object.values(Object.groupBy(sp.claim_candidates, (x) => `${x.claim}|${x.because}`)).map((g) => ({
        claim: g?.[0].claim ?? "",
        because: g?.[0].because ?? "",
        although: (g ?? []).map((x) => x.although),
      }))
    : [];
  if (!sp || !on)
    return (
      <div className="px-4 py-3 sm:px-5">
        <Bars n={5} last="w-2/3" />
      </div>
    );
  const row = "flex flex-col gap-1.5 border-t px-4 py-3 first:border-t-0 sm:px-5";
  return (
    <div className="flex flex-col text-[13px]">
      {sp.reasons.map((r) => (
        <M key={r.statement_id} in="fade" className={row}>
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="text-muted-foreground">Reason</span>
            <IdChip id={r.statement_id} />
            <span className="text-muted-foreground">supports</span>
            <IdChip id={r.supports} />
          </span>
          <span className="flex flex-wrap gap-1">
            {r.evidence.map((k) => (
              <Value key={k} k={k} />
            ))}
          </span>
        </M>
      ))}
      {although.map((a) => (
        <M key={`${a.claim}${a.because}`} in="fade" className={row}>
          <span className="flex flex-wrap items-center gap-1.5">
            <IdChip id={a.claim} />
            <span className="text-muted-foreground">because</span>
            <IdChip id={a.because} />
            <span className="text-muted-foreground">although</span>
          </span>
          {a.although.map((x) => (
            <IdWords key={x} id={x} />
          ))}
        </M>
      ))}
      {sp.warrants.map((w) => (
        <M key={w.claim_id} in="fade" className={row}>
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="font-medium">
              <Term t="warrant">Warrant</Term> for
            </span>
            <IdChip id={w.claim_id} />
            {w.reconstructed && (
              <StatusPill tone="look">
                <Term t="reconstructed">Reconstructed</Term>
              </StatusPill>
            )}
          </span>
          <span className="text-pretty leading-snug">{w.text}</span>
        </M>
      ))}
      {sp.acknowledgments.map((a) => (
        <M key={a.exchange_id} in="fade" className={row}>
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="font-medium">Objection to</span>
            <IdChip id={a.target} />
            <StatusPill tone="ok">{cap(a.outcome.replace(/_/g, " "))}</StatusPill>
          </span>
          <span className="text-pretty text-muted-foreground leading-snug">{a.objection}</span>
          <span className="flex items-start gap-1.5 text-pretty leading-snug">
            <Icon n="corner" className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
            {a.answer}
          </span>
        </M>
      ))}
    </div>
  );
}

function MovesBody() {
  const bp = file("ManuscriptBlueprint.json");
  const secs = bp?.sections ?? [];
  const on = c9(L.moves, secs.length);
  // Before the outline: the sections of the journal contract, their moves still to pick.
  const ahead = bp
    ? secs.map((s) => s.section_id)
    : (file("JournalWritingContract.json")?.rules.sections ?? []).map((s) => s.section_id);
  return (
    <div data-cursor="moves" className="pb-1">
      <FoldTable head={[["Section", "w-28 sm:w-36"], ["Moves, in order"]]}>
        {ahead.map((id, i) => {
          const sec = secs.find((x) => x.section_id === id);
          return sec && i < on ? (
            <M as={TableRow} key={id} in="fade">
              <TableCell className={cn(RC, "font-medium")}>{heading(id)}</TableCell>
              <TableCell className={RC}>{sec.moves.map(moveName).join(" → ")}</TableCell>
            </M>
          ) : (
            <TableRow key={id} className="hover:bg-transparent">
              <TableCell className={cn(RC, "font-medium text-muted-foreground")}>{heading(id)}</TableCell>
              <TableCell className={RC}>
                <Bars n={1} last="w-4/5" />
              </TableCell>
            </TableRow>
          );
        })}
      </FoldTable>
    </div>
  );
}

/** A note of the checks with each paragraph it names by id read as its number on the page. */
const numbered = (note: string) =>
  note.replace(/\b([a-z_]+-\d+)\b/g, (id) => {
    const n = paraNumber(id);
    return n ? `${n}` : id;
  });

/* One checkpoint's scorecard: what passed, what to look at, the versions compared and the one taken. */
function CheckpointCard({ k, card }: { k: string; card: Scorecard }) {
  const groups = ruleGroups(card);
  const hard = groups.filter((g) => g.kind === "H" && !g.passed);
  const look = groups.filter((g) => g.kind !== "H" && !g.passed);
  const name = `Options_${k}.json` as "Options_P2.json";
  const opts = file(name);
  const gate = file("GateState.json")?.[k];
  const taken = opts?.taken ?? gate?.option;
  const by = opts?.by ?? gate?.by;
  return (
    <M in="fade" className="flex flex-col gap-2 border-t px-4 py-3 first:border-t-0 sm:px-5">
      <b className="font-semibold text-[13px]">{CHECKPOINT_TITLE[k]}</b>
      <ul className="flex flex-col gap-1.5 text-[13px]">
        {[...hard, ...look].map((g) => {
          const notes = [...new Set(g.hits.map((h) => h.note))];
          // A place named by several hits of the rule shows once.
          const where = [...new Set(g.hits.map((h) => h.locator).filter(Boolean))];
          return (
            <li key={g.rule} className="grid grid-cols-[1rem_minmax(0,1fr)] gap-2">
              <Icon
                n={g.kind === "H" ? "ban" : "alert"}
                className={cn("mt-0.5 size-3.5", g.kind === "H" ? TONE.bad.text : TONE.look.text)}
              />
              <span className="leading-snug">
                <span className="font-medium">{RULE_TEXT[g.rule] ?? g.rule}</span>
                {notes.length === 1 && notes[0] && (
                  <span className="text-muted-foreground"> — {numbered(notes[0])}</span>
                )}
                {where.length > 0 && (
                  <span className="mt-1 flex flex-wrap gap-1">
                    {where.map((w) => (
                      <Badge key={w} variant="outline" className="font-normal" title={w}>
                        {paraNumber(w) ? `Paragraph ${paraNumber(w)}` : w}
                      </Badge>
                    ))}
                  </span>
                )}
                {notes.length > 1 && (
                  <span className="mt-1 flex flex-col gap-0.5 text-muted-foreground text-xs">
                    {g.hits.map((h) => (
                      <span key={`${h.locator}${h.note}`}>
                        {h.locator ? `${paraNumber(h.locator) ?? h.locator}: ` : ""}
                        {numbered(h.note)}
                      </span>
                    ))}
                  </span>
                )}
                {g.book && <span className="block text-[11px] text-muted-foreground">{g.book}</span>}
              </span>
            </li>
          );
        })}
        {groups
          .filter((g) => g.passed)
          .map((g) => (
            <li key={g.rule} className="grid grid-cols-[1rem_minmax(0,1fr)] gap-2 text-muted-foreground">
              <Icon n="check" className={cn("mt-0.5 size-3.5", TONE.ok.text)} />
              <span className="leading-snug">{RULE_TEXT[g.rule] ?? g.rule}</span>
            </li>
          ))}
      </ul>
      {opts && opts.options.length > 0 && (
        <span className="flex flex-col gap-1 text-[13px]">
          <span className="text-muted-foreground text-xs">Versions compared</span>
          {opts.options.map((o) => (
            <span key={o.option_id} className="flex flex-wrap items-center gap-1.5">
              <span className={cn(o.option_id === taken ? "font-medium" : "text-muted-foreground")}>{o.label}</span>
              {o.option_id === taken && (
                <StatusPill tone="ok">Taken{by ? ` by ${by === "researcher" ? "you" : "the run"}` : ""}</StatusPill>
              )}
              {o.option_id === opts.recommended && o.option_id !== taken && (
                <Badge variant="secondary">Recommended</Badge>
              )}
            </span>
          ))}
        </span>
      )}
    </M>
  );
}
/** How the checks went, said once: the hard rules failed, else the points to look at, else all passed. */
function checksVerdict(cards: Scorecard[]) {
  const groups = cards.flatMap((card) => ruleGroups(card));
  const hard = groups.filter((g) => g.kind === "H" && !g.passed).length;
  const look = groups.filter((g) => g.kind !== "H" && !g.passed).length;
  if (hard) return <StatusPill tone="bad">{plural(hard, "hard rule")} failed</StatusPill>;
  if (look) return <StatusPill tone="look">{look} to look at</StatusPill>;
  return <StatusPill tone="ok">Every rule passes</StatusPill>;
}
/** The checkpoints the screen shows: the story and sections (S09), the paragraphs and sentences (S10). */
const CHECK_GROUPS = [
  { keys: ["P2", "P3"], list: L.checks9, sid: "S09" },
  { keys: ["P4", "P5"], list: L.checks10, sid: "S10" },
];
/** The scorecards on screen so far, as the stages have played them. */
function shownCards() {
  return CHECK_GROUPS.flatMap(({ keys, list, sid }) => {
    const on = sid === "S09" ? c9(list, keys.length) : c10(list, keys.length);
    return keys
      .filter((_, i) => i < on)
      .map((k) => [k, scorecardOf(k)] as const)
      .filter((x): x is readonly [string, Scorecard] => Boolean(x[1]));
  });
}
function ChecksBody() {
  const cards = shownCards();
  return (
    <div className="flex flex-col">
      {CHECK_GROUPS.map(({ keys, list }) => (
        <div key={list} data-cursor={list} className="flex flex-col border-t first:border-t-0">
          {keys.map((k) => {
            const card = cards.find(([x]) => x === k)?.[1];
            if (card) return <CheckpointCard key={k} k={k} card={card} />;
            return (
              <div key={k} className="flex flex-col gap-2 border-t px-4 py-3 first:border-t-0 sm:px-5">
                <b className="font-semibold text-[13px] text-muted-foreground">{CHECKPOINT_TITLE[k]}</b>
                <Bars n={3} last="w-1/2" />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

const RELATION: Record<string, string> = {
  additional_support: "Adds support",
  wider_application: "Wider application",
  kind: "A different kind of evidence",
  perspective: "Another perspective",
};
function PriorBody() {
  const plan = file("SynthesisPlan.json");
  const comps = plan?.comparisons ?? [];
  const on = c10(L.compare, comps.length);
  // A run without literature cards plans no comparison: said once the stage is done.
  const none = !plan && S.st.S10?.status === "done";
  return (
    <div data-cursor="compare" className="flex flex-col text-[13px]">
      {!on && <WorkingHere sid="S10" task={/^synthesis/} className="px-4 pt-3 sm:px-5" />}
      {none && <p className="px-4 py-3 text-muted-foreground sm:px-5">No comparison with prior studies was planned.</p>}
      {!on && !none && (
        <div className="px-4 py-3 sm:px-5">
          <Bars n={4} last="w-1/2" />
        </div>
      )}
      {on > 0 &&
        comps.slice(0, on).map((x) => {
          const card = cardOf(x.card_id);
          const same = x.attributes.filter((a) => a.same).map((a) => a.attribute);
          const differ = x.attributes.filter((a) => !a.same).map((a) => a.attribute);
          return (
            <M
              key={`${x.card_id}:${x.hypothesis_id}`}
              in="fade"
              className="flex flex-col gap-1 border-t px-4 py-3 first:border-t-0 sm:px-5"
            >
              <span className="text-pretty leading-snug">
                {card ? card.title : x.card_id}
                {card?.year ? <span className="text-muted-foreground"> ({card.year})</span> : null}
              </span>
              <span className="flex flex-wrap items-center gap-1.5 text-xs">
                <IdChip id={x.hypothesis_id} />
                <Badge variant="outline" className="font-normal">
                  {RELATION[x.relation] ?? cap(x.relation.replace(/_/g, " "))}
                </Badge>
                {x.direction !== "n/r" && <span className="text-muted-foreground">{x.direction} direction</span>}
              </span>
              {same.length > 0 && <span className="text-muted-foreground text-xs">Same {same.join(", ")}</span>}
              {differ.length > 0 && (
                <span className="text-muted-foreground text-xs">Differs in {differ.join(", ")}</span>
              )}
              {x.warrant !== "none" && <span className="text-muted-foreground text-xs">Warrant: {x.warrant}</span>}
            </M>
          );
        })}
    </div>
  );
}

const POLICY_KIND: Record<string, string> = { H: "Hard", M: "To look at", G: "Suggestion" };
/** The word policies once the sentences check has scored them. */
function policiesOf() {
  const tree = file("ManuscriptTree.json");
  return tree && c10(L.checks10, 2) > 1 ? (tree.policies ?? []) : [];
}
function PoliciesBody() {
  const policies = policiesOf();
  return (
    <div className="pb-1">
      {policies.length ? (
        <FoldTable head={[["Policy"], ["Kind", "w-28"]]}>
          {policies.map((p) => (
            <TableRow key={p.name}>
              <TableCell className={RC}>
                <span className="font-medium">{cap(p.name.replace(/-/g, " "))}</span>
                <span className="block text-muted-foreground text-xs">{p.source}</span>
              </TableCell>
              <TableCell className={RC}>
                <Badge variant="outline" className="font-normal">
                  {POLICY_KIND[p.kind] ?? p.kind}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </FoldTable>
      ) : (
        <div className="px-4 py-3 sm:px-5">
          <Bars n={3} last="w-1/2" />
        </div>
      )}
    </div>
  );
}

/* ---------- what the stage did: the main point, its figures, the paragraphs' risk and the four checks ---------- */
/** The statements, warrants and objections a section's paragraphs carry, by kind. */
function carriedIn(sec: TreeSection) {
  const ids = new Set(sec.paragraphs.flatMap((p) => p.sentences.flatMap((x) => x.statements)));
  return {
    acks: [...ids].filter((id) => id.startsWith("ACK-")),
    warrants: [...ids].filter((id) => id.startsWith("W-")),
  };
}
/** The rules of a scorecard, by result. */
function cardCounts(card: Scorecard) {
  const groups = ruleGroups(card);
  const hard = groups.filter((g) => g.kind === "H" && !g.passed).length;
  const look = groups.filter((g) => g.kind !== "H" && !g.passed).length;
  return { total: groups.length, passed: groups.length - hard - look, hard, look };
}
const CHECK_NAME: Record<string, string> = {
  P2: "The story",
  P3: "The sections",
  P4: "The paragraphs",
  P5: "The sentences",
};

const STEPS: { sid: string; k: string; title: string; sel: string }[] = [
  { sid: "S09", k: "h1", title: "Plan the story", sel: "[data-story]" },
  { sid: "S09", k: "h2", title: "Score the story", sel: "[data-checks]" },
  { sid: "S09", k: "h3", title: "Lay out the sections", sel: "[data-glance]" },
  { sid: "S09", k: "h4", title: "Give each section its moves", sel: "[data-moves]" },
  { sid: "S09", k: "h5", title: "Score the sections", sel: "[data-checks]" },
  { sid: "S10", k: "i1", title: "Plan every paragraph and its sentences", sel: "[data-page]" },
  { sid: "S10", k: "i2", title: "Score each paragraph's risk", sel: "[data-glance]" },
  { sid: "S10", k: "i3", title: "Score the paragraphs", sel: "[data-checks]" },
  { sid: "S10", k: "i4", title: "Score the sentences", sel: "[data-checks]" },
  { sid: "S10", k: "i5", title: "Plan the comparisons with prior studies", sel: "[data-prior]" },
];
/** The result of a check in a few words, in the one colour meaning. */
function cardResult(k: string, on: boolean): { tone: Tone | "wait"; result: string } | null {
  const card = on ? scorecardOf(k) : undefined;
  if (!card) return null;
  const n = cardCounts(card);
  if (n.hard) return { tone: "bad", result: `${plural(n.hard, "hard rule")} failed` };
  if (n.look) return { tone: "look", result: `${n.passed} of ${n.total} rules pass, ${n.look} to look at` };
  return { tone: "ok", result: `All ${plural(n.total, "rule")} pass` };
}
function stepResult(sid: string, k: string): { tone: Tone | "wait" | "now"; result: string } {
  const st = S.st[sid];
  const now = st?.status === "running" && st.cur === k;
  const idle = { tone: now ? ("now" as const) : ("wait" as const), result: now ? "At work" : "Not done yet" };
  const sp = storyPlan()?.plan;
  const bp = file("ManuscriptBlueprint.json");
  const tree = paperTree();
  const paras = treeParagraphs(tree);
  const later = (x: string) => (st?.status === "done" ? true : st?.status === "running" && (st.cur ?? "") > x);
  if (k === "h1") {
    if (!sp || c9(L.reasons, 1) < 1) return idle;
    return {
      tone: "ok",
      result: `${plural(sp.reasons.length, "reason")}, ${plural(sp.acknowledgments.length, "objection")} answered`,
    };
  }
  if (k === "h2") return cardResult("P2", c9(L.checks9, 2) > 0) ?? idle;
  if (k === "h3") {
    if (!bp || c9(L.sec, bp.sections.length) < bp.sections.length) return idle;
    return {
      tone: "ok",
      result: `${plural(bp.sections.length, "section")}, ${plural(bp.storyline.length, "statement")}`,
    };
  }
  if (k === "h4") {
    if (!bp || c9(L.moves, bp.sections.length) < bp.sections.length) return idle;
    return {
      tone: "ok",
      result: `${plural(
        bp.sections.reduce((m, x) => m + x.moves.length, 0),
        "move",
      )} in all`,
    };
  }
  if (k === "h5") return cardResult("P3", c9(L.checks9, 2) > 1) ?? idle;
  if (k === "i1") {
    if (!tree || (!later("i1") && c10(L.para, paras.length) < paras.length) || !paras.length) return idle;
    return {
      tone: "ok",
      result: `${plural(paras.length, "paragraph")}, ${plural(
        paras.reduce((m, x) => m + x.p.sentences.length, 0),
        "sentence",
      )}`,
    };
  }
  if (k === "i2") {
    if (!tree || c10(L.risk, 1) < 1) return idle;
    const high = paras.filter((x) => x.p.risk >= HIGH_RISK).length;
    return high
      ? { tone: "look", result: `${plural(high, "paragraph")} to read first` }
      : { tone: "ok", result: "None to read first" };
  }
  if (k === "i3") return cardResult("P4", c10(L.checks10, 2) > 0) ?? idle;
  if (k === "i4") return cardResult("P5", c10(L.checks10, 2) > 1) ?? idle;
  const plan = file("SynthesisPlan.json");
  const comps = plan?.comparisons.length ?? 0;
  if (plan && c10(L.compare, comps) >= comps && (comps > 0 || S.st.S10?.status === "done"))
    return { tone: "ok", result: comps ? plural(comps, "comparison") : "None planned" };
  if (!plan && S.st.S10?.status === "done") return { tone: "none", result: "None planned: no literature cards" };
  return idle;
}

function BlueprintOverview() {
  const story = storyPlan();
  const sp = story?.plan;
  const ready = Boolean(sp) && c9(L.point, 1) > 0;
  const words = sp?.message ? wordsOf(sp.message) : null;
  const others = sp ? sp.message_statements.filter((x) => x !== sp.message) : [];
  const bp = file("ManuscriptBlueprint.json");
  const _secsIn = Boolean(bp) && c9(L.sec, bp?.sections.length ?? 0) >= (bp?.sections.length ?? 1);
  const shownTree = paperTree();
  const paras = treeParagraphs(shownTree);
  const _parasOn = shownTree ? c10(L.para, paras.length) : 0;
  const _byCode = (shownTree?.sections ?? []).filter((x) => x.written_by === "code").length;
  const cards = shownCards();
  const counts = cards.map(([, card]) => cardCounts(card));
  const _rules = counts.reduce((m, x) => m + x.total, 0);
  const _passed = counts.reduce((m, x) => m + x.passed, 0);
  const hard = counts.reduce((m, x) => m + x.hard, 0);
  const look = counts.reduce((m, x) => m + x.look, 0);
  const _checkTone: Tone = hard ? "bad" : look ? "look" : "ok";
  const rows: BarRow[] = cards.map(([k, card]) => {
    const n = cardCounts(card);
    return {
      key: k,
      name: CHECKPOINT_TITLE[k],
      label: (
        <>
          {CHECK_NAME[k] ?? CHECKPOINT_TITLE[k]}{" "}
          <span className="font-mono text-[11px] text-muted-foreground">{k}</span>
        </>
      ),
      parts: [
        { key: "ok", label: "Rules passed", value: n.passed, swatch: "ok" },
        { key: "look", label: "To look at", value: n.look, swatch: "look" },
        { key: "bad", label: "Hard rule failed", value: n.hard, swatch: "bad" },
      ],
      total: n.total,
      end: n.hard ? (
        <span className="font-medium text-rose-700 dark:text-rose-300">{n.hard} failed</span>
      ) : n.look ? (
        <span className="font-medium text-amber-700 dark:text-amber-300">{n.look} to look at</span>
      ) : (
        `${n.passed} of ${n.total} pass`
      ),
    };
  });
  const waiting = ["P2", "P3", "P4", "P5"].filter((k) => !cards.some(([x]) => x === k));
  return (
    <Section
      icon="target"
      title="What this stage did"
      tells="The Planner set the paper's story and its main point, laid out the sections, then planned every paragraph and what each sentence may carry; code scored each step. The text itself is written later, inside this plan."
      data-cursor="point"
      data-key-result
    >
      <div className="@container flex flex-col gap-4 px-4 py-4 sm:px-5">
        {!ready && <WorkingHere sid="S09" task={/^story/} />}
        <Takeaway ready={ready}>
          <span className="block font-normal text-[12.5px] text-muted-foreground">
            The paper's main point{story?.draft ? " · not checked yet" : ""}
          </span>
          <span className={cn(SERIF, "block text-pretty font-normal text-[19px] leading-snug")}>
            {words ? (
              <Typed text={words} on={streaming(L.point, "point")} />
            ) : (
              "The story has no main point the frozen graph can carry."
            )}
          </span>
          {sp?.message && (
            <span className="mt-1.5 flex flex-wrap items-center gap-1.5 font-normal text-[12.5px] text-muted-foreground">
              <StatementChip id={sp.message} />
              {others.length > 0 && (
                <>
                  stated with
                  {others.map((x) => (
                    <StatementChip key={x} id={x} />
                  ))}
                </>
              )}
            </span>
          )}
        </Takeaway>
        <div className="flex flex-col gap-2">
          <SubHead title="How code scored each part of the plan" tells="Each part against its own rules, in order." />
          <ul className="grid gap-2 @2xl:grid-cols-4">
            {rows.map((r) => {
              const ok = r.parts[0]?.value ?? 0;
              const lk = r.parts[1]?.value ?? 0;
              const bd = r.parts[2]?.value ?? 0;
              return (
                <li
                  key={r.key}
                  className={cn(
                    "flex flex-col gap-1 rounded-lg px-3 py-2 ring-1 ring-inset",
                    bd
                      ? "bg-rose-50/70 ring-rose-200 dark:bg-rose-950/25 dark:ring-rose-900"
                      : lk
                        ? "bg-amber-50/70 ring-amber-200 dark:bg-amber-950/25 dark:ring-amber-900"
                        : "bg-emerald-50/70 ring-emerald-200 dark:bg-emerald-950/25 dark:ring-emerald-900",
                  )}
                >
                  <span className="font-medium text-[13px]">{r.label}</span>
                  <span className="text-[12.5px] text-muted-foreground">
                    <b className="font-semibold text-foreground tabular-nums">{ok}</b> of {r.total} rules pass
                    {lk ? ` · ${lk} to look at` : ""}
                    {bd ? ` · ${bd} failed` : ""}
                  </span>
                </li>
              );
            })}
            {waiting.map((k) => (
              <li
                key={k}
                className="rounded-lg px-3 py-2 text-[12.5px] text-muted-foreground ring-1 ring-foreground/10"
              >
                {CHECK_NAME[k]} <span className="font-mono text-[11px]">{k}</span> · not scored yet
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-2">
          <SubHead title="The ten steps" tells="Each step in order, with what it made. Click one to read it in full." />
          <ResultGrid
            items={STEPS.map((x) => {
              const r = stepResult(x.sid, x.k);
              return { key: x.k, title: x.title, result: r.result, tone: r.tone, onPick: () => scrollSoon(x.sel) };
            })}
          />
        </div>
      </div>
    </Section>
  );
}

/* ---------- what it means for the paper ---------- */
function BlueprintPaper() {
  const sp = storyPlan()?.plan;
  const shownTree = paperTree();
  const paras = treeParagraphs(shownTree);
  const parasOn = shownTree ? c10(L.para, paras.length) : 0;
  const tree = Boolean(shownTree) && parasOn > 0;
  const high = paras.filter((x) => x.index < parasOn && x.p.risk >= HIGH_RISK);
  const effects: { key: string; item: ReactNode; effect: ReactNode; tone?: Tone }[] = [];
  if (sp?.structure)
    effects.push({
      key: "story",
      item: "The story",
      effect: `is ${structureLine(sp.structure).replace(/^T/, "t").replace(":", " (opening, challenge, action, resolution):")}`,
    });
  // What the Discussion states: from its paragraph plans once they are in, else from the story.
  const disc = shownTree?.sections.find((x) => x.template === "discussion");
  const said = disc?.paragraphs.length
    ? carriedIn(disc)
    : {
        acks: (sp?.acknowledgments ?? []).filter((a) => a.place === "discussion").map((a) => a.exchange_id),
        warrants: (sp?.warrants ?? []).map((w) => w.claim_id),
      };
  if (sp && (said.acks.length || said.warrants.length))
    effects.push({
      key: "discussion",
      item: `The ${heading("discussion")}`,
      effect: `answers ${plural(said.acks.length, "objection")} a reader may raise and states ${
        said.warrants.length ? plural(said.warrants.length, "warrant") : "no warrant"
      }, the reason the evidence supports a claim.`,
    });
  const byCode = (shownTree?.sections ?? []).filter((x) => x.written_by === "code").map((x) => heading(x.template));
  if (byCode.length)
    effects.push({
      key: "code",
      item: joined(byCode),
      effect: `${byCode.length > 1 ? "are" : "is"} written by code from the record, not planned paragraph by paragraph.`,
    });
  if (tree && high.length)
    effects.push({
      key: "high",
      item: `${high.length === 1 ? "Paragraph" : "Paragraphs"} ${joined(high.map((x) => x.n))}`,
      effect: `${high.length === 1 ? "is" : "are"} written with care: read ${high.length === 1 ? "it" : "them"} first.`,
      tone: "look",
    });
  return (
    <Section
      icon="pen"
      title="What it means for the paper"
      tells="How the paper tells its story, what the Discussion must answer, and where to look first once it is written."
    >
      <div className="px-4 py-3 sm:px-5">
        {effects.length ? <EffectList items={effects} /> : <Bars n={3} last="w-1/2" className="py-2" />}
      </div>
    </Section>
  );
}

/* What the sentences of the plan do, by their job, most first: one hue, the bars on one scale. */
function SentenceJobs() {
  const tree = paperTree();
  const paras = treeParagraphs(tree);
  const sentTotal = paras.reduce((k, x) => k + x.p.sentences.length, 0);
  const sentOn = tree ? c10(L.sentence, sentTotal) : 0;
  const jobs = new Map<string, number>();
  let k = 0;
  for (const x of paras)
    for (const sen of x.p.sentences) {
      if (k++ >= sentOn) break;
      jobs.set(sen.function, (jobs.get(sen.function) ?? 0) + 1);
    }
  if (!jobs.size) return null;
  const rows: BarRow[] = [...jobs.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([fn, m]) => ({
      key: fn,
      name: fnName(fn),
      label: fnName(fn),
      parts: [{ key: "n", label: "Sentences", value: m, swatch: "accent" }],
      total: m,
      end: plural(m, "sentence"),
    }));
  return (
    <div className="flex flex-col gap-3 border-b px-4 py-4 sm:px-5">
      <SubHead
        title="What the sentences do"
        tells="Each planned sentence by its job, most first."
        aside={plural(sentOn, "sentence")}
      />
      <BarRows rows={rows} />
    </div>
  );
}

/* ---------- the scene ---------- */
export function BlueprintBody({ live }: { live: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const s9 = S.st.S09;
  const s10 = S.st.S10;
  const paras = treeParagraphs(paperTree());
  const last = paras[Math.max(0, (S.n[L.para] ?? 0) - 1)];
  const secs = file("ManuscriptBlueprint.json")?.sections ?? [];
  // The paragraph a person picked from the blocks, marked on the page; a new run has none.
  const [touched, setTouched] = useState<{ run: unknown; picked: string | null }>({ run: S, picked: null });
  const picked = touched.run === S ? touched.picked : null;
  const pickPara = (id: string) => {
    setTouched({ run: S, picked: id });
    scrollSoon(`[data-para="${CSS.escape(id)}"]`);
  };
  let target: string | null = null;
  if (s9?.cur === "h1") target = (S.n[L.point] ?? 0) > 0 && (S.n[L.story] ?? 0) > 0 ? "story" : "point";
  if (s9?.cur === "h3") target = `sec:${secs[Math.max(0, (S.n[L.sec] ?? 0) - 1)]?.section_id}`;
  if (s10?.cur === "i1" && last) target = `para:${last.p.paragraph_id}`;
  if (s10?.cur === "i2") target = "risk";
  // The Planner lays out the story, the sections and the paragraphs; the Synthesis Planner the comparisons; code scores.
  let agent: string | null = null;
  if (s9?.status === "running" && ["h1", "h3", "h4"].includes(s9.cur ?? "")) agent = "rp";
  if (s10?.status === "running" && s10.cur === "i1") agent = "rp";
  if (s10?.status === "running" && s10.cur === "i5") agent = "sy";
  const story = storyPlan();
  const sp = story?.plan;
  const storyOn = sp ? c9(L.story, storyLength(sp)) : 0;
  const ocar = sp && c9(L.beats, OCAR.length) ? OCAR.flatMap(([k]) => sp.ocar[k]).length : 0;
  let storyAside: string | undefined;
  if (sp && storyOn) storyAside = story?.draft ? "Not checked yet" : plural(storyOn, "part");
  const cards = shownCards();
  const comps = c10(L.compare, file("SynthesisPlan.json")?.comparisons.length ?? 0);
  const policies = policiesOf().length;
  const parasOn = c10(L.para, paras.length);
  // What the Planner or the code does now, in the part it fills.
  const doing = (sid: "S09" | "S10", ks: string[], text: string) => {
    const st = S.st[sid];
    return live && st?.status === "running" && ks.includes(st.cur ?? "") ? text : null;
  };
  const lastSec = secs[Math.max(0, (S.n[L.sec] ?? 0) - 1)];
  return (
    <StageAccent accent="sky">
      <div ref={host} className="relative flex min-w-0 flex-col gap-5">
        <BlueprintOverview />
        <PaperGlance
          onPick={pickPara}
          onSection={(sec) => scrollSoon(`[data-sec="${CSS.escape(sec)}"]`)}
          now={
            doing("S09", ["h3"], lastSec ? `Laying out ${heading(lastSec.section_id)}` : "Laying out the sections") ??
            doing(
              "S10",
              ["i1"],
              last ? `Planning paragraph ${last.n} · ${heading(last.sec)}` : "Planning the paragraphs",
            ) ??
            doing("S10", ["i2"], "Scoring each paragraph's risk")
          }
        />
        <BlueprintPaper />
        <Section
          icon="book"
          title="The story"
          tells="Why the paper matters, the problem it answers, its key terms and the reader it is written for."
          now={doing("S09", ["h1"], "Planning the story")}
          aside={storyAside}
          data-story
          data-out="StoryPlan.json StoryPlanDraft.json"
        >
          <StoryBody />
        </Section>
        <Section
          icon="graph"
          title="Storyline"
          tells="Opening, challenge, action, resolution: the statements each part of the story carries."
          aside={ocar ? plural(ocar, "statement") : undefined}
        >
          <StorylineBody />
        </Section>
        <Section
          icon="shield"
          title="Reasons and objections"
          tells={
            <>
              What the main point rests on: its reasons and their evidence, its <Term t="warrant">warrants</Term>, and
              the objections it answers.
            </>
          }
          aside={sp && c9(L.reasons, 1) ? plural(sp.acknowledgments.length, "objection") : undefined}
        >
          <ReasonsBody />
        </Section>
        <Section
          icon="list"
          title="Sections and their moves"
          tells="The moves of each section: the standard steps it takes, in order."
          now={doing("S09", ["h4"], "Giving each section its moves")}
          aside={secs.length && c9(L.moves, secs.length) ? plural(secs.length, "section") : undefined}
          data-moves
        >
          <MovesBody />
        </Section>
        <Section
          icon="file"
          title="Paragraph plans"
          tells="The page as planned: each section, every paragraph's job, and what each sentence may carry. No text is written yet."
          now={doing("S10", ["i1"], last ? `Planning paragraph ${last.n}: ${last.p.job}` : "Planning the paragraphs")}
          aside={parasOn ? plural(parasOn, "paragraph") : undefined}
        >
          <SentenceJobs />
          <PaperOutline picked={picked} />
        </Section>
        <Section
          icon="circleCheck"
          title="Checks"
          tells="Code scores the story, the sections, the paragraphs and the sentences against their rules. A rule to look at names where."
          now={doing("S09", ["h2", "h5"], "Scoring the plan") ?? doing("S10", ["i3", "i4"], "Scoring the plan")}
          aside={cards.length ? checksVerdict(cards.map(([, card]) => card)) : undefined}
          data-checks
        >
          <ChecksBody />
        </Section>
        <Section
          icon="quote"
          title="Prior studies"
          tells="The published studies the Discussion compares its results with, and how each compares."
          now={doing("S10", ["i5"], "Planning the comparisons with prior studies")}
          aside={comps ? plural(comps, "comparison") : undefined}
          data-prior
          data-out="SynthesisPlan.json"
        >
          <PriorBody />
        </Section>
        <Section
          icon="ban"
          title="Word policies"
          tells="The word rules every sentence is held to, and how strictly."
          aside={policies ? plural(policies, "policy", "policies") : undefined}
        >
          <PoliciesBody />
        </Section>
        <AgentCursor
          agent={live ? agent : null}
          host={host}
          target={target}
          version={`${S.n[L.point] ?? 0}-${S.n[L.story] ?? 0}-${S.n[L.sec] ?? 0}-${S.n[L.para] ?? 0}-${S.n[L.sentence] ?? 0}`}
        />
      </div>
    </StageAccent>
  );
}
