"use client";

import { useRef } from "react";

import { cn } from "cn";
import { Check, ChevronRight, Lock, X } from "lucide-react";
import { LayoutGroup, motion } from "motion/react";

import type { Hypothesis, Risk } from "@/lib/run-stream/contract";
import type { FeedItem, HypothesizeContent, IdeaColumn, IdeaState } from "@/lib/run-stream/run-state";

import { AgentAvatar, AgentCursor } from "../run-bits";
import { useReveal, useWorkspace } from "../workspace-context";
import { Pane, Placeholder, SceneNote } from "./scene-ui";

const RISK_LEVEL: Record<Risk, number> = { low: 1, medium: 2, high: 3 };
const RISK_TONE: Record<Risk, string> = {
  low: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  medium: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  high: "bg-rose-500/12 text-rose-700 dark:text-rose-300",
};
const METER_FILL: Record<Risk, string> = { low: "bg-emerald-500", medium: "bg-amber-500", high: "bg-rose-500" };

const COLUMNS: { id: Exclude<IdeaColumn, "aside">; title: string; sub: string }[] = [
  { id: "ideas", title: "Ideas", sub: "Proposed by the Theorist, each traced to where it came from" },
  { id: "review", title: "Under review", sub: "Challenged by the Skeptic: testable, risky, or out?" },
  { id: "set", title: "Hypothesis set", sub: "Picked by the PI and written as a formal test" },
];

export function HypothesizeScene({
  data,
  round,
  stageKey,
  decisions,
  live,
}: {
  data: HypothesizeContent;
  round: number;
  stageKey: string;
  decisions: FeedItem[];
  live: boolean;
}) {
  const scene = useRef<HTMLDivElement>(null);
  const { dropMode, dropped, toggleDrop } = useWorkspace();
  const ideas = data.order.map((id) => data.ideas[id]);
  const inColumn = (col: IdeaColumn) => ideas.filter((i) => i.column === col);
  const aside = inColumn("aside");
  const last = [...ideas].reverse().find((i) => i.column !== "ideas") ?? ideas[ideas.length - 1];
  const planRef = useRef<HTMLDivElement>(null);
  useReveal(planRef, data.plan.length, live);
  const notes = decisions.filter((d) => d.stageKey === stageKey);
  const editing = dropMode && live;

  let cursorRole: "theorist" | "skeptic" | "pi" | "methodologist" = "theorist";
  if (ideas.some((i) => i.review)) cursorRole = "skeptic";
  if (ideas.some((i) => i.column === "set" || i.column === "aside")) cursorRole = "pi";
  if (data.planId) cursorRole = "methodologist";

  return (
    <div ref={scene} className="relative flex flex-col gap-4">
      <LayoutGroup id={stageKey}>
        <div className="grid items-start gap-2 xl:grid-cols-[minmax(0,1fr)_20px_minmax(0,1fr)_20px_minmax(0,1.15fr)]">
          {COLUMNS.map((col, index) => {
            const cards = inColumn(col.id);
            const isSet = col.id === "set";
            return (
              <div key={col.id} className="contents">
                {index > 0 && (
                  <div aria-hidden className="mt-3.5 flex justify-center text-muted-foreground/50 max-xl:rotate-90">
                    <ChevronRight className="size-4" />
                  </div>
                )}
                <section
                  className={cn(
                    "flex min-h-72 min-w-0 flex-col gap-2.5 rounded-2xl p-3 transition-colors duration-500 max-xl:min-h-0",
                    !isSet && "bg-muted/55",
                    isSet && (cards.length ? "bg-card ring-1 ring-foreground/10" : "border border-dashed"),
                    isSet && editing && "ring-3 ring-amber-500/40",
                  )}
                >
                  <header className="flex items-center gap-2 text-sm">
                    <b className="font-semibold">{isSet ? `${col.title} · round ${round}` : col.title}</b>
                    <span className="ml-auto rounded-full bg-background px-2 py-px font-mono font-semibold text-[11px] text-muted-foreground ring-1 ring-foreground/10">
                      {cards.length}
                    </span>
                  </header>
                  <p className="-mt-1.5 mb-0.5 text-muted-foreground text-xs">{col.sub}</p>
                  <div className="flex flex-col gap-2">
                    {cards.map((card) =>
                      card.hypothesis ? (
                        <SpecCard
                          key={card.idea.id}
                          card={card}
                          hypothesis={card.hypothesis}
                          dropped={
                            data.dropped.includes(card.hypothesis.id) ||
                            (editing && dropped.includes(card.hypothesis.id))
                          }
                          editing={editing}
                          onToggle={() => card.hypothesis && toggleDrop(card.hypothesis.id)}
                        />
                      ) : (
                        <IdeaCard key={card.idea.id} card={card} />
                      ),
                    )}
                  </div>
                  {col.id === "review" && aside.length > 0 && (
                    <div className="mt-1 flex flex-col gap-1.5 border-t border-dashed pt-2.5">
                      <span className="font-medium text-[11px] text-muted-foreground uppercase tracking-wide">
                        Set aside
                      </span>
                      {aside.map((card) => (
                        <motion.div
                          key={card.idea.id}
                          layoutId={card.idea.id}
                          className="grid grid-cols-[auto_1fr] gap-2 text-xs"
                        >
                          <span className="rounded-md bg-muted px-1.5 font-mono font-semibold">{card.idea.id}</span>
                          <span>
                            <s className="text-muted-foreground">{card.idea.statement}</s>
                            <span className="block text-rose-700 dark:text-rose-300">{card.setAsideReason}</span>
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            );
          })}
        </div>
      </LayoutGroup>

      <div ref={planRef}>
        {data.planId ? (
          <PlanTable planId={data.planId} plan={data.plan} dropped={data.dropped} />
        ) : (
          <Placeholder icon={<Lock className="size-3.5" />}>
            The test plan is written and locked after the set is picked
          </Placeholder>
        )}
      </div>
      {notes.map((n) => (
        <SceneNote
          key={n.seq}
          actor={n.actor}
          title={n.actor === "you" ? "Your decision" : "PI decision"}
          text={n.text}
          note={n.note}
        />
      ))}
      <AgentCursor
        agent={live ? cursorRole : null}
        container={scene}
        target={data.planId ? "plan" : last ? `idea:${last.idea.id}` : null}
        version={`${ideas.map((i) => i.column).join()}${data.planId}`}
      />
    </div>
  );
}

function IdeaCard({ card }: { card: IdeaState }) {
  const { idea, review } = card;
  return (
    <motion.article
      layoutId={idea.id}
      data-cursor={`idea:${idea.id}`}
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: review && !review.testable ? 0.65 : 1, y: 0, scale: 1 }}
      transition={{ layout: { type: "spring", stiffness: 260, damping: 30 }, duration: 0.4 }}
      className="flex flex-col gap-1.5 rounded-xl bg-card px-3 py-2.5 text-sm shadow-xs ring-1 ring-foreground/10"
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className="shrink-0 rounded-md bg-muted px-1.5 font-mono font-semibold text-[11px]">{idea.id}</span>
        <span
          className="flex min-w-0 items-center gap-1 text-[11.5px] text-muted-foreground"
          title="Where the idea came from"
        >
          <ChevronRight className="size-3 shrink-0" />
          <b className="font-mono font-semibold text-[11px] text-violet-700 dark:text-violet-300">{idea.source.ref}</b>
          <span className="truncate">{idea.source.text}</span>
        </span>
      </div>
      <p className="leading-snug">{idea.statement}</p>
      {review && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col gap-1.5 overflow-hidden border-t pt-2 text-xs"
        >
          <div className="flex min-w-0 items-center gap-2">
            <span className="w-24 shrink-0 text-muted-foreground">Testable with v2</span>
            {review.testable ? (
              <span className="flex min-w-0 items-center gap-1 font-mono text-[11.5px] text-emerald-700 dark:text-emerald-300">
                <Check className="size-3 shrink-0" strokeWidth={2.5} />
                <span className="truncate">{review.columns?.join(", ")}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 font-medium text-rose-700 dark:text-rose-300">
                <X className="size-3" strokeWidth={2.5} />
                {review.missing}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="w-24 shrink-0 text-muted-foreground">Risk</span>
            <span className="flex gap-0.5">
              {[1, 2, 3].map((level) => (
                <motion.i
                  key={level}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: level * 0.08 }}
                  className={cn(
                    "h-1.5 w-3.5 rounded-sm",
                    level <= RISK_LEVEL[review.risk] ? METER_FILL[review.risk] : "bg-muted",
                  )}
                />
              ))}
            </span>
            <span
              className={cn("rounded px-1.5 font-mono font-semibold text-[10px] tracking-wide", RISK_TONE[review.risk])}
            >
              {review.risk.toUpperCase()}
            </span>
          </div>
          <p className="grid grid-cols-[auto_1fr] items-start gap-2 italic">
            <AgentAvatar agent="skeptic" size="sm" className="not-italic" />“{review.objection}”
          </p>
        </motion.div>
      )}
    </motion.article>
  );
}

function SpecCard({
  card,
  hypothesis,
  dropped,
  editing,
  onToggle,
}: {
  card: IdeaState;
  hypothesis: Hypothesis;
  dropped: boolean;
  editing: boolean;
  onToggle(): void;
}) {
  const fields = [
    ["Outcome", hypothesis.outcome, true],
    ["Compares", hypothesis.exposure, false],
    ["Estimand", hypothesis.estimand, false],
    ["Must report", hypothesis.report_key, true],
  ] as const;
  return (
    <motion.article
      layoutId={card.idea.id}
      data-cursor={`idea:${card.idea.id}`}
      transition={{ layout: { type: "spring", stiffness: 240, damping: 30 } }}
      className={cn(
        "relative flex flex-col gap-2 rounded-xl bg-card px-3.5 py-3 text-sm shadow-xs ring-1 ring-foreground/20 transition-opacity",
        dropped && "opacity-45",
        editing && "cursor-pointer hover:ring-foreground",
      )}
      onClick={editing ? onToggle : undefined}
      role={editing ? "button" : undefined}
      tabIndex={editing ? 0 : undefined}
      onKeyDown={editing ? (e) => (e.key === "Enter" || e.key === " ") && onToggle() : undefined}
      aria-pressed={editing ? dropped : undefined}
    >
      <motion.div
        initial={{ rotateY: -88, opacity: 0 }}
        animate={{ rotateY: 0, opacity: 1 }}
        transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
        style={{ transformPerspective: 900 }}
        className="flex flex-col gap-2"
      >
        <div className="flex flex-wrap items-center gap-2">
          <motion.span
            data-tag={hypothesis.id}
            initial={{ scale: 0.6 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 18, delay: 0.15 }}
            className="rounded-md bg-primary px-2 py-0.5 font-bold font-mono text-primary-foreground text-xs"
          >
            {hypothesis.id}
          </motion.span>
          <span className="text-muted-foreground text-xs">
            predicts <b className="font-mono text-foreground">{hypothesis.prediction}</b>
          </span>
          {dropped && <span className="font-semibold text-amber-800 text-xs dark:text-amber-300">Dropped by you</span>}
          <span className="ml-auto font-mono text-[11px] text-muted-foreground">from {card.idea.id}</span>
        </div>
        <p className={cn("font-medium leading-snug", dropped && "line-through")}>{hypothesis.statement}</p>
        <dl className="grid grid-cols-2 gap-x-3.5 gap-y-2 border-t pt-2.5">
          {fields.map(([label, value, mono]) => (
            <div key={label} className="min-w-0">
              <dt className="text-[11px] text-muted-foreground">{label}</dt>
              <dd className={cn("break-words text-[12.5px]", mono && "font-mono text-xs")}>{value}</dd>
            </div>
          ))}
        </dl>
        {card.overrideNote && (
          <p className="grid grid-cols-[auto_1fr] gap-2 rounded-lg bg-muted px-2 py-1.5 text-xs">
            <AgentAvatar agent="pi" size="sm" />
            {card.overrideNote}
          </p>
        )}
      </motion.div>
    </motion.article>
  );
}

function PlanTable({ planId, plan, dropped }: { planId: string; plan: Hypothesis[]; dropped: string[] }) {
  return (
    <Pane
      title={`Test plan ${planId}`}
      aside="One shared plan · data v2"
      action={
        <motion.span
          data-cursor="plan"
          initial={{ scale: 1.6, rotate: -6, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ delay: 0.35 + plan.length * 0.12, type: "spring", stiffness: 300, damping: 16 }}
          className="inline-flex h-6 items-center gap-1.5 rounded-full bg-primary px-2.5 font-semibold text-primary-foreground text-xs"
        >
          <Lock className="size-3" />
          Locked before any code runs
        </motion.span>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-muted-foreground text-xs">
            <tr className="border-b">
              {["ID", "How it's tested", "Compares", "The number it must report"].map((h) => (
                <th key={h} className="pr-3 pb-2 text-left font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {plan.map((h, i) => (
              <motion.tr
                key={h.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: dropped.includes(h.id) ? 0.4 : 1, y: 0 }}
                transition={{ delay: i * 0.12 }}
                className="border-b last:border-0"
              >
                <td className="py-2 pr-3 align-top">
                  <span className="rounded-md bg-primary px-1.5 py-0.5 font-mono font-semibold text-primary-foreground text-xs">
                    {h.id}
                  </span>
                </td>
                <td className="py-2 pr-3 align-top">
                  {h.method}
                  <span className="block text-muted-foreground text-xs">
                    {h.outcome} · {h.exposure}
                  </span>
                </td>
                <td className="py-2 pr-3 align-top">
                  {h.estimand}
                  <span className="block text-muted-foreground text-xs">Expected {h.prediction}</span>
                </td>
                <td className="py-2 align-top font-mono text-xs">{h.report_key}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-muted-foreground text-xs">
        Shared steps first: load v2, turn stress into a 1–3 score, mark who sleeps 7 hours or more. Then one test per
        hypothesis.
      </p>
    </Pane>
  );
}
