"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ChevronRight, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AdminContextItem } from "@/lib/api/services/fetch-writing-bank";

import type { useWritingBankActions } from "./use-writing-bank-actions";
import { DefaultBadge, ScopeBadge } from "./writing-bank-badges";
import { contextHref } from "./writing-bank-format";

type Actions = ReturnType<typeof useWritingBankActions>;

/** The research contexts of a journal, one row each: what it is for, and whether users may pick it. */
export function ContextCards({
  journalId,
  journalOffered,
  contexts,
  actions,
}: {
  readonly journalId: string;
  readonly journalOffered: boolean;
  readonly contexts: AdminContextItem[];
  readonly actions: Actions;
}) {
  const router = useRouter();
  const on = contexts.filter((context) => context.settings.enabled).length;
  const hint = (() => {
    if (contexts.length === 0) return "The bank has no research context for this journal.";
    if (!journalOffered)
      return `Offer the journal first: until then users see none of its ${contexts.length} contexts.`;
    if (on === 0) return "Turn on at least one context, or users cannot write for this journal.";
    return `Users pick one of the ${on} turned on. It fixes the paper's sections, moves and paragraph plan.`;
  })();

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b py-4">
        <CardTitle>Research contexts</CardTitle>
        <CardDescription>{hint}</CardDescription>
      </CardHeader>
      {contexts.length > 0 && (
        <Table className="table-fixed" aria-label="Research contexts of this journal">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead scope="col" className="pl-4">
                Research context
              </TableHead>
              <TableHead scope="col" className="hidden w-64 lg:table-cell">
                Paper structure
              </TableHead>
              <TableHead scope="col" className="hidden w-24 md:table-cell">
                Sections
              </TableHead>
              <TableHead scope="col" className="w-32">
                Can be picked
              </TableHead>
              <TableHead scope="col" className="hidden w-40 sm:table-cell">
                Default
              </TableHead>
              <TableHead scope="col" className="w-10 pr-4">
                <span className="sr-only">Open</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contexts.map((context) => (
              <ContextRow
                key={context.id}
                journalId={journalId}
                journalOffered={journalOffered}
                context={context}
                actions={actions}
                onOpen={() => router.push(contextHref(journalId, context.id))}
              />
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}

function ContextRow({
  journalId,
  journalOffered,
  context,
  actions,
  onOpen,
}: {
  readonly journalId: string;
  readonly journalOffered: boolean;
  readonly context: AdminContextItem;
  readonly actions: Actions;
  readonly onOpen: () => void;
}) {
  const saving = actions.pendingContext?.contextId === context.id && actions.pendingContext.journalId === journalId;
  const checked = saving ? (actions.pendingContext?.enabled ?? context.settings.enabled) : context.settings.enabled;
  const ref = { journalId, id: context.id, name: context.shortName, isDefault: context.settings.is_default };
  const canBeDefault = journalOffered && context.settings.enabled;
  const switchId = `context-${context.id}`;
  const stop = (event: React.SyntheticEvent) => event.stopPropagation();

  return (
    <TableRow className="cursor-pointer" onClick={onOpen}>
      <TableCell className="whitespace-normal py-3 pl-4">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={contextHref(journalId, context.id)}
              className="font-medium underline-offset-4 hover:underline"
              onClick={stop}
            >
              {context.shortName}
            </Link>
            <ScopeBadge scope={context.scope} />
          </div>
          <p className="truncate text-muted-foreground text-sm" title={context.whenToUse}>
            {context.whenToUse}
          </p>
        </div>
      </TableCell>
      <TableCell className="hidden whitespace-normal py-3 lg:table-cell">{context.macroStructure.name}</TableCell>
      <TableCell className="hidden py-3 tabular-nums md:table-cell">{context.sections}</TableCell>
      <TableCell className="py-3" onClick={stop}>
        <div className="flex items-center gap-2">
          <Switch
            id={switchId}
            checked={checked}
            disabled={saving}
            aria-label={`${checked ? "Turn off" : "Turn on"} ${context.shortName}`}
            onCheckedChange={(value) => actions.setContextEnabled(ref, value)}
          />
          <Label htmlFor={switchId} className={checked ? "font-medium" : "text-muted-foreground"}>
            {checked ? "On" : "Off"}
          </Label>
        </div>
      </TableCell>
      <TableCell className="hidden py-2 sm:table-cell" onClick={stop}>
        <DefaultCell
          isDefault={context.settings.is_default}
          canBeDefault={canBeDefault}
          actions={actions}
          refItem={ref}
        />
      </TableCell>
      <TableCell className="py-3 pr-4 text-muted-foreground">
        <ChevronRight className="size-4" aria-hidden="true" />
      </TableCell>
    </TableRow>
  );
}

/** The default research context: shown with a way to clear it, offered where it can be set, else nothing. */
function DefaultCell({
  isDefault,
  canBeDefault,
  actions,
  refItem,
}: {
  readonly isDefault: boolean;
  readonly canBeDefault: boolean;
  readonly actions: Actions;
  readonly refItem: Parameters<Actions["makeDefault"]>[0];
}) {
  if (isDefault)
    return (
      <div className="flex items-center gap-2">
        <DefaultBadge />
        <Button
          variant="ghost"
          size="sm"
          disabled={actions.defaultPending}
          onClick={() => actions.clearDefault(refItem)}
        >
          Clear
        </Button>
      </div>
    );
  if (!canBeDefault) return <span className="text-muted-foreground text-sm">—</span>;
  return (
    <Button variant="ghost" size="sm" disabled={actions.defaultPending} onClick={() => actions.makeDefault(refItem)}>
      <Star data-icon="inline-start" />
      Set as default
    </Button>
  );
}
