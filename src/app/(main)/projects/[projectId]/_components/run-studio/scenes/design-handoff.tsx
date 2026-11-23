"use client";

import { type ReactNode, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { cn } from "cn";
import {
  ArrowRight,
  ChevronRight,
  CircleCheck,
  Download,
  Eye,
  FileText,
  HardDrive,
  Lock,
  RotateCcw,
  TriangleAlert,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { fetchArtifacts } from "@/lib/api/services/fetch-artifacts";
import {
  DESIGN_DIAGNOSIS,
  DESIGN_DOCUMENTS,
  DESIGN_PLAN,
  DESIGN_REVIEW,
  DESIGN_SAP,
  type DesignArtifact,
  type DesignContent,
} from "@/lib/run-stream/experiment-design";

import { DesignMarkdown } from "./design-markdown";
import { designLockSummary, type LockHypothesis, splitDesignFiles } from "./design-summary";
import { designView, fieldRows } from "./experiment-design-view";
import { bySeverity, FINDING_SEVERITY, findingTarget } from "./findings";
import { Pane } from "./scene-ui";

type Source = { projectId: string; runId: string };
type Documents = NonNullable<DesignContent["documents"]>;

const [EXPERIMENT_PLAN, PREREGISTRATION] = DESIGN_DOCUMENTS;

const KEY_BLURB: Record<string, string> = {
  [DESIGN_PLAN]: "The study design, hypothesis by hypothesis",
  [DESIGN_SAP]: "The statistical analysis you are locking",
  [EXPERIMENT_PLAN]: "The statistical analysis you are locking",
  [DESIGN_REVIEW]: "What the independent reviewer found",
  [DESIGN_DIAGNOSIS]: "Power and false-positive checks before execution",
  [PREREGISTRATION]: "What is fixed before any result is seen",
};

const keyTitle = (file: DesignArtifact) => (file.schema === EXPERIMENT_PLAN ? "Statistical analysis plan" : file.label);
const localSource = (design: DesignContent, file: DesignArtifact) => design.documents?.[file.schema as keyof Documents];

const NOT_RECORDED = <span className="text-muted-foreground text-xs">Not recorded</span>;

function SummaryRow({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <div className="grid gap-x-3 gap-y-0.5 py-1.5 sm:grid-cols-[10rem_minmax(0,1fr)]">
      <dt className="text-muted-foreground text-xs sm:pt-0.5">{label}</dt>
      <dd className="min-w-0 break-words text-sm leading-snug">{children || NOT_RECORDED}</dd>
    </div>
  );
}

function HypothesisLock({ row }: { row: LockHypothesis }) {
  return (
    <li className="rounded-lg border bg-card px-3 py-2.5">
      <p className="flex items-start gap-2">
        <Badge variant="outline" className="mt-0.5 shrink-0 font-mono">
          {row.id}
        </Badge>
        <span className="min-w-0 break-words text-sm leading-snug">{row.claim ?? "Hypothesis statement pending"}</span>
      </p>
      <dl className="mt-1.5 divide-y divide-dashed">
        <SummaryRow label="Main analysis">
          {[row.estimand, row.method].filter(Boolean).join(" · ") || undefined}
        </SummaryRow>
        <SummaryRow label="Decision rule">{row.decision}</SummaryRow>
        <SummaryRow label="Smallest effect that matters">
          {row.margin && (
            <>
              <b className="font-semibold tabular-nums">{row.margin}</b>
              {row.marginSource && <span className="text-muted-foreground"> · {row.marginSource}</span>}
            </>
          )}
        </SummaryRow>
        <SummaryRow label="Robustness checks">
          {row.robustness > 0 ? (
            `${row.robustness} planned`
          ) : (
            <span className="text-muted-foreground">None planned</span>
          )}
        </SummaryRow>
        <SummaryRow label="Design diagnosis">{row.diagnosis}</SummaryRow>
      </dl>
    </li>
  );
}

function LockSummary({ design }: { design: DesignContent }) {
  const summary = designLockSummary(design);
  const { findings } = summary;
  const warned = findings.blocking + findings.major;
  const counts = [
    findings.blocking > 0 && `${findings.blocking} blocking`,
    findings.major > 0 && `${findings.major} major`,
    findings.minor > 0 && `${findings.minor} minor`,
  ].filter(Boolean);
  return (
    <section aria-labelledby="lock-summary" className="flex w-full flex-col gap-2.5">
      <h4 id="lock-summary" className="font-semibold text-sm">
        What you are locking
      </h4>
      <dl>
        <SummaryRow label="Research question">{summary.question}</SummaryRow>
      </dl>
      {summary.hypotheses.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {summary.hypotheses.map((row) => (
            <HypothesisLock key={row.id} row={row} />
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">No hypothesis designs are written yet.</p>
      )}
      <div
        className={cn(
          "flex items-start gap-2 rounded-lg border px-3 py-2 text-sm",
          findings.blocking > 0
            ? "border-rose-500/40 bg-rose-500/8"
            : warned > 0
              ? "border-amber-500/40 bg-amber-500/8"
              : "bg-muted/35",
        )}
      >
        {warned > 0 && <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />}
        <p className="leading-snug">
          <b className="font-semibold">Review findings</b> ·{" "}
          {findings.total === 0 ? "none recorded" : counts.join(", ")}
          {warned > 0 && " · read them before you accept"}
        </p>
      </div>
    </section>
  );
}

function isPreviewable(file: DesignArtifact, design: DesignContent) {
  return (
    Boolean(localSource(design, file)) ||
    [DESIGN_PLAN, DESIGN_REVIEW, DESIGN_DIAGNOSIS, DESIGN_SAP].includes(file.schema) ||
    Boolean(file.contentType?.includes("markdown"))
  );
}

function FindingList({ design }: { design: DesignContent }) {
  if (!design.findings.length) return <p className="text-muted-foreground text-sm">No findings recorded.</p>;
  return (
    <ul className="flex flex-col gap-3 text-sm">
      {[...design.findings].sort(bySeverity).map((finding) => {
        const tone = FINDING_SEVERITY[finding.severity] ?? FINDING_SEVERITY.minor;
        const { field } = findingTarget(finding.locator);
        return (
          <li key={finding.finding_id} className={cn("flex flex-col gap-0.5 border-l-2 pl-3", tone.bar)}>
            <span className="text-xs">
              <b className={cn("font-semibold", tone.text)}>{tone.label}</b>
              {field && <span className="text-muted-foreground"> · {field}</span>}
            </span>
            <p className="leading-snug">{finding.issue}</p>
            {finding.suggestion && (
              <p className="text-muted-foreground text-xs leading-snug">Suggested: {finding.suggestion}</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function PlanReading({ design }: { design: DesignContent }) {
  const hypotheses = Object.values(design.hypotheses);
  if (!hypotheses.length)
    return <p className="text-muted-foreground text-sm">No hypothesis designs are written yet.</p>;
  return (
    <div className="flex flex-col gap-5">
      {hypotheses.map((hypothesis) => {
        const view = designView(hypothesis);
        const sections: [string, readonly (readonly [string, string])[]][] = [
          ["What the study estimates", view.estimandRows],
          ["Study protocol", fieldRows(hypothesis.protocol)],
          ["Robustness checks", view.robustness],
        ];
        return (
          <section key={hypothesis.id} className="flex flex-col gap-3">
            <h4 className="text-sm">
              <b className="font-mono font-semibold">{hypothesis.id}</b> · {hypothesis.statement ?? "Statement pending"}
            </h4>
            {sections.map(([title, rows]) =>
              rows.some(([, text]) => text) ? (
                <div key={title}>
                  <h5 className="mb-1 font-medium text-muted-foreground text-xs">{title}</h5>
                  <dl className="divide-y divide-dashed">
                    {rows.map(([label, text]) =>
                      text ? (
                        <SummaryRow key={label} label={label}>
                          {text}
                        </SummaryRow>
                      ) : null,
                    )}
                  </dl>
                </div>
              ) : null,
            )}
          </section>
        );
      })}
    </div>
  );
}

function DiagnosisReading({ design }: { design: DesignContent }) {
  const rows = Object.values(design.hypotheses).flatMap((hypothesis) => {
    const view = designView(hypothesis);
    return view.metrics.length ? [{ id: hypothesis.id, view }] : [];
  });
  if (!rows.length) return <p className="text-muted-foreground text-sm">Not computed yet.</p>;
  return (
    <div className="flex flex-col gap-4">
      {rows.map(({ id, view }) => (
        <section key={id}>
          <h4 className="mb-1.5 font-mono font-semibold text-sm">{id}</h4>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
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
          {view.rule.detectable !== undefined && (
            <p className="mt-2 text-muted-foreground text-xs">
              Smallest effect it can detect · {view.rule.detectable} {view.rule.unit}
            </p>
          )}
        </section>
      ))}
    </div>
  );
}

const unavailable = (
  <p className="text-muted-foreground text-sm">This file cannot be previewed here. Download it to read it.</p>
);

function FetchedDocument({ file, source }: { file: DesignArtifact; source: Source }) {
  const query = useQuery({
    queryKey: ["design-document", source.runId, file.id],
    queryFn: async ({ signal }) =>
      (await fetchArtifacts.download(source.projectId, source.runId, file.id, signal)).blob.text(),
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  });
  if (query.isPending) return <p className="text-muted-foreground text-sm">Loading the document…</p>;
  // A structured file is not a document: no raw JSON on screen.
  if (query.isError || !query.data || /^\s*[[{]/.test(query.data)) return unavailable;
  return <DesignMarkdown source={query.data} />;
}

function DocumentBody({ file, design, source }: { file: DesignArtifact; design: DesignContent; source: Source }) {
  const local = localSource(design, file);
  if (local) return <DesignMarkdown source={local} />;
  if (file.schema === DESIGN_REVIEW) return <FindingList design={design} />;
  if (file.schema === DESIGN_PLAN) return <PlanReading design={design} />;
  if (file.schema === DESIGN_DIAGNOSIS) return <DiagnosisReading design={design} />;
  return isPreviewable(file, design) ? <FetchedDocument file={file} source={source} /> : unavailable;
}

/** Opens beside the gate. Closing it only closes the reader: the gate keeps its answer and its place. */
function DocumentReader({
  file,
  design,
  source,
  onClose,
}: {
  file: DesignArtifact | null;
  design: DesignContent;
  source: Source;
  onClose(): void;
}) {
  return (
    <Sheet open={file !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-2xl">
        {file && (
          <>
            <SheetHeader className="border-b pr-12">
              <SheetTitle>{keyTitle(file)}</SheetTitle>
              <SheetDescription>Close this to go back to your decision. Nothing is answered here.</SheetDescription>
              <Button asChild size="sm" variant="outline" className="mt-1 w-fit">
                <a href={fetchArtifacts.getDownloadUrl(source.projectId, source.runId, file.id)} download>
                  <Download data-icon="inline-start" />
                  Download
                </a>
              </Button>
            </SheetHeader>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <DocumentBody file={file} design={design} source={source} />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function KeyDocuments({
  files,
  heading,
  onOpen,
}: {
  files: DesignArtifact[];
  heading: string;
  onOpen(file: DesignArtifact): void;
}) {
  if (!files.length) return null;
  return (
    <section aria-labelledby="key-documents" className="flex w-full flex-col gap-2">
      <h4 id="key-documents" className="font-semibold text-sm">
        {heading}
      </h4>
      <ul className="grid gap-2 sm:grid-cols-2">
        {files.map((file) => (
          <li key={file.id}>
            <button
              type="button"
              onClick={() => onOpen(file)}
              className="group flex w-full items-center gap-3 rounded-lg border bg-card px-3 py-2.5 text-left outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <FileText aria-hidden className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-sm">{keyTitle(file)}</span>
                <span className="block text-muted-foreground text-xs leading-snug">{KEY_BLURB[file.schema]}</span>
              </span>
              <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SupportingFiles({
  files,
  design,
  source,
  onOpen,
}: {
  files: DesignArtifact[];
  design: DesignContent;
  source: Source;
  onOpen(file: DesignArtifact): void;
}) {
  if (!files.length) return null;
  return (
    <details className="w-full rounded-lg border bg-card">
      <summary className="cursor-pointer rounded-lg px-3 py-2.5 font-medium text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
        Supporting files <span className="font-normal text-muted-foreground">· {files.length}</span>
      </summary>
      <ul className="divide-y divide-dashed border-t">
        {files.map((file) => (
          <li key={file.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
            <span className="min-w-0 flex-1">{file.label}</span>
            {isPreviewable(file, design) && (
              <Button size="sm" variant="ghost" onClick={() => onOpen(file)} aria-label={`Preview ${file.label}`}>
                <Eye data-icon="inline-start" />
                Preview
              </Button>
            )}
            <Button asChild size="sm" variant="ghost">
              <a
                href={fetchArtifacts.getDownloadUrl(source.projectId, source.runId, file.id)}
                download
                aria-label={`Download ${file.label}`}
              >
                <Download data-icon="inline-start" />
                Download
              </a>
            </Button>
          </li>
        ))}
      </ul>
    </details>
  );
}

export function DesignHandoff({
  local,
  accepted = false,
  blocked = false,
  design,
  projectId,
  runId,
  detailed = false,
  onShowGate,
  onExecution,
}: {
  local: boolean;
  accepted?: boolean;
  blocked?: boolean;
  design?: DesignContent;
  projectId?: string;
  runId?: string;
  /** Inside the gate: what is being locked, and the documents to read first. */
  detailed?: boolean;
  onShowGate?(): void;
  onExecution?(): void;
}) {
  const [reading, setReading] = useState<DesignArtifact | null>(null);
  const source = { projectId: projectId ?? "", runId: runId ?? "" };
  const groups = splitDesignFiles(design?.artifacts);
  const readable = Boolean(design && detailed && projectId && runId);
  return (
    <Pane
      title={
        <span className="flex flex-wrap items-center gap-2">
          {blocked ? (
            <Lock className="size-4 text-muted-foreground" />
          ) : accepted ? (
            <CircleCheck className="size-4 text-emerald-600" />
          ) : (
            <FileText className="size-4" />
          )}
          {blocked ? "Plan lock missing" : accepted ? "Analysis plan accepted" : "Analysis plan ready for review"}
          {!blocked && (
            <>
              <ArrowRight className="size-4 text-muted-foreground" />
              <span>{accepted && !onExecution ? "Waiting for Execution" : "Execution"}</span>
            </>
          )}
        </span>
      }
      aside={blocked ? "Execution blocked" : "Stage hand-off"}
    >
      <div className="flex flex-col items-start gap-3 text-sm">
        {blocked && <p>Execution cannot start until the analysis plan is locked.</p>}
        {readable && design && !blocked && <LockSummary design={design} />}
        {readable && design && (
          <>
            <KeyDocuments
              files={groups.key}
              heading={blocked ? "Plan documents" : "Read before you accept"}
              onOpen={setReading}
            />
            <SupportingFiles files={groups.supporting} design={design} source={source} onOpen={setReading} />
          </>
        )}
        {blocked && <Badge variant="outline">Plan lock missing</Badge>}
        {!readable && !blocked && groups.key.length + groups.supporting.length > 0 && (
          <p className="text-muted-foreground">The documents are listed above on this page.</p>
        )}
        {local && (
          <p className="flex items-center gap-2 text-muted-foreground">
            <HardDrive className="size-4 shrink-0" />
            Execution runs on your Local Node.
          </p>
        )}
        {onShowGate && (
          <Button size="sm" onClick={onShowGate}>
            {blocked ? <RotateCcw data-icon="inline-start" /> : <ArrowRight data-icon="inline-start" />}
            {blocked ? "Review and send back" : "Review hand-off"}
          </Button>
        )}
        {accepted && onExecution && (
          <Button size="sm" onClick={onExecution}>
            Open Execution <ArrowRight data-icon="inline-end" />
          </Button>
        )}
      </div>
      {readable && design && (
        <DocumentReader file={reading} design={design} source={source} onClose={() => setReading(null)} />
      )}
    </Pane>
  );
}
