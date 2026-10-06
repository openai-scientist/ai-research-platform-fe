"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "cn";
import { CircleCheck, CircleSlash, Lightbulb, ScanSearch } from "lucide-react";
import { motion } from "motion/react";

import type { AgentRole, DebateStance, DebateTurn } from "@/lib/run-stream/contract";
import type { DraftState, FeedItem, HypothesizeContent } from "@/lib/run-stream/run-state";

import { FalsifyLine } from "../falsify-line";
import { AgentAvatar, AgentCursor, PulseDot } from "../run-bits";
import { AGENTS } from "../run-meta";
import { useReveal, useWorkspace } from "../workspace-context";
import { Pane, Placeholder, SceneNote, Strike, TypeText } from "./scene-ui";

const LANES: { agent: AgentRole; asks: string }[] = [
  { agent: "theorist", asks: "Proposes claims from the gaps" },
  { agent: "methodologist", asks: "Asks whether it can be measured" },
  { agent: "skeptic", asks: "Looks for how it could fail" },
];

const STANCE: Record<DebateStance, { label: string; className: string }> = {
  propose: { label: "Proposes", className: "bg-violet-500/12 text-violet-700 dark:text-violet-300" },
  test: { label: "Tests", className: "bg-blue-500/12 text-blue-700 dark:text-blue-300" },
  challenge: { label: "Challenges", className: "bg-orange-500/12 text-orange-700 dark:text-orange-300" },
  refine: { label: "Refines", className: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300" },
  concede: { label: "Concedes", className: "bg-muted text-muted-foreground" },
};

/** Turns grouped by the idea they argue about, in the order the ideas came up. */
function threadsOf(turns: DebateTurn[]) {
  const threads = new Map<string, DebateTurn[]>();
  for (const turn of turns) {
    const key = turn.about ?? "open";
    threads.set(key, [...(threads.get(key) ?? []), turn]);
  }
  return [...threads.entries()].map(([id, list]) => ({ id, turns: list }));
}

/** How deep a reply sits: a reply to a reply is indented twice. */
function depthOf(turn: DebateTurn, byId: Map<string, DebateTurn>) {
  let depth = 0;
  let at = turn;
  while (at.reply_to && depth < 2) {
    const parent = byId.get(at.reply_to);
    if (!parent) break;
    depth += 1;
    at = parent;
  }
  return depth;
}

function Outcome({
  id,
  data,
  threadIds,
  debating,
}: {
  id: string;
  data: HypothesizeContent;
  threadIds: string[];
  debating: boolean;
}) {
  const drafted = data.drafts[id];
  // An idea set aside without its own thread belongs to the thread that raised it, matched by its letter.
  const asides = data.asides.filter((a) => a.id === id || (!threadIds.includes(a.id) && a.id[0] === id[0]));
  if (drafted)
    return (
      <motion.span
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="inline-flex h-5 items-center gap-1 rounded-full bg-emerald-500/12 px-2 font-medium text-[11px] text-emerald-700 dark:text-emerald-300"
      >
        <CircleCheck className="size-3" />
        Written as {id}
      </motion.span>
    );
  if (asides.length)
    return (
      <motion.span
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="inline-flex h-5 items-center gap-1 rounded-full bg-rose-500/10 px-2 font-medium text-[11px] text-rose-700 dark:text-rose-300"
      >
        <CircleSlash className="size-3" />
        Set aside{asides.length > 1 ? ` · ${asides.length} ideas` : ""}
      </motion.span>
    );
  return debating ? (
    <span className="inline-flex h-5 items-center gap-1.5 rounded-full bg-sky-500/10 px-2 font-medium text-[11px] text-sky-700 dark:text-sky-300">
      <PulseDot className="bg-sky-500" />
      Debating
    </span>
  ) : (
    <span className="inline-flex h-5 items-center rounded-full bg-muted px-2 text-[11px] text-muted-foreground">
      Debated
    </span>
  );
}

function Thread({
  id,
  turns,
  byId,
  data,
  threadIds,
  newest,
  debating,
  live,
}: {
  id: string;
  turns: DebateTurn[];
  byId: Map<string, DebateTurn>;
  data: HypothesizeContent;
  threadIds: string[];
  newest?: string;
  debating: boolean;
  live: boolean;
}) {
  const isIdea = !id.startsWith("H");
  return (
    <motion.section
      layout="position"
      initial={live ? { opacity: 0, y: 8 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="grid gap-x-4 gap-y-2.5 border-t pt-3.5 first:border-t-0 first:pt-0 md:grid-cols-[132px_minmax(0,1fr)]"
    >
      <div className="flex flex-wrap items-center gap-2 md:flex-col md:items-start">
        <b
          className={cn(
            "inline-flex h-6 items-center rounded-md px-2 font-bold font-mono text-xs",
            isIdea ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground",
          )}
        >
          {id}
        </b>
        <Outcome id={id} data={data} threadIds={threadIds} debating={debating} />
        <span className="text-[11px] text-muted-foreground">
          {turns.length} turn{turns.length === 1 ? "" : "s"}
        </span>
      </div>
      <ol className="flex min-w-0 flex-col gap-2.5">
        {turns.map((turn) => {
          const reply = turn.reply_to ? byId.get(turn.reply_to) : undefined;
          const depth = depthOf(turn, byId);
          const stance = STANCE[turn.stance];
          const agent = AGENTS[turn.actor];
          return (
            <motion.li
              key={turn.id}
              data-cursor={`turn:${turn.id}`}
              initial={live ? { opacity: 0, x: -6 } : false}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35 }}
              className={cn(
                "relative grid grid-cols-[28px_minmax(0,1fr)] gap-2.5",
                depth === 1 && "ml-6",
                depth === 2 && "ml-12",
              )}
            >
              {depth > 0 && (
                <span
                  aria-hidden
                  className="absolute -top-2 -left-4 h-5 w-3 rounded-bl-md border-foreground/15 border-b border-l"
                />
              )}
              <AgentAvatar agent={turn.actor} />
              <div className="min-w-0">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                  <b className={cn("font-semibold", agent.text)}>{agent.name}</b>
                  <span
                    className={cn(
                      "inline-flex h-5 items-center rounded-md px-1.5 font-medium text-[11px]",
                      stance.className,
                    )}
                  >
                    {stance.label}
                  </span>
                  {reply && <span className="text-muted-foreground">replying to {AGENTS[reply.actor].name}</span>}
                </span>
                <p className="mt-0.5 max-w-[78ch] text-sm leading-snug">
                  <TypeText text={turn.text} live={live && turn.id === newest} speed={150} />
                </p>
              </div>
            </motion.li>
          );
        })}
      </ol>
    </motion.section>
  );
}

/** Seconds between the four parts of a hypothesis while it is written. */
const PART_STEP = 0.35;

function HypothesisCard({
  draft,
  fresh,
  live,
  dropped,
  editing,
  onToggle,
}: {
  draft: DraftState;
  /** The card was just written, so its parts animate in. */
  fresh: boolean;
  live: boolean;
  dropped: boolean;
  editing: boolean;
  onToggle(): void;
}) {
  const { hypothesis: h, novelty, feasibility } = draft;
  const [scanning, setScanning] = useState(false);
  const checked = Boolean(novelty);
  const wasChecked = useRef(checked);
  useEffect(() => {
    if (checked && !wasChecked.current && live) {
      setScanning(true);
      const timer = window.setTimeout(() => setScanning(false), 1100);
      wasChecked.current = true;
      return () => window.clearTimeout(timer);
    }
    wasChecked.current = checked;
  }, [checked, live]);

  const parts = [
    { n: 1, label: "Claim", body: <p className="font-medium leading-snug">{h.statement}</p> },
    {
      n: 2,
      label: "Why it's new",
      body: (
        <p className="leading-snug">
          <b className="mr-1.5 inline-flex h-[18px] items-center gap-0.5 rounded bg-amber-500/15 px-1 align-[1px] font-mono font-semibold text-[10.5px] text-amber-800 dark:text-amber-300">
            <Lightbulb className="size-2.5" />
            {h.gap}
          </b>
          {h.novelty}
        </p>
      ),
    },
    { n: 3, label: "Why it should hold", body: <p className="leading-snug">{h.rationale}</p> },
    {
      n: 4,
      label: "Wrong if",
      body: (
        <div className="flex flex-col gap-1">
          <p className="leading-snug">{h.falsify.text}</p>
          <div className="mt-1 rounded-lg bg-muted/40 px-2 pt-1.5 pb-0.5">
            <FalsifyLine falsify={h.falsify} delay={fresh ? 4 * PART_STEP : 0} className="max-w-[380px]" />
            <span className="block pb-1 text-[10.5px] text-muted-foreground">
              Exam points. The result's 95% range must stay out of the red.
            </span>
          </div>
        </div>
      ),
    },
  ];

  return (
    <motion.article
      data-cursor={`h:${h.id}`}
      initial={fresh ? { opacity: 0, y: 12 } : false}
      animate={{ opacity: dropped ? 0.5 : 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      onClick={editing ? onToggle : undefined}
      onKeyDown={editing ? (e) => (e.key === "Enter" || e.key === " ") && onToggle() : undefined}
      role={editing ? "button" : undefined}
      tabIndex={editing ? 0 : undefined}
      aria-pressed={editing ? dropped : undefined}
      className={cn(
        "relative flex h-full min-w-0 flex-col gap-3 overflow-hidden rounded-xl bg-card px-4 py-3.5 text-sm ring-1 transition-shadow duration-500",
        draft.selected && !dropped ? "shadow-sm ring-foreground/30" : "ring-foreground/10",
        editing && "cursor-pointer hover:ring-foreground",
      )}
    >
      {scanning && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent"
          initial={{ left: "-25%" }}
          animate={{ left: "110%" }}
          transition={{ duration: 1, ease: "easeInOut" }}
        />
      )}
      <header className="flex flex-wrap items-center gap-2">
        <motion.span
          initial={fresh ? { scale: 0.6 } : false}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 18, delay: 0.1 }}
          className="inline-flex h-6 items-center rounded-md bg-primary px-2 font-bold font-mono text-primary-foreground text-xs"
        >
          {h.id}
        </motion.span>
        <span className="text-muted-foreground text-xs">
          answers <b className="font-mono text-foreground">{h.sub_question}</b> · predicts{" "}
          <b className="font-mono text-foreground">{h.prediction}</b>
        </span>
        <span className="ml-auto">
          {dropped ? (
            <span className="font-semibold text-amber-800 text-xs dark:text-amber-300">Dropped by you</span>
          ) : draft.selected ? (
            <motion.span
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="inline-flex h-5 items-center gap-1 rounded-full bg-emerald-500/12 px-2 font-medium text-emerald-700 text-xs dark:text-emerald-300"
            >
              <CircleCheck className="size-3" />
              In the set
            </motion.span>
          ) : (
            <span className="text-muted-foreground text-xs">Draft</span>
          )}
        </span>
      </header>
      <ol className="flex flex-col gap-2.5">
        {parts.map((part, i) => (
          <motion.li
            key={part.n}
            initial={fresh ? { opacity: 0, y: 4 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: fresh ? 0.2 + i * PART_STEP : 0, duration: 0.35 }}
            className="grid grid-cols-[20px_minmax(0,1fr)] gap-2.5"
          >
            <span
              className={cn(
                "grid size-5 place-items-center rounded-full font-mono font-semibold text-[10.5px]",
                part.n === 4 ? "bg-rose-500/12 text-rose-700 dark:text-rose-300" : "bg-muted text-muted-foreground",
              )}
            >
              {part.n}
            </span>
            <div className="min-w-0">
              <span className="block text-[11px] text-muted-foreground">{part.label}</span>
              {part.body}
            </div>
          </motion.li>
        ))}
      </ol>
      {novelty && feasibility && (
        <motion.div
          data-cursor={`check:${h.id}`}
          initial={live ? { opacity: 0, height: 0 } : false}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ delay: live ? 0.9 : 0, duration: 0.35 }}
          className="mt-auto flex flex-col gap-1.5 overflow-hidden border-t pt-2.5 text-xs"
        >
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <ScanSearch className="size-3.5 text-cyan-600" />
            <b
              className={cn(
                "font-semibold",
                novelty.novel ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700",
              )}
            >
              {novelty.novel ? "Not published yet" : "Already published"}
            </b>
            <span className="text-muted-foreground">closest: {novelty.closest}</span>
            <span className="ml-auto flex items-center gap-1.5">
              <span className="relative h-1.5 w-16 rounded-full bg-muted">
                <motion.i
                  className="absolute inset-y-0 left-0 rounded-full bg-cyan-600"
                  initial={{ width: 0 }}
                  animate={{ width: `${novelty.similarity * 100}%` }}
                  transition={{ delay: live ? 1 : 0, duration: 0.6 }}
                />
              </span>
              <span className="font-mono tabular-nums">{Math.round(novelty.similarity * 100)}% alike</span>
            </span>
          </span>
          <span className="flex items-start gap-2">
            <CircleCheck
              className={cn("mt-px size-3.5 shrink-0", feasibility.ok ? "text-emerald-600" : "text-rose-600")}
            />
            <span className="text-muted-foreground">{feasibility.note}</span>
          </span>
        </motion.div>
      )}
      {draft.overrideNote && (
        <p className="grid grid-cols-[auto_1fr] gap-2 rounded-lg bg-muted px-2 py-1.5 text-xs">
          <AgentAvatar agent="pi" size="sm" />
          {draft.overrideNote}
        </p>
      )}
    </motion.article>
  );
}

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
  const draftsRef = useRef<HTMLDivElement>(null);
  const debateEnd = useRef<HTMLDivElement>(null);
  const { dropMode, dropped, toggleDrop } = useWorkspace();
  const editing = dropMode && live;
  const notes = decisions.filter((d) => d.stageKey === stageKey);
  const drafts = data.order.map((id) => data.drafts[id]);
  const set = drafts.filter((d) => d.selected);
  const seenDrafts = useRef(drafts.length);
  const firstFresh = live ? seenDrafts.current : drafts.length;
  useEffect(() => {
    seenDrafts.current = drafts.length;
  });
  useReveal(debateEnd, data.turns.length, live && !drafts.length);
  useReveal(draftsRef, drafts.length + set.length, live);

  const byId = new Map(data.turns.map((t) => [t.id, t]));
  const threads = threadsOf(data.turns);
  const threadIds = threads.map((t) => t.id);
  const lastTurn = data.turns[data.turns.length - 1];
  const debating = live && !drafts.length;
  let agent: AgentRole = lastTurn?.actor ?? "theorist";
  let target: string | null = lastTurn ? `turn:${lastTurn.id}` : null;
  if (drafts.length) {
    agent = "theorist";
    target = `h:${drafts[drafts.length - 1].hypothesis.id}`;
  }
  const checkedDrafts = drafts.filter((d) => d.novelty);
  if (checkedDrafts.length) {
    agent = "librarian";
    target = `check:${checkedDrafts[checkedDrafts.length - 1].hypothesis.id}`;
  }
  if (set.length) {
    agent = "pi";
    target = `h:${set[set.length - 1].hypothesis.id}`;
  }

  return (
    <div ref={scene} className="relative flex flex-col gap-4">
      {data.turns.length ? (
        <Pane
          title="Debate"
          aside={`${threads.length} ideas · ${data.turns.length} turns · every idea must survive all three`}
        >
          <div className="mb-4 grid gap-2 sm:grid-cols-3">
            {LANES.map((lane) => {
              const speaking = debating && lastTurn?.actor === lane.agent;
              const said = data.turns.filter((t) => t.actor === lane.agent).length;
              return (
                <span
                  key={lane.agent}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs ring-1 transition-colors duration-300",
                    speaking ? cn(AGENTS[lane.agent].soft, "ring-current/20") : "bg-muted/50 ring-transparent",
                  )}
                >
                  <AgentAvatar agent={lane.agent} size="lg" />
                  <span className="min-w-0 flex-1">
                    <b className={cn("block font-semibold", AGENTS[lane.agent].text)}>{AGENTS[lane.agent].name}</b>
                    <span className="text-muted-foreground">{lane.asks}</span>
                  </span>
                  {speaking ? (
                    <span className="flex gap-0.5" role="status" aria-label="Speaking">
                      {[0, 1, 2].map((i) => (
                        <motion.i
                          key={i}
                          className={cn("size-1 rounded-full bg-current", AGENTS[lane.agent].text)}
                          animate={{ opacity: [0.25, 1, 0.25] }}
                          transition={{ duration: 0.9, repeat: Number.POSITIVE_INFINITY, delay: i * 0.15 }}
                        />
                      ))}
                    </span>
                  ) : (
                    <span className="font-mono text-[11px] text-muted-foreground tabular-nums">{said}</span>
                  )}
                </span>
              );
            })}
          </div>
          <div className="flex flex-col gap-3.5">
            {threads.map((thread) => (
              <Thread
                key={thread.id}
                id={thread.id}
                turns={thread.turns}
                byId={byId}
                data={data}
                threadIds={threadIds}
                newest={lastTurn?.id}
                debating={debating && thread.id === lastTurn?.about}
                live={live}
              />
            ))}
          </div>
          <div ref={debateEnd} />
        </Pane>
      ) : (
        <Placeholder>Three perspectives debate the gaps first</Placeholder>
      )}

      <div ref={draftsRef} className="flex flex-col gap-3">
        {drafts.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <b className="font-semibold">Hypotheses{round > 1 ? ` · round ${round}` : ""}</b>
            <span className="text-muted-foreground text-xs">
              four parts each: the claim, why it's new, why it should hold, and the result that proves it wrong
            </span>
            <span className="ml-auto flex items-center gap-1.5 text-muted-foreground text-xs">
              Set:
              {set.length ? (
                set.map((d) => (
                  <motion.span
                    key={d.hypothesis.id}
                    layout
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={cn(
                      "inline-flex h-5 items-center rounded-md bg-primary px-1.5 font-mono font-semibold text-[11px] text-primary-foreground",
                      (data.dropped.includes(d.hypothesis.id) || (editing && dropped.includes(d.hypothesis.id))) &&
                        "bg-muted text-muted-foreground line-through",
                    )}
                  >
                    {d.hypothesis.id}
                  </motion.span>
                ))
              ) : (
                <span>not picked yet</span>
              )}
            </span>
          </div>
        )}
        <div className={cn("grid gap-3 lg:grid-cols-2", editing && "rounded-2xl ring-3 ring-amber-500/40")}>
          {drafts.map((draft, i) => (
            <HypothesisCard
              key={draft.hypothesis.id}
              draft={draft}
              fresh={live && i >= firstFresh}
              live={live}
              dropped={data.dropped.includes(draft.hypothesis.id) || (editing && dropped.includes(draft.hypothesis.id))}
              editing={editing && draft.selected}
              onToggle={() => toggleDrop(draft.hypothesis.id)}
            />
          ))}
        </div>
        {!drafts.length && data.turns.length > 0 && (
          <Placeholder>What survives the debate is written as a hypothesis</Placeholder>
        )}
        {data.asides.length > 0 && (
          <div className="flex flex-col gap-2 rounded-xl border border-dashed px-3.5 py-3">
            <span className="font-medium text-[11px] text-muted-foreground uppercase tracking-wide">
              Set aside · named as limits instead
            </span>
            {data.asides.map((aside) => (
              <motion.div
                key={aside.id}
                initial={live ? { opacity: 0, y: 4 } : false}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-[auto_1fr] items-start gap-2 text-xs"
              >
                <span className="inline-flex h-5 items-center rounded-md bg-muted px-1.5 font-mono font-semibold">
                  {aside.id}
                </span>
                <span className="pt-0.5">
                  <Strike live={live} className="text-muted-foreground">
                    {aside.statement}
                  </Strike>
                  <span className="ml-1.5 text-rose-700 dark:text-rose-300">{aside.reason}</span>
                </span>
              </motion.div>
            ))}
          </div>
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
        agent={live ? agent : null}
        container={scene}
        target={target}
        version={`${data.turns.length}-${drafts.length}-${checkedDrafts.length}-${set.length}`}
      />
    </div>
  );
}
