// The scientific research canvas as one semantic graph: its vocabulary, the checks every relation must pass, and the
// queries both views run on it. The layered canvas and the ego graph share these entity and relation ids.

import type { EntityType, MapEdge, MapNode, MapRelation } from "./contract";

/** The three presentation layers. A layer only groups nodes on screen; it says nothing about validity. */
export type MapLayer = "foundation" | "reasoning" | "contribution";

export const LAYER_OF: Record<EntityType, MapLayer> = {
  evidence: "foundation",
  claim: "foundation",
  gap: "foundation",
  question: "reasoning",
  hypothesis: "reasoning",
  assumption: "reasoning",
  contribution: "contribution",
};

/** Each relation's domain and range: the only entity types it may read from and to. */
export const VOCABULARY: Record<MapRelation, { from: EntityType; to: EntityType }> = {
  supports: { from: "evidence", to: "claim" },
  contradicts: { from: "evidence", to: "claim" },
  substantiates: { from: "claim", to: "gap" },
  motivates: { from: "gap", to: "question" },
  decomposes_into: { from: "question", to: "question" },
  proposes_answer_to: { from: "hypothesis", to: "question" },
  provides_rationale_for: { from: "claim", to: "hypothesis" },
  depends_on: { from: "hypothesis", to: "assumption" },
  addresses: { from: "hypothesis", to: "gap" },
  informs: { from: "hypothesis", to: "contribution" },
  targets: { from: "contribution", to: "gap" },
};

export interface GraphIssue {
  level: "error" | "warning";
  text: string;
  /** The nodes or relations it is about. */
  ids: string[];
}

/**
 * What a reviewer should know before trusting the graph: relations outside the vocabulary or between the wrong types,
 * a question tree that loops, nodes tied to nothing, questions nobody answers, gaps nobody addresses, hypotheses with
 * no rationale, and how many relations are still unreviewed judgements.
 */
export function checkGraph(nodes: MapNode[], edges: MapEdge[]): GraphIssue[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const issues: GraphIssue[] = [];
  const sound: MapEdge[] = [];
  for (const e of edges) {
    const rule = VOCABULARY[e.relation];
    const a = byId.get(e.from);
    const b = byId.get(e.to);
    if (!rule) issues.push({ level: "error", text: `"${e.relation}" is not in the vocabulary.`, ids: [e.id] });
    else if (!a || !b) issues.push({ level: "error", text: `${e.id} points to a node that isn't there.`, ids: [e.id] });
    else if (a.type !== rule.from || b.type !== rule.to)
      issues.push({
        level: "error",
        text: `${a.code} ${e.relation.replaceAll("_", " ")} ${b.code}: ${e.relation} reads from ${rule.from} to ${rule.to}.`,
        ids: [e.id],
      });
    else sound.push(e);
  }

  const parents = new Map<string, string[]>();
  for (const e of sound)
    if (e.relation === "decomposes_into") parents.set(e.to, [...(parents.get(e.to) ?? []), e.from]);
  // A question is on a loop when walking up the tree from it leads back to it.
  const loops = (start: string) => {
    const seen = new Set<string>();
    const up = [...(parents.get(start) ?? [])];
    while (up.length) {
      const at = up.pop() as string;
      if (at === start) return true;
      if (seen.has(at)) continue;
      seen.add(at);
      up.push(...(parents.get(at) ?? []));
    }
    return false;
  };
  const looped = nodes.filter((n) => n.type === "question" && loops(n.id));
  if (looped.length)
    issues.push({
      level: "error",
      text: `The question tree loops through ${looped.map((n) => n.code).join(", ")}.`,
      ids: looped.map((n) => n.id),
    });

  const tied = new Set(sound.flatMap((e) => [e.from, e.to]));
  const into = (id: string, relation: MapRelation) => sound.some((e) => e.to === id && e.relation === relation);
  for (const n of nodes) {
    if (!tied.has(n.id)) issues.push({ level: "warning", text: `${n.code} is tied to nothing.`, ids: [n.id] });
    else if (n.type === "question" && !sound.some((e) => e.from === n.id && e.relation === "decomposes_into")) {
      if (!into(n.id, "proposes_answer_to"))
        issues.push({ level: "warning", text: `${n.code} has no hypothesis answering it yet.`, ids: [n.id] });
    } else if (n.type === "gap" && !into(n.id, "addresses"))
      issues.push({ level: "warning", text: `${n.code} is not addressed by any hypothesis.`, ids: [n.id] });
    else if (n.type === "hypothesis" && !into(n.id, "provides_rationale_for"))
      issues.push({ level: "warning", text: `${n.code} has no claim giving it a rationale.`, ids: [n.id] });
  }

  const unreviewed = sound.filter((e) => e.status === "unreviewed");
  if (unreviewed.length)
    issues.push({
      level: "warning",
      text: `${unreviewed.length} of ${sound.length} relations are judgements nobody has reviewed yet.`,
      ids: unreviewed.map((e) => e.id),
    });
  return issues;
}

export type Direction = "both" | "in" | "out";

/**
 * The neighbourhood of one node, counted in hops along relations rather than by where nodes sit on screen. `hop` is
 * how far each node is from the ego; only relations whose ends are both in the neighbourhood are kept.
 */
export function egoGraph(
  nodes: MapNode[],
  edges: MapEdge[],
  ego: string,
  { hops, relations, direction }: { hops: 1 | 2; relations?: Set<MapRelation>; direction: Direction },
): { hop: Map<string, number>; edges: MapEdge[] } {
  const usable = edges.filter((e) => !relations || relations.has(e.relation));
  const hop = new Map<string, number>([[ego, 0]]);
  let ring = [ego];
  for (let h = 1; h <= hops; h++) {
    const next: string[] = [];
    for (const id of ring)
      for (const e of usable) {
        // The direction filter applies to the ego's own relations; further out, every relation counts.
        let other: string | null = null;
        if (e.from === id && (h > 1 || direction !== "in")) other = e.to;
        else if (e.to === id && (h > 1 || direction !== "out")) other = e.from;
        if (other && !hop.has(other)) {
          hop.set(other, h);
          next.push(other);
        }
      }
    ring = next;
  }
  const known = new Set(nodes.map((n) => n.id));
  for (const id of hop.keys()) if (!known.has(id)) hop.delete(id);
  const kept = usable.filter((e) => {
    if (!hop.has(e.from) || !hop.has(e.to)) return false;
    if (e.from !== ego && e.to !== ego) return true;
    return direction === "both" || (direction === "out" ? e.from === ego : e.to === ego);
  });
  return { hop, edges: kept };
}

/**
 * What a node rests on and what it ties to: everything that leads into it, followed back to the evidence (why should
 * I believe this?), its direct neighbours, and the questions above any question among them.
 */
export function traceOf(edges: MapEdge[], id: string): Set<string> {
  const lit = new Set([id]);
  const back = [id];
  while (back.length) {
    const at = back.pop() as string;
    for (const e of edges)
      if (e.to === at && !lit.has(e.from)) {
        lit.add(e.from);
        back.push(e.from);
      }
  }
  for (const e of edges) {
    if (e.from === id) lit.add(e.to);
    if (e.to === id) lit.add(e.from);
  }
  // A question's own place in the tree: the questions it decomposes from, up to your topic.
  const up = [...lit];
  while (up.length) {
    const at = up.pop() as string;
    for (const e of edges)
      if (e.relation === "decomposes_into" && e.to === at && !lit.has(e.from)) {
        lit.add(e.from);
        up.push(e.from);
      }
  }
  return lit;
}
