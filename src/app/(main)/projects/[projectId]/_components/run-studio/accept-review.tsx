"use client";

import { type ReactNode, useEffect, useState } from "react";

import { cn } from "cn";
import { ArrowRight, Check, Sparkles, TriangleAlert, Undo2 } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { Gate, GateAnswer, NoveltyCheck, ReviewFinding } from "@/lib/run-stream/contract";
import {
  EXECUTION_RECORDS,
  EXECUTION_STAGE,
  executionNoResults,
  type NoResults,
  noResultsMessage,
} from "@/lib/run-stream/execution";
import { plainNote } from "@/lib/run-stream/plain-notes";
import type { DraftState, HypothesizeContent } from "@/lib/run-stream/run-state";
import { type StageChoice, stageChoices } from "@/lib/run-stream/stage-choices";

import { NoteField, useConsultations } from "./charter-panel";
import { CitedText } from "./cite";
import { PiAdviceCard } from "./pi-advice";
import { useRedoBlocked } from "./redo-execution";
import { recordNotice, useExecutionEvidence } from "./scenes/execution-scene";
import { FINDING_SEVERITY, findingTarget } from "./scenes/findings";
import { useWorkspace } from "./workspace-context";

const NOVELTY: Record<NonNullable<NoveltyCheck["verdict"]>, { label: string; className: string }> = {
  new: { label: "Nothing found that tests it", className: "bg-emerald-500/12 text-emerald-800 dark:text-emerald-300" },
  related: { label: "Related work, not yet tested", className: "bg-sky-500/12 text-sky-800 dark:text-sky-300" },
  tested: { label: "Already tested elsewhere", className: "bg-rose-500/12 text-rose-800 dark:text-rose-300" },
};

/** What the PI would do instead of accepting, as a headline. */
const ACTION: Record<string, string> = {
  refine: "The PI would revise the hypotheses first",
  pivot: "The PI would change direction",
  rerun: "The PI would run the stage again",
  stop: "The PI would stop the run",
};

/** The latest round of hypotheses: their drafts and what the reviewer found in them. */
function useLatestRound() {
  const { state } = useWorkspace();
  const key = state.stageOrder.findLast((k) => state.stages[k]?.content.stage === "hypothesize");
  const content = key ? state.stages[key].content : undefined;
  return content?.stage === "hypothesize" ? (content as HypothesizeContent) : null;
}

/** The hypotheses the PI picked, when its result names them. */
function usePiPick(consultationId?: string) {
  const { session } = useWorkspace();
  const canRefetch = Boolean(session.projectId && consultationId);
  // The list may have been read before the PI gave this advice: read it again until the advice is in it.
  const query = useConsultations({
    refetchInterval: (q) =>
      consultationId && !q.state.data?.data.some((c) => c.id === consultationId && c.result?.decision) ? 3000 : false,
  });
  const { refetch } = query;
  useEffect(() => {
    if (canRefetch) void refetch();
  }, [canRefetch, refetch]);
  if (!consultationId) return null;
  const decision = query.data?.data.find((c) => c.id === consultationId)?.result?.decision as
    | { selection?: { hypothesis_ids?: string[] } }
    | null
    | undefined;
  return decision?.selection?.hypothesis_ids ?? null;
}

function FindingCounts({ findings }: { findings: ReviewFinding[] }) {
  if (!findings.length)
    return (
      <span className="inline-flex items-center gap-1 text-emerald-700 text-xs dark:text-emerald-300">
        <Check className="size-3" />
        No open findings
      </span>
    );
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2.5 text-muted-foreground text-xs">
      {(Object.keys(FINDING_SEVERITY) as ReviewFinding["severity"][]).map((s) => {
        const n = findings.filter((f) => f.severity === s).length;
        if (!n) return null;
        return (
          <span key={s} className="inline-flex items-center gap-1.5 tabular-nums">
            <i className={cn("size-1.5 rounded-full", FINDING_SEVERITY[s].dot)} />
            {n} {FINDING_SEVERITY[s].label.toLowerCase()}
          </span>
        );
      })}
    </span>
  );
}

/** One hypothesis to take forward or leave out: what it claims, when it is wrong, and how it stands. */
function HypothesisPick({
  id,
  label,
  draft,
  falsify,
  fromArtifact,
  findings,
  picked,
  piLeavesOut,
  onToggle,
}: {
  id: string;
  label: string;
  draft?: DraftState;
  falsify?: string;
  fromArtifact?: boolean;
  findings: ReviewFinding[];
  picked: boolean;
  piLeavesOut: boolean;
  onToggle(): void;
}) {
  const h = draft?.hypothesis;
  const falsifier = h?.falsify?.text ?? falsify;
  const novelty = draft?.novelty?.verdict ? NOVELTY[draft.novelty.verdict] : null;
  return (
    <motion.li layout>
      <label
        htmlFor={`accept-${id}`}
        className={cn(
          "grid cursor-pointer grid-cols-[auto_minmax(0,1fr)] gap-x-3 rounded-xl border px-3.5 py-3 transition-[background-color,border-color,opacity] hover:bg-muted/50",
          picked ? "border-foreground/15 bg-card" : "border-foreground/15 border-dashed opacity-60",
        )}
      >
        <Checkbox id={`accept-${id}`} checked={picked} onCheckedChange={onToggle} className="mt-0.5" />
        <span className="flex min-w-0 flex-col gap-1.5">
          <span className="flex flex-wrap items-center gap-2">
            <b
              className={cn(
                "inline-flex h-5 items-center rounded-md px-1.5 font-mono font-semibold text-[11px] transition-colors",
                picked ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              {id}
            </b>
            {!h && !fromArtifact && (
              <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
                <Sparkles className="size-3" />
                Kept by you at the last stop
              </span>
            )}
            {piLeavesOut && (
              <span className="rounded-full bg-muted px-2 py-px font-medium text-[11px] text-muted-foreground">
                The PI would leave it out
              </span>
            )}
          </span>
          <span
            title={h?.statement ?? label}
            className={cn("line-clamp-3 text-pretty text-sm leading-snug", !picked && "line-through")}
          >
            <CitedText text={h?.statement ?? label} />
          </span>
          {falsifier && (
            <span className="line-clamp-2 text-muted-foreground text-xs leading-snug">
              <b className="font-medium text-foreground/70">Wrong if </b>
              <CitedText text={falsifier.replace(/^(the (claim|hypothesis) is )?wrong if:?\s*/i, "")} />
            </span>
          )}
          {h && (
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5">
              <FindingCounts findings={findings} />
              {novelty && (
                <span className={cn("rounded-full px-2 py-px font-medium text-[11px]", novelty.className)}>
                  {novelty.label}
                </span>
              )}
            </span>
          )}
        </span>
      </label>
    </motion.li>
  );
}

type AcceptReviewProps = {
  gate: Gate;
  header: ReactNode;
  pending: boolean;
  onAnswer(answer: GateAnswer): void;
  documentPreview?: ReactNode;
};

/** A finished stage with a selectable hypothesis set, or a stage review with no selection. */
export function AcceptReview(props: AcceptReviewProps) {
  if (props.gate.selection !== undefined) return <HypothesisAcceptReview {...props} />;
  return props.gate.stageKey === EXECUTION_STAGE ? (
    <ExecutionAcceptReview {...props} />
  ) : (
    <StageAcceptReview {...props} />
  );
}

/** Execution's review: reads what Execution produced, so it can say so when nothing was computed. */
function ExecutionAcceptReview(props: AcceptReviewProps) {
  const { session, state } = useWorkspace();
  const content = state.stages[EXECUTION_STAGE]?.content;
  const execution = content?.stage === "interpret" ? content.execution : undefined;
  const evidence = useExecutionEvidence(session.projectId, state.runId, execution?.artifacts[EXECUTION_RECORDS]);
  const redoBlocked = useRedoBlocked(session.projectId, state.runId);
  return (
    <StageAcceptReview
      {...props}
      noResults={executionNoResults(execution, evidence.data)}
      claimNotice={evidence.data?.map(recordNotice).find(Boolean) ?? undefined}
      sendBackBlocked={redoBlocked}
    />
  );
}

/** What the researcher may answer, each as a button, with the reason beside any that cannot be used. */
function StageChoices({
  choices,
  note,
  pending,
  onChoose,
}: {
  choices: StageChoice[];
  note: string;
  pending: boolean;
  onChoose(choice: StageChoice): void;
}) {
  const [asked, setAsked] = useState<string | null>(null);
  return (
    <>
      <ul aria-label="Your answer" className="grid gap-2">
        {choices.map((choice) => {
          const reasonId = `choice-${choice.id}-reason`;
          return (
            <li
              key={choice.id}
              className={cn(
                "grid gap-1 rounded-xl border px-3.5 py-3 text-sm",
                choice.primary && "border-foreground/30 bg-card",
              )}
            >
              <span className="flex flex-wrap items-center justify-between gap-2">
                <span className="grid min-w-0 gap-0.5">
                  <b className="font-semibold">{choice.label}</b>
                  {choice.description && <span className="text-muted-foreground text-xs">{choice.description}</span>}
                  {choice.disabledReason ? (
                    <span id={reasonId} className="text-amber-800 text-xs dark:text-amber-300">
                      {choice.disabledReason}
                    </span>
                  ) : (
                    choice.leadsTo && (
                      <span className="flex items-center gap-1 text-xs">
                        <ArrowRight aria-hidden className="size-3 text-muted-foreground" />
                        {choice.leadsTo}
                      </span>
                    )
                  )}
                </span>
                <Button
                  size="sm"
                  variant={choice.primary ? "default" : "outline"}
                  aria-describedby={choice.disabledReason ? reasonId : undefined}
                  disabled={pending || Boolean(choice.disabledReason) || (choice.needsNote && !note.trim())}
                  onClick={() => {
                    setAsked(choice.id);
                    onChoose(choice);
                  }}
                >
                  {choice.id === "send_back" ? <Undo2 /> : <Check />}
                  {pending && asked === choice.id ? "Sending…" : choice.confirmLabel}
                </Button>
              </span>
              {choice.needsNote && !choice.disabledReason && !note.trim() && (
                <span className="text-muted-foreground text-xs">Write what should change in the note first.</span>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}

function StageAcceptReview({
  gate,
  header,
  pending,
  onAnswer,
  documentPreview,
  noResults = null,
  claimNotice,
  sendBackBlocked = null,
}: AcceptReviewProps & { noResults?: NoResults | null; sendBackBlocked?: string | null; claimNotice?: string }) {
  const [note, setNote] = useState("");
  const choices = stageChoices(gate, { noResults: Boolean(noResults), sendBackBlocked });
  const several = choices.length > 1;
  const acceptingDataset = gate.stageKey === "dataset";
  const lockingDesign = gate.stageKey === "experiment_design" && choices.some((choice) => choice.id === "accept");
  const subject = gate.title.replace(/^Accept the /i, "");
  const advice = gate.advice;
  let headline = "";
  if (advice) {
    headline =
      advice.action === "accept"
        ? `The PI recommends accepting the ${subject}`
        : `The PI's recommendation for the ${subject}`;
  }

  const reviewContext = (
    <div className="grid gap-2">
      {gate.why && <p className="text-muted-foreground text-sm">{plainNote(gate.why)}</p>}
      {claimNotice && <p className="text-muted-foreground text-sm">{claimNotice}</p>}
      {gate.summary.length > 0 && (
        <ul className="flex flex-col gap-1.5 text-sm">
          {gate.summary.map((line) => (
            <li key={line} className="flex items-start gap-2">
              <Check className="mt-1 size-3.5 shrink-0 text-emerald-600" />
              {plainNote(line)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <>
      <div className="flex flex-col gap-4 overflow-y-auto px-5 pt-4.5 pb-5 sm:px-6">
        {header}
        {noResults && (
          <section
            role="alert"
            aria-label="No analysis was computed"
            className="flex items-start gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3.5 py-3 text-sm"
          >
            <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-300" />
            <p className="min-w-0 wrap-anywhere">{noResultsMessage(noResults)}</p>
          </section>
        )}
        {acceptingDataset && (
          <section aria-label="What to review" className="grid gap-2 rounded-lg border bg-muted/35 p-3">
            <h4 className="font-semibold text-sm">What you’re accepting</h4>
            {reviewContext}
          </section>
        )}
        {documentPreview}
        {!acceptingDataset && reviewContext}
        {advice && <PiAdviceCard advice={advice} headline={headline} />}
        {several && (
          <StageChoices choices={choices} note={note} pending={pending} onChoose={(choice) => answer(choice)} />
        )}
        <NoteField value={note} onChange={setNote} />
      </div>
      <footer
        className={cn(
          "flex flex-wrap items-center justify-end gap-2.5 border-t px-5 py-3.5 sm:px-6 max-sm:[&>button]:flex-1",
          acceptingDataset ? "border-primary/20 bg-primary/5" : "bg-popover",
        )}
      >
        <span
          className={cn("mr-auto text-muted-foreground text-xs", lockingDesign ? "max-sm:w-full" : "max-sm:hidden")}
        >
          {acceptingDataset && "Next: Hypothesis uses this Data card."}
          {lockingDesign && "Check the main analysis and the margin. Once you lock the plan, they cannot change."}
          {!acceptingDataset &&
            !lockingDesign &&
            (choices[0]?.id === "send_back" ? "Send the design back for another pass." : "Accept to continue the run.")}
        </span>
        {!several &&
          choices.map((choice) => (
            <Button
              key={choice.id}
              size={acceptingDataset ? "lg" : "default"}
              variant={choice.primary || !noResults ? "default" : "outline"}
              onClick={() => answer(choice)}
              disabled={pending || Boolean(choice.disabledReason)}
            >
              {choice.id === "send_back" ? <Undo2 /> : <Check />}
              {pending ? (choice.id === "send_back" ? "Sending…" : "Accepting…") : choice.confirmLabel || "Accept"}
            </Button>
          ))}
      </footer>
    </>
  );

  function answer(choice: StageChoice) {
    if (choice.needsNote && !note.trim()) return;
    onAnswer({ option_id: choice.id, ...(note.trim() ? { note: note.trim() } : {}) });
  }
}

/** The last stop of the run: pick the hypotheses it ends with, with the PI's advice beside you. */
function HypothesisAcceptReview({ gate, header, pending, onAnswer }: AcceptReviewProps) {
  const round = useLatestRound();
  const selection = gate.selection ?? [];
  const [left, setLeft] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const piPick = usePiPick(gate.advice?.consultationId);
  const picked = selection.filter((s) => !left.includes(s.id));
  const findingsOf = (id: string) => (round?.findings ?? []).filter((f) => findingTarget(f.locator).id === id);
  const toggle = (id: string) => {
    if (left.includes(id)) setLeft(left.filter((x) => x !== id));
    else if (picked.length <= 1) toast.error("Keep at least one hypothesis.");
    else setLeft([...left, id]);
  };
  const piLeft = piPick ? selection.map((s) => s.id).filter((id) => !piPick.includes(id)) : null;
  const followsPi = piLeft !== null && piLeft.length === left.length && piLeft.every((id) => left.includes(id));
  const advice = gate.advice;
  const sendBack = gate.options.find((option) => option.id === "send_back" && !option.disabled);
  // The PI's advice picks the primary answer: anything but accepting points to sending it back.
  const piPrefersSendBack = Boolean(sendBack && advice && advice.action !== "accept");
  const headline = !advice
    ? ""
    : advice.action === "accept" && selection.length
      ? piPick && piPick.length < selection.length
        ? `The PI recommends accepting ${piPick.length} of ${selection.length}`
        : `The PI recommends accepting ${selection.length === 1 ? "it" : `all ${selection.length}`}`
      : (ACTION[advice.action] ?? "The PI's view");

  return (
    <>
      <div className="flex flex-col gap-4 overflow-y-auto px-5 pt-4.5 pb-5 sm:px-6">
        {header}
        <p className="text-muted-foreground text-sm">{gate.why}</p>
        {advice && (
          <PiAdviceCard
            advice={advice}
            headline={headline}
            action={
              piLeft !== null &&
              piLeft.length > 0 && (
                <Button size="sm" variant="outline" disabled={followsPi} onClick={() => setLeft(piLeft)}>
                  {followsPi ? "Following the PI" : "Use the PI's pick"}
                </Button>
              )
            }
          />
        )}
        <div className="flex items-baseline justify-between gap-2">
          <h4 className="font-semibold text-sm">Take forward</h4>
          <span className="flex items-center gap-3 text-muted-foreground text-xs tabular-nums">
            {selection.length > 0 && `${picked.length} of ${selection.length} picked`}
            {left.length > 0 && (
              <button
                type="button"
                onClick={() => setLeft([])}
                className="font-medium underline-offset-4 hover:text-foreground hover:underline"
              >
                Pick all
              </button>
            )}
          </span>
        </div>
        {!selection.length && (
          <p className="text-muted-foreground text-sm" role="status">
            {gate.selectionPending ? "Loading published hypotheses…" : "No published hypotheses to pick."}
          </p>
        )}
        <ul className="flex flex-col gap-2">
          {selection.map((item) => (
            <HypothesisPick
              key={item.id}
              id={item.id}
              label={item.label}
              draft={round?.drafts[item.id]}
              falsify={item.falsify}
              fromArtifact={item.fromArtifact}
              findings={findingsOf(item.id)}
              picked={!left.includes(item.id)}
              piLeavesOut={Boolean(piLeft?.includes(item.id))}
              onToggle={() => toggle(item.id)}
            />
          ))}
        </ul>
        <NoteField value={note} onChange={setNote} />
      </div>
      <footer className="flex flex-wrap items-center justify-end gap-2.5 border-t bg-popover px-5 py-3.5 sm:px-6 max-sm:[&>button]:flex-1">
        <span className="mr-auto text-muted-foreground text-xs max-sm:hidden">
          {left.length ? `${left.length} left out, kept on record.` : "Nothing runs until you answer."}
        </span>
        {sendBack && (
          <div className="grid w-full gap-1 sm:w-auto sm:justify-items-end">
            <Button
              variant={piPrefersSendBack ? "default" : "outline"}
              disabled={pending || !note.trim()}
              onClick={() => onAnswer({ option_id: "send_back", note: note.trim() })}
            >
              <Undo2 />
              {sendBack.confirm_label || "Send back"}
            </Button>
            {!note.trim() && (
              <span className="text-muted-foreground text-xs">Write what should change in the note first.</span>
            )}
          </div>
        )}
        <Button
          variant={piPrefersSendBack ? "outline" : "default"}
          onClick={() =>
            onAnswer({
              option_id: "accept",
              ...(left.length ? { dropped: left } : {}),
              ...(note.trim() ? { note: note.trim() } : {}),
            })
          }
          disabled={pending || !picked.length}
        >
          <Check />
          {pending ? "Accepting…" : picked.length ? `Accept ${picked.length}` : "Accept"}
        </Button>
      </footer>
    </>
  );
}
