// A stand-in for the stages Popper does not run yet: experiment, interpret, report and write. It plays the
// example study from a set of hypotheses, waits at review stops and branches on the answers, emitting only
// events defined in the contract. Stages 1 to 9 (scope to map) always come from a real run.

import type {
  AgentRole,
  CodeLine,
  Decision,
  Figure,
  Gate,
  GateAnswer,
  GateKind,
  GateOption,
  Hypothesis,
  LogLevel,
  PlannedStage,
  ReportRow,
  ReviewMode,
  RoundKind,
  RunCommands,
  RunEvent,
  RunEventOf,
  RunEventType,
  RunInput,
  Skill,
  StagePlan,
  StagePlanStep,
} from "../contract";
import { SHOW_DATA_STAGE } from "../features";
import { buildPaper, COMMENTS, type FinalResult, REVISIONS, TYPED_NUMBER } from "./paper-script";
import {
  CODE,
  COLUMNS,
  DATASET,
  DIFF,
  DOMAINS,
  designFor,
  EXPERIMENT_SKILLS,
  HYPOTHESES,
  ISSUES,
  type MockNode,
  type MockResult,
  RESULTS,
  ROUND_SETS,
  SAMPLE_TOPIC,
  SLEEP_BARS,
  sampleRows,
  TREES,
} from "./scenario";

class Stopped extends Error {}

/** The stops of the stages played here; the stops up to the hypotheses belong to the real run. */
const MODE_GATES: Record<ReviewMode, GateKind[]> = {
  auto: [],
  light: ["publish"],
  copilot: ["decision", "publish"],
  full: ["decision", "report", "publish"],
};

const MODE_LABEL: Record<ReviewMode, string> = { auto: "Auto", light: "Light", copilot: "Copilot", full: "Full" };

const DECISION_LABEL: Record<Decision, string> = {
  proceed: "Write it up",
  refine: "Rerun the experiments",
  pivot: "Try new hypotheses",
};

const DECISION_WHY: Record<Decision, string> = {
  pivot:
    "The stress question stays unclear and more of the same won't settle it. Better to test what else could explain the sleep effect: study time, and a check by gender.",
  refine: "Rerun the same hypotheses with a deeper search. Useful if the analysis, not the idea, was the problem.",
  proceed: "The main question has a clear answer, and the open ones won't settle with this data. Time to write it up.",
};

interface Round {
  n: number;
  kind: RoundKind;
}

interface StepSpec extends StagePlanStep {
  say: string | (() => string);
  run: () => Promise<void>;
}

interface StageSpec {
  plan: Omit<StagePlan, "steps" | "has_gate">;
  steps: StepSpec[];
  summary: () => string;
  skills?: Skill[];
}

interface Recorded {
  key: string;
  hypothesis_id: string;
  round: number;
  result: MockResult;
}

export class MockRun implements RunCommands {
  private seq = 0;
  private alive = true;
  private paused = false;
  private speed = 1;
  private rounds: Round[] = [{ n: 1, kind: "first" }];
  private sets: Record<number, string[]> = {};
  private dropped: Record<number, string[]> = {};
  private recorded: Recorded[] = [];
  private stageKey: string | undefined;
  private stopsOpened = 0;
  private messages = 0;
  private pendingGate: { id: string; resolve: (answer: GateAnswer) => void } | null = null;
  private bestDraft = 3;

  constructor(
    readonly runId: string,
    readonly mode: ReviewMode,
    private readonly emit: (event: RunEvent) => void,
    private readonly input: RunInput = { topic: SAMPLE_TOPIC, domains: DOMAINS },
    private readonly options: { withData: boolean } = { withData: SHOW_DATA_STAGE },
  ) {}

  private get withData() {
    return this.options.withData;
  }

  start() {
    void this.main();
  }

  dispose() {
    this.alive = false;
  }

  setSpeed(speed: number) {
    this.speed = speed;
  }

  pause() {
    if (this.paused) return;
    this.paused = true;
    this.send("run.status", { status: "paused" });
  }

  resume() {
    if (!this.paused) return;
    this.paused = false;
    this.send("run.status", { status: this.pendingGate ? "awaiting_review" : "running" });
  }

  answerGate(gateId: string, answer: GateAnswer) {
    if (this.pendingGate?.id === gateId) this.pendingGate.resolve(answer);
  }

  // ---------- plumbing ----------

  private send<T extends RunEventType>(type: T, payload: RunEventOf<T>["payload"], actor?: AgentRole) {
    this.seq += 1;
    const event = {
      seq: this.seq,
      run_id: this.runId,
      ts: new Date().toISOString(),
      type,
      stage_key: this.stageKey,
      actor,
      payload,
    } as unknown as RunEvent;
    this.emit(event);
  }

  private wait(ms: number) {
    return new Promise<void>((resolve, reject) => {
      let left = ms;
      let last = performance.now();
      const tick = () => {
        if (!this.alive) return reject(new Stopped());
        const now = performance.now();
        if (!this.paused) left -= (now - last) * this.speed;
        last = now;
        if (left <= 0 && !this.paused) resolve();
        else setTimeout(tick, 25);
      };
      setTimeout(tick, Math.min(25, ms));
    });
  }

  private async say(actor: AgentRole, text: string) {
    if (!text) return;
    const id = `m${++this.messages}`;
    const words = text.split(/(?<= )/);
    for (let i = 0; i < words.length; i += 2) {
      const done = i + 2 >= words.length;
      this.send(
        "agent.message",
        { message_id: id, delta: words.slice(i, i + 2).join(""), ...(done ? { done } : {}) },
        actor,
      );
      await this.wait(45);
    }
  }

  private gateOn(kind: GateKind) {
    return MODE_GATES[this.mode].includes(kind);
  }

  private planned(): PlannedStage[] {
    const stages: PlannedStage[] = this.withData
      ? [{ key: "data", stage: "data", title: "Check the data", has_gate: false }]
      : [];
    for (const r of this.rounds) {
      stages.push({
        key: `r${r.n}-experiment`,
        stage: "experiment",
        round: r.n,
        round_kind: r.kind,
        title: "Experiment",
        has_gate: false,
      });
      stages.push({
        key: `r${r.n}-interpret`,
        stage: "interpret",
        round: r.n,
        round_kind: r.kind,
        title: "Interpret",
        has_gate: this.gateOn("decision"),
      });
    }
    stages.push(
      { key: "report", stage: "report", title: "Build the report", has_gate: this.gateOn("report") },
      { key: "write", stage: "write", title: "Write the paper", has_gate: this.gateOn("publish") },
    );
    return stages;
  }

  private async gate(
    kind: GateKind,
    spec: {
      title: string;
      why: string;
      summary: string[];
      options: GateOption[];
      droppable?: string[];
      keepable?: string[];
    },
    summarize: (answer: GateAnswer) => string,
  ): Promise<GateAnswer> {
    this.stopsOpened += 1;
    const total = this.planned().filter((s) => s.has_gate).length + this.extraStops;
    const gate: Gate = {
      id: `gate-${this.stopsOpened}`,
      kind,
      stop_index: this.stopsOpened,
      stop_total: Math.max(total, this.stopsOpened),
      ...spec,
    };
    this.send("run.status", { status: "awaiting_review" });
    this.send("gate.opened", { gate });
    const answer = await new Promise<GateAnswer>((resolve) => {
      this.pendingGate = { id: gate.id, resolve };
    });
    this.pendingGate = null;
    if (!this.alive) throw new Stopped();
    this.send("gate.resolved", { gate_id: gate.id, answer, summary: summarize(answer) });
    this.send("run.status", { status: this.paused ? "paused" : "running" });
    return answer;
  }

  /** Publish stops repeated after a requested revision are not in the plan; they count on top. */
  private extraStops = 0;

  private async runStage(spec: StageSpec) {
    const steps: StagePlanStep[] = spec.steps.map(({ say: _say, run: _run, ...step }) => step);
    const plan: StagePlan = { ...spec.plan, steps, has_gate: steps.some((s) => s.gate) };
    this.stageKey = plan.key;
    this.send("stage.started", { plan });
    if (spec.skills) this.send("skills.loaded", { skills: spec.skills });
    await this.wait(700);
    for (const step of spec.steps) {
      this.send("step.started", { step_id: step.id });
      const text = typeof step.say === "function" ? step.say() : step.say;
      if (step.gate) {
        await this.say(step.actor, text);
        await step.run();
      } else {
        await step.run();
        await this.say(step.actor, text);
      }
      this.send("step.completed", { step_id: step.id });
      await this.wait(700);
    }
    this.send("stage.completed", { summary: spec.summary() });
    await this.wait(1200);
  }

  private async main() {
    try {
      this.send("run.started", {
        mode: this.mode,
        topic: this.input.topic,
        domains: this.input.domains,
        ...(this.withData ? { dataset: { ...DATASET } } : {}),
      });
      this.send("run.plan", { stages: this.planned() });
      await this.wait(500);
      if (this.withData) await this.runStage(this.dataStage());
      for (let i = 0; i < this.rounds.length; i++) {
        const round = this.rounds[i];
        // A first or pivot round tests the example set; a refine round reruns the one before.
        if (round.kind !== "refine") this.sets[round.n] = [...ROUND_SETS[round.kind]];
        await this.runStage(this.experimentStage(round));
        await this.runStage(this.interpretStage(round));
      }
      await this.runStage(this.reportStage());
      await this.runStage(this.writeStage());
      this.stageKey = undefined;
      this.send("run.completed", { paper_title: this.paper().title });
    } catch (error) {
      if (!(error instanceof Stopped)) throw error;
    }
  }

  // ---------- data ----------

  private dataStage(): StageSpec {
    return {
      plan: {
        key: "data",
        stage: "data",
        title: "Check the data",
        purpose:
          "The Steward reads your file, fixes what is broken, and saves the result as a new version. Your original file is never changed.",
        cast: ["steward"],
      },
      summary: () => "5 problems fixed · saved as v2 with 1,230 rows",
      steps: [
        {
          id: "profile",
          title: "Profile every column",
          actor: "steward",
          explain: "Works out what each column holds, its unit, and how clean it looks. Nothing is changed yet.",
          say: "1,240 students, 8 columns. Most columns look clean; four need a closer look.",
          run: async () => {
            this.send(
              "data.sample",
              {
                file: DATASET.name,
                columns: COLUMNS.map(({ cleanShare: _c, ...c }) => c),
                rows: sampleRows(),
                total_rows: DATASET.rows,
              },
              "steward",
            );
            await this.wait(600);
            for (const column of COLUMNS) {
              await this.wait(260);
              this.send("data.column_profiled", { column: column.name, clean_share: column.cleanShare }, "steward");
            }
          },
        },
        {
          id: "find",
          title: "Find problems",
          actor: "steward",
          explain:
            "Looks for missing values, duplicates, impossible values and messy labels. Click a problem to jump to it in the table.",
          say: "Five problems. None changes your question, but each would skew the results if left alone.",
          run: async () => {
            for (const { fix: _f, method: _m, replacements: _r, ...issue } of ISSUES) {
              await this.wait(650);
              this.send("data.issue_found", { issue }, "steward");
            }
          },
        },
        {
          id: "clean",
          title: "Save a cleaned copy",
          actor: "steward",
          explain:
            "Applies the fixes to a copy. v1 stays exactly as you uploaded it; the cleaned data becomes v2, with a record of every change.",
          say: "Saved as v2 with 1,230 students. v1 is untouched, so anyone can check what I changed.",
          run: async () => {
            for (const issue of ISSUES) {
              await this.wait(750);
              this.send(
                "data.issue_fixed",
                {
                  issue_id: issue.id,
                  fix: issue.fix,
                  method: issue.method,
                  replacements: issue.replacements,
                  removed_rows: issue.rows,
                },
                "steward",
              );
            }
            await this.wait(700);
            this.send(
              "data.version_created",
              { version: 2, rows: 1230, removed: 10, fixes: 5, sha256: "3f9c1e…a1d4" },
              "steward",
            );
            this.send("rule.checked", { rule: 3, state: "pass" });
            await this.wait(600);
          },
        },
      ],
    };
  }

  // ---------- experiment ----------

  private setFor(round: Round) {
    return (round.kind === "refine" ? this.sets[round.n - 1] : this.sets[round.n]) ?? [];
  }

  private attempt(round: Round) {
    return round.kind === "refine" ? 2 : 1;
  }

  private treeFor(h: string, round: Round): MockNode[] {
    const trees = TREES[h];
    return trees[Math.min(this.attempt(round), trees.length) - 1];
  }

  private resultFor(h: string, round: Round): MockResult {
    const results = RESULTS[h];
    return results[Math.min(this.attempt(round), results.length) - 1];
  }

  private nodeId(h: string, round: Round, index: number) {
    return `${h}-r${round.n}-v${index + 1}`;
  }

  private codeFor(h: string, round: Round, index: number): CodeLine[] {
    const nodes = this.treeFor(h, round);
    const chain: number[] = [];
    for (let j = index; j >= 0; j = nodes[j][6]) chain.unshift(j);
    const adds = chain.map((k) => DIFF[nodes[k][1]]).filter(Boolean);
    const base = CODE[h];
    return [
      ...base.slice(0, -1).map((text) => ({ text, added: false })),
      ...adds.map((text, k) => ({ text, added: k === adds.length - 1 })),
      { text: base[base.length - 1], added: false },
    ];
  }

  private logFor(h: string, node: MockNode): [LogLevel, string][] {
    const head: [LogLevel, string][] = [
      ["command", `$ python run.py --hypothesis ${h}`],
      ["info", "loaded student_wellbeing v2 · 1,230 rows · read-only"],
    ];
    if (node[2] === "buggy")
      return [
        ...head,
        ["error", "Traceback (most recent call last):"],
        ["error", '  File "run.py", line 3, in <module>'],
        ["error", node[5]],
      ];
    if (node[2] === "failed") return [...head, ["error", node[5]], ["error", "giving up on this branch"]];
    if (node[2] === "dropped")
      return [
        ...head,
        ["info", "fit ok · converged"],
        ["error", `rule 2: the plan expects ${HYPOTHESES[h].report_key} (${HYPOTHESES[h].estimand.toLowerCase()})`],
        ["error", "output does not match the plan · version discarded"],
      ];
    return [
      ...head,
      ["info", "fit ok · converged"],
      ["success", `wrote ${HYPOTHESES[h].report_key} · waiting for the Skeptic's score`],
    ];
  }

  private async buildNode(h: string, round: Round, index: number) {
    const node = this.treeFor(h, round)[index];
    this.send(
      "node.created",
      {
        node: {
          id: this.nodeId(h, round, index),
          hypothesis_id: h,
          version: index + 1,
          parent_id: node[6] >= 0 ? this.nodeId(h, round, node[6]) : null,
          kind: node[0],
          title: node[1],
        },
      },
      "methodologist",
    );
    const lines = this.codeFor(h, round, index);
    await this.wait(250 + lines.length * 120);
    this.send("node.code", { node_id: this.nodeId(h, round, index), lines }, "methodologist");
  }

  private async runNode(h: string, round: Round, index: number) {
    const node = this.treeFor(h, round)[index];
    const id = this.nodeId(h, round, index);
    this.send("node.run_started", { node_id: id }, "methodologist");
    for (const [level, text] of this.logFor(h, node)) {
      await this.wait(220);
      this.send("node.log", { node_id: id, level, text }, "methodologist");
    }
    await this.wait(400);
    const outcome =
      node[2] === "valid"
        ? "works"
        : node[2] === "dropped"
          ? "discarded"
          : node[2] === "failed"
            ? "out_of_attempts"
            : "crashed";
    this.send("node.finished", { node_id: id, outcome, ...(node[5] ? { error: node[5] } : {}) }, "methodologist");
    if (node[2] === "dropped") {
      this.send("rule.checked", { rule: 2, state: "hit", detail: `Rule 2 threw out ${h} v${index + 1}: ${node[5]}` });
      await this.wait(1500);
      this.send("rule.checked", { rule: 2, state: "pass" });
    }
  }

  private experimentStage(round: Round): StageSpec {
    const set = this.setFor(round);
    return {
      plan: {
        key: `r${round.n}-experiment`,
        stage: "experiment",
        round: round.n,
        round_kind: round.kind,
        title: round.kind === "refine" ? "Experiment again, more carefully" : "Experiment",
        purpose:
          "For each hypothesis the Methodologist writes analysis code, runs it in a sandbox, fixes what breaks and tries improvements. The Skeptic keeps the best version.",
        cast: ["methodologist", "skeptic"],
      },
      skills: EXPERIMENT_SKILLS,
      summary: () => {
        const ran = set.filter((h) => this.resultFor(h, round).estimate !== null).length;
        const dropped = set.reduce((a, h) => a + this.treeFor(h, round).filter((n) => n[2] === "dropped").length, 0);
        const crashed = set.length - ran;
        return `${ran} result${ran === 1 ? "" : "s"} saved to results.json${crashed ? ` · ${crashed} never ran` : ""}${dropped ? ` · ${dropped} version${dropped > 1 ? "s" : ""} thrown out by rule 2` : ""}`;
      },
      steps: [
        {
          id: "design",
          title: "Lock the test plan",
          actor: "methodologist",
          pipeline_stage: 9,
          artifact: "Test plan",
          explain:
            "Each hypothesis becomes variables: what changes, what is measured, what is held equal, and the number it must report. The plan is locked before any code runs.",
          say:
            round.kind === "refine"
              ? "Same set, same plan, locked again for the deeper search."
              : "Plan locked. Each test names its hypothesis, the number it must produce, and what would prove it wrong.",
          run: async () => {
            await this.wait(500 + set.length * 350);
            this.send(
              "plan.locked",
              { plan_id: `P${round.n}`, hypotheses: set.map((h) => HYPOTHESES[h]), design: designFor(set) },
              "methodologist",
            );
            this.send("rule.checked", { rule: 4, state: "pass" });
            await this.wait(900);
          },
        },
        {
          id: "draft",
          title: "Write a first version",
          actor: "methodologist",
          explain:
            "Each hypothesis gets its own search tree. The first version is its root; fixes and improvements branch off. The panel shows the code being written.",
          say: "A first version for every hypothesis in the plan.",
          run: async () => {
            this.send("experiment.hypotheses", { hypotheses: set.map((h) => HYPOTHESES[h]) }, "methodologist");
            for (const h of set) {
              await this.wait(500);
              await this.buildNode(h, round, 0);
            }
          },
        },
        {
          id: "run",
          title: "Run it in a sandbox",
          actor: "methodologist",
          explain:
            "Code runs with no internet and read-only data. Some first versions crash; that is normal and expected.",
          say: round.kind === "first" ? "Two versions crashed. I'll fix those next." : "All first versions ran.",
          run: async () => {
            for (const h of set) {
              await this.runNode(h, round, 0);
              await this.wait(300);
            }
          },
        },
        {
          id: "improve",
          title: "Fix and improve",
          actor: "methodologist",
          explain:
            "Crashed versions get a fix; working ones branch into improved variants. A version that doesn't report what the plan promised is thrown out by rule 2.",
          say: "Fixed what I could and tried improvements. Anything off-plan was thrown out.",
          run: async () => {
            for (const h of set) {
              const nodes = this.treeFor(h, round);
              for (let k = 1; k < nodes.length; k++) {
                await this.buildNode(h, round, k);
                await this.runNode(h, round, k);
                await this.wait(250);
              }
            }
          },
        },
        {
          id: "select",
          title: "Score and keep the best",
          actor: "skeptic",
          explain:
            "Every working version is scored. The best one per hypothesis writes its number into results.json, the only place the report and paper may quote from.",
          say: "Best versions picked. Their numbers are now in results.json.",
          run: async () => {
            for (const h of set) {
              const nodes = this.treeFor(h, round);
              for (const [k, node] of nodes.entries()) {
                if (node[2] !== "valid" || node[3] === null) continue;
                await this.wait(320);
                this.send("node.scored", { node_id: this.nodeId(h, round, k), score: node[3] }, "skeptic");
              }
              const best = nodes.findIndex((n) => n[4]);
              const result = this.resultFor(h, round);
              const key = `${HYPOTHESES[h].report_key}_r${round.n}`;
              await this.wait(600);
              this.recorded.push({ key, hypothesis_id: h, round: round.n, result });
              this.send(
                "result.recorded",
                {
                  result: {
                    key,
                    hypothesis_id: h,
                    round: round.n,
                    node_id: best >= 0 ? this.nodeId(h, round, best) : null,
                    estimate: result.estimate,
                    ci_low: result.ci_low,
                    ci_high: result.ci_high,
                  },
                  best_node_id: best >= 0 ? this.nodeId(h, round, best) : null,
                },
                "skeptic",
              );
            }
          },
        },
      ],
    };
  }

  // ---------- interpret ----------

  private piWants(round: Round): Decision {
    if (this.rounds.length > 2 || round.n > 1) return "proceed";
    return this.setFor(round).some((h) => this.resultFor(h, round).verdict === "insufficient") ? "pivot" : "proceed";
  }

  private commit(round: Round, decision: Decision) {
    this.rounds = this.rounds.filter((r) => r.n <= round.n);
    if (decision !== "proceed") this.rounds.push({ n: round.n + 1, kind: decision });
    this.send("run.plan", { stages: this.planned() });
  }

  private interpretStage(round: Round): StageSpec {
    const set = () => this.setFor(round);
    const want = () => this.piWants(round);
    return {
      plan: {
        key: `r${round.n}-interpret`,
        stage: "interpret",
        round: round.n,
        round_kind: round.kind,
        title: "Interpret",
        purpose:
          "Results become verdicts, the Skeptic double-checks them, and the PI decides whether to write it up or keep researching.",
        cast: ["interpreter", "skeptic", "pi"],
      },
      summary: () => {
        const counts = { supported: 0, not_supported: 0, insufficient: 0 };
        for (const h of set()) counts[this.resultFor(h, round).verdict]++;
        return `${counts.supported} supported · ${counts.not_supported} not supported · ${counts.insufficient} not enough evidence · next: ${DECISION_LABEL[this.decisionOf(round)].toLowerCase()}`;
      },
      steps: [
        {
          id: "collect",
          title: "Collect the evidence",
          actor: "code",
          explain:
            "Code, not AI, copies every result from results.json into one table. A test that crashed stays visibly different from a test that found nothing.",
          say: "One row per hypothesis, copied straight from results.json.",
          run: async () => {
            for (const h of set()) {
              await this.wait(550);
              const rec = this.recorded.find((r) => r.round === round.n && r.hypothesis_id === h);
              if (!rec) continue;
              this.send(
                "evidence.row",
                {
                  hypothesis: HYPOTHESES[h],
                  result: {
                    key: rec.key,
                    hypothesis_id: h,
                    round: round.n,
                    node_id: null,
                    estimate: rec.result.estimate,
                    ci_low: rec.result.ci_low,
                    ci_high: rec.result.ci_high,
                  },
                },
                "code",
              );
            }
          },
        },
        {
          id: "verdicts",
          title: "Write a verdict for each",
          actor: "interpreter",
          explain:
            "Each hypothesis gets one of three verdicts: supported, not supported, or not enough evidence. Every verdict points to its result.",
          say: "Verdicts written. Each one points to the result it is based on.",
          run: async () => {
            for (const h of set()) {
              await this.wait(650);
              const r = this.resultFor(h, round);
              this.send("verdict.written", { hypothesis_id: h, verdict: r.verdict, reason: r.reason }, "interpreter");
            }
          },
        },
        {
          id: "check",
          title: "Double-check the verdicts",
          actor: "skeptic",
          explain:
            "The Skeptic rereads the same table, and code checks every number quoted. Disagreements are kept on record, not hidden.",
          say:
            round.n > 1
              ? "I agree with the verdicts, with one flag on record."
              : "I disagree on one verdict. My objection goes on the record.",
          run: async () => {
            for (const h of set()) {
              await this.wait(550);
              const r = this.resultFor(h, round);
              this.send(
                "verdict.checked",
                { hypothesis_id: h, ...(r.objection ? { objection: r.objection } : {}) },
                "skeptic",
              );
            }
          },
        },
        {
          id: "decide",
          title: "Decide what's next",
          actor: "pi",
          explain:
            "Three paths: write it up, rerun the same experiments more carefully, or try new hypotheses. Going back is allowed at most twice per run.",
          say: () => `My recommendation: ${DECISION_LABEL[want()].toLowerCase()}. ${DECISION_WHY[want()]}`,
          run: async () => {
            this.send(
              "decision.recommended",
              {
                recommendation: want(),
                rationale: DECISION_WHY[want()],
                go_backs_used: this.rounds.length - 1,
                go_backs_allowed: 2,
              },
              "pi",
            );
            await this.wait(1400);
            if (!this.gateOn("decision")) {
              this.decisions[round.n] = want();
              this.send("decision.committed", { decision: want(), by: "pi" }, "pi");
              this.commit(round, want());
            }
          },
        },
        ...(this.gateOn("decision")
          ? [
              {
                id: "decision-gate",
                title: "Your call: what's next",
                actor: "pi" as const,
                gate: "decision" as const,
                explain:
                  "Approve the PI's recommendation or pick another path. The diagram shows where each option leads.",
                say: "That's my recommendation. You decide.",
                run: async () => {
                  const locked = this.rounds.length > 2 || round.n > 1;
                  const recommended = want();
                  const leads: Record<Decision, string> = {
                    proceed: "Report starts, then the paper",
                    refine: `Round ${round.n + 1}: Experiment again with the same set`,
                    pivot: `Round ${round.n + 1}: Hypothesize again, then test`,
                  };
                  const description: Record<Decision, string> = {
                    proceed: "Stop researching; build the report, then the paper.",
                    refine: "Same hypotheses, a more careful search.",
                    pivot: "Go back and test a new direction.",
                  };
                  const answer = await this.gate(
                    "decision",
                    {
                      title: "Decide what's next",
                      why: `In ${MODE_LABEL[this.mode]} mode the PI recommends and you decide whether the research continues.${locked ? " This example has data for two rounds, so writing it up comes next." : ""}`,
                      summary: [DECISION_WHY[recommended]],
                      options: (["proceed", "refine", "pivot"] as const).map((d) => ({
                        id: d,
                        label: DECISION_LABEL[d],
                        description: description[d],
                        leads_to: leads[d],
                        confirm_label: DECISION_LABEL[d],
                        recommended: d === recommended,
                        disabled: d !== "proceed" && locked,
                      })),
                    },
                    (a) => {
                      const d = a.option_id as Decision;
                      return d === recommended
                        ? `Approved: ${DECISION_LABEL[d].toLowerCase()}.`
                        : `Chose to ${DECISION_LABEL[d].toLowerCase()} instead of the PI's pick.`;
                    },
                  );
                  const decision =
                    (["proceed", "refine", "pivot"] as const).find((d) => d === answer.option_id) ?? "proceed";
                  this.decisions[round.n] = decision;
                  this.send(
                    "decision.committed",
                    { decision, by: "you", ...(answer.note ? { note: answer.note } : {}) },
                    "pi",
                  );
                  this.commit(round, decision);
                },
              },
            ]
          : []),
      ],
    };
  }

  private decisions: Record<number, Decision> = {};
  private decisionOf(round: Round): Decision {
    return this.decisions[round.n] ?? this.piWants(round);
  }

  // ---------- report ----------

  private finals(): Record<string, FinalResult> {
    const out: Record<string, FinalResult> = {};
    for (const r of this.recorded) {
      const { estimate, ci_low, ci_high } = r.result;
      if (estimate === null || ci_low === null || ci_high === null) continue;
      out[r.hypothesis_id] = { key: r.key, hypothesis_id: r.hypothesis_id, estimate, ci_low, ci_high };
    }
    return out;
  }

  private tested() {
    const all = new Set<string>();
    for (const set of Object.values(this.sets)) for (const h of set) all.add(h);
    return [...all].sort();
  }

  private reportRows(): ReportRow[] {
    const finals = this.finals();
    const rows: ReportRow[] = this.tested().map((h) => {
      const f = finals[h];
      const latest = [...this.recorded].reverse().find((r) => r.hypothesis_id === h);
      if (!f || !latest)
        return {
          hypothesis_id: h,
          statement: HYPOTHESES[h].statement,
          status: "crashed",
          verdict: "insufficient",
          result_key: latest?.key,
          round: latest?.round,
        };
      return {
        hypothesis_id: h,
        statement: HYPOTHESES[h].statement,
        status: "result",
        result_key: f.key,
        round: latest.round,
        estimate: f.estimate,
        ci_low: f.ci_low,
        ci_high: f.ci_high,
        verdict: latest.result.verdict,
      };
    });
    for (const h of Object.values(this.dropped).flat())
      rows.push({ hypothesis_id: h, statement: HYPOTHESES[h].statement, status: "dropped" });
    return rows;
  }

  private figures(): Figure[] {
    const finals = this.finals();
    const verdictOf = (h: string) =>
      [...this.recorded].reverse().find((r) => r.hypothesis_id === h)?.result.verdict ?? "insufficient";
    const rows = Object.values(finals).sort((a, b) => a.hypothesis_id.localeCompare(b.hypothesis_id));
    const sign = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(1)}`;
    return [
      {
        id: 1,
        title: "Exam score by nightly sleep",
        caption: "Mean exam score by nightly sleep in data v2 (n = 1,230).",
        data: {
          kind: "bars",
          y_label: "score",
          y_min: 50,
          y_max: 80,
          bars: SLEEP_BARS.map((b, i) => ({ ...b, highlight: i >= 3 })),
        },
      },
      {
        id: 2,
        title: "Estimated effects",
        caption: "Estimated effects with 95% ranges. Each row is one result in results.json; colour shows the verdict.",
        data: {
          kind: "forest",
          x_min: -4,
          x_max: 9,
          rows: rows.map((r) => ({
            hypothesis_id: r.hypothesis_id,
            label: HYPOTHESES[r.hypothesis_id].short,
            estimate: r.estimate,
            ci_low: r.ci_low,
            ci_high: r.ci_high,
            verdict: verdictOf(r.hypothesis_id),
          })),
        },
      },
      {
        id: 3,
        title: "How the sleep gap breaks down",
        caption: "How the sleep gap breaks down: the gap itself, and the parts that run through study time and stress.",
        data: {
          kind: "paths",
          exposure: "Sleep ≥ 7 h",
          outcome: "Exam score",
          direct: { label: finals.H1 ? `gap ${sign(finals.H1.estimate)}` : "not tested", tested: Boolean(finals.H1) },
          mediators: [
            {
              name: "Study hours",
              label: finals.H5 ? `+${Math.abs(finals.H5.estimate).toFixed(1)} of the gap` : "not tested",
              tested: Boolean(finals.H5),
              clear: Boolean(finals.H5),
            },
            {
              name: "Stress",
              label: finals.H2 ? `${sign(finals.H2.estimate)}, unclear` : "not tested",
              tested: Boolean(finals.H2),
              clear: false,
            },
          ],
        },
      },
    ];
  }

  private reportStage(): StageSpec {
    return {
      plan: {
        key: "report",
        stage: "report",
        title: "Build the report",
        purpose:
          "Code gathers every result into one report: all hypotheses, including crashes and drops, the figures, and how to reproduce it. The paper may only quote what is in here.",
        cast: ["code", "interpreter"],
      },
      summary: () => `${this.reportRows().length} hypotheses on record · 3 figures · reproducible`,
      steps: [
        {
          id: "collect",
          title: "Collect every result",
          actor: "code",
          explain:
            "Every hypothesis from every round goes in, including the ones that crashed and the ones you dropped. Nothing is chosen yet.",
          say: () =>
            `${this.tested().length} tested over ${this.rounds.length} round${this.rounds.length > 1 ? "s" : ""}, copied from results.json.`,
          run: async () => {
            for (const row of this.reportRows()) {
              await this.wait(450);
              this.send("report.row", { row }, "code");
            }
          },
        },
        {
          id: "figures",
          title: "Draw the figures",
          actor: "code",
          explain:
            "Figures are drawn by code straight from the results, so a chart can never disagree with the numbers.",
          say: "Three figures, drawn from the results.",
          run: async () => {
            for (const figure of this.figures()) {
              await this.wait(1200);
              this.send("report.figure", { figure }, "code");
            }
          },
        },
        {
          id: "notes",
          title: "Note what each result means",
          actor: "interpreter",
          explain: "One plain sentence per result, with its verdict and any objection still on record.",
          say: "Each result now says what it means, and what it doesn't.",
          run: async () => {
            for (const row of this.reportRows()) {
              await this.wait(500);
              const latest = [...this.recorded].reverse().find((r) => r.hypothesis_id === row.hypothesis_id);
              const note =
                row.status === "dropped"
                  ? "Not tested; you dropped it before any code ran."
                  : row.status === "crashed"
                    ? "The analysis never ran. That is not the same as finding no effect."
                    : (latest?.result.reason ?? "");
              this.send(
                "report.note",
                {
                  hypothesis_id: row.hypothesis_id,
                  note,
                  ...(latest?.result.objection && row.status === "result"
                    ? { objection: latest.result.objection }
                    : {}),
                },
                "interpreter",
              );
            }
          },
        },
        {
          id: "repro",
          title: "Record how to reproduce it",
          actor: "code",
          explain:
            "The data version, the locked plans, the exact code version kept for each result, and the environment.",
          say: "Anyone can rerun this from the record.",
          run: async () => {
            await this.wait(600);
            const plans = this.rounds.map((r) => `P${r.n} locked before round ${r.n} ran`);
            const kept = this.recorded
              .filter((r) => r.result.estimate !== null)
              .map((r) => {
                const nodes = this.treeFor(r.hypothesis_id, this.rounds.find((x) => x.n === r.round) ?? this.rounds[0]);
                const best = nodes.findIndex((n) => n[4]);
                return `${r.hypothesis_id} v${best + 1} “${nodes[best]?.[1] ?? ""}” · score ${(nodes[best]?.[3] ?? 0).toFixed(2)}`;
              });
            this.send(
              "report.repro",
              {
                items: [
                  { label: "Data", value: "student_wellbeing.csv v2 · sha256 3f9c1e…a1d4 · 1,230 rows" },
                  { label: "Plans", value: plans.join(" · ") },
                  { label: "Code kept", value: kept.join("\n") },
                  { label: "Sandbox", value: "No network · read-only data · 3 attempts per branch" },
                  { label: "Environment", value: "Python 3.12 · statsmodels 0.14 · pandas 2.2 · seed 2026" },
                ],
              },
              "code",
            );
          },
        },
        ...(this.gateOn("report")
          ? [
              {
                id: "report-gate",
                title: "Your check: the report",
                actor: "pi" as const,
                gate: "report" as const,
                explain: "Full mode stops here so you can confirm the record before the paper is written from it.",
                say: "This is the record the paper will be written from.",
                run: async () => {
                  await this.gate(
                    "report",
                    {
                      title: "Check the report",
                      why: "Full mode asks you to confirm the record before the paper is written from it.",
                      summary: [
                        `${this.reportRows().length} hypotheses listed, including crashes and drops`,
                        "3 figures drawn from results.json",
                        "Everything needed to rerun it is recorded",
                      ],
                      options: [
                        {
                          id: "ok",
                          label: "The report is right",
                          description: "The Reporter writes the paper from it.",
                          leads_to: "Write the paper starts",
                          confirm_label: "Continue",
                          recommended: true,
                        },
                        {
                          id: "note",
                          label: "Continue, with a note",
                          description: "Your note goes to the Reporter.",
                          leads_to: "Write the paper starts, with your note",
                          confirm_label: "Continue with note",
                        },
                      ],
                    },
                    () => "Confirmed the report.",
                  );
                },
              },
            ]
          : []),
      ],
    };
  }

  // ---------- write ----------

  private paperCache: ReturnType<typeof buildPaper> | null = null;
  private paper() {
    this.paperCache ??= buildPaper({
      runId: this.runId,
      finals: this.finals(),
      tested: this.tested(),
      rounds: this.rounds.length,
      reportRows: this.reportRows(),
    });
    return this.paperCache;
  }

  private async streamBlock(sectionId: string, block: ReturnType<typeof buildPaper>["blocks"][string][number]) {
    this.send("paper.block", { section_id: sectionId, block: block.block }, "reporter");
    if (block.block.kind !== "paragraph") {
      await this.wait(block.block.kind === "figure" ? 1300 : 700);
      return;
    }
    for (const piece of block.pieces) {
      if (piece.kind === "text") {
        for (let i = 0; i < piece.text.length; i += 6) {
          this.send(
            "paper.delta",
            { block_id: block.block.id, piece: { kind: "text", text: piece.text.slice(i, i + 6) } },
            "reporter",
          );
          await this.wait(28);
        }
      } else if (piece.kind === "span" || piece.kind === "typed_number") {
        this.send("paper.delta", { block_id: block.block.id, piece }, "reporter");
        await this.wait(40 + piece.text.length * 5);
      } else {
        this.send("paper.delta", { block_id: block.block.id, piece }, "reporter");
        await this.wait(piece.kind === "number" ? 650 : 220);
      }
    }
  }

  private writeStage(): StageSpec {
    return {
      plan: {
        key: "write",
        stage: "write",
        title: "Write the paper",
        purpose:
          "The Reporter turns the report into a paper. Numbers and figures are pulled from the report, never typed; code checks every one, and the Skeptic reviews in the margin.",
        cast: ["reporter", "skeptic"],
      },
      summary: () => `Draft ${this.bestDraft} kept · every number and figure traced to the report`,
      steps: [
        {
          id: "outline",
          title: "Plan the outline",
          actor: "reporter",
          explain: "The sections go down first, each with a note of what it will use from the report.",
          say: "Eight sections. The headline is H1; the rest says how much of it we can explain.",
          run: async () => {
            const paper = this.paper();
            await this.wait(500);
            this.send(
              "paper.outline",
              { title: paper.title, authors: paper.authors, sections: paper.sections, sources: paper.sources },
              "reporter",
            );
            await this.wait(400 + paper.sections.length * 320);
          },
        },
        {
          id: "write",
          title: "Write the sections",
          actor: "reporter",
          explain: "Text is written section by section. Each number and figure is pulled from the report, never typed.",
          say: "First draft done, with three figures and a table from the report.",
          run: async () => {
            const paper = this.paper();
            for (const section of paper.sections) {
              this.send("paper.section_started", { section_id: section.id }, "reporter");
              await this.wait(250);
              for (const block of paper.blocks[section.id]) await this.streamBlock(section.id, block);
              this.send("paper.section_done", { section_id: section.id }, "reporter");
              await this.wait(300);
            }
          },
        },
        {
          id: "check",
          title: "Check every number",
          actor: "code",
          explain:
            "Rule 1: every number and figure must trace to the report. A number typed by hand blocks publishing until it is replaced.",
          say: "One number was typed by hand. Publishing was blocked until it was replaced.",
          run: async () => {
            const paper = this.paper();
            const pieces = Object.values(paper.blocks)
              .flat()
              .flatMap((b) => b.pieces);
            const numbers = pieces.filter((p) => p.kind === "number").length;
            const figures = Object.values(paper.blocks)
              .flat()
              .filter((b) => b.block.kind === "figure" || b.block.kind === "table").length;
            await this.wait(400 + numbers * 120);
            this.send("paper.checked", { numbers, figures }, "code");
            const finals = this.finals();
            if (pieces.some((p) => p.kind === "typed_number") && finals.H1) {
              await this.wait(500);
              this.send("paper.blocked", { span_id: TYPED_NUMBER.span_id, text: TYPED_NUMBER.text }, "code");
              this.send("rule.checked", {
                rule: 1,
                state: "hit",
                detail: `Rule 1 blocked publishing: “${TYPED_NUMBER.text}” has no source in the report.`,
              });
              await this.wait(1600);
              this.send(
                "paper.number_fixed",
                {
                  span_id: TYPED_NUMBER.span_id,
                  value: Math.abs(finals.H1.estimate).toFixed(1),
                  source: `result:${finals.H1.key}`,
                },
                "reporter",
              );
              this.send("rule.checked", { rule: 1, state: "pass" });
            } else this.send("rule.checked", { rule: 1, state: "pass" });
          },
        },
        {
          id: "review",
          title: "Review and revise",
          actor: "skeptic",
          explain:
            "The Skeptic comments in the margin; the Reporter answers each with a tracked change. Each draft gets a score out of 10.",
          say: "Three comments, all resolved. The third draft scores 8.2.",
          run: async () => {
            this.send(
              "draft.scored",
              { draft: 1, score: 6.1, note: "Typed number fixed · 3 comments", best: false },
              "skeptic",
            );
            for (const c of COMMENTS) {
              await this.wait(1000);
              this.send("review.comment", { comment_id: c.id, span_id: c.span_id, text: c.text }, "skeptic");
            }
            for (const [i, c] of COMMENTS.entries()) {
              await this.wait(1400);
              const r = REVISIONS[c.revise];
              this.send("review.revision", { comment_id: c.id, span_id: c.revise, from: r.from, to: r.to }, "reporter");
              if (i === 1)
                this.send(
                  "draft.scored",
                  { draft: 2, score: 7.4, note: "Two comments resolved", best: false },
                  "skeptic",
                );
            }
            await this.wait(700);
            this.send(
              "draft.scored",
              { draft: 3, score: 8.2, note: "All comments resolved · kept", best: true },
              "skeptic",
            );
            await this.wait(700);
            this.send("review.accepted", {}, "reporter");
          },
        },
        {
          id: "typeset",
          title: "Typeset",
          actor: "code",
          explain:
            "The accepted draft is laid out as a paper: numbered sections, framed abstract, captioned figures and references.",
          say: "Typeset and ready for your approval.",
          run: async () => {
            await this.wait(600);
            this.send("paper.typeset", {}, "code");
            await this.wait(1600);
          },
        },
        ...(this.gateOn("publish")
          ? [
              {
                id: "publish-gate",
                title: "Your approval: publish",
                actor: "pi" as const,
                gate: "publish" as const,
                explain: "Last stop. Publish the paper to Findings, or send it back for one more revision.",
                say: "Ready to publish when you are.",
                run: async () => {
                  let revised = false;
                  for (;;) {
                    const answer = await this.gate(
                      "publish",
                      {
                        title: "Approve the paper",
                        why: `Nothing leaves the run without your approval in ${MODE_LABEL[this.mode]} mode.`,
                        summary: [
                          `Draft ${this.bestDraft} scored ${revised ? "8.4" : "8.2"} out of 10 from the Skeptic`,
                          "Every number and figure traces to the report",
                          `Appendix A lists all ${this.tested().length} hypotheses tested`,
                        ],
                        options: [
                          {
                            id: "publish",
                            label: "Publish",
                            description: "Save the paper to Findings in this project.",
                            leads_to: "The run ends; the paper appears in Findings",
                            confirm_label: "Publish the paper",
                            recommended: true,
                          },
                          {
                            id: "revise",
                            label: "Ask for one more revision",
                            description: revised
                              ? "Already revised once in this example."
                              : "The Reporter revises, the Skeptic scores it again, and Popper asks you again.",
                            leads_to: "One more draft, then this question again",
                            confirm_label: "Send it back",
                            disabled: revised,
                          },
                        ],
                      },
                      (a) => (a.option_id === "publish" ? "Approved publishing." : "Asked for one more revision."),
                    );
                    if (answer.option_id === "publish") return;
                    revised = true;
                    this.extraStops += 1;
                    await this.say(
                      "reporter",
                      answer.note
                        ? `Revising with your note: “${answer.note}”.`
                        : "Revising: a tighter abstract and a plainer limits section.",
                    );
                    await this.wait(1200);
                    this.send(
                      "draft.scored",
                      { draft: 4, score: 8.4, note: "Revised at your request · kept", best: true },
                      "skeptic",
                    );
                    this.bestDraft = 4;
                    await this.wait(900);
                  }
                },
              },
            ]
          : []),
      ],
    };
  }
}

/** Stage list a run in this mode starts with, before any round decisions. Used to preview stops. */
export function previewStops(mode: ReviewMode) {
  return MODE_GATES[mode];
}

export const hypothesisById = (id: string): Hypothesis | undefined => HYPOTHESES[id];
