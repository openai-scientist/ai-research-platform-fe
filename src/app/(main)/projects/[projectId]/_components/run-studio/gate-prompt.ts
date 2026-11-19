export interface GatePromptSection {
  label: string;
  text: string;
  breakBefore?: boolean;
}

export type GatePrompt =
  | { kind: "labelled"; question: GatePromptSection; essential: GatePromptSection[]; more: GatePromptSection[] }
  | { kind: "paragraphs"; paragraphs: string[] };

export type GatePromptToken =
  | { kind: "text"; text: string }
  | { kind: "column"; text: string }
  | { kind: "fill-count"; filled: string; total: string };

const LABEL = /^([\p{L}][\p{L}\p{N} /-]{0,35}):\s+(.*)$/u;
const INLINE_IDEA = /\s+(The idea):\s+/i;
const COLUMN_IDENTIFIER = /^([a-z][a-z0-9_]*)(?=:|$)/;
const FILL_COUNT = /\bFilled in (\d+) of (\d+) rows\b/i;

/** The quoted data name and row count in a The data shows line, left as text when they do not match. */
export function parseGatePromptTokens(text: string): GatePromptToken[] {
  const tokens: GatePromptToken[] = [];
  const column = text.match(COLUMN_IDENTIFIER);
  let remaining = text;
  if (column !== null) {
    tokens.push({ kind: "column", text: column[1] });
    remaining = text
      .slice(column[0].length)
      .replace(/^\s*:\s*/, "")
      .trimStart();
  }

  const fillCount = remaining.match(FILL_COUNT);
  if (fillCount === null) {
    if (remaining) tokens.push({ kind: "text", text: remaining });
    return tokens.length ? tokens : [{ kind: "text", text }];
  }

  const fillIndex = fillCount.index ?? remaining.search(FILL_COUNT);
  const before = remaining.slice(0, fillIndex);
  if (before) tokens.push({ kind: "text", text: before });
  tokens.push({ kind: "fill-count", filled: fillCount[1], total: fillCount[2] });
  const after = remaining.slice(fillIndex + fillCount[0].length).replace(/^[.:]+/, "");
  if (after.trim()) tokens.push({ kind: "text", text: after });
  return tokens;
}

function splitIdea(section: GatePromptSection): GatePromptSection[] {
  const match = INLINE_IDEA.exec(section.text);
  if (!match || match.index === undefined) return [section];
  const ideaStart = match.index + match[0].length;
  const before = section.text.slice(0, match.index).trimEnd();
  const idea = section.text.slice(ideaStart).trimStart();
  return [...(before ? [{ ...section, text: before }] : []), { label: match[1], text: idea }];
}

function parseSection(label: string, text: string, breakBefore?: boolean): GatePromptSection {
  const normalizedText =
    label.toLowerCase() === "the data shows" ? text.replace(/\s*\(the assistant['’]s reading\)/gi, "") : text;
  return { label, text: normalizedText.trim(), ...(breakBefore ? { breakBefore: true } : {}) };
}

export function parseGatePrompt(prompt: string): GatePrompt {
  const lines = prompt.split(/\r?\n/);
  const first = lines.find((line) => line.trim());
  if (!first || !LABEL.test(first)) {
    return {
      kind: "paragraphs",
      paragraphs: prompt
        .split(/\n\s*\n/)
        .map((part) => part.trim())
        .filter(Boolean),
    };
  }

  const sections: GatePromptSection[] = [];
  let breakBefore = false;
  for (const line of lines) {
    if (!line.trim()) {
      if (sections.length) breakBefore = true;
      continue;
    }
    const match = LABEL.exec(line);
    if (match) {
      sections.push(...splitIdea(parseSection(match[1].trim(), match[2].trim(), breakBefore)));
      breakBefore = false;
    } else if (sections.length) {
      sections[sections.length - 1].text += `\n${line.trim()}`;
    } else {
      sections.push({ label: "", text: line.trim() });
    }
  }

  const questionIndex = sections.findIndex((section) => section.label.toLowerCase() === "decision");
  const [question] = sections.splice(questionIndex === -1 ? 0 : questionIndex, 1);
  const essential: GatePromptSection[] = [];
  const more: GatePromptSection[] = [];
  for (const section of sections) {
    if (section.label.toLowerCase() === "suggested") continue;
    if (["the data shows", "risk"].includes(section.label.toLowerCase())) essential.push(section);
    else more.push(section);
  }

  return { kind: "labelled", question, essential, more };
}
