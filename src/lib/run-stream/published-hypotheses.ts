import { fetchArtifacts, type RunArtifactItem } from "@/lib/api/services/fetch-artifacts";

import type { CanvasPiece, MapEdge, MapNode } from "./contract";

const SET = "hypothesis.set/v1";
const HYPOTHESES = "hypothesis.hypotheses/v2";
const EVIDENCE = "hypothesis.evidence/v1";

export type PublicationRef = { stageRunId: string; primaryId?: string };

export type PublishedHypothesis = {
  id: string;
  statement: string;
  falsify?: string;
  exposure?: string;
  outcome?: string;
  prediction?: string;
  mechanism?: string;
  evidenceRefs: string[];
};

type PublishedEvidence = { id: string; title: string; excerpt?: string; hypothesisIds: string[] };

export type PublishedHypotheses = { hypotheses: PublishedHypothesis[]; evidence: PublishedEvidence[] };

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.flatMap((part) => text(part) ?? []) : [];
}

function terms(value: unknown) {
  return text(value) ?? (strings(value).join(", ") || undefined);
}

function parseSet(body: unknown): PublishedHypothesis[] | undefined {
  const { hypotheses } = record(body);
  if (!Array.isArray(hypotheses)) return;
  const items: PublishedHypothesis[] = [];
  const ids = new Set<string>();
  for (const raw of hypotheses) {
    const h = record(raw);
    const id = text(h.id);
    const statement = text(h.statement);
    // An older set without explicit ids cannot define the accept selection.
    if (!id || !statement || ids.has(id)) return;
    ids.add(id);
    const trail = Array.isArray(h.evidence_trail)
      ? h.evidence_trail.flatMap((entry) => strings(record(entry).card_ids))
      : [];
    items.push({
      id,
      statement,
      falsify: text(h.falsification) ?? text(record(h.falsify).text),
      exposure: terms(h.exposure),
      outcome: terms(h.outcome),
      prediction: text(h.prediction),
      mechanism: text(h.mechanism),
      evidenceRefs: [...new Set([...strings(h.evidence_refs), ...trail])],
    });
  }
  return items;
}

function parseEvidence(body: unknown): PublishedEvidence[] {
  const { cards } = record(body);
  if (!Array.isArray(cards)) return [];
  return cards.flatMap((raw) => {
    const card = record(raw);
    const id = text(card.card_id);
    if (!id) return [];
    return [
      {
        id,
        title: text(card.title) ?? id,
        excerpt: text(card.findings) ?? text(card.data),
        hypothesisIds: strings(card.hypothesis_ids),
      },
    ];
  });
}

export async function loadPublishedHypotheses(
  projectId: string,
  runId: string,
  publication: PublicationRef,
  signal: AbortSignal,
): Promise<PublishedHypotheses> {
  const { data } = await fetchArtifacts.getList(projectId, runId, signal);
  const artifacts = data.filter((item) => item.stage_run_id === publication.stageRunId);
  const bySchema = (schema: string) =>
    artifacts.filter((item) => item.schema_id === schema).sort((a, b) => (b.version ?? 0) - (a.version ?? 0))[0];
  const download = async (artifact: RunArtifactItem | undefined) => {
    if (!artifact) return;
    const { blob } = await fetchArtifacts.download(projectId, runId, artifact.id, signal);
    return JSON.parse(await blob.text()) as unknown;
  };

  const preferred = bySchema(SET);
  const primary =
    artifacts.find((item) => item.id === publication.primaryId && item.schema_id === HYPOTHESES) ??
    bySchema(HYPOTHESES);
  const readSet = async () => {
    const found = parseSet(await download(preferred).catch(() => undefined));
    return found?.length ? found : parseSet(await download(primary));
  };
  const [hypotheses, evidence] = await Promise.all([
    readSet(),
    download(bySchema(EVIDENCE))
      .then(parseEvidence)
      .catch(() => []),
  ]);
  if (!hypotheses) throw new Error("The published hypotheses could not be loaded.");
  return { hypotheses, evidence };
}

/** Reconstruct only records and citation links that the artifacts explicitly carry. */
export function publishedMap(publication: PublishedHypotheses, question?: string) {
  const nodes: MapNode[] = [];
  const edges: MapEdge[] = [];
  const pieces: CanvasPiece[] = [];
  for (const h of publication.hypotheses) {
    const facts = [
      ["Exposure", h.exposure],
      ["Outcome", h.outcome],
      ["Prediction", h.prediction],
      ["Falsifier", h.falsify],
    ].flatMap(([label, value]) => (label && value ? [{ label, value }] : []));
    nodes.push({
      id: `H:${h.id}`,
      type: "hypothesis",
      code: h.id,
      label: h.statement,
      text: h.statement,
      stage: 8,
      facts,
    });
  }
  for (const card of publication.evidence) {
    const cited = publication.hypotheses.filter(
      (h) => h.evidenceRefs.includes(card.id) || card.hypothesisIds.includes(h.id),
    );
    if (!cited.length) continue;
    const id = `EV:${card.id}`;
    nodes.push({ id, type: "evidence", code: card.id, label: card.title, text: card.excerpt ?? card.title, stage: 6 });
    for (const h of cited) {
      edges.push({
        id: `H:${h.id}|cites|${id}`,
        from: `H:${h.id}`,
        to: id,
        relation: "cites",
        status: "stated",
        rationale: "The published hypothesis cites this evidence card.",
        provenance: "Hypothesis stage artifacts",
      });
    }
  }
  if (question) pieces.push({ id: "question", status: "filled", items: [{ text: question }] });
  const mechanisms = publication.hypotheses.flatMap((h) => (h.mechanism ? [{ text: h.mechanism, refs: [h.id] }] : []));
  if (mechanisms.length) pieces.push({ id: "theory", status: "filled", items: mechanisms });
  const design = publication.hypotheses.flatMap((h) =>
    h.exposure && h.outcome
      ? [{ text: `${h.id} · Exposure: ${h.exposure} · Outcome: ${h.outcome}`, refs: [h.id] }]
      : [],
  );
  if (design.length) pieces.push({ id: "design", status: "filled", items: design });
  return { nodes, edges, pieces };
}
