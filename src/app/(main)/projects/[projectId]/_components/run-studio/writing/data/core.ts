/* ===== ASW content: 17 stages in four blocks, their contracts, the paper and the decisions ===== */

export interface StepDef {
  id: string;
  /** the agent that does the step; absent on stops */
  a?: string;
  t: string;
  x?: string;
  check?: boolean;
  gate?: boolean;
}
export interface StageDef {
  id: string;
  ph: number;
  short: string;
  name: string;
  a: string;
  board?: string;
  title: string;
  gate?: string;
  lead: string;
  ipo: { in: string; proc: string; hu: string; fa: string; needs: string };
  outs: string[];
  steps: StepDef[];
}
export interface ToulminDef {
  name: string;
  claim: string;
  data: string;
  war: string;
  recon: number;
  back: string;
  qual: string;
  qual2?: string;
  reb: string;
  scope?: number;
}
export interface ClaimDef {
  k: string;
  name: string;
  kind: string;
  t: string;
  t2: string;
  t3?: string;
}
export interface PlanDef {
  moves: string[];
  roles: [string, string, string][];
  len: string;
  cites: string;
  tr: string;
  gate: string;
  claim: string;
}
export interface RvIssue {
  n: number;
  k: string;
  sev: string;
  t: string;
  w: string;
  x: string;
  fix: string;
  route: string;
}
export interface EditDef {
  p: string;
  r?: string;
  from?: string;
  to?: string;
  why: string;
  ok: number;
}
export interface ReviewerDef {
  k: string;
  n: string;
  i: string;
  c: string;
  verdict: [string, string];
  notes: [string, string][];
}
export interface CommentDef {
  id: number;
  r: string;
  p: string;
  sev: string;
  t: string;
}
/** [id, label, what it leads to, recommended (1) or not] */
export type DecOption = [string, string, string, number];
export interface DecDef {
  kind: "gate" | "check";
  n?: string;
  title: string;
  why: string;
  rec: [string, number, string];
  sum?: [string, string][];
  own?: string;
  pick?: boolean;
  /** [key, claim, sentence with {w}, choices, recommended index] */
  words?: [string, string, string, string[], number][];
  checks?: string[];
  opts: DecOption[];
  cta?: string;
}
export interface BlockDef {
  k: string;
  n: string;
  t: string;
  x: string;
  from: string;
  to: string;
}
export interface MapNode {
  ty: string;
  lane: string;
  t: string;
  s: string;
  s2?: string;
  s3?: string;
  sp?: string;
  st?: [string, string];
  ctx?: number;
  claim?: string;
  blk?: number;
  ev?: number;
  src?: string;
  num?: string;
  /** place on the argument map */
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface DeltaDef {
  n: string;
  k: string;
  t: string;
  x: string;
  w: string;
}
/* Data → Argue → Write → Verify. The journal profile (JFE) is built when the manuscript reaches S08. */
export const STAGES: StageDef[] = [
  {
    id: "S00",
    ph: 0,
    short: "Intake",
    name: "Run Output Intake",
    a: "or",
    title: "Check what the experiment run handed over",
    lead: "The run's output comes in eight parts: the plan it was held to, the environment, the runs, the results table, the analyses, the deviations, the figures and the sources. Each part is checked against the locked plan before anyone writes from it; what it cannot support is named, never filled in.",
    ipo: {
      in: "The output of RUN-25CD: locked plan, data and environment, 20 run traces, results.csv, analysis.json, deviations, figures, sources",
      proc: "Check the plan is the one that was locked; check the environment, every run and every result row against it; check each analysis follows the decision rule and each deviation is declared; name what the paper cannot use",
      hu: "None here; ownership is confirmed at stop 1",
      fa: "No owner → STOP · a must field missing → BLOCK until the file is fixed",
      needs: "Research run RUN-25CD finished",
    },
    outs: ["PackageManifest.json", "IntakeIssues.json"],
    steps: [
      {
        id: "a0",
        a: "or",
        t: "Open the output of RUN-25CD",
        x: "Eight parts arrive: the locked plan, the data and environment, 20 runs, the results table, 5 analyses, 1 deviation, 3 figures and 21 sources.",
      },
      {
        id: "a1",
        a: "code",
        t: "Check the plan, the data and the environment",
        x: "The plan was locked a minute before the first run and its hash is bound to it. The data has no entry year. The boosting encoding differs from the plan, declared as D1.",
      },
      {
        id: "a2",
        a: "code",
        t: "Check the runs and the results",
        x: "20 of 20 runs have a trace; in each seed every model saw the same 726 test students. Every result row names its runs.",
      },
      {
        id: "a3",
        a: "or",
        t: "Check the analyses, deviations, figures and sources",
        x: "A1–A3 follow the decision rule; A4 and A5 are exploratory. D1 was declared after the first run, and the run was repeated as planned. Every figure has its data; 6 papers are abstract-only.",
      },
      {
        id: "a4",
        a: "or",
        t: "Name what the paper cannot use",
        x: "Nothing across cohorts, no fees, debt or scholarship as early signs, and six papers cited but never quoted. Nothing is filled in.",
      },
    ],
  },
  {
    id: "S01",
    ph: 0,
    short: "Data report",
    name: "Standard Data Report",
    a: "ds",
    board: "report",
    title: "Lay the record into the standard frame",
    lead: "The Data Steward lays the record into one standard frame, built for data science from REFORMS, the pre-registration template for existing data, the NeurIPS checklist and Datasheets for Datasets. It checks that the record is complete and consistent; whether the method is sound is argued later, at S04.",
    ipo: {
      in: "Checked run output",
      proc: "Fill 51 fields with their level (must, should, may), including the leakage checks; check the plan was locked before the runs; link each hypothesis to its analysis, result rows and traces; compare runs with the plan; set the claim ceiling",
      hu: "Quick check on any exploratory analysis (K01)",
      fa: "Plan locked after the runs → every analysis exploratory · hypothesis without result → selective-reporting block · undeclared deviation → BLOCK · tuning on test → BLOCK",
      needs: "S00 checked run output",
    },
    outs: ["DataReport.json", "ClaimCeiling.json", "LinkChain.json"],
    steps: [
      {
        id: "r1",
        a: "ds",
        t: "Lay the record into the standard frame",
        x: "14 parts, 51 fields. Each gets its level, the standards that ask for it, and the statement it will become.",
      },
      {
        id: "r2",
        a: "code",
        t: "Check the plan was locked before the runs",
        x: "plan.md locked 27 Oct 2026, 10:50. First trace 10:51 the same morning. The plan is a real pre-registration.",
      },
      {
        id: "r3",
        a: "ds",
        t: "Link each hypothesis to its analysis, rows and traces",
        x: "H1, H2 and H4 link end to end. H3, H5 and H6 are secondary and declared deferred. A4 and A5 have no hypothesis: exploratory, and A5 was not in the plan.",
      },
      {
        id: "r4",
        a: "code",
        t: "Compare the runs with the plan",
        x: "One deviation, declared: native categories instead of one-hot for gradient boosting. Measure, exclusions, bootstrap, tuning and seeds match the plan.",
      },
      { id: "K01", check: true, t: "Confirm the exploratory analysis" },
      {
        id: "r5",
        a: "ds",
        t: "Set the claim ceiling",
        x: "What the record allows the paper to say, and what it never may.",
      },
    ],
  },
  {
    id: "S02",
    ph: 0,
    short: "Evidence",
    name: "Evidence Ledger & Research Readiness",
    a: "cu",
    title: "List the evidence and what it allows",
    gate: "G0",
    lead: "The Evidence Curator resolves every reference, indexes every number and quote, and recomputes each number from the raw traces. What is missing stays blocked; nothing is written to fill a gap.",
    ipo: {
      in: "Data report; papers and DOIs; traces; results table; figures",
      proc: "Resolve bibliographic identifiers; index evidence spans; recompute numbers from the traces; decide which sections can be written",
      hu: "Stop 1 (G0): you confirm ownership and start writing from this record",
      fa: "Number differs from its trace → BLOCK the row · DOI does not exist → quarantine · no source for a section → BLOCK the section",
      needs: "S01 data report",
    },
    outs: ["EvidenceLedger.json", "ReadinessReport.md"],
    steps: [
      {
        id: "b1",
        a: "cu",
        t: "Resolve every reference",
        x: "22 references. 21 resolve to a DOI or a stable link; 1 points to a paper that does not exist and is quarantined.",
      },
      {
        id: "b2",
        a: "cu",
        t: "Index evidence spans",
        x: "91 spans: 25 numbers and 66 quoted sentences, each linked to its file, page and paragraph.",
      },
      {
        id: "b3",
        a: "code",
        t: "Recompute the numbers from the traces",
        x: "Every value in results.csv is recomputed from the 20 traces. All match to three decimals.",
      },
      {
        id: "b4",
        a: "cu",
        t: "Find what is missing",
        x: "No entry year in the data, so the paragraph on change across cohorts is blocked. Every figure has its data.",
      },
      { id: "G0", gate: true, t: "Start writing from this record?" },
    ],
  },
  {
    id: "S03",
    ph: 1,
    short: "Axis 4",
    name: "Scientific Axis-4 Labelling",
    a: "ss",
    board: "axis",
    title: "Label every scientific statement",
    lead: "Each statement in the data report gets its type on the fourth axis and an epistemic status. Questions and objectives are not true or false, so they stay outside the argument graph as its context.",
    ipo: {
      in: "Data report fields; evidence ledger",
      proc: "Label each statement gap, question, objective, hypothesis, assumption, finding, conclusion, implication or limitation; attach status and source field; link the lifecycle; block what exceeds the claim ceiling",
      hu: "Quick check on statements whose type is unclear (K03)",
      fa: "Finding without evidence → BLOCK · implication beyond the ceiling → BLOCK · type disputed → you decide",
      needs: "G0 approved",
    },
    outs: ["StatementRegistry.json", "LifecycleLinks.json"],
    steps: [
      {
        id: "d1",
        a: "ss",
        t: "Collect every scientific statement",
        x: "16 statements from the data report: plan, hypotheses, analyses, interpretation and limits.",
      },
      {
        id: "d2",
        a: "ss",
        t: "Label each on the fourth axis",
        x: "Gap, question, objective, hypothesis, assumption, finding, conclusion, implication, limitation.",
      },
      {
        id: "d3",
        a: "ss",
        t: "Give each an epistemic status",
        x: "Established, approved, tested, assumed, supported, inconclusive, bounded, proposed. Each says how much the paper may lean on it.",
      },
      {
        id: "d4",
        a: "ss",
        t: "Link the lifecycle",
        x: "Gap → question → hypothesis → finding → conclusion → implication; limits bound the end of the chain.",
      },
      {
        id: "d5",
        a: "ss",
        t: "Block what the ceiling forbids",
        x: "“The same ranking can be used at other polytechnics” needs a second institution the record does not have. Blocked.",
      },
      { id: "K03", check: true, t: "Confirm what Finding 3 is" },
    ],
  },
  {
    id: "S04",
    ph: 1,
    short: "Debate",
    name: "Multi-Agent Argumentation",
    a: "jd",
    board: "debate",
    title: "Argue every claim before it is drawn",
    lead: "The Proponent states each claim. Four critics challenge it with the critical questions of its argument scheme, each challenge tied to a ground in the record. A separate Judge rules on every exchange, and each ruling becomes a part of the diagrams.",
    ipo: {
      in: "Statement registry; evidence ledger; data report; scheme catalogue with critical questions",
      proc: "Five threads (gap, F1, F2, F3, conclusion): propose, challenge, answer or concede, rule. Unasked critical questions are closed from the record. At most three rounds per question",
      hu: "Unresolved after three rounds → you decide (K04)",
      fa: "Challenge without a ground → struck · answer with a number not in the ledger → rejected · deadlock → K04 · claim upheld against → it may be OUT at S07",
      needs: "S03 registry",
    },
    outs: ["DebateRecord.json", "Rulings.json"],
    steps: [
      {
        id: "v1",
        a: "aa",
        t: "State each claim with its premises and scheme",
        x: "Five claims, each with the ledger spans behind it and the argument scheme it uses.",
      },
      {
        id: "v2",
        a: "jd",
        t: "Argue the gap",
        x: "Argument from ignorance: how far did the search go, and is there evidence against it?",
      },
      {
        id: "v3",
        a: "jd",
        t: "Argue Findings 1 and 2",
        x: "Evidence to hypothesis: same measurement, independent units, alternative explanations, analysis fixed in advance.",
      },
      { id: "v4", a: "jd", t: "Argue Finding 3", x: "A negative result: could the test have found a gain this small?" },
      {
        id: "v5",
        a: "jd",
        t: "Argue the Conclusion",
        x: "Sample to population: is one polytechnic like the students the claim speaks of?",
      },
      { id: "K04", check: true, t: "Settle the deadlock on the Conclusion" },
      {
        id: "v6",
        a: "jd",
        t: "Close the record",
        x: "Every critical question is closed: answered, conceded, upheld, struck or closed from the record.",
      },
    ],
  },
  {
    id: "S05",
    ph: 1,
    short: "Toulmin",
    name: "Toulmin Decomposition (six parts)",
    a: "ag",
    board: "toulmin",
    title: "Draw each claim in six parts",
    lead: "The Graph Builder draws each claim from the debate record: data, warrant, backing, qualifier, rebuttal and claim. Every part points to the ruling it came from; a warrant nobody wrote is drawn dashed as reconstructed.",
    ipo: {
      in: "Debate record and rulings; registry; ledger",
      proc: "Premises → data; scheme → warrant; answered challenges → backing; concessions → qualifier; upheld or conceded challenges → rebuttal",
      hu: "None; the debate already went through you",
      fa: "A part with no ruling behind it → BLOCK the card",
      needs: "S04 rulings",
    },
    outs: ["ToulminCards.json"],
    steps: [
      {
        id: "e1",
        a: "ag",
        t: "Draw each claim in six parts",
        x: "Four claims, six parts each: data, warrant, backing, qualifier, rebuttal and claim.",
      },
      {
        id: "e2",
        a: "ag",
        t: "Mark what was reconstructed",
        x: "Two warrants were never written in any source. They are drawn dashed, never quoted.",
      },
      { id: "e3", a: "ag", t: "Tie every part to its ruling", x: "Each part links to the debate turn it came from." },
    ],
  },
  {
    id: "S06",
    ph: 1,
    short: "AIF",
    name: "AIF Argument Graph Construction",
    a: "ag",
    board: "aif",
    title: "Build the argument graph",
    lead: "The cards become an AIF graph: statements are I-nodes; inferences (RA), conflicts (CA) and preferences (PA) connect them. Scientific types live in an ASW extension, never in the AIF core fields.",
    ipo: {
      in: "Toulmin cards; registry; source spans",
      proc: "Build I-nodes and RA/CA/PA schemes; link premises and conclusions; store the fourth-axis type outside the AIF core",
      hu: "None here; the graph is locked at stop 2",
      fa: "Dangling RA or invalid reference → BLOCK the graph",
      needs: "S05 cards",
    },
    outs: ["ArgumentGraph.json", "GraphEvidenceMap.json"],
    steps: [
      {
        id: "f1",
        a: "ag",
        t: "Turn statements into I-nodes",
        x: "16 statements become nodes, each pointing to its source span. Questions stay out: they are context.",
      },
      { id: "f2", a: "ag", t: "Add inferences (RA)", x: "Six inference links, each labelled with its scheme." },
      {
        id: "f3",
        a: "ag",
        t: "Add conflicts (CA) and a preference (PA)",
        x: "From the rulings: an undercut on F1’s interval, a caveat on the Conclusion, and F2 against H2 and F3 against H4, each settled by a preference.",
      },
      {
        id: "f4",
        a: "code",
        t: "Check the graph is sound",
        x: "One inference has no premise: the blocked implication from S03. It is removed.",
      },
      {
        id: "f5",
        a: "ag",
        t: "Keep science out of the AIF core",
        x: "propType, section and source span go into the extensions namespace.",
      },
    ],
  },
  {
    id: "S07",
    ph: 1,
    short: "ASPIC+",
    name: "Argument Evaluation (ASPIC+) & Validation",
    a: "av",
    board: "aif",
    title: "Evaluate every claim before you lock it",
    gate: "G1",
    lead: "The Verifier evaluates the graph under ASPIC+: each claim is IN, OUT or undecided. Only claims that are IN may be written as claims. What the record can answer is answered by Code check, never by an agent.",
    ipo: {
      in: "Argument graph; ledger; traces",
      proc: "Trace every node; recompute numbers; label every claim under grounded semantics; answer attacks the record can answer; set confidence limits",
      hu: "Stop 2 (G1): you lock the claims and freeze the graph",
      fa: "Claim OUT → not written, or sent back to S03 · undecided → only hedged · critical factual conflict → no writing of that claim",
      needs: "S06 graph",
    },
    outs: ["EvaluationLabels.json", "FrozenGraph_v1.json"],
    steps: [
      { id: "g1", a: "av", t: "Trace every node to its source", x: "Every statement traces to a file, page and line." },
      { id: "g2", a: "code", t: "Recompute the numbers", x: "12 numbers recomputed from the traces. All match." },
      {
        id: "g3",
        a: "av",
        t: "Label every claim IN, OUT or undecided",
        x: "Gap, F2 and F3 are IN. F1 is OUT: the undercut on its interval stands. The Conclusion and its implication fall with it.",
      },
      {
        id: "g4",
        a: "code",
        t: "Answer what the record can answer",
        x: "The planned course-level bootstrap is read from the traces (row 24). The interval widens to 0.081–0.146 and still excludes zero. F1 is IN; so are the Conclusion and the implication.",
      },
      { id: "g5", a: "av", t: "Set confidence limits", x: "How strongly each claim may be worded later." },
      { id: "G1", gate: true, t: "Lock the claims and freeze the graph?" },
    ],
  },
  {
    id: "S08",
    ph: 2,
    short: "Journal",
    name: "Journal Merge (JFE profile)",
    a: "js",
    title: "Merge the frozen claims with the journal profile",
    lead: "The two streams meet here. The Journal Specialist reads the published JFE profile and the publisher’s rules, keeps them apart, and turns them into a writing contract for these claims: where each statement goes, how sure it may sound, and how the sentences read.",
    ipo: {
      in: "Frozen graph v1; published JFE-EDJ-v2; author guidelines",
      proc: "Separate rules from habits; place each statement type in IMRaD; map Toulmin parts to the journal’s habits; set structure, budgets, tense, voice and terms",
      hu: "Quick check: approve the contract (K08)",
      fa: "No published profile → write with rules only · rule and habit disagree → the rule wins, the habit is reported",
      needs: "G1 frozen graph · JFE-EDJ-v2 published",
    },
    outs: ["JournalWritingContract.json", "PlacementMap.json"],
    steps: [
      {
        id: "c0",
        a: "js",
        t: "Load the published profile",
        x: "JFE-EDJ-v2, frozen, built from 212 research articles of 2021–2026.",
      },
      {
        id: "c1",
        a: "js",
        t: "Read the publisher’s rules",
        x: "Education Data Journal (example), research article, author guidelines of September 2026.",
      },
      {
        id: "c2",
        a: "js",
        t: "Separate rules from habits",
        x: "One conflict: the rules ask for a structured abstract; most papers use one paragraph. The rule wins.",
      },
      {
        id: "c3",
        a: "js",
        t: "Place each statement type in IMRaD",
        x: "Gap and question in the Introduction, findings in Results, limitations in their own subsection, as 72% of the journal’s papers do.",
      },
      {
        id: "c4",
        a: "js",
        t: "Map the argument to the journal’s habits",
        x: "Qualifiers to the hedge range, rebuttals to Limitations, warrants to Method, numbers always with intervals.",
      },
      {
        id: "c5",
        a: "js",
        t: "Set structure, budgets and sentences",
        x: "IMRaD with Related work in 9,000 words; past tense for methods and results, present for claims.",
      },
      { id: "K08", check: true, t: "Approve the journal contract" },
      {
        id: "c6",
        a: "js",
        t: "Shape the page",
        x: "Running head, title, structured abstract, six sections and their word budgets.",
      },
    ],
  },
  {
    id: "S09",
    ph: 2,
    short: "Outline",
    name: "IMRaD Outline & Section Blueprint",
    a: "rp",
    title: "Lay out the storyline",
    lead: "The Planner places every frozen statement in its IMRaD section, as the contract says, and gives each section the statements it must carry, plus its figures and tables.",
    ipo: {
      in: "Frozen graph; journal contract; placement map; figure assets",
      proc: "Arrange claims that are IN into a storyline; allocate statements to sections; choose the journal’s move patterns",
      hu: "Quick check: approve the storyline (K09)",
      fa: "Question, method and results measure different things → revise the outline",
      needs: "G1 frozen graph · S08 contract",
    },
    outs: ["ManuscriptBlueprint.json", "SectionContracts.json"],
    steps: [
      {
        id: "h1",
        a: "rp",
        t: "Lay out the storyline",
        x: "Gap → question → method → three findings → conclusion → limits.",
      },
      {
        id: "h2",
        a: "rp",
        t: "Allocate statements to sections",
        x: "Each section gets the statements it must carry, and nothing else.",
      },
      {
        id: "h3",
        a: "rp",
        t: "Pick move patterns",
        x: "The Introduction follows CARS, as 78% of the journal’s papers do: establish the field, show the gap, fill it.",
      },
      {
        id: "h4",
        a: "rp",
        t: "Check question, method and results line up",
        x: "The question asks about recall; the method measures recall; the results report recall.",
      },
      { id: "K09", check: true, t: "Approve the storyline" },
    ],
  },
  {
    id: "S10",
    ph: 2,
    short: "Contracts",
    name: "Paragraph & Sentence Contracts",
    a: "rp",
    title: "Give every paragraph a contract",
    lead: "Each paragraph gets a written contract from the journal’s recipes: its job, its move order, the role of each sentence, its citation slots and the evidence it may use. Writers cannot go beyond it.",
    ipo: {
      in: "Section contracts; JFE recipes and archetypes; frozen claim IDs",
      proc: "Allocate paragraph goals, move order, sentence roles, citation slots and transitions",
      hu: "Optional review for risky paragraphs (SmartPause)",
      fa: "Paragraph with a claim but no evidence → BLOCK the paragraph",
      needs: "S09 outline",
    },
    outs: ["ParagraphContracts.json"],
    steps: [
      {
        id: "i1",
        a: "rp",
        t: "Split sections into paragraphs",
        x: "61 paragraphs and the Abstract, inside the word budgets.",
      },
      {
        id: "i2",
        a: "rp",
        t: "Plan sentence roles and citation slots",
        x: "Topic, evidence, comparison, qualification, transition.",
      },
      {
        id: "i3",
        a: "rp",
        t: "Block paragraphs without evidence",
        x: "Results 4.4 needs an entry year the record lacks. Status: BLOCKED_NEEDS_EVIDENCE.",
      },
      {
        id: "i4",
        a: "or",
        t: "Decide whether you need to look",
        x: "SmartPause scores each paragraph for risk. None is high, so the optional review is skipped.",
      },
    ],
  },
  {
    id: "S11",
    ph: 2,
    short: "Drafting",
    name: "Multi-Agent Section Drafting",
    a: "sw",
    title: "Write, section by section",
    lead: "Three writers work in parallel, each locked to its own section and sharing one glossary. Method and Results come first; the Discussion waits until you choose how strongly the findings are worded.",
    ipo: {
      in: "Paragraph contracts; frozen graph; ledger; journal terms",
      proc: "Draft Method and Results first, then Discussion, Introduction, Conclusion, Abstract; reconcile terms",
      hu: "Stop 3 (G2): you choose the wording before the Discussion is written",
      fa: "Unknown result or metric → NEEDS_EVIDENCE, never invented",
      needs: "S10 contracts",
    },
    outs: ["Draft_1.md", "SentenceProvenance.json"],
    steps: [
      {
        id: "j1",
        a: "sw",
        t: "Write Method and Results in parallel",
        x: "The Method writer and the Results writer each stay inside their own section.",
      },
      {
        id: "j2",
        a: "sw",
        t: "Fill Table 1 and Figure 2",
        x: "Every cell and every bar comes from the evidence ledger.",
      },
      {
        id: "j3",
        a: "sw",
        t: "Reconcile terms",
        x: "Results wrote “finished”; the glossary says “eligible”. The shared glossary wins.",
      },
      {
        id: "j4",
        a: "sw",
        t: "Leave 4.4 empty",
        x: "NEEDS_EVIDENCE: the record has no entry year, so no number is invented.",
      },
      { id: "G2", gate: true, t: "How strongly should the findings be worded?" },
      {
        id: "j5",
        a: "sw",
        t: "Write Discussion, Introduction and Conclusion",
        x: "The Discussion writer uses the wording you chose.",
      },
      { id: "j6", a: "sw", t: "Write the Abstract last", x: "From the finished text, not from the plan." },
    ],
  },
  {
    id: "S12",
    ph: 2,
    short: "Read-back",
    name: "Reverse AIF Verification",
    a: "rv",
    title: "Read the draft back against the frozen graph",
    lead: "The Reverse Verifier reads the draft without the plan, rebuilds its argument graph and compares it with the one you froze. Language slips are fixed automatically; scientific divergences go to you.",
    ipo: {
      in: "Draft 1; frozen graph; ledger",
      proc: "Re-extract propositions; compare source, strength and qualifiers; flag omissions, additions, invalid support and citation drift",
      hu: "You settle scientific divergences (K12)",
      fa: "New unsupported claim → roll the paragraph back to S10 and S11",
      needs: "S11 draft · G1 graph",
    },
    outs: ["GraphDelta.json", "VerifiedDraft.md"],
    steps: [
      {
        id: "k1",
        a: "rv",
        t: "Rebuild the graph from the draft",
        x: "Reading every sentence and extracting the claims it actually makes.",
      },
      {
        id: "k2",
        a: "rv",
        t: "Compare with the frozen graph",
        x: "11 claims match. 1 is widened, 1 is new, 1 caveat is missing, 1 citation drifted.",
      },
      {
        id: "k3",
        a: "rv",
        t: "Roll back the paragraph with a new claim",
        x: "5.1 claims something no locked claim says. It goes back to its contract (S10) and is rewritten (S11).",
      },
      {
        id: "k4",
        a: "rv",
        t: "Fix citation, omission and language slips",
        x: "Citation corrected from the ledger, the missing caveat restored, one term made consistent.",
      },
      { id: "K12", check: true, t: "Resolve the widened claim in 4.1" },
    ],
  },
  {
    id: "S13",
    ph: 3,
    short: "Journal fit",
    name: "Journal Fit & Language Alignment",
    a: "js",
    title: "Measure the draft against the journal",
    lead: "The draft is compared with the 212 papers behind the profile. Style is aligned without changing what any sentence means. Journal fit is not scientific quality; exceptions are listed, not forced.",
    ipo: {
      in: "Verified draft; JFE bands; journal contract",
      proc: "Check section shares, hedging, paragraph length, voice, citations and move order; edit without semantic drift",
      hu: "Review exceptions to journal norms",
      fa: "A style edit that changes meaning → revert and report · no profile → rules only",
      needs: "S12 verified draft",
    },
    outs: ["JournalFitReport.json", "AdaptedDraft.md"],
    steps: [
      {
        id: "l1",
        a: "js",
        t: "Measure the draft against 212 papers",
        x: "Section shares, hedging, paragraph length, passive voice and citation density.",
      },
      {
        id: "l2",
        a: "js",
        t: "Compare the order of moves",
        x: "Introduction moves match the typical order. Discussion has no comparison with prior work.",
      },
      {
        id: "l3",
        a: "js",
        t: "Edit style without changing meaning",
        x: "Three tracked edits. Each is checked against the frozen graph.",
      },
      {
        id: "l4",
        a: "code",
        t: "Undo the edit that changed meaning",
        x: "“significantly” implies a statistical test that was not run. Reverted.",
      },
      {
        id: "l5",
        a: "js",
        t: "List the exceptions",
        x: "Related work is longer than usual; Discussion has no comparison move. Both are reported, not forced.",
      },
    ],
  },
  {
    id: "S14",
    ph: 3,
    short: "Review",
    name: "Multi-Agent Peer Review",
    a: "rb",
    title: "Face three independent reviewers",
    lead: "A method reviewer, an evidence reviewer and a writing reviewer read the draft without seeing each other’s notes. Disagreements go to you, and the original reports are always kept.",
    ipo: {
      in: "Adapted draft; evidence and graph reports",
      proc: "Independent critiques; check originality against the package; find disagreements; rank issues and route each to the stage that must fix it",
      hu: "You settle disagreements (K14)",
      fa: "Blocking issue → targeted S07, S11 or S12 revision",
      needs: "S13 adapted draft",
    },
    outs: ["ReviewerReports.json", "IssueBacklog.json"],
    steps: [
      {
        id: "m1",
        a: "rb",
        t: "Three reviewers read separately",
        x: "Each reviewer sees the draft, the ledger and the graph reports, but not the other reviews.",
      },
      {
        id: "m2",
        a: "rb",
        t: "Check the originality claim",
        x: "“Nobody has tested…” is checked against all 12 papers read. Dekker et al. predict dropout after the first semester, with no locked plan and no leakage check.",
      },
      {
        id: "m3",
        a: "rb",
        t: "Find disagreements",
        x: "Comments 1 and 3 disagree about students who stopped attending. Both reports are kept as written.",
      },
      { id: "K14", check: true, t: "Settle comments 1 and 3" },
      {
        id: "m4",
        a: "rb",
        t: "Rank the issues",
        x: "Five issues, ranked by severity, each routed to the stage that must fix it.",
      },
    ],
  },
  {
    id: "S15",
    ph: 3,
    short: "Revision",
    name: "Issue-Guided Revision & Reverification",
    a: "re",
    title: "Patch only what the issues touch",
    lead: "Only the affected sentences change. Each change is shown as a semantic diff, and only the checks those changes affect run again. Revision rounds are capped at three.",
    ipo: {
      in: "Ranked backlog; your decisions; immutable draft snapshots",
      proc: "Patch affected spans only; show the semantic diff; rerun the affected checks; at most three rounds",
      hu: "You approve any change to a claim",
      fa: "Three rounds without a clean read-back → escalate to you",
      needs: "S14 backlog",
    },
    outs: ["Draft_2.md", "ChangeLog.json"],
    steps: [
      {
        id: "n1",
        a: "code",
        t: "Rerun the analysis the reviewer asked for",
        x: "A1 is rerun without the students who sat no first-semester evaluation, 664 of 726 per split on average: the gain is 0.122 (95% CI 0.100 to 0.143, row 41). Finding 1 holds.",
      },
      {
        id: "n2",
        a: "re",
        t: "Patch only the affected sentences",
        x: "Five patches across 4.1, 5.2, 3.3, 1.1 and the Abstract.",
      },
      {
        id: "n3",
        a: "re",
        t: "Show the semantic diff",
        x: "A number was added and a caveat answered. Claim strength and scope did not move.",
      },
      {
        id: "n4",
        a: "or",
        t: "Rerun the affected checks",
        x: "ASPIC+ for Finding 1 and the read-back of the patched paragraphs. Stop 3 is not affected.",
      },
      { id: "n5", a: "re", t: "Snapshot draft 2", x: "Draft 1 is kept unchanged. Draft 2 is a new, hashed version." },
    ],
  },
  {
    id: "S16",
    ph: 3,
    short: "Sign off",
    name: "Final Approval & Export",
    a: "re",
    title: "Final checks, then your signature",
    gate: "G3",
    lead: "The submission checklist, reference integrity and the AI-use statement are checked. The manuscript becomes submission-ready only after you sign. ASW never submits it.",
    ipo: {
      in: "Draft 2; approvals; contract; figures, tables, bibliography",
      proc: "Check the submission list, every reference, the AI-use statement; build the audit manifest; export PDF, DOCX and LaTeX",
      hu: "Stop 4 (G3): your signature; nothing is submitted for you",
      fa: "Missing signature or open critical issue → export stays locked",
      needs: "S15 draft 2",
    },
    outs: ["SubmissionPackage.zip", "ApprovalLedger.json", "DisclosureDraft.md"],
    steps: [
      {
        id: "o1",
        a: "re",
        t: "Check the submission list",
        x: "Length, abstract, figures, data availability, declarations.",
      },
      {
        id: "o2",
        a: "cu",
        t: "Check every reference",
        x: "21 references. The one quarantined at S02 is not cited anywhere and was not replaced by a look-alike.",
      },
      {
        id: "o3",
        a: "re",
        t: "Write the AI-use statement",
        x: "A draft for you to edit. It says what the system did and what it did not.",
      },
      {
        id: "o4",
        a: "or",
        t: "Build the audit manifest",
        x: "Every approval, snapshot hash and provenance link in one immutable record.",
      },
      { id: "G3", gate: true, t: "Sign the manuscript?" },
    ],
  },
];
/* which stage each stop belongs to */
export const STOP_STAGE: Record<string, string> = {
  G0: "S02",
  G1: "S07",
  G2: "S11",
  G3: "S16",
  K01: "S01",
  K03: "S03",
  K04: "S04",
  K08: "S08",
  K09: "S09",
  K12: "S12",
  K14: "S14",
};

/* ---------- S08 · the journal ---------- */
export const SECTIONS: [string, string, string, string][] = [
  ["ABS", "Abstract", "", "≤ 250 words"],
  ["INT", "Introduction", "1", "≈ 800 words"],
  ["REL", "Related work", "2", "≈ 650 words"],
  ["MET", "Method", "3", "≈ 1,250 words"],
  ["RES", "Results", "4", "≈ 900 words"],
  ["DIS", "Discussion", "5", "≈ 700 words"],
  ["CON", "Conclusion", "6", "≈ 200 words"],
];
export const VARIANTS: [string, number, number][] = [
  ["IMRaD + Related work", 64, 1],
  ["IMRaD, background in Introduction", 27, 0],
  ["Results and Discussion merged", 9, 0],
];
/* where each statement type goes: the default from the fourth-axis table, what the journal's papers do, and this paper */
export const PLACEMENT: [string, string, string, string][] = [
  ["GAP", "Introduction", "Intro, move 2 “show the gap” · 96%", "1.1"],
  ["RQ", "End of the Introduction", "Last paragraph of the Introduction · 88%", "1.1 · context"],
  ["HYPOTHESIS", "Introduction or Method", "Named in Method · 61%", "3.1 · named, never as results"],
  ["ASSUMPTION", "Method, often unstated", "Stated in Method · 34%", "3.2 · stated, with how it is handled"],
  ["FINDING", "Results", "Results · 97%", "4.1–4.3"],
  ["CONCLUSION", "Discussion and Abstract", "Discussion, first paragraph · 84%", "5.1 · Abstract"],
  ["IMPLICATION", "Discussion", "Discussion, last paragraph · 71%", "5.1"],
  ["LIMITATION", "Discussion or Limitations", "Own “Limitations” subsection · 72%", "5.2"],
  ["FUTURE", "End of the paper", "Conclusion · 58%", "6.1"],
];
/* each Toulmin part, the journal habit it meets, and the line it becomes in the contract */
export const TOUMAP: [string, string, string][] = [
  ["Data", "Numbers with intervals in 83% of papers", "Every number with its interval, from the ledger"],
  [
    "Qualifier",
    "Hedges: 4.1 per 1,000 words (IQR 3.2–5.0)",
    "Findings worded with the strength you choose at stop 3, hedges kept within 3.2–5.0",
  ],
  ["Claim", "Present tense for claims in 88% of papers", "Claims in the present tense; results in the past"],
  [
    "Warrant",
    "Stated in 41% of Results paragraphs",
    "Reconstructed warrants are stated once in Method 3.1, never quoted",
  ],
  ["Backing", "1.2 citations per paragraph", "Backing is cited where it is used"],
  [
    "Rebuttal",
    "Limitations in their own subsection in 72% of papers",
    "Every rebuttal of F1–C is written in 5.2 Limitations",
  ],
];
/* the sentence-level contract */
export const SENTENCE_RULES: [string, string, string][] = [
  ["Tense", "Past for Method and Results (92%), present for claims (88%)", "habit"],
  ["Voice", "“We”, with 22% passive", "habit"],
  ["Sentence length", "Median 24 words", "habit"],
  ["Paragraph", "About 132 words; 110–150 is usual", "habit"],
  ["Terms", "“recall at 20% flagged” spelled out; one term per concept", "habit"],
  ["“Significant”", "Only next to a stated test", "rule"],
];
/* without a profile, only the rules and the fourth-axis defaults remain */
export const PLACEMENT_RULES_ONLY = "No profile: the default places from the fourth-axis table are used.";

/* ---------- S03 · the fourth axis ---------- */
/* id, type, lane, text, status, tone, source field in the data report */
export const SP: [string, string, number, string, string, string, string][] = [
  [
    "SP-01",
    "GAP",
    0,
    "No pre-registered, leakage-checked test of whether first-semester results add to enrolment data for dropout warning",
    "ESTABLISHED",
    "ok",
    "B.2 · search.json",
  ],
  [
    "SP-02",
    "RQ",
    0,
    "At the end of the first semester, how well can dropout be predicted, and does the semester add to enrolment data?",
    "APPROVED",
    "ok",
    "B.3 · brief.md",
  ],
  [
    "SP-03",
    "OBJECTIVE",
    0,
    "Compare LR-E, GB-E and GB-ES1 by recall at 20% flagged on five splits",
    "APPROVED",
    "ok",
    "B.3 · plan §1",
  ],
  [
    "SP-04",
    "HYPOTHESIS",
    1,
    "H1 · First-semester results raise recall at 20% flagged",
    "TESTED",
    "info",
    "B.4 · H1, primary",
  ],
  [
    "SP-05",
    "HYPOTHESIS",
    1,
    "H2 · The gain is larger below the median admission grade",
    "TESTED",
    "info",
    "B.4 · H2, primary",
  ],
  [
    "SP-06",
    "HYPOTHESIS",
    1,
    "H4 · Boosting beats logistic regression on enrolment data",
    "TESTED",
    "info",
    "B.4 · H4, primary",
  ],
  ["SP-07", "ASSUMPTION", 1, "Students are independent of each other", "ASSUMED", "vio", "B.12 · declared in the plan"],
  [
    "SP-08",
    "FINDING",
    2,
    "F1 · Adding first-semester results finds more of the students who drop out",
    "SUPPORTED",
    "ok",
    "G.1 · A1 · row 21",
  ],
  [
    "SP-09",
    "FINDING",
    2,
    "F2 · The gain appears in both admission groups and is not larger below the median",
    "SUPPORTED",
    "ok",
    "G.1 · A2 · rows 22, 39–40",
  ],
  [
    "SP-10",
    "FINDING",
    2,
    "F3 · No clear gain from boosting over logistic regression",
    "INCONCLUSIVE",
    "warn",
    "G.1 · A3 · row 23",
  ],
  [
    "SP-11",
    "CONCLUSION",
    3,
    "First-semester results are the better basis for dropout early warning",
    "BOUNDED",
    "vio",
    "I.2 · proposed by the authors",
  ],
  [
    "SP-12",
    "IMPLICATION",
    3,
    "Advisers can contact the fifth of students the ranking flags after the first semester",
    "PROPOSED",
    "info",
    "I.2 · proposed by the authors",
  ],
  [
    "SP-13",
    "IMPLICATION",
    3,
    "The same ranking can be used at other polytechnics",
    "BLOCKED",
    "bad",
    "I.2 · beyond the ceiling",
  ],
  ["SP-14", "LIMITATION", 4, "One polytechnic, 11 cohorts", "BOUNDS SP-11", "vio", "J.1 · C.3"],
  ["SP-15", "LIMITATION", 4, "Students share courses and cohorts", "BOUNDS SP-08", "vio", "J.1 · E.2"],
  [
    "SP-16",
    "LIMITATION",
    4,
    "22% of flagged dropouts had no first-semester evaluation",
    "BOUNDS SP-12",
    "vio",
    "J.1 · A5",
  ],
];
export const SP_LINKS: [string, string, string?][] = [
  ["SP-01", "SP-02"],
  ["SP-02", "SP-03"],
  ["SP-02", "SP-04"],
  ["SP-02", "SP-05"],
  ["SP-02", "SP-06"],
  ["SP-04", "SP-08"],
  ["SP-05", "SP-09"],
  ["SP-06", "SP-10"],
  ["SP-08", "SP-11"],
  ["SP-09", "SP-11"],
  ["SP-11", "SP-12"],
  ["SP-14", "SP-11", "lim"],
  ["SP-15", "SP-11", "lim"],
  ["SP-16", "SP-12", "lim"],
];
/* questions and objectives are not true or false: they frame the graph and never enter it */
export const OUTSIDE: Set<string> = new Set(["SP-02", "SP-03"]);

/* ---------- S05 · Toulmin, each part tied to the ruling it came from ---------- */
export const TOU: Record<string, ToulminDef> = {
  F1: {
    name: "Finding 1",
    claim: "Adding first-semester results finds more of the students who drop out",
    data: "Recall at 20% flagged: GB-ES1 0.507, GB-E 0.396, on the same 726 test students in each of five splits",
    war: "Same students, splits and flag rate, so the two scores compare directly",
    recon: 0,
    back: "Plan §5, and an interval recomputed by course (0.081–0.146)",
    qual: "At this polytechnic",
    reb: "Unless students in the same course make the result look more certain than it is",
  },
  F2: {
    name: "Finding 2",
    claim: "The gain appears in both admission groups and is not larger below the median",
    data: "Gain 0.098 below the median admission grade, 0.129 above; difference −0.031, 95% CI −0.109 to 0.027",
    war: "The median was taken from each training part before any result was seen",
    recon: 0,
    back: "Pre-registered split, plan §6, locked before the first run",
    qual: "Likely",
    reb: "Unless admission grade simply stands in for the course a student entered",
  },
  F3: {
    name: "Finding 3",
    claim: "On enrolment data, boosting gives no clear gain over logistic regression",
    data: "Gain 0.004, 95% CI −0.007 to 0.021",
    war: "An interval that includes zero cannot support a difference",
    recon: 1,
    back: "Bootstrap inference (Efron & Tibshirani, 1993)",
    qual: "No clear gain, not no gain",
    reb: "Unless the gain is below about 0.06, the smallest the test could see",
  },
  C: {
    name: "Conclusion",
    claim: "First-semester results are the better basis for dropout early warning",
    data: "Findings 1 and 2",
    war: "Eleven years of one polytechnic’s entrants stand in for students in general",
    recon: 1,
    back: "Every entrant to 17 degrees, 2008/09–2018/19 (Realinho et al., 2022)",
    qual: "In general",
    qual2: "For entrants to this polytechnic, as in 2008/09–2018/19",
    reb: "Unless other institutions or later cohorts behave differently",
    scope: 1,
  },
};
export const CLAIMS: ClaimDef[] = [
  {
    k: "F1",
    name: "Finding 1",
    kind: "supported",
    t: "Adding first-semester results finds more of the students who drop out.",
    t2: "At this polytechnic, adding first-semester results finds more of the students who drop out.",
  },
  {
    k: "F2",
    name: "Finding 2",
    kind: "supported",
    t: "The gain appears whether students were admitted with low or high grades.",
    t2: "In both admission groups the gain is clear, and it is not larger below the median.",
  },
  {
    k: "F3",
    name: "Finding 3",
    kind: "null",
    t: "On enrolment data, boosting gives no clear gain over logistic regression.",
    t2: "On enrolment data, boosting cannot be told apart from logistic regression.",
  },
  {
    k: "C",
    name: "Conclusion",
    kind: "conclusion",
    t: "First-semester results are the better basis for dropout early warning.",
    t2: "For entrants to this polytechnic, first-semester results are the better basis for dropout early warning.",
    t3: "At this polytechnic, first-semester results improve early warning overall; course by course the evidence is mixed.",
  },
];

/* ---------- S09 / S10 ---------- */
export const STORY: [string, string][] = [
  ["Gap", "SP-01"],
  ["Question", "SP-02"],
  ["Method", "SP-03"],
  ["Finding 1", "SP-08"],
  ["Finding 2", "SP-09"],
  ["Finding 3", "SP-10"],
  ["Conclusion", "SP-11"],
  ["Limits", "SP-14…16"],
];
export const ALLOC: [string, string[], string][] = [
  ["INT", ["SP-01", "SP-02"], "#0f766e"],
  ["MET", ["SP-03", "SP-07"], "#0d9488"],
  ["RES", ["SP-08", "SP-09", "SP-10"], "#059669"],
  ["DIS", ["SP-11", "SP-12", "SP-14", "SP-15", "SP-16"], "#7c3aed"],
  ["CON", ["SP-11"], "#7c3aed"],
];
export const CARS: string[][] = [
  ["Introduction", "Establish the field", "Show the gap", "Fill the gap"],
  ["Results", "Report", "Compare", "Qualify"],
  ["Discussion", "Interpret", "Limit", "Imply"],
];
export const PLANX: Record<string, PlanDef> = {
  "RES-1": {
    moves: [
      "Say what was compared, and on which students",
      "Give the gain with its interval",
      "Hold it against the plan's threshold",
    ],
    roles: [
      ["topic", "Topic", "First-semester results against enrolment data"],
      ["evid", "Evidence", "0.396 → 0.507, gain 0.111 [rows 6–15, 21]"],
      ["qual", "Qualification", "Threshold 0.05 from the plan; interval by students [21]"],
    ],
    len: "60–90 words",
    cites: "Table 1",
    tr: "→ 4.2 “in each admission group”",
    gate: "G2",
    claim: "F1 · SP-08",
  },
  "RES-2": {
    moves: ["Name the groups", "Give both gains"],
    roles: [
      ["topic", "Topic", "The split by admission grade"],
      ["evid", "Evidence", "0.098 and 0.129 [rows 39–40]"],
    ],
    len: "40–60 words",
    cites: "Figure 2",
    tr: "→ 4.2·2 “the difference”",
    gate: "G2",
    claim: "F2 · SP-09",
  },
  "RES-3": {
    moves: ["Say what is compared on enrolment data", "Give the difference and its interval"],
    roles: [
      ["topic", "Topic", "Boosting against logistic regression"],
      ["evid", "Evidence", "0.004, CI −0.007 to 0.021 [row 23]"],
      ["qual", "Qualification", "Smallest gain the test could see: about 0.06"],
    ],
    len: "40–60 words",
    cites: "—",
    tr: "→ 4.3·2 “what A3 says”",
    gate: "G2",
    claim: "F3 · SP-10",
  },
  "RES-4": {
    moves: ["Train on earlier cohorts, test on later ones", "Say whether the gain holds"],
    roles: [
      ["topic", "Topic", "Change across cohorts"],
      ["evid", "Evidence", "none: the record has no entry year"],
    ],
    len: "—",
    cites: "—",
    tr: "—",
    gate: "G2",
    claim: "none",
  },
  "INT-1": {
    moves: [
      "Why early warning matters",
      "What the field already knows",
      "What nobody has tested",
      "What this paper does",
    ],
    roles: [
      ["topic", "Topic", "Ranking students by risk"],
      ["evid", "Evidence", "[1] [2] [3] [4] [5]"],
      ["qual", "Qualification", "The gap, stated narrowly"],
      ["trans", "Transition", "“We run that test”"],
    ],
    len: "100–140 words",
    cites: "[1]–[5]",
    tr: "→ 1.2",
    gate: "—",
    claim: "SP-01 · SP-02",
  },
  "MET-1": {
    moves: ["Which record", "Who is in it", "Who is analysed, and why"],
    roles: [
      ["topic", "Topic", "The record"],
      ["evid", "Evidence", "3,630 of 4,424 [analysis.json]"],
      ["qual", "Qualification", "Exclusion rule, B.10"],
    ],
    len: "80–110 words",
    cites: "[1]",
    tr: "→ 3.1·2",
    gate: "—",
    claim: "SP-03",
  },
};
export const RISK: [string, number][] = [
  ["1.1 · gap statement (novelty)", 0.38],
  ["4.1 · Finding 1", 0.22],
  ["5.1 · interpretation", 0.31],
  ["4.4 · cohorts (blocked)", 0.0],
];

export const TRACE: Record<string, [string, string, string, number?][]> = {
  F1: [
    ["quote", "Claim", "Finding 1 · First-semester results find more of the students who drop out"],
    ["link", "Inference", "RA1: Evidence E1 + Warrant W1 → F1 · undercut answered at S07"],
    ["table", "Evidence", "results.csv rows 11–15, 21 · 0.507 vs 0.396, gain 0.111"],
    ["hash", "Source", "10 traces, interval recomputed by course (row 24) · sha 3ef1…c45a"],
  ],
  F2: [
    ["quote", "Claim", "Finding 2 · The gain appears in both admission groups, not larger below the median"],
    ["link", "Inference", "RA2: Evidence E2 → F2 · CA5: F2 defeats H2"],
    ["table", "Evidence", "results.csv rows 22, 39–40 · 0.098 and 0.129"],
    ["hash", "Source", "Traces t06–t15 · sha 3ef1…c45a"],
  ],
  F3: [
    ["quote", "Claim", "Finding 3 · On enrolment data, no clear gain from boosting"],
    ["link", "Conflict", "CA3: F3 contradicts H4; PA1 prefers the evidence"],
    ["table", "Evidence", "results.csv row 23 · interval −0.007 to 0.021"],
  ],
  C: [
    ["quote", "Claim", "Conclusion · First-semester results are the better basis for early warning"],
    ["link", "Inference", "RA4: F1 + F2 → C, narrowed by you at K04"],
    ["alert", "Wording", "Chosen by you at stop 3"],
  ],
  M: [
    ["book", "Method", "Data report B.8–B.10 · same students, splits and flag rate for every model"],
    ["file", "Source", "plan.md · locked 27 Oct 2026, 10:50 UTC"],
  ],
  GAP: [
    ["book", "Background", "Search strategy B.2 · Scopus, ERIC and arXiv"],
    ["file", "Source", "Reading notes on Dekker et al. 2009 and Kapoor & Narayanan 2023 · SP-01"],
  ],
  RQ: [
    ["quote", "Research question", "SP-02 · Do first-semester results add to what is known at enrolment?"],
    ["file", "Source", "Data report B.3 · approved in the brief"],
  ],
  LIM: [
    ["alert", "Limitation", "SP-14 to SP-16 · from J.1, kept at stop 2"],
    ["table", "Evidence", "One polytechnic, 11 cohorts · no entry year"],
  ],
  X: [
    ["x", "Claim", "No frozen claim says this", 1],
    ["link", "Inference", "No inference supports it in graph v1", 1],
    ["table", "Evidence", "Row 23: the interval includes zero", 1],
  ],
};
export const EVSRC: [string, string][] = [
  ["analysis.json", "3,630 of 4,424 students · 39.1% dropped out"],
  ["rows 1–5", "LR-E · recall 0.392 · AUROC 0.783"],
  ["rows 6–10", "GB-E · recall 0.396 · AUROC 0.788"],
  ["rows 11–15", "GB-ES1 · recall 0.507 · AUROC 0.923"],
  ["row 21", "A1 gain 0.111, CI 0.092 to 0.129"],
  ["row 22", "A2 difference −0.031, CI −0.109 to 0.027"],
  ["row 23", "A3 difference 0.004, CI −0.007 to 0.021"],
  ["rows 24–25", "A1 and A3 with courses resampled"],
  ["row 26", "undated columns added: 0.002"],
  ["row 27", "A5 · 22% of flagged dropouts sat no evaluation"],
  ["rows 28–38", "A4 · recall by course"],
  ["rows 39–40", "gains 0.098 and 0.129 by admission grade"],
];
export const GLOSS: [string, string, string][] = [
  ["eligible student", "finished student", "Outcome known; defined in 3.1"],
  ["recall at 20% flagged", "recall@20, top-20% recall", "Spelled out in text"],
  ["first-semester results", "semester-1 grades", "The six S1 columns"],
  ["gradient boosting", "GBM, XGBoost", "scikit-learn, histogram-based"],
];

/* ---------- S12 ---------- */
export const DLT: [string | null, string, string | null, string, string, string][] = [
  [
    "F1 · more dropouts found than GB-E",
    "SP-08",
    "“…than any model built on enrolment data”",
    "4.1, sentence 1",
    "weak",
    "Scope widened",
  ],
  ["F2 · gain in both admission groups", "SP-09", "Gain in both groups, not larger below", "4.2", "ok", "Match"],
  [
    "Caveat · some flagged students had stopped attending",
    "SP-16 · limit",
    null,
    "not in the draft",
    "miss",
    "Omitted",
  ],
  ["F3 · no clear gain from boosting", "SP-10", "No clear gain on enrolment data", "4.3, 5.1", "ok", "Match"],
  [
    null,
    "not in the frozen graph",
    "“Boosting also ranks students better than logistic regression”",
    "5.1, sentence 3",
    "add",
    "New claim",
  ],
  ["C · better basis, this polytechnic", "SP-11", "First semester, better basis", "5.1, 6.1", "ok", "Match"],
  [
    "Realinho et al. 2022 describe the record",
    "ledger: [1]",
    "Cited as [13] (Martins et al.)",
    "2.1",
    "cite",
    "Citation drift",
  ],
  [
    "Limits · one polytechnic, shared courses",
    "SP-14, SP-15",
    "One polytechnic, courses resampled",
    "5.2",
    "ok",
    "Match",
  ],
];
export const RV_ISS: RvIssue[] = [
  {
    n: 1,
    k: "add",
    sev: "critical",
    t: "New unsupported claim",
    w: "5.1, sentence 3",
    x: "“Boosting also ranks students better than logistic regression” matches no frozen claim, and row 23 says otherwise.",
    fix: "Paragraph rolled back to its contract and rewritten",
    route: "S12 → S10 → S11",
  },
  {
    n: 2,
    k: "weak",
    sev: "scientific",
    t: "Scope widened",
    w: "4.1, sentence 1",
    x: "Finding 1 compares GB-ES1 with GB-E only. The draft says “any model built on enrolment data”.",
    fix: "Narrowed to the locked claim, by your decision",
    route: "You decide · K12",
  },
  {
    n: 3,
    k: "miss",
    sev: "scientific",
    t: "Caveat omitted",
    w: "5.2",
    x: "The limit on Finding 1, “some flagged students may already have stopped attending”, is in the graph but not in the text.",
    fix: "Restored in 5.2 from the graph",
    route: "auto · from the graph",
  },
  {
    n: 4,
    k: "cite",
    sev: "citation",
    t: "Citation drift",
    w: "2.1",
    x: "“Realinho et al. describe the record…” cites [13] (Martins et al.). The ledger links this sentence to [1].",
    fix: "Citation corrected from the evidence ledger",
    route: "auto · from the ledger",
  },
  {
    n: 5,
    k: "lang",
    sev: "language",
    t: "Number style",
    w: "3.4",
    x: "“ten thousand resamples”: the journal writes numbers above ten as numerals.",
    fix: "Changed to “10,000”",
    route: "auto · language",
  },
];

/* ---------- S13 ---------- */
export const FIT: [string, string, number, number, number, number, number, number, string][] = [
  ["Introduction", "% of words", 5, 25, 11, 15, 13, 12.6, "%"],
  ["Related work", "% of words", 5, 25, 9, 12, 11, 13.1, "%"],
  ["Method", "% of words", 10, 30, 18, 24, 21, 20.4, "%"],
  ["Results", "% of words", 20, 40, 27, 35, 31, 30.2, "%"],
  ["Discussion", "% of words", 5, 25, 13, 19, 16, 15.1, "%"],
  ["Hedges", "per 1,000 words", 0, 8, 3.2, 5, 4.1, 3.9, ""],
  ["Paragraph length", "words", 60, 200, 110, 150, 132, 118, ""],
  ["Passive voice", "% of sentences", 0, 50, 15, 28, 22, 19, "%"],
  ["Citations", "per paragraph", 0, 3, 0.8, 1.6, 1.2, 1.1, ""],
];
/* with no profile, only the publisher's rules can be checked */
export const FIT_RULES: [string, string, string][] = [
  ["Length", "8,412 of 9,000 words", "ok"],
  ["Abstract", "structured, 231 of 250 words", "ok"],
  ["“Significant”", "only next to a stated test", "ok"],
  ["Data availability", "statement present", "ok"],
  ["Use of AI", "statement present", "ok"],
  ["References", "ACM style, 21 entries", "ok"],
];
export const MOVES: [string, string[], string][] = [
  ["Intro · typical", ["Establish the field", "Show the gap", "Fill the gap"], "78% of 212"],
  ["Intro · draft", ["Establish the field", "Show the gap", "Fill the gap"], "ok"],
  ["Disc. · typical", ["Interpret", "Compare with prior work", "Limit", "Imply"], "64% of 212"],
  ["Disc. · draft", ["Interpret", "Compare with prior work", "Limit", "Imply"], "miss1"],
];
export const EDITS: EditDef[] = [
  { p: "REL-1", r: "rel", why: "Shorter, same meaning", ok: 1 },
  { p: "DIS-1", r: "dis", why: "Shorter, same meaning", ok: 1 },
  {
    p: "RES-1",
    from: "Recall at 20% flagged rose",
    to: "Recall at 20% flagged rose significantly",
    why: "Reverted: the rules allow “significant” only with a stated test, and none was run",
    ok: 0,
  },
];
export const EXCEPTIONS: [string, string][] = [
  ["Related work is longer than usual", "Reported, not cut; a reviewer may ask."],
  ["Discussion has no comparison move", "No prior result uses this protocol, so there is nothing to compare with."],
];

/* ---------- S14 ---------- */
export const REVIEWERS: ReviewerDef[] = [
  {
    k: "me",
    n: "Method reviewer",
    i: "Me",
    c: "#2563eb",
    verdict: ["Major revision", "bad"],
    notes: [
      [
        "4.1",
        "Some flagged dropouts sat no first-semester evaluation and may already have left. Rerun A1 without them.",
      ],
      ["3.4", "Five splits is enough; give the gain for each split too."],
    ],
  },
  {
    k: "ev",
    n: "Evidence reviewer",
    i: "Ev",
    c: "#059669",
    verdict: ["Minor revision", "warn"],
    notes: [
      ["3.3", "Which grid point did tuning choose for GB-ES1? Report it."],
      ["5.2", "Students who stopped attending are already named in Limits. For this paper that is enough."],
      [
        "1.1",
        "Originality: Dekker et al. use first-semester data, but with no locked plan or dated inputs. The claim holds; say “to our knowledge”.",
      ],
    ],
  },
  {
    k: "wt",
    n: "Writing reviewer",
    i: "Wt",
    c: "#7c3aed",
    verdict: ["Accept with edits", "ok"],
    notes: [
      ["2.1", "Related work is long for a single-institution study. Trim it."],
      ["Abstract", "The Results sentence has too many numbers. Keep two."],
    ],
  },
];
export const COMMENTS: CommentDef[] = [
  { id: 1, r: "me", p: "RES-1", sev: "major", t: "Rerun A1 without students who sat no first-semester evaluation." },
  { id: 2, r: "ev", p: "MET-3b", sev: "minor", t: "Report the grid point tuning chose." },
  {
    id: 3,
    r: "ev",
    p: "DIS-2",
    sev: "minor",
    t: "Students who stopped attending are already in Limits; that is enough.",
  },
  { id: 4, r: "wt", p: "REL-1", sev: "minor", t: "Trim Related work." },
  { id: 5, r: "wt", p: "ABS", sev: "minor", t: "Keep two numbers in the abstract." },
  { id: 6, r: "ev", p: "INT-1", sev: "minor", t: "Add “to our knowledge” to the gap." },
];
export const BACKLOG: [string, string, string][] = [
  ["high", "Rerun A1 without students who sat no first-semester evaluation", "S07 → S11 → S12"],
  ["med", "Add “to our knowledge” to the gap statement", "S11 · 1.1"],
  ["low", "Report the grid point tuning chose", "S11 · 3.3"],
  ["low", "Trim Related work", "S11 · 2.1"],
  ["low", "Keep two numbers in the abstract", "S11 · Abstract"],
];

/* ---------- S15 / S16 ---------- */
export const PATCHES: [string, string, string, string, string][] = [
  ["4.1", "—", "without them: 0.122 (row 41)", "The new analysis, in one sentence", "strat"],
  [
    "5.2",
    "may already have stopped attending",
    "holds without them (4.1)",
    "The caveat is answered, not deleted",
    "om",
  ],
  [
    "3.3",
    "refit on the whole training part",
    "… (learning rate 0.05 in all five splits)",
    "Chosen grid point reported",
    "k60",
  ],
  ["1.1", "nobody has tested", "to our knowledge, no study has tested", "Originality claim qualified", "orig"],
  ["Abstract", "four numbers", "two numbers", "Interval moved to Results", "absci"],
];
export const SDIFF: [string, string, string, string][] = [
  ["Number", "A new analysis", "without students who sat no evaluation: 0.122 (row 41)", "warn"],
  ["Claim strength", "“indicate”", "unchanged", "ok"],
  ["Qualifier", "F1’s caveat, students who stopped attending", "answered by the new analysis", "ok"],
  ["Scope", "This polytechnic, 2008/09–2018/19", "unchanged", "ok"],
];
export const RERUNS: [string, string, string][] = [
  ["S07", "ASPIC+ label of F1 with row 41", "IN · caveat answered"],
  ["S12", "Read-back of 4.1, 5.2, 3.3, 1.1 and the Abstract", "pass"],
  ["G2", "Wording of the findings", "not affected"],
  ["S13", "Journal fit of the changed paragraphs", "pass"],
];
/* the three tries that fail when the revision cap is reached (scenario U9) */
export const CAP_TRIES: [string, string, string][] = [
  [
    "Round 1",
    "4.1 now says the gain “is not caused by” students who left: a causal claim the graph does not hold",
    "S12 read-back",
  ],
  ["Round 2", "4.1 drops the interval of the new analysis", "S12 read-back"],
  ["Round 3", "5.2 still names students who stopped attending as unexamined, contradicting 4.1", "S12 read-back"],
];
export const CHECKS: [string, string, string][] = [
  ["Length", "8,412 of 9,000 words", "ok"],
  ["Abstract", "231 of 250 words, structured", "ok"],
  ["Figures and tables", "Tables 1–2 and Figure 2 have data; Figure 4 left out", "ok"],
  ["References", "22 checked · 21 cited · 1 quarantined since S02", "warn"],
  ["Data availability", "statement written", "ok"],
  ["Use of AI", "statement drafted", "ok"],
];
export const DATA_AV =
  "The data are available from the UCI Machine Learning Repository (record 697) under CC BY 4.0. The plan, the deviation log, the code, the results table and all 20 traces are released with this paper.";
export const DISCLOSURE =
  "This manuscript was drafted with ASW, a multi-agent writing system, from a research record the authors produced and checked. Every number was copied from the authors’ traces; the system produced none. Agents argued each claim before it was drawn; the authors settled every deadlock, locked the claims, chose the wording of the findings and approved the final text, and take full responsibility for it.";

/* ---------- decisions: 4 stops and 7 quick checks ---------- */
export const DEC: Record<string, DecDef> = {
  G0: {
    kind: "gate",
    n: "G0",
    title: "Start writing from this record?",
    why: "The paper can only say what this record supports. Nothing is argued or written until you agree.",
    rec: [
      "The Orchestrator recommends starting",
      88,
      "Every must field of the data report is present and every number matches its trace. The missing entry year only blocks the paragraph on change across cohorts.",
    ],
    sum: [
      ["ok", "All 41 must and 9 should fields of the data report are present; 3 are partial"],
      ["ok", "91 evidence spans; 40 result rows recomputed from the traces"],
      ["warn", "1 reference quarantined: the DOI does not exist"],
      ["bad", "Results 4.4 blocked: no entry year, so no claim across cohorts"],
    ],
    own: "I own this research, and its data may be used for writing",
    opts: [
      ["go", "Start from this record", "Use this record and nothing else.", 1],
      [
        "hold",
        "Hold until the entry year is added",
        "The run becomes BLOCKED. Nothing is written until the data names each student’s entry year.",
        0,
      ],
    ],
    cta: "Start",
  },
  G1: {
    kind: "gate",
    n: "G1",
    title: "Lock the claims and freeze the graph?",
    why: "Once frozen, any sentence that says more than these claims is caught by the read-back and sent back.",
    rec: [
      "The Orchestrator recommends locking all four",
      81,
      "Every claim is IN under ASPIC+ now that the interval is recomputed by course; all 12 numbers match; both reconstructed warrants carry their qualifiers.",
    ],
    sum: [
      ["ok", "F1, F2, F3 and the Conclusion are IN"],
      ["ok", "The gap is IN; its search strategy is the backing"],
      ["warn", "H2 and H4 are OUT: F2 and F3 are preferred over them, as the evidence"],
      ["bad", "The implication for other polytechnics was removed: it had no premise"],
    ],
    pick: true,
    opts: [
      ["lock", "Lock these claims", "Freeze graph v1. Writing starts from it.", 1],
      [
        "back",
        "Send claims back",
        "Unticked claims (or all, if every box is ticked) return to S03 and are argued again. Uses 1 of 3 retries.",
        0,
      ],
    ],
    cta: "Lock and freeze",
  },
  G2: {
    kind: "gate",
    n: "G2",
    title: "How strongly should the findings be worded?",
    why: "The Discussion is written with the words you choose here, and the read-back holds the text to them.",
    rec: [
      "The Orchestrator recommends “indicate”",
      84,
      "The claim ceiling from the data report allows at most “indicate”: one institution. For Finding 3 the test could miss gains below about 0.06, so “no gain” would overstate it.",
    ],
    words: [
      [
        "f1",
        "Finding 1",
        "These results {w} that first-semester results find more of the students who drop out.",
        ["suggest", "indicate", "show"],
        1,
      ],
      [
        "f2",
        "Finding 2",
        "These results {w} that the gain does not depend on admission grade.",
        ["suggest", "indicate", "show"],
        1,
      ],
      ["f3", "Finding 3", "Because we find {w} from boosting on enrolment data…", ["no clear gain", "no gain"], 0],
    ],
    opts: [
      ["use", "Use this wording", "The Discussion is written next.", 1],
      ["back", "Send Results back for re-analysis", "Section 4, both tables and Figure 2 are erased and rewritten.", 0],
    ],
    cta: "Use this wording",
  },
  G3: {
    kind: "gate",
    n: "G3",
    title: "Sign the manuscript?",
    why: "Signing makes the paper submission-ready. ASW never submits it; you do, when you choose.",
    rec: [
      "The Orchestrator recommends signing",
      90,
      "All claims still match after revision. The new analysis answers the caveat on Finding 1 about students who stopped attending; no locked claim moved.",
    ],
    checks: [
      "I accept the new analysis in 4.1: without students who sat no evaluation the gain is 0.122 (row 41)",
      "I have read the final text and the AI-use statement",
    ],
    opts: [
      ["sign", "Sign", "The package is built and export unlocks.", 1],
      ["hold", "Do not sign yet", "Nothing is marked submission-ready. Export stays locked.", 0],
    ],
    cta: "Sign manuscript",
  },
  K01: {
    kind: "check",
    title: "A5 was not in the plan. Keep it exploratory?",
    why: "A5 (flagged dropouts with no first-semester evaluation, row 27) has no pre-registered hypothesis. Labelled exploratory, it can never be written as a finding.",
    rec: [
      "Keep it exploratory",
      90,
      "It is useful as a caveat on Finding 1, and the record says plainly that it came after the plan.",
    ],
    opts: [
      [
        "x",
        "Keep A5 as exploratory",
        "It may be named as an exploratory note or a ground in the debate, never as a finding.",
        1,
      ],
      ["drop", "Leave A5 out of the paper", "It stays in the record but is never written or argued from.", 0],
    ],
  },
  K03: {
    kind: "check",
    title: "What is Finding 3?",
    why: "A finding and a limitation are written in different places with different strength.",
    rec: [
      "A finding, inconclusive",
      86,
      "It answers H4 directly. A null result is still a result and belongs in Results with its interval.",
    ],
    opts: [
      ["f", "A finding with an inconclusive result", "Stays in Results 4.3 with its interval.", 1],
      [
        "l",
        "A limitation",
        "It moves to Limits and Results 4.3 is not written. H4 would get no answer in the paper.",
        0,
      ],
    ],
  },
  K04: {
    kind: "check",
    title: "The Conclusion is deadlocked. How should it stand?",
    why: "Three rounds on whether one polytechnic stands for students in general ended with no answer from the record. The Judge cannot rule, so you decide.",
    rec: [
      "Narrow it to what the sample covers",
      84,
      "The warrant holds only for entrants to this polytechnic over the years in the record. Narrowing the qualifier meets the Scope critic’s challenge instead of arguing past it.",
    ],
    opts: [
      [
        "q",
        "Narrow it to “entrants to this polytechnic, 2008/09–2018/19”",
        "The claim is restated; the critic concedes and the Judge closes the thread.",
        1,
      ],
      ["r", "Drop the reconstructed warrant", "The Conclusion loses its support and is restated at S03.", 0],
    ],
  },
  K08: {
    kind: "check",
    title: "Approve the journal contract",
    why: "The page is shaped by this contract. Publisher rules always win over habits from the profile.",
    rec: [
      "Approve",
      92,
      "The structured abstract is a rule, so it overrides the one-paragraph habit. Every statement type has a place; the sentence rules match the profile.",
    ],
    opts: [
      [
        "ok",
        "Approve Education Data Journal with JFE-EDJ-v2",
        "Structured abstract (rule) instead of the one-paragraph habit.",
        1,
      ],
      [
        "other",
        "Choose another journal",
        "S08 restarts with the new journal. Nothing has been written yet, so nothing else is lost.",
        0,
      ],
    ],
  },
  K09: {
    kind: "check",
    title: "Approve the storyline?",
    why: "This fixes which section carries which statement. Writers cannot move claims between sections later.",
    rec: [
      "Approve",
      89,
      "Question, method and results line up, and every frozen statement has a home. Figure 4 is left out because it has no data.",
    ],
    opts: [
      ["ok", "Approve the storyline and section allocation", "Paragraph contracts are written next.", 1],
      [
        "re",
        "Ask for a different storyline",
        "The Planner proposes another order, for example Finding 3 first. Paragraph planning waits.",
        0,
      ],
    ],
  },
  K12: {
    kind: "check",
    title: "Results 4.1 says more than Finding 1. Which wording?",
    why: "This changes what the paper claims, so the Reverse Verifier cannot fix it alone.",
    rec: [
      "Narrow it to the locked claim",
      91,
      "Finding 1 compares GB-ES1 with GB-E only. The frozen graph has no claim comparing it with logistic regression.",
    ],
    opts: [
      ["n", "Narrow it to the locked claim", "“…than the same model without them.”", 1],
      [
        "k",
        "Keep “any model built on enrolment data”",
        "Needs a new claim against logistic regression: back to S03, a new debate thread and stop 2 again.",
        0,
      ],
    ],
  },
  K14: {
    kind: "check",
    title: "Two reviewers disagree. Whose advice do you take?",
    why: "Comment 1 asks to rerun A1 without students who sat no first-semester evaluation; comment 3 says the line already in Limits is enough. Both reports are kept either way.",
    rec: [
      "Rerun without those students",
      78,
      "It is the stricter test. If Finding 1 survives it, the caveat is answered instead of only named; the change is shown to you before signing.",
    ],
    opts: [
      [
        "m",
        "Method reviewer: rerun without those students",
        "Code check reruns A1 at S15. A sentence may be added to 4.1.",
        1,
      ],
      ["e", "Evidence reviewer: keep the line in Limits", "No rerun. The caveat stays in 5.2 as written.", 0],
    ],
  },
};

/* one plain sentence per stage, shown under its title */
export const ONE: Record<string, string> = {
  S00: "Every part of the run's output is checked against the locked plan before anyone writes from it.",
  S01: "The record is laid into one standard frame, and the frame says what the paper may claim.",
  S02: "Each number and quote the paper may use is listed and recomputed. Gaps stay gaps.",
  S03: "Each statement is labelled: gap, question, hypothesis, finding, conclusion or limit.",
  S04: "Each claim is argued: four critics challenge it from the record, and a judge rules.",
  S05: "Each claim is drawn in six parts, every part tied to the ruling it came from.",
  S06: "Claims, evidence and conflicts are joined into one graph of what supports what.",
  S07: "Each claim is labelled IN, OUT or undecided; only claims that are IN may be written.",
  S08: "The journal’s rules and habits meet the frozen claims and become a writing contract.",
  S09: "The frozen claims are laid out as a story, section by section.",
  S10: "Every paragraph gets a written brief: its job, its evidence and its order.",
  S11: "Writers fill the briefs. Numbers come from the evidence list, never from memory.",
  S12: "The draft is read back and compared with what you locked.",
  S13: "Style is tuned to the journal without changing what any sentence means.",
  S14: "Three reviewers read separately; you settle where they disagree.",
  S15: "Only the sentences the reviews touched are changed, then checked again.",
  S16: "Nothing is ever submitted for you; export unlocks only after you sign.",
};

/* four blocks: data, argue, write, verify */
export const BLOCKS: BlockDef[] = [
  {
    k: "data",
    n: "Data",
    t: "Take in the record",
    x: "The research record is checked, laid into the standard data report and turned into an evidence ledger.",
    from: "S00",
    to: "S02",
  },
  {
    k: "argue",
    n: "Argue",
    t: "Argue and lock the claims",
    x: "Every statement is labelled, argued by agents with a judge, drawn as Toulmin and AIF, evaluated and locked.",
    from: "S03",
    to: "S07",
  },
  {
    k: "write",
    n: "Write",
    t: "Write from the locked claims",
    x: "The claims meet the journal profile; the paper is laid out, written and read back.",
    from: "S08",
    to: "S12",
  },
  {
    k: "verify",
    n: "Verify",
    t: "Verify and sign",
    x: "Journal fit, three reviewers and a targeted revision. Nothing is ready until you sign.",
    from: "S13",
    to: "S16",
  },
];
export const blockOfStage = (sid: string) => BLOCKS.findIndex((b) => sid >= b.from && sid <= b.to);

/* what each stage builds on, and what it writes (made when its step finishes) */
export const LINEAGE: Record<string, { reads: string[]; writes: [string, string][] }> = {
  S00: {
    reads: ["Research run RUN-25CD"],
    writes: [
      ["Intake checks", "a3"],
      ["Limits on the paper", "a4"],
    ],
  },
  S01: {
    reads: ["Checked run output"],
    writes: [
      ["Data report", "r1"],
      ["Link chain", "r3"],
      ["Claim ceiling", "r5"],
    ],
  },
  S02: {
    reads: ["Data report", "Traces"],
    writes: [
      ["Evidence ledger", "b2"],
      ["Readiness report", "b4"],
    ],
  },
  S03: {
    reads: ["Data report", "Evidence ledger"],
    writes: [
      ["Statement registry", "d3"],
      ["Lifecycle links", "d4"],
    ],
  },
  S04: {
    reads: ["Statement registry", "Evidence ledger", "Data report"],
    writes: [
      ["Debate record", "v5"],
      ["Rulings", "v6"],
    ],
  },
  S05: { reads: ["Rulings"], writes: [["Toulmin cards", "e3"]] },
  S06: {
    reads: ["Toulmin cards", "Evidence ledger"],
    writes: [
      ["Argument graph", "f3"],
      ["Evidence links", "f5"],
    ],
  },
  S07: {
    reads: ["Argument graph", "Traces"],
    writes: [
      ["ASPIC+ labels", "g4"],
      ["Frozen graph v1", "G1"],
    ],
  },
  S08: {
    reads: ["Frozen graph v1", "JFE-EDJ-v2"],
    writes: [
      ["Placement map", "c3"],
      ["Journal contract", "c5"],
      ["Page shape", "c6"],
    ],
  },
  S09: {
    reads: ["Frozen graph v1", "Journal contract"],
    writes: [
      ["Outline", "h2"],
      ["Section contracts", "h4"],
    ],
  },
  S10: { reads: ["Outline", "JFE recipes"], writes: [["Paragraph contracts", "i2"]] },
  S11: {
    reads: ["Paragraph contracts", "Evidence ledger"],
    writes: [
      ["Draft 1", "j6"],
      ["Sentence provenance", "j2"],
    ],
  },
  S12: {
    reads: ["Draft 1", "Frozen graph v1"],
    writes: [
      ["Graph delta", "k2"],
      ["Verified draft", "K12"],
    ],
  },
  S13: {
    reads: ["Verified draft", "JFE bands"],
    writes: [
      ["Journal fit report", "l1"],
      ["Adapted draft", "l5"],
    ],
  },
  S14: {
    reads: ["Adapted draft"],
    writes: [
      ["Reviewer reports", "m1"],
      ["Issue backlog", "m4"],
    ],
  },
  S15: {
    reads: ["Issue backlog", "Draft 1"],
    writes: [
      ["Draft 2", "n5"],
      ["Change log", "n3"],
    ],
  },
  S16: {
    reads: ["Draft 2"],
    writes: [
      ["Approval record", "o4"],
      ["Submission package", "G3"],
    ],
  },
};

/* the rules ASW never bends (aside) */
export const ASW_RULES: [string, string][] = [
  ["Nothing is written before the claims are locked", "The paper first appears after stop 2."],
  ["Every number comes from the traces", "Writers copy values from the ledger; they never type them from memory."],
  ["Missing evidence stays missing", "A paragraph without evidence is marked Needs evidence, never filled in."],
  ["A hypothesis is never written as a finding", "Each statement keeps its type and its epistemic status."],
  [
    "Every challenge needs a ground in the record",
    "A critic without a ground is struck; an answer without one is rejected.",
  ],
  ["Only claims that are IN are written as claims", "ASPIC+ decides; OUT claims become limits or future work."],
  ["Style never changes meaning", "Any edit that moves a claim is reverted."],
  ["ASW never signs or submits", "Only you approve the stops and send the paper."],
];

/* SmartPause modes: stops always stop; quick checks stop only in Co-pilot */
export const REVIEW_MODES: Record<string, { n: string; x: string }> = {
  copilot: { n: "Co-pilot", x: "Stops at the 4 gates and the 7 quick checks" },
  gates: { n: "Gates only", x: "Stops at the 4 gates; quick checks take the recommendation" },
};

/* ---------- the shared argument map (S03–S07, then S12) ---------- */
export const MN: Record<string, MapNode> = {
  GAP: {
    ty: "GAP",
    lane: "q",
    t: "Gap",
    s: "No locked, leakage-checked test",
    sp: "SP-01",
    st: ["ESTABLISHED", "ok"],
    x: 10,
    y: 184,
    w: 140,
    h: 76,
  },
  RQ: {
    ty: "RQ",
    lane: "q",
    t: "Question",
    s: "Does semester 1 add to enrolment?",
    sp: "SP-02",
    st: ["APPROVED", "ok"],
    ctx: 1,
    x: 10,
    y: 316,
    w: 140,
    h: 76,
  },
  OBJ: {
    ty: "OBJECTIVE",
    lane: "q",
    t: "Objective",
    s: "Recall at 20% flagged, 5 splits",
    sp: "SP-03",
    st: ["APPROVED", "ok"],
    ctx: 1,
    x: 10,
    y: 448,
    w: 140,
    h: 76,
  },
  H1: {
    ty: "HYPOTHESIS",
    lane: "h",
    t: "H1",
    s: "Semester 1 raises recall",
    sp: "SP-04",
    st: ["TESTED", "info"],
    x: 178,
    y: 184,
    w: 140,
    h: 76,
  },
  H2: {
    ty: "HYPOTHESIS",
    lane: "h",
    t: "H2",
    s: "Gain larger below median",
    sp: "SP-05",
    st: ["TESTED", "info"],
    x: 178,
    y: 316,
    w: 140,
    h: 76,
  },
  H4: {
    ty: "HYPOTHESIS",
    lane: "h",
    t: "H4",
    s: "Boosting beats LR",
    sp: "SP-06",
    st: ["TESTED", "info"],
    x: 178,
    y: 448,
    w: 140,
    h: 76,
  },
  F1: {
    ty: "FINDING",
    lane: "f",
    t: "Finding 1",
    s: "Semester 1 finds more dropouts",
    sp: "SP-08",
    st: ["SUPPORTED", "ok"],
    claim: "F1",
    x: 544,
    y: 184,
    w: 140,
    h: 76,
  },
  F2: {
    ty: "FINDING",
    lane: "f",
    t: "Finding 2",
    s: "Gain in both admission groups",
    sp: "SP-09",
    st: ["SUPPORTED", "ok"],
    claim: "F2",
    x: 544,
    y: 316,
    w: 140,
    h: 76,
  },
  F3: {
    ty: "FINDING",
    lane: "f",
    t: "Finding 3",
    s: "No clear gain from boosting",
    sp: "SP-10",
    st: ["INCONCLUSIVE", "warn"],
    claim: "F3",
    x: 544,
    y: 448,
    w: 140,
    h: 76,
  },
  C: {
    ty: "CONCLUSION",
    lane: "c",
    t: "Conclusion",
    s: "Better basis for early warning",
    s2: "Better basis, this polytechnic",
    s3: "Overall yes; by course, mixed",
    sp: "SP-11",
    st: ["BOUNDED", "vio"],
    claim: "C",
    x: 742,
    y: 250,
    w: 140,
    h: 76,
  },
  IMP: {
    ty: "IMPLICATION",
    lane: "i",
    t: "Implication",
    s: "Advisers contact the flagged fifth",
    sp: "SP-12",
    st: ["PROPOSED", "info"],
    x: 940,
    y: 184,
    w: 140,
    h: 76,
  },
  X: {
    ty: "IMPLICATION",
    lane: "i",
    t: "Implication",
    s: "Use at other polytechnics",
    sp: "SP-13",
    st: ["BLOCKED", "bad"],
    blk: 1,
    x: 940,
    y: 350,
    w: 140,
    h: 76,
  },
  ASM: {
    ty: "ASSUMPTION",
    lane: "top",
    t: "Assumption",
    s: "Students are independent",
    sp: "SP-07",
    st: ["ASSUMED", "vio"],
    x: 10,
    y: 26,
    w: 140,
    h: 76,
  },
  L1: {
    ty: "LIMITATION",
    lane: "top",
    t: "Caveat",
    s: "Students share courses, cohorts",
    sp: "SP-15",
    st: ["BOUNDS F1", "vio"],
    x: 544,
    y: 26,
    w: 140,
    h: 76,
  },
  L2: {
    ty: "LIMITATION",
    lane: "top",
    t: "Caveat",
    s: "One polytechnic, 11 cohorts",
    sp: "SP-14",
    st: ["BOUNDS C", "vio"],
    x: 742,
    y: 26,
    w: 140,
    h: 76,
  },
  L3: {
    ty: "LIMITATION",
    lane: "top",
    t: "Limit",
    s: "22% had no evaluation",
    sp: "SP-16",
    st: ["BOUNDS IMP", "vio"],
    x: 940,
    y: 26,
    w: 140,
    h: 76,
  },
  /* docked in from the evidence ledger and the cards */
  E1: {
    ty: "EVIDENCE",
    lane: "h",
    t: "Rows 11–15, 21",
    s: "0.507 vs 0.396",
    ev: 1,
    src: "results.csv rows 6–15, 21",
    num: "0.111",
    x: 346,
    y: 184,
    w: 140,
    h: 76,
  },
  E2: {
    ty: "EVIDENCE",
    lane: "h",
    t: "Rows 39–40",
    s: "0.098 and 0.129",
    ev: 1,
    src: "results.csv rows 22, 39–40",
    num: "0.098",
    x: 346,
    y: 316,
    w: 140,
    h: 76,
  },
  E3: {
    ty: "EVIDENCE",
    lane: "h",
    t: "Row 23",
    s: "CI −0.007 to 0.021",
    ev: 1,
    src: "results.csv row 23",
    num: "0.004",
    x: 346,
    y: 448,
    w: 140,
    h: 76,
  },
  W1: {
    ty: "WARRANT",
    lane: "top",
    t: "Warrant",
    s: "Same students, splits, flag rate",
    ev: 1,
    src: "plan.md §5",
    x: 346,
    y: 26,
    w: 140,
    h: 76,
  },
  /* only in scenario U8: the counterexample the Scope critic brings from A4 */
  CX: {
    ty: "BACKGROUND",
    lane: "c",
    t: "Counterexample",
    s: "Course 171: no dropout flagged",
    sp: "G.2",
    src: "results.csv row 28 · A4",
    ev: 1,
    x: 742,
    y: 448,
    w: 140,
    h: 76,
  },
};
export const CONF_K: Record<string, [number, string]> = {
  F1: [82, "strong"],
  F2: [68, "moderate"],
  F3: [34, "weak · null"],
  C: [58, "bounded"],
};
/* S12: what the draft's rebuilt map says differently */
export const DELTA: DeltaDef[] = [
  { n: "F1", k: "weak", t: "Widened", x: "“…than any model built on enrolment data”", w: "4.1" },
  { n: "L3", k: "miss", t: "Caveat left out", x: "“some had stopped attending”", w: "5.2" },
  { n: "F3", k: "ok", t: "Match", x: "", w: "4.3" },
  { n: "C", k: "ok", t: "Match", x: "", w: "5.1" },
  { n: "GAP", k: "cite", t: "Citation drift", x: "cites [13], ledger says [1]", w: "2.1" },
];

/* ---------- small helpers ---------- */
export const HEX = "0123456789abcdef";
export const fakeHash = (k: number) =>
  Array.from({ length: 12 }, (_, j) => HEX[(k * 7 + j * 13 + k * j * 3) % 16]).join("");
export const BADDOI = "10.1016/j.compedu.2023.904817";
