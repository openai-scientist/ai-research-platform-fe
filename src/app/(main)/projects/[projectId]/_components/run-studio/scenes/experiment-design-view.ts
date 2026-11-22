import type { Gate, WorkCheck } from "@/lib/run-stream/contract";
import {
  type DesignFields,
  type DesignHypothesis,
  designLabel,
  designRecord,
  designText,
} from "@/lib/run-stream/experiment-design";

export function designValue(value: unknown): string {
  if (typeof value === "number" || typeof value === "string") return String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.map(designValue).filter(Boolean).join(" · ");
  return Object.entries(designRecord(value))
    .flatMap(([key, entry]) => {
      const text = designValue(entry);
      return text ? [`${designLabel(key)}: ${text}`] : [];
    })
    .join(" · ");
}

const number = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : undefined);
const variable = (value: unknown) =>
  designText(value) ?? designText(designRecord(value).column) ?? designText(designRecord(value).name);
const variables = (value: unknown) => (Array.isArray(value) ? value.flatMap((entry) => variable(entry) ?? []) : []);

export function designView(hypothesis: DesignHypothesis) {
  const { estimand, program, assumptions, decisionRule, diagnosis, forecast } = hypothesis;
  const exposure = designRecord(estimand?.exposure);
  const outcome = designRecord(estimand?.outcome);
  const dag = designRecord(assumptions?.dag);
  const robustness = designRecord(assumptions?.robustness);
  const exposureName = variable(exposure.variable ?? estimand?.exposure) ?? variables(program?.exposure)[0];
  const outcomeName = variable(outcome.variable ?? estimand?.outcome) ?? variables(program?.outcome)[0];
  const edges = Array.isArray(dag.edges)
    ? dag.edges.flatMap((edge) =>
        Array.isArray(edge) && typeof edge[0] === "string" && typeof edge[1] === "string"
          ? [[edge[0], edge[1]] as const]
          : [],
      )
    : [];
  const power = designRecord(diagnosis?.power);
  const twin = designRecord(diagnosis?.twin);
  const direction = designText(decisionRule?.direction);
  const margin = number(decisionRule?.sesoi);
  const provenance = decisionRule?.sesoi_source_kind;
  return {
    exposure: exposureName ?? hypothesis.inputExposure,
    outcome: outcomeName ?? hypothesis.inputOutcome,
    estimandRows: [
      ["Population", designValue(estimand?.population)],
      [
        "Exposure and contrast",
        [exposureName, designValue(exposure.contrast ?? estimand?.contrast)].filter(Boolean).join(" · "),
      ],
      ["Outcome", [outcomeName, designValue(outcome.transform)].filter(Boolean).join(" · ")],
      ["Effect measure", estimand?.effect_measure ? designLabel(designValue(estimand.effect_measure)) : ""],
      ["Summary measure", designValue(estimand?.summary_measure)],
    ] as const,
    graph: {
      exposure: exposureName ?? hypothesis.inputExposure,
      outcome: outcomeName ?? hypothesis.inputOutcome,
      edges,
      adjustment: variables(dag.adjustment_set),
      covariates: variables(program?.covariates),
      residual: variables(dag.residual_confounders),
      causal: hypothesis.claimType !== "association" && edges.length > 0,
    },
    program: {
      model: designValue(program?.family ?? program?.method),
      covariates: variables(program?.covariates),
      missing: designValue(program?.missing_data),
      transforms: designValue(program?.transforms),
      fallbacks: designValue(program?.fallbacks),
      hasProgram: Boolean(program),
    },
    robustness: [
      ["Sensitivity analysis", designRecord(robustness.sensitivity).method],
      [
        "Negative control",
        designRecord(robustness.negative_control).variable ?? designRecord(robustness.negative_control).none_reason,
      ],
      ["Missing data", designRecord(robustness.missing_data).strategy],
      [
        "Analysis variants",
        Array.isArray(robustness.forks)
          ? robustness.forks.map((fork) => {
              const { name, change } = designRecord(fork);
              return [designText(name), designText(change)].filter(Boolean).join(" · ");
            })
          : null,
      ],
    ].flatMap(([label, value]) => {
      const text = designValue(value);
      return typeof label === "string" && text ? [[label, text] as const] : [];
    }),
    rule: {
      margin: margin !== undefined && margin > 0 ? margin : undefined,
      direction:
        direction === "> 0" || direction === "< 0" || direction === "!= 0" || direction === "≈ 0"
          ? direction
          : undefined,
      unit: designText(decisionRule?.sesoi_unit),
      source:
        provenance === "researcher"
          ? "You set"
          : provenance === "convention"
            ? "Agent proposal"
            : provenance === "instrument"
              ? "Instrument based"
              : provenance === "literature"
                ? "From the literature"
                : undefined,
      sourceNote: designText(decisionRule?.sesoi_source),
      alpha: number(decisionRule?.alpha),
      detectable: number(decisionRule?.mde),
    },
    metrics: [
      ["Power at the SESOI", number(power.value), true],
      ["Diagnosis sample", number(power.n ?? twin.n), false],
      ["Power simulation error", number(power.mcse), true],
      ["Model forecast", number(forecast?.probability), true],
      ["Your forecast", number(forecast?.student_probability), true],
    ].flatMap(([label, value, percent]) =>
      typeof label === "string" && typeof value === "number" ? [{ label, value, percent: Boolean(percent) }] : [],
    ),
    forecastNote: designText(forecast?.reason),
  };
}

export function designRuleQuestion(gate?: Gate | null) {
  if (gate?.kind !== "decision" || gate.stageKey !== "experiment_design") return;
  if (!/smallest (change|effect)|\bSESOI\b/i.test(gate.why)) return;
  const id = /\bfor (H[\w-]+)\b/i.exec(gate.why)?.[1];
  if (!id) return;
  return { id, prompt: gate.why.split("\n")[0].replace(/^Decision:\s*/i, "") };
}

export function designChecklist(recorded: WorkCheck[], action?: "answer" | "send_back"): WorkCheck[] {
  const rows = new Map(recorded.map((check) => [check.key, check]));
  const essential = {
    estimands: "Estimands",
    protocols: "Study protocols",
    programs: "Analysis programs",
    decision_rules: "Decision rules",
    robustness: "Robustness checks",
    design_diagnosis: "Design diagnosis",
    forecasts: "Forecasts",
    lock: "Plan lock",
  };
  return Object.entries(essential).map(([key, label]) => {
    const current = rows.get(key) ?? { key, label, state: "red", status: "Pending", reason: "" };
    if (key === "decision_rules" && action === "answer")
      return {
        ...current,
        label,
        state: "needs_you",
        status: "Needs your input",
        reason: "Set the smallest effect that would matter.",
      };
    if (key === "lock" && action === "send_back")
      return {
        ...current,
        label,
        state: "red",
        status: "Blocked",
        reason: "Execution needs a locked plan.",
      };
    if (key === "lock" && current.state === "red" && /decision.rule/i.test(current.reason))
      return {
        ...current,
        label,
        reason: "The plan cannot be locked until its decision rule and remaining design checks are complete.",
      };
    return { ...current, label };
  });
}

export function fieldRows(fields?: DesignFields) {
  return Object.entries(fields ?? {}).flatMap(([key, entry]) => {
    const text = designValue(entry);
    return text ? [[designLabel(key), text] as const] : [];
  });
}
