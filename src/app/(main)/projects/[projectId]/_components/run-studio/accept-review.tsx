"use client";

import { type ReactNode, useEffect, useState } from "react";

import { cn } from "cn";
import { Check, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { Gate, GateAnswer, NoveltyCheck, ReviewFinding } from "@/lib/run-stream/contract";
import type { DraftState, HypothesizeContent } from "@/lib/run-stream/run-state";

import { NoteField, useConsultations } from "./charter-panel";
import { CitedText } from "./cite";
import { PiAdviceCard } from "./pi-advice";
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
  // The list may have been read before the PI gave this advice: read it again until the advice is in it.
  const query = useConsultations({
    refetchInterval: (q) =>
      consultationId && !q.state.data?.data.some((c) => c.id === consultationId && c.result?.decision) ? 3000 : false,
  });
  const { refetch } = query;
  useEffect(() => {
    if (consultationId) void refetch();
  }, [consultationId, refetch]);
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
  findings,
  picked,
  piLeavesOut,
  onToggle,
}: {
  id: string;
  label: string;
  draft?: DraftState;
  findings: ReviewFinding[];
  picked: boolean;
  piLeavesOut: boolean;
  onToggle(): void;
}) {
  const h = draft?.hypothesis;
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
            {!h && (
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
          {h?.falsify?.text && (
            <span className="line-clamp-2 text-muted-foreground text-xs leading-snug">
              <b className="font-medium text-foreground/70">Wrong if </b>
              <CitedText text={h.falsify.text.replace(/^(the (claim|hypothesis) is )?wrong if:?\s*/i, "")} />
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

/** The last stop of the run: pick the hypotheses it ends with, with the PI's advice beside you. */
export function AcceptReview({
  gate,
  header,
  pending,
  onAnswer,
}: {
  gate: Gate;
  header: ReactNode;
  pending: boolean;
  onAnswer(answer: GateAnswer): void;
}) {
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
  const headline = !advice
    ? ""
    : advice.action === "accept"
      ? piPick && piPick.length < selection.length
        ? `The PI recommends accepting ${piPick.length} of ${selection.length}`
        : `The PI recommends accepting ${selection.length === 1 ? "it" : `all ${selection.length}`}`
      : (ACTION[advice.action] ?? "The PI's view");

  return (
    <>
      <div className="flex flex-col gap-4 overflow-y-auto px-5 pt-4.5 pb-5 sm:px-6">
        {header}
        <p className="text-muted-foreground text-sm">
          The hypotheses and their argument map are published. Accepting ends the run with the ones you pick; the rest
          stay on record.
        </p>
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
            {picked.length} of {selection.length} picked
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
        <ul className="flex flex-col gap-2">
          {selection.map((item) => (
            <HypothesisPick
              key={item.id}
              id={item.id}
              label={item.label}
              draft={round?.drafts[item.id]}
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
        <Button
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
          {pending ? "Accepting…" : `Accept ${picked.length}`}
        </Button>
      </footer>
    </>
  );
}
