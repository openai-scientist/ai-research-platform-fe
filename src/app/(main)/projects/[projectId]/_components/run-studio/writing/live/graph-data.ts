/* ===== The argument of a live run, read from its files: names, grounds, cards, and the map's layout =====
   The cards (S05), the graph (S06) and the labels (S07) name everything by id: statements, ledger values, sources, the
   protocol lock, deviations, checks and debate exchanges. Here each id gets its words back, and the graph gets a place
   for every node in the lanes of the frame's argument map. */

import { ENTITY } from "../data/meta";
import { S } from "../engine";
import type { Box } from "../flow";
import { file, fill, says, statement } from "./run";
import type { Tone } from "./stage-kit";
import type { Exchange, GraphNode, ToulminCard } from "./types";

/* ---------- what the two screens stream, and the marks their steps leave ---------- */
export const LIST = {
  tou: "g.tou",
  statements: "g.statements",
  data: "g.data",
  ra: "g.ra",
  conflicts: "g.conflicts",
  trace: "g.trace",
  label: "g.label",
} as const;
/** Marks a step leaves on the screen (the warrants marked, the parts tied, the graph checked, the sweep). They live in
 * the run's counts, so a new run starts without them. */
export const MARK = {
  recon: "g.recon",
  tied: "g.tied",
  sound: "g.sound",
  ext: "g.ext",
  sweep: "g.sweep",
  strength: "g.strength",
  worded: "g.worded",
} as const;
export const marked = (k: string) => Boolean(S.n[k]);
export function mark(k: string, on = true) {
  S.n[k] = on ? 1 : 0;
}

/* ---------- names: a statement's type and the name it goes by ---------- */
const TYPE_NAME: Record<string, string> = {
  finding: "Finding",
  conclusion: "Conclusion",
  contribution: "Contribution",
  gap: "Gap",
  implication: "Implication",
  comparison: "Comparison",
  hypothesis: "Hypothesis",
  question: "Question",
  objective: "Objective",
  background: "Background",
  assumption: "Assumption",
  limitation: "Limitation",
  note: "Note",
  challenge: "Challenge",
  datum: "Value",
  source: "Source",
};
const NUMBERED = new Set([
  "finding",
  "conclusion",
  "contribution",
  "gap",
  "implication",
  "comparison",
  "question",
  "objective",
  "hypothesis",
]);
const graphNode = (id: string) => file("ArgumentGraph.json")?.nodes.find((n) => n.node_id === id);

export function typeOf(id: string): string {
  if (id.startsWith("D:")) return "datum";
  if (id.startsWith("S:")) return "source";
  return statement(id)?.type ?? graphNode(id)?.extensions.asw?.propType ?? "";
}
/** The name a statement goes by: Finding 1, Conclusion 2, Gap, Hypothesis 4; a value or a source by its key. */
export function nameOf(id: string) {
  const type = typeOf(id);
  if (type === "datum" || type === "source") return id.slice(2);
  const base = TYPE_NAME[type];
  if (!base) return id;
  if (!NUMBERED.has(type)) return base;
  const num = /(\d+)$/.exec(id)?.[1];
  const many =
    type === "hypothesis" ||
    (file("StatementRegistry.json")?.statements.filter((s) => s.type === type).length ?? 0) > 1;
  return many && num ? `${base} ${num}` : base;
}
export const typeName = (type: string) => TYPE_NAME[type] ?? type;
/** A statement in its own words, as the registry has it (numbers filled), before any wording for the paper. */
export function ownText(id: string) {
  const s = file("StatementRegistry.json")?.statements.find((x) => x.statement_id === id) ?? statement(id);
  return s ? fill(s.text) : says(id);
}

/** The colours and tag of a statement type, as the frame's map draws them. */
export interface Look {
  tag: string;
  name: string;
  box: string;
  chip: string;
}
const NOTE: Look = {
  tag: "N",
  name: "Note",
  box: "bg-zinc-600 ring-zinc-700",
  chip: "bg-zinc-500/12 text-zinc-700 dark:text-zinc-300",
};
const ENTITY_OF: Record<string, string> = {
  finding: "FINDING",
  conclusion: "CONCLUSION",
  contribution: "CONCLUSION",
  gap: "GAP",
  implication: "IMPLICATION",
  hypothesis: "HYPOTHESIS",
  question: "RQ",
  objective: "OBJECTIVE",
  background: "BACKGROUND",
  assumption: "ASSUMPTION",
  limitation: "LIMITATION",
  challenge: "LIMITATION",
  datum: "EVIDENCE",
  source: "EVIDENCE",
};
/** A comparison of a finding with a prior study's result: drawn as the conclusions are, under its own name. */
const COMPARISON: Look = { ...ENTITY.CONCLUSION, tag: "CMP", name: "Comparison" };
export function lookOf(type: string): Look {
  if (type === "note") return NOTE;
  if (type === "comparison") return COMPARISON;
  const e = ENTITY[ENTITY_OF[type] ?? "ASSUMPTION"];
  if (type === "source") return { ...e, tag: "SRC", name: "Source" };
  if (type === "challenge") return { ...e, tag: "CQ", name: "Challenge" };
  if (!ENTITY_OF[type]) return { ...e, tag: type.slice(0, 3).toUpperCase() || "I", name: typeName(type) };
  return e;
}

/** How sure a statement is, as a chip tone. */
export const STATUS_TONE: Record<string, string> = {
  supported: "ok",
  established: "ok",
  approved: "ok",
  tested: "info",
  proposed: "info",
  inconclusive: "warn",
  exploratory: "vio",
  bounded: "bad",
  blocked: "bad",
  deferred: "na",
  assumed: "na",
};

/* ---------- grounds: what an id of the record stands for ---------- */
export interface Ground {
  id: string;
  kind: "value" | "statement" | "source" | "lock" | "deviation" | "check" | "flag" | "unknown";
  /** The name it goes by: a key, a statement's name, a deviation's id. */
  head: string;
  /** What it says or holds: the value as printed, the statement's words, the source's title. */
  text: string;
  /** What it is, in a line: the ledger label, the DOI, how a deviation was handled. */
  note?: string;
  type?: string;
}
const WHEN = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});
export const when = (at: string) => {
  const t = Date.parse(at);
  return Number.isNaN(t) ? at : `${WHEN.format(t)} UTC`;
};
export function ground(raw: string): Ground {
  const id = raw.replace(/^[DS]:/, "");
  const ledger = file("EvidenceLedger.json");
  const v = ledger?.ledger.find((x) => x.key === id);
  if (v) return { id, kind: "value", head: id, text: v.printed, note: v.label };
  const st = statement(id);
  if (st) return { id, kind: "statement", head: nameOf(id), text: says(id), type: st.type };
  const ref = ledger?.references.find((r) => r.key === id);
  if (ref) return { id, kind: "source", head: id, text: ref.title || ref.doi || id, note: ref.doi || ref.url };
  const erp = file("experiment_result.json");
  const report = file("DataReport.json");
  if (id === "lock") {
    const lock = erp?.protocol.lock;
    const at = lock?.frozen_at ?? report?.plan_vs_runs.locked_at;
    const first = report?.plan_vs_runs.first_run_at;
    return {
      id,
      kind: "lock",
      head: "Protocol lock",
      text: at ? `Locked ${when(at)}${lock?.frozen_by ? ` by ${lock.frozen_by}` : ""}` : "The locked protocol",
      note: first ? `Before the first run, ${when(first)}` : undefined,
    };
  }
  const dev = erp?.protocol.deviations.find((d) => d.deviation_id === id);
  if (dev)
    return {
      id,
      kind: "deviation",
      head: id,
      text: dev.description,
      note: `Planned ${dev.planned}; ran ${dev.ran}.${dev.remediation ? ` ${dev.remediation}.` : ""}`,
    };
  const planned = report?.plan_vs_runs.deviations.find((d) => d.deviation_id === id);
  if (planned) return { id, kind: "deviation", head: id, text: `Planned ${planned.planned}; ran ${planned.ran}` };
  const check = erp?.results.checks.find((c) => c.check_id === id);
  if (check)
    return {
      id,
      kind: "check",
      head: id,
      text: `${check.assumption}: ${check.status === "not_checked" ? "not checked" : check.status}`,
      note: check.evidence,
    };
  const flagged = erp?.results.flags.find((f) => f.flag_id === id);
  if (flagged) return { id, kind: "flag", head: id, text: flagged.rationale };
  return { id, kind: "unknown", head: id, text: "" };
}

/* ---------- the debate the cards are drawn from ---------- */
export const exchanges = (): Exchange[] => file("DebateRecord.json")?.exchanges ?? [];
export const exchange = (id: string) => exchanges().find((x) => x.exchange_id === id);
/** What an exchange came to, in the one colour meaning, as the debate shows it: answered or settled from the record
 * holds, a concession is written with care, an upheld challenge stands against the claim; struck is plain. */
export const OUTCOME: Record<string, { name: string; tone: Tone }> = {
  answered: { name: "Answered", tone: "ok" },
  conceded: { name: "Conceded", tone: "look" },
  upheld: { name: "Upheld", tone: "bad" },
  closed_from_record: { name: "Settled from the record", tone: "ok" },
  struck: { name: "Struck", tone: "none" },
};
export const outcomeOf = (o: string) => OUTCOME[o] ?? { name: o.replace(/_/g, " "), tone: "none" as Tone };

/* ---------- the cards ---------- */
export const cards = (): ToulminCard[] => file("ToulminCards.json")?.cards ?? [];
/** A warrant the researcher endorsed or reworded at a guided or light run's stop (the card's `endorsed`, newer runs). */
export const endorsedOf = (card: ToulminCard) => Boolean((card as ToulminCard & { endorsed?: boolean }).endorsed);
/** A warrant no source states: the AI reconstructed it. */
export const reconOf = (card: ToulminCard) => !card.warrant_source;
export const PARTS = ["data", "qual", "claim", "war", "back", "reb"] as const;
export type Part = (typeof PARTS)[number];

/** The qualifiers of a card: the one its claim carries first, then each concession of the debate, with the exchange
 * it was conceded at. */
export function qualifiers(card: ToulminCard) {
  const main = card.main_qualifier.trim();
  const rest = card.qualifier.startsWith(main) ? card.qualifier.slice(main.length) : card.qualifier;
  const extra = rest
    .split(/;\s+/)
    .map((q) => q.replace(/^;\s*/, "").trim())
    .filter((q) => q && q !== main);
  const mine = exchanges().filter((x) => x.claim_id === card.claim_id && x.outcome === "conceded" && x.qualifier);
  const from = (q: string) => mine.find((x) => x.qualifier.trim() === q)?.exchange_id;
  return {
    main: main ? { text: fill(main), from: from(main) } : null,
    extra: [...new Set(extra)].map((q) => ({ text: fill(q), from: from(q) })),
  };
}
/** The exchanges of the debate a claim conceded, and the ones upheld against it. */
export const concededOf = (id: string) => exchanges().filter((x) => x.claim_id === id && x.outcome === "conceded");
export const upheldOf = (id: string) => exchanges().filter((x) => x.claim_id === id && x.outcome === "upheld");
/** The exchange a rebuttal was upheld at, when the card took the challenge in its own words. */
export const rebuttalFrom = (card: ToulminCard, text: string) =>
  exchanges().find((x) => x.claim_id === card.claim_id && x.outcome === "upheld" && x.challenge === text)?.exchange_id;

/** The checks on a card, each known once the part it reads is drawn. */
export function cardChecks(card: ToulminCard) {
  const mine = exchanges().filter((x) => x.claim_id === card.claim_id);
  const conceded = mine.filter((x) => x.outcome === "conceded" && x.qualifier);
  const upheld = mine.filter((x) => x.outcome === "upheld");
  const unknownData = card.data.filter((d) => ground(d).kind === "unknown");
  const unknownBacking = card.backing.filter((b) => ground(b).kind === "unknown");
  const missedQual = conceded.filter((x) => !card.qualifier.includes(x.qualifier.trim()));
  const missedReb = upheld.filter((x) => !card.rebuttals.includes(x.challenge));
  return [
    {
      label: "Data traces to the record",
      at: 1,
      pass: unknownData.length === 0,
      note: unknownData.length ? `Not found: ${unknownData.join(", ")}.` : undefined,
      tone: "look" as Tone,
    },
    {
      label: "Warrant written in a source",
      at: 4,
      pass: Boolean(card.warrant_source),
      note: card.warrant_source ? undefined : "No source states it: the paper states it as the study's own assumption.",
      tone: "look" as Tone,
      /** Known once the reconstructed warrants are marked. */
      recon: true,
    },
    {
      label: "Backing is a source, a check or the lock",
      at: 5,
      pass: unknownBacking.length === 0,
      note: unknownBacking.length ? `Not found: ${unknownBacking.join(", ")}.` : undefined,
      tone: "look" as Tone,
    },
    {
      label: conceded.length
        ? `Every concession qualifies the claim (${conceded.length})`
        : "Every concession qualifies the claim",
      at: 2,
      pass: missedQual.length === 0,
      note: missedQual.length
        ? `Missing: ${missedQual.map((x) => x.exchange_id).join(", ")}.`
        : conceded.length
          ? undefined
          : "Nothing was conceded.",
      tone: "look" as Tone,
    },
    {
      label: "Every upheld challenge is a rebuttal",
      at: 6,
      pass: missedReb.length === 0,
      note: missedReb.length
        ? `Missing: ${missedReb.map((x) => x.exchange_id).join(", ")}.`
        : upheld.length
          ? undefined
          : card.rebuttals.length
            ? "No challenge was upheld: the rebuttals are the study's limitations that bear on this claim."
            : "No challenge was upheld.",
      tone: "look" as Tone,
    },
  ];
}

/* ---------- labels and how strongly a claim may be worded ---------- */
export const STRENGTHS = ["none", "suggest", "indicate", "show"];
export const strengthShare = (s: string) => Math.max(0, STRENGTHS.indexOf(s)) / (STRENGTHS.length - 1);
/** The frame's label keys: undecided is UND there. */
export const labelKey = (l: string) => (l === "UNDEC" ? "UND" : l);
/** A label in a word, and its meaning in the one colour system. */
export const LABEL_WORD: Record<string, string> = { IN: "IN", OUT: "OUT", UND: "Undecided" };
export const LABEL_TONE: Record<string, Tone> = { IN: "ok", OUT: "bad", UND: "look" };
/** A statement's status in the one colour meaning: it holds, it is written with care, it is blocked, or plain. */
const STATUS_MEANING: Record<string, Tone> = {
  supported: "ok",
  established: "ok",
  approved: "ok",
  inconclusive: "look",
  exploratory: "look",
  bounded: "look",
  blocked: "bad",
};
export const statusTone = (status: string): Tone => STATUS_MEANING[status] ?? "none";
const asIds = (list: unknown[] | undefined) =>
  (list ?? []).map((x) =>
    typeof x === "string"
      ? { id: x, why: "" }
      : {
          id: String(
            (x as { statement_id?: string; node_id?: string }).statement_id ??
              (x as { node_id?: string }).node_id ??
              "",
          ),
          // A reason is said inside a sentence: without its own closing stop.
          why: String((x as { why?: string; reason?: string }).why ?? (x as { reason?: string }).reason ?? "")
            .trim()
            .replace(/[.\s]+$/, ""),
        },
  );
/** Statements the graph dropped, and why. */
export const removedOf = () => asIds(file("ArgumentGraph.json")?.removed as unknown[] | undefined);
/** Statements that will not be written, and why. */
export const notWrittenOf = () => asIds(file("EvaluationLabels.json")?.not_written as unknown[] | undefined);

/* ---------- the map: every node in the lanes of the frame ---------- */
export type Lane = "band" | "q" | "h" | "e" | "f" | "c" | "i";
/** Nodes wide enough for their words at full size: four lines of a statement, a value with its label. */
export const NODE = { w: 240, h: 118, data: 84, band: 100, sw: 36, sh: 22, summary: 40 };
const LANES: { k: Lane; title: string; gap: number }[] = [
  { k: "q", title: "Question", gap: 0 },
  { k: "h", title: "Hypothesis", gap: 32 },
  { k: "e", title: "Evidence", gap: 32 },
  { k: "f", title: "Finding", gap: 56 },
  { k: "c", title: "Conclusion", gap: 56 },
  { k: "i", title: "Implication", gap: 56 },
];
const LANE_OF: Record<string, Lane> = {
  question: "q",
  objective: "q",
  gap: "q",
  hypothesis: "h",
  datum: "e",
  source: "e",
  finding: "f",
  conclusion: "c",
  contribution: "c",
  implication: "i",
  // A comparison rests on a finding and a prior study, as a conclusion does: it sits in that lane.
  comparison: "c",
};
/** The order caveats take in the band: what the study stands on first, then its limits, then its notes. */
const BAND_ORDER = ["background", "assumption", "challenge", "limitation", "note"];
const Q_ORDER = ["gap", "question", "objective"];

export interface Placed extends Box {
  id: string;
  lane: Lane;
  /** An I-node, a value or source of the record, or a scheme (RA, CA, PA). */
  is: "statement" | "data" | "scheme";
  /** A question or objective the graph keeps as context, not as a node of the argument. */
  context?: boolean;
}
export interface MapLink {
  id: string;
  a: string;
  b: string;
  kind: "ok" | "att" | "pref" | "life" | "test";
  layer: "support" | "conflict" | "life";
  /** A lifecycle link the graph already draws through one of its schemes: shown only on the lifecycle layer. */
  dup?: boolean;
  sh: string;
  th: string;
  offset?: number;
}
export interface MapLayout {
  /** Before the graph is built, the map's frame: lanes and the places their statements will take, as outlines. */
  ghost?: Box[];
  /** The row of counts that heads the band of premises and caveats, and the caveats it counts. */
  summary: Box | null;
  bandIds: string[];
  nodes: Map<string, Placed>;
  links: MapLink[];
  lanes: { title: string; x: number; y: number; w: number; h: number }[];
  band: Box | null;
  w: number;
  h: number;
  /** The order the graph is drawn in: statements, then values and sources, then inferences, then conflicts. */
  stream: { statements: string[]; data: string[]; ra: string[]; conflicts: string[] };
  /** Each node by the step that brought it in. */
  step: Map<string, "statements" | "data" | "ra" | "conflicts">;
}

const uniq = <T>(xs: T[]) => [...new Set(xs)];
/** The sides a link leaves and enters by: across, between two lanes; down or up, within one. */
function faces(a: Box, b: Box) {
  const dx = b.x + b.w / 2 - (a.x + a.w / 2);
  if (Math.abs(dx) > 30) return dx > 0 ? { sh: "rs", th: "lt" } : { sh: "ls", th: "rt" };
  return b.y >= a.y ? { sh: "b", th: "t" } : { sh: "ts", th: "bt" };
}
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

const cache = new Map<boolean, { g: unknown; reg: unknown; life: unknown; out: MapLayout }>();
/**
 * Lays the graph out in the frame's lanes. Deterministic: the same files give the same map. `bandOpen` draws every
 * premise and caveat; closed, the band is one row of counts, with only the caveats that attack something drawn.
 */
export function mapLayout(bandOpen = false): MapLayout | null {
  const g = file("ArgumentGraph.json");
  if (!g) return null;
  const reg = file("StatementRegistry.json");
  const life = file("LifecycleLinks.json");
  const hit = cache.get(bandOpen);
  if (hit && hit.g === g && hit.reg === reg && hit.life === life) return hit.out;
  const out = build(g.nodes, g.edges, g.context, life?.links ?? [], bandOpen);
  cache.set(bandOpen, { g, reg, life, out });
  return out;
}

function build(
  graph: GraphNode[],
  edgeList: { source: string; target: string }[],
  contextIds: string[],
  lifecycle: { from: string; to: string }[],
  bandOpen: boolean,
): MapLayout {
  const byId = new Map(graph.map((n) => [n.node_id, n]));
  const edges = uniq(edgeList.map((e) => `${e.source}\u0000${e.target}`)).map((k) => {
    const [source, target] = k.split("\u0000");
    return { source, target };
  });
  const ins = (id: string) => uniq(edges.filter((e) => e.target === id).map((e) => e.source));
  const outs = (id: string) => uniq(edges.filter((e) => e.source === id).map((e) => e.target));
  const isScheme = (id: string) => {
    const k = byId.get(id)?.kind;
    return k === "RA" || k === "CA" || k === "PA";
  };
  const registry = file("StatementRegistry.json")?.statements ?? [];
  const rank = (id: string) => {
    const i = registry.findIndex((s) => s.statement_id === id);
    return i >= 0 ? i : registry.length + graph.findIndex((n) => n.node_id === id);
  };
  const byRank = (a: string, b: string) => rank(a) - rank(b);
  const context = contextIds.filter((id) => !byId.has(id) && statement(id));
  const iNodes = graph.filter((n) => n.kind === "I").map((n) => n.node_id);
  const schemes = graph.filter((n) => n.kind !== "I").map((n) => n.node_id);
  const typeOfNode = (id: string) =>
    id.startsWith("D:")
      ? "datum"
      : id.startsWith("S:")
        ? "source"
        : (byId.get(id)?.extensions.asw?.propType ?? statement(id)?.type ?? "");
  const isData = (id: string) => ["datum", "source"].includes(typeOfNode(id));

  const lane = new Map<string, Lane>();
  for (const id of [...context, ...iNodes]) lane.set(id, LANE_OF[typeOfNode(id)] ?? "band");
  // A value or source that only holds up claims of the question lane sits above them, in that lane.
  for (const id of iNodes.filter(isData)) {
    const ends = outs(id).flatMap((s) => (isScheme(s) ? outs(s) : [s]));
    if (ends.length && ends.every((c) => lane.get(c) === "q")) lane.set(id, "q");
  }
  const inLane = (l: Lane) => [...lane].filter(([, x]) => x === l).map(([id]) => id);

  // Lanes, left to right; a wide gap before the evidence's findings, conclusions and implications holds their schemes.
  const laneX = {} as Record<Lane, number>;
  let x = 12;
  for (const l of LANES) {
    x += l.gap;
    laneX[l.k] = x;
    x += NODE.w;
  }
  const W = x + 12;
  const nodes = new Map<string, Placed>();
  const put = (id: string, l: Lane, px: number, py: number, h: number) =>
    nodes.set(id, {
      id,
      lane: l,
      x: px,
      y: py,
      w: NODE.w,
      h,
      is: isData(id) ? "data" : "statement",
      context: context.includes(id) || undefined,
    });
  const heightOf = (id: string) => (isData(id) ? NODE.data : NODE.h);

  // The band of premises and caveats: what no lane holds, in rows across the map.
  const bandIds = inLane("band").sort(
    (a, b) =>
      ((BAND_ORDER.indexOf(typeOfNode(a)) + 9) % 9) - ((BAND_ORDER.indexOf(typeOfNode(b)) + 9) % 9) || byRank(a, b),
  );
  let band: Box | null = null;
  let summary: Box | null = null;
  let y = 4;
  if (bandIds.length) {
    // One row of counts heads the band; under it, every caveat when it is open, or only those an attack starts from.
    // Open, every caveat is drawn and they count themselves; closed, a row of counts heads the band.
    summary = bandOpen ? null : { x: 12, y: y + 30, w: W - 24, h: NODE.summary };
    const drawn = bandOpen ? bandIds : bandIds.filter((id) => edges.some((e) => e.source === id || e.target === id));
    const inner = W - 24;
    const per = Math.max(1, Math.floor((inner + 12) / (NODE.w + 12)));
    const rows = Math.ceil(drawn.length / per);
    const perRow = Math.max(1, Math.ceil(drawn.length / Math.max(rows, 1)));
    const gap = perRow > 1 ? Math.min(40, (inner - perRow * NODE.w) / (perRow - 1)) : 0;
    const top0 = summary ? summary.y + summary.h + 12 : y + 30;
    drawn.forEach((id, i) => {
      const r = Math.floor(i / perRow);
      const c = i % perRow;
      put(id, "band", 12 + c * (NODE.w + gap), top0 + r * (NODE.band + 12), NODE.band);
    });
    band = { x: 4, y, w: W - 8, h: 30 + (summary ? NODE.summary + 12 : 0) + (rows ? rows * (NODE.band + 12) : 0) + 2 };
    y += band.h;
  }
  const fromBand = schemes.filter((s) => ins(s).length > 0 && ins(s).every((p) => lane.get(p) === "band"));
  y += fromBand.length ? 70 : 30;
  const laneTop = y;
  const top = laneTop + 30;

  // Hypothesis, evidence and finding: one row for each finding, its values beside it and its hypothesis before it.
  const sorted = (l: Lane) => inLane(l).sort(byRank);
  const backOf = (f: string) =>
    schemes.filter((s) => ins(s).includes(f) && outs(s).some((t) => lane.get(t) === "h" || lane.get(t) === "q"));
  const dataOf = (f: string) =>
    uniq(
      schemes
        .filter((s) => byId.get(s)?.kind === "RA" && outs(s).includes(f))
        .flatMap(ins)
        .filter((p) => lane.get(p) === "e"),
    );
  const hypOf = (f: string) =>
    uniq([
      ...lifecycle.filter((k) => k.to === f && lane.get(k.from) === "h").map((k) => k.from),
      ...backOf(f)
        .flatMap(outs)
        .filter((t) => lane.get(t) === "h"),
    ]);
  const stackH = (ids: string[], gap: number) =>
    ids.length ? ids.reduce((n, id) => n + heightOf(id), 0) + (ids.length - 1) * gap : 0;
  const schemeAt = new Map<string, { x: number; y: number; route: "fwd" | "back" | "down" }>();
  const rowBottom = new Map<string, number>();
  let rowY = top;
  for (const f of sorted("f")) {
    const data = dataOf(f).filter((d) => !nodes.has(d));
    const hyps = hypOf(f).filter((h) => !nodes.has(h));
    const rowH = Math.max(NODE.h, stackH(data, 8), stackH(hyps, 16));
    put(f, "f", laneX.f, rowY + (rowH - NODE.h) / 2, NODE.h);
    let dy = rowY + (rowH - stackH(data, 8)) / 2;
    for (const d of data) {
      put(d, "e", laneX.e, dy, heightOf(d));
      dy += heightOf(d) + 8;
    }
    let hy = rowY + (rowH - stackH(hyps, 16)) / 2;
    for (const h of hyps) {
      put(h, "h", laneX.h, hy, NODE.h);
      hy += NODE.h + 16;
    }
    rowY += rowH;
    for (const id of [f, ...data, ...hyps]) rowBottom.set(id, rowY);
    // What the finding does to its hypothesis runs back under the row: support, rebut, preference.
    const back = backOf(f).filter((s) => !schemeAt.has(s));
    for (const [i, s] of back.entries())
      schemeAt.set(s, { x: laneX.e + NODE.w / 2 - NODE.sw / 2, y: rowY + 18 + i * 32, route: "back" });
    rowY += (back.length ? 18 + back.length * 32 : 0) + 26;
  }
  for (const l of ["h", "e", "f"] as Lane[]) {
    let yy = rowY;
    for (const id of sorted(l).filter((n) => !nodes.has(n))) {
      put(id, l, laneX[l], yy, heightOf(id));
      yy += heightOf(id) + 18;
    }
  }

  // The question lane, top down: each gap under the sources that show it, then the questions and objectives.
  let qy = top;
  const qMain = sorted("q")
    .filter((id) => !isData(id))
    .sort(
      (a, b) => ((Q_ORDER.indexOf(typeOfNode(a)) + 9) % 9) - ((Q_ORDER.indexOf(typeOfNode(b)) + 9) % 9) || byRank(a, b),
    );
  for (const id of qMain) {
    const src = uniq(
      schemes
        .filter((s) => outs(s).includes(id))
        .flatMap(ins)
        .filter((p) => lane.get(p) === "q" && isData(p) && !nodes.has(p)),
    );
    for (const s of src) {
      put(s, "q", laneX.q, qy, heightOf(s));
      qy += heightOf(s) + 8;
    }
    if (src.length) qy += 38;
    put(id, "q", laneX.q, qy, NODE.h);
    qy += NODE.h + 22;
  }
  for (const id of sorted("q").filter((n) => !nodes.has(n))) {
    put(id, "q", laneX.q, qy, heightOf(id));
    qy += heightOf(id) + 18;
  }

  // Conclusions level with what they rest on, implications level with their conclusions.
  const centre = (id: string) => {
    const p = nodes.get(id);
    return p ? p.y + p.h / 2 : Number.NaN;
  };
  const restsOn = (id: string) =>
    uniq([
      ...schemes.filter((s) => byId.get(s)?.kind === "RA" && outs(s).includes(id)).flatMap(ins),
      ...lifecycle.filter((k) => k.to === id).map((k) => k.from),
    ]).filter((p) => nodes.has(p));
  for (const l of ["c", "i"] as Lane[]) {
    const want = sorted(l).map((id) => {
      const prem = restsOn(id).map(centre);
      return { id, at: prem.length ? mean(prem) : Number.POSITIVE_INFINITY };
    });
    want.sort((a, b) => a.at - b.at || byRank(a.id, b.id));
    let last = top - 22;
    for (const { id, at } of want) {
      const yy = Math.max(Number.isFinite(at) ? at - NODE.h / 2 : last + 22, last + 22);
      put(id, l, laneX[l], yy, NODE.h);
      last = yy + NODE.h;
    }
  }

  // Schemes: an inference in the gap before what it concludes; a conflict from the band under the band; one within a
  // lane between its premises and its conclusion; one that runs back under the row of its premise.
  const order = LANES.map((l) => l.k);
  const li = (id: string) => order.indexOf(lane.get(id) ?? "band");
  const box = (id: string): Box | null => {
    const n = nodes.get(id);
    if (n) return n;
    const s = schemeAt.get(id);
    return s ? { x: s.x, y: s.y, w: NODE.sw, h: NODE.sh } : null;
  };
  const taken = new Set<string>();
  const free = (px: number, py: number) => {
    let yy = py;
    while (taken.has(`${Math.round(px)}:${Math.round(yy)}`)) yy += 30;
    taken.add(`${Math.round(px)}:${Math.round(yy)}`);
    return yy;
  };
  const toPlace = [...schemes].sort((a, b) => Number(isScheme(outs(a)[0] ?? "")) - Number(isScheme(outs(b)[0] ?? "")));
  for (const s of toPlace) {
    if (schemeAt.has(s)) continue;
    const prem = ins(s).filter((p) => box(p));
    const tgt = outs(s).find((t) => box(t));
    const tb = tgt ? box(tgt) : null;
    if (!tb || !tgt) {
      const pb = prem.map((p) => box(p) as Box);
      if (pb.length)
        schemeAt.set(s, {
          x: mean(pb.map((b) => b.x + b.w / 2)) - NODE.sw / 2,
          y: Math.max(...pb.map((b) => b.y + b.h)) + 18,
          route: "down",
        });
      continue;
    }
    const tcx = tb.x + tb.w / 2;
    const tcy = tb.y + tb.h / 2;
    if (prem.length && prem.every((p) => lane.get(p) === "band")) {
      const px = tcx - NODE.sw / 2;
      schemeAt.set(s, { x: px, y: free(px, laneTop - 46), route: "down" });
    } else if (!isScheme(tgt) && prem.length && prem.every((p) => lane.get(p) === lane.get(tgt))) {
      const above = prem.map((p) => box(p) as Box).filter((b) => b.y + b.h <= tb.y);
      const from = above.length ? Math.max(...above.map((b) => b.y + b.h)) : tb.y - 46;
      schemeAt.set(s, { x: tcx - NODE.sw / 2, y: (from + tb.y) / 2 - NODE.sh / 2, route: "down" });
    } else if (!isScheme(tgt) && prem.length && prem.every((p) => li(p) < li(tgt))) {
      const k = order.indexOf(lane.get(tgt) as Lane);
      const gap = LANES[k].gap;
      const px = laneX[LANES[k].k] - gap / 2 - NODE.sw / 2;
      schemeAt.set(s, { x: px, y: free(px, tcy - NODE.sh / 2), route: "fwd" });
    } else if (!isScheme(tgt) && prem.length && prem.every((p) => li(p) > li(tgt))) {
      const pb = prem.map((p) => box(p) as Box);
      const below = Math.max(...prem.map((p) => rowBottom.get(p) ?? (box(p) as Box).y + (box(p) as Box).h));
      const px = mean([...pb.map((b) => b.x + b.w / 2), tcx]) - NODE.sw / 2;
      schemeAt.set(s, { x: px, y: free(px, below + 18), route: "back" });
    } else {
      const pb = prem.map((p) => box(p) as Box);
      const cx = mean([...pb.map((b) => b.x + b.w / 2), tcx]);
      const cy = mean([...pb.map((b) => b.y + b.h / 2), tcy]);
      const px = cx - NODE.sw / 2;
      schemeAt.set(s, { x: px, y: free(px, cy - NODE.sh / 2), route: isScheme(tgt) ? "down" : "fwd" });
    }
  }
  for (const [id, s] of schemeAt)
    nodes.set(id, { id, lane: "band", x: s.x, y: s.y, w: NODE.sw, h: NODE.sh, is: "scheme" });

  // The lanes reach down to the lowest node of the map.
  const bottom = Math.max(top + NODE.h, ...[...nodes.values()].map((n) => n.y + n.h)) + 24;
  const lanes = LANES.map((l) => ({
    title: l.title,
    x: laneX[l.k] - 6,
    y: laneTop,
    w: NODE.w + 12,
    h: bottom - laneTop,
  }));

  // Links: each edge of the graph, by the sides that face each other; a scheme that runs back leaves by the bottom.
  const kindOf = (a: string, b: string): MapLink["kind"] => {
    const k = [byId.get(a)?.kind, byId.get(b)?.kind];
    return k.includes("CA") ? "att" : k.includes("PA") ? "pref" : "ok";
  };
  const links: MapLink[] = [];
  for (const e of edges) {
    const a = box(e.source);
    const b = box(e.target);
    if (!a || !b) continue;
    const kind = kindOf(e.source, e.target);
    const base = {
      id: `${e.source}>${e.target}`,
      a: e.source,
      b: e.target,
      kind,
      layer: kind === "ok" ? "support" : "conflict",
    } as const;
    const into = schemeAt.get(e.target);
    const from = schemeAt.get(e.source);
    if (into?.route === "back") links.push({ ...base, sh: "b", th: "rt" });
    else if (from?.route === "back") links.push({ ...base, sh: "ls", th: "bt" });
    else if (into?.route === "down" || from?.route === "down") links.push({ ...base, sh: "b", th: "t" });
    else links.push({ ...base, ...faces(a, b) });
  }
  // The lifecycle: question to objective and hypotheses, hypothesis to the finding that tests it, and on. A link the
  // graph already draws through a scheme is only shown on the lifecycle layer.
  const through = (a: string, b: string) =>
    edges.some((e) => (e.source === a && e.target === b) || (e.source === b && e.target === a)) ||
    schemes.some((s) => (ins(s).includes(a) && outs(s).includes(b)) || (ins(s).includes(b) && outs(s).includes(a)));
  for (const k of uniq(lifecycle.map((l) => `${l.from}\u0000${l.to}`))) {
    const [from, to] = k.split("\u0000");
    const a = box(from);
    const b = box(to);
    if (!a || !b) continue;
    const test = lane.get(from) === "h" && lane.get(to) === "f";
    const base = {
      id: `life:${from}>${to}`,
      a: from,
      b: to,
      kind: test ? "test" : "life",
      layer: "life",
      dup: through(from, to) || undefined,
    } as const;
    if (Math.abs(a.x - b.x) < 4) links.push({ ...base, sh: "b", th: "t" });
    else if (test) {
      // Under the row, below the values beside it.
      const under = Math.max(rowBottom.get(from) ?? a.y + a.h, rowBottom.get(to) ?? b.y + b.h);
      links.push({ ...base, sh: "b", th: "bt", offset: under - Math.max(a.y + a.h, b.y + b.h) + 12 });
    } else links.push({ ...base, ...faces(a, b) });
  }

  // The order the graph is drawn in.
  // Every statement is drawn in, the caveats of a closed band too: the band's counts follow them.
  const statements = [...qMain, ...sorted("h"), ...sorted("f"), ...sorted("c"), ...sorted("i"), ...bandIds].filter(
    (id) => !isData(id) && (nodes.has(id) || bandIds.includes(id)),
  );
  const data = [...nodes.values()]
    .filter((n) => n.is === "data")
    .sort((a, b) => a.x - b.x || a.y - b.y)
    .map((n) => n.id);
  const ra = schemes.filter((s) => byId.get(s)?.kind === "RA" && nodes.has(s));
  const conflicts = schemes.filter((s) => byId.get(s)?.kind !== "RA" && nodes.has(s));
  const step = new Map<string, "statements" | "data" | "ra" | "conflicts">();
  for (const id of statements) step.set(id, "statements");
  for (const id of data) step.set(id, "data");
  for (const id of ra) step.set(id, "ra");
  for (const id of conflicts) step.set(id, "conflicts");
  return {
    nodes,
    links,
    lanes,
    band,
    summary,
    bandIds,
    w: W,
    h: bottom + 6,
    stream: { statements, data, ra, conflicts },
    step,
  };
}

/** A scheme's kind and name, as the record names it. */
export function schemeOf(id: string) {
  const n = graphNode(id);
  const kind = (n?.kind ?? "RA").toLowerCase();
  const scheme = n?.scheme ?? null;
  const named = scheme ? file("DebateRecord.json")?.claims.find((c) => c.scheme === scheme)?.scheme_name : undefined;
  const conflict = n?.text && ["rebut", "undercut", "undermine"].includes(n.text) ? n.text : null;
  return {
    kind,
    text: n?.text ?? "",
    name:
      kind === "ra"
        ? `Inference · ${named ?? scheme ?? "support"}`
        : kind === "ca"
          ? `Conflict · ${conflict ? `${conflict}s` : "attacks"}`
          : "Preference",
    reconstructed: Boolean(n?.extensions.asw?.reconstructed),
  };
}

/** The claims of the argument, the ones ASPIC+ labels: from the graph once it is built, from the registry before. */
export const CLAIM_TYPES = ["gap", "finding", "conclusion", "implication", "comparison"];
export function claimIds() {
  const g = file("ArgumentGraph.json");
  const reg = file("StatementRegistry.json")?.statements ?? [];
  if (g)
    return reg
      .map((s) => s.statement_id)
      .filter((id) => g.nodes.some((n) => n.node_id === id && CLAIM_TYPES.includes(n.extensions.asw?.propType ?? "")));
  return reg.filter((s) => CLAIM_TYPES.includes(s.type) && s.status !== "blocked").map((s) => s.statement_id);
}

/**
 * The map before its graph is built: the lanes and the band, each holding an outline for every statement the registry
 * will put there (values and sources: as many as the cards cite), so the drawing keeps its shape when the graph lands.
 * With nothing known yet, a few outlines per lane.
 */
export function ghostLayout(): MapLayout {
  const reg = (file("StatementRegistry.json")?.statements ?? []).filter((s) => s.status !== "blocked");
  const data = new Set((file("ToulminCards.json")?.cards ?? []).flatMap((c) => c.data.filter((d) => !statement(d))));
  const per: Record<Lane, number> = { band: 0, q: 0, h: 0, e: data.size, f: 0, c: 0, i: 0 };
  for (const st of reg) per[LANE_OF[st.type] ?? "band"] += 1;
  if (!reg.length) Object.assign(per, { band: 6, q: 3, h: 3, e: 6, f: 3, c: 2, i: 1 });
  else if (!data.size) per.e = per.f * 2;
  const laneX = {} as Record<Lane, number>;
  let x = 12;
  for (const l of LANES) {
    x += l.gap;
    laneX[l.k] = x;
    x += NODE.w;
  }
  const W = x + 12;
  const ghost: Box[] = [];
  const summary = per.band ? { x: 12, y: 34, w: W - 24, h: NODE.summary } : null;
  if (summary) ghost.push(summary);
  const band = summary ? { x: 4, y: 4, w: W - 8, h: 30 + NODE.summary + 14 } : null;
  const laneTop = (band ? band.y + band.h : 4) + 30;
  let bottom = laneTop + 30;
  for (const l of LANES) {
    const h = l.k === "e" ? NODE.data : NODE.h;
    for (let i = 0; i < per[l.k]; i++) {
      const y = laneTop + 30 + i * (h + (l.k === "e" ? 8 : 22));
      ghost.push({ x: laneX[l.k], y, w: NODE.w, h });
      bottom = Math.max(bottom, y + h);
    }
  }
  bottom += 24;
  return {
    ghost,
    summary: null,
    bandIds: [],
    nodes: new Map(),
    links: [],
    lanes: LANES.map((l) => ({ title: l.title, x: laneX[l.k] - 6, y: laneTop, w: NODE.w + 12, h: bottom - laneTop })),
    band,
    w: W,
    h: bottom + 6,
    stream: { statements: [], data: [], ra: [], conflicts: [] },
    step: new Map(),
  };
}
