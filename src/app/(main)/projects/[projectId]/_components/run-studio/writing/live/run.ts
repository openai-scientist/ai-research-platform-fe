/* ===== A writing run on the engine, followed live: its events, its files and its stops =====
   The run's events arrive through the run event reader (stored ones first, then the live stream). Each one is folded
   into LIVE; a file the engine delivers is read once and kept by name (the newest version wins). The screens read
   LIVE, never a copy, and the player (player.ts) waits on it to play each stage when that stage's files are in. */

import { toast } from "sonner";

import { fetchArtifacts, type RunArtifactItem } from "@/lib/api/services/fetch-artifacts";
import { fetchRuns, type RunItem, type StageGateAnswer } from "@/lib/api/services/fetch-runs";
import { subscribeRunEvents } from "@/lib/realtime/run-events";
import type { Charter } from "@/lib/run-stream/contract";
import { ApiError } from "@/types/api";

import { emit, log, S, settle, tell } from "../engine";
import type { RunFileName, RunFiles, SectionBrief, Statement } from "./types";

export const OUTLINE_PIPELINE = "writing_outline";
/** The pipeline that goes on from the outline to the first draft, section by section. */
export const DRAFT_PIPELINE = "writing_draft";
/** The first draft, guided: a review at the end of each group of stages, and your own objections in the debate. */
export const GUIDED_PIPELINE = "writing_guided";
export const isDraftRun = (run: Pick<RunItem, "pipeline_key">) =>
  run.pipeline_key === DRAFT_PIPELINE || run.pipeline_key === GUIDED_PIPELINE;
export const isGuidedRun = (run: Pick<RunItem, "pipeline_key">) => run.pipeline_key === GUIDED_PIPELINE;
/** A run of the writing stage on its own: to the outline, or on to the first draft. */
export const isWritingRun = (run: Pick<RunItem, "pipeline_key">) =>
  run.pipeline_key === OUTLINE_PIPELINE || isDraftRun(run);

/** The engine's steps of an outline run, in order, and the stage of the writing screens each one is. */
export const STEP_STAGE: Record<string, string> = {
  intake: "S00",
  /** A guided run's reviews, each at the end of the group of stages it looks back on. */
  review_intake: "S00",
  /** The writing frame (branch A), built from the journal profile alone, beside the argument (branch B). */
  frame: "S00A",
  data_report: "S01",
  evidence: "S02",
  review_record: "S02",
  axis: "S03",
  review_statements: "S03",
  debate: "S04",
  toulmin: "S05",
  review_argument: "S05",
  graph: "S06",
  evaluate: "S07",
  journal: "S08",
  outline: "S09",
  contracts: "S10",
  draft_results: "S11",
  draft_discussion: "S12",
  draft_limitations: "S13",
  draft_introduction: "S14",
  draft_related_work: "S15",
  draft_conclusion: "S16",
  draft: "S17",
};
/** The sections the writers write, each in a stage of its own, in the order the engine writes them. */
export const SECTION_STAGE: Record<string, string> = {
  results: "S11",
  discussion: "S12",
  limitations: "S13",
  introduction: "S14",
  related_work: "S15",
  conclusion: "S16",
};
export const SECTION_OF_STAGE: Record<string, string> = Object.fromEntries(
  Object.entries(SECTION_STAGE).map(([sec, sid]) => [sid, sec]),
);
const ALL_STAGES = [...new Set(Object.values(STEP_STAGE))];
const OUTLINE_STAGES = ALL_STAGES.filter((sid) => sid <= "S10");
/** The stages of the run open in the studio: an outline run ends at S10, a draft run at S17. */
export const LIVE_STAGES: string[] = [...OUTLINE_STAGES];
function setStages(draft: boolean) {
  LIVE_STAGES.splice(0, LIVE_STAGES.length, ...(draft ? ALL_STAGES : OUTLINE_STAGES));
}

/** The event each step sends when it is done, with what it found. */
const DONE_EVENT: Record<string, string> = {
  "writing.package_read": "S00",
  "writing.frame_ready": "S00A",
  "writing.data_report_ready": "S01",
  "writing.ledger_ready": "S02",
  "writing.statements_labelled": "S03",
  "writing.debate_closed": "S04",
  "writing.cards_drawn": "S05",
  "writing.graph_built": "S06",
  "writing.claims_evaluated": "S07",
  "writing.contract_merged": "S08",
  "writing.outline_ready": "S09",
  "writing.contracts_ready": "S10",
  "writing.draft_published": "S17",
};

/** A model call of the run, as `writing.step_progress` reports it. */
export interface ModelCall {
  seq: number;
  stage: string;
  task: string;
  label: string;
  /** The engine's name for who is speaking; none for a call that only fills a form. */
  agent: string | null;
  state: string;
  at: string;
  done?: string;
}

/** A stop the run is waiting at: a question of a step, the lock, or a decision the PI leaves to you. */
export interface LiveStop {
  id: string;
  kind: "question" | "artifact_review" | "charter" | "outcome" | "close" | "failure";
  stage: string;
  stageRunId: string | null;
  consultationId?: string;
  /** What is asked, and why the run could not settle it alone. */
  prompt: string;
  why: string;
  options: { id: string; label: string }[];
  recommended: string | null;
  artifactIds: string[];
  /** The checkpoint the stop belongs to (P1–P5), when it is one. */
  checkpoint?: string;
  /** The engine step that asks: a guided run's review, the debate's objections, the warrants' decision. */
  stepKey?: string;
  /** The PI's recommendation for a consultation, and how sure it is. */
  pi?: { action: string; confidence: number | null; reason: string } | null;
  charter?: Charter | null;
  sending: boolean;
}

/** A guided run's review of a group of stages: every line read from the stages' files by code. */
export interface StageReview {
  review: string;
  stages: string;
  title: string;
  did: string[];
  check: { what: string; artifact: string; id: string }[];
  becomes: { item: string; effect: string }[];
  /** The model stages a note written here is handed to. */
  handed_to?: string[];
}
export interface ObjectableClaim {
  claim_id: string;
  text: string;
  questions: { cq_id: string; text: string }[];
}
export interface OpenWarrant {
  claim_id: string;
  claim: string;
  warrant: string;
}

/** A stop that was answered: by you, by the PI, or by the run on its recommendation (auto). */
export interface LiveAnswer {
  seq: number;
  stage: string;
  question: string;
  answer: string;
  by: "you" | "pi" | "auto";
  /** The answer says it all (an approval): shown without its question. */
  whole?: boolean;
}
/** Records how a question was settled; the answer given later replaces the run's own assumption. */
function note(
  question: string,
  answer: string,
  by: LiveAnswer["by"],
  stage: string,
  seq: number,
  final: boolean,
  whole = false,
) {
  const q = askText(question);
  const at = LIVE.answers.findIndex((a) => a.question === q);
  if (at >= 0 && !final) return;
  // A checkpoint's option carries its scorecard's summary in brackets: the choice reads without it.
  const cut = answer.search(/\s\((?=[^)]*(?:hard:|to look at:|rules? pass|every rule))/);
  const said = (cut > 0 ? answer.slice(0, cut) : answer).replace(/\s*\([^)]*\)$/, "");
  const entry: LiveAnswer = { seq, stage, question: q, answer: said, by, whole };
  if (at >= 0) LIVE.answers[at] = entry;
  else LIVE.answers.push(entry);
  if (final)
    log(
      by === "you" ? "you" : "or",
      `${q} ${entry.answer}${by === "auto" ? " (taken on the recommendation)" : ""}`,
      "decision",
    );
}

export interface CheckpointEval {
  checkpoint: string;
  status: string;
  h_failed: number;
  m_score: number;
  rows: { rule: string; kind: string; book_ref: string; passed: boolean; locator: string; note: string }[];
}

function fresh() {
  return {
    on: false,
    projectId: "",
    runId: "",
    label: "",
    topic: "",
    mode: "light" as "auto" | "light",
    /** The run goes on from the outline to the first draft. */
    draft: false as boolean,
    /** The run's status on the Platform. */
    status: "running" as string,
    /** The files the run has published so far, by name: the newest version of each. */
    files: {} as Partial<RunFiles>,
    /** The files every section stage publishes under one name, by section: the newest of each. */
    bySection: { "Section.json": {}, "SectionDraft.json": {} } as {
      [K in PerSectionName]: Record<string, RunFiles[K]>;
    },
    versions: {} as Record<string, number>,
    /** When the version of each file on screen was delivered: which of two files is the newer. */
    deliveredAt: {} as Record<string, string>,
    /** Stages the engine has begun and finished. */
    begun: new Set<string>(),
    finished: new Set<string>(),
    /** Stages that were done before you opened the run: they show at once. */
    past: new Set<string>(),
    /** The last event stored when the run was opened: up to it, events are history. */
    historyEnd: 0,
    /** What each stage reported when it was done (the payload of its done event). */
    summary: {} as Record<string, Record<string, unknown>>,
    calls: [] as ModelCall[],
    /** What each section's writers were told before they wrote it, by section. */
    briefs: {} as Record<string, SectionBrief>,
    checkpoints: {} as Record<string, CheckpointEval>,
    /** A guided run: it stops at the end of each group of stages for you to review them. */
    guided: false as boolean,
    /** Each review of a guided run, by its step: what the stages did, what to look at, what it becomes. */
    reviews: {} as Record<string, StageReview>,
    /** The claims you may object to in the debate, each with its critical questions (guided runs). */
    objectable: [] as ObjectableClaim[],
    /** The warrants no source states, for you to endorse, reword or keep marked. */
    openWarrants: [] as OpenWarrant[],
    stop: null as LiveStop | null,
    answers: [] as LiveAnswer[],
    /** The outline is published: the run's work is over. */
    published: null as Record<string, unknown> | null,
    failed: null as string | null,
    stageRunId: null as string | null,
    lastSeq: 0,
    /** Every stored event has been read; what comes now happens live. */
    caughtUp: false,
    reconnecting: false,
  };
}
export let LIVE = fresh();

/** Files each section stage publishes under the same name: kept apart by the section they hold. */
type PerSectionName = "Section.json" | "SectionDraft.json";
const PER_SECTION = new Set<string>(["Section.json", "SectionDraft.json"]);
/** A section's file, once its stage has published it. */
export const sectionFile = <K extends PerSectionName>(name: K, sectionId: string) =>
  LIVE.bySection[name][sectionId] as RunFiles[K] | undefined;

/** A file of the run, once it has been published and read. */
export const file = <K extends RunFileName>(name: K) => LIVE.files[name] as RunFiles[K] | undefined;
export const has = (...names: RunFileName[]) => names.every((n) => LIVE.files[n] !== undefined);
/** Of files that stand for the same thing, the one delivered last (e.g. the draft tree or the checked tree). */
export const newest = (...names: RunFileName[]) =>
  names.filter((n) => has(n)).sort((a, b) => (LIVE.deliveredAt[b] ?? "").localeCompare(LIVE.deliveredAt[a] ?? ""))[0];

/* ---------- reading the run's files ---------- */
const read = new Set<string>();
const retries = new Map<string, number>();
let listing: Promise<void> | null = null;
let again = false;
async function readFiles() {
  if (listing !== null) {
    again = true;
    return listing;
  }
  const run = { projectId: LIVE.projectId, runId: LIVE.runId };
  listing = (async () => {
    do {
      again = false;
      const { data } = await fetchArtifacts.getList(run.projectId, run.runId);
      const items = [...data].sort((a, b) => (a.version ?? 0) - (b.version ?? 0));
      // A file every section publishes under one name is read in each version: each one may hold another section.
      const fresh = items.filter(
        (a) => !read.has(a.id) && (PER_SECTION.has(a.filename) || (LIVE.versions[a.filename] ?? 0) <= (a.version ?? 0)),
      );
      await Promise.all(fresh.map((a) => readOne(run, a)));
    } while (again && LIVE.runId === run.runId);
  })()
    .catch(() => {
      // The list of files could not be read: try again shortly, for as long as the run is open.
      setTimeout(() => {
        if (LIVE.runId === run.runId) void readFiles();
      }, 3000);
    })
    .finally(() => {
      listing = null;
    });
  return listing;
}
async function readOne(run: { projectId: string; runId: string }, a: RunArtifactItem) {
  read.add(a.id);
  try {
    const { blob } = await fetchArtifacts.download(run.projectId, run.runId, a.id);
    const text = await blob.text();
    if (LIVE.runId !== run.runId) return;
    const version = a.version ?? 0;
    if (PER_SECTION.has(a.filename)) {
      const body = JSON.parse(text) as { section_id: string };
      const key = `${a.filename}#${body.section_id}`;
      if ((LIVE.versions[key] ?? -1) > version) return;
      (LIVE.bySection[a.filename as PerSectionName] as Record<string, unknown>)[body.section_id] = body;
      LIVE.versions[key] = version;
      LIVE.deliveredAt[key] = a.created_at;
      changed();
      return;
    }
    if ((LIVE.versions[a.filename] ?? -1) > version) return;
    const content = a.filename.endsWith(".json") ? JSON.parse(text) : text;
    (LIVE.files as Record<string, unknown>)[a.filename] = content;
    LIVE.versions[a.filename] = version;
    LIVE.deliveredAt[a.filename] = a.created_at;
    changed();
  } catch {
    // A download that failed is read again: the last file of a run has no later delivery to bring it in.
    read.delete(a.id);
    const tries = (retries.get(a.id) ?? 0) + 1;
    retries.set(a.id, tries);
    if (tries <= 5 && LIVE.runId === run.runId)
      setTimeout(
        () => {
          if (LIVE.runId === run.runId) void readFiles();
        },
        1000 * 2 ** tries,
      );
  }
}

/** What each file holds, in the words the screens use for it. */
export const OBJECT_NAME: Record<string, string> = {
  "experiment_result.json": "Experiment result package",
  "IntakeChecks.json": "Intake checks",
  "IntakeIssues.json": "Limits on the paper",
  "DataReport.json": "Data report",
  "ClaimCeiling.json": "Claim ceiling",
  "LinkChain.json": "Link chain",
  "EvidenceLedger.json": "Evidence ledger",
  "Exhibits.json": "Tables and figures",
  "ReadinessReport.md": "Readiness report",
  "StatementRegistry.json": "Statement registry",
  "LifecycleLinks.json": "Lifecycle links",
  "DebateRecord.json": "Debate record",
  "Rulings.json": "Rulings",
  "ToulminCards.json": "Toulmin cards",
  "ArgumentGraph.json": "Argument graph",
  "GraphEvidenceMap.json": "Evidence links",
  "EvaluationLabels.json": "ASPIC+ labels",
  "FrozenGraph_v1.json": "Frozen graph v1",
  "WritingFrame.json": "Writing frame",
  "JoinReport.json": "Join check",
  "JournalWritingContract.json": "Journal contract",
  "PlacementMap.json": "Placement map",
  "StoryPlan.json": "Story",
  "SynthesisPlan.json": "Comparison plan",
  "ManuscriptBlueprint.json": "Outline",
  "SectionContracts.json": "Section contracts",
  "ManuscriptTree.json": "Paper tree",
  "ManuscriptTreeDraft.json": "Paper tree (draft)",
  "DebateRecordDraft.json": "Debate so far",
  "StoryPlanDraft.json": "Story (draft)",
  "Section.json": "Section",
  "SectionDraft.json": "Section, as written",
  "Draft_1.md": "First draft",
  "paper.md": "Paper",
  "paper.json": "Paper",
  "SentenceProvenance.json": "Sentence provenance",
  "FrontDraft.json": "Title and abstract, as written",
};

/* ---------- the ledger, the registry: words for the ids every other file uses ---------- */
/** The value a ledger key prints as, or the key itself while the ledger is not in. */
/** A number of the ledger in a form the engine names after the key (`{{key|pct}}`), as the engine prints it. */
const FORM: Record<string, (n: number) => string> = {
  pct: (n) => `${(n * 100).toFixed(1)}%`,
  int: (n) => Math.round(n).toLocaleString("en-US"),
  signed: (n) => `${n >= 0 ? "+" : ""}${n.toFixed(3)}`,
  d1: (n) => n.toFixed(1),
  d2: (n) => n.toFixed(2),
  d3: (n) => n.toFixed(3),
  d4: (n) => n.toFixed(4),
};
export function printed(key: string, form?: string) {
  const text = file("EvidenceLedger.json")?.ledger.find((v) => v.key === key)?.printed;
  if (!text) return key;
  const n = Number(text.replace("−", "-"));
  // An interval, a count with its noun or a word keeps the form it is printed in.
  const format = form ? FORM[form] : undefined;
  return format && text.trim() !== "" && Number.isFinite(n) ? format(n).replace("-", "−") : text;
}
/** A sentence with its `{{key}}` and `{{key|form}}` placeholders filled from the ledger. */
export const fill = (text: string) =>
  text.replace(/\{\{\s*([^}|]+?)\s*(?:\|\s*([a-z0-9]+)\s*)?\}\}/g, (_, key: string, form?: string) =>
    printed(key, form),
  );
export function statement(id: string): Statement | undefined {
  const frozen = file("FrozenGraph_v1.json")?.statements.find((s) => s.statement_id === id);
  return frozen ?? file("StatementRegistry.json")?.statements.find((s) => s.statement_id === id);
}
/** What a statement says, with its approved wording first and its numbers filled in. */
export const says = (id: string) => {
  const s = statement(id);
  return s ? fill(s.approved_text || s.text) : id;
};

/* ---------- the events ---------- */
/** A stored run event as the reader delivers it; a writing run's own types are not in the research run's contract. */
interface Ev {
  seq: number;
  ts: string;
  type: string;
  payload: Record<string, unknown>;
  stage_run_id?: string;
  step_key?: string;
  summary?: string;
}
const stageOf = (ev: Ev) => (ev.step_key ? STEP_STAGE[ev.step_key] : undefined);
const AGENT_KEY: Record<string, string> = {
  "Data Steward": "ds",
  "Evidence Curator": "cu",
  "Statement Scientist": "sci",
  Proponent: "aa",
  "Method critic": "qm",
  "Statistics critic": "qs",
  "Scope critic": "qx",
  "Sources critic": "qo",
  Judge: "jd",
  "Graph Builder": "ag",
  Planner: "rp",
  "Section writer": "sw",
  Verifier: "av",
  "Synthesis Planner": "sy",
  Editor: "ed",
};
/** The writing screens' key for an engine persona; a call without one is the code's. */
export const agentKey = (agent: string | null | undefined) => (agent ? (AGENT_KEY[agent] ?? "or") : "code");
/** Who makes a model call: its persona, or the model alone when the prompt gives it none. */
export const callKey = (agent: string | null | undefined) => (agent ? agentKey(agent) : "ai");

function changed() {
  settle("live");
  emit();
}

function fold(ev: Ev, live: boolean) {
  const p = ev.payload;
  const sid = stageOf(ev);
  if (sid) LIVE.begun.add(sid);
  if (ev.stage_run_id) LIVE.stageRunId = ev.stage_run_id;
  LIVE.lastSeq = ev.seq;
  switch (ev.type) {
    case "run.step_changed": {
      const from = p.from as string | null;
      if (from && STEP_STAGE[from]) {
        LIVE.finished.add(STEP_STAGE[from]);
        // A stage done before you opened the run plays at once, as one with a done event of its own does.
        if (!live) LIVE.past.add(STEP_STAGE[from]);
      }
      break;
    }
    case "writing.step_progress": {
      // The step the event came from says its stage; a run made before every section had a stage of its own named the
      // first section's for all of them.
      const stage = sid ?? (p.stage as string) ?? "";
      LIVE.begun.add(stage);
      const open = LIVE.calls.find((c) => c.task === p.task && c.stage === stage && !c.done);
      if (open && p.state !== "started") {
        open.state = p.state as string;
        open.done = ev.ts;
        const secs = Math.round((Date.parse(ev.ts) - Date.parse(open.at)) / 1000);
        log(
          callKey(open.agent),
          `${open.label}: ${p.state === "done" ? "done" : (p.state as string)} in ${secs < 60 ? `${secs}s` : `${Math.floor(secs / 60)}m ${secs % 60}s`}.`,
        );
      } else if (!open)
        LIVE.calls.push({
          seq: ev.seq,
          stage,
          task: p.task as string,
          label: p.label as string,
          // The verifier's passes give the model no persona: the verifier still makes them.
          agent: (p.agent as string | null) ?? (/^Verifier/.test(p.label as string) ? "Verifier" : null),
          state: p.state as string,
          at: ev.ts,
        });
      if (live && p.state === "started") {
        const agent = LIVE.calls[LIVE.calls.length - 1]?.agent ?? null;
        tell(callKey(agent), callLine(p.label as string, agent));
      }
      break;
    }
    case "writing.gate_evaluated":
    case "writing.checkpoint_opened": {
      const card = p.scorecard as Omit<CheckpointEval, "status">;
      LIVE.checkpoints[p.checkpoint as string] = { ...card, status: (p.status as string) ?? "opened" };
      break;
    }
    case "run.gate_opened":
      openStop({
        id: p.gate_id as string,
        kind: p.kind === "artifact_review" ? "artifact_review" : "question",
        stage: STEP_STAGE[p.step_key as string] ?? sid ?? S.stage,
        stageRunId: ev.stage_run_id ?? LIVE.stageRunId,
        ...splitPrompt(p.prompt as string),
        options: ((p.options as { option_id: string; label: string }[]) ?? []).map((o) => ({
          id: o.option_id,
          label: o.label,
        })),
        recommended: (p.default_option_id as string | null) ?? null,
        artifactIds: (p.artifact_ids as string[]) ?? [],
        checkpoint: checkpointOf(p.step_key as string, p.prompt as string),
        stepKey: (p.step_key as string | undefined) ?? undefined,
        sending: false,
      });
      break;
    case "writing.stage_review":
      LIVE.reviews[p.review as string] = p as unknown as StageReview;
      break;
    case "writing.objections_open":
      LIVE.objectable = (p.claims as ObjectableClaim[]) ?? [];
      break;
    case "writing.warrants_open":
      LIVE.openWarrants = (p.warrants as OpenWarrant[]) ?? [];
      break;
    case "run.gate_closed": {
      const stop = LIVE.stop?.id === p.gate_id ? LIVE.stop : null;
      // A question's answer comes with its own event; an approval or a note sent back does not.
      if (p.action !== "answer")
        note(
          stop?.prompt ?? (p.gate_id as string),
          p.action === "approve" ? "Locked the claims and froze the graph." : "Sent the claims back with a note.",
          p.actor === "user" ? "you" : "pi",
          stop?.stage ?? sid ?? S.stage,
          ev.seq,
          true,
          true,
        );
      if (stop) closeStop();
      break;
    }
    case "writing.ask_user_answered":
    case "writing.assumption": {
      const answered = ev.type === "writing.ask_user_answered";
      const by = !answered ? "auto" : p.by === "researcher" ? "you" : p.by === "pi" ? "pi" : "auto";
      note(
        p.question as string,
        answered ? (p.label as string) : (p.default as string),
        by,
        sid ?? S.stage,
        ev.seq,
        answered,
      );
      break;
    }
    case "pi.consultation_requested":
      if (p.authority === "researcher")
        openStop({
          id: `pi:${p.consultation_id as string}`,
          kind:
            p.kind === "charter"
              ? "charter"
              : p.kind === "stage_outcome"
                ? "outcome"
                : p.kind === "close"
                  ? "close"
                  : "failure",
          stage: p.kind === "charter" ? "S00" : (sid ?? S.stage),
          stageRunId: ev.stage_run_id ?? LIVE.stageRunId,
          consultationId: p.consultation_id as string,
          prompt:
            CONSULT_PROMPT[p.kind === "stage_outcome" && LIVE.draft ? "draft_outcome" : (p.kind as string)] ??
            "The PI needs your decision",
          why: "",
          options: [],
          recommended: null,
          artifactIds: [],
          pi: null,
          sending: false,
        });
      break;
    case "pi.recommendation":
    case "pi.decision":
      if (LIVE.stop && LIVE.stop.consultationId === p.consultation_id) {
        const stop = LIVE.stop;
        stop.pi = {
          action: p.action as string,
          confidence: (p.confidence as number | undefined) ?? stop.pi?.confidence ?? null,
          reason: ev.summary ?? stop.pi?.reason ?? "",
        };
        if (stop.kind === "charter") void loadCharter(stop);
      }
      break;
    case "pi.charter_settled":
      if (LIVE.stop?.kind === "charter") closeStop("The charter is settled; writing starts from it.");
      break;
    case "decision.recorded":
      // The person's decision on a PI consultation: the stop it opened closes, here and on reopening the run.
      if (p.consultation_id && LIVE.stop?.consultationId === p.consultation_id) {
        const stop = LIVE.stop;
        const took = !stop.pi || stop.pi.action === p.action;
        note(
          stop.prompt,
          took ? "Took the PI's recommendation." : `Decided: ${p.action as string}.`,
          "you",
          stop.stage,
          ev.seq,
          true,
        );
        closeStop();
      }
      break;
    case "writing.outline_published":
    case "writing.draft_published":
      LIVE.published = p;
      break;
    case "writing.section_brief":
      LIVE.briefs[p.section_id as string] = p as unknown as SectionBrief;
      break;
    case "run.published":
      LIVE.status = "completed";
      break;
    case "artifact.delivered":
      void readFiles();
      break;
    case "stage.status_changed":
      if (p.status === "FAILED") LIVE.failed = "The writing stage failed.";
      break;
    case "run.failed":
    case "stage.failed":
      LIVE.failed = ((p.message ?? p.reason) as string) || "The writing run failed.";
      break;
  }
  const done = DONE_EVENT[ev.type];
  if (done) {
    LIVE.summary[done] = p;
    LIVE.finished.add(done);
    if (!live) LIVE.past.add(done);
  }
  if (
    ev.type.startsWith("pi.") &&
    LIVE.stop?.consultationId &&
    (p.consultation_id as string) === LIVE.stop.consultationId
  ) {
    // A consultation the PI settles on its own (auto) closes the stop it opened.
    if (ev.type === "pi.decision" && LIVE.mode === "auto") closeStop();
  }
}

const CONSULT_PROMPT: Record<string, string> = {
  charter: "Approve the charter the run writes from",
  stage_outcome: "Accept the paper outline",
  draft_outcome: "Accept the first draft",
  close: "Close the run",
  failure: "Decide what happens after the failure",
};
/** A question as the person reads it: the engine's pointer to the files it reads ("Read StoryPlan.json and …") is left
 * out, since the sheet shows those objects. */
const askText = (question: string) => question.replace(/\s*Read\s[^\n]*?\.(?:json|md)\.?\s*$/, "").trim();
function splitPrompt(prompt: string) {
  const [ask, ...rest] = prompt.split(/\n\nWhy the agent is unsure: /);
  return { prompt: askText(ask), why: rest.join(" ").trim() };
}
function checkpointOf(step: string, prompt: string) {
  if (step.startsWith("draft_") && /^Which writing/i.test(prompt)) return `S:${step.slice("draft_".length)}`;
  if (step === "draft" && /^Which title/i.test(prompt)) return "S:front";
  if (step === "frame") return "F";
  if (step === "journal") return "J";
  if (step === "evaluate") return "P1";
  if (step === "outline") return /story/i.test(prompt) ? "P2" : "P3";
  if (step === "contracts") return /sentence/i.test(prompt) ? "P5" : "P4";
  return undefined;
}

/** What a model call is doing, in one line for the narration. */
export function callLine(label: string, agent: string | null) {
  const who = agent ? `The ${agent}` : "The model";
  // A section's name is a heading and keeps its capital; the writer's role is a common noun.
  const writer = who.replace(/^The Section writer/, "The section writer");
  const round = /round (\d+)/i.exec(label)?.[1];
  if (/^Data report/i.test(label)) return `${who} lays the record into the standard frame, field by field.`;
  if (/^Statements/i.test(label))
    return `${who} finds every scientific statement in the report and labels it on the fourth axis.`;
  if (/critique$/i.test(label))
    return `${who} asks the critical questions of each claim's scheme and grounds every challenge.`;
  if (/^Replies/i.test(label))
    return `${who} answers every open challenge from the record${round ? `, round ${round}` : ""}.`;
  if (/^Rulings/i.test(label))
    return `${who} rules on every exchange: answered, conceded, upheld or struck${round ? `, round ${round}` : ""}.`;
  if (/^Toulmin/i.test(label)) return `${who} draws each claim in six parts from the debate record.`;
  if (/^Claim wording/i.test(label))
    return "The claims are worded for the lock, each at the strength the record allows.";
  if (/^Story, option/i.test(label)) return `${who} plans another story to compare with the first.`;
  if (/^Story/i.test(label)) return `${who} plans the paper's story: its main point, its problem and its reasons.`;
  if (/^Outline/i.test(label)) return `${who} lays out the sections and what each one carries.`;
  if (/^Comparison plan/i.test(label)) return `${who} plans how each finding compares with the prior studies.`;
  if (/^Paragraph plan: (.+), option/i.test(label))
    return `${who} plans another version of the ${/^Paragraph plan: (.+), option/i.exec(label)?.[1]} to compare.`;
  if (/^Paragraph plan: /i.test(label))
    return `${who} plans each paragraph of the ${label.replace(/^Paragraph plan: /i, "")}: its job, its point and its sentences.`;
  if (/^Editor/i.test(label)) return `${who} reads the plan as an editor would${round ? `, round ${round}` : ""}.`;
  const fix = /^(.+), fixing its hard rules \((\d+)\)$/.exec(label);
  if (fix)
    return `${writer} rewrites the ${fix[1]} where it breaks a hard rule and keeps the rest, round ${fix[2]} of 2.`;
  const section = /^(.+), (as planned|with your note|option ([A-Z]))$/.exec(label);
  if (section && !/^Title and abstract/.test(label)) {
    const name = section[1];
    if (section[3])
      return `${writer} writes the ${name} another way, option ${section[3]}, from the same paragraph plans.`;
    if (section[2] === "with your note") return `${writer} writes the ${name} again, following your note.`;
    return `${writer} writes the ${name} sentence by sentence from its paragraph plans.`;
  }
  if (/^Title and abstract, option/.test(label))
    return `${who} writes another title and abstract to compare, from the finished sections.`;
  if (/^Title and abstract/.test(label))
    return `${who} writes the title, abstract and keywords from the finished sections.`;
  if (/^Verifier, batch \d+: does each/.test(label))
    return `${who} reads each sentence against its premises alone: does everything it says follow?`;
  if (/^Verifier, batch \d+: what/.test(label))
    return `${who} lists every claim each sentence makes, to match against what it may claim.`;
  return `${who}: ${label}.`;
}

/* ---------- stops ---------- */
function openStop(stop: LiveStop) {
  LIVE.stop = stop;
  S.gate = { id: stop.id };
  S.sheetMin = false;
  S.lifecycle = "waiting";
  if (S.st[stop.stage]) S.st[stop.stage].cur = stop.id;
  log("or", `Stopped for you: ${stop.prompt}`);
  if (stop.why) tell("or", stop.why);
}
function closeStop(note?: string) {
  const stop = LIVE.stop;
  if (!stop) return;
  LIVE.stop = null;
  if (S.gate?.id === stop.id) S.gate = null;
  S.lifecycle = LIVE.failed ? "failed" : "running";
  const st = S.st[stop.stage];
  if (st) {
    st.done = st.done.filter((x) => x !== stop.id).concat(stop.id);
    if (st.cur === stop.id) st.cur = null;
  }
  if (note) log("or", note);
  // The reason the run stopped no longer holds once it goes on: say so, so the stop's reason does not stand as what is
  // happening now while the next step has not spoken yet.
  tell("or", note ?? "Answered; the run goes on.");
}
async function loadCharter(stop: LiveStop) {
  try {
    const { data } = await fetchRuns.getConsultations(LIVE.projectId, LIVE.runId);
    const c = data.find((x) => x.id === stop.consultationId);
    if (LIVE.stop !== stop) return;
    stop.charter = c?.result?.decision?.charter ?? null;
    changed();
  } catch {
    /* the charter shows once it can be read */
  }
}

const showError = (error: unknown) =>
  toast.error(
    error instanceof ApiError || error instanceof Error ? error.message : "Something went wrong. Please try again.",
  );

/** Answers the stop the run waits at. The stop closes when the run says it took the answer. */
export async function answerStop(answer: StageGateAnswer | { action: "endorse"; note?: string }) {
  const stop = LIVE.stop;
  if (!stop || stop.sending) return false;
  stop.sending = true;
  emit();
  try {
    if (answer.action === "endorse") {
      if (!stop.consultationId) throw new Error("This stop has no decision of the PI to take.");
      await fetchRuns.endorseConsultation(LIVE.projectId, LIVE.runId, stop.consultationId, answer.note);
      // The stop closes on the answer; the decision the run records closes it again on reopening.
      if (LIVE.stop === stop) closeStop();
    } else {
      if (!stop.stageRunId) throw new Error("The stage of this stop is not known yet. Try again in a moment.");
      await fetchRuns.answerStageGate(LIVE.projectId, LIVE.runId, stop.stageRunId, stop.id, answer);
    }
    if (answer.action === "endorse")
      note(stop.prompt, "Took the PI's recommendation.", "you", stop.stage, LIVE.lastSeq, true);
    return true;
  } catch (error) {
    showError(error);
    return false;
  } finally {
    stop.sending = false;
    emit();
  }
}
/* ---------- following a run ---------- */
let stopStream: (() => void) | null = null;
const queue: { ev: Ev; live: boolean }[] = [];
let frame = 0;
function flush() {
  frame = 0;
  for (const { ev, live } of queue.splice(0)) fold(ev, live && ev.seq > LIVE.historyEnd);
  if (LIVE.lastSeq >= LIVE.historyEnd) LIVE.caughtUp = true;
  changed();
}

/** Starts following a run: its stored events first, then the live stream while it is active. */
export function follow(projectId: string, run: RunItem) {
  stopStream?.();
  read.clear();
  LIVE = fresh();
  LIVE.on = true;
  LIVE.projectId = projectId;
  LIVE.runId = run.id;
  LIVE.label = run.label ?? `RUN-${run.id.slice(0, 4).toUpperCase()}`;
  LIVE.topic = run.case?.problem?.text ?? run.title ?? "";
  LIVE.mode = (run.review_mode ?? run.interaction_mode) === "auto" ? "auto" : "light";
  LIVE.draft = isDraftRun(run);
  LIVE.guided = isGuidedRun(run);
  setStages(LIVE.draft);
  LIVE.status = run.status;
  LIVE.historyEnd = run.last_seq ?? 0;
  const active = ["queued", "running", "awaiting_review", "paused"].includes(run.status);
  void readFiles();
  stopStream = subscribeRunEvents(
    projectId,
    run.id,
    { after: 0, live: active },
    {
      onEvents: (events, origin) => {
        for (const ev of events) queue.push({ ev: ev as unknown as Ev, live: origin === "live" });
        if (!frame) frame = requestAnimationFrame(flush);
      },
      onEnded: () => {
        LIVE.caughtUp = true;
        LIVE.reconnecting = false;
        changed();
      },
      onSessionEnded: () => window.dispatchEvent(new Event("auth:expired")),
      onError: (error) => {
        if (error instanceof ApiError && [403, 404].includes(error.status)) showError(error);
        else LIVE.reconnecting = true;
        changed();
      },
    },
  );
}
/** Stops following: the screens go back to the writing preview. */
export function unfollow() {
  stopStream?.();
  stopStream = null;
  LIVE = fresh();
}
