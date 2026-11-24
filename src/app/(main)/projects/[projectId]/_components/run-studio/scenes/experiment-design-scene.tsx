import { useId, useState } from "react";

import { ArrowRight, FileText, GitFork, Target } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchArtifacts } from "@/lib/api/services/fetch-artifacts";
import type { Gate, WorkCheck } from "@/lib/run-stream/contract";
import {
  DESIGN_DOCUMENTS,
  DESIGN_LOCK,
  type DesignContent,
  type DesignHypothesis,
  designLabel,
} from "@/lib/run-stream/experiment-design";

import { WorkChecklist } from "../aside-ui";
import { DesignHandoff } from "./design-handoff";
import { DesignMarkdown } from "./design-markdown";
import { designChecklist, designRuleQuestion, designView, fieldRows } from "./experiment-design-view";
import { PaperSurface } from "./paper-surface";
import { ReviewFindings } from "./review-findings";
import { Pane, Placeholder } from "./scene-ui";

type View = ReturnType<typeof designView>;

function DotRows({
  rows,
  empty = "Not written yet",
}: {
  rows: readonly (readonly [string, string])[];
  empty?: string;
}) {
  return (
    <dl className="flex flex-col divide-y divide-dashed font-sans">
      {rows.map(([label, text]) => (
        <div key={label} className="grid gap-x-4 gap-y-1 py-2 first:pt-0 last:pb-0 sm:grid-cols-[8rem_minmax(0,1fr)]">
          <dt className="flex items-start gap-1.5 pt-0.5 text-muted-foreground text-xs">
            <span
              aria-hidden
              className={
                text
                  ? "mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-500"
                  : "mt-1.5 size-1.5 shrink-0 rounded-full bg-foreground/15"
              }
            />
            {label}
          </dt>
          <dd className="min-w-0 break-words text-sm leading-relaxed">
            {text || <span className="text-muted-foreground text-xs">{empty}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Chips({ values }: { values: readonly string[] }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {values.map((value, index) => (
        <Badge
          variant="secondary"
          className="h-auto max-w-full whitespace-normal font-mono"
          // biome-ignore lint/suspicious/noArrayIndexKey: a column can appear twice (exposure and adjustment)
          key={`${value}:${index}`}
        >
          {value}
        </Badge>
      ))}
    </span>
  );
}

function DesignGraph({ graph }: { graph: View["graph"] }) {
  const id = useId();
  const { exposure, outcome, causal, edges, adjustment, covariates, residual } = graph;
  if (!exposure || !outcome)
    return <p className="text-muted-foreground text-sm">Waiting for the exposure and outcome.</p>;
  const others = [...new Set(edges.flat())].filter((name) => name !== exposure && name !== outcome);
  const node = (name: string, index: number, total: number, y: number) => ({
    name,
    x: ((index + 0.5) / total) * 420,
    y,
  });
  const nodes = [
    node(exposure, 0, 2, 103),
    node(outcome, 1, 2, 103),
    ...others.map((name, index) => node(name, index % 3, Math.min(3, others.length), 16 + Math.floor(index / 3) * 44)),
  ];
  const yShift = causal ? Math.max(0, Math.ceil(others.length / 3) - 1) * 44 : 0;
  nodes[0].y += yShift;
  nodes[1].y += yShift;
  const byName = new Map(nodes.map((entry) => [entry.name, entry]));
  const links = causal ? edges : [[exposure, outcome]];
  return (
    <figure className="flex flex-col gap-2.5">
      <svg
        viewBox={`0 0 420 ${130 + yShift}`}
        className="w-full rounded-lg bg-muted/40"
        role="img"
        aria-label={causal ? "Recorded causal diagram" : "Exposure and outcome association"}
      >
        <defs>
          <marker id={id} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M1 1L7 4L1 7" fill="none" className="stroke-muted-foreground" />
          </marker>
        </defs>
        {links.map(([from, to]) => {
          const a = byName.get(from);
          const b = byName.get(to);
          if (!a || !b || from === to) return null;
          const horizontal = a.y === b.y;
          const sign = Math.sign(b.x - a.x);
          const travel = Math.sign(b.y - a.y);
          return (
            <line
              key={`${from}:${to}`}
              x1={a.x + (horizontal ? sign * 62 : 0)}
              y1={a.y + (horizontal ? 0 : travel * 12)}
              x2={b.x - (horizontal ? sign * 64 : 0)}
              y2={b.y - (horizontal ? 0 : travel * 13)}
              strokeDasharray={causal ? undefined : "4 4"}
              markerEnd={causal ? `url(#${id})` : undefined}
              className="stroke-muted-foreground"
            />
          );
        })}
        {!causal && (
          <text x="210" y="75" textAnchor="middle" className="fill-muted-foreground text-[12px]">
            Association
          </text>
        )}
        {(causal ? nodes : nodes.slice(0, 2)).map(({ name, x, y }, index) => (
          <g key={`${name}:${index}`}>
            <title>{name}</title>
            <rect x={x - 60} y={y - 12} width="120" height="24" rx="5" className="fill-card stroke-border" />
            <text x={x} y={y + 4} textAnchor="middle" className="fill-foreground font-mono text-[10px]">
              {name.length > 18 ? `${name.slice(0, 17)}…` : name}
            </text>
          </g>
        ))}
      </svg>
      <figcaption className="text-muted-foreground text-xs leading-relaxed">
        {causal
          ? "Recorded causal assumptions and adjustment set."
          : "The plan estimates an association. Its causal structure has not been specified."}
      </figcaption>
      {(adjustment.length > 0 || covariates.length > 0) && (
        <Chips values={adjustment.length ? adjustment : covariates} />
      )}
      {causal && (
        <details className="text-muted-foreground text-xs">
          <summary className="cursor-pointer">Read the recorded links</summary>
          <ul className="mt-1 flex flex-col gap-0.5">
            {edges.map(([from, to]) => (
              <li key={`${from}:${to}`}>
                {from} → {to}
              </li>
            ))}
          </ul>
        </details>
      )}
      {residual.length > 0 && (
        <p className="text-muted-foreground text-xs">Residual confounders · {residual.join(", ")}</p>
      )}
    </figure>
  );
}

function DecisionRule({ rule, prompt, onShowGate }: { rule: View["rule"]; prompt?: string; onShowGate?(): void }) {
  const { margin, direction, source, unit } = rule;
  const hasRule = margin !== undefined && direction !== undefined;
  return (
    <Pane
      title="Decision rule"
      aside={source ? <Badge variant="secondary">{source}</Badge> : prompt ? "Needs your input" : "Before results"}
    >
      {hasRule ? (
        <>
          <svg
            className="w-full"
            viewBox="0 0 360 74"
            role="img"
            aria-label={`Smallest effect band from minus ${margin} to plus ${margin}. Predicted direction ${direction}.`}
          >
            <rect x="110" y="24" width="140" height="22" rx="3" className="fill-muted" />
            {direction === "> 0" && <rect x="16" y="24" width="94" height="22" rx="3" className="fill-rose-500/15" />}
            {direction === "< 0" && <rect x="250" y="24" width="94" height="22" rx="3" className="fill-rose-500/15" />}
            {direction === "≈ 0" && <path d="M16 24h94v22H16z M250 24h94v22h-94z" className="fill-rose-500/15" />}
            <path d="M16 35H344 M110 30v10 M180 30v10 M250 30v10" fill="none" className="stroke-muted-foreground" />
            {[
              [110, `−${margin}`],
              [180, "0"],
              [250, `+${margin}`],
            ].map(([x, value]) => (
              <text key={x} x={x} y="61" textAnchor="middle" className="fill-foreground font-mono text-[11px]">
                {value}
              </text>
            ))}
            <text
              x={direction === "> 0" ? 296 : direction === "< 0" ? 62 : 180}
              y="16"
              textAnchor="middle"
              className="fill-foreground text-[11px]"
            >
              {direction === "> 0"
                ? "Positive →"
                : direction === "< 0"
                  ? "← Negative"
                  : direction === "≈ 0"
                    ? "Near zero"
                    : "Either direction"}
            </text>
          </svg>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Shaded band · smallest effect of interest{unit ? ` · ${unit}` : ""}.
          </p>
          {direction !== "!= 0" && (
            <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
              Red marks effects contrary to the prediction. The preregistered statistical tests determine the verdict.
            </p>
          )}
          {rule.alpha !== undefined && <p className="mt-1 font-mono text-muted-foreground text-xs">α = {rule.alpha}</p>}
          {rule.sourceNote && (
            <p className="mt-2 break-words border-t border-dashed pt-2 text-muted-foreground text-xs">
              {rule.sourceNote}
            </p>
          )}
        </>
      ) : (
        <div className="flex flex-col items-start gap-2 border-t border-dashed pt-3">
          <p className="text-sm">{prompt ?? "Not written yet"}</p>
          <p className="text-muted-foreground text-xs leading-relaxed">
            The effect threshold and falsification zone appear when a decision rule is recorded.
          </p>
          {prompt && onShowGate && (
            <Button size="sm" variant="outline" onClick={onShowGate}>
              Answer the question
              <ArrowRight data-icon="inline-end" />
            </Button>
          )}
        </div>
      )}
    </Pane>
  );
}

function HypothesisPlan({
  hypothesis,
  prompt,
  onShowGate,
}: {
  hypothesis: DesignHypothesis;
  prompt?: string;
  onShowGate?(): void;
}) {
  const view = designView(hypothesis);
  const protocol = fieldRows(hypothesis.protocol);
  const notes = fieldRows(hypothesis.assumptions).filter(([label]) => !["Dag", "Robustness"].includes(label));
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <header className="flex flex-col gap-2 rounded-xl bg-muted/50 px-4 py-4 ring-1 ring-foreground/10 sm:px-5">
        <p className="flex flex-wrap items-center justify-between gap-2 text-muted-foreground text-xs">
          <span className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono">
              {hypothesis.id}
            </Badge>{" "}
            Hypothesis design
          </span>
          {hypothesis.claimType && <span>{designLabel(hypothesis.claimType)}</span>}
        </p>
        <h3 className="max-w-[72ch] text-balance font-(family-name:--font-lora) text-[19px] leading-snug">
          {hypothesis.statement ?? "Hypothesis statement pending"}
        </h3>
        {(view.exposure || view.outcome) && (
          <Chips
            values={[
              view.exposure && `Exposure · ${view.exposure}`,
              view.outcome && `Outcome · ${view.outcome}`,
            ].filter((value): value is string => Boolean(value))}
          />
        )}
      </header>
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <Pane
          title={
            <span className="inline-flex items-center gap-1.5">
              <Target className="size-3.5 text-muted-foreground" />
              Estimand
            </span>
          }
          aside="What the study estimates"
        >
          <DotRows rows={view.estimandRows} />
        </Pane>
        <Pane
          title={
            <span className="inline-flex items-center gap-1.5">
              <GitFork className="size-3.5 text-muted-foreground" />
              Exposure and outcome
            </span>
          }
          aside="Study structure"
        >
          <DesignGraph graph={view.graph} />
        </Pane>
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <DecisionRule rule={view.rule} prompt={prompt} onShowGate={onShowGate} />
        <Pane title="Design diagnosis and forecasts" aside="Before execution">
          {view.metrics.length ? (
            <dl className="grid grid-cols-2 gap-2">
              {view.metrics.map(({ label, value, percent }) => (
                <div className="rounded-lg bg-muted/50 p-2.5" key={label}>
                  <dt className="text-muted-foreground text-xs">{label}</dt>
                  <dd className="font-mono font-semibold text-lg">
                    {percent
                      ? new Intl.NumberFormat("en", { style: "percent", maximumFractionDigits: 2 }).format(value)
                      : value.toLocaleString("en")}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-muted-foreground text-sm">Not computed yet</p>
          )}
          {view.rule.detectable !== undefined && (
            <p className="mt-2 text-muted-foreground text-xs">
              Minimum detectable effect · {view.rule.detectable} {view.rule.unit}
            </p>
          )}
          {view.forecastNote && <p className="mt-2 text-muted-foreground text-xs">{view.forecastNote}</p>}
        </Pane>
      </div>
      <PaperSurface>
        <header className="mb-4 border-b pb-3">
          <p className="font-sans text-muted-foreground text-xs">{hypothesis.id} · Design specification</p>
          <h4 className="mt-1 font-(family-name:--font-lora) text-xl">Study protocol and analysis plan</h4>
        </header>
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,16rem)]">
          <div className="flex min-w-0 flex-col gap-5">
            <section>
              <h5 className="mb-2 font-sans font-semibold text-sm">1. Study protocol</h5>
              {protocol.length ? (
                <DotRows rows={protocol} />
              ) : (
                <p className="text-muted-foreground text-sm">Not written yet</p>
              )}
            </section>
            <section>
              <h5 className="mb-2 font-sans font-semibold text-sm">2. Analysis program</h5>
              {view.program.hasProgram ? (
                <>
                  <DotRows
                    rows={[
                      ["Model family", view.program.model ? designLabel(view.program.model) : ""],
                      ["Missing data", view.program.missing ? designLabel(view.program.missing) : ""],
                      ["Transforms", view.program.transforms || "None specified"],
                      ["Fallbacks", view.program.fallbacks || "None specified"],
                    ]}
                  />
                  <div className="mt-2 flex flex-wrap items-center gap-2 font-sans text-xs">
                    <span className="text-muted-foreground">Program covariates</span>
                    {view.program.covariates.length ? (
                      <Chips values={view.program.covariates} />
                    ) : (
                      <span>None specified</span>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground text-sm">Not written yet</p>
              )}
            </section>
            <section>
              <h5 className="mb-2 font-sans font-semibold text-sm">3. Robustness checks</h5>
              {view.robustness.length ? (
                <DotRows rows={view.robustness} />
              ) : (
                <p className="text-muted-foreground text-sm">Not written yet</p>
              )}
            </section>
          </div>
          <aside className="min-w-0 border-t border-dashed pt-3 font-sans lg:border-t-0 lg:border-l lg:pt-0 lg:pl-4">
            <h5 className="mb-2 font-semibold text-xs">Threats and assumptions</h5>
            {notes.length ? (
              <ul className="flex flex-col gap-3 text-muted-foreground text-xs leading-relaxed">
                {notes.map(([label, text]) => (
                  <li className="break-words" key={label}>
                    <b className="block font-medium text-foreground">{label}</b>
                    {text}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-xs">Not written yet</p>
            )}
          </aside>
        </div>
      </PaperSurface>
    </section>
  );
}

function PublishedDocuments({ design, projectId, runId }: { design: DesignContent; projectId: string; runId: string }) {
  const files = Object.values(design.artifacts).filter(
    ({ schema }) => !DESIGN_DOCUMENTS.some((document) => document === schema),
  );
  return (
    <div className="flex min-w-0 flex-col gap-3">
      {DESIGN_DOCUMENTS.map((schema) => {
        const file = design.artifacts[schema];
        if (!file) return null;
        const source = design.documents?.[schema];
        return (
          <details key={schema} className="rounded-xl border bg-card">
            <summary className="cursor-pointer px-4 py-3 font-medium text-sm">
              {schema === DESIGN_DOCUMENTS[0] ? "Statistical analysis plan" : file.label}
            </summary>
            <div className="border-t p-3">
              <Button asChild size="sm" variant="outline" className="mb-3">
                <a href={fetchArtifacts.getDownloadUrl(projectId, runId, file.id)} download>
                  <FileText data-icon="inline-start" />
                  Download document
                </a>
              </Button>
              {source && <DesignMarkdown source={source} />}
            </div>
          </details>
        );
      })}
      {files.length > 0 && (
        <details className="rounded-xl border bg-card">
          <summary className="cursor-pointer px-4 py-3 font-medium text-sm">Supporting artifacts</summary>
          <ul className="flex flex-wrap gap-2 border-t p-3">
            {files.map(({ id, label }) => (
              <li key={id}>
                <Button asChild size="sm" variant="outline">
                  <a href={fetchArtifacts.getDownloadUrl(projectId, runId, id)} download>
                    <FileText data-icon="inline-start" />
                    {label}
                  </a>
                </Button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

export function ExperimentDesignScene({
  design,
  projectId,
  runId,
  local,
  researchQuestion,
  checks,
  step,
  gate,
  onShowGate,
  onExecution,
}: {
  design?: DesignContent;
  projectId: string;
  runId: string;
  local: boolean;
  /** The research question the run was started with. */
  researchQuestion?: string;
  checks: WorkCheck[];
  step: string | null;
  gate?: Gate | null;
  onShowGate?(): void;
  onExecution?(): void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const hypotheses = Object.values(design?.hypotheses ?? {});
  const question = designRuleQuestion(gate);
  const hypothesis =
    hypotheses.find((row) => row.id === picked) ?? hypotheses.find((row) => row.id === question?.id) ?? hypotheses[0];
  const missingLock = Boolean(design?.blocked?.includes(DESIGN_LOCK) && !design.artifacts[DESIGN_LOCK]);
  const canReview = gate?.kind === "accept";
  const hasHandoff = missingLock || canReview || design?.accepted === true || Boolean(design?.artifacts[DESIGN_LOCK]);
  const hasReview =
    step === "design_review" || step === "design_accept" || hasHandoff || Boolean(design?.findings.length);
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div data-design-step="design_work" className="flex min-w-0 flex-col gap-4">
        {hypotheses.length > 1 && (
          <fieldset className="flex flex-wrap gap-2">
            <legend className="sr-only">Hypothesis plans</legend>
            {hypotheses.map(({ id }) => (
              <Button
                key={id}
                size="sm"
                variant={id === hypothesis?.id ? "secondary" : "outline"}
                aria-pressed={id === hypothesis?.id}
                onClick={() => setPicked(id)}
              >
                {id}
              </Button>
            ))}
          </fieldset>
        )}
        {hypothesis ? (
          <HypothesisPlan
            hypothesis={hypothesis}
            prompt={question?.id === hypothesis.id ? question.prompt : undefined}
            onShowGate={onShowGate}
          />
        ) : (
          <Placeholder>Hypothesis designs are not written yet.</Placeholder>
        )}
        <Pane title="Design checklist" aside="Before the plan can lock">
          <WorkChecklist
            checks={designChecklist(checks, missingLock ? "send_back" : question ? "answer" : undefined)}
            className="gap-2 sm:grid-cols-2"
          />
          {(question ?? missingLock) && onShowGate && (
            <Button className="mt-3" size="sm" variant="outline" onClick={onShowGate}>
              {missingLock ? "Review and send back" : "Answer the question"}
              <ArrowRight data-icon="inline-end" />
            </Button>
          )}
        </Pane>
      </div>
      <div data-design-step="design_review" className="flex min-w-0 flex-col gap-4">
        {hasReview && (
          <Pane title="Design review" aside="Methodologist findings">
            {design?.findings.length ? (
              <ReviewFindings findings={design.findings} />
            ) : (
              <p className="text-muted-foreground text-sm">No findings recorded.</p>
            )}
          </Pane>
        )}
        {design && <PublishedDocuments design={design} projectId={projectId} runId={runId} />}
      </div>
      <div data-design-step="design_accept">
        {hasHandoff && (
          <DesignHandoff
            local={local}
            accepted={design?.accepted}
            blocked={missingLock}
            design={design}
            question={researchQuestion}
            projectId={projectId}
            runId={runId}
            onShowGate={canReview ? onShowGate : undefined}
            onExecution={onExecution}
          />
        )}
      </div>
    </div>
  );
}
