"use client";

import { useState } from "react";

import { CalendarDays, Check, ChevronDown, Copy, Database, Hash, ToggleLeft, Type } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { DatasetVersionItem, LocalCard } from "@/lib/api/services/fetch-datasets";

const flagLabels: Record<string, { label: string; explanation: string; warning: boolean }> = {
  possible_pii: {
    label: "Possible PII",
    explanation: "This variable may contain personally identifying information.",
    warning: true,
  },
  near_unique: {
    label: "Near unique",
    explanation: "Most values are unique, which can make records identifying.",
    warning: true,
  },
  high_missing: { label: "High missing", explanation: "More than 20% of values are missing.", warning: true },
  free_text: {
    label: "Free text",
    explanation: "This variable contains free text rather than a fixed set of categories.",
    warning: false,
  },
  constant: { label: "Constant", explanation: "The variable has one observed value.", warning: false },
  numeric_with_text_codes: {
    label: "Numeric with text codes",
    explanation: "Numeric values include text-coded entries.",
    warning: false,
  },
  small_categories: {
    label: "Small categories",
    explanation: "Some categories have small counts and may be withheld.",
    warning: false,
  },
};

function missingBand(summary: LocalCard["variables"][number]["summary"]) {
  const { n_valid: valid, n_missing: missing } = summary;
  if (valid === null || missing === null || valid + missing === 0)
    return { label: "Withheld", level: 0, withheld: true };
  const fraction = missing / (valid + missing);
  if (fraction < 0.05) return { label: "<5%", level: 1, withheld: false };
  if (fraction <= 0.2) return { label: "5–20%", level: 2, withheld: false };
  return { label: ">20%", level: 3, withheld: false };
}

function VariableTypeIcon({ type }: { type: string }) {
  let Icon = Type;
  if (type === "numeric") Icon = Hash;
  else if (type === "date") Icon = CalendarDays;
  else if (type === "boolean") Icon = ToggleLeft;
  else if (type !== "string") Icon = Database;
  return <Icon aria-hidden="true" className="size-4 text-muted-foreground" />;
}

function MissingBar({ summary }: { summary: LocalCard["variables"][number]["summary"] }) {
  const band = missingBand(summary);
  return (
    <span role="img" className="inline-flex items-center gap-2" aria-label={`Missing ${band.label}`}>
      <span className="flex h-2 w-16 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        {band.withheld ? (
          <span className="w-full bg-[repeating-linear-gradient(135deg,transparent,transparent_3px,hsl(var(--muted-foreground)/.45)_3px,hsl(var(--muted-foreground)/.45)_4px)]" />
        ) : (
          <span className="h-full rounded-full bg-muted-foreground/70" style={{ width: `${band.level * 25}%` }} />
        )}
      </span>
      <span className={band.withheld ? "text-muted-foreground" : "tabular-nums"}>{band.label}</span>
    </span>
  );
}

function FlagChip({ flag }: { flag: string }) {
  const config = flagLabels[flag];
  if (!config) return null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={
            config.warning
              ? "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200"
              : "text-muted-foreground"
          }
        >
          {config.label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>{config.explanation}</TooltipContent>
    </Tooltip>
  );
}

export function LocalDataCard({
  version,
  card,
  nodeName,
}: {
  version: DatasetVersionItem;
  card: LocalCard;
  nodeName?: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const gaps = [...new Set(card.report.gaps)];
  const copySha = async () => {
    await navigator.clipboard.writeText(version.sha256);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Card role="region" aria-label="Local data card" className="min-w-0 max-w-full">
      <CardHeader>
        <CardTitle>
          <h2>v{version.version_number} · stays on a Local Node</h2>
        </CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            <Database data-icon="inline-start" />
            Local Node{nodeName ? ` · ${nodeName}` : ""}
          </Badge>
          <Badge variant="outline">{card.disclosure === "strict" ? "Strict" : "Standard"} disclosure</Badge>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col gap-4">
        <p className="tabular-nums">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help underline decoration-dotted underline-offset-4">
                ~{(Math.floor(card.n_rows / 10) * 10).toLocaleString("en-US")} rows
              </span>
            </TooltipTrigger>
            <TooltipContent>Rounded down to 10 by the Local Node</TooltipContent>
          </Tooltip>
          {" · "}
          {card.variables.length.toLocaleString("en-US")} variables · split{" "}
          {Math.round((1 - card.split.exploration_fraction) * 100)}% confirmation
        </p>
        <div className="hidden min-w-0 md:block">
          <div className="max-h-[32rem] overflow-auto rounded-md border">
            <table aria-label="Released variable summaries" className="w-full caption-bottom text-sm">
              <thead className="sticky top-0 z-10 bg-muted/95 text-left shadow-sm backdrop-blur">
                <tr>
                  {["Variable", "Measure", "Missing", "Distinct", "Flags"].map((heading) => (
                    <th key={heading} className="h-10 px-3 font-medium">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {card.variables.map((variable, index) => {
                  const alias = /^v\d+$/i.test(variable.name);
                  return (
                    <tr key={`${variable.name}:${index}`} className="border-t align-top">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <VariableTypeIcon type={variable.type} />
                          <div>
                            {alias && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span
                                    className="cursor-help font-semibold"
                                    title="Alias assigned by the Local Node; the real name stays on the computer"
                                  >
                                    {variable.name}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Alias assigned by the Local Node; the real name stays on the computer
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {!alias && <div className="font-semibold">{variable.name}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground capitalize">{variable.measure}</td>
                      <td className="px-3 py-3">
                        <MissingBar summary={variable.summary} />
                      </td>
                      <td className="px-3 py-3 tabular-nums">
                        {variable.summary.n_distinct === null ? (
                          <span className="text-muted-foreground">withheld</span>
                        ) : (
                          `~${variable.summary.n_distinct.toLocaleString("en-US")}`
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          {variable.flags
                            .filter((flag) => flag !== "levels_withheld")
                            .map((flag) => (
                              <FlagChip key={flag} flag={flag} />
                            ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!card.variables.length && (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                      No variable summaries were released by the Local Node.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="flex flex-col gap-3 md:hidden">
          {card.variables.map((variable, index) => (
            <article key={`${variable.name}:${index}`} className="flex flex-col gap-3 rounded-lg border p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <VariableTypeIcon type={variable.type} />
                  <div className="break-all font-semibold">
                    {/^v\d+$/i.test(variable.name) ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className="cursor-help"
                            title="Alias assigned by the Local Node; the real name stays on the computer"
                          >
                            {variable.name}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          Alias assigned by the Local Node; the real name stays on the computer
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      variable.name
                    )}
                  </div>
                </div>
                <span className="shrink-0 text-muted-foreground text-xs">{variable.measure}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="block text-muted-foreground text-xs">Missing</span>
                  <MissingBar summary={variable.summary} />
                </div>
                <div>
                  <span className="block text-muted-foreground text-xs">Distinct</span>
                  {variable.summary.n_distinct === null ? (
                    <span className="text-muted-foreground">withheld</span>
                  ) : (
                    `~${variable.summary.n_distinct.toLocaleString("en-US")}`
                  )}
                </div>
              </div>
              {variable.flags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {variable.flags
                    .filter((flag) => flag !== "levels_withheld")
                    .map((flag) => (
                      <FlagChip key={flag} flag={flag} />
                    ))}
                </div>
              )}
            </article>
          ))}
          {!card.variables.length && (
            <p className="py-6 text-center text-muted-foreground text-sm">
              No variable summaries were released by the Local Node.
            </p>
          )}
        </div>
        {gaps.length > 0 && (
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="w-full justify-between">
                {gaps.length} limits from the Local Node
                <ChevronDown data-icon="inline-end" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ul className="mt-3 list-disc break-words pl-5 text-muted-foreground text-sm">
                {gaps.map((gap) => (
                  <li key={gap}>{gap}</li>
                ))}
              </ul>
            </CollapsibleContent>
          </Collapsible>
        )}
        <div className="flex items-center justify-between gap-3 border-t pt-3">
          <span className="break-all font-mono text-muted-foreground text-xs" title={version.sha256}>
            SHA-256 {version.sha256.slice(0, 16)}…
          </span>
          <Button variant="ghost" size="icon-sm" aria-label="Copy SHA-256" onClick={() => void copySha()}>
            <span className="sr-only">{copied ? "Copied" : "Copy SHA-256"}</span>
            {copied ? <Check /> : <Copy />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
