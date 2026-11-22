/* ===== The paper as one document: its schema in the editor, and the way between it and the paper the run writes =====
   The document is the paper's own shape: the front (title, abstract, keywords), then each section, its heading, its
   paragraphs and, after the paragraph that first names it, each table and figure. A paragraph's words carry the
   sentence they belong to as a mark (its role, who wrote it, its text as the run wrote it), so the paper the document
   saves keeps every sentence, who wrote it and whether you changed it. A ledger value, a source, an exhibit's name and
   what only the authors can supply are chips: they move and go as one piece, and their words come from the run. */

import { type JSONContent, Mark, mergeAttributes, Node } from "@tiptap/core";

import { namedIn, type Piece, pieces } from "./draft-data";
import type { WrittenParagraph, WrittenSentence } from "./types";

/* ---------- the nodes ---------- */
/** The whole paper: its front, then its sections in order. */
export const PaperDoc = Node.create({ name: "doc", topNode: true, content: "front section*" });

export const Front = Node.create({
  name: "front",
  content: "paperTitle authors? abstract keywords",
  isolating: true,
  defining: true,
  /** "kept" once the title and abstract are taken; until then the run is still writing them. */
  addAttributes: () => ({ state: { default: "planned" } }),
  renderHTML: () => ["header", { "data-front": "" }, 0],
  parseHTML: () => [{ tag: "header[data-front]" }],
});
export const PaperTitle = Node.create({
  name: "paperTitle",
  content: "inline*",
  marks: "bold italic sentence",
  defining: true,
  renderHTML: () => ["h2", { "data-title": "" }, 0],
  parseHTML: () => [{ tag: "h2[data-title]" }],
});
/** The authors' line under the title: theirs to fill, as the printed paper leaves it. Never saved. */
export const Authors = Node.create({
  name: "authors",
  atom: true,
  selectable: false,
  renderHTML: () => ["p", { "data-authors": "" }],
  parseHTML: () => [{ tag: "p[data-authors]" }],
});
export const Abstract = Node.create({
  name: "abstract",
  content: "inline*",
  defining: true,
  renderHTML: () => ["div", { "data-abstract": "" }, ["p", 0]],
  parseHTML: () => [{ tag: "div[data-abstract]" }],
});
/** The keywords, as one line of text, a comma between two, as the printed paper lists them. */
export const Keywords = Node.create({
  name: "keywords",
  content: "text*",
  marks: "",
  defining: true,
  renderHTML: () => ["p", { "data-keywords": "" }, 0],
  parseHTML: () => [{ tag: "p[data-keywords]" }],
});

/** A section: its id, the state the run left it in, and its heading and paragraphs. */
export const Section = Node.create({
  name: "section",
  content: "sectionHeading (paragraph | exhibit)*",
  isolating: true,
  defining: true,
  addAttributes: () => ({
    sid: { default: "" },
    state: { default: "planned" },
    /** A statement after the body (data availability, AI use, declarations): unnumbered, as printed. */
    back: { default: false },
  }),
  renderHTML: ({ HTMLAttributes }) => [
    "section",
    mergeAttributes({ "data-sec": HTMLAttributes.sid, "data-state": HTMLAttributes.state }),
    0,
  ],
  parseHTML: () => [{ tag: "section[data-sec]" }],
});
export const SectionHeading = Node.create({
  name: "sectionHeading",
  content: "text*",
  marks: "",
  defining: true,
  renderHTML: () => ["h3", { "data-heading": "" }, 0],
  parseHTML: () => [{ tag: "h3[data-heading]" }],
});
/** A paragraph of the body, by its id in the outline (a paragraph you add gets one of its own). */
export const BodyParagraph = Node.create({
  name: "paragraph",
  content: "inline*",
  addAttributes: () => ({ pid: { default: "" } }),
  renderHTML: ({ HTMLAttributes }) => [
    "p",
    mergeAttributes({ "data-wpara": HTMLAttributes.pid, "data-cursor": `wpara:${HTMLAttributes.pid}` }),
    0,
  ],
  parseHTML: () => [{ tag: "p[data-wpara]", getAttrs: (el) => ({ pid: el.getAttribute("data-wpara") ?? "" }) }],
});
/** A table or figure, set after the paragraph that first names it. The document places it; it is never saved. */
export const ExhibitNode = Node.create({
  name: "exhibit",
  atom: true,
  selectable: false,
  draggable: false,
  addAttributes: () => ({ k: { default: "" }, n: { default: "" } }),
  renderHTML: ({ HTMLAttributes }) => ["figure", { "data-exhibit": HTMLAttributes.k }],
  parseHTML: () => [{ tag: "figure[data-exhibit]" }],
});

/* ---------- the chips ---------- */
const chip = (name: string, attrs: Record<string, { default: unknown }>) =>
  Node.create({
    name,
    group: "inline",
    inline: true,
    atom: true,
    selectable: true,
    addAttributes: () => attrs,
    renderHTML: ({ HTMLAttributes }) => ["span", mergeAttributes({ "data-chip": name }, HTMLAttributes)],
    parseHTML: () => [{ tag: `span[data-chip="${name}"]` }],
  });
export const ValueChip = chip("ledgerValue", { k: { default: "" }, form: { default: null } });
export const CiteChip = chip("cite", { keys: { default: "" }, named: { default: "" } });
export const ExhibitChip = chip("exhibitRef", { k: { default: "" } });
export const AuthorChip = chip("authorSlot", { text: { default: "" } });

/* ---------- the sentence a run of words belongs to ---------- */
export interface SentenceAttrs {
  /** `<paragraph id>.s<n>`: the sentence as the run wrote it; `u<n>` for one you wrote. */
  sid: string;
  role: string;
  origin: string;
  check: string;
  /** The statements it carries, joined by a space. */
  statements: string;
  /** Its text as the run wrote it: the document tells your change from it. */
  base: string;
  /** When you first changed it, once a save has recorded that. */
  at: string;
}
export const SentenceMark = Mark.create({
  name: "sentence",
  inclusive: true,
  excludes: "sentence",
  addAttributes: () => ({
    sid: { default: "" },
    role: { default: "" },
    origin: { default: "model" },
    check: { default: "pending" },
    statements: { default: "" },
    base: { default: "" },
    at: { default: "" },
  }),
  renderHTML: ({ HTMLAttributes }) => [
    "span",
    { "data-sentence": HTMLAttributes.sid, "data-origin": HTMLAttributes.origin },
    0,
  ],
  parseHTML: () => [{ tag: "span[data-sentence]" }],
});

/* ---------- from the run's paper to the document ---------- */
type MarkJ = { type: string; attrs?: Record<string, unknown> };
/** Markdown emphasis in a sentence's words, as the document's marks. */
const INLINE = /(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*\s](?:[^*]*[^*\s])?\*|`[^`]+`|~[^~\s]+~|\^[^^\s]+\^)/;
const FORMAT: [RegExp, string[]][] = [
  [/^\*\*\*([\s\S]+)\*\*\*$/, ["bold", "italic"]],
  [/^\*\*([\s\S]+)\*\*$/, ["bold"]],
  [/^\*([\s\S]+)\*$/, ["italic"]],
  [/^`([\s\S]+)`$/, ["code"]],
  [/^~([\s\S]+)~$/, ["subscript"]],
  [/^\^([\s\S]+)\^$/, ["superscript"]],
];
function textNodes(text: string, marks: MarkJ[]): JSONContent[] {
  const out: JSONContent[] = [];
  for (const part of text.split(INLINE)) {
    if (!part) continue;
    const f = FORMAT.find(([re]) => re.test(part));
    if (f)
      out.push({ type: "text", text: part.replace(f[0], "$1"), marks: [...marks, ...f[1].map((type) => ({ type }))] });
    else out.push({ type: "text", text: part, ...(marks.length ? { marks } : {}) });
  }
  return out;
}
function pieceNode(p: Piece, marks: MarkJ[], named: (k: string) => boolean): JSONContent[] {
  const m = marks.length ? { marks } : {};
  if (p.k === "text") return textNodes(p.text, marks);
  if (p.k === "value") return [{ type: "ledgerValue", attrs: { k: p.key, form: p.form ?? null }, ...m }];
  if (p.k === "exhibit") return [{ type: "exhibitRef", attrs: { k: p.key }, ...m }];
  if (p.k === "cite")
    return [{ type: "cite", attrs: { keys: p.keys.join(";"), named: p.keys.filter(named).join(";") }, ...m }];
  return [{ type: "authorSlot", attrs: { text: p.text }, ...m }];
}
/** A run of words in the document's nodes, each carrying `marks` (its sentence). */
export function inlineOf(text: string, marks: MarkJ[] = []) {
  const named = namedIn(text);
  const out: JSONContent[] = [];
  for (const p of pieces(text)) {
    const nodes = pieceNode(p, marks, named);
    // A source cited only by name leaves no brackets, and no space before where they were.
    const prev = out.at(-1);
    if (p.k === "cite" && p.keys.every(named) && prev?.type === "text" && prev.text) {
      prev.text = prev.text.trimEnd();
      if (!prev.text) out.pop();
    }
    out.push(...nodes);
  }
  return out;
}

export function sentenceAttrs(pid: string, i: number, s: WrittenSentence): SentenceAttrs {
  return {
    sid: `${pid}.s${i + 1}`,
    role: s.role,
    origin: s.origin,
    check: s.check,
    statements: s.statements.join(" "),
    // A sentence you changed in a saved version keeps what it said first, so the page still tells your words.
    base: s.edited?.from_text ?? s.text,
    at: s.edited?.at ?? "",
  };
}
/** A paragraph as the document holds it, its first `upTo` sentences (the rest are still being written). */
export function paragraphNode(
  p: WrittenParagraph,
  upTo = p.sentences.length,
  show: (text: string) => string = (t) => t,
): JSONContent {
  const content: JSONContent[] = [];
  for (const [i, s] of p.sentences.slice(0, upTo).entries()) {
    if (i > 0) content.push({ type: "text", text: " " });
    // Shown as the paper prints it; the sentence keeps what the run stored, to tell a change of yours from it.
    content.push(
      ...inlineOf(show(s.text.trim()), [{ type: "sentence", attrs: { ...sentenceAttrs(p.paragraph_id, i, s) } }]),
    );
  }
  return { type: "paragraph", attrs: { pid: p.paragraph_id }, ...(content.length ? { content } : {}) };
}

/* ---------- from the document back to the paper ---------- */
const WRAP: Record<string, [string, string]> = {
  bold: ["**", "**"],
  italic: ["*", "*"],
  code: ["`", "`"],
  subscript: ["~", "~"],
  superscript: ["^", "^"],
};
/** A node of a paragraph in the paper's own text: its words with their emphasis, or its chip as the run marks it. */
export function written(n: JSONContent): string {
  if (n.type === "text") {
    const raw = n.text ?? "";
    // Emphasis wraps the words, never the spaces at their edges, so it reads back as emphasis.
    const core = raw.trim();
    const lead = raw.slice(0, raw.length - raw.trimStart().length);
    const tail = raw.slice(raw.trimEnd().length);
    if (!core) return raw;
    const names = (n.marks ?? []).map((m) => m.type);
    let t = core;
    if (names.includes("bold") && names.includes("italic")) t = `***${t}***`;
    else if (names.includes("bold")) t = `**${t}**`;
    else if (names.includes("italic")) t = `*${t}*`;
    for (const name of ["code", "subscript", "superscript"]) {
      const w = WRAP[name];
      if (names.includes(name)) t = `${w[0]}${t}${w[1]}`;
    }
    return lead + t + tail;
  }
  const a = n.attrs ?? {};
  if (n.type === "ledgerValue") return `{{${a.k}${a.form ? `|${a.form}` : ""}}}`;
  if (n.type === "exhibitRef") return `{{${a.k}}}`;
  if (n.type === "cite")
    return ` [${String(a.keys)
      .split(";")
      .filter(Boolean)
      .map((k) => `@${k}`)
      .join("; ")}]`;
  if (n.type === "authorSlot") return `[[To be completed by the authors: ${a.text}]]`;
  return "";
}
export interface SavedSentence extends WrittenSentence {
  sid: string;
  base: string;
  at: string;
}
/** Where a sentence ends, as the printed paper finds it: a full stop, question or exclamation mark, then a space and a
 * capital or a citation; never inside "et al.", "e.g." or "i.e.". */
export const ENDS = /(?<!\bal)(?<!\be\.g)(?<!\bi\.e)(?<=[.!?])\s+(?=[A-Z[])/;
const ENDED = /[.!?]["”’)]*\s*$/;
/**
 * A paragraph of the document as the paper's sentences: each run of words of one sentence, in order. Words typed
 * outside every sentence become sentences of their own, yours; words typed right before a sentence, with no full
 * stop between, open it, and words typed right after one, before any new sentence starts, end it.
 */
export function sentencesOf(p: JSONContent): SavedSentence[] {
  const out: SavedSentence[] = [];
  let loose = "";
  let own = 0;
  const mine = (text: string) => {
    own += 1;
    out.push({ sid: `u${own}`, text, role: "", origin: "user", check: "pending", statements: [], base: "", at: "" });
  };
  /** The words outside any sentence so far; what does not end a sentence of its own is handed back. */
  const flush = (before: boolean) => {
    const parts = loose.split(ENDS).filter((x) => x.trim());
    loose = "";
    const last = parts.at(-1);
    const open = before && last !== undefined && !ENDED.test(last) ? (parts.pop() ?? "") : "";
    for (const t of parts) mine(t.trim());
    return open;
  };
  for (const n of p.content ?? []) {
    const mark = n.marks?.find((m) => m.type === "sentence");
    const a = mark?.attrs as SentenceAttrs | undefined;
    if (!a) {
      const prev = out.at(-1);
      const words = written(n);
      // Right after a sentence that has not ended, the words go on with it.
      if (!loose && prev && prev.origin !== "user" && !ENDED.test(prev.text)) prev.text += words;
      else loose += words;
      continue;
    }
    const opening = loose.trim() ? flush(true) : "";
    loose = "";
    const last = out.at(-1);
    if (last && last.sid === a.sid) last.text += written(n);
    else
      out.push({
        sid: a.sid,
        text: opening + written(n),
        role: a.role,
        origin: (a.origin as WrittenSentence["origin"]) || "model",
        check: a.check,
        statements: a.statements ? a.statements.split(" ") : [],
        base: a.base,
        at: a.at,
      });
  }
  if (loose.trim()) flush(false);
  // A citation is written with the space before it, which the words before it may already have.
  return out.map((s) => ({ ...s, text: s.text.replace(/ {2,}\[@/g, " [@").trim() })).filter((s) => s.text);
}
