"use client";

import { type ReactNode, useState } from "react";

import { AnimatePresence, MotionConfig } from "motion/react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import type { ReviewMode } from "@/lib/run-stream/contract";
import type { RunDisplayStatus } from "@/lib/run-stream/selectors";

import { LocalNodeWaitBanner, SupersededDatasetBanner } from "../run-studio/local-node-status";
import { RunHeader } from "../run-studio/run-header";
import { DatasetNowCard, DatasetRunAside } from "./dataset-run-aside";
import { DatasetRunTrack } from "./dataset-run-track";
import { type DatasetStage, DatasetStageScene } from "./dataset-stage-scene";

export function DatasetRunFrame({
  stage,
  label,
  back,
  actions,
  question,
  status,
  mode,
  overlay,
  projectId,
  datasetId,
  runId,
  selectionKey,
}: {
  stage?: DatasetStage;
  label: string;
  back: ReactNode;
  actions?: ReactNode;
  question?: string;
  status?: RunDisplayStatus;
  mode?: ReviewMode;
  overlay?: ReactNode;
  projectId?: string;
  datasetId?: string;
  runId?: string;
  selectionKey?: string;
}) {
  const [asideOpen, setAsideOpen] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selection, setSelection] = useState<{ scope?: string; step: string } | null>(null);
  const focusKey = selection?.scope === selectionKey ? (selection?.step ?? null) : null;
  const setFocusKey = (step: string | null) => setSelection(step ? { scope: selectionKey, step } : null);
  const nodeWait = status === "paused" && (stage?.model.pauseReason ?? "runner_offline") === "runner_offline";
  return (
    <MotionConfig reducedMotion="user">
      <section aria-label={`Dataset run ${label}`} className="fixed inset-0 z-50 flex flex-col bg-background">
        <RunHeader
          back={back}
          label={label}
          question={question}
          status={status}
          mode={mode}
          asideOpen={asideOpen}
          onToggleAside={() => setAsideOpen((open) => !open)}
          actions={actions}
        />

        {!stage ? (
          <div className="p-6">
            <Skeleton className="h-40 w-full" aria-label="Loading the run" />
          </div>
        ) : (
          <>
            <DatasetRunTrack
              steps={stage.steps}
              ended={stage.ended}
              viewKey={focusKey}
              onView={setFocusKey}
              liveFill={Math.min(85, 30 + (stage.model.progress?.seconds ?? 0))}
            />
            {nodeWait && <LocalNodeWaitBanner state={{ lifecycle: "paused", pauseReason: "runner_offline" }} />}
            <SupersededDatasetBanner
              state={{
                dataset_superseded: stage.model.superseded ? true : undefined,
                superseded_by_version: stage.model.superseded?.by,
              }}
            />
            <div className={`grid min-h-0 flex-1 grid-cols-1 ${asideOpen ? "lg:grid-cols-[minmax(0,1fr)_352px]" : ""}`}>
              <div className="relative flex min-h-0 min-w-0 flex-col">
                <div className="border-b px-4 py-2.5 lg:hidden">
                  <DatasetNowCard model={stage.model} steps={stage.steps} status={stage.status} compact typing />
                  <Button variant="ghost" size="xs" className="mt-1.5" onClick={() => setDetailsOpen(true)}>
                    Steps and activity
                  </Button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <div className="px-4 pt-5 pb-24 md:px-8">
                    <DatasetStageScene
                      projectId={projectId}
                      datasetId={datasetId}
                      runId={runId}
                      question={question === "Dataset stage" ? undefined : question}
                      stage={stage}
                      focusKey={focusKey}
                      onView={setFocusKey}
                    />
                  </div>
                </div>
                <AnimatePresence>{overlay}</AnimatePresence>
              </div>
              {asideOpen && (
                <aside className="min-h-0 border-l bg-sidebar max-lg:hidden">
                  <DatasetRunAside
                    model={stage.model}
                    steps={stage.steps}
                    status={stage.status}
                    local={stage.local}
                    focusKey={focusKey}
                    onView={setFocusKey}
                    typing
                  />
                </aside>
              )}
            </div>
            <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
              <SheetContent side="bottom" className="p-0 data-[side=bottom]:h-[80dvh]">
                <SheetHeader className="sr-only">
                  <SheetTitle>Steps and activity</SheetTitle>
                </SheetHeader>
                <DatasetRunAside
                  model={stage.model}
                  steps={stage.steps}
                  status={stage.status}
                  local={stage.local}
                  focusKey={focusKey}
                  onView={(step) => {
                    setFocusKey(step);
                    setDetailsOpen(false);
                  }}
                  typing
                />
              </SheetContent>
            </Sheet>
          </>
        )}
      </section>
    </MotionConfig>
  );
}
