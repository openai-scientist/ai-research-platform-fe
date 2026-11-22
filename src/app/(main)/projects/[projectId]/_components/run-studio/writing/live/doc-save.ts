/* ===== The paper as you edit it: what is saved, which version it is, and what the check found =====
   Each save is a version of the paper made from the last one; the run's own paper is version 0. A save carries every
   section the run has handed over (kept, or written by code), each sentence with who wrote it and, once you changed
   it, when and what it said before. After a save, the sections it changed are checked again by the writing engine on
   the rules their stage held them to: what breaks is shown where it breaks, and nothing is refused. */

import type { JSONContent } from "@tiptap/core";
import { toast } from "sonner";

import {
  type DocChange,
  type DocCheckRow,
  type DocOrderRow,
  type DocPaper,
  type DocSection,
  type DocSentence,
  fetchDocument,
} from "@/lib/api/services/fetch-document";
import { fetchProject } from "@/lib/api/services/fetch-project";
import { getProjectAccess } from "@/lib/auth/project-access";
import { ApiError } from "@/types/api";

import { bodySections } from "./doc-order";
import { storedText } from "./doc-print";
import { type SavedSentence, sentencesOf, written } from "./doc-schema";
import { LIVE } from "./run";

interface Saved {
  run: string;
  n: number;
  paper: DocPaper | null;
  loaded: boolean;
  saving: boolean;
  dirty: boolean;
  checking: boolean;
  checks: Record<string, DocCheckRow[]>;
  order: DocOrderRow[];
  editedAt: Record<string, string>;
  savedAt: string | null;
  /** Whether you may change this project's paper: a project manager or researcher, the project not archived. */
  canWrite: boolean;
  version: number;
  listeners: Set<() => void>;
}
export const SAVED: Saved = {
  run: "",
  /** The version on screen: 0 is the run's own paper. */
  n: 0,
  paper: null as DocPaper | null,
  loaded: false,
  saving: false,
  /** A change not saved yet. */
  dirty: false,
  checking: false,
  /** What the check found after your last save, by section. */
  checks: {} as Record<string, DocCheckRow[]>,
  /** What the paper's order broke at the last check after a move, wherever it breaks. */
  order: [] as DocOrderRow[],
  /** When you first changed each sentence, by its id, until a save records it. */
  editedAt: {} as Record<string, string>,
  savedAt: null as string | null,
  canWrite: false,
  version: 0,
  listeners: new Set<() => void>(),
};
export function told() {
  SAVED.version += 1;
  for (const l of SAVED.listeners) l();
}

/** The paper as last saved, once per run. */
export async function loadSaved() {
  if (SAVED.run === LIVE.runId && SAVED.loaded) return;
  cancelSave();
  const run = LIVE.runId;
  Object.assign(SAVED, {
    run,
    n: 0,
    paper: null,
    loaded: false,
    checks: {},
    order: [],
    editedAt: {},
    canWrite: false,
  });
  try {
    const [latest, project] = await Promise.all([
      fetchDocument.latest(LIVE.projectId, run),
      fetchProject.getById(LIVE.projectId),
    ]);
    if (SAVED.run !== run) return;
    if (latest.data)
      Object.assign(SAVED, { n: latest.data.n, paper: latest.data.paper, savedAt: latest.data.created_at });
    const p = project.data;
    SAVED.canWrite = Boolean(p && getProjectAccess(p.my_role, p.status).canWrite);
  } catch {
    // A run the Platform has no saved paper for reads as the run wrote it, and is not changed.
  }
  SAVED.loaded = true;
  told();
}

/* ---------- the document as the paper ---------- */
const textOf = (n: JSONContent | undefined): string => n?.text ?? (n?.content ?? []).map((c) => textOf(c)).join("");

function sentenceOut(s: SavedSentence): DocSentence {
  // A sentence you left as the page shows it is saved as the run stored it.
  const text = storedText(s.text);
  const out: DocSentence = {
    text,
    role: s.role || "evidence",
    origin: s.origin,
    check: s.check,
    statements: s.statements,
  };
  if (s.origin !== "user" && s.base && text !== s.base) {
    SAVED.editedAt[s.sid] ??= s.at || new Date().toISOString();
    out.edited = {
      by: "user",
      at: SAVED.editedAt[s.sid],
      from_text: s.base,
      from_origin: s.origin,
    };
  }
  return out;
}

/** The paper as the document holds it: the front, each section the run has handed over, and the statements after
 * the body. */
export function paperOf(doc: JSONContent): DocPaper {
  const front = doc.content?.find((n) => n.type === "front");
  const part = (type: string) => front?.content?.find((n) => n.type === type);
  const abstract = part("abstract");
  const sections: DocSection[] = [];
  const back: DocSection[] = [];
  for (const sec of doc.content ?? []) {
    if (sec.type !== "section" || !["kept", "code"].includes(String(sec.attrs?.state))) continue;
    const heading = sec.content?.find((n) => n.type === "sectionHeading");
    const section = {
      section_id: String(sec.attrs?.sid).replace(/^back:/, ""),
      heading: storedText(textOf(heading)),
      paragraphs: (sec.content ?? [])
        .filter((n) => n.type === "paragraph")
        .map((p) => ({ paragraph_id: String(p.attrs?.pid), sentences: sentencesOf(p).map(sentenceOut) }))
        .filter((p) => p.sentences.length),
    };
    (sec.attrs?.back ? back : sections).push(section);
  }
  return {
    title: storedText((part("paperTitle")?.content ?? []).map(written).join("").trim()),
    abstract: storedText(
      abstract
        ? sentencesOf(abstract)
            .map((s) => s.text)
            .join(" ")
        : "",
    ),
    keywords: textOf(part("keywords"))
      .split(",")
      .map((k) => storedText(k.trim()))
      .filter(Boolean),
    sections,
    back_matter: back,
  };
}

/** What a save changes, against the paper before it. */
export function changesOf(before: DocPaper | null, after: DocPaper): DocChange[] {
  const out: DocChange[] = [];
  if (
    before &&
    (before.title !== after.title ||
      before.abstract !== after.abstract ||
      before.keywords.join() !== after.keywords.join())
  )
    out.push({ kind: "front_edited", where: "front" });
  const all = (p: DocPaper | null) => [...(p?.sections ?? []), ...(p?.back_matter ?? [])];
  const old = new Map(all(before).map((s) => [s.section_id, s]));
  const order = (xs: DocSection[]) => xs.map((s) => s.section_id).filter((id) => old.has(id));
  if (
    before &&
    order(after.sections).join() !==
      order(before.sections.filter((s) => after.sections.some((x) => x.section_id === s.section_id))).join()
  )
    out.push({
      kind: "section_moved",
      where: "sections",
      note: `Sections now in the order ${after.sections.map((s) => s.heading).join(", ")}`.slice(0, 400),
    });
  // Each paragraph where it stood before, in whichever section.
  const was = new Map(all(before).flatMap((s) => s.paragraphs.map((p) => [p.paragraph_id, { p, s }] as const)));
  const now = new Set(all(after).flatMap((s) => s.paragraphs.map((p) => p.paragraph_id)));
  for (const pid of was.keys()) if (!now.has(pid)) out.push({ kind: "paragraph_removed", where: pid });
  for (const sec of all(after)) {
    const prior = old.get(sec.section_id);
    if (!prior) continue;
    if (prior.heading !== sec.heading) out.push({ kind: "heading_edited", where: sec.section_id });
    const stayed = sec.paragraphs.map((p) => p.paragraph_id).filter((id) => was.get(id)?.s === prior);
    if (
      stayed.join() !==
      prior.paragraphs
        .map((p) => p.paragraph_id)
        .filter((id) => stayed.includes(id))
        .join()
    )
      out.push({ kind: "paragraph_moved", where: sec.section_id, note: `Paragraphs reordered in ${sec.heading}` });
    for (const p of sec.paragraphs) {
      const from = was.get(p.paragraph_id);
      if (!from) {
        out.push({ kind: "paragraph_added", where: p.paragraph_id });
        continue;
      }
      if (from.s !== prior)
        out.push({
          kind: "paragraph_moved",
          where: p.paragraph_id,
          note: `Paragraph moved from ${from.s.heading} to ${sec.heading}`,
        });
      const prev = from.p;
      const texts = new Set(prev.sentences.map((s) => s.text));
      const kept = new Set(p.sentences.map((s) => s.text));
      p.sentences.forEach((s, i) => {
        if (texts.has(s.text)) return;
        out.push({
          kind: s.origin === "user" ? "sentence_added" : "sentence_edited",
          where: `${p.paragraph_id}.s${i + 1}`,
        });
      });
      if (prev.sentences.some((s) => !kept.has(s.text)) && prev.sentences.length > p.sentences.length)
        out.push({ kind: "sentence_removed", where: p.paragraph_id });
    }
  }
  return out;
}

/** The sections a save changed, for the check. */
const changedSections = (before: DocPaper | null, after: DocPaper) =>
  after.sections.filter((s) => {
    const was = before?.sections.find((x) => x.section_id === s.section_id);
    return !was || comparable({ ...after, sections: [was] }) !== comparable({ ...after, sections: [s] });
  });

/** Checks the sections a save changed on the rules of their stages, and the whole paper on its order: a section or
 * paragraph moved, a sentence that names a section by number, a term met before it is defined. */
async function check(sections: DocSection[], paper: DocPaper) {
  if (!sections.length && !paper.sections.length) return;
  SAVED.checking = true;
  told();
  try {
    const found = (
      await fetchDocument.check(LIVE.projectId, LIVE.runId, {
        sections,
        paper: paper.sections,
        order: bodySections().map((s) => s.sid),
      })
    ).data;
    for (const s of found.sections) SAVED.checks[s.section_id] = s.rows;
    SAVED.order = found.order ?? [];
  } catch (error) {
    toast.error(error instanceof ApiError ? error.message : "The paper could not be checked.");
  } finally {
    SAVED.checking = false;
    told();
  }
}

/** A paper as compared for a change: what the Platform adds or rewrites on saving (an empty back matter, the time
 * written to the millisecond) does not count as one. */
function comparable(paper: DocPaper | null) {
  if (!paper) return "";
  return JSON.stringify({
    ...paper,
    back_matter: paper.back_matter ?? [],
    sections: paper.sections.map((s) => ({
      ...s,
      paragraphs: s.paragraphs.map((p) => ({
        ...p,
        sentences: p.sentences.map((x) => ({ ...x, edited: x.edited ? { ...x.edited, at: undefined } : undefined })),
      })),
    })),
  });
}

/** The save waiting for you to stop typing, and the one waiting for a save in flight to end. */
let pending = 0;
let queued: { doc: JSONContent; base: DocPaper | null; run: string } | null = null;
export function cancelSave() {
  window.clearTimeout(pending);
  queued = null;
}
/** Saves after a pause in your typing, for the run you changed. */
export function saveSoon(doc: JSONContent, base: DocPaper | null, onStale: (paper: DocPaper) => void) {
  SAVED.dirty = true;
  told();
  const run = LIVE.runId;
  window.clearTimeout(pending);
  pending = window.setTimeout(() => void save({ doc, base, run }, onStale), 1500);
}

/**
 * Saves the paper as the document held it, made from the version on screen; then checks the sections it changed.
 * `base`: the paper before (the last save, else the run's own). A save made while another is in flight waits for it.
 * A save another tab made first is not overwritten: the latest version is read back, and `onStale` puts it on the
 * page.
 */
async function save(req: { doc: JSONContent; base: DocPaper | null; run: string }, onStale: (paper: DocPaper) => void) {
  // Your change belongs to the run you made it on, never to one opened since.
  if (req.run !== LIVE.runId || req.run !== SAVED.run || !SAVED.canWrite) return;
  if (SAVED.saving) {
    queued = req;
    return;
  }
  const paper = paperOf(req.doc);
  const before = SAVED.paper ?? req.base;
  // A section the page does not hold whole now (a run played back) is saved as it was, where it was.
  for (const [i, sec] of (before?.sections ?? []).entries())
    if (!paper.sections.some((x) => x.section_id === sec.section_id))
      paper.sections.splice(Math.min(i, paper.sections.length), 0, sec);
  // Nothing of yours differs from the paper before: there is nothing to save.
  if (before && comparable(before) === comparable(paper)) {
    SAVED.dirty = false;
    told();
    return;
  }
  const changes = changesOf(before, paper);
  SAVED.saving = true;
  told();
  let checkAfter: { sections: DocSection[]; paper: DocPaper } | null = null;
  try {
    const v = (await fetchDocument.save(LIVE.projectId, req.run, { base_n: SAVED.n, paper, changes })).data;
    if (!v || SAVED.run !== req.run) return;
    Object.assign(SAVED, { n: v.n, paper: v.paper, dirty: queued !== null, savedAt: v.created_at });
    checkAfter = { sections: changedSections(before, paper), paper };
  } catch (error) {
    queued = null;
    if (error instanceof ApiError && error.code === "DOCUMENT_CHANGED") {
      const latest = (await fetchDocument.latest(LIVE.projectId, req.run)).data;
      if (latest && SAVED.run === req.run) {
        Object.assign(SAVED, { n: latest.n, paper: latest.paper, dirty: false, savedAt: latest.created_at });
        onStale(latest.paper);
      }
      toast.warning("The paper was saved somewhere else first", {
        description: "Its latest version is on the page now. Make your change again on it.",
      });
    } else toast.error(error instanceof ApiError ? error.message : "The paper could not be saved.");
  } finally {
    SAVED.saving = false;
    told();
  }
  const next = queued;
  queued = null;
  if (next) await save(next, onStale);
  else if (checkAfter) await check(checkAfter.sections, checkAfter.paper);
}

/** Puts an earlier version back as a new one. */
export async function restore(n: number, onRestored: (paper: DocPaper) => void) {
  cancelSave();
  try {
    const v = (await fetchDocument.restore(LIVE.projectId, LIVE.runId, n)).data;
    if (!v) return;
    Object.assign(SAVED, { n: v.n, paper: v.paper, dirty: false, savedAt: v.created_at, checks: {}, order: [] });
    onRestored(v.paper);
    toast.success(`Version ${n} restored`, { description: `Saved as version ${v.n}.` });
  } catch (error) {
    toast.error(error instanceof ApiError ? error.message : "The version could not be restored.");
  } finally {
    told();
  }
}
