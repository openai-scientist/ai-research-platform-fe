"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useWritingBankChecksQuery } from "@/hooks/use-writing-bank-query";
import type { BankCheck, Blueprint } from "@/lib/api/services/fetch-writing-bank";

import { ToneBadge } from "./writing-bank-badges";
import { formatWords, humanize, plural } from "./writing-bank-format";

/** What a check holds this context to, read from the context's own outline and venue, where there is something to say. */
function inThisContext(check: BankCheck, blueprint: Blueprint): string | null {
  const required = (kind: string) =>
    blueprint.journalRequirements.filter((item) => item.kind === kind && item.force === "required");
  switch (check.id) {
    case "obligatory-moves": {
      const count = blueprint.sections.reduce(
        (sum, section) => sum + section.moves.filter((move) => move.expectation === "obligatory").length,
        0,
      );
      return count ? `${plural(count, "obligatory move")} in this outline:` : "No move of this outline is obligatory.";
    }
    case "reporting-standards": {
      const standards = required("standard");
      return standards.length
        ? `The venue requires ${standards.map((item) => item.name).join(", ")}.`
        : "The venue requires no reporting standard by name.";
    }
    case "declarations": {
      const declarations = required("declaration");
      return declarations.length
        ? `The venue requires ${declarations.map((item) => item.name).join(", ")}.`
        : "The venue requires no declaration.";
    }
    case "word-budget": {
      const limits = blueprint.wordLimits;
      const parts = [
        limits.mainText != null ? `main text ${formatWords(limits.mainText)}` : null,
        limits.abstract != null ? `abstract ${formatWords(limits.abstract)}` : null,
        ...Object.entries(limits.sections).map(([section, words]) => `${humanize(section)} ${formatWords(words)}`),
      ].filter(Boolean);
      return parts.length
        ? `The venue's limits: ${parts.join(", ")}.`
        : "The venue records no word limit, so the outline has none to stay within.";
    }
    case "limitations-discussed": {
      for (const section of blueprint.sections) {
        const move = section.moves.find((item) => item.id === "discussion.m4");
        if (move) return `In this outline: ${section.label}, the move “${move.name}”.`;
      }
      return "This outline has no Discussion move that bounds the claims.";
    }
    default:
      return null;
  }
}

function CheckGroup({
  title,
  tone,
  checks,
  blueprint,
  onShowStrength,
}: {
  readonly title: string;
  readonly tone: "blocked" | "look";
  readonly checks: BankCheck[];
  readonly blueprint: Blueprint;
  readonly onShowStrength: () => void;
}) {
  if (checks.length === 0) return null;
  return (
    <section className="flex flex-col gap-1">
      <h3 className="flex items-center gap-2 font-semibold text-sm">
        <ToneBadge tone={tone}>{title}</ToneBadge>
        <span className="text-muted-foreground tabular-nums">{checks.length}</span>
      </h3>
      <ol className="flex flex-col divide-y">
        {checks.map((check) => {
          const here = inThisContext(check, blueprint);
          return (
            <li key={check.id} className="flex flex-col gap-1 py-3.5">
              <p className="font-semibold text-sm">{check.name}</p>
              <p className="text-sm leading-relaxed">{check.holds}</p>
              {here && (
                <p className="text-sm leading-relaxed">
                  <span className="font-semibold">Here: </span>
                  {here}
                </p>
              )}
              {check.id === "obligatory-moves" && (
                <ul className="flex flex-wrap gap-1.5 pt-0.5">
                  {blueprint.sections.flatMap((section) =>
                    section.moves
                      .filter((move) => move.expectation === "obligatory")
                      .map((move) => (
                        <li
                          key={`${section.id}-${move.id}`}
                          className="rounded-md border border-foreground/20 px-2 py-0.5 text-sm"
                        >
                          <span className="text-muted-foreground">{section.label.replace(/\s*\(.*\)\s*$/, "")} · </span>
                          {move.name}
                        </li>
                      )),
                  )}
                </ul>
              )}
              {check.id === "qualifier-within-cap" && (
                <Button variant="link" className="h-auto w-fit p-0" onClick={onShowStrength}>
                  See the caps in Claim strength
                </Button>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/**
 * The checks the bank holds a writing plan for this context to before it is written, errors first, each with what it
 * asks of this context's outline and venue where that can be read from them.
 */
export function WritingChecks({
  blueprint,
  enabled,
  onShowStrength,
}: {
  readonly blueprint: Blueprint;
  readonly enabled: boolean;
  readonly onShowStrength: () => void;
}) {
  const query = useWritingBankChecksQuery(enabled);
  if (query.isPending)
    return (
      <div aria-busy="true">
        <span className="sr-only">Loading checks</span>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  const checks = query.data?.items ?? [];
  if (checks.length === 0) return <Card className="px-4 py-6 text-sm">This bank does not list its checks yet.</Card>;
  const errors = checks.filter((check) => check.severity === "error");
  const warnings = checks.filter((check) => check.severity === "warning");
  return (
    <Card className="gap-5 px-4 py-5">
      <div className="flex flex-col gap-1">
        <p className="font-medium text-base leading-relaxed">
          A writing plan for this context is checked {plural(checks.length, "way")}: {plural(errors.length, "error")}{" "}
          and {plural(warnings.length, "warning")}.
        </p>
        <p className="text-sm leading-relaxed">
          Any finding can be accepted with a written reason; until then it stays open.
        </p>
      </div>
      <CheckGroup title="Errors" tone="blocked" checks={errors} blueprint={blueprint} onShowStrength={onShowStrength} />
      <CheckGroup
        title="Warnings"
        tone="look"
        checks={warnings}
        blueprint={blueprint}
        onShowStrength={onShowStrength}
      />
    </Card>
  );
}
