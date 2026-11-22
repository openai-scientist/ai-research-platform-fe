"use client";
"use no memo";

/* ===== Live screen: the first draft, written section by section (S11–S16), then its title, abstract and assembly
   (S17) =====
   Each section is a stage of its own, in the order the engine writes them: what the paper found first (Results,
   Discussion, Limitations), then what frames it (Introduction, Related work, Conclusion). A section's stage reads the
   brief its writers get, writes the section from its paragraph plans, writes it two other ways from the same plans,
   scores every writing on the rules and the verifier, and keeps one (you choose in Light mode). The page streams the
   first writing sentence by sentence as soon as it is written; the others come beside it to compare. The last stage
   writes the title and abstract from the finished text and assembles the draft, Data and Methods written by code.
   Nothing here is read back yet: the draft is published unchecked. */

import { emit, item, RUN, reveal, S, STOP, sleep, step, TYPE_CPS } from "../engine";
import {
  checkpointOf,
  D,
  DRAFT_STAGES,
  draftDone,
  FRONT,
  inOutline,
  keptOf,
  optionsOf,
  outlineSections,
  paragraphsOf,
  scorecardOfSection,
  sectionIn,
  sentenceCount,
  takenOf,
  versionsOf,
  wordCount,
  wordingAnswer,
  writingName,
} from "./draft-data";
import { DocumentScene } from "./draft-document";
import { typedLength } from "./draft-paragraph";
import { until } from "./kit";
import { heading, joined, plural, RULE_TEXT, ruleGroups } from "./outline-data";
import { file, LIVE, LIVE_STAGES, SECTION_STAGE, sectionFile } from "./run";
import type { LiveScreen, LiveStageDef } from "./stages";
import type { Scorecard } from "./types";

/** Waits for a part of a stage; false when the run went on (or stopped) without it, after a moment for its file. */
async function got(sid: string, cond: () => boolean) {
  const later = () => LIVE_STAGES.slice(LIVE_STAGES.indexOf(sid) + 1).some((x) => LIVE.begun.has(x));
  const gone = () => Boolean(LIVE.failed) || (LIVE.finished.has(sid) && (later() || draftDone()) && LIVE.caughtUp);
  await until(() => cond() || gone());
  if (!cond() && !LIVE.failed) {
    const g = RUN.gen;
    await sleep(1500);
    if (g !== RUN.gen) throw STOP;
  }
  return cond();
}

/** What a scorecard found, in one line for the narration. */
function cardLine(card: Scorecard | undefined) {
  if (!card) return "Not scored.";
  const groups = ruleGroups(card);
  const hard = groups.filter((g) => g.kind === "H" && !g.passed);
  const look = groups.filter((g) => g.kind !== "H" && !g.passed);
  if (!hard.length && !look.length) return "every rule passes";
  return [
    hard.length ? `${plural(hard.length, "hard rule")} failed` : "every hard rule passes",
    look.length ? `to look at: ${look.map((g) => (RULE_TEXT[g.rule] ?? g.rule).toLowerCase()).join("; ")}` : "",
  ]
    .filter(Boolean)
    .join(", ");
}
const pct = (x: number) => `${Math.round(x * 100)}%`;
const by = (who?: string) => (who === "researcher" ? "by you" : "by the run, on the recommendation");

/** Streams a writing of a section onto the page, sentence by sentence; from the top when it is a new writing. */
async function streamWriting(sec: string, picked?: string) {
  const paras = paragraphsOf(sec, picked);
  S.n[D.para(sec)] = 0;
  emit();
  let i = 0;
  for (const p of paras) {
    reveal(`[data-wpara="${CSS.escape(p.paragraph_id)}"]`, "center");
    for (const s of p.sentences) {
      // The page types the sentence out; the next one starts once it is typed, after a breath.
      await item(D.para(sec), i, {
        id: `${p.paragraph_id}.s${i}`,
        wait: (typedLength(s.text) / TYPE_CPS) * 1000 + 220,
      });
      i += 1;
    }
  }
}

/* ---------- S11–S16 · one section ---------- */
async function playSection(sec: string) {
  const sid = SECTION_STAGE[sec];
  const name = heading(sec);
  if (sec === "discussion") {
    // The Discussion first asks how strongly the findings are worded: every section after it keeps the answer.
    if (await got(sid, () => Boolean(wordingAnswer() || LIVE.briefs[sec] || sectionIn(sec))))
      await step(sid, "w0", undefined, {
        text: wordingAnswer()
          ? `The findings are worded ${wordingAnswer()?.answer.toLowerCase()}.`
          : "The findings are worded as strongly as the evidence allows.",
      });
  }
  if (!(await got(sid, () => Boolean(LIVE.briefs[sec]) || sectionIn(sec)))) return;
  const brief = LIVE.briefs[sec];
  await step(
    sid,
    "w1",
    async () => {
      await item(D.brief(sec), 0, { wait: 500 });
      // Each paragraph's card lands with its plan, before a word of it is written.
      const planned = outlineSections().find((s) => s.id === sec)?.planned ?? [];
      for (const [i, p] of planned.entries()) await item(D.plan(sec), i, { id: p.paragraph_id, wait: 260 });
    },
    {
      text: brief
        ? `${brief.purpose} ${plural(brief.moves.length, "move")}, in the ${brief.tense} tense${
            brief.key_terms.length ? `, with the key terms ${joined(brief.key_terms.slice(0, 4))}` : ""
          }${brief.earlier.length ? `; the writers read the ${joined(brief.earlier.map(heading))} first` : ""}.`
        : `The ${name} is written from its paragraph plans.`,
    },
  );
  if (!(await got(sid, () => versionsOf(sec).length > 0 || Boolean(keptOf(sec))))) return;
  const first = () => paragraphsOf(sec, versionsOf(sec)[0]?.option_id);
  await step(
    sid,
    "w2",
    async () => {
      await streamWriting(sec, versionsOf(sec)[0]?.option_id);
      await item(D.versions(sec), 0, { wait: 300 });
    },
    {
      text: `The ${name} as planned: ${plural(first().length, "paragraph")}, ${plural(sentenceCount(first()), "sentence")}, ${wordCount(first()).toLocaleString("en-US")} words.`,
    },
  );
  // The other writings, each from the same plans with a strategy of its own.
  for (const [k, id] of [
    [1, "w3"],
    [2, "w4"],
  ] as const) {
    if (!(await got(sid, () => versionsOf(sec).length > k || Boolean(keptOf(sec))))) break;
    const v = versionsOf(sec)[k];
    if (!v) break;
    await step(sid, id, () => item(D.versions(sec), k, { id: v.option_id, wait: 600 }), {
      text: `${writingName(v.option_id)}, written with “${v.strategy}”: ${wordCount(v.paragraphs).toLocaleString("en-US")} words.`,
    });
  }
  // A hard rule every writing breaks is fixed by the writers, at most twice, before the check.
  for (let k = 3; ; k++) {
    await until(
      () =>
        versionsOf(sec).length > k ||
        Boolean(scorecardOfSection(sec)) ||
        LIVE.finished.has(sid) ||
        Boolean(LIVE.failed),
    );
    const v = versionsOf(sec)[k];
    if (!v) break;
    await step(sid, "wf", () => item(D.versions(sec), k, { id: v.option_id, wait: 600 }), {
      text: `Every writing broke a hard rule: ${writingName(v.option_id).toLowerCase()} rewrites the best of them to fix it, changing nothing else.`,
    });
  }
  if (await got(sid, () => Boolean(scorecardOfSection(sec) || optionsOf(sec)?.options.length))) {
    const opts = optionsOf(sec);
    const best = opts?.options.find((o) => o.option_id === opts.recommended) ?? opts?.options[0];
    await step(sid, "w5", () => item(D.check(sec), 0, { wait: 700 }), {
      text: best
        ? `Each writing scored on the rules and read by the verifier. Recommended: ${best.label.toLowerCase()}, ${cardLine(best.scorecard)}${best.dropped ? `, ${plural(best.dropped, "sentence")} the verifier would drop` : ""}${best.option_id !== "built" ? `, ${pct(best.kept)} of the first writing's words kept` : ""}.`
        : `The ${name} as written: ${cardLine(scorecardOfSection(sec))}.`,
    });
  }
  // A note sends the section back to the writers: the page streams the new writing when it comes.
  // Each rebuild sends its first writing first: that is when it streams; the other writings join it as they come.
  const firstOf = () => JSON.stringify(sectionFile("SectionDraft.json", sec)?.versions[0]?.paragraphs ?? null);
  let streamed = firstOf();
  for (;;) {
    await until(() => Boolean(keptOf(sec)) || LIVE.finished.has(sid) || Boolean(LIVE.failed) || firstOf() !== streamed);
    if (keptOf(sec) || LIVE.finished.has(sid) || LIVE.failed) break;
    streamed = firstOf();
    await streamWriting(sec, versionsOf(sec)[0]?.option_id);
  }
  if (!(await got(sid, () => Boolean(keptOf(sec))))) return;
  const { option, by: who } = takenOf(sec);
  const taken = optionsOf(sec)?.options.find((o) => o.option_id === option);
  await step(
    sid,
    "w6",
    async () => {
      // The page shows the writing kept, whichever was read before.
      S.n[D.para(sec)] = sentenceCount(keptOf(sec)?.paragraphs ?? []);
      await item(D.kept(sec), 0, { wait: 500 });
    },
    {
      text: `Kept ${taken ? taken.label.replace(/^The /, "the ") : "the writing as planned"}, ${by(who)}.`,
    },
  );
}

/* ---------- S17 · the title and abstract, then the draft ---------- */
async function playFront() {
  const sid = "S17";
  await step(sid, "f1", undefined, {
    text: `${
      joined(
        outlineSections()
          .filter((s) => s.byCode)
          .map((s) => heading(s.id)),
      ) || "Data and Methods"
    } are written by code from the record, with no model call: every value comes from the ledger.`,
  });
  const versions = () => file("FrontDraft.json")?.versions ?? [];
  if (!(await got(sid, () => versions().length > 0 || draftDone()))) return;
  const first = versions()[0];
  if (first)
    await step(sid, "f2", () => item(D.front, 0, { wait: 900 }), {
      text: `“${first.title}”, with a ${first.abstract.split(/\s+/).length}-word abstract and ${plural(first.keywords.length, "keyword")}.`,
    });
  if (await got(sid, () => versions().length > 1 || draftDone())) {
    const alt = versions()[1];
    if (alt)
      await step(sid, "f3", () => item(D.front, 1, { wait: 700 }), {
        text: `Option ${alt.option_id}, with “${alt.strategy}”: “${alt.title}”.`,
      });
  }
  if (await got(sid, () => Boolean(scorecardOfSection(FRONT)) || draftDone())) {
    const opts = optionsOf(FRONT);
    const best = opts?.options.find((o) => o.option_id === opts.recommended);
    await step(sid, "f4", () => item(D.frontCheck, 0, { wait: 600 }), {
      text: best
        ? `Both scored; recommended: ${best.label.toLowerCase()}, ${cardLine(best.scorecard)}.`
        : `The title and abstract as written: ${cardLine(scorecardOfSection(FRONT))}.`,
    });
  }
  if (!(await got(sid, () => draftDone()))) return;
  const paper = file("paper.json");
  const paras = paper?.sections.flatMap((s) => s.paragraphs) ?? [];
  await step(sid, "f5", () => item(D.paper, 0, { wait: 800 }), {
    text: paper
      ? `The first draft: ${plural(paper.sections.length, "section")}, ${plural(paras.length, "paragraph")}, ${wordCount(paras).toLocaleString("en-US")} words. It is not read back yet: that comes next.`
      : "The first draft is assembled. It is not read back yet: that comes next.",
  });
}

/* ---------- the stage definitions ---------- */
const SECTION_LEAD: Record<string, string> = {
  results:
    "Written first: what the study found, each value copied from the ledger and each verdict as code reached it. Only the paragraph plans of the Results are used.",
  discussion:
    "What the findings mean, how they compare with prior studies, and where they stop. You first choose how strongly the findings are worded; every later section keeps it.",
  limitations: "What the study could not show, each limit from the record, worded no stronger than it may be.",
  introduction:
    "Written once the findings are: the problem, what is known, the gap and the main point, so the opening leads to what the paper shows.",
  related_work: "The prior studies this one extends, grouped by what they did, each cited from its card.",
  conclusion: "The main point again, why it matters, and what should be studied next, in that order.",
};
function sectionStage(sec: string): LiveStageDef {
  const sid = SECTION_STAGE[sec];
  const name = heading(sec);
  return {
    id: sid,
    ph: 2,
    short: name,
    name: `Section Drafting: ${name}`,
    a: "sw",
    progressive: true,
    title: `Write the ${name}`,
    lead: SECTION_LEAD[sec] ?? `The ${name}, written from its paragraph plans.`,
    outs: ["SectionDraft.json", "Section.json"],
    steps: [
      ...(sec === "discussion" ? [{ id: "w0", a: "or", t: "Set how strongly the findings are worded" }] : []),
      { id: "w1", a: "code", t: "Brief the writers and lay out each paragraph's plan" },
      { id: "w2", a: "sw", t: "Write the section as planned" },
      { id: "w3", a: "sw", t: "Write it another way (option A)" },
      { id: "w4", a: "sw", t: "Write it a third way (option B)" },
      { id: "wf", a: "sw", t: "Fix a hard rule every writing breaks" },
      { id: "w5", a: "av", t: "Score each writing and verify it" },
      { id: "w6", a: "code", t: "Keep one writing" },
    ],
    needs: [],
    play: () => playSection(sec),
    summary: () => {
      const kept = keptOf(sec);
      if (!kept)
        return inOutline(sec)
          ? `The ${name} was not written.`
          : `No ${name} in this paper's outline: nothing to write.`;
      const { option, by: who } = takenOf(sec);
      return `${name}: ${plural(kept.paragraphs.length, "paragraph")}, ${wordCount(kept.paragraphs).toLocaleString("en-US")} words; ${
        option && option !== "built" ? `option ${option}` : "the writing as planned"
      } kept ${by(who)}.`;
    },
  };
}
const FRONT_STAGE: LiveStageDef = {
  id: "S17",
  ph: 2,
  short: "Front matter",
  name: "Front Matter & Draft Assembly",
  a: "sw",
  progressive: true,
  title: "Write the title and abstract, then assemble the draft",
  lead: "Two writings of the title and abstract are scored side by side and one is kept. Data and Methods are written by code from the record, every exhibit is named, and the sections go in the paper's order.",
  outs: ["FrontDraft.json", "Draft_1.md", "paper.json"],
  steps: [
    { id: "f1", a: "code", t: "Lay in Data and Methods, written by code" },
    { id: "f2", a: "sw", t: "Write the title and abstract" },
    { id: "f3", a: "sw", t: "Write another title and abstract (option A)" },
    { id: "f4", a: "av", t: "Score both and keep one" },
    { id: "f5", a: "code", t: "Assemble the first draft" },
  ],
  needs: [],
  play: playFront,
  summary: () => {
    const paper = file("paper.json");
    if (!paper) return "The draft is assembled.";
    const paras = paper.sections.flatMap((s) => s.paragraphs);
    return `The paper, “${paper.title}”: ${plural(paper.sections.length, "section")}, ${wordCount(paras).toLocaleString("en-US")} words, not read back yet.`;
  },
};

/** One screen for the whole draft: the paper as one document, each section's stage writing into it in turn. */
export const DRAFT: LiveScreen[] = [
  {
    key: "paper",
    title: "Write the paper",
    short: "Paper",
    block: 4,
    compact: true,
    Scene: DocumentScene,
    stages: [...Object.keys(SECTION_STAGE).map(sectionStage), FRONT_STAGE],
  },
];
export { checkpointOf, DRAFT_STAGES };
