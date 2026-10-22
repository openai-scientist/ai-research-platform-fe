// Review findings as the run studio shows them: how serious, which part of a hypothesis, in what order.

import type { ReviewFinding } from "@/lib/run-stream/contract";

export const FINDING_SEVERITY: Record<
  ReviewFinding["severity"],
  { label: string; text: string; bar: string; dot: string }
> = {
  blocking: { label: "Blocking", text: "text-rose-700 dark:text-rose-300", bar: "border-rose-500", dot: "bg-rose-500" },
  major: { label: "Major", text: "text-amber-800 dark:text-amber-300", bar: "border-amber-500", dot: "bg-amber-500" },
  minor: { label: "Minor", text: "text-muted-foreground", bar: "border-foreground/20", dot: "bg-muted-foreground/50" },
};

/** The card's own names for the fields a finding points at, where it has one. */
export const FINDING_FIELD: Record<string, string> = {
  statement: "Claim",
  novelty: "Why it's new",
  rationale: "Why it should hold",
  falsification_criteria: "Wrong if",
  falsify: "Wrong if",
};

/** `hypothesis:H1/falsification_criteria` → H1 and its field. */
export function findingTarget(locator: string) {
  const [id = "", field = ""] = locator.replace(/^(hypothesis|item):/, "").split("/");
  const words = field.replaceAll("_", " ");
  return { id, field: FINDING_FIELD[field] ?? (words ? words[0].toUpperCase() + words.slice(1) : "") };
}

export const bySeverity = (a: ReviewFinding, b: ReviewFinding) =>
  Object.keys(FINDING_SEVERITY).indexOf(a.severity) - Object.keys(FINDING_SEVERITY).indexOf(b.severity);

/** The parts of a hypothesis a finding of your own can point at; an empty key is the hypothesis as a whole. */
export const FINDING_TARGETS: { key: string; label: string }[] = [
  { key: "", label: "Whole hypothesis" },
  { key: "statement", label: "Claim" },
  { key: "novelty", label: "Why it's new" },
  { key: "rationale", label: "Why it should hold" },
  { key: "falsification_criteria", label: "Wrong if" },
  { key: "prediction", label: "Prediction" },
  { key: "exposure", label: "Exposure" },
  { key: "outcome", label: "Outcome" },
  { key: "estimand", label: "Estimand" },
  { key: "method", label: "Method" },
  { key: "conditions", label: "Conditions" },
];

/** The categories the review contract knows. */
export const FINDING_CATEGORIES = [
  "reproducibility",
  "statistics",
  "evidence",
  "baseline",
  "control",
  "leakage",
  "other",
] as const;
