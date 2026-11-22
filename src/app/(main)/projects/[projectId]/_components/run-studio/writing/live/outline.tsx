"use client";
"use no memo";

/* ===== Live screens: the journal merge (S08), and the paper laid out (S09 story and sections, S10 paragraphs) =====
   Each stage plays its files onto the preview's scene as the preview's scripts do: the journal's rules, places,
   argument parts, budgets and sentence rules row by row; then the story, the sections in order and their moves; then
   the paper page paragraph by paragraph, each brief with its sentences filling in. The stages are progressive: the
   scene stands as a skeleton from the moment a stage opens, and each part plays as the engine step that makes it
   publishes its file (the story at its checkpoint, the outline at the next, the paper tree when the paragraphs are
   scored, the comparison plan when the step ends). */

import { emit, item, RUN, reveal, S, STOP, step } from "../engine";
import { FL } from "./frame-body";
import { need, until } from "./kit";
import {
  CHECKPOINT_TITLE,
  HIGH_RISK,
  heading,
  L,
  moveName,
  RULE_TEXT,
  ruleGroups,
  scorecardOf,
  storyPlan,
  treeParagraphs,
  wordsOf,
} from "./outline-data";
import { argumentRows, JournalBody, placementRows, ruleRows } from "./outline-journal";
import { BlueprintBody, storyLength } from "./outline-paper";
import { file, has, LIVE, newest } from "./run";
import type { LiveScreen } from "./stages";
import type { TreeSection } from "./types";

const n = (x: number, one: string, many = `${one}s`) => `${x} ${x === 1 ? one : many}`;
const joined = (xs: string[]) =>
  xs.length < 2 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;

/** What a checkpoint's scorecard found, in one line for the narration. */
function cardLine(k: string) {
  const card = scorecardOf(k);
  if (!card) return `${k} is not scored yet.`;
  const groups = ruleGroups(card);
  const hard = groups.filter((g) => g.kind === "H" && !g.passed);
  const look = groups.filter((g) => g.kind !== "H" && !g.passed);
  if (!hard.length && !look.length) return `${CHECKPOINT_TITLE[k]}: every rule passes.`;
  const parts = [
    hard.length ? `${n(hard.length, "hard rule")} failed` : "every hard rule passes",
    look.length ? `to look at: ${look.map((g) => (RULE_TEXT[g.rule] ?? g.rule).toLowerCase()).join("; ")}` : "",
  ].filter(Boolean);
  return `${CHECKPOINT_TITLE[k]}: ${parts.join(", ")}.`;
}

/* ---------- S08 · the join: the frame meets the locked argument ---------- */
async function playJoin() {
  // The check is shown at checkpoint J, before the step ends; a run made before the join has no check to show.
  if (!(await need("S08", "JoinReport.json"))) return;
  const r = file("JoinReport.json");
  if (!r) return;
  await step(
    "S08",
    "c0",
    async () => {
      reveal("[data-join]");
      for (const [i, f] of r.findings.entries())
        await item(FL.join, i, { id: f.locator || f.rule, text: f.note, wait: 200 });
    },
    {
      text: r.coverage.failed_hard
        ? `${n(r.coverage.failed_hard, "hard rule")} of the join failed: the frame and the argument do not fit yet.`
        : `The frame and the argument fit: ${n(r.coverage.passed, "check")} pass${
            r.coverage.to_look_at ? `, ${n(r.coverage.to_look_at, "point")} to look at` : ""
          }.`,
    },
  );
}
async function playJournal() {
  await playJoin();
  if (!(await need("S08", "JournalWritingContract.json", "PlacementMap.json"))) return;
  const c = file("JournalWritingContract.json");
  if (!c) return;
  const rules = ruleRows(c);
  const places = placementRows(c);
  const parts = argumentRows(c);
  const secs = c.rules.sections;
  const placed = places.reduce((k, r) => k + r.here.length, 0);
  const profiled = Object.keys((c.habits as Record<string, unknown> | undefined) ?? {}).length > 0;
  await step(
    "S08",
    "c1",
    async () => {
      for (const [i, r] of rules.entries()) await item(L.rules, i, { id: r.t, text: r.rule, wait: 180 });
    },
    {
      text: `${c.journal}, ${c.article_type}. ${
        profiled
          ? `The ${c.profile} profile's habits are kept apart from the rules.`
          : "No journal profile was measured for this run, so the rules alone make the contract."
      }`,
    },
  );
  await step(
    "S08",
    "c2",
    async () => {
      reveal("[data-place]", "center");
      for (const [i, r] of places.entries())
        await item(L.place, i, { id: r.type, text: r.homes.map(heading).join(" or "), wait: 240 });
    },
    {
      text: `${n(placed, "statement")} of the frozen graph placed, by ${n(places.length, "statement type")}; findings in ${joined(
        (c.placement.finding ?? []).map(heading),
      )}, limitations in ${joined((c.placement.limitation ?? []).map(heading))}.`,
    },
  );
  await step(
    "S08",
    "c3",
    async () => {
      reveal("[data-tmap]", "center");
      for (const [i, [part, line]] of parts.entries()) await item(L.tmap, i, { id: part, text: line, wait: 260 });
    },
    {
      text: `${n(parts.length, "part")} of the argument, each with its place${
        c.argument_map.rebuttal ? `: rebuttals go to ${c.argument_map.rebuttal}` : ""
      }.`,
    },
  );
  await step(
    "S08",
    "c4",
    async () => {
      reveal("[data-budget]");
      await item(L.budget, 0, { wait: 1100 });
    },
    {
      text: `${n(secs.length, "section")}, ${secs.filter((s) => s.required).length} required; ${c.rules.words[0].toLocaleString(
        "en-US",
      )}–${c.rules.words[1].toLocaleString("en-US")} words in all, the abstract ${c.rules.abstract.words.join("–")}.`,
    },
  );
  await step(
    "S08",
    "c5",
    async () => {
      reveal("[data-sent]", "center");
      for (const [i, text] of c.sentence_rules.entries()) await item(L.sent, i, { id: String(i), text, wait: 160 });
    },
    { text: `${n(c.sentence_rules.length, "sentence rule")} every writer follows.` },
  );
  await step(
    "S08",
    "c6",
    async () => {
      await item(L.lines, 0, { id: secs[0]?.section_id, text: secs[0]?.guidance ?? "", wait: 200 });
      reveal("[data-contract]");
      for (const [i, s] of secs.entries())
        if (i > 0) await item(L.lines, i, { id: s.section_id, text: s.guidance, wait: 200 });
    },
    {
      text: `The contract: each section with its guidance, moves and tense${c.conflicts.length ? "" : "; no conflict to settle"}.`,
    },
  );
}

/* ---------- S09 · the story, then the sections ---------- */
async function playOutline() {
  // The story comes as a draft after each story call (the planned one, then each other story tried), and checked when
  // the story check scores it (checkpoint P2); the outline comes at P3. Each plays as it comes.
  await until(
    () => has("StoryPlanDraft.json") || has("StoryPlan.json") || Boolean(LIVE.failed) || LIVE.finished.has("S09"),
  );
  if (has("StoryPlanDraft.json") || (await need("S09", "StoryPlan.json"))) {
    const sp = storyPlan()?.plan;
    const main = sp?.message ? wordsOf(sp.message) : null;
    if (sp)
      await step(
        "S09",
        "h1",
        async () => {
          // The main point heads the screen; the rest of the story follows under the paper at a glance.
          reveal('[data-cursor="point"]');
          await item(L.point, 0, { id: "point", text: main ?? "", wait: 700 });
          reveal('[data-cursor="story"]');
          for (let i = 0; i < storyLength(sp); i++) await item(L.story, i, { id: `s${i}`, wait: 420 });
          for (const [i, k] of ["opening", "challenge", "action", "resolution"].entries())
            await item(L.beats, i, { id: k, wait: 260 });
          await item(L.reasons, 0, { wait: 500 });
        },
        {
          text: main
            ? `The main point, ${sp.message}: ${main} ${n(sp.reasons.length, "reason")}, ${n(sp.acknowledgments.length, "objection")} answered.`
            : "The story has no main point the frozen graph can carry.",
        },
      );
  }
  if (await need("S09", "Scorecard_P2.json"))
    await step(
      "S09",
      "h2",
      async () => {
        // The checked story may have parts the draft had not: all of them show.
        const sp = file("StoryPlan.json");
        if (sp) {
          S.n[L.point] = Math.max(S.n[L.point] ?? 0, 1);
          S.n[L.story] = Math.max(S.n[L.story] ?? 0, storyLength(sp));
        }
        await item(L.checks9, 0, { wait: 450 });
      },
      { text: cardLine("P2") },
    );
  if (!(await need("S09", "ManuscriptBlueprint.json"))) return;
  const bp = file("ManuscriptBlueprint.json");
  if (!bp) return;
  await step(
    "S09",
    "h3",
    async () => {
      await item(L.title, 0, { id: "t", text: bp.working_title, wait: 400 });
      for (const [i, s] of bp.sections.entries()) {
        await item(L.sec, i, { id: s.section_id, wait: 420 });
        reveal(`[data-row="${s.section_id}"]`);
      }
    },
    {
      text: `“${bp.working_title}”: ${n(bp.sections.length, "section")}, ${joined(
        bp.sections.map((s) => heading(s.section_id)),
      )}, carrying ${n(bp.storyline.length, "statement")} in order.`,
    },
  );
  const intro = bp.sections[0];
  await step(
    "S09",
    "h4",
    async () => {
      for (const [i, s] of bp.sections.entries()) await item(L.moves, i, { id: s.section_id, wait: 150 });
    },
    {
      text: intro
        ? `The ${heading(intro.section_id)} moves through ${intro.moves.map(moveName).join(", ")}.`
        : "Each section gets its moves.",
    },
  );
  if (await need("S09", "Scorecard_P3.json"))
    await step("S09", "h5", () => item(L.checks9, 1, { wait: 450 }), { text: cardLine("P3") });
}

/** A file the stage publishes as it ends, if it publishes it at all: waits for the step's end, then a moment for it. */
async function atEnd(sid: string, name: "SynthesisPlan.json") {
  await until(() => has(name) || LIVE.finished.has(sid) || Boolean(LIVE.failed));
  const g = RUN.gen;
  const t0 = Date.now();
  while (!has(name) && !LIVE.failed && Date.now() - t0 < 4000) await new Promise((r) => setTimeout(r, 250));
  if (g !== RUN.gen) throw STOP;
  return has(name);
}

/* ---------- S10 · every paragraph and its sentences ---------- */
const TREE = "ManuscriptTree.json" as const;
const DRAFT = "ManuscriptTreeDraft.json" as const;
/** The checked tree is the newest of the two: the page shows it, not the draft. */
const treeNewest = () => has(TREE) && newest(DRAFT, TREE) === TREE;

async function playTree() {
  // Each section's paragraphs come as a draft the moment the Planner has planned them (a new draft per section); the
  // checked tree comes when the paragraphs check scores them all. The page streams what it has not shown yet; a plan
  // made again from the first section (a note at the check) streams again from the top.
  const streamed: string[] = [];
  const streamNew = async (sections: TreeSection[]) => {
    const paras = treeParagraphs({ sections });
    if (!streamed.every((uid, i) => paras[i]?.p.uid === uid)) {
      streamed.length = 0;
      S.n[L.para] = 0;
      S.n[L.sentence] = 0;
      emit();
    }
    for (const x of paras) {
      if (x.index < streamed.length) continue;
      const id = x.p.paragraph_id;
      await item(L.para, x.index, { id, text: x.p.job, wait: 180 });
      // The block lands in the paper at a glance; its plan is folded on the page below unless it is one to read first.
      reveal(`[data-block="${id}"]`);
      for (const [k, sen] of x.p.sentences.entries()) await item(L.sentence, x.first + k, { id: sen.uid, wait: 100 });
      streamed.push(x.p.uid);
    }
  };
  const done = file(TREE);
  const at = done && treeNewest() ? treeParagraphs(done) : null;
  await step(
    "S10",
    "i1",
    async () => {
      let seen: string | undefined;
      const fresh = () => has(DRAFT) && LIVE.deliveredAt[DRAFT] !== seen && !treeNewest();
      for (;;) {
        await until(() => fresh() || treeNewest() || Boolean(LIVE.failed));
        if (LIVE.failed || treeNewest()) break;
        seen = LIVE.deliveredAt[DRAFT];
        const draft = file(DRAFT);
        if (draft) await streamNew(draft.sections);
      }
      const tree = file(TREE);
      if (tree && treeNewest()) await streamNew(tree.sections);
    },
    {
      text: at
        ? `${n(at.length, "paragraph")} and ${n(
            at.reduce((k, x) => k + x.p.sentences.length, 0),
            "sentence",
          )} planned${(() => {
            const byCode = (done?.sections ?? [])
              .filter((x) => x.written_by === "code")
              .map((x) => heading(x.template));
            return byCode.length
              ? `; ${joined(byCode)} ${byCode.length > 1 ? "are" : "is"} written by code from the record`
              : "";
          })()}.`
        : "Each section's paragraphs show as the Planner plans them; the paragraphs check scores them once every section is planned.",
    },
  );
  const tree = file(TREE);
  if (tree) {
    const high = treeParagraphs(tree).filter((x) => x.p.risk >= HIGH_RISK);
    await step(
      "S10",
      "i2",
      async () => {
        reveal("[data-glance]");
        await item(L.risk, 0, { wait: 700 });
      },
      {
        text: high.length
          ? `${n(high.length, "paragraph")} at risk ${HIGH_RISK} or more: ${joined(high.map((x) => x.n))}.`
          : `No paragraph at risk ${HIGH_RISK} or more.`,
      },
    );
  }
  if (await need("S10", "Scorecard_P4.json"))
    await step("S10", "i3", () => item(L.checks10, 0, { wait: 450 }), { text: cardLine("P4") });
  if (await need("S10", "Scorecard_P5.json"))
    await step("S10", "i4", () => item(L.checks10, 1, { wait: 450 }), { text: cardLine("P5") });
  // The comparison plan is made first and published as the step ends; a run without literature cards has none.
  const planned = await atEnd("S10", "SynthesisPlan.json");
  const plan = planned ? file("SynthesisPlan.json") : undefined;
  await step(
    "S10",
    "i5",
    async () => {
      for (const [i, x] of (plan?.comparisons ?? []).entries())
        await item(L.compare, i, { id: `${x.card_id}:${x.hypothesis_id}`, wait: 320 });
    },
    {
      text: plan?.comparisons.length
        ? `${n(plan.comparisons.length, "comparison")} with prior studies, for ${joined([
            ...new Set(plan.comparisons.map((x) => x.hypothesis_id)),
          ])}.`
        : "No comparison with prior studies was planned.",
    },
  );
}

/** The journal merge as the run reported it, for a stage closed before its files were read. */
function merged() {
  const done = LIVE.summary.S08 as { profile?: string; sections?: string[]; conflicts?: number } | undefined;
  if (!done?.sections) return "The journal contract is merged.";
  return `Writing contract from the ${done.profile ?? "journal's"} profile: ${n(done.sections.length, "section")}, ${
    done.conflicts ? `${n(done.conflicts, "conflict")} settled by the rule` : "no conflict to settle"
  }.`;
}

/* ---------- the scenes ---------- */
function JournalLive() {
  return <JournalBody />;
}

const JOURNAL: LiveScreen = {
  key: "journal",
  title: "Join the writing frame with the locked argument",
  short: "Join",
  block: 3,
  Scene: JournalLive,
  stages: [
    {
      id: "S08",
      ph: 2,
      short: "Join",
      name: "Join: Writing Frame and Argument",
      a: "code",
      progressive: true,
      title: "Join the writing frame with the locked argument",
      lead: "The writing frame (A) meets the locked argument (B). Code checks they fit, then places each statement in its section.",
      outs: ["JoinReport.json", "JournalWritingContract.json", "PlacementMap.json"],
      steps: [
        { id: "c0", a: "code", t: "Check that the frame and the argument fit" },
        { id: "c1", a: "code", t: "Read the publisher's rules" },
        { id: "c2", a: "code", t: "Place each statement type" },
        { id: "c3", a: "code", t: "Map the parts of the argument" },
        { id: "c4", a: "code", t: "Set the structure and the word budgets" },
        { id: "c5", a: "code", t: "Set the sentence rules" },
        { id: "c6", a: "code", t: "Write the contract" },
      ],
      needs: ["JournalWritingContract.json", "PlacementMap.json"],
      play: playJournal,
      summary: () => {
        const c = file("JournalWritingContract.json");
        const placed = Object.keys(file("PlacementMap.json")?.placement ?? {}).length;
        return c
          ? `Contract from the rules of “${c.journal}”: ${n(c.rules.sections.length, "section")}, ${n(placed, "statement")} placed.`
          : merged();
      },
    },
  ],
};

const BLUEPRINT: LiveScreen = {
  key: "blueprint",
  title: "Lay out the paper",
  short: "Outline",
  block: 3,
  Scene: BlueprintBody,
  stages: [
    {
      id: "S09",
      ph: 2,
      short: "Outline",
      name: "Story & Section Outline",
      a: "rp",
      progressive: true,
      title: "Plan the story and lay out the sections",
      lead: "The Planner plans the paper's story (its main point, its problem, its reasons and the objections it answers), then lays out the sections and gives each one the statements and exhibits it carries.",
      outs: ["StoryPlanDraft.json", "StoryPlan.json", "ManuscriptBlueprint.json", "SectionContracts.json"],
      steps: [
        { id: "h1", a: "rp", t: "Plan the story" },
        { id: "h2", a: "code", t: "Score the story" },
        { id: "h3", a: "rp", t: "Lay out the sections" },
        { id: "h4", a: "rp", t: "Give each section its moves" },
        { id: "h5", a: "code", t: "Score the sections" },
      ],
      needs: ["StoryPlan.json", "ManuscriptBlueprint.json"],
      play: playOutline,
      summary: () => {
        const sp = file("StoryPlan.json");
        const bp = file("ManuscriptBlueprint.json");
        const done = LIVE.summary.S09 as { sections?: string[]; storyline?: string[]; aligned?: boolean } | undefined;
        const sections = bp?.sections.length ?? done?.sections?.length;
        const carried = bp?.storyline.length ?? done?.storyline?.length;
        if (!sections) return "The story is set and the sections are laid out.";
        return `${sp || done ? "The story is set; " : ""}${n(sections, "section")} carry ${n(carried ?? 0, "statement")}${
          done?.aligned ? ", the question, the method and the results lined up" : ""
        }.`;
      },
    },
    {
      id: "S10",
      ph: 2,
      short: "Paragraphs",
      name: "Paragraph & Sentence Plans",
      a: "rp",
      progressive: true,
      title: "Plan every paragraph and its sentences",
      lead: "Each paragraph gets its plan: its job, where its point sits, what it does for the argument, and each sentence the statements, values and sources it may carry. The text itself is written later, inside this plan.",
      outs: ["ManuscriptTreeDraft.json", "ManuscriptTree.json", "SynthesisPlan.json"],
      steps: [
        { id: "i1", a: "rp", t: "Plan every paragraph and its sentences" },
        { id: "i2", a: "code", t: "Score each paragraph's risk" },
        { id: "i3", a: "code", t: "Score the paragraphs" },
        { id: "i4", a: "code", t: "Score the sentences" },
        { id: "i5", a: "sy", t: "Plan the comparisons with prior studies" },
      ],
      needs: ["ManuscriptTree.json"],
      play: playTree,
      summary: () => {
        const tree = file("ManuscriptTree.json");
        if (!tree) {
          const done = LIVE.summary.S10 as { paragraphs?: number; high_risk?: number } | undefined;
          return done?.paragraphs
            ? `${n(done.paragraphs, "paragraph")} planned; ${done.high_risk ? `${done.high_risk} at high risk` : "none at high risk"}.`
            : "Every paragraph is planned.";
        }
        const paras = treeParagraphs(tree);
        const high = paras.filter((x) => x.p.risk >= HIGH_RISK).length;
        return `${n(paras.length, "paragraph")} and ${n(
          paras.reduce((k, x) => k + x.p.sentences.length, 0),
          "sentence",
        )} planned; ${high ? `${high} at high risk` : "none at high risk"}.`;
      },
    },
  ],
};

export const OUTLINE: LiveScreen[] = [JOURNAL, BLUEPRINT];
