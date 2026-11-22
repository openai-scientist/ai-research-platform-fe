export interface ScenarioDef {
  code: string;
  t: string;
  stage: string;
  kind: string;
  x: string;
}
/* ===== the incidents a run can raise: what kind each is, and where it breaks ===== */

/* How the run responds to an incident. */
export const CASE_KIND: Record<string, { label: string; c: string; icon: string }> = {
  stop: { label: "Stops the run", c: "bg-rose-600 text-white", icon: "ban" },
  block: { label: "Blocks", c: "bg-rose-500/12 text-rose-700 dark:text-rose-300", icon: "lock" },
  route: { label: "Sends back", c: "bg-amber-500/15 text-amber-800 dark:text-amber-300", icon: "undo" },
  degrade: { label: "Continues, limited", c: "bg-amber-500/15 text-amber-800 dark:text-amber-300", icon: "alert" },
  ask: { label: "Asks you", c: "bg-sky-500/12 text-sky-700 dark:text-sky-300", icon: "flag" },
  auto: { label: "Fixed by itself", c: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300", icon: "check" },
  escalate: { label: "Escalates", c: "bg-rose-500/12 text-rose-700 dark:text-rose-300", icon: "alert" },
};

/* The incidents the preview can play, from the development hooks only. Each restarts the run with one thing wrong and
   skips to where it breaks. */
export const SCN: Record<string, ScenarioDef> = {
  own: {
    code: "U1",
    t: "The record has no owner",
    stage: "S00",
    kind: "stop",
    x: "run.json names no owner. ASW cannot write from research nobody owns, so the run stops.",
  },
  schema: {
    code: "U2",
    t: "A must part is missing",
    stage: "S00",
    kind: "block",
    x: "The package's protocol has no analysis plan. The run is blocked until the package is rebuilt.",
  },
  late: {
    code: "U3",
    t: "The plan was locked after the runs",
    stage: "S01",
    kind: "degrade",
    x: "The protocol was locked 12 hours after the first run. Every analysis becomes exploratory.",
  },
  orphan: {
    code: "U4",
    t: "A primary hypothesis has no result",
    stage: "S01",
    kind: "block",
    x: "H3 is primary in the plan, but no analysis or result exists for it.",
  },
  dev: {
    code: "U5",
    t: "A deviation was not declared",
    stage: "S01",
    kind: "block",
    x: "run_all.py ran 1,000 bootstrap resamples; the plan said 10,000; the package declares no deviation.",
  },
  tune: {
    code: "U6",
    t: "A setting was tuned on the test split",
    stage: "S01",
    kind: "block",
    x: "The boosting grid point was picked by its score on the test students.",
  },
  drift: {
    code: "U7",
    t: "A number does not match its trace",
    stage: "S02",
    kind: "block",
    x: "Comparison A1 says the gain is 0.118; the traces give 0.111.",
  },
  cout: {
    code: "U8",
    t: "A claim ends undecided after the debate",
    stage: "S07",
    kind: "route",
    x: "A counterexample from the literature is upheld against the Conclusion; ASPIC+ leaves it undecided.",
  },
  nojfe: {
    code: "U9",
    t: "The journal profile cannot be built",
    stage: "S08",
    kind: "degrade",
    x: "Too few of the journal’s papers pass the profile’s filters. ASW writes with the publisher’s rules only.",
  },
  cap: {
    code: "U10",
    t: "Revision hits its three-round cap",
    stage: "S15",
    kind: "escalate",
    x: "Three patches to 4.1 each fail the read-back. The run escalates to you.",
  },
};
