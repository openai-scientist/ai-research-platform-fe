/* ===== The first draft, live: what the screens read from the run's files, section by section =====
   Each section stage publishes its writings as they are written (SectionDraft.json: the first as planned, then each
   other way), its scorecard and ranked options at its check, and the section it keeps (Section.json). The last stage
   publishes the titles and abstracts it writes (FrontDraft.json), then the paper (paper.json). Every one of these
   files carries the section it holds, so the screens read them by section (`sectionFile`). */

import { file, has, LIVE, SECTION_OF_STAGE, SECTION_STAGE, sectionFile } from "./run";
import type { OptionsFile, RunFileName, Scorecard, WrittenParagraph, WrittenSectionFile } from "./types";

/** The lists the draft stages stream, as the player counts them (S.n). */
export const D = {
  /** The paragraphs of the writing on the page, by section: `para:<section>`. */
  para: (sec: string) => `draft-para:${sec}`,
  /** The plans of a section's paragraphs, laid out as its stage opens. */
  plan: (sec: string) => `draft-plan:${sec}`,
  /** The writings of a section, as each one is written. */
  versions: (sec: string) => `draft-versions:${sec}`,
  /** The section's check: the scorecard of each writing. */
  check: (sec: string) => `draft-check:${sec}`,
  /** The writing kept. */
  kept: (sec: string) => `draft-kept:${sec}`,
  brief: (sec: string) => `draft-brief:${sec}`,
  front: "draft-front",
  frontCheck: "draft-front-check",
  paper: "draft-paper",
} as const;

export const FRONT = "front";
/** The checkpoint of a section, as the run names it ("S:results"), and its files ("S-results"). */
export const checkpointOf = (sec: string) => `S:${sec}`;
const fileKey = (sec: string) => `S-${sec}`;
export const optionsOf = (sec: string) =>
  file(`Options_${fileKey(sec)}.json` as RunFileName) as OptionsFile | undefined;
export const scorecardOfSection = (sec: string) =>
  file(`Scorecard_${fileKey(sec)}.json` as RunFileName) as Scorecard | undefined;

export const stageOfSection = (sec: string) => (sec === FRONT ? "S17" : SECTION_STAGE[sec]);
export const sectionOfStage = (sid: string) => (sid === "S17" ? FRONT : SECTION_OF_STAGE[sid]);
export const DRAFT_STAGES = [...Object.values(SECTION_STAGE), "S17"];
export const isDraftStage = (sid: string) => DRAFT_STAGES.includes(sid);

/** The sections the outline lays out, in the paper's order, and whether code writes them. */
export function outlineSections() {
  const bp = file("ManuscriptBlueprint.json");
  const tree = file("ManuscriptTree.json");
  return (bp?.sections ?? []).map((s) => {
    const node = tree?.sections.find((x) => x.template === s.section_id);
    return {
      id: s.section_id,
      purpose: s.purpose,
      byCode: node?.written_by === "code",
      planned: node?.paragraphs ?? [],
    };
  });
}
/** Whether the outline has a section the writers write: a section without one is skipped by its stage. */
export const inOutline = (sec: string) => outlineSections().some((s) => s.id === sec && !s.byCode && s.planned.length);

/** The writings of a section so far: each one as written, in the order it was written. */
export const versionsOf = (sec: string) => sectionFile("SectionDraft.json", sec)?.versions ?? [];
/**
 * The section the stage kept, once a writing is taken. The check shows the first writing under the same name before
 * anyone has chosen: it counts only once the options name the one taken, or the stage is done.
 */
export const keptOf = (sec: string): WrittenSectionFile | undefined => {
  const s = sectionFile("Section.json", sec);
  const taken = Boolean(optionsOf(sec)?.taken) || LIVE.finished.has(stageOfSection(sec));
  return s?.paragraphs.length && taken ? s : undefined;
};
/** The writing taken at the check, and by whom. */
export function takenOf(sec: string) {
  const opts = optionsOf(sec);
  const gate = file("GateState.json")?.[checkpointOf(sec)];
  return { option: opts?.taken ?? gate?.option, by: opts?.by ?? gate?.by };
}

/** What the page shows of a section: the writing kept, else the one picked to read, else the first written. */
export function paragraphsOf(sec: string, picked?: string | null): WrittenParagraph[] {
  const versions = versionsOf(sec);
  const choice = picked ? versions.find((v) => v.option_id === picked) : undefined;
  if (choice) return choice.paragraphs;
  return keptOf(sec)?.paragraphs ?? versions[0]?.paragraphs ?? [];
}

/** A section's state, in the words of its badge. */
export type SectionState = "planned" | "writing" | "choosing" | "kept" | "skipped" | "code";
export function sectionState(sec: string): SectionState {
  const sid = stageOfSection(sec);
  if (keptOf(sec)) return "kept";
  if (LIVE.finished.has(sid)) return "skipped";
  if (LIVE.stop?.checkpoint === checkpointOf(sec)) return "choosing";
  if (LIVE.begun.has(sid)) return "writing";
  return "planned";
}

/* ---------- the sentence: its words and its marks ---------- */
export type Piece =
  | { k: "text"; text: string }
  | { k: "value"; key: string; form?: string }
  | { k: "exhibit"; key: string }
  | { k: "cite"; keys: string[] }
  | { k: "author"; text: string };
const MARK =
  /\{\{\s*([A-Za-z0-9_.:-]+?)\s*(?:\|\s*([a-z0-9]+)\s*)?\}\}|\[@([^\]\s;]+(?:\s*;\s*@[^\]\s;]+)*)\]|\[\[To be completed by the authors: ([^\]]+)\]\]/g;
/** A sentence in pieces: its words, each ledger value, each exhibit it names and each source it cites. */
export function pieces(text: string): Piece[] {
  const out: Piece[] = [];
  let at = 0;
  for (const m of text.matchAll(MARK)) {
    if (m.index > at) out.push({ k: "text", text: text.slice(at, m.index) });
    if (m[4]) out.push({ k: "author", text: m[4] });
    else if (m[3]) out.push({ k: "cite", keys: m[3].split(/\s*;\s*@/) });
    else if (m[1].startsWith("tab:") || m[1].startsWith("fig:")) out.push({ k: "exhibit", key: m[1] });
    else out.push({ k: "value", key: m[1], ...(m[2] ? { form: m[2] } : {}) });
    at = m.index + m[0].length;
  }
  if (at < text.length) out.push({ k: "text", text: text.slice(at) });
  return out;
}
/** A text as the paper prints it: a source the sentence names as its subject, by author and year ("Kaufman et al.
 * (2012) described …"), leaves the sentence's brackets, so it is cited once. */
/** Whether a sentence names the source of a key as its subject, by author and year. */
export function namedIn(text: string) {
  // The key runs the family name together, unaccented ("andikaputra2025"); the sentence names it as written
  // ("Andika Putra et al. (2025)", "Carballo-Mendívil et al. (2025)").
  const plainText = text.normalize("NFD").replace(/\p{M}/gu, "");
  return (k: string) => {
    const m = /^([a-z]+?)(\d{4})[a-z]?$/.exec(k);
    const family = m ? [...m[1]].join("[\\s-]?") : null;
    return m ? new RegExp(`\\b${family}(?: et al\\.| and \\S+)? \\(${m[2]}\\)`, "i").test(plainText) : false;
  };
}
export function readPieces(text: string): Piece[] {
  const named = namedIn(text);
  const out: Piece[] = [];
  for (const p of pieces(text)) {
    if (p.k !== "cite") {
      out.push(p);
      continue;
    }
    const keys = p.keys.filter((k) => !named(k));
    const last = out.at(-1);
    if (keys.length) out.push({ ...p, keys });
    else if (last?.k === "text") out[out.length - 1] = { k: "text", text: last.text.trimEnd() };
  }
  return out;
}
/** The ledger values a text prints, each once per place it prints it. */
export const valuesIn = (text: string) => pieces(text).flatMap((p) => (p.k === "value" ? [p.key] : []));
export const wordCount = (paras: WrittenParagraph[]) =>
  paras.reduce(
    (n, p) =>
      n +
      p.sentences.reduce(
        (k, s) =>
          k +
          pieces(s.text)
            .map((x) => (x.k === "text" ? x.text : "x"))
            .join(" ")
            .split(/\s+/)
            .filter(Boolean).length,
        0,
      ),
    0,
  );
export const sentenceCount = (paras: WrittenParagraph[]) => paras.reduce((n, p) => n + p.sentences.length, 0);

/** The section a stage writes is in: the run's files are read, or the run has gone past it. */
export const sectionIn = (sec: string) => Boolean(keptOf(sec)) || versionsOf(sec).length > 0;
export const draftDone = () => has("paper.json") || Boolean(LIVE.published && LIVE.draft);

/** How the writers word the findings, as the researcher answered before the Discussion. */
export function wordingAnswer() {
  return LIVE.answers.find((a) => /^How strongly should the findings be worded/i.test(a.question));
}

/** A writing's name: the one as planned, another way (option A, B), or a fix of its hard rules (fix 1, 2). */
export function writingName(id: string) {
  if (id === "built") return "As planned";
  const fix = /^F(\d+)$/.exec(id);
  return fix ? `Fix ${fix[1]}` : `Option ${id}`;
}
