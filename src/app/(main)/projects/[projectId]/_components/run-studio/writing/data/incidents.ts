import { CAP_TRIES } from "./core";

/** opts: [id, label, what it leads to, recommended, what the activity log says you did] */
export type IncidentOption = [string, string, string, number, string];
export interface IncidentDef {
  tone: string;
  title: string;
  text: string;
  det: [string, string];
  ev: { file: string; lines: string[]; hit: number[]; note?: string };
  does: string[];
  /** [from stage, back to (null when the run ends or goes on), what happens] */
  route: [string, string | null, string];
  opts: IncidentOption[];
}

/* ===== the unhappy cases as they happen: what was found, by whom, under which rule, and what each way out leads to ===== */
/* opts: [id, label, what it leads to, recommended, what the activity log says you did] */
export const INC: Record<string, IncidentDef> = {
  own: {
    tone: "rose",
    title: "The record has no owner",
    text: "run.json names nobody as owner. ASW cannot write from research nobody owns.",
    det: ["or", "No owner, no writing"],
    ev: {
      file: "run.json",
      lines: ['{ "contract": "rrp/v2",', '  "owner": null,', '  "team": 2, "licence": "CC BY 4.0" }'],
      hit: [1],
    },
    does: ["Stops before any other file is read", "Keeps only the intake log", "Nothing is argued, drafted or sent"],
    route: ["S00", null, "The run ends here"],
    opts: [
      [
        "restart",
        "Start over with run.json naming you as owner",
        "Replays the hand-off from the start, with the manifest fixed.",
        1,
        "Restarted with an owner in run.json.",
      ],
      ["end", "Leave the run stopped", "The run stays failed. The intake log is kept.", 0, "Left the run stopped."],
    ],
  },
  schema: {
    tone: "rose",
    title: "A must field is missing: B.9 analysis plan",
    text: "plan.md jumps from §6 to §8. Without an analysis plan, nothing can be called confirmatory.",
    det: ["code", "rrp/v2 schema · B.9 is must"],
    ev: {
      file: "plan.md",
      lines: ["## 5. Evaluation", "## 6. Measures and hypotheses", "## 8. Known limits", "locked: 2026-10-27T10:50Z"],
      hit: [2],
      note: "§7 Analyses expected between §6 and §8",
    },
    does: [
      "Blocks the run: no later stage may start",
      "Lists the field the contract expects",
      "Keeps every file already checked",
    ],
    route: ["S00", "S00", "The owner fixes plan.md, the schema runs again"],
    opts: [
      [
        "attach",
        "Attach plan.md with §7",
        "The owner uploads plan.md v2, locked on 27 Oct with the same hash chain. The schema check runs again.",
        1,
        "Asked the owner for plan.md with §7.",
      ],
      [
        "stop",
        "Stop the run",
        "The run ends as failed; the record must be completed outside ASW.",
        0,
        "Stopped the run over the missing analysis plan.",
      ],
    ],
  },
  late: {
    tone: "amber",
    title: "The plan was locked after the runs began",
    text: "plan.md was locked 12 hours after the first trace. Nothing in it can count as a prediction.",
    det: ["code", "Pre-registration · lock before analysis"],
    ev: {
      file: "plan.md · traces/",
      lines: [
        "traces/t01.jsonl   started 2026-10-27T10:51Z",
        "plan.md            locked  2026-10-27T22:40Z",
        "                   (11 h 49 min later)",
      ],
      hit: [1],
    },
    does: [
      "Labels every analysis exploratory",
      "Caps the wording of findings at “suggest”",
      "Adds a line to Limits saying so",
    ],
    route: ["S01", null, "Continues with a lower ceiling"],
    opts: [
      [
        "accept",
        "Continue with every analysis exploratory",
        "Findings may be worded at most “suggest”, and Limits says why.",
        1,
        "Accepted that every analysis is exploratory.",
      ],
      [
        "stop",
        "Stop and lock a plan before running again",
        "The run ends; the experiment is redone after a real pre-registration.",
        0,
        "Stopped the run to pre-register properly.",
      ],
    ],
  },
  orphan: {
    tone: "rose",
    title: "A primary hypothesis has no result",
    text: "H3 is primary in the plan, but no analysis and no result row exists for it. Leaving it out silently is selective reporting.",
    det: ["ds", "Every pre-registered hypothesis is reported"],
    ev: {
      file: "hypotheses.json · analysis.json",
      lines: [
        '{ "id": "H3", "priority": "primary",',
        '  "status": "tested" }',
        "analysis.json: no entry with h = H3",
        "results.csv: no rows for H3",
      ],
      hit: [0, 2, 3],
    },
    does: [
      "Blocks the data report",
      "Keeps H3 in the registry as tested, with no result",
      "Asks how H3 is to be reported",
    ],
    route: ["S01", "S01", "H3 is reported either way"],
    opts: [
      [
        "name",
        "Report H3 as not tested, and say why",
        "Limits says H3 was planned as primary but not run. Reviewers will see it.",
        1,
        "Named H3 as planned but not run.",
      ],
      [
        "wait",
        "Hold until the owner adds H3’s result",
        "The run is blocked until rows for H3 arrive; they are checked like every other row.",
        0,
        "Held the run for H3’s result.",
      ],
    ],
  },
  dev: {
    tone: "rose",
    title: "A deviation was not declared",
    text: "run_all.py ran 1,000 bootstrap resamples. The plan says 10,000, and deviations.md is silent.",
    det: ["code", "CONSORT 3b · every change is declared"],
    ev: {
      file: "run_all.py · plan.md §7",
      lines: [
        "bootstrap:",
        "  resamples: 1000        # run_all.py",
        "  resamples: 10000       # plan.md §7",
        "deviations.md: D1 only",
      ],
      hit: [1, 3],
    },
    does: [
      "Blocks every interval until plan and run agree",
      "Recomputing is possible: the traces are complete",
      "Nothing is declared for you",
    ],
    route: ["S01", "S01", "Rerun as planned, or declare D2"],
    opts: [
      [
        "rerun",
        "Rerun the bootstrap with 10,000 resamples",
        "Code check reruns it from the traces; intervals may move in the third decimal.",
        1,
        "Had the bootstrap rerun with 10,000 resamples.",
      ],
      [
        "declare",
        "Declare it as deviation D2",
        "D2 is added to the record; every interval carries a note on its precision.",
        0,
        "Declared the bootstrap as deviation D2.",
      ],
    ],
  },
  tune: {
    tone: "rose",
    title: "A setting was tuned on the test split",
    text: "The boosting grid point was picked from the 8 in the plan by its score on the test students.",
    det: ["code", "REFORMS 6a · never tune on test"],
    ev: {
      file: "run_all.py · traces/sweep.jsonl",
      lines: [
        "boosting:",
        "  learning_rate: 0.05, max_leaf_nodes: 15",
        "  chosen_by: test.recall_at_20   # sweep over 8 grid points",
      ],
      hit: [2],
    },
    does: [
      "Blocks every claim that uses gradient boosting",
      "The training part is still there, so the choice can be redone",
      "The test numbers are not touched yet",
    ],
    route: ["S01", "S01", "Retune by cross-validation, or declare the choice"],
    opts: [
      [
        "retune",
        "Retune by cross-validation on the training part",
        "Code check reruns the choice inside the training part. If the same grid point wins, the test numbers stand.",
        1,
        "Had the grid point retuned by cross-validation.",
      ],
      [
        "lit",
        "Keep the grid point and declare it",
        "No retuning. The test selection is declared as D2, and F1 carries a caveat.",
        0,
        "Kept the grid point and declared the test selection.",
      ],
    ],
  },
  drift: {
    tone: "rose",
    title: "A number does not match its trace",
    text: "results.csv row 21 says the gain is 0.118. Recomputed from the 20 traces it is 0.111.",
    det: ["code", "Every number comes from the traces"],
    ev: {
      file: "results.csv · traces/",
      lines: ["21,A1 · H1,0.118,0.092,0.129    # results.csv", "    gain = 0.507 − 0.396 = 0.111  # from traces"],
      hit: [0],
    },
    does: [
      "Blocks row 21 and everything that uses it",
      "Results 4.1 cannot be written meanwhile",
      "The original file is never edited",
    ],
    route: ["S02", "S02", "One value, from the traces"],
    opts: [
      [
        "trace",
        "Use the value from the traces",
        "Row 21 is superseded in the ledger by 0.111; the original file is kept and marked.",
        1,
        "Used the value recomputed from the traces.",
      ],
      [
        "hold",
        "Hold for the owner to check row 21",
        "The run is blocked until the owner confirms which value is right.",
        0,
        "Held the run for the owner to check row 21.",
      ],
    ],
  },
  cout: {
    tone: "amber",
    title: "The Conclusion is undecided",
    text: "The counterexample upheld at S04 and the Conclusion defeat each other. Under ASPIC+ the Conclusion is neither IN nor OUT.",
    det: ["av", "Only claims that are IN are written as claims"],
    ev: {
      file: "EvaluationLabels.json",
      lines: [
        "C     UNDECIDED   rebut CA4 from T41, no preference",
        "F1    IN          undercut answered at g4",
        "F2    IN",
        "F3    IN",
      ],
      hit: [0],
    },
    does: [
      "Holds the Conclusion out of the frozen graph",
      "F1, F2 and F3 are not affected",
      "Offers to restate it, or to keep it only as an open question",
    ],
    route: ["S07", "S03", "Restate at S03, argue it again, evaluate it again"],
    opts: [
      [
        "restate",
        "Restate the Conclusion and argue it again",
        "S03 restates it for the institution as a whole: “by course: mixed”. The debate hears it again; S05–S07 redraw it.",
        1,
        "Sent the Conclusion back to be restated.",
      ],
      [
        "hedge",
        "Keep it only as an open question",
        "It stays undecided: hedged in the Discussion, never in the Abstract.",
        0,
        "Kept the Conclusion as an open question.",
      ],
    ],
  },
  nojfe: {
    tone: "amber",
    title: "The journal profile could not be built",
    text: "JFE-EDJ-v2 stopped at J1: only 74 research articles pass its filters, and a profile needs 150.",
    det: ["js", "Habits need a profile; rules never do"],
    ev: {
      file: "JFE-EDJ-v2 · J1",
      lines: [
        "research articles 2021–2026      312",
        "after type, length and rights     74",
        "minimum for a profile           150",
      ],
      hit: [1],
    },
    does: [
      "The publisher’s rules still apply in full",
      "No move order, no hedge range, no fit bands",
      "S13 checks the rules only",
    ],
    route: ["S08", null, "Continues with rules only"],
    opts: [
      [
        "rules",
        "Write with the publisher’s rules only",
        "No habits from the profile. Every rule still binds.",
        1,
        "Chose to write with the publisher’s rules only.",
      ],
      [
        "stop",
        "Stop and choose a journal that has a profile",
        "The run ends here; restart it with another target journal.",
        0,
        "Stopped to choose another journal.",
      ],
    ],
  },
  cap: {
    tone: "rose",
    title: "Revision reached its three-round cap",
    text: "Three patches to 4.1 each failed the read-back. ASW stops patching and asks you.",
    det: ["or", "At most three revision rounds"],
    ev: { file: "ChangeLog.json", lines: CAP_TRIES.map(([r, t]) => `${r}: ${t}`), hit: [0, 1, 2] },
    does: ["Stops patching 4.1", "Keeps draft 1 and every failed try", "Every other patch is unaffected"],
    route: ["S15", null, "You decide the sentence"],
    opts: [
      [
        "edit",
        "Edit 4.1 yourself",
        "You write the sentence; ASW checks it once against the frozen graph.",
        1,
        "Edited 4.1 by hand.",
      ],
      [
        "revert",
        "Revert 4.1 and keep comment 1 open",
        "The caveat stays in 5.2 and the response letter says why.",
        0,
        "Reverted 4.1 and kept comment 1 open.",
      ],
    ],
  },
};
