"use client";

import { type ReactNode, useEffect, useState } from "react";

import { cn } from "cn";
import { Coins, Hourglass, type LucideIcon, OctagonAlert, OctagonX, RefreshCw, RotateCcw } from "lucide-react";
import { motion } from "motion/react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApiMutation } from "@/hooks/use-api";
import { useProjectDetailQuery } from "@/hooks/use-projects-query";
import { useAbandonRunMutation, useRunDetailQuery } from "@/hooks/use-runs-query";
import { projectKeys } from "@/lib/api/query-keys";
import { fetchRuns, type RunItem } from "@/lib/api/services/fetch-runs";
import { getProjectAccess } from "@/lib/auth/project-access";
import { isActiveRun } from "@/lib/research-workspace";
import { type RunSession, useRunStudio } from "@/lib/run-stream/run-store";
import { RunStatus } from "@/types/enums";

import { perform } from "../workspace-ui";
import { compactNumber } from "./run-stats";

/** The time left until `at`, as "0:42"; null once it has passed. */
function useCountdown(at?: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!at) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [at]);
  if (!at) return null;
  const left = Math.round((new Date(at).getTime() - now) / 1000);
  if (left <= 0) return null;
  return `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
}

const TONE = {
  sky: { tile: "bg-sky-500/15 text-sky-700 dark:text-sky-300", strip: "bg-sky-500/6" },
  amber: { tile: "bg-amber-500/15 text-amber-700 dark:text-amber-300", strip: "bg-amber-500/7" },
  rose: { tile: "bg-rose-500/12 text-rose-700 dark:text-rose-300", strip: "bg-rose-500/6" },
};

function Bar({
  icon: Icon,
  tone,
  spin,
  title,
  text,
  meta,
  children,
}: {
  icon: LucideIcon;
  tone: keyof typeof TONE;
  spin?: boolean;
  title: string;
  text: string;
  meta?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <motion.section
      role="status"
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={cn("overflow-hidden border-b", TONE[tone].strip)}
    >
      <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center md:px-8">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", TONE[tone].tile)}>
            <Icon className={cn("size-4.5", spin && "[animation-duration:2.4s] motion-safe:animate-spin")} />
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <b className="font-semibold text-sm">{title}</b>
            <span className="text-pretty text-muted-foreground text-xs leading-snug">{text}</span>
            {meta && <span className="text-[11px] text-muted-foreground tabular-nums">{meta}</span>}
          </span>
        </div>
        {children && (
          <div className="flex shrink-0 flex-wrap items-center gap-2 max-sm:justify-end max-sm:[&>button]:flex-1">
            {children}
          </div>
        )}
      </div>
    </motion.section>
  );
}

/** A raise that goes well past what the run used: half as much again, rounded to a hundred thousand tokens. */
function suggestedBudget(run: RunItem) {
  const base = Math.max(run.token_budget ?? 0, run.tokens_used ?? 0);
  return Math.ceil((base * 1.5) / 100_000) * 100_000;
}

function RaiseBudget({ run, onRaised }: { run: RunItem; onRaised(): void }) {
  const [value, setValue] = useState(() => String(suggestedBudget(run)));
  const raise = useApiMutation(
    (budget: number) => fetchRuns.raiseBudget(run.project_id, run.id, budget),
    [projectKeys.run(run.project_id, run.id), projectKeys.detail(run.project_id)],
  );
  const budget = Number(value);
  const valid = Number.isInteger(budget) && budget > Math.max(run.token_budget ?? 0, run.tokens_used ?? 0);
  return (
    <ConfirmDialog
      title="Raise the token budget"
      description={`The run used ${compactNumber(run.tokens_used ?? 0)} of its ${compactNumber(run.token_budget ?? 0)} tokens. A higher budget lets it go on from where it stopped.`}
      confirmLabel={valid ? `Raise to ${compactNumber(budget)}` : "Raise budget"}
      disabled={!valid || raise.isPending}
      onConfirm={() =>
        void perform(
          async () => {
            await raise.mutateAsync(budget);
            onRaised();
          },
          `Budget raised to ${compactNumber(budget)} tokens.`,
        )
      }
      trigger={
        <Button size="sm">
          <Coins />
          Raise budget
        </Button>
      }
    >
      <div className="flex flex-col gap-1.5 text-sm">
        <label htmlFor="run-budget" className="font-medium">
          New budget, in tokens
        </label>
        <Input
          id="run-budget"
          type="number"
          inputMode="numeric"
          min={0}
          step={100_000}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="tabular-nums"
        />
        <span className="text-muted-foreground text-xs">
          {valid ? `${compactNumber(budget)} tokens in all.` : "Above what the run has used."}
        </span>
      </div>
    </ConfirmDialog>
  );
}

function AbandonRun({ run, label }: { run: RunItem; label: string }) {
  const abandon = useAbandonRunMutation(run.project_id, run.id);
  return (
    <ConfirmDialog
      title={`Abandon ${label}?`}
      description="The run ends here as failed, so the project can start another. What it produced so far stays on record."
      confirmLabel="Abandon run"
      destructive
      disabled={abandon.isPending}
      onConfirm={() => void perform(() => abandon.mutateAsync(), `Run ${label} abandoned.`)}
      trigger={
        <Button size="sm" variant="ghost" disabled={abandon.isPending}>
          <OctagonX />
          Abandon
        </Button>
      }
    />
  );
}

/**
 * What the run needs to go on when it cannot by itself: it is trying a failed stage again, waits for a rerun or a
 * larger budget, or has gone quiet. The Platform's own reading of the run (`recovery`) decides what shows.
 */
export function RecoveryBar({ session }: { session: RunSession }) {
  const { projectId, runId, state, label } = session;
  const follow = useRunStudio((s) => s.follow);
  const query = useRunDetailQuery(projectId, runId, { enabled: session.pipeline });
  const project = useProjectDetailQuery(projectId).data?.data;
  const access = project ? getProjectAccess(project.my_role, project.status) : null;
  const run = query.data?.data;
  const recovery = run?.recovery;
  const countdown = useCountdown(recovery?.state === "healing" ? recovery.next_try_at : null);
  const rerun = useApiMutation((fresh: boolean) =>
    fetchRuns.rerunStage(projectId, runId, run?.current_stage?.stage_run_id ?? "", fresh),
  );
  const sync = useApiMutation(() => fetchRuns.sync(projectId, runId), [projectKeys.run(projectId, runId)]);

  // What the run says about itself changes with its events: read it again then.
  const { refetch } = query;
  const changed = `${state.lifecycle}|${state.failure ?? ""}|${state.stalled ?? ""}`;
  useEffect(() => {
    void changed;
    if (session.pipeline) void refetch();
  }, [changed, session.pipeline, refetch]);

  const goOn = () => {
    follow(runId);
    void refetch();
  };

  if (!session.pipeline || !run || state.gate) return null;
  const canWrite = Boolean(access?.canWrite);
  // Only a run that still holds the project can be abandoned: one in progress, or stopped on its budget.
  const holds = isActiveRun(run.status) || run.status === RunStatus.BudgetExceeded;
  const abandon = access?.canManage && holds ? <AbandonRun run={run} label={label} /> : null;

  if (recovery?.state === "healing")
    return (
      <Bar
        icon={RefreshCw}
        spin
        tone="sky"
        title="Trying again by itself"
        text={recovery.reason}
        meta={
          recovery.attempt && recovery.max_attempts
            ? `Try ${recovery.attempt} of ${recovery.max_attempts}${countdown ? ` · next try in ${countdown}` : ""}`
            : undefined
        }
      />
    );

  if (recovery?.state === "needs_you" && recovery.action === "raise_budget")
    return (
      <Bar icon={Coins} tone="amber" title="The run is out of tokens" text={recovery.reason}>
        {abandon}
        {canWrite && <RaiseBudget run={run} onRaised={goOn} />}
      </Bar>
    );

  if (recovery?.state === "needs_you" && recovery.action === "rerun" && run.current_stage)
    return (
      <Bar icon={OctagonAlert} tone="rose" title="The stage stopped" text={recovery.reason}>
        {abandon}
        {canWrite && (
          <>
            <Button
              size="sm"
              variant="outline"
              disabled={rerun.isPending}
              title="Start the stage from its first step"
              onClick={() =>
                void perform(async () => {
                  await rerun.mutateAsync(true);
                  goOn();
                }, "Stage started over.")
              }
            >
              Start over
            </Button>
            <Button
              size="sm"
              disabled={rerun.isPending}
              title="Start the stage again, keeping the steps that finished"
              onClick={() =>
                void perform(async () => {
                  await rerun.mutateAsync(false);
                  goOn();
                }, "Stage started again.")
              }
            >
              <RotateCcw />
              {rerun.isPending ? "Starting…" : "Rerun the stage"}
            </Button>
          </>
        )}
      </Bar>
    );

  if (state.stalled !== undefined && state.lifecycle === "running")
    return (
      <Bar
        icon={Hourglass}
        tone="amber"
        title={`No news from the engine for ${state.stalled} minutes`}
        text="It may still be working on a long step. Checking asks the engine where it is; a run it lost is marked so you can rerun it."
      >
        {abandon}
        {canWrite && (
          <Button
            size="sm"
            disabled={sync.isPending}
            onClick={() =>
              void perform(async () => {
                await sync.mutateAsync();
                goOn();
              }, "Checked with the engine.")
            }
          >
            <RefreshCw className={cn(sync.isPending && "animate-spin")} />
            {sync.isPending ? "Checking…" : "Check on it"}
          </Button>
        )}
      </Bar>
    );

  return null;
}
