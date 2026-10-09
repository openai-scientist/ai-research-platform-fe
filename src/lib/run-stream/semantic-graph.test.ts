import { describe, expect, it } from "vitest";

import type { EntityType, MapEdge, MapNode, MapRelation } from "./contract";
import { checkGraph, egoGraph, traceOf } from "./semantic-graph";

const node = (id: string, type: EntityType): MapNode => ({ id, type, code: id, label: id, text: id, stage: 1 });
const edge = (from: string, relation: MapRelation, to: string): MapEdge => ({
  id: `${from}|${relation}|${to}`,
  from,
  relation,
  to,
  status: "stated",
  rationale: "r",
  provenance: "p",
});

const nodes = [
  node("RQ", "question"),
  node("SQ1", "question"),
  node("SQ2", "question"),
  node("EV1", "evidence"),
  node("C1", "claim"),
  node("G1", "gap"),
  node("H1", "hypothesis"),
  node("EC1", "contribution"),
];
const edges = [
  edge("RQ", "decomposes_into", "SQ1"),
  edge("RQ", "decomposes_into", "SQ2"),
  edge("EV1", "supports", "C1"),
  edge("C1", "provides_rationale_for", "H1"),
  edge("H1", "proposes_answer_to", "SQ1"),
  edge("H1", "addresses", "G1"),
  edge("H1", "informs", "EC1"),
  edge("EC1", "targets", "G1"),
];

describe("checkGraph", () => {
  it("passes a sound graph, warning only about the question nobody answers", () => {
    expect(checkGraph(nodes, edges)).toEqual([
      { level: "warning", text: "SQ2 has no hypothesis answering it yet.", ids: ["SQ2"] },
    ]);
  });

  it("rejects a relation between the wrong types, or flipped for the layout", () => {
    const flipped = edge("SQ1", "proposes_answer_to", "H1");
    const issues = checkGraph(nodes, [...edges, flipped]);
    expect(issues[0]).toMatchObject({ level: "error", ids: [flipped.id] });
  });

  it("rejects a question tree that loops, and flags orphans and unreviewed judgements", () => {
    const loop = edge("SQ1", "decomposes_into", "RQ");
    const lonely = node("G9", "gap");
    const unsure = { ...edge("EV1", "contradicts", "C1"), status: "unreviewed" as const };
    const texts = checkGraph([...nodes, lonely], [...edges, loop, unsure]).map((i) => i.text);
    expect(texts).toContain("The question tree loops through RQ, SQ1.");
    expect(texts).toContain("G9 is tied to nothing.");
    expect(texts).toContain("1 of 10 relations are judgements nobody has reviewed yet.");
  });
});

describe("egoGraph", () => {
  it("counts hops along relations in both directions", () => {
    const one = egoGraph(nodes, edges, "H1", { hops: 1, direction: "both" });
    expect([...one.hop.keys()].sort()).toEqual(["C1", "EC1", "G1", "H1", "SQ1"]);
    const two = egoGraph(nodes, edges, "H1", { hops: 2, direction: "both" });
    expect(two.hop.get("EV1")).toBe(2);
    expect(two.hop.get("RQ")).toBe(2);
    expect(two.edges).toContainEqual(edges[7]);
  });

  it("filters the ego's own relations by direction and type", () => {
    const inbound = egoGraph(nodes, edges, "H1", { hops: 1, direction: "in" });
    expect([...inbound.hop.keys()]).toEqual(["H1", "C1"]);
    const typed = egoGraph(nodes, edges, "H1", {
      hops: 1,
      direction: "both",
      relations: new Set<MapRelation>(["addresses"]),
    });
    expect(typed.edges.map((e) => e.relation)).toEqual(["addresses"]);
  });
});

describe("traceOf", () => {
  it("follows a hypothesis back to its evidence, and up from its question to the topic", () => {
    expect([...traceOf(edges, "H1")].sort()).toEqual(["C1", "EC1", "EV1", "G1", "H1", "RQ", "SQ1"]);
  });
});
