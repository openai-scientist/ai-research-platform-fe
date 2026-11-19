import type { DatasetReviewFindings } from "@/lib/api/services/fetch-dataset-runs";
import type { DatasetRunModel } from "@/lib/run-stream/dataset-run-model";

import { FINDING_SEVERITY } from "../run-studio/scenes/findings";

export function DatasetHandOffReview({
  model,
  findings,
  waitingForAccept,
  reviewing,
}: {
  model: DatasetRunModel;
  findings?: DatasetReviewFindings;
  waitingForAccept: boolean;
  reviewing: boolean;
}) {
  const result = model.reviewResult;
  const round = result?.round ?? model.review?.round;
  const summary = model.review?.round === round ? model.review : null;
  const passed = findings?.passed ?? result?.passed;
  const total = findings?.findings.length ?? summary?.findings;
  const blocking =
    findings?.findings.filter((finding) => finding.severity === "blocking" && finding.open !== false).length ??
    summary?.blocking;
  let verdict: string | undefined;
  if (result?.error) verdict = "The independent review did not finish.";
  else if (passed === true || (blocking === 0 && passed !== false)) verdict = "No findings block the hand-off.";
  else if (blocking) verdict = `${blocking} blocking ${blocking === 1 ? "finding" : "findings"} recorded.`;
  else if (passed === false) verdict = "The independent review flagged issues.";
  return (
    <div className="flex flex-col gap-2 text-sm">
      {waitingForAccept && <p className="font-medium">Waiting for you: accept the data card</p>}
      {round !== undefined && (
        <p className="text-muted-foreground">
          Independent review · Round {round}
          {total !== undefined && (
            <>
              {" "}
              · {total} {total === 1 ? "finding" : "findings"}
            </>
          )}
        </p>
      )}
      {verdict && <p>{verdict}</p>}
      {!verdict && total === undefined && !waitingForAccept && (
        <p className="text-muted-foreground">
          {reviewing ? "Review in progress." : "No review result was recorded for this step."}
        </p>
      )}
      {findings && findings.findings.length > 0 && (
        <ul aria-label="Reviewer findings" className="grid gap-2">
          {findings.findings.map((finding) => (
            <li key={finding.finding_id} className="grid gap-1 rounded-md border p-2.5">
              <span className="font-medium text-muted-foreground text-xs">
                {FINDING_SEVERITY[finding.severity]?.label ?? finding.severity}
                {finding.open === false && " · Resolved"}
              </span>
              <p className="wrap-anywhere">{finding.issue}</p>
              {finding.suggestion && (
                <p className="wrap-anywhere text-muted-foreground text-xs">{finding.suggestion}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
