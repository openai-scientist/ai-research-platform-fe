"use client";

import { type ReactNode, useState } from "react";

import { FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useApiQuery } from "@/hooks/use-api";
import { describePackage, fetchResearchPackage } from "@/lib/api/services/fetch-research-package";
import { ApiError } from "@/types/api";

import { packageKey, ResultsReport } from "./results-report";

const POLL_MS = 10_000;

/**
 * Puts the results report beside the Execution stage. Once the stage has delivered, it asks the Platform for the run's
 * package: a bar offers the report when one exists, and opening it swaps the stage view for the report until "Back to
 * live". While the Platform has no package yet (it builds one after Execution is accepted) nothing is shown.
 */
export function ExecutionResults({
  projectId,
  runId,
  delivered,
  children,
}: {
  projectId: string;
  runId: string;
  /** Deliver is recorded, or the run has finished. */
  delivered: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const manifest = useApiQuery(
    packageKey(projectId, runId),
    async (signal) => (await fetchResearchPackage.getManifest(projectId, runId, signal)).data,
    {
      enabled: delivered && Boolean(projectId && runId),
      silentErrorCodes: ["NOT_FOUND"],
      refetchInterval: (query) =>
        query.state.error instanceof ApiError && query.state.error.status === 404 ? POLL_MS : false,
    },
  );
  const pack = manifest.data;
  if (open && pack) return <ResultsReport projectId={projectId} runId={runId} onBack={() => setOpen(false)} />;
  const outcome = pack ? describePackage(pack.summary) : null;
  return (
    <>
      {pack && outcome && (
        <div className="mb-4 flex flex-wrap items-center gap-2.5 rounded-xl bg-emerald-500/8 px-4 py-2.5 text-sm ring-1 ring-emerald-600/20">
          <FileText aria-hidden className="size-4 text-emerald-700 dark:text-emerald-300" />
          <span className="min-w-0">
            <b className="font-semibold">Results report ready.</b>{" "}
            <span className="text-muted-foreground">
              {outcome.label} · {pack.summary.length} {pack.summary.length === 1 ? "hypothesis" : "hypotheses"}
            </span>
          </span>
          <Button size="xs" className="ml-auto" onClick={() => setOpen(true)}>
            Open results report
          </Button>
        </div>
      )}
      {children}
    </>
  );
}
