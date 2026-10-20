"use client";

import type { ReactNode } from "react";

import { cn } from "cn";
import {
  CircleCheck,
  CircleSlash,
  FlaskConical,
  Gavel,
  Handshake,
  Lightbulb,
  type LucideIcon,
  PenLine,
  Shield,
  Swords,
  TriangleAlert,
} from "lucide-react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";

import type { AgentRole, DebateStance, DebateTurn, ObjectionFlaw, ObjectionSeverity } from "@/lib/run-stream/contract";

import { AnimatedNumber } from "../animated-number";
import { AgentAvatar, PulseDot } from "../run-bits";
import { AGENTS } from "../run-meta";
import {
  type AgentPosition,
  emptyTally,
  type Position,
  parseRanking,
  type Ranking,
  summarizeThread,
  type ThreadStatus,
  type ThreadSummary,
  threadsOf,
  VERDICT_THREAD,
  wordDiff,
} from "./debate-positions";
import { Bone, Strike } from "./scene-ui";

const EASE = [0.16, 1, 0.3, 1] as const;

export const STANCE: Record<
  DebateStance,
  { label: string; plural: string; icon: LucideIcon; className: string; bar: string }
> = {
  propose: {
    label: "Proposes",
    plural: "proposals",
    icon: Lightbulb,
    className: "bg-violet-500/12 text-violet-700 dark:text-violet-300",
    bar: "bg-violet-500",
  },
  test: {
    label: "Tests",
    plural: "checks",
    icon: FlaskConical,
    className: "bg-blue-500/12 text-blue-700 dark:text-blue-300",
    bar: "bg-blue-500",
  },
  challenge: {
    label: "Challenges",
    plural: "objections",
    icon: Swords,
    className: "bg-orange-500/12 text-orange-700 dark:text-orange-300",
    bar: "bg-orange-500",
  },
  refine: {
    label: "Refines",
    plural: "rewrites",
    icon: PenLine,
    className: "bg-sky-500/12 text-sky-700 dark:text-sky-300",
    bar: "bg-sky-500",
  },
  defend: {
    label: "Defends",
    plural: "defences",
    icon: Shield,
    className: "bg-indigo-500/12 text-indigo-700 dark:text-indigo-300",
    bar: "bg-indigo-500",
  },
  concede: {
    label: "Concedes",
    plural: "agreements",
    icon: Handshake,
    className: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
    bar: "bg-emerald-500",
  },
};

export const STANCE_ORDER: DebateStance[] = ["propose", "challenge", "refine", "defend", "concede", "test"];

/** How serious an objection is, as a tag beside it. */
export const SEVERITY: Record<ObjectionSeverity, { label: string; className: string }> = {
  fatal: { label: "Fatal", className: "bg-rose-500/12 text-rose-700 dark:text-rose-300" },
  caveat: { label: "Caveat", className: "bg-amber-500/15 text-amber-800 dark:text-amber-300" },
};

/** The four flaws that make an objection fatal, in plain words. */
export const FLAW: Record<ObjectionFlaw, string> = {
  unsupported: "not supported by the cards",
  unfalsifiable: "no result could prove it wrong",
  undecidable_test: "the test cannot decide it",
  already_established: "already shown by a paper",
};

const STATUS: Record<ThreadStatus, { label: string; icon: LucideIcon; className: string }> = {
  open: { label: "Open", icon: Lightbulb, className: "bg-muted text-muted-foreground" },
  checked: { label: "Being checked", icon: FlaskConical, className: STANCE.test.className },
  agreed: { label: "Agreed", icon: Handshake, className: STANCE.concede.className },
  contested: { label: "Objection stands", icon: Swords, className: SEVERITY.fatal.className },
  caveats: { label: "Caveats noted", icon: TriangleAlert, className: SEVERITY.caveat.className },
  accepted: { label: "Accepted after review", icon: CircleCheck, className: STANCE.concede.className },
  revised: { label: "Revised", icon: PenLine, className: STANCE.refine.className },
  defended: { label: "Defended", icon: Shield, className: STANCE.defend.className },
  withdrawn: {
    label: "Withdrawn",
    icon: CircleSlash,
    className: "bg-rose-500/12 text-rose-700 dark:text-rose-300",
  },
};

const POSITION: Record<Position, { label: string; icon: LucideIcon; className: string }> = {
  proposed: { label: "Proposed", icon: Lightbulb, className: "text-violet-700 dark:text-violet-300" },
  revised: { label: "Rewrote it", icon: PenLine, className: "text-sky-700 dark:text-sky-300" },
  defended: { label: "Defends it", icon: Shield, className: "text-indigo-700 dark:text-indigo-300" },
  withdrew: { label: "Withdrew", icon: CircleSlash, className: "text-rose-700 dark:text-rose-300" },
  objects: { label: "Objects", icon: Swords, className: "text-orange-700 dark:text-orange-300" },
  answered: { label: "Objection answered", icon: Swords, className: "text-muted-foreground" },
  satisfied: { label: "Objection resolved", icon: CircleCheck, className: "text-emerald-700 dark:text-emerald-300" },
  agrees: { label: "Agrees", icon: Handshake, className: "text-emerald-700 dark:text-emerald-300" },
  checks: { label: "Asks how to test", icon: FlaskConical, className: "text-blue-700 dark:text-blue-300" },
};

const NAMES: Record<string, AgentRole> = Object.fromEntries(
  (Object.keys(AGENTS) as AgentRole[]).map((role) => [AGENTS[role].name.toLowerCase(), role]),
);

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function names(agents: AgentRole[]) {
  const list = agents.map((a) => AGENTS[a]?.name ?? a);
  return list.length > 1 ? `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}` : (list[0] ?? "");
}

/** One line under the status saying what it rests on. */
function statusLine(s: ThreadSummary) {
  const agree = s.positions.filter((p) => p.position === "agrees").map((p) => p.agent);
  switch (s.status) {
    case "withdrawn":
      return `${names(s.author ? [s.author] : [])} accepted the objection and withdrew it`;
    case "contested":
      return `${plural(s.fatal, "fatal objection")} still ${s.fatal === 1 ? "stands" : "stand"}`;
    case "caveats":
      return `${plural(s.objections, "caveat")} kept as ${s.objections === 1 ? "a limitation" : "limitations"}`;
    case "accepted":
      return `${plural(s.resolved, "objection")} resolved when the critic reviewed the answer`;
    case "revised":
      return `Rewritten in reply to ${plural(s.answered, "objection")}${s.defended ? `, defended against ${s.defended}` : ""}`;
    case "defended":
      return `Kept, with reasons, against ${plural(s.defended, "objection")}`;
    case "agreed":
      return `${names(agree)} ${agree.length === 1 ? "agrees" : "agree"}`;
    case "checked":
      return "Asked how it would be tested";
    default:
      return "No reply yet";
  }
}

function ThreadStatusPill({ status }: { status: ThreadStatus }) {
  const meta = STATUS[status];
  const Icon = meta.icon;
  return (
    <span className="relative ml-auto inline-flex">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={status}
          initial={{ opacity: 0, y: 8, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 420, damping: 30 }}
          className={cn("inline-flex h-5 items-center gap-1 rounded-full px-2 font-medium text-[11px]", meta.className)}
        >
          <Icon className="size-3" />
          {meta.label}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/** An objection that stands says how serious it is. */
function positionMeta(position: AgentPosition) {
  const base = POSITION[position.position];
  if (position.position !== "objects" || !position.severity) return base;
  if (position.severity === "caveat")
    return { ...base, label: "Caveat", icon: TriangleAlert, className: "text-amber-800 dark:text-amber-300" };
  return { ...base, label: "Fatal objection", className: "text-rose-700 dark:text-rose-300" };
}

function PositionChip({ position, live, text }: { position: AgentPosition; live: boolean; text?: string }) {
  const meta = positionMeta(position);
  const Icon = meta.icon;
  return (
    <motion.span
      layout="position"
      initial={live ? { opacity: 0, scale: 0.8 } : false}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 380, damping: 26 }}
      title={text}
      className="inline-flex h-6 items-center gap-1.5 rounded-full bg-muted/60 py-0.5 pr-2 pl-0.5 text-[11px]"
    >
      <span className="relative">
        <AgentAvatar agent={position.agent} size="sm" />
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={position.position}
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 20 }}
            className={cn(
              "absolute -right-1 -bottom-1 grid size-3 place-items-center rounded-full bg-card ring-1 ring-foreground/10",
              meta.className,
            )}
          >
            <Icon className="size-2" />
          </motion.span>
        </AnimatePresence>
      </span>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={position.position}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
          className={cn("font-medium", meta.className)}
        >
          {meta.label}
        </motion.span>
      </AnimatePresence>
    </motion.span>
  );
}

/** The claim as first proposed and as rewritten: removed words struck, added words marked. */
function Rewrite({ summary, live }: { summary: ThreadSummary; live: boolean }) {
  const before = summary.proposal?.text ?? "";
  const after = summary.revision?.text ?? "";
  const parts = wordDiff(before, after);
  const key = summary.revision?.id ?? "";
  // Only a rewrite that names the challenges it answers was written in reply to them.
  const inReply = (summary.revision?.answers?.length ?? 0) > 0 || Boolean(summary.revision?.reply_to);
  const note = summary.revision?.note;
  return (
    <motion.span
      key={key}
      initial={live ? { opacity: 0, height: 0 } : false}
      animate={{ opacity: 1, height: "auto" }}
      transition={{ duration: 0.4, ease: EASE }}
      className="block overflow-hidden"
    >
      <span className="block rounded-lg bg-muted/45 px-2.5 py-2 text-[13px] leading-snug">
        <span className="mb-1 flex items-center gap-1 font-medium text-[11px] text-sky-700 dark:text-sky-300">
          <PenLine className="size-3" />
          {inReply ? "Rewritten in reply" : "Rewritten during the debate"}
        </span>
        {parts ? (
          <span className="block">
            {parts.map((part, i) => {
              const id = `${key}-${i}`;
              if (part.kind === "same") return <span key={id}>{part.text} </span>;
              if (part.kind === "del")
                return (
                  <span key={id}>
                    <Strike live={live} className="text-muted-foreground">
                      {part.text}
                    </Strike>{" "}
                  </span>
                );
              return (
                <span key={id}>
                  <motion.span
                    initial={live ? { opacity: 0, y: 3 } : false}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: live ? 0.25 + i * 0.03 : 0, duration: 0.3 }}
                    className="rounded-sm bg-emerald-500/15 px-0.5 text-emerald-800 dark:text-emerald-200"
                  >
                    {part.text}
                  </motion.span>{" "}
                </span>
              );
            })}
          </span>
        ) : (
          <span className="flex flex-col gap-1">
            <span className="line-clamp-3 text-muted-foreground">
              <span className="mr-1 font-medium text-[10.5px] uppercase tracking-wide">Before</span>
              <Strike live={live}>{before}</Strike>
            </span>
            <span className="line-clamp-4">
              <span className="mr-1 font-medium text-[10.5px] text-sky-700 uppercase tracking-wide dark:text-sky-300">
                After
              </span>
              {after}
            </span>
          </span>
        )}
        {note && (
          <span className="mt-1.5 block text-[11px] text-muted-foreground leading-snug">
            <b className="font-medium text-foreground/80">Why: </b>
            {note}
          </span>
        )}
      </span>
    </motion.span>
  );
}

function ThreadCard({
  summary,
  live,
  active,
  texts,
  outcome,
  onFocus,
}: {
  summary: ThreadSummary;
  live: boolean;
  active: boolean;
  texts: Map<string, string>;
  outcome?: ReactNode;
  onFocus(id: string): void;
}) {
  const isIdea = !summary.id.startsWith("H");
  const claim = summary.proposal?.text ?? "";
  return (
    <motion.li layout="position" transition={{ duration: 0.4, ease: EASE }} className="list-none">
      <motion.button
        type="button"
        onClick={() => onFocus(summary.id)}
        initial={live ? { opacity: 0, y: 10, scale: 0.98 } : false}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: EASE }}
        aria-label={`Show the debate on ${summary.id}`}
        className="group relative flex w-full flex-col gap-2 rounded-xl bg-card px-3 py-2.5 text-left text-sm outline-none ring-1 ring-foreground/10 transition-shadow duration-300 hover:shadow-sm hover:ring-foreground/25 focus-visible:ring-2 focus-visible:ring-ring"
      >
        {active && (
          <motion.span
            layoutId="debate-board-active"
            aria-hidden
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="pointer-events-none absolute -inset-px rounded-xl ring-2 ring-sky-500/50"
          />
        )}
        <span className="flex items-center gap-2">
          <b
            className={cn(
              "inline-flex h-5 items-center rounded-md px-1.5 font-bold font-mono text-[11px]",
              isIdea ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground",
            )}
          >
            {summary.id}
          </b>
          {summary.author && (
            <span className="flex min-w-0 items-center gap-1 text-[11px] text-muted-foreground">
              by
              <b className={cn("truncate font-semibold", AGENTS[summary.author]?.text)}>
                {AGENTS[summary.author]?.name}
              </b>
            </span>
          )}
          {active && <PulseDot className="bg-sky-500" />}
          <ThreadStatusPill status={summary.status} />
        </span>
        {/* A rewritten claim is read in the rewrite itself, which holds the new wording. */}
        {summary.revision && summary.proposal ? (
          <Rewrite summary={summary} live={live} />
        ) : (
          <span className="line-clamp-3 text-[13px] leading-snug">{claim}</span>
        )}
        <span className="flex flex-wrap gap-1.5">
          {summary.positions.map((p) => (
            <PositionChip key={p.agent} position={p} live={live} text={texts.get(p.turnId)} />
          ))}
        </span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={statusLine(summary)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              {statusLine(summary)}
            </motion.span>
          </AnimatePresence>
          {outcome && <span className="ml-auto">{outcome}</span>}
        </span>
      </motion.button>
    </motion.li>
  );
}

/** How many turns of each kind the debate held, as one bar. */
function Tally({ turns }: { turns: DebateTurn[] }) {
  const tally = emptyTally();
  for (const t of turns) if (tally[t.stance] !== undefined) tally[t.stance] += 1;
  const total = turns.length || 1;
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-muted/40 px-3 py-2.5">
      <div className="flex h-2 overflow-hidden rounded-full bg-muted">
        {STANCE_ORDER.map((stance) => (
          <motion.span
            key={stance}
            className={cn("h-full", STANCE[stance].bar)}
            initial={false}
            animate={{ width: `${(tally[stance] / total) * 100}%` }}
            transition={{ duration: 0.6, ease: EASE }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
        {STANCE_ORDER.map((stance) => {
          const Icon = STANCE[stance].icon;
          return (
            <span
              key={stance}
              className={cn("inline-flex items-center gap-1", !tally[stance] && "text-muted-foreground/60")}
            >
              <span className={cn("size-1.5 rounded-full", STANCE[stance].bar)} />
              <Icon className="size-3 text-muted-foreground" />
              <AnimatedNumber value={tally[stance]} duration={500} className="font-mono font-semibold tabular-nums" />
              <span className="text-muted-foreground">{STANCE[stance].plural}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

function RankingCard({ rows, live }: { rows: Ranking[]; live: boolean }) {
  return (
    <motion.div
      layout="position"
      initial={live ? { opacity: 0, y: 10 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE }}
      className="flex flex-col gap-2 rounded-xl bg-card px-3 py-2.5 ring-1 ring-foreground/10"
    >
      <span className="flex items-center gap-1.5 font-semibold text-xs">
        <Gavel className="size-3.5 text-muted-foreground" />
        Judge's ranking
        <span className="ml-auto font-normal text-[11px] text-muted-foreground">whole positions, not single ideas</span>
      </span>
      <ol className="flex flex-col gap-2">
        {rows.map((row, i) => (
          <motion.li
            key={`${row.place}-${row.name}`}
            initial={live ? { opacity: 0, x: -6 } : false}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: live ? 0.15 + i * 0.12 : 0, duration: 0.35 }}
            className="grid grid-cols-[16px_20px_minmax(0,1fr)] items-start gap-2 text-xs"
          >
            <span className="pt-0.5 font-mono font-semibold text-muted-foreground tabular-nums">{row.place}</span>
            {row.agent ? <AgentAvatar agent={row.agent} size="sm" /> : <span />}
            <span className="flex min-w-0 flex-col gap-1">
              <span className="flex items-center gap-2">
                <b className={cn("font-semibold", row.agent && AGENTS[row.agent]?.text)}>{row.name}</b>
                {row.score !== undefined && (
                  <span className="ml-auto flex items-center gap-1.5">
                    <span className="relative h-1.5 w-14 overflow-hidden rounded-full bg-muted">
                      <motion.i
                        className="absolute inset-y-0 left-0 rounded-full bg-foreground/70"
                        initial={{ width: live ? 0 : `${row.score * 10}%` }}
                        animate={{ width: `${row.score * 10}%` }}
                        transition={{ delay: live ? 0.3 + i * 0.12 : 0, duration: 0.6, ease: EASE }}
                      />
                    </span>
                    <span className="font-mono tabular-nums">{row.score}/10</span>
                  </span>
                )}
              </span>
              {row.reason && <span className="text-muted-foreground leading-snug">{row.reason}</span>}
            </span>
          </motion.li>
        ))}
      </ol>
    </motion.div>
  );
}

/** A card's place before the debate starts. */
function PendingCard({ active }: { active: boolean }) {
  return (
    <div aria-hidden className="flex flex-col gap-2 rounded-xl px-3 py-2.5 ring-1 ring-foreground/10">
      <span className="flex items-center gap-2">
        <span className="h-5 w-8 rounded-md bg-muted" />
        <Bone active={active} className="w-1/4" />
        <span className="ml-auto h-5 w-16 rounded-full bg-muted" />
      </span>
      <Bone active={active} />
      <Bone active={active} className="w-4/5" />
      <span className="flex gap-1.5">
        <span className="h-6 w-20 rounded-full bg-muted" />
        <span className="h-6 w-20 rounded-full bg-muted" />
      </span>
    </div>
  );
}

/**
 * Where the debate stands, idea by idea: who proposed it, who objects or agrees, how the claim was rewritten, and what
 * the judge ranked. Read from each turn's stance and what it replies to; nothing is inferred from tone.
 */
export function DebateBoard({
  turns,
  live,
  activeId,
  pending,
  outcome,
  onFocus,
}: {
  turns: DebateTurn[];
  live: boolean;
  /** The idea argued about right now, while the run is followed live. */
  activeId?: string;
  /** The debate is running but nothing has been said yet. */
  pending: boolean;
  outcome(id: string): ReactNode;
  onFocus(id: string): void;
}) {
  const threads = threadsOf(turns).filter((t) => t.id !== VERDICT_THREAD && t.id !== "open");
  const summaries = threads.map((t) => summarizeThread(t.id, t.turns));
  const argued = turns.filter((t) => t.about !== VERDICT_THREAD);
  const judge = turns.filter((t) => t.about === VERDICT_THREAD).at(-1);
  const ranking = judge ? parseRanking(judge.text, NAMES) : null;
  const texts = new Map(turns.map((t) => [t.id, t.text]));

  return (
    <div className="flex flex-col gap-3">
      <Tally turns={argued} />
      {!summaries.length && (
        <div className="flex flex-col gap-2.5">
          <PendingCard active={pending} />
          <PendingCard active={pending} />
        </div>
      )}
      <LayoutGroup id="debate-board">
        <ul className="flex flex-col gap-2.5">
          {summaries.map((s) => (
            <ThreadCard
              key={s.id}
              summary={s}
              live={live}
              active={s.id === activeId}
              texts={texts}
              outcome={outcome(s.id)}
              onFocus={onFocus}
            />
          ))}
        </ul>
      </LayoutGroup>
      {ranking && <RankingCard rows={ranking} live={live} />}
      {summaries.length > 0 && (
        <p className="px-1 text-[11px] text-muted-foreground leading-snug">
          Positions come from each turn's stance and the turn it replies to, not from tone. Hover a position to read the
          turn behind it.
        </p>
      )}
    </div>
  );
}
