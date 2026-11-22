"use client";

import { type ReactNode, useState } from "react";

import { Check, ChevronRight, Clock3, HardDrive, Info, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useApiQuery } from "@/hooks/use-api";
import { projectKeys } from "@/lib/api/query-keys";
import { datasetRunKeys, fetchDatasetRuns } from "@/lib/api/services/fetch-dataset-runs";
import type { LocalNodeItem } from "@/lib/api/services/fetch-local-nodes";
import { fetchRuns } from "@/lib/api/services/fetch-runs";
import type { DatasetRunModel, GateView } from "@/lib/run-stream/dataset-run-model";

import { hasChosenQuestion } from "../dataset-review-state";
import { GateFrame } from "../run-studio/gate-frame";
import { parseGatePrompt } from "../run-studio/gate-prompt";

/** The local approval belongs to the device. This surface shows where the run is stopped. */
export function DatasetReleaseStatus({
  state,
  node,
  action,
  next = "After you approve the summary, the run checks the source and profiles each column.",
}: {
  state: "pending" | "reviewed" | "upcoming";
  node?: LocalNodeItem;
  action?: ReactNode;
  next?: string;
}) {
  if (state !== "pending") {
    const reviewed = state === "reviewed";
    const Icon = reviewed ? Check : Clock3;
    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <Icon aria-hidden="true" className={reviewed ? "size-4 text-emerald-600" : "size-4 text-muted-foreground"} />
        <span className="font-medium">{reviewed ? "Release reviewed" : "Release review pending"}</span>
        <span className="text-muted-foreground text-xs">
          {reviewed
            ? "Only the approved summary is available to the run."
            : "A request appears on the device when the summary is ready."}
        </span>
      </div>
    );
  }

  return (
    <section aria-label="Local Node approval" className="bg-amber-500/8">
      <div className="flex flex-wrap items-start gap-3 px-3.5 py-3.5 sm:px-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-md bg-amber-500/15 text-amber-800 dark:text-amber-300">
          <ShieldCheck aria-hidden="true" className="size-[18px]" />
        </span>
        <div className="min-w-0 flex-1 basis-48">
          <Badge
            variant="outline"
            className="mb-1.5 border-amber-500/35 bg-amber-500/10 text-amber-900 dark:text-amber-200"
          >
            <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
            Waiting for your approval
          </Badge>
          <h3 className="font-semibold text-base">Approve the release on Local Node</h3>
          <p className="mt-1 text-muted-foreground text-sm">{next}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-amber-500/25 border-t px-3.5 py-2.5 sm:px-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 text-sm">
            <HardDrive aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="wrap-anywhere font-medium">{node?.name ?? "Local Node app"}</span>
            <ChevronRight aria-hidden="true" className="size-3 shrink-0 text-muted-foreground" />
            <span className="font-medium">Releases</span>
          </div>
          <p className="mt-1 text-muted-foreground text-xs">Raw rows stay on your device.</p>
        </div>
        {action}
      </div>
    </section>
  );
}

/** Shows a recorded question using the same sheet as a live research gate. */
export function DatasetQuestionSheet({ gate }: { gate: GateView }) {
  const [minimized, setMinimized] = useState(false);
  const prompt = parseGatePrompt(gate.prompt);
  const title = prompt.kind === "labelled" ? prompt.question.text : "Dataset question";
  return (
    <GateFrame
      title={title}
      badge="Recorded question"
      minimizedLabel="Recorded question:"
      reopenLabel="View"
      minimized={minimized}
      onMinimize={setMinimized}
    >
      {(header) => (
        <div className="flex flex-col gap-3.5 overflow-y-auto px-5 pt-4.5 pb-4 text-sm">
          {header}
          <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2.5 rounded-xl bg-muted px-3 py-2.5">
            <Info className="mt-0.5 size-4 text-muted-foreground" />
            <div className="space-y-2 whitespace-pre-line leading-relaxed">
              {prompt.kind === "labelled"
                ? [...prompt.essential, ...prompt.more].map((section, index) => (
                    <p key={`${section.label}-${index}`}>
                      <b className="font-semibold">{section.label}.</b> {section.text}
                    </p>
                  ))
                : prompt.paragraphs.map((paragraph, index) => <p key={`${index}-${paragraph}`}>{paragraph}</p>)}
            </div>
          </div>
          {gate.options?.length ? (
            <ul className="flex flex-wrap gap-2 text-xs" aria-label="Recorded answer options">
              {gate.options.map((option) => (
                <li key={option.id} className="rounded-md bg-muted px-2 py-1">
                  {option.label}
                  {gate.recommended === option.id && " · Suggested"}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </GateFrame>
  );
}

/** Read a legacy Dataset run's outcome without offering stage rerun or acceptance actions. */
export function DatasetOutcomeSheet({
  outcome,
  projectId,
  runId,
}: {
  outcome: NonNullable<DatasetRunModel["outcome"]>;
  projectId: string;
  runId: string;
}) {
  const [minimized, setMinimized] = useState(false);
  const consultations = useApiQuery(projectKeys.run(projectId, runId).concat(["pi", "consultations"]), (signal) =>
    fetchRuns.getConsultations(projectId, runId, signal),
  );
  const outputs = useApiQuery(datasetRunKeys.outputs(projectId, runId), (signal) =>
    fetchDatasetRuns.outputs(projectId, runId, signal),
  );
  const note = [consultations.data?.data ?? []].flat().find((c) => c.id === outcome.consultationId)?.result
    ?.decision?.note;
  if (outputs.isPending || consultations.isPending) return null;
  const hasQuestion = hasChosenQuestion(outputs.data?.brief);
  return (
    <GateFrame
      title="Dataset stage outcome"
      badge="Recorded outcome"
      minimizedLabel="Recorded outcome:"
      reopenLabel="View"
      minimized={minimized}
      onMinimize={setMinimized}
      wide
    >
      {(header) => (
        <div className="flex flex-col gap-3.5 overflow-y-auto px-5 pt-4.5 pb-4 text-sm">
          {header}
          <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2.5 rounded-xl bg-muted px-3 py-2.5">
            <Info className="mt-0.5 size-4 text-muted-foreground" />
            <div className="space-y-2">
              <p>
                {hasQuestion
                  ? `The PI recommended ${outcome.action ?? "accepting the data card"}${outcome.confidence === undefined ? "." : ` (${Math.round(outcome.confidence * 100)}% confidence).`}`
                  : "This historical run has no chosen question and did not hand off to the research stages."}
              </p>
              {note && <p className="whitespace-pre-line">{note}</p>}
            </div>
          </div>
          <p className="text-muted-foreground">
            This run is kept for review. Start a research run to use this dataset again.
          </p>
        </div>
      )}
    </GateFrame>
  );
}
