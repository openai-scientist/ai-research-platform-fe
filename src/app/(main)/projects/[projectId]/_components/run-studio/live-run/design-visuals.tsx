import { cn } from "cn";
import { Lock, LockOpen } from "lucide-react";

import type { DesignViews } from "@/lib/run-stream/live-views";

import { Blank, Chip, fmt, isCurrent, itemCursor, known, Panel, Pending, Val } from "./live-ui";
import { ReviewThreadView } from "./review-thread";

type Work = DesignViews["design_work"]["content"]["hypotheses"][number];
type Graph = NonNullable<Work["adjustment"]["backdoor"]>;

const BOX = { w: 132, h: 30 };

/** Layers the graph left to right by the longest path into each node. */
export function layoutGraph(graph: Graph) {
  const names = graph.nodes.flatMap((node) => (node.name ? [node.name] : []));
  const layer = new Map(names.map((name) => [name, 0]));
  for (let pass = 0; pass < names.length; pass++)
    for (const { from, to } of graph.edges)
      if (layer.has(from) && layer.has(to)) layer.set(to, Math.max(layer.get(to) ?? 0, (layer.get(from) ?? 0) + 1));
  const depth = Math.max(0, ...layer.values());
  const seen = new Map<number, number>();
  const spot = new Map<string, { x: number; y: number }>();
  for (const name of names) {
    const col = layer.get(name) ?? 0;
    const row = seen.get(col) ?? 0;
    seen.set(col, row + 1);
    spot.set(name, { x: BOX.w / 2 + 8 + col * (BOX.w + 56), y: BOX.h / 2 + 10 + row * (BOX.h + 28) });
  }
  const width = BOX.w + 16 + depth * (BOX.w + 56);
  const height = 20 + Math.max(1, ...seen.values()) * (BOX.h + 28) - 28 + BOX.h / 2;
  return { spot, width, height: height + 8 };
}

function CausalGraph({ graph, adjusted }: { graph: Graph; adjusted: string[] }) {
  const { spot, width, height } = layoutGraph(graph);
  const trim = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const t = Math.min((BOX.w / 2 + 5) / Math.abs(dx || 1e-9), (BOX.h / 2 + 5) / Math.abs(dy || 1e-9), 0.45);
    return { x: b.x - dx * t, y: b.y - dy * t };
  };
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      style={{ maxWidth: width }}
      className="h-auto w-full"
      role="img"
      aria-label={`Causal graph with ${graph.nodes.length} variables. Adjusted for ${adjusted.join(", ") || "nothing"}.`}
    >
      <defs>
        <marker id="live-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0 0L10 5L0 10z" className="fill-foreground" />
        </marker>
      </defs>
      {graph.edges.map(({ from, to }) => {
        const a = spot.get(from);
        const b = spot.get(to);
        if (!a || !b) return null;
        const start = trim(b, a);
        const end = trim(a, b);
        return (
          <line
            key={`${from}>${to}`}
            x1={start.x}
            y1={start.y}
            x2={end.x}
            y2={end.y}
            className="stroke-foreground"
            strokeWidth={1.5}
            markerEnd="url(#live-arrow)"
          />
        );
      })}
      {graph.nodes.map((node, index) => {
        const at = node.name ? spot.get(node.name) : undefined;
        if (!node.name || !at) return null;
        const ring = adjusted.includes(node.name);
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: a variable can be listed twice
          <g key={`${node.name}:${index}`}>
            {ring && (
              <rect
                x={at.x - BOX.w / 2 - 4}
                y={at.y - BOX.h / 2 - 4}
                width={BOX.w + 8}
                height={BOX.h + 8}
                rx={12}
                className="fill-none stroke-foreground"
              />
            )}
            <rect
              x={at.x - BOX.w / 2}
              y={at.y - BOX.h / 2}
              width={BOX.w}
              height={BOX.h}
              rx={9}
              className={cn("fill-card", node.measured === false ? "stroke-muted-foreground" : "stroke-border")}
              strokeDasharray={node.measured === false ? "4 3" : undefined}
              strokeWidth={1.5}
            />
            <text x={at.x} y={at.y + 4} textAnchor="middle" className="fill-foreground font-mono text-[11px]">
              {node.name.length > 17 ? `${node.name.slice(0, 16)}…` : node.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

type Simulation = NonNullable<Work["simulation"]>;

/** Power against the smallest effect of interest, drawn at its real size from the points the calculator reported. */
function PowerChart({ simulation }: { simulation: Simulation | null }) {
  const powerPoints = simulation?.powerPoints ?? [];
  const sesoi = simulation?.sesoi ?? null;
  const diagnostics = simulation?.diagnostics ?? {
    powerAtSesoi: null,
    bias: null,
    coverage: null,
    falsePositiveRate: null,
  };
  const W = 480;
  const H = 230;
  const left = 40;
  const right = W - 14;
  const top = 18;
  const bottom = H - 36;
  const points = [...powerPoints].sort((a, b) => a.effect - b.effect);
  const max = Math.max(1e-9, sesoi ?? 0, ...points.map((point) => point.effect)) * 1.1;
  const x = (value: number) => left + (value / max) * (right - left);
  const y = (value: number) => bottom - Math.max(0, Math.min(1, value)) * (bottom - top);
  const marked = diagnostics.powerAtSesoi !== null && sesoi !== null;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      style={{ maxWidth: W }}
      className="h-auto w-full"
      role="img"
      aria-label="Power for each smallest effect of interest the calculator evaluated"
    >
      {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
        <g key={tick}>
          <line x1={left} x2={right} y1={y(tick)} y2={y(tick)} className="stroke-border" />
          <text x={left - 8} y={y(tick) + 4} textAnchor="end" className="fill-muted-foreground text-[10px]">
            {tick}
          </text>
        </g>
      ))}
      <line x1={left} x2={right} y1={bottom} y2={bottom} className="stroke-border" />
      {simulation &&
        [0, max / 2, max].map((tick) => (
          <text
            key={tick}
            x={x(tick)}
            y={bottom + 14}
            textAnchor="middle"
            className="fill-muted-foreground text-[10px]"
          >
            {fmt(tick, 2)}
          </text>
        ))}
      {!simulation && (
        <g>
          <line
            x1={(left + right) / 2}
            x2={(left + right) / 2}
            y1={top}
            y2={bottom}
            className="stroke-amber-500"
            strokeDasharray="3 4"
          />
          <text
            x={(left + right) / 2 - 6}
            y={top + 9}
            textAnchor="end"
            className="fill-amber-700 text-[10px] dark:fill-amber-300"
          >
            registered SESOI
          </text>
        </g>
      )}
      {sesoi !== null && (
        <g>
          <line x1={x(sesoi)} x2={x(sesoi)} y1={top} y2={bottom} className="stroke-amber-500" strokeDasharray="3 4" />
          <text
            x={x(sesoi) - 6}
            y={top + 9}
            textAnchor="end"
            className="fill-amber-700 text-[10px] dark:fill-amber-300"
          >
            registered SESOI {fmt(sesoi, 3)}
          </text>
        </g>
      )}
      {points.length > 1 && (
        <path
          d={points
            .map((point, i) => `${i ? "L" : "M"}${x(point.effect).toFixed(1)} ${y(point.power).toFixed(1)}`)
            .join(" ")}
          className="fill-none stroke-blue-600 dark:stroke-blue-400"
          strokeWidth={2}
          strokeLinejoin="round"
        />
      )}
      {points.map((point) => (
        <circle
          key={point.effect}
          cx={x(point.effect)}
          cy={y(point.power)}
          r={3.5}
          className="fill-blue-600 stroke-card dark:fill-blue-400"
          strokeWidth={2}
        >
          <title>{`SESOI ${fmt(point.effect, 3)}: calculator power ${fmt(point.power, 2)}`}</title>
        </circle>
      ))}
      {marked && sesoi !== null && diagnostics.powerAtSesoi !== null && (
        <g>
          <rect
            x={x(sesoi) - 5}
            y={y(diagnostics.powerAtSesoi) - 5}
            width={10}
            height={10}
            transform={`rotate(45 ${x(sesoi)} ${y(diagnostics.powerAtSesoi)})`}
            className="fill-foreground stroke-card"
            strokeWidth={2}
          />
          <text
            x={x(sesoi) + 10}
            y={y(diagnostics.powerAtSesoi) + 16}
            className="fill-foreground font-semibold text-[11px]"
          >
            {fmt(diagnostics.powerAtSesoi, 2)} simulated
          </text>
        </g>
      )}
      {points.length === 0 && (
        <text
          x={(left + right) / 2 + 8}
          y={(top + bottom) / 2 + 16}
          className="fill-muted-foreground text-[11px] italic"
        >
          waits for the calculator
        </text>
      )}
      <text x={right} y={H - 6} textAnchor="end" className="fill-muted-foreground text-[10px]">
        smallest effect of interest
      </text>
      <text x={4} y={top - 6} className="fill-muted-foreground text-[10px]">
        power
      </text>
    </svg>
  );
}

const Metric = ({
  label,
  value,
  basis,
  digits = 2,
}: {
  label: string;
  value: number | null;
  basis: string | null;
  digits?: number;
}) => (
  <div className="rounded-lg border p-2">
    <small className="block text-muted-foreground text-xs">{label}</small>
    <b className="text-base tabular-nums">{value === null ? <Pending>Evaluating</Pending> : fmt(value, digits)}</b>
    {basis && <em className="block text-[11px] text-muted-foreground not-italic">{basis}</em>}
  </div>
);

function HypothesisWork({
  hypothesis,
  index,
  step,
}: {
  hypothesis: Work;
  index: number;
  step: DesignViews["design_work"];
}) {
  const { adjustment, simulation } = hypothesis;
  const d = simulation?.diagnostics;
  const done = step.progress >= 1;
  const sim = step.valueSources.simulationPart;
  return (
    <div className="grid gap-3" data-cursor={itemCursor(index)}>
      <Panel
        title={`Hypothesis ${hypothesis.hypothesis ?? index + 1}`}
        current={isCurrent(step, index)}
        aside={
          step.content.simulationPart && isCurrent(step, index)
            ? `simulating · ${step.content.simulationPart}`
            : undefined
        }
        source={step.valueSources.hypotheses}
      >
        {hypothesis.statement ? (
          <p className="text-sm">{hypothesis.statement}</p>
        ) : (
          <Pending>Writing the estimand</Pending>
        )}
        <div className="flex flex-wrap items-center gap-1.5 text-sm">
          <span className="text-muted-foreground text-xs">Adjust for</span>
          {adjustment.set.length ? (
            adjustment.set.map((name, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: a column can be listed twice
              <Chip key={`${name}:${index}`} className="font-mono">
                {name}
              </Chip>
            ))
          ) : (
            <Pending>{done ? "nothing recorded" : "Evaluating"}</Pending>
          )}
        </div>
      </Panel>
      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title="Causal graph · backdoor check" source={step.valueSources.hypotheses}>
          {adjustment.backdoor ? (
            <>
              <CausalGraph graph={adjustment.backdoor} adjusted={adjustment.set} />
              <ul className="grid gap-1 text-muted-foreground text-xs">
                {adjustment.backdoor.residualConfounders.length > 0 && (
                  <li>Left unadjusted: {adjustment.backdoor.residualConfounders.join(", ")}</li>
                )}
                {adjustment.backdoor.barredConfounders.length > 0 && (
                  <li>Kept out of the model: {adjustment.backdoor.barredConfounders.join(", ")}</li>
                )}
                {adjustment.backdoor.limitations.map((text) => (
                  <li key={text}>{text}</li>
                ))}
              </ul>
            </>
          ) : done ? (
            <Pending>The plan records no causal graph</Pending>
          ) : (
            <GraphFrame step={step} />
          )}
        </Panel>
        <Panel
          title="Power by smallest effect of interest"
          aside={simulation?.metric}
          source={sim ? "mixed" : step.valueSources.hypotheses}
        >
          {simulation?.light ? (
            <Pending>A light review runs no simulation.</Pending>
          ) : !simulation && done ? (
            <Pending>No simulation recorded</Pending>
          ) : (
            <PowerChart simulation={simulation} />
          )}
        </Panel>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric
          label="Power at SESOI"
          value={d?.powerAtSesoi ?? null}
          basis={d?.powerReplicates != null ? `${fmt(d.powerReplicates)} simulated runs` : null}
        />
        <Metric
          label="Bias"
          value={d?.bias ?? null}
          basis={d?.plantedReplicates != null ? `${fmt(d.plantedReplicates)} runs, planted effect` : null}
        />
        <Metric
          label="CI coverage"
          value={d?.coverage ?? null}
          basis={d?.plantedReplicates != null ? `${fmt(d.plantedReplicates)} runs` : null}
        />
        <Metric
          label="False positives"
          value={d?.falsePositiveRate ?? null}
          basis={d?.falsePositiveReplicates != null ? `${fmt(d.falsePositiveReplicates)} null runs` : null}
          digits={3}
        />
      </div>
      {simulation && simulation.notes.length > 0 && (
        <ul className="grid gap-1 text-muted-foreground text-xs">
          {simulation.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** The variables, and the edges between them once the plan has a graph, drawn before anything is evaluated. */
function GraphFrame({ step }: { step: DesignViews["design_work"] }) {
  const edges = known(step, /DAG/).filter((label) => label.includes(" → "));
  const dagNodes = known(step, /DAG/).filter((label) => !label.includes(" → "));
  const variables = known(step, /dictionary|data_card/).map((label) => {
    const [name, , role] = label.split(" · ");
    return { name, role };
  });
  const nodes = dagNodes.length ? dagNodes.map((name) => ({ name, role: undefined })) : variables;
  if (!nodes.length) return <Pending>Drawing the graph from the dictionary's time order</Pending>;
  const graph: Graph = {
    nodes: nodes.map((node) => ({ name: node.name, measured: null })),
    edges: edges.flatMap((label) => {
      const [from, to] = label.split(" → ");
      return from && to ? [{ from, to }] : [];
    }),
    residualConfounders: [],
    barredConfounders: [],
    limitations: [],
  };
  return (
    <>
      {edges.length > 0 ? (
        <CausalGraph graph={graph} adjusted={[]} />
      ) : (
        <ul className="flex flex-wrap gap-2" aria-label="Variables">
          {nodes.map((node, index) => (
            <li
              // biome-ignore lint/suspicious/noArrayIndexKey: a variable can be listed twice
              key={`${node.name}:${index}`}
              data-cursor={itemCursor(index + 1)}
              className="grid gap-0.5 rounded-lg border px-2.5 py-1.5 text-center"
            >
              <span className="font-mono text-[11px]">{node.name}</span>
              {node.role && <small className="text-[10px] text-muted-foreground">{node.role}</small>}
            </li>
          ))}
        </ul>
      )}
      <Pending>Drawing the graph from the dictionary's time order</Pending>
    </>
  );
}

const Frame = ({ step }: { step: DesignViews["design_work"] }) => {
  const statements = known(step, /plan\.v1 hypotheses/);
  return (
    <div className="grid gap-3">
      <Panel title="Hypotheses">
        {(statements.length ? statements : [null]).map((statement, index) => (
          <div key={statement ?? "hypothesis"} data-cursor={itemCursor(index)} className="text-sm">
            <small className="block text-muted-foreground text-xs">Hypothesis {index + 1}</small>
            {statement ?? <Blank className="w-48" />}
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-1.5 text-sm">
          <span className="text-muted-foreground text-xs">Adjust for</span>
          <Pending>Evaluating</Pending>
        </div>
      </Panel>
      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title="Causal graph · backdoor check">
          <GraphFrame step={step} />
        </Panel>
        <Panel title="Power by smallest effect of interest">
          <PowerChart simulation={null} />
        </Panel>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric label="Power at SESOI" value={null} basis={null} />
        <Metric label="Bias" value={null} basis={null} />
        <Metric label="CI coverage" value={null} basis={null} />
        <Metric label="False positives" value={null} basis={null} digits={3} />
      </div>
    </div>
  );
};

export function DesignWorkVisual({ step }: { step: DesignViews["design_work"] }) {
  const { hypotheses } = step.content;
  if (!hypotheses.length) return <Frame step={step} />;
  return (
    <div className="grid gap-5">
      {hypotheses.map((hypothesis, index) => (
        <HypothesisWork key={hypothesis.hypothesis ?? index} hypothesis={hypothesis} index={index} step={step} />
      ))}
    </div>
  );
}

export function DesignReviewVisual({ step }: { step: DesignViews["design_review"] }) {
  return <ReviewThreadView step={step} responder="methodologist" />;
}

const LOCK_SLOTS = [
  { name: "Analysis plan", section: "rules" },
  { name: "Registered programs", section: "analyses" },
  { name: "Reference outputs on the synthetic data", section: "analyses" },
  { name: "Dataset snapshot version", section: "header" },
  { name: "Dataset split", section: "header" },
] as const;

const ANALYSIS_HEADS = ["Analysis", "Estimand", "Method", "Multiplicity", "Decision"];

function AnalysesFrame({ step }: { step: DesignViews["design_accept"] }) {
  const roles = known(step, /analyses$/);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[46rem] text-left text-[13px]">
        <thead className="text-[11px] text-muted-foreground">
          <tr>
            {ANALYSIS_HEADS.map((head) => (
              <th key={head} className="px-1 py-1.5 font-medium">
                {head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(roles.length ? roles : [null]).map((role, index) => (
            <tr key={role ?? "analysis"} data-cursor={itemCursor(index + 3)} className="border-t align-top">
              <td className="px-1 py-2">{role ? <Chip>{role}</Chip> : <Blank />}</td>
              {ANALYSIS_HEADS.slice(1).map((head) => (
                <td key={head} className="px-1 py-2">
                  <Blank className="w-24" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The plan being written, and the Plan Lock its parts fly into. */
export function DesignAcceptVisual({ step }: { step: DesignViews["design_accept"] }) {
  const { header, analyses, rules, lockParts } = step.content;
  const closed = step.progressFrom === "artifact" && step.progress >= 1;
  const parts = (section: string) =>
    LOCK_SLOTS.filter((slot) => slot.section === section && lockParts.includes(slot.name)).map((slot) => (
      <span
        key={slot.name}
        data-fly={`lk-${slot.name}`}
        data-label={slot.name}
        className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
      >
        <Lock aria-hidden className="size-3" />
        {slot.name}
      </span>
    ));
  return (
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_16rem]">
      <div className="grid min-w-0 gap-3">
        <Panel
          title={`Plan${header.version !== null ? ` v${header.version}` : ""}`}
          cursor={itemCursor(0)}
          source={step.valueSources.header}
        >
          <b className="text-sm">{header.title}</b>
          <dl className="grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] gap-x-4 gap-y-2 text-sm">
            <div>
              <dt className="text-[11px] text-muted-foreground uppercase tracking-wide">Question</dt>
              <dd>
                <Val value={header.question} />
              </dd>
            </div>
            <div>
              <dt className="text-[11px] text-muted-foreground uppercase tracking-wide">Hypotheses</dt>
              <dd>
                <Val value={fmt(header.hypotheses)} />
              </dd>
            </div>
            {header.lockedAt && (
              <div>
                <dt className="text-[11px] text-muted-foreground uppercase tracking-wide">Locked</dt>
                <dd>
                  {header.lockedAt}
                  {header.lockedBy && ` · ${header.lockedBy}`}
                </dd>
              </div>
            )}
          </dl>
          <div className="flex flex-wrap gap-1.5">{parts("header")}</div>
        </Panel>
        <Panel
          title={`Analyses${analyses.length ? ` · ${analyses.length}` : ""}`}
          cursor={itemCursor(1)}
          source={step.valueSources.analyses}
        >
          {analyses.length === 0 ? (
            <AnalysesFrame step={step} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[46rem] text-left text-[13px] [&_td]:wrap-break-word">
                <thead className="text-[11px] text-muted-foreground">
                  <tr>
                    {["Analysis", "Estimand", "Method", "Multiplicity", "Decision"].map((head) => (
                      <th key={head} className="px-1 py-1.5 font-medium">
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {analyses.map((row, index) => (
                    <tr key={`${row.hypothesis}:${row.role}:${index}`} className="border-t align-top">
                      <td className="px-1 py-2">
                        <Chip tone={row.role === "Main analysis" ? "live" : "neutral"}>{row.role}</Chip>
                        <small className="mt-1 block text-muted-foreground">Hypothesis {row.hypothesis}</small>
                      </td>
                      <td className="min-w-40 px-1 py-2">{row.estimand ?? row.statement ?? <Pending />}</td>
                      <td className="px-1 py-2">{row.method ?? <Pending />}</td>
                      <td className="px-1 py-2">
                        {row.multiplicity ?? <span className="text-muted-foreground">none</span>}
                      </td>
                      <td className="min-w-48 px-1 py-2">
                        {row.decision ? (
                          <>
                            {row.decision.direction}
                            {row.decision.sesoi !== null &&
                              ` · SESOI ${fmt(row.decision.sesoi, 3)}${row.decision.unit ? ` ${row.decision.unit}` : ""}`}
                            {row.decision.alpha !== null && ` · α ${fmt(row.decision.alpha, 3)}`}
                            {row.decision.conditions.map((text) => (
                              <small key={text} className="block text-muted-foreground">
                                {text}
                              </small>
                            ))}
                          </>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">{parts("analyses")}</div>
        </Panel>
        <Panel title="Rules" cursor={itemCursor(2)} source={step.valueSources.rules}>
          <dl className="grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] gap-x-4 gap-y-2 text-sm">
            {[
              ["Multiplicity", rules.multiplicity],
              ["Alpha", fmt(rules.alpha, 3)],
              ["Gatekeeping", rules.gatekeeping],
            ].map(([term, value]) => (
              <div key={term}>
                <dt className="text-[11px] text-muted-foreground uppercase tracking-wide">{term}</dt>
                <dd>
                  <Val value={value} />
                </dd>
              </div>
            ))}
          </dl>
          {rules.description && <p className="text-sm">{rules.description}</p>}
          {rules.ifThen.map((rule, index) => (
            <p key={`${rule.signal}:${index}`} className="text-sm">
              If <b className="font-medium">{rule.signal}</b>{" "}
              {rule.threshold !== null && `crosses ${fmt(rule.threshold, 3)}`} → {rule.branch}
              {rule.rule && <span className="text-muted-foreground text-xs"> — {rule.rule}</span>}
            </p>
          ))}
          {rules.openGaps.map((gap) => (
            <p key={gap} className="text-amber-800 text-xs dark:text-amber-300">
              Open gap · {gap}
            </p>
          ))}
          <div className="flex flex-wrap gap-1.5">{parts("rules")}</div>
        </Panel>
      </div>
      <aside
        className={cn(
          "flex h-fit flex-col gap-2 rounded-2xl border border-dashed p-3.5 transition-colors",
          closed && "border-foreground border-solid bg-muted/60",
        )}
      >
        <span
          className={cn(
            "grid size-9 place-items-center rounded-xl bg-muted",
            closed && "bg-primary text-primary-foreground",
          )}
        >
          {closed ? <Lock aria-hidden className="size-4" /> : <LockOpen aria-hidden className="size-4" />}
        </span>
        <b className="text-sm">Plan Lock</b>
        <small className="text-muted-foreground text-xs">
          {closed ? "Locked. Nothing in it can change now." : "Holds what Execution must find unchanged."}
        </small>
        <ul className="grid gap-1.5">
          {LOCK_SLOTS.map((slot) =>
            lockParts.includes(slot.name) ? (
              <li
                key={slot.name}
                data-land={`lk-${slot.name}`}
                className="rounded-md border bg-card px-2 py-1.5 text-xs"
              >
                {slot.name}
              </li>
            ) : (
              <li
                key={slot.name}
                className="h-8 rounded-md border border-dashed"
                aria-label={`${slot.name}: not recorded yet`}
              />
            ),
          )}
        </ul>
      </aside>
    </div>
  );
}
