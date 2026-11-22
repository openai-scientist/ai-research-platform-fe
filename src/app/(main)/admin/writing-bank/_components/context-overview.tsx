"use client";

import { useMemo, useState } from "react";

import { cn } from "cn";
import { Check, ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useWritingBankLibraryQuery } from "@/hooks/use-writing-bank-query";
import type {
  BankReason,
  BankRelease,
  Blueprint,
  ContextEntry,
  JournalSummary,
} from "@/lib/api/services/fetch-writing-bank";

import { LevelBadge } from "./bank-colors";
import type { CardOpener } from "./step-sheet";
import { ForceBadge, ToneBadge } from "./writing-bank-badges";
import {
  formatDate,
  formatWords,
  humanize,
  humanizeId,
  plural,
  sourceText,
  verificationLabel,
} from "./writing-bank-format";

/** A titled block of a tab: a heading, one line on what it holds, and its content. */
function Block({
  title,
  note,
  children,
}: {
  readonly title: string;
  readonly note?: string;
  readonly children: React.ReactNode;
}) {
  return (
    <Card className="gap-4">
      <CardHeader className="gap-1">
        <CardTitle className="text-base">{title}</CardTitle>
        {note && <p className="text-muted-foreground text-sm">{note}</p>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/** What the venue asks of a paper written in this context: what it must hold, its editorial policy, its length. */
export function VenueRequirements({
  journal,
  blueprint,
}: {
  readonly journal: JournalSummary;
  readonly blueprint: Blueprint;
}) {
  const requirements = blueprint.journalRequirements;
  const declarations = blueprint.journalDeclarations;
  return (
    <div className="flex flex-col gap-4">
      <Block
        title="What a submission must hold"
        note={`Set by ${journal.name}; the writing stage has to meet each one.`}
      >
        {requirements.length === 0 ? (
          <p className="text-muted-foreground text-sm">The venue sets nothing beyond its sections.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {requirements.map((requirement) => (
              <li
                key={`${requirement.kind}-${requirement.ref}`}
                className="flex flex-col gap-2 rounded-lg border bg-background p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{requirement.name}</p>
                    <p className="text-muted-foreground text-xs">{humanize(requirement.kind)}</p>
                  </div>
                  <ForceBadge force={requirement.force} />
                </div>
                {requirement.limits && <p className="text-sm leading-relaxed">{requirement.limits}</p>}
                {requirement.verification === "unverified" && (
                  <ToneBadge tone="look" className="w-fit">
                    {verificationLabel(requirement.verification)}
                  </ToneBadge>
                )}
              </li>
            ))}
          </ul>
        )}
      </Block>

      <Block
        title="Editorial policy"
        note={`${plural(declarations.length, "rule")} from the venue's guide for authors, as the bank restates them.`}
      >
        {declarations.length === 0 ? (
          <p className="text-muted-foreground text-sm">The venue publishes no editorial policy here.</p>
        ) : (
          <ol className="flex flex-col gap-4">
            {declarations.map((declaration, index) => {
              const source = sourceText(declaration.provenance);
              return (
                <li key={declaration.id} className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-2">
                  <span className="pt-0.5 font-medium text-muted-foreground text-sm tabular-nums">{index + 1}</span>
                  <div className="flex flex-col gap-1">
                    <p className="font-medium text-sm">{declaration.name}</p>
                    <p className="text-sm leading-relaxed">{declaration.text}</p>
                    {source && <p className="text-muted-foreground text-xs">Source: {source}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Block>

      <Block title="Length">
        <LengthLine blueprint={blueprint} />
      </Block>
    </div>
  );
}

/** The venue's word limits in one line, or that it sets none. */
function LengthLine({ blueprint }: { readonly blueprint: Blueprint }) {
  const limits = blueprint.wordLimits;
  const parts = [
    limits.mainText != null ? `main text ${formatWords(limits.mainText)}` : null,
    limits.abstract != null ? `abstract ${formatWords(limits.abstract)}` : null,
    ...Object.entries(limits.sections).map(([section, words]) => `${humanize(section)} ${formatWords(words)}`),
  ].filter(Boolean);
  if (parts.length === 0)
    return (
      <p className="text-muted-foreground text-sm">
        The venue records no word limit, so the writing stage keeps to its own lengths.
      </p>
    );
  return <p className="text-sm">{`${parts.join(", ")}${limits.source ? ` (from ${limits.source})` : ""}.`}</p>;
}

/**
 * Where a style choice comes from, in a word: the paper template picked it, it fits what the paper contributes, it
 * is the convention of the field, or it is the bank's default for the aspect.
 */
function originsOf(reasons: BankReason[] | undefined) {
  const found = new Set<string>();
  for (const reason of reasons ?? []) {
    if (reason.code === "choice") found.add("Template");
    if (reason.code !== "style") continue;
    for (const piece of reason.text.split(/;\s+/)) {
      if (piece === "Default for this axis") found.add("Bank default");
      else if (/: \w+ \([\w-]+\)$/.test(piece)) found.add("Field convention");
      else if (piece.includes(": ")) found.add("Fits the contribution");
    }
  }
  return [...found];
}

/** The reason the bank gives for a style, as one sentence, when it gives one beyond a label. */
function reasonOf(reasons: BankReason[] | undefined) {
  for (const reason of reasons ?? []) {
    if (reason.code !== "style") continue;
    for (const piece of reason.text.split(/;\s+/)) {
      const colon = piece.indexOf(": ");
      const why = colon < 0 ? "" : piece.slice(colon + 2).trim();
      if (why.includes(" ") && !/^\w+ \([\w-]+\)$/.test(why)) return why.endsWith(".") ? why : `${why}.`;
    }
  }
  return null;
}

type LibraryItem = Record<string, unknown> & { id: string };

const text = (value: unknown) => (typeof value === "string" ? value : "");
const list = (value: unknown) => (Array.isArray(value) ? (value as unknown[]) : []);
const record = (value: unknown) => (value && typeof value === "object" ? (value as Record<string, unknown>) : {});

interface StyleAxis {
  id: string;
  name: string;
  question: string;
  level: string;
}

interface StylePart {
  name: string;
  required: boolean;
  repeats: boolean;
}

/** One way of writing an aspect of the paper, as the bank's style entry holds it. */
interface StyleOption {
  id: string;
  axis: string;
  name: string;
  summary: string;
  isDefault: boolean;
  parts: StylePart[];
  rules: { id: string; level: string }[];
  techniques: string[];
  fits: string[];
  avoids: string[];
}

function axisOf(item: LibraryItem): StyleAxis {
  return { id: item.id, name: text(item.name), question: text(item.question), level: text(item.level) };
}

function optionOf(item: LibraryItem): StyleOption {
  const reasons = (value: unknown) =>
    list(value)
      .map((when) => text(record(when).reason))
      .filter(Boolean);
  return {
    id: item.id,
    axis: text(item.axis),
    name: text(item.name),
    summary: text(item.summary),
    isDefault: item.isDefault === true,
    parts: list(item.parts).map((part) => {
      const fields = record(part);
      return { name: text(fields.name), required: fields.required === true, repeats: fields.repeats === true };
    }),
    rules: list(item.rules)
      .map((rule) => ({ id: text(record(rule).rule), level: text(record(rule).level) }))
      .filter((rule) => rule.id),
    techniques: list(item.techniques).map(text).filter(Boolean),
    fits: reasons(item.fitsWhen),
    avoids: reasons(item.avoidWhen),
  };
}

/** How strongly a style holds a rule, as a reader says it. */
const RULE_FORCE: Record<string, string> = { must: "Must", should: "Should", avoid: "Avoid", may: "May" };

/** The levels of the text a style axis can sit at, largest first, with what the group of axes is about. */
const STYLE_LEVELS: { level: string; title: string; note: string }[] = [
  { level: "paper", title: "The whole paper", note: "How the paper is laid out and where its point sits." },
  { level: "section", title: "Each section", note: "How each section is built, in the paper's order." },
  { level: "paragraph", title: "Every paragraph", note: "How a paragraph moves from its point to its end." },
  { level: "sentence", title: "Every sentence", note: "Who speaks, how strongly, and how sources appear." },
];

/** The parts a style is built from, in order; an optional part is dashed. */
function PartsFlow({ parts }: { readonly parts: StylePart[] }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-1 gap-y-1.5" aria-label="Parts in order">
      {parts.map((part, index) => (
        <li key={part.name} className="flex items-center gap-1">
          {index > 0 && <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden="true" />}
          <span
            className={cn(
              "rounded-md border px-2 py-0.5 text-xs",
              part.required ? "border-foreground/30 bg-muted font-medium" : "border-foreground/30 border-dashed",
            )}
          >
            {part.name}
            {part.repeats && <span className="text-muted-foreground"> · repeats</span>}
            {!part.required && <span className="text-muted-foreground"> · optional</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** The cards a style brings, of one kind, as a short list of links that open them. */
function CardLinks({
  title,
  tone,
  items,
  onOpen,
}: {
  readonly title: string;
  readonly tone: string;
  readonly items: { id: string; name: string; force?: string }[];
  readonly onOpen: (id: string, name: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <p className={cn("font-semibold text-xs uppercase tracking-wide", tone)}>{title}</p>
      <ul className="flex flex-col gap-1">
        {items.map((item) => (
          <li key={item.id} className="flex gap-2 text-sm leading-snug">
            {item.force && <span className="w-12 shrink-0 font-medium text-foreground/70">{item.force}</span>}
            <Button
              variant="link"
              onClick={() => onOpen(item.id, item.name)}
              className="h-auto min-w-0 shrink justify-start whitespace-normal p-0 text-left font-normal text-foreground leading-snug"
            >
              {item.name}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * One aspect of the paper: its question, every way the bank knows to answer it with the context's choice marked, and
 * the way being looked at in full. Another way can be looked at to see what it would change and when it suits.
 */
function AxisRow({
  axis,
  options,
  chosen,
  names,
  onOpenCard,
}: {
  readonly axis: StyleAxis;
  readonly options: StyleOption[];
  readonly chosen: Blueprint["styles"][number];
  readonly names: Map<string, string>;
  readonly onOpenCard: CardOpener;
}) {
  const [viewing, setViewing] = useState(chosen.style);
  const option = options.find((item) => item.id === viewing);
  const isChosen = viewing === chosen.style;
  const origins = originsOf(chosen.reasons);
  const why = reasonOf(chosen.reasons);
  return (
    <li className="grid gap-3 py-5 first:pt-0 last:pb-0 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8">
      <div className="flex flex-col gap-1">
        <p className="font-semibold text-sm">{axis.name}</p>
        <p className="text-foreground/75 text-sm leading-relaxed">{axis.question}</p>
      </div>
      <div className="flex min-w-0 flex-col gap-3">
        <fieldset className="m-0 flex flex-wrap gap-1.5 border-0 p-0">
          <legend className="sr-only">Ways to write: {axis.name}</legend>
          {options.map((item) => {
            const picked = item.id === chosen.style;
            return (
              <Button
                key={item.id}
                size="sm"
                variant={item.id === viewing ? "default" : "outline"}
                aria-pressed={item.id === viewing}
                onClick={() => setViewing(item.id)}
                className={cn(
                  "h-auto min-h-8 max-w-full whitespace-normal py-1 text-left sm:whitespace-nowrap",
                  !picked && item.id !== viewing && "text-foreground/75",
                )}
              >
                {picked && <Check aria-hidden="true" />}
                {item.name}
              </Button>
            );
          })}
        </fieldset>
        {option && (
          <div
            className={cn(
              "flex flex-col gap-3 border-l-2 pl-4",
              isChosen ? "border-primary" : "border-muted-foreground/40 border-dashed",
            )}
          >
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-sm">{isChosen ? "Chosen for this context" : "Not chosen here"}</p>
              {isChosen &&
                origins.map((origin) => (
                  <Badge key={origin} variant="secondary">
                    {origin}
                  </Badge>
                ))}
              {!isChosen && option.isDefault && <Badge variant="outline">Bank default</Badge>}
            </div>
            <p className="text-sm leading-relaxed">{option.summary}</p>
            {isChosen && why && <p className="text-foreground/75 text-sm leading-relaxed">Why: {why}</p>}
            {option.parts.length > 0 && <PartsFlow parts={option.parts} />}
            {!isChosen && (option.fits.length > 0 || option.avoids.length > 0) && (
              <dl className="grid gap-2 text-sm sm:grid-cols-2 sm:gap-4">
                {option.fits.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <dt className="font-medium">Suits a paper when</dt>
                    {option.fits.map((reason) => (
                      <dd key={reason} className="text-foreground/75 leading-relaxed">
                        {reason}
                      </dd>
                    ))}
                  </div>
                )}
                {option.avoids.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <dt className="font-medium">Not for a paper when</dt>
                    {option.avoids.map((reason) => (
                      <dd key={reason} className="text-foreground/75 leading-relaxed">
                        {reason}
                      </dd>
                    ))}
                  </div>
                )}
              </dl>
            )}
            {(option.rules.length > 0 || option.techniques.length > 0) && (
              <div className="grid gap-4 sm:grid-cols-2">
                <CardLinks
                  title={plural(option.rules.length, "rule")}
                  tone="text-sky-700 dark:text-sky-300"
                  items={option.rules.map((rule) => ({
                    id: rule.id,
                    force: RULE_FORCE[rule.level] ?? humanize(rule.level),
                    name: names.get(rule.id) ?? humanizeId(rule.id),
                  }))}
                  onOpen={(id, name) => onOpenCard("rules", id, name)}
                />
                <CardLinks
                  title={plural(option.techniques.length, "technique")}
                  tone="text-teal-700 dark:text-teal-300"
                  items={option.techniques.map((id) => ({ id, name: names.get(id) ?? humanizeId(id) }))}
                  onOpen={(id, name) => onOpenCard("techniques", id, name)}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

/**
 * The style choices of the context, by the level of the text they shape: for each aspect, the question it answers,
 * every way the bank knows, the way this context takes and why, what it is built from and the cards it brings.
 */
export function StyleChoices({
  blueprint,
  enabled,
  onOpenCard,
  onOpenRules,
}: {
  readonly blueprint: Blueprint;
  readonly enabled: boolean;
  readonly onOpenCard: CardOpener;
  readonly onOpenRules: () => void;
}) {
  const axesBank = useWritingBankLibraryQuery("style-axes", enabled);
  const stylesBank = useWritingBankLibraryQuery("styles", enabled);
  const rulesBank = useWritingBankLibraryQuery("rules", enabled);
  const techniquesBank = useWritingBankLibraryQuery("techniques", enabled);
  const names = useMemo(
    () =>
      new Map(
        [...(rulesBank.data?.items ?? []), ...(techniquesBank.data?.items ?? [])].map((item) => [
          item.id,
          text(item.name),
        ]),
      ),
    [rulesBank.data, techniquesBank.data],
  );
  if (blueprint.styles.length === 0)
    return (
      <Block title="Writing style">
        <p className="text-muted-foreground text-sm">No style is fixed for this context.</p>
      </Block>
    );
  if (axesBank.isPending || stylesBank.isPending)
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <span className="sr-only">Loading writing style</span>
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );

  const axes = (axesBank.data?.items ?? []).map(axisOf);
  const options = (stylesBank.data?.items ?? []).map(optionOf);
  const chosen = new Map(blueprint.styles.map((style) => [style.axis, style]));
  return (
    <div className="flex flex-col gap-4">
      {STYLE_LEVELS.map(({ level, title, note }) => {
        const here = axes.filter((axis) => axis.level === level && chosen.has(axis.id));
        if (here.length === 0) return null;
        return (
          <Card key={level} className="gap-5">
            <CardHeader className="gap-1.5">
              <div className="flex items-center gap-2">
                <LevelBadge level={level} />
                <CardTitle className="text-base">{title}</CardTitle>
              </div>
              <p className="text-foreground/75 text-sm">{note}</p>
            </CardHeader>
            <CardContent>
              <ol className="divide-y">
                {here.map((axis) => {
                  const style = chosen.get(axis.id);
                  return (
                    style && (
                      <AxisRow
                        key={axis.id}
                        axis={axis}
                        options={options.filter((item) => item.axis === axis.id)}
                        chosen={style}
                        names={names}
                        onOpenCard={onOpenCard}
                      />
                    )
                  );
                })}
              </ol>
            </CardContent>
          </Card>
        );
      })}
      <p className="text-foreground/75 text-sm">
        {plural(blueprint.wholePaper.length, "rule holds", "rules hold")} across the whole paper as well.{" "}
        <Button variant="link" className="h-auto p-0" onClick={onOpenRules}>
          See them in Cards
        </Button>
      </p>
    </div>
  );
}

/** When to use the context and when not to, beside the outline. */
export function WhenToUse({ context }: { readonly context: ContextEntry }) {
  return (
    <Card className="gap-3">
      <CardHeader>
        <CardTitle>When to use</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-sm leading-relaxed">
        <p>{context.whenToUse}</p>
        <div className="flex flex-col gap-1">
          <p className="font-heading font-medium text-base">Not for</p>
          <p>{context.whenNotToUse}</p>
        </div>
      </CardContent>
    </Card>
  );
}

/** What kind of paper the context fits: its contributions, research designs, field and claim types. */
export function Fits({ context }: { readonly context: ContextEntry }) {
  const summary = context.summary;
  const rows = [
    { label: "Contribution", value: summary.contributions.map((item) => item.name).join(", ") },
    { label: "Research design", value: (context.designs ?? []).map(humanizeId).join(", ") },
    { label: "Field", value: summary.discipline ? humanize(summary.discipline) : "" },
    { label: "Claim type", value: (context.claimTypes ?? []).map((id) => `${humanizeId(id)} claim`).join(", ") },
  ].filter((row) => row.value);
  if (rows.length === 0) return null;
  return (
    <Card className="gap-3">
      <CardHeader>
        <CardTitle>Fits</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="flex flex-col gap-3 text-sm">
          {rows.map((row) => (
            <div key={row.label} className="flex flex-col gap-0.5">
              <dt className="font-medium">{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

/** The bank release this page reads, so that what it shows can be traced to one frozen version of the bank. */
export function BankReleaseNote({ release }: { readonly release: BankRelease }) {
  return (
    <Card className="gap-3">
      <CardHeader>
        <CardTitle>Bank release</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm">
        <p>
          <span className="font-medium tabular-nums">{release.release}</span>
          <span className="text-foreground/70"> · cut {formatDate(release.date)}</span>
        </p>
        {release.notes && <p className="text-foreground/75 leading-relaxed">{release.notes}</p>}
        {release.includes_drafts && (
          <p className="text-foreground/70 text-xs">It includes draft entries no reviewer has approved yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
