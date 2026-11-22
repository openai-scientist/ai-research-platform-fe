"use client";

import { useState } from "react";

import { cn } from "cn";
import { ChevronRight, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { CARD_KINDS, type CardKind, LEVEL_LABELS, LevelBadge, TEXT_LEVELS } from "./bank-colors";
import { type CardRow, usageText } from "./context-cards-index";
import { type CardOpener, FrameText } from "./step-sheet";
import { plural } from "./writing-bank-format";

const KINDS: CardKind[] = ["rules", "techniques", "words", "frames", "overclaims"];
const LEVEL_ORDER = [...TEXT_LEVELS, "process"];

/** How many places a row lists before it counts the rest. */
const PLACES_SHOWN = 2;

function Places({ row }: { readonly row: CardRow }) {
  if (row.usedIn.length === 0) return <span className="text-muted-foreground">—</span>;
  const shown = row.usedIn.slice(0, PLACES_SHOWN);
  const more = row.usedIn.length - shown.length;
  return (
    <ul className="flex flex-col gap-0.5">
      {shown.map((usage) => (
        <li key={usage.key} className="truncate" title={usageText(usage)}>
          {usageText(usage)}
        </li>
      ))}
      {more > 0 && <li className="text-muted-foreground">and {plural(more, "more place")}</li>}
    </ul>
  );
}

/**
 * Every card the research context gives, by kind: what each says in a line, the level of the text it works at, and
 * where in the paper the context uses it. A row opens the full card with its links.
 */
/** Whether the card is this context's own or shared, and with how many of the release's contexts. */
function Share({ shared, contexts }: { readonly shared: number | null; readonly contexts: number | null }) {
  if (shared == null || contexts == null) return null;
  if (shared === 1)
    return (
      <Badge variant="outline" className="border-foreground/70 font-medium">
        Only this context
      </Badge>
    );
  if (shared === contexts) return <span className="text-muted-foreground text-sm">All {contexts} contexts</span>;
  return (
    <span className="text-sm">
      {shared} of {contexts} contexts
    </span>
  );
}

export function CardsTab({
  cards,
  contexts,
  onOpen,
}: {
  readonly cards: Record<CardKind, CardRow[]>;
  /** How many research contexts the bank release holds, to read each card's share against. */
  readonly contexts: number | null;
  readonly onOpen: CardOpener;
}) {
  const [kind, setKind] = useState<CardKind>("rules");
  // One level of the text at a time; null until the reader picks one, which shows the first level that has cards.
  const [picked, setPicked] = useState<string | null>(null);
  const [own, setOwn] = useState(false);
  const [query, setQuery] = useState("");

  const all = cards[kind];
  const levels = LEVEL_ORDER.filter((name) => all.some((row) => row.level === name));
  const level = picked && levels.includes(picked) ? picked : (levels[0] ?? null);
  const needle = query.trim().toLowerCase();
  const rows = all
    .filter((row) => levels.length < 2 || row.level === level)
    .filter((row) => !own || (contexts != null && row.shared != null && row.shared < contexts))
    .filter(
      (row) =>
        !needle || row.title.toLowerCase().includes(needle) || (row.summary ?? "").toLowerCase().includes(needle),
    )
    .sort((a, b) => LEVEL_ORDER.indexOf(a.level ?? "") - LEVEL_ORDER.indexOf(b.level ?? ""));

  return (
    <Card className="gap-0 py-0">
      <div className="flex flex-col gap-3 border-b px-4 py-4">
        <div className="-mx-1 overflow-x-auto overflow-y-hidden px-1 pb-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Tabs
            value={kind}
            onValueChange={(value) => {
              setKind(value as CardKind);
              setPicked(null);
            }}
          >
            <TabsList>
              {KINDS.map((name) => (
                <TabsTrigger key={name} value={name} className="gap-2">
                  <span className={cn("size-2 rounded-full", CARD_KINDS[name].dot)} aria-hidden="true" />
                  {CARD_KINDS[name].label}
                  <span className="text-muted-foreground tabular-nums">{cards[name].length}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          {levels.length > 1 ? (
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={level ?? ""}
              // A level stays chosen: pressing it again does not clear the filter.
              onValueChange={(value) => value && setPicked(value)}
              aria-label="Level of the text"
              className="flex-wrap"
            >
              {levels.map((name) => (
                <ToggleGroupItem key={name} value={name} className="gap-1.5">
                  {LEVEL_LABELS[name] ?? name}
                  <span className="text-muted-foreground tabular-nums">
                    {all.filter((row) => row.level === name).length}
                  </span>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          ) : (
            <span />
          )}
          <div className="flex flex-wrap items-center gap-3">
            {contexts != null && (
              <div className="flex items-center gap-2">
                <Switch id="own-cards" checked={own} onCheckedChange={setOwn} />
                <Label htmlFor="own-cards" className="font-normal">
                  Not in every context
                </Label>
              </div>
            )}
            <InputGroup className="w-full lg:w-72">
              <InputGroupAddon>
                <Search aria-hidden="true" />
              </InputGroupAddon>
              <InputGroupInput
                type="search"
                aria-label={`Search ${CARD_KINDS[kind].label.toLowerCase()}`}
                placeholder={`Search ${CARD_KINDS[kind].label.toLowerCase()}`}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </InputGroup>
          </div>
        </div>
      </div>

      <Table className="table-fixed" aria-label={`${CARD_KINDS[kind].label} of this research context`}>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-4">{CARD_KINDS[kind].one}</TableHead>
            <TableHead className="hidden w-28 sm:table-cell">Level</TableHead>
            <TableHead className="hidden w-[34%] md:table-cell">Shared and used in</TableHead>
            <TableHead className="w-10 pr-4">
              <span className="sr-only">Open</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                {all.length === 0 ? "This research context gives none." : "No card matches."}
              </TableCell>
            </TableRow>
          )}
          {rows.map((row) => (
            <TableRow
              key={`${row.collection}/${row.id}`}
              className="cursor-pointer [&>td]:align-top"
              onClick={() => onOpen(row.collection, row.id, row.title)}
            >
              <TableCell className="whitespace-normal py-3 pl-4">
                <p className="font-medium">{row.frame ? <FrameText text={row.title} /> : row.title}</p>
                {row.summary && <p className="mt-0.5 line-clamp-2 text-muted-foreground text-sm">{row.summary}</p>}
                <div className="mt-1 text-muted-foreground text-xs md:hidden">
                  <Places row={row} />
                </div>
              </TableCell>
              <TableCell className="hidden py-3 sm:table-cell">
                {row.level ? <LevelBadge level={row.level} /> : <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="hidden whitespace-normal py-3 text-sm md:table-cell">
                <div className="mb-1">
                  <Share shared={row.shared} contexts={contexts} />
                </div>
                <Places row={row} />
              </TableCell>
              <TableCell className="py-3 pr-4 text-muted-foreground">
                <ChevronRight className="size-4" aria-hidden="true" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
