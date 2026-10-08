import { describe, expect, it } from "vitest";

import type { MapEdge, MapNode } from "../contract";
import { checkGraph } from "../semantic-graph";
import {
  CARDS,
  CLUSTERS,
  DEBATES,
  DOMAINS,
  EVIDENCE_LINKS,
  GAPS,
  GOAL,
  OVERVIEW,
  RATIONALES,
  RISKS,
  SETTING,
  SUB_QUESTIONS,
  TENSION,
} from "./discovery";
import { canvasPieces, type MapInput, mapSteps, nodeId } from "./map";
import { HYPOTHESES, SAMPLE_TOPIC } from "./scenario";

const run: MapInput = {
  topic: SAMPLE_TOPIC,
  domains: DOMAINS,
  goal: GOAL,
  subQuestions: SUB_QUESTIONS,
  risks: RISKS,
  cards: CARDS,
  clusters: CLUSTERS,
  tension: TENSION,
  overview: OVERVIEW,
  gaps: GAPS,
  hypotheses: DEBATES.first.hypotheses.map((id) => HYPOTHESES[id]),
  asides: DEBATES.first.asides,
  setting: SETTING,
  evidenceLinks: EVIDENCE_LINKS,
  rationales: RATIONALES,
};

describe("mapSteps", () => {
  const steps = mapSteps(run);
  const items = steps.flatMap((s) => s.items);
  const nodes = items.flatMap((i) => ("node" in i ? [i.node] : []));
  const edges = items.flatMap((i) => ("edge" in i ? [i.edge] : []));
  const byId = new Map(nodes.map((n) => [n.id, n]));

  it("draws each relation only once both its ends are on the graph, and each record only once", () => {
    const placed = new Set<string>();
    for (const item of items) {
      if ("node" in item) placed.add(item.node.id);
      else {
        expect(placed.has(item.edge.from), item.edge.id).toBe(true);
        expect(placed.has(item.edge.to), item.edge.id).toBe(true);
      }
    }
    expect(byId.size).toBe(nodes.length);
    expect(new Set(edges.map((e) => e.id)).size).toBe(edges.length);
  });

  it("keeps to the vocabulary, with a rationale and provenance on every relation", () => {
    expect(checkGraph(nodes, edges).filter((i) => i.level === "error")).toEqual([]);
    for (const e of edges) {
      expect(e.rationale, e.id).not.toBe("");
      expect(e.provenance, e.id).not.toBe("");
    }
  });

  it("follows the run: questions, then the foundation, then hypotheses, then contributions", () => {
    const stages = steps.map((s) => [...new Set(s.items.flatMap((i) => ("node" in i ? [i.node.type] : [])))]);
    expect(stages).toEqual([["question"], ["evidence", "claim", "gap"], ["hypothesis"], ["contribution"]]);
  });

  it("ties H1 to its question, its gap, the claims for and against it, and what it would add", () => {
    const h1 = nodeId.hypothesis("H1");
    const ties = edges.filter((e) => e.from === h1 || e.to === h1);
    expect(ties.map((e) => [e.from, e.relation, e.to, e.polarity])).toEqual([
      [h1, "proposes_answer_to", nodeId.question("SQ1"), undefined],
      [nodeId.claim("C1"), "provides_rationale_for", h1, "supports"],
      [nodeId.claim("C2"), "provides_rationale_for", h1, "supports"],
      [nodeId.claim("C3"), "provides_rationale_for", h1, "challenges"],
      [h1, "addresses", nodeId.gap("G1"), undefined],
      [h1, "informs", nodeId.contribution("H1"), undefined],
    ]);
  });

  it("says how far each relation can be trusted", () => {
    const status = (e: MapEdge) => e.status;
    const of = (relation: MapEdge["relation"]) => new Set(edges.filter((e) => e.relation === relation).map(status));
    // Evidence → claim comes from clustering, and nobody checked each pair yet.
    expect(of("supports")).toEqual(new Set(["unreviewed"]));
    expect(of("contradicts")).toEqual(new Set(["unreviewed"]));
    // The run never says which gap motivates which question; only hypotheses tie them.
    expect(of("motivates")).toEqual(new Set(["derived"]));
    expect(of("proposes_answer_to")).toEqual(new Set(["stated"]));
  });

  it("makes a contradiction visible and keeps the gap's papers as its provenance", () => {
    expect(edges).toContainEqual(
      expect.objectContaining({ from: nodeId.evidence("dewald2010"), relation: "contradicts", to: nodeId.claim("C1") }),
    );
    const g1 = byId.get(nodeId.gap("G1")) as MapNode;
    expect(g1.provenance?.map((p) => p.source)).toEqual([
      "Okano et al., 2019",
      "Gilbert & Weaver, 2010",
      "Hershner & Chervin, 2014",
    ]);
  });

  it("never marks a hypothesis as shown, and flags the sub-question left unanswered", () => {
    expect(nodes.filter((n) => n.type === "contribution").every((n) => /Expected/.test(n.facts?.[0].value ?? ""))).toBe(
      true,
    );
    const warnings = checkGraph(nodes, edges).map((i) => i.text);
    expect(warnings).toContain("SQ3 has no hypothesis answering it yet.");
  });
});

describe("canvasPieces", () => {
  it("fills the nine pieces once each and leaves the findings open until something is tested", () => {
    const pieces = canvasPieces(run);
    expect(new Set(pieces.map((p) => p.id)).size).toBe(9);
    const findings = pieces.find((p) => p.id === "findings");
    expect(findings?.status).toBe("pending");
    expect(findings?.note).toMatch(/Nothing has been tested/);
    expect(pieces.filter((p) => p.status === "filled")).toHaveLength(8);
    expect(pieces.every((p) => p.items.length > 0)).toBe(true);
  });
});
