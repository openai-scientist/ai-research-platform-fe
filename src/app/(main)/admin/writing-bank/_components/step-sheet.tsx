"use client";

import { cn } from "cn";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { BankStep, BankTechnique, BlueprintSection } from "@/lib/api/services/fetch-writing-bank";

import { CARD_KINDS, type CardKind } from "./bank-colors";
import { contextStandards, FRAMING_ELEMENTS, useBankReference } from "./bank-reference";
import { LevelMark, SlotText } from "./reference-sheets";
import { ExpectationBadge } from "./writing-bank-badges";
import { breadthLabel, spanLabel, stepReasons, strengthLabel, usesLabel } from "./writing-bank-format";

/** A frame's text with each `{slot}` shown as the gap a writer fills. */
export function FrameText({ text }: { readonly text: string }) {
  const parts = text.split(/(\{[^{}]+\})/g).filter(Boolean);
  return (
    <>
      {parts.map((part, index) =>
        /^\{[^{}]+\}$/.test(part) ? (
          <span
            // Parts repeat ("{x} … {x}"), so the index keeps keys unique; the list never reorders.
            // biome-ignore lint/suspicious/noArrayIndexKey: a static split of one string
            key={index}
            className="rounded bg-muted px-1 font-mono text-[0.8125rem] text-muted-foreground"
          >
            {part.slice(1, -1).replaceAll("_", " ")}
          </span>
        ) : (
          // biome-ignore lint/suspicious/noArrayIndexKey: a static split of one string
          <span key={index}>{part}</span>
        ),
      )}
    </>
  );
}

function Part({
  title,
  count,
  children,
}: {
  readonly title: string;
  readonly count?: number;
  readonly children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2 border-t pt-4 first:border-t-0">
      <h3 className="flex items-center gap-2 font-medium text-sm">
        {title}
        {count != null && <span className="text-muted-foreground tabular-nums">{count}</span>}
      </h3>
      {children}
    </section>
  );
}

/** Opens one card of the bank by where it lives, its id and its title. */
export type CardOpener = (collection: string, id: string, title: string) => void;

/** A card named in the step, as a row that opens it: the colour of its kind, its title, a line under it. */
function CardLink({
  kind,
  title,
  line,
  onOpen,
}: {
  readonly kind: CardKind;
  readonly title: React.ReactNode;
  readonly line?: string | null;
  readonly onOpen: () => void;
}) {
  return (
    <li>
      <Button
        variant="ghost"
        className="h-auto w-full items-start justify-start gap-2.5 whitespace-normal px-2 py-1.5 text-left font-normal"
        onClick={onOpen}
      >
        <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", CARD_KINDS[kind].dot)} aria-hidden="true" />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm">{title}</span>
          {line && <span className="text-muted-foreground text-xs leading-relaxed">{line}</span>}
        </span>
      </Button>
    </li>
  );
}

/** Everything the bank gives for writing one sentence: examples, words, rules, and what not to claim. */
/**
 * The parts of a Toulmin argument, with the ones the step states filled in: what the step argues, beside what it
 * leaves to other steps.
 */
function ArgumentParts({
  step,
  elements,
}: {
  readonly step: BankStep;
  readonly elements: { id: string; name: string; role: string }[];
}) {
  const stated = new Set(step.argumentElements.map((element) => element.id));
  if (stated.size === 0 || elements.length === 0) return null;
  return (
    <Part title="Argument it carries">
      <ul className="flex flex-wrap gap-1.5" aria-label="Parts of the argument">
        {elements.map((element) => (
          <li key={element.id}>
            <Badge
              variant="outline"
              className={cn(
                "font-medium",
                stated.has(element.id)
                  ? "border-transparent bg-blue-600 text-white dark:bg-blue-500"
                  : "border-dashed text-foreground/60",
              )}
            >
              {element.name}
              <span className="sr-only">{stated.has(element.id) ? " (stated here)" : " (not stated here)"}</span>
            </Badge>
          </li>
        ))}
      </ul>
      <dl className="flex flex-col gap-2 text-sm">
        {elements
          .filter((element) => stated.has(element.id))
          .map((element) => (
            <div key={element.id} className="flex flex-col gap-0.5">
              <dt className="font-medium">{element.name}</dt>
              <dd className="text-foreground/75 leading-relaxed">{element.role}</dd>
            </div>
          ))}
      </dl>
    </Part>
  );
}

function StepDetail({
  section,
  step,
  techniques,
  designIds,
  onOpenCard,
}: {
  readonly section: BlueprintSection;
  readonly step: BankStep;
  readonly techniques: BankTechnique[];
  readonly designIds: string[];
  readonly onOpenCard: CardOpener;
}) {
  const reference = useBankReference(true);
  const framing = reference.framing.filter((type) => type.steps.includes(step.id));
  const reporting = contextStandards(designIds, reference).flatMap(({ standard }) =>
    standard.groups.flatMap((group) =>
      group.items.filter((item) => item.steps.includes(step.id)).map((item) => ({ standard: standard.name, item })),
    ),
  );
  const made = techniques.filter((technique) => technique.applies.steps.includes(step.id));
  const moveIndex = section.moves.findIndex((move) => move.steps.includes(step.id));
  const move = section.moves[moveIndex];
  const breadth = breadthLabel(step.breadth);
  const uses = usesLabel(step.uses);
  const facts = [spanLabel(step.span), breadth ? `speaks of ${breadth}` : null].filter(Boolean).join(" · ");
  const wordSets = step.words?.lexicalSets ?? [];
  const vocabulary = step.words?.vocabulary ?? [];
  const overclaims = step.overclaims ?? [];
  const threats = step.threats ?? [];
  const why = stepReasons(step.reasons);
  return (
    <>
      <SheetHeader className="gap-2 border-b pr-12">
        <p className="text-muted-foreground text-sm">
          {section.label}
          {move && ` · Move ${moveIndex + 1}: ${move.name}`}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <SheetTitle className="text-lg">{step.name}</SheetTitle>
          <ExpectationBadge expectation={step.expectation} />
        </div>
        <SheetDescription className="text-foreground text-sm leading-relaxed">{step.purpose}</SheetDescription>
        {(facts || uses) && (
          <p className="text-muted-foreground text-sm">
            {[facts, uses ? `written from the study's ${uses}` : null].filter(Boolean).join(" · ")}
          </p>
        )}
      </SheetHeader>
      <div className="flex flex-col gap-4 overflow-y-auto px-4 pb-6">
        <ArgumentParts step={step} elements={reference.elements} />
        {framing.length > 0 && (
          <Part title="How to frame it" count={framing.length}>
            <ul className="flex flex-col gap-3">
              {framing.map((type) => (
                <li key={type.id} className="flex flex-col gap-1">
                  <p className="text-sm">
                    <span className="font-medium">{type.name}</span>
                    <span className="text-foreground/60">
                      {" "}
                      · {FRAMING_ELEMENTS.find(([key]) => key === type.element)?.[1] ?? type.element}
                    </span>
                  </p>
                  <p className="text-foreground/75 text-sm leading-relaxed">{type.definition}</p>
                  {type.template[0] && (
                    <p className="text-sm leading-relaxed">
                      <SlotText text={type.template[0]} />
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </Part>
        )}
        {step.frames.length > 0 && (
          <Part title="Example sentences" count={step.frames.length}>
            <ul className="flex flex-col">
              {step.frames.map((frame) => (
                <CardLink
                  key={frame.id}
                  kind="frames"
                  title={<FrameText text={frame.text} />}
                  line={strengthLabel(frame.expressedStrength)}
                  onOpen={() => onOpenCard("phrase-frames", frame.id, frame.text)}
                />
              ))}
            </ul>
          </Part>
        )}
        {(wordSets.length > 0 || vocabulary.length > 0) && (
          <Part title="Words" count={wordSets.length + vocabulary.length}>
            <ul className="flex flex-col">
              {wordSets.map((set) => (
                <CardLink
                  key={set.id}
                  kind="words"
                  title={set.name}
                  line={set.members.join(", ")}
                  onOpen={() => onOpenCard("lexical-sets", set.id, set.name)}
                />
              ))}
              {vocabulary.map((word) => (
                <CardLink
                  key={word.id}
                  kind="words"
                  title={word.lemma}
                  onOpen={() => onOpenCard("vocabulary", word.id, word.lemma)}
                />
              ))}
            </ul>
          </Part>
        )}
        {step.rules.length > 0 && (
          <Part title="Rules" count={step.rules.length}>
            <ul className="flex flex-col">
              {step.rules.map((rule) => (
                <CardLink
                  key={rule.id}
                  kind="rules"
                  title={rule.name}
                  line={rule.statement}
                  onOpen={() => onOpenCard("rules", rule.id, rule.name)}
                />
              ))}
            </ul>
          </Part>
        )}
        {made.length > 0 && (
          <Part title="Techniques" count={made.length}>
            <ul className="flex flex-col">
              {made.map((technique) => (
                <CardLink
                  key={technique.id}
                  kind="techniques"
                  title={technique.name}
                  line={technique.principle}
                  onOpen={() => onOpenCard("techniques", technique.id, technique.name)}
                />
              ))}
            </ul>
          </Part>
        )}
        {overclaims.length > 0 && (
          <Part title="Do not overclaim" count={overclaims.length}>
            <ul className="flex flex-col">
              {overclaims.map((overclaim) => (
                <CardLink
                  key={overclaim.id}
                  kind="overclaims"
                  title={overclaim.name}
                  line={`Not: “${overclaim.overclaim}”`}
                  onOpen={() => onOpenCard("overclaims", overclaim.id, overclaim.name)}
                />
              ))}
            </ul>
          </Part>
        )}
        {threats.length > 0 && (
          <Part title="Threats to answer" count={threats.length}>
            <ul className="flex flex-col gap-3">
              {threats.map((threat) => {
                const full = reference.threats.get(threat.id);
                return (
                  <li key={threat.id} className="flex flex-col gap-1">
                    <p className="font-medium text-sm">{threat.name}</p>
                    {full?.mitigation && (
                      <p className="text-foreground/75 text-sm leading-relaxed">{full.mitigation}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          </Part>
        )}
        {reporting.length > 0 && (
          <Part title="Reporting items placed here" count={reporting.length}>
            <ul className="flex flex-col gap-3">
              {reporting.map(({ standard, item }) => (
                <li key={item.id} className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-sm">
                      {standard} {item.number} · {item.topic}
                    </p>
                    <LevelMark level={item.level} />
                  </div>
                  {item.requirement && <p className="text-foreground/75 text-sm leading-relaxed">{item.requirement}</p>}
                </li>
              ))}
            </ul>
          </Part>
        )}
        {why.length > 0 && (
          <Part title="Why it is here">
            <p className="text-sm">{why.join(" ")}</p>
          </Part>
        )}
      </div>
    </>
  );
}

/** One step of the outline opened beside it: everything the bank gives for writing that sentence. */
export function StepSheet({
  section,
  step,
  techniques,
  designIds,
  onClose,
  onOpenCard,
}: {
  readonly section: BlueprintSection | null;
  readonly step: BankStep | null;
  readonly techniques: BankTechnique[];
  /** The research designs of the context, whose reporting standards place items on steps. */
  readonly designIds: string[];
  readonly onClose: () => void;
  readonly onOpenCard: CardOpener;
}) {
  return (
    <Sheet open={Boolean(section && step)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-xl">
        {section && step && (
          <StepDetail
            section={section}
            step={step}
            techniques={techniques}
            designIds={designIds}
            onOpenCard={onOpenCard}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
