"use client";

import { useMemo } from "react";

import { useWritingBankLibraryQuery } from "@/hooks/use-writing-bank-query";
import type { Blueprint } from "@/lib/api/services/fetch-writing-bank";

/**
 * The bank's reference entries a research context is judged against beyond its sentences: the research designs and
 * what each lets a paper conclude, the threats to validity, the reporting standards, the ways to frame a problem,
 * gap, question or hypothesis, and the parts of an argument. Read from the release's banks as they stand.
 */

type Item = Record<string, unknown> & { id: string };

const text = (value: unknown) => (typeof value === "string" ? value : "");
const list = (value: unknown) => (Array.isArray(value) ? (value as unknown[]) : []);
const texts = (value: unknown) => list(value).map(text).filter(Boolean);
const record = (value: unknown) => (value && typeof value === "object" ? (value as Record<string, unknown>) : {});

export interface ReportingItem {
  text: string;
  level: string;
}

export interface Design {
  id: string;
  name: string;
  family: string;
  definition: string;
  causalLicence: string;
  supports: string[];
  cannotSupport: string[];
  reporting: ReportingItem[];
  threats: string[];
  standards: string[];
}

export interface Threat {
  id: string;
  name: string;
  type: string;
  mechanism: string;
  mitigation: string;
  reportingFrame: string;
  steps: string[];
}

export interface StandardItem {
  id: string;
  number: string;
  topic: string;
  requirement: string;
  level: string;
  sections: string[];
  steps: string[];
}

export interface Standard {
  id: string;
  name: string;
  fullName: string;
  version: string;
  scope: string;
  itemCount: number | null;
  url: string;
  groups: { label: string; items: StandardItem[] }[];
}

export interface FramingType {
  id: string;
  element: string;
  name: string;
  definition: string;
  whenToUse: string;
  criteria: string[];
  template: string[];
  example: string;
  pitfalls: string[];
  steps: string[];
  related: string[];
  contributions: string[];
}

export interface ArgumentElement {
  id: string;
  name: string;
  role: string;
}

function designOf(item: Item): Design {
  return {
    id: item.id,
    name: text(item.name),
    family: text(item.family),
    definition: text(item.definition),
    causalLicence: text(item.causalLicence),
    supports: texts(item.supports),
    cannotSupport: texts(item.cannotSupport),
    reporting: list(item.reporting).map((entry) => ({
      text: text(record(entry).text),
      level: text(record(entry).level),
    })),
    threats: texts(item.threats),
    standards: texts(item.standards),
  };
}

function threatOf(item: Item): Threat {
  return {
    id: item.id,
    name: text(item.name),
    type: text(item.type),
    mechanism: text(item.mechanism),
    mitigation: text(item.mitigation),
    reportingFrame: text(item.reportingFrame),
    steps: texts(item.steps),
  };
}

function standardOf(item: Item): Standard {
  const count = item.itemCount;
  return {
    id: item.id,
    name: text(item.name),
    fullName: text(item.fullName),
    version: text(item.version),
    scope: text(item.scope),
    itemCount: typeof count === "number" ? count : null,
    url: text(item.url),
    groups: list(item.groups).map((group) => ({
      label: text(record(group).label),
      items: list(record(group).items).map((entry) => {
        const fields = record(entry);
        return {
          id: text(fields.id),
          number: text(fields.number),
          topic: text(fields.topic),
          requirement: text(fields.requirement),
          level: text(fields.level),
          sections: texts(fields.sections),
          steps: texts(fields.steps),
        };
      }),
    })),
  };
}

function framingOf(item: Item): FramingType {
  return {
    id: item.id,
    element: text(item.element),
    name: text(item.name),
    definition: text(item.definition),
    whenToUse: text(item.whenToUse),
    criteria: texts(item.criteria),
    template: texts(item.template),
    example: text(item.example),
    pitfalls: texts(item.pitfalls),
    steps: texts(item.steps),
    related: texts(item.related),
    contributions: texts(item.contributions),
  };
}

function byId<T extends { id: string }>(items: T[]) {
  return new Map(items.map((item) => [item.id, item]));
}

/** The reference banks, read once and kept: a release never changes. `pending` until all have arrived. */
export function useBankReference(enabled: boolean) {
  const designs = useWritingBankLibraryQuery("designs", enabled);
  const threats = useWritingBankLibraryQuery("threats", enabled);
  const standards = useWritingBankLibraryQuery("standards", enabled);
  const framing = useWritingBankLibraryQuery("framing-types", enabled);
  const elements = useWritingBankLibraryQuery("argument-elements", enabled);
  const claimTypes = useWritingBankLibraryQuery("claim-types", enabled);
  const data = useMemo(
    () => ({
      designs: byId((designs.data?.items ?? []).map(designOf)),
      threats: byId((threats.data?.items ?? []).map(threatOf)),
      standards: byId((standards.data?.items ?? []).map(standardOf)),
      framing: (framing.data?.items ?? []).map(framingOf),
      elements: (elements.data?.items ?? []).map((item) => ({
        id: item.id,
        name: text(item.name),
        role: text(item.role),
      })),
      claimTypes: new Map((claimTypes.data?.items ?? []).map((item) => [item.id, text(item.name)])),
    }),
    [designs.data, threats.data, standards.data, framing.data, elements.data, claimTypes.data],
  );
  const pending = [designs, threats, standards, framing, elements, claimTypes].some((query) => query.isPending);
  return { ...data, pending };
}

export type BankReference = ReturnType<typeof useBankReference>;

/** Where a step of the bank stands in this context's outline. */
export interface StepPlace {
  section: string;
  move: number;
  step: string;
}

/** Every step of the context's outline, by id, with the section and move it sits in. */
export function stepPlaces(blueprint: Blueprint) {
  const places = new Map<string, StepPlace>();
  for (const section of blueprint.sections) {
    const names = new Map(section.steps.map((step) => [step.id, step.name]));
    section.moves.forEach((move, index) => {
      for (const id of move.steps)
        if (!places.has(id)) places.set(id, { section: section.label, move: index + 1, step: names.get(id) ?? id });
    });
  }
  return places;
}

export function placeText(place: StepPlace) {
  return `${place.section} · Move ${place.move} · ${place.step}`;
}

/** The context's standards: those its research designs call for, the most called first, with who calls each. */
export function contextStandards(designIds: string[], reference: BankReference) {
  const askedBy = new Map<string, string[]>();
  for (const id of designIds) {
    const design = reference.designs.get(id);
    if (!design) continue;
    for (const standard of design.standards) askedBy.set(standard, [...(askedBy.get(standard) ?? []), design.name]);
  }
  return [...askedBy.entries()]
    .flatMap(([id, designs]) => {
      const standard = reference.standards.get(id);
      return standard ? [{ standard, designs }] : [];
    })
    .sort((a, b) => b.designs.length - a.designs.length || a.standard.name.localeCompare(b.standard.name));
}

/** The order a paper frames its study in, and what each element of the framing is called. */
export const FRAMING_ELEMENTS: [string, string][] = [
  ["problem", "Problems"],
  ["gap", "Gaps"],
  ["objective", "Objectives"],
  ["research_question", "Research questions"],
  ["hypothesis", "Hypotheses"],
  ["scope", "Scope"],
  ["assumption", "Assumptions"],
  ["contribution", "Contributions"],
  ["limitation", "Limitations"],
  ["implication", "Implications"],
  ["future_work", "Future work"],
];
