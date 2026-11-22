"use client";
"use no memo";

/* ===== Live screens of the Argue block: the statements on the fourth axis (S03), and the debate (S04) =====
   Each stage plays its files onto the frame's scene: the statements arrive and sort into their lanes, take their
   status and their lifecycle links; the debate hears the claims, then each thread's challenges, replies and rulings. */

import { emit, flyIn, item, log, reveal, S, sleep, step, tell } from "../engine";
import {
  claimsInOrder,
  DebateLive,
  DRAFT,
  debateTurns,
  FINAL,
  HEARD,
  type LiveTurn,
  TURNS,
  TURNS_TYPED,
} from "./argue-debate";
import { YOU } from "./argue-kit";
import {
  boardOrder,
  entityOf,
  LANES,
  laneOf,
  SCIENTIST,
  STATUS_ALLOWS,
  STM,
  STM_TYPED,
  StatementsLive,
} from "./argue-statements";
import { need, until } from "./kit";
import { file, has, LIVE, LIVE_STAGES, newest } from "./run";
import type { LiveScreen } from "./stages";

const plural = (n: number, word: string, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;
const PLURAL: Record<string, string> = { hypothesis: "hypotheses", analysis: "analyses" };
/** Words as a list: "a, b and c". */
const listed = (parts: string[]) =>
  parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}` : (parts[0] ?? "none");
/** A count of each kind, in the order given, as a sentence: "1 gap, 3 findings and 2 conclusions". */
function counted(kinds: string[], of: (k: string) => number, name = (k: string) => k, nouns = true) {
  return listed(
    kinds
      .filter((k) => of(k) > 0)
      .map((k) => (nouns ? plural(of(k), name(k), PLURAL[name(k)]) : `${of(k)} ${name(k)}`)),
  );
}
const capital = (s: string) => s.replace(/^./, (c) => c.toUpperCase());

/* ---------- S03 · the statements ---------- */
const registry = () => file("StatementRegistry.json")?.statements ?? [];
const blockedOnes = () => registry().filter((s) => s.status === "blocked");

async function playStatements() {
  // The registry and its links come together, when the Statement Scientist's step ends.
  if (!(await need("S03", "StatementRegistry.json", "LifecycleLinks.json"))) return;
  const all = boardOrder(registry());
  const links = file("LifecycleLinks.json")?.links ?? [];
  const n = all.length;
  // The first card of each lane is typed out as it lands; the rest are shown whole.
  STM_TYPED.clear();
  for (const l of LANES.keys()) {
    const first = all.find((s) => laneOf(s) === l);
    if (first) STM_TYPED.add(first.statement_id);
  }
  const by = (o: string) => all.filter((s) => s.origin === o).length;
  const from = [
    by("record") && `${by("record")} fixed by the record`,
    by("model") && `${by("model")} added by the Statement Scientist`,
    by("library") && `${by("library")} standard statements on how a ranking of people may be used`,
  ].filter(Boolean);
  await step(
    "S03",
    "d1",
    async () => {
      for (let i = 1; i <= n; i++) {
        S.n[STM.arrived] = i;
        emit();
        await sleep(70);
      }
    },
    { text: `${n} statements: ${from.join(", ")}.` },
  );
  const types = LANES.flatMap((l) => l.types);
  await step(
    "S03",
    "d2",
    async () => {
      for (const [i, s] of all.entries()) {
        const id = s.statement_id;
        const typed = STM_TYPED.has(id);
        flyIn(`[data-pile="${id}"]`, `[data-lane="${laneOf(s)}"]`, id, "bg-foreground text-background");
        await sleep(typed ? 260 : 200);
        await item(STM.sorted, i, { id, text: typed ? s.text : "", actor: SCIENTIST, wait: typed ? 0 : 110 });
      }
    },
    {
      text: `On the fourth axis: ${counted(
        types,
        (t) => all.filter((s) => s.type === t).length,
        (t) => entityOf(t).name.toLowerCase(),
      )}.`,
    },
  );
  const statuses = Object.keys(STATUS_ALLOWS);
  await step(
    "S03",
    "d3",
    async () => {
      S.n[STM.status] = 1;
      emit();
      await sleep(900);
    },
    {
      text: capital(
        `${counted(
          statuses,
          (k) => all.filter((s) => s.status === k).length,
          (k) => k,
          false,
        )}. Each status says how strongly the paper may write it.`,
      ),
    },
  );
  const typeOf = (id: string) => entityOf(all.find((s) => s.statement_id === id)?.type ?? "").name.toLowerCase();
  const kinds = [...new Set(links.map((l) => `${typeOf(l.from)} → ${typeOf(l.to)}`))];
  await step(
    "S03",
    "d4",
    async () => {
      S.n[STM.links] = 1;
      emit();
      reveal("[data-lane]");
      await sleep(1200);
    },
    { text: links.length ? `${plural(links.length, "lifecycle link")}: ${kinds.join(", ")}.` : "No lifecycle links." },
  );
  const blocked = blockedOnes();
  await step(
    "S03",
    "d5",
    async () => {
      S.n[STM.blocked] = 1;
      emit();
      await sleep(blocked.length ? 900 : 300);
    },
    {
      text: blocked.length
        ? `${plural(blocked.length, "statement")} blocked: ${blocked.map((s) => `${s.statement_id}, ${s.blocked_reason ?? "beyond the claim ceiling"}`).join("; ")}.`
        : "Nothing goes past the claim ceiling: no statement is blocked.",
    },
  );
}
function statementsSummary() {
  const all = registry();
  const n = all.length || Number(LIVE.summary.S03?.statements ?? 0);
  const links = file("LifecycleLinks.json")?.links.length;
  const blocked = all.length ? blockedOnes().length : Number(LIVE.summary.S03?.blocked ?? 0);
  return `${plural(n, "statement")} labelled${links !== undefined ? `, ${plural(links, "lifecycle link")}` : ""}; ${blocked ? `${blocked} blocked by the claim ceiling` : "none blocked"}.`;
}

const STATEMENTS: LiveScreen = {
  key: "statements",
  title: "Label every scientific statement",
  short: "Axis 4",
  block: 2,
  Scene: StatementsLive,
  stages: [
    {
      id: "S03",
      ph: 1,
      short: "Axis 4",
      name: "Scientific Axis-4 Labelling",
      a: SCIENTIST,
      title: "Label every scientific statement",
      lead: "Every scientific statement of the study gets its type on the fourth axis and an epistemic status that sets how strongly the paper may write it. Questions and objectives are not true or false, so they stay outside the argument graph as its context.",
      outs: ["StatementRegistry.json", "LifecycleLinks.json"],
      steps: [
        { id: "d1", a: SCIENTIST, t: "Collect every scientific statement" },
        { id: "d2", a: SCIENTIST, t: "Label each on the fourth axis" },
        { id: "d3", a: SCIENTIST, t: "Give each an epistemic status" },
        { id: "d4", a: "code", t: "Link the lifecycle" },
        { id: "d5", a: "code", t: "Block what the claim ceiling forbids" },
      ],
      needs: ["StatementRegistry.json", "LifecycleLinks.json"],
      progressive: true,
      play: playStatements,
      summary: statementsSummary,
    },
  ],
};

/* ---------- S04 · the debate ---------- */
const CLAIM_GROUPS: { id: string; types: string[]; none: string }[] = [
  { id: "v2", types: ["gap"], none: "No gap is argued in this run." },
  { id: "v3", types: ["finding"], none: "No finding is argued in this run." },
  {
    id: "v4",
    types: ["conclusion", "implication", "comparison"],
    none: "No conclusion, implication or comparison is argued in this run.",
  },
];
const claimType = (id: string) => registry().find((s) => s.statement_id === id)?.type ?? "";
/** The Proponent's replies, before and after the Judge rules on them. */
const REPLIES = new Set(["reply", "defend", "concede"]);
/** Who speaks, by the screens' key, in the narration of each step. */
const AGENT_NAME: Record<string, string> = {
  qm: "method",
  qs: "statistics",
  qx: "scope",
  qo: "sources",
};
/** How many exchanges are typed out: the first few, then the rest show whole so the debate plays in about a minute. */
const TYPED_EXCHANGES = 3;

/** Hears one turn of the debate: typed out (the first few), or shown whole, the speaker's seat animating. */
let heard = 0;
async function hear(t: LiveTurn) {
  const typed = TURNS_TYPED.has(t.id) && !S.fast;
  if (typed) tell(t.a, t.tx);
  if (t.st === "rule" && (typed || t.r === "upheld" || t.r === "undecided"))
    log(
      "jd",
      `${t.th} · ${t.r === "conceded" ? "Conceded" : t.r === "upheld" ? "Upheld" : t.r === "answered" ? "Answered" : "Ruled"}. ${t.tx}`,
    );
  HEARD.add(t.id);
  const done = item(TURNS, heard++, {
    id: t.id,
    text: typed ? t.tx : "",
    value: t.th,
    actor: t.a,
    wait: typed ? 0 : t.st === "propose" ? 420 : 230,
    beat: typed ? 420 : t.st === "rule" || t.st === "record" ? 120 : 0,
  });
  reveal(`[data-turn="${t.id}"]`, "center");
  await done;
}
const later = (sid: string) => LIVE_STAGES.slice(LIVE_STAGES.indexOf(sid) + 1).some((x) => LIVE.begun.has(x));
/** The run went on (or stopped) without the files it was waiting for. */
const gone = () => Boolean(LIVE.failed) || (LIVE.finished.has("S04") && later("S04") && LIVE.caughtUp);
const finalNewest = () => has(FINAL) && newest(DRAFT, FINAL) === FINAL;
const kinds = ["gap", "finding", "conclusion", "implication", "comparison"];
const claimsLine = (claims: ReturnType<typeof claimsInOrder>) =>
  capital(
    `${counted(kinds, (k) => claims.filter((c) => claimType(c.claim_id) === k).length)}, each argued under its scheme: ${listed([...new Set(claims.map((c) => c.scheme_name.toLowerCase()))])}.`,
  );
/** The close of the record: whether each claim stands, from the rulings. */
async function closeRecord() {
  const rulings = file("Rulings.json")?.claims ?? [];
  const outcomes: Record<string, number> = {};
  for (const c of rulings) for (const [k, v] of Object.entries(c.outcomes)) outcomes[k] = (outcomes[k] ?? 0) + v;
  const stand = rulings.filter((c) => c.stands).length;
  const named: Record<string, string> = { closed_from_record: "closed from the record" };
  await step(
    "S04",
    "v5",
    async () => {
      reveal("[data-rulings]");
      await sleep(900);
    },
    {
      text: `${stand === rulings.length ? `All ${plural(rulings.length, "claim")} stand` : `${stand} of ${plural(rulings.length, "claim")} stand`}: ${Object.entries(
        outcomes,
      )
        .map(([k, v]) => `${v} ${named[k] ?? k}`)
        .join(", ")}.`,
    },
  );
}

/* ---------- a run that writes its debate as it goes: each version of the draft streams what it adds ---------- */
/** Streams the turns of the newest draft (or the final record) not heard yet, kind by kind, each under its step. */
async function hearNew() {
  const claims = claimsInOrder();
  const fresh = debateTurns().filter((t) => !HEARD.has(t.id));
  if (!fresh.length) return;
  // The first of each kind in this batch is typed out; the rest show whole.
  for (const kind of ["propose", "record", "challenge", "reply", "rule"])
    for (const t of fresh
      .filter((x) => (kind === "reply" ? REPLIES.has(x.st) : x.st === kind))
      .slice(0, kind === "propose" ? 1 : 2))
      TURNS_TYPED.add(t.id);
  const of = (pick: (t: LiveTurn) => boolean) => fresh.filter(pick);
  const claimTurns = of((t) => t.st === "propose");
  if (claimTurns.length)
    await step(
      "S04",
      "v1",
      async () => {
        for (const t of claimTurns) await hear(t);
      },
      { text: claimsLine(claims) },
    );
  const record = of((t) => t.st === "record");
  if (record.length)
    await step(
      "S04",
      "p1",
      async () => {
        for (const t of record) await hear(t);
      },
      {
        text: `${plural(record.length, "critical question")} answered from the record by code, before any critic speaks.`,
      },
    );
  const challenges = of((t) => t.st === "challenge");
  if (challenges.length) {
    const theirs = challenges.filter((t) => t.a !== YOU);
    const yours = challenges.filter((t) => t.a === YOU);
    const critics = [...new Set(theirs.map((t) => AGENT_NAME[t.a] ?? ""))].filter(Boolean);
    const on = (ts: LiveTurn[]) => listed([...new Set(ts.map((t) => t.th))]);
    await step(
      "S04",
      "p2",
      async () => {
        for (const t of challenges) await hear(t);
      },
      {
        text: [
          theirs.length
            ? `The ${listed(critics)} ${critics.length > 1 ? "critics" : "critic"} challenged ${plural(theirs.length, "exchange")} on ${on(theirs)}, each with its grounds in the record.`
            : "",
          yours.length ? `You raised ${plural(yours.length, "objection")} of your own, on ${on(yours)}.` : "",
        ]
          .filter(Boolean)
          .join(" "),
      },
    );
  }
  const replies = of((t) => REPLIES.has(t.st));
  if (replies.length)
    await step(
      "S04",
      "p3",
      async () => {
        for (const t of replies) await hear(t);
      },
      {
        text: `The Proponent answered ${plural(replies.length, "challenge")} from the record${Math.max(...replies.map((t) => t.round ?? 1)) > 1 ? `, round ${Math.max(...replies.map((t) => t.round ?? 1))}` : ""}.`,
      },
    );
  const rulings = of((t) => t.st === "rule");
  if (rulings.length) {
    const by = (r: string) => rulings.filter((t) => t.r === r).length;
    await step(
      "S04",
      "p4",
      async () => {
        for (const t of rulings) await hear(t);
      },
      {
        text: `The Judge ruled on ${plural(rulings.length, "exchange")}: ${[
          "conceded",
          "answered",
          "upheld",
          "struck",
          "undecided",
        ]
          .filter((r) => by(r))
          .map((r) => `${by(r)} ${r}`)
          .join(", ")}.`,
      },
    );
  }
}
async function playDrafts() {
  let version = -1;
  // While the debate is argued, each new version of the draft streams the turns it adds.
  while (!finalNewest()) {
    await until(() => finalNewest() || gone() || (has(DRAFT) && (LIVE.versions[DRAFT] ?? 0) !== version));
    if (finalNewest() || gone()) break;
    version = LIVE.versions[DRAFT] ?? 0;
    await hearNew();
  }
  if (!(await need("S04", FINAL, "Rulings.json"))) return;
  // The final record: whatever the drafts did not carry (a decision you settled, a last ruling), then the close.
  await hearNew();
  await closeRecord();
}

/* ---------- a run that writes the record once: the claims, then each thread, as before ---------- */
async function playRecord() {
  if (!(await need("S04", FINAL, "Rulings.json"))) return;
  const rec = file(FINAL);
  const claims = claimsInOrder();
  const turns = debateTurns();
  // The first claim and the first exchanges are typed out; every other turn shows whole.
  const exchangeOf = (t: LiveTurn) => t.id.replace(/:(challenge|reply|ruling|record)$/, "");
  const typedX = [...new Set(turns.filter((t) => t.st !== "propose").map(exchangeOf))].slice(0, TYPED_EXCHANGES);
  for (const t of turns)
    if (t.st === "propose" ? t === turns[0] : typedX.includes(exchangeOf(t))) TURNS_TYPED.add(t.id);
  await step(
    "S04",
    "v1",
    async () => {
      for (const t of turns.filter((x) => x.st === "propose")) await hear(t);
    },
    { text: claimsLine(claims) },
  );
  for (const g of CLAIM_GROUPS) {
    const ids = claims.filter((c) => g.types.includes(claimType(c.claim_id))).map((c) => c.claim_id);
    const xs = (rec?.exchanges ?? []).filter((x) => ids.includes(x.claim_id));
    const byRecord = xs.filter((x) => x.by === "record").length;
    const argued = xs.filter((x) => x.challenge).length;
    const critics = [...new Set(xs.filter((x) => x.challenge && x.critic !== "researcher").map((x) => x.critic))];
    const yours = xs.some((x) => x.challenge && x.critic === "researcher");
    const who = critics.length
      ? `The ${listed(critics)} critic${critics.length > 1 ? "s" : ""}${yours ? " and you" : ""}`
      : "You";
    const text = ids.length
      ? [
          `${listed(ids)}: ${plural(xs.length, "critical question")}.`,
          byRecord ? `${byRecord} answered from the record.` : "",
          argued
            ? `${who} challenged ${byRecord ? `the other ${argued}` : argued === 1 ? "it" : `all ${argued}`}; the Proponent replied and the Judge ruled.`
            : "",
        ]
          .filter(Boolean)
          .join(" ")
      : g.none;
    await step(
      "S04",
      g.id,
      async () => {
        for (const t of turns.filter((x) => x.st !== "propose" && ids.includes(x.th))) await hear(t);
      },
      { text },
    );
  }
  await closeRecord();
}

async function playDebate() {
  HEARD.clear();
  TURNS_TYPED.clear();
  heard = 0;
  // The claims' words and types come from the statement registry, which the previous step published.
  if (!(await need("S04", "StatementRegistry.json"))) return;
  // A run that writes its debate as it goes publishes a draft first; one that does not, the final record only.
  await until(() => has(DRAFT) || has(FINAL) || gone());
  if (has(DRAFT)) await playDrafts();
  else await playRecord();
}
function debateSummary() {
  const rec = file("DebateRecord.json");
  const sum = LIVE.summary.S04 ?? {};
  const claims = rec?.claims.length ?? Number(sum.claims ?? 0);
  const xs = rec?.exchanges ?? [];
  const exchanges = rec ? xs.length : Number(sum.exchanges ?? 0);
  const byRecord = rec ? xs.filter((x) => x.outcome === "closed_from_record").length : Number(sum.by_record ?? 0);
  const upheld = rec ? xs.filter((x) => x.outcome === "upheld").length : Number(sum.upheld ?? 0);
  const yours = xs.filter((x) => x.critic === "researcher").length;
  return `${plural(claims, "claim")} argued in ${plural(exchanges, "exchange")}; ${byRecord} settled from the record, ${upheld ? `${plural(upheld, "objection")} upheld` : "no objection upheld"}${yours ? `; ${plural(yours, "objection")} of yours` : ""}.`;
}

const DEBATE_STEPS = [
  { id: "v1", a: "aa", t: "State each claim under its scheme" },
  { id: "v2", a: "jd", t: "Argue the gap" },
  { id: "v3", a: "jd", t: "Argue the findings" },
  { id: "v4", a: "jd", t: "Argue the conclusions and implications" },
  { id: "v5", a: "jd", t: "Close the record" },
];
const DEBATE_STEPS_LIVE = [
  { id: "v1", a: "aa", t: "State each claim under its scheme" },
  { id: "p1", a: "code", t: "Settle what the record answers" },
  { id: "p2", a: "qm", t: "Challenge with the critical questions" },
  { id: "p3", a: "aa", t: "Answer every challenge" },
  { id: "p4", a: "jd", t: "Rule on every exchange" },
  { id: "v5", a: "jd", t: "Close the record" },
];
const DEBATE: LiveScreen = {
  key: "debate",
  title: "Argue every claim before it is drawn",
  short: "Debate",
  block: 2,
  Scene: DebateLive,
  stages: [
    {
      id: "S04",
      ph: 1,
      short: "Debate",
      name: "Multi-Agent Argumentation",
      a: "jd",
      title: "Argue every claim before it is drawn",
      lead: "Each claim is argued under its scheme, one exchange per critical question. What the record settles, code closes; for the rest a critic challenges with grounds in the record, the Proponent replies, and a separate Judge rules.",
      outs: ["DebateRecord.json", "Rulings.json"],
      // A run that writes its debate as it goes is followed call by call; one that writes the record once, claim by claim.
      get steps() {
        return has(DRAFT) ? DEBATE_STEPS_LIVE : DEBATE_STEPS;
      },
      needs: ["DebateRecord.json", "Rulings.json"],
      progressive: true,
      play: playDebate,
      summary: debateSummary,
    },
  ],
};

export const ARGUE: LiveScreen[] = [STATEMENTS, DEBATE];
