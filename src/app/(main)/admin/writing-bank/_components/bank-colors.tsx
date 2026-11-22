import { cn } from "cn";

import { Badge } from "@/components/ui/badge";

import { humanize } from "./writing-bank-format";

/**
 * The five levels of a paper's text, from the whole paper down to its words, as one blue ramp: the darker the
 * shade, the larger the unit. A technique about the writing process sits apart, in grey.
 */
export const TEXT_LEVELS = ["paper", "section", "paragraph", "sentence", "word"] as const;
export type TextLevel = (typeof TEXT_LEVELS)[number];

const LEVEL_CLASSES: Record<string, string> = {
  paper: "border-transparent bg-blue-800 text-white dark:bg-blue-600",
  section: "border-transparent bg-blue-600 text-white dark:bg-blue-500",
  paragraph: "border-transparent bg-blue-400 text-blue-950 dark:bg-blue-400",
  sentence: "border-blue-300 bg-blue-100 text-blue-950 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-100",
  word: "border-blue-200 bg-background text-blue-900 dark:border-blue-800 dark:text-blue-200",
  process: "border-border bg-muted text-foreground",
  // Moves and steps are the bank's own units of a section: a move spans paragraphs, a step a sentence or two.
  move: "border-transparent bg-blue-400 text-blue-950 dark:bg-blue-400",
  step: "border-blue-300 bg-blue-100 text-blue-950 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-100",
};

export const LEVEL_LABELS: Record<string, string> = {
  paper: "Paper",
  section: "Section",
  paragraph: "Paragraph",
  sentence: "Sentence",
  word: "Word",
  process: "Process",
  move: "Move",
  step: "Step",
};

/** A level of the text, in its shade of the ramp. Moves and steps are the bank's own units of a section. */
export function LevelBadge({
  level,
  className,
  children,
}: {
  readonly level: string;
  readonly className?: string;
  /** Text in place of the level's name, such as "Move 2". */
  readonly children?: React.ReactNode;
}) {
  const shade = LEVEL_CLASSES[level] ?? LEVEL_CLASSES.process;
  return (
    <Badge variant="outline" className={cn("font-medium", shade, className)}>
      {children ?? LEVEL_LABELS[level] ?? humanize(level)}
    </Badge>
  );
}

/** The kinds of card the bank gives a research context, each with its own colour on every screen. */
export type CardKind = "rules" | "techniques" | "words" | "frames" | "overclaims";

export const CARD_KINDS: Record<CardKind, { label: string; one: string; className: string; dot: string }> = {
  rules: {
    label: "Rules",
    one: "Rule",
    className: "border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-100",
    dot: "bg-sky-500",
  },
  techniques: {
    label: "Techniques",
    one: "Technique",
    className: "border-teal-300 bg-teal-50 text-teal-900 dark:border-teal-800 dark:bg-teal-950 dark:text-teal-100",
    dot: "bg-teal-500",
  },
  words: {
    label: "Words",
    one: "Words",
    className:
      "border-orange-300 bg-orange-50 text-orange-900 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-100",
    dot: "bg-orange-500",
  },
  frames: {
    label: "Example sentences",
    one: "Example sentence",
    className:
      "border-slate-300 bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
    dot: "bg-slate-500",
  },
  overclaims: {
    label: "Overclaims",
    one: "Overclaim",
    className: "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-100",
    dot: "bg-rose-500",
  },
};

/** The bank a card's entry lives in, for the cards a research context gives. */
export function cardKindOf(collection: string): CardKind | null {
  if (collection === "rules" || collection === "techniques" || collection === "overclaims") return collection;
  if (collection === "vocabulary" || collection === "lexical-sets") return "words";
  if (collection === "phrase-frames") return "frames";
  return null;
}

export function CardKindBadge({ kind, className }: { readonly kind: CardKind; readonly className?: string }) {
  const { one, className: tint, dot } = CARD_KINDS[kind];
  return (
    <Badge variant="outline" className={cn("gap-1.5 font-medium", tint, className)}>
      <span className={cn("size-1.5 rounded-full", dot)} aria-hidden="true" />
      {one}
    </Badge>
  );
}
