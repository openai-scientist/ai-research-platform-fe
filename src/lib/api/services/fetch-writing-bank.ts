import type { ApiResult } from "@/types/api";

import apiService from "../core";

/*
 * The Writing Bank as the Platform's management service serves it (`/admin/writing-bank`). Fields the service adds are
 * snake_case (`settings`, `release`, `stale`); the bank's own payloads are passed through unchanged, in camelCase.
 */

// ---------------------------------------------------------------------------------------------------------------
// Bank payloads (camelCase, as writing-bank serves them)

export type JournalKind = "journal" | "conference" | "generic_profile";
export type ContextScope = "journal" | "general";
/** How firmly the bank expects a move or step: only `obligatory` is a must. */
export type Expectation = "obligatory" | "conventional" | "optional" | "field_dependent";

export interface NamedRef {
  id: string;
  name: string;
}

export interface BankSource {
  source: string;
  locator?: string;
}

/** Where a bank entry comes from and how far it has been checked. */
export interface Provenance {
  id: string;
  status: string;
  origin: string;
  verification: string;
  sources: BankSource[];
  author?: string;
  reviewedBy?: string;
}

export interface JournalSummary {
  id: string;
  name: string;
  /** A bank publisher id such as `pub.elsevier`, or null for a generic profile. */
  publisher: string | null;
  kind: JournalKind;
  venueKind: string;
  discipline: string | null;
  articleTypes: NamedRef[];
  /** The venue's own section names, in the venue's order. */
  sections: string[];
  requirements: number;
  styles: number;
  contexts: number;
  status: string;
  verification: string;
  signatureStatus: string;
}

export interface ContextSummary {
  id: string;
  name: string;
  shortName: string;
  scope: ContextScope;
  articleType: NamedRef;
  macroStructure: NamedRef;
  contributions: NamedRef[];
  venueKind: string;
  discipline: string | null;
  whenToUse: string;
  whenNotToUse: string;
  basis: string;
  sections: number;
  status: string;
  verification: string;
}

export interface SectionMapEntry {
  /** The venue's section name, e.g. `RELATED_WORK`. */
  name: string;
  /** The bank section it maps to, or null when the venue name covers several. */
  section: string | null;
  verification: string;
  note?: string;
}

export interface JournalRequirement {
  kind: string;
  ref: string;
  force: string;
  basis: { kind: string; sources: BankSource[]; limits?: string };
  verification: string;
}

export interface JournalStyle {
  axis: string;
  style: string;
  /** `required`, `preferred` or `excluded`. */
  force: string;
  basis: string;
}

export interface JournalEntry {
  id: string;
  name: string;
  publisher?: string | null;
  kind: JournalKind;
  venueKind: string;
  discipline: string | null;
  sectionMap: SectionMapEntry[];
  requirements: JournalRequirement[];
  styles: JournalStyle[];
  status: string;
  origin: string;
  verification: string;
  sources: BankSource[];
  articleTypes: string[];
  reviewedBy?: string;
  signature?: {
    lifecycle_status?: string;
    identity?: { journal_name?: string; publisher?: string; journal_url?: string; issn?: string[] };
    scope?: { domain?: string };
  } | null;
  summary: JournalSummary;
}

export interface ContextEntry {
  id: string;
  name: string;
  shortName: string;
  addedOn?: string;
  journal?: string | null;
  scope: ContextScope;
  whenToUse: string;
  whenNotToUse: string;
  status: string;
  origin: string;
  verification: string;
  reviewedBy?: string;
  /** Research design ids (`rd.…`) and claim type ids (`ct.…`) the context fits. */
  designs?: string[];
  claimTypes?: string[];
  /** How the context was made (`journal_profile`, …) and what it rests on. */
  basis?: string;
  sources?: BankSource[];
  summary: ContextSummary;
}

export interface BankRule {
  id: string;
  name: string;
  statement: string;
  maxStrength: string | null;
  provenance: Provenance;
}

export interface BankFrame {
  id: string;
  /** An example sentence with `{slot}` placeholders. */
  text: string;
  /** A strength level id such as `str.s3`, or null when the frame has none. */
  expressedStrength: string | null;
  provenance: Provenance;
}

/** A sentence that claims more than its evidence allows, with the wording the bank puts in its place. */
export interface BankOverclaim {
  id: string;
  name: string;
  /** The claim type id it overstates, e.g. `ct.methodological`. */
  claimType: string;
  overclaim: string;
  rewrite: string;
  provenance: Provenance;
}

/** Why the bank put a step or a style into this research context. */
export interface BankReason {
  /** `template`, `discipline`, `claim`, `style`, … */
  code: string;
  ref?: string;
  text: string;
}

/** The words a step brings: sets that fill the gaps of its frames, and vocabulary its examples use. */
export interface StepWords {
  lexicalSets: { id: string; name: string; members: string[] }[];
  vocabulary: { id: string; lemma: string }[];
}

export interface BankStep {
  id: string;
  name: string;
  purpose: string;
  expectation: Expectation;
  argumentElements: NamedRef[];
  frameCap: string | null;
  frames: BankFrame[];
  rules: BankRule[];
  overclaims?: BankOverclaim[];
  /** Validity threats the step should answer. */
  threats?: (NamedRef & { provenance?: Provenance })[];
  reasons?: BankReason[];
  /** Parts of the study's message the step is written from: `problem`, `gap`, `approach`, `result`, `main_claim`. */
  uses?: string[];
  /** `sentence` or `paragraph`: how much text the step takes. */
  span?: string;
  /** `field`, `area`, `niche` or `study`: how wide the step speaks. */
  breadth?: string | null;
  words?: StepWords;
  provenance?: Provenance;
}

export interface BankMove {
  id: string;
  name: string;
  expectation: Expectation;
  /** Step ids, in order. */
  steps: string[];
}

export interface ParagraphPlan {
  type: string;
  name: string;
  purpose: string;
  optional: boolean;
  repeats: boolean;
  pattern: {
    id: string;
    name: string;
    from: string;
    parts: { name: string; repeats: boolean; note?: string }[];
  } | null;
  breadth: { opening: string; closing: string } | null;
  slots: { steps: string[]; optional: boolean; repeats: boolean }[];
}

export interface BankDeclaration {
  id: string;
  name: string;
  definition: string;
  provenance: Provenance;
}

export interface BlueprintSection {
  id: string;
  label: string;
  level: number;
  parent: string | null;
  section: string | null;
  sectionType: string;
  required: boolean;
  purpose: string | null;
  moves: BankMove[];
  steps: BankStep[];
  styleAxes: string[];
  rules: BankRule[];
  declarations: BankDeclaration[];
  wordBudget: number | null;
  paragraphs: ParagraphPlan[];
  paragraphCount: number;
}

export interface BlueprintStyle {
  axis: string;
  axisName: string;
  style: string;
  name: string;
  reasons?: BankReason[];
}

export interface BlueprintRequirement {
  kind: string;
  ref: string;
  name: string;
  force: string;
  limits?: string;
  verification: string;
  provenance: Provenance;
}

export interface BlueprintDeclaration {
  id: string;
  name: string;
  text: string;
  provenance: Provenance;
}

export interface WordLimits {
  mainText: number | null;
  abstract: number | null;
  /** Bank section id → words. */
  sections: Record<string, number>;
  source: string | null;
}

export interface Blueprint {
  format: string;
  version: number;
  generatedAt: string;
  bankVersion: string;
  title: string;
  names: Record<string, string>;
  macroStructure: string | null;
  wordLimits: WordLimits;
  styles: BlueprintStyle[];
  sections: BlueprintSection[];
  wholePaper: BankRule[];
  journalRequirements: BlueprintRequirement[];
  journalDeclarations: BlueprintDeclaration[];
  /** The inputs the blueprint was built from, each `{field, id}`, named in `names`. */
  resolved?: { field: string; id: string }[];
  inputs?: { discipline?: string | null };
  /** Paper-wide notes, e.g. that no main claim caps the strength of the frames yet. */
  reasons?: BankReason[];
}

/** Where a writing technique applies in a research context: any section, or these sections and step ids. */
export interface TechniqueApplies {
  anySection: boolean;
  sections: string[];
  steps: string[];
}

/** A writing technique as the bank restates it from its sources, placed in one research context. */
export interface BankTechnique {
  id: string;
  name: string;
  /** `paper`, `section`, `paragraph`, `sentence`, `word` or `process`. */
  level: string;
  category: string;
  sections: string[];
  steps: string[];
  problem: string;
  principle: string;
  howToApply: string[];
  templates: string[];
  signals: string[];
  antiPatterns: string[];
  example: { weak?: string; strong?: string; note?: string } | null;
  related: string[];
  status: string;
  verification: string;
  sources: BankSource[];
  applies: TechniqueApplies;
}

/** One link of a bank entry in the bank's knowledge graph. */
export interface BankLink {
  relation: string;
  /** The relation in plain English, e.g. "the entry draws on a writing technique". */
  gloss: string;
  /** False when the other entry points at this one. */
  outgoing: boolean;
  /** The nested part (a step, a sub-function) that holds the link, when it is not the entry itself. */
  via?: string;
  other: { id: string; collection: string; label: string; kind: string; parent?: string };
}

/** Every entry of one bank, as its bank stores them. */
export interface LibraryBankData {
  release: BankRelease | null;
  stale: boolean;
  collection: string;
  items: (Record<string, unknown> & { id: string })[];
}

/** One kind of convergence check the bank holds a writing plan to. */
export interface BankCheck {
  id: string;
  severity: "error" | "warning";
  step: string;
  name: string;
  holds: string;
}

export interface ChecksData {
  release: BankRelease | null;
  stale: boolean;
  items: BankCheck[];
}

/** One bank entry in full, as its bank stores it, with its links. */
export interface LibraryEntryData {
  release: BankRelease | null;
  stale: boolean;
  collection: string;
  entry: Record<string, unknown> & { id: string };
  links: BankLink[];
}

// ---------------------------------------------------------------------------------------------------------------
// What the Platform adds (snake_case)

export interface BankRelease {
  release: string;
  date: string;
  notes: string;
  includes_drafts: boolean;
  content_hash: string;
}

export interface WritingBankDefault {
  journal_id: string;
  context_id: string;
}

export interface WritingBankStatus {
  configured: boolean;
  reachable: boolean;
  base_url: string | null;
  release: BankRelease | null;
  checked_at: string | null;
  error: string | null;
  /** The code of `error`, to branch on (`WRITING_BANK_ERRORS`). */
  error_code: string | null;
  stale: boolean;
  counts: { journals: number; enabled_journals: number; enabled_contexts: number };
  default: WritingBankDefault | null;
}

export interface JournalSettings {
  enabled: boolean;
  enabled_contexts: number;
  /** True when the default research context belongs to this journal. */
  is_default: boolean;
  updated_at: string | null;
  updated_by: string | null;
}

export interface ContextSettings {
  enabled: boolean;
  /** False while `enabled` is the default (on) rather than an admin's choice. */
  explicit: boolean;
  is_default: boolean;
  updated_at: string | null;
  updated_by: string | null;
}

export type AdminJournalItem = JournalSummary & { settings: JournalSettings };
export type AdminContextItem = ContextSummary & { settings: ContextSettings };

interface Cached {
  release: BankRelease | null;
  /** True when the bank could not be reached and this is the last body the Platform cached. */
  stale: boolean;
}

export interface JournalListData extends Cached {
  items: AdminJournalItem[];
}

export interface JournalDetailData extends Cached {
  journal: JournalEntry;
  contexts: AdminContextItem[];
  settings: JournalSettings;
}

export interface ContextDetailData extends Cached {
  journal: JournalSummary;
  context: ContextEntry;
  blueprint: Blueprint;
  /** The writing techniques made for any section or for one of the blueprint's sections; absent from an older answer. */
  techniques?: BankTechnique[];
  /** For each of its cards (`<bank>/<id>`), how many of the release's `contexts` give it; absent from an older bank. */
  usage?: { contexts: number; cards: Record<string, number> } | null;
  settings: ContextSettings;
  /** The journal's own switch: a context is offered only while its journal is enabled. */
  journal_settings: JournalSettings;
}

/** Error codes the service answers with; branch on these, never on the message. */
export const WRITING_BANK_ERRORS = {
  notConfigured: "WRITING_BANK_NOT_CONFIGURED",
  unavailable: "WRITING_BANK_UNAVAILABLE",
  notFound: "WRITING_BANK_NOT_FOUND",
  notEnabled: "WRITING_BANK_NOT_ENABLED",
} as const;

const BASE = "/admin/writing-bank";
const journalPath = (journalId: string) => `${BASE}/journals/${encodeURIComponent(journalId)}`;
const contextPath = (journalId: string, contextId: string) =>
  `${journalPath(journalId)}/contexts/${encodeURIComponent(contextId)}`;

export const fetchWritingBank = {
  getStatus: async (signal?: AbortSignal): Promise<ApiResult<WritingBankStatus>> => {
    const response = await apiService.get<ApiResult<WritingBankStatus>>(`${BASE}/status`, undefined, { signal });
    return response.data;
  },
  getJournals: async (signal?: AbortSignal): Promise<ApiResult<JournalListData>> => {
    const response = await apiService.get<ApiResult<JournalListData>>(`${BASE}/journals`, undefined, { signal });
    return response.data;
  },
  getJournal: async (journalId: string, signal?: AbortSignal): Promise<ApiResult<JournalDetailData>> => {
    const response = await apiService.get<ApiResult<JournalDetailData>>(journalPath(journalId), undefined, { signal });
    return response.data;
  },
  getContext: async (
    journalId: string,
    contextId: string,
    signal?: AbortSignal,
  ): Promise<ApiResult<ContextDetailData>> => {
    const response = await apiService.get<ApiResult<ContextDetailData>>(contextPath(journalId, contextId), undefined, {
      signal,
    });
    return response.data;
  },
  updateJournal: async (journalId: string, enabled: boolean): Promise<ApiResult<JournalSettings>> => {
    const response = await apiService.put<ApiResult<JournalSettings>>(`${journalPath(journalId)}/settings`, {
      enabled,
    });
    return response.data;
  },
  updateContext: async (
    journalId: string,
    contextId: string,
    enabled: boolean,
  ): Promise<ApiResult<ContextSettings>> => {
    const response = await apiService.put<ApiResult<ContextSettings>>(`${contextPath(journalId, contextId)}/settings`, {
      enabled,
    });
    return response.data;
  },
  setDefault: async (value: WritingBankDefault | null): Promise<ApiResult<WritingBankDefault | null>> => {
    const response = await apiService.put<ApiResult<WritingBankDefault | null>>(
      `${BASE}/default`,
      value ?? { journal_id: null, context_id: null },
    );
    return response.data;
  },
  getChecks: async (signal?: AbortSignal): Promise<ApiResult<ChecksData>> => {
    const response = await apiService.get<ApiResult<ChecksData>>(`${BASE}/checks`, undefined, { signal });
    return response.data;
  },
  getLibrary: async (collection: string, signal?: AbortSignal): Promise<ApiResult<LibraryBankData>> => {
    const response = await apiService.get<ApiResult<LibraryBankData>>(
      `${BASE}/library/${encodeURIComponent(collection)}`,
      undefined,
      { signal },
    );
    return response.data;
  },
  getEntry: async (collection: string, id: string, signal?: AbortSignal): Promise<ApiResult<LibraryEntryData>> => {
    const response = await apiService.get<ApiResult<LibraryEntryData>>(
      `${BASE}/library/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`,
      undefined,
      { signal },
    );
    return response.data;
  },
  refresh: async (): Promise<ApiResult<WritingBankStatus>> => {
    const response = await apiService.post<ApiResult<WritingBankStatus>>(`${BASE}/refresh`);
    return response.data;
  },
};
