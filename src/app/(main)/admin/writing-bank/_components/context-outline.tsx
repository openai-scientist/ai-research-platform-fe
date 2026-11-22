"use client";

import { useState } from "react";

import { cn } from "cn";
import { ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type {
  BankStep,
  BankTechnique,
  Blueprint,
  BlueprintSection,
  JournalSummary,
} from "@/lib/api/services/fetch-writing-bank";

import { CARD_KINDS, type CardKind, LevelBadge } from "./bank-colors";
import { type CardOpener, StepSheet } from "./step-sheet";
import { ExpectationBadge } from "./writing-bank-badges";
import { breadthLabel, KIND_LABELS, plural, venueSectionName } from "./writing-bank-format";

/** How wide a sentence speaks, as a share of the widest: the field, a research area, a niche, this study. */
const BREADTH_WIDTH: Record<string, number> = { field: 100, area: 76, niche: 52, study: 30 };

/** A band's shade by how wide its paragraph opens: the wider it speaks, the darker the blue. */
const BREADTH_FILL: Record<string, { band: string; text: string }> = {
  field: {
    band: "fill-blue-800 stroke-blue-900 dark:fill-blue-500 dark:stroke-blue-400",
    text: "text-white dark:text-blue-950",
  },
  area: { band: "fill-blue-600 stroke-blue-700 dark:fill-blue-700 dark:stroke-blue-500", text: "text-white" },
  niche: {
    band: "fill-blue-300 stroke-blue-500 dark:fill-blue-900 dark:stroke-blue-600",
    text: "text-blue-950 dark:text-blue-50",
  },
  study: {
    band: "fill-blue-100 stroke-blue-400 dark:fill-blue-950 dark:stroke-blue-700",
    text: "text-blue-950 dark:text-blue-100",
  },
};

function scopeText(opening: string | undefined, closing: string | undefined) {
  const from = breadthLabel(opening);
  const to = breadthLabel(closing);
  if (!from || !to) return "";
  return from === to ? from : `${from} → ${to}`;
}

function Heading({ children }: { readonly children: React.ReactNode }) {
  return <h4 className="font-semibold text-foreground text-sm">{children}</h4>;
}

/**
 * A section's paragraphs as the bands of an hourglass: each band's top edge is how wide its opening sentence speaks,
 * its bottom edge how wide its closing sentence speaks.
 */
function ParagraphShape({ section }: { readonly section: BlueprintSection }) {
  if (section.paragraphs.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <Heading>Paragraphs</Heading>
      <ol className="flex flex-col gap-2 sm:gap-0">
        {section.paragraphs.map((paragraph, index) => {
          const opening = paragraph.breadth?.opening ?? "";
          const top = BREADTH_WIDTH[opening] ?? 60;
          const bottom = BREADTH_WIDTH[paragraph.breadth?.closing ?? ""] ?? top;
          const shade = BREADTH_FILL[opening] ?? BREADTH_FILL.niche;
          const shape = paragraph.pattern?.parts.map((part) => part.name).join(" → ");
          return (
            <li
              // A paragraph type can occur twice in a plan, and the plan never reorders: its place is its key.
              // biome-ignore lint/suspicious/noArrayIndexKey: the plan's order is fixed by the bank
              key={`${paragraph.type}-${index}`}
              className="grid grid-cols-[minmax(0,1fr)] gap-1.5 sm:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] sm:gap-5"
            >
              <div className="min-w-0 sm:py-2">
                <p className="text-sm">
                  <span className="font-semibold tabular-nums">{index + 1}. </span>
                  <span className="font-semibold">{paragraph.name}</span>
                  {paragraph.repeats && <span className="text-muted-foreground"> · one or more</span>}
                  {paragraph.optional && <span className="text-muted-foreground"> · optional</span>}
                </p>
                {shape && <p className="text-foreground/75 text-xs leading-relaxed">{shape}</p>}
              </div>
              <div className="relative h-10 sm:h-auto sm:min-h-12">
                <svg
                  viewBox="0 0 100 32"
                  preserveAspectRatio="none"
                  className="absolute inset-0 size-full"
                  aria-hidden="true"
                >
                  <polygon
                    points={`${50 - top / 2},0 ${50 + top / 2},0 ${50 + bottom / 2},32 ${50 - bottom / 2},32`}
                    className={shade.band}
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
                <span
                  className={cn(
                    "relative flex h-full items-center justify-center px-2 text-center font-medium text-xs",
                    shade.text,
                  )}
                >
                  {scopeText(paragraph.breadth?.opening, paragraph.breadth?.closing)}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="text-foreground/70 text-xs">
        Each band is a paragraph: its top edge is how wide the opening sentence speaks, its bottom edge how wide the
        closing one speaks. Each shade of blue marks where the paragraph opens: the field, a research area, a niche or
        this study.
      </p>
    </div>
  );
}

/** What each kind of card is called when counted. */
const COUNT_NAMES: Record<CardKind, [string, string]> = {
  frames: ["example sentence", "example sentences"],
  rules: ["rule", "rules"],
  words: ["word entry", "word entries"],
  techniques: ["technique", "techniques"],
  overclaims: ["overclaim", "overclaims"],
};

/** What the bank gives a step, each count named in words and set in its kind's colour. */
function StepCards({ counts }: { readonly counts: [CardKind, number][] }) {
  const shown = counts.filter(([, count]) => count > 0);
  if (!shown.length) return <span className="text-muted-foreground text-xs">No cards</span>;
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Cards of the step">
      {shown.map(([kind, count]) => (
        <li key={kind}>
          <Badge variant="outline" className={cn("font-medium tabular-nums", CARD_KINDS[kind].className)}>
            {plural(count, COUNT_NAMES[kind][0], COUNT_NAMES[kind][1])}
          </Badge>
        </li>
      ))}
    </ul>
  );
}

function stepCounts(step: BankStep, techniques: BankTechnique[]): [CardKind, number][] {
  return [
    ["frames", step.frames.length],
    ["rules", step.rules.length],
    ["words", (step.words?.lexicalSets.length ?? 0) + (step.words?.vocabulary.length ?? 0)],
    ["techniques", techniques.filter((technique) => technique.applies.steps.includes(step.id)).length],
    ["overclaims", step.overclaims?.length ?? 0],
  ];
}

/**
 * A section's moves, each a heading in the move's shade, with its steps hung under it on a line: no box inside the
 * section's own box. A step opens beside the outline.
 */
function MovesList({
  section,
  techniques,
  onOpenStep,
}: {
  readonly section: BlueprintSection;
  readonly techniques: BankTechnique[];
  readonly onOpenStep: (step: BankStep) => void;
}) {
  const steps = new Map(section.steps.map((step) => [step.id, step]));
  // The paragraph that carries each step, by its number in the section.
  const paragraphOf = new Map<string, number>();
  section.paragraphs.forEach((paragraph, index) => {
    for (const slot of paragraph.slots)
      for (const id of slot.steps) if (!paragraphOf.has(id)) paragraphOf.set(id, index + 1);
  });
  return (
    <div className="flex flex-col gap-3">
      <Heading>Moves and steps</Heading>
      <ol className="flex flex-col gap-5">
        {section.moves.map((move, moveIndex) => (
          <li key={move.id} className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <LevelBadge level="move" className="tabular-nums">
                Move {moveIndex + 1}
              </LevelBadge>
              <p className="min-w-0 flex-1 font-semibold text-sm">{move.name}</p>
              <ExpectationBadge expectation={move.expectation} />
            </div>
            <ol className="ml-3 flex flex-col border-blue-300 border-l-2 pl-3 dark:border-blue-700">
              {move.steps.map((id, stepIndex) => {
                const step = steps.get(id);
                if (!step) return null;
                const paragraph = paragraphOf.get(id);
                return (
                  <li key={id}>
                    <Button
                      variant="ghost"
                      onClick={() => onOpenStep(step)}
                      className="h-auto w-full items-start justify-start gap-3 whitespace-normal rounded-md px-2 py-2.5 text-left font-normal"
                    >
                      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <span className="font-medium text-sm">
                            <span className="tabular-nums">{stepIndex + 1}. </span>
                            {step.name}
                          </span>
                          <span className="text-foreground/70 text-xs">
                            {step.span === "paragraph" ? "A paragraph" : "One sentence"}
                            {paragraph ? ` · paragraph ${paragraph}` : ""}
                          </span>
                          <span className="sm:hidden">
                            <ExpectationBadge expectation={step.expectation} />
                          </span>
                        </span>
                        <StepCards counts={stepCounts(step, techniques)} />
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="hidden sm:inline-flex">
                          <ExpectationBadge expectation={step.expectation} />
                        </span>
                        <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
                      </span>
                    </Button>
                  </li>
                );
              })}
            </ol>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** The venue's own section a context section is written under: the same name, else the venue's catch-all. */
function venueSectionOf(section: BlueprintSection, venueSections: string[]) {
  const same = venueSections.find((name) => name.toLowerCase() === section.section);
  if (same) return venueSectionName(same);
  return venueSections.includes("OTHER") ? venueSectionName("OTHER") : null;
}

/**
 * The research context's outline: the venue's frame, then each section of the paper with its paragraphs (as the
 * bands of an hourglass) and its moves and steps. A step opens beside the outline with its examples, words, rules,
 * techniques and checks.
 */
export function ContextOutline({
  journal,
  blueprint,
  techniques,
  designIds,
  onOpenCard,
}: {
  readonly journal: JournalSummary;
  readonly blueprint: Blueprint;
  readonly techniques: BankTechnique[];
  readonly designIds: string[];
  readonly onOpenCard: CardOpener;
}) {
  const [opened, setOpened] = useState<{ section: BlueprintSection; step: BankStep } | null>(null);
  const required = blueprint.sections.filter((section) => section.required).length;
  const kind = KIND_LABELS[journal.kind] ?? "Venue";
  return (
    <Card className="gap-0 py-0">
      <CardHeader className="gap-3 border-b py-4">
        <div className="flex flex-col gap-2">
          <p className="font-medium">
            {kind} frame · {journal.name}
          </p>
          {journal.sections.length > 0 ? (
            <ol className="flex flex-wrap items-center gap-x-1 gap-y-1.5 text-sm" aria-label="The venue's sections">
              {journal.sections.map((name, index) => (
                <li key={name} className="flex items-center gap-1">
                  {index > 0 && <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden="true" />}
                  <span className="rounded-md border bg-background px-2 py-0.5">{venueSectionName(name)}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-muted-foreground text-sm">The venue lists no sections of its own.</p>
          )}
        </div>
        <p className="text-sm">
          This context writes {plural(blueprint.sections.length, "section")}, {required} required. Open a section for
          its paragraphs, moves and steps.
        </p>
      </CardHeader>
      <CardContent className="px-0">
        <ol className="divide-y">
          {blueprint.sections.map((section, index) => {
            const venue = venueSectionOf(section, journal.sections);
            return (
              <li key={section.id}>
                <Collapsible className="group/section">
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="h-auto w-full items-start justify-start gap-3 whitespace-normal rounded-none px-4 py-3 text-left font-normal"
                    >
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-blue-600 font-semibold text-white text-xs tabular-nums">
                        {index + 1}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-base">{section.label}</span>
                          {!section.required && <Badge variant="outline">Optional</Badge>}
                        </span>
                        <span className="text-foreground/70 text-sm">
                          {[
                            venue ? `In the venue's ${venue}` : null,
                            section.paragraphs.length ? plural(section.paragraphs.length, "paragraph") : null,
                            plural(section.moves.length, "move"),
                            plural(section.steps.length, "step"),
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                      <ChevronRight
                        className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]/section:rotate-90"
                        aria-hidden="true"
                      />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="flex flex-col gap-6 border-t px-4 pt-4 pb-6 sm:pl-13">
                      {section.purpose && <p className="text-sm leading-relaxed">{section.purpose}</p>}
                      <ParagraphShape section={section} />
                      <MovesList
                        section={section}
                        techniques={techniques}
                        onOpenStep={(step) => setOpened({ section, step })}
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </li>
            );
          })}
        </ol>
      </CardContent>
      <StepSheet
        section={opened?.section ?? null}
        step={opened?.step ?? null}
        techniques={techniques}
        designIds={designIds}
        onClose={() => setOpened(null)}
        onOpenCard={onOpenCard}
      />
    </Card>
  );
}
