import type { DecOption, StepDef } from "./core";
import { AGENTS, type ScreenDef } from "./meta";

export interface JStageDef {
  id: string;
  mods: string;
  name: string;
  title: string;
  lead: string;
  steps: StepDef[];
}
export interface JDecDef {
  title: string;
  why: string;
  rec: [string, number, string];
  sum?: [string, string][];
  checks?: string[];
  opts: DecOption[];
  cta?: string;
}

/* ===== JFE: the journal-profile run that builds JFE-EDJ-v2, the profile ASW-0412 reads at S08 ===== */
/* Every number here is chosen to agree with what the manuscript run shows: 212 papers, the habits at S08, the bands at S13. */

Object.assign(AGENTS, {
  cm: {
    name: "Corpus Manager",
    initials: "Co",
    text: "text-sky-700 dark:text-sky-300",
    soft: "bg-sky-500/12 ring-sky-500/30",
    solid: "bg-sky-600",
  },
  dp: {
    name: "Parser",
    initials: "Pa",
    text: "text-slate-700 dark:text-slate-300",
    soft: "bg-slate-500/12 ring-slate-500/30",
    solid: "bg-slate-600",
  },
  an: {
    name: "Annotator",
    initials: "An",
    text: "text-lime-700 dark:text-lime-300",
    soft: "bg-lime-500/15 ring-lime-600/35",
    solid: "bg-lime-700",
  },
  a2: {
    name: "Second annotator",
    initials: "A2",
    text: "text-green-700 dark:text-green-300",
    soft: "bg-green-500/12 ring-green-500/30",
    solid: "bg-green-700",
  },
  st: {
    name: "Statistician",
    initials: "St",
    text: "text-cyan-700 dark:text-cyan-300",
    soft: "bg-cyan-500/12 ring-cyan-500/30",
    solid: "bg-cyan-600",
  },
  pb: {
    name: "Profile Publisher",
    initials: "Pu",
    text: "text-pink-700 dark:text-pink-300",
    soft: "bg-pink-500/12 ring-pink-500/30",
    solid: "bg-pink-600",
  },
});
export const JTEAM: string[] = ["or", "cm", "dp", "an", "a2", "code", "st", "pb"];

/* the five stages, with the PRD submodules each one covers */
export const JSTAGES: JStageDef[] = [
  {
    id: "J1",
    mods: "JFE-01.1 Corpus Manager",
    name: "Corpus and sampling",
    title: "Choose the papers the profile is built from",
    lead: "A profile is only as good as its sample. The Corpus Manager takes Education Data Journal's research articles, draws a sample by year, matches it with papers from three comparable journals, and logs every exclusion with its reason.",
    steps: [
      {
        id: "p1",
        a: "cm",
        t: "Find the journal and its papers",
        x: "Education Data Journal (example): ISSN and OpenAlex source checked. 1,146 works published 2021–2026.",
      },
      {
        id: "p2",
        a: "cm",
        t: "Apply the eligibility rules",
        x: "Research articles, English, version of record. 488 editorials, reviews, short papers and corrections are left out, and 9 duplicates removed. 649 remain.",
      },
      {
        id: "p3",
        a: "cm",
        t: "Draw a sample by year",
        x: "40 papers per year, 240 in all, drawn with a fixed seed so anyone can draw the same sample again.",
      },
      {
        id: "p4",
        a: "cm",
        t: "Match a control set",
        x: "110 research articles from three journals in the same field, matched by year and subfield. Without them nothing can be called typical of Education Data Journal.",
      },
      {
        id: "p5",
        a: "cm",
        t: "Check the rights of each paper",
        x: "Four flags per paper: analyse, store the full text, show an excerpt, export text. 25 papers have no text-mining right and are dropped.",
      },
      {
        id: "p6",
        a: "cm",
        t: "Hold out a test set",
        x: "45 Education Data Journal papers and 20 controls are set aside. Nobody reads them until the profile is checked in J4.",
      },
      { id: "JG1", gate: true, t: "Build the profile from this corpus?" },
    ],
  },
  {
    id: "J2",
    mods: "JFE-01.2 Document Parser",
    name: "Parsing",
    title: "Read every paper the same way",
    lead: "Each paper becomes one canonical document: sections, paragraphs and sentences with offsets back to the source. What belongs to the publisher's template is removed before anything is measured.",
    steps: [
      {
        id: "q1",
        a: "dp",
        t: "Fetch the full text",
        x: "198 papers come as JATS XML. 127 are PDFs and go through GROBID to TEI.",
      },
      {
        id: "q2",
        a: "dp",
        t: "Find the structure",
        x: "Each paper becomes sections, paragraphs and sentences, each with character offsets back to the source.",
      },
      {
        id: "q3",
        a: "dp",
        t: "Remove the publisher's template",
        x: "Running heads, page numbers, copyright lines and CRediT blocks are the template, not anyone's writing. They are removed first.",
      },
      {
        id: "q4",
        a: "dp",
        t: "Map headings to sections",
        x: "214 different headings map to 9 section types. “Results and Discussion” stays one section, marked combined, in 9% of papers.",
      },
      {
        id: "q5",
        a: "dp",
        t: "Drop what cannot be read",
        x: "17 papers fail: 9 scans without a text layer, 5 with no Introduction found, 3 with a broken reading order. Each is logged with its reason.",
      },
      {
        id: "q6",
        a: "dp",
        t: "Audit a sample by hand",
        x: "30 papers checked against the PDF: 97.4% of Introduction paragraphs found, above the 95% target.",
      },
    ],
  },
  {
    id: "J3",
    mods: "JFE-01.3 Annotator · 01.4 Extractor",
    name: "Annotation and measurement",
    title: "Label the moves, then measure the features",
    lead: "Every Introduction and Discussion sentence gets a rhetorical move. A second annotator labels a sample blind, so the labels can be trusted. Then only the approved features of the registry are measured.",
    steps: [
      {
        id: "r1",
        a: "an",
        t: "Label the moves",
        x: "Every sentence gets a move and a function, with a confidence. A sentence may carry two labels; one is primary.",
      },
      {
        id: "r2",
        a: "a2",
        t: "Label again, blind",
        x: "A second annotator labels 400 sampled spans without seeing the first labels.",
      },
      {
        id: "r3",
        a: "or",
        t: "Measure agreement",
        x: "Introduction moves agree well, α 0.83 to 0.88. “Compare with prior work” in the Discussion does not: α 0.61, below the 0.67 floor.",
      },
      { id: "JK3", check: true, t: "Settle the disputed labels" },
      {
        id: "r4",
        a: "code",
        t: "Measure the approved features",
        x: "64 of the 152 registry features are approved, and only those are scored: 41 by code, 16 by a model, 7 by both. The other 88 stay candidates.",
      },
      {
        id: "r5",
        a: "code",
        t: "Keep the trail",
        x: "19,712 measurements. Each points to its paper, paragraph, sentence and character offsets.",
      },
    ],
  },
  {
    id: "J4",
    mods: "JFE-01.6 Statistical Miner",
    name: "Statistics",
    title: "Find what is typical, and what is this journal's own",
    lead: "Each paper counts once. The Statistician summarises every feature, places the moves, compares Education Data Journal with the controls, and tests every difference against the obvious other causes before calling it distinctive.",
    steps: [
      {
        id: "s1",
        a: "st",
        t: "Give each paper one value",
        x: "Sentences are not votes. Each paper gives one value per feature, so a long paper does not count twice.",
      },
      {
        id: "s2",
        a: "st",
        t: "Place the moves",
        x: "Territory comes early, the niche in the middle, occupying it last. 78% of papers follow that order.",
      },
      {
        id: "s3",
        a: "st",
        t: "Compare with the controls",
        x: "Bootstrap by paper, 2,000 resamples. 9 of 64 features differ from the controls with intervals clear of zero.",
      },
      {
        id: "s4",
        a: "st",
        t: "Look for other causes",
        x: "Year, subfield, length and template checked for each difference. Three are explained by something else, so 6 remain distinctive.",
      },
      { id: "JK4", check: true, t: "Decide on the abstract habit" },
      {
        id: "s5",
        a: "st",
        t: "Check on the held-out papers",
        x: "The 43 papers set aside in J1: 61 of 64 features hold. 3 drift and are marked provisional.",
      },
      {
        id: "s6",
        a: "st",
        t: "Find paragraph archetypes",
        x: "Six recurring paragraph shapes cover 72% of paragraphs. Each keeps three source examples.",
      },
    ],
  },
  {
    id: "J5",
    mods: "JFE-01.8 Profile Publisher",
    name: "Review and publication",
    title: "Review, freeze and publish the profile",
    lead: "Each finding is labelled by how strong its evidence is. Rules come only from the guidelines; the papers supply habits. Once you publish, the profile is frozen, and every writing run pins this exact version.",
    steps: [
      {
        id: "t1",
        a: "pb",
        t: "Label each finding by its evidence",
        x: "Descriptive, comparative or validated as distinctive. Nothing becomes a rule because it is common.",
      },
      {
        id: "t2",
        a: "pb",
        t: "Separate rules, habits and limits",
        x: "6 rules come from the guidelines, 8 habits from the papers, 2 prohibitions from the guidelines and the rights.",
      },
      {
        id: "t3",
        a: "pb",
        t: "Turn archetypes into recipes",
        x: "Four writing recipes, each pinned to this profile and to the pattern it came from.",
      },
      {
        id: "t4",
        a: "pb",
        t: "Compare with v1",
        x: "v1 covered the Introductions of 150 papers. v2 adds 8 section types, 23 features and a control set.",
      },
      { id: "JG2", gate: true, t: "Publish JFE-EDJ-v2?" },
      {
        id: "t5",
        a: "pb",
        t: "Freeze the release",
        x: "JFE-EDJ-v2 is frozen and hashed. v1 stays readable for runs pinned to it.",
      },
    ],
  },
];
export const JSTAGE: Record<string, JStageDef> = Object.fromEntries(JSTAGES.map((s) => [s.id, s]));
export const JLINEAGE: Record<string, { reads: string[]; writes: [string, string][] }> = {
  J1: {
    reads: ["Journal ISSN", "Eligibility policy"],
    writes: [
      ["Corpus manifest", "p3"],
      ["Exclusion log", "p5"],
      ["Holdout list", "p6"],
    ],
  },
  J2: {
    reads: ["Corpus manifest"],
    writes: [
      ["Canonical documents", "q4"],
      ["Parse audit", "q6"],
    ],
  },
  J3: {
    reads: ["Canonical documents", "Registry v2"],
    writes: [
      ["Annotations", "r2"],
      ["Measurements", "r5"],
    ],
  },
  J4: {
    reads: ["Measurements", "Holdout list"],
    writes: [
      ["Pattern statistics", "s3"],
      ["Archetypes", "s6"],
    ],
  },
  J5: {
    reads: ["Pattern statistics", "Author guidelines"],
    writes: [
      ["Profile draft", "t2"],
      ["JFE-EDJ-v2, frozen", "t5"],
    ],
  },
};
export const JSCREENS: ScreenDef[] = [
  { key: "corpus", title: "Choose the papers", short: "Corpus", stages: ["J1"], block: 0, gate: "JG1" },
  { key: "parse", title: "Read every paper the same way", short: "Parse", stages: ["J2"], block: 0 },
  { key: "annotate", title: "Label and measure", short: "Annotate", stages: ["J3"], block: 1, check: "JK3" },
  { key: "analyze", title: "Typical and distinctive", short: "Analyze", stages: ["J4"], block: 1, check: "JK4" },
  { key: "publish", title: "Review and publish", short: "Publish", stages: ["J5"], block: 2, gate: "JG2" },
];
export const JSCREEN_OF: Record<string, string> = Object.fromEntries(JSCREENS.map((s) => [s.stages[0], s.key]));
export const JBLOCKS: string[] = ["Collect", "Measure", "Publish"];
export const JONE: Record<string, string> = {
  J1: "The papers are chosen, matched with controls and cleared for use.",
  J2: "Every paper is read into the same structure, without the template.",
  J3: "Every sentence gets a move; every approved feature gets a value.",
  J4: "Each paper counts once; differences are tested before they count.",
  J5: "Rules, habits and limits are kept apart, then the profile is frozen.",
};
export const JORB: Record<string, string> = {
  J1: "searching",
  J2: "connecting",
  J3: "composing",
  J4: "solving",
  J5: "shaping",
};

/* the four stops */
export const JSTOP_NO: Record<string, number> = { JG1: 1, JG2: 2 };
export const JSTOP_INFO: Record<string, { title: string; where: string }> = {
  JG1: { title: "Approve the corpus", where: "After sampling" },
  JK3: { title: "Settle the disputed labels", where: "Annotate" },
  JK4: { title: "Decide on the abstract habit", where: "Analyze" },
  JG2: { title: "Publish the profile", where: "After the review" },
};
export const JSTOP_STAGE: Record<string, string> = { JG1: "J1", JK3: "J3", JK4: "J4", JG2: "J5" };
export const JDEC: Record<string, JDecDef> = {
  JG1: {
    title: "Build the profile from this corpus?",
    why: "Everything after this is computed from these papers. Changing the sample later means building the profile again.",
    rec: [
      "The Orchestrator recommends building",
      87,
      "Every year has 40 papers, the controls match by year and subfield, and every exclusion has a logged reason.",
    ],
    sum: [
      ["ok", "223 Education Data Journal research articles, 2021–2026"],
      ["ok", "102 matched papers from three journals in the same field"],
      ["warn", "25 papers dropped: no text-mining right"],
      ["ok", "45 + 20 papers held out until J4"],
    ],
    opts: [
      ["go", "Build from this corpus", "Parsing starts. The corpus manifest is frozen with its seed.", 1],
      ["hold", "Hold for a curator review", "The run waits. Nothing is parsed until you release it.", 0],
    ],
    cta: "Build the profile",
  },
  JK3: {
    title: "The annotators disagree on “Compare with prior work”",
    why: "Agreement on this Discussion move is α 0.61, below the 0.67 floor. A label this unsure cannot feed writing advice.",
    rec: [
      "Tighten the guideline and label again",
      82,
      "Most disputes are sentences that compare and interpret at once. Allowing two labels, with compare as primary when a prior result is named, settles most of them.",
    ],
    opts: [
      [
        "relabel",
        "Tighten the guideline, label the 58 spans again",
        "Both annotators relabel. The move is used only if α reaches 0.67.",
        1,
      ],
      [
        "prov",
        "Keep it, marked provisional",
        "It is published but never used as writing advice. Writers see it greyed out.",
        0,
      ],
    ],
  },
  JK4: {
    title: "One-paragraph abstracts break the new guidelines",
    why: "81% of the papers use a one-paragraph abstract. Since September 2026 the guidelines require a structured one, and every paper in the corpus is older than the rule.",
    rec: [
      "Keep it as a habit, marked superseded",
      90,
      "The profile reports what papers did. The mark tells any writer that the rule wins, so nothing is hidden and nothing is forced.",
    ],
    opts: [
      ["flag", "Keep it, marked superseded by the rule", "Writers see the habit and that the rule overrides it.", 1],
      ["drop", "Drop it from v2", "The habit disappears. Writers would not see why older papers look different.", 0],
    ],
  },
  JG2: {
    title: "Publish JFE-EDJ-v2?",
    why: "Publishing freezes the profile. Writing runs pin this exact version; any later change becomes v3.",
    rec: [
      "The Orchestrator recommends publishing",
      88,
      "Every finding traces to its papers and spans, every chart states its N, and the five limitations are written down.",
    ],
    checks: [
      "I have read the five limitations of this profile",
      "Habits are guidance. Only the six guideline rules bind a writer",
    ],
    opts: [
      ["pub", "Publish and freeze", "v2 becomes readable by writing runs. v1 stays readable.", 1],
      ["hold", "Do not publish yet", "The draft stays editable, and no writing run can use it.", 0],
    ],
    cta: "Publish JFE-EDJ-v2",
  },
};
export const JDONE_TEXT: Record<string, string> = {
  "JG1:go": "Approved the corpus: 223 papers and 102 controls.",
  "JG1:hold": "Held the corpus for a curator review.",
  "JK3:relabel": "Tightened the guideline; the 58 disputed spans were labelled again.",
  "JK3:prov": "Kept “Compare with prior work” as provisional.",
  "JK4:flag": "Kept one-paragraph abstracts as a habit, superseded by the rule.",
  "JK4:drop": "Dropped the abstract habit from v2.",
  "JG2:pub": "Published JFE-EDJ-v2.",
  "JG2:hold": "Held the profile as a draft.",
};
export const JRULES: [string, string][] = [
  ["One paper, one vote", "Each paper gives one value per feature; sentences are never pooled."],
  ["Rights before reading", "A paper without a text-mining right is never parsed."],
  ["The template is not style", "Running heads, boilerplate and layout are removed before measuring."],
  ["Common is not required", "Only the guidelines make a rule. Corpus habits stay guidance."],
  ["Only approved features are scored", "Candidates stay in the registry until a person approves them."],
  ["Published means frozen", "A new finding makes v3. v2 never changes."],
];

/* ---------- J1 · the corpus wall ---------- */
export const JYEARS: number[] = [2021, 2022, 2023, 2024, 2025, 2026];
export const JYEAR_N: number[] = [171, 182, 189, 196, 201, 207];
export const JBINS: [string, string, number][] = [
  ["ed", "Editorials and news", 96],
  ["rev", "Reviews and surveys", 118],
  ["short", "Short papers and demos", 233],
  ["corr", "Corrections, retractions", 41],
  ["dup", "Duplicates", 9],
  ["rights", "No text-mining right", 25],
];
export const JCTRL: { k: string; n: string; elig: number; s: number }[] = [
  { k: "B", n: "Journal B", elig: 212, s: 38 },
  { k: "C", n: "Journal C", elig: 188, s: 37 },
  { k: "D", n: "Journal D", elig: 164, s: 35 },
];
export const JCTRL_YEAR: number[] = [18, 18, 18, 19, 18, 19];
export const JSAMPLING: [string, string][] = [
  ["Query", "source = Education Data Journal · type = research article · 2021–2026"],
  ["Strata", "year × subfield: retention, assessment, learning analytics"],
  ["Seed", "20260918"],
  ["Drawn", "18 Sep 2026, 10:42"],
  ["Controls", "Journals B, C and D · matched on year and subfield"],
];
export const JRIGHTS: [string, string, string][] = [
  ["Analyse", "325 of 325", "Every kept paper"],
  ["Store full text", "214", "The rest keep offsets only"],
  ["Show an excerpt", "248", "40 words at most"],
  ["Export text", "0", "Never, for any paper"],
];

/* ---------- J2 · parsing ---------- */
/* the sample page, as blocks in reading order: [id, kind, x, y, w, h (% of page), tag, lines, maps to] */
export const JPAGE: [string, string, number, number, number, number, string, number, string][] = [
  ["rh", "tpl", 6, 3.2, 88, 2.2, "running head", 0, "Education Data Journal (example) · Vol. 18 · 2024"],
  ["ti", "meta", 6, 7.5, 88, 5.5, "title", 2, "TITLE"],
  ["au", "meta", 6, 14, 60, 2.4, "authors", 1, "AUTHORS"],
  ["ab", "prose", 6, 18.5, 88, 13, "abstract", 5, "ABSTRACT"],
  ["h1", "head", 6, 34, 42, 3, "head", 0, "1 INTRODUCTION"],
  ["p1", "prose", 6, 38, 42, 17, "p", 7, "INTRODUCTION · paragraph 1"],
  ["p2", "prose", 6, 56.5, 42, 21, "p", 9, "INTRODUCTION · paragraph 2"],
  ["h2", "head", 52, 34, 42, 3, "head", 0, "2 BACKGROUND AND MOTIVATION"],
  ["p3", "prose", 52, 38, 42, 15, "p", 6, "RELATED_WORK · paragraph 1"],
  ["fg", "fig", 52, 54.5, 42, 18, "figure", 0, "Figure 1"],
  ["p4", "prose", 52, 74, 42, 9, "p", 4, "RELATED_WORK · paragraph 2"],
  ["fn", "tpl", 6, 86, 88, 5, "copyright · CRediT", 2, "© 2024 Education Data Journal (example). CRediT statement"],
  ["pn", "tpl", 42, 93.5, 16, 3, "page no.", 0, "3"],
];
export const JPAGE_KIND: Record<string, { label: string; tone: string }> = {
  tpl: { label: "template", tone: "border-rose-500/60 bg-rose-500/[0.06] text-rose-700 dark:text-rose-300" },
  meta: { label: "metadata", tone: "border-slate-400/70 bg-slate-500/[0.06] text-slate-700 dark:text-slate-300" },
  head: { label: "heading", tone: "border-sky-500/70 bg-sky-500/[0.07] text-sky-700 dark:text-sky-300" },
  prose: { label: "prose", tone: "border-emerald-500/60 bg-emerald-500/[0.05] text-emerald-700 dark:text-emerald-300" },
  fig: { label: "figure", tone: "border-violet-500/60 bg-violet-500/[0.06] text-violet-700 dark:text-violet-300" },
};
/* the canonical document of that paper, node by node */
export const JTREE: [number, string, string, string][] = [
  [0, "P-0137", "Education Data Journal · 2024 · PDF → TEI", "doc"],
  [1, "ABSTRACT", "1 paragraph · 6 sentences · chars 0–1,042", "sec"],
  [1, "INTRODUCTION", "5 paragraphs · 27 sentences", "sec"],
  [2, "Paragraph 1", "4 sentences · chars 1,043–1,655", "p"],
  [2, "Paragraph 2", "5 sentences · chars 1,656–2,431", "p"],
  [1, "RELATED_WORK", "4 paragraphs · 19 sentences", "sec"],
  [1, "METHODS", "7 paragraphs · 41 sentences", "sec"],
  [1, "RESULTS", "6 paragraphs · 33 sentences", "sec"],
  [1, "DISCUSSION", "4 paragraphs · 22 sentences", "sec"],
  [1, "CONCLUSION", "1 paragraph · 5 sentences", "sec"],
];
export const JHEADMAP: [string, string[], number, string?][] = [
  ["I. INTRODUCTION", ["INTRODUCTION"], 41],
  ["1 Introduction", ["INTRODUCTION"], 167],
  ["Background and Motivation", ["RELATED_WORK"], 23],
  ["Proposed Approach", ["METHODS"], 38],
  ["Experimental Setup", ["METHODS"], 71],
  ["Evaluation", ["RESULTS"], 64],
  ["Results and Discussion", ["RESULTS", "DISCUSSION"], 28, "combined"],
  ["Threats to Validity", ["DISCUSSION"], 19],
  ["Conclusions and Future Work", ["CONCLUSION"], 102],
];
export const JTEMPLATE: [string, string][] = [
  ["Running heads", "3,104 lines"],
  ["Page numbers", "2,710"],
  ["Copyright lines", "325"],
  ["CRediT blocks", "211"],
];
export const JPARSE_N = 325;
/* where the 17 failures sit in the queue, and why */
export const JPARSE_FAIL: Record<number, string> = Object.fromEntries(
  (
    [
      [14, "scan"],
      [37, "scan"],
      [52, "intro"],
      [88, "scan"],
      [101, "order"],
      [129, "scan"],
      [146, "intro"],
      [170, "scan"],
      [188, "order"],
      [203, "scan"],
      [219, "intro"],
      [241, "scan"],
      [262, "scan"],
      [277, "intro"],
      [290, "order"],
      [301, "scan"],
      [316, "intro"],
    ] as [number, string][]
  ).map(([i, k]) => [i, k]),
);
export const JFAIL_WHY: Record<string, string> = {
  scan: "Scanned, no text layer",
  intro: "No Introduction found",
  order: "Reading order broken",
};

/* ---------- J3 · annotation ---------- */
export const JMOVE: Record<string, { n: string; hl: string; chip: string; bar: string }> = {
  M1: { n: "Territory", hl: "bg-sky-500/15", chip: "bg-sky-500/15 text-sky-800 dark:text-sky-300", bar: "bg-sky-500" },
  M2: {
    n: "Niche",
    hl: "bg-orange-500/15",
    chip: "bg-orange-500/15 text-orange-800 dark:text-orange-300",
    bar: "bg-orange-500",
  },
  M3: {
    n: "Occupy",
    hl: "bg-emerald-500/15",
    chip: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
    bar: "bg-emerald-500",
  },
};
/* P-0137, Introduction, paragraphs 1–2: the text, the first label, its function and confidence, and the blind second label */
export const JINTRO: [string, string, string, number, string][] = [
  [
    "Most universities now keep years of student records, and many use them to flag students at risk [3].",
    "M1",
    "context",
    0.97,
    "M1",
  ],
  [
    "Grades and engagement data are known to predict different students [4, 11], which is why they are often combined [7].",
    "M1",
    "prior work",
    0.91,
    "M1",
  ],
  [
    "These studies, however, use single courses, where the outcome is known within weeks.",
    "M2",
    "limitation",
    0.88,
    "M2",
  ],
  [
    "Whole degrees spread that outcome across years, and no study has measured what this does to combined models.",
    "M2",
    "gap statement",
    0.93,
    "M2",
  ],
  ["We compare three models on 1,400 student records under one fixed protocol.", "M3", "objective", 0.95, "M3"],
  ["Section 2 reviews related work, and Section 3 describes the protocol.", "M3", "organisation", 0.9, "M3"],
];
export const JALPHA: [string, string, number, number?][] = [
  ["Introduction", "Territory", 0.88],
  ["Introduction", "Niche", 0.83],
  ["Introduction", "Occupy", 0.86],
  ["Discussion", "Interpret", 0.79],
  ["Discussion", "Compare with prior work", 0.61, 0.78],
  ["Discussion", "Limit", 0.81],
  ["Discussion", "Imply", 0.74],
];
export const JDISPUTE: [string, string, string][] = [
  [
    "Unlike Lee et al. [9], we find the gain shrinks in later years, which suggests timing matters more than volume.",
    "Compare",
    "Interpret",
  ],
  [
    "This matches the pattern reported for secondary schools [12], though our margins are smaller.",
    "Compare",
    "Interpret",
  ],
  [
    "Our result therefore complements, rather than contradicts, earlier work on single courses.",
    "Interpret",
    "Compare",
  ],
];
/* the 152 candidate features of registry v2: id, name, how it is measured (d code · l model · h both), status (a approved · p approved, drifts · c candidate) */
export const REGISTRY: [string, string, string, string][] = [
  ["CORE_01", "section word count", "d", "a"],
  ["CORE_02", "section paragraph count", "d", "a"],
  ["CORE_03", "paragraph word count median", "d", "a"],
  ["CORE_04", "paragraph word count iqr", "d", "a"],
  ["CORE_05", "sentence word count median", "d", "a"],
  ["CORE_06", "sentence word count iqr", "d", "a"],
  ["CORE_07", "sentences per paragraph", "l", "c"],
  ["CORE_08", "paragraph position profile", "h", "c"],
  ["CORE_09", "subheading density", "d", "a"],
  ["CORE_10", "lexical diversity mattr", "l", "c"],
  ["CORE_11", "lexical density", "h", "c"],
  ["CORE_12", "technical term density", "h", "c"],
  ["CORE_13", "term introduction pattern", "l", "c"],
  ["CORE_14", "terminology repetition rate", "d", "a"],
  ["CORE_15", "nominalization density", "d", "a"],
  ["CORE_16", "passive voice rate", "d", "a"],
  ["CORE_17", "present tense share", "d", "a"],
  ["CORE_18", "past tense share", "d", "a"],
  ["CORE_19", "modality density", "d", "a"],
  ["CORE_20", "hedging density", "h", "a"],
  ["CORE_21", "boosting density", "d", "a"],
  ["CORE_22", "first person usage", "l", "a"],
  ["CORE_23", "transition marker density", "d", "a"],
  ["CORE_24", "contrast relation rate", "d", "a"],
  ["CORE_25", "cause effect relation rate", "d", "a"],
  ["CORE_26", "anaphoric reference rate", "d", "a"],
  ["CORE_27", "citation count per 1000 words", "d", "a"],
  ["CORE_28", "citation integrated rate", "d", "a"],
  ["CORE_29", "citation multi source rate", "d", "a"],
  ["CORE_30", "citation sentence position", "h", "c"],
  ["CORE_31", "figure reference density", "d", "a"],
  ["CORE_32", "table reference density", "d", "a"],
  ["CORE_33", "equation reference density", "d", "p"],
  ["CORE_34", "paragraph opening function", "l", "a"],
  ["CORE_35", "paragraph closing function", "l", "a"],
  ["CORE_36", "sentence function sequence", "l", "a"],
  ["ABS_01", "abstract word count", "d", "a"],
  ["ABS_02", "abstract move sequence", "l", "a"],
  ["ABS_03", "abstract move coverage", "l", "a"],
  ["ABS_04", "abstract background share", "d", "a"],
  ["ABS_05", "abstract purpose position", "h", "c"],
  ["ABS_06", "abstract method share", "d", "a"],
  ["ABS_07", "abstract results share", "d", "a"],
  ["ABS_08", "abstract quantitative result rate", "d", "p"],
  ["ABS_09", "abstract contribution position", "h", "c"],
  ["ABS_10", "abstract implication presence", "h", "c"],
  ["ABS_11", "abstract hedging by move", "l", "c"],
  ["ABS_12", "abstract final sentence function", "l", "c"],
  ["INT_01", "territory move position", "h", "a"],
  ["INT_02", "niche move position", "h", "a"],
  ["INT_03", "occupy move position", "h", "a"],
  ["INT_04", "introduction move sequence", "l", "a"],
  ["INT_05", "context opening archetype", "l", "c"],
  ["INT_06", "motivation statement position", "h", "c"],
  ["INT_07", "prior work synthesis ratio", "d", "a"],
  ["INT_08", "prior work contrast pattern", "l", "c"],
  ["INT_09", "challenge statement position", "h", "c"],
  ["INT_10", "gap statement position", "h", "a"],
  ["INT_11", "gap statement explicitness", "l", "c"],
  ["INT_12", "gap evidence citation pattern", "l", "c"],
  ["INT_13", "gap consequence sequence", "l", "c"],
  ["INT_14", "research question position", "h", "a"],
  ["INT_15", "objective statement pattern", "l", "c"],
  ["INT_16", "approach overview position", "h", "c"],
  ["INT_17", "contribution list format", "l", "a"],
  ["INT_18", "contribution sentence pattern", "l", "c"],
  ["INT_19", "intro closing archetype", "l", "c"],
  ["INT_20", "intro paragraph move transition", "l", "a"],
  ["RWK_01", "related work organization type", "l", "c"],
  ["RWK_02", "related work theme count", "d", "a"],
  ["RWK_03", "related work topic transition", "l", "c"],
  ["RWK_04", "related work synthesis ratio", "d", "a"],
  ["RWK_05", "related work comparison density", "h", "c"],
  ["RWK_06", "related work citation cluster size", "d", "a"],
  ["RWK_07", "related work critical stance rate", "h", "c"],
  ["RWK_08", "related work taxonomy presence", "h", "c"],
  ["RWK_09", "related work table integration", "d", "a"],
  ["RWK_10", "related work gap revisit", "l", "c"],
  ["RWK_11", "related work closing function", "l", "c"],
  ["RWK_12", "related work paragraph archetype", "l", "p"],
  ["MTH_01", "method opening pattern", "l", "c"],
  ["MTH_02", "system model position", "h", "c"],
  ["MTH_03", "assumption statement position", "h", "c"],
  ["MTH_04", "notation introduction pattern", "l", "c"],
  ["MTH_05", "architecture overview pattern", "l", "c"],
  ["MTH_06", "component description sequence", "l", "c"],
  ["MTH_07", "algorithm introduction pattern", "l", "c"],
  ["MTH_08", "algorithm step narration", "d", "a"],
  ["MTH_09", "equation introduction pattern", "l", "c"],
  ["MTH_10", "equation followup explanation", "l", "c"],
  ["MTH_11", "method rationale position", "d", "a"],
  ["MTH_12", "method design tradeoff pattern", "l", "c"],
  ["MTH_13", "method procedure sequence", "l", "c"],
  ["MTH_14", "implementation detail density", "d", "a"],
  ["MTH_15", "method reproducibility detail", "l", "c"],
  ["MTH_16", "method subsection transition", "l", "c"],
  ["MTH_17", "method figure callout pattern", "l", "c"],
  ["MTH_18", "method closing summary pattern", "l", "c"],
  ["RES_01", "results opening pattern", "l", "c"],
  ["RES_02", "experiment question position", "h", "c"],
  ["RES_03", "setup description ratio", "d", "a"],
  ["RES_04", "baseline introduction pattern", "l", "c"],
  ["RES_05", "metric definition pattern", "l", "c"],
  ["RES_06", "figure callout position", "h", "c"],
  ["RES_07", "table callout position", "h", "c"],
  ["RES_08", "quantitative claim sentence pattern", "l", "a"],
  ["RES_09", "baseline comparison sequence", "l", "a"],
  ["RES_10", "relative improvement expression", "l", "c"],
  ["RES_11", "significance reporting pattern", "l", "c"],
  ["RES_12", "result interpretation ratio", "h", "c"],
  ["RES_13", "ablation reporting pattern", "l", "c"],
  ["RES_14", "sensitivity reporting pattern", "l", "c"],
  ["RES_15", "negative result disclosure", "l", "c"],
  ["RES_16", "result caveat placement", "l", "c"],
  ["RES_17", "results paragraph archetype", "l", "a"],
  ["RES_18", "results section closing pattern", "l", "c"],
  ["DIS_01", "discussion opening move", "l", "a"],
  ["DIS_02", "finding restatement rate", "d", "a"],
  ["DIS_03", "finding interpretation sequence", "l", "c"],
  ["DIS_04", "causal explanation qualification", "l", "c"],
  ["DIS_05", "prior work alignment pattern", "l", "a"],
  ["DIS_06", "contradiction resolution pattern", "l", "c"],
  ["DIS_07", "practical implication pattern", "l", "c"],
  ["DIS_08", "theoretical implication pattern", "l", "c"],
  ["DIS_09", "alternative explanation pattern", "l", "c"],
  ["DIS_10", "discussion hedging distribution", "l", "c"],
  ["DIS_11", "limitation statement position", "h", "a"],
  ["DIS_12", "limitation causality pattern", "l", "c"],
  ["DIS_13", "threats to validity structure", "l", "c"],
  ["DIS_14", "generalization scope pattern", "l", "c"],
  ["DIS_15", "future work motivation", "l", "c"],
  ["DIS_16", "discussion closing move", "l", "a"],
  ["CON_01", "conclusion opening pattern", "l", "c"],
  ["CON_02", "objective recap presence", "h", "c"],
  ["CON_03", "main finding summary pattern", "l", "c"],
  ["CON_04", "contribution recap format", "l", "c"],
  ["CON_05", "quantitative takeaway frequency", "d", "a"],
  ["CON_06", "scope qualification presence", "h", "c"],
  ["CON_07", "future work position", "h", "c"],
  ["CON_08", "conclusion final sentence function", "l", "c"],
  ["XSC_01", "abstract intro objective alignment", "l", "c"],
  ["XSC_02", "intro method objective trace", "l", "c"],
  ["XSC_03", "rq result trace presence", "h", "c"],
  ["XSC_04", "contribution evaluation trace", "l", "c"],
  ["XSC_05", "method metric trace", "l", "c"],
  ["XSC_06", "result discussion reference pattern", "l", "c"],
  ["XSC_07", "intro conclusion reprise", "l", "c"],
  ["XSC_08", "term consistency cross sections", "l", "c"],
  ["XSC_09", "figure reference coherence", "l", "c"],
  ["XSC_10", "claim strength shift sections", "l", "c"],
  ["XSC_11", "section transition strategy", "d", "a"],
  ["XSC_12", "macro rhetorical storyline", "l", "c"],
];
export const JFAMILY: [string, string][] = [
  ["CORE", "Core writing"],
  ["ABS", "Abstract"],
  ["INT", "Introduction"],
  ["RWK", "Related work"],
  ["MTH", "Methods"],
  ["RES", "Results"],
  ["DIS", "Discussion"],
  ["CON", "Conclusion"],
  ["XSC", "Cross-section"],
];
export const JMETHOD: Record<string, string> = { d: "By code", l: "By a model", h: "Model and code" };
/* the order the approved features are measured in: code first, then the model */
export const JMEASURE_ORDER = REGISTRY.filter((f) => f[3] !== "c").sort(
  (a, b) => "dhl".indexOf(a[2]) - "dhl".indexOf(b[2]),
);

/* ---------- J4 · statistics ---------- */
/* paragraph length per paper (words), from a quantile curve that passes through the reported quartiles */
export function jQuantiles(pts: [number, number][], n: number) {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const p = (i + 0.5) / n;
    let k = 0;
    while (k < pts.length - 2 && p > pts[k + 1][0]) k++;
    const [p0, v0] = pts[k];
    const [p1, v1] = pts[k + 1];
    out.push(v0 + ((p - p0) / (p1 - p0)) * (v1 - v0));
  }
  return out;
}
export const JPARA_T = jQuantiles(
  [
    [0, 72],
    [0.25, 110],
    [0.5, 132],
    [0.75, 150],
    [1, 214],
  ],
  212,
);
export const JPARA_C = jQuantiles(
  [
    [0, 70],
    [0.25, 106],
    [0.5, 128],
    [0.75, 147],
    [1, 205],
  ],
  96,
);
/* where each move sits along the Introduction, in tenths: share of papers with that move in that tenth */
export const JHEAT: [string, number[]][] = [
  ["M1", [0.92, 0.81, 0.55, 0.3, 0.16, 0.09, 0.05, 0.04, 0.03, 0.02]],
  ["M2", [0.04, 0.12, 0.34, 0.55, 0.62, 0.48, 0.26, 0.12, 0.07, 0.05]],
  ["M3", [0.02, 0.03, 0.05, 0.1, 0.18, 0.38, 0.62, 0.8, 0.88, 0.91]],
];
/* target against controls: feature, medians, Cliff's delta with its 95% bootstrap interval, verdict */
export const JFOREST: [string, string, string, string, number, number, number, string][] = [
  ["CORE_20", "Hedges per 1,000 words", "4.1", "5.6", -0.41, -0.53, -0.29, "distinct"],
  ["CORE_01", "Related work, % of words", "11", "8", 0.36, 0.22, 0.48, "distinct"],
  ["CORE_22", "“We” per 1,000 words", "9.8", "7.1", 0.31, 0.17, 0.44, "distinct"],
  ["INT_04", "Moves in CARS order, % of papers", "78", "61", 0.29, 0.14, 0.43, "distinct"],
  ["CORE_16", "Passive voice, % of sentences", "22", "31", -0.38, -0.5, -0.25, "year"],
  ["CORE_03", "Paragraph length, words", "132", "128", 0.06, -0.07, 0.19, "same"],
  ["CORE_27", "Citations per 1,000 words", "9.1", "10.4", -0.11, -0.24, 0.02, "same"],
];
export const JVERDICT: Record<string, { label: string; chip: string; dot: string; line: string }> = {
  distinct: {
    label: "Distinctive",
    chip: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
    dot: "fill-emerald-600 dark:fill-emerald-400",
    line: "stroke-emerald-600 dark:stroke-emerald-400",
  },
  year: {
    label: "Explained by year",
    chip: "bg-amber-500/12 text-amber-800 dark:text-amber-300",
    dot: "fill-amber-500",
    line: "stroke-amber-500",
  },
  same: {
    label: "Not different",
    chip: "bg-muted text-muted-foreground",
    dot: "fill-muted-foreground",
    line: "stroke-muted-foreground",
  },
};
/* the three differences something else explains */
export const JCONFOUND: { f: string; why: string; t: number[]; c: number[]; unit: string }[] = [
  {
    f: "Passive voice",
    why: "Falls with year in both sets. Education Data Journal's sample has more recent papers.",
    t: [29, 27, 24, 21, 19, 17],
    c: [35, 34, 32, 30, 28, 27],
    unit: "%",
  },
  {
    f: "Data availability statement",
    why: "Jumps after the publisher's 2024 policy. A policy, not a writing habit.",
    t: [31, 36, 44, 71, 82, 88],
    c: [28, 30, 33, 40, 47, 55],
    unit: "%",
  },
  {
    f: "Subheadings per 1,000 words",
    why: "The journal's LaTeX class numbers every subsection. Template, not style.",
    t: [3.1, 3.2, 3.0, 3.1, 3.2, 3.1],
    c: [1.9, 2.0, 2.1, 1.9, 2.0, 2.0],
    unit: "",
  },
];
/* paragraph archetypes: name, section, the functions in order, share, example source */
export const JROLE: Record<string, string> = {
  context: "bg-slate-400",
  prior: "bg-indigo-500",
  gap: "bg-orange-500",
  aim: "bg-emerald-500",
  evid: "bg-teal-500",
  comp: "bg-sky-500",
  qual: "bg-violet-500",
};
export const JARCH: {
  id: string;
  n: string;
  sec: string;
  roles: [string, string][];
  share: number;
  of: string;
  ex: string;
}[] = [
  {
    id: "A1",
    n: "Opening context",
    sec: "Introduction",
    roles: [
      ["context", "Context"],
      ["context", "Why it matters"],
      ["prior", "What is done"],
    ],
    share: 38,
    of: "of Introductions",
    ex: "P-0137 para. 1 · P-0412 para. 1 · P-0583 para. 1",
  },
  {
    id: "A2",
    n: "Gap paragraph",
    sec: "Introduction",
    roles: [
      ["prior", "Prior work"],
      ["comp", "Contrast"],
      ["gap", "Limitation"],
      ["gap", "Gap"],
    ],
    share: 41,
    of: "of Introductions",
    ex: "P-0137 para. 2 · P-0219 para. 2 · P-0640 para. 3",
  },
  {
    id: "A3",
    n: "Aims and contributions",
    sec: "Introduction",
    roles: [
      ["aim", "Objective"],
      ["aim", "Approach"],
      ["aim", "Contributions"],
      ["context", "Organisation"],
    ],
    share: 57,
    of: "of Introductions",
    ex: "P-0091 para. 4 · P-0137 para. 5 · P-0702 para. 4",
  },
  {
    id: "A4",
    n: "Result with its interval",
    sec: "Results",
    roles: [
      ["context", "What was compared"],
      ["evid", "Effect and interval"],
      ["comp", "Second system"],
      ["qual", "How computed"],
    ],
    share: 46,
    of: "of Results paragraphs",
    ex: "P-0219 para. 12 · P-0355 para. 9 · P-0811 para. 14",
  },
  {
    id: "A5",
    n: "Interpret, then compare",
    sec: "Discussion",
    roles: [
      ["evid", "Finding"],
      ["qual", "Interpretation"],
      ["comp", "Prior work"],
      ["qual", "Qualifier"],
    ],
    share: 33,
    of: "of Discussion paragraphs",
    ex: "P-0412 para. 18 · P-0583 para. 16 · P-0911 para. 20",
  },
  {
    id: "A6",
    n: "Limits and scope",
    sec: "Discussion",
    roles: [
      ["gap", "Limitation"],
      ["qual", "Consequence"],
      ["qual", "Scope"],
    ],
    share: 29,
    of: "of Discussion paragraphs",
    ex: "P-0137 para. 21 · P-0640 para. 19 · P-0702 para. 17",
  },
];

/* ---------- J5 · the profile ---------- */
export const JEVIDENCE: [string, string, number, string, string][] = [
  ["descriptive", "Descriptive", 44, "bg-foreground/35", "What the papers do. No comparison claimed."],
  ["comparative", "Comparative", 11, "bg-sky-500", "Differs from the controls, or explained by something else."],
  [
    "distinct",
    "Validated distinctive",
    6,
    "bg-emerald-500",
    "Differs, survives the other causes and the held-out papers.",
  ],
  ["prov", "Provisional", 3, "bg-amber-500", "Drifts on held-out papers. Never used as advice."],
];
export const JRULES_OUT: [string, string][] = [
  ["Up to 9,000 words", "Guidelines §2.1"],
  ["Structured abstract, up to 250 words", "Guidelines §2.3"],
  ["Data availability statement", "Guidelines §5.1"],
  ["Use of AI must be declared", "Guidelines §5.4"],
  ["“Significant” only with a stated test", "Guidelines §4.2"],
  ["ACM reference style", "Guidelines §6"],
];
export const JHABITS_OUT: [string, string, string][] = [
  ["One-paragraph abstract", "81%", "superseded by §2.3"],
  ["IMRaD with Related work", "64%", ""],
  ["Paragraph length", "≈ 132 words", ""],
  ["Hedges", "4.1 per 1,000 words", "distinctive"],
  ["Voice", "“we”, 22% passive", "“we” distinctive"],
  ["Citations", "≈ 1.2 per paragraph", ""],
  ["Introduction moves", "CARS order, 78%", "distinctive"],
  ["Discussion moves", "interpret, compare, limit, imply, 64%", ""],
];
export const JPROHIBIT: [string, string][] = [
  ["“Significant” without a stated test", "Guidelines §4.2"],
  ["Quoting more than 40 words of any corpus paper", "Rights flags"],
];
export const JRECIPES: [string, string, string, string][] = [
  ["R-EDJ-01", "Gap paragraph", "A2", "Introduction"],
  ["R-EDJ-02", "Aims and contributions", "A3", "Introduction"],
  ["R-EDJ-03", "Result with its interval", "A4", "Results"],
  ["R-EDJ-04", "Interpret, then compare", "A5", "Discussion"],
];
export const JDIFF: [string, string, string][] = [
  ["Sections", "Introduction only", "9 section types"],
  ["Papers", "150, no controls", "212 + 96 controls"],
  ["Features", "41", "64 approved · 23 new"],
  ["Redefined", "", "2 · sentence length in words, citations per 1,000 words"],
  ["Retired", "", "1 · move count, replaced by move order"],
];
export const JLIMITS = [
  "One journal, English research articles, 2021–2026.",
  "212 of 649 eligible papers, sampled by year; subfields are not equally large.",
  "Every paper predates the guidelines of September 2026.",
  "Three features drift on held-out papers and are provisional.",
  "Controls come from three journals; another set could move the comparisons.",
];
export const JPROFILE_HASH = "9f2c…e71a";
