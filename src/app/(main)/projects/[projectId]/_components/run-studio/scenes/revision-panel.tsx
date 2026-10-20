"use client";

import { useState } from "react";

import { cn } from "cn";
import { Check, ChevronDown, ChevronUp, GitCompareArrows, type LucideIcon, MessageSquareQuote, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Button } from "@/components/ui/button";
import { useApiQuery } from "@/hooks/use-api";
import { fetchArtifacts } from "@/lib/api/services/fetch-artifacts";
import type { ReviewFinding } from "@/lib/run-stream/contract";
import {
  compareHypothesis,
  diffWords,
  type FieldChange,
  type HypothesisText,
  overlap,
  parseHypotheses,
  sidesOfPatch,
} from "@/lib/run-stream/revision";

import { WorkOrb } from "../run-bits";
import { useWorkspace } from "../workspace-context";
import { bySeverity, FINDING_SEVERITY, findingTarget } from "./findings";

type Outcome = "fixed" | "rebutted" | "not_fixed";

const OUTCOME: Record<
  Outcome,
  { label: string; icon: LucideIcon; solid: string; chip: string; text: string; bar: string }
> = {
  fixed: {
    label: "Fixed",
    icon: Check,
    solid: "bg-emerald-500 text-white",
    chip: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
    text: "text-emerald-700 dark:text-emerald-300",
    bar: "border-emerald-500",
  },
  rebutted: {
    label: "Rebutted",
    icon: MessageSquareQuote,
    solid: "bg-amber-500 text-white",
    chip: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
    text: "text-amber-800 dark:text-amber-300",
    bar: "border-amber-500",
  },
  not_fixed: {
    label: "Not fixed",
    icon: X,
    solid: "bg-rose-500 text-white",
    chip: "bg-rose-500/12 text-rose-700 dark:text-rose-300",
    text: "text-rose-700 dark:text-rose-300",
    bar: "border-rose-500",
  },
};
const OUTCOMES = Object.keys(OUTCOME) as Outcome[];

/** `hypotheses.md` says "Falsified if"; the cards say "Wrong if". */
const LABEL: Record<string, string> = {
  "Falsified if": "Wrong if",
  Rationale: "Why it should hold",
  Novelty: "Why it's new",
};

type Answer = { finding_id: string; outcome: Outcome; note?: string | null };

interface Revision {
  answers: Record<string, Answer>;
  before: Map<string, HypothesisText>;
  after: Map<string, HypothesisText>;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * What the engine published for the revision of round `round`: its answer to each comment and the diff of the
 * hypotheses. Null until the rewritten set has been reviewed, which is when both go up.
 */
function useRevision(round: number, ready: boolean) {
  const { session } = useWorkspace();
  const { projectId, runId } = session;
  return useApiQuery<Revision | null>(
    ["projects", "detail", projectId, "runs", runId, "revision", round],
    async (signal) => {
      const latest = async (schema: string) => {
        const files = (await fetchArtifacts.getBySchema(projectId, runId, schema, signal)).data;
        const file = files
          .filter((f) => f.review_round === round)
          .sort((a, b) => (b.version ?? 0) - (a.version ?? 0))[0];
        if (!file) return null;
        const { blob } = await fetchArtifacts.download(projectId, runId, file.id, signal);
        return JSON.parse(await blob.text()) as Record<string, unknown>;
      };
      const [response, diff] = await Promise.all([latest("revision.response/v1"), latest("revision.diff/v1")]);
      if (!response) return null;
      const items = (response.items ?? []) as Answer[];
      const sides = sidesOfPatch(typeof diff?.patch === "string" ? diff.patch : "");
      return {
        answers: Object.fromEntries(items.map((item) => [item.finding_id, item])),
        before: parseHypotheses(sides.before),
        after: parseHypotheses(sides.after),
      };
    },
    {
      enabled: ready,
      // Both go up with the review of the rewritten set; until then, look again.
      refetchInterval: (query) => (query.state.data || query.state.error ? false : 5000),
    },
  );
}

function OutcomeMark({ outcome }: { outcome?: Outcome }) {
  if (!outcome)
    return (
      <span
        role="img"
        aria-label="Being answered"
        className="grid size-6 place-items-center rounded-full border border-foreground/20 border-dashed"
      >
        <motion.i
          className="size-1.5 rounded-full bg-muted-foreground/60"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.4, repeat: Number.POSITIVE_INFINITY }}
        />
      </span>
    );
  const { icon: Icon, solid, label } = OUTCOME[outcome];
  return (
    <motion.span
      role="img"
      aria-label={label}
      initial={{ scale: 0.4, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 22 }}
      className={cn("grid size-6 place-items-center rounded-full", solid)}
    >
      <Icon className="size-3.5" strokeWidth={2.5} />
    </motion.span>
  );
}

/** A comment sent back, and how the writers answered it. */
function CommentRow({ finding, answer, index }: { finding: ReviewFinding; answer?: Answer; index: number }) {
  const severity = FINDING_SEVERITY[finding.severity] ?? FINDING_SEVERITY.minor;
  const { field } = findingTarget(finding.locator);
  const yours = finding.finding_id.startsWith("you-") || finding.finding_id.startsWith("comment-");
  const tone = answer ? OUTCOME[answer.outcome] : undefined;
  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="grid grid-cols-[24px_minmax(0,1fr)] gap-x-3"
    >
      <span className="pt-0.5">
        <OutcomeMark outcome={answer?.outcome} />
      </span>
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-muted-foreground">
          <span className={cn("size-1.5 rounded-full", severity.dot)} />
          <b className={cn("font-semibold", severity.text)}>{severity.label}</b>
          <span>·</span>
          <span className="text-foreground/80">{field || "Whole hypothesis"}</span>
          {finding.category && finding.category !== "other" && (
            <>
              <span>·</span>
              <span>{finding.category.replaceAll("_", " ")}</span>
            </>
          )}
          {yours && (
            <span className="ml-0.5 rounded bg-foreground px-1 py-px font-semibold text-[10px] text-background">
              You
            </span>
          )}
        </p>
        <p className="mt-1 text-sm leading-relaxed">{finding.issue}</p>
        {answer && tone && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className={cn("mt-2 rounded-r-lg border-l-2 bg-muted/50 px-3 py-2 text-xs leading-relaxed", tone.bar)}
          >
            <b className={cn("font-semibold", tone.text)}>{tone.label}.</b>{" "}
            <span className="text-foreground/85">
              {answer.note?.trim() ? answer.note : "The rewritten hypothesis addresses it."}
            </span>
          </motion.p>
        )}
      </div>
    </motion.li>
  );
}

/** One field before and after: a light edit shown inline, word by word; a rewrite shown as the old and new text. */
function FieldDiff({ change }: { change: FieldChange }) {
  const label = LABEL[change.label] ?? change.label;
  const claim = change.label === "Claim";
  const parts = change.before && change.after ? diffWords(change.before, change.after) : null;
  const light = parts && overlap(parts) >= 0.4;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-medium text-[11px] text-muted-foreground uppercase tracking-wide">{label}</span>
      {light && parts ? (
        <p className={cn("whitespace-pre-line leading-relaxed", claim ? "font-medium text-[15px]" : "text-sm")}>
          {parts.map((part, i) =>
            part.kind === "same" ? (
              // biome-ignore lint/suspicious/noArrayIndexKey: parts of one diff keep their order
              <span key={i}>{part.text}</span>
            ) : part.kind === "added" ? (
              // biome-ignore lint/suspicious/noArrayIndexKey: parts of one diff keep their order
              <ins key={i} className="rounded-sm bg-emerald-500/15 text-emerald-900 no-underline dark:text-emerald-200">
                {part.text}
              </ins>
            ) : (
              <del
                // biome-ignore lint/suspicious/noArrayIndexKey: parts of one diff keep their order
                key={i}
                className="rounded-sm bg-rose-500/10 text-rose-800/80 decoration-rose-500/60 dark:text-rose-300/80"
              >
                {part.text}
              </del>
            ),
          )}
        </p>
      ) : (
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-3 gap-y-2">
          {change.before && (
            <>
              <span className="rounded bg-rose-500/10 px-1.5 py-px font-semibold text-[10px] text-rose-700 uppercase tracking-wide dark:text-rose-300">
                Before
              </span>
              <p className="whitespace-pre-line text-muted-foreground text-sm leading-relaxed">{change.before}</p>
            </>
          )}
          {change.after && (
            <>
              <span className="rounded bg-emerald-500/12 px-1.5 py-px font-semibold text-[10px] text-emerald-700 uppercase tracking-wide dark:text-emerald-300">
                After
              </span>
              <p className={cn("whitespace-pre-line leading-relaxed", claim ? "font-medium text-[15px]" : "text-sm")}>
                {change.after}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** The claim and the first changes show at once; a full rewrite touches most fields. */
const FIRST_CHANGES = 4;

function Changes({ id, revision }: { id: string; revision: Revision | null }) {
  const [all, setAll] = useState(false);
  if (!revision)
    return (
      <div className="flex items-center gap-3 rounded-xl border border-dashed px-4 py-5 text-muted-foreground text-sm">
        <WorkOrb step="write" />
        The rewritten {id} shows here, side by side with round 1, once the reviewer has read it.
      </div>
    );
  const { changed, same } = compareHypothesis(revision.before.get(id), revision.after.get(id));
  if (!changed.length) return <p className="text-muted-foreground text-sm">{id} was kept as written.</p>;
  const shown = all ? changed : changed.slice(0, FIRST_CHANGES);
  return (
    <div className="flex flex-col gap-5">
      {shown.map((change) => (
        <FieldDiff key={change.label} change={change} />
      ))}
      {changed.length > FIRST_CHANGES && (
        <Button variant="outline" size="sm" className="w-fit" onClick={() => setAll(!all)}>
          {all ? <ChevronUp /> : <ChevronDown />}
          {all ? "Show fewer changes" : `Show ${plural(changed.length - FIRST_CHANGES, "more change")}`}
        </Button>
      )}
      {same.length > 0 && (
        <p className="border-t pt-3 text-muted-foreground text-xs">
          Unchanged: {same.map((label) => LABEL[label] ?? label).join(" · ")}
        </p>
      )}
    </div>
  );
}

/**
 * A round that revises the hypotheses: the comments sent back from the round before, how the writers answered each,
 * and what changed in each hypothesis.
 */
export function RevisionPanel({ sent, round, ready }: { sent: ReviewFinding[]; round: number; ready: boolean }) {
  const revision = useRevision(round - 1, ready).data ?? null;
  const groups = new Map<string, ReviewFinding[]>();
  for (const finding of [...sent].sort(bySeverity)) {
    const { id } = findingTarget(finding.locator);
    groups.set(id, [...(groups.get(id) ?? []), finding]);
  }
  const ids = [...groups.keys()].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const [picked, setPicked] = useState<string | null>(null);
  const active = picked && groups.has(picked) ? picked : ids[0];
  const outcomeOf = (f: ReviewFinding) => revision?.answers[f.finding_id]?.outcome;
  const counts = OUTCOMES.map((outcome) => ({ outcome, n: sent.filter((f) => outcomeOf(f) === outcome).length }));
  if (!active) return null;
  const list = groups.get(active) ?? [];

  return (
    <section className="overflow-hidden rounded-2xl bg-card shadow-xs ring-1 ring-foreground/10">
      <header className="flex flex-wrap items-start gap-x-4 gap-y-3 px-5 pt-4.5 pb-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">
          <GitCompareArrows className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-[15px] tracking-tight">Revised after your review of round {round - 1}</h3>
          <p className="mt-0.5 max-w-[70ch] text-muted-foreground text-sm">
            {plural(sent.length, "comment")} went back to the writers. Each one gets an answer: fixed, or rebutted with
            a reason.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {revision ? (
            counts
              .filter((c) => c.n)
              .map(({ outcome, n }) => (
                <span
                  key={outcome}
                  className={cn(
                    "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 font-medium text-xs",
                    OUTCOME[outcome].chip,
                  )}
                >
                  <span className="tabular-nums">{n}</span>
                  {OUTCOME[outcome].label.toLowerCase()}
                </span>
              ))
          ) : (
            <span className="inline-flex h-7 items-center gap-2 rounded-full bg-muted pr-3 pl-1.5 font-medium text-muted-foreground text-xs">
              <WorkOrb step="write" />
              Revising
            </span>
          )}
        </div>
      </header>

      {/* The share of comments in each outcome; it fills in once the answers are published. */}
      <div className="flex h-1 bg-muted">
        {revision ? (
          counts.map(({ outcome, n }) => (
            <motion.span
              key={outcome}
              className={cn("h-full", OUTCOME[outcome].solid)}
              initial={{ width: 0 }}
              animate={{ width: `${(n / Math.max(1, sent.length)) * 100}%` }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            />
          ))
        ) : (
          <motion.span
            className="h-full w-1/4 bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent"
            animate={{ x: ["-100%", "400%"] }}
            transition={{ duration: 1.8, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          />
        )}
      </div>

      <div role="tablist" aria-label="Hypotheses" className="flex gap-1.5 overflow-x-auto px-5 py-3">
        {ids.map((id) => {
          const items = groups.get(id) ?? [];
          const on = id === active;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setPicked(id)}
              className={cn(
                "relative flex h-8 shrink-0 items-center gap-2 rounded-lg px-2.5 text-xs outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                on ? "text-background" : "text-foreground hover:bg-muted",
              )}
            >
              {on && (
                <motion.span
                  layoutId={`revision-tab-${round}`}
                  className="absolute inset-0 rounded-lg bg-foreground"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <span className="relative font-mono font-semibold">{id}</span>
              <span className="sr-only">, {plural(items.length, "comment")}</span>
              <span className="relative flex gap-0.5" aria-hidden>
                {items.map((f) => {
                  const outcome = outcomeOf(f);
                  return (
                    <i
                      key={f.finding_id}
                      className={cn(
                        "size-1.5 rounded-full",
                        outcome
                          ? OUTCOME[outcome].solid.split(" ")[0]
                          : on
                            ? "bg-background/40"
                            : "bg-muted-foreground/35",
                      )}
                    />
                  );
                })}
              </span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          className="grid border-t lg:grid-cols-2 lg:divide-x"
        >
          <div className="flex min-w-0 flex-col gap-3.5 p-5">
            <span className="font-medium text-muted-foreground text-xs">
              {plural(list.length, "comment")} on <b className="font-mono text-foreground">{active}</b>
            </span>
            <ol className="flex flex-col gap-4">
              {list.map((finding, i) => (
                <CommentRow
                  key={finding.finding_id}
                  finding={finding}
                  answer={revision?.answers[finding.finding_id]}
                  index={i}
                />
              ))}
            </ol>
          </div>
          <div className="flex min-w-0 flex-col gap-3.5 border-t bg-muted/25 p-5 lg:border-t-0">
            <span className="font-medium text-muted-foreground text-xs">
              What changed in <b className="font-mono text-foreground">{active}</b>
            </span>
            <Changes id={active} revision={revision} />
          </div>
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
