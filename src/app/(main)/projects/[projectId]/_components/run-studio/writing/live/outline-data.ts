/* ===== What the journal and outline screens read from a run's files, in words =====
   The story and the tree name statements, values, sources and exhibits by id. These helpers give each id its words:
   a statement its approved wording, a warrant or an objection of the story its text, a value its printed form, a
   source its title, an exhibit its number and title. Nothing here is written by the screen itself. */

import { ENTITY } from "../data/meta";
import { file, fill, LIVE, newest, printed, statement } from "./run";
import type { ManuscriptTreeDraftFile, Scorecard, TreeParagraph, TreeSection } from "./types";

/** The lists the two screens stream, counted in `S.n`. */
export const L = {
  rules: "o8.rules",
  place: "o8.place",
  tmap: "o8.tmap",
  budget: "o8.budget",
  sent: "o8.sent",
  lines: "o8.lines",
  point: "o9.point",
  story: "o9.story",
  beats: "o9.beats",
  reasons: "o9.reasons",
  title: "o9.title",
  sec: "o9.sec",
  moves: "o9.moves",
  checks9: "o9.checks",
  para: "o10.para",
  sentence: "o10.sentence",
  compare: "o10.compare",
  risk: "o10.risk",
  checks10: "o10.checks",
};

/** Ids in the order a reader counts them: H2 before H10. */
export const byId = (a: string, b: string) => a.localeCompare(b, "en", { numeric: true });
/** Words joined as a sentence lists them: "a", "a and b", "a, b and c". */
export const joined = (xs: string[]) =>
  xs.length < 2 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
/** A count with its noun. */
export const plural = (x: number, one: string, many = `${one}s`) =>
  `${x.toLocaleString("en-US")} ${x === 1 ? one : many}`;

/* ---------- words for ids ---------- */
/**
 * The story the screen shows: the checked story, or the draft the Planner sends after each story call (with the other
 * stories it tried), whichever came last.
 */
export function storyPlan() {
  const draft = file("StoryPlanDraft.json");
  if (draft && newest("StoryPlanDraft.json", "StoryPlan.json") === "StoryPlanDraft.json") return { plan: draft, draft };
  const plan = file("StoryPlan.json");
  return plan ? { plan, draft: null } : undefined;
}
const STORY = () => storyPlan()?.plan;
/** A warrant the story states for a claim (W-<claim>), or an objection it acknowledges (ACK-<exchange>). */
export const warrantOf = (id: string) =>
  id.startsWith("W-") ? STORY()?.warrants.find((w) => w.claim_id === id.slice(2)) : undefined;
export const ackOf = (id: string) =>
  id.startsWith("ACK-") ? STORY()?.acknowledgments.find((a) => a.exchange_id === id.slice(4)) : undefined;

/** The type of what an id names: a statement's type, or the warrant or acknowledgment the story adds. */
export function typeOf(id: string) {
  const st = statement(id);
  if (st) return st.type;
  if (warrantOf(id)) return "warrant";
  if (ackOf(id)) return "acknowledgment";
  return null;
}
/** What an id says, in its approved words with its numbers filled; an objection with its answer. */
export function wordsOf(id: string): string | null {
  const st = statement(id);
  if (st) return fill(st.approved_text || st.text);
  const w = warrantOf(id);
  if (w) return fill(w.text);
  const a = ackOf(id);
  if (a) return `${a.objection} ${a.answer}`;
  return null;
}

/* ---------- statement types, as the fourth axis tags them ---------- */
const ENTITY_OF: Record<string, string> = {
  background: "BACKGROUND",
  gap: "GAP",
  question: "RQ",
  objective: "OBJECTIVE",
  hypothesis: "HYPOTHESIS",
  assumption: "ASSUMPTION",
  finding: "FINDING",
  conclusion: "CONCLUSION",
  implication: "IMPLICATION",
  comparison: "COMPARISON",
  limitation: "LIMITATION",
  warrant: "WARRANT",
};
/* The types the fourth-axis table has no tile for. */
const OWN_TYPE: Record<string, { tag: string; name: string; chip: string }> = {
  note: { tag: "N", name: "Note", chip: "bg-zinc-500/12 text-zinc-700 dark:text-zinc-300" },
  acknowledgment: { tag: "ACK", name: "Acknowledgment", chip: "bg-sky-500/12 text-sky-700 dark:text-sky-300" },
};
const words = (s: string) => s.replace(/[_-]+/g, " ");
export const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
/** A statement type's tag, name and chip colour. */
export function typeChip(type: string) {
  const e = ENTITY[ENTITY_OF[type] ?? ""];
  if (e) return { tag: e.tag, name: e.name, chip: e.chip };
  return (
    OWN_TYPE[type] ?? {
      tag: type.slice(0, 3).toUpperCase(),
      name: cap(words(type)),
      chip: "bg-muted text-muted-foreground",
    }
  );
}
/** The order the paper meets each type in. */
export const TYPE_ORDER = [
  "background",
  "gap",
  "question",
  "objective",
  "hypothesis",
  "assumption",
  "note",
  "finding",
  "conclusion",
  "implication",
  "comparison",
  "warrant",
  "acknowledgment",
  "limitation",
];
export const byTypeOrder = (a: string, b: string) => {
  const i = (t: string) => (TYPE_ORDER.includes(t) ? TYPE_ORDER.indexOf(t) : TYPE_ORDER.length);
  return i(a) - i(b);
};

/* ---------- sections ---------- */
/** A section's heading, as the journal contract names it. */
export function heading(sectionId: string) {
  const sec = file("JournalWritingContract.json")?.rules.sections.find((s) => s.section_id === sectionId);
  return sec?.heading ?? cap(words(sectionId));
}
export const fmtWords = (w?: number[] | null) =>
  w?.length === 2 ? `${w[0].toLocaleString("en-US")}–${w[1].toLocaleString("en-US")} words` : "";
export const moveName = (m: string) => words(m);

/* ---------- values, sources, exhibits ---------- */
export const isExhibit = (key: string) => key.startsWith("tab:") || key.startsWith("fig:");
/** A ledger value's label, as the evidence ledger writes it. */
export const labelOf = (key: string) => file("EvidenceLedger.json")?.ledger.find((v) => v.key === key)?.label ?? "";
export const printedOf = (key: string) => printed(key);
/** A source by its key: its title, from the evidence ledger's references. */
export const sourceOf = (key: string) => file("EvidenceLedger.json")?.references.find((r) => r.key === key);

/* The engine's titles of the two tables it builds from the record (figures carry their own, in the package). */
const TABLE_TITLE: Record<string, string> = {
  "tab:main": "The planned comparisons, their robustness checks and the sensitivity analysis",
  "tab:models": "Each model's mean over the runs, by metric",
};
export function exhibitTitle(key: string) {
  if (key.startsWith("fig:")) {
    const f = file("experiment_result.json")?.figures.find((x) => x.figure_id === key.slice(4));
    return f?.title ?? key.slice(4);
  }
  return TABLE_TITLE[key] ?? key.slice(4);
}
/** Each exhibit's number in the paper: tables and figures count up in the order a sentence first names them. */
export function exhibitNumbers(): Record<string, string> {
  const order: string[] = [];
  for (const s of paperTree()?.sections ?? [])
    for (const p of s.paragraphs)
      for (const x of p.sentences) for (const k of x.keys) if (isExhibit(k) && !order.includes(k)) order.push(k);
  for (const s of file("ManuscriptBlueprint.json")?.sections ?? [])
    for (const k of s.exhibits) if (!order.includes(k)) order.push(k);
  const n = { tab: 0, fig: 0 };
  return Object.fromEntries(
    order.map((k) => {
      const kind = k.startsWith("tab:") ? "tab" : "fig";
      n[kind] += 1;
      return [k, `${kind === "tab" ? "Table" : "Figure"} ${n[kind]}`];
    }),
  );
}

export function cardOf(id: string) {
  return file("evidence.json")?.cards.find((c) => c.card_id === id);
}

/* ---------- the tree ---------- */
/** Every paragraph of the tree in order, with its section, its number on the page and its first sentence's index. */
export function treeParagraphs(tree: { sections: TreeSection[] } | undefined) {
  const out: { sec: string; n: string; p: TreeParagraph; first: number; index: number }[] = [];
  // Numbered by the outline's sections: a draft holds only the sections planned so far.
  const order = file("ManuscriptBlueprint.json")?.sections.map((s) => s.section_id) ?? [];
  let first = 0;
  (tree?.sections ?? []).forEach((s, i) => {
    const si = order.includes(s.template) ? order.indexOf(s.template) : i;
    s.paragraphs.forEach((p, pi) => {
      out.push({ sec: s.template, n: `${si + 1}.${pi + 1}`, p, first, index: out.length });
      first += p.sentences.length;
    });
  });
  return out;
}
/** A paragraph's number on the page by its id, for the scorecards that name paragraphs by id. */
export function paraNumber(id: string) {
  return treeParagraphs(paperTree()).find((x) => x.p.paragraph_id === id)?.n;
}
/**
 * The paper tree the page shows: the checked tree, or the draft the planner sends section by section before the
 * paragraphs check, whichever came last (a note at the check plans the sections again, from the first).
 */
export function paperTree(): { sections: TreeSection[]; draft: ManuscriptTreeDraftFile | null } | undefined {
  const which = newest("ManuscriptTreeDraft.json", "ManuscriptTree.json");
  const draft = file("ManuscriptTreeDraft.json");
  if (which === "ManuscriptTreeDraft.json" && draft) return { sections: draft.sections, draft };
  const tree = file("ManuscriptTree.json");
  return tree ? { sections: tree.sections, draft: null } : undefined;
}
/** The risk at which the engine counts a paragraph as high risk. */
export const HIGH_RISK = 6;

/* ---------- checkpoints ---------- */
/* What each rule of a checkpoint checks, as the engine's checks define it. */
export const RULE_TEXT: Record<string, string> = {
  "ocar-slots": "The story's four places hold only statements of the plan",
  "ocar-filled": "Every place of the story is filled",
  "question-first": "The question comes before the objective",
  width: "The end comes back to the opening's key terms",
  "evidence-under-reason": "Every reason has evidence of the record under it",
  story: "The story was planned without a warning",
  "story-choice": "Nothing the check of the story found is left open",
  "sections-required": "Every required section is there",
  "no-duplicate-section": "No section is planned twice",
  "anchors-in-plan": "Each section holds only statements of the locked plan",
  "outline-rules": "Nothing the check of the outline found is left open",
  alignment: "The question, the method and the results measure the same thing",
  "edit-refused": "Every edit asked for could be applied",
  "moves-of-required-sections": "Every required section has its moves",
  "every-convention-has-a-source": "Every convention names where it comes from",
  "word-ranges": "Every word range runs from a lower to a higher count",
  "every-statement-type-has-a-home": "Every type of statement has a section that takes it",
  "choices-allowed": "Every choice of the frame is one it allows",
  "every-statement-has-a-section": "Every statement of the argument has a section",
  "every-move-has-content": "Every required move has something to carry",
  "comparison-has-sources": "A comparison with prior work has sources",
  "argument-role": "Every paragraph does something for the argument",
  "group-terms": "Each hypothesis's paragraphs have a term of their own",
  "opening-pace": "The Introduction opens at the reader's pace",
  "slot-coverage": "Every slot of the section skeletons is planned",
  "shape-position": "Each point stands where its paragraph's shape lets it",
  "paragraph-anchors": "Each paragraph carries only its section's statements",
  arcs: "Each statement is carried by one paragraph of its section",
  "key-terms": "Every paragraph carries a key term",
  "author-facts": "No paragraph waits on a fact the authors must complete",
  "term-allocation": "Each term to define is defined in one place",
  "policy-hard": "No hard word policy is set aside",
  grounded: "Every sentence carries only what its paragraph may",
  "link-in": "Paragraphs pick up a term the one before ended on",
};
/** Each checkpoint in words, its key after it. */
export const CHECKPOINT_TITLE: Record<string, string> = {
  F: "Writing frame check (F)",
  J: "Join check (J)",
  P2: "Story check (P2)",
  P3: "Sections check (P3)",
  P4: "Paragraphs check (P4)",
  P5: "Sentences check (P5)",
};
/** A checkpoint's scorecard: its file, or what the run reported when it scored it. */
export function scorecardOf(k: string): Scorecard | undefined {
  const name = `Scorecard_${k}.json` as "Scorecard_P2.json";
  const f = file(name);
  if (f) return f;
  const ev = LIVE.checkpoints[k];
  return ev
    ? {
        checkpoint: k,
        h_failed: ev.h_failed,
        m_score: ev.m_score,
        rows: ev.rows.map((r) => ({ ...r, measure: null, threshold: null })),
      }
    : undefined;
}
/** The rules of a scorecard, one entry per rule: the problems each found, where. */
export function ruleGroups(card: Scorecard) {
  const out: {
    rule: string;
    kind: string;
    book: string;
    passed: boolean;
    hits: { locator: string; note: string }[];
  }[] = [];
  for (const r of card.rows) {
    let g = out.find((x) => x.rule === r.rule);
    if (!g) {
      g = { rule: r.rule, kind: r.kind, book: r.book_ref, passed: true, hits: [] };
      out.push(g);
    }
    if (!r.passed) {
      g.passed = false;
      g.hits.push({ locator: r.locator, note: r.note });
    }
  }
  return out;
}
