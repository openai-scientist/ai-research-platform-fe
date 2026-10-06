import { type Draft, produce } from "immer";

import type { RunEvent, RunStage } from "./contract";
import { emptyContent, initialRunState, type RunState, type StageContent } from "./run-state";

type ContentOf<S extends RunStage> = Extract<StageContent, { stage: S }>;

function content<S extends RunStage>(state: Draft<RunState>, event: RunEvent, stage: S): Draft<ContentOf<S>> | null {
  const key = event.stage_key ?? state.currentStageKey;
  const found = key ? state.stages[key] : undefined;
  if (!found || found.content.stage !== stage) return null;
  return found.content as Draft<ContentOf<S>>;
}

function pushFeed(
  state: Draft<RunState>,
  event: RunEvent,
  text: string,
  kind: "event" | "decision",
  actor = event.actor,
) {
  state.feed.push({ seq: event.seq, actor: actor ?? "code", text, kind });
}

/** Folds one event into the run state. Events at or below the last applied `seq` are ignored, so replays are safe. */
export function applyRunEvent(previous: RunState, event: RunEvent): RunState {
  if (event.seq <= previous.lastSeq) return previous;
  return produce(previous, (state) => {
    state.lastSeq = event.seq;
    switch (event.type) {
      case "run.started":
        state.mode = event.payload.mode;
        state.topic = event.payload.topic;
        state.domains = event.payload.domains;
        state.dataset = event.payload.dataset;
        state.startedAt = event.ts;
        state.lifecycle = "running";
        break;
      case "run.plan":
        state.plan = event.payload.stages;
        break;
      case "run.status":
        state.lifecycle = event.payload.status;
        if (event.payload.status === "failed") state.failure = event.payload.reason;
        break;
      case "run.completed":
        state.completed = true;
        state.lifecycle = "completed";
        state.paperTitle = event.payload.paper_title;
        // Only a run that ends with a paper has the paper screen to land on.
        if (event.payload.paper_title) state.currentStageKey = "done";
        break;
      case "stage.started": {
        const { plan } = event.payload;
        if (!state.stages[plan.key]) state.stageOrder.push(plan.key);
        state.stages[plan.key] = {
          plan,
          status: "active",
          currentStepId: null,
          doneStepIds: [],
          skills: [],
          content: emptyContent(plan),
        };
        state.currentStageKey = plan.key;
        break;
      }
      case "stage.completed": {
        const stage = event.stage_key ? state.stages[event.stage_key] : undefined;
        if (!stage) break;
        stage.status = "done";
        stage.currentStepId = null;
        stage.summary = event.payload.summary;
        break;
      }
      case "step.started": {
        const stage = event.stage_key ? state.stages[event.stage_key] : undefined;
        if (stage) stage.currentStepId = event.payload.step_id;
        // Narration belongs to a step; a new step starts with none.
        if (state.message?.done) state.message = null;
        break;
      }
      case "step.completed": {
        const stage = event.stage_key ? state.stages[event.stage_key] : undefined;
        if (!stage) break;
        if (!stage.doneStepIds.includes(event.payload.step_id)) stage.doneStepIds.push(event.payload.step_id);
        if (stage.currentStepId === event.payload.step_id) stage.currentStepId = null;
        break;
      }
      case "agent.message": {
        const { message_id, delta, done } = event.payload;
        const actor = event.actor ?? "code";
        if (state.message?.id === message_id) state.message.text += delta;
        else state.message = { id: message_id, actor, text: delta, done: false };
        if (done) {
          state.message.done = true;
          state.feed.push({ seq: event.seq, actor, text: state.message.text, kind: "message" });
        }
        break;
      }
      case "rule.checked":
        state.rules[event.payload.rule] = event.payload.state;
        if (event.payload.state === "hit" && event.payload.detail)
          pushFeed(state, event, event.payload.detail, "event", "code");
        break;

      // ---------- data ----------
      case "data.sample": {
        const data = content(state, event, "data");
        if (!data) break;
        data.file = event.payload.file;
        data.columns = event.payload.columns;
        data.rows = event.payload.rows;
        data.totalRows = event.payload.total_rows;
        data.rowsNow = event.payload.total_rows;
        break;
      }
      case "data.column_profiled": {
        const data = content(state, event, "data");
        if (data) data.profiled[event.payload.column] = event.payload.clean_share;
        break;
      }
      case "data.issue_found": {
        const data = content(state, event, "data");
        if (data) data.issues.push(event.payload.issue);
        break;
      }
      case "data.issue_fixed": {
        const data = content(state, event, "data");
        if (!data) break;
        const { issue_id, fix, method, replacements, removed_rows } = event.payload;
        data.fixes[issue_id] = { fix, method };
        for (const cell of replacements) {
          const col = data.columns.findIndex((c) => c.name === cell.column);
          const from = data.rows[cell.row]?.[col] ?? "";
          data.replaced[`${cell.row}:${cell.column}`] = { from, to: cell.value };
        }
        for (const row of removed_rows) if (!data.removed.includes(row)) data.removed.push(row);
        break;
      }
      case "data.version_created": {
        const data = content(state, event, "data");
        if (!data) break;
        data.version = { ...event.payload };
        data.rowsNow = event.payload.rows;
        break;
      }

      case "skills.loaded": {
        const stage = event.stage_key ? state.stages[event.stage_key] : undefined;
        if (stage) stage.skills = event.payload.skills;
        break;
      }

      // ---------- scope ----------
      case "scope.profile": {
        const c = content(state, event, "scope");
        if (!c) break;
        c.domains = event.payload.domains;
        c.compute = event.payload.compute;
        break;
      }
      case "scope.goal": {
        const c = content(state, event, "scope");
        if (!c) break;
        const { field, label, value } = event.payload;
        const existing = c.goal.find((g) => g.field === field);
        if (existing) existing.value = value;
        else c.goal.push({ field, label, value });
        break;
      }
      case "scope.estimate":
        if (!state.estimates.some((e) => e.estimate.id === event.payload.estimate.id))
          state.estimates.push({ estimate: event.payload.estimate });
        break;
      case "scope.adjusted": {
        const c = content(state, event, "scope");
        if (!c) break;
        c.adjusted.push({ ...event.payload });
        const goal = c.goal.find((g) => g.field === event.payload.field);
        if (goal) goal.value = event.payload.to;
        break;
      }
      case "scope.approved": {
        const c = content(state, event, "scope");
        if (c) c.approved = { ...event.payload };
        break;
      }
      case "problem.subquestion": {
        const c = content(state, event, "scope");
        if (c) c.subQuestions.push(event.payload.sub_question);
        break;
      }
      case "problem.risk": {
        const c = content(state, event, "scope");
        if (c) c.risks.push(event.payload.risk);
        break;
      }
      case "topic.evaluated": {
        const c = content(state, event, "scope");
        if (c) c.evaluation = { ...event.payload };
        break;
      }

      // ---------- search ----------
      case "search.strategy": {
        const c = content(state, event, "search");
        if (c) c.strategies.push(event.payload.strategy);
        break;
      }
      case "search.query": {
        const c = content(state, event, "search");
        if (c) c.queries.push(event.payload.query);
        break;
      }
      case "search.sources": {
        const c = content(state, event, "search");
        if (!c) break;
        c.sources = event.payload.sources;
        c.delayMs = event.payload.delay_ms;
        break;
      }
      case "literature.request": {
        const c = content(state, event, "search");
        if (!c) break;
        c.cells[`${event.payload.query_id}:${event.payload.source_id}`] = null;
        c.requests += 1;
        break;
      }
      case "literature.batch": {
        const c = content(state, event, "search");
        if (c) c.cells[`${event.payload.query_id}:${event.payload.source_id}`] = event.payload.hits;
        break;
      }
      case "literature.merged": {
        const c = content(state, event, "search");
        if (c) c.merged.push({ ...event.payload });
        break;
      }
      case "literature.collected": {
        const c = content(state, event, "search");
        if (c) c.collected = { ...event.payload };
        break;
      }

      // ---------- screen ----------
      case "screen.criteria": {
        const c = content(state, event, "screen");
        if (!c) break;
        c.criteria = {
          rules: event.payload.rules,
          relevanceMin: event.payload.relevance_min,
          qualityMin: event.payload.quality_min,
        };
        break;
      }
      case "screen.scored": {
        const c = content(state, event, "screen");
        if (c) c.points.push(...event.payload.points);
        break;
      }
      case "screen.rejected": {
        const c = content(state, event, "screen");
        if (c) c.rejected.push(event.payload.paper);
        break;
      }
      case "screen.kept": {
        const c = content(state, event, "screen");
        if (c) c.kept.push(event.payload.paper);
        break;
      }

      // ---------- read ----------
      case "card.extracted": {
        const c = content(state, event, "read");
        if (c) c.cards.push(event.payload.card);
        break;
      }
      case "estimate.checked": {
        const entry = state.estimates.find((e) => e.estimate.id === event.payload.check.estimate_id);
        if (entry) entry.check = event.payload.check;
        break;
      }

      // ---------- synthesize ----------
      case "synthesis.cluster": {
        const c = content(state, event, "synthesize");
        if (c) c.clusters.push(event.payload.cluster);
        break;
      }
      case "synthesis.tension": {
        const c = content(state, event, "synthesize");
        if (c) c.tensions.push(event.payload.tension);
        break;
      }
      case "synthesis.gap": {
        const c = content(state, event, "synthesize");
        if (c) c.gaps.push(event.payload.gap);
        break;
      }
      case "synthesis.overview": {
        const c = content(state, event, "synthesize");
        if (c) c.overview = event.payload.text;
        break;
      }
      case "synthesis.ranked": {
        const c = content(state, event, "synthesize");
        if (c) c.ranking = event.payload.ranking;
        break;
      }

      // ---------- hypothesize ----------
      case "debate.turn": {
        const h = content(state, event, "hypothesize");
        if (h) h.turns.push(event.payload.turn);
        break;
      }
      case "hypothesis.drafted": {
        const h = content(state, event, "hypothesize");
        if (!h) break;
        const { hypothesis } = event.payload;
        if (!h.drafts[hypothesis.id]) h.order.push(hypothesis.id);
        h.drafts[hypothesis.id] = { hypothesis, selected: false };
        break;
      }
      case "hypothesis.checked": {
        const draft = content(state, event, "hypothesize")?.drafts[event.payload.hypothesis_id];
        if (!draft) break;
        draft.novelty = event.payload.novelty;
        draft.feasibility = event.payload.feasibility;
        break;
      }
      case "hypothesis.selected": {
        const draft = content(state, event, "hypothesize")?.drafts[event.payload.hypothesis_id];
        if (!draft) break;
        draft.selected = true;
        draft.overrideNote = event.payload.override_note;
        break;
      }
      case "idea.set_aside": {
        const h = content(state, event, "hypothesize");
        if (h)
          h.asides.push({
            id: event.payload.idea_id,
            statement: event.payload.statement,
            reason: event.payload.reason,
          });
        break;
      }

      // ---------- experiment ----------
      case "plan.locked": {
        const x = content(state, event, "experiment");
        if (!x) break;
        x.planId = event.payload.plan_id;
        x.plan = event.payload.hypotheses;
        x.design = event.payload.design;
        break;
      }
      case "experiment.hypotheses": {
        const x = content(state, event, "experiment");
        if (!x) break;
        x.hypotheses = event.payload.hypotheses;
        for (const h of event.payload.hypotheses) x.nodeOrder[h.id] ??= [];
        break;
      }
      case "node.created": {
        const x = content(state, event, "experiment");
        if (!x) break;
        const { node } = event.payload;
        x.nodes[node.id] = { ...node, code: [], logs: [], status: "writing" };
        x.nodeOrder[node.hypothesis_id] ??= [];
        x.nodeOrder[node.hypothesis_id].push(node.id);
        x.activeNodeId = node.id;
        break;
      }
      case "node.code": {
        const x = content(state, event, "experiment");
        const node = x?.nodes[event.payload.node_id];
        if (!x || !node) break;
        node.code = event.payload.lines;
        node.status = "ready";
        x.activeNodeId = node.id;
        break;
      }
      case "node.run_started": {
        const x = content(state, event, "experiment");
        const node = x?.nodes[event.payload.node_id];
        if (!x || !node) break;
        node.status = "running";
        node.logs = [];
        x.activeNodeId = node.id;
        break;
      }
      case "node.log": {
        const node = content(state, event, "experiment")?.nodes[event.payload.node_id];
        if (node) node.logs.push({ level: event.payload.level, text: event.payload.text });
        break;
      }
      case "node.finished": {
        const node = content(state, event, "experiment")?.nodes[event.payload.node_id];
        if (!node) break;
        node.status = event.payload.outcome;
        node.error = event.payload.error;
        break;
      }
      case "node.scored": {
        const x = content(state, event, "experiment");
        const node = x?.nodes[event.payload.node_id];
        if (!x || !node) break;
        node.score = event.payload.score;
        x.activeNodeId = node.id;
        break;
      }
      case "result.recorded": {
        const x = content(state, event, "experiment");
        const { result, best_node_id } = event.payload;
        state.results[result.key] = result;
        if (!x) break;
        x.results[result.hypothesis_id] = result;
        if (best_node_id && x.nodes[best_node_id]) x.nodes[best_node_id].best = true;
        break;
      }

      // ---------- interpret ----------
      case "evidence.row": {
        const i = content(state, event, "interpret");
        if (i) i.rows.push({ hypothesis: event.payload.hypothesis, result: event.payload.result });
        break;
      }
      case "verdict.written": {
        const row = content(state, event, "interpret")?.rows.find(
          (r) => r.hypothesis.id === event.payload.hypothesis_id,
        );
        if (!row) break;
        row.verdict = event.payload.verdict;
        row.reason = event.payload.reason;
        break;
      }
      case "verdict.checked": {
        const row = content(state, event, "interpret")?.rows.find(
          (r) => r.hypothesis.id === event.payload.hypothesis_id,
        );
        if (!row) break;
        row.checked = true;
        row.objection = event.payload.objection;
        if (event.payload.objection)
          pushFeed(state, event, `Objection on ${row.hypothesis.id}: ${event.payload.objection}`, "event", "skeptic");
        break;
      }
      case "decision.recommended": {
        const i = content(state, event, "interpret");
        if (!i) break;
        i.recommendation = {
          recommendation: event.payload.recommendation,
          rationale: event.payload.rationale,
          goBacksUsed: event.payload.go_backs_used,
          goBacksAllowed: event.payload.go_backs_allowed,
        };
        break;
      }
      case "decision.committed": {
        const i = content(state, event, "interpret");
        if (i) i.decision = { ...event.payload };
        if (event.payload.by === "pi") {
          const item = {
            seq: event.seq,
            actor: "pi" as const,
            text: decisionText(event.payload.decision),
            kind: "decision" as const,
            stageKey: event.stage_key,
          };
          state.decisions.push(item);
          state.feed.push(item);
        }
        break;
      }

      // ---------- report ----------
      case "report.row": {
        const r = content(state, event, "report");
        if (r) r.rows.push(event.payload.row);
        break;
      }
      case "report.figure": {
        const r = content(state, event, "report");
        if (r) r.figures.push(event.payload.figure);
        break;
      }
      case "report.note": {
        const r = content(state, event, "report");
        if (r) r.notes[event.payload.hypothesis_id] = { note: event.payload.note, objection: event.payload.objection };
        break;
      }
      case "report.repro": {
        const r = content(state, event, "report");
        if (r) r.repro = event.payload.items;
        break;
      }

      // ---------- write ----------
      case "paper.outline": {
        const w = content(state, event, "write");
        if (!w) break;
        w.title = event.payload.title;
        w.authors = event.payload.authors;
        w.sections = event.payload.sections;
        w.sources = event.payload.sources;
        for (const s of event.payload.sections) {
          w.sectionStatus[s.id] = "planned";
          w.blocks[s.id] = [];
        }
        break;
      }
      case "paper.section_started": {
        const w = content(state, event, "write");
        if (w) w.sectionStatus[event.payload.section_id] = "writing";
        break;
      }
      case "paper.block": {
        const w = content(state, event, "write");
        if (!w) break;
        w.blocks[event.payload.section_id] ??= [];
        const { block } = event.payload;
        w.blocks[event.payload.section_id].push(block);
        w.pieces[block.id] = [];
        if (block.kind === "figure")
          w.sourcesUsed[`figure:${block.figure}`] = (w.sourcesUsed[`figure:${block.figure}`] ?? 0) + 1;
        if (block.kind === "table") w.sourcesUsed["table:1"] = (w.sourcesUsed["table:1"] ?? 0) + 1;
        break;
      }
      case "paper.delta": {
        const w = content(state, event, "write");
        if (!w) break;
        w.pieces[event.payload.block_id] ??= [];
        const list = w.pieces[event.payload.block_id];
        const { piece } = event.payload;
        const last = list[list.length - 1];
        // Consecutive text deltas merge so long paragraphs stay a handful of pieces.
        if (piece.kind === "text" && last?.kind === "text") last.text += piece.text;
        else list.push(piece);
        if (piece.kind === "number") w.sourcesUsed[piece.source] = (w.sourcesUsed[piece.source] ?? 0) + 1;
        if (piece.kind === "cite")
          for (const ref of piece.refs) w.sourcesUsed[`ref:${ref}`] = (w.sourcesUsed[`ref:${ref}`] ?? 0) + 1;
        break;
      }
      case "paper.section_done": {
        const w = content(state, event, "write");
        if (w) w.sectionStatus[event.payload.section_id] = "done";
        break;
      }
      case "paper.checked": {
        const w = content(state, event, "write");
        if (w) w.checked = { ...event.payload };
        break;
      }
      case "paper.blocked": {
        const w = content(state, event, "write");
        if (w) w.blocked = { spanId: event.payload.span_id, text: event.payload.text };
        break;
      }
      case "paper.number_fixed": {
        const w = content(state, event, "write");
        if (!w) break;
        w.fixedNumbers[event.payload.span_id] = { value: event.payload.value, source: event.payload.source };
        w.sourcesUsed[event.payload.source] = (w.sourcesUsed[event.payload.source] ?? 0) + 1;
        break;
      }
      case "review.comment": {
        const w = content(state, event, "write");
        if (!w) break;
        w.comments.push({ id: event.payload.comment_id, spanId: event.payload.span_id, text: event.payload.text });
        pushFeed(state, event, `Comment: ${event.payload.text}`, "event", "skeptic");
        break;
      }
      case "review.revision": {
        const comment = content(state, event, "write")?.comments.find((c) => c.id === event.payload.comment_id);
        if (comment)
          comment.revision = { spanId: event.payload.span_id, from: event.payload.from, to: event.payload.to };
        break;
      }
      case "review.accepted": {
        const w = content(state, event, "write");
        if (w) w.accepted = true;
        break;
      }
      case "draft.scored": {
        const w = content(state, event, "write");
        if (!w) break;
        if (event.payload.best) for (const d of w.drafts) d.best = false;
        const existing = w.drafts.find((d) => d.draft === event.payload.draft);
        if (existing) Object.assign(existing, event.payload);
        else w.drafts.push({ ...event.payload });
        break;
      }
      case "paper.typeset": {
        const w = content(state, event, "write");
        if (w) w.typeset = true;
        break;
      }

      // ---------- review stops ----------
      case "gate.opened":
        state.gate = event.payload.gate;
        break;
      case "gate.resolved": {
        const kind = state.gate?.id === event.payload.gate_id ? state.gate.kind : null;
        if (kind) state.gate = null;
        const item = {
          seq: event.seq,
          actor: "you" as const,
          text: event.payload.summary,
          kind: "decision" as const,
          stageKey: event.stage_key,
          note: event.payload.answer.note,
        };
        state.decisions.push(item);
        state.feed.push(item);
        const dropped = event.payload.answer.dropped;
        if (!dropped?.length) break;
        if (kind === "screen") {
          const c = content(state, event, "screen");
          if (c) c.dropped = dropped;
        } else {
          const h = content(state, event, "hypothesize");
          if (h) h.dropped = dropped;
        }
        break;
      }
    }
  });
}

export function decisionText(decision: "proceed" | "refine" | "pivot") {
  if (decision === "proceed") return "Decided to write it up.";
  if (decision === "refine") return "Decided to rerun the experiments.";
  return "Decided to try new hypotheses.";
}

export function replayRunEvents(runId: string, events: readonly RunEvent[]): RunState {
  return events.reduce(applyRunEvent, initialRunState(runId));
}
