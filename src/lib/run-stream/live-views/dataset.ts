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
  record,
  reviewContent,
  rows,
  stageEvents,
  stepFor,
  structureItems,
  texts,
} from "./shared";

function dataSource(value: unknown) {
  const source = record(value);
  return {
    filename: human(source.filename),
    role: label(source.role),
    location: label(source.location),
    origin: label(source.origin),
    tentative: bool(source.tentative),
    format: label(source.format),
    rows: number(source.rows),
    columns: number(source.columns),
    member: human(source.member),
    sheet: human(source.sheet),
    license: human(source.licence ?? source.license),
    citation: human(source.citation),
    encoding: human(source.encoding),
    connectionKind: label(source.connection_kind),
    selection: label(source.selection),
    fetchedAt: human(source.fetched_at),
  };
}

function levels(value: unknown) {
  return rows(value).map((row) => ({
    value: human(row.value ?? row.level),
    label: human(row.label),
    count: number(row.count),
    missing: bool(row.missing),
  }));
}

function stats(value: unknown) {
  const summary = record(value);
  return {
    valid: number(summary.n_valid),
    missing: number(summary.n_missing),
    distinct: number(summary.n_distinct),
    mean: number(summary.mean),
    sd: number(summary.sd),
    min: number(summary.min),
    max: number(summary.max),
    p25: number(summary.p25),
    median: number(summary.median),
    p75: number(summary.p75),
  };
}

function variable(row: Record<string, unknown>) {
  return {
    name: human(row.name),
    position: number(row.position),
    label: human(row.label),
    description: human(row.description),
    type: label(row.type),
    measure: label(row.measure),
    role: label(row.role),
    kind: label(row.kind),
    concept: human(row.concept),
    blankMeans: human(row.blank_means),
    flags: texts(row.flags).map((flag) => flag.replaceAll("_", " ")),
    levels: levels(row.values),
    missingValues: texts(row.missing_values),
    summary: stats(row.summary),
    sources: {
      label: label(row.label_source),
      measure: label(row.measure_source),
      levels: label(row.values_source),
      missing: label(row.missing_source),
    },
  };
}

function partition(snapshot: unknown, fallback: unknown) {
  const split = record(snapshot);
  const card = record(fallback);
  const parts = record(split.parts);
  const fractions = record(split.fractions);
  return {
    method: label(split.method ?? card.method),
    unit: human(split.unit_column ?? card.unit_column),
    total: number(split.n_rows),
    complete: number(split.n_complete),
    counted: human(split.counted),
    parts: [
      {
        name: "Exploration",
        count: number(present(split) ? parts.exploration : card.n_exploration),
        fraction: number(present(split) ? fractions.exploration : card.exploration_fraction),
      },
      {
        name: "Confirmation",
        count: number(present(split) ? parts.confirmation : card.n_confirmation),
        fraction: number(fractions.confirmation),
      },
      { name: "Reserve", count: number(parts.reserve), fraction: number(fractions.reserve) },
    ],
  };
}

const axes = [
  "timing",
  "measurement",
  "sample_strength",
  "missing",
  "positivity",
  "cluster",
  "generalisation",
] as const;

export function mapDatasetViews(input: LiveViewInput) {
  const step = stepFor(input);
  const events = stageEvents(input, "dataset");
  const latestProgress = events.findLast(({ type }) => type === "dataset.progress");
  const taskCursor = (tasks: readonly string[], cursor = 0) =>
    latestProgress?.payload.state === "running" && tasks.includes(String(latestProgress.payload.task))
      ? { event: latestProgress, cursor, cursorTarget: "procedure" as const }
      : {};
  const snapshot = body(input, "dataset.snapshot/v1");
  const card = body(input, "dataset.data_card/v1");
  const brief = body(input, "dataset.brief/v2");
  const review = body(input, "review.findings/v1");
  const profile = record(snapshot.table_profile);
  const profileRows = record(profile.rows);
  const recipe = record(snapshot.cleaning_recipe);
  const verdict = record(snapshot.fitness_verdict);
  const sources = rows(snapshot.sources);
  const cardSource = record(card.source);
  const sourceRows = sources.length ? sources : [cardSource].filter(present);
  const variables = rows(card.variables).map(variable);
  const split = partition(snapshot.split, card.split);
  const splitAvailable = present(record(snapshot.split)) || present(record(card.split));
  const mapping = rows(snapshot.question_map).map((row) => ({
    label: human(row.label),
    kind: label(row.kind),
    column: human(row.column),
    coverage: label(row.coverage),
    coverageBy: label(row.coverage_by),
    levels: texts(row.levels),
    definedOutcome: bool(row.defined_outcome),
    population: number(row.n_population),
    complete: number(row.n_population_complete),
    table: number(row.n_table),
  }));
  const rules = rows(snapshot.data_checks)
    .filter((check) => check.kind !== "leakage_flag")
    .map((check) => {
      const run = record(check.run);
      const params = record(check.params);
      return {
        rule: label(check.kind),
        columns: texts(check.columns),
        status: label(run.status),
        reason: human(check.reason),
        source: label(check.source_mark),
        min: number(params.min),
        max: number(params.max),
        tolerance: number(params.tolerance),
        levels: texts(params.levels),
        when: texts(params.when),
        allowed: texts(params.allowed),
        rowsChecked: number(run.rows_checked),
        failingRows: number(run.failing),
        below: number(run.below),
        above: number(run.above),
      };
    });
  const anomalies = rows(snapshot.findings).map((row) => {
    const statistic = record(row.statistic);
    return {
      category: label(row.category),
      severity: label(row.severity),
      columns: texts(row.columns),
      text: human(row.text),
      explanation: human(row.explanation),
      levels: texts(row.levels),
      counts: Object.entries(record(row.counts)).map(([name, count]) => ({ name: label(name), count: number(count) })),
      statistic: present(statistic)
        ? {
            name: label(statistic.name),
            value: number(statistic.value),
            df: number(statistic.df),
            p: number(statistic.p_value),
          }
        : null,
    };
  });
  const pairs = rows(snapshot.pair_fitness).map((pair) => ({
    exposure: human(pair.exposure),
    outcome: human(pair.outcome),
    claimCeiling: label(pair.claim_ceiling),
    axes: axes.map((axis) => {
      const dimension = record(pair[axis]);
      return { name: label(axis), status: label(dimension.status), reason: human(dimension.reason) };
    }),
  }));
  const thread = reviewContent(review, input.artifacts?.["revision.response/v1"]);
  const dataCheckFindings = [
    ...rules.flatMap((rule) =>
      rule.status === "fail" && rule.rule
        ? finding(
            "flag",
            [
              rule.rule,
              rule.columns.join(", "),
              rule.failingRows === null ? "failing count unavailable" : `${rule.failingRows} failing rows`,
            ]
              .filter(Boolean)
              .join(" · "),
            "fitness",
            "execution_prepare",
          )
        : [],
    ),
    ...anomalies.flatMap((row) => finding("flag", row.text ?? row.explanation, "fitness")),
  ];
  return {
    sources: step(
      {
        sources: sourceRows.map(dataSource),
      },
      ["Read the registered sources", "Record file facts and source roles"],
      {
        available: sourceRows.length > 0,
        structure: structureItems(
          "dataset.snapshot/v1 sources or dataset.data_card/v1 source",
          sourceRows.map((source) => [source.filename, source.role].filter(Boolean).join(" · ")),
        ),
        event: itemEvent(events, "sources"),
        ...gateOptions(events, ["sources", "reading"]),
        ...taskCursor(["reading"]),
      },
    ),
    table_model: step(
      {
        tables: sourceRows.map((source) => ({
          filename: human(source.filename),
          rows: number(source.rows ?? (source === cardSource ? card.n_rows : null)),
          columns: number(source.columns ?? (source === cardSource ? card.n_columns : null)),
          role: label(source.role),
        })),
        unit: human(card.unit_of_observation),
        keys: rows(snapshot.dictionary)
          .filter((row) => row.role === "key")
          .flatMap((row) => texts([row.column])),
      },
      ["Read each table's shape", "Identify its unit and keys", "Check the joins"],
      {
        available: sources.length > 0 || present(card),
        structure: structureItems("dataset.snapshot/v1 sources and dictionary", [
          ...sourceRows.map((source) => source.filename),
          ...rows(snapshot.dictionary).map((row) => row.column),
          card.unit_of_observation,
        ]),
        event: itemEvent(events, "table_model"),
        ...gateOptions(events, ["table_model"]),
      },
    ),
    profile_quality: step(
      {
        part: label(profileRows.part),
        rows: number(profileRows.n),
        reason: human(profile.unavailable ?? profileRows.reason),
        columns: Object.entries(record(profile.columns)).map(([column, value]) => {
          const row = record(value);
          return {
            column: human(column),
            kind: label(row.kind),
            measure: label(row.measure),
            missingShare: number(row.missing_share),
            stats: stats(row.statistics),
            levels: levels(row.levels),
            levelsNotListed: number(row.levels_not_listed),
          };
        }),
        cardAggregates: variables.map(({ name, summary, flags, levels: values }) => ({
          name,
          summary,
          flags,
          levels: values,
        })),
      },
      ["Profile released column aggregates", "Flag missingness and unusual values"],
      {
        available: present(profile) || variables.length > 0,
        structure: structureItems("dataset.snapshot/v1 table_profile and dataset.data_card/v1 variables", [
          ...Object.entries(record(profile.columns)).map(([column, value]) =>
            [column, label(record(value).kind), label(record(value).measure)].filter(Boolean).join(" · "),
          ),
          ...variables.map((row) => [row.name, row.type, row.measure].filter(Boolean).join(" · ")),
        ]),
        event: itemEvent(events, "profile_quality"),
        ...gateOptions(events, ["profile_quality", "quality"]),
        ...taskCursor(["quality"]),
        ...taskCursor(["missingness", "text_variants"], 1),
        findings: variables.flatMap((row) =>
          row.flags
            .map((flag) => ({
              kind: "flag" as const,
              text: [row.name, flag].filter(Boolean).join(" · "),
              usedBy: ["data_checks", "fitness"] as const,
            }))
            .map((entry) => ({ ...entry, usedBy: [...entry.usedBy] })),
        ),
      },
    ),
    dictionary: step(
      {
        columns: rows(snapshot.dictionary).map((row) => {
          const origin = record(row.origin);
          const time = record(record(record(snapshot.timeline).columns)[String(row.column)]);
          return {
            column: human(row.column),
            type: label(row.type),
            meaning: human(row.meaning),
            unit: human(row.unit),
            role: label(row.role),
            measure: label(row.measure),
            semanticType: label(row.semantic_type),
            sources: {
              type: label(origin.type),
              meaning: label(origin.meaning),
              unit: label(origin.unit),
              role: label(origin.role),
              measure: label(origin.measure),
            },
            timing: { tier: label(time.value), source: label(time.source), status: label(time.status) },
          };
        }),
        cardVariables: variables,
      },
      [
        "Read each variable's meaning and role",
        "Record who supplied each attribute",
        "Place variables on the timeline",
      ],
      {
        available: rows(snapshot.dictionary).length > 0 || variables.length > 0,
        structure: structureItems("dataset.snapshot/v1 dictionary and dataset.data_card/v1 variables", [
          ...rows(snapshot.dictionary).map((row) =>
            [row.column, label(row.type), label(row.role), label(row.measure)].filter(Boolean).join(" · "),
          ),
          ...variables.map((row) => [row.name, row.type, row.role].filter(Boolean).join(" · ")),
        ]),
        event: itemEvent(events, "dictionary"),
        ...gateOptions(events, ["dictionary", "describing"]),
        ...taskCursor(["describing"]),
      },
    ),
    cleaning_recipe: step(
      {
        steps: rows(recipe.steps).map((row) => ({
          kind: label(row.kind),
          column: human(row.column),
          reason: human(row.reason),
          changed: number(row.n_changed),
        })),
        requirements: rows(recipe.plan_requirements).map((row) => ({
          column: human(row.column),
          what: human(row.what),
          reason: human(row.reason),
        })),
      },
      ["Record allowed value fixes", "Carry analysis requirements into the plan"],
      {
        available: present(recipe),
        structure: structureItems("dataset.snapshot/v1 cleaning_recipe", [
          ...rows(recipe.steps).map((row) => [label(row.kind), human(row.column)].filter(Boolean).join(" · ")),
          ...rows(recipe.plan_requirements).map((row) =>
            [human(row.column), human(row.what)].filter(Boolean).join(" · "),
          ),
        ]),
        event: itemEvent(events, "cleaning_recipe"),
        ...gateOptions(events, ["cleaning_recipe", "recipe"]),
        ...taskCursor(["recipe"]),
        findings: rows(recipe.plan_requirements).flatMap((row) => finding("note", row.what, "design_work")),
      },
    ),
    question_map: step(
      {
        mapping,
        chosenQuestion: human(record(brief.chosen).text),
        questions: rows(brief.questions).map((row) => ({
          text: human(row.text),
          variables: texts(row.variables),
          rationale: human(row.rationale),
          complete: number(row.n_complete),
        })),
      },
      ["Link the question requirements to released variables", "Record coverage and gaps"],
      {
        available: mapping.length > 0 || present(brief),
        structure: structureItems("dataset.snapshot/v1 question_map and dataset.brief/v2", [
          ...mapping.map((row) => [row.label, row.column].filter(Boolean).join(" · ")),
          ...rows(brief.questions).map((row) => row.text),
        ]),
        event: itemEvent(events, "question_map"),
        ...gateOptions(events, ["question_map", "questions", "work"]),
        findings: mapping.flatMap(
          (row) =>
            (row.coverage &&
              finding(
                row.coverage === "exact" ? "ok" : "note",
                row.label && `${row.label} · ${row.coverage}`,
                "data_checks",
                "fitness",
                "design_work",
              )) ||
            [],
        ),
      },
    ),
    split: step(split, ["Draw the registered split", "Keep the confirmation rows separate"], {
      available: splitAvailable,
      event: itemEvent(events, "split"),
      structure: splitAvailable
        ? structureItems(
            "dataset.snapshot/v1 or dataset.data_card/v1",
            split.parts.map((part) => part.name),
          )
        : [],
      ...gateOptions(events, ["split"]),
      findings: split.parts.flatMap((part) =>
        part.count === null
          ? []
          : finding("note", `${part.name}: ${part.count} rows`, "design_work", "execution_verify", "execution_run"),
      ),
    }),
    data_checks: step(
      {
        columns: [
          ...new Set([
            ...variables.flatMap((row) => (row.name ? [row.name] : [])),
            ...rules.flatMap((rule) => rule.columns),
          ]),
        ],
        rules,
        anomalies,
        coverage: mapping,
        complete: split.complete,
        leakage: rows(snapshot.data_checks)
          .filter((row) => row.kind === "leakage_flag")
          .map((row) => ({ columns: texts(row.columns), flag: human(row.flag) })),
      },
      ["Apply registered checks to their columns", "Summarize failures, question coverage and leakage"],
      {
        available: Array.isArray(snapshot.data_checks),
        event: itemEvent(events, "data_checks"),
        structure: [
          ...structureItems(
            "dataset.data_card/v1",
            variables.map((row) => [row.name, row.type, row.role].filter(Boolean).join(" · ")),
          ),
          ...structureItems(
            "dataset.snapshot/v1 dictionary",
            rows(snapshot.dictionary).map((row) =>
              [row.column, label(row.type), label(row.role)].filter(Boolean).join(" · "),
            ),
          ),
          ...structureItems(
            "dataset.snapshot/v1 data_checks",
            rules.flatMap((rule) => [rule.rule, ...rule.columns.map((column) => `${rule.rule ?? "Rule"} · ${column}`)]),
          ),
          ...structureItems(
            "dataset.snapshot/v1 question_map",
            mapping.map((row) => row.label),
          ),
          ...structureItems(
            "dataset.snapshot/v1 split",
            split.parts.map((part) => part.name),
          ),
        ],
        ...gateOptions(events, ["data_checks", "checks", "screening"]),
        ...taskCursor(["checks", "screening"]),
        findings: dataCheckFindings,
      },
    ),
    fitness: step(
      {
        pairs,
        verdict: label(verdict.verdict),
        reasons: texts(verdict.reasons),
        rules: texts(verdict.rules),
        acceptedBy: label(verdict.accepted_by),
      },
      ["Assess the exposure and outcome on the fitness dimensions", "Set the strongest claim the data can carry"],
      {
        available: pairs.length > 0 || present(verdict),
        structure: structureItems(
          "dataset.snapshot/v1 pair_fitness",
          pairs.flatMap((pair) => [
            [pair.exposure, pair.outcome].filter(Boolean).join(" → "),
            ...pair.axes.map((axis) => axis.name),
          ]),
        ),
        event: itemEvent(events, "fitness"),
        ...gateOptions(events, ["fitness"]),
        findings: list(verdict.reasons).flatMap((reason) => finding("note", reason, "design_work", "design_accept")),
      },
    ),
    disclosure: step(
      {
        header: {
          title: human(card.title),
          description: human(card.description),
          unit: human(card.unit_of_observation),
          unitSource: label(card.unit_source),
          rows: number(card.n_rows),
          columns: number(card.n_columns),
          minCell: number(card.min_cell),
          disclosure: label(card.disclosure),
          source: dataSource(card.source),
        },
        variables,
        split,
        access: rows(card.access).map((row) => ({
          actor: label(row.actor),
          what: human(row.what),
          rows: label(row.rows),
          detail: human(row.detail),
        })),
        decisions: rows(card.decisions).map((row) => ({
          question: human(row.question),
          variables: texts(row.variables),
          label: human(row.label),
          note: human(row.note),
          by: label(row.by),
        })),
        caveats: texts(card.caveats),
        gaps: texts(card.gaps),
        sensitive: rows(card.sensitive).map((row) => ({
          column: human(row.column),
          kind: label(row.kind),
          confirmed: bool(row.confirmed),
        })),
      },
      ["Assemble the DataCard from released evidence", "Include access, decisions and limitations"],
      {
        available: present(card),
        structure: structureItems("dataset.data_card/v1", [
          card.title,
          ...variables.map((row) => [row.name, row.type, row.role].filter(Boolean).join(" · ")),
          ...texts(card.caveats),
        ]),
        event: itemEvent(events, "disclosure"),
        ...gateOptions(events, ["disclosure"]),
        findings: [...list(card.caveats), ...list(card.gaps)].flatMap((value) =>
          finding("note", value, "review", "design_work"),
        ),
      },
    ),
    review: step(thread, ["Review the data evidence", "Record challenges and any recorded answers"], {
      available: present(review),
      structure: structureItems(
        "review.findings/v1",
        thread.threads.map((row) => row.challenge),
      ),
      event: events.findLast(({ type }) => type === "review.completed"),
      ...gateOptions(events, ["review"]),
      findings: thread.threads.flatMap((row) =>
        finding(row.resolved ? "ok" : "flag", row.challenge, "disclosure", "design_work"),
      ),
    }),
  };
}

export type DatasetViews = ReturnType<typeof mapDatasetViews>;
