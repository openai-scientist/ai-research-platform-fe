// A revision round of a pipeline run: the hypotheses before and after, rebuilt from the engine's diff of
// `hypotheses.md` (`revision.diff/v1`), compared field by field and word by word.

/** One hypothesis as `hypotheses.md` writes it: `## H1: statement`, then `- **Field:** value` lines. */
export interface HypothesisText {
  id: string;
  statement: string;
  /** Field label and value, in the order written. A nested list (limitations) is joined into its field. */
  fields: { label: string; value: string }[];
}

/** The two sides of a unified diff: the lines each side holds. Hunk headers and file names are left out. */
export function sidesOfPatch(patch: string): { before: string; after: string } {
  const before: string[] = [];
  const after: string[] = [];
  for (const line of patch.split("\n")) {
    if (line.startsWith("---") || line.startsWith("+++") || line.startsWith("@@") || line.startsWith("\\")) continue;
    const mark = line[0];
    const text = line.slice(1);
    if (mark === " " || mark === "-") before.push(text);
    if (mark === " " || mark === "+") after.push(text);
  }
  return { before: before.join("\n"), after: after.join("\n") };
}

const HEADING = /^##\s+(H\d+):\s*(.*)$/;
const FIELD = /^-\s+\*\*(.+?):\*\*\s*(.*)$/;
const NESTED = /^\s{2,}-\s+(.*)$/;

/** The hypotheses written in a `hypotheses.md`, by id. */
export function parseHypotheses(markdown: string): Map<string, HypothesisText> {
  const out = new Map<string, HypothesisText>();
  let current: HypothesisText | null = null;
  for (const line of markdown.split("\n")) {
    const heading = HEADING.exec(line);
    if (heading) {
      current = { id: heading[1], statement: heading[2].trim(), fields: [] };
      out.set(current.id, current);
      continue;
    }
    if (!current) continue;
    const field = FIELD.exec(line);
    if (field) {
      current.fields.push({ label: field[1].trim(), value: field[2].trim() });
      continue;
    }
    const nested = NESTED.exec(line);
    const last = current.fields[current.fields.length - 1];
    if (nested && last) last.value = last.value ? `${last.value}\n${nested[1].trim()}` : nested[1].trim();
  }
  return out;
}

/** How one field of a hypothesis changed between the two rounds. */
export interface FieldChange {
  label: string;
  before: string | null;
  after: string | null;
}

/** The fields of a hypothesis that changed, the claim first, and the labels of those that did not. */
export function compareHypothesis(before: HypothesisText | undefined, after: HypothesisText | undefined) {
  const changed: FieldChange[] = [];
  const same: string[] = [];
  const claimBefore = before?.statement ?? null;
  const claimAfter = after?.statement ?? null;
  if (claimBefore !== claimAfter) changed.push({ label: "Claim", before: claimBefore, after: claimAfter });
  const labels = [...new Set([...(before?.fields ?? []), ...(after?.fields ?? [])].map((f) => f.label))];
  for (const label of labels) {
    const a = before?.fields.find((f) => f.label === label)?.value ?? null;
    const b = after?.fields.find((f) => f.label === label)?.value ?? null;
    if (a === b) same.push(label);
    else changed.push({ label, before: a, after: b });
  }
  return { changed, same };
}

export type DiffPart = { kind: "same" | "added" | "removed"; text: string };

/** Longest-common-subsequence diff of two texts by words, the spaces kept with the word before them. */
export function diffWords(before: string, after: string): DiffPart[] {
  const a = before.match(/\S+\s*/g) ?? [];
  const b = after.match(/\S+\s*/g) ?? [];
  const key = (w: string) => w.trim();
  const lcs = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      lcs[i][j] = key(a[i]) === key(b[j]) ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
  const parts: DiffPart[] = [];
  const push = (kind: DiffPart["kind"], text: string) => {
    const last = parts[parts.length - 1];
    if (last?.kind === kind) last.text += text;
    else parts.push({ kind, text });
  };
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (key(a[i]) === key(b[j])) {
      push("same", b[j]);
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) push("removed", a[i++]);
    else push("added", b[j++]);
  }
  while (i < a.length) push("removed", a[i++]);
  while (j < b.length) push("added", b[j++]);
  return parts;
}

/** Share of the words of the longer text the two keep in common: near 0 for a rewrite, 1 when unchanged. */
export function overlap(parts: DiffPart[]) {
  const words = (kind: DiffPart["kind"]) =>
    parts.filter((p) => p.kind === kind).reduce((n, p) => n + (p.text.match(/\S+/g)?.length ?? 0), 0);
  const same = words("same");
  const longest = Math.max(same + words("removed"), same + words("added"));
  return longest ? same / longest : 1;
}
