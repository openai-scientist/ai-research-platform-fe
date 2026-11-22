import type { AgentRole } from "@/lib/run-stream/contract";
import type { LiveFinding, LiveStepKey } from "@/lib/run-stream/live-views";

interface StepMeta {
  title: string;
  /** What the step does, written without any value: it is shown while the step runs. */
  now: string;
  actor: AgentRole;
}

export const LIVE_STEPS: Record<LiveStepKey, StepMeta> = {
  sources: {
    title: "Record the sources",
    now: "Reading each registered file and noting its format, role and licence.",
    actor: "steward",
  },
  table_model: {
    title: "Model the tables",
    now: "Finding each table's shape, the row unit and the key column.",
    actor: "steward",
  },
  profile_quality: {
    title: "Check data quality",
    now: "Profiling each column from the released summaries: type, missing share and distribution.",
    actor: "steward",
  },
  dictionary: {
    title: "Write the dictionary",
    now: "Giving every column a meaning, a unit, a role and the moment it was measured.",
    actor: "steward",
  },
  cleaning_recipe: {
    title: "Plan the cleaning",
    now: "Looking for wrong values. Each fix is a step that can run again.",
    actor: "steward",
  },
  question_map: {
    title: "Link the question",
    now: "Mapping each part of the question to a column.",
    actor: "steward",
  },
  split: {
    title: "Split the rows",
    now: "Assigning rows to exploration, confirmation and reserve before any analysis.",
    actor: "code",
  },
  data_checks: {
    title: "Run the data checks",
    now: "Running each quality rule on the columns it reads and counting the rows that fail.",
    actor: "code",
  },
  fitness: {
    title: "Judge fitness",
    now: "Scoring the exposure–outcome pair on seven axes, then setting the strongest claim the data can carry.",
    actor: "steward",
  },
  disclosure: {
    title: "Build the data card",
    now: "Assembling the data card from every earlier step: variables, split, who saw which rows, and the limits.",
    actor: "steward",
  },
  review: {
    title: "Review and hand off",
    now: "The Reviewer challenges the card against the checks; each point gets an answer.",
    actor: "reviewer",
  },
  design_work: {
    title: "Design the analysis",
    now: "Checking the adjustment set on the causal graph, then simulating the plan on synthetic data.",
    actor: "methodologist",
  },
  design_review: {
    title: "Review and hand off",
    now: "The Reviewer checks that hypotheses, protocol and diagnostics agree; each finding is repaired before the lock.",
    actor: "reviewer",
  },
  design_accept: {
    title: "Accept the analysis plan",
    now: "Assembling the plan you will lock. Each part goes into the Plan Lock as it is written.",
    actor: "pi",
  },
  execution_verify: {
    title: "Verify",
    now: "Checking that the plan, programs, reference outputs, split and data file are what you locked.",
    actor: "code",
  },
  execution_prepare: {
    title: "Prepare",
    now: "Asking the data again what the design asked, then a dry run of each program that shows no estimate.",
    actor: "code",
  },
  execution_run: {
    title: "Run",
    now: "Running each locked program. Results are sealed as they finish.",
    actor: "code",
  },
  execution_unseal: {
    title: "Unseal",
    now: "Checking that every registered analysis ran, then opening the seals.",
    actor: "code",
  },
  execution_check: {
    title: "Check",
    now: "Applying the locked rule to each result: direction, interval, smallest effect of interest and Holm.",
    actor: "reviewer",
  },
  execution_deliver: {
    title: "Deliver",
    now: "Packing the evidence into the result package, then setting its status from the verdicts.",
    actor: "code",
  },
};

/** Findings of earlier steps that this step reads. */
export function usedIn(active: LiveStepKey, views: Partial<Record<LiveStepKey, { findings: LiveFinding[] }>>) {
  return (Object.keys(LIVE_STEPS) as LiveStepKey[]).flatMap((key) =>
    key === active
      ? []
      : (views[key]?.findings ?? [])
          .filter((item) => item.usedBy.includes(active))
          .map((item) => ({ ...item, from: key })),
  );
}
