// The map stage of the mock run: the run's own records drawn as one semantic graph (the scientific research canvas)
// and as the nine pieces of the AMJ Management Research Canvas. Every node, relation and canvas line comes from a
// record the run already holds.

import type {
  CanvasPiece,
  Cluster,
  Gap,
  GoalField,
  Hypothesis,
  KnowledgeCard,
  MapEdge,
  MapNode,
  MapRelation,
  RelationStatus,
  ScopeRisk,
  SubQuestion,
  Tension,
} from "../contract";

export interface MapInput {
  topic: string;
  domains: string[];
  goal: { field: GoalField; value: string }[];
  subQuestions: SubQuestion[];
  risks: ScopeRisk[];
  cards: KnowledgeCard[];
  clusters: Cluster[];
  tension?: Tension;
  overview: string;
  gaps: Gap[];
  /** The hypotheses picked for testing, in order. */
  hypotheses: Hypothesis[];
  /** Ideas the debate set aside, with why. */
  asides: { id: string; statement: string; reason: string }[];
  /** Who is studied and where, as the run's scope states it. */
  setting: { text: string; refs: string[] }[];
  /** How each finding bears on the claim of its school of thought, with why. */
  evidenceLinks: { card: string; claim: string; relation: "supports" | "contradicts"; rationale: string }[];
  /** Which claims give each hypothesis its rationale or challenge it, with why. */
  rationales: { claim: string; hypothesis: string; polarity: "supports" | "challenges"; rationale: string }[];
}

/** One step of drawing the graph: nodes and relations in the order they appear. */
export interface MapStep {
  id: "questions" | "foundation" | "reasoning" | "contribution";
  items: ({ node: MapNode } | { edge: MapEdge })[];
}

/** A node's id is its entity type and the run's own id for the record, so every view shares it. */
export const nodeId = {
  question: (id: string) => `RQ:${id}`,
  evidence: (id: string) => `EV:${id}`,
  claim: (id: string) => `CL:${id}`,
  gap: (id: string) => `GAP:${id}`,
  hypothesis: (id: string) => `H:${id}`,
  contribution: (id: string) => `EC:${id}`,
};

const edge = (
  from: string,
  relation: MapRelation,
  to: string,
  status: RelationStatus,
  rationale: string,
  provenance: string,
  polarity?: "supports" | "challenges",
): MapEdge => ({
  id: `${from}|${relation}|${to}`,
  from,
  relation,
  to,
  ...(polarity ? { polarity } : {}),
  status,
  rationale,
  provenance,
});

/**
 * The run as one semantic graph, in the order the run made it: your question and its sub-questions (stages 1–2); the
 * findings and the claims they support or contradict, then the gaps (stages 6–7); the hypotheses, each answering a
 * sub-question, addressing a gap and resting on claims (stage 8); and what each would contribute. Every record is one
 * node, however many relations it takes part in.
 */
export function mapSteps(run: MapInput): MapStep[] {
  const cards = new Map(run.cards.map((c) => [c.id, c]));
  const gaps = new Map(run.gaps.map((g) => [g.id, g]));
  const topic = nodeId.question("topic");
  const goal = (field: GoalField) => run.goal.find((g) => g.field === field)?.value;

  const questions: MapStep = { id: "questions", items: [] };
  questions.items.push({
    node: {
      id: topic,
      type: "question",
      code: "RQ",
      label: run.topic,
      text: run.topic,
      stage: 1,
      facts: [
        { label: "Problem", value: goal("problem") ?? "" },
        { label: "Objective", value: goal("objective") ?? "" },
      ].filter((f) => f.value),
    },
  });
  for (const q of run.subQuestions) {
    const id = nodeId.question(q.id);
    const risk = run.risks.find((r) => r.sq_id === q.id);
    questions.items.push({
      node: {
        id,
        type: "question",
        code: q.id,
        label: q.text,
        text: q.text,
        stage: 2,
        facts: [
          { label: "Tests", value: q.tests },
          { label: "Priority", value: String(q.priority) },
          ...(risk ? [{ label: `Risk · ${risk.level}`, value: risk.text }] : []),
        ],
      },
    });
    questions.items.push({
      edge: edge(
        topic,
        "decomposes_into",
        id,
        "stated",
        `Covers "${q.covers.join('" and "')}" of your topic.`,
        "Stage 2 · sub-question tree",
      ),
    });
  }

  // Each school of thought comes in after the findings behind it, so its relations draw as it lands.
  const foundation: MapStep = { id: "foundation", items: [] };
  for (const cluster of run.clusters) {
    const links = run.evidenceLinks.filter((l) => l.claim === cluster.id && cards.has(l.card));
    const claim = nodeId.claim(cluster.id);
    for (const link of links) {
      const card = cards.get(link.card) as KnowledgeCard;
      foundation.items.push({
        node: {
          id: nodeId.evidence(card.id),
          type: "evidence",
          code: card.id,
          label: card.findings,
          text: card.findings,
          stage: 6,
          detail: card.data,
          source: card.citation,
          facts: [
            { label: "Method", value: card.method },
            { label: "Limitations", value: card.limitations },
          ].filter((f) => f.value),
        },
      });
    }
    foundation.items.push({
      node: {
        id: claim,
        type: "claim",
        code: cluster.id,
        origin: "literature",
        label: cluster.claim,
        text: cluster.claim,
        stage: 7,
        facts: [{ label: "School of thought", value: cluster.title }],
      },
    });
    for (const link of links)
      foundation.items.push({
        edge: edge(
          nodeId.evidence(link.card),
          link.relation,
          claim,
          "unreviewed",
          link.rationale,
          `Stage 7 · ${cluster.id} cluster`,
        ),
      });
  }
  for (const gap of run.gaps)
    foundation.items.push({
      node: {
        id: nodeId.gap(gap.id),
        type: "gap",
        code: gap.id,
        label: gap.text,
        text: gap.text,
        stage: 7,
        provenance: gap.from.flatMap((c) => {
          const card = cards.get(c);
          return card ? [{ source: card.citation, text: card.limitations }] : [];
        }),
      },
    });

  const reasoning: MapStep = { id: "reasoning", items: [] };
  const contribution: MapStep = { id: "contribution", items: [] };
  const motivated = new Set<string>();
  for (const h of run.hypotheses) {
    const id = nodeId.hypothesis(h.id);
    const sq = nodeId.question(h.sub_question);
    const gap = gaps.get(h.gap);
    reasoning.items.push({
      node: {
        id,
        type: "hypothesis",
        code: h.id,
        label: h.statement,
        text: h.statement,
        stage: 8,
        facts: [
          { label: "Predicts", value: `${h.exposure} → ${h.outcome}, ${h.prediction}` },
          { label: "Test", value: `${h.estimand} by ${h.method}` },
          { label: "Wrong if", value: h.falsify.text },
          { label: "Why", value: h.rationale },
        ],
      },
    });
    reasoning.items.push({
      edge: edge(
        id,
        "proposes_answer_to",
        sq,
        "stated",
        `Tests ${h.exposure} against ${h.outcome}, which is what ${h.sub_question} asks.`,
        `Stage 8 · ${h.id}`,
      ),
    });
    for (const r of run.rationales.filter((r) => r.hypothesis === h.id))
      reasoning.items.push({
        edge: edge(
          nodeId.claim(r.claim),
          "provides_rationale_for",
          id,
          "unreviewed",
          r.rationale,
          `Stage 8 · ${h.id} rationale`,
          r.polarity,
        ),
      });
    if (!gap) continue;
    reasoning.items.push({
      edge: edge(id, "addresses", nodeId.gap(gap.id), "stated", h.novelty, `Stage 8 · ${h.id}`),
    });
    // The run never records which gap motivates which question; a hypothesis tying the two is the only trace of it.
    if (!motivated.has(`${gap.id}>${h.sub_question}`)) {
      motivated.add(`${gap.id}>${h.sub_question}`);
      const via = run.hypotheses.filter((o) => o.gap === gap.id && o.sub_question === h.sub_question);
      reasoning.items.push({
        edge: edge(
          nodeId.gap(gap.id),
          "motivates",
          sq,
          "derived",
          `${via.map((o) => o.id).join(" and ")} ${via.length > 1 ? "answer" : "answers"} ${h.sub_question} and ${via.length > 1 ? "address" : "addresses"} ${gap.id}.`,
          `Derived from ${via.map((o) => o.id).join(", ")}`,
        ),
      });
    }

    const ec = nodeId.contribution(h.id);
    contribution.items.push({
      node: {
        id: ec,
        type: "contribution",
        code: `EC${h.id.slice(1)}`,
        label: h.novelty,
        text: h.novelty,
        stage: 8,
        facts: [{ label: "Status", value: `Expected. Nothing is shown until ${h.id} is tested.` }],
      },
    });
    contribution.items.push({
      edge: edge(id, "informs", ec, "stated", `What ${h.id} would add if it holds.`, `Stage 8 · ${h.id} novelty`),
    });
    contribution.items.push({
      edge: edge(
        ec,
        "targets",
        nodeId.gap(gap.id),
        "stated",
        `Would narrow ${gap.id}: ${gap.text}`,
        `Stage 8 · ${h.id}`,
      ),
    });
  }
  return [questions, foundation, reasoning, contribution];
}

/** The canvas pieces in the order the AMJ editorial discusses them, the puzzle first. */
export function canvasPieces(run: MapInput): CanvasPiece[] {
  const goal = (field: GoalField) => run.goal.find((g) => g.field === field)?.value ?? "";
  const limitations = run.cards.filter((c) => c.limitations);
  return [
    {
      id: "puzzle",
      status: "filled",
      items: [{ text: run.topic, refs: ["topic"] }, { text: goal("problem") }],
    },
    {
      id: "audience",
      status: "filled",
      note: "The audience is implied by the fields you listed; the prior research is the run's schools of thought.",
      items: [
        { text: `Conversations in ${run.domains.join(", ")}.` },
        ...run.clusters.map((c) => ({ text: `${c.title}: ${c.claim}`, refs: [c.id] })),
        { text: run.overview },
      ],
    },
    {
      id: "question",
      status: "filled",
      items: [{ text: goal("objective") }, ...run.subQuestions.map((q) => ({ text: q.text, refs: [q.id] }))],
    },
    {
      id: "theory",
      status: "filled",
      items: [
        ...run.hypotheses.map((h) => ({
          text: `${h.exposure} → ${h.outcome}, expected ${h.prediction}. ${h.rationale}`,
          refs: [h.id],
        })),
        ...(run.tension ? [{ text: run.tension.text, refs: run.tension.between }] : []),
      ],
    },
    { id: "setting", status: "filled", items: run.setting },
    {
      id: "design",
      status: "filled",
      items: [
        ...run.hypotheses.map((h) => ({
          text: `${h.estimand} by ${h.method}, reported as ${h.report_key}.`,
          refs: [h.id],
        })),
        { text: goal("success") },
      ],
    },
    {
      id: "findings",
      status: "pending",
      note: "Nothing has been tested yet. These are the results that would count against each hypothesis.",
      items: run.hypotheses.map((h) => ({ text: h.falsify.text, refs: [h.id] })),
    },
    {
      id: "contributions",
      status: "filled",
      note: "What each hypothesis would add if it holds.",
      items: run.hypotheses.map((h) => ({ text: h.novelty, refs: [h.id, h.gap] })),
    },
    {
      id: "boundaries",
      status: "filled",
      items: [
        ...run.risks.map((r) => ({ text: r.text, refs: [r.sq_id] })),
        ...limitations.slice(0, 3).map((c) => ({ text: c.limitations, refs: [c.id] })),
        ...run.asides.map((a) => ({ text: `${a.statement} Set aside: ${a.reason}`, refs: [a.id] })),
      ],
    },
  ];
}
