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
      "No pre-registered, leakage-checked study has tested whether first-semester results add to enrolment data for dropout warning.",
  },
  {
    id: "F1",
    sch: "F",
    t: "Finding 1",
    claim: "Adding first-semester results finds more of the students who drop out.",
  },
  {
    id: "F2",
    sch: "F",
    t: "Finding 2",
    claim: "The gain appears in both admission groups and is not larger below the median.",
  },
  {
    id: "F3",
    sch: "N",
    t: "Finding 3",
    claim: "On enrolment data, boosting gives no clear gain over logistic regression.",
  },
  {
    id: "C",
    sch: "P",
    t: "Conclusion",
    claim: "First-semester results are the better basis for dropout early warning.",
  },
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
    tx: "No pre-registered study has tested, with leakage checked, whether first-semester results add to enrolment data in ranking students for dropout outreach.",
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
    tx: "Scopus, ERIC and arXiv, January 2009 to September 2026, three query strings: 168 hits screened, 12 read in full.",
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
    tx: "Dekker et al. (2009) predicted dropout after the first semester. Is that not this test?",
    g: [
      ["cq", "G3"],
      ["src", "Dekker et al., 2009"],
    ],
  },
  {
    id: "T06",
    th: "GAP",
    a: "aa",
    st: "defend",
    re: "T05",
    tx: "They did, for one department, with accuracy as the measure. No plan was fixed before the results, and nothing in the paper checks for leakage.",
    g: [
      ["src", "Dekker et al., 2009"],
      ["rep", "K.2 · note 4"],
    ],
  },
  {
    id: "T07",
    th: "GAP",
    a: "jd",
    st: "rule",
    on: "T05",
    r: "answered",
    tx: "The rebut fails: the gap is worded as a pre-registered, leakage-checked test, and that is not what they ran. The gap stands as worded.",
    fx: "No CA drawn",
  },

  {
    id: "T08",
    th: "F1",
    a: "aa",
    st: "propose",
    tx: "Adding first-semester results finds more of the students who drop out: recall at 20% flagged rises from 0.396 to 0.507, a gain of 0.111 (95% CI 0.092 to 0.129).",
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
    tx: "Were both models scored on the same students, splits and flag rate?",
    g: [
      ["cq", "E2"],
      ["rep", "B.8"],
    ],
  },
  {
    id: "T10",
    th: "F1",
    a: "aa",
    st: "defend",
    re: "T09",
    tx: "Yes. Plan §5 fixes them, and each seed’s traces carry the same split hash.",
    g: [
      ["rep", "D.2"],
      ["rep", "F.1"],
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
    tx: "Students share courses and cohorts, but the bootstrap resamples students as if each were independent. The interval may be too narrow.",
    g: [
      ["cq", "E4"],
      ["rep", "E.2"],
      ["rep", "B.9"],
      ["std", "REFORMS 6b"],
    ],
  },
  {
    id: "T13",
    th: "F1",
    a: "aa",
    st: "defend",
    re: "T12",
    tx: "The point estimate of 0.111 does not depend on how we resample.",
    g: [["rep", "B.9"]],
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
    tx: "Upheld. The inference from E1 to F1 rests on an interval computed on students, not on courses. This is an undercut: F1 cannot stand until the interval is read by course.",
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
    tx: "This may not hold at universities in other countries.",
    g: [["none", "—"]],
  },
  {
    id: "T17",
    th: "F1",
    a: "jd",
    st: "rule",
    on: "T16",
    r: "struck",
    tx: "Struck: no ground, and F1 already speaks only of this polytechnic. The point belongs to the Conclusion, where it is heard.",
    fx: "Moved to the Conclusion",
  },

  {
    id: "T18",
    th: "F2",
    a: "aa",
    st: "propose",
    tx: "The gain appears in both admission groups: 0.098 below the median grade and 0.129 above, a difference of −0.031 (95% CI −0.109 to 0.027).",
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
    tx: "Was the median split fixed before the results were seen?",
    g: [
      ["cq", "E5"],
      ["rep", "B.9"],
    ],
  },
  {
    id: "T20",
    th: "F2",
    a: "aa",
    st: "defend",
    re: "T19",
    tx: "Plan §6 names the split, and §7 takes the median from each training part. The plan was locked on 27 October, a minute before the first run.",
    g: [
      ["rep", "B.9"],
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
    tx: "Admission grades differ by course. The pattern may follow the course a student entered, not the grade.",
    g: [
      ["cq", "E3"],
      ["led", "A4 · rows 28–38"],
      ["rep", "G.2"],
    ],
  },
  {
    id: "T23",
    th: "F2",
    a: "aa",
    st: "concede",
    re: "T22",
    tx: "The confirmatory analysis does not control for course, and A4 is exploratory only. Conceded.",
    g: [["rep", "G.2"]],
  },
  {
    id: "T24",
    th: "F2",
    a: "jd",
    st: "rule",
    on: "T22",
    r: "conceded",
    tx: "Conceded. F2 keeps the rebuttal “unless admission grade simply stands in for the course” and the qualifier “likely”.",
    fx: "Rebuttal + qualifier on F2",
  },

  {
    id: "T25",
    th: "F3",
    a: "aa",
    st: "propose",
    tx: "On enrolment data, boosting gives no clear gain over logistic regression: 0.004, 95% CI −0.007 to 0.021.",
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
    tx: "No clear gain is not no gain. Could this test have found a small gain at all?",
    g: [
      ["cq", "N1"],
      ["rep", "B.11"],
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
    tx: "Rejected. No ledger span says 0.02; plan §7 gives a smallest detectable gain of about 0.06 for one split. Numbers come only from the record. Answer again.",
    fx: "Flagged · rule 2",
  },
  {
    id: "T29",
    th: "F3",
    a: "aa",
    st: "refine",
    re: "T26",
    tx: "The test can miss gains below about 0.06 (plan §7). So F3 says “no clear gain”, never “no gain”.",
    g: [["rep", "B.11"]],
  },
  {
    id: "T30",
    th: "F3",
    a: "jd",
    st: "rule",
    on: "T26",
    r: "conceded",
    tx: "Conceded. Qualifier “no clear gain”; rebuttal “unless the gain is below about 0.06”. As evidence, F3 is preferred over H4.",
    fx: "Qualifier + PA1 over H4",
  },

  {
    id: "T31",
    th: "C",
    a: "aa",
    st: "propose",
    tx: "First-semester results are the better basis for dropout early warning.",
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
    tx: "The record holds 11 cohorts of one Portuguese polytechnic. “Dropout early warning” covers every institution and every year.",
    g: [
      ["cq", "P1"],
      ["rep", "C.3"],
      ["rep", "J.2"],
    ],
  },
  {
    id: "T33",
    th: "C",
    a: "aa",
    st: "defend",
    re: "T32",
    tx: "Eleven years of one polytechnic’s entrants stand in for students in general.",
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
    tx: "Realinho et al. built the dataset for the institution’s own early-warning tool.",
    g: [["src", "Realinho et al., 2022"]],
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
    tx: "Built for one institution. The claim is about all of them.",
    g: [["rep", "C.3"]],
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
      tx: "First-semester results are the better basis for dropout early warning for entrants to this polytechnic, as in 2008/09–2018/19.",
      g: [["rep", "C.3"]],
      note: "Narrowed by you at K04",
    },
    {
      id: "T39",
      th: "C",
      a: "qx",
      st: "concede",
      re: "T38",
      tx: "Narrowed to what the sample covers. Satisfied.",
      g: [["rep", "C.3"]],
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
      tx: "The reconstructed warrant is dropped. Restated at S03: in this record, first-semester results are the better basis for early warning.",
      g: [["rep", "C.3"]],
      note: "Warrant dropped by you at K04",
    },
    {
      id: "T39",
      th: "C",
      a: "qx",
      st: "concede",
      re: "T38",
      tx: "A claim about the sample only. Satisfied.",
      g: [["rep", "C.3"]],
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
/* scenario U8: a counterexample from the record, heard after the deadlock is settled */
export const TURNS_COUT: Turn[] = [
  {
    id: "T41",
    th: "C",
    a: "qx",
    st: "challenge",
    cq: "P3",
    tgt: "conclusion",
    sev: "fatal",
    re: "T31",
    tx: "In course 171 the ranking flags none of the students who drop out (A4, row 28). The Conclusion speaks of every entrant.",
    g: [
      ["cq", "P3"],
      ["led", "A4 · row 28"],
    ],
  },
  {
    id: "T42",
    th: "C",
    a: "aa",
    st: "defend",
    re: "T41",
    tx: "Course 171 has about 34 test students per split, and A4 is exploratory: it was never meant to rank courses.",
    g: [["rep", "G.2"]],
  },
  {
    id: "T43",
    th: "C",
    a: "qx",
    st: "challenge",
    cq: "P3",
    tgt: "conclusion",
    sev: "fatal",
    re: "T42",
    tx: "Exploratory or not, it is in the record, and the Conclusion names every entrant, course 171 included.",
    g: [
      ["led", "A4 · row 28"],
      ["rep", "C.3"],
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
  ["GAP", "G2", "All three indexes cover the venues where such a study would appear (B.2)."],
  ["F1", "E1", "Row 21 traces to the ten runs behind it (F.1)."],
  ["F1", "E3", "Same students, splits and flag rate: no other difference between the models (B.8)."],
  ["F1", "E5", "A1 is confirmatory, locked before the runs (G.1)."],
  ["F2", "E1", "Rows 39–40 trace to the runs behind them (F.1)."],
  ["F2", "E2", "The split uses the same students for both models (B.8)."],
  ["F2", "E4", "Recomputed by course with F1 at S07 (E.2)."],
  ["F3", "N2", "The comparison is A3, locked before the runs (G.1)."],
  ["C", "P2", "3,630 students; power declared (B.11)."],
  ["C", "P3", "No source in the package reports a counterexample (K.2)."],
];
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
