import type { Expectation, JournalKind, Provenance } from "@/lib/api/services/fetch-writing-bank";

export const KIND_LABELS: Record<JournalKind, string> = {
  journal: "Journal",
  conference: "Conference",
  generic_profile: "Generic profile",
};

export const EXPECTATION_LABELS: Record<Expectation, string> = {
  obligatory: "Obligatory",
  conventional: "Conventional",
  optional: "Optional",
  field_dependent: "Depends on field",
};

/** The bank's strength scale (`strength-levels` bank). Frames carry only the id. */
const STRENGTH_LABELS: Record<string, string> = {
  "str.s0": "Speculative",
  "str.s1": "Tentative",
  "str.s2": "Moderate",
  "str.s3": "Confident",
  "str.s4": "Categorical",
};

/** Words the bank writes in lower case inside its ids that read as acronyms or brand spellings. */
const SPELLINGS: Record<string, string> = {
  ai: "AI",
  acm: "ACM",
  cs: "CS",
  eswa: "ESWA",
  ieee: "IEEE",
  imrad: "IMRaD",
  imrdc: "IMRDC",
  irdm: "IRDM",
  ldr: "LDR",
  mdpi: "MDPI",
  neurips: "NeurIPS",
  plos: "PLOS",
  prisma: "PRISMA",
  pse: "PSE",
};

function words(slug: string) {
  return slug
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) => SPELLINGS[word] ?? word);
}

/** `computer-science` → "Computer science"; ids keep their known acronyms. */
export function humanize(slug: string | null | undefined) {
  if (!slug) return "—";
  const parts = words(slug);
  if (!parts.length) return slug;
  const [first, ...rest] = parts;
  return [first.charAt(0).toUpperCase() + first.slice(1), ...rest].join(" ");
}

/** Strips the bank's type prefix (`dc.`, `ct.`, `pub.`…) before humanizing. */
export function humanizeId(id: string | null | undefined) {
  if (!id) return "—";
  const dot = id.indexOf(".");
  return humanize(dot === -1 ? id : id.slice(dot + 1));
}

/** `pub.springer-nature` → "Springer Nature" (every word capitalised, as a publisher name). */
export function publisherName(id: string | null | undefined) {
  if (!id) return null;
  return words(id.replace(/^pub\./, ""))
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** `sty.macro-structure.cs-pse` → { axis: "Macro structure", style: "CS PSE" }. */
export function styleParts(styleId: string, axisId: string) {
  const axis = axisId.replace(/^ax\./, "");
  const style = styleId.replace(/^sty\./, "").replace(`${axis}.`, "");
  return { axis: humanize(axis), style: humanize(style) };
}

/** `RELATED_WORK` → "Related work". */
export function venueSectionName(name: string) {
  return humanize(name.toLowerCase());
}

export function strengthLabel(id: string | null) {
  if (!id) return null;
  return STRENGTH_LABELS[id] ?? humanizeId(id);
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatWords(value: number | null | undefined) {
  return value == null ? null : `${value.toLocaleString("en-US")} words`;
}

export function plural(count: number, one: string, many = `${one}s`) {
  return `${count} ${count === 1 ? one : many}`;
}

/** "Authored · checked against a secondary source". */
export function provenanceLabel(provenance: Provenance | null | undefined) {
  if (!provenance) return null;
  const verification =
    provenance.verification === "unverified"
      ? "not yet checked"
      : `checked against a ${provenance.verification} source`;
  return `${humanize(provenance.origin)} · ${verification}`;
}

export function sourceText(provenance: Provenance | null | undefined) {
  const first = provenance?.sources[0];
  if (!first) return null;
  // `src.gopen-swan-1990` → "Gopen Swan 1990": a source id names its authors and year.
  const name = words(first.source.replace(/^src\./, ""))
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
  return first.locator ? `${name}, ${first.locator}` : name;
}

/** The link to a journal or a context page; bank ids contain dots, which are safe in a path segment. */
export function journalHref(journalId: string) {
  return `/admin/writing-bank/${encodeURIComponent(journalId)}`;
}

export function contextHref(journalId: string, contextId: string) {
  return `${journalHref(journalId)}/contexts/${encodeURIComponent(contextId)}`;
}

/** A route segment as the bank id it encodes; a malformed one is kept as it is. */
export function routeId(segment: string) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/** How far the bank has checked an entry against its sources. */
export function verificationLabel(value: string | null | undefined) {
  if (value === "primary") return "Checked against the venue";
  if (value === "secondary") return "Checked against a secondary source";
  return "Source not checked";
}

/** How much text a step takes. */
export function spanLabel(span: string | null | undefined) {
  if (span === "paragraph") return "A paragraph";
  if (span === "sentence") return "One sentence";
  return span ? humanize(span) : null;
}

const BREADTH_LABELS: Record<string, string> = {
  field: "the field",
  area: "the research area",
  niche: "the niche",
  study: "this study",
};

/** How wide a step or a paragraph speaks, from the whole field down to this study. */
export function breadthLabel(breadth: string | null | undefined) {
  if (!breadth) return null;
  return BREADTH_LABELS[breadth] ?? humanize(breadth);
}

const USE_LABELS: Record<string, string> = {
  problem: "problem",
  gap: "gap",
  approach: "approach",
  result: "result",
  main_claim: "main claim",
};

/** The parts of the study's message a step is written from, in words. */
export function usesLabel(uses: string[] | undefined) {
  if (!uses?.length) return null;
  return uses.map((use) => USE_LABELS[use] ?? humanize(use)).join(", ");
}

/** Why the bank keeps a step beyond its template and field: e.g. that a claim is normally stated there. */
export function stepReasons(reasons: { code: string; text: string }[] | undefined) {
  // The discipline reason only repeats the step's expectation badge, so the reasons left are the telling ones.
  return (reasons ?? [])
    .filter((reason) => reason.code !== "template" && reason.code !== "discipline")
    .map((reason) => reason.text);
}
