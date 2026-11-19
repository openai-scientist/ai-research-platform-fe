"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "cn";
import { Check, ClipboardCheck, FileSpreadsheet, Flag, HardDrive, MousePointer2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { DataCardVariable, DatasetReviewFindings } from "@/lib/api/services/fetch-dataset-runs";
import type { DatasetVersionItem } from "@/lib/api/services/fetch-datasets";
import type { LocalNodeItem } from "@/lib/api/services/fetch-local-nodes";
import { activeAgent, type DatasetRunModel, REVIEW_KEY, type StepView } from "@/lib/run-stream/dataset-run-model";

import { AnimatedNumber } from "../run-studio/animated-number";
import { AgentAvatar } from "../run-studio/run-bits";
import { AGENTS } from "../run-studio/run-meta";
import { RUN_EASE } from "../run-studio/run-track";
import { Pane, PendingLines } from "../run-studio/scenes/scene-ui";
import { DatasetHandOffReview } from "./dataset-hand-off-review";
import { StepVisual } from "./dataset-run-visuals";

/** Seconds the long computation has run: the engine's last count plus the time since it arrived. */
export function useElapsed(progress: DatasetRunModel["progress"]) {
  const [, setTick] = useState(0);
  const seen = useRef({ progress, at: Date.now() });
  if (seen.current.progress !== progress) seen.current = { progress, at: Date.now() };
  useEffect(() => {
    if (!progress) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [progress]);
  return progress ? progress.seconds + Math.floor((Date.now() - seen.current.at) / 1000) : null;
}

interface Tone {
  label: string;
  chip: string;
  dot: string;
}

/** How a step reads on screen: its colour follows todo, now, then the item's own result. */
export function toneOf(step: StepView): Tone {
  if (step.state === "done")
    return { label: "Passed", chip: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500" };
  if (step.state === "asking")
    return { label: "Needs you", chip: "bg-amber-500/15 text-amber-800 dark:text-amber-300", dot: "bg-amber-500" };
  if (step.state === "now")
    return {
      label: step.item === "red" ? "Fixing" : "Working",
      chip: "bg-sky-500/12 text-sky-700 dark:text-sky-300",
      dot: "bg-sky-500",
    };
  if (step.needsYou)
    return { label: "Waits for you", chip: "bg-amber-500/15 text-amber-800 dark:text-amber-300", dot: "bg-amber-500" };
  if (step.item === "red")
    return { label: "Open", chip: "bg-rose-500/12 text-rose-700 dark:text-rose-300", dot: "bg-rose-500" };
  return { label: "Waiting", chip: "bg-muted text-muted-foreground", dot: "bg-muted-foreground/40" };
}

function Chip({ tone }: { tone: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1.5 whitespace-nowrap rounded-full px-2 font-medium text-[11px]",
        tone.chip,
      )}
    >
      <span className={cn("size-1.5 rounded-full", tone.dot)} />
      {tone.label}
    </span>
  );
}

/** The step the stage is on, large: what code found, what the steward does about it, and what it waits for. */
function FocusStep({
  step,
  model,
  live,
  current,
  version,
  variables,
  node,
  local,
}: {
  step: StepView;
  model: DatasetRunModel;
  live: boolean;
  current: boolean;
  version: DatasetVersionItem | undefined;
  variables: DataCardVariable[] | undefined;
  node: LocalNodeItem | undefined;
  local: boolean;
}) {
  const elapsed = useElapsed(current ? model.progress : null);
  const tone = toneOf(step);
  const working = live && current && step.state === "now";
  const actor = live && current ? activeAgent(model, false) : null;
  const pointer = actor === "steward" || actor === "reviewer" ? AGENTS[actor] : null;
  return (
    <Pane
      title={
        <span className="flex items-center gap-2.5">
          {working ? (
            <Spinner className="size-4 text-sky-500" />
          ) : (
            <span className={cn("size-2.5 rounded-full", tone.dot)} />
          )}
          {step.title}
        </span>
      }
      aside={<Chip tone={tone} />}
    >
      <p className="text-muted-foreground text-sm">{step.explain}</p>
      <div className="mt-3 grid gap-3 text-sm">
        <StepVisual step={step} version={version} variables={variables} node={node} localWork={local && working} />
        {step.needsYou && step.key !== "release" && step.state !== "done" && (
          <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-amber-800 text-xs dark:text-amber-300">
            This waits for you: only you can say which columns answer your question and what the sources are.
          </p>
        )}
        {model.progress && current && (
          <div role="status" className="flex items-center gap-2.5 rounded-lg bg-muted/50 px-3 py-2">
            <Spinner className="size-4" />
            <span className="min-w-0 flex-1 truncate">{model.progress.text.replace(/:\s*\d+ s( so far)?$/, "")}</span>
            <span className="font-mono text-muted-foreground text-xs tabular-nums">
              <AnimatedNumber value={elapsed ?? model.progress.seconds} /> s so far
            </span>
            <AgentAvatar agent="code" size="sm" />
          </div>
        )}
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground text-xs">
          <span className="font-mono">{step.key}</span>·
          {step.tokens ? (
            <span className="tabular-nums">
              <AnimatedNumber value={step.tokens} /> tokens · AI
            </span>
          ) : (
            <span>Code check · no AI</span>
          )}
          {pointer && (
            <span
              data-dataset-agent
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-medium",
                pointer.soft,
                pointer.text,
              )}
            >
              <MousePointer2 aria-hidden="true" className="size-3" />
              {pointer.name}
            </span>
          )}
        </p>
      </div>
    </Pane>
  );
}

/** The steps as one line each; click one to look at it in the scene. */
function Checklist({
  steps,
  shownKey,
  onView,
}: {
  steps: StepView[];
  shownKey: string | undefined;
  onView(key: string): void;
}) {
  return (
    <ul aria-label="All checks" className="divide-y">
      {steps.map((step) => {
        const tone = toneOf(step);
        const quiet = step.state === "todo" && !step.needsYou && step.item !== "red";
        return (
          <motion.li key={step.key} layout="position" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            <button
              type="button"
              onClick={() => onView(step.key)}
              aria-current={step.key === shownKey ? "true" : undefined}
              className={cn(
                "flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] outline-none transition-colors hover:bg-muted/50 focus-visible:bg-muted/50",
                step.key === shownKey && "bg-muted/60",
                quiet && "text-muted-foreground",
              )}
            >
              <span className="grid size-4 shrink-0 place-items-center">
                {step.state === "done" ? (
                  <Check className="size-3.5 text-emerald-600" strokeWidth={3} />
                ) : step.state === "asking" || step.needsYou ? (
                  <Flag className="size-3.5 text-amber-600" />
                ) : (
                  <span
                    className={cn(
                      "size-2 rounded-full",
                      tone.dot,
                      step.state === "now" && "animate-pulse motion-reduce:animate-none",
                    )}
                  />
                )}
              </span>
              <span className="min-w-0 flex-1 truncate">{step.title}</span>
              <Chip tone={tone} />
            </button>
          </motion.li>
        );
      })}
    </ul>
  );
}

/** The scene of the Dataset stage: the step it is on, the checks around it, and the review. */
export function DatasetRunScene({
  steps,
  model,
  dataset,
  version,
  local,
  focusKey,
  live,
  onView,
  variables,
  node,
  showLocalProgress,
  findings,
  waitingForAccept,
}: {
  steps: StepView[];
  model: DatasetRunModel;
  dataset: { name: string };
  version: DatasetVersionItem | undefined;
  local: boolean;
  focusKey: string | null;
  live: boolean;
  onView(key: string | null): void;
  variables?: DataCardVariable[];
  node?: LocalNodeItem;
  showLocalProgress?: boolean;
  findings?: DatasetReviewFindings;
  waitingForAccept?: boolean;
}) {
  const items = steps.filter((s) => s.gate !== true || s.key === "release");
  const done = steps.filter((s) => s.state === "done").length;
  const current = steps.find((s) => s.state === "now" || s.state === "asking");
  const recordedReview = Boolean(model.review ?? model.reviewResult);
  const reviewStep = steps.find((s) => s.key === REVIEW_KEY);
  const shown = steps.find((s) => s.key === focusKey) ?? current ?? (recordedReview ? reviewStep : undefined);
  const started = Object.keys(model.items).length > 0 || model.releaseWait || model.published || Boolean(shown);
  return (
    <div className="flex flex-col gap-4">
      <Pane
        title={
          <span className="flex min-w-0 items-center gap-2">
            <FileSpreadsheet className="size-4 shrink-0 text-muted-foreground" />
            <span className="wrap-anywhere">{dataset.name}</span>
          </span>
        }
        aside={version && `v${version.version_number}`}
      >
        <dl className="flex flex-wrap items-baseline gap-x-6 gap-y-2 border-t pt-3">
          <div>
            <dt className="text-[11px] text-muted-foreground">Rows</dt>
            <dd className="font-mono font-semibold text-sm tabular-nums">
              {version ? `${local ? "~" : ""}${version.row_count.toLocaleString("en-US")}` : "–"}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-muted-foreground">Columns</dt>
            <dd className="font-mono font-semibold text-sm tabular-nums">{version?.column_names.length ?? "–"}</dd>
          </div>
          <div>
            <dt className="text-[11px] text-muted-foreground">Checked</dt>
            <dd className="font-mono font-semibold text-sm tabular-nums">
              <AnimatedNumber value={done} />/{steps.length}
            </dd>
          </div>
          {local && <dt className="sr-only">Row storage</dt>}
          {local && (
            <dd className="flex items-center gap-1 text-muted-foreground text-xs sm:ml-auto">
              <HardDrive aria-hidden="true" className="size-3.5" />
              <span>Rows stay on the Local Node</span>
            </dd>
          )}
        </dl>
      </Pane>

      {!started ? (
        <Pane
          title={
            <span className="flex items-center gap-2">
              <ClipboardCheck className="size-4 text-muted-foreground" />
              What the steward settles
            </span>
          }
          aside="Code checks each item"
        >
          <p className="mb-3 text-muted-foreground text-sm">
            {model.progress?.text ??
              (showLocalProgress
                ? "Your Local Node is preparing the dataset checks. Results will appear here as they arrive."
                : "Waiting for the first check from the engine.")}
          </p>
          {!showLocalProgress && <PendingLines lines={3} />}
        </Pane>
      ) : (
        <>
          {shown && (
            <div id="dataset-focused-step" className="flex flex-col gap-1.5">
              {focusKey && shown !== current && (
                <Button variant="ghost" size="xs" className="w-fit" onClick={() => onView(null)}>
                  Back to the current step
                </Button>
              )}
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={shown.key}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.45, ease: RUN_EASE }}
                >
                  {shown.key === REVIEW_KEY ? (
                    <Pane
                      title={shown.title}
                      aside={
                        shown.state === "done" ? (
                          <Badge variant="secondary">Step complete</Badge>
                        ) : (
                          <Chip tone={toneOf(shown)} />
                        )
                      }
                    >
                      <DatasetHandOffReview
                        model={model}
                        findings={findings}
                        waitingForAccept={Boolean(waitingForAccept)}
                        reviewing={shown.state === "now"}
                      />
                    </Pane>
                  ) : (
                    <FocusStep
                      step={shown}
                      model={model}
                      live={live}
                      current={shown === current}
                      version={version}
                      variables={variables}
                      node={node}
                      local={local}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          )}
          <Pane
            title={
              <span className="flex items-center gap-2">
                <ClipboardCheck className="size-4 text-muted-foreground" />
                Dataset checks
              </span>
            }
            aside={`${done} of ${steps.length} steps done`}
          >
            <Checklist steps={items} shownKey={shown?.key} onView={onView} />
          </Pane>
        </>
      )}
    </div>
  );
}
