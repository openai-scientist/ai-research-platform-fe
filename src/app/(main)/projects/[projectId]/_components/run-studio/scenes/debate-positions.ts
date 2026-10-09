import type { AgentRole, DebateStance, DebateTurn, ObjectionSeverity } from "@/lib/run-stream/contract";

/**
 * Where each perspective stands on one idea, read only from the turns that were said: a turn's stance, the turn it
 * replies to, the challenges it answers and its phase. Nothing here guesses a mood; "objects" means the agent's latest
 * turn on the idea was a challenge that still stands.
 */
export type Position =
  | "proposed"
  | "revised"
  | "defended"
  | "withdrew"
  | "objects"
  | "answered"
  | "satisfied"
  | "agrees"
  | "checks";

/** How the debate on one idea stands after its latest turn. */
export type ThreadStatus =
  | "open"
  | "checked"
  | "agreed"
  | "contested"
  | "caveats"
  | "accepted"
  | "revised"
  | "defended"
  | "withdrawn";

export interface AgentPosition {
  agent: AgentRole;
  position: Position;
  /** The turn the position is read from: the agent's latest on the idea. */
  turnId: string;
  /** For an objection that stands: how serious it is (unknown in runs from before severities). */
  severity?: ObjectionSeverity;
}

export interface ThreadSummary {
  id: string;
  author?: AgentRole;
  proposal?: DebateTurn;
  /** The author's latest rewrite of the claim, if any. */
  revision?: DebateTurn;
  /** The author first, then the others in the order they first spoke. */
  positions: AgentPosition[];
  tally: Record<DebateStance, number>;
  status: ThreadStatus;
  /** Agents whose latest turn is a challenge that still stands (not answered, or upheld on review). */
  objections: number;
  /** Of those, the fatal ones, counting objections of unknown severity as fatal. */
  fatal: number;
  /** Challenges the author answered with a rewrite and that nobody has reviewed yet. */
  answered: number;
  /** Challenges the author answered by keeping the claim, with a reason, and not reviewed yet. */
  defended: number;
  /** Challenges whose critic reviewed the answer and found it resolves them. */
  resolved: number;
  lastTurnId: string;
}

/** The judge's ranking of the perspectives is about every idea at once, so it is not an idea's thread. */
export const VERDICT_THREAD = "Verdict";

/** Turns grouped by the idea they argue about, in the order the ideas came up. */
export function threadsOf(turns: DebateTurn[]) {
  const threads = new Map<string, DebateTurn[]>();
  for (const turn of turns) {
    const key = turn.about ?? "open";
    threads.set(key, [...(threads.get(key) ?? []), turn]);
  }
  return [...threads.entries()].map(([id, list]) => ({ id, turns: list }));
}

export function emptyTally(): Record<DebateStance, number> {
  return { propose: 0, test: 0, challenge: 0, refine: 0, defend: 0, concede: 0 };
}

function statusOf(
  author: DebateTurn | undefined,
  counts: { fatal: number; objections: number; resolved: number; answered: number; defended: number },
  positions: AgentPosition[],
): ThreadStatus {
  if (author?.stance === "concede") return "withdrawn";
  if (counts.fatal) return "contested";
  if (counts.objections) return "caveats";
  if (counts.resolved) return "accepted";
  if (counts.answered) return "revised";
  if (counts.defended) return "defended";
  if (positions.some((p) => p.position === "agrees")) return "agreed";
  if (positions.some((p) => p.position === "checks")) return "checked";
  return "open";
}

export function summarizeThread(id: string, turns: DebateTurn[]): ThreadSummary {
  const proposal = turns.find((t) => t.stance === "propose") ?? turns[0];
  const author = proposal?.actor;
  const tally = emptyTally();
  const latest = new Map<AgentRole, DebateTurn>();
  for (const turn of turns) {
    if (tally[turn.stance] !== undefined) tally[turn.stance] += 1;
    latest.set(turn.actor, turn);
  }

  const own = turns.filter((t) => t.actor === author && t !== proposal);
  const revision = own.filter((t) => t.stance === "refine").at(-1);
  // A challenge counts as answered only when an author's turn names it, in `answers` or `reply_to`. A rewrite that
  // names no challenge was not written in reply to one, so it answers nothing.
  const answeredBy = new Map<string, DebateStance>();
  for (const t of own) for (const ref of t.answers ?? (t.reply_to ? [t.reply_to] : [])) answeredBy.set(ref, t.stance);

  const positions: AgentPosition[] = [];
  const counts = { objections: 0, fatal: 0, answered: 0, defended: 0, resolved: 0 };
  for (const [agent, turn] of latest) {
    let position: Position;
    let severity: ObjectionSeverity | undefined;
    if (agent === author) {
      if (turn.stance === "concede") position = "withdrew";
      else if (revision) position = "revised";
      else position = own.some((t) => t.stance === "defend") ? "defended" : "proposed";
    } else if (turn.stance === "challenge") {
      // An objection upheld on review is a new challenge the author has not answered, so it stands.
      const by = answeredBy.get(turn.id);
      if (by) {
        position = "answered";
        if (by === "defend") counts.defended += 1;
        else if (by === "refine") counts.answered += 1;
      } else {
        position = "objects";
        severity = turn.severity;
        counts.objections += 1;
        if (severity !== "caveat") counts.fatal += 1;
      }
    } else if (turn.stance === "concede") {
      // A concession in the review is the critic accepting the answer to its own objection.
      position = turn.phase === "review" ? "satisfied" : "agrees";
      if (position === "satisfied") counts.resolved += 1;
    } else if (turn.stance === "test") {
      position = "checks";
    } else {
      position = "proposed";
    }
    positions.push({ agent, position, turnId: turn.id, ...(severity ? { severity } : {}) });
  }
  positions.sort((a, b) => Number(b.agent === author) - Number(a.agent === author));

  return {
    id,
    author,
    proposal,
    revision,
    positions,
    tally,
    status: statusOf(author ? latest.get(author) : undefined, counts, positions),
    ...counts,
    lastTurnId: turns[turns.length - 1]?.id ?? "",
  };
}

export interface Ranking {
  place: number;
  agent?: AgentRole;
  name: string;
  score?: number;
  reason: string;
}

const RANK_LINE = /^(\d+)\.\s+(.+?)(?:\s+\((\d+(?:\.\d+)?)\/10\))?(?::\s+(.*))?$/;

/** The judge's ranking as the engine writes it, one "1. Theorist (8/10): reason" per line; null if it reads otherwise. */
export function parseRanking(text: string, names: Record<string, AgentRole>): Ranking[] | null {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const rows: Ranking[] = [];
  for (const line of lines) {
    const m = line.match(RANK_LINE);
    if (!m) return null;
    rows.push({
      place: Number(m[1]),
      name: m[2],
      agent: names[m[2].toLowerCase()],
      score: m[3] === undefined ? undefined : Number(m[3]),
      reason: m[4] ?? "",
    });
  }
  return rows.length ? rows : null;
}

export interface DiffPart {
  kind: "same" | "add" | "del";
  text: string;
}

/** Word pairs compared beyond this are not worth a word diff; the two texts are shown whole instead. */
const MAX_DIFF_WORDS = 400;

const norm = (word: string) => word.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

/**
 * Words removed from `before` and added in `after`. Returns null when the two share too little for a word diff to
 * read well (under 40% of their words in common), so the caller shows them one above the other.
 */
export function wordDiff(before: string, after: string): DiffPart[] | null {
  const a = before.split(/\s+/).filter(Boolean);
  const b = after.split(/\s+/).filter(Boolean);
  if (!a.length || !b.length || a.length > MAX_DIFF_WORDS || b.length > MAX_DIFF_WORDS) return null;
  const an = a.map(norm);
  const bn = b.map(norm);
  // Longest common subsequence of words, filled from the end so the walk below goes forward.
  const lcs = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      lcs[i][j] = an[i] === bn[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
  if ((2 * lcs[0][0]) / (a.length + b.length) < 0.4) return null;

  const parts: DiffPart[] = [];
  const push = (kind: DiffPart["kind"], word: string) => {
    const last = parts[parts.length - 1];
    if (last?.kind === kind) last.text += ` ${word}`;
    else parts.push({ kind, text: word });
  };
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (an[i] === bn[j]) {
      push("same", b[j]);
      i += 1;
      j += 1;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      push("del", a[i]);
      i += 1;
    } else {
      push("add", b[j]);
      j += 1;
    }
  }
  while (i < a.length) push("del", a[i++]);
  while (j < b.length) push("add", b[j++]);
  return parts;
}
