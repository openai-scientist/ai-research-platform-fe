import type { PackageHypothesis } from "@/lib/api/services/fetch-research-package";

/**
 * Reads what the Platform's report page holds, as strings only. The page is built by Logos from a fixed template
 * (`<h2>` per section, `<figure id="figure-N">` with an inline SVG and a `<figcaption>`), so it is split with plain
 * patterns. Nothing here is ever inserted into the app's own DOM: every piece goes into a sandboxed frame.
 */

export type ReportPiece = { kind: "html"; html: string } | { kind: "figure"; figure: ReportFigure };

export interface ReportSection {
  id: string;
  /** "1" for "1. The question and the answer"; empty for the appendix. */
  number: string;
  title: string;
  pieces: ReportPiece[];
}

export interface ReportFigure {
  id: string;
  /** The figure's number in the report. */
  n: number;
  kind: FigureKind | "other";
  hypothesis: string | null;
  title: string;
  /** What to read from it, in words. Ids of the results it was drawn from are left out. */
  caption: string;
  svg: string;
}

export type FigureKind = "flow" | "lock" | "specifications" | "sensitivity" | "shape";

export interface ParsedReport {
  sections: ReportSection[];
  figures: ReportFigure[];
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

export function unescapeHtml(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
    if (code[0] === "#") {
      const point =
        code[1].toLowerCase() === "x" ? Number.parseInt(code.slice(2), 16) : Number.parseInt(code.slice(1), 10);
      return Number.isFinite(point) && point > 0 && point < 0x110000 ? String.fromCodePoint(point) : whole;
    }
    return ENTITIES[code.toLowerCase()] ?? whole;
  });
}

const plain = (html: string) =>
  unescapeHtml(html.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();

const KINDS: [RegExp, FigureKind][] = [
  [/^how the rows of the file/i, "flow"],
  [/^the design before and after the lock/i, "lock"],
  [/^the estimate under each specification/i, "specifications"],
  [/^sensitivity of/i, "sensitivity"],
  [/^the shape of the relation/i, "shape"],
];

export const figureKind = (title: string): FigureKind | "other" =>
  KINDS.find(([pattern]) => pattern.test(title))?.[1] ?? "other";

const hypothesisOf = (title: string) => /\b(H\d+)\b/.exec(title)?.[1] ?? null;

function readFigure(id: string, svg: string, caption: string): ReportFigure {
  const strong = /<strong>([\s\S]*?)<\/strong>/.exec(caption)?.[1] ?? "";
  const heading = plain(strong);
  const numbered = /^Figure\s+(\d+)\.\s*(.*?)\.?$/i.exec(heading);
  const title = (numbered?.[2] ?? heading).trim();
  const rest = plain(caption.replace(/<strong>[\s\S]*?<\/strong>/, ""));
  // "Drawn from: H1-main, …" names results by id; a reader needs the sentence before it.
  const read = rest.replace(/\s*Drawn from:.*$/i, "").trim();
  return {
    id,
    n: Number(numbered?.[1] ?? id.replace(/\D+/g, "")) || 0,
    kind: figureKind(title),
    hypothesis: hypothesisOf(title),
    title,
    caption: read,
    svg,
  };
}

/** Takes scripts, event handlers and foreign content out of markup headed for a frame. The frame is sandboxed too. */
export function stripActive(markup: string): string {
  return markup
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<foreignObject\b[\s\S]*?<\/foreignObject\s*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|xlink:href|src)\s*=\s*("\s*javascript:[^"]*"|'\s*javascript:[^']*')/gi, "");
}

export function parseReport(html: string): ParsedReport {
  const main = /<main[^>]*>([\s\S]*?)<\/main>/i.exec(html)?.[1] ?? html;
  const body = stripActive(main).replace(/<h1[^>]*>[\s\S]*?<\/h1>/i, "");
  const parts = body.split(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
  const figures: ReportFigure[] = [];
  const sections: ReportSection[] = [];
  // parts: [before, title1, body1, title2, body2, …]
  for (let at = 1; at < parts.length; at += 2) {
    const heading = plain(parts[at]);
    const numbered = /^(\d+)\.\s*(.*)$/.exec(heading);
    const pieces: ReportPiece[] = [];
    let cursor = 0;
    const content = parts[at + 1] ?? "";
    const figure = /<figure\b[^>]*?(?:id="([^"]*)")?[^>]*>([\s\S]*?)<\/figure>/gi;
    for (let found = figure.exec(content); found; found = figure.exec(content)) {
      const before = content.slice(cursor, found.index);
      if (before.trim()) pieces.push({ kind: "html", html: before });
      const svg = /<svg\b[\s\S]*?<\/svg>/i.exec(found[2])?.[0];
      if (svg) {
        const caption = /<figcaption>([\s\S]*?)<\/figcaption>/i.exec(found[2])?.[1] ?? "";
        const read = readFigure(found[1] || `figure-${figures.length + 1}`, svg, caption);
        figures.push(read);
        pieces.push({ kind: "figure", figure: read });
      }
      cursor = found.index + found[0].length;
    }
    const tail = content.slice(cursor);
    if (tail.trim()) pieces.push({ kind: "html", html: tail });
    sections.push({
      id: `section-${sections.length + 1}`,
      number: numbered?.[1] ?? "",
      title: numbered?.[2] ?? heading,
      pieces,
    });
  }
  return { sections, figures };
}

/** The viewBox ratio of a drawn figure, so its frame can hold the right height before it loads. */
export function svgRatio(svg: string): number | null {
  const box = /viewBox\s*=\s*"\s*[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)\s*"/i.exec(svg);
  if (!box) return null;
  const [width, height] = [Number(box[1]), Number(box[2])];
  return width > 0 && height > 0 ? width / height : null;
}

// ---- the figures a package can hold, and why one is missing ----

export interface FigureSlot {
  key: string;
  kind: FigureKind;
  hypothesis: string | null;
  label: string;
  figure: ReportFigure | null;
  /** Why nothing was drawn; null when the figure exists. */
  missing: string | null;
}

const KIND_LABEL: Record<FigureKind, string> = {
  flow: "Rows used",
  lock: "Before and after the lock",
  specifications: "Specifications",
  sensitivity: "Sensitivity",
  shape: "Shape of the relation",
};

/** What the drawing code needs before it draws the figure (see Logos `research/package/figures.py`). */
const NEEDS: Record<FigureKind, string> = {
  flow: "needs the file's sources and how its rows were split",
  lock: "needs an estimate from the exploration rows and one from the confirmation rows",
  specifications: "needs more than one specification with an interval",
  sensitivity: "needs a sensitivity result for the main estimate",
  shape: "needs the exposure cut into at least three parts, each with an interval",
};

export function figureSlots(report: ParsedReport | null, summary: readonly PackageHypothesis[]): FigureSlot[] {
  const wanted: { kind: FigureKind; hypothesis: string | null }[] = [
    { kind: "flow", hypothesis: null },
    ...summary.flatMap((row) =>
      (["lock", "specifications", "sensitivity", "shape"] as const).map((kind) => ({
        kind,
        hypothesis: row.hypothesis_id,
      })),
    ),
  ];
  return wanted.map(({ kind, hypothesis }) => {
    const figure = report?.figures.find((f) => f.kind === kind && f.hypothesis === hypothesis) ?? null;
    const row = summary.find((r) => r.hypothesis_id === hypothesis);
    const noEstimate = row && typeof row.estimate !== "number";
    return {
      key: `${kind}:${hypothesis ?? "file"}`,
      kind,
      hypothesis,
      label: KIND_LABEL[kind],
      figure,
      missing: figure
        ? null
        : noEstimate
          ? `Not drawn: ${hypothesis ?? "the hypothesis"} has no estimate, so there is nothing to plot.`
          : `Not drawn: ${NEEDS[kind]}, and this run does not have it.`,
    };
  });
}

// ---- words for the three layers of a hypothesis ----

export type Tone = "ok" | "wait" | "bad";

const human = (code: string | null | undefined) =>
  code ? code.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase()) : "Not recorded";

const RUN: Record<string, [string, Tone]> = {
  computed: ["Computed", "ok"],
  not_computed: ["Not computed", "bad"],
  blocked: ["Blocked", "bad"],
  failed: ["Failed", "bad"],
};
const TEST: Record<string, [string, Tone]> = {
  supported: ["Supported", "ok"],
  not_supported: ["Not supported", "wait"],
  inconclusive: ["Inconclusive", "wait"],
  not_computed: ["No result", "bad"],
};
const CLAIM: Record<string, [string, Tone]> = {
  supported: ["Supported", "ok"],
  inconclusive: ["Inconclusive", "wait"],
  not_computed: ["No answer", "bad"],
};

const pick = (table: Record<string, [string, Tone]>, code: string | null | undefined): [string, Tone] =>
  (code ? table[code] : undefined) ?? [human(code), "wait"];

export interface HypothesisLayers {
  run: [string, Tone];
  test: [string, Tone];
  claim: [string, Tone];
}

export function layersOf(row: PackageHypothesis): HypothesisLayers {
  return {
    run: pick(RUN, row.execution_status),
    test: pick(TEST, row.verdict),
    claim: pick(CLAIM, row.claim_assessment?.value ?? (row.verdict === "not_computed" ? "not_computed" : null)),
  };
}

/** A number as a person reads it: a few significant digits, a real minus sign, no float noise. */
export function readable(value: number): string {
  const text = Number(value.toPrecision(4)).toLocaleString("en-US", { maximumFractionDigits: 4 });
  return text.replace("-", "−");
}

export const nextStepWords = (code: string | null) => (code ? human(code).toLowerCase() : null);

/** The report page as Logos built it, with a policy added that forbids script and network, for a tab of its own. */
export function pageWithPolicy(html: string): string {
  const meta =
    "<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; style-src 'unsafe-inline'; img-src data:\">";
  return /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (head) => `${head}${meta}`) : `${meta}${html}`;
}
