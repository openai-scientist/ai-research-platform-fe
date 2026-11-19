"use client";

import { useState } from "react";

import Link from "next/link";

import { ArrowUpRight, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import type { DataCardBody } from "@/lib/api/services/fetch-dataset-runs";
import type { DatasetRunModel } from "@/lib/run-stream/dataset-run-model";

import { groupIssues, privacyChips, privacyNotes } from "../dataset-review-state";
import { IssueCards, PrivacyChips, RoleDiagram, VariableMatrix } from "../dataset-review-visuals";

const number = (value: number) => value.toLocaleString("en-US");

function fitnessText(fitness: DatasetRunModel["items"][string] | undefined) {
  if (fitness?.reason) return fitness.reason;
  if (fitness?.state === "green") return "Fitness check passed.";
  return "No fitness verdict was recorded.";
}

export function DatasetCardPreview({
  card,
  loading,
  href,
  fitness,
  localNotes,
}: {
  card?: DataCardBody | null;
  loading?: boolean;
  href?: string;
  fitness?: DatasetRunModel["items"][string];
  localNotes?: string[];
}) {
  const [expanded, setExpanded] = useState(false);
  if (!card)
    return loading ? (
      <Skeleton aria-label="Loading the data card" className="h-24 w-full" />
    ) : (
      <p className="text-muted-foreground text-sm">No data card was found for this run.</p>
    );

  const notes = [...new Set([...(card.caveats ?? []), ...(card.gaps ?? []), ...(localNotes ?? [])])];
  const { kept, other } = privacyNotes(notes);
  const issues = expanded ? groupIssues(card.variables, notes) : [];
  const chips = expanded ? privacyChips(card.variables, notes) : [];
  return (
    <section aria-label="Data card" className="min-w-0">
      <Collapsible open={expanded} onOpenChange={setExpanded} className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
          <div className="min-w-0">
            <h4 className="wrap-anywhere font-semibold text-sm">{card.title}</h4>
            <p className="text-muted-foreground text-xs">
              {number(card.n_rows)} rows · {number(card.n_columns)} columns
            </p>
          </div>
          <CollapsibleTrigger asChild>
            <Button type="button" variant="outline" size="sm">
              {expanded ? "Collapse details" : "Expand data card"}
              <ChevronsUpDown data-icon="inline-end" />
            </Button>
          </CollapsibleTrigger>
        </div>
        {expanded && card.description && <p className="wrap-anywhere text-sm">{card.description}</p>}
        <VariableMatrix variables={card.variables} rows={card.n_rows} compact={!expanded} />
        <dl className="grid gap-2 text-xs sm:grid-cols-2">
          <div className="grid content-start gap-1">
            <dt className="font-medium">Split</dt>
            <dd className="wrap-anywhere text-muted-foreground">
              {card.split
                ? `${number(card.split.n_exploration)} exploration · ${number(card.split.n_confirmation)} confirmation`
                : "Not recorded"}
            </dd>
          </div>
          <div className="grid content-start gap-1">
            <dt className="font-medium">Fitness and gaps</dt>
            <dd className="wrap-anywhere text-muted-foreground">
              {fitnessText(fitness)}
              {Boolean(card.gaps?.length) &&
                ` · ${card.gaps?.length} recorded ${card.gaps?.length === 1 ? "gap" : "gaps"}`}
            </dd>
          </div>
        </dl>
        {kept.length > 0 && (
          <p className="text-muted-foreground text-xs">
            Withheld by the Local Node · {kept.length} {kept.length === 1 ? "limit" : "limits"} recorded
          </p>
        )}
        <CollapsibleContent className="flex flex-col gap-3 border-t pt-3">
          {card.unit_of_observation && (
            <p className="wrap-anywhere text-muted-foreground text-xs">
              Unit of observation · {card.unit_of_observation}
            </p>
          )}
          {card.split && (
            <p className="wrap-anywhere text-muted-foreground text-xs">
              {card.split.method === "random_rows"
                ? "Random rows"
                : `By unit · ${card.split.unit_column ?? "Column not recorded"}`}
              {" · "}Seed {card.split.seed}
            </p>
          )}
          <RoleDiagram variables={card.variables} />
          {issues.length > 0 && <IssueCards groups={issues} />}
          {chips.length > 0 && <PrivacyChips chips={chips} />}
          {notes.length > 0 && (
            <ul
              aria-label="Caveats and withheld fields"
              className="grid list-disc gap-1 pl-4 text-muted-foreground text-xs"
            >
              {other.map((note) => (
                <li key={note} className="wrap-anywhere">
                  {note}
                </li>
              ))}
              {kept.map((note) => (
                <li key={note} className="wrap-anywhere">
                  Withheld · {note}
                </li>
              ))}
            </ul>
          )}
        </CollapsibleContent>
        {href && (
          <Button asChild variant="link" size="sm" className="w-fit px-0">
            <Link href={href}>
              Open the Data card <ArrowUpRight data-icon="inline-end" />
            </Link>
          </Button>
        )}
      </Collapsible>
    </section>
  );
}
