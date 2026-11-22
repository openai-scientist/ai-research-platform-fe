"use client";

import { useMemo, useState } from "react";

import { cn } from "cn";
import { ChevronRight, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Blueprint } from "@/lib/api/services/fetch-writing-bank";

import { LevelBadge } from "./bank-colors";
import {
  type BankReference,
  contextStandards,
  type Design,
  FRAMING_ELEMENTS,
  type FramingType,
  placeText,
  type Standard,
  type StepPlace,
  stepPlaces,
  type Threat,
  useBankReference,
} from "./bank-reference";
import { type OpenReference, ReferenceSheet, SlotText } from "./reference-sheets";
import { humanize, humanizeId, plural } from "./writing-bank-format";

/**
 * How far a design lets a paper conclude, weakest first: describing what was measured, an association, a cause under
 * stated assumptions, a cause. `rung` says what a paper may conclude at that step.
 */
const LICENCE_SCALE: { id: string; short: string; label: string; says: string; rung: string }[] = [
  {
    id: "descriptive",
    short: "Describe",
    label: "Descriptive",
    says: "It describes and compares what was measured; it does not show why.",
    rung: "What was measured and how it compares, not why.",
  },
  {
    id: "associational",
    short: "Associate",
    label: "Associational",
    says: "It shows that things go together, not that one causes the other.",
    rung: "That things go together, not that one causes the other.",
  },
  {
    id: "causal_under_stated_assumptions",
    short: "Cause, if assumptions are stated",
    label: "Causal, if its assumptions are stated",
    says: "It supports a causal reading only under assumptions the paper states.",
    rung: "A cause, only under assumptions the paper states.",
  },
  {
    id: "causal",
    short: "Cause",
    label: "Causal",
    says: "It supports a causal claim about the factor it isolates.",
    rung: "A cause, for the factor the design isolates.",
  },
];

/** Each rung's shade of the blue ramp: the further a conclusion may go, the darker its rung. */
const RUNG_SHADES = [
  "border border-blue-300 bg-blue-50 text-blue-950 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-50",
  "bg-blue-300 text-blue-950 dark:bg-blue-800 dark:text-white",
  "bg-blue-600 text-white dark:bg-blue-600",
  "bg-blue-900 text-white dark:bg-blue-400 dark:text-blue-950",
];

/** Licences outside the scale: they carry a different kind of conclusion. */
const OTHER_LICENCES: Record<string, { label: string; says: string }> = {
  existence_proof: { label: "Existence proof", says: "It shows that something can be built or can happen." },
  deductive: { label: "Deductive", says: "Its conclusion follows by proof from stated premises." },
};

function licenceOf(licence: string) {
  const reach = LICENCE_SCALE.findIndex((step) => step.id === licence);
  const step = LICENCE_SCALE[reach];
  if (step) return { reach, label: step.label, says: step.says };
  const other = OTHER_LICENCES[licence];
  return { reach: -1, label: other?.label ?? humanize(licence), says: other?.says ?? "" };
}

/** The sentence a part of the tab opens with: what a reader should take from it. */
function Takeaway({ children }: { readonly children: React.ReactNode }) {
  return <p className="font-medium text-base leading-relaxed">{children}</p>;
}

function DesignChip({
  design,
  active,
  onSelect,
}: {
  readonly design: Design;
  readonly active: boolean;
  readonly onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onSelect}
      className={cn(
        "rounded-md border px-3 py-1.5 text-left font-medium text-sm outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-foreground/25 bg-background text-foreground hover:border-foreground",
      )}
    >
      {design.name}
    </button>
  );
}

/**
 * The designs on a ladder of how far a conclusion may go: the rungs from naming a cause at the top down to describing
 * what was measured, each design on its own rung. A design picks the one shown in full below.
 */
function LicenceLadder({
  designs,
  selected,
  onSelect,
}: {
  readonly designs: Design[];
  readonly selected: string;
  readonly onSelect: (id: string) => void;
}) {
  const rungs = LICENCE_SCALE.map((step, index) => ({ ...step, index })).reverse();
  const others = designs.filter((design) => licenceOf(design.causalLicence).reach < 0);
  return (
    <section className="flex flex-col gap-1.5" aria-label="How far each research design lets the paper conclude">
      <p className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">The paper may conclude</p>
      {rungs.map((rung) => {
        const here = designs.filter((design) => licenceOf(design.causalLicence).reach === rung.index);
        return (
          <div key={rung.id} className="grid gap-2 sm:grid-cols-[17rem_minmax(0,1fr)] sm:items-center sm:gap-4">
            <div className={cn("rounded-md px-3 py-2", RUNG_SHADES[rung.index])}>
              <p className="font-semibold text-sm">{rung.short}</p>
              <p className="text-xs leading-snug">{rung.rung}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {here.length > 0 ? (
                here.map((design) => (
                  <DesignChip
                    key={design.id}
                    design={design}
                    active={design.id === selected}
                    onSelect={() => onSelect(design.id)}
                  />
                ))
              ) : (
                <span className="text-muted-foreground text-sm">No design of this context reaches here</span>
              )}
            </div>
          </div>
        );
      })}
      {others.length > 0 && (
        <div className="grid gap-2 pt-2 sm:grid-cols-[17rem_minmax(0,1fr)] sm:items-center sm:gap-4">
          <div className="rounded-md border border-dashed px-3 py-2">
            <p className="font-semibold text-sm">Another kind of conclusion</p>
            <p className="text-xs leading-snug">A proof or a demonstration, not a finding about data.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {others.map((design) => (
              <DesignChip
                key={design.id}
                design={design}
                active={design.id === selected}
                onSelect={() => onSelect(design.id)}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

const REPORT_LEVELS: [string, string][] = [
  ["essential", "Essential"],
  ["desirable", "Desirable"],
  ["extraordinary", "Extraordinary"],
  ["unranked", "Also"],
];

function ReportList({ title, items }: { readonly title: string; readonly items: string[] }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="font-semibold text-sm">
        {title} <span className="font-normal text-muted-foreground tabular-nums">· {items.length}</span>
      </p>
      <ol className="flex flex-col gap-2">
        {items.map((text, index) => (
          <li key={text} className="grid grid-cols-[1.5rem_minmax(0,1fr)] text-sm leading-relaxed">
            <span className="font-medium tabular-nums">{index + 1}.</span>
            <span>{text}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** One research design in full: what it is, what it can and cannot claim, and what a paper that uses it reports. */
function DesignDetail({
  design,
  reference,
  standards,
  onShow,
}: {
  readonly design: Design;
  readonly reference: BankReference;
  readonly standards: number;
  readonly onShow: (section: Section) => void;
}) {
  const licence = licenceOf(design.causalLicence);
  const levels = REPORT_LEVELS.map(([level, label]) => ({
    label,
    items: design.reporting.filter((item) => item.level === level).map((item) => item.text),
  })).filter((group) => group.items.length > 0);
  const [first, ...rest] = levels;
  return (
    <div className="flex flex-col gap-5 border-t pt-5">
      <div className="flex flex-col gap-1.5">
        <p className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
          {humanize(design.family)} design
        </p>
        <h3 className="font-semibold text-base">{design.name}</h3>
        <p className="text-sm leading-relaxed">{design.definition}</p>
        <p className="text-sm">
          <span className="font-semibold">{licence.label}.</span> {licence.says}
        </p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 sm:gap-8">
        <div className="flex flex-col gap-2">
          <p className="font-semibold text-sm">Claims it can carry</p>
          <ul className="flex flex-wrap gap-1.5">
            {design.supports.map((id) => (
              <li key={id}>
                <Badge
                  variant="outline"
                  className="border-blue-300 bg-blue-50 text-blue-950 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100"
                >
                  {reference.claimTypes.get(id) ?? humanizeId(id)}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
        {design.cannotSupport.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="font-semibold text-sm">Claims it cannot carry</p>
            <ul className="flex flex-col gap-1.5">
              {design.cannotSupport.map((line) => (
                <li key={line} className="flex gap-2 text-sm leading-relaxed">
                  <X className="mt-0.5 size-4 shrink-0 text-rose-600 dark:text-rose-400" aria-hidden="true" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {first && (
        <div className="flex flex-col gap-4 border-t pt-5">
          <p className="font-semibold text-base">What the paper must report</p>
          <ReportList title={first.label} items={first.items} />
          {rest.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 sm:gap-8">
              {rest.map((group) => (
                <ReportList key={group.label} title={group.label} items={group.items} />
              ))}
            </div>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-x-5 gap-y-1">
        {design.threats.length > 0 && (
          <Button variant="link" className="h-auto p-0" onClick={() => onShow("threats")}>
            It raises {plural(design.threats.length, "threat")} to validity
            <ChevronRight data-icon="inline-end" />
          </Button>
        )}
        {standards > 0 && (
          <Button variant="link" className="h-auto p-0" onClick={() => onShow("standards")}>
            It calls for {plural(standards, "reporting standard")}
            <ChevronRight data-icon="inline-end" />
          </Button>
        )}
      </div>
    </div>
  );
}

/** A row that opens a reference entry: its name, a line under it, and what it touches. */
function OpenRow({
  title,
  line,
  side,
  onOpen,
}: {
  readonly title: React.ReactNode;
  readonly line?: React.ReactNode;
  readonly side?: React.ReactNode;
  readonly onOpen: () => void;
}) {
  return (
    <li>
      <Button
        variant="ghost"
        onClick={onOpen}
        className="h-auto w-full flex-wrap items-start justify-start gap-3 whitespace-normal rounded-md px-2 py-3 text-left font-normal sm:flex-nowrap"
      >
        <span className="flex min-w-0 flex-1 basis-56 flex-col gap-1">
          <span className="font-semibold text-sm">{title}</span>
          {line && <span className="text-sm leading-relaxed">{line}</span>}
        </span>
        {side}
        <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </Button>
    </li>
  );
}

/** How many of a standard's items already have a step in this outline, as a bar and a count. */
function Coverage({ placed, total }: { readonly placed: number; readonly total: number }) {
  if (total === 0)
    return <span className="w-44 shrink-0 text-muted-foreground text-xs">Items not listed in the bank</span>;
  const full = placed === total;
  return (
    <span className="flex w-44 shrink-0 flex-col gap-1.5 pt-1">
      <span className="h-2 overflow-hidden rounded-full bg-foreground/10" aria-hidden="true">
        <span
          className={cn("block h-full rounded-full", full ? "bg-emerald-600 dark:bg-emerald-500" : "bg-amber-500")}
          style={{ width: `${Math.round((placed / total) * 100)}%` }}
        />
      </span>
      <span className="font-medium text-xs tabular-nums">
        {full ? `All ${total} items in the outline` : `${placed} of ${total} items in the outline`}
      </span>
    </span>
  );
}

function StandardsView({
  standards,
  places,
  onOpen,
}: {
  readonly standards: { standard: Standard; designs: string[] }[];
  readonly places: Map<string, StepPlace>;
  readonly onOpen: (id: string, askedBy: string[]) => void;
}) {
  return (
    <ul className="-mx-2 flex flex-col divide-y">
      {standards.map(({ standard, designs }) => {
        const items = standard.groups.flatMap((group) => group.items);
        const placed = items.filter((item) => item.steps.some((step) => places.has(step))).length;
        return (
          <OpenRow
            key={standard.id}
            title={
              <>
                {standard.name}
                {standard.version && <span className="font-normal text-muted-foreground"> · {standard.version}</span>}
              </>
            }
            line={
              <>
                {standard.fullName !== standard.name && <span className="block">{standard.fullName}</span>}
                <span className="block text-muted-foreground text-xs">Asked for by {designs.join(", ")}</span>
              </>
            }
            side={<Coverage placed={placed} total={items.length} />}
            onOpen={() => onOpen(standard.id, designs)}
          />
        );
      })}
    </ul>
  );
}

/** The steps of this outline a set of bank steps reaches, each once, in the outline's order. */
function stepsIn(steps: string[], places: Map<string, StepPlace>) {
  const wanted = new Set(steps);
  return [...places.entries()].filter(([id]) => wanted.has(id)).map(([, place]) => place);
}

/** A section's name without the gloss in brackets: "Introduction (application problem and gap)" → "Introduction". */
const shortSection = (label: string) => label.replace(/\s*\(.*\)\s*$/, "");

/** Where in the paper a step stands, as the section, the move and the step, each in the shade of its level. */
function PlaceTrail({ place }: { readonly place: StepPlace }) {
  return (
    <li className="flex items-start gap-1.5 text-sm">
      <span className="flex shrink-0 items-center gap-1.5">
        <LevelBadge level="section">{shortSection(place.section)}</LevelBadge>
        <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden="true" />
        <LevelBadge level="move" className="tabular-nums">
          Move {place.move}
        </LevelBadge>
        <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden="true" />
      </span>
      <span className="min-w-0 pt-px font-medium leading-snug">{place.step}</span>
    </li>
  );
}

interface FramingGroup {
  element: string;
  label: string;
  types: FramingType[];
}

/**
 * The parts of a study's framing in the order a paper states them, as a numbered rail: each part with how many ways
 * the bank knows to state it and the sections that state it. One part is open beside the rail.
 */
function FramingRail({
  framing,
  active,
  places,
  onPick,
}: {
  readonly framing: FramingGroup[];
  readonly active: string;
  readonly places: Map<string, StepPlace>;
  readonly onPick: (element: string) => void;
}) {
  return (
    <ol className="flex flex-col" aria-label="The order a paper frames its study">
      {framing.map((item, index) => {
        const on = item.element === active;
        const sections = [
          ...new Set(
            stepsIn(
              item.types.flatMap((type) => type.steps),
              places,
            ).map((place) => shortSection(place.section)),
          ),
        ];
        return (
          <li key={item.element} className="relative">
            {index < framing.length - 1 && (
              <span className="absolute top-9 bottom-0 left-[1.375rem] w-px bg-border" aria-hidden="true" />
            )}
            <button
              type="button"
              aria-pressed={on}
              onClick={() => onPick(item.element)}
              className={cn(
                "relative flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                on ? "bg-muted" : "hover:bg-muted/60",
              )}
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border font-semibold text-xs tabular-nums",
                  on ? "border-foreground bg-foreground text-background" : "border-foreground/30 bg-background",
                )}
              >
                {index + 1}
              </span>
              <span className="flex min-w-0 flex-col pt-0.5">
                <span className={cn("text-sm", on ? "font-semibold" : "font-medium")}>{item.label}</span>
                <span className="text-muted-foreground text-xs">
                  {plural(item.types.length, "way")} · {sections.join(", ")}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function FramingView({
  framing,
  contributions,
  places,
  onOpen,
}: {
  readonly framing: FramingGroup[];
  readonly contributions: Set<string>;
  readonly places: Map<string, StepPlace>;
  readonly onOpen: (id: string) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const group = framing.find((item) => item.element === picked) ?? framing[0];
  if (!group) return null;
  const stated = stepsIn(
    group.types.flatMap((type) => type.steps),
    places,
  );
  return (
    <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <div className="hidden lg:block">
        <FramingRail framing={framing} active={group.element} places={places} onPick={setPicked} />
      </div>
      <div className="-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden">
        <ol className="flex w-max items-center gap-1" aria-label="The order a paper frames its study">
          {framing.map((item, index) => {
            const on = item.element === group.element;
            return (
              <li key={item.element} className="flex items-center gap-1">
                {index > 0 && <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden="true" />}
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => setPicked(item.element)}
                  className={cn(
                    "whitespace-nowrap rounded-full border px-3 py-1 font-medium text-sm",
                    on ? "border-foreground bg-foreground text-background" : "border-foreground/25 bg-background",
                  )}
                >
                  {index + 1}. {item.label}
                </button>
              </li>
            );
          })}
        </ol>
      </div>
      <div className="flex min-w-0 flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h3 className="font-semibold text-lg">{group.label}</h3>
          <p className="text-sm">
            {plural(group.types.length, "way")} the bank knows to state it. A gap that fits this context's contribution
            is marked.
          </p>
        </div>
        {stated.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
              Where the outline states it
            </p>
            <ul className="flex flex-col gap-2">
              {stated.map((place) => (
                <PlaceTrail key={placeText(place)} place={place} />
              ))}
            </ul>
          </div>
        )}
        <div className="flex flex-col gap-1">
          <p className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">Ways to state it</p>
          <ul className="-mx-2 flex flex-col divide-y">
            {group.types.map((type) => (
              <li key={type.id}>
                <Button
                  variant="ghost"
                  onClick={() => onOpen(type.id)}
                  className="h-auto w-full items-start justify-start gap-3 whitespace-normal rounded-md px-2 py-3.5 text-left font-normal"
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-sm">{type.name}</span>
                      {type.contributions.some((id) => contributions.has(id)) && (
                        <Badge className="border-transparent bg-emerald-600 text-white dark:bg-emerald-500 dark:text-emerald-950">
                          Fits the contribution
                        </Badge>
                      )}
                    </span>
                    <span className="text-sm leading-relaxed">{type.definition}</span>
                    {type.template[0] && (
                      <span className="border-blue-300 border-l-2 pl-3 text-sm leading-relaxed dark:border-blue-700">
                        <SlotText text={type.template[0]} />
                      </span>
                    )}
                  </span>
                  <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/** Every place in this outline that a set of bank steps reaches, each once, in the outline's order. */
function placesOf(steps: string[], places: Map<string, StepPlace>) {
  const wanted = new Set(steps);
  return [...places.entries()].filter(([id]) => wanted.has(id)).map(([, place]) => placeText(place));
}

/** Kinds of threat named after the validity they endanger; the qualitative kinds (credibility…) are names already. */
const VALIDITY = new Set(["internal", "external", "construct", "statistical_conclusion"]);

interface ThreatRow {
  threat: Threat;
  raisedBy: Set<string>;
}

/**
 * The threats as a grid: one row for each, grouped by the kind of validity it endangers, one column for each research
 * design with a mark where the design raises it. A row opens the threat in full.
 */
function ThreatTable({
  rows,
  designs,
  onOpen,
}: {
  readonly rows: ThreatRow[];
  readonly designs: Design[];
  readonly onOpen: (id: string) => void;
}) {
  const types = [...new Set(rows.map((row) => row.threat.type))].sort(
    (a, b) => rows.filter((row) => row.threat.type === b).length - rows.filter((row) => row.threat.type === a).length,
  );
  const groupLabel = (type: string) => (VALIDITY.has(type) ? `${humanize(type)} validity` : humanize(type));
  const raisedText = (raisedBy: Set<string>) =>
    designs
      .filter((design) => raisedBy.has(design.id))
      .map((design) => design.name)
      .join(", ");
  return (
    <>
      <div className="flex flex-col gap-4 md:hidden">
        {types.map((type) => {
          const group = rows.filter((row) => row.threat.type === type);
          return (
            <section key={type} className="flex flex-col gap-1">
              <h3 className="font-semibold text-xs uppercase tracking-wide">
                {groupLabel(type)} · {group.length}
              </h3>
              <ul className="-mx-2 flex flex-col divide-y">
                {group.map(({ threat, raisedBy }) => (
                  <OpenRow
                    key={threat.id}
                    title={threat.name}
                    line={<span className="text-xs">Raised by {raisedText(raisedBy)}</span>}
                    onOpen={() => onOpen(threat.id)}
                  />
                ))}
              </ul>
            </section>
          );
        })}
      </div>
      <Table className="hidden table-fixed md:table" aria-label="Threats to validity by research design">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-0">Threat</TableHead>
            {designs.map((design) => (
              <TableHead
                key={design.id}
                className="hidden h-auto w-32 whitespace-normal py-2 text-center align-bottom font-semibold text-xs leading-tight md:table-cell"
              >
                {design.name}
              </TableHead>
            ))}
            <TableHead className="w-8 pr-0">
              <span className="sr-only">Open</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {types.map((type) => {
            const group = rows.filter((row) => row.threat.type === type);
            return [
              <TableRow key={type} className="bg-muted hover:bg-muted">
                <TableCell colSpan={designs.length + 2} className="py-2 font-semibold text-xs uppercase tracking-wide">
                  {groupLabel(type)} · {group.length}
                </TableCell>
              </TableRow>,
              ...group.map(({ threat, raisedBy }) => (
                <TableRow key={threat.id} className="cursor-pointer" onClick={() => onOpen(threat.id)}>
                  <TableCell className="whitespace-normal py-2.5 pl-0">
                    <Button
                      variant="link"
                      className="h-auto whitespace-normal p-0 text-left font-medium text-foreground"
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpen(threat.id);
                      }}
                    >
                      {threat.name}
                    </Button>
                  </TableCell>
                  {designs.map((design) => (
                    <TableCell key={design.id} className="hidden text-center md:table-cell">
                      {raisedBy.has(design.id) ? (
                        <span className="inline-block size-3 rounded-full bg-foreground">
                          <span className="sr-only">Raised by {design.name}</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground" aria-hidden="true">
                          —
                        </span>
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="pr-0 text-muted-foreground">
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </TableCell>
                </TableRow>
              )),
            ];
          })}
        </TableBody>
      </Table>
    </>
  );
}

type Section = "designs" | "threats" | "standards" | "framing";

/** Which designs let the paper go furthest, and which the least. */
function designTakeaway(designs: Design[]) {
  const ranked = designs.map((design) => ({ design, reach: licenceOf(design.causalLicence).reach }));
  const top = Math.max(...ranked.map((item) => item.reach));
  const bottom = Math.min(...ranked.map((item) => item.reach));
  const names = (reach: number) =>
    ranked
      .filter((item) => item.reach === reach)
      .map((item) => item.design.name)
      .join(" and ");
  const step = (reach: number) => LICENCE_SCALE[reach]?.short.toLowerCase() ?? "";
  if (top < 0) return "The designs of this context carry a proof or a demonstration, not a finding about data.";
  if (top === bottom) return `Every design of this context lets the paper ${step(top)}.`;
  return `${names(top)} lets the paper go furthest: ${step(top)}. With ${names(bottom)}, it may only ${step(bottom)}.`;
}

/** How many of the standards have each listed item somewhere in the outline. */
function standardsTakeaway(standards: { standard: Standard; designs: string[] }[], places: Map<string, StepPlace>) {
  let full = 0;
  let partial = 0;
  let unlisted = 0;
  for (const { standard } of standards) {
    const items = standard.groups.flatMap((group) => group.items);
    if (items.length === 0) unlisted += 1;
    else if (items.every((item) => item.steps.some((step) => places.has(step)))) full += 1;
    else partial += 1;
  }
  return [
    `${full} of ${plural(standards.length, "standard")} have every item placed in the outline`,
    partial ? `${partial} miss some` : null,
    unlisted ? `${unlisted} ${unlisted === 1 ? "lists" : "list"} no items in the bank` : null,
  ]
    .filter(Boolean)
    .join("; ")
    .concat(".");
}

/**
 * What the study behind a paper of this context must answer for, beyond its sentences, in four parts: how far its
 * research designs let it conclude, the threats to validity it must address, the reporting standards it is held to,
 * and the ways the bank knows to frame its problem, gap, question and hypothesis, each with where the outline says it.
 */
export function DesignReporting({
  blueprint,
  designIds,
  contributionIds,
  enabled,
}: {
  readonly blueprint: Blueprint;
  readonly designIds: string[];
  readonly contributionIds: string[];
  readonly enabled: boolean;
}) {
  const reference = useBankReference(enabled);
  const places = useMemo(() => stepPlaces(blueprint), [blueprint]);
  const [open, setOpen] = useState<OpenReference | null>(null);
  const [section, setSection] = useState<Section>("designs");
  const [picked, setPicked] = useState<string | null>(null);

  if (reference.pending)
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <span className="sr-only">Loading research design and reporting</span>
        <Skeleton className="h-96 w-full" />
      </div>
    );

  const designs = designIds.flatMap((id) => {
    const design = reference.designs.get(id);
    return design ? [design] : [];
  });
  const selected = designs.find((design) => design.id === picked) ?? designs[0];
  const threats = new Map<string, Set<string>>();
  for (const design of designs)
    for (const id of design.threats) threats.set(id, new Set([...(threats.get(id) ?? []), design.id]));
  const threatRows: ThreatRow[] = [...threats.entries()]
    .flatMap(([id, raisedBy]) => {
      const threat = reference.threats.get(id);
      return threat ? [{ threat, raisedBy }] : [];
    })
    .sort((a, b) => b.raisedBy.size - a.raisedBy.size || a.threat.name.localeCompare(b.threat.name));
  const answeredIn = placesOf(
    threatRows.flatMap((row) => row.threat.steps),
    places,
  );
  const standards = contextStandards(designIds, reference);
  const framing = FRAMING_ELEMENTS.map(([element, label]) => ({
    element,
    label,
    types: reference.framing.filter((type) => type.element === element && type.steps.some((step) => places.has(step))),
  })).filter((group) => group.types.length > 0);
  const framingCount = framing.reduce((sum, group) => sum + group.types.length, 0);
  const counts: Record<Section, number> = {
    designs: designs.length,
    threats: threatRows.length,
    standards: standards.length,
    framing: framingCount,
  };
  const labels: Record<Section, string> = {
    designs: "Research designs",
    threats: "Threats to validity",
    standards: "Reporting standards",
    framing: "Framing",
  };

  return (
    <Card className="gap-0 py-0">
      <div className="border-b px-4 pt-4 pb-2.5">
        <div className="-mx-1 overflow-x-auto overflow-y-hidden px-1 pb-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Tabs value={section} onValueChange={(value) => setSection(value as Section)}>
            <TabsList>
              {(Object.keys(labels) as Section[]).map((key) => (
                <TabsTrigger key={key} value={key} className="gap-1.5">
                  {labels[key]}
                  <span className="text-muted-foreground tabular-nums">{counts[key]}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>
      <div className="px-4 py-5">
        {section === "designs" &&
          (selected ? (
            <div className="flex flex-col gap-5">
              <Takeaway>{designTakeaway(designs)}</Takeaway>
              <LicenceLadder designs={designs} selected={selected.id} onSelect={setPicked} />
              <DesignDetail
                design={selected}
                reference={reference}
                standards={standards.filter((item) => item.designs.includes(selected.name)).length}
                onShow={setSection}
              />
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">The bank names no research design for this context.</p>
          ))}
        {section === "threats" && (
          <div className="flex flex-col gap-4">
            <Takeaway>
              {plural(threatRows.length, "threat")} could make the results mislead;{" "}
              {threatRows.filter((row) => row.raisedBy.size > 1).length} of them come from more than one design.
            </Takeaway>
            {answeredIn.length > 0 && (
              <p className="text-sm">
                <span className="font-semibold">The outline answers them in </span>
                {answeredIn.join("; ")}.
              </p>
            )}
            <ThreatTable rows={threatRows} designs={designs} onOpen={(id) => setOpen({ kind: "threat", id })} />
          </div>
        )}
        {section === "standards" && (
          <div className="flex flex-col gap-4">
            <Takeaway>{standardsTakeaway(standards, places)}</Takeaway>
            <StandardsView
              standards={standards}
              places={places}
              onOpen={(id, askedBy) => setOpen({ kind: "standard", id, askedBy })}
            />
          </div>
        )}
        {section === "framing" && (
          <FramingView
            framing={framing}
            contributions={new Set(contributionIds)}
            places={places}
            onOpen={(id) => setOpen({ kind: "framing", id })}
          />
        )}
      </div>
      <ReferenceSheet open={open} reference={reference} places={places} onClose={() => setOpen(null)} />
    </Card>
  );
}
