"use client";

import { ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

import { type BankReference, FRAMING_ELEMENTS, placeText, type StepPlace } from "./bank-reference";
import { humanize, plural } from "./writing-bank-format";

/** A reference entry opened beside the page: a threat to validity, a reporting standard or a framing type. */
export type OpenReference =
  | { kind: "threat"; id: string }
  | { kind: "standard"; id: string; askedBy: string[] }
  | { kind: "framing"; id: string };

/** A template's text with each `[slot]` shown as the gap a writer fills. */
export function SlotText({ text }: { readonly text: string }) {
  const parts = text.split(/(\[[^[\]]+\])/g).filter(Boolean);
  return (
    <>
      {parts.map((part, index) =>
        /^\[[^[\]]+\]$/.test(part) ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: a static split of one string
          <span key={index} className="rounded bg-muted px-1 font-mono text-[0.8125rem] text-muted-foreground">
            {part.slice(1, -1)}
          </span>
        ) : (
          // biome-ignore lint/suspicious/noArrayIndexKey: a static split of one string
          <span key={index}>{part}</span>
        ),
      )}
    </>
  );
}

/** A reporting level as a badge: essential filled, desirable plain, extraordinary outlined; none when unranked. */
export function LevelMark({ level }: { readonly level: string }) {
  if (level === "essential") return <Badge className="font-medium">Essential</Badge>;
  if (level === "desirable") return <Badge variant="secondary">Desirable</Badge>;
  if (level === "extraordinary") return <Badge variant="outline">Extraordinary</Badge>;
  return null;
}

function Part({ title, children }: { readonly title: string; readonly children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2 border-t pt-4 first:border-t-0 first:pt-0">
      <h3 className="font-semibold text-sm">{title}</h3>
      {children}
    </section>
  );
}

function Places({ steps, places }: { readonly steps: string[]; readonly places: Map<string, StepPlace> }) {
  const here = steps.flatMap((id) => {
    const place = places.get(id);
    return place ? [place] : [];
  });
  if (here.length === 0) return <p className="text-muted-foreground text-sm">No step of this outline takes it up.</p>;
  return (
    <ul className="flex flex-col gap-1 text-sm">
      {here.map((place) => (
        <li key={placeText(place)}>{placeText(place)}</li>
      ))}
    </ul>
  );
}

function ThreatBody({
  id,
  reference,
  places,
}: {
  readonly id: string;
  readonly reference: BankReference;
  readonly places: Map<string, StepPlace>;
}) {
  const threat = reference.threats.get(id);
  if (!threat) return null;
  return (
    <>
      <SheetHeader className="gap-2 border-b pr-12">
        <p className="text-muted-foreground text-sm">Threat to validity · {humanize(threat.type)}</p>
        <SheetTitle className="text-lg">{threat.name}</SheetTitle>
        <SheetDescription className="text-foreground text-sm leading-relaxed">{threat.mechanism}</SheetDescription>
      </SheetHeader>
      <div className="flex flex-col gap-4 overflow-y-auto px-4 pt-4 pb-6">
        <Part title="How to guard against it">
          <p className="text-sm leading-relaxed">{threat.mitigation}</p>
        </Part>
        {threat.reportingFrame && (
          <Part title="How to report it">
            <p className="text-sm leading-relaxed">
              <SlotText text={threat.reportingFrame} />
            </p>
          </Part>
        )}
        <Part title="Where this outline answers it">
          <Places steps={threat.steps} places={places} />
        </Part>
      </div>
    </>
  );
}

function StandardBody({
  id,
  askedBy,
  reference,
  places,
}: {
  readonly id: string;
  readonly askedBy: string[];
  readonly reference: BankReference;
  readonly places: Map<string, StepPlace>;
}) {
  const standard = reference.standards.get(id);
  if (!standard) return null;
  const items = standard.groups.flatMap((group) => group.items);
  const placed = items.filter((item) => item.steps.some((step) => places.has(step))).length;
  return (
    <>
      <SheetHeader className="gap-2 border-b pr-12">
        <p className="text-muted-foreground text-sm">
          Reporting standard{standard.version ? ` · ${standard.version}` : ""} · asked for by {askedBy.join(", ")}
        </p>
        <SheetTitle className="text-lg">
          {standard.name}
          {standard.fullName !== standard.name && (
            <span className="font-normal text-muted-foreground"> · {standard.fullName}</span>
          )}
        </SheetTitle>
        <SheetDescription className="text-foreground text-sm leading-relaxed">{standard.scope}</SheetDescription>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span>
            {plural(items.length, "item")} · {placed} placed in this outline
          </span>
          {standard.url && (
            <Button variant="link" asChild className="h-auto p-0">
              <a href={standard.url} target="_blank" rel="noreferrer">
                Open the standard
                <ExternalLink data-icon="inline-end" />
              </a>
            </Button>
          )}
        </div>
      </SheetHeader>
      <div className="flex flex-col gap-5 overflow-y-auto px-4 pt-4 pb-6">
        {items.length === 0 && (
          <p className="text-muted-foreground text-sm">The bank does not list this standard's items.</p>
        )}
        {standard.groups.map((group) => (
          <Part key={group.label} title={group.label}>
            <ol className="flex flex-col divide-y">
              {group.items.map((item) => {
                const here = item.steps.flatMap((step) => {
                  const place = places.get(step);
                  return place ? [placeText(place)] : [];
                });
                return (
                  <li key={item.id} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-2 py-2.5 first:pt-0">
                    <span className="pt-0.5 font-medium text-muted-foreground text-sm tabular-nums">{item.number}</span>
                    <div className="flex min-w-0 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-sm">{item.topic}</p>
                        <LevelMark level={item.level} />
                      </div>
                      {item.requirement ? (
                        <p className="text-sm leading-relaxed">{item.requirement}</p>
                      ) : (
                        <p className="text-muted-foreground text-sm">
                          The bank lists this item by topic only; read it in the standard.
                        </p>
                      )}
                      <p className="text-foreground/70 text-xs">
                        {here.length > 0
                          ? `In this outline: ${here.join("; ")}`
                          : `Belongs in ${item.sections.map(humanize).join(", ")}; no step of this outline names it`}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </Part>
        ))}
      </div>
    </>
  );
}

function FramingBody({
  id,
  reference,
  places,
}: {
  readonly id: string;
  readonly reference: BankReference;
  readonly places: Map<string, StepPlace>;
}) {
  const type = reference.framing.find((item) => item.id === id);
  if (!type) return null;
  const element = FRAMING_ELEMENTS.find(([key]) => key === type.element)?.[1] ?? humanize(type.element);
  const related = type.related.flatMap((relatedId) => {
    const entry = reference.framing.find((item) => item.id === relatedId);
    return entry ? [entry.name] : [];
  });
  return (
    <>
      <SheetHeader className="gap-2 border-b pr-12">
        <p className="text-muted-foreground text-sm">{element}</p>
        <SheetTitle className="text-lg">{type.name}</SheetTitle>
        <SheetDescription className="text-foreground text-sm leading-relaxed">{type.definition}</SheetDescription>
      </SheetHeader>
      <div className="flex flex-col gap-4 overflow-y-auto px-4 pt-4 pb-6">
        {type.whenToUse && (
          <Part title="When to use it">
            <p className="text-sm leading-relaxed">{type.whenToUse}</p>
          </Part>
        )}
        {type.template.length > 0 && (
          <Part title="Template">
            <ul className="flex flex-col gap-1.5 text-sm leading-relaxed">
              {type.template.map((line) => (
                <li key={line}>
                  <SlotText text={line} />
                </li>
              ))}
            </ul>
          </Part>
        )}
        {type.example && (
          <Part title="Example">
            <p className="text-sm leading-relaxed">{type.example}</p>
          </Part>
        )}
        {type.criteria.length > 0 && (
          <Part title="It must answer">
            <ul className="flex list-disc flex-col gap-1 pl-5 text-sm leading-relaxed">
              {type.criteria.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </Part>
        )}
        {type.pitfalls.length > 0 && (
          <Part title="Pitfalls">
            <ul className="flex list-disc flex-col gap-1 pl-5 text-sm leading-relaxed">
              {type.pitfalls.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </Part>
        )}
        <Part title="Where this outline states it">
          <Places steps={type.steps} places={places} />
        </Part>
        {related.length > 0 && (
          <Part title="Goes with">
            <p className="text-sm">{related.join(", ")}</p>
          </Part>
        )}
      </div>
    </>
  );
}

/** The sheet a reference entry opens in, beside the page. */
export function ReferenceSheet({
  open,
  reference,
  places,
  onClose,
}: {
  readonly open: OpenReference | null;
  readonly reference: BankReference;
  readonly places: Map<string, StepPlace>;
  readonly onClose: () => void;
}) {
  return (
    <Sheet open={Boolean(open)} onOpenChange={(value) => !value && onClose()}>
      <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-2xl">
        {open?.kind === "threat" && <ThreatBody id={open.id} reference={reference} places={places} />}
        {open?.kind === "standard" && (
          <StandardBody id={open.id} askedBy={open.askedBy} reference={reference} places={places} />
        )}
        {open?.kind === "framing" && <FramingBody id={open.id} reference={reference} places={places} />}
      </SheetContent>
    </Sheet>
  );
}
