"use client";
"use no memo";

/* ===== The paper's editor: the document the run writes into, section by section, as you read it =====
   The run's words come into the editor as its sections are written: each section is put in again whenever the run
   has more of it (a sentence more, another writing read, a writing kept), outside the editor's history, so your undo
   never takes back what the run wrote. The sentence being written is typed out in place: its words are all there,
   the ones not typed yet hidden, so the page never reflows as it types. */

import { useEffect, useRef } from "react";

import { Extension, type JSONContent } from "@tiptap/core";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";
import { EditorContent, ReactNodeViewRenderer, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import { S, TYPE_CPS } from "../engine";
import { cn } from "../lib";
import { keepsOrder, Moves, startDrag } from "./doc-move";
import { MENU, MoveMenu } from "./doc-move-menu";
import { SAVED } from "./doc-save";
import {
  Abstract,
  AuthorChip,
  Authors,
  BodyParagraph,
  CiteChip,
  ENDS,
  ExhibitChip,
  ExhibitNode,
  Front,
  Keywords,
  PaperDoc,
  PaperTitle,
  Section,
  SectionHeading,
  SentenceMark,
  sentencesOf,
  ValueChip,
} from "./doc-schema";
import { PaperToolbar, SHOW, useSaved } from "./doc-toolbar";
import {
  AuthorsView,
  AuthorView,
  CiteView,
  ExhibitRefView,
  ExhibitView,
  FrontView,
  SectionView,
  ValueView,
} from "./doc-views";

/** What the run has of the paper now, as the document's nodes: the front and each section, by id. */
export interface DocModel {
  front: JSONContent;
  sections: { sid: string; node: JSONContent }[];
  /** The sentence being typed out, by its id, while a section streams. */
  typing: string | null;
}

/** A change the run makes: it stays out of your history and passes the guard of the sections being written. */
const ENGINE = "logos-engine";
const TYPED = new PluginKey("typed");

/* ---------- the sentence being typed ---------- */
const typing = { sid: null as string | null, t0: 0, raf: 0 };
/** Where a sentence's words are in the document: from its first to past its last. */
function rangeOf(doc: PMNode, sid: string): [number, number] | null {
  let from = -1;
  let to = -1;
  doc.descendants((n, pos) => {
    if (to >= 0 && from >= 0 && pos > to) return false;
    if (n.isInline && n.marks.some((m) => m.type.name === "sentence" && m.attrs.sid === sid)) {
      if (from < 0) from = pos;
      to = pos + n.nodeSize;
    }
    return true;
  });
  return from < 0 ? null : [from, to];
}
const caret = () => {
  const el = document.createElement("span");
  el.setAttribute("aria-hidden", "true");
  el.className = "ml-0.5 inline-block h-[1.05em] w-0.5 animate-pulse bg-sky-600 align-[-0.15em]";
  return el;
};
const Typed = Extension.create({
  name: "typed",
  addProseMirrorPlugins: () => [
    new Plugin({
      key: TYPED,
      props: {
        decorations(state) {
          if (!typing.sid) return null;
          const r = rangeOf(state.doc, typing.sid);
          if (!r) return null;
          const chars = Math.round(((performance.now() - typing.t0) / 1000) * TYPE_CPS * S.speed);
          const at = Math.min(r[1], r[0] + chars);
          if (at >= r[1]) return null;
          return DecorationSet.create(state.doc, [
            Decoration.inline(at, r[1], { class: "opacity-0" }),
            Decoration.widget(at, caret, { side: -1, key: "caret" }),
          ]);
        },
      },
    }),
  ],
});
/** Types the sentence out, from now: the editor draws it again each frame until it is all there. */
function typeOut(view: EditorView, sid: string | null) {
  if (sid === typing.sid) return;
  cancelAnimationFrame(typing.raf);
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  typing.sid = reduced || S.fast ? null : sid;
  typing.t0 = performance.now();
  const tick = () => {
    if (view.isDestroyed || !typing.sid) return;
    view.dispatch(view.state.tr.setMeta(TYPED, true).setMeta("addToHistory", false));
    const r = rangeOf(view.state.doc, typing.sid);
    const chars = ((performance.now() - typing.t0) / 1000) * TYPE_CPS * S.speed;
    if (r && r[0] + chars < r[1]) typing.raf = requestAnimationFrame(tick);
    else typing.sid = null;
  };
  typing.raf = requestAnimationFrame(tick);
}

/* ---------- each paragraph's number, which opens it ---------- */
const NUMBERS = new PluginKey("numbers");
const Numbers = Extension.create({
  name: "numbers",
  addProseMirrorPlugins: () => [
    new Plugin({
      key: NUMBERS,
      props: {
        decorations(state) {
          const out: Decoration[] = [];
          // Each paragraph by where it stands: its section's number, then its own, as the outline numbers it.
          let section = 0;
          let para = 0;
          let movable = false;
          state.doc.descendants((n, pos) => {
            if (n.type.name === "section") {
              // A statement after the body is not numbered, nor are its paragraphs.
              if (n.attrs.back) return false;
              section += 1;
              para = 0;
              movable = ["kept", "code"].includes(String(n.attrs.state));
              return true;
            }
            if (n.type.name !== "paragraph") return n.type.name === "doc";
            const pid = String(n.attrs.pid);
            para += 1;
            const label = `${section}.${para}`;
            if (GRIPS.on && movable) out.push(grip(pos + 1, pid, label));
            out.push(
              Decoration.widget(
                pos + 1,
                () => {
                  const b = document.createElement("button");
                  b.type = "button";
                  b.dataset.openPara = pid;
                  b.title = "What this paragraph is for, its checks and its sources";
                  b.setAttribute("aria-label", `Open the analysis of paragraph ${label || pid}`);
                  b.contentEditable = "false";
                  b.className =
                    "absolute top-1 -left-10 hidden h-5 min-w-7 items-center justify-center rounded-md px-1 font-mono text-[11px] text-muted-foreground/70 tabular-nums indent-0 outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring sm:inline-flex";
                  b.textContent = label;
                  return b;
                },
                { side: -1, key: `n:${pid}:${label}`, ignoreSelection: true },
              ),
            );
            return false;
          });
          return DecorationSet.create(state.doc, out);
        },
      },
    }),
  ],
});

/** A paragraph's handle, left of its number: drag it to move the paragraph, or open its menu of moves. */
const GRIPS: { on: boolean } = { on: false };
function grip(at: number, pid: string, label: string) {
  return Decoration.widget(
    at,
    () => {
      const b = document.createElement("button");
      b.type = "button";
      b.draggable = true;
      b.dataset.movePara = pid;
      b.title = "Drag to move the paragraph, or click for its moves";
      b.setAttribute("aria-label", `Move paragraph ${label}`);
      b.contentEditable = "false";
      b.className =
        "absolute top-1 -left-[4.1rem] hidden h-5 w-4 cursor-grab items-center justify-center rounded-sm text-muted-foreground/60 indent-0 opacity-0 outline-none transition-opacity hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing sm:inline-flex";
      b.innerHTML =
        '<svg aria-hidden="true" viewBox="0 0 24 24" class="size-3.5" fill="currentColor"><circle cx="9" cy="5" r="1.6"/><circle cx="15" cy="5" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="19" r="1.6"/><circle cx="15" cy="19" r="1.6"/></svg>';
      b.addEventListener("dragstart", (e) => startDrag(e, "paragraph", pid));
      b.addEventListener("click", () => MENU.open({ kind: "paragraph", id: pid, rect: b.getBoundingClientRect() }));
      return b;
    },
    {
      side: -1,
      key: `g:${pid}:${label}`,
      ignoreSelection: true,
      // The editor leaves the handle's own drag and click to it.
      stopEvent: (e) => ["dragstart", "mousedown", "click"].includes(e.type),
    },
  );
}

/* ---------- the parts you may not change: what the run is still writing ---------- */
/** A change of yours leaves each part the run has not handed over (planned, being written or chosen) as it was and
 * where it was, and the statements after the body at the end. */
const Guard = Extension.create({
  name: "guard",
  addProseMirrorPlugins: () => [
    new Plugin({
      filterTransaction(tr, state) {
        if (!tr.docChanged || tr.getMeta(ENGINE)) return true;
        return keepsOrder(state.doc, tr.doc);
      },
    }),
  ],
});

/* ---------- your changes: which parts, each paragraph its own id, and the save after a pause ---------- */
const EDITS = new PluginKey("edits");
/** What a change of yours does once it lands: the editor's host saves after a pause. */
export const CHANGED: { on(doc: PMNode, before: PMNode): void } = { on: () => undefined };
/** The parts a change made anew: the front, each section whose content changed, and the order of the sections. */
function partsOf(before: PMNode, after: PMNode) {
  const out = new Set<string>();
  const was = new Map<string, PMNode>();
  before.forEach((n) => {
    was.set(n.type.name === "front" ? "front" : `section:${n.attrs.sid}`, n);
  });
  const order: string[] = [];
  after.forEach((n) => {
    const key = n.type.name === "front" ? "front" : `section:${n.attrs.sid}`;
    order.push(key);
    if (was.get(key) !== n) out.add(key);
  });
  if (order.join() !== [...was.keys()].join()) out.add("order");
  return out;
}
const Edits = Extension.create({
  name: "edits",
  addProseMirrorPlugins: () => [
    new Plugin({
      key: EDITS,
      // A paragraph split in two keeps its id in both halves: the half that holds more of its words keeps it, the
      // other (the new paragraph) takes one of its own.
      appendTransaction(trs, _old, state) {
        if (!trs.some((t) => t.docChanged && !t.getMeta(ENGINE))) return null;
        const byId = new Map<string, { pos: number; size: number; node: PMNode }[]>();
        state.doc.descendants((node, pos) => {
          if (node.type.name !== "paragraph") return node.type.name === "doc" || node.type.name === "section";
          const pid = String(node.attrs.pid);
          byId.set(pid, [...(byId.get(pid) ?? []), { pos, size: node.textContent.length, node }]);
          return false;
        });
        const tr = state.tr;
        let n = 0;
        for (const [pid, all] of byId) {
          if (all.length < 2 && pid) continue;
          const keep = pid ? all.reduce((a, b) => (b.size > a.size ? b : a)) : null;
          for (const x of all) {
            if (x === keep) continue;
            n += 1;
            const sec = pid.replace(/-[^-]+$/, "") || "para";
            const id = `${sec}-u${Date.now().toString(36)}${n}`;
            tr.setNodeMarkup(x.pos, undefined, { ...x.node.attrs, pid: id });
          }
        }
        return tr.docChanged ? tr : null;
      },
    }),
  ],
  onTransaction: ({ transaction, editor }) => {
    if (!transaction.docChanged || transaction.getMeta(ENGINE)) return;
    for (const part of partsOf(transaction.before, editor.state.doc)) TOUCHED.add(part);
    CHANGED.on(editor.state.doc, transaction.before);
  },
});

/* ---------- what the check found, and who wrote what ---------- */
/** Each sentence of a paragraph where it stands: its id, its range, and whether you wrote or changed it. */
function sentenceRanges(p: PMNode, start: number) {
  const out: { sid: string; from: number; to: number; base: string; origin: string; at: string }[] = [];
  p.forEach((child, off) => {
    const m = child.marks.find((x) => x.type.name === "sentence");
    if (!m) return;
    const from = start + 1 + off;
    const last = out.at(-1);
    if (last && last.sid === m.attrs.sid && last.to === from) last.to = from + child.nodeSize;
    else
      out.push({
        sid: String(m.attrs.sid),
        from,
        to: from + child.nodeSize,
        base: String(m.attrs.base),
        origin: String(m.attrs.origin),
        at: String(m.attrs.at),
      });
  });
  return out;
}
const WHO: Record<string, string> = {
  model: "the section writer",
  code: "code",
  author: "the authors' slot",
  user: "you",
};
const Notes = Extension.create({
  name: "notes",
  addProseMirrorPlugins: () => [
    new Plugin({
      props: {
        decorations(state) {
          const out: Decoration[] = [];
          state.doc.forEach((sec, secPos) => {
            if (sec.type.name !== "section") return;
            const rows = SAVED.checks[String(sec.attrs.sid)] ?? [];
            // What the paper's order breaks is said wherever it breaks, a sentence you did not change included.
            const order = SAVED.order.filter((x) => x.section_id === sec.attrs.sid);
            sec.forEach((p, off) => {
              if (p.type.name !== "paragraph") return;
              const pos = secPos + 1 + off;
              const pid = String(p.attrs.pid);
              const saved = sentencesOf(p.toJSON());
              for (const r of sentenceRanges(p, pos)) {
                const text = saved.find((x) => x.sid === r.sid)?.text ?? "";
                const loc = `${pid}.s${saved.findIndex((x) => x.sid === r.sid) + 1}`;
                const changed = r.origin === "user" || (r.base && text !== r.base);
                // A hard rule is marked wherever it breaks; a point to look at, only in a sentence you changed.
                const at = (x: { locator: string }) => x.locator === loc || x.locator.startsWith(`${loc}.`);
                const hits = [...rows.filter((x) => at(x) && (x.kind === "H" || changed)), ...order.filter(at)];
                if (hits.length) {
                  const hard = hits.some((x) => x.kind === "H");
                  out.push(
                    Decoration.inline(r.from, r.to, {
                      class: cn(
                        "underline decoration-wavy decoration-1 underline-offset-[5px]",
                        hard ? "decoration-rose-500" : "decoration-amber-500/80",
                      ),
                      title: hits
                        .map((x) => `${x.kind === "H" ? "Breaks" : "To look at"}: ${x.note || x.rule}`)
                        .join("\n"),
                    }),
                  );
                }
                if (SHOW.who && changed)
                  out.push(
                    Decoration.inline(r.from, r.to, {
                      class: "rounded-sm bg-sky-500/15 box-decoration-clone",
                      title:
                        r.origin === "user"
                          ? "Written by you"
                          : `Changed by you${r.at ? ` on ${new Date(r.at).toLocaleString("en-GB")}` : ""}; first written by ${WHO[r.origin] ?? r.origin}: “${r.base}”`,
                    }),
                  );
              }
              // A sentence you added outside every sentence, shown as yours.
              if (SHOW.who)
                p.forEach((child, o) => {
                  if (!child.isText || child.marks.some((x) => x.type.name === "sentence") || !child.text?.trim())
                    return;
                  const from = pos + 1 + o;
                  out.push(
                    Decoration.inline(from, from + child.nodeSize, {
                      class: "rounded-sm bg-sky-500/15 box-decoration-clone",
                      title: "Written by you",
                    }),
                  );
                });
              // A sentence you typed outside every sentence: its rows by where the paper counts it.
              p.forEach((child, o) => {
                if (!child.isText || child.marks.some((x) => x.type.name === "sentence")) return;
                const from = pos + 1 + o;
                const words = child.text ?? "";
                let at = 0;
                for (const piece of words.split(ENDS)) {
                  const start = words.indexOf(piece, at);
                  at = start + piece.length;
                  const i = saved.findIndex((x) => x.origin === "user" && x.text === piece.trim());
                  if (!piece.trim() || i < 0) continue;
                  const loc = `${pid}.s${i + 1}`;
                  const hits = rows.filter((x) => x.locator === loc || x.locator.startsWith(`${loc}.`));
                  if (hits.length)
                    out.push(
                      Decoration.inline(from + start, from + at, {
                        class: cn(
                          "underline decoration-wavy decoration-1 underline-offset-[5px]",
                          hits.some((x) => x.kind === "H") ? "decoration-rose-500" : "decoration-amber-500/80",
                        ),
                        title: [
                          ...new Set(
                            hits.map((x) => `${x.kind === "H" ? "Breaks" : "To look at"}: ${x.note || x.rule}`),
                          ),
                        ].join("\n"),
                      }),
                    );
                }
              });
              const own = [...rows.filter((x) => x.kind === "H"), ...order].filter((x) => x.locator === pid);
              if (own.length)
                out.push(
                  Decoration.node(pos, pos + p.nodeSize, {
                    class: own.some((x) => x.kind === "H")
                      ? "shadow-[inset_2px_0_0_var(--color-rose-500)]"
                      : "shadow-[inset_2px_0_0_var(--color-amber-500)]",
                    title: own.map((x) => x.note || x.rule).join("\n"),
                  }),
                );
            });
          });
          return DecorationSet.create(state.doc, out);
        },
      },
    }),
  ],
});

const EXTENSIONS = [
  StarterKit.configure({
    document: false,
    paragraph: false,
    heading: false,
    blockquote: false,
    bulletList: false,
    orderedList: false,
    listItem: false,
    listKeymap: false,
    codeBlock: false,
    horizontalRule: false,
    hardBreak: false,
    strike: false,
    underline: false,
    link: false,
    trailingNode: false,
    // Where a dragged paragraph or section would land.
    dropcursor: { color: false, width: 2, class: "bg-sky-500" },
    gapcursor: false,
  }),
  Subscript,
  Superscript,
  PaperDoc,
  Front.extend({ addNodeView: () => ReactNodeViewRenderer(FrontView, { as: "header" }) }),
  PaperTitle,
  Authors.extend({ addNodeView: () => ReactNodeViewRenderer(AuthorsView) }),
  Abstract,
  Keywords,
  Section.extend({ addNodeView: () => ReactNodeViewRenderer(SectionView, { as: "section" }) }),
  SectionHeading,
  BodyParagraph,
  ExhibitNode.extend({ addNodeView: () => ReactNodeViewRenderer(ExhibitView) }),
  ValueChip.extend({ addNodeView: () => ReactNodeViewRenderer(ValueView, { as: "span" }) }),
  CiteChip.extend({ addNodeView: () => ReactNodeViewRenderer(CiteView, { as: "span" }) }),
  ExhibitChip.extend({ addNodeView: () => ReactNodeViewRenderer(ExhibitRefView, { as: "span" }) }),
  AuthorChip.extend({ addNodeView: () => ReactNodeViewRenderer(AuthorView, { as: "span" }) }),
  SentenceMark,
  Typed,
  Numbers,
  Guard,
  Edits,
  Notes,
  Moves,
];

/** What the run last put of each part, as JSON: a part is put again only when the run's own words change. */
const APPLIED = new Map<string, string>();
/** The parts you changed since the last save: the run never puts its words over yours. */
export const TOUCHED = new Set<string>();
/** Forgets what was put, so the next render puts every part again (a version read back, or restored). */
export function putAgain() {
  APPLIED.clear();
  TOUCHED.clear();
  SAVED.editedAt = {};
}

/** Puts the run's words of a section (or the front) in place of the editor's, when they change. */
function put(view: EditorView, name: "front" | "section", sid: string | null, json: JSONContent) {
  const key = name === "front" ? "front" : `section:${sid}`;
  const sig = JSON.stringify(json);
  if (APPLIED.get(key) === sig || TOUCHED.has(key)) return;
  APPLIED.set(key, sig);
  const { doc, schema } = view.state;
  let at = -1;
  let size = 0;
  let index = 0;
  doc.forEach((n, pos, i) => {
    if (n.type.name === name && (name === "front" || n.attrs.sid === sid)) {
      at = pos;
      size = n.nodeSize;
      index = i;
    }
  });
  const node = schema.nodeFromJSON(json);
  const tr = view.state.tr.setMeta(ENGINE, true).setMeta("addToHistory", false);
  if (at >= 0) {
    if (doc.child(index).eq(node)) return;
    tr.replaceWith(at, at + size, node);
  } else tr.insert(doc.content.size, node);
  view.dispatch(tr);
}

/** Puts the sections in the order the paper has them (a version read back or restored), unless you moved them
 * since your last save. */
function arrange(view: EditorView, order: string[]) {
  if (TOUCHED.has("order")) return;
  const now: { sid: string; node: PMNode }[] = [];
  view.state.doc.forEach((n) => {
    if (n.type.name === "section") now.push({ sid: String(n.attrs.sid), node: n });
  });
  const want = [...now].sort((a, b) => order.indexOf(a.sid) - order.indexOf(b.sid));
  if (want.every((x, i) => x === now[i])) return;
  const start = view.state.doc.firstChild?.nodeSize ?? 0;
  const tr = view.state.tr.setMeta(ENGINE, true).setMeta("addToHistory", false);
  tr.replaceWith(
    start,
    view.state.doc.content.size,
    want.map((x) => x.node),
  );
  view.dispatch(tr);
}

const EMPTY: JSONContent = {
  type: "doc",
  content: [
    {
      type: "front",
      content: [{ type: "paperTitle" }, { type: "abstract" }, { type: "keywords" }],
    },
  ],
};

/** What a click on a paragraph's number does: the page that shows the editor says. */
const OPENING: { open(pid: string): void } = { open: () => undefined };
/** The editor's options, the same object every render: the editor takes new options as a new editor would. */
const OPTIONS = {
  immediatelyRender: false,
  editable: false,
  extensions: EXTENSIONS,
  // The editor opens on a bare page; the run's words come in once it is drawn, as every later change does.
  content: EMPTY,
  editorProps: {
    attributes: {
      class: cn(
        // The body as the printed paper sets it: justified, hyphenated, no space between paragraphs.
        "text-justify outline-none [hyphens:auto]",
        // The title as the title block sets it: centred, large, in the text's own weight.
        "[&_[data-title]]:text-balance [&_[data-title]]:text-center [&_[data-title]]:text-[17pt] [&_[data-title]]:leading-[1.25]",
        // The abstract: "Abstract" centred in bold over the text, set smaller and indented on both sides.
        "[&_[data-abstract]]:mx-[2.5em] [&_[data-abstract]]:mt-[6mm] [&_[data-abstract]]:text-[10pt] [&_[data-abstract]]:leading-[1.45] [&_[data-abstract]]:before:mb-1 [&_[data-abstract]]:before:block [&_[data-abstract]]:before:text-center [&_[data-abstract]]:before:font-bold [&_[data-abstract]]:before:content-['Abstract']",
        // The keywords under it, their label in bold.
        "[&_[data-keywords]]:mt-[4mm] [&_[data-keywords]]:text-left [&_[data-keywords]]:before:font-bold [&_[data-keywords]]:before:content-['Keywords:_']",
        // Each section's heading: its number, then the heading, in bold, larger than the text.
        "[&_[data-heading]]:mt-0 [&_[data-heading]]:mb-[2.3ex] [&_[data-heading]]:pr-24 [&_[data-heading]]:pl-[1.75em] [&_[data-heading]]:text-left [&_[data-heading]]:font-bold [&_[data-heading]]:text-[14.4pt] [&_[data-heading]]:leading-tight",
        // A paragraph after the first under a heading opens indented.
        "[&_[data-wpara]]:relative [&_[data-wpara]]:mb-0 [&_[data-wpara]]:scroll-mt-24 [&_[data-wpara]~[data-wpara]]:indent-[1.5em]",
        // A paragraph's handle shows while the pointer is on the paragraph.
        "[&_[data-wpara]:hover_[data-move-para]]:opacity-100",
      ),
      "aria-label": "The paper",
    },
    // While the paper is read only, a click anywhere in a paragraph opens it, as its number does.
    handleClickOn: (view: EditorView, _pos: number, node: PMNode) => {
      if (view.editable || node.type.name !== "paragraph" || !view.state.selection.empty) return false;
      OPENING.open(String(node.attrs.pid));
      return true;
    },
    handleDOMEvents: {
      mousedown: (_view: EditorView, e: MouseEvent) => {
        const b = (e.target as HTMLElement).closest<HTMLElement>("[data-open-para]");
        if (!b) return false;
        e.preventDefault();
        OPENING.open(b.dataset.openPara ?? "");
        return true;
      },
    },
  },
};

/** The paper as one document, the run writing into it. `onOpen`: a paragraph's number was clicked; `onChange`: you
 * changed the paper (the host saves it); `onRestored`: a saved version was put back. */
export function PaperEditor({
  model,
  onOpen,
  onChange,
  onRestored,
}: {
  model: DocModel;
  onOpen(pid: string): void;
  onChange(doc: JSONContent): void;
  onRestored(): void;
}) {
  OPENING.open = onOpen;
  MENU.analysis = onOpen;
  const editor = useEditor(OPTIONS);
  useSaved();
  CHANGED.on = (doc) => onChange(doc.toJSON());
  // A new editor (the page opened again, or back from the analysis) starts bare: every part is put in again.
  useEffect(() => {
    if (editor) putAgain();
  }, [editor]);
  // You change the paper once the saved version is on the page, and only if the project lets you.
  const editable = SAVED.loaded && SAVED.canWrite;
  useEffect(() => {
    if (!editor || editor.isDestroyed || editor.options.editable === editable) return;
    // The editor reads this option on its next draw; setting it through setEditable would rebuild every section's
    // frame. The options the editor was made with say the same, or it would take them back.
    editor.options.editable = editable;
    OPTIONS.editable = editable;
    GRIPS.on = editable;
    setTimeout(() => {
      if (!editor.isDestroyed) editor.view.dispatch(editor.state.tr.setMeta("addToHistory", false));
    });
  }, [editor, editable]);
  // The run's words, put in wherever they differ from the editor's: after React has drawn the page, since the
  // editor draws its sections' frames itself as it takes them.
  const latest = useRef(model);
  latest.current = model;
  useEffect(() => {
    if (!editor) return;
    setTimeout(() => {
      if (editor.isDestroyed) return;
      const view = editor.view;
      const m = latest.current;
      put(view, "front", null, m.front);
      for (const s of m.sections) put(view, "section", s.sid, s.node);
      arrange(
        view,
        m.sections.map((s) => s.sid),
      );
      typeOut(view, m.typing);
      // What the check found is drawn again once it comes.
      view.dispatch(view.state.tr.setMeta("addToHistory", false));
    });
  });
  useEffect(() => () => cancelAnimationFrame(typing.raf), []);
  return (
    <>
      <PaperToolbar editor={editor} onRestored={onRestored} />
      <EditorContent editor={editor} className="min-w-0" />
      <MoveMenu />
    </>
  );
}
