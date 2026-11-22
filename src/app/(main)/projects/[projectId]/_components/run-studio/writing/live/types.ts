/* ===== The files a writing run publishes, as the engine writes them (snake_case, read as sent) =====
   Each step of the run writes its own files; the screen of that step reads them. Statements, ledger values and
   sources are named by id everywhere else, and their words are read from the registry and the ledger. */

export type Tone = "ok" | "warn" | "bad";

/* ---------- S00 · intake ---------- */
export interface IntakeCheck {
  check_id: string;
  part: string;
  status: Tone;
  text: string;
  evidence: string;
}
export interface IntakeIssue {
  id: string;
  kind: string;
  why: string;
  needs?: string;
  owner?: string;
  route?: string;
  severity?: string;
}
export interface IntakeChecksFile {
  checks: IntakeCheck[];
}
export interface IntakeIssuesFile {
  issues: IntakeIssue[];
}

/* ---------- S01 · the standard data report ---------- */
export interface ReportField {
  field_id: string;
  label: string;
  level: "must" | "should" | "may";
  asked_by: string[];
  becomes: string;
  status: "ok" | "partial" | "warn" | "bad" | "na";
  value: string;
  na: string | null;
}
export interface ReportRule {
  code: string;
  field: string;
  status: Tone;
  text: string;
}
export interface DataReportFile {
  fields: ReportField[];
  plan_vs_runs: {
    deviations: { deviation_id: string; planned: string; ran: string }[];
    first_run_at: string;
    locked_at: string;
  };
  profile: Record<string, string | number | boolean>;
  profile_reasons: Record<string, string>;
  rules: ReportRule[];
}
export interface ClaimCeilingFile {
  blocked: boolean;
  ceiling: { causes: string; confirmatory: boolean; significant: string; strength: string };
}
export interface ChainRun {
  run_id: string;
  seed: number;
  trace: string;
  treatment: string;
}
export interface ChainLink {
  hypothesis_id: string;
  analyses: string[];
  comparisons: string[];
  runs: ChainRun[];
  linked: boolean;
  status: string;
  verdict: string;
}
export interface LinkChainFile {
  chain: ChainLink[];
}

/* ---------- S02 · evidence ledger ---------- */
export interface LedgerValue {
  key: string;
  label: string;
  printed: string;
  record: string;
}
export interface Reference {
  key: string;
  doi: string;
  title: string;
  /** How the paper names it in brackets ("Martins et al., 2023"); missing in runs before it was written. */
  cited_as?: string;
  /** Its entry of the reference list, as the printed paper writes it; missing in runs before it was written. */
  reference?: string;
  url: string;
  via: string;
  status: string;
  quotable: boolean;
  reason: string;
}
export interface Span {
  span_id: string;
  source: string;
  text: string;
}
export interface Recomputed {
  record: string;
  what: string;
  package: number;
  recomputed: number;
  match: boolean;
}
export interface EvidenceLedgerFile {
  ledger: LedgerValue[];
  missing: { id: string; kind: string; why: string }[];
  recomputed: Recomputed[];
  references: Reference[];
  spans: Span[];
}

/* ---------- S03 · statements on the fourth axis ---------- */
export interface Obligation {
  kind: string;
  [k: string]: unknown;
}
export interface Statement {
  statement_id: string;
  type: string;
  status: string;
  origin: string;
  text: string;
  approved_text: string;
  approved_by: string | null;
  negation: string;
  hypothesis_id: string | null;
  analysis_ids: string[];
  keys: string[];
  sources: string[];
  links_from: string[];
  obligations: Obligation[];
  blocked_reason: string | null;
  label?: string | null;
}
export interface StatementRegistryFile {
  statements: Statement[];
}
export interface LifecycleLinksFile {
  links: { from: string; to: string }[];
}

/* ---------- S04 · the debate ---------- */
export interface DebateClaim {
  claim_id: string;
  scheme: string;
  scheme_name: string;
}
export interface Exchange {
  exchange_id: string;
  claim_id: string;
  critic: string;
  cq_id: string;
  question: string;
  challenge: string;
  challenge_grounds: string[];
  reply: string;
  reply_grounds: string[];
  /** who answered last: the proponent, the judge, or the record itself */
  by: string;
  outcome: string;
  qualifier: string;
  ruling: string;
  rounds: number;
}
export interface DebateRecordFile {
  claims: DebateClaim[];
  exchanges: Exchange[];
}
export interface RulingsFile {
  claims: { claim_id: string; outcomes: Record<string, number>; stands: boolean }[];
}

/* ---------- S05 · Toulmin cards ---------- */
export interface ToulminCard {
  claim_id: string;
  claim: string;
  data: string[];
  warrant: string;
  warrant_source: string | null;
  backing: string[];
  qualifier: string;
  main_qualifier: string;
  rebuttals: string[];
  reconstructed: boolean;
  from_exchanges: string[];
}
export interface ToulminCardsFile {
  cards: ToulminCard[];
}

/* ---------- S06 · the AIF graph ---------- */
export interface GraphNode {
  node_id: string;
  kind: "I" | "RA" | "CA" | "PA";
  scheme: string | null;
  text: string;
  extensions: {
    asw?: { keys?: string[]; propType?: string; sources?: string[]; status?: string; reconstructed?: boolean };
  };
}
export interface ArgumentGraphFile {
  context: string[];
  nodes: GraphNode[];
  edges: { source: string; target: string }[];
  removed: { node_id: string; reason: string }[];
}
export interface GraphEvidenceMapFile {
  nodes: { node_id: string; keys: string[]; record: string | null; sources: string[] }[];
}

/* ---------- S07 · ASPIC+ labels and the frozen graph ---------- */
export interface Ceiling {
  causes: string;
  confirmatory: boolean;
  significant: string;
  strength: string;
}
export interface EvaluationLabel {
  statement_id: string;
  type: string;
  status: string;
  label: "IN" | "OUT" | "UNDEC" | string;
  strength: string;
  qualifier: string;
  carried: string;
  approved_text: string;
  negation: string;
  reconstructed_warrant: boolean;
}
export interface EvaluationLabelsFile {
  ceiling: Ceiling;
  labels: EvaluationLabel[];
  not_written: { statement_id: string; why: string }[];
}
export interface FrozenGraphFile {
  sha256: string;
  ceiling: Ceiling;
  cards: ToulminCard[];
  statements: Statement[];
  strength: Record<string, string>;
}

/* ---------- S08 · journal merge ---------- */
export interface ContractSection {
  section_id: string;
  heading: string;
  guidance: string;
  moves: string[];
  required: boolean;
  single_paragraph: boolean;
  slots: { name: string; takes?: string[]; source?: string }[];
  tense: string;
  words: number[];
  most: Record<string, unknown>;
}
export interface JournalWritingContractFile {
  journal: string;
  profile: string;
  article_type: string;
  argument_map: Record<string, string>;
  conflicts: unknown[];
  habits: Record<string, unknown>;
  placement: Record<string, string[]>;
  rules: {
    abstract: { form: string; words: number[] };
    citation_style: string;
    sections: ContractSection[];
    words: number[];
  };
  sentence_rules: string[];
}
export interface PlacementMapFile {
  placement: Record<string, string>;
}

/* ---------- S00A · the writing frame, and S08 · its join with the argument ---------- */
export type FrameChoiceKey = "structure" | "heading_case" | "interval_label" | "numbers";
export interface FrameChoice {
  key: FrameChoiceKey;
  label: string;
  value: string;
  values: string[];
  labels: Record<string, string>;
  why: string;
  source: string;
}
export interface FrameSection {
  section_id: string;
  heading: string;
  required: boolean;
  words: number[];
  guidance: string;
  moves: string[];
  tense: string;
  slots: { name: string; moves: string[]; takes: string[]; source: string }[];
}
export interface WritingFrameFile {
  profile: { profile_id: string; name: string; generic: boolean; note: string };
  rules: { item: string; value: string; why: string; source: string }[];
  sections: FrameSection[];
  style: { sentence_rules: string[]; argument_map: Record<string, string> };
  choices: FrameChoice[];
  values: Record<FrameChoiceKey, string>;
  chosen: Partial<Record<FrameChoiceKey, string>>;
  /** The contract the profile makes, as the join merges it with the claims. */
  contract: JournalWritingContractFile;
}
export type JoinRule = "every-statement-has-a-section" | "every-move-has-content" | "comparison-has-sources";
export interface JoinFinding {
  rule: JoinRule;
  kind: "H" | "M";
  passed: boolean;
  note: string;
  /** Where a failed check is fixed: the writing frame, the argument, or the hypothesis stage (its literature). */
  fix_at: "frame" | "argument" | "hypothesis";
  locator: string;
}
export interface JoinReportFile {
  findings: JoinFinding[];
  coverage: { passed: number; failed_hard: number; to_look_at: number };
  chosen: Partial<Record<FrameChoiceKey, string>>;
  values: Record<FrameChoiceKey, string>;
}

/* ---------- S09 · story and outline ---------- */
export interface Acknowledgment {
  exchange_id: string;
  kind: string;
  level: number;
  objection: string;
  answer: string;
  grounds: string[];
  outcome: string;
  place: string;
  target: string;
  text: string;
}
export interface StoryPlanFile {
  message: string;
  message_statements: string[];
  significance: string;
  key_terms: string[];
  claim_candidates: { claim: string; because: string; although: string }[];
  claim_kind: Record<string, string>;
  problem: {
    context: string[];
    condition: string | null;
    consequence: { kind: string; source: string; span: string } | null;
    response: string | null;
  };
  ocar: { opening: string[]; challenge: string[]; action: string[]; resolution: string[] };
  /** Absent from runs planned before the profile named it. */
  structure?: "OCAR" | "telegraphed OCAR" | "LDR";
  three_step: { topic: string; question: string; significance: string; applied_link: string; kind: string } | null;
  reasons: { statement_id: string; supports: string; evidence: string[]; paragraphs: string[] }[];
  acknowledgments: Acknowledgment[];
  warrants: { claim_id: string; paragraph: string; reconstructed: boolean; text: string; why: string }[];
  reader: {
    who: string;
    field: string;
    knows_problem: string;
    expects: string;
    must_convince_it_matters: boolean;
    contradicts_beliefs: string | null;
    standard_objections: string[];
  };
  further_research: string[];
  omissions: { item: string; reason: string }[];
  warnings: string[];
}
export interface BlueprintSection {
  section_id: string;
  purpose: string;
  moves: string[];
  statements: string[];
  exhibits: string[];
}
export interface ManuscriptBlueprintFile {
  working_title: string;
  contributions: string[];
  storyline: string[];
  sections: BlueprintSection[];
}
export interface SynthesisPlanFile {
  comparisons: {
    card_id: string;
    hypothesis_id: string;
    relation: string;
    direction: string;
    warrant: string;
    attributes: { atom_id: string; attribute: string; same: boolean }[];
  }[];
}
/** A prior study of the literature cards the run was given (the hypothesis run's evidence file). */
export interface EvidenceCard {
  card_id: string;
  title: string;
  year: number | null;
  venue: string | null;
}

/* ---------- S10 · the manuscript tree: sections, paragraphs, sentences ---------- */
export interface TreeSentence {
  uid: string;
  function: string;
  statements: string[];
  keys: string[];
  cites: string[];
  terms: { term: string; placement: string }[];
  origin: string;
  detached: string[];
}
export interface TreeParagraph {
  uid: string;
  paragraph_id: string;
  pattern: string;
  shape: string;
  point: string | null;
  slot: string | null;
  job: string;
  moves: string[];
  argument_role?: string | null;
  ocar?: string | null;
  link_in?: string | null;
  data: string[];
  needs: string[];
  obligations?: string[];
  /** The term the paragraph is about, the one it opens on (from the paragraph before), and the group it names. */
  key_term?: string | null;
  group_term?: string | null;
  risk: number;
  state: string;
  sentences: TreeSentence[];
}
export interface TreeSlot {
  slot: string;
  moves: string[];
  statements: string[];
  first: boolean;
  together: boolean;
}
export interface TreeSection {
  uid: string;
  template: string;
  written_by: string;
  anchors: string[];
  slots: TreeSlot[];
  paragraphs: TreeParagraph[];
}
export interface ManuscriptTreeFile {
  version: number;
  erp_snapshot: string;
  argument_plan_version?: number;
  story_version?: number;
  policies: { kind: string; name: string; scope: string; source: string; version?: number }[];
  sections: TreeSection[];
}

/* ---------- checkpoints: the options a stop offers, and the rules each was scored on ---------- */
export interface ScoreRow {
  rule: string;
  kind: "H" | "M" | string;
  book_ref: string;
  passed: boolean;
  locator: string;
  note: string;
  measure: number | null;
  threshold: number | null;
}
export interface Scorecard {
  checkpoint: string;
  h_failed: number;
  m_score: number;
  rows: ScoreRow[];
}
export interface CheckpointOption {
  option_id: string;
  label: string;
  strategy: string;
  kept: number;
  dropped: number;
  changed: string[];
  scorecard: Scorecard;
}
export interface OptionsFile {
  options: CheckpointOption[];
  /** The ways built but not offered: a hard rule of each fails. */
  withheld?: CheckpointOption[];
  recommended?: string;
  taken?: string;
  by?: string;
}
export interface GateStateFile {
  [checkpoint: string]: {
    status: string;
    by: string;
    at: string;
    option?: string;
    h_failed: number;
    m_score: number;
    version: number;
    checksum: string;
  };
}

/** Every file a writing-outline run publishes, by file name. */
/** The paper tree as each section's plan comes back, before the paragraphs check scores it; re-sent per section. */
export interface ManuscriptTreeDraftFile {
  sections: ManuscriptTreeFile["sections"];
  /** The sections planned so far, in outline order. */
  planned: string[];
  /** The Discussion options, once planned, by the option ids of the paragraphs check. */
  options: Record<string, { label: string; sections: ManuscriptTreeFile["sections"] }>;
  checked: boolean;
}
/** The debate as each critic, reply and ruling comes back: everything said so far, in the final file's shape. An
 * exchange not ruled on yet has `outcome` and `by` null and an empty reply/ruling until they come. */
export type DebateRecordDraftFile = DebateRecordFile & {
  /** The last call folded in: "record", "critic-<critic>", "reply-<n>" or "judge-<n>". */
  through: string;
  round: number;
  done: boolean;
};
/** The story as planned, then each other story the Planner tried, before the story check scores them. */
export type StoryPlanDraftFile = StoryPlanFile & {
  options: Record<string, StoryPlanFile & { label: string }>;
  through: string;
  done: boolean;
};
/* ---------- the first draft: each section as written, then the paper ---------- */
/** One sentence of a written paragraph: its words (with the ledger's `{{key}}` marks), its role and its statements. */
export interface WrittenSentence {
  text: string;
  role: string;
  /** Who wrote it first: the section writer, code, the authors (a slot left to them) or you. */
  origin: "model" | "code" | "author" | "user";
  /** What the verifier found: entailed, speculative, failed, pending (not checked yet), code. */
  check: string;
  statements: string[];
  /** Once you changed it in a saved version: when, and what it said first. */
  edited?: { at: string; from_text: string; from_origin: string };
}
export interface WrittenParagraph {
  paragraph_id: string;
  sentences: WrittenSentence[];
}
export interface WrittenSectionFile {
  section_id: string;
  heading: string;
  paragraphs: WrittenParagraph[];
}
/** Each writing of a section as it is written: the first as planned, then each other way it was written. */
export interface SectionDraftFile {
  section_id: string;
  heading: string;
  /** Written again from the researcher's note. */
  note: boolean;
  /** How many writings the stage makes. */
  planned: number;
  versions: { option_id: string; label: string; strategy: string; paragraphs: WrittenParagraph[] }[];
}
/** Each title and abstract as it is written. */
export interface FrontDraftFile {
  note: boolean;
  planned: number;
  versions: {
    option_id: string;
    label: string;
    strategy: string;
    title: string;
    abstract: string;
    keywords: string[];
  }[];
}
/** What the section's writers are told before they write it. */
export interface SectionBrief {
  section_id: string;
  purpose: string;
  moves: { move: string; pattern: string; paragraph: string }[];
  tense: string;
  key_terms: string[];
  earlier: string[];
}
export interface PaperFile {
  title: string;
  abstract: string;
  keywords: string[];
  sections: WrittenSectionFile[];
  back_matter?: WrittenSectionFile[];
}
export interface ProvenanceFile {
  sentences: { locator: string; origin: string; statements?: string[]; keys?: string[]; cites?: string[] }[];
}

/** The tables and figures a reader of the draft sees, as code builds them from the record. */
export interface ExhibitsFile {
  tables: { key: string; caption: string; header: string[]; rows: string[][]; align: string }[];
  /** Each figure's image is a PNG, base64-encoded. */
  figures: { key: string; caption: string; png: string }[];
}

export interface RunFiles {
  "experiment_result.json": import("../data/erp").Erp;
  "IntakeChecks.json": IntakeChecksFile;
  "IntakeIssues.json": IntakeIssuesFile;
  "DataReport.json": DataReportFile;
  "ClaimCeiling.json": ClaimCeilingFile;
  "LinkChain.json": LinkChainFile;
  "EvidenceLedger.json": EvidenceLedgerFile;
  "Exhibits.json": ExhibitsFile;
  "ReadinessReport.md": string;
  "StatementRegistry.json": StatementRegistryFile;
  "LifecycleLinks.json": LifecycleLinksFile;
  "DebateRecord.json": DebateRecordFile;
  "Rulings.json": RulingsFile;
  "ToulminCards.json": ToulminCardsFile;
  "ArgumentGraph.json": ArgumentGraphFile;
  "GraphEvidenceMap.json": GraphEvidenceMapFile;
  "EvaluationLabels.json": EvaluationLabelsFile;
  "ClaimsToLock.md": string;
  "FrozenGraph_v1.json": FrozenGraphFile;
  "WritingFrame.json": WritingFrameFile;
  "JoinReport.json": JoinReportFile;
  "JournalWritingContract.json": JournalWritingContractFile;
  "PlacementMap.json": PlacementMapFile;
  "StoryPlan.json": StoryPlanFile;
  "SynthesisPlan.json": SynthesisPlanFile;
  "ManuscriptBlueprint.json": ManuscriptBlueprintFile;
  "SectionContracts.json": { sections: (BlueprintSection & { words: number[]; obligations: unknown[] })[] };
  "ManuscriptTree.json": ManuscriptTreeFile;
  "Options_F.json": OptionsFile;
  "Options_J.json": OptionsFile;
  "Options_P2.json": OptionsFile;
  "Options_P3.json": OptionsFile;
  "Options_P4.json": OptionsFile;
  "Options_P5.json": OptionsFile;
  "Scorecard_F.json": Scorecard;
  "Scorecard_J.json": Scorecard;
  "Scorecard_P1.json": Scorecard;
  "Scorecard_P2.json": Scorecard;
  "Scorecard_P3.json": Scorecard;
  "Scorecard_P4.json": Scorecard;
  "Scorecard_P5.json": Scorecard;
  "GateState.json": GateStateFile;
  "ManuscriptTreeDraft.json": ManuscriptTreeDraftFile;
  "DebateRecordDraft.json": DebateRecordDraftFile;
  "StoryPlanDraft.json": StoryPlanDraftFile;
  "evidence.json": { cards: EvidenceCard[] };
  "Section.json": WrittenSectionFile;
  "SectionDraft.json": SectionDraftFile;
  "Options_S-results.json": OptionsFile;
  "Options_S-discussion.json": OptionsFile;
  "Options_S-limitations.json": OptionsFile;
  "Options_S-introduction.json": OptionsFile;
  "Options_S-related_work.json": OptionsFile;
  "Options_S-conclusion.json": OptionsFile;
  "Options_S-front.json": OptionsFile;
  "Scorecard_S-results.json": Scorecard;
  "Scorecard_S-discussion.json": Scorecard;
  "Scorecard_S-limitations.json": Scorecard;
  "Scorecard_S-introduction.json": Scorecard;
  "Scorecard_S-related_work.json": Scorecard;
  "Scorecard_S-conclusion.json": Scorecard;
  "Scorecard_S-front.json": Scorecard;
  "FrontDraft.json": FrontDraftFile;
  "Draft_1.md": string;
  "paper.md": string;
  "paper.json": PaperFile;
  "SentenceProvenance.json": ProvenanceFile;
}
export type RunFileName = keyof RunFiles;
