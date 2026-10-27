/** One turn of the debate. g: grounds [kind, ref] · cq: the critical question asked · re: the turn it answers ·
 * on/r/fx: for a ruling, the challenge it closes, its outcome and what it adds to the diagrams. */
export interface Turn {
  id: string;
  th: string;
  a: string;
  st: string;
  tx: string;
  g?: [string, string][];
  cq?: string;
  tgt?: string;
  sev?: string;
  re?: string;
  on?: string;
  r?: string;
  fx?: string;
  note?: string;
}

/* ===== S04 · the debate: schemes, critical questions, grounds, turns and rulings ===== */

/* Each claim is argued under the scheme it uses (Walton, Reed & Macagno, 2008). A scheme comes with its critical questions. */
export const SCHEMES: Record<string, { n: string; src: string; form: string; cqs: [string, string][] }> = {
  GAP: {
    n: "Argument from ignorance",
    src: "Walton, 1996",
    form: "No study was found where one would be found, so none exists.",
    cqs: [
      ["G1", "How far did the search go?"],
      ["G2", "Would such a study have been found if it existed?"],
      ["G3", "Is there evidence against the gap?"],
    ],
  },
  F: {
    n: "Argument from evidence to a hypothesis",
    src: "Walton et al., 2008",
    form: "The result predicted by H is observed, so H is supported.",
    cqs: [
      ["E1", "Does the evidence trace to the record?"],
      ["E2", "Was every condition measured the same way?"],
      ["E3", "Could something else explain the difference?"],
      ["E4", "Is the uncertainty computed on independent units?"],
      ["E5", "Was the analysis fixed before the result was seen?"],
    ],
  },
  N: {
    n: "Argument from a negative result",
    src: "Walton, 1996",
    form: "No difference was found, so none is claimed.",
    cqs: [
      ["N1", "Could the test have found a difference this small?"],
      ["N2", "Was the comparison fixed before the result was seen?"],
    ],
  },
  P: {
    n: "Argument from sample to population",
    src: "Walton et al., 2008",
    form: "What holds in the sample holds in the population it stands for.",
    cqs: [
      ["P1", "Is the sample like the population?"],
      ["P2", "Is the sample large enough?"],
      ["P3", "Are there known counterexamples?"],
    ],
  },
};
export const THREADS: { id: string; sch: string; t: string; claim: string }[] = [
  {
    id: "GAP",
    sch: "GAP",
    t: "The gap",
    claim:
      "No study has tested, under a fixed protocol, whether fusion finds more marked evidence than either signal alone.",
  },
  { id: "F1", sch: "F", t: "Finding 1", claim: "Fusion finds more of the marked evidence than BM25." },
  { id: "F2", sch: "F", t: "Finding 2", claim: "The gain is largest when evidence is spread out." },
  { id: "F3", sch: "N", t: "Finding 3", claim: "At the same budget there is no clear gain." },
  { id: "C", sch: "P", t: "Conclusion", claim: "Fusion is the better default for long scientific papers." },
];

/* What a challenge or an answer may rest on. Anything else is struck. */
export const GROUND: Record<string, { n: string; icon: string; c: string }> = {
  cq: { n: "Critical question", icon: "list", c: "bg-stone-500/12 text-stone-700 dark:text-stone-300" },
  led: { n: "Ledger span", icon: "table", c: "bg-teal-500/12 text-teal-700 dark:text-teal-300" },
  rep: { n: "Data report", icon: "file", c: "bg-sky-500/12 text-sky-700 dark:text-sky-300" },
  std: { n: "Reporting standard", icon: "shield", c: "bg-violet-500/12 text-violet-700 dark:text-violet-300" },
  src: { n: "Source in the package", icon: "book", c: "bg-indigo-500/12 text-indigo-700 dark:text-indigo-300" },
  none: { n: "No ground", icon: "ban", c: "bg-rose-500/12 text-rose-700 dark:text-rose-300" },
};

/* Stances, as the FE's debate board names them, plus the judge's ruling. */
export const DSTANCE: Record<string, { label: string; icon: string; c: string; bar: string }> = {
  propose: {
    label: "Proposes",
    icon: "bulb",
    c: "bg-violet-500/12 text-violet-700 dark:text-violet-300",
    bar: "bg-violet-500",
  },
  challenge: {
    label: "Challenges",
    icon: "swords",
    c: "bg-orange-500/12 text-orange-700 dark:text-orange-300",
    bar: "bg-orange-500",
  },
  defend: {
    label: "Defends",
    icon: "shield",
    c: "bg-indigo-500/12 text-indigo-700 dark:text-indigo-300",
    bar: "bg-indigo-500",
  },
  refine: { label: "Refines", icon: "pen", c: "bg-sky-500/12 text-sky-700 dark:text-sky-300", bar: "bg-sky-500" },
  concede: {
    label: "Concedes",
    icon: "check",
    c: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
    bar: "bg-emerald-500",
  },
  rule: { label: "Rules", icon: "gavel", c: "bg-stone-500/15 text-stone-800 dark:text-stone-200", bar: "bg-stone-500" },
};
export const DSTANCE_ORDER: string[] = ["propose", "challenge", "defend", "refine", "concede", "rule"];

/* What each ruling does to the diagrams. This is the whole bridge from debate to Toulmin, AIF and ASPIC+. */
export const RULING: Record<string, { label: string; c: string; tou: string; aif: string; asp: string }> = {
  answered: {
    label: "Answered",
    c: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
    tou: "Backing",
    aif: "An RA that supports the premise or warrant",
    asp: "The attack fails",
  },
  conceded: {
    label: "Conceded",
    c: "bg-sky-500/12 text-sky-700 dark:text-sky-300",
    tou: "Qualifier narrows, or a rebuttal is added",
    aif: "The claim’s text changes; a CA may stay with a preference",
    asp: "The narrowed claim is not attacked",
  },
  upheld: {
    label: "Upheld",
    c: "bg-rose-500/12 text-rose-700 dark:text-rose-300",
    tou: "Rebuttal",
    aif: "A CA: undermine (premise), undercut (inference) or rebut (conclusion)",
    asp: "Undercuts always win; the rest by preference",
  },
  struck: {
    label: "Struck",
    c: "bg-muted text-muted-foreground",
    tou: "Nothing",
    aif: "Nothing is drawn",
    asp: "No effect",
  },
  rejected: {
    label: "Answer rejected",
    c: "bg-rose-500/12 text-rose-700 dark:text-rose-300",
    tou: "Nothing; the answer must be redone",
    aif: "Nothing is drawn",
    asp: "The challenge stays open",
  },
  unresolved: {
    label: "Unresolved",
    c: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
    tou: "Waits for you",
    aif: "Waits for you",
    asp: "Undecided until you rule",
  },
};
export const RULING_ORDER: string[] = ["answered", "conceded", "upheld", "struck", "rejected", "unresolved"];
export const TARGET: Record<string, string> = {
  premise: "premise · undermine",
  inference: "inference · undercut",
  conclusion: "conclusion · rebut",
};

/* The debate, turn by turn. g: grounds [kind, ref] · cq: the critical question asked · re: the turn it answers.
   A ruling (st "rule") names the challenge it closes (on), its outcome (r) and what it adds to the diagrams (fx). */
export const TURNS: Turn[] = [
  {
    id: "T01",
    th: "GAP",
    a: "aa",
    st: "propose",
    tx: "No study has tested, under a fixed protocol, whether fusing BM25 with a dense retriever finds more marked evidence than either alone.",
    g: [["rep", "B.2"]],
  },
  {
    id: "T02",
    th: "GAP",
    a: "ql",
    st: "challenge",
    cq: "G1",
    tgt: "premise",
    sev: "caveat",
    re: "T01",
    tx: "A gap is only as good as the search behind it. Which sources, which years, which queries?",
    g: [
      ["cq", "G1"],
      ["std", "PRISMA 6–7"],
    ],
  },
  {
    id: "T03",
    th: "GAP",
    a: "aa",
    st: "defend",
    re: "T02",
    tx: "ACL Anthology and Semantic Scholar, January 2018 to August 2026, four query strings: 214 hits screened, 18 read in full.",
    g: [
      ["rep", "B.2"],
      ["src", "search.json"],
    ],
  },
  {
    id: "T04",
    th: "GAP",
    a: "jd",
    st: "rule",
    on: "T02",
    r: "answered",
    tx: "Answered from the record. The search strategy becomes the backing of the gap.",
    fx: "Backing on RA·G",
  },
  {
    id: "T05",
    th: "GAP",
    a: "ql",
    st: "challenge",
    cq: "G3",
    tgt: "conclusion",
    sev: "fatal",
    re: "T01",
    tx: "Bruch et al. (2023) compare fusion functions for hybrid retrieval. Is that not this test?",
    g: [
      ["cq", "G3"],
      ["src", "Bruch et al., 2023"],
    ],
  },
  {
    id: "T06",
    th: "GAP",
    a: "aa",
    st: "defend",
    re: "T05",
    tx: "They score ranking quality with NDCG and recall at 1,000 on MS MARCO and BEIR. Nobody marks evidence paragraphs in long papers there.",
    g: [
      ["led", "EV-10"],
      ["rep", "I.2 · note 11"],
    ],
  },
  {
    id: "T07",
    th: "GAP",
    a: "jd",
    st: "rule",
    on: "T05",
    r: "answered",
    tx: "The rebut fails: a different task and different labels. The gap stands as worded, “under a fixed protocol”.",
    fx: "No CA drawn",
  },

  {
    id: "T08",
    th: "F1",
    a: "aa",
    st: "propose",
    tx: "Fusion finds more of the marked evidence than BM25: recall at 10 rises from 0.612 to 0.688, a gain of 0.076 (95% CI 0.059 to 0.093).",
    g: [
      ["led", "EV-02"],
      ["led", "EV-05"],
    ],
  },
  {
    id: "T09",
    th: "F1",
    a: "qm",
    st: "challenge",
    cq: "E2",
    tgt: "inference",
    sev: "caveat",
    re: "T08",
    tx: "Were all three systems scored on the same questions, cutoff and labels?",
    g: [
      ["cq", "E2"],
      ["rep", "B.6"],
    ],
  },
  {
    id: "T10",
    th: "F1",
    a: "aa",
    st: "defend",
    re: "T09",
    tx: "Yes. Plan §2 fixes them, and all 15 traces carry the same question-list hash.",
    g: [
      ["led", "EV-13"],
      ["rep", "D.1"],
    ],
  },
  {
    id: "T11",
    th: "F1",
    a: "jd",
    st: "rule",
    on: "T09",
    r: "answered",
    tx: "Answered. The shared protocol is the warrant of RA1.",
    fx: "Warrant W1 on RA1",
  },
  {
    id: "T12",
    th: "F1",
    a: "qs",
    st: "challenge",
    cq: "E4",
    tgt: "inference",
    sev: "fatal",
    re: "T08",
    tx: "23% of the questions share a paper, but the bootstrap resamples questions as if each were independent. The interval is too narrow.",
    g: [
      ["cq", "E4"],
      ["rep", "C.1"],
      ["rep", "B.7"],
      ["std", "NeurIPS 7"],
    ],
  },
  {
    id: "T13",
    th: "F1",
    a: "aa",
    st: "defend",
    re: "T12",
    tx: "The point estimate of 0.076 does not depend on how we resample.",
    g: [["rep", "B.7"]],
  },
  {
    id: "T14",
    th: "F1",
    a: "qs",
    st: "challenge",
    cq: "E4",
    tgt: "inference",
    sev: "fatal",
    re: "T13",
    tx: "The claim needs the interval to exclude zero, and that interval is exactly what is in doubt.",
    g: [["cq", "E4"]],
  },
  {
    id: "T15",
    th: "F1",
    a: "jd",
    st: "rule",
    on: "T12",
    r: "upheld",
    tx: "Upheld. The inference from E1 to F1 rests on an interval computed on the wrong unit. This is an undercut: F1 cannot stand until the interval is recomputed by paper.",
    fx: "CA1 · undercut on RA1",
  },
  {
    id: "T16",
    th: "F1",
    a: "qx",
    st: "challenge",
    tgt: "conclusion",
    sev: "caveat",
    re: "T08",
    tx: "This may not hold for papers in other languages.",
    g: [["none", "—"]],
  },
  {
    id: "T17",
    th: "F1",
    a: "jd",
    st: "rule",
    on: "T16",
    r: "struck",
    tx: "Struck: no ground, and F1 already speaks only of QASPER. The point belongs to the Conclusion, where it is heard.",
    fx: "Moved to the Conclusion",
  },

  {
    id: "T18",
    th: "F2",
    a: "aa",
    st: "propose",
    tx: "The gain is largest when evidence is spread out: 0.094 against 0.051.",
    g: [["led", "EV-07"]],
  },
  {
    id: "T19",
    th: "F2",
    a: "qm",
    st: "challenge",
    cq: "E5",
    tgt: "inference",
    sev: "caveat",
    re: "T18",
    tx: "Was “spread” defined before the results were seen?",
    g: [
      ["cq", "E5"],
      ["rep", "B.7"],
    ],
  },
  {
    id: "T20",
    th: "F2",
    a: "aa",
    st: "defend",
    re: "T19",
    tx: "Plan §3 defines spread from the annotations. It was locked on 14 September, a day before the first run.",
    g: [
      ["rep", "B.7"],
      ["rep", "Timeline"],
    ],
  },
  {
    id: "T21",
    th: "F2",
    a: "jd",
    st: "rule",
    on: "T19",
    r: "answered",
    tx: "Answered. The pre-registered split is the warrant of RA2.",
    fx: "Warrant on RA2",
  },
  {
    id: "T22",
    th: "F2",
    a: "qs",
    st: "challenge",
    cq: "E3",
    tgt: "inference",
    sev: "caveat",
    re: "T18",
    tx: "Spread questions are longer. The gain may follow question length, not spread.",
    g: [
      ["cq", "E3"],
      ["led", "A4 · rows 26–27"],
      ["rep", "E.2"],
    ],
  },
  {
    id: "T23",
    th: "F2",
    a: "aa",
    st: "concede",
    re: "T22",
    tx: "The confirmatory analysis does not control for length, and A4 is exploratory only. Conceded.",
    g: [["rep", "E.2"]],
  },
  {
    id: "T24",
    th: "F2",
    a: "jd",
    st: "rule",
    on: "T22",
    r: "conceded",
    tx: "Conceded. F2 keeps the rebuttal “unless spread simply follows question length” and the qualifier “likely”.",
    fx: "Rebuttal + qualifier on F2",
  },

  {
    id: "T25",
    th: "F3",
    a: "aa",
    st: "propose",
    tx: "At the same budget there is no clear gain: 0.031, 95% CI −0.004 to 0.066.",
    g: [["led", "EV-08"]],
  },
  {
    id: "T26",
    th: "F3",
    a: "qs",
    st: "challenge",
    cq: "N1",
    tgt: "conclusion",
    sev: "fatal",
    re: "T25",
    tx: "No clear gain is not no gain. Could this test have found a gain of 0.031 at all?",
    g: [
      ["cq", "N1"],
      ["rep", "B.9"],
    ],
  },
  {
    id: "T27",
    th: "F3",
    a: "aa",
    st: "defend",
    re: "T26",
    tx: "The test detects gains as small as 0.02.",
    g: [["none", "—"]],
  },
  {
    id: "T28",
    th: "F3",
    a: "jd",
    st: "rule",
    on: "T27",
    r: "rejected",
    tx: "Rejected. No ledger span says 0.02; plan §4 gives a smallest detectable gain of 0.035. Numbers come only from the record. Answer again.",
    fx: "Flagged · rule 2",
  },
  {
    id: "T29",
    th: "F3",
    a: "aa",
    st: "refine",
    re: "T26",
    tx: "The test can miss gains below 0.035 (plan §4). So F3 says “no clear gain”, never “no gain”.",
    g: [["rep", "B.9"]],
  },
  {
    id: "T30",
    th: "F3",
    a: "jd",
    st: "rule",
    on: "T26",
    r: "conceded",
    tx: "Conceded. Qualifier “no clear gain”; rebuttal “unless the gain is below 0.035”. As evidence, F3 is preferred over H4.",
    fx: "Qualifier + PA1 over H4",
  },

  {
    id: "T31",
    th: "C",
    a: "aa",
    st: "propose",
    tx: "Fusion is the better default for long scientific papers.",
    g: [
      ["led", "F1"],
      ["led", "F2"],
    ],
  },
  {
    id: "T32",
    th: "C",
    a: "qx",
    st: "challenge",
    cq: "P1",
    tgt: "inference",
    sev: "fatal",
    re: "T31",
    tx: "QASPER holds 1,585 English NLP papers. “Long scientific papers” covers every field and every language.",
    g: [
      ["cq", "P1"],
      ["rep", "C.1"],
      ["rep", "H.1"],
    ],
  },
  {
    id: "T33",
    th: "C",
    a: "aa",
    st: "defend",
    re: "T32",
    tx: "QASPER stands in for long scientific papers.",
    g: [["none", "reconstructed warrant"]],
  },
  {
    id: "T34",
    th: "C",
    a: "qx",
    st: "challenge",
    cq: "P1",
    tgt: "inference",
    sev: "fatal",
    re: "T33",
    tx: "That warrant is in no source. Name one.",
    g: [["cq", "P1"]],
  },
  {
    id: "T35",
    th: "C",
    a: "aa",
    st: "defend",
    re: "T34",
    tx: "Dasigi et al. built QASPER from full research papers.",
    g: [["src", "Dasigi et al., 2021"]],
  },
  {
    id: "T36",
    th: "C",
    a: "qx",
    st: "challenge",
    cq: "P1",
    tgt: "inference",
    sev: "fatal",
    re: "T35",
    tx: "Research papers from one field. The claim is about all fields.",
    g: [["rep", "C.1"]],
  },
  {
    id: "T37",
    th: "C",
    a: "jd",
    st: "rule",
    on: "T32",
    r: "unresolved",
    tx: "Three rounds and no answer from the record. The Judge cannot rule on a warrant nobody wrote: this goes to you.",
    fx: "Stop K04",
  },
];
/* after K04: narrowed (q) or warrant dropped (r) */
export const TURNS_K04: Record<string, Turn[]> = {
  q: [
    {
      id: "T38",
      th: "C",
      a: "aa",
      st: "refine",
      re: "T32",
      tx: "Fusion is the better default for English NLP papers like those in QASPER.",
      g: [["rep", "C.1"]],
      note: "Narrowed by you at K04",
    },
    {
      id: "T39",
      th: "C",
      a: "qx",
      st: "concede",
      re: "T38",
      tx: "Narrowed to what the sample covers. Satisfied.",
      g: [["rep", "C.1"]],
    },
    {
      id: "T40",
      th: "C",
      a: "jd",
      st: "rule",
      on: "T32",
      r: "conceded",
      tx: "Conceded. The qualifier is narrowed; the warrant stays, drawn dashed as reconstructed.",
      fx: "Qualifier on C · warrant dashed",
    },
  ],
  r: [
    {
      id: "T38",
      th: "C",
      a: "aa",
      st: "refine",
      re: "T32",
      tx: "The reconstructed warrant is dropped. Restated at S03: fusion is the better default for papers like those in QASPER.",
      g: [["rep", "C.1"]],
      note: "Warrant dropped by you at K04",
    },
    {
      id: "T39",
      th: "C",
      a: "qx",
      st: "concede",
      re: "T38",
      tx: "A claim about the sample only. Satisfied.",
      g: [["rep", "C.1"]],
    },
    {
      id: "T40",
      th: "C",
      a: "jd",
      st: "rule",
      on: "T32",
      r: "conceded",
      tx: "Conceded. The Conclusion is restated without the reconstructed warrant.",
      fx: "C restated · no warrant",
    },
  ],
};
/* scenario U7: a counterexample from the literature, heard after the deadlock is settled */
export const TURNS_COUT: Turn[] = [
  {
    id: "T41",
    th: "C",
    a: "ql",
    st: "challenge",
    cq: "P3",
    tgt: "conclusion",
    sev: "fatal",
    re: "T31",
    tx: "Lee et al. (2024, example) ran fusion against E5 on ACL papers with long appendices: no gain over the dense retriever.",
    g: [
      ["cq", "P3"],
      ["src", "Lee et al., 2024 (example)"],
    ],
  },
  {
    id: "T42",
    th: "C",
    a: "aa",
    st: "defend",
    re: "T41",
    tx: "Their papers carry long appendices; ours are main text only.",
    g: [["rep", "C.1"]],
  },
  {
    id: "T43",
    th: "C",
    a: "ql",
    st: "challenge",
    cq: "P3",
    tgt: "conclusion",
    sev: "fatal",
    re: "T42",
    tx: "Same field, same language, the same papers the claim now names. The appendix is not excluded by your claim.",
    g: [
      ["src", "Lee et al., 2024 (example)"],
      ["rep", "C.1"],
    ],
  },
  {
    id: "T44",
    th: "C",
    a: "jd",
    st: "rule",
    on: "T41",
    r: "upheld",
    tx: "Upheld as a rebut on the Conclusion. Both sides are empirical and neither is preferred, so the two defeat each other.",
    fx: "CA4 · rebut on C, no preference",
  },
];
/* the critical questions nobody asked are closed from the record by the judge */
export const CLOSED_BY_RECORD: [string, string, string][] = [
  ["GAP", "G2", "Both indexes cover the venues where such a study would appear (B.2)."],
  ["F1", "E1", "Rows 12–13 trace to the 15 traces (D.1)."],
  ["F1", "E3", "Same questions, same cutoff: no other difference between systems (B.6)."],
  ["F1", "E5", "A1 is confirmatory, locked before the runs (E.1)."],
  ["F2", "E1", "Rows 18–21 trace to the traces (D.1)."],
  ["F2", "E2", "The split uses the same questions for every system (B.6)."],
  ["F2", "E4", "Recomputed by paper with F1 at S07 (C.1)."],
  ["F3", "N2", "The same-budget comparison is A3, locked before the runs (E.1)."],
  ["C", "P2", "1,169 questions; power declared (B.9)."],
  ["C", "P3", "No counterexample in the package (I.2)."],
];

/* the protocol, in the words the debate screen uses */
export const DEBATE_RULES: [string, string][] = [
  [
    "Grounds",
    "Every challenge and every answer names a ground: a critical question, a ledger span, a field of the data report, a reporting standard or a source in the package.",
  ],
  ["Blind first round", "Critics write their first challenge without seeing each other’s."],
  ["Three rounds", "A critical question gets at most three exchanges. Then the Judge rules, or sends it to you."],
  ["No new numbers", "An answer with a number that is not in the ledger is rejected and flagged."],
  ["A separate judge", "The Judge is a different model from the Proponent and never argues."],
  ["Nothing unasked stays open", "Critical questions nobody raised are closed from the record, or the claim waits."],
];
