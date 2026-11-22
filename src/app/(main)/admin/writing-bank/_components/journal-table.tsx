"use client";

import { useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ChevronRight, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AdminJournalItem, JournalKind } from "@/lib/api/services/fetch-writing-bank";

import { DefaultBadge, EntryStatusBadge, KindBadge } from "./writing-bank-badges";
import { humanize, journalHref, KIND_LABELS, publisherName } from "./writing-bank-format";

type KindFilter = "all" | JournalKind;
type OfferedFilter = "all" | "offered" | "hidden";

/**
 * How many of a journal's research contexts users can pick, in words. A context turned on in a journal that is not
 * offered reaches no one yet: it is ready, not offered.
 */
function contextsText(journal: AdminJournalItem) {
  const on = journal.settings.enabled_contexts;
  const all = journal.contexts;
  if (all === 0) return "None in the bank";
  const word = journal.settings.enabled ? "offered" : "ready";
  if (on === 0) return `None of ${all} turned on`;
  if (on === all) return `All ${all} ${word}`;
  return `${on} of ${all} ${word}`;
}

export function JournalTable({
  items,
  pending,
  busy,
  pendingJournal,
  onToggle,
}: {
  readonly items: AdminJournalItem[];
  readonly pending: boolean;
  readonly busy: boolean;
  readonly pendingJournal: { journalId: string; enabled: boolean } | undefined;
  readonly onToggle: (journal: AdminJournalItem, enabled: boolean) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<KindFilter>("all");
  const [offered, setOffered] = useState<OfferedFilter>("all");

  const needle = query.trim().toLowerCase();
  const rows = items.filter((item) => {
    if (kind !== "all" && item.kind !== kind) return false;
    if (offered !== "all" && item.settings.enabled !== (offered === "offered")) return false;
    if (!needle) return true;
    return [item.name, item.id, publisherName(item.publisher) ?? "", item.discipline ?? ""].some((value) =>
      value.toLowerCase().includes(needle),
    );
  });
  const filtered = Boolean(needle) || kind !== "all" || offered !== "all";
  const onCount = items.filter((item) => item.settings.enabled).length;

  // What to do next, in one line: the table is where an admin acts.
  const hint = (() => {
    if (pending) return "Loading journals…";
    if (items.length === 0) return "The bank release has no journals.";
    if (filtered) return `${rows.length} of ${items.length} journals match the filters.`;
    if (onCount === 0) return "No journal is offered yet. Turn one on to let users pick it when they write.";
    return `${onCount} of ${items.length} journals are offered. Open a journal to choose its research contexts.`;
  })();

  return (
    <Card className="gap-0 py-0">
      <div className="flex flex-col gap-3 border-b px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <CardTitle>All journals</CardTitle>
          <CardDescription>{hint}</CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <InputGroup className="w-full sm:w-64">
            <InputGroupAddon>
              <Search aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              type="search"
              aria-label="Search journals"
              placeholder="Search journals"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </InputGroup>
          <Select value={kind} onValueChange={(value) => setKind(value as KindFilter)}>
            <SelectTrigger className="w-44" aria-label="Filter by kind">
              <span className="text-muted-foreground">Kind:</span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="journal">{KIND_LABELS.journal}</SelectItem>
                <SelectItem value="conference">{KIND_LABELS.conference}</SelectItem>
                <SelectItem value="generic_profile">{KIND_LABELS.generic_profile}</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select value={offered} onValueChange={(value) => setOffered(value as OfferedFilter)}>
            <SelectTrigger className="w-40" aria-label="Filter by availability">
              <span className="text-muted-foreground">Offered:</span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="offered">Yes</SelectItem>
                <SelectItem value="hidden">No</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Table className="table-fixed" aria-label="Journals in the Writing Bank">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead scope="col" className="pl-4">
              Journal
            </TableHead>
            <TableHead scope="col" className="hidden w-40 sm:table-cell">
              Kind
            </TableHead>
            <TableHead scope="col" className="hidden w-44 lg:table-cell">
              Discipline
            </TableHead>
            <TableHead scope="col" className="hidden w-56 md:table-cell">
              Research contexts
            </TableHead>
            <TableHead scope="col" className="hidden w-32 xl:table-cell">
              Bank review
            </TableHead>
            <TableHead scope="col" className="w-32">
              Offered
            </TableHead>
            <TableHead scope="col" className="w-10 pr-4">
              <span className="sr-only">Open</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pending &&
            ["a", "b", "c", "d"].map((key) => (
              <TableRow key={key} className="hover:bg-transparent">
                <TableCell colSpan={7} className="px-4 py-3">
                  <Skeleton className="h-9 w-full" />
                </TableCell>
              </TableRow>
            ))}
          {!pending && rows.length === 0 && (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={7} className="h-28 text-center text-muted-foreground">
                {items.length === 0 ? (
                  "The bank release has no journals."
                ) : (
                  <span className="inline-flex items-center gap-2">
                    No journal matches these filters.
                    <Button
                      variant="link"
                      className="h-auto p-0"
                      onClick={() => {
                        setQuery("");
                        setKind("all");
                        setOffered("all");
                      }}
                    >
                      Clear filters
                    </Button>
                  </span>
                )}
              </TableCell>
            </TableRow>
          )}
          {!pending &&
            rows.map((journal) => {
              const publisher = publisherName(journal.publisher);
              const saving = pendingJournal?.journalId === journal.id;
              const checked = saving ? pendingJournal.enabled : journal.settings.enabled;
              const switchId = `offer-${journal.id}`;
              return (
                <TableRow
                  key={journal.id}
                  className="cursor-pointer"
                  onClick={() => router.push(journalHref(journal.id))}
                >
                  <TableCell className="whitespace-normal py-3 pl-4">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <Link
                          href={journalHref(journal.id)}
                          className="font-medium underline-offset-4 hover:underline"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {journal.name}
                        </Link>
                        {journal.settings.is_default && <DefaultBadge />}
                      </div>
                      {publisher && <span className="truncate text-muted-foreground text-sm">{publisher}</span>}
                    </div>
                  </TableCell>
                  <TableCell className="hidden py-3 sm:table-cell">
                    <KindBadge kind={journal.kind} />
                  </TableCell>
                  <TableCell className="hidden truncate py-3 lg:table-cell">{humanize(journal.discipline)}</TableCell>
                  <TableCell
                    className={`hidden py-3 md:table-cell ${journal.settings.enabled && journal.settings.enabled_contexts ? "" : "text-muted-foreground"}`}
                  >
                    {contextsText(journal)}
                  </TableCell>
                  <TableCell className="hidden py-3 xl:table-cell">
                    <EntryStatusBadge status={journal.status} />
                  </TableCell>
                  <TableCell className="py-3" onClick={(event) => event.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <Switch
                        id={switchId}
                        checked={checked}
                        disabled={busy || saving}
                        aria-label={`${checked ? "Stop offering" : "Offer"} ${journal.name}`}
                        onCheckedChange={(value) => onToggle(journal, value)}
                      />
                      <Label htmlFor={switchId} className={checked ? "font-medium" : "text-muted-foreground"}>
                        {checked ? "On" : "Off"}
                      </Label>
                    </div>
                  </TableCell>
                  <TableCell className="py-3 pr-4 text-muted-foreground">
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </TableCell>
                </TableRow>
              );
            })}
        </TableBody>
      </Table>
    </Card>
  );
}
