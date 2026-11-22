"use client";
"use no memo";

/* ===== The parts of the paper's document drawn by the page: each section's frame, the front, each table and figure,
   and the chips of a sentence =====
   A section's frame holds what is not the paper's own text: its number, its state, the stop that waits for you on it
   (the writings to read on the page, and the button that opens the choice), who is writing it now, and its plan in
   skeleton before a word of it is written. */

import { useSyncExternalStore } from "react";

import { NodeViewContent, type NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import { GripVertical } from "lucide-react";

import { Button } from "@/components/ui/button";

import { PulseDot } from "../../run-bits";
import { emit, S, useWritingRun } from "../engine";
import { cn, Icon } from "../lib";
import { StatusBadge } from "../scenes-gather";
import { canMove, startDrag } from "./doc-move";
import { MENU } from "./doc-move-menu";
import { bodySections, NUMS, useBody, useNums } from "./doc-order";
import { PRINT } from "./doc-print";
import { SAVED } from "./doc-save";
import { useSaved } from "./doc-toolbar";
import {
  checkpointOf,
  FRONT,
  optionsOf,
  outlineSections,
  type SectionState,
  sectionState,
  stageOfSection,
  versionsOf,
  writingName,
} from "./draft-data";
import { ExhibitBlock } from "./draft-exhibit";
import { Mark } from "./draft-marks";
import { WorkingHere } from "./kit";
import { exhibitTitle, labelOf, sourceOf } from "./outline-data";
import { Bars } from "./outline-kit";
import { citeName } from "./outline-paper";
import { file, LIVE, printed } from "./run";

/* ---------- what the document's frames share with the page around them ---------- */
/** The writing of each section picked to read on the page, before one is kept. */
export const DOC = {
  reading: {} as Record<string, string>,
  version: 0,
  listeners: new Set<() => void>(),
};
/** The writing of a section the page shows while you choose: the one you picked to read, else the one code
 * recommends. Once one is kept, the page shows it (undefined). */
export function readingOf(sec: string): string | undefined {
  const stop = LIVE.stop;
  const choosing = stop?.checkpoint === checkpointOf(sec) || (sec !== FRONT && sectionState(sec) === "choosing");
  if (!choosing) return undefined;
  return DOC.reading[sec] ?? optionsOf(sec)?.recommended ?? undefined;
}
export function setReading(sec: string, id: string) {
  DOC.reading = { ...DOC.reading, [sec]: id };
  DOC.version += 1;
  for (const l of DOC.listeners) l();
}
const subscribe = (l: () => void) => {
  DOC.listeners.add(l);
  return () => DOC.listeners.delete(l);
};
export const useDoc = () =>
  useSyncExternalStore(
    subscribe,
    () => DOC.version,
    () => DOC.version,
  );

/** Opens the stop that waits for you, from wherever it was set aside. */
export function openStop() {
  S.sheetMin = false;
  emit();
}

const STATE_BADGE: Record<SectionState, [string, string]> = {
  planned: ["na", "Planned"],
  writing: ["now", "Writing"],
  choosing: ["warn", "Your choice"],
  kept: ["ok", "Written"],
  skipped: ["na", "Not in the outline"],
  code: ["info", "By code"],
};

/** The stop on this part of the paper, if the run waits for you on it. */
function stopOn(sec: string) {
  const stop = LIVE.stop;
  if (!stop) return null;
  if (stop.checkpoint === checkpointOf(sec) || stop.stage === stageOfSection(sec)) return stop;
  return null;
}

/** The band over a part of the paper the run waits on: what it asks, the writings to read here, and the choice. */
function Waiting({ sec }: { sec: string }) {
  useDoc();
  const stop = stopOn(sec);
  if (!stop) return null;
  const choosing = stop.checkpoint === checkpointOf(sec);
  const opts = optionsOf(sec);
  const ids =
    sec === FRONT
      ? (file("FrontDraft.json")?.versions ?? []).map((v) => v.option_id)
      : versionsOf(sec).map((v) => v.option_id);
  const reading = readingOf(sec) ?? ids[0];
  return (
    <div
      contentEditable={false}
      data-waiting={sec}
      className="mt-6 flex flex-col gap-2.5 rounded-xl bg-amber-500/8 px-4 py-3 font-sans text-sm ring-1 ring-amber-500/40"
    >
      <p className="flex items-start gap-2 text-pretty">
        <PulseDot className="mt-1.5 bg-amber-500" />
        <span>
          <b className="font-semibold">Waiting for you.</b> {stop.prompt}
        </span>
      </p>
      {choosing && ids.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-muted-foreground text-xs">Read on the page</span>
          {ids.map((id) => (
            <Button
              key={id}
              type="button"
              size="xs"
              variant={reading === id ? "secondary" : "outline"}
              aria-pressed={reading === id}
              onClick={() => setReading(sec, id)}
            >
              {writingName(id)}
              {id === opts?.recommended && <span className="text-muted-foreground">· recommended</span>}
            </Button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" onClick={openStop}>
          {choosing ? "Compare and choose" : "Answer"}
          <Icon n="arrow" />
        </Button>
        {choosing && (
          <span className="text-muted-foreground text-xs">
            The writings side by side, with what each check found. Nothing is kept until you choose.
          </span>
        )}
      </div>
    </div>
  );
}

const subscribePrint = (l: () => void) => {
  PRINT.listeners.add(l);
  return () => PRINT.listeners.delete(l);
};
const usePrint = () =>
  useSyncExternalStore(
    subscribePrint,
    () => PRINT.version,
    () => PRINT.version,
  );

/* ---------- a section ---------- */
/** The section's state where the paper is not yet the run's last word on it: being planned, written or chosen. */
const SHOWN_STATES = new Set<SectionState>(["planned", "writing", "choosing"]);

export function SectionView({ node }: NodeViewProps) {
  useWritingRun();
  useBody();
  useSaved();
  const sec = String(node.attrs.sid);
  const state = String(node.attrs.state) as SectionState;
  const s = outlineSections().find((x) => x.id === sec);
  // Its number where it stands on the page, a section you moved included.
  const at = bodySections().findIndex((x) => x.sid === sec);
  const movable = canMove() && (state === "kept" || state === "code");
  const notes = SAVED.order.filter((r) => r.section_id === sec && r.locator === sec);
  const sid = stageOfSection(sec);
  const [k, label] = STATE_BADGE[state] ?? STATE_BADGE.planned;
  const empty = node.childCount <= 1;
  const busy = LIVE.calls.some((c) => c.stage === sid && !c.done);
  // A statement after the body is printed unnumbered, under its heading.
  if (node.attrs.back)
    return (
      <NodeViewWrapper as="section" data-sec={sec} className="relative scroll-mt-4 pt-[6mm]">
        <NodeViewContent className="[&_[data-heading]]:pl-0" />
      </NodeViewWrapper>
    );
  return (
    <NodeViewWrapper as="section" data-sec={sec} className="group/sec relative scroll-mt-4">
      <Waiting sec={sec} />
      {/* The heading as the printed paper sets it: the section's number, then its heading, in bold. */}
      <div className="relative pt-[6mm]">
        {movable && (
          <button
            type="button"
            contentEditable={false}
            draggable
            data-move-section={sec}
            aria-label={`Move section ${at + 1}`}
            title="Drag to move the section, or click for its moves"
            onDragStart={(e) => startDrag(e.nativeEvent, "section", sec)}
            onClick={(e) => MENU.open({ kind: "section", id: sec, rect: e.currentTarget.getBoundingClientRect() })}
            className="absolute top-[calc(6mm+0.2em)] -left-[4.1rem] hidden h-6 w-4 cursor-grab items-center justify-center rounded-sm text-muted-foreground/60 opacity-0 outline-none transition-opacity hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing group-hover/sec:opacity-100 sm:inline-flex"
          >
            <GripVertical className="size-3.5" />
          </button>
        )}
        <span
          contentEditable={false}
          aria-hidden="true"
          className="pointer-events-none absolute top-[6mm] left-0 select-none font-bold text-[14.4pt] leading-tight"
        >
          {at + 1}
        </span>
        {SHOWN_STATES.has(state) && (
          <span
            contentEditable={false}
            className="absolute top-[6mm] right-0 flex select-none items-center font-sans text-sm leading-tight"
          >
            <StatusBadge k={k}>{label}</StatusBadge>
          </span>
        )}
        <NodeViewContent />
      </div>
      {notes.length > 0 && (
        <ul
          contentEditable={false}
          className="-mt-[1ex] mb-[2ex] flex select-none flex-col gap-1 font-sans text-[12.5px]"
        >
          {notes.map((r) => (
            <li key={`${r.rule}:${r.note}`} className="flex items-start gap-1.5 leading-snug">
              <Icon
                n={r.kind === "H" ? "ban" : "alert"}
                className={cn("mt-0.5 size-3.5 shrink-0", r.kind === "H" ? "text-rose-600" : "text-amber-600")}
              />
              <span>{r.note}</span>
            </li>
          ))}
        </ul>
      )}
      {state === "code" && empty && (
        <p
          contentEditable={false}
          className="mt-2 flex items-start gap-2 rounded-lg bg-muted/60 px-3 py-2.5 text-left font-sans text-[13px] leading-snug"
        >
          <Icon n="file" className="mt-0.5 size-3.5 text-muted-foreground" />
          <span>Written by code from the record when the draft is assembled, with no model call.</span>
        </p>
      )}
      {state !== "code" && empty && s && (
        <div contentEditable={false} className="mt-2 flex select-none flex-col gap-3 text-left font-sans">
          {s.purpose && <p className="text-[13px] text-muted-foreground leading-snug">{s.purpose}</p>}
          {s.planned.map((p, j) => (
            <div key={p.paragraph_id} className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-2">
              <span className="pt-0.5 font-mono text-[11px] text-muted-foreground/70 tabular-nums">
                {at + 1}.{j + 1}
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
      )}
      {sid && (state === "writing" || state === "choosing" || (state === "planned" && busy)) && (
        <div contentEditable={false} className="mt-3 select-none text-left font-sans text-sm leading-snug">
          <WorkingHere sid={sid} className="rounded-lg bg-muted/60 px-3 py-2" />
        </div>
      )}
    </NodeViewWrapper>
  );
}

/* ---------- the front ---------- */
export function FrontView({ node }: NodeViewProps) {
  useWritingRun();
  usePrint();
  const empty = !node.firstChild?.textContent;
  return (
    <NodeViewWrapper as="header" data-cursor="front" className="mb-[6mm]">
      {/* The line the printed draft opens with, boxed above the title, as the run sets it. */}
      {PRINT.banner && (
        <p
          contentEditable={false}
          className="select-none border border-foreground px-3 py-1.5 text-center font-bold text-[11pt] leading-snug"
        >
          {PRINT.banner}
        </p>
      )}
      <Waiting sec={FRONT} />
      {empty && (
        <div contentEditable={false} className="mt-6 flex select-none flex-col gap-2.5 text-left font-sans">
          <Bars n={2} last="w-1/2" />
          <span className="text-muted-foreground text-xs">
            The title and abstract are written last, from the finished sections.
          </span>
          <WorkingHere sid="S17" />
        </div>
      )}
      <div className={cn("mt-[8mm]", empty && "hidden")}>
        <NodeViewContent />
      </div>
    </NodeViewWrapper>
  );
}
/** The authors' line under the title: the authors fill it, as the printed paper leaves it to them. */
export function AuthorsView() {
  return (
    <NodeViewWrapper contentEditable={false} className="mt-[5mm] select-none text-center text-[11pt]">
      <Mark
        p={{
          k: "author",
          text: "names, affiliations where the work was done, ORCID, and the corresponding author with email",
        }}
        nums={{}}
      />
    </NodeViewWrapper>
  );
}

/* ---------- a table or figure ---------- */
export function ExhibitView({ node }: NodeViewProps) {
  useNums();
  const k = String(node.attrs.k);
  return (
    <NodeViewWrapper contentEditable={false} className="indent-0">
      <ExhibitBlock k={k} n={NUMS.of[k] || String(node.attrs.n)} paper />
    </NodeViewWrapper>
  );
}

/* ---------- the chips: each prints as the paper prints it ---------- */
/** The order in which the paper first cites each source: a numbered paper numbers them so. */
export const CITES: { order: string[] } = { order: [] };
const citationStyle = () => file("JournalWritingContract.json")?.rules.citation_style ?? "author_year";

export function ValueView({ node }: NodeViewProps) {
  const key = String(node.attrs.k);
  const form = node.attrs.form ? String(node.attrs.form) : undefined;
  const text = printed(key, form);
  const label = labelOf(key);
  // A mark the ledger does not hold prints as the key, never as a value.
  if (text === key)
    return (
      <NodeViewWrapper
        as="span"
        title="Not in the evidence ledger"
        className="font-mono text-[0.85em] text-amber-700 dark:text-amber-300"
      >
        {`{{${key}}}`}
      </NodeViewWrapper>
    );
  return (
    <NodeViewWrapper
      as="span"
      title={label ? `${label} · from the evidence ledger (${key})` : key}
      className="rounded-[2px] decoration-emerald-600/60 decoration-dotted underline-offset-2 hover:underline"
    >
      {text}
    </NodeViewWrapper>
  );
}
export function CiteView({ node }: NodeViewProps) {
  // A source the sentence names as its subject ("Kaufman et al. (2012) …") is not cited again in brackets.
  const named = new Set(String(node.attrs.named).split(";"));
  const keys = String(node.attrs.keys)
    .split(";")
    .filter((k) => k && !named.has(k));
  if (!keys.length) return <NodeViewWrapper as="span" title="Cited by name in the sentence" />;
  const titles = keys.map((k) => sourceOf(k)?.title || k).join("; ");
  if (citationStyle() === "numeric")
    return (
      <NodeViewWrapper as="span" title={titles}>
        [{keys.map((k) => CITES.order.indexOf(k) + 1 || "?").join(", ")}]
      </NodeViewWrapper>
    );
  return (
    <NodeViewWrapper as="span" title={titles}>
      ({keys.map((k) => citeName(k)).join("; ")})
    </NodeViewWrapper>
  );
}
export function ExhibitRefView({ node }: NodeViewProps) {
  useNums();
  const k = String(node.attrs.k);
  return (
    <NodeViewWrapper as="span" title={exhibitTitle(k)}>
      {NUMS.of[k] ?? exhibitTitle(k)}
    </NodeViewWrapper>
  );
}
export function AuthorView({ node }: NodeViewProps) {
  return (
    <NodeViewWrapper as="span">
      <Mark p={{ k: "author", text: String(node.attrs.text) }} nums={{}} />
    </NodeViewWrapper>
  );
}
