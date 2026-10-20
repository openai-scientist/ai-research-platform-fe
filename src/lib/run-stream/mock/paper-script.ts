// Builds the mock paper as Popper's Reporter would stream it: sections, blocks and pieces,
// where every number is a piece that names its source in the report.

import type { PaperBlock, PaperPiece, PaperSectionPlan, PaperSource, ReportRow } from "../contract";
import { HYPOTHESES, REFERENCES, TABLE_1 } from "./scenario";

export interface FinalResult {
  key: string;
  hypothesis_id: string;
  estimate: number;
  ci_low: number;
  ci_high: number;
}

export interface PaperScript {
  title: string;
  authors: string;
  sections: PaperSectionPlan[];
  sources: PaperSource[];
  blocks: Record<string, { block: PaperBlock; pieces: PaperPiece[] }[]>;
}

export const REVISIONS = {
  "rev-1": { from: "which is the gap this run set out to test", to: "one of the gaps this run set out to test" },
  "rev-2": { from: "leads to", to: "goes with" },
  "rev-3": { from: "", to: " Sleep and screen time were self-reported." },
} as const;

export const COMMENTS = [
  { id: "c1", span_id: "rev-1", revise: "rev-1" as const, text: "Overclaims: this is one gap, not the only one." },
  { id: "c2", span_id: "rev-2", revise: "rev-2" as const, text: "“Leads to” claims cause. This is survey data." },
  {
    id: "c3",
    span_id: "anchor-3",
    revise: "rev-3" as const,
    text: "Say that sleep and screen time were self-reported.",
  },
];

export const TYPED_NUMBER = { span_id: "typed-1", text: "about six points" };

const sign = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(1)}`;

type Token =
  | string
  | { result: string; format?: "abs" | "ci" }
  | { fact: "rows_v1" | "missing" | "rows_v2" | "tested" | "rounds" }
  | { cite: number[] }
  | { figure: number }
  | { typed: true }
  | { span: string; text: string };

export function buildPaper({
  runId,
  finals,
  tested,
  rounds,
  reportRows,
}: {
  runId: string;
  finals: Record<string, FinalResult>;
  tested: string[];
  rounds: number;
  reportRows: ReportRow[];
}): PaperScript {
  const f = finals;
  const facts: Record<string, { value: string; label: string; detail: string }> = {
    rows_v1: { value: "1,240", label: "n 1,240", detail: "data v1 · rows" },
    missing: { value: "42", label: "42 filled", detail: "steward log · fix 1" },
    rows_v2: { value: "1,230", label: "n 1,230", detail: "data v2 · rows" },
    tested: { value: String(tested.length), label: `${tested.length} tested`, detail: "report · hypotheses tested" },
    rounds: { value: String(rounds), label: `${rounds} round${rounds > 1 ? "s" : ""}`, detail: "report · rounds" },
  };

  const piece = (t: Token): PaperPiece => {
    if (typeof t === "string") return { kind: "text", text: t };
    if ("result" in t) {
      const r = f[t.result];
      const value =
        t.format === "abs"
          ? Math.abs(r.estimate).toFixed(1)
          : t.format === "ci"
            ? `${sign(r.ci_low)} to ${sign(r.ci_high)}`
            : sign(r.estimate);
      return { kind: "number", value, source: `result:${r.key}` };
    }
    if ("fact" in t) return { kind: "number", value: facts[t.fact].value, source: `data:${t.fact}` };
    if ("cite" in t) return { kind: "cite", refs: t.cite };
    if ("figure" in t) return { kind: "figure_ref", figure: t.figure };
    if ("typed" in t) return { kind: "typed_number", span_id: TYPED_NUMBER.span_id, text: TYPED_NUMBER.text };
    return { kind: "span", span_id: t.span, text: t.text };
  };

  const abstract: Token[] = [
    "We asked whether undergraduates who sleep more score higher on their final exam, and what explains the link.",
  ];
  if (f.H1)
    abstract.push(
      " In ",
      { fact: "rows_v2" },
      " students, those sleeping 7 hours or more scored ",
      { typed: true },
      " higher (",
      { result: "H1", format: "ci" },
      ") after accounting for stress, study time, screen time and age.",
    );
  if (f.H5) abstract.push(" About ", { result: "H5", format: "abs" }, " points of that gap ran through study time.");
  if (f.H2) abstract.push(" Whether stress carries part of the link stayed unclear (", { result: "H2" }, ").");
  if (f.H3) abstract.push(" Screen time showed no association (", { result: "H3" }, " points per hour).");
  abstract.push(" The hypotheses were found and tested on the same data, so these findings are exploratory.");

  const results2: Token[] = f.H1
    ? [
        "After adjusting for the other factors, students sleeping 7 hours or more scored ",
        { result: "H1", format: "abs" },
        " points higher (",
        { result: "H1", format: "ci" },
        "; ",
        { figure: 2 },
        ").",
      ]
    : ["The main sleep comparison did not produce a result in this run."];
  if (f.H5)
    results2.push(
      " Adding study hours shrank this gap by ",
      { result: "H5", format: "abs" },
      " points (",
      { result: "H5", format: "ci" },
      "), so part of the sleep effect ran through study time (",
      { figure: 3 },
      ").",
    );

  const results3: Token[] = [];
  if (f.H2)
    results3.push(
      "The path through stress was small and uncertain (",
      { result: "H2" },
      ", ",
      { result: "H2", format: "ci" },
      "); a reviewer agent argued it should read as not supported, and that objection is kept on record.",
    );
  if (f.H3) results3.push(" Screen time showed no association with scores (", { result: "H3" }, " points per hour).");
  if (f.H6)
    results3.push(
      " A check by gender (",
      { result: "H6" },
      ") had no prior reason and is reported as a possible chance finding.",
    );
  if (f.H4) results3.push(" The age interaction was too imprecise to read (", { result: "H4" }, ").");
  else if (tested.includes("H4"))
    results3.push(" The test of a stronger effect above age 25 crashed and is not interpreted.");

  const discussion: Token[] = [
    "Students who sleep more score higher, and the link was not explained away by stress, screen time or age. ",
  ];
  if (f.H5)
    discussion.push(
      "Part of it ran through study time: students who sleep more also study more, and study time ",
      { span: "rev-2", text: REVISIONS["rev-2"].from },
      " higher scores.",
    );
  else
    discussion.push(
      "Sleep ",
      { span: "rev-2", text: REVISIONS["rev-2"].from },
      " higher scores even with the other factors held fixed.",
    );
  discussion.push(
    " Because this is survey data from one faculty, none of this shows that sleeping more would raise a student's score.",
  );

  const limits: Token[] = [
    { span: "anchor-3", text: "The data come from one faculty and one semester." },
    { span: "rev-3", text: "" },
    " Hypotheses were generated and tested on the same data, so the results need confirming on new data.",
  ];
  if (f.H6) limits.push(" The gender check is a possible chance finding.");

  let blockCount = 0;
  const para = (tokens: Token[]) => ({
    block: { id: `b${++blockCount}`, kind: "paragraph" as const },
    pieces: tokens.map(piece),
  });
  const figure = (n: number) => ({ block: { id: `b${++blockCount}`, kind: "figure" as const, figure: n }, pieces: [] });

  const sections: (PaperSectionPlan & { content: { block: PaperBlock; pieces: PaperPiece[] }[] })[] = [
    { id: "abstract", title: "Abstract", numbered: false, uses: "n, H1, H5, H2, H3", content: [para(abstract)] },
    {
      id: "intro",
      title: "Introduction",
      numbered: true,
      uses: "references 1–3",
      content: [
        para([
          "Short sleep is common among students and has been linked to weaker learning and grades ",
          { cite: [1, 2] },
          ". Students sleep poorly for many reasons, including workload, stress and screens ",
          { cite: [3] },
          ". Few studies separate study time from sleep itself, ",
          { span: "rev-1", text: REVISIONS["rev-1"].from },
          ".",
        ]),
        para([
          "We tested ",
          { fact: "tested" },
          " hypotheses over ",
          { fact: "rounds" },
          rounds > 1 ? " rounds" : " round",
          " of analysis. This paper reports the clearest results; Appendix A lists every hypothesis tested, including those that failed.",
        ]),
      ],
    },
    {
      id: "methods",
      title: "Methods",
      numbered: true,
      uses: "data log, Table 1",
      content: [
        para([
          "Data came from one faculty in spring 2026: ",
          { fact: "rows_v1" },
          " students with nightly sleep, weekly study hours, stress level, daily screen time, age, gender and final exam score. Before analysis, duplicate and impossible rows were removed and ",
          { fact: "missing" },
          " missing sleep values were filled with the median, leaving ",
          { fact: "rows_v2" },
          " students (data version v2; Table 1).",
        ]),
        { block: { id: `b${++blockCount}`, kind: "table", ...TABLE_1 }, pieces: [] },
        para([
          "Hypotheses were proposed from patterns in the data and gaps in the literature, challenged by a reviewer agent, and fixed in a test plan before any analysis ran. For each hypothesis, several versions of the analysis code were run in a sandbox; the version with the best reviewer score was kept, and its result was written to the run's results file, which every number in this paper comes from.",
        ]),
      ],
    },
    {
      id: "results",
      title: "Results",
      numbered: true,
      uses: "Figures 1–3, all results",
      content: [
        para(["Exam scores rose with nightly sleep up to about eight hours and then flattened (", { figure: 1 }, ")."]),
        figure(1),
        para(results2),
        ...(f.H1 ? [figure(2)] : []),
        ...(results3.length ? [para(results3)] : []),
        ...(f.H1 ? [figure(3)] : []),
      ],
    },
    {
      id: "discussion",
      title: "Discussion",
      numbered: true,
      uses: "verdicts, objections",
      content: [para(discussion)],
    },
    { id: "limits", title: "Limitations", numbered: true, uses: "report notes", content: [para(limits)] },
    {
      id: "refs",
      title: "References",
      numbered: false,
      uses: "3 papers",
      content: [{ block: { id: `b${++blockCount}`, kind: "references", items: REFERENCES }, pieces: [] }],
    },
    {
      id: "appendix",
      title: "Appendix A · Everything tested",
      numbered: false,
      uses: "report table",
      content: [{ block: { id: `b${++blockCount}`, kind: "appendix", rows: reportRows }, pieces: [] }],
    },
  ];

  const sources: PaperSource[] = [
    ...Object.entries(facts).map(([id, fact]) => ({ id: `data:${id}`, label: fact.label, detail: fact.detail })),
    ...Object.values(f)
      .sort((a, b) => a.hypothesis_id.localeCompare(b.hypothesis_id))
      .map((r) => ({
        id: `result:${r.key}`,
        label: `${r.hypothesis_id} ${sign(r.estimate)}`,
        detail: `results.json → ${r.key}`,
      })),
    ...[1, 2, 3].map((n) => ({ id: `figure:${n}`, label: `Fig ${n}`, detail: "report §2" })),
    { id: "table:1", label: "Table 1", detail: "data v2 summary" },
    ...REFERENCES.map((_, i) => ({ id: `ref:${i + 1}`, label: `[${i + 1}]`, detail: "reference" })),
  ];

  return {
    title: f.H5
      ? "Sleep, study time and exam scores in undergraduates: an exploratory analysis"
      : "Sleep and exam scores in undergraduates: an exploratory analysis",
    authors: `Popper research agents · reviewed by you · ${runId}, data v2`,
    sections: sections.map(({ content: _content, ...plan }) => plan),
    sources,
    blocks: Object.fromEntries(sections.map((s) => [s.id, s.content])),
  };
}

export const hypothesisStatement = (id: string) => HYPOTHESES[id]?.statement ?? id;
