"use client";
"use no memo";

/* ===== One paragraph of a section, taken apart: what it is for, what it must carry, each sentence as written, and
   how it scores =====
   The card stands from the moment the section's stage opens, from the paragraph's plan (the outline's tree): its job,
   its move and shape, its point, the term it is about and the one it opens on, how strongly it may claim, what it
   must report, and each planned sentence with what it is to carry. As the writer writes, the sentences stream in, typed
   out, each value, exhibit and source landing whole where the writer placed its mark; at the check, the rules each
   sentence broke attach under it, and the card's foot says how the writing kept the plan and how both scored. */

import type { ReactNode } from "react";

import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

import { Caret } from "../../run-bits";
import { useTyping } from "../../scenes/scene-ui";
import { S, TYPE_CPS } from "../engine";
import { cn, Icon, M } from "../lib";
import { StatusBadge } from "../scenes-gather";
import {
  D,
  optionsOf,
  type Piece,
  paragraphsOf,
  pieces,
  readPieces,
  scorecardOfSection,
  stageOfSection,
  takenOf,
} from "./draft-data";
import { Mark } from "./draft-marks";
import { shown } from "./kit";
import { cap, exhibitNumbers, moveName, paraNumber, plural, RULE_TEXT, scorecardOf, wordsOf } from "./outline-data";
import { Bars, CARD } from "./outline-kit";
import { Cite, Exhibit, fnName, IdChip, isValue, SHAPE, Value } from "./outline-paper";
import { file, LIVE } from "./run";
import type { Scorecard, TreeParagraph, WrittenParagraph, WrittenSentence } from "./types";

/* ---------- the typing of a sentence ---------- */
/** How much a mark weighs in the typing: a value or a source lands whole, about as long as a short word takes. */
const MARK_WEIGHT = 6;
const weightOf = (p: Piece) => (p.k === "text" ? p.text.length : MARK_WEIGHT);
/** The characters a sentence takes to type out, its marks by their weight. */
export const typedLength = (text: string) => readPieces(text).reduce((n, p) => n + weightOf(p), 0);

/**
 * A sentence typed out while `live`: its words character by character, each mark landing whole. The whole sentence
 * holds its place underneath, so the paragraph never reflows as it types.
 */
function TypedSentence({ text, live }: { text: string; live: boolean }) {
  const parts = readPieces(text);
  const total = parts.reduce((n, p) => n + weightOf(p), 0);
  const n = useTyping(text, total, live, TYPE_CPS * S.speed);
  const nums = exhibitNumbers();
  const whole = parts.map((p, i) => (
    // biome-ignore lint/suspicious/noArrayIndexKey: a sentence's pieces never reorder
    <Mark key={i} p={p} nums={nums} />
  ));
  if (!live || n >= total) return <>{whole}</>;
  let left = n;
  const typed: ReactNode[] = [];
  for (const [i, p] of parts.entries()) {
    if (left <= 0) break;
    if (p.k === "text") {
      typed.push(<span key={i}>{p.text.slice(0, left)}</span>);
      left -= p.text.length;
    } else if (left >= MARK_WEIGHT) {
      typed.push(
        <M as="span" key={i} in="fade" dur={260}>
          <Mark p={p} nums={nums} />
        </M>,
      );
      left -= MARK_WEIGHT;
    } else break;
  }
  return (
    <span className="grid">
      <span aria-hidden="true" className="invisible col-start-1 row-start-1">
        {whole}
      </span>
      <span className="col-start-1 row-start-1">
        {typed}
        <Caret className="text-sky-600" />
      </span>
    </span>
  );
}

/* ---------- the checks ---------- */
/** The failing rows of a scorecard that name this paragraph or one of its sentences. */
function hitsOf(card: Scorecard | undefined, pid: string) {
  return (card?.rows ?? []).filter((r) => !r.passed && (r.locator === pid || r.locator.startsWith(`${pid}.`)));
}
const ruleName = (rule: string) => RULE_TEXT[rule] ?? cap(rule.replace(/[-_]+/g, " "));
/** The sentence a locator names ("results-2.s1" is the first), or null for the paragraph as a whole. */
const sentenceOf = (locator: string) => {
  const m = /\.s(\d+)$/.exec(locator);
  return m ? Number(m[1]) - 1 : null;
};
function Hit({ rule, note, kind }: { rule: string; note: string; kind: string }) {
  return (
    <M
      in="fade"
      className={cn(
        "grid grid-cols-[14px_minmax(0,1fr)] gap-1.5 rounded-md px-2 py-1.5 font-sans text-xs leading-snug",
        kind === "H" ? "bg-rose-500/8" : "bg-amber-500/8",
      )}
    >
      <Icon
        n={kind === "H" ? "ban" : "alert"}
        className={cn("mt-0.5 size-3.5", kind === "H" ? "text-rose-600" : "text-amber-600")}
      />
      <span>
        <span className="font-medium">{ruleName(rule)}</span>
        {note && <span className="text-muted-foreground"> — {note}</span>}
      </span>
    </M>
  );
}
/** A paragraph's state, in its badge's kind and words: planned, being written, written, then as it scores. */
function paragraphState(x: {
  writing: boolean;
  written: boolean;
  done: boolean;
  scored: boolean;
  after: { kind: string }[];
}): [string, string] {
  if (!x.written) return x.writing ? ["now", "Writing"] : ["na", "Planned"];
  if (!x.done) return ["now", "Writing"];
  if (!x.scored) return ["info", "Written"];
  if (x.after.some((h) => h.kind === "H")) return ["bad", "Breaks a hard rule"];
  if (x.after.length) return ["warn", `${x.after.length} to look at`];
  return ["ok", "Passes"];
}

/* ---------- what the plan gives the paragraph ---------- */
/** A statement's chip, its words on hover: what the sentence carries, without the words said twice on the card. */
function Statement({ id, point = false }: { id: string; point?: boolean }) {
  const words = wordsOf(id);
  if (!words) return <IdChip id={id} point={point} />;
  return (
    <HoverCard openDelay={150} closeDelay={80}>
      <HoverCardTrigger asChild>
        <button type="button" className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <IdChip id={id} point={point} />
        </button>
      </HoverCardTrigger>
      <HoverCardContent align="start" className="w-80 text-[13px] leading-snug">
        <span className="mb-1 block font-medium text-muted-foreground text-xs">
          {point ? `${id} · the paragraph's point` : id}
        </span>
        {words}
      </HoverCardContent>
    </HoverCard>
  );
}
/** What a planned sentence is to carry: its statements, values, exhibits and sources. */
function Carries({
  keys,
  statements,
  cites,
  point,
}: {
  keys: string[];
  statements: string[];
  cites: string[];
  point: string | null;
}) {
  const nums = exhibitNumbers();
  if (!keys.length && !statements.length && !cites.length) return null;
  return (
    <span className="flex flex-wrap items-center gap-1.5 font-sans">
      {statements.map((id) => (
        <Statement key={id} id={id} point={id === point} />
      ))}
      {keys.filter(isValue).map((k) => (
        <Value key={k} k={k} again />
      ))}
      {keys
        .filter((k) => !isValue(k))
        .map((k) => (
          <Exhibit key={k} k={k} n={nums[k]} />
        ))}
      {cites.map((k) => (
        <Cite key={k} k={k} />
      ))}
    </span>
  );
}
/** The wording each claim of the paragraph may take, as the frozen graph sets it. */
const strengthOf = (id: string) => file("FrozenGraph_v1.json")?.strength?.[id];
function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="flex min-w-0 items-baseline gap-1.5">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0">{children}</span>
    </span>
  );
}
function Score({
  label,
  hits,
  scored,
  empty,
}: {
  label: string;
  hits: { kind: string }[];
  scored: boolean;
  empty: string;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="text-muted-foreground">{label}</span>
      {!scored ? (
        <StatusBadge k="na">{empty}</StatusBadge>
      ) : hits.length ? (
        <StatusBadge k={hits.some((h) => h.kind === "H") ? "bad" : "warn"}>{hits.length} to look at</StatusBadge>
      ) : (
        <StatusBadge k="ok">Passes</StatusBadge>
      )}
    </span>
  );
}

const ROW =
  "grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-4 rounded-md border-foreground/[0.07] border-t px-1 py-3 transition-colors duration-500 first:border-t-0 max-sm:grid-cols-1 max-sm:gap-y-1.5";
const LABEL = "flex flex-col pt-1 text-[12px] text-muted-foreground";

/**
 * One paragraph's card. `first`: the index of its first sentence among the section's written sentences; `on`: how
 * many of those are on screen (the writer streams them); `reading`: the writing shown, when one is picked.
 */
export function ParagraphCard({
  sec,
  p,
  first,
  on,
  reading,
  shown: given,
}: {
  sec: string;
  p: TreeParagraph;
  first: number;
  on: number;
  reading?: string;
  /** The paragraph as the page has it, when it is not the run's own writing (you changed it). */
  shown?: WrittenParagraph;
}) {
  const sid = stageOfSection(sec);
  const n = paraNumber(p.paragraph_id) ?? "";
  const written = given ?? paragraphsOf(sec, reading).find((x) => x.paragraph_id === p.paragraph_id);
  const sentences: WrittenSentence[] = written?.sentences ?? [];
  const visible = Math.max(0, Math.min(sentences.length, on - first));
  const writing = LIVE.calls.some((c) => c.stage === sid && !c.done && /as planned|with your note/.test(c.label));
  const live = !reading && !S.fast && S.st[sid]?.status !== "done";
  const done = visible >= sentences.length && sentences.length > 0;
  const active = live && visible > 0 && !done;
  const scored = shown(sid, D.check(sec), 1) > 0;
  const opts = optionsOf(sec);
  const which = reading ?? takenOf(sec).option ?? opts?.recommended ?? "built";
  const card =
    [...(opts?.options ?? []), ...(opts?.withheld ?? [])].find((o) => o.option_id === which)?.scorecard ??
    scorecardOfSection(sec);
  const after = scored ? hitsOf(card, p.paragraph_id) : [];
  const before = [...hitsOf(scorecardOf("P4"), p.paragraph_id), ...hitsOf(scorecardOf("P5"), p.paragraph_id)];
  const [shape, why] = SHAPE[p.shape] ?? [p.shape, ""];
  const claims = [...new Set(p.sentences.flatMap((x) => x.statements))].filter((id) => strengthOf(id));
  // What the plan gave the paragraph that no written sentence carries: values and exhibits by key, sources as @key.
  const carried = new Set(
    sentences.flatMap((x) =>
      pieces(x.text).flatMap((m) => {
        if (m.k === "value" || m.k === "exhibit") return [m.key];
        return m.k === "cite" ? m.keys.map((k) => `@${k}`) : [];
      }),
    ),
  );
  const missing = [...new Set(p.sentences.flatMap((x) => [...x.keys, ...x.cites.map((k) => `@${k}`)]))].filter(
    (k) => !carried.has(k),
  );
  const [kind, label] = paragraphState({ writing, written: sentences.length > 0, done, scored, after });
  const meta = [
    p.moves.length ? cap(p.moves.map(moveName).join(", ")) : null,
    shape ? `${cap(shape)}${why ? `: ${why.toLowerCase()}` : ""}` : null,
    p.argument_role ? `${cap(p.argument_role.replace(/_/g, " "))} in the argument` : null,
  ].filter((x): x is string => Boolean(x));
  return (
    <M
      as="section"
      in="up6"
      data-wpara={p.paragraph_id}
      data-cursor={`wpara:${p.paragraph_id}`}
      className={cn(
        CARD,
        "scroll-mt-24 transition-[box-shadow] duration-500",
        (active || (writing && !sentences.length)) && "ring-sky-500/40",
      )}
    >
      <header className="flex items-start gap-3 px-5 pt-4 pb-3">
        <span className="mt-0.5 inline-flex h-6 min-w-9 items-center justify-center rounded-md bg-muted px-1.5 font-mono font-semibold text-[12px] tabular-nums">
          {n}
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="text-pretty font-semibold text-[14.5px] leading-snug">{p.job}</h4>
          {/* One line of text, so a wrap never strands the separator at the start of a line. */}
          <p className="mt-1 text-pretty text-muted-foreground text-xs">{meta.join("\u00a0· ")}</p>
        </div>
        <StatusBadge k={kind}>{label}</StatusBadge>
      </header>
      {/* The plan in one band: what the paragraph says, about what, how strongly, what it must report. */}
      <div className="mx-5 mb-1 flex flex-wrap gap-x-5 gap-y-1.5 rounded-lg bg-muted/50 px-3 py-2 text-xs">
        {p.point && (
          <Fact label="Point">
            <Statement id={p.point} point />
          </Fact>
        )}
        {p.key_term && (
          <Fact label="About">
            <b className="font-medium">{p.key_term}</b>
          </Fact>
        )}
        {p.link_in && (
          <Fact label="Opens on">
            <b className="font-medium">{p.link_in}</b>
          </Fact>
        )}
        {p.group_term && (
          <Fact label="Group">
            <b className="font-medium">{p.group_term}</b>
          </Fact>
        )}
        {claims.map((id) => (
          <Fact key={id} label={`${id} at most`}>
            <b className="font-medium">“{strengthOf(id)}”</b>
          </Fact>
        ))}
        {(p.obligations?.length ?? 0) > 0 && (
          <Fact label="Must report">{p.obligations?.map((o) => o.replace(/-/g, " ")).join(" · ")}</Fact>
        )}
      </div>
      <ol className="flex flex-col px-5 py-2">
        {/* Before it is written, the paragraph's plan sentence by sentence; once written, each sentence as the writer
            wrote it (a writer may spread the plan's values over its sentences: the marks show where each one went). */}
        {!sentences.length
          ? p.sentences.map((plan) => (
              <li key={plan.uid} className={ROW}>
                <span className={LABEL}>{fnName(plan.function)}</span>
                <span className="flex min-w-0 flex-col gap-2">
                  <Bars n={2} last="w-3/5" className={cn(writing && "[&>*]:animate-pulse")} />
                  <Carries keys={plan.keys} statements={plan.statements} cites={plan.cites} point={p.point} />
                </span>
              </li>
            ))
          : sentences.map((x, i) => {
              const own = scored ? after.filter((h) => sentenceOf(h.locator) === i) : [];
              const typing = live && i === visible - 1;
              return (
                <li
                  // biome-ignore lint/suspicious/noArrayIndexKey: a paragraph's sentences keep their order
                  key={i}
                  className={cn(ROW, typing && "bg-sky-500/[0.035]")}
                >
                  <span className={LABEL}>
                    {fnName(x.role)}
                    {x.statements.length > 0 && i < visible && (
                      <span className="mt-1.5 flex flex-wrap gap-1">
                        {x.statements.map((id) => (
                          <Statement key={id} id={id} point={id === p.point} />
                        ))}
                      </span>
                    )}
                  </span>
                  <span className="flex min-w-0 flex-col gap-2">
                    {i < visible ? (
                      <span className="max-w-[68ch] text-pretty font-serif text-[15.5px] leading-[1.7]">
                        <TypedSentence text={x.text} live={typing} />
                      </span>
                    ) : (
                      <Bars n={2} last="w-3/5" className="[&>*]:animate-pulse" />
                    )}
                    {own.map((h) => (
                      <Hit key={`${h.rule}:${h.locator}:${h.note}`} rule={h.rule} note={h.note} kind={h.kind} />
                    ))}
                  </span>
                </li>
              );
            })}
      </ol>
      {/* The foot: how the writing kept the plan, and the paragraph's two scores. */}
      <footer className="flex flex-col gap-2 border-t bg-muted/25 px-5 py-3 text-xs">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-muted-foreground">
            {plural(p.sentences.length, "sentence")} planned
            {done ? `, ${plural(sentences.length, "sentence")} written` : ""}
          </span>
          {done && !missing.length && (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Icon n="check" className="size-3.5 text-emerald-600" />
              Every value, exhibit and source of the plan is in it
            </span>
          )}
          <span className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <Score label="Plan" hits={before} scored empty="" />
            <Score
              label="Writing"
              hits={after}
              scored={scored}
              empty={sentences.length ? "At the check" : "Not written"}
            />
          </span>
        </div>
        {done && missing.length > 0 && (
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="text-muted-foreground">Planned, not printed here (said elsewhere or named in words):</span>
            <Carries
              keys={missing.filter((k) => !k.startsWith("@"))}
              statements={[]}
              cites={missing.filter((k) => k.startsWith("@")).map((k) => k.slice(1))}
              point={null}
            />
          </span>
        )}
        {[...before, ...(scored ? after.filter((h) => sentenceOf(h.locator) === null) : [])].map((h) => (
          <Hit key={`p:${h.rule}:${h.locator}:${h.note}`} rule={h.rule} note={h.note} kind={h.kind} />
        ))}
        {p.needs.length > 0 && (
          <span className="flex items-start gap-1.5 text-amber-800 dark:text-amber-300">
            <Icon n="alert" className="mt-0.5 size-3.5" />
            The authors complete: {p.needs.join(", ")}
          </span>
        )}
      </footer>
    </M>
  );
}
