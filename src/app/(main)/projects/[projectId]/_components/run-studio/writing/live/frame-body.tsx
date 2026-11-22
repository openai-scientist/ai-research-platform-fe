"use client";
"use no memo";

/* ===== Branch A, live: the writing frame (S00A), its choices at checkpoints F and J, and the join's check (S08) =====
   The frame is read from the journal profile alone, before the argument. The screen reads top to bottom: what the
   stage did (its takeaway, its figures, each section's word budget and its four steps), what it means for the paper
   (what the paper must meet, and what is set for you to change), then the full detail in open sections: what the
   journal asks (each rule with why it holds and where it comes from), how each section is built (its length, its moves,
   what it does and the statement types it carries), how every sentence reads and where each part of an argument is
   written, and the few choices you may change. A run on the generic profile says so first: no journal's instructions
   are in it yet. At the join the frame meets the locked argument, and code checks three ways that they fit. Each part
   stands as a skeleton until its step plays. */

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { S } from "../engine";
import { canEnter, cn, Icon, M } from "../lib";
import { Typed } from "../scenes-gather";
import { shown, streaming, WorkingHere } from "./kit";
import { cap, moveName, plural } from "./outline-data";
import { Bars, scrollSoon } from "./outline-kit";
import { file } from "./run";
import type { Tone } from "./stage-kit";
import {
  EffectList,
  Meter,
  ResultGrid,
  Section,
  StageAccent,
  StatTile,
  SubHead,
  TailToggle,
  Takeaway,
  TileRow,
  useAccent,
} from "./stage-visual";
import { Term } from "./term";
import type { FrameChoice, FrameChoiceKey, FrameSection, JoinFinding, JoinRule, WritingFrameFile } from "./types";

export const FRAME_SID = "S00A";
/** The lists the frame's stage streams, one per part. */
export const FL = {
  rules: "fa.rules",
  secs: "fa.secs",
  sent: "fa.sent",
  tmap: "fa.tmap",
  choices: "fa.choices",
  join: "o8.join",
};
const SECTIONS_AHEAD = 7;
/** The sources a section names before the rest open on a click. */
const SOURCES_SHOWN = 2;
const count = (list: string, total: number) => shown(FRAME_SID, list, total);
/** Every item of a list is on screen. */
const listIn = (list: string, total: number) => count(list, total) >= total;

/** A value of a choice on its button, where its own name is a code. */
const VALUE_TEXT: Record<string, string> = { cse: "Numerals", default: "As written" };
/** The value of a choice in the words the frame offers it in. */
export const choiceText = (c: FrameChoice, value = c.value) => c.labels[value] ?? value;

/** The rules of the profile that are not a section's: the sections have a part of their own below. */
export function journalRules(f: WritingFrameFile) {
  const headings = new Set(f.sections.map((s) => s.heading));
  return f.rules.filter((r) => !headings.has(r.item));
}
const fmt = (n: number) => n.toLocaleString("en-US");
const pad = (n: number) => String(n).padStart(2, "0");

/* ---------- a word budget on one scale for the whole paper ---------- */
/** A word axis a reader can count: four or five ticks up to a round end. */
export function wordScale(top: number) {
  const step = [50, 100, 250, 500, 1000, 2500, 5000].find((s) => top / s <= 4) ?? 10000;
  const end = Math.max(step, Math.ceil(top / step) * step);
  return { end, ticks: Array.from({ length: end / step + 1 }, (_, i) => i * step) };
}
/**
 * One section's word budget as a bar from its least to its most words, on the scale every row shares; an optional
 * section's bar is lighter. The bar grows from its start as it is drawn, and stands still for reduced motion.
 */
export function WordRange({
  words,
  optional,
  end,
  ticks,
  drawn,
  delay = 0,
  label,
}: {
  words: number[];
  optional?: boolean;
  end: number;
  ticks: number[];
  drawn: boolean;
  delay?: number;
  label: string;
}) {
  const a = useAccent();
  const [lo, hi] = words;
  const x = (v: number) => (v / end) * 100;
  return (
    <span
      role="img"
      aria-label={drawn ? `${label}: ${fmt(lo)} to ${fmt(hi)} words` : `${label}: not set yet`}
      className="relative block h-5 min-w-0"
    >
      {ticks.map((t) => (
        <span
          key={t}
          aria-hidden="true"
          className="absolute inset-y-0 w-px bg-foreground/[0.07]"
          style={{ left: `${x(t)}%` }}
        />
      ))}
      {drawn ? (
        <M
          as="span"
          in="grow"
          delay={canEnter() ? delay : 0}
          className={cn("absolute top-[calc(50%-4px)] h-2 origin-left rounded-full", a.mark, optional && "opacity-40")}
          style={{ left: `${x(lo)}%`, width: `${Math.max(1, x(hi) - x(lo))}%` }}
        />
      ) : (
        <span className="absolute top-[calc(50%-4px)] left-[8%] h-2 w-2/5 rounded-full bg-foreground/[0.07]" />
      )}
    </span>
  );
}
/** The word axis above a column of ranges: its round numbers, where they fall. */
export function WordAxis({ end, ticks }: { end: number; ticks: number[] }) {
  return (
    <span aria-hidden="true" className="relative block h-4 font-mono text-[11px] text-muted-foreground tabular-nums">
      {ticks.map((t, i) => (
        <span
          key={t}
          className={cn(
            "absolute whitespace-nowrap",
            i > 0 && "-translate-x-1/2",
            i === ticks.length - 1 && "-translate-x-full",
          )}
          style={{ left: `${(t / end) * 100}%` }}
        >
          {fmt(t)}
        </span>
      ))}
    </span>
  );
}

/* ---------- what the stage did: the takeaway, its figures, each section's budget and its four steps ---------- */
const STEPS: { k: string; title: string; sel: string }[] = [
  { k: "f1", title: "Read what the journal asks", sel: "[data-frame-rules]" },
  { k: "f2", title: "Lay out the paper's shape", sel: "[data-frame-secs]" },
  { k: "f3", title: "Set how every sentence reads", sel: "[data-frame-style]" },
  { k: "f4", title: "Offer the choices you may change", sel: "[data-frame-choices]" },
];
/** What each step came to, from the frame; the step at work turns, the steps to come wait. */
function stepResult(k: string, f?: WritingFrameFile): { tone: Tone | "wait" | "now"; result: string } {
  const st = S.st[FRAME_SID];
  const now = st?.status === "running" && st.cur === k;
  const idle = { tone: now ? ("now" as const) : ("wait" as const), result: now ? "At work" : "Not read yet" };
  if (!f) return idle;
  if (k === "f1") {
    const rules = journalRules(f);
    if (!listIn(FL.rules, rules.length)) return idle;
    return f.profile.generic
      ? { tone: "look", result: `${plural(rules.length, "rule")}, from the generic profile` }
      : { tone: "ok", result: `${plural(rules.length, "rule")} of ${f.profile.name}` };
  }
  if (k === "f2") {
    if (!listIn(FL.secs, f.sections.length)) return idle;
    return {
      tone: "ok",
      result: `${plural(f.sections.length, "section")}, ${f.sections.filter((s) => s.required).length} required`,
    };
  }
  if (k === "f3") {
    const parts = Object.keys(f.style.argument_map).length;
    if (!listIn(FL.sent, f.style.sentence_rules.length) || !listIn(FL.tmap, parts)) return idle;
    return {
      tone: "ok",
      result: `${plural(f.style.sentence_rules.length, "sentence rule")}, ${plural(parts, "argument part")} placed`,
    };
  }
  if (!listIn(FL.choices, f.choices.length)) return idle;
  return { tone: "ok", result: `${plural(f.choices.length, "choice")} for you` };
}

function FrameOverview({ f }: { f?: WritingFrameFile }) {
  const rules = f ? journalRules(f) : [];
  const secs = f?.sections ?? [];
  const parts = f ? Object.keys(f.style.argument_map).length : 0;
  const rulesIn = Boolean(f) && listIn(FL.rules, rules.length);
  const secsOn = f ? count(FL.secs, secs.length) : 0;
  const secsIn = Boolean(f) && secsOn >= secs.length;
  const sentIn = Boolean(f) && listIn(FL.sent, f?.style.sentence_rules.length ?? 0) && listIn(FL.tmap, parts);
  const choicesIn = Boolean(f) && listIn(FL.choices, f?.choices.length ?? 0);
  const ready = rulesIn && secsIn && sentIn && choicesIn;
  const required = secs.filter((s) => s.required).length;
  const moves = secs.reduce((k, s) => k + s.moves.length, 0);
  const structure = f?.choices.find((c) => c.key === "structure");
  const headline = f
    ? `${f.profile.generic ? "The generic profile sets the frame, as no journal is chosen yet" : `${f.profile.name} sets the frame`}: ${plural(
        secs.length,
        "section",
      )}, ${required} of them required${structure ? `, the story told as ${structure.value}` : ""}; ${plural(
        f.choices.length,
        "choice",
      )} ${f.choices.length === 1 ? "is" : "are"} yours to change.`
    : null;
  const { end, ticks } = wordScale(Math.max(1, ...secs.map((s) => s.words[1] ?? 0)));
  const ahead = f ? secs : Array.from({ length: SECTIONS_AHEAD }, () => null);
  return (
    <Section
      icon="target"
      title="What this stage did"
      tells="Code read the journal profile and set how the paper will be written: its rules, its sections and their length, how every sentence reads, and what you may change. No model works here."
      data-frame-overview
    >
      <div className="@container flex flex-col gap-4 px-4 py-4 sm:px-5">
        <Takeaway ready={ready}>{headline}</Takeaway>
        <TileRow>
          <StatTile
            label="Journal profile"
            ready={Boolean(f) && count(FL.rules, rules.length) > 0}
            value={f?.profile.generic ? "Generic" : (f?.profile.name ?? "")}
            hint={f?.profile.generic ? "No journal's instructions yet" : "Its instructions set the rules"}
            tone={f?.profile.generic ? "look" : "ok"}
          />
          <StatTile
            label="Sections"
            ready={secsIn}
            value={secs.length}
            hint={`${required} required${secs.length > required ? `, ${secs.length - required} optional` : ""}`}
          >
            <Meter value={required} max={secs.length} label="Sections required" />
          </StatTile>
          <StatTile label="Moves" ready={secsIn} value={moves} hint="The standard steps the sections take, in order" />
          <StatTile
            label="Sentence rules"
            ready={sentIn}
            value={f?.style.sentence_rules.length ?? 0}
            hint="Every writer follows them"
          />
          <StatTile
            label="Yours to change"
            ready={choicesIn}
            value={f?.choices.length ?? 0}
            hint="At checkpoint F, or again at the join (J)"
          />
        </TileRow>
        <div className="grid @4xl:grid-cols-[minmax(0,1fr)_minmax(0,19rem)] gap-5 rounded-lg bg-muted/30 p-4 ring-1 ring-foreground/5">
          <div className="flex min-w-0 flex-col gap-3">
            <SubHead
              title="Each section's word budget"
              tells="From its fewest to its most words, on one scale; a lighter bar is an optional section."
            />
            <div className="@container flex flex-col">
              <div className="grid @xl:grid-cols-[9rem_minmax(0,1fr)_6.5rem] grid-cols-[minmax(0,1fr)_6.5rem] gap-x-3 pb-1">
                <span className="@max-xl:hidden" />
                <span className="@max-xl:hidden">
                  <WordAxis end={end} ticks={ticks} />
                </span>
                <span className="@xl:hidden text-[12px] text-muted-foreground">
                  On one scale, 0 to {fmt(end)} words
                </span>
              </div>
              <ol className="flex flex-col gap-1.5">
                {ahead.map((s, i) => {
                  const on = Boolean(s) && i < secsOn;
                  return (
                    <li
                      // biome-ignore lint/suspicious/noArrayIndexKey: a section keeps its row from skeleton to bar
                      key={i}
                      className="grid @xl:grid-cols-[9rem_minmax(0,1fr)_6.5rem] grid-cols-[minmax(0,1fr)_6.5rem] items-center gap-x-3 gap-y-0.5"
                    >
                      <span className="min-w-0 truncate text-[13px] leading-tight">
                        {s ? (
                          <>
                            {s.heading}
                            {!s.required && <span className="text-muted-foreground"> · optional</span>}
                          </>
                        ) : (
                          <Bars n={1} last="w-20" />
                        )}
                      </span>
                      <span className="@max-xl:order-last @max-xl:col-span-2 min-w-0">
                        <WordRange
                          words={s?.words ?? [0, 0]}
                          optional={s ? !s.required : false}
                          end={end}
                          ticks={ticks}
                          drawn={on}
                          delay={Math.min(i, 8) * 0.05}
                          label={s?.heading ?? "A section"}
                        />
                      </span>
                      <span className="whitespace-nowrap text-right text-[12.5px] text-muted-foreground tabular-nums">
                        {s && on ? `${fmt(s.words[0])}–${fmt(s.words[1])}` : ""}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
          <div className="flex min-w-0 flex-col gap-3">
            <SubHead
              title="The four steps"
              tells="Each step in order, with what it set. Click one to read it in full."
            />
            <ResultGrid
              className="sm:grid-cols-1 xl:grid-cols-1"
              items={STEPS.map((x) => {
                const r = stepResult(x.k, f);
                return { key: x.k, title: x.title, result: r.result, tone: r.tone, onPick: () => scrollSoon(x.sel) };
              })}
            />
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ---------- what it means for the paper: what it must meet, and what is set for you to change ---------- */
function FramePaper({ f }: { f?: WritingFrameFile }) {
  const rules = f ? journalRules(f) : [];
  const rulesOn = f ? count(FL.rules, rules.length) : 0;
  const choices = f?.choices ?? [];
  const choicesOn = f ? count(FL.choices, choices.length) : 0;
  const must: { key: string; item: string; effect: string; tone?: Tone }[] = [];
  if (f?.profile.generic && rulesOn > 0)
    must.push({
      key: "generic",
      item: "The journal's own instructions",
      effect: "are not in the frame yet: check them before you submit.",
      tone: "look",
    });
  for (const r of rules.slice(0, rulesOn)) must.push({ key: r.item, item: r.item, effect: `${cap(r.value)}.` });
  const set = choices.slice(0, choicesOn).map((c) => ({
    key: c.key,
    item: c.label,
    effect: `${choiceText(c)}.`,
  }));
  return (
    <Section
      icon="pen"
      title="What it means for the paper"
      tells="What every draft of this paper must meet, and what the frame set for you, which you may change."
    >
      <div className="grid gap-x-8 gap-y-5 px-4 py-4 sm:px-5 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-1.5">
          <SubHead title="What the paper must meet" tells="From the journal profile; the sections' own rules follow." />
          {must.length ? <EffectList items={must} /> : <Bars n={4} last="w-1/2" className="py-2" />}
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <SubHead
            title="What is set for you"
            tells="The frame's choice for each; the options are in full below."
            aside={choices.length ? plural(choices.length, "choice") : undefined}
          />
          {set.length ? <EffectList items={set} /> : <Bars n={4} last="w-1/2" className="py-2" />}
        </div>
      </div>
    </Section>
  );
}

/* ---------- 1 · what the journal asks: each rule, why it holds, and where it comes from ---------- */
function AsksSection({ f, now }: { f?: WritingFrameFile; now: (k: string) => string | null }) {
  const rules = f ? journalRules(f) : [];
  const on = f ? count(FL.rules, rules.length) : 0;
  return (
    <Section
      icon="book"
      title="What the journal asks"
      tells="The rules the journal profile sets for every paper of this type, each with why it holds and where it comes from."
      now={now("f1")}
      aside={
        f && (
          <Badge variant="outline" className="font-normal">
            {f.profile.generic ? "Generic profile" : f.profile.name}
          </Badge>
        )
      }
      data-frame-rules
    >
      {f?.profile.generic && (
        <p className="flex gap-2.5 border-b bg-amber-50 px-4 py-2.5 text-[13.5px] text-amber-950 leading-snug sm:px-5 dark:bg-amber-950/30 dark:text-amber-100">
          <Icon n="alert" className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          {f.profile.note}
        </p>
      )}
      <ul className="grid gap-2.5 px-4 py-4 sm:grid-cols-2 sm:px-5 xl:grid-cols-4">
        {(f ? rules : Array.from({ length: 4 }, () => null)).map((r, i) => (
          <li
            // biome-ignore lint/suspicious/noArrayIndexKey: a rule keeps its tile from skeleton to text
            key={i}
            className="flex min-w-0 flex-col gap-1.5 rounded-lg bg-muted/40 px-3.5 py-3 ring-1 ring-foreground/5"
          >
            {r && i < on ? (
              <>
                <span className="text-[12.5px] text-muted-foreground">{r.item}</span>
                <b className="font-semibold text-[15.5px] leading-snug">{cap(r.value)}</b>
                <span className="text-pretty text-[13px] text-muted-foreground leading-snug">
                  <Typed text={r.why} on={streaming(FL.rules, r.item)} />
                </span>
                <span className="mt-auto text-pretty border-foreground/10 border-t pt-1.5 text-[12px] text-muted-foreground leading-snug">
                  From {r.source}
                </span>
              </>
            ) : (
              <Bars n={3} last="w-1/2" />
            )}
          </li>
        ))}
      </ul>
    </Section>
  );
}

/* ---------- 2 · the paper's shape: each section in order, open ---------- */
function Moves({ moves }: { moves: string[] }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-1 gap-y-1.5">
      {moves.map((m, i) => (
        <li key={m} className="inline-flex items-center gap-1">
          {i > 0 && <Icon n="right" className="size-3 text-foreground/30" />}
          <span className="inline-flex items-center gap-1.5 rounded-md bg-muted py-0.5 pr-2 pl-1 text-[12.5px] leading-5">
            <span className="grid size-4 place-items-center rounded bg-background font-medium font-mono text-[10px] text-muted-foreground">
              {i + 1}
            </span>
            {cap(moveName(m))}
          </span>
        </li>
      ))}
    </ol>
  );
}

function SectionCard({ s, index, end, ticks }: { s: FrameSection; index: number; end: number; ticks: number[] }) {
  const a = useAccent();
  const [all, setAll] = useState(false);
  const parts = [...new Set(s.slots.flatMap((x) => x.takes))];
  const sources = [...new Set(s.slots.flatMap((x) => x.source.split("; ")))];
  const listed = all ? sources : sources.slice(0, SOURCES_SHOWN);
  return (
    <M
      as="li"
      in="fade"
      data-frame-sec={s.section_id}
      className="flex min-w-0 scroll-mt-4 flex-col gap-3 rounded-lg px-4 py-3.5 ring-1 ring-foreground/10 ring-inset"
    >
      <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <span
          className={cn("grid size-6 shrink-0 place-items-center rounded-md font-mono font-semibold text-xs", a.chip)}
        >
          {pad(index + 1)}
        </span>
        <b className="font-semibold text-[15px]">{s.heading}</b>
        <span className="text-[12.5px] text-muted-foreground">{s.required ? "Required" : "Optional"}</span>
        <span className="ml-auto text-[12.5px] text-muted-foreground tabular-nums">
          {fmt(s.words[0])}–{fmt(s.words[1])} words
        </span>
      </span>
      <WordRange
        words={s.words}
        optional={!s.required}
        end={end}
        ticks={ticks}
        drawn
        label={`${s.heading} word budget`}
      />
      <p className="text-pretty text-[13.5px] leading-snug">{s.guidance}</p>
      <dl className="grid grid-cols-[4.75rem_minmax(0,1fr)] items-start gap-x-3 gap-y-2 text-[13px]">
        <dt className="pt-0.5 text-[12.5px] text-muted-foreground">Moves</dt>
        <dd className="min-w-0">
          <Moves moves={s.moves} />
        </dd>
        <dt className="text-[12.5px] text-muted-foreground">Tense</dt>
        <dd className="text-pretty leading-snug">{s.tense}</dd>
        {parts.length > 0 && (
          <>
            <dt className="pt-0.5 text-[12.5px] text-muted-foreground">Carries</dt>
            <dd className="flex flex-wrap gap-1.5">
              {parts.map((p) => (
                <Badge key={p} variant="outline" className="font-normal">
                  {p.replace(/_/g, " ")}
                </Badge>
              ))}
            </dd>
          </>
        )}
      </dl>
      {sources.length > 0 && (
        <div className="mt-auto flex flex-col gap-1.5 border-foreground/10 border-t pt-2">
          <span className="text-[12px] text-muted-foreground">Grounded in {plural(sources.length, "source")}</span>
          <ul className="flex flex-col gap-0.5 text-pretty text-[12px] text-muted-foreground leading-snug">
            {listed.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <TailToggle
            open={all}
            onToggle={() => setAll((v) => !v)}
            more={sources.length - SOURCES_SHOWN}
            noun="sources"
          />
        </div>
      )}
    </M>
  );
}

function ShapeSection({ f, now }: { f?: WritingFrameFile; now: (k: string) => string | null }) {
  const secs = f?.sections ?? [];
  const on = f ? count(FL.secs, secs.length) : 0;
  const { end, ticks } = wordScale(Math.max(1, ...secs.map((s) => s.words[1] ?? 0)));
  return (
    <Section
      icon="layers"
      title="The paper's shape"
      tells="Each section in reading order: how long it is, what it does, the moves it makes in turn and its tense."
      now={now("f2")}
      aside={f ? `${plural(secs.length, "section")}, ${secs.filter((s) => s.required).length} required` : undefined}
      data-frame-secs
    >
      <ol className="grid gap-2.5 px-4 py-4 sm:px-5 xl:grid-cols-2">
        {(f ? secs : Array.from({ length: SECTIONS_AHEAD }, () => null)).map((s, i) =>
          s && i < on ? (
            <SectionCard key={s.section_id} s={s} index={i} end={end} ticks={ticks} />
          ) : (
            <li
              // biome-ignore lint/suspicious/noArrayIndexKey: a placeholder card
              key={i}
              aria-hidden="true"
              className="flex flex-col gap-3 rounded-lg px-4 py-3.5 ring-1 ring-foreground/10 ring-inset"
            >
              <Bars n={1} last="w-1/3" />
              <Bars n={3} last="w-2/3" />
            </li>
          ),
        )}
      </ol>
    </Section>
  );
}

/* ---------- 3 · how every sentence reads, and where each part of an argument is written ---------- */
function StyleSection({ f, now }: { f?: WritingFrameFile; now: (k: string) => string | null }) {
  const a = useAccent();
  const rules = f?.style.sentence_rules ?? Array.from({ length: 8 }, () => "");
  const parts = f ? Object.entries(f.style.argument_map) : [];
  const on = f ? count(FL.sent, rules.length) : 0;
  const partsOn = f ? count(FL.tmap, parts.length) : 0;
  return (
    <Section
      icon="pen"
      title="How every sentence reads"
      tells="The rules every writer of the paper follows, whoever writes the sentence, and where each part of an argument goes."
      now={now("f3")}
      aside={f ? plural(rules.length, "rule") : undefined}
      data-frame-style
    >
      <ol className="grid gap-x-8 gap-y-2.5 px-4 py-4 sm:px-5 md:grid-cols-2">
        {rules.map((text, i) => (
          <li
            // biome-ignore lint/suspicious/noArrayIndexKey: a rule keeps its place from skeleton to text
            key={i}
            className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-2 text-[13.5px] leading-snug"
          >
            <span
              className={cn(
                "grid size-5 place-items-center rounded-md font-mono text-[11px] tabular-nums",
                f && i < on ? a.chip : "bg-muted text-muted-foreground/60",
              )}
            >
              {i + 1}
            </span>
            {f && i < on ? (
              <span className="text-pretty">
                <Typed text={text} on={streaming(FL.sent, String(i))} />
              </span>
            ) : (
              <Bars n={1} last="w-4/5" />
            )}
          </li>
        ))}
      </ol>
      {(parts.length > 0 || !f) && (
        <div className="flex flex-col gap-3 border-t px-4 py-4 sm:px-5">
          <SubHead
            title="Where each part of an argument is written"
            tells={
              <>
                Each part of a <Term t="toulmin">Toulmin</Term> argument, and the place in the paper that carries it.
              </>
            }
          />
          <dl className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-5">
            {(f ? parts : Array.from({ length: 5 }, (_, i) => [String(i), ""] as [string, string])).map(
              ([part, line], i) => (
                <div
                  key={part}
                  className="flex min-w-0 flex-col gap-1 rounded-lg bg-muted/40 px-3.5 py-3 ring-1 ring-foreground/5"
                >
                  {f && i < partsOn ? (
                    <>
                      <dt className="font-semibold text-[13.5px]">
                        <Term t={part}>{cap(part)}</Term>
                      </dt>
                      <dd className="text-pretty text-[13px] text-muted-foreground leading-snug">
                        <Typed text={cap(line)} on={streaming(FL.tmap, part)} />
                      </dd>
                    </>
                  ) : (
                    <Bars n={2} last="w-2/3" />
                  )}
                </div>
              ),
            )}
          </dl>
        </div>
      )}
    </Section>
  );
}

/* ---------- 4 · what you may change: each choice, its options with the frame's pick marked, and why ---------- */
function ChoicesSection({ f, now }: { f?: WritingFrameFile; now: (k: string) => string | null }) {
  const a = useAccent();
  const choices = f?.choices ?? [];
  const on = f ? count(FL.choices, choices.length) : 0;
  return (
    <Section
      icon="target"
      title="What you may change"
      tells="The only part of the frame you decide: at checkpoint F, or again at the join (J). The marked option is the frame's pick."
      now={now("f4")}
      aside={f ? plural(choices.length, "choice") : undefined}
      data-frame-choices
    >
      <ul className="flex flex-col">
        {(f ? choices : Array.from({ length: 4 }, () => null)).map((c, i) => (
          <li
            // biome-ignore lint/suspicious/noArrayIndexKey: a choice keeps its place from skeleton to text
            key={i}
            className="grid gap-x-6 gap-y-2.5 border-t px-4 py-4 first:border-t-0 sm:px-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]"
          >
            {c && i < on ? (
              <>
                <span className="flex min-w-0 flex-col gap-1">
                  <b className="font-semibold text-[14.5px]">{c.label}</b>
                  <span className="text-pretty text-[13px] text-muted-foreground leading-snug">
                    <Typed text={c.why} on={streaming(FL.choices, c.key)} />
                  </span>
                  <span className="text-pretty text-[12px] text-muted-foreground leading-snug">From {c.source}</span>
                </span>
                <ul aria-label={`${c.label}: the options`} className="flex min-w-0 flex-col gap-1.5">
                  {c.values.map((v) => {
                    const picked = v === c.value;
                    return (
                      <li
                        key={v}
                        className={cn(
                          "flex items-start gap-2.5 rounded-lg px-3 py-2 text-[13px] ring-1 ring-inset",
                          picked ? cn(a.soft, "ring-foreground/15") : "ring-foreground/10",
                        )}
                      >
                        <Icon
                          n={picked ? "circleCheck" : "minus"}
                          className={cn("mt-0.5 size-4 shrink-0", picked ? a.text : "text-muted-foreground/50")}
                        />
                        <span className="flex min-w-0 flex-col">
                          <span className={cn("leading-snug", picked ? "font-medium" : "text-muted-foreground")}>
                            {choiceText(c, v)}
                          </span>
                          <span className="text-[11.5px] text-muted-foreground">
                            {picked ? "The frame's pick" : "You may pick it"} ·{" "}
                            <span className="font-mono">{VALUE_TEXT[v] ?? v}</span>
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : (
              <>
                <Bars n={2} last="w-3/4" />
                <Bars n={2} last="w-1/2" />
              </>
            )}
          </li>
        ))}
      </ul>
    </Section>
  );
}

/** What the stage is doing in a part right now, while it plays. */
function frameNow(k: string, f?: WritingFrameFile) {
  const st = S.st[FRAME_SID];
  if (st?.status !== "running" || st.cur !== k || !f) return null;
  const last = (list: string) => Math.max(0, (S.n[list] ?? 0) - 1);
  if (k === "f1") {
    const r = journalRules(f)[last(FL.rules)];
    return r ? `Reading the profile · ${r.item}: ${r.value}` : "Reading the journal profile";
  }
  if (k === "f2") {
    const s = f.sections[last(FL.secs)];
    return s ? `Laying out ${s.heading} · ${fmt(s.words[0])}–${fmt(s.words[1])} words` : "Laying out the sections";
  }
  if (k === "f3") return "Setting the sentence rules and where each part of an argument goes";
  const c = f.choices[last(FL.choices)];
  return c ? `Offering a choice · ${c.label}` : "Offering the choices";
}

/** The writing frame of a live run: what the stage did, what it means for the paper, then each part in full. */
export function FrameBody() {
  const f = file("WritingFrame.json");
  const now = (k: string) => frameNow(k, f);
  return (
    <StageAccent accent="sky">
      <div className="flex min-w-0 flex-col gap-5">
        {!f && <WorkingHere sid={FRAME_SID} />}
        <FrameOverview f={f} />
        <FramePaper f={f} />
        <AsksSection f={f} now={now} />
        <ShapeSection f={f} now={now} />
        <StyleSection f={f} now={now} />
        <ChoicesSection f={f} now={now} />
      </div>
    </StageAccent>
  );
}

/* ---------- at checkpoint F or J: change the frame's choices ---------- */
/** The frame's choices as controls: each change is sent with your answer, and the run scores the frame again. */
export function FrameChoices({
  edits,
  onChange,
}: {
  edits: Partial<Record<FrameChoiceKey, string>>;
  onChange(next: Partial<Record<FrameChoiceKey, string>>): void;
}) {
  const choices = file("WritingFrame.json")?.choices ?? [];
  if (!choices.length) return null;
  return (
    <fieldset className="flex flex-col gap-2.5">
      <legend className="mb-1.5 flex w-full items-baseline justify-between gap-2 text-xs">
        <span className="font-medium">The frame's choices</span>
        <span className="text-muted-foreground">
          {Object.keys(edits).length ? `${plural(Object.keys(edits).length, "change")} to send` : "As built"}
        </span>
      </legend>
      {choices.map((c) => {
        const value = edits[c.key] ?? c.value;
        return (
          <div key={c.key} className="flex flex-col gap-1.5 rounded-xl border px-3.5 py-2.5">
            <span className="font-medium text-sm">{c.label}</span>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              spacing={0}
              value={value}
              onValueChange={(v) => {
                if (!v) return;
                const next = { ...edits };
                if (v === c.value) delete next[c.key];
                else next[c.key] = v;
                onChange(next);
              }}
              aria-label={c.label}
              className="flex-wrap"
            >
              {c.values.map((v) => (
                <ToggleGroupItem key={v} value={v} className="px-3">
                  {VALUE_TEXT[v] ?? cap(v)}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <span className="text-pretty text-muted-foreground text-xs leading-snug">{c.why}</span>
          </div>
        );
      })}
    </fieldset>
  );
}

/* ---------- S08 · the join: the frame meets the locked argument ---------- */
const JOIN_CHECKS: { rule: JoinRule; title: string; what: string }[] = [
  {
    rule: "every-statement-has-a-section",
    title: "Claim → section",
    what: "Every statement has a section.",
  },
  {
    rule: "every-move-has-content",
    title: "Move → content",
    what: "Every required move has content.",
  },
  {
    rule: "comparison-has-sources",
    title: "Comparison → literature",
    what: "Comparisons have sources.",
  },
];
const FIX_AT: Record<JoinFinding["fix_at"], string> = {
  frame: "the writing frame",
  argument: "the argument",
  hypothesis: "the hypothesis stage (its literature)",
};
/** A finding's mark: passed, a hard rule that failed, or a point to look at. */
const MARK = {
  pass: { n: "circleCheck", c: "text-emerald-600 dark:text-emerald-400" },
  H: { n: "ban", c: "text-rose-600 dark:text-rose-400" },
  M: { n: "alert", c: "text-amber-600 dark:text-amber-400" },
};
function FindingRow({ f, typing }: { f: JoinFinding; typing: boolean }) {
  const mark = MARK[f.passed ? "pass" : f.kind];
  return (
    <li className="grid grid-cols-[1rem_minmax(0,1fr)] gap-2.5 text-[13px] leading-snug">
      <Icon n={mark.n} className={cn("mt-0.5 size-3.5", mark.c)} />
      <span className="min-w-0">
        <span className="text-pretty">
          <Typed text={cap(f.note)} on={typing} />
        </span>
        {!f.passed && (
          <span className="block text-[12px] text-muted-foreground">
            {f.kind === "H" ? "Hard rule" : "To look at"} · fixed in {FIX_AT[f.fix_at]}
          </span>
        )}
      </span>
    </li>
  );
}
/** A check's mark from its findings: a hard rule failed, a point to look at, or all passed. */
function checkMark(found: JoinFinding[]) {
  if (found.some((x) => !x.passed && x.kind === "H")) return MARK.H;
  if (found.some((x) => !x.passed)) return MARK.M;
  return MARK.pass;
}
/** A check's tone in the one colour meaning. */
function checkTone(found: JoinFinding[]): Tone {
  if (found.some((x) => !x.passed && x.kind === "H")) return "bad";
  if (found.some((x) => !x.passed)) return "look";
  return "ok";
}

/** At checkpoint J: the three checks in one line each, above the choices. */
export function JoinSummary() {
  const r = file("JoinReport.json");
  if (!r) return null;
  return (
    <ul className="flex flex-col gap-1.5 rounded-xl border px-3.5 py-2.5">
      {JOIN_CHECKS.map((c) => {
        const found = r.findings.filter((x) => x.rule === c.rule);
        const mark = checkMark(found);
        return (
          <li key={c.rule} className="flex items-center gap-2.5 text-sm">
            <Icon n={mark.n} className={cn("size-4 shrink-0", mark.c)} />
            <span className="font-medium">{c.title}</span>
            <span className="text-muted-foreground text-xs">{c.what}</span>
            <span className="ml-auto text-muted-foreground text-xs tabular-nums">
              {found.filter((x) => x.passed).length} of {found.length}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** The join's check, three ways, as the run scored it at checkpoint J: each check with its findings, open. */
export function JoinPanel() {
  const r = file("JoinReport.json");
  // A run made before the join has no check: once its stage is done there is nothing to wait for.
  if (!r && S.st.S08?.status === "done") return null;
  const on = r ? shown("S08", FL.join, r.findings.length) : 0;
  const seen = new Set((r?.findings ?? []).slice(0, on));
  const st = S.st.S08;
  const last = r?.findings[Math.max(0, on - 1)];
  const now =
    st?.status === "running" && st.cur === "c0" && last && on > 0
      ? `Checking ${JOIN_CHECKS.find((c) => c.rule === last.rule)?.title ?? last.rule} · ${last.locator || "the whole paper"}`
      : null;
  return (
    <Section
      icon="compare"
      title="Do the frame and the argument fit?"
      tells="Three code checks of the writing frame against the locked argument. A failed one names where to fix it."
      now={now}
      aside={
        r && on >= r.findings.length ? (
          <span className="inline-flex flex-wrap items-center gap-x-2">
            <span>{r.coverage.passed} pass</span>
            {r.coverage.failed_hard > 0 && <Badge variant="destructive">{r.coverage.failed_hard} hard</Badge>}
            {r.coverage.to_look_at > 0 && <span>{r.coverage.to_look_at} to look at</span>}
          </span>
        ) : undefined
      }
      data-join
    >
      <div className="grid gap-2.5 px-4 py-4 sm:px-5 md:grid-cols-3">
        {JOIN_CHECKS.map((c) => {
          const found = (r?.findings ?? []).filter((x) => x.rule === c.rule);
          const visible = found.filter((x) => seen.has(x));
          const whole = Boolean(r) && visible.length === found.length;
          const passed = found.filter((x) => x.passed).length;
          const tone = checkTone(found);
          return (
            <div
              key={c.rule}
              className="flex min-w-0 flex-col gap-2.5 rounded-lg bg-muted/30 px-3.5 py-3 ring-1 ring-foreground/5"
            >
              <span className="flex items-center gap-2">
                {whole ? (
                  <Icon n={checkMark(found).n} className={cn("size-4 shrink-0", checkMark(found).c)} />
                ) : (
                  <span className="size-4 shrink-0 rounded-full bg-muted" />
                )}
                <span className="font-semibold text-[14px]">{c.title}</span>
                {whole && (
                  <span className="ml-auto text-[12.5px] text-muted-foreground tabular-nums">
                    {passed} of {found.length}
                  </span>
                )}
              </span>
              <p className="text-pretty text-[12.5px] text-muted-foreground leading-snug">{c.what}</p>
              {whole && found.length > 0 && (
                <Meter value={passed} max={found.length} tone={tone} label={`${c.title}: passed`} />
              )}
              {visible.length ? (
                <ul className="flex flex-col gap-1.5">
                  {visible.map((x) => (
                    <FindingRow key={`${x.rule}:${x.locator}`} f={x} typing={streaming(FL.join, x.locator || x.rule)} />
                  ))}
                </ul>
              ) : (
                <Bars n={2} last="w-3/5" />
              )}
            </div>
          );
        })}
      </div>
    </Section>
  );
}

/** One line on the frame, for the stage's summary and the narration. */
export function frameLine(f: WritingFrameFile) {
  const structure = f.choices.find((c) => c.key === "structure");
  return `${f.profile.generic ? "The generic profile" : f.profile.name}: ${plural(f.sections.length, "section")}${
    structure ? `, told as ${structure.value}` : ""
  }.`;
}
