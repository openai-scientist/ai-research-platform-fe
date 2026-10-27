/* ===== The standard report frame for data science on tabular data, and the rules that read a record against it =====
   The frame is the same for every study. A record (see records/) fills it: a value per field and a few facts about
   the study's design. The status of each field and the claim ceiling are never typed in by hand; checkRecord derives
   them from the frame's rules, so two studies of the same kind are held to the same standard. */

export type Level = "must" | "should" | "may";
export interface FrameField {
  id: string;
  label: string;
  level: Level;
  /** the checklist items that ask for it */
  std: string[];
  /** what the field becomes in the paper */
  to: string;
  /** only a study with results can fill it; in a proposal it does not apply */
  results?: true;
  /** only a predictive model has it; a descriptive or explanatory study may mark it not applicable */
  predictive?: true;
  /** may be not applicable in any study, with a reason */
  naOk?: true;
}
export interface FramePart {
  p: string;
  n: string;
  fields: FrameField[];
}

/* The standards a field can be asked for by. Each chip in the frame names one. */
export const STANDARDS: Record<string, { n: string; x: string }> = {
  RF: {
    n: "REFORMS",
    x: "Reporting standards for ML-based science: study goals, reproducibility, data quality, preprocessing, modelling, leakage, metrics, generalisability",
  },
  SD: {
    n: "Secondary-data prereg",
    x: "Pre-registration of analyses of existing data: data, variables, prior knowledge of the data, analyses",
  },
  NI: { n: "NeurIPS checklist", x: "Claims, limitations, reproducibility, significance, compute, licences, LLM use" },
  DS: { n: "Datasheets for Datasets", x: "What a dataset contains, how it was collected and what it may be used for" },
  PR: { n: "PRISMA 2020", x: "Information sources and search strategy" },
  CON: { n: "CONSORT 2010", x: "Changes to methods and outcomes after the study began" },
  RRP: { n: "rrp/v2", x: "The ASW record contract for data science" },
};

const F = (
  id: string,
  label: string,
  level: Level,
  std: string[],
  to: string,
  flags: Partial<Pick<FrameField, "results" | "predictive" | "naOk">> = {},
): FrameField => ({ id, label, level, std, to, ...flags });

/* 14 parts, 51 fields */
export const FRAME: FramePart[] = [
  {
    p: "A",
    n: "Manifest",
    fields: [
      F("A.1", "Owner and team", "must", ["RRP"], "Governance · stop 1"),
      F("A.2", "Licence of the record", "must", ["NI 12"], "Governance"),
      F("A.3", "Contract and file hashes", "must", ["RRP"], "Governance"),
    ],
  },
  {
    p: "B",
    n: "Plan, locked before the runs",
    fields: [
      F("B.1", "Background sources", "should", [], "BACKGROUND"),
      F("B.2", "Gap and its search strategy", "must", ["PR 6–7"], "GAP"),
      F("B.3", "Research question and objective", "must", ["SD Q3"], "RQ · OBJECTIVE"),
      F("B.4", "Hypotheses, direction and priority", "must", ["SD Q4"], "HYPOTHESIS"),
      F("B.5", "Population the claims are about", "must", ["RF 1a–1b"], "Scope of every claim"),
      F("B.6", "Why a model, and the kind of claim", "must", ["RF 1c"], "Claim ceiling"),
      F("B.7", "Measure", "must", ["SD Q12"], "WARRANT"),
      F("B.8", "Conditions compared", "must", ["SD Q11"], "METHOD"),
      F("B.9", "Analysis plan", "must", ["SD Q19", "SD Q22", "NI 7"], "METHOD"),
      F("B.10", "Exclusion rule", "must", ["SD Q13", "RF 4a"], "METHOD"),
      F("B.11", "Sample size and power", "should", ["SD Q20–21"], "Qualifier for null results"),
      F("B.12", "Assumptions", "should", ["NI 2", "SD Q23"], "ASSUMPTION"),
      F("B.13", "What the team knew of the data before the lock", "must", ["SD Q17–18"], "Confirmatory status"),
    ],
  },
  {
    p: "C",
    n: "Data",
    fields: [
      F("C.1", "Dataset, version, splits, clusters", "must", ["RF 2a", "SD Q5–7"], "Scope of every claim"),
      F("C.2", "Source and how it was collected", "must", ["RF 3a", "SD Q9–10", "DS Collection"], "METHOD"),
      F(
        "C.3",
        "Sampling frame, and why it stands for the population",
        "must",
        ["RF 3b–3c", "RF 3g"],
        "Scope · LIMITATION",
      ),
      F("C.4", "Outcome: definition and distribution", "must", ["RF 3d–3e"], "WARRANT"),
      F("C.5", "Missing, impossible or corrupt values", "must", ["RF 3f", "RF 4b", "SD Q14–15"], "METHOD"),
      F("C.6", "Every step from raw data to model input", "must", ["RF 4c"], "METHOD"),
      F("C.7", "Personal or sensitive data", "must", ["DS Composition"], "—"),
      F("C.8", "Data made by people", "must", ["NI 14–15"], "—", { naOk: true }),
    ],
  },
  {
    p: "D",
    n: "Models and setup",
    fields: [
      F("D.1", "Models and baselines, and why these", "must", ["RF 5a–5b", "RF 5f"], "METHOD"),
      F("D.2", "How the models are evaluated", "must", ["RF 5c"], "METHOD", { predictive: true }),
      F("D.3", "Hyperparameters, and how the reported model was chosen", "must", ["RF 5d–5e", "NI 6"], "METHOD", {
        predictive: true,
      }),
      F("D.4", "Seeds and runs", "should", ["NI 7"], "Qualifier"),
      F("D.5", "Compute and time per run", "should", ["RF 2c", "NI 8"], "Qualifier"),
      F(
        "D.6",
        "Code and a script that reproduces the results",
        "must",
        ["RF 2b", "RF 2d–2e", "NI 5"],
        "Reproducibility statement",
      ),
    ],
  },
  {
    p: "E",
    n: "Data leakage",
    fields: [
      F("E.1", "Only training data shapes the model", "must", ["RF 6a"], "METHOD", { predictive: true }),
      F("E.2", "Dependencies and duplicates across units", "must", ["RF 6b"], "Qualifier · LIMITATION"),
      F("E.3", "Every input is fair for the task", "must", ["RF 6c"], "METHOD", { predictive: true }),
    ],
  },
  {
    p: "F",
    n: "Runs and results",
    fields: [
      F("F.1", "A trace per run", "must", ["NI 4"], "Recomputation", { results: true }),
      F("F.2", "Machine-readable results", "must", ["NI 4"], "FINDING · evidence", { results: true }),
    ],
  },
  {
    p: "G",
    n: "Analyses",
    fields: [
      F("G.1", "Confirmatory analyses", "must", ["SD Q19"], "FINDING", { results: true }),
      F("G.2", "Exploratory analyses", "must", ["SD Q25"], "Exploratory note only", { results: true }),
      F("G.3", "Metrics, and why they fit the task", "must", ["RF 7a"], "WARRANT"),
      F("G.4", "Uncertainty and statistical tests", "must", ["RF 7b–7c", "NI 7"], "Qualifier", { results: true }),
    ],
  },
  {
    p: "H",
    n: "Deviations",
    fields: [F("H.1", "Deviations from the plan", "must", ["CON 3b", "CON 6b"], "Rebuttal · scope", { results: true })],
  },
  {
    p: "I",
    n: "Interpretation",
    fields: [
      F("I.1", "Observations kept apart from readings", "should", [], "Debate grounds", { results: true }),
      F("I.2", "Proposed conclusion and implications", "should", [], "CONCLUSION · IMPLICATION", { results: true }),
    ],
  },
  {
    p: "J",
    n: "Known limits",
    fields: [
      F("J.1", "Limitations and threats", "must", ["NI 2"], "LIMITATION"),
      F("J.2", "Where the findings should and should not hold", "must", ["RF 8a–8b"], "Scope · LIMITATION"),
      F("J.3", "Risks and wider impact", "should", ["NI 10"], "Impact statement"),
    ],
  },
  {
    p: "K",
    n: "Literature",
    fields: [
      F("K.1", "Bibliography with identifiers", "must", ["NI 12"], "Citations"),
      F("K.2", "Reading notes with spans", "should", [], "BACKGROUND · debate grounds"),
      F("K.3", "Permission per source", "must", ["NI 12"], "Cite-only limit"),
    ],
  },
  {
    p: "L",
    n: "Figures and tables",
    fields: [F("L.1", "Data behind each figure", "must", ["RRP"], "Figures", { results: true })],
  },
  {
    p: "M",
    n: "Writing target",
    fields: [F("M.1", "Journal and article type", "may", [], "Journal merge, S08")],
  },
  {
    p: "N",
    n: "AI use",
    fields: [F("N.1", "How AI was used in the research", "must", ["NI 16"], "AI-use statement, S16")],
  },
];
export const FRAME_FIELDS = FRAME.flatMap((part) => part.fields.map((f) => ({ ...f, part: part.p })));
/** Fields only a paper with results can fill. In a proposal they do not apply rather than count as missing. */
export const RESULTS_ONLY = new Set(FRAME_FIELDS.filter((f) => f.results).map((f) => f.id));

/* ---------- a study, as the frame needs to know it ---------- */
export interface StudyProfile {
  /** what is predicted or estimated */
  task: "classification" | "regression" | "estimation";
  /** the strongest kind of claim the study sets out to make */
  claim: "predictive" | "descriptive" | "explanatory" | "causal";
  design: "observational" | "experiment";
  phase: "proposal" | "results";
  /** the data have an order in time that a model could exploit */
  time: boolean;
  /** units are nested in groups (students in courses, patients across visits); the group's name, or null */
  groups: string | null;
  /** how the test data are held out */
  split: "random" | "time" | "group" | "none";
  /** the unit an interval resamples */
  uncertainty: "unit" | "group";
  /** the family of the primary measure */
  metric: "ranking" | "classification" | "regression" | "estimate";
  /** whether the plan was locked before the outcome data were analysed */
  plan: "before" | "after";
  /** sites or datasets the findings were seen in */
  sites: number;
  tests: "intervals" | "p-values";
  /** declared deviations from the plan */
  deviations: number;
  /** sources the record may cite but not quote */
  citeOnly: number;
}
export interface StudyRecord {
  id: string;
  title: string;
  profile: StudyProfile;
  /** the value of each field, by id; a field the study cannot have is listed in na, with its reason as the value */
  values: Record<string, string>;
  na?: string[];
}

/* ---------- reading a record against the frame ---------- */
export type Status = "ok" | "warn" | "bad" | "na";
export interface Finding {
  field: string;
  status: "warn" | "bad";
  code: string;
  text: string;
}
export interface Ceiling {
  /** the strongest verb a finding may take; none in a proposal or a blocked record */
  strength: "none" | "suggest" | "indicate" | "show";
  causes: "never" | "allowed";
  significant: "never" | "with its test";
  confirmatory: boolean;
}
export interface CheckResult {
  status: Record<string, Status>;
  findings: Finding[];
  ceiling: Ceiling;
  /** a must field is missing or a rule is broken: no stage after S01 may start */
  blocked: boolean;
}

const METRIC_OF: Record<StudyProfile["task"], StudyProfile["metric"][]> = {
  classification: ["ranking", "classification"],
  regression: ["regression"],
  estimation: ["estimate"],
};

export function checkRecord(r: StudyRecord): CheckResult {
  const p = r.profile;
  const status: Record<string, Status> = {};
  const findings: Finding[] = [];
  const flag = (field: string, s: "warn" | "bad", code: string, text: string) => {
    findings.push({ field, status: s, code, text });
    if (status[field] !== "bad") status[field] = s;
  };
  const na = new Set(r.na ?? []);

  for (const f of FRAME_FIELDS) {
    const proposalOnly = f.results && p.phase === "proposal";
    const naAllowed = Boolean(f.naOk || proposalOnly || (f.predictive && p.claim !== "predictive"));
    const v = r.values[f.id]?.trim();
    if (proposalOnly && v && !na.has(f.id)) {
      flag(f.id, "bad", "results-in-proposal", "A proposal has no results; this field must stay empty.");
      continue;
    }
    if (na.has(f.id)) {
      if (naAllowed) status[f.id] = "na";
      else flag(f.id, "bad", "na-not-allowed", "This field applies to every study of this kind.");
      continue;
    }
    if (v) status[f.id] = "ok";
    else if (proposalOnly || f.level === "may") status[f.id] = "na";
    else if (f.level === "must") flag(f.id, "bad", "missing", "A must field is empty.");
    else flag(f.id, "warn", "missing-should", "A should field is empty.");
  }

  const applies = (id: string) => status[id] !== "na";
  if (p.time && p.claim === "predictive" && p.split !== "time" && applies("D.2"))
    flag(
      "D.2",
      "bad",
      "time-split",
      "The data are ordered in time, but the test set is not later than the training set.",
    );
  if (p.groups) {
    if (p.split !== "group" && p.uncertainty !== "group")
      flag(
        "E.2",
        "bad",
        "groups-ignored",
        `Units share a ${p.groups}, but neither the split nor the intervals respect it.`,
      );
    else if (p.claim === "predictive" && p.split !== "group")
      flag(
        "E.2",
        "warn",
        "groups-checked",
        `Units share a ${p.groups}; the split ignores it, the intervals resample by it.`,
      );
  }
  if (!METRIC_OF[p.task].includes(p.metric))
    flag("G.3", "bad", "metric-task", `A ${p.metric} measure does not fit a ${p.task} task.`);
  if (p.claim === "causal" && p.design !== "experiment")
    flag("B.6", "bad", "causal-claim", "A causal claim needs an experiment or a stated identification strategy.");
  if (p.plan === "after") {
    flag(
      "B.4",
      "warn",
      "plan-after-data",
      "The plan was locked after the data were analysed: nothing is confirmatory.",
    );
    flag("G.1", "warn", "plan-after-data", "Planned analyses become exploratory.");
  }
  if (p.deviations > 0) flag("H.1", "warn", "deviation", `${p.deviations} declared deviation(s) qualify the findings.`);
  if (p.citeOnly > 0) flag("K.3", "warn", "cite-only", `${p.citeOnly} source(s) may be cited but not quoted.`);

  const blocked = findings.some((x) => x.status === "bad");
  let strength: Ceiling["strength"] = p.sites > 1 ? "show" : "indicate";
  if (p.plan === "after") strength = "suggest";
  if (p.phase === "proposal" || blocked) strength = "none";
  return {
    status,
    findings,
    blocked,
    ceiling: {
      strength,
      causes: p.claim === "causal" && p.design === "experiment" ? "allowed" : "never",
      significant: p.tests === "p-values" ? "with its test" : "never",
      confirmatory: p.plan === "before" && p.phase === "results" && !blocked,
    },
  };
}
