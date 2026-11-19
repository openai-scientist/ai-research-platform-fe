"use client";

import { useState } from "react";

import { Clock, Info } from "lucide-react";

import { useApiQuery } from "@/hooks/use-api";
import { projectKeys } from "@/lib/api/query-keys";
import { datasetRunKeys, fetchDatasetRuns } from "@/lib/api/services/fetch-dataset-runs";
import { fetchRuns } from "@/lib/api/services/fetch-runs";
import { type DatasetRunModel, type GateView, RELEASE_WAIT } from "@/lib/run-stream/dataset-run-model";

import { hasChosenQuestion } from "../dataset-review-state";
import { GateFrame } from "../run-studio/gate-frame";
import { parseGatePrompt } from "../run-studio/gate-prompt";
import { Pane } from "../run-studio/scenes/scene-ui";

/** The wait for a release on the Local Node, which is answered in that app, not here. */
export function ReleaseCard() {
  return (
    <Pane
      title={
        <span className="flex items-center gap-2">
          <Clock className="size-4 shrink-0 text-amber-600" />
          {RELEASE_WAIT.replace(/\.$/, "")}
        </span>
      }
      className="bg-amber-500/10 ring-amber-500/50"
    >
      <p className="text-muted-foreground text-sm">
        Open the Local Node app and go to Releases to review what would leave your computer. Rows never do.
      </p>
    </Pane>
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
