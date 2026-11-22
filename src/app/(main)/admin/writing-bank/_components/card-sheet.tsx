"use client";

import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useWritingBankEntryQuery } from "@/hooks/use-writing-bank-query";

import { CardKindBadge, cardKindOf, LevelBadge } from "./bank-colors";
import { type Usage, usageText } from "./context-cards-index";
import { LinksDiagram } from "./links-diagram";
import { type CardOpener, FrameText } from "./step-sheet";
import { EntryStatusBadge, ToneBadge } from "./writing-bank-badges";
import { humanize, humanizeId, sourceText, strengthLabel, verificationLabel } from "./writing-bank-format";

type Entry = Record<string, unknown>;

/** The card to open: the bank it lives in, its id, and where the research context uses it. */
export interface OpenCard {
  collection: string;
  id: string;
  title: string;
  usedIn: Usage[];
}

const str = (entry: Entry, key: string) => (typeof entry[key] === "string" ? (entry[key] as string) : null);
const list = (entry: Entry, key: string) =>
  Array.isArray(entry[key]) ? (entry[key] as unknown[]).filter((item): item is string => typeof item === "string") : [];

function Part({ title, children }: { readonly title: string; readonly children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-heading font-medium text-base">{title}</h3>
      <div className="text-sm leading-relaxed">{children}</div>
    </section>
  );
}

function Facts({ rows }: { readonly rows: [string, string | null][] }) {
  const shown = rows.filter((row): row is [string, string] => Boolean(row[1]));
  if (!shown.length) return null;
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-y py-3 text-sm sm:grid-cols-4">
      {shown.map(([label, value]) => (
        <div key={label} className="flex flex-col gap-0.5">
          <dt className="font-medium text-muted-foreground text-xs uppercase tracking-wide">{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Chips({ items }: { readonly items: string[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <li key={item}>
          <Badge variant="outline" className="font-normal">
            {item}
          </Badge>
        </li>
      ))}
    </ul>
  );
}

/** What a card says, in the fields its bank gives it. */
function CardBody({ collection, entry }: { readonly collection: string; readonly entry: Entry }) {
  if (collection === "rules") {
    const check = (entry.check ?? {}) as { mode?: string; signal?: string };
    return (
      <>
        <Facts
          rows={[
            ["Kind", humanize(str(entry, "kind"))],
            ["Evidence", humanize(str(entry, "evidence"))],
            ["Sections", list(entry, "sections").map(humanize).join(", ") || null],
            ["Strongest wording", strengthLabel(str(entry, "maxStrength"))],
          ]}
        />
        {str(entry, "rationale") && <Part title="Why">{str(entry, "rationale")}</Part>}
        {check.signal && (
          <Part title="How it is checked">
            <span className="font-medium">{humanize(check.mode)}: </span>
            {check.signal}
          </Part>
        )}
        {str(entry, "conflictNote") && <Part title="Conflicts">{str(entry, "conflictNote")}</Part>}
      </>
    );
  }
  if (collection === "techniques") {
    const example = (entry.example ?? null) as { weak?: string; strong?: string; note?: string } | null;
    return (
      <>
        <Facts
          rows={[
            ["Category", humanize(str(entry, "category"))],
            ["Sections", list(entry, "sections").map(humanize).join(", ") || null],
          ]}
        />
        {str(entry, "problem") && <Part title="The problem it solves">{str(entry, "problem")}</Part>}
        {list(entry, "howToApply").length > 0 && (
          <Part title="How to apply">
            <ol className="flex list-decimal flex-col gap-1 pl-5">
              {list(entry, "howToApply").map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </Part>
        )}
        {list(entry, "templates").length > 0 && (
          <Part title="Templates">
            <ul className="flex flex-col gap-1.5">
              {list(entry, "templates").map((item) => (
                <li key={item} className="rounded-md bg-muted/60 px-3 py-2">
                  {item}
                </li>
              ))}
            </ul>
          </Part>
        )}
        {example && Boolean(example.weak ?? example.strong) && (
          <Part title="Example">
            <div className="grid gap-2 sm:grid-cols-2">
              {example.weak && (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 dark:border-rose-900 dark:bg-rose-950">
                  <p className="font-medium text-rose-900 text-xs dark:text-rose-200">Weak</p>
                  <p>{example.weak}</p>
                </div>
              )}
              {example.strong && (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-900 dark:bg-emerald-950">
                  <p className="font-medium text-emerald-900 text-xs dark:text-emerald-200">Strong</p>
                  <p>{example.strong}</p>
                </div>
              )}
            </div>
            {example.note && <p className="mt-2 text-muted-foreground">{example.note}</p>}
          </Part>
        )}
        {list(entry, "signals").length > 0 && (
          <Part title="Signs it is applied">
            <ul className="flex list-disc flex-col gap-1 pl-5">
              {list(entry, "signals").map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Part>
        )}
        {list(entry, "antiPatterns").length > 0 && (
          <Part title="What to avoid">
            <ul className="flex list-disc flex-col gap-1 pl-5">
              {list(entry, "antiPatterns").map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Part>
        )}
      </>
    );
  }
  if (collection === "vocabulary") {
    return (
      <>
        <Facts
          rows={[
            ["Part of speech", humanize(str(entry, "pos"))],
            ["Register", humanize(str(entry, "register"))],
            ["Stance", humanize(str(entry, "stance"))],
            ["Typical strength", strengthLabel(str(entry, "typicalStrength"))],
          ]}
        />
        {str(entry, "usage") && <Part title="Usage">{str(entry, "usage")}</Part>}
        {list(entry, "examples").length > 0 && (
          <Part title="Examples">
            <ul className="flex flex-col gap-1.5">
              {list(entry, "examples").map((item) => (
                <li key={item} className="rounded-md bg-muted/60 px-3 py-2">
                  {item}
                </li>
              ))}
            </ul>
          </Part>
        )}
        {list(entry, "collocations").length > 0 && (
          <Part title="Collocations">
            <Chips items={list(entry, "collocations")} />
          </Part>
        )}
        {list(entry, "nearSynonyms").length > 0 && (
          <Part title="Near synonyms">
            <Chips items={list(entry, "nearSynonyms")} />
          </Part>
        )}
        {list(entry, "l2Errors").length > 0 && (
          <Part title="Common learner errors">
            <ul className="flex list-disc flex-col gap-1 pl-5">
              {list(entry, "l2Errors").map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Part>
        )}
      </>
    );
  }
  if (collection === "lexical-sets") {
    return (
      <>
        <Facts
          rows={[
            ["Kind", humanize(str(entry, "kind"))],
            ["Strength", strengthLabel(str(entry, "strength"))],
          ]}
        />
        {list(entry, "members").length > 0 && (
          <Part title={`Words (${list(entry, "members").length})`}>
            <Chips items={list(entry, "members")} />
          </Part>
        )}
      </>
    );
  }
  if (collection === "overclaims") {
    return (
      <>
        <Facts rows={[["Claim type", `${humanizeId(str(entry, "claimType"))} claim`]]} />
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm dark:border-rose-900 dark:bg-rose-950">
            <p className="font-medium text-rose-900 text-xs dark:text-rose-200">Overclaims</p>
            <p>“{str(entry, "overclaim")}”</p>
          </div>
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm dark:border-emerald-900 dark:bg-emerald-950">
            <p className="font-medium text-emerald-900 text-xs dark:text-emerald-200">Write instead</p>
            <p>{str(entry, "rewrite")}</p>
          </div>
        </div>
        {str(entry, "problem") && <Part title="Why it overclaims">{str(entry, "problem")}</Part>}
      </>
    );
  }
  if (collection === "phrase-frames") {
    return (
      <>
        <Facts
          rows={[
            ["Function", humanizeId(str(entry, "function"))],
            ["Strength", strengthLabel(str(entry, "strength"))],
            ["Stance", humanize(str(entry, "stance"))],
            ["Sections", list(entry, "sections").map(humanize).join(", ") || null],
          ]}
        />
        {list(entry, "variants").length > 0 && (
          <Part title="Variants">
            <ul className="flex flex-col gap-1.5">
              {list(entry, "variants").map((item) => (
                <li key={item} className="rounded-md bg-muted/60 px-3 py-2">
                  <FrameText text={item} />
                </li>
              ))}
            </ul>
          </Part>
        )}
        {str(entry, "example") && <Part title="Example">{str(entry, "example")}</Part>}
        {list(entry, "cautions").length > 0 && (
          <Part title="Cautions">
            <ul className="flex list-disc flex-col gap-1 pl-5">
              {list(entry, "cautions").map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Part>
        )}
      </>
    );
  }
  return null;
}

/** The card's own words, before its fields: a rule's statement, a technique's principle, a word's gloss. */
function lead(collection: string, entry: Entry) {
  if (collection === "rules") return str(entry, "statement");
  if (collection === "techniques") return str(entry, "principle");
  if (collection === "vocabulary") return str(entry, "gloss");
  if (collection === "lexical-sets") return str(entry, "description");
  return null;
}

function titleOf(collection: string, entry: Entry, fallback: string) {
  if (collection === "vocabulary") return str(entry, "lemma") ?? fallback;
  if (collection === "phrase-frames") return str(entry, "frame") ?? fallback;
  return str(entry, "name") ?? fallback;
}

/** The level of the text a card works at: its own when it states one, else the level of its kind. */
function levelOf(collection: string | null, entry: Entry | undefined) {
  if (entry && typeof entry.level === "string") return entry.level;
  if (collection === "vocabulary" || collection === "lexical-sets") return "word";
  if (collection === "phrase-frames" || collection === "overclaims") return "sentence";
  return null;
}

/** One card of the bank opened beside the page: what it says, where this research context uses it, its links. */
export function CardSheet({
  card,
  onClose,
  onOpen,
}: {
  readonly card: OpenCard | null;
  readonly onClose: () => void;
  readonly onOpen: CardOpener;
}) {
  const query = useWritingBankEntryQuery(card?.collection ?? null, card?.id ?? null);
  const kind = card ? cardKindOf(card.collection) : null;
  const entry = query.data?.entry;
  const level = levelOf(card?.collection ?? null, entry);
  const title = card && entry ? titleOf(card.collection, entry, card.title) : (card?.title ?? "");
  const said = card && entry ? lead(card.collection, entry) : null;
  const source = entry ? sourceText(entry as never) : null;

  return (
    <Sheet open={Boolean(card)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-4xl">
        <SheetHeader className="gap-3 border-b pr-12">
          <div className="flex flex-wrap items-center gap-2">
            {kind && <CardKindBadge kind={kind} />}
            {level && <LevelBadge level={level} />}
            {entry && typeof entry.status === "string" && <EntryStatusBadge status={entry.status} />}
            {entry && typeof entry.verification === "string" && entry.verification !== "primary" && (
              <ToneBadge tone="look">{verificationLabel(entry.verification)}</ToneBadge>
            )}
          </div>
          <SheetTitle className="font-heading text-xl leading-snug">
            {card?.collection === "phrase-frames" ? <FrameText text={title} /> : title}
          </SheetTitle>
          {said && <SheetDescription className="text-base text-foreground leading-relaxed">{said}</SheetDescription>}
        </SheetHeader>
        <div className="flex flex-col gap-6 overflow-y-auto px-4 py-5">
          {query.isPending && card ? (
            <div className="flex flex-col gap-3" role="status" aria-label="Loading the card">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            card && entry && <CardBody collection={card.collection} entry={entry} />
          )}

          {card && card.usedIn.length > 0 && (
            <Part title={`Used in this research context (${card.usedIn.length})`}>
              <ul className="flex flex-col divide-y rounded-lg border">
                {card.usedIn.map((usage) => (
                  <li key={usage.key} className="px-3 py-2">
                    {usageText(usage)}
                  </li>
                ))}
              </ul>
            </Part>
          )}

          {query.data && (
            <Part title={`Links in the bank (${query.data.links.length})`}>
              <LinksDiagram
                id={`${card?.collection}/${card?.id}`}
                title={title}
                kind={kind}
                links={query.data.links}
                onOpen={onOpen}
              />
            </Part>
          )}

          {source && <p className="text-muted-foreground text-xs">Source: {source}</p>}
        </div>
      </SheetContent>
    </Sheet>
  );
}
