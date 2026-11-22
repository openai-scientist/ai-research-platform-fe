"use client";
"use no memo";

/* ===== S11–S17 · the first draft, live: the paper written section by section =====
   The page is the paper in its order (the order the outline lays out), each section as its stage leaves it: planned
   (its paragraphs' jobs, in skeleton), being written (the first writing streams in sentence by sentence), being chosen
   (the writings side by side, one to read on the page), kept. Data and Methods are written by code when the draft is
   assembled. Every value on the page is printed from the evidence ledger (hover it for its row), every exhibit and
   source is named by the mark the writer placed. Beside the page, for the section in focus (the one being written,
   or the one you pick): the brief its writers got, its writings compared, the rules its check found, and the ledger
   values it prints. */

import { Fragment, type ReactNode, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { S } from "../engine";
import { AgentCursor, cn, Icon, M } from "../lib";
import { StatusBadge } from "../scenes-gather";
import {
  D,
  FRONT,
  keptOf,
  optionsOf,
  outlineSections,
  paragraphsOf,
  readPieces,
  type SectionState,
  scorecardOfSection,
  sectionState,
  sentenceCount,
  stageOfSection,
  takenOf,
  versionsOf,
  wordCount,
  wordingAnswer,
  writingName,
} from "./draft-data";
import { ExhibitBlock, firstNamed, placements } from "./draft-exhibit";
import { Mark } from "./draft-marks";
import { ParagraphCard } from "./draft-paragraph";
import { shown, WorkingHere } from "./kit";
import { cap, exhibitNumbers, heading, moveName, paraNumber, plural, RULE_TEXT, ruleGroups } from "./outline-data";
import { Bars, COLUMNS, SERIF, SIDE, scrollSoon } from "./outline-kit";
import { file, LIVE, sectionFile } from "./run";
import type { CheckpointOption, Scorecard, WrittenParagraph } from "./types";

/* ---------- a sentence as the paper prints it ---------- */
function Sentence({ text, nums, fresh }: { text: string; nums: Record<string, string>; fresh: boolean }) {
  const body = readPieces(text).map((p, i) => (
    // biome-ignore lint/suspicious/noArrayIndexKey: a sentence's pieces never reorder
    <Mark key={i} p={p} nums={nums} />
  ));
  return fresh ? (
    <M as="span" in="fade" dur={420}>
      {body}{" "}
    </M>
  ) : (
    <span>{body} </span>
  );
}

/** A section's paragraphs as written, `on` sentences of them shown (the rest still streaming in). */
function Written({
  sec,
  paras,
  on,
  streaming,
  after,
}: {
  sec: string;
  paras: WrittenParagraph[];
  on: number;
  streaming: boolean;
  /** By paragraph, the tables and figures set after it: each once, after the paragraph that first names it. */
  after: Record<string, string[]>;
}) {
  const nums = exhibitNumbers();
  let k = 0;
  return (
    <>
      {paras.map((p, at) => {
        const first = k;
        k += p.sentences.length;
        if (first >= on) return null;
        const visible = p.sentences.slice(0, Math.max(0, on - first));
        const n = paraNumber(p.paragraph_id);
        const exhibits = after[p.paragraph_id] ?? [];
        return (
          <Fragment key={`${sec}:${p.paragraph_id}`}>
            <M
              as="p"
              in="up6"
              data-wpara={p.paragraph_id}
              data-cursor={`wpara:${p.paragraph_id}`}
              // Set as a journal sets it: the first paragraph under a heading flush, each one after it indented.
              className={cn("group relative mb-0 scroll-mt-24 text-pretty", at > 0 && "indent-[1.5em]")}
            >
              {n && (
                <span
                  aria-hidden="true"
                  className="absolute top-1 -left-9 hidden font-mono text-[11px] text-muted-foreground/70 tabular-nums sm:block"
                >
                  {n}
                </span>
              )}
              {visible.map((s, i) => (
                <Sentence
                  // biome-ignore lint/suspicious/noArrayIndexKey: a paragraph's sentences keep their order
                  key={i}
                  text={s.text}
                  nums={nums}
                  fresh={streaming && first + i === on - 1}
                />
              ))}
            </M>
            {exhibits.map((x) => (
              <ExhibitBlock key={x} k={x} n={nums[x]} />
            ))}
          </Fragment>
        );
      })}
    </>
  );
}

/* ---------- badges of a section's state ---------- */
const STATE_BADGE: Record<SectionState, [string, string]> = {
  planned: ["na", "Planned"],
  writing: ["now", "Writing"],
  choosing: ["warn", "Your choice"],
  kept: ["ok", "Written"],
  skipped: ["na", "Not in the outline"],
  code: ["info", "By code"],
};
/** A section's state as a badge; `compact` (in a table column) leaves out which writing was kept. */
function StateBadge({ sec, byCode = false, compact = false }: { sec: string; byCode?: boolean; compact?: boolean }) {
  const st: SectionState = byCode ? "code" : sectionState(sec);
  const [k, label] = STATE_BADGE[st];
  const { option } = takenOf(sec);
  return (
    <StatusBadge k={k}>
      {label}
      {!compact && st === "kept" && option && option !== "built" ? ` · option ${option}` : ""}
    </StatusBadge>
  );
}

/* ---------- the page ---------- */
function PlannedSection({
  sec,
  planned,
}: {
  sec: string;
  planned: { paragraph_id: string; job: string; sentences: unknown[] }[];
}) {
  const sid = stageOfSection(sec);
  const busy = LIVE.calls.some((c) => c.stage === sid && !c.done);
  return (
    <div className="flex flex-col gap-3 font-sans">
      <WorkingHere sid={sid} className="rounded-lg bg-muted/60 px-3 py-2" />
      {planned.map((p) => (
        <div key={p.paragraph_id} className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-2">
          <span className="pt-0.5 font-mono text-[11px] text-muted-foreground/70 tabular-nums">
            {paraNumber(p.paragraph_id) ?? ""}
          </span>
          <span className="min-w-0">
            <span className="block text-[12.5px] text-muted-foreground leading-snug">{p.job}</span>
            <Bars
              n={Math.min(4, Math.max(2, p.sentences.length))}
              last="w-3/5"
              className={cn("mt-1", busy && "[&>*]:animate-pulse")}
            />
          </span>
        </div>
      ))}
    </div>
  );
}

function FrontMatter({ picked }: { picked: string | null }) {
  const paper = file("paper.json");
  const drafts = file("FrontDraft.json")?.versions ?? [];
  const on = shown("S17", D.front, drafts.length);
  const { option } = takenOf(FRONT);
  const v =
    (picked ? drafts.find((x) => x.option_id === picked) : undefined) ??
    (option ? drafts.find((x) => x.option_id === option) : undefined) ??
    (on > 0 ? drafts[0] : undefined);
  const title = paper && !picked ? paper.title : v?.title;
  const abstract = paper && !picked ? paper.abstract : v?.abstract;
  const keywords = paper && !picked ? paper.keywords : v?.keywords;
  const c = file("JournalWritingContract.json");
  return (
    <header className="mb-2 border-b pb-5 font-sans" data-cursor="front">
      <p className="flex flex-wrap items-center justify-between gap-2 text-muted-foreground text-xs">
        <span>
          {c?.journal ?? "Research article"}
          {c ? ` · ${cap(c.article_type)}` : ""}
        </span>
        <span>First draft · not read back yet</span>
      </p>
      {title && (on > 0 || paper) ? (
        <M
          as="h2"
          in="fade"
          key={title}
          className={cn(SERIF, "mt-3 text-balance font-semibold text-[23px] leading-snug tracking-tight")}
        >
          {title}
        </M>
      ) : (
        <div className="mt-4 flex flex-col gap-2.5">
          <Bars n={2} last="w-1/2" />
          <span className="text-muted-foreground text-xs">
            The title and abstract are written last, from the finished sections.
          </span>
        </div>
      )}
      {abstract && (on > 0 || paper) && (
        <M in="fade" key={abstract} className="mt-4 rounded-lg bg-muted/50 px-4 py-3">
          <span className="font-medium text-muted-foreground text-xs">Abstract</span>
          <p className="mt-1 font-serif text-[14.5px] leading-[1.65]">
            {readPieces(abstract).map((p, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: pieces never reorder
              <Mark key={i} p={p} nums={exhibitNumbers()} />
            ))}
          </p>
          {keywords && keywords.length > 0 && (
            <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-muted-foreground">Keywords</span>
              {keywords.map((k) => (
                <Badge key={k} variant="outline" className="font-normal">
                  {k}
                </Badge>
              ))}
            </p>
          )}
        </M>
      )}
      {!title && <WorkingHere sid="S17" className="mt-4" />}
    </header>
  );
}

/** The paper page: every section in the paper's order with the title and abstract, or `only` one section of it. */
function PaperPage({
  picked,
  onSection,
  only,
}: {
  picked: Record<string, string>;
  onSection?(sec: string): void;
  only?: string;
}) {
  const paper = file("paper.json");
  const sections = outlineSections();
  const placed = new Set<string>();
  return (
    <article
      data-page
      className="relative min-w-0 rounded-xl bg-card px-5 pt-7 pb-8 font-serif text-[15.5px] text-card-foreground leading-[1.72] ring-1 ring-foreground/10 sm:px-12 sm:pt-9"
    >
      {!only && <FrontMatter picked={picked[FRONT] ?? null} />}
      {sections.map((s, i) => {
        if (only && s.id !== only) return null;
        const sid = stageOfSection(s.id);
        const byPaper = paper?.sections.find((x) => x.section_id === s.id);
        const view = picked[s.id];
        const paras = s.byCode ? (byPaper?.paragraphs ?? []) : paragraphsOf(s.id, view);
        const total = sentenceCount(paras);
        // A writing picked to read shows whole; the one streaming shows as far as it has come.
        const on = s.byCode || view ? total : shown(sid ?? "S17", D.para(s.id), total);
        const streaming = !s.byCode && !view && S.st[sid]?.status !== "done";
        const reading = view && view !== (takenOf(s.id).option ?? "built");
        return (
          <M as="section" key={s.id} in="up6" className="relative scroll-mt-4" data-sec={s.id}>
            <h3 className="mt-7 mb-1.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-1 font-sans font-semibold text-[15px] tracking-tight">
              <button
                type="button"
                disabled={!onSection}
                onClick={() => onSection?.(s.id)}
                className="rounded-sm text-left outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
              >
                {i + 1}. {heading(s.id)}
              </button>
              <span className="self-center">
                <StateBadge sec={s.id} byCode={s.byCode} />
              </span>
              {reading && (
                <Badge variant="outline" className="self-center font-normal text-muted-foreground">
                  Reading {writingName(view).toLowerCase()}
                </Badge>
              )}
            </h3>
            <p className="mb-3 font-sans text-[13px] text-muted-foreground leading-snug">{s.purpose}</p>
            {s.byCode && !byPaper && (
              <p className="mb-3 flex items-start gap-2 rounded-lg bg-muted/60 px-3 py-2.5 font-sans text-[13px]">
                <Icon n="file" className="mt-0.5 size-3.5 text-muted-foreground" />
                <span>Written by code from the record when the draft is assembled, with no model call.</span>
              </p>
            )}
            {paras.length > 0 ? (
              <Written sec={s.id} paras={paras} on={on} streaming={streaming} after={placements(paras, on, placed)} />
            ) : (
              !s.byCode && <PlannedSection sec={s.id} planned={s.planned} />
            )}
          </M>
        );
      })}
    </article>
  );
}

/* ---------- beside the page ---------- */
const RC = "py-2 align-top whitespace-normal first:pl-3.5 last:pr-3.5";
function RailTable({ head, children }: { head: [string, string?][]; children: ReactNode }) {
  return (
    <div className="-mx-3.5 -mb-3 border-t">
      <Table className="table-fixed text-xs">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {head.map(([h, w]) => (
              <TableHead
                key={h || "state"}
                className={cn("h-8 text-muted-foreground text-xs first:pl-3.5 last:pr-3.5", w)}
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
function Fold({
  title,
  aside,
  children,
  value,
}: {
  title: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  value: string;
}) {
  return (
    <section
      data-fold={value}
      className="shrink-0 overflow-hidden rounded-xl bg-card px-3.5 pb-3 ring-1 ring-foreground/10"
    >
      <header className="flex items-center gap-2 py-3">
        <h3 className="min-w-0 flex-1 font-semibold text-[13px] leading-5">{title}</h3>
        <span className="shrink-0 text-muted-foreground text-xs tabular-nums">{aside}</span>
      </header>
      {children}
    </section>
  );
}
const Note = ({ children }: { children: ReactNode }) => (
  <p className="mb-2.5 text-muted-foreground text-xs leading-relaxed">{children}</p>
);

function Sections({ focus, onPick }: { focus: string; onPick(sec: string): void }) {
  const sections = outlineSections();
  const written = sections.filter((s) => !s.byCode && sectionState(s.id) === "kept").length;
  const own = sections.filter((s) => !s.byCode).length;
  return (
    <Fold value="sections" title="Sections" aside={`${written} of ${own} written`}>
      <RailTable head={[["Section"], ["Words", "w-16 text-right"], ["", "w-[7.5rem]"]]}>
        {sections.map((s) => {
          const paras = s.byCode
            ? (file("paper.json")?.sections.find((x) => x.section_id === s.id)?.paragraphs ?? [])
            : (keptOf(s.id)?.paragraphs ?? []);
          return (
            <TableRow key={s.id} className={cn(focus === s.id && "bg-muted/60")}>
              <TableCell className={RC}>
                <button
                  type="button"
                  onClick={() => onPick(s.id)}
                  className={cn(
                    "rounded-sm text-left outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring",
                    focus === s.id && "font-medium",
                  )}
                >
                  {heading(s.id)}
                </button>
              </TableCell>
              <TableCell className={cn(RC, "text-right text-muted-foreground tabular-nums")}>
                {paras.length ? wordCount(paras).toLocaleString("en-US") : "—"}
              </TableCell>
              <TableCell className={RC}>
                <StateBadge sec={s.id} byCode={s.byCode} compact />
              </TableCell>
            </TableRow>
          );
        })}
      </RailTable>
    </Fold>
  );
}

/** The section so far, at a glance: its length against its budget, its paragraphs that pass, what the verifier drops. */
export function Glance({ sec, reading }: { sec: string; reading?: string }) {
  const sid = stageOfSection(sec);
  const paras = paragraphsOf(sec, reading);
  const planned = outlineSections().find((s) => s.id === sec)?.planned ?? [];
  const words = wordCount(paras);
  const budget =
    file("SectionContracts.json")?.sections.find((x) => x.section_id === sec)?.words ??
    file("JournalWritingContract.json")?.rules.sections.find((x) => x.section_id === sec)?.words;
  const [lo, hi] = budget?.length === 2 ? budget : [0, 0];
  const scored = shown(sid, D.check(sec), 1) > 0;
  const opts = optionsOf(sec);
  const which = reading ?? takenOf(sec).option ?? opts?.recommended ?? "built";
  const option = [...(opts?.options ?? []), ...(opts?.withheld ?? [])].find((o) => o.option_id === which);
  const card = option?.scorecard ?? scorecardOfSection(sec);
  const failing = new Set((card?.rows ?? []).filter((r) => !r.passed && r.locator).map((r) => r.locator.split(".")[0]));
  const passing = planned.filter((p) => !failing.has(p.paragraph_id)).length;
  const short = hi > 0 && words > 0 && words < lo;
  const long = hi > 0 && words > hi;
  return (
    <Fold value="glance" title="The section so far" aside={paras.length ? writingName(which) : undefined}>
      <div className="flex flex-col gap-3 text-xs">
        <div className="flex flex-col gap-1.5">
          <span className="flex items-baseline justify-between gap-2">
            <span>
              <b className="font-semibold text-[20px] tabular-nums leading-none">{words.toLocaleString("en-US")}</b>
              <span className="ml-1 text-muted-foreground">words</span>
            </span>
            {hi > 0 && (
              <span className={cn("text-muted-foreground", (short || long) && "text-amber-700 dark:text-amber-300")}>
                {short ? "Under" : long ? "Over" : "Within"} {lo.toLocaleString("en-US")}–{hi.toLocaleString("en-US")}
              </span>
            )}
          </span>
          {hi > 0 && (
            <Progress
              value={Math.min(100, (words / hi) * 100)}
              className={cn("h-1.5", (short || long) && "[&>div]:bg-amber-500")}
              aria-label="Words against the section's budget"
            />
          )}
        </div>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
          <div>
            <dt className="text-muted-foreground">Paragraphs that pass</dt>
            <dd className="mt-0.5 font-medium tabular-nums">
              {scored ? `${passing} of ${planned.length}` : `${planned.length} planned`}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">The verifier drops</dt>
            <dd
              className={cn(
                "mt-0.5 font-medium tabular-nums",
                scored && (option?.dropped ?? 0) > 0 && "text-amber-700 dark:text-amber-300",
              )}
            >
              {scored && option ? plural(option.dropped, "sentence") : "At the check"}
            </dd>
          </div>
        </dl>
      </div>
    </Fold>
  );
}

export function Brief({ sec }: { sec: string }) {
  const b = LIVE.briefs[sec];
  const on = b ? shown(stageOfSection(sec), D.brief(sec), 1) : 0;
  const wording = wordingAnswer();
  return (
    <Fold
      value="brief"
      title={`What the ${heading(sec)} writers are told`}
      aside={b ? plural(b.moves.length, "move") : undefined}
    >
      {!on || !b ? (
        <Note>
          {LIVE.finished.has(stageOfSection(sec))
            ? "No brief: this section had nothing to write."
            : "Given to the writers as the section starts."}
        </Note>
      ) : (
        <M in="fade" className="flex flex-col gap-2.5 text-xs">
          <p className="leading-relaxed">{b.purpose}</p>
          <p className="leading-relaxed">
            <span className="text-muted-foreground">Tense: </span>
            {b.tense}
          </p>
          {b.key_terms.length > 0 && (
            <p className="flex flex-wrap items-center gap-1.5">
              <span className="text-muted-foreground">Key terms</span>
              {b.key_terms.map((t) => (
                <Badge key={t} variant="outline" className="font-normal">
                  {t}
                </Badge>
              ))}
            </p>
          )}
          {b.earlier.length > 0 && (
            <p className="text-muted-foreground">Reads first what is written: {b.earlier.map(heading).join(", ")}.</p>
          )}
          {wording && sec !== "results" && (
            <p className="text-muted-foreground">
              Findings worded: <span className="text-foreground">{wording.answer}</span>
            </p>
          )}
          {b.moves.length > 0 && (
            <RailTable head={[["Move"], ["Paragraph", "w-20"]]}>
              {b.moves.map((m) => (
                <TableRow key={`${m.paragraph}:${m.move}`}>
                  <TableCell className={RC}>{cap(moveName(m.move))}</TableCell>
                  <TableCell className={cn(RC, "font-mono text-muted-foreground")}>
                    {paraNumber(m.paragraph) ?? m.paragraph}
                  </TableCell>
                </TableRow>
              ))}
            </RailTable>
          )}
        </M>
      )}
    </Fold>
  );
}

/** The verdict of a writing's scorecard, in one badge. */
function Verdict({ card }: { card?: Scorecard }) {
  if (!card) return <StatusBadge k="na">Not scored</StatusBadge>;
  const groups = ruleGroups(card);
  const hard = groups.filter((g) => g.kind === "H" && !g.passed).length;
  const look = groups.filter((g) => g.kind !== "H" && !g.passed).length;
  if (hard) return <StatusBadge k="bad">{plural(hard, "hard rule")}</StatusBadge>;
  if (look) return <StatusBadge k="warn">{look} to look at</StatusBadge>;
  return <StatusBadge k="ok">Passes</StatusBadge>;
}

export function Writings({
  sec,
  reading,
  onRead,
}: {
  sec: string;
  reading?: string;
  onRead(sec: string, id: string): void;
}) {
  const front = sec === FRONT;
  const sid = stageOfSection(sec);
  const drafts = front
    ? (file("FrontDraft.json")?.versions ?? []).map((v) => ({
        option_id: v.option_id,
        label: v.label,
        strategy: v.strategy,
        words: v.abstract.split(/\s+/).length,
      }))
    : versionsOf(sec).map((v) => ({
        option_id: v.option_id,
        label: v.label,
        strategy: v.strategy,
        words: wordCount(v.paragraphs),
      }));
  const on = shown(sid, front ? D.front : D.versions(sec), drafts.length);
  const opts = optionsOf(sec);
  const scored = shown(sid, front ? D.frontCheck : D.check(sec), 1) > 0;
  const { option: taken } = takenOf(sec);
  const planned = front
    ? (file("FrontDraft.json")?.planned ?? 2)
    : (sectionFile("SectionDraft.json", sec)?.planned ?? 3);
  const showing = reading ?? taken ?? "built";
  return (
    <Fold
      value="writings"
      title={front ? "Titles and abstracts compared" : `Writings of the ${heading(sec)}`}
      aside={drafts.length ? `${Math.min(on, drafts.length)} of ${Math.max(planned, drafts.length)}` : undefined}
    >
      <Note>
        {front
          ? "Written from the finished sections; each is scored on the same rules, and the verifier reads both."
          : "The same paragraph plans, written three ways. Code ranks them: no hard rule failing, then fewest sentences the verifier drops, then the most rules kept."}
      </Note>
      {on === 0 ? (
        <Bars n={3} last="w-1/2" />
      ) : (
        <RailTable head={[["Writing"], [front ? "Abstract" : "Words", "w-16 text-right"], ["Check", "w-[7.5rem]"]]}>
          {drafts.slice(0, on).map((d) => {
            const o: CheckpointOption | undefined = opts?.options.find((x) => x.option_id === d.option_id);
            // A writing a hard rule of which fails is not offered at the check: it says why.
            const held = opts?.withheld?.find((x) => x.option_id === d.option_id);
            const isTaken = taken === d.option_id;
            const recommended = !taken && opts?.recommended === d.option_id;
            return (
              <M as={TableRow} key={d.option_id} in="fade" className={cn(showing === d.option_id && "bg-muted/60")}>
                <TableCell className={RC}>
                  <button
                    type="button"
                    onClick={() => onRead(sec, d.option_id)}
                    className="rounded-sm text-left outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                    title="Read this writing on the page"
                  >
                    <span className="font-medium">{writingName(d.option_id)}</span>
                  </button>
                  <span className="block text-muted-foreground">
                    {d.option_id === "built" ? "the plan, followed as it stands" : d.strategy}
                  </span>
                  {scored && (o ?? held) && (
                    <span className="block text-muted-foreground">
                      {(o ?? held)?.dropped
                        ? `${plural((o ?? held)?.dropped ?? 0, "sentence")} dropped by the verifier`
                        : "verifier drops none"}
                      {d.option_id !== "built" ? ` · ${Math.round(((o ?? held)?.kept ?? 0) * 100)}% words shared` : ""}
                    </span>
                  )}
                  {scored && held && (
                    <span className="block text-muted-foreground">Not offered: it breaks a hard rule.</span>
                  )}
                  {(isTaken || recommended) && (
                    <span className="mt-1 block">
                      {isTaken ? (
                        <StatusBadge k="ok">Kept</StatusBadge>
                      ) : (
                        <Badge variant="secondary">Recommended</Badge>
                      )}
                    </span>
                  )}
                </TableCell>
                <TableCell className={cn(RC, "text-right text-muted-foreground tabular-nums")}>
                  {d.words.toLocaleString("en-US")}
                </TableCell>
                <TableCell className={RC}>
                  {scored ? <Verdict card={(o ?? held)?.scorecard} /> : <StatusBadge k="na">Not yet</StatusBadge>}
                </TableCell>
              </M>
            );
          })}
        </RailTable>
      )}
    </Fold>
  );
}

export function Checks({ sec, reading }: { sec: string; reading?: string }) {
  const sid = stageOfSection(sec);
  const front = sec === FRONT;
  const opts = optionsOf(sec);
  const scored = shown(sid, front ? D.frontCheck : D.check(sec), 1) > 0;
  const { option } = takenOf(sec);
  const which = reading ?? option ?? opts?.recommended ?? "built";
  const card =
    [...(opts?.options ?? []), ...(opts?.withheld ?? [])].find((o) => o.option_id === which)?.scorecard ??
    scorecardOfSection(sec);
  const groups = card ? ruleGroups(card) : [];
  const failing = groups.filter((g) => !g.passed);
  return (
    <Fold
      value="checks"
      title={`Checks of the ${front ? "title and abstract" : heading(sec)}`}
      aside={scored && card ? <Verdict card={card} /> : "scored by code"}
    >
      {!scored || !card ? (
        <Note>
          Each writing is scored by code on the rules of its sentences, its plan and its craft once it is written.
        </Note>
      ) : (
        <M in="fade" className="flex flex-col gap-2 text-xs">
          <p className="text-muted-foreground">
            {writingName(which)}: {groups.length - failing.length} of {groups.length} rules pass.
          </p>
          <ul className="flex flex-col gap-1.5">
            {failing.map((g) => (
              <li key={g.rule} className="grid grid-cols-[14px_minmax(0,1fr)] gap-1.5">
                <Icon
                  n={g.kind === "H" ? "ban" : "alert"}
                  className={cn("mt-0.5 size-3.5", g.kind === "H" ? "text-rose-600" : "text-amber-600")}
                />
                <span className="leading-snug">
                  <span className="font-medium">{RULE_TEXT[g.rule] ?? cap(g.rule.replace(/[-_]+/g, " "))}</span>
                  {/* A hit on a paragraph shows in full in its card; here it is named by the paragraph's number. */}
                  {g.hits
                    .filter((h) => front || !paraNumber(h.locator.split(".")[0]))
                    .map((h) => (
                      <span key={`${h.locator}${h.note}`} className="block text-muted-foreground">
                        {h.note}
                      </span>
                    ))}
                  {!front && g.hits.some((h) => paraNumber(h.locator.split(".")[0])) && (
                    <span className="mt-1 flex flex-wrap gap-1">
                      {[...new Set(g.hits.map((h) => paraLabel(h.locator)).filter((x) => /^\d/.test(x)))].map((w) => (
                        <Badge key={w} variant="outline" className="font-mono font-normal">
                          {w}
                        </Badge>
                      ))}
                    </span>
                  )}
                  {g.book && <span className="block text-[11px] text-muted-foreground">{g.book}</span>}
                </span>
              </li>
            ))}
            {groups
              .filter((g) => g.passed)
              .map((g) => (
                <li key={g.rule} className="grid grid-cols-[14px_minmax(0,1fr)] gap-1.5 text-muted-foreground">
                  <Icon n="check" className="mt-0.5 size-3.5 text-emerald-600" />
                  <span className="leading-snug">{RULE_TEXT[g.rule] ?? cap(g.rule.replace(/[-_]+/g, " "))}</span>
                </li>
              ))}
          </ul>
        </M>
      )}
    </Fold>
  );
}
/** A locator of the checks ("results-2.s1") as the page numbers it. */
function paraLabel(locator: string) {
  const [para, sentence] = locator.split(".");
  const n = paraNumber(para);
  return n ? `${n}${sentence ? `, sentence ${sentence.slice(1)}` : ""}` : locator;
}

/* ---------- the scenes ---------- */
/** Who works on a section now, and on which paragraph: the writer as it streams, the verifier at the check. */
export function cursorOf(sec: string) {
  const sid = stageOfSection(sec);
  const st = S.st[sid];
  if (st?.status !== "running") return { agent: null, target: null };
  let agent: string | null = null;
  if (["w2", "w3", "w4", "f2", "f3"].includes(st.cur ?? "")) agent = "sw";
  if (["w5", "f4"].includes(st.cur ?? "")) agent = "av";
  if (sec === FRONT) return { agent, target: "front" };
  const on = S.n[D.para(sec)] ?? 0;
  let k = 0;
  for (const p of paragraphsOf(sec)) {
    k += p.sentences.length;
    if (k >= on) return { agent, target: `wpara:${p.paragraph_id}` };
  }
  return { agent, target: null };
}
/** What a person picked to read on the page: a writing other than the one kept. A new run has none. */
function useReading() {
  const [touched, setTouched] = useState<{ run: unknown; read: Record<string, string> }>({ run: S, read: {} });
  const read = touched.run === S ? touched.read : {};
  return [read, (sec: string, id: string) => setTouched({ run: S, read: { ...read, [sec]: id } })] as const;
}

/** A section's paragraphs, each taken apart in a card of its own, in the order the outline plans them. */
function ParagraphCards({ sec, reading }: { sec: string; reading?: string }) {
  const sid = stageOfSection(sec);
  const planned = outlineSections().find((s) => s.id === sec)?.planned ?? [];
  const plansOn = shown(sid, D.plan(sec), planned.length);
  const written = paragraphsOf(sec, reading);
  const total = sentenceCount(written);
  const on = reading ? total : shown(sid, D.para(sec), total);
  // Where each paragraph's sentences start among the section's written sentences, in the order they were written.
  const start: Record<string, number> = {};
  let k = 0;
  for (const p of written) {
    start[p.paragraph_id] = k;
    k += p.sentences.length;
  }
  if (!planned.length)
    return (
      <p className="rounded-xl bg-card px-4 py-3 text-muted-foreground text-sm ring-1 ring-foreground/10">
        {LIVE.finished.has(sid)
          ? "This paper's outline has no such section: nothing was written."
          : "Waiting for the outline."}
      </p>
    );
  // A table or figure stands after the paragraph that first names it, as on the page.
  const placed = new Set<string>();
  const nums = exhibitNumbers();
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <WorkingHere sid={sid} className="rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10" />
      {planned.slice(0, plansOn).map((p) => {
        const w = written.find((x) => x.paragraph_id === p.paragraph_id);
        const upTo = w ? Math.max(0, on - (start[p.paragraph_id] ?? 0)) : 0;
        const exhibits = w ? firstNamed(w, upTo, placed) : [];
        return (
          <Fragment key={p.uid}>
            <ParagraphCard
              sec={sec}
              p={p}
              first={start[p.paragraph_id] ?? Number.POSITIVE_INFINITY}
              on={on}
              reading={reading}
            />
            {exhibits.length > 0 && (
              <div className="rounded-xl bg-card px-4 py-1 ring-1 ring-foreground/10 sm:px-5">
                {exhibits.map((x) => (
                  <ExhibitBlock key={x} k={x} n={nums[x]} />
                ))}
              </div>
            )}
          </Fragment>
        );
      })}
      {plansOn < planned.length && <Bars n={3} last="w-1/2" className="px-1" />}
    </div>
  );
}

/** One section's screen: each paragraph taken apart, or the section as it reads; beside it the section's brief, its
 * writings compared and its checks. */
export function sectionScene(sec: string) {
  function SectionScene({ live }: { live: boolean }) {
    const host = useRef<HTMLDivElement>(null);
    const [read, setRead] = useReading();
    const [view, setView] = useState<"parts" | "page">("parts");
    const reading = read[sec];
    const { agent, target } = cursorOf(sec);
    return (
      <div ref={host} className="relative flex min-w-0 flex-col gap-5">
        <div className={COLUMNS}>
          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Tabs value={view} onValueChange={(v) => setView(v as "parts" | "page")}>
                <TabsList>
                  <TabsTrigger value="parts">Paragraph by paragraph</TabsTrigger>
                  <TabsTrigger value="page">As it reads</TabsTrigger>
                </TabsList>
              </Tabs>
              {reading && reading !== (takenOf(sec).option ?? "built") && (
                <Badge variant="outline" className="font-normal text-muted-foreground">
                  Reading {writingName(reading).toLowerCase()}
                </Badge>
              )}
            </div>
            {view === "parts" ? <ParagraphCards sec={sec} reading={reading} /> : <PaperPage picked={read} only={sec} />}
          </div>
          <aside className={SIDE}>
            <Glance sec={sec} reading={reading} />
            <Brief sec={sec} />
            <Writings
              sec={sec}
              reading={reading}
              onRead={(s, id) => {
                setRead(s, id);
                scrollSoon(`[data-sec="${CSS.escape(s)}"], [data-wpara]`);
              }}
            />
            <Checks sec={sec} reading={reading} />
          </aside>
        </div>
        <AgentCursor
          agent={live ? agent : null}
          host={host}
          target={target}
          version={`${S.st[stageOfSection(sec)]?.cur ?? ""}-${S.n[D.para(sec)] ?? 0}`}
        />
      </div>
    );
  }
  return SectionScene;
}

/** The last screen: the paper put together, its title and abstract written and compared beside it. */
export function AssemblyBody({ live }: { live: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const [read, setRead] = useReading();
  const { agent, target } = cursorOf(FRONT);
  const focus = (sec: string) => scrollSoon(`[data-sec="${CSS.escape(sec)}"]`);
  return (
    <div ref={host} className="relative flex min-w-0 flex-col gap-5">
      <div className={COLUMNS}>
        <PaperPage picked={read} onSection={focus} />
        <aside className={SIDE}>
          <Sections focus={FRONT} onPick={focus} />
          <Writings
            sec={FRONT}
            reading={read[FRONT]}
            onRead={(s, id) => {
              setRead(s, id);
              scrollSoon('[data-cursor="front"]');
            }}
          />
          <Checks sec={FRONT} reading={read[FRONT]} />
        </aside>
      </div>
      <AgentCursor agent={live ? agent : null} host={host} target={target} version={S.st.S17?.cur ?? ""} />
    </div>
  );
}

/* ---------- the writings side by side, where you choose one to keep ---------- */
/** The writings of a section (or the titles and abstracts) to read before choosing, each with what its check found. */
export function WritingsToChoose({ sec }: { sec: string }) {
  const front = sec === FRONT;
  const opts = optionsOf(sec);
  const sectionVersions = versionsOf(sec);
  const frontVersions = file("FrontDraft.json")?.versions ?? [];
  const ids = (front ? frontVersions : sectionVersions).map((v) => v.option_id);
  const [tab, setTab] = useState<string | null>(null);
  const at = tab && ids.includes(tab) ? tab : (opts?.recommended ?? ids[0]);
  if (!ids.length || !at) return null;
  const nums = exhibitNumbers();
  const o = opts?.options.find((x) => x.option_id === at);
  const sv = sectionVersions.find((v) => v.option_id === at);
  const fv = frontVersions.find((v) => v.option_id === at);
  return (
    <div className="flex flex-col gap-2">
      <p className="flex flex-wrap items-baseline justify-between gap-2 font-medium text-xs">
        <span>{front ? "The titles and abstracts written" : "The writings, from the same paragraph plans"}</span>
        <span className="font-normal text-muted-foreground">Read each before you choose</span>
      </p>
      <Tabs value={at} onValueChange={setTab}>
        <TabsList>
          {ids.map((id) => (
            <TabsTrigger key={id} value={id}>
              {writingName(id)}
              {id === opts?.recommended && <span className="text-muted-foreground"> · recommended</span>}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground text-xs">
        <span>{at === "built" ? "The plan, followed as it stands" : (sv?.strategy ?? fv?.strategy)}</span>
        {sv && <span>· {wordCount(sv.paragraphs).toLocaleString("en-US")} words</span>}
        {o && (
          <span>· {o.dropped ? `${plural(o.dropped, "sentence")} the verifier drops` : "the verifier drops none"}</span>
        )}
        {o && <Verdict card={o.scorecard} />}
      </p>
      <div className="max-h-72 overflow-y-auto rounded-xl border bg-card px-4 py-3 font-serif text-[14.5px] leading-[1.65]">
        {fv && (
          <>
            <p className={cn(SERIF, "font-semibold text-[16px] leading-snug")}>{fv.title}</p>
            <p className="mt-2">
              {readPieces(fv.abstract).map((p, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: pieces never reorder
                <Mark key={i} p={p} nums={nums} />
              ))}
            </p>
            {fv.keywords.length > 0 && (
              <p className="mt-2 font-sans text-muted-foreground text-xs">Keywords: {fv.keywords.join(", ")}</p>
            )}
          </>
        )}
        {sv && (
          <Written
            sec={sec}
            paras={sv.paragraphs}
            on={sentenceCount(sv.paragraphs)}
            streaming={false}
            after={placements(sv.paragraphs, sentenceCount(sv.paragraphs), new Set())}
          />
        )}
      </div>
    </div>
  );
}
