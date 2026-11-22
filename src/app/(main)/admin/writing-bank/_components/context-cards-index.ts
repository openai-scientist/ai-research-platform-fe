import type { BankStep, BankTechnique, Blueprint, BlueprintSection } from "@/lib/api/services/fetch-writing-bank";

import type { CardKind } from "./bank-colors";

/** Where a research context uses a card: the whole paper, a section, or one step of a move. */
export interface Usage {
  key: string;
  section: string | null;
  move: string | null;
  step: string | null;
}

/** One card a research context gives, with every place it is used. */
export interface CardRow {
  kind: CardKind;
  /** The bank the full entry lives in, to read it with its links. */
  collection: string;
  id: string;
  title: string;
  /** A frame's text keeps its `{slots}`, so the row can show them as gaps. */
  frame: boolean;
  summary: string | null;
  /** A level of the text, when the card states one (`paper` … `word`, `process`). */
  level: string | null;
  usedIn: Usage[];
  /** How many research contexts of the release give this card; 1 means it is this context's own. */
  shared: number | null;
}

const WHOLE_PAPER: Usage = { key: "paper", section: null, move: null, step: null };

function stepUsage(section: BlueprintSection, step: BankStep): Usage {
  const move = section.moves.find((item) => item.steps.includes(step.id));
  return { key: `${section.id}/${step.id}`, section: section.label, move: move?.name ?? null, step: step.name };
}

/** Adds a card, or one more place to a card already listed. */
function collect(rows: Map<string, CardRow>, row: Omit<CardRow, "usedIn" | "shared">, usage: Usage) {
  const key = `${row.collection}/${row.id}`;
  const held = rows.get(key) ?? { ...row, usedIn: [], shared: null };
  if (!held.usedIn.some((place) => place.key === usage.key)) held.usedIn.push(usage);
  rows.set(key, held);
}

/** The rule levels the bank's full entries give, by rule id; the blueprint carries rules without one. */
export type RuleLevels = Map<string, string>;

/**
 * Every card a research context gives, by kind: the rules of the whole paper, of each section and of each step;
 * the techniques made for its sections; the words, example sentences and overclaim checks of each step.
 */
export function contextCards(
  blueprint: Blueprint,
  techniques: BankTechnique[],
  ruleLevels: RuleLevels,
  shared: Record<string, number> | null,
): Record<CardKind, CardRow[]> {
  const rules = new Map<string, CardRow>();
  const words = new Map<string, CardRow>();
  const frames = new Map<string, CardRow>();
  const overclaims = new Map<string, CardRow>();
  const rule = (id: string, name: string, statement: string) => ({
    kind: "rules" as const,
    collection: "rules",
    id,
    title: name,
    frame: false,
    summary: statement,
    level: ruleLevels.get(id) ?? null,
  });

  for (const item of blueprint.wholePaper) collect(rules, rule(item.id, item.name, item.statement), WHOLE_PAPER);
  for (const section of blueprint.sections) {
    const whole: Usage = { key: section.id, section: section.label, move: null, step: null };
    for (const item of section.rules) collect(rules, rule(item.id, item.name, item.statement), whole);
    for (const step of section.steps) {
      const place = stepUsage(section, step);
      for (const item of step.rules) collect(rules, rule(item.id, item.name, item.statement), place);
      for (const set of step.words?.lexicalSets ?? [])
        collect(
          words,
          {
            kind: "words",
            collection: "lexical-sets",
            id: set.id,
            title: set.name,
            frame: false,
            summary: set.members.join(", "),
            level: "word",
          },
          place,
        );
      for (const word of step.words?.vocabulary ?? [])
        collect(
          words,
          {
            kind: "words",
            collection: "vocabulary",
            id: word.id,
            title: word.lemma,
            frame: false,
            summary: null,
            level: "word",
          },
          place,
        );
      for (const frame of step.frames)
        collect(
          frames,
          {
            kind: "frames",
            collection: "phrase-frames",
            id: frame.id,
            title: frame.text,
            frame: true,
            summary: null,
            level: "sentence",
          },
          place,
        );
      for (const item of step.overclaims ?? [])
        collect(
          overclaims,
          {
            kind: "overclaims",
            collection: "overclaims",
            id: item.id,
            title: item.name,
            frame: false,
            summary: item.overclaim,
            level: "sentence",
          },
          place,
        );
    }
  }

  const sectionsById = new Map<string, BlueprintSection[]>();
  for (const section of blueprint.sections)
    if (section.section) sectionsById.set(section.section, [...(sectionsById.get(section.section) ?? []), section]);
  const stepsById = new Map(
    blueprint.sections.flatMap((section) => section.steps.map((step) => [step.id, { section, step }] as const)),
  );
  const techniqueRows: CardRow[] = techniques.map((technique) => {
    const usedIn: Usage[] = [];
    if (technique.applies.anySection) usedIn.push({ key: "any", section: "Any section", move: null, step: null });
    for (const id of technique.applies.steps) {
      const found = stepsById.get(id);
      if (found) usedIn.push(stepUsage(found.section, found.step));
    }
    for (const id of technique.applies.sections)
      for (const section of sectionsById.get(id) ?? [])
        if (!usedIn.some((place) => place.section === section.label))
          usedIn.push({ key: section.id, section: section.label, move: null, step: null });
    return {
      kind: "techniques",
      collection: "techniques",
      id: technique.id,
      title: technique.name,
      frame: false,
      summary: technique.principle,
      level: technique.level,
      usedIn,
      shared: null,
    };
  });
  const withShare = (rows: CardRow[]) =>
    rows.map((row) => ({ ...row, shared: shared?.[`${row.collection}/${row.id}`] ?? null }));

  return {
    rules: withShare([...rules.values()]),
    techniques: withShare(techniqueRows),
    words: withShare([...words.values()]),
    frames: withShare([...frames.values()]),
    overclaims: withShare([...overclaims.values()]),
  };
}

/** "Introduction › Frame the field › Assert importance", or "Whole paper". */
export function usageText(usage: Usage) {
  if (!usage.section) return "Whole paper";
  return [usage.section, usage.move, usage.step].filter(Boolean).join(" › ");
}
