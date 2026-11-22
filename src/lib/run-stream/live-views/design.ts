import {
  body,
  bool,
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
  reviewContent,
  rows,
  stageEvents,
  stepFor,
  structureItems,
  texts,
} from "./shared";

const lockFields = [
  ["spec_hash", "Analysis plan"],
  ["program_hash", "Registered programs"],
  ["golden_outputs_hash", "Reference outputs on the synthetic data"],
  ["snapshot_version", "Dataset snapshot version"],
  ["split_digest", "Dataset split"],
] as const;

export function mapDesignViews(input: LiveViewInput) {
  const step = stepFor(input);
  const events = stageEvents(input, "experiment_design");
  const plan = body(input, "experiment_design.plan/v1");
  const lock = body(input, "experiment_design.lock/v1");
  const report = body(input, "review.findings/v1");
  const resultPackage = body(input, "platform.experiment_result/v1");
  const specification = record(record(resultPackage.protocol).specification);
  const briefQuestion = record(body(input, "dataset.brief/v2").chosen);
  const diagnosis = body(input, "experiment_design.design_diagnosis/v1");
  const simulations = record((present(diagnosis) ? diagnosis : record(plan.design_diagnosis)).hypotheses);
  const hypotheses = rows(plan.hypotheses);
  const progressEvents = events.filter(
    ({ type, payload }) => type === "experiment_design.progress" && payload.phase === "power",
  );
  const simulationHypotheses = [
    ...new Set([...Object.keys(simulations), ...progressEvents.map(({ payload }) => raw(payload.hypothesis_id))]),
  ].filter(Boolean);
  const workHypotheses = hypotheses.length ? hypotheses : simulationHypotheses.map((id) => record({ id }));
  const robustness = record(plan.robustness);
  const family = record(plan.family_structure);
  const progress = progressEvents.at(-1);
  const done = number(progress?.payload.done);
  const total = number(progress?.payload.total);
  const diagnosisCursor = workHypotheses.findIndex((row) => row.id === progress?.payload.hypothesis_id);
  const thread = reviewContent(report, input.artifacts?.["revision.response/v1"]);
  const work = workHypotheses.map((hypothesis, index) => {
    const dag = record(hypothesis.dag);
    const program = record(hypothesis.program);
    const simulation = record(simulations[raw(hypothesis.id)]);
    const planted = record(simulation.planted);
    const power = record(simulation.power);
    const nullRun = record(simulation.null);
    return {
      hypothesis: hypotheses.length || present(simulation) ? index + 1 : null,
      statement: human(hypothesis.statement),
      adjustment: {
        set: texts(dag.adjustment_set ?? program.covariates),
        notes: texts(hypothesis.covariate_notes),
        backdoor: present(dag)
          ? {
              nodes: rows(dag.nodes).map((node) => ({ name: human(node.name), measured: bool(node.measured) })),
              edges: list(dag.edges).flatMap((edge) => {
                const [from, to] = list(edge).map(human);
                return from && to ? [{ from, to }] : [];
              }),
              residualConfounders: texts(dag.residual_confounders),
              barredConfounders: texts(dag.barred_confounders),
              limitations: rows(dag.limitations).flatMap((item) => texts([item.text])),
            }
          : null,
      },
      simulation: present(simulation)
        ? {
            light: bool(simulation.light),
            sesoi: number(simulation.sesoi),
            alpha: number(simulation.alpha),
            metric: label(simulation.metric),
            powerPoints: rows(record(simulation.sesoi_sensitivity).points).flatMap((point) => {
              const effect = number(point.sesoi);
              const power = number(point.power);
              return effect === null || power === null
                ? []
                : [{ effect, power, standardizedEffect: number(point.standardized_sesoi) }];
            }),
            diagnostics: {
              powerAtSesoi: (number(power.reps) ?? 0) > 0 ? number(power.value) : null,
              powerReplicates: number(power.reps),
              powerMcse: number(power.mcse),
              simulatedRows: number(power.n),
              bias: planted.interval === true && (number(planted.reps) ?? 0) > 0 ? number(planted.bias) : null,
              coverage: planted.interval === true && (number(planted.reps) ?? 0) > 0 ? number(planted.coverage) : null,
              plantedReplicates: number(planted.reps),
              falsePositiveRate: (number(nullRun.replicates) ?? 0) > 0 ? number(nullRun.false_positive_rate) : null,
              falsePositiveReplicates: number(nullRun.replicates),
              falsePositiveMeasuredOn: label(nullRun.measured_on),
            },
            notes: texts(simulation.notes),
          }
        : null,
    };
  });
  const analyses = hypotheses.flatMap((hypothesis, index) => {
    const program = record(hypothesis.program);
    const estimand = record(hypothesis.estimand);
    const rule = record(hypothesis.decision_rule);
    const checks = record(robustness[raw(hypothesis.id)]);
    const control = record(checks.negative_control);
    return [
      {
        hypothesis: index + 1,
        role: human(hypothesis.label) ?? "Main analysis",
        statement: human(hypothesis.statement),
        estimand: human(estimand.summary_measure),
        method: label(program.method ?? program.family),
        multiplicity: list(family.order).includes(hypothesis.id) ? label(family.secondary_correction) : null,
        decision: {
          direction: human(rule.direction),
          sesoi: number(rule.sesoi),
          unit: human(rule.sesoi_unit),
          alpha: number(rule.alpha),
          conditions: rows(hypothesis.interpretation).flatMap((row) => texts([row.statement])),
        },
      },
      ...rows(checks.forks).map((fork) => {
        const method = record(fork.program);
        return {
          hypothesis: index + 1,
          role: "Robustness analysis",
          statement: human(fork.change),
          estimand: null,
          method: label(method.method ?? method.family),
          multiplicity: null,
          decision: null,
        };
      }),
      ...(present(control)
        ? [
            {
              hypothesis: index + 1,
              role: "Negative control",
              statement: human(control.variable),
              estimand: null,
              method: null,
              multiplicity: null,
              decision: null,
            },
          ]
        : []),
    ];
  });
  const lockParts = lockFields.filter(([key]) => lock[key] != null).map(([, name]) => name);

  return {
    design_work: step(
      { hypotheses: work, simulationPart: label(progress?.payload.part) },
      [
        "Specify the estimand and adjustment set",
        "Check the backdoor paths for a causal claim",
        "Simulate the registered analysis and assess calibration",
      ],
      {
        available: hypotheses.length > 0 || present(simulations),
        artifactCompletes: present(plan) || present(diagnosis),
        structure: [
          ...structureItems(
            "dataset.data_card/v1 variables",
            rows(body(input, "dataset.data_card/v1").variables).map((row) =>
              [row.name, label(row.type), label(row.role)].filter(Boolean).join(" · "),
            ),
          ),
          ...structureItems(
            "dataset.snapshot/v1 dictionary",
            rows(body(input, "dataset.snapshot/v1").dictionary).map((row) =>
              [row.column, label(row.type), label(row.role)].filter(Boolean).join(" · "),
            ),
          ),
          ...structureItems(
            "dataset.snapshot/v1 question map",
            rows(body(input, "dataset.snapshot/v1").question_map).map((row) => row.label),
          ),
          ...structureItems(
            "experiment_design.plan/v1 hypotheses",
            hypotheses.map((row) => row.statement),
          ),
          ...structureItems(
            "experiment_design.plan/v1 DAG",
            hypotheses.flatMap((row) => {
              const dag = record(row.dag);
              return [
                ...rows(dag.nodes).map((node) => node.name),
                ...list(dag.edges).map((edge) => list(edge).map(human).filter(Boolean).join(" → ")),
              ];
            }),
          ),
          ...structureItems(
            "experiment_design.plan/v1 analyses and rules",
            hypotheses.flatMap((row) => {
              const estimand = record(row.estimand);
              const decision = record(row.decision_rule);
              return [
                estimand.summary_measure,
                decision.name,
                decision.rule,
                ...rows(row.interpretation).map((item) => item.statement),
              ];
            }),
          ),
          ...structureItems("experiment_design.plan/v1 named rules", [
            family.rule,
            family.gatekeeping,
            family.secondary_correction,
            ...rows(plan.if_then).flatMap((item) => [item.signal, item.rule]),
          ]),
        ],
        valueSources: {
          ...(hypotheses.length > 0 || present(simulations) ? ({ hypotheses: "artifact" } as const) : {}),
          ...(progress ? ({ simulationPart: "event" } as const) : {}),
        },
        event: progress ?? itemEvent(events, "design_diagnosis"),
        count: done === null || total === null ? undefined : { done, total },
        cursor: diagnosisCursor < 0 ? null : diagnosisCursor,
        findings: work.flatMap((row) =>
          row.adjustment.notes.flatMap((note) => finding("note", note, "design_review", "design_accept")),
        ),
        ...gateOptions(events, ["work", "design_work"]),
      },
    ),
    design_review: step(
      thread,
      ["Check that the hypotheses and protocols agree", "Record review findings and any replies"],
      {
        available: present(report),
        structure: structureItems(
          "review.findings/v1",
          thread.threads.map((row) => row.challenge),
        ),
        event: events.findLast(({ type }) => type === "review.completed"),
        ...gateOptions(events, ["review", "design_review"]),
        findings: thread.threads.flatMap((row) =>
          finding(row.resolved ? "ok" : "flag", row.challenge, "design_accept"),
        ),
      },
    ),
    design_accept: step(
      {
        header: {
          title: human(specification.title) ?? "Analysis plan",
          question: human(specification.question ?? briefQuestion.text),
          version: number(plan.version),
          lockedAt: human(lock.locked_at),
          lockedBy: label(lock.locked_by),
          hypotheses: present(plan) ? hypotheses.length : null,
        },
        analyses,
        rules: {
          multiplicity: label(family.secondary_correction),
          alpha: number(family.alpha),
          gatekeeping: label(family.gatekeeping),
          description: human(family.rule),
          ifThen: rows(plan.if_then).map((rule) => ({
            signal: label(rule.signal),
            threshold: number(rule.threshold),
            branch: label(rule.branch),
            rule: human(rule.rule),
            status: label(rule.status),
          })),
          openGaps: rows(plan.open_gaps).flatMap((gap) => texts([gap.text])),
        },
        lockParts,
      },
      ["Assemble the analysis plan", "Record analysis and decision rules", "Lock the plan and its inputs"],
      {
        available: present(plan) || present(lock),
        artifactCompletes: present(lock),
        structure: [
          ...structureItems(
            "experiment_design.plan/v1 analyses",
            analyses.map((analysis) => analysis.role),
          ),
          ...structureItems("experiment_design.plan/v1 estimands and rules", [
            ...analyses.flatMap((analysis) => [analysis.estimand, analysis.method]),
            family.rule,
            family.gatekeeping,
            family.secondary_correction,
            ...rows(plan.if_then).flatMap((item) => [item.signal, item.rule]),
          ]),
          ...structureItems("experiment_design.lock/v1", lockParts),
        ],
        event: itemEvent(events, "lock"),
        findings: lockParts.flatMap((part) => finding("ok", `${part} recorded in the Plan Lock`, "execution_verify")),
        ...gateOptions(events, ["design_accept", "accept"]),
      },
    ),
  };
}

export type DesignViews = ReturnType<typeof mapDesignViews>;
