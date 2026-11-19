"use client";

import type { ReactNode } from "react";

import { PanelRight, Square } from "lucide-react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useApiMutation } from "@/hooks/use-api";
import { useProjectDetailQuery } from "@/hooks/use-projects-query";
import { projectKeys } from "@/lib/api/query-keys";
import { fetchRuns } from "@/lib/api/services/fetch-runs";
import { getProjectAccess } from "@/lib/auth/project-access";
import type { ReviewMode } from "@/lib/run-stream/contract";
import { SHOW_REVIEW_MODE } from "@/lib/run-stream/features";
import type { RunDisplayStatus } from "@/lib/run-stream/selectors";

import { perform } from "../workspace-ui";
import { StatusPill } from "./run-bits";
import { MODES } from "./run-meta";

export function RunHeader({
  back,
  label,
  question,
  status,
  mode,
  actions,
  asideOpen,
  onToggleAside,
}: {
  back: ReactNode;
  label: string;
  question?: string | null;
  status?: RunDisplayStatus;
  mode?: ReviewMode;
  actions?: ReactNode;
  asideOpen: boolean;
  onToggleAside(): void;
}) {
  return (
    <header className="flex min-h-14 flex-wrap items-center gap-x-2.5 gap-y-1.5 border-b px-3 py-2 md:flex-nowrap md:pr-4">
      {back}
      <Separator orientation="vertical" className="h-5 max-md:hidden" />
      <div className="flex min-w-0 flex-1 items-baseline gap-2.5">
        <b className="whitespace-nowrap font-mono font-semibold text-sm">{label}</b>
        <span className="truncate text-muted-foreground text-sm max-md:hidden">{question}</span>
      </div>
      {status && <StatusPill status={status} />}
      {SHOW_REVIEW_MODE && mode && (
        <span className="whitespace-nowrap text-muted-foreground text-xs max-lg:hidden">
          Review mode <b className="font-medium text-foreground">{MODES[mode].label}</b>
        </span>
      )}
      <div className={actions ? "flex items-center gap-2 max-md:w-full max-md:justify-between" : "max-lg:hidden"}>
        {actions}
        <Button
          variant="ghost"
          size="icon-sm"
          className="max-lg:hidden"
          onClick={onToggleAside}
          aria-pressed={asideOpen}
          aria-label="Show or hide the side panel"
        >
          <PanelRight />
        </Button>
      </div>
    </header>
  );
}

export function StopRun({
  projectId,
  runId,
  label,
  description = "The stage running now is cancelled. What finished stays, and you can rerun the stage later to go on.",
}: {
  projectId: string;
  runId: string;
  label: string;
  description?: string;
}) {
  const project = useProjectDetailQuery(projectId).data?.data;
  const stop = useApiMutation(() => fetchRuns.stop(projectId, runId), [projectKeys.run(projectId, runId)]);
  if (!project || !getProjectAccess(project.my_role, project.status).canWrite) return null;
  return (
    <ConfirmDialog
      title={`Stop ${label}?`}
      description={description}
      confirmLabel="Stop run"
      destructive
      disabled={stop.isPending}
      onConfirm={() => void perform(() => stop.mutateAsync(), `Run ${label} stopped.`)}
      trigger={
        <Button variant="outline" size="sm" disabled={stop.isPending} title="Stop this run">
          <Square />
          {stop.isPending ? "Stopping…" : "Stop"}
        </Button>
      }
    />
  );
}
