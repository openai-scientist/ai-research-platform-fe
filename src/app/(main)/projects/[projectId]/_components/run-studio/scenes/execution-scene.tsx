"use client";

import { ArrowLeft, Download } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiQuery } from "@/hooks/use-api";
import { projectKeys } from "@/lib/api/query-keys";
import { fetchArtifacts } from "@/lib/api/services/fetch-artifacts";
import {
  type EvidenceRecord,
  EXECUTION_RECORDS,
  type ExecutionContent,
  executionArtifacts,
  executionCheckStep,
  executionEvidence,
  executionSteps,
} from "@/lib/run-stream/execution";
import { designLabel } from "@/lib/run-stream/experiment-design";

import { RedoExecutionAction } from "../redo-execution";
import { ExecutionLayers } from "./execution-layers";
import { Pane } from "./scene-ui";

export function ExecutionScene({
  execution,
  projectId,
  runId,
  step,
  onDesign,
}: {
  execution?: ExecutionContent;
  projectId: string;
  runId: string;
  step: string | null;
  onDesign?: () => void;
}) {
  const evidenceId = execution?.artifacts[EXECUTION_RECORDS];
  const evidence = useApiQuery(
    [...projectKeys.run(projectId, runId), "execution-evidence", evidenceId],
    async (signal) => {
      if (!evidenceId) return [];
      const { blob } = await fetchArtifacts.download(projectId, runId, evidenceId, signal);
      return executionEvidence(JSON.parse(await blob.text()));
    },
    { enabled: Boolean(projectId && runId && evidenceId) },
  );
  const definition = executionSteps.find(({ id }) => id === step);
  const checks = Object.values(execution?.checks ?? {}).filter(({ key }) => !step || executionCheckStep(key) === step);
  const artifacts = Object.entries(execution?.artifacts ?? {});
  return (
    <div className="grid min-w-0 gap-4">
      <Pane title={definition?.title ?? "Execution"} aside={execution?.accepted ? "Accepted" : undefined}>
        <p className="text-muted-foreground text-sm">
          {(step && execution?.progress[step]) ||
            definition?.explain ||
            "Follow the registered analyses and review the evidence they publish."}
        </p>
        {checks.length > 0 && (
          <ul className="mt-3 grid gap-2">
            {checks.map(({ key, state, reason }) => (
              <li key={key} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t pt-2 text-sm">
                <span className="font-medium">{designLabel(key)}</span>
                <Badge variant={state === "green" ? "secondary" : "outline"}>
                  {state === "green" ? "Passed" : state === "red" ? "Open" : designLabel(state)}
                </Badge>
                {reason && <p className="min-w-0 basis-full wrap-anywhere text-muted-foreground text-xs">{reason}</p>}
              </li>
            ))}
          </ul>
        )}
        {onDesign && (
          <Button variant="outline" size="sm" className="mt-3" onClick={onDesign}>
            <ArrowLeft data-icon="inline-start" /> Review the analysis plan
          </Button>
        )}
      </Pane>
      <RedoExecutionAction projectId={projectId} runId={runId} />
      {artifacts.length > 0 && (
        <Pane title="Published evidence">
          <ul className="flex flex-wrap gap-2">
            {artifacts.map(([schema, id]) => (
              <li key={id}>
                <Button variant="outline" size="sm" asChild>
                  <a href={fetchArtifacts.getDownloadUrl(projectId, runId, id)} download>
                    <Download data-icon="inline-start" /> {executionArtifacts[schema]}
                  </a>
                </Button>
              </li>
            ))}
          </ul>
        </Pane>
      )}
      <Pane title="Program results">
        {evidenceId && evidence.isPending ? (
          <Skeleton className="h-24 w-full" aria-label="Loading evidence records" />
        ) : evidence.data?.length ? (
          <ExecutionReadout records={evidence.data} />
        ) : !evidence.isError ? (
          <p className="text-muted-foreground text-sm">
            {evidenceId
              ? "The published evidence has no program records."
              : "Program results appear when Logos publishes the evidence records."}
          </p>
        ) : null}
      </Pane>
    </div>
  );
}

export function ExecutionReadout({ records }: { records: readonly EvidenceRecord[] }) {
  return (
    <div className="grid gap-3">
      {records.map((row) => (
        <details key={row.record_id} className="min-w-0 rounded-lg border">
          <summary className="cursor-pointer wrap-anywhere px-4 py-3 font-medium text-sm">
            {row.analysis_id} · {designLabel(row.role)}
            {row.hypothesis_ids.length > 0 && (
              <span className="ml-2 text-muted-foreground">{row.hypothesis_ids.join(", ")}</span>
            )}
          </summary>
          {typeof row.estimate === "number" && (
            <p className="border-t px-4 pt-3 text-sm">
              Estimate {row.estimate}
              {typeof row.ci_low === "number" && typeof row.ci_high === "number"
                ? ` · interval [${row.ci_low}, ${row.ci_high}]`
                : ""}
              {typeof row.n === "number" ? ` · n = ${row.n}` : ""}
              {typeof row.metric === "string" ? ` · ${row.metric}` : ""}
            </p>
          )}
          <ExecutionLayers
            layers={[
              [
                typeof row.execution_status?.state === "string"
                  ? designLabel(row.execution_status.state)
                  : "Unavailable",
                typeof row.execution_status?.reason === "string"
                  ? row.execution_status.reason
                  : typeof row.execution_status?.code === "string"
                    ? designLabel(row.execution_status.code)
                    : undefined,
              ],
              [designLabel(row.verdict), typeof row.reason === "string" ? row.reason : undefined],
              [
                typeof row.assessment?.value === "string" ? designLabel(row.assessment.value) : "Unavailable",
                typeof row.assessment?.reason === "string" ? row.assessment.reason : undefined,
              ],
            ]}
          />
        </details>
      ))}
    </div>
  );
}
