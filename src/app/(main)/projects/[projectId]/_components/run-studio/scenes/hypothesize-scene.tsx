"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "cn";
import {
  CircleCheck,
  CircleSlash,
  LayoutList,
  Lightbulb,
  MessagesSquare,
  Scale,
  ScanSearch,
  Swords,
  TriangleAlert,
} from "lucide-react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";

import { Button } from "@/components/ui/button";
import type {
  AgentRole,
  DebateStance,
  DebateTurn,
  Hypothesis,
  StandingObjection,
  Tension,
} from "@/lib/run-stream/contract";
import type { DraftState, FeedItem, HypothesizeContent } from "@/lib/run-stream/run-state";

import { FalsifyLine } from "../falsify-line";
import { AgentAvatar, AgentCursor, PulseDot } from "../run-bits";
import { AGENTS } from "../run-meta";
import { useReveal, useWorkspace } from "../workspace-context";
import { DebateBoard, FLAW, SEVERITY, STANCE, STANCE_ORDER } from "./debate-board";
import { threadsOf, VERDICT_THREAD } from "./debate-positions";
import { Bone, Pane, Placeholder, SceneNote, Strike, TypeText } from "./scene-ui";

const LANES: { agent: AgentRole; asks: string }[] = [
  { agent: "theorist", asks: "Proposes claims from the gaps" },
  { agent: "methodologist", asks: "Asks whether it can be measured" },
  { agent: "skeptic", asks: "Looks for how it could fail" },
];

/** "3 proposals · 3 answers · ranked by the PI": what a debate of whole positions held. */
function debateSummary(turns: DebateTurn[]) {
  const proposals = turns.filter((t) => t.stance === "propose").length;
  const answers = turns.filter((t) => t.stance === "refine").length;
  const parts = [`${proposals} ${proposals === 1 ? "proposal" : "proposals"}`];
  if (answers) parts.push(`${answers} ${answers === 1 ? "answer" : "answers"}`);
  if (turns.some((t) => t.actor === "pi")) parts.push("ranked by the PI");
  return parts.join(" · ");
}

/** Turns that name the idea they argue about form threads; whole positions (one per perspective) do not. */
function debateAside(turns: DebateTurn[], threads: number) {
  if (!turns.length) return "Three perspectives debate the gaps first";
  if (!turns.some((t) => t.about)) return debateSummary(turns);
  return `${threads} ${threads === 1 ? "idea" : "ideas"} · ${turns.length} turns · every idea must survive all three`;
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
  quiet,
}: {
  id: string;
  data: HypothesizeContent;
  threadIds: string[];
  debating: boolean;
  /** Say only how the idea ended: written or set aside. */
  quiet?: boolean;
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
  if (quiet) return null;
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

/** A challenge's severity, and for a fatal one its flaw and where it is. */
function SeverityTag({ turn, pop }: { turn: DebateTurn; pop: boolean }) {
  if (turn.stance !== "challenge" || !turn.severity) return null;
  const meta = SEVERITY[turn.severity];
  const detail = turn.flaw ? `${FLAW[turn.flaw]}${turn.field ? ` (in ${turn.field})` : ""}` : "";
  return (
    <motion.span
      initial={pop ? { opacity: 0, x: -4 } : false}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: pop ? 0.15 : 0, duration: 0.3 }}
      title={turn.card_id ? `${detail}; see ${turn.card_id}` : detail || undefined}
      className={cn("inline-flex h-5 items-center rounded-md px-1.5 font-medium text-[11px]", meta.className)}
    >
      {meta.label}
      {turn.flaw && <span className="ml-1 font-normal opacity-80">· {FLAW[turn.flaw]}</span>}
    </motion.span>
  );
}

function StanceChip({ turn, pop }: { turn: DebateTurn; pop: boolean }) {
  const meta = STANCE[turn.stance] ?? STANCE.propose;
  const Icon = meta.icon;
  // In the review a critic either accepts the answer to its objection or upholds the objection.
  let label = meta.label;
  if (turn.phase === "review" && turn.answers?.length)
    label = turn.stance === "concede" ? "Accepts the answer" : "Objection stands";
  return (
    <motion.span
      initial={pop ? { scale: 0.5, opacity: 0 } : false}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 520, damping: 22, delay: 0.05 }}
      className={cn("inline-flex h-5 items-center gap-1 rounded-md px-1.5 font-medium text-[11px]", meta.className)}
    >
      <motion.span
        initial={pop ? { rotate: -25 } : false}
        animate={{ rotate: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 12, delay: 0.1 }}
        className="inline-flex"
      >
        <Icon className="size-3" />
      </motion.span>
      {label}
    </motion.span>
  );
}

/** The replies a turn drew, one chip per stance: who challenged it, who agreed, who asked how to test it. */
function Reactions({ replies, live }: { replies: DebateTurn[]; live: boolean }) {
  if (!replies.length) return null;
  const groups = STANCE_ORDER.map((stance) => ({
    stance,
    agents: [...new Set(replies.filter((r) => r.stance === stance).map((r) => r.actor))],
  })).filter((g) => g.agents.length);
  return (
    <span className="mt-1.5 flex flex-wrap gap-1.5">
      <AnimatePresence initial={false}>
        {groups.map(({ stance, agents }) => {
          const meta = STANCE[stance];
          const Icon = meta.icon;
          const who = agents.map((a) => AGENTS[a]?.name ?? a).join(" and ");
          return (
            <motion.span
              key={stance}
              layout
              initial={live ? { scale: 0.4, opacity: 0, y: 4 } : false}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 480, damping: 24 }}
              title={`${who} ${agents.length === 1 ? meta.label.toLowerCase() : meta.label.toLowerCase().replace(/s$/, "")} this`}
              className={cn(
                "inline-flex h-6 items-center gap-1.5 rounded-full py-0.5 pr-1 pl-2 font-medium text-[11px]",
                meta.className,
              )}
            >
              <Icon className="size-3" />
              <span className="relative inline-flex h-4 min-w-2 justify-center overflow-hidden font-mono tabular-nums">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={agents.length}
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -10, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  >
                    {agents.length}
                  </motion.span>
                </AnimatePresence>
              </span>
              <span className="flex -space-x-1.5">
                {agents.map((agent) => (
                  <motion.span
                    key={agent}
                    layout
                    initial={live ? { scale: 0, x: -6 } : false}
                    animate={{ scale: 1, x: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 26 }}
                    className="inline-flex rounded-full ring-2 ring-card"
                  >
                    <AgentAvatar agent={agent} size="sm" />
                  </motion.span>
                ))}
              </span>
            </motion.span>
          );
        })}
      </AnimatePresence>
    </span>
  );
}

/** A soft wash that fades out: a reply just landed on this turn, or the summary pointed here. */
function Flash({ className }: { className?: string }) {
  return (
    <motion.span
      aria-hidden
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 1.6, ease: "easeOut" }}
      className={cn("pointer-events-none absolute rounded-xl bg-sky-500/10 ring-1 ring-sky-500/30", className)}
    />
  );
}

function Thread({
  id,
  turns,
  byId,
  replies,
  data,
  threadIds,
  newest,
  debating,
  live,
  flash,
}: {
  id: string;
  turns: DebateTurn[];
  byId: Map<string, DebateTurn>;
  replies: Map<string, DebateTurn[]>;
  data: HypothesizeContent;
  threadIds: string[];
  newest?: DebateTurn;
  debating: boolean;
  live: boolean;
  /** Changes each time the summary points at this thread. */
  flash?: number;
}) {
  const isIdea = !id.startsWith("H");
  return (
    <motion.section
      layout="position"
      data-thread={id}
      initial={live ? { opacity: 0, y: 8 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="relative grid scroll-mt-24 gap-x-4 gap-y-2.5 border-t pt-3.5 first:border-t-0 first:pt-0 md:grid-cols-[132px_minmax(0,1fr)]"
    >
      {flash !== undefined && <Flash key={flash} className="-inset-x-2 -top-1 -bottom-2" />}
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
          const agent = turn.actor && AGENTS[turn.actor] ? AGENTS[turn.actor] : AGENTS.theorist;
          const isNewest = live && turn.id === newest?.id;
          // A reply that just came in washes over the turn it answers, so the eye goes there too.
          const struck = live && newest?.reply_to === turn.id;
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
              {struck && <Flash key={newest?.id} className="-inset-x-1.5 -inset-y-1" />}
              <AgentAvatar agent={turn.actor} />
              <div className="min-w-0">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                  <b className={cn("font-semibold", agent.text)}>{agent.name}</b>
                  <StanceChip turn={turn} pop={isNewest} />
                  <SeverityTag turn={turn} pop={isNewest} />
                  {reply && AGENTS[reply.actor] && (
                    <span className="text-muted-foreground">replying to {AGENTS[reply.actor].name}</span>
                  )}
                </span>
                <p className="mt-0.5 max-w-[78ch] whitespace-pre-line text-sm leading-snug">
                  <TypeText text={turn.text} live={isNewest} speed={150} />
                </p>
                {turn.note && (
                  <motion.p
                    initial={isNewest ? { opacity: 0 } : false}
                    animate={{ opacity: 1 }}
                    transition={{ delay: isNewest ? 0.4 : 0, duration: 0.35 }}
                    className="mt-1 max-w-[78ch] text-muted-foreground text-xs leading-snug"
                  >
                    <b className="font-medium text-foreground/80">Why: </b>
                    {turn.note}
                  </motion.p>
                )}
                <Reactions replies={replies.get(turn.id) ?? []} live={live} />
              </div>
            </motion.li>
          );
        })}
      </ol>
    </motion.section>
  );
}

/** Turns held in the debate before the first one is said. */
const FRAME_TURNS = 2;

/** A turn's place in the debate, before anyone has spoken. */
function PendingTurn({ active }: { active: boolean }) {
  return (
    <div aria-hidden className="grid grid-cols-[28px_minmax(0,1fr)] gap-2.5">
      <span className="size-7 rounded-full bg-muted" />
      <span className="flex min-w-0 flex-col gap-2 pt-1">
        <Bone active={active} className="h-2 w-1/4" />
        <Bone active={active} />
        <Bone active={active} className="w-3/5" />
      </span>
    </div>
  );
}

/** Seconds between the four parts of a hypothesis while it is written. */
const PART_STEP = 0.35;

type Aside = HypothesizeContent["asides"][number];

/** An idea set aside. At a hypotheses gate in change mode, one the debate left out can be kept anyway. */
function AsideRow({
  aside,
  live,
  editing,
  keepable,
}: {
  aside: Aside;
  live: boolean;
  editing: boolean;
  keepable: string[];
}) {
  const { kept, toggleKeep } = useWorkspace();
  const canKeep = editing && keepable.includes(aside.id);
  const isKept = kept.includes(aside.id);
  const body = (
    <>
      <span className="inline-flex h-5 items-center rounded-md bg-muted px-1.5 font-mono font-semibold">
        {aside.id}
      </span>
      <span className="pt-0.5">
        {isKept ? (
          <span>{aside.statement}</span>
        ) : (
          <Strike live={live} className="text-muted-foreground">
            {aside.statement}
          </Strike>
        )}
        <span
          className={cn(
            "ml-1.5",
            aside.kind === "not_used" ? "text-muted-foreground" : "text-rose-700 dark:text-rose-300",
          )}
        >
          {aside.reason}
        </span>
        {canKeep && (
          <motion.span
            layout
            className={cn(
              "ml-2 inline-flex h-5 items-center gap-1 rounded-full px-2 align-[1px] font-medium text-[11px]",
              isKept ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground",
            )}
          >
            {isKept && <CircleCheck className="size-3" />}
            {isKept ? "Kept by you" : "Keep anyway"}
          </motion.span>
        )}
      </span>
    </>
  );
  if (canKeep)
    return (
      <button
        type="button"
        onClick={() => toggleKeep(aside.id)}
        aria-pressed={isKept}
        className={cn(
          "-m-1.5 grid grid-cols-[auto_1fr] items-start gap-2 rounded-lg p-1.5 text-left text-xs ring-1 transition-[background-color,box-shadow] duration-300",
          isKept ? "bg-emerald-500/8 ring-emerald-500/40" : "ring-transparent hover:ring-foreground/20",
        )}
      >
        {body}
      </button>
    );
  return (
    <motion.div
      initial={live ? { opacity: 0, y: 4 } : false}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-[auto_1fr] items-start gap-2 text-xs"
    >
      {body}
    </motion.div>
  );
}

function ObjectionLine({ o }: { o: StandingObjection }) {
  return (
    <li className="grid grid-cols-[auto_1fr] items-start gap-2">
      <AgentAvatar agent={o.by} size="sm" />
      <span className="leading-snug">
        {o.flaw && <b className="mr-1 font-medium">{FLAW[o.flaw]}.</b>}
        {o.text}
        <span className="ml-1 text-muted-foreground">({o.about})</span>
      </span>
    </li>
  );
}

/**
 * Where a hypothesis comes from in the debate and what still stands against it: the debate threads it is built from,
 * a fatal objection that stands (and, if you kept it anyway, your reason), and the caveats kept as limitations.
 */
function Provenance({ h, fresh }: { h: Hypothesis; fresh: boolean }) {
  const contested = h.contested ?? [];
  const caveats = h.caveats ?? [];
  if (!h.from?.length && !contested.length && !caveats.length) return null;
  return (
    <motion.div
      initial={fresh ? { opacity: 0, y: 4 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: fresh ? 0.1 : 0, duration: 0.35 }}
      className="flex flex-col gap-2 text-xs"
    >
      {h.from?.length ? (
        <span className="flex flex-wrap items-center gap-1.5 text-muted-foreground">
          Built from
          {h.from.map((id) => (
            <span
              key={id}
              className="inline-flex h-5 items-center rounded-md bg-muted px-1.5 font-mono font-semibold text-[11px] text-foreground"
            >
              {id}
            </span>
          ))}
          <span>in the debate</span>
        </span>
      ) : null}
      {h.merge_note && <span className="text-muted-foreground leading-snug">{h.merge_note}</span>}
      {contested.length > 0 && (
        <div className="flex flex-col gap-1.5 rounded-lg bg-rose-500/8 px-2.5 py-2 ring-1 ring-rose-500/25">
          <span className="flex items-center gap-1.5 font-medium text-rose-700 dark:text-rose-300">
            <Swords className="size-3.5" />
            {h.kept_by_reviewer ? "Kept by you despite a fatal objection" : "Contested: a fatal objection still stands"}
          </span>
          <ul className="flex flex-col gap-1.5">
            {contested.map((o) => (
              <ObjectionLine key={`${o.by}-${o.about}-${o.text}`} o={o} />
            ))}
          </ul>
          {h.kept_by_reviewer && (
            <span className="text-muted-foreground">
              <b className="font-medium text-foreground/80">Your reason: </b>
              {h.kept_by_reviewer}
            </span>
          )}
        </div>
      )}
      {caveats.length > 0 && (
        <div className="flex flex-col gap-1.5 rounded-lg bg-amber-500/8 px-2.5 py-2 ring-1 ring-amber-500/20">
          <span className="flex items-center gap-1.5 font-medium text-amber-800 dark:text-amber-300">
            <TriangleAlert className="size-3.5" />
            Caveats from the debate · kept as limitations
          </span>
          <ul className="flex flex-col gap-1.5">
            {caveats.map((o) => (
              <ObjectionLine key={`${o.by}-${o.about}-${o.text}`} o={o} />
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
}

/** The tensions of the literature a hypothesis settles, each with the finding on either side. */
function Settles({ tensions, fresh }: { tensions: Tension[]; fresh: boolean }) {
  if (!tensions.length) return null;
  return (
    <div className="flex flex-col gap-2">
      {tensions.map((t, i) => (
        <motion.div
          key={t.id}
          initial={fresh ? { opacity: 0, y: 4 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: fresh ? 0.15 + i * 0.1 : 0, duration: 0.35 }}
          className="flex flex-col gap-1.5 rounded-lg bg-orange-500/8 px-2.5 py-2 text-xs ring-1 ring-orange-500/20"
        >
          <span className="flex items-center gap-1.5 font-medium text-orange-800 dark:text-orange-300">
            <Scale className="size-3.5" />
            Settles {t.id}
            <span className="font-normal text-muted-foreground">· predicts which side holds, and when</span>
          </span>
          <span className="leading-snug">{t.text}</span>
          {t.sides && (
            <span className="grid gap-1.5 sm:grid-cols-2">
              {t.sides.map((side, j) => (
                <span
                  key={side.claim}
                  className="rounded-md bg-card/70 px-2 py-1 leading-snug ring-1 ring-foreground/5"
                >
                  <b className="mr-1 font-mono font-semibold text-[10.5px] text-muted-foreground">{j ? "B" : "A"}</b>
                  {side.claim}
                  <span className="ml-1 text-muted-foreground">
                    ({side.card_ids.length} card{side.card_ids.length === 1 ? "" : "s"})
                  </span>
                </span>
              ))}
            </span>
          )}
        </motion.div>
      ))}
    </div>
  );
}

function HypothesisCard({
  draft,
  tensions,
  fresh,
  live,
  dropped,
  editing,
  onToggle,
}: {
  draft: DraftState;
  /** The tensions it settles. */
  tensions: Tension[];
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
              {(h.falsify as any)?.unit ? `${(h.falsify as any).unit}. ` : "Standardized effect size. "}The result's 95%
              range must stay out of the red.
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
      <Settles tensions={tensions} fresh={fresh} />
      <Provenance h={h} fresh={fresh} />
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
      {/* The novelty check can come alone: the engine does not judge feasibility, and none is made up here. */}
      {novelty && (
        <motion.div
          data-cursor={`check:${h.id}`}
          initial={live ? { opacity: 0, height: 0 } : false}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ delay: live ? 0.9 : 0, duration: 0.35 }}
          className="mt-auto flex flex-col gap-1.5 overflow-hidden border-t pt-2.5 text-xs"
        >
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <ScanSearch className="size-3.5 text-cyan-600" />
            {/* A word-overlap check against the papers this run retrieved: it can find a close match, never prove
                that nothing like the hypothesis was published. */}
            <b
              title="Word overlap with the papers this run retrieved; a heuristic, not proof of novelty"
              className={cn(
                "font-semibold",
                novelty.novel ? "text-emerald-700 dark:text-emerald-300" : "text-amber-800 dark:text-amber-300",
              )}
            >
              {novelty.novel ? "No close match found" : "Close match found"}
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
              <span className="font-mono tabular-nums">{Math.round(novelty.similarity * 100)}% word overlap</span>
            </span>
          </span>
          <span className="text-[11px] text-muted-foreground">
            Checked against the papers this run retrieved, by word overlap. A heuristic, not proof of novelty.
          </span>
          {feasibility && (
            <span className="flex items-start gap-2">
              <CircleCheck
                className={cn("mt-px size-3.5 shrink-0", feasibility.ok ? "text-emerald-600" : "text-rose-600")}
              />
              <span className="text-muted-foreground">{feasibility.note}</span>
            </span>
          )}
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
  tensions,
  round,
  stageKey,
  decisions,
  live,
  step,
}: {
  data: HypothesizeContent;
  /** The synthesis tensions, which hypotheses may settle. */
  tensions: Tension[];
  round: number;
  stageKey: string;
  decisions: FeedItem[];
  live: boolean;
  /** The step running now, while the run is followed live. */
  step: string | null;
}) {
  const scene = useRef<HTMLDivElement>(null);
  const draftsRef = useRef<HTMLDivElement>(null);
  const debateEnd = useRef<HTMLDivElement>(null);
  const { dropMode, dropped, toggleDrop, state } = useWorkspace();
  const editing = dropMode && live;
  const keepable = editing && state.gate?.kind === "hypotheses" ? (state.gate.keepable ?? []) : [];
  const notes = decisions.filter((d) => d.stageKey === stageKey);
  const drafts = data.order.map((id) => data.drafts[id]);
  const set = drafts.filter((d) => d.selected);
  const settled = new Set(drafts.flatMap((d) => d.hypothesis.tension_ids ?? []));
  // Open only once every hypothesis is written: a tension is not open while the next one may still settle it.
  const writing = live && (step === "debate" || step === "write");
  const openTensions = writing || !drafts.length ? [] : tensions.filter((t) => t.id && !settled.has(t.id));
  const seenDrafts = useRef(drafts.length);
  const firstFresh = live ? seenDrafts.current : drafts.length;
  useEffect(() => {
    seenDrafts.current = drafts.length;
  });
  useReveal(debateEnd, data.turns.length, live && !drafts.length);
  useReveal(draftsRef, drafts.length + set.length, live);

  const [view, setView] = useState<"conversation" | "summary">("conversation");
  const [flash, setFlash] = useState<{ id: string; n: number } | null>(null);
  const byId = new Map(data.turns.map((t) => [t.id, t]));
  const replies = new Map<string, DebateTurn[]>();
  for (const turn of data.turns)
    if (turn.reply_to) replies.set(turn.reply_to, [...(replies.get(turn.reply_to) ?? []), turn]);
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

  /** The summary points at an idea: bring its thread into view and wash over it. */
  const focusThread = (id: string) => {
    setView("conversation");
    setFlash((f) => ({ id, n: (f?.n ?? 0) + 1 }));
    // After the conversation is shown again on narrow screens.
    requestAnimationFrame(() => {
      const el = scene.current?.querySelector<HTMLElement>(`[data-thread="${CSS.escape(id)}"]`);
      const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el?.scrollIntoView({ block: "start", behavior: still ? "auto" : "smooth" });
    });
  };

  return (
    <div ref={scene} className="relative flex flex-col gap-4">
      {/* The three lanes stand from the start; the turns fill in below them. */}
      {data.turns.length || !drafts.length ? (
        <Pane title="Debate" aside={debateAside(data.turns, threads.filter((t) => t.id !== VERDICT_THREAD).length)}>
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
          <MotionConfig reducedMotion="user">
            {/* Narrow screens show one side at a time; wide ones show both. */}
            <div className="@container">
              <div className="mb-3 flex @4xl:hidden gap-1 rounded-lg bg-muted/60 p-0.5" role="tablist">
                {(
                  [
                    { id: "conversation", label: "Conversation", icon: MessagesSquare },
                    { id: "summary", label: "Summary", icon: LayoutList },
                  ] as const
                ).map((tab) => (
                  <Button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={view === tab.id}
                    variant="ghost"
                    size="sm"
                    onClick={() => setView(tab.id)}
                    className={cn("relative flex-1", view === tab.id && "hover:bg-transparent")}
                  >
                    {view === tab.id && (
                      <motion.span
                        layoutId="debate-view-tab"
                        className="absolute inset-0 rounded-md bg-card shadow-sm ring-1 ring-foreground/10"
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      />
                    )}
                    <tab.icon className="relative" />
                    <span className="relative">{tab.label}</span>
                  </Button>
                ))}
              </div>
              <div className="grid @4xl:grid-cols-[minmax(0,1fr)_minmax(300px,380px)] gap-5">
                <div
                  className={cn("flex min-w-0 flex-col gap-3.5", view !== "conversation" && "@4xl:flex hidden")}
                  role="tabpanel"
                  aria-label="Conversation"
                >
                  {!data.turns.length &&
                    Array.from({ length: FRAME_TURNS }, (_, i) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: turns not yet said have no ids
                      <PendingTurn key={i} active={step === "debate"} />
                    ))}
                  {threads.map((thread) => (
                    <Thread
                      key={thread.id}
                      id={thread.id}
                      turns={thread.turns}
                      byId={byId}
                      replies={replies}
                      data={data}
                      threadIds={threadIds}
                      newest={lastTurn}
                      debating={debating && thread.id === lastTurn?.about}
                      live={live}
                      flash={flash?.id === thread.id ? flash.n : undefined}
                    />
                  ))}
                </div>
                <aside
                  className={cn(
                    "@4xl:sticky @4xl:top-4 -m-1 @4xl:max-h-[calc(100dvh-6rem)] min-w-0 @4xl:self-start @4xl:overflow-y-auto p-1",
                    view !== "summary" && "@4xl:block hidden",
                  )}
                  role="tabpanel"
                  aria-label="Summary"
                >
                  <DebateBoard
                    turns={data.turns}
                    live={live}
                    activeId={debating ? lastTurn?.about : undefined}
                    pending={step === "debate"}
                    outcome={(id) => <Outcome id={id} data={data} threadIds={threadIds} debating={false} quiet />}
                    onFocus={focusThread}
                  />
                </aside>
              </div>
            </div>
          </MotionConfig>
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
        {openTensions.length > 0 && (
          <motion.p
            initial={live ? { opacity: 0, y: 4 } : false}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap items-center gap-1.5 text-muted-foreground text-xs"
          >
            <Scale className="size-3.5 text-orange-600" />
            Left open by this set:
            {openTensions.map((t) => (
              <span
                key={t.id}
                title={t.text}
                className="inline-flex h-5 items-center rounded-md bg-orange-500/10 px-1.5 font-mono font-semibold text-[11px] text-orange-700 dark:text-orange-300"
              >
                {t.id}
              </span>
            ))}
            <span>no hypothesis here decides between their sides</span>
          </motion.p>
        )}
        <div className={cn("grid gap-3 lg:grid-cols-2", editing && "rounded-2xl ring-3 ring-amber-500/40")}>
          {drafts.map((draft, i) => (
            <HypothesisCard
              key={draft.hypothesis.id}
              draft={draft}
              tensions={tensions.filter((t) => t.id && draft.hypothesis.tension_ids?.includes(t.id))}
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
            <span className="font-medium text-[11px] text-muted-foreground uppercase tracking-wide">Set aside</span>
            {data.asides.map((aside) => (
              <AsideRow key={aside.id} aside={aside} live={live} editing={editing} keepable={keepable} />
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
