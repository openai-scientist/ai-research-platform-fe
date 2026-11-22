"use client";

import { ChevronRight } from "lucide-react";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { JournalEntry, JournalRequirement } from "@/lib/api/services/fetch-writing-bank";

import { ForceBadge, ToneBadge } from "./writing-bank-badges";
import { humanize, humanizeId, styleParts, venueSectionName, verificationLabel } from "./writing-bank-format";

/** What the venue itself asks of a paper, as the bank records it: its sections, its rules and its styles. */
export function VenueProfile({ journal }: { readonly journal: JournalEntry }) {
  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b py-4">
        <CardTitle className="flex flex-wrap items-center gap-2">
          Venue profile
          {journal.verification !== "verified" && (
            <ToneBadge tone="look">{verificationLabel(journal.verification)}</ToneBadge>
          )}
        </CardTitle>
        <CardDescription>
          What the bank records about this venue. Every research context of the journal follows it.
        </CardDescription>
      </CardHeader>
      <Tabs defaultValue="sections" className="gap-0">
        <TabsList variant="line" className="px-4 pt-2">
          <TabsTrigger value="sections">Sections · {journal.sectionMap.length}</TabsTrigger>
          <TabsTrigger value="requirements">Requirements · {journal.requirements.length}</TabsTrigger>
          <TabsTrigger value="styles">Writing styles · {journal.styles.length}</TabsTrigger>
        </TabsList>
        <TabsContent value="sections" className="p-4">
          <SectionMap journal={journal} />
        </TabsContent>
        <TabsContent value="requirements" className="pb-2">
          <Requirements requirements={journal.requirements} />
        </TabsContent>
        <TabsContent value="styles" className="pb-2">
          <Styles journal={journal} />
        </TabsContent>
      </Tabs>
    </Card>
  );
}

/** The bank section a venue section maps to, said only when it differs from the venue's own name. */
function mappedName(name: string, section: string | null | undefined) {
  if (!section) return "No single section";
  const bank = humanize(section);
  return bank.toLowerCase() === venueSectionName(name).toLowerCase() ? "" : `Bank section: ${bank}`;
}

function SectionMap({ journal }: { readonly journal: JournalEntry }) {
  if (journal.sectionMap.length === 0)
    return <p className="text-muted-foreground text-sm">The bank records no section names for this venue.</p>;
  const notes = journal.sectionMap
    .map((entry) => ({
      name: venueSectionName(entry.name),
      note: [mappedName(entry.name, entry.section), entry.note].filter(Boolean).join(". "),
    }))
    .filter((entry) => entry.note);
  return (
    <div className="flex flex-col gap-3">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-2 text-sm" aria-label="Sections in the venue's order">
        {journal.sectionMap.map((entry, index) => (
          <li key={entry.name} className="flex items-center gap-1.5">
            {index > 0 && <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden="true" />}
            <span className="rounded-md border bg-muted/40 px-2 py-1 font-medium">{venueSectionName(entry.name)}</span>
          </li>
        ))}
      </ol>
      {notes.length > 0 && (
        <ul className="flex flex-col gap-1 text-muted-foreground text-sm">
          {notes.map((entry) => (
            <li key={entry.name}>
              <span className="font-medium text-foreground">{entry.name}:</span> {entry.note}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function basisText(requirement: JournalRequirement) {
  const source = requirement.basis.sources[0];
  const where = source ? [humanizeId(source.source), source.locator].filter(Boolean).join(", ") : null;
  return [requirement.basis.limits, where].filter(Boolean).join(" · ") || "—";
}

function Requirements({ requirements }: { readonly requirements: JournalRequirement[] }) {
  if (requirements.length === 0)
    return <p className="p-4 text-muted-foreground text-sm">The bank records no requirement for this venue.</p>;
  return (
    <Table className="table-fixed">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-40 pl-4">Kind</TableHead>
          <TableHead>Requirement</TableHead>
          <TableHead className="w-28">Force</TableHead>
          <TableHead className="hidden w-[38%] pr-4 lg:table-cell">Basis</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {requirements.map((requirement) => (
          <TableRow key={`${requirement.kind}-${requirement.ref}`} className="hover:bg-transparent">
            <TableCell className="pl-4 text-muted-foreground">{humanize(requirement.kind)}</TableCell>
            <TableCell className="whitespace-normal font-medium">{humanizeId(requirement.ref)}</TableCell>
            <TableCell>
              <ForceBadge force={requirement.force} />
            </TableCell>
            <TableCell className="hidden whitespace-normal pr-4 text-muted-foreground lg:table-cell">
              {basisText(requirement)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function Styles({ journal }: { readonly journal: JournalEntry }) {
  if (journal.styles.length === 0)
    return <p className="p-4 text-muted-foreground text-sm">The bank records no writing style for this venue.</p>;
  return (
    <Table className="table-fixed">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-48 pl-4">Aspect</TableHead>
          <TableHead className="w-64">Style</TableHead>
          <TableHead className="w-28">Force</TableHead>
          <TableHead className="hidden pr-4 md:table-cell">Why</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {journal.styles.map((style) => {
          const parts = styleParts(style.style, style.axis);
          return (
            <TableRow key={`${style.axis}-${style.style}`} className="hover:bg-transparent">
              <TableCell className="whitespace-normal pl-4 text-muted-foreground">{parts.axis}</TableCell>
              <TableCell className="whitespace-normal font-medium">{parts.style}</TableCell>
              <TableCell>
                <ForceBadge force={style.force} />
              </TableCell>
              <TableCell className="hidden whitespace-normal pr-4 text-muted-foreground md:table-cell">
                {style.basis}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
