"use client";

import { useState } from "react";

import { ArrowLeft, Download, FileArchive, FileText, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiQuery } from "@/hooks/use-api";
import { projectKeys } from "@/lib/api/query-keys";
import { fetchArtifacts } from "@/lib/api/services/fetch-artifacts";
import { fetchResearchPackage } from "@/lib/api/services/fetch-research-package";
import {
  type EvidenceRecord,
  EXECUTION_RECORDS,
  type ExecutionContent,
  executionArtifacts,
  executionCheckStep,
  executionDownload,
  executionEvidence,
  executionNoResults,
  executionSteps,
  noResultsMessage,
  RESEARCH_PACKAGE_ZIP,
} from "@/lib/run-stream/execution";
import { designLabel } from "@/lib/run-stream/experiment-design";
import { plainNote } from "@/lib/run-stream/plain-notes";
import { packageFigures } from "@/lib/run-stream/result-figures";

import { saveProjectFile } from "../../project-file-download";
import { RedoExecutionAction } from "../redo-execution";
import { PackageFigureCards, RESULT_PACKAGE_SCHEMA } from "../results-report/package-figures";
import { FetchedDocument, ReaderSheet } from "./document-reader";
import { ExecutionLayers } from "./execution-layers";
import { Pane } from "./scene-ui";

/** The evidence records Execution published, read once and shared by the scene and the gate. */
export function useExecutionEvidence(projectId: string, runId: string, evidenceId?: string) {
  return useApiQuery(
    [...projectKeys.run(projectId, runId), "execution-evidence", evidenceId],
    async (signal) => {
      if (!evidenceId) return [];
      const { blob } = await fetchArtifacts.download(projectId, runId, evidenceId, signal);
      return executionEvidence(JSON.parse(await blob.text()));
    },
    { enabled: Boolean(projectId && runId && evidenceId) },
  );
}

export function ExecutionScene({
  execution,
  projectId,
  runId,
  step,
  onDesign,
  hypotheses,
  adjustments,
}: {
  execution?: ExecutionContent;
  projectId: string;
  runId: string;
  step: string | null;
  onDesign?: () => void;
  /** The statement of each hypothesis, by id, from the locked plan. */
  hypotheses?: Readonly<Record<string, string | undefined>>;
  /** The "Adjusted for" line of each hypothesis of the locked plan, by id. */
  adjustments?: Readonly<Record<string, string | undefined>>;
}) {
  const [reading, setReading] = useState<string | null>(null);
  const evidenceId = execution?.artifacts[EXECUTION_RECORDS];
  const evidence = useExecutionEvidence(projectId, runId, evidenceId);
  const definition = executionSteps.find(({ id }) => id === step);
  const checks = Object.values(execution?.checks ?? {}).filter(({ key }) => !step || executionCheckStep(key) === step);
  const artifacts = Object.entries(execution?.artifacts ?? {});
  const readingId = reading ? execution?.artifacts[reading] : undefined;
  const noResults = executionNoResults(execution, evidence.data);
  const source = { projectId, runId };
  const [saving, setSaving] = useState<string | null>(null);
  const save = async (
    key: string,
    file: { filename: string },
    request: () => ReturnType<typeof fetchArtifacts.download>,
  ) => {
    setSaving(key);
    try {
      saveProjectFile({ ...(await request()), filename: file.filename }, file.filename);
    } catch {
      // The request layer already told the person; the button is usable again.
    } finally {
      setSaving(null);
    }
  };
  const saveArtifact = (schema: string, id: string) =>
    save(schema, executionDownload(schema), () => fetchArtifacts.download(projectId, runId, id));
  const readingFile = reading ? executionDownload(reading) : null;
  return (
    <div className="grid min-w-0 gap-4">
      {noResults && <NoResultsNotice message={noResultsMessage(noResults)} />}
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
                {reason && (
                  <p className="min-w-0 basis-full wrap-anywhere text-muted-foreground text-xs">{plainNote(reason)}</p>
                )}
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
              <li key={id} className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={() => setReading(schema)}>
                  <FileText data-icon="inline-start" /> {executionArtifacts[schema] ?? designLabel(schema)}
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={saving === schema}
                  title={`Download ${executionDownload(schema).label}`}
                  aria-label={`Download ${executionDownload(schema).label}`}
                  onClick={() => saveArtifact(schema, id)}
                >
                  <Download />
                </Button>
              </li>
            ))}
            {execution?.accepted && (
              <li className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={saving === "zip"}
                  aria-label={`Download ${RESEARCH_PACKAGE_ZIP.label}`}
                  onClick={() =>
                    save("zip", RESEARCH_PACKAGE_ZIP, () => fetchResearchPackage.exportZip(projectId, runId))
                  }
                >
                  <FileArchive data-icon="inline-start" />{" "}
                  {saving === "zip" ? "Preparing…" : RESEARCH_PACKAGE_ZIP.label}
                </Button>
              </li>
            )}
          </ul>
          <ReaderSheet
            title={reading && (executionArtifacts[reading] ?? designLabel(reading))}
            download={readingId ? fetchArtifacts.getDownloadUrl(projectId, runId, readingId) : ""}
            downloadLabel={readingFile ? `Download ${readingFile.label}` : "Download"}
            onDownload={reading && readingId ? () => saveArtifact(reading, readingId) : undefined}
            onClose={() => setReading(null)}
          >
            {readingId && (
              <FetchedDocument
                source={source}
                artifactId={readingId}
                json={(value) => {
                  const records = executionEvidence(value);
                  if (records.length)
                    return <ExecutionReadout records={records} hypotheses={hypotheses} adjustments={adjustments} />;
                  const figures = reading === RESULT_PACKAGE_SCHEMA ? packageFigures(value) : [];
                  return (
                    <div className="grid gap-4">
                      <PackageFigureCards figures={figures} />
                      <PrettyJson value={value} />
                    </div>
                  );
                }}
              />
            )}
          </ReaderSheet>
        </Pane>
      )}
      <Pane title="Program results">
        {evidenceId && evidence.isPending ? (
          <Skeleton className="h-24 w-full" aria-label="Loading evidence records" />
        ) : evidence.data?.length ? (
          <ExecutionReadout records={evidence.data} hypotheses={hypotheses} adjustments={adjustments} />
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

function NoResultsNotice({ message }: { message: string }) {
  return (
    <section
      role="alert"
      aria-label="No analysis was computed"
      className="flex items-start gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm"
    >
      <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-300" />
      <p className="min-w-0 wrap-anywhere">{message}</p>
    </section>
  );
}

/** Why n can differ from the pre-registration and from the Node's own row count. */
export const ROWS_NOTE =
  "n is rounded down to 10. The pre-registration count was the expected split at lock time, so it can differ from the rows used.";

const ROLE: Record<string, string> = {
  primary: "Main analysis",
  confirmatory: "Main analysis",
  main: "Main analysis",
  robustness: "Robustness check",
};

const roleLabel = (role: string) => ROLE[role] ?? designLabel(role);

const number = (value: number) => (Number.isInteger(value) ? String(value) : String(Number(value.toPrecision(4))));

/** The numbers of one analysis in a line: estimate with its metric, interval and sample size. */
export function estimateLine(row: EvidenceRecord) {
  if (typeof row.estimate !== "number") return null;
  const metric = typeof row.metric === "string" && row.metric ? ` (${row.metric})` : "";
  const parts = [`Estimate ${number(row.estimate)}${metric}`];
  if (typeof row.ci_low === "number" && typeof row.ci_high === "number")
    parts.push(`interval [${row.ci_low}, ${row.ci_high}]`);
  if (typeof row.n === "number") parts.push(`n = ${row.n.toLocaleString("en-US")}`);
  return parts.join(" · ");
}

/** Each analysis as a readable row: which hypothesis, what kind, the numbers, and what was decided. */
export function ExecutionReadout({
  records,
  hypotheses,
  adjustments,
}: {
  records: readonly EvidenceRecord[];
  hypotheses?: Readonly<Record<string, string | undefined>>;
  adjustments?: Readonly<Record<string, string | undefined>>;
}) {
  return (
    <div className="grid gap-3">
      {records.map((row) => {
        const statements = row.hypothesis_ids.map((id) => hypotheses?.[id]).filter(Boolean);
        const line = estimateLine(row);
        const adjusted = row.hypothesis_ids.map((id) => adjustments?.[id]).find(Boolean);
        return (
          <details key={row.record_id} open className="min-w-0 rounded-lg border">
            <summary className="cursor-pointer wrap-anywhere px-4 py-3 font-medium text-sm">
              {row.analysis_id} · {roleLabel(row.role)}
              {row.hypothesis_ids.length > 0 && (
                <span className="ml-2 text-muted-foreground">{row.hypothesis_ids.join(", ")}</span>
              )}
            </summary>
            {statements.length > 0 && (
              <p className="wrap-anywhere border-t px-4 pt-3 text-muted-foreground text-sm">{statements.join(" ")}</p>
            )}
            <p className="border-t px-4 pt-3 text-sm">
              {line ?? "No estimate was computed for this analysis."}
              {adjusted && row.role !== "robustness" && (
                <span className="block pt-1 text-muted-foreground text-xs">
                  <b className="font-medium text-foreground">{adjusted}</b>
                </span>
              )}
              {typeof row.n === "number" && (
                <span className="block pt-1 text-muted-foreground text-xs">{ROWS_NOTE}</span>
              )}
              <span className="block pt-1 text-muted-foreground text-xs">
                Decision: <b className="font-medium text-foreground">{designLabel(row.verdict)}</b>
                {typeof row.reason === "string" && row.reason ? ` · ${plainNote(row.reason)}` : ""}
              </span>
            </p>
            <ExecutionLayers
              layers={[
                [
                  typeof row.execution_status?.state === "string"
                    ? designLabel(row.execution_status.state)
                    : "Unavailable",
                  typeof row.execution_status?.reason === "string"
                    ? plainNote(row.execution_status.reason)
                    : typeof row.execution_status?.code === "string"
                      ? designLabel(row.execution_status.code)
                      : undefined,
                ],
                [designLabel(row.verdict), typeof row.reason === "string" ? plainNote(row.reason) : undefined],
                [
                  typeof row.assessment?.value === "string" ? designLabel(row.assessment.value) : "Unavailable",
                  typeof row.assessment?.reason === "string" ? plainNote(row.assessment.reason) : undefined,
                ],
              ]}
            />
          </details>
        );
      })}
    </div>
  );
}

const scalar = (value: unknown) => (value === null || value === undefined ? "-" : String(value));

/** Any other JSON file as nested labelled rows, not as a raw dictionary. */
export function PrettyJson({ value }: { value: unknown }) {
  if (Array.isArray(value))
    return (
      <ol className="grid gap-2">
        {value.map((item, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: a published list has no other identity
          <li key={index} className="rounded-lg border p-3">
            <PrettyJson value={item} />
          </li>
        ))}
      </ol>
    );
  if (value && typeof value === "object")
    return (
      <dl className="grid gap-x-3 gap-y-1.5 text-sm sm:grid-cols-[minmax(8rem,auto)_1fr]">
        {Object.entries(value).map(([key, item]) => (
          <div key={key} className="contents">
            <dt className="font-medium text-muted-foreground">{designLabel(key)}</dt>
            <dd className="min-w-0 wrap-anywhere">
              {item && typeof item === "object" ? <PrettyJson value={item} /> : scalar(item)}
            </dd>
          </div>
        ))}
      </dl>
    );
  return <span className="wrap-anywhere text-sm">{scalar(value)}</span>;
}
