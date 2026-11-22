import { executionEvidence } from "../execution";
import {
  body,
  finding,
  gateOptions,
  human,
  itemEvent,
  type LiveViewInput,
  label,
  list,
  number,
  present,
  raw,
  record,
  rows,
  stageEvents,
  stepFor,
  structureItems,
  texts,
} from "./shared";

const checkParts = [
  {
    name: "Analysis plan",
    match: /the plan hashes|the lock pins the plan/,
    unchanged: "The analysis plan is the one you locked.",
  },
  {
    name: "Registered programs",
    match: /the programs of the plan/,
    unchanged: "The registered programs are unchanged.",
  },
  {
    name: "Reference outputs",
    match: /the golden outputs of the plan/,
    unchanged: "The reference outputs are unchanged.",
  },
  {
    name: "Dataset snapshot",
    match: /made on snapshot|records snapshot version/,
    unchanged: "The dataset snapshot is the one used in the plan.",
  },
  {
    name: "Dataset file",
    match: /the primary file has/,
    unchanged: "The file is the same one recorded in the dataset snapshot.",
  },
  {
    name: "Dataset split",
    match: /the split of the file/,
    unchanged: "The split is the one recorded in the Plan Lock.",
  },
];

const slotNames: Readonly<Record<string, string>> = {
  main: "Main analysis",
  fork: "Robustness fork",
  negative_control: "Negative control",
  sensitivity: "Missing-data sensitivity",
  freedman_lane: "Freedman–Lane",
  data_doubt: "Data doubt fork",
};

function registeredSlots(plan: Record<string, unknown>) {
  const slots: {
    id: string;
    hypothesisId: string;
    kind: string;
    method: string | null;
    detail: string | null;
  }[] = [];
  const hypotheses = rows(plan.hypotheses);
  const robustness = record(plan.robustness);
  for (const hypothesis of hypotheses) {
    const hypothesisId = raw(hypothesis.id);
    const program = record(hypothesis.program);
    const entryId = raw(program.experiment_id);
    if (!entryId) continue;
    slots.push({
      id: entryId,
      hypothesisId,
      kind: "main",
      method: label(program.method ?? program.family),
      detail: null,
    });
    const checks = record(robustness[hypothesisId]);
    for (const fork of rows(checks.forks)) {
      const method = record(fork.program);
      if (raw(method.experiment_id))
        slots.push({
          id: raw(method.experiment_id),
          hypothesisId,
          kind: "fork",
          method: label(method.method ?? method.family),
          detail: human(fork.change),
        });
    }
    const variable = human(record(checks.negative_control).variable);
    if (variable)
      slots.push({
        id: `${hypothesisId}-negative-control`,
        hypothesisId,
        kind: "negative_control",
        method: null,
        detail: variable,
      });
    slots.push({ id: `${hypothesisId}-sensitivity`, hypothesisId, kind: "sensitivity", method: null, detail: null });
    if (
      rows(plan.if_then).some((row) => row.signal === "linear_with_covariates" && row.status === "registered") &&
      program.family === "linear_regression" &&
      list(program.covariates).length > 0
    ) {
      slots.push({
        id: `${hypothesisId}-freedman-lane`,
        hypothesisId,
        kind: "freedman_lane",
        method: null,
        detail: null,
      });
    }
    const requests = rows(hypothesis.sensitivity_requests);
    const missing = requests.filter((row) => row.kind === "missing_not_at_random");
    const groups = [
      ...(missing.length ? [missing] : []),
      ...requests.filter((row) => row.kind !== "missing_not_at_random").map((row) => [row]),
    ];
    groups.forEach((group, index) => {
      slots.push({
        id: `${hypothesisId}-doubt-${index + 1}`,
        hypothesisId,
        kind: "data_doubt",
        method: null,
        detail: group.flatMap((row) => texts([row.reason])).join(" · ") || null,
      });
    });
  }
  const kindOrder = ["main", "fork", "sensitivity", "freedman_lane", "data_doubt"];
  const order = (kind: string) => (kind === "negative_control" ? 1 : kindOrder.indexOf(kind));
  return slots.sort((a, b) => order(a.kind) - order(b.kind));
}

function checkedState(state: unknown) {
  if (state === "green") return "passed";
  if (state === "red") return "flagged";
  if (state === "not_applicable") return "not applicable";
  return null;
}

export function mapExecutionViews(input: LiveViewInput) {
  const step = stepFor(input);
  const events = stageEvents(input, "execution");
  const plan = body(input, "experiment_design.plan/v1");
  const planLock = body(input, "experiment_design.lock/v1");
  const bundle = body(input, "execution.bundle/v1");
  const packageBody = body(input, "platform.experiment_result/v1");
  const records = executionEvidence(input.artifacts?.["evidence.records/v1"]);
  const results = record(packageBody.results);
  const protocol = record(packageBody.protocol);
  const execution = record(packageBody.execution);
  const quality = record(packageBody.quality);
  const packageRuns = rows(execution.runs);
  const bundleVerdicts = rows(bundle.verdicts);
  const comparisons = rows(results.comparisons);
  const planHypotheses = rows(plan.hypotheses);
  const steps = registeredSlots(plan);
  const progressEvents = events.filter(
    ({ type, payload }) => type === "execution.progress" && payload.phase === "sealed",
  );
  const progress = progressEvents.at(-1);
  const place = number(progress?.payload.place);
  const total = number(progress?.payload.total);
  const refs = [
    ...new Set(
      [
        ...planHypotheses.map((item) => raw(item.id)),
        ...progressEvents.map((event) => raw(event.payload.hypothesis_id)),
        ...rows(results.verdicts).map((item) => raw(item.hypothesis_id)),
        ...bundleVerdicts.map((item) => raw(item.hypothesis_id)),
        ...records.flatMap((entry) => entry.hypothesis_ids),
      ].filter(Boolean),
    ),
  ];
  const ordinal = (id: unknown) => (refs.includes(raw(id)) ? refs.indexOf(raw(id)) + 1 : null);
  const envelopeLog = rows(bundle.envelope_log);
  const unsealed = envelopeLog.findLast((entry) => entry.kind === "unseal");
  const posted = new Set(envelopeLog.filter((entry) => entry.kind === "post").map((entry) => raw(entry.entry_id)));
  const runObserved = progressEvents.length > 0 || posted.size > 0 || packageRuns.length > 0;
  const started = new Map(progressEvents.map(({ payload }) => [raw(payload.entry_id), payload]));
  for (const [id, event] of started) {
    if (id && !steps.some((slot) => slot.id === id)) {
      steps.push({ id, hypothesisId: raw(event.hypothesis_id), kind: raw(event.kind), method: null, detail: null });
    }
  }
  const slots = steps.map((slot) => {
    const event = started.get(slot.id);
    const run = packageRuns.find((item) => item.run_id === slot.id);
    let state: "planned" | "started" | "posted" | "failed" | "skipped" | "completed" = "planned";
    if (event) state = "started";
    if (posted.has(slot.id)) state = "posted";
    if (run?.status === "failed" || run?.status === "skipped" || run?.status === "completed") state = run.status;
    return {
      hypothesis: ordinal(slot.hypothesisId),
      program: Object.hasOwn(slotNames, slot.kind) ? slotNames[slot.kind] : "Registered analysis",
      envelope: slot.kind === "main" ? ("confirmatory" as const) : ("robustness" as const),
      method: slot.method,
      detail: slot.detail,
      state,
      place: number(event?.place),
      reason: human(run?.status_reason),
    };
  });
  const lockCheck = itemEvent(events, "lock");
  const rehearsalCheck = itemEvent(events, "rehearsal");
  const dryCheck = itemEvent(events, "dry_run");
  const confirmatoryCheck = itemEvent(events, "confirmatory");
  const robustnessCheck = itemEvent(events, "robustness");
  const unsealCheck = itemEvent(events, "unseal");
  const verdictCheck = itemEvent(events, "verdicts");
  const packageCheck = itemEvent(events, "packaging");
  let opened: boolean | null = null;
  if (unsealed || unsealCheck?.payload.state === "green") opened = true;
  else if (bundle.ended_blind === true || unsealCheck?.payload.state === "red") opened = false;

  const lockProblem = raw(lockCheck?.payload.reason).toLowerCase();
  const parts = checkParts.map((part) => {
    if (lockCheck?.payload.state === "green")
      return { name: part.name, state: "unchanged" as const, text: part.unchanged };
    if (part.match.test(lockProblem))
      return { name: part.name, state: "changed" as const, text: `${part.name} differs from the recorded version.` };
    return { name: part.name, state: null, text: null };
  });
  const pinnedParts = [
    ["spec_hash", "Analysis plan"],
    ["program_hash", "Registered programs"],
    ["golden_outputs_hash", "Reference outputs"],
    ["snapshot_version", "Dataset snapshot"],
    ["split_digest", "Dataset split"],
  ] as const;
  const verifyStructure = structureItems(
    present(planLock) ? "experiment_design.lock/v1" : "execution lock comparison",
    pinnedParts.filter(([field]) => planLock[field] != null).map(([, title]) => title),
  );

  const reportFlow = rows(bundle.tables_and_figures).find((figure) => figure.chart_key === "flow_diagram");
  const dryRuns = Object.entries(record(record(reportFlow?.data).programs))
    .map(([id, flow]) => ({
      programIndex: steps.findIndex((slot) => slot.id === id),
      steps: rows(flow).map((row) => ({ text: human(row.step), rows: number(row.rows) })),
    }))
    .map((entry) => ({ ...entry, programIndex: entry.programIndex < 0 ? null : entry.programIndex }));
  let dryRunValueSource: "artifact" | "event" | "mixed" = "event";
  if (dryRuns.length) dryRunValueSource = dryCheck ? "mixed" : "artifact";
  const branches = rows(plan.if_then).map((row) => ({
    signal: label(row.signal),
    threshold: runObserved ? number(row.threshold) : null,
    powerFloor: runObserved ? number(row.power_floor) : null,
    branch: label(row.branch),
    rule: human(row.rule),
    status: label(row.status),
  }));
  // The registered branches are in the plan. Only deviations the bundle explicitly records are observations.
  const branchDeviations = rows(bundle.deviation_log)
    .filter((row) => /registered merge of sparse levels|rows differ from the planned rows/.test(raw(row.what)))
    .map((row) => ({ text: human(row.what), reason: human(row.why) }));
  const freedmanLaneStarted = progressEvents.some(({ payload }) => payload.kind === "freedman_lane");
  const observedBranches =
    freedmanLaneStarted || steps.some((slot) => slot.kind === "freedman_lane" && posted.has(slot.id))
      ? ["The registered Freedman–Lane program started."]
      : [];

  const resultRows = bundleVerdicts.length ? bundleVerdicts : rows(results.verdicts);
  const verdicts = resultRows.length ? resultRows : records.map(record);
  const checked = verdicts
    .map((row) => {
      const hid = row.hypothesis_id ?? list(row.hypothesis_ids)[0];
      const experiment = row.experiment_id ?? row.analysis_id ?? list(row.comparison_ids)[0];
      const entry =
        records.find((evidence) => evidence.analysis_id === experiment) ??
        records.find((evidence) => evidence.hypothesis_ids.includes(raw(hid)) && evidence.role === "primary");
      const comparison = comparisons.find((value) => value.comparison_id === experiment);
      const confirmed = rows(bundle.confirmatory_results).find((value) => value.experiment_id === experiment);
      const estimate = record(confirmed?.estimate);
      const rule = record(planHypotheses.find((value) => value.id === hid)?.decision_rule);
      return {
        hypothesis: ordinal(hid),
        programIndex: slots.length ? steps.findIndex((slot) => slot.id === experiment) : -1,
        verdict: label(row.verdict),
        reason: human(row.statement ?? row.reason),
        assessment: label(record(row.assessment).value),
        assessmentReason: human(record(row.assessment).reason),
        metric: label(entry?.metric ?? estimate.metric),
        estimate: number(entry?.estimate ?? comparison?.estimate ?? estimate.value),
        low: number(entry?.ci_low ?? comparison?.ci_low ?? estimate.ci_low),
        high: number(entry?.ci_high ?? comparison?.ci_high ?? estimate.ci_high),
        intervalLevel: number(comparison?.ci_level),
        n: number(entry?.n ?? estimate.n_used),
        sesoi: number(rule.sesoi),
        sesoiUnit: human(rule.sesoi_unit),
        direction: human(rule.direction),
        p: number(row.p ?? estimate.p_value),
        adjustedP: number(row.p_adjusted),
        alpha: number(row.alpha ?? rule.alpha),
        gate: label(row.gate),
      };
    })
    .map((row) => ({ ...row, programIndex: row.programIndex < 0 ? null : row.programIndex }));
  const packageStatus =
    packageBody.status === "complete" || packageBody.status === "partial" || packageBody.status === "blocked"
      ? packageBody.status
      : null;
  const blockedReason =
    packageStatus === "blocked"
      ? (human(packageBody.status_reason) ??
        human(rows(results.failures)[0]?.detail) ??
        human(packageCheck?.payload.reason) ??
        "No verdicts were available for the result package.")
      : null;
  const packageParts = [
    {
      section: "Protocol",
      count: present(record(protocol.specification)) ? rows(record(protocol.specification).analyses).length : null,
    },
    {
      section: "Design",
      count: Array.isArray(record(packageBody.design).jobs) ? rows(record(packageBody.design).jobs).length : null,
    },
    { section: "Execution runs", count: Array.isArray(execution.runs) ? packageRuns.length : null },
    { section: "Comparisons", count: Array.isArray(results.comparisons) ? comparisons.length : null },
    { section: "Verdicts", count: Array.isArray(results.verdicts) ? rows(results.verdicts).length : null },
    {
      section: "Robustness comparisons",
      count: Array.isArray(results.comparisons) ? comparisons.filter((row) => row.role === "robustness").length : null,
    },
    {
      section: "Exploratory analyses",
      count: Array.isArray(results.added_analyses) ? rows(results.added_analyses).length : null,
    },
    { section: "Figures", count: Array.isArray(packageBody.figures) ? rows(packageBody.figures).length : null },
    { section: "Artifacts", count: Array.isArray(packageBody.artifacts) ? rows(packageBody.artifacts).length : null },
    { section: "Quality gates", count: Array.isArray(quality.gates) ? rows(quality.gates).length : null },
  ];

  return {
    execution_verify: step(
      { parts, reason: parts.some((part) => part.state === "changed") ? null : human(lockCheck?.payload.reason) },
      ["Compare the inputs with the Plan Lock and dataset snapshot"],
      {
        available: parts.some((part) => part.state !== null),
        artifactCompletes: false,
        structure:
          verifyStructure.length > 0
            ? verifyStructure
            : structureItems(
                "execution lock comparison",
                checkParts.map((part) => part.name),
              ),
        valueSources: lockCheck ? { parts: "event", reason: "event" } : {},
        event: lockCheck,
        ...gateOptions(events, ["lock", "execution_verify"]),
        findings: parts.flatMap((part) =>
          finding(part.state === "unchanged" ? "ok" : "flag", part.text, "execution_prepare", "execution_unseal"),
        ),
      },
    ),
    execution_prepare: step(
      {
        rehearsal: {
          design: "Released data summaries and reference outputs",
          now: checkedState(rehearsalCheck?.payload.state),
          reason: human(rehearsalCheck?.payload.reason),
        },
        dryRun: {
          state: checkedState(dryCheck?.payload.state),
          reason: human(dryCheck?.payload.reason),
          programs: dryRuns,
        },
      },
      [
        "Repeat the read of the design inputs",
        "Rebuild the reference output",
        "Dry-run each registered program without showing estimates",
      ],
      {
        available: dryRuns.length > 0,
        structure: structureItems(
          "experiment_design.plan/v1 program slots",
          steps.map((slot) =>
            [slotNames[slot.kind] ?? "Registered analysis", slot.method, slot.detail].filter(Boolean).join(" · "),
          ),
        ),
        valueSources: {
          ...(rehearsalCheck ? ({ rehearsal: "event" } as const) : {}),
          ...(dryCheck || dryRuns.length ? { dryRun: dryRunValueSource } : {}),
        },
        event: dryCheck ?? rehearsalCheck,
        ...gateOptions(events, ["rehearsal", "dry_run", "execution_prepare"]),
        findings: [rehearsalCheck, dryCheck].flatMap((event) =>
          event?.payload.state === "red" ? finding("flag", event.payload.reason, "execution_unseal") : [],
        ),
      },
    ),
    execution_run: step(
      {
        slots,
        branches,
        branchDeviations,
        observedBranches,
        confirmatory: checkedState(confirmatoryCheck?.payload.state),
        robustness: checkedState(robustnessCheck?.payload.state),
      },
      [
        "Compute the registered programs",
        "Apply registered branches to the observed data",
        "Post results to the two sealed envelopes",
      ],
      {
        available: runObserved,
        artifactCompletes: Boolean(unsealed),
        structure: [
          ...structureItems(
            "experiment_design.plan/v1 program slots",
            steps.map((slot) =>
              [slotNames[slot.kind] ?? "Registered analysis", slot.method, slot.detail].filter(Boolean).join(" · "),
            ),
          ),
          ...structureItems(
            "experiment_design.plan/v1 branch rules",
            branches.map((branch) => branch.signal),
          ),
          ...structureItems(
            "experiment_design.plan/v1 hypotheses and estimands",
            planHypotheses.flatMap((hypothesis) => {
              const estimand = record(hypothesis.estimand);
              return [hypothesis.statement, estimand.summary_measure];
            }),
          ),
        ],
        valueSources: {
          ...(slots.length ? ({ slots: runObserved ? "mixed" : "artifact" } as const) : {}),
          ...(branches.length ? ({ branches: "artifact" } as const) : {}),
          ...(branchDeviations.length ? ({ branchDeviations: "artifact" } as const) : {}),
          ...(observedBranches.length
            ? ({ observedBranches: freedmanLaneStarted ? "event" : "artifact" } as const)
            : {}),
          ...(confirmatoryCheck ? ({ confirmatory: "event" } as const) : {}),
          ...(robustnessCheck ? ({ robustness: "event" } as const) : {}),
        },
        event: progress ?? robustnessCheck ?? confirmatoryCheck,
        count: place === null || total === null ? undefined : { done: Math.max(0, place - 1), total },
        cursor: progress ? steps.findIndex((slot) => slot.id === progress.payload.entry_id) : null,
        findings: branchDeviations.flatMap((row) =>
          finding("flag", row.reason ?? row.text, "execution_check", "execution_deliver"),
        ),
        ...gateOptions(events, ["run", "execution_run"]),
      },
    ),
    execution_unseal: step(
      {
        opened,
        openedAt: human(unsealed?.unsealed_at),
        approvedBy: label(unsealed?.approved_by),
        resultCount: Array.isArray(unsealed?.entries) ? unsealed.entries.length : null,
        prerequisites: [
          { name: "Plan Lock", status: checkedState(lockCheck?.payload.state) },
          { name: "Rehearsal", status: checkedState(rehearsalCheck?.payload.state) },
          { name: "Confirmatory envelope", status: checkedState(confirmatoryCheck?.payload.state) },
          { name: "Robustness envelope", status: checkedState(robustnessCheck?.payload.state) },
        ],
      },
      ["Check the prerequisites", "Wait for approval", "Open the envelopes"],
      {
        available: Boolean(unsealed || unsealCheck || bundle.ended_blind === true),
        artifactCompletes: Boolean(unsealed),
        structure: structureItems("execution prerequisites", [
          "Plan Lock",
          "Rehearsal",
          "Confirmatory envelope",
          "Robustness envelope",
        ]),
        valueSources: {
          ...(unsealed || bundle.ended_blind === true ? ({ opened: "artifact" } as const) : {}),
          ...(unsealCheck && !unsealed && bundle.ended_blind !== true ? ({ opened: "event" } as const) : {}),
          ...(unsealed ? ({ openedAt: "artifact", resultCount: "artifact", approvedBy: "artifact" } as const) : {}),
          ...(lockCheck || rehearsalCheck || confirmatoryCheck || robustnessCheck
            ? ({ prerequisites: "event" } as const)
            : {}),
        },
        event: unsealCheck,
        ...gateOptions(events, ["unseal", "execution_unseal"]),
      },
    ),
    execution_check: step(
      { verdicts: checked, multiplicity: label(record(plan.family_structure).secondary_correction) },
      [
        "Read the estimates and intervals against the locked decision rules",
        "Check the smallest effect of interest and multiplicity",
      ],
      {
        available: checked.length > 0,
        structure: structureItems(
          "experiment_design.plan/v1 decision rules",
          planHypotheses.flatMap((hypothesis, index) => {
            const rule = record(hypothesis.decision_rule);
            const estimand = record(hypothesis.estimand);
            return [
              `Hypothesis ${index + 1}`,
              estimand.summary_measure,
              rule.name,
              rule.rule,
              record(plan.family_structure).secondary_correction,
            ];
          }),
        ),
        valueSources: {
          ...(checked.length ? ({ verdicts: "artifact" } as const) : {}),
          ...(present(record(plan.family_structure)) ? ({ multiplicity: "artifact" } as const) : {}),
        },
        event: verdictCheck,
        ...gateOptions(events, ["verdicts", "execution_check"]),
        findings: checked.flatMap((entry) =>
          finding(entry.verdict === "supported" ? "ok" : "note", entry.reason, "execution_deliver"),
        ),
      },
    ),
    execution_deliver: step(
      {
        status: packageStatus,
        version: number(packageBody.version),
        reason: blockedReason,
        parts: packageParts,
        missing: rows(record(quality.validation).missing_items).map((item) => ({
          item: human(item.item),
          action: human(item.action),
        })),
      },
      ["Assemble the evidence package", "Record the handoff status and any missing parts"],
      {
        available: packageStatus !== null,
        structure: structureItems(
          "result package sections",
          packageParts.map((part) => part.section),
        ),
        event: packageCheck,
        ...gateOptions(events, ["packaging", "execution_deliver"]),
        findings: finding("flag", blockedReason),
      },
    ),
  };
}

export type ExecutionViews = ReturnType<typeof mapExecutionViews>;
