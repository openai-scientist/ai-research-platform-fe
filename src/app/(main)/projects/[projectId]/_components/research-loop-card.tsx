import { cn } from "cn";
import { Check, FlaskConical } from "lucide-react";

import { Badge } from "@/components/ui/badge";

import { SectionCard } from "../../../admin/_components/admin-primitives";
import { type ProjectDashboard, RUN_PHASES, type RunPhase } from "./project-dashboard-data";

const RUN_STAGES: { label: string; phases: RunPhase[] }[] = [
  { label: "Setup", phases: ["Intake", "Protocol Frozen"] },
  { label: "Explore", phases: ["Exploring"] },
  { label: "Confirm", phases: ["Batch Registered", "Confirming", "Assessing"] },
  { label: "Report", phases: ["Reporting", "Completed"] },
];

function getStageDetail({
  currentPhase,
  isCurrent,
  isDone,
  stepCount,
}: {
  readonly currentPhase: RunPhase;
  readonly isCurrent: boolean;
  readonly isDone: boolean;
  readonly stepCount: number;
}) {
  if (isCurrent) {
    return currentPhase;
  }
  if (isDone) {
    return "Completed";
  }
  return `${stepCount} ${stepCount === 1 ? "step" : "steps"}`;
}

function StageStepper({ currentPhase }: { readonly currentPhase: RunPhase }) {
  const currentIndex = RUN_PHASES.indexOf(currentPhase);

  return (
    <ol aria-label="Run progress">
      {RUN_STAGES.map((stage, stageIndex) => {
        const phaseIndexes = stage.phases.map((phase) => RUN_PHASES.indexOf(phase));
        const isCurrent = phaseIndexes.includes(currentIndex);
        const isDone = phaseIndexes.every((index) => index < currentIndex);
        const isLast = stageIndex === RUN_STAGES.length - 1;
        const detail = getStageDetail({ currentPhase, isCurrent, isDone, stepCount: stage.phases.length });

        return (
          <li
            key={stage.label}
            className="relative flex gap-3 pb-5 last:pb-0"
            aria-current={isCurrent ? "step" : undefined}
          >
            {!isLast && (
              <span
                aria-hidden="true"
                className={cn("absolute top-6 bottom-1 left-2.5 w-px bg-border", isDone && "bg-primary")}
              />
            )}
            <span
              aria-hidden="true"
              className={cn(
                "relative flex size-5 shrink-0 items-center justify-center rounded-full border bg-card",
                isDone && "border-primary bg-primary text-primary-foreground",
                isCurrent && "border-2 border-primary",
              )}
            >
              {isDone && <Check className="size-3" />}
              {isCurrent && <span className="size-1.5 rounded-full bg-primary" />}
            </span>
            <div className="-mt-0.5 min-w-0">
              <p className={cn("font-medium text-sm", !isCurrent && !isDone && "text-muted-foreground")}>
                {stage.label}
              </p>
              <p className={cn("truncate text-muted-foreground text-xs", isCurrent && "text-primary")}>{detail}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function ResearchLoopCard({ dashboard }: { readonly dashboard: ProjectDashboard }) {
  const { activeHypothesis, candidateHypotheses } = dashboard;
  const facts = [
    { label: "Candidates", value: `${candidateHypotheses.total} · ${candidateHypotheses.selected} selected` },
    { label: "Dataset", value: dashboard.datasetVersion },
    { label: "Next move", value: dashboard.nextMove },
  ];

  return (
    <SectionCard
      title="Current research"
      description={`${dashboard.run.id} · started ${dashboard.run.startedAt}`}
      className="h-full"
      contentClassName="grid flex-1 gap-6 md:grid-cols-[minmax(0,1fr)_11rem]"
    >
      <div className="flex min-w-0 flex-col gap-4">
        <div>
          <p className="text-muted-foreground text-xs">Research question</p>
          <p className="mt-1 line-clamp-2 font-heading text-xl leading-snug" title={dashboard.researchQuestion}>
            {dashboard.researchQuestion}
          </p>
        </div>

        <div className="rounded-r-lg border-primary border-l-2 bg-muted/50 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <FlaskConical className="size-3.5 text-primary" aria-hidden="true" />
            <span className="text-muted-foreground text-xs">Active hypothesis {activeHypothesis.id}</span>
            <Badge variant="outline" className="ml-auto">
              {activeHypothesis.origin}
            </Badge>
            <Badge variant="secondary">{activeHypothesis.status}</Badge>
          </div>
          <p className="mt-1.5 line-clamp-2 font-medium text-sm" title={activeHypothesis.statement}>
            {activeHypothesis.statement}
          </p>
        </div>

        <dl className="mt-auto grid grid-cols-1 gap-3 border-t pt-4 sm:grid-cols-3">
          {facts.map((fact) => (
            <div key={fact.label} className="min-w-0">
              <dt className="text-muted-foreground text-xs">{fact.label}</dt>
              <dd className="mt-0.5 truncate font-medium text-sm" title={fact.value}>
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="md:border-l md:pl-6">
        <StageStepper currentPhase={dashboard.runPhase} />
      </div>
    </SectionCard>
  );
}
