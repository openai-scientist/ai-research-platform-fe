/* ===== Moving the paper's parts: a section among the sections, a paragraph within its section or to another =====
   A move is a change of yours like any other: it can be undone, it is saved as a version and the paper is checked
   again, what its new order breaks said where it breaks and nothing refused. The title, abstract and keywords stay at
   the top and the statements after the body at the end; a section the run is still writing stays where it is, and
   nothing moves past it or into it. After each move every table and figure stands after the paragraph that now first
   names it, and the numbers follow the page. */

import { Extension } from "@tiptap/core";
import { Fragment, type Node as PMNode, Slice } from "@tiptap/pm/model";
import { Plugin, PluginKey, type Transaction } from "@tiptap/pm/state";
import { dropPoint } from "@tiptap/pm/transform";
import type { EditorView } from "@tiptap/pm/view";
import { toast } from "sonner";

import { readOrder } from "./doc-order";

/** The editor on the page, for the outline and the menus beside it to move its parts. */
export const EDITOR: { view: EditorView | null } = { view: null };

const LOCKED = "A section the run is still writing stays where it is; nothing moves past it or into it.";
const handedOver = (n: PMNode) =>
  n.type.name === "section" ? ["kept", "code"].includes(String(n.attrs.state)) : n.attrs.state === "kept";

/** The parts the run is still writing, each where it stands: a change of yours leaves every one as it was. */
export function lockedOf(doc: PMNode) {
  const out: [number, PMNode][] = [];
  doc.forEach((n, _pos, i) => {
    if (!handedOver(n)) out.push([i, n]);
  });
  return out;
}
/** Whether a document keeps the parts the run is still writing as they were, where they were, and the statements
 * after the body at its end. */
export function keepsOrder(before: PMNode, after: PMNode) {
  const was = lockedOf(before);
  const now = lockedOf(after);
  if (was.length !== now.length || was.some(([i, n], j) => now[j][0] !== i || !(now[j][1] === n || now[j][1].eq(n))))
    return false;
  let back = false;
  let ok = true;
  after.forEach((n) => {
    if (n.type.name !== "section") return;
    if (n.attrs.back) back = true;
    else if (back) ok = false;
  });
  return ok;
}

/* ---------- where things are ---------- */
interface At {
  node: PMNode;
  pos: number;
}
function sectionsOf(doc: PMNode) {
  const out: At[] = [];
  doc.forEach((node, pos) => {
    if (node.type.name === "section" && !node.attrs.back) out.push({ node, pos });
  });
  return out;
}
function paragraphAt(doc: PMNode, pid: string): (At & { sec: At }) | null {
  for (const sec of sectionsOf(doc)) {
    let found: At | null = null;
    sec.node.forEach((node, off) => {
      if (!found && node.type.name === "paragraph" && node.attrs.pid === pid) found = { node, pos: sec.pos + 1 + off };
    });
    if (found) return { ...(found as At), sec };
  }
  return null;
}
/** Where a paragraph goes in a section: before its `index`-th paragraph, else at the section's end. */
function slotIn(sec: At, index: number, skip?: string) {
  let n = 0;
  let at = sec.pos + sec.node.nodeSize - 1;
  let found = false;
  sec.node.forEach((node, off) => {
    if (found || node.type.name !== "paragraph" || node.attrs.pid === skip) return;
    if (n === index) {
      at = sec.pos + 1 + off;
      found = true;
    }
    n += 1;
  });
  return at;
}

/* ---------- the moves ---------- */
const MOVE = new PluginKey("move");
function apply(tr: Transaction) {
  const view = EDITOR.view;
  if (!view) return false;
  const before = view.state.doc;
  if (!keepsOrder(before, tr.doc)) {
    toast.info(LOCKED);
    return false;
  }
  view.dispatch(tr.setMeta(MOVE, true).scrollIntoView());
  return true;
}
/** Whether you may move the paper's parts now: once the saved paper is in, on a project you may change. */
export const canMove = () => Boolean(EDITOR.view && !EDITOR.view.isDestroyed && EDITOR.view.editable);

/** Puts a section at `to` among the body's sections. */
export function moveSection(sid: string, to: number) {
  const view = EDITOR.view;
  if (!view || !canMove()) return;
  const body = sectionsOf(view.state.doc);
  const from = body.findIndex((s) => s.node.attrs.sid === sid);
  if (from < 0 || to === from || to < 0 || to >= body.length) return;
  const src = body[from];
  const target = body[to];
  const tr = view.state.tr.delete(src.pos, src.pos + src.node.nodeSize);
  tr.insert(tr.mapping.map(to > from ? target.pos + target.node.nodeSize : target.pos), src.node);
  apply(tr);
}
/** Puts a paragraph in a section, before its `index`-th paragraph (the one moved not counted), else at its end. */
export function moveParagraph(pid: string, sid: string, index: number) {
  const view = EDITOR.view;
  if (!view || !canMove()) return;
  const { doc } = view.state;
  const p = paragraphAt(doc, pid);
  const sec = sectionsOf(doc).find((s) => s.node.attrs.sid === sid);
  if (!p || !sec) return;
  const at = slotIn(sec, index, pid);
  if (at === p.pos || at === p.pos + p.node.nodeSize) return;
  const tr = view.state.tr.delete(p.pos, p.pos + p.node.nodeSize);
  tr.insert(tr.mapping.map(at), p.node);
  apply(tr);
}
/** A paragraph one place up or down: past the first or last of its section, to the end or start of the one next. */
export function stepParagraph(pid: string, by: -1 | 1) {
  const view = EDITOR.view;
  if (!view) return;
  const body = sectionsOf(view.state.doc);
  const p = paragraphAt(view.state.doc, pid);
  if (!p) return;
  const i = body.findIndex((s) => s.pos === p.sec.pos);
  const paras: string[] = [];
  p.sec.node.forEach((n) => {
    if (n.type.name === "paragraph") paras.push(String(n.attrs.pid));
  });
  const at = paras.indexOf(pid);
  const sid = String(p.sec.node.attrs.sid);
  if (by < 0 && at > 0) moveParagraph(pid, sid, at - 1);
  else if (by > 0 && at < paras.length - 1) moveParagraph(pid, sid, at + 1);
  else if (by < 0 && i > 0) moveParagraph(pid, String(body[i - 1].node.attrs.sid), Number.MAX_SAFE_INTEGER);
  else if (by > 0 && i < body.length - 1) moveParagraph(pid, String(body[i + 1].node.attrs.sid), 0);
}

/* ---------- a drag on the page, from a paragraph's or a section's handle ---------- */
/** Starts a drag of a paragraph or section from its handle: the editor shows where it would land. */
export function startDrag(e: DragEvent, kind: "paragraph" | "section", id: string) {
  const view = EDITOR.view;
  if (!view || !canMove() || !e.dataTransfer) return;
  let node: PMNode | null = null;
  if (kind === "paragraph") node = paragraphAt(view.state.doc, id)?.node ?? null;
  else node = sectionsOf(view.state.doc).find((s) => s.node.attrs.sid === id)?.node ?? null;
  if (!node) return;
  view.dragging = { slice: new Slice(Fragment.from(node), 0, 0), move: true };
  DRAG.of = { kind, id };
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", node.textContent.slice(0, 200));
  const dom = view.nodeDOM(
    kind === "paragraph"
      ? (paragraphAt(view.state.doc, id)?.pos ?? 0)
      : (sectionsOf(view.state.doc).find((s) => s.node.attrs.sid === id)?.pos ?? 0),
  );
  if (dom instanceof HTMLElement) e.dataTransfer.setDragImage(dom, 0, 0);
}
const DRAG: { of: { kind: "paragraph" | "section"; id: string } | null } = { of: null };

/** A drop of a dragged part: where the editor would put it, made into a move. */
function dropped(view: EditorView, event: DragEvent, slice: Slice) {
  const drag = DRAG.of;
  DRAG.of = null;
  if (!drag) return false;
  const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
  if (!coords) return true;
  const { doc } = view.state;
  const at = dropPoint(doc, coords.pos, slice);
  if (at == null) return true;
  const $at = doc.resolve(at);
  if (drag.kind === "section") {
    if ($at.depth !== 0) return true;
    const body = sectionsOf(doc);
    const from = body.findIndex((s) => s.node.attrs.sid === drag.id);
    const before = body.filter((s) => s.pos < at).length;
    moveSection(drag.id, before > from ? before - 1 : before);
    return true;
  }
  const sec = $at.parent;
  if (sec.type.name !== "section" || sec.attrs.back) return true;
  let index = 0;
  for (let i = 0; i < $at.index(); i += 1) {
    const n = sec.child(i);
    if (n.type.name === "paragraph" && n.attrs.pid !== drag.id) index += 1;
  }
  moveParagraph(drag.id, String(sec.attrs.sid), index);
  return true;
}

/* ---------- the tables and figures after a move ---------- */
/** Each table and figure after the paragraph that first names it, where the paragraph is in a section you may change
 * and so is the exhibit; null when every one stands there already. */
export function placeExhibits(doc: PMNode, tr: Transaction): Transaction | null {
  const first = new Map<string, number>();
  const blocks: { node: PMNode; pos: number; sec: PMNode }[] = [];
  doc.forEach((sec, secPos) => {
    if (sec.type.name !== "section") return;
    sec.forEach((node, off) => {
      blocks.push({ node, pos: secPos + 1 + off, sec });
    });
  });
  blocks.forEach((b, i) => {
    if (b.node.type.name !== "paragraph") return;
    b.node.descendants((n) => {
      if (n.type.name === "exhibitRef" && !first.has(String(n.attrs.k))) first.set(String(n.attrs.k), i);
      return true;
    });
  });
  // Where each exhibit should stand: after its paragraph and the exhibits already after it, in the order named.
  const misplaced: { node: PMNode; pos: number; after: number }[] = [];
  blocks.forEach((b, i) => {
    if (b.node.type.name !== "exhibit") return;
    const owner = first.get(String(b.node.attrs.k));
    if (owner === undefined) return;
    let j = i - 1;
    while (j >= 0 && blocks[j].node.type.name === "exhibit" && blocks[j].sec === b.sec) j -= 1;
    if (j === owner && blocks[j].sec === b.sec) return;
    if (!handedOver(b.sec) || !handedOver(blocks[owner].sec)) return;
    misplaced.push({ node: b.node, pos: b.pos, after: owner });
  });
  if (!misplaced.length) return null;
  for (const m of [...misplaced].reverse()) tr.delete(tr.mapping.map(m.pos), tr.mapping.map(m.pos + m.node.nodeSize));
  for (const m of misplaced) {
    const owner = blocks[m.after];
    // After the paragraph and every exhibit that already follows it.
    let end = owner.pos + owner.node.nodeSize;
    for (let j = m.after + 1; j < blocks.length && blocks[j].node.type.name === "exhibit"; j += 1) {
      if (blocks[j].sec !== owner.sec || misplaced.some((x) => x.pos === blocks[j].pos)) break;
      end = blocks[j].pos + blocks[j].node.nodeSize;
    }
    tr.insert(tr.mapping.map(end, 1), m.node);
  }
  return tr;
}

/** The moves on the page: a drop from a handle becomes a move; after any change of yours each table and figure goes
 * after the paragraph that first names it; and the outline and numbers read the page again. */
export const Moves = Extension.create({
  name: "moves",
  addProseMirrorPlugins: () => [
    new Plugin({
      key: MOVE,
      props: {
        handleDrop: (view, event, slice) => dropped(view, event, slice),
      },
      appendTransaction(trs, _old, state) {
        if (!trs.some((t) => t.docChanged && !t.getMeta("logos-engine"))) return null;
        return placeExhibits(state.doc, state.tr);
      },
      view: (view) => {
        EDITOR.view = view;
        readOrder(view.state.doc);
        return {
          update: (v, prev) => {
            if (!prev.doc.eq(v.state.doc)) readOrder(v.state.doc);
          },
          destroy: () => {
            if (EDITOR.view === view) EDITOR.view = null;
          },
        };
      },
    }),
  ],
});
