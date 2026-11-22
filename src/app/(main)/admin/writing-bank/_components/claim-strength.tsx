"use client";

import { useState } from "react";

import { cn } from "cn";
import { ArrowDown, ArrowUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWritingBankLibraryQuery } from "@/hooks/use-writing-bank-query";
import type { Blueprint } from "@/lib/api/services/fetch-writing-bank";

import { humanizeId, plural } from "./writing-bank-format";

type Item = Record<string, unknown> & { id: string };

const text = (value: unknown) => (typeof value === "string" ? value : "");
const list = (value: unknown) => (Array.isArray(value) ? (value as unknown[]) : []);
const record = (value: unknown) => (value && typeof value === "object" ? (value as Record<string, unknown>) : {});

/** The strengths a sentence can commit with, weakest first, and the levels of evidence, weakest first. */
const STRENGTHS = ["str.s0", "str.s1", "str.s2", "str.s3", "str.s4"];
const LEVELS = ["evl.e0", "evl.e1", "evl.e2", "evl.e3", "evl.e4", "evl.e5"];

/** Each strength in its shade of the blue ramp: the more a sentence commits, the darker. */
const STRENGTH_SHADES: Record<string, string> = {
  "str.s0": "bg-blue-50 text-blue-950 dark:bg-blue-950 dark:text-blue-50",
  "str.s1": "bg-blue-200 text-blue-950 dark:bg-blue-900 dark:text-white",
  "str.s2": "bg-blue-400 text-blue-950 dark:bg-blue-700 dark:text-white",
  "str.s3": "bg-blue-700 text-white dark:bg-blue-500 dark:text-blue-950",
  "str.s4": "bg-blue-950 text-white dark:bg-blue-300 dark:text-blue-950",
};

const code = (id: string) => id.slice(id.indexOf(".") + 1).toUpperCase();

interface Cell {
  claimType: string;
  evidence: string;
  max: string | null;
  requires: string[];
  fallback: { claimType: string; max: string } | null;
}

interface Cap {
  max: string;
  style: string;
}

function weaker(a: string, b: string) {
  return STRENGTHS.indexOf(a) <= STRENGTHS.indexOf(b) ? a : b;
}

function StrengthChip({
  id,
  names,
  className,
}: {
  readonly id: string;
  readonly names: Map<string, string>;
  readonly className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-medium text-xs",
        STRENGTH_SHADES[id],
        className,
      )}
    >
      <span className="font-semibold">{code(id)}</span>
      {names.get(id) ?? ""}
    </span>
  );
}

/** One cell of the matrix opened in full: what the convention allows, what must hold for it, and what this context lowers. */
function CellSheet({
  cell,
  cap,
  names,
  onClose,
}: {
  readonly cell: Cell | null;
  readonly cap: Cap | undefined;
  readonly names: Map<string, string>;
  readonly onClose: () => void;
}) {
  const here = cell?.max && cap ? weaker(cell.max, cap.max) : (cell?.max ?? null);
  return (
    <Sheet open={Boolean(cell)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-xl">
        {cell && (
          <>
            <SheetHeader className="gap-2 border-b pr-12">
              <p className="text-muted-foreground text-sm">Claim strength</p>
              <SheetTitle className="text-lg">
                {names.get(cell.claimType) ?? humanizeId(cell.claimType)} on {code(cell.evidence)} evidence
              </SheetTitle>
              <SheetDescription className="text-foreground text-sm leading-relaxed">
                {code(cell.evidence)}: {names.get(cell.evidence) ?? ""}
              </SheetDescription>
            </SheetHeader>
            <div className="flex flex-col gap-5 overflow-y-auto px-4 pt-4 pb-6 text-sm">
              <section className="flex flex-col gap-2">
                <h3 className="font-semibold">In this context, at most</h3>
                {here ? (
                  <StrengthChip id={here} names={names} className="w-fit text-sm" />
                ) : (
                  <p>The convention advises against making this claim on this evidence.</p>
                )}
                {cell.max && cap && STRENGTHS.indexOf(cap.max) < STRENGTHS.indexOf(cell.max) && (
                  <p>
                    The matrix allows {code(cell.max)}; the context's style{" "}
                    <span className="font-medium">{cap.style}</span> lowers it to {code(cap.max)}.
                  </p>
                )}
              </section>
              {cell.requires.length > 0 && (
                <section className="flex flex-col gap-2 border-t pt-4">
                  <h3 className="font-semibold">Only if all of this holds</h3>
                  <ul className="flex list-disc flex-col gap-1.5 pl-5 leading-relaxed">
                    {cell.requires.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </section>
              )}
              {cell.fallback && (
                <section className="flex flex-col gap-2 border-t pt-4">
                  <h3 className="font-semibold">Otherwise</h3>
                  <p className="flex flex-wrap items-center gap-2">
                    Write it as a{" "}
                    {(names.get(cell.fallback.claimType) ?? humanizeId(cell.fallback.claimType)).toLowerCase()}, at most
                    <StrengthChip id={cell.fallback.max} names={names} />
                  </p>
                </section>
              )}
              <p className="border-t pt-4 text-muted-foreground text-xs leading-relaxed">
                The bank's own convention: it advises, it never blocks, and it has not been tested against labelled
                papers.
              </p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

type Part = "matrix" | "levels" | "modifiers";

/**
 * How strongly a paper of this context may word each kind of claim on each level of evidence: the bank's claim ×
 * evidence matrix, lowered where the context's style caps a claim type; then the levels of evidence and the
 * modifiers that move a study's evidence up or down a level.
 */
export function ClaimStrength({ blueprint, enabled }: { readonly blueprint: Blueprint; readonly enabled: boolean }) {
  const matrixBank = useWritingBankLibraryQuery("matrix", enabled);
  const strengthBank = useWritingBankLibraryQuery("strength-levels", enabled);
  const levelBank = useWritingBankLibraryQuery("evidence-levels", enabled);
  const modifierBank = useWritingBankLibraryQuery("evidence-modifiers", enabled);
  const typeBank = useWritingBankLibraryQuery("evidence-types", enabled);
  const claimBank = useWritingBankLibraryQuery("claim-types", enabled);
  const styleBank = useWritingBankLibraryQuery("styles", enabled);
  const [part, setPart] = useState<Part>("matrix");
  const [opened, setOpened] = useState<Cell | null>(null);

  const banks = [matrixBank, strengthBank, levelBank, modifierBank, typeBank, claimBank, styleBank];
  if (banks.some((bank) => bank.isPending))
    return (
      <div aria-busy="true">
        <span className="sr-only">Loading claim strength</span>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  const matrix = (matrixBank.data?.items ?? []).find((item) => item.id === "mx.general") ?? matrixBank.data?.items[0];
  if (!matrix)
    return (
      <Card className="px-4 py-6 text-sm">
        This bank release carries no claim × evidence matrix yet. It arrives with release 2026.11.9.
      </Card>
    );

  const names = new Map<string, string>(
    [strengthBank, levelBank, claimBank].flatMap((bank) =>
      (bank.data?.items ?? []).map((item: Item) => [item.id, text(item.name)] as [string, string]),
    ),
  );
  const cells: Cell[] = list(matrix.cells).map((entry) => {
    const fields = record(entry);
    const fallback = record(fields.fallback);
    return {
      claimType: text(fields.claimType),
      evidence: text(fields.evidence),
      max: text(fields.max) || null,
      requires: list(fields.requires).map(text).filter(Boolean),
      fallback: text(fallback.claimType) ? { claimType: text(fallback.claimType), max: text(fallback.max) } : null,
    };
  });
  const claimTypes = [...new Set(cells.map((cell) => cell.claimType))];
  // The caps the context's chosen styles put on a claim type, the lowest of them kept.
  const styles = new Map((styleBank.data?.items ?? []).map((item) => [item.id, item]));
  const caps = new Map<string, Cap>();
  for (const chosen of blueprint.styles) {
    const style = styles.get(chosen.style);
    for (const entry of list(style?.claimTypes)) {
      const fields = record(entry);
      const claimType = text(fields.claimType);
      const max = text(fields.max);
      if (!claimType || !max) continue;
      const known = caps.get(claimType);
      if (!known || STRENGTHS.indexOf(max) < STRENGTHS.indexOf(known.max))
        caps.set(claimType, { max, style: chosen.name });
    }
  }
  const lowered = cells.filter((cell) => {
    const cap = caps.get(cell.claimType);
    return cell.max && cap && STRENGTHS.indexOf(cap.max) < STRENGTHS.indexOf(cell.max);
  });
  const loweredTypes = [...new Set(lowered.map((cell) => names.get(cell.claimType) ?? humanizeId(cell.claimType)))];
  const capStyle = [...new Set([...caps.values()].map((cap) => cap.style))].join(", ");
  const types = (typeBank.data?.items ?? []).map((item) => ({
    id: item.id,
    name: text(item.name),
    level: text(item.baseLevel),
  }));
  const modifiers = (modifierBank.data?.items ?? []).map((item) => ({
    id: item.id,
    name: text(item.name),
    direction: text(item.direction),
    description: text(item.description),
    question: text(item.question),
    evidenceTypes: list(item.evidenceTypes).map(text).filter(Boolean),
  }));
  const typeNames = new Map(types.map((type) => [type.id, type.name]));
  const labels: Record<Part, string> = { matrix: "Matrix", levels: "Levels of evidence", modifiers: "Modifiers" };
  const counts: Record<Part, number> = { matrix: cells.length, levels: LEVELS.length, modifiers: modifiers.length };

  return (
    <Card className="gap-0 py-0">
      <div className="border-b px-4 pt-4 pb-2.5">
        <div className="-mx-1 overflow-x-auto overflow-y-hidden px-1 pb-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Tabs value={part} onValueChange={(value) => setPart(value as Part)}>
            <TabsList>
              {(Object.keys(labels) as Part[]).map((key) => (
                <TabsTrigger key={key} value={key} className="gap-1.5">
                  {labels[key]}
                  <span className="text-muted-foreground tabular-nums">{counts[key]}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>
      <div className="flex flex-col gap-5 px-4 py-5">
        {part === "matrix" && (
          <>
            <div className="flex flex-col gap-1.5">
              <p className="font-medium text-base leading-relaxed">
                How strongly a claim may be worded, by the kind of claim and the evidence behind it.
                {lowered.length > 0 &&
                  ` This context's style (${capStyle}) lowers ${plural(lowered.length, "cell")} across ${plural(loweredTypes.length, "claim type")}; each shows the matrix's own level under it.`}
              </p>
              <p className="text-muted-foreground text-sm">
                The bank's own convention: it advises, it never blocks, and it has not been tested against labelled
                papers.
              </p>
            </div>
            <ul className="flex flex-wrap items-center gap-2" aria-label="Strength of wording, weakest first">
              {STRENGTHS.filter((id) => cells.some((cell) => cell.max === id)).map((id) => (
                <li key={id}>
                  <StrengthChip id={id} names={names} />
                </li>
              ))}
              <li className="text-muted-foreground text-xs">
                An empty cell: the convention advises against the claim.
              </li>
            </ul>
            <div className="-mx-4 overflow-x-auto px-4">
              <table className="w-full min-w-[44rem] table-fixed border-separate border-spacing-1 text-sm">
                <caption className="sr-only">Strongest wording by claim type and level of evidence</caption>
                <thead>
                  <tr>
                    <th scope="col" className="w-36 pb-1 text-left align-bottom font-semibold text-xs">
                      Claim type ↓ · Evidence →
                    </th>
                    {LEVELS.map((id) => (
                      <th
                        key={id}
                        scope="col"
                        className="pb-1 text-left align-bottom font-normal text-xs leading-tight"
                      >
                        <span className="block font-semibold">{code(id)}</span>
                        <span className="block">{names.get(id) ?? ""}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {claimTypes.map((claimType) => (
                    <tr key={claimType}>
                      <th scope="row" className="pr-2 text-left font-medium">
                        {names.get(claimType) ?? humanizeId(claimType)}
                      </th>
                      {LEVELS.map((level) => {
                        const cell = cells.find((item) => item.claimType === claimType && item.evidence === level);
                        if (!cell) return <td key={level} />;
                        const cap = caps.get(claimType);
                        const here = cell.max && cap ? weaker(cell.max, cap.max) : cell.max;
                        const capped = Boolean(cell.max && here !== cell.max);
                        return (
                          <td key={level} className="p-0">
                            <button
                              type="button"
                              onClick={() => setOpened(cell)}
                              aria-label={`${names.get(claimType) ?? claimType} on ${code(level)}: ${here ? `${code(here)} ${names.get(here) ?? ""}` : "advised against"}${capped ? `, lowered from ${code(cell.max ?? "")}` : ""}`}
                              className={cn(
                                "flex h-12 w-full flex-col items-start justify-center rounded-md px-2 text-left outline-none transition-[filter] hover:brightness-95 focus-visible:ring-3 focus-visible:ring-ring/50 dark:hover:brightness-110",
                                here
                                  ? STRENGTH_SHADES[here]
                                  : "border border-foreground/25 border-dashed bg-background",
                              )}
                            >
                              {here ? (
                                <>
                                  <span className="font-semibold text-sm leading-none">{code(here)}</span>
                                  {capped && (
                                    <span className="mt-1 text-[11px] leading-none">from {code(cell.max ?? "")}</span>
                                  )}
                                </>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {part === "levels" && (
          <>
            <p className="font-medium text-base leading-relaxed">
              A study's evidence starts at the level of its kind of evidence; modifiers then move it, by at most{" "}
              {plural(Number(matrix.maxNetShift ?? 2), "level")} in all.
            </p>
            <ol className="flex flex-col divide-y">
              {LEVELS.map((id) => {
                const entry = (levelBank.data?.items ?? []).find((item) => item.id === id);
                const here = types.filter((type) => type.level === id);
                return (
                  <li key={id} className="grid gap-2 py-4 first:pt-0 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-6">
                    <div className="flex items-start gap-2">
                      <Badge className="tabular-nums">{code(id)}</Badge>
                      <p className="font-semibold text-sm">{text(entry?.name)}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <p className="text-sm leading-relaxed">{text(entry?.definition)}</p>
                      {here.length > 0 && (
                        <ul
                          className="flex flex-wrap gap-1.5"
                          aria-label={`Kinds of evidence that start at ${code(id)}`}
                        >
                          {here.map((type) => (
                            <li key={type.id}>
                              <Badge variant="outline" className="border-foreground/25 font-normal">
                                {type.name}
                              </Badge>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </>
        )}
        {part === "modifiers" && (
          <>
            <p className="font-medium text-base leading-relaxed">
              {modifiers.filter((item) => item.direction === "down").length} things lower a study's evidence a level and{" "}
              {modifiers.filter((item) => item.direction === "up").length} raise it; together they move it by at most{" "}
              {plural(Number(matrix.maxNetShift ?? 2), "level")}.
            </p>
            <div className="grid items-start gap-6 lg:grid-cols-2">
              {(["down", "up"] as const).map((direction) => {
                const down = direction === "down";
                const items = modifiers.filter((item) => item.direction === direction);
                const Arrow = down ? ArrowDown : ArrowUp;
                return (
                  <section
                    key={direction}
                    className="flex flex-col gap-3"
                    aria-label={down ? "Lower the level" : "Raise the level"}
                  >
                    <div
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-white",
                        down ? "bg-rose-600 dark:bg-rose-700" : "bg-emerald-600 dark:bg-emerald-700",
                      )}
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/20">
                        <Arrow className="size-4" aria-hidden="true" />
                      </span>
                      <div className="flex min-w-0 flex-col">
                        <h3 className="font-semibold text-sm">
                          {down ? "Lower the level" : "Raise the level"} · {items.length}
                        </h3>
                        <p className="text-white/90 text-xs">
                          {down ? "Each takes the evidence one level down." : "Each takes the evidence one level up."}
                        </p>
                      </div>
                    </div>
                    <ul className="flex flex-col gap-4">
                      {items.map((item) => (
                        <li
                          key={item.id}
                          className={cn(
                            "flex flex-col gap-1.5 border-l-4 pl-3",
                            down ? "border-rose-500" : "border-emerald-500",
                          )}
                        >
                          <p className="font-semibold text-sm">{item.name}</p>
                          <p className="text-sm leading-relaxed">{item.description}</p>
                          <p className="text-sm leading-relaxed">
                            <span
                              className={cn(
                                "mr-1.5 rounded px-1.5 py-0.5 font-semibold text-[11px] uppercase tracking-wide",
                                down
                                  ? "bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-200"
                                  : "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
                              )}
                            >
                              Ask
                            </span>
                            {item.question}
                          </p>
                          {item.evidenceTypes.length > 0 && (
                            <p className="text-muted-foreground text-xs leading-relaxed">
                              Applies to {item.evidenceTypes.map((id) => typeNames.get(id) ?? id).join(", ")}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          </>
        )}
      </div>
      <CellSheet
        cell={opened}
        cap={opened ? caps.get(opened.claimType) : undefined}
        names={names}
        onClose={() => setOpened(null)}
      />
    </Card>
  );
}
