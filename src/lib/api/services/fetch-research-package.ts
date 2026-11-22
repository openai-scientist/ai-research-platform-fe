import type { ApiResult } from "@/types/api";

import apiService from "../core";
import { downloadUrl, requestDownload, runPath } from "../request";
import type { FileDownload } from "../types";

/** One hypothesis as the package manifest summarises it. Numbers are null while nothing was computed. */
export interface PackageHypothesis {
  hypothesis_id: string | null;
  statement: string | null;
  exposure: string[];
  outcome: string[];
  family: string | null;
  covariates: string[];
  margin: number | null;
  direction: string | null;
  rows_used: number | null;
  estimate: number | null;
  ci_low: number | null;
  ci_high: number | null;
  p: number | null;
  execution_status: string | null;
  verdict: string | null;
  claim_assessment: { value: string | null; codes: string[] };
  next_step: string | null;
  freshness: string | null;
  second_computation: string | null;
}

/** The manifest of a run's research package (`GET …/research-package`). */
export interface ResearchPackage {
  schema: string;
  package_hash: string;
  pinned: Record<string, unknown>;
  files: { path: string; schema: string; size_bytes: number; media_type: string }[];
  inputs: Record<string, unknown>[];
  summary: PackageHypothesis[];
  decisions: Record<string, unknown>[];
  open_questions: { question: string; owner: string; source: string }[];
  generated_at?: string | null;
}

export type ResearchPackageResponse = ApiResult<ResearchPackage>;
export type ReportFormat = "markdown" | "html";

const packagePath = (projectId: string, runId: string) => `${runPath(projectId, runId)}/research-package`;

export const fetchResearchPackage = {
  /** A 404 means Execution has not been accepted, so there is no package yet. */
  getManifest: async (projectId: string, runId: string, signal?: AbortSignal): Promise<ResearchPackageResponse> => {
    const response = await apiService.get<ResearchPackageResponse>(packagePath(projectId, runId), undefined, {
      signal,
    });
    return response.data;
  },
  /** The report as one self-contained HTML page (figures inline) or as Markdown. */
  getReport: async (
    projectId: string,
    runId: string,
    format: ReportFormat = "html",
    signal?: AbortSignal,
  ): Promise<string> => {
    const response = await apiService.get<string>(
      `${packagePath(projectId, runId)}/report`,
      { format },
      { responseType: "text", signal },
    );
    return response.data;
  },
  /** The package as a zip: manifest, report, figures as SVG files, references. */
  exportZip: (projectId: string, runId: string, signal?: AbortSignal): Promise<FileDownload> =>
    requestDownload(`${packagePath(projectId, runId)}/export`, signal),
  getExportUrl: (projectId: string, runId: string): string => downloadUrl(`${packagePath(projectId, runId)}/export`),
};

export type PackageState = "partial" | "blocked";

export interface PackageOutcome {
  state: PackageState;
  /** Logos's own word for the package, with what it means: "Partial · has verdicts". */
  label: string;
  /** One plain sentence for the package as a whole. */
  headline: string;
  /** One line on what the status word means. */
  explain: string;
  /** Hypotheses with no estimate, each with the reason the manifest gives. */
  withoutEstimate: { label: string; reason: string }[];
}

const REASONS: Record<string, string> = {
  not_computed: "it was not computed",
  blocked: "the run was blocked before it",
  failed: "the analysis failed",
  withheld: "the result was withheld by the release rules",
};

const reasonWords = (code: string | null) =>
  code ? (REASONS[code] ?? `its status is ${code.replaceAll("_", " ")}`) : "no result was recorded";

const hasVerdict = (row: PackageHypothesis) => Boolean(row.verdict) && row.verdict !== "not_computed";

/**
 * Says what the package is, with the word Logos gives it: partial whenever the package carries verdicts, blocked when
 * it carries none. The manifest has no status field, so it is derived the same way. Nothing is filled in for a
 * missing number.
 */
export function describePackage(summary: readonly PackageHypothesis[]): PackageOutcome {
  const withoutEstimate = summary
    .filter((row) => typeof row.estimate !== "number")
    .map((row) => ({
      label: row.hypothesis_id ?? "A hypothesis",
      reason: reasonWords(row.execution_status ?? row.verdict),
    }));
  if (!summary.some(hasVerdict)) {
    return {
      state: "blocked",
      label: "Blocked · no verdicts",
      headline: summary.length === 0 ? "The package holds no hypotheses." : "No hypothesis has a verdict yet.",
      explain:
        "Logos marks a package blocked when it carries no verdicts. Only the design and the data parts can be read.",
      withoutEstimate,
    };
  }
  const names = withoutEstimate.map((row) => row.label).join(", ");
  return {
    state: "partial",
    label: "Partial · has verdicts",
    headline: withoutEstimate.length
      ? `${names} has no estimate. The rest of the report stands.`
      : "Every hypothesis has an estimate and a verdict.",
    explain:
      "Logos marks a package partial whenever it carries verdicts. A verdict is not yet an answer: each card says what it supports.",
    withoutEstimate,
  };
}
