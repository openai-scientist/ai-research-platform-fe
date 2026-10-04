"use client";

import { useState } from "react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useInfiniteResearchContextVersions, useResearchContextVersionQuery } from "@/hooks/use-research-context-query";
import type { ResearchContextItem } from "@/lib/api/services/fetch-research-context";

import { ContextDisclosure } from "./context-disclosure";
import { ListState, LoadMore } from "./workspace-ui";

function VersionContent({ projectId, version }: { projectId: string; version: number }) {
  const query = useResearchContextVersionQuery(projectId, version);
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <ListState
        pending={query.isPending}
        failed={query.isError}
        empty={!query.data}
        title="Context version"
        retry={query.refetch}
      />
      {query.data && <ContextSnapshot context={query.data.data} />}
    </div>
  );
}

function ContextValue({ value }: { value: unknown }) {
  if (value == null) return <span className="text-muted-foreground">Not specified</span>;
  if (Array.isArray(value))
    return (
      <ul className="flex list-disc flex-col gap-1 pl-5">
        {value.map((item, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: Saved version values are immutable and may contain duplicates.
          <li key={index}>
            <ContextValue value={item} />
          </li>
        ))}
      </ul>
    );
  if (typeof value === "object")
    return (
      <dl className="flex flex-col gap-2">
        {Object.entries(value).map(([key, item]) => (
          <div key={key}>
            <dt className={key === "role" ? "sr-only" : "font-medium"}>{key.replaceAll("_", " ")}</dt>
            <dd className="mt-1">
              <ContextValue value={item} />
            </dd>
          </div>
        ))}
      </dl>
    );
  return <span className="whitespace-pre-wrap break-words">{String(value)}</span>;
}

function hasContent(value: unknown): boolean {
  if (value == null || value === "") return false;
  if (typeof value === "object") return Object.values(value).some(hasContent);
  return true;
}

const detailLabels: Record<string, string> = {
  assumptions: "Assumptions",
  constraints: "Constraints",
  design: "Study design",
  concepts: "Key concepts",
  notes: "Notes",
};

function VariableValue({ value }: { value: unknown }) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return <ContextValue value={value} />;
  const { role, ...rest } = value as Record<string, unknown>;
  return (
    <div className="flex min-w-0 flex-col gap-2">
      {typeof role === "string" && (
        <Badge variant="secondary" className="h-auto min-h-5 max-w-full whitespace-normal break-words capitalize">
          {role}
        </Badge>
      )}
      {hasContent(rest) && <ContextValue value={rest} />}
    </div>
  );
}

export function ContextSnapshot({
  context,
  showMetadata = true,
}: {
  context: ResearchContextItem;
  showMetadata?: boolean;
}) {
  const { domain, objectives, variables, ...details } = context.front_matter ?? {};
  const savedObjectives = (objectives ?? []).filter(hasContent);
  const savedVariables = Object.entries(variables ?? {});
  const savedDetails = Object.entries(details).filter(([, value]) => hasContent(value));
  return (
    <div className="@container flex min-w-0 flex-col gap-6 text-sm">
      {showMetadata && (
        <p className="text-muted-foreground text-xs">
          Version {context.version_number} · {new Date(context.created_at).toLocaleString()}
        </p>
      )}
      <section aria-label="Research question" className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold text-base">Research question & context</h3>
          {domain && (
            <Badge variant="secondary" className="h-auto min-h-5 max-w-full whitespace-normal break-words">
              Research area: {domain}
            </Badge>
          )}
        </div>
        <p className="max-w-prose whitespace-pre-wrap break-words text-base leading-relaxed">{context.body}</p>
      </section>
      {(savedObjectives.length > 0 || savedVariables.length > 0) && (
        <>
          <Separator />
          <div
            className={
              savedObjectives.length > 0 && savedVariables.length > 0
                ? "grid min-w-0 @3xl:grid-cols-2 gap-6"
                : "grid min-w-0 gap-6"
            }
          >
            {savedObjectives.length > 0 && (
              <section aria-label="Objectives" className="flex min-w-0 flex-col gap-3">
                <h3 className="flex items-center gap-2 font-semibold">
                  Objectives <Badge variant="outline">{savedObjectives.length}</Badge>
                </h3>
                <ol className="flex list-decimal flex-col gap-3 pl-5 leading-relaxed marker:text-muted-foreground">
                  {savedObjectives.map((value, index) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: Immutable saved objectives may contain duplicates.
                    <li key={index} className="min-w-0 pl-1">
                      <ContextValue value={value} />
                    </li>
                  ))}
                </ol>
              </section>
            )}
            {savedVariables.length > 0 && (
              <section aria-label="Dataset variables" className="flex min-w-0 flex-col gap-3">
                <h3 className="flex items-center gap-2 font-semibold">
                  Dataset variables <Badge variant="outline">{savedVariables.length}</Badge>
                </h3>
                <dl className="flex min-w-0 flex-col divide-y">
                  {savedVariables.map(([name, value]) => (
                    <div
                      key={name}
                      className="flex min-w-0 flex-wrap items-start justify-between gap-2 py-3 first:pt-0 last:pb-0"
                    >
                      <dt className="min-w-0 flex-1 break-words font-medium">{name}</dt>
                      <dd className="min-w-0 max-w-full">
                        <VariableValue value={value} />
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}
          </div>
        </>
      )}
      {savedDetails.length > 0 && (
        <>
          <Separator />
          <ContextDisclosure title="Additional research details">
            <dl className="grid min-w-0 @3xl:grid-cols-2 gap-5">
              {savedDetails.map(([key, value]) => (
                <div key={key} className="min-w-0">
                  <dt className="mb-2 font-semibold">{detailLabels[key] ?? key.replaceAll("_", " ")}</dt>
                  <dd className="text-muted-foreground leading-relaxed">
                    <ContextValue value={value} />
                  </dd>
                </div>
              ))}
            </dl>
          </ContextDisclosure>
        </>
      )}
    </div>
  );
}

export function ContextHistory({ projectId }: { projectId: string }) {
  const versions = useInfiniteResearchContextVersions(projectId);
  const [selected, setSelected] = useState("");
  const items = [...versions.versions].sort((a, b) => b.version_number - a.version_number);
  return (
    <section aria-label="Context history" className="flex min-w-0 flex-col gap-4">
      <ListState
        pending={versions.isPending}
        failed={versions.isError}
        empty={!items.length}
        title="Context versions"
        retry={versions.refetch}
      />
      <Accordion type="single" collapsible value={selected} onValueChange={setSelected} className="gap-3">
        {items.map((version) => (
          <AccordionItem key={version.id} value={String(version.version_number)} asChild>
            <Card className="min-w-0 shrink-0 gap-0 px-4 py-0">
              <AccordionTrigger className="gap-4 py-3">
                <span className="flex min-w-0 flex-col gap-1">
                  <span>Version {version.version_number}</span>
                  <span className="text-muted-foreground text-xs">{new Date(version.created_at).toLocaleString()}</span>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                {selected === String(version.version_number) && (
                  <VersionContent projectId={projectId} version={version.version_number} />
                )}
              </AccordionContent>
            </Card>
          </AccordionItem>
        ))}
      </Accordion>
      <LoadMore visible={Boolean(versions.hasNextPage)} pending={versions.isFetching} onClick={versions.loadMore} />
    </section>
  );
}
