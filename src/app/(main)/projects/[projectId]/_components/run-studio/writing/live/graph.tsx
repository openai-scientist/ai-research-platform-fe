"use client";
"use no memo";

/* ===== Live screens: reasoning (S05) and the argument map (S06–S07) =====
   Each stage plays its files onto its screen as the preview paces it: the cards part by part, claim after claim; the
   graph's statements, then its values and inferences, then its conflicts; then the trace of every node and the label
   of every claim. What each step says is read from the same files. */

import { emit, item, reveal, sleep, step } from "../engine";
import {
  cards,
  ground,
  LIST,
  labelKey,
  MARK,
  mapLayout,
  mark,
  nameOf,
  notWrittenOf,
  PARTS,
  removedOf,
} from "./graph-data";
import { MapLive, reasonOf, traceOrder } from "./graph-map";
import { partWait, ToulminLive, typedText } from "./graph-toulmin";
import { need } from "./kit";
import { file, LIVE } from "./run";
import type { LiveScreen } from "./stages";

/** A list read as a sentence: “a, b and c”. */
const and = (xs: string[]) =>
  xs.length < 2 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/* ---------- S05 · Toulmin ---------- */
function cardsLine() {
  const all = cards();
  const recon = all.filter((c) => !c.warrant_source).length;
  return `${plural(all.length, "claim")} in six parts each; ${
    recon === all.length ? "every warrant" : plural(recon, "warrant")
  } reconstructed${recon ? ", marked amber" : ""}; every part tied to the debate.`;
}
const REASONING: LiveScreen = {
  key: "reasoning",
  title: "Draw each claim in six parts",
  short: "Toulmin",
  block: 2,
  Scene: ToulminLive,
  stages: [
    {
      id: "S05",
      ph: 1,
      short: "Toulmin",
      name: "Toulmin Decomposition (six parts)",
      a: "ag",
      title: "Draw each claim in six parts",
      lead: "The Graph Builder draws each claim from the debate record: its data, qualifier, warrant, backing and rebuttals. Every concession becomes a qualifier and every upheld challenge a rebuttal; a warrant no source states is drawn dashed as reconstructed.",
      outs: ["ToulminCards.json"],
      steps: [
        { id: "e1", a: "ag", t: "Draw each claim in six parts" },
        { id: "e2", a: "code", t: "Mark the warrants no source states" },
        { id: "e3", a: "code", t: "Tie every part to the debate" },
      ],
      needs: ["ToulminCards.json"],
      progressive: true,
      play: async () => {
        // The card's frame stands from the start; the cards are drawn the moment the Graph Builder publishes them.
        if (!(await need("S05", "ToulminCards.json"))) return;
        const all = cards();
        const names = and(all.map((c) => nameOf(c.claim_id)));
        await step(
          "S05",
          "e1",
          async () => {
            let i = 0;
            for (const c of all) {
              for (const part of PARTS)
                await item(LIST.tou, i++, {
                  id: `${c.claim_id}:${part}`,
                  text: typedText(c, part),
                  wait: partWait(c, part),
                  actor: "ag",
                });
              await sleep(240);
            }
          },
          {
            text: `${plural(all.length, "claim")}, six parts each: data, qualifier, claim, warrant, backing and rebuttals. ${names}.`,
          },
        );
        const recon = all.filter((c) => !c.warrant_source);
        await step(
          "S05",
          "e2",
          async () => {
            mark(MARK.recon);
            emit();
            await sleep(900);
          },
          {
            text: recon.length
              ? `${recon.length === all.length ? "No warrant" : `${plural(recon.length, "warrant")}`} ${
                  recon.length === all.length ? "is written in a source" : "are written in no source"
                }: ${recon.length === all.length ? "each is" : "they are"} marked, never quoted.`
              : "Every warrant is written in a source.",
          },
        );
        const ex = new Set(all.flatMap((c) => c.from_exchanges)).size;
        const conceded = all.reduce((n, c) => n + Math.max(0, c.qualifier.split(/;\s+/).length - 1), 0);
        await step(
          "S05",
          "e3",
          async () => {
            mark(MARK.tied);
            emit();
            await sleep(900);
          },
          {
            text: `Each card names the exchanges it answers, ${ex} in all; ${plural(conceded, "concession")} qualify the claims they were made on.`,
          },
        );
      },
      summary: () => {
        if (cards().length) return cardsLine();
        // The cards are still on their way: say what the step reported when it was done.
        const p = LIVE.summary.S05 as { cards?: number; reconstructed?: number } | undefined;
        if (p?.cards === undefined) return "The cards are drawn.";
        return `${plural(p.cards, "claim")} in six parts each; ${plural(p.reconstructed ?? 0, "warrant")} reconstructed.`;
      },
    },
  ],
};

/* ---------- S06 · the AIF graph ---------- */
function graphCounts() {
  const g = file("ArgumentGraph.json");
  const kinds = { I: 0, RA: 0, CA: 0, PA: 0 } as Record<string, number>;
  for (const n of g?.nodes ?? []) kinds[n.kind] = (kinds[n.kind] ?? 0) + 1;
  return kinds;
}
/** The conflicts of the graph in words: “Finding 2 against Hypothesis 2”, and whether the evidence is preferred. */
function conflictLine() {
  const g = file("ArgumentGraph.json");
  if (!g) return "";
  const from = (id: string) => g.edges.find((e) => e.target === id)?.source ?? "";
  const to = (id: string) => g.edges.find((e) => e.source === id)?.target ?? "";
  const cas = g.nodes.filter((n) => n.kind === "CA");
  const pas = g.nodes.filter((n) => n.kind === "PA");
  if (!cas.length) return "No conflict: no challenge was upheld and no finding goes against its hypothesis.";
  const parts = cas.map((c) => {
    const a = from(c.node_id);
    const b = to(c.node_id);
    const kind = c.text === "undercut" ? "undercuts" : c.text === "undermine" ? "undermines" : "rebuts";
    const target = b.startsWith("RA:") ? `the inference to ${nameOf(b.slice(3))}` : nameOf(b);
    return `${a.startsWith("X:") ? `the challenge ${a.slice(2)}` : nameOf(a)} ${kind} ${target}`;
  });
  const settled = pas.length
    ? cas.every((c) => pas.some((p) => from(p.node_id) === from(c.node_id) && to(p.node_id) === to(c.node_id)))
      ? `, each settled by a preference for the evidence`
      : `; ${plural(pas.length, "preference")} settle${pas.length === 1 ? "s" : ""} them`
    : "";
  const line = `${and(parts)}${settled}.`;
  return line.charAt(0).toUpperCase() + line.slice(1);
}
/* ---------- S07 · ASPIC+ ---------- */
function labelCounts() {
  const labels = file("EvaluationLabels.json")?.labels ?? [];
  const c = { n: labels.length, IN: 0, OUT: 0, UND: 0 };
  for (const l of labels) {
    const k = labelKey(l.label);
    if (k === "IN" || k === "OUT" || k === "UND") c[k] += 1;
  }
  return c;
}
function strengthLine() {
  const f = file("EvaluationLabels.json");
  if (!f) return "";
  const by = new Map<string, string[]>();
  for (const l of f.labels) by.set(l.strength, [...(by.get(l.strength) ?? []), nameOf(l.statement_id)]);
  const groups = [...by].map(([s, ids]) => (s === "none" ? `${and(ids)} with no claim verb` : `${and(ids)} at “${s}”`));
  return `The ceiling allows at most “${f.ceiling.strength}”: ${groups.join("; ")}.`;
}

const MAP: LiveScreen = {
  key: "map",
  title: "Map the argument, evaluate it, lock it",
  short: "AIF · ASPIC+",
  block: 2,
  Scene: MapLive,
  stages: [
    {
      id: "S06",
      ph: 1,
      short: "AIF",
      name: "AIF Argument Graph Construction",
      a: "code",
      title: "Map the argument, evaluate it, lock it",
      lead: "The cards become an AIF graph: statements are I-nodes, ledger values and sources are data nodes, and inferences (RA), conflicts (CA) and preferences (PA) connect them. Scientific types live in an extension, never in the AIF core.",
      outs: ["ArgumentGraph.json", "GraphEvidenceMap.json"],
      steps: [
        { id: "f1", a: "code", t: "Put each statement on the map" },
        { id: "f2", a: "code", t: "Add the evidence and what it supports" },
        { id: "f3", a: "code", t: "Add the conflicts and preferences" },
        { id: "f4", a: "code", t: "Check the map is sound" },
        { id: "f5", a: "code", t: "Keep the science apart from the AIF core" },
      ],
      needs: ["ArgumentGraph.json", "GraphEvidenceMap.json"],
      progressive: true,
      play: async () => {
        // The lanes stand from the start; the graph and its traces come from one step, together.
        if (!(await need("S06", "ArgumentGraph.json", "GraphEvidenceMap.json"))) return;
        const L = mapLayout();
        if (!L) return;
        const s = L.stream;
        const ctx = [...L.nodes.values()].filter((n) => n.context).map((n) => nameOf(n.id));
        const statements = s.statements.length - ctx.length;
        await step(
          "S06",
          "f1",
          async () => {
            for (const [i, id] of s.statements.entries()) await item(LIST.statements, i, { id, wait: 110 });
          },
          {
            text: `${plural(statements, "statement")} become I-nodes${
              ctx.length ? `; ${and(ctx)} ${ctx.length === 1 ? "stays" : "stay"} as context` : ""
            }.`,
          },
        );
        const schemes = new Set(
          (file("ArgumentGraph.json")?.nodes ?? []).flatMap((n) => (n.kind === "RA" && n.scheme ? [n.scheme] : [])),
        );
        const named = file("DebateRecord.json")?.claims ?? [];
        const schemeNames = [...schemes].map((k) => named.find((c) => c.scheme === k)?.scheme_name ?? k);
        await step(
          "S06",
          "f2",
          async () => {
            for (const [i, id] of s.data.entries()) await item(LIST.data, i, { id, wait: 140 });
            for (const [i, id] of s.ra.entries()) await item(LIST.ra, i, { id, wait: 260 });
          },
          {
            text: `${plural(s.data.length, "value and source", "values and sources")} of the record become data nodes; ${plural(
              s.ra.length,
              "inference",
            )} join them to what they support${schemeNames.length ? `, each by its scheme: ${and(schemeNames.map((n) => n.toLowerCase()))}` : ""}.`,
          },
        );
        await step(
          "S06",
          "f3",
          async () => {
            for (const [i, id] of s.conflicts.entries()) await item(LIST.conflicts, i, { id, wait: 360 });
          },
          { text: conflictLine() },
        );
        const removed = removedOf();
        await step(
          "S06",
          "f4",
          async () => {
            mark(MARK.sound);
            emit();
            await sleep(800);
          },
          {
            text: removed.length
              ? `${and(removed.map((r) => (r.why ? `${r.id} (${r.why})` : r.id)))} ${removed.length === 1 ? "is" : "are"} removed.`
              : "Every inference has a premise and every claim an inference: nothing is removed.",
          },
        );
        await step(
          "S06",
          "f5",
          async () => {
            mark(MARK.ext);
            emit();
            await sleep(800);
          },
          {
            text: "Each node's type, status, ledger keys and sources go into the ASW extension, never the AIF core; the Verifier traces them next.",
          },
        );
      },
      summary: () => {
        const p = LIVE.summary.S06 as { nodes?: Record<string, number>; removed?: number } | undefined;
        const k = file("ArgumentGraph.json") ? graphCounts() : { I: 0, RA: 0, CA: 0, PA: 0, ...p?.nodes };
        const removed = file("ArgumentGraph.json") ? removedOf().length : (p?.removed ?? 0);
        if (!file("ArgumentGraph.json") && !p?.nodes) return "The graph is built.";
        return `${k.I} I-nodes, ${plural(k.RA, "inference")}, ${plural(k.CA, "conflict")}, ${plural(k.PA, "preference")}; ${
          removed ? `${removed} removed` : "nothing removed"
        }.`;
      },
    },
    {
      id: "S07",
      ph: 1,
      short: "ASPIC+",
      name: "Argument Evaluation (ASPIC+) & Validation",
      a: "code",
      title: "Map the argument, evaluate it, lock it",
      lead: "Each claim is labelled under ASPIC+: IN, OUT or undecided. Only claims that are IN are written as claims, each no stronger than the record allows. Once the claims are locked, the graph is frozen and the paper is planned from it.",
      outs: ["EvaluationLabels.json", "FrozenGraph_v1.json"],
      steps: [
        { id: "g1", a: "code", t: "Trace every node to the record" },
        { id: "g2", a: "code", t: "Decide which claims stand: IN, OUT or undecided" },
        { id: "g3", a: "code", t: "Set how strongly each claim may be worded" },
        { id: "g4", a: "or", t: "Word each claim for the lock" },
      ],
      needs: ["EvaluationLabels.json"],
      progressive: true,
      play: async () => {
        // The claims and the Verifier stand from the start. The traces are the graph's own: the Verifier sweeps them
        // while the claims are evaluated; the labels come when the evaluation is published.
        if (!(await need("S07", "ArgumentGraph.json", "GraphEvidenceMap.json"))) return;
        const L = mapLayout();
        const order = L ? traceOrder(L) : [];
        const ev = file("GraphEvidenceMap.json")?.nodes ?? [];
        const withKeys = ev.filter((n) => n.keys.length || n.record).length;
        const withSources = ev.filter((n) => n.sources.length).length;
        const keys = [...new Set(ev.flatMap((n) => [...n.keys, ...(n.record ? [n.node_id.slice(2)] : [])]))];
        const missing = keys.filter((k) => ground(k).kind !== "value").length;
        await step(
          "S07",
          "g1",
          async () => {
            mark(MARK.sweep);
            emit();
            for (const [i, id] of order.entries()) await item(LIST.trace, i, { id, wait: 80, actor: "code" });
            mark(MARK.sweep, false);
            emit();
          },
          {
            text: `${plural(order.length, "node")} traced: ${withKeys} to ledger values, ${withSources} to sources. ${
              missing
                ? `${missing} of the ${keys.length} numbers they cite are not in the ledger.`
                : `All ${keys.length} numbers they cite are in the ledger.`
            }`,
          },
        );
        if (!(await need("S07", "EvaluationLabels.json"))) return;
        const labels = file("EvaluationLabels.json")?.labels ?? [];
        const c = labelCounts();
        await step(
          "S07",
          "g2",
          async () => {
            reveal("[data-conf]");
            for (const [i, l] of labels.entries())
              await item(LIST.label, i, { id: l.statement_id, text: reasonOf(l), wait: 380, actor: "code" });
          },
          {
            text: `Under grounded semantics, ${c.IN} of ${plural(c.n, "claim")} ${c.IN === 1 ? "is" : "are"} IN${
              c.OUT ? `, ${c.OUT} OUT` : ""
            }${c.UND ? `, ${c.UND} undecided` : ""}.${c.IN === c.n ? " No attack stands against a claim." : ""}`,
          },
        );
        await step(
          "S07",
          "g3",
          async () => {
            mark(MARK.strength);
            emit();
            await sleep(900);
          },
          { text: strengthLine() },
        );
        const worded = labels.filter((l) => l.approved_text).length;
        const negations = labels.filter((l) => l.negation).length;
        const out = notWrittenOf().length;
        await step(
          "S07",
          "g4",
          async () => {
            mark(MARK.worded);
            emit();
            await sleep(1000);
          },
          {
            text: `${worded} of ${plural(c.IN, "claim")} worded as the paper will state them, each with the qualifier it carries${
              negations ? `; ${negations} with ${negations === 1 ? "its" : "their"} opposite stated` : ""
            }${out ? `. ${plural(out, "statement")} will not be written` : ""}.`,
          },
        );
      },
      summary: () => {
        const p = LIVE.summary.S07 as { in?: number; out?: number; undec?: number } | undefined;
        const c = file("EvaluationLabels.json")
          ? labelCounts()
          : { IN: p?.in ?? 0, OUT: p?.out ?? 0, UND: p?.undec ?? 0, n: (p?.in ?? 0) + (p?.out ?? 0) + (p?.undec ?? 0) };
        if (!c.n) return "Every claim is labelled.";
        const ceiling = file("EvaluationLabels.json")?.ceiling.strength;
        const frozen = file("FrozenGraph_v1.json") ? " Graph frozen as map v1." : "";
        return `Labelled under ASPIC+: ${c.IN} of ${plural(c.n, "claim")} IN${c.OUT ? `, ${c.OUT} OUT` : ""}${
          c.UND ? `, ${c.UND} undecided` : ""
        }${ceiling ? `; worded at most “${ceiling}”` : ""}.${frozen}`;
      },
    },
  ],
};

export const GRAPH: LiveScreen[] = [REASONING, MAP];
