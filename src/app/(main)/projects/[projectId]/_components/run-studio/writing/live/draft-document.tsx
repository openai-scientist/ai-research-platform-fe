"use client";
"use no memo";

/* ===== S11–S17 · the first draft as one document: the paper, written into as you read it =====
   The run still writes the paper section by section, each its own stage with its own check; the page is the paper
   alone. Beside it, the paper's outline: each section, its state, its paragraphs, to go to. Each section comes into
   the document as its stage writes it, the sentence being written typed out in place. A section the run waits on for
   you says so where it stands in the paper, with its writings to read there and the button that opens the choice.
   A paragraph's number opens what is behind it: its plan and checks, the values and sources it prints, who wrote
   each of its sentences. The analysis mode lays out each section's work in a tab of its own: its brief, its
   paragraphs taken apart, its writings compared and its checks. */

import { type ComponentType, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { DragDropProvider } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import type { JSONContent } from "@tiptap/core";
import { GripVertical } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { S } from "../engine";
import { AgentCursor, cn, Icon } from "../lib";
import { type DocModel, PaperEditor, putAgain } from "./doc-editor";
import { moveParagraph, moveSection } from "./doc-move";
import { bodySections, placeOf, useBody } from "./doc-order";
import { PRINT, printedText } from "./doc-print";
import { cancelSave, loadSaved, paperOf, SAVED, saveSoon } from "./doc-save";
import { inlineOf, paragraphNode } from "./doc-schema";
import { useSaved } from "./doc-toolbar";
import { CITES, readingOf, setReading, useDoc } from "./doc-views";
import {
  D,
  FRONT,
  outlineSections,
  paragraphsOf,
  pieces,
  type SectionState,
  sectionState,
  sentenceCount,
  stageOfSection,
  takenOf,
  wordCount,
} from "./draft-data";
import { placements } from "./draft-exhibit";
import { Checks, cursorOf, sectionScene, Writings } from "./draft-paper";
import { ParagraphCard } from "./draft-paragraph";
import { shown } from "./kit";
import { exhibitNumbers, heading, labelOf, sourceOf } from "./outline-data";
import { COLUMNS, SIDE, scrollSoon } from "./outline-kit";
import { citeName } from "./outline-paper";
import { paperFont } from "./paper-font";
import { file, printed } from "./run";
import type { WrittenParagraph } from "./types";

/* ---------- what the run has of the paper, as the document's nodes ---------- */
function frontModel(): JSONContent {
  const paper = file("paper.json");
  const drafts = file("FrontDraft.json")?.versions ?? [];
  const on = shown("S17", D.front, drafts.length);
  const { option } = takenOf(FRONT);
  const picked = readingOf(FRONT);
  const v =
    (picked ? drafts.find((x) => x.option_id === picked) : undefined) ??
    (option ? drafts.find((x) => x.option_id === option) : undefined) ??
    (on > 0 ? drafts[0] : undefined);
  // Once the title and abstract are kept, the page shows them as you last saved them.
  const mine = paper && !picked ? (SAVED.paper ?? paper) : null;
  const title = mine ? mine.title : (v?.title ?? "");
  const abstract = mine ? mine.abstract : (v?.abstract ?? "");
  const keywords = mine ? mine.keywords : (v?.keywords ?? []);
  const text = (t: string) => (t ? [{ type: "text", text: t }] : []);
  return {
    type: "front",
    attrs: { state: paper || option ? "kept" : "planned" },
    content: [
      { type: "paperTitle", content: title ? inlineOf(printedText(title)) : [] },
      { type: "authors" },
      { type: "abstract", content: abstract ? inlineOf(printedText(abstract)) : [] },
      { type: "keywords", content: text(keywords.map(printedText).join(", ")) },
    ],
  };
}

function docModel(): DocModel {
  const paper = file("paper.json");
  const nums = exhibitNumbers();
  const placed = new Set<string>();
  let typing: string | null = null;
  const sections = orderedSections().map((s) => {
    const sid = stageOfSection(s.id);
    const state: SectionState = s.byCode ? "code" : sectionState(s.id);
    const byPaper = paper?.sections.find((x) => x.section_id === s.id);
    const saved = savedSection(s.id, state);
    // A writing picked to read is shown whole until one is kept; the one streaming shows as far as it has come.
    const view = state === "choosing" ? readingOf(s.id) : undefined;
    const paras: WrittenParagraph[] =
      saved?.paragraphs ?? (s.byCode ? (byPaper?.paragraphs ?? []) : paragraphsOf(s.id, view));
    const total = sentenceCount(paras);
    const on = s.byCode || view || saved ? total : shown(sid ?? "S17", D.para(s.id), total);
    const streaming = !s.byCode && !view && !saved && S.st[sid]?.status !== "done";
    const after = placements(paras, on, placed);
    const content: JSONContent[] = [
      { type: "sectionHeading", content: [{ type: "text", text: printedText(saved?.heading || heading(s.id)) }] },
    ];
    let k = 0;
    for (const p of paras) {
      const first = k;
      k += p.sentences.length;
      if (first >= on) break;
      const upTo = Math.min(p.sentences.length, on - first);
      content.push(paragraphNode(p, upTo, printedText));
      for (const x of after[p.paragraph_id] ?? []) content.push({ type: "exhibit", attrs: { k: x, n: nums[x] ?? "" } });
      if (streaming && first + upTo === on) typing = `${p.paragraph_id}.s${upTo}`;
    }
    // A section kept but not yet all on the page (a run played back) is still being written there: you change it,
    // move it or save it once it is all there, never a part of it.
    const handed = state === "kept" && on < total ? "writing" : state;
    const node: JSONContent = { type: "section", attrs: { sid: s.id, state: handed }, content };
    return { sid: s.id, node };
  });
  // The statements after the body (data and code availability, AI use, declarations), unnumbered, as printed.
  const back = SAVED.paper?.back_matter?.length ? SAVED.paper.back_matter : (paper?.back_matter ?? []);
  for (const b of back)
    sections.push({
      sid: `back:${b.section_id}`,
      node: {
        type: "section",
        attrs: { sid: `back:${b.section_id}`, state: "kept", back: true },
        content: [
          { type: "sectionHeading", content: [{ type: "text", text: printedText(b.heading) }] },
          ...b.paragraphs.map((p) => paragraphNode(p, p.sentences.length, printedText)),
        ],
      },
    });
  const model = { front: frontModel(), sections, typing };
  numberExhibits(model);
  return model;
}

/** Tables and figures numbered as the printed paper numbers them: by the order the text first names each, the
 * title and abstract included; each set after the paragraph that first names it carries its number. */
function numberExhibits(model: DocModel): Record<string, string> {
  const order: string[] = [];
  const walk = (n: JSONContent) => {
    if (n.type === "exhibitRef" && !order.includes(String(n.attrs?.k))) order.push(String(n.attrs?.k));
    for (const c of n.content ?? []) walk(c);
  };
  walk(model.front);
  for (const sec of model.sections) walk(sec.node);
  const count = { tab: 0, fig: 0 };
  const nums: Record<string, string> = {};
  for (const k of order) {
    const kind = k.startsWith("tab:") ? "tab" : "fig";
    count[kind] += 1;
    nums[k] = `${kind === "tab" ? "Table" : "Figure"} ${count[kind]}`;
  }
  const mark = (n: JSONContent) => {
    if (n.type === "exhibit" && n.attrs) n.attrs.n = nums[String(n.attrs.k)] ?? "";
    for (const c of n.content ?? []) mark(c);
  };
  for (const sec of model.sections) mark(sec.node);
  return nums;
}

/** The sources the page cites, in the order it first cites each. */
function citedOf(model: DocModel): string[] {
  const out: string[] = [];
  const walk = (n: JSONContent) => {
    if (n.type === "cite")
      for (const k of String(n.attrs?.keys ?? "").split(";")) if (k && !out.includes(k)) out.push(k);
    for (const c of n.content ?? []) walk(c);
  };
  walk(model.front);
  for (const sec of model.sections) walk(sec.node);
  return out;
}

/** The reference list as the printed paper ends with it: by author and year, or numbered in the order cited. */
function References({ keys }: { keys: string[] }) {
  if (!keys.length) return null;
  const numbered = file("JournalWritingContract.json")?.rules.citation_style === "numeric";
  const entries = keys.map((k) => {
    const r = sourceOf(k);
    return { k, text: r?.reference ?? [r?.cited_as, r?.title].filter(Boolean).join(". ") ?? k };
  });
  if (!numbered) entries.sort((a, b) => a.text.localeCompare(b.text));
  return (
    <section aria-label="References" className="mt-[3.5ex] text-left">
      <h3 className="mb-[2.3ex] font-bold text-[14.4pt] leading-tight">References</h3>
      <ol className="flex flex-col gap-1.5 text-[10pt] leading-snug">
        {entries.map((e, i) => (
          <li
            key={e.k}
            className={cn(numbered ? "grid grid-cols-[2.2em_minmax(0,1fr)]" : "pl-[1.5em] -indent-[1.5em]")}
          >
            {numbered && <span>[{i + 1}]</span>}
            <span className="break-words">{e.text}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** The outline's sections in the order the paper has them: those you saved in the order you saved them, each other
 * where the run's outline puts it. */
function orderedSections() {
  const all = outlineSections();
  const saved = (SAVED.paper?.sections ?? []).map((s) => s.section_id).filter((id) => all.some((s) => s.id === id));
  const slots = all.flatMap((s, i) => (saved.includes(s.id) ? [i] : []));
  const out = [...all];
  slots.forEach((slot, j) => {
    out[slot] = all.find((s) => s.id === saved[j]) ?? out[slot];
  });
  return out;
}

/* ---------- the outline beside the page ---------- */
const DOT: Record<SectionState, string> = {
  planned: "bg-muted-foreground/30",
  writing: "bg-sky-500 animate-pulse",
  choosing: "bg-amber-500 animate-pulse",
  kept: "bg-emerald-500",
  skipped: "bg-muted-foreground/30",
  code: "bg-sky-700/60",
};
/** A section as you last saved it, once the run has handed it over. */
function savedSection(sec: string, state: SectionState) {
  if (state !== "kept" && state !== "code") return undefined;
  return SAVED.paper?.sections.find((x) => x.section_id === sec);
}
/** A section's paragraphs as written: as you last saved them, else by code when the draft is assembled, else the
 * writing kept or read. */
function writtenOf(sec: string, byCode: boolean, reading?: string): WrittenParagraph[] {
  const saved = savedSection(sec, byCode ? "code" : sectionState(sec));
  if (saved) return saved.paragraphs;
  if (byCode) return file("paper.json")?.sections.find((x) => x.section_id === sec)?.paragraphs ?? [];
  return paragraphsOf(sec, reading);
}
/** A paragraph's first sentence as a reader sees it, in whichever section it was written for. */
function lineOf(pid: string) {
  for (const s of outlineSections()) {
    const p = writtenOf(s.id, s.byCode, readingOf(s.id)).find((x) => x.paragraph_id === pid);
    if (p) return plainOf(p.sentences[0]?.text ?? "");
  }
  return undefined;
}
/** What a paragraph was planned to do, in whichever section it was planned for. */
function jobOf(pid: string) {
  for (const s of outlineSections()) {
    const p = s.planned.find((x) => x.paragraph_id === pid);
    if (p) return p.job;
  }
  return undefined;
}
/** A section's paragraphs as the outline lists them: those on the page, in the order they stand there; else those
 * written, else those planned. */
function outlineParagraphs(sec: string, byCode: boolean) {
  const onPage = bodySections().find((s) => s.sid === sec)?.paras ?? [];
  if (onPage.length) return onPage.map((p) => ({ id: p.pid, line: jobOf(p.pid) ?? lineOf(p.pid) ?? p.text }));
  const written = writtenOf(sec, byCode, readingOf(sec));
  const planned = outlineSections().find((s) => s.id === sec)?.planned ?? [];
  if (written.length)
    return written.map((p) => ({
      id: p.paragraph_id,
      line: planned.find((x) => x.paragraph_id === p.paragraph_id)?.job ?? plainOf(p.sentences[0]?.text ?? ""),
    }));
  return planned.map((p) => ({ id: p.paragraph_id, line: p.job }));
}
/** A paragraph's number where it stands in the paper: its section's, then its own ("3.2"). */
function numberOf(pid: string) {
  const onPage = placeOf(pid);
  if (onPage) return onPage;
  const sections = pageSections();
  for (const [i, s] of sections.entries()) {
    const at = outlineParagraphs(s.id, s.byCode).findIndex((p) => p.id === pid);
    if (at >= 0) return `${i + 1}.${at + 1}`;
  }
  return "";
}
/** The outline's sections in the order the page has them. */
function pageSections() {
  const all = outlineSections();
  const body = bodySections();
  if (!body.length) return orderedSections();
  return body.flatMap((b) => all.find((s) => s.id === b.sid) ?? []);
}
/** A sentence's words as a reader sees them, its marks by what they print. */
function plainOf(text: string) {
  const nums = exhibitNumbers();
  return pieces(text)
    .map((p) => {
      if (p.k === "text") return p.text;
      if (p.k === "value") return printed(p.key, p.form);
      if (p.k === "exhibit") return nums[p.key] ?? "";
      if (p.k === "cite") return "";
      return p.text;
    })
    .join("")
    .replace(/\*\*([^*]+)\*\*|\*([^*\s][^*]*)\*|`([^`]+)`/g, (_, a, b, c) => a ?? b ?? c)
    .replace(/\s+/g, " ")
    .trim();
}

const ROW =
  "flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-left outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring";
/** A handle in the outline: drag it to move the section or paragraph on the page. */
function Handle({ handle, label, on }: { handle: (el: Element | null) => void; label: string; on: boolean }) {
  // Drawn even when nothing may move, hidden: the drag library then marks the handle, never the whole row.
  return (
    <button
      ref={handle}
      type="button"
      aria-label={label}
      title="Drag to move"
      hidden={!on}
      className="-ml-1 flex h-5 w-3.5 shrink-0 cursor-grab items-center justify-center rounded-sm text-muted-foreground/40 opacity-0 outline-none hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing group-hover/row:opacity-100 [@media(hover:none)]:opacity-100"
    >
      <GripVertical className="size-3" />
    </button>
  );
}
function OutlineParagraph({
  p,
  sec,
  index,
  movable,
  onParagraph,
}: {
  p: { id: string; line: string };
  sec: string;
  index: number;
  movable: boolean;
  onParagraph(pid: string): void;
}) {
  const { ref, handleRef, isDragging } = useSortable({
    id: `para:${p.id}`,
    index,
    type: "paragraph",
    accept: "paragraph",
    group: sec,
    disabled: !movable,
    data: { pid: p.id },
  });
  return (
    <li ref={ref} className={cn("group/row flex items-center", isDragging && "opacity-40")}>
      <Handle handle={handleRef} label={`Move paragraph ${numberOf(p.id)}`} on={movable} />
      <button
        type="button"
        onClick={() => onParagraph(p.id)}
        title={p.line}
        className="flex w-full min-w-0 items-baseline gap-1.5 rounded-md px-1.5 py-1 text-left text-muted-foreground text-xs outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="shrink-0 font-mono text-[11px] tabular-nums">{numberOf(p.id)}</span>
        <span className="truncate">{p.line}</span>
      </button>
    </li>
  );
}
function OutlineSection({
  s,
  index,
  onSection,
  onParagraph,
}: {
  s: ReturnType<typeof outlineSections>[number];
  index: number;
  onSection(sec: string): void;
  onParagraph(pid: string): void;
}) {
  const state: SectionState = s.byCode ? "code" : sectionState(s.id);
  // Moved only once the page holds it whole, as the run handed it over.
  const onPage = bodySections().find((x) => x.sid === s.id)?.state;
  const movable = SAVED.canWrite && SAVED.loaded && (onPage === "kept" || onPage === "code");
  const { ref, handleRef, isDragging } = useSortable({
    id: `sec:${s.id}`,
    index,
    type: "section",
    accept: "section",
    group: "sections",
    disabled: !movable,
  });
  return (
    <div ref={ref} className={cn("flex flex-col", isDragging && "opacity-40")}>
      <div className="group/row flex items-center">
        <Handle handle={handleRef} label={`Move section ${index + 1}, ${heading(s.id)}`} on={movable} />
        <button type="button" onClick={() => onSection(s.id)} className={cn(ROW, "flex-1")}>
          <span className={cn("size-1.5 shrink-0 rounded-full", DOT[state])} />
          <span className="truncate font-medium">
            {index + 1}. {heading(s.id)}
          </span>
          {state === "choosing" && (
            <Badge variant="secondary" className="ml-auto h-5 shrink-0 px-1.5 text-[11px]">
              Your choice
            </Badge>
          )}
        </button>
      </div>
      <ul className="mb-1 ml-[1.15rem] flex flex-col border-l pl-1.5">
        {outlineParagraphs(s.id, s.byCode).map((p, j) => (
          <OutlineParagraph key={p.id} p={p} sec={s.id} index={j} movable={movable} onParagraph={onParagraph} />
        ))}
      </ul>
    </div>
  );
}

/** The paper's outline: each section and its paragraphs, in the order the page has them. Once the run has handed a
 * section over, a drag on the outline moves it on the page, or moves a paragraph within its section or to another. */
function Outline({ onSection, onParagraph }: { onSection(sec: string): void; onParagraph(pid: string): void }) {
  useBody();
  // The list is drawn anew after each drag, as the page now has it, whatever the drag moved on the screen.
  const [epoch, setEpoch] = useState(0);
  const sections = pageSections();
  const paper = file("paper.json");
  let frontState: SectionState = "planned";
  if (file("FrontDraft.json")?.versions.length) frontState = "writing";
  if (paper) frontState = "kept";
  return (
    <nav aria-label="The paper's outline" className="flex flex-col gap-0.5 text-[13px]">
      <button type="button" onClick={() => onSection(FRONT)} className={ROW}>
        <span className={cn("size-1.5 shrink-0 rounded-full", DOT[frontState])} />
        <span className="truncate font-medium">Title and abstract</span>
      </button>
      <DragDropProvider
        key={epoch}
        onDragEnd={(event) => {
          const { source } = event.operation;
          if (!event.canceled && isSortable(source)) {
            const id = String(source.id);
            if (id.startsWith("sec:")) moveSection(id.slice(4), source.index);
            else if (id.startsWith("para:")) moveParagraph(id.slice(5), String(source.group), source.index);
          }
          setTimeout(() => setEpoch((n) => n + 1));
        }}
      >
        {sections.map((s, i) => (
          <OutlineSection key={s.id} s={s} index={i} onSection={onSection} onParagraph={onParagraph} />
        ))}
      </DragDropProvider>
    </nav>
  );
}

/* ---------- a paragraph opened: what is behind it ---------- */
const ORIGIN: Record<string, string> = {
  model: "Written by the section writer",
  code: "Written by code from the record",
  author: "Left for the authors",
  user: "Written by you",
};
function ParagraphDialog({
  pid,
  onClose,
  onMove,
  onAnalysis,
}: {
  pid: string | null;
  onClose(): void;
  onMove(pid: string): void;
  onAnalysis(sec: string, pid: string): void;
}) {
  useBody();
  const sections = pageSections();
  // The section it stands in now, and the one it was planned for, if you moved it.
  const sec = sections.find((s) => outlineParagraphs(s.id, s.byCode).some((p) => p.id === pid));
  const home = outlineSections().find((s) => s.planned.some((p) => p.paragraph_id === pid)) ?? sec;
  const all = sections.flatMap((s) => outlineParagraphs(s.id, s.byCode).map((p) => p.id));
  const at = pid ? all.indexOf(pid) : -1;
  const planned = home?.planned.find((p) => p.paragraph_id === pid);
  const reading = home ? readingOf(home.id) : undefined;
  const written = [sec, ...sections]
    .flatMap((s) => (s ? writtenOf(s.id, s.byCode, readingOf(s.id)) : []))
    .find((p) => p.paragraph_id === pid);
  const values = [
    ...new Map(
      (written?.sentences ?? [])
        .flatMap((s) => pieces(s.text))
        .flatMap((p) => (p.k === "value" ? [[p.key, p.form] as const] : []))
        .map(([k, f]) => [k, f]),
    ),
  ];
  const cites = [
    ...new Set(
      (written?.sentences ?? []).flatMap((s) => pieces(s.text)).flatMap((p) => (p.k === "cite" ? p.keys : [])),
    ),
  ];
  return (
    <Dialog open={Boolean(pid)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[min(88vh,52rem)] flex-col gap-0 p-0 sm:max-w-3xl">
        <DialogHeader className="border-b px-5 pt-4 pb-3">
          <DialogTitle className="pr-8">
            Paragraph {pid ? numberOf(pid) || pid : ""}
            {sec ? `, ${heading(sec.id)}` : ""}
          </DialogTitle>
          <DialogDescription>
            {written ? `${written.sentences.length} sentences, ${wordCount([written])} words` : "Not written yet"}
            {sec?.byCode ? " · written by code" : ""}
            {home && sec && home.id !== sec.id ? ` · moved here from ${heading(home.id)}` : ""}
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="plan" className="min-h-0 flex-1 gap-0">
          <TabsList variant="line" className="mx-5 mt-2">
            <TabsTrigger value="plan">Plan and checks</TabsTrigger>
            <TabsTrigger value="sources">Values and sources</TabsTrigger>
            <TabsTrigger value="who">Who wrote it</TabsTrigger>
          </TabsList>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <TabsContent value="plan" className="flex flex-col gap-3">
              <AfterSave sec={sec?.id} pid={pid} />
              {home && planned ? (
                <ParagraphCard
                  sec={home.id}
                  p={planned}
                  first={0}
                  on={Number.MAX_SAFE_INTEGER}
                  reading={reading}
                  shown={written}
                />
              ) : (
                <p className="text-muted-foreground text-sm">
                  {sec?.byCode
                    ? "Written by code from the record: it has no plan to keep and no writer to check."
                    : "No plan for this paragraph."}
                </p>
              )}
            </TabsContent>
            <TabsContent value="sources" className="flex flex-col gap-4 text-sm">
              <section>
                <h4 className="mb-1.5 font-medium text-muted-foreground text-xs">Values it prints, from the ledger</h4>
                {values.length ? (
                  <ul className="flex flex-col divide-y rounded-lg ring-1 ring-foreground/10">
                    {values.map(([k, f]) => (
                      <li key={k} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 px-3 py-2">
                        <span className="min-w-0">
                          <span className="block">{labelOf(k) || k}</span>
                          <span className="font-mono text-[11px] text-muted-foreground">{k}</span>
                        </span>
                        <span className="text-emerald-800 tabular-nums dark:text-emerald-200">{printed(k, f)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-xs">None.</p>
                )}
              </section>
              <section>
                <h4 className="mb-1.5 font-medium text-muted-foreground text-xs">Sources it cites</h4>
                {cites.length ? (
                  <ul className="flex flex-col divide-y rounded-lg ring-1 ring-foreground/10">
                    {cites.map((k) => (
                      <li key={k} className="px-3 py-2">
                        <span className="block font-medium">{citeName(k)}</span>
                        <span className="text-muted-foreground text-xs">{sourceOf(k)?.title ?? k}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-xs">None.</p>
                )}
              </section>
            </TabsContent>
            <TabsContent value="who">
              {written ? (
                <ol className="flex flex-col divide-y rounded-lg text-sm ring-1 ring-foreground/10">
                  {written.sentences.map((s, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: a paragraph's sentences keep their order
                    <li key={i} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-2 px-3 py-2.5">
                      <span className="font-mono text-[11px] text-muted-foreground tabular-nums">{i + 1}</span>
                      <span className="min-w-0">
                        <span className="block font-serif text-[14.5px] leading-relaxed">{plainOf(s.text)}</span>
                        <span className="mt-1 block text-muted-foreground text-xs">{ORIGIN[s.origin] ?? s.origin}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-muted-foreground text-sm">Not written yet.</p>
              )}
            </TabsContent>
          </div>
        </Tabs>
        <footer className="flex flex-wrap items-center gap-2 border-t px-5 py-3">
          <Button type="button" variant="outline" size="sm" disabled={at <= 0} onClick={() => onMove(all[at - 1])}>
            <Icon n="back" />
            Previous paragraph
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={at < 0 || at >= all.length - 1}
            onClick={() => onMove(all[at + 1])}
          >
            Next paragraph
            <Icon n="arrow" />
          </Button>
          {home && !home.byCode && pid && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="ml-auto"
              onClick={() => onAnalysis(home.id, pid)}
            >
              Open in the analysis
            </Button>
          )}
        </footer>
      </DialogContent>
    </Dialog>
  );
}

/** What the check found in a paragraph after your last save. */
function AfterSave({ sec, pid }: { sec?: string; pid: string | null }) {
  const rows = (sec && SAVED.checks[sec]) || [];
  const mine = rows.filter((r) => pid && (r.locator === pid || r.locator.startsWith(`${pid}.`)));
  if (!sec || !(sec in SAVED.checks)) return null;
  const notes = [...new Map(mine.map((r) => [`${r.kind}:${r.note || r.rule}`, r])).values()];
  return (
    <section className="rounded-lg px-3 py-2.5 text-sm ring-1 ring-foreground/10">
      <h4 className="font-medium text-xs">After your last save</h4>
      {notes.length ? (
        <ul className="mt-1.5 flex flex-col gap-1">
          {notes.map((r) => (
            <li
              key={`${r.kind}:${r.locator}:${r.note}`}
              className="grid grid-cols-[14px_minmax(0,1fr)] gap-1.5 text-xs"
            >
              <Icon
                n={r.kind === "H" ? "ban" : "alert"}
                className={cn("mt-0.5 size-3.5", r.kind === "H" ? "text-rose-600" : "text-amber-600")}
              />
              <span>
                <span className="font-mono text-[11px] text-muted-foreground">{r.locator}</span> {r.note || r.rule}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-muted-foreground text-xs">Every rule of this paragraph holds.</p>
      )}
    </section>
  );
}

/* ---------- the analysis mode ---------- */
const SCENES = new Map<string, ComponentType<{ live: boolean }>>();
const sceneOf = (sec: string) => {
  let scene = SCENES.get(sec);
  if (!scene) {
    scene = sectionScene(sec);
    SCENES.set(sec, scene);
  }
  return scene;
};
function FrontAnalysis() {
  const read = readingOf(FRONT);
  return (
    <div className={COLUMNS}>
      <Writings
        sec={FRONT}
        reading={read}
        onRead={(s, id) => {
          setReading(s, id);
        }}
      />
      <aside className={SIDE}>
        <Checks sec={FRONT} reading={read} />
      </aside>
    </div>
  );
}
function Analysis({ live, tab, onTab }: { live: boolean; tab: string; onTab(sec: string): void }) {
  const sections = outlineSections().filter((s) => !s.byCode);
  const Scene = tab === FRONT ? null : sceneOf(tab);
  return (
    <Tabs value={tab} onValueChange={onTab} className="gap-4">
      <TabsList className="h-auto max-w-full flex-wrap justify-start">
        {sections.map((s) => (
          <TabsTrigger key={s.id} value={s.id}>
            {heading(s.id)}
            {sectionState(s.id) === "choosing" && <span className="size-1.5 rounded-full bg-amber-500" />}
          </TabsTrigger>
        ))}
        <TabsTrigger value={FRONT}>Title and abstract</TabsTrigger>
      </TabsList>
      {Scene ? <Scene live={live} /> : <FrontAnalysis />}
    </Tabs>
  );
}

/* ---------- the scene ---------- */
/** The section the run is writing now, else the first one it waits on, else the first. */
function liveSection() {
  const sections = outlineSections().filter((s) => !s.byCode);
  return (
    sections.find((s) => sectionState(s.id) === "choosing")?.id ??
    sections.find((s) => sectionState(s.id) === "writing")?.id ??
    sections[0]?.id ??
    FRONT
  );
}

const subscribePrint = (l: () => void) => {
  PRINT.listeners.add(l);
  return () => PRINT.listeners.delete(l);
};

export function DocumentScene({ live }: { live: boolean }) {
  useDoc();
  useSaved();
  useSyncExternalStore(
    subscribePrint,
    () => PRINT.version,
    () => PRINT.version,
  );
  // The paper as you last saved it, read once the run is open.
  useEffect(() => {
    void loadSaved().then(putAgain);
    // A change not saved yet when the page closes is not sent later, to a run no longer on screen.
    return cancelSave;
  }, []);
  const host = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"document" | "analysis">("document");
  const [tab, setTab] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [outline, setOutline] = useState(false);
  const model = docModel();
  const cited = citedOf(model);
  CITES.order = cited;
  const sections = outlineSections();
  const kept = sections.filter((s) => !s.byCode && sectionState(s.id) === "kept").length;
  const own = sections.filter((s) => !s.byCode).length;
  const words = sections.reduce((n, s) => n + wordCount(writtenOf(s.id, s.byCode, readingOf(s.id))), 0);
  const goSection = (sec: string) => {
    setOutline(false);
    if (mode === "analysis") {
      setTab(sec);
      return;
    }
    scrollSoon(sec === FRONT ? '[data-cursor="front"]' : `[data-sec="${CSS.escape(sec)}"]`);
  };
  const goParagraph = (pid: string) => {
    setOutline(false);
    if (mode === "analysis") {
      const sec = sections.find((s) => outlineParagraphs(s.id, s.byCode).some((p) => p.id === pid));
      if (sec) setTab(sec.id);
    }
    scrollSoon(`[data-wpara="${CSS.escape(pid)}"]`, "center");
  };
  const writing = sections.find((s) => !s.byCode && sectionState(s.id) === "writing");
  const { agent, target } = writing ? cursorOf(writing.id) : { agent: null, target: null };
  return (
    <div ref={host} className="relative flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Tabs value={mode} onValueChange={(v) => setMode(v as "document" | "analysis")}>
          <TabsList>
            <TabsTrigger value="document">Document</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn("lg:hidden", mode === "analysis" && "hidden")}
          onClick={() => setOutline(true)}
        >
          <Icon n="list" />
          Outline
        </Button>
        <span className="ml-auto text-muted-foreground text-xs tabular-nums">
          {kept} of {own} sections written · {words.toLocaleString("en-US")} words
        </span>
      </div>
      {mode === "document" ? (
        <div className="grid items-start gap-5 lg:grid-cols-[13.5rem_minmax(0,1fr)]">
          <aside className="sticky top-0 max-h-[calc(100vh-12rem)] overflow-y-auto pr-1 max-lg:hidden">
            <Outline onSection={goSection} onParagraph={goParagraph} />
          </aside>
          {/* The page as the printed paper sets it: an A4 sheet, 2.5 cm margins, the serif at 11 pt, justified. */}
          <article
            data-page
            lang="en"
            className={cn(
              paperFont.variable,
              "font-(family-name:--font-paper) relative mx-auto w-full min-w-0 max-w-[210mm] rounded-sm bg-card px-5 pt-7 pb-12 text-[11pt] text-card-foreground leading-[1.5] shadow-sm ring-1 ring-foreground/10 sm:px-[20mm] sm:pt-[22mm] sm:pb-[25mm] lg:px-[25mm]",
            )}
          >
            <PaperEditor
              model={model}
              onOpen={setOpen}
              onChange={(doc) =>
                saveSoon(
                  doc,
                  paperOf({ type: "doc", content: [model.front, ...model.sections.map((x) => x.node)] }),
                  putAgain,
                )
              }
              onRestored={putAgain}
            />
            <References keys={cited} />
          </article>
        </div>
      ) : (
        <Analysis live={live} tab={tab ?? liveSection()} onTab={setTab} />
      )}
      <Sheet open={outline} onOpenChange={setOutline}>
        <SheetContent side="left" className="w-72 overflow-y-auto p-3">
          <SheetHeader className="px-1">
            <SheetTitle>Outline</SheetTitle>
          </SheetHeader>
          <Outline onSection={goSection} onParagraph={goParagraph} />
        </SheetContent>
      </Sheet>
      <ParagraphDialog
        pid={open}
        onClose={() => setOpen(null)}
        onMove={setOpen}
        onAnalysis={(sec, pid) => {
          setOpen(null);
          setMode("analysis");
          setTab(sec);
          scrollSoon(`[data-wpara="${CSS.escape(pid)}"]`, "start");
        }}
      />
      {mode === "document" && (
        <AgentCursor
          agent={live ? agent : null}
          host={host}
          target={target}
          version={`${writing ? (S.st[stageOfSection(writing.id)]?.cur ?? "") : ""}-${writing ? (S.n[D.para(writing.id)] ?? 0) : 0}`}
        />
      )}
    </div>
  );
}
