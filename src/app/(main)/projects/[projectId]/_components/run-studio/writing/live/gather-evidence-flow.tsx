"use client";
"use no memo";

/* ===== The evidence ledger drawn as what it is: a flow of evidence =====
   Two sources feed the ledger: the experiment's package (its records and the values they hold) and the literature
   (references resolved at their registries, and the sentences that may be quoted). Out of the ledger come what the
   paper may print or quote, what it may only cite, what it never cites and what it names but never fills in. Each box
   carries the step that made it and what that step came to, so the four steps of the stage are read on the drawing
   itself. Under it, every recomputed value stands as a receipt: the package's number beside the number code
   recomputed from the records behind it. */

import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import { cn, Icon } from "../lib";
import { TONE, type Tone } from "./stage-kit";
import { useAccent } from "./stage-visual";
import type { Recomputed } from "./types";

/** What a step of the stage came to, as its box shows it. */
export interface StepMark {
  n: number;
  title: string;
  tone: Tone | "wait" | "now";
  label: string;
  onPick?: () => void;
}
const STEP_ICON: Record<Tone | "wait" | "now", { n: string; c: string }> = {
  ok: { n: "check", c: TONE.ok.text },
  look: { n: "alert", c: TONE.look.text },
  bad: { n: "x", c: TONE.bad.text },
  none: { n: "minus", c: "text-muted-foreground" },
  wait: { n: "minus", c: "text-muted-foreground" },
  now: { n: "play", c: "text-sky-600 dark:text-sky-300" },
};

function StepFoot({ step }: { step: StepMark }) {
  const i = STEP_ICON[step.tone];
  const body = (
    <>
      <span className="font-mono text-[11px] text-muted-foreground tabular-nums">Step {step.n}</span>
      <span className="min-w-0 flex-1 text-pretty">
        <span className="font-medium">{step.title}</span>
        <span className="text-muted-foreground"> · {step.label}</span>
      </span>
      <Icon n={i.n} className={cn("mt-0.5 size-3.5 shrink-0", i.c)} />
    </>
  );
  const cls = "flex w-full items-start gap-2 border-t px-3.5 py-2 text-left text-[12.5px] leading-snug";
  return step.onPick ? (
    <button type="button" onClick={step.onPick} className={cn(cls, "cursor-pointer hover:bg-muted/50")}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** One part of a box: a mark, a count and what it counts. */
export interface FlowPart {
  key: string;
  n: number;
  label: string;
  /** A status in the one colour meaning; none for a plain count, drawn in the screen's accent. */
  tone?: Tone;
}
function PartRow({ part }: { part: FlowPart }) {
  const a = useAccent();
  return (
    <li className="flex items-baseline gap-2 text-[13px] leading-snug">
      <span
        className={cn("size-2 shrink-0 translate-y-[-1px] rounded-full", part.tone ? TONE[part.tone].dot : a.mark)}
      />
      <b className="font-semibold tabular-nums">{part.n}</b>
      <span className="min-w-0 text-pretty text-muted-foreground">{part.label}</span>
    </li>
  );
}

/** A box of the drawing: where evidence comes from, or the ledger itself. */
function FlowBox({
  icon,
  kicker,
  title,
  figure,
  unit,
  parts,
  step,
  ready,
  main,
  data,
}: {
  icon: string;
  kicker: string;
  title: string;
  figure: ReactNode;
  unit: string;
  parts: FlowPart[];
  step?: StepMark;
  ready: boolean;
  /** The ledger: the box the drawing is about, drawn in the screen's accent. */
  main?: boolean;
  data?: string;
}) {
  const a = useAccent();
  return (
    <div
      data-flow={data}
      className={cn(
        "flex min-w-0 flex-col overflow-hidden rounded-xl bg-card ring-1",
        main ? "ring-2 ring-sky-400 dark:ring-sky-500" : "ring-foreground/10",
      )}
    >
      <div className={cn("flex items-center gap-2.5 px-3.5 py-2.5", main ? a.soft : "bg-muted/40")}>
        <span className={cn("grid size-7 shrink-0 place-items-center rounded-lg", main ? a.chip : "bg-background")}>
          <Icon n={icon} className="size-3.5" />
        </span>
        <span className="min-w-0">
          <span className={cn("block font-semibold text-[10.5px] uppercase tracking-wide", main ? a.text : "")}>
            {kicker}
          </span>
          <span className="block font-semibold text-[14px] leading-tight">{title}</span>
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2.5 px-3.5 py-3">
        {ready ? (
          <p className="flex flex-wrap items-baseline gap-x-1.5">
            <span className="font-semibold text-[26px] tabular-nums leading-none">{figure}</span>
            <span className="text-[13px] text-muted-foreground">{unit}</span>
          </p>
        ) : (
          <Skeleton className="h-6 w-20 animate-none rounded-full" />
        )}
        {ready && parts.length > 0 && (
          <ul className="flex flex-col gap-1">
            {parts.map((p) => (
              <PartRow key={p.key} part={p} />
            ))}
          </ul>
        )}
      </div>
      {step && <StepFoot step={step} />}
    </div>
  );
}

/** Where a piece of evidence ends up: a tinted row in the one colour meaning. */
export interface Outcome {
  key: string;
  tone: Tone;
  title: string;
  n: number;
  unit: string;
  why: string;
  onPick?: () => void;
}
function OutcomeRow({ o }: { o: Outcome }) {
  const body = (
    <>
      <span className="flex items-baseline gap-1.5">
        <b className={cn("font-semibold text-[20px] tabular-nums leading-none", TONE[o.tone].text)}>{o.n}</b>
        <span className="text-[12.5px] text-muted-foreground">{o.unit}</span>
      </span>
      <span className="min-w-0">
        <span className="block font-semibold text-[13.5px] leading-snug">{o.title}</span>
        <span className="block text-pretty text-[12.5px] text-muted-foreground leading-snug">{o.why}</span>
      </span>
    </>
  );
  const cls = cn(
    "grid w-full grid-cols-[5.5rem_minmax(0,1fr)] items-start gap-3 rounded-lg px-3 py-2.5 text-left ring-1 ring-inset",
    o.tone === "ok" && "bg-emerald-50/70 ring-emerald-200 dark:bg-emerald-950/30 dark:ring-emerald-900",
    o.tone === "look" && "bg-amber-50/70 ring-amber-200 dark:bg-amber-950/30 dark:ring-amber-900",
    o.tone === "bad" && "bg-rose-50/70 ring-rose-200 dark:bg-rose-950/30 dark:ring-rose-900",
    o.tone === "none" && "bg-muted/50 ring-foreground/10",
  );
  return o.onPick ? (
    <button type="button" onClick={o.onPick} className={cn(cls, "cursor-pointer hover:brightness-[0.98]")}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** The arrow between two columns: across on a wide card, down on a narrow one, with what flows along it. */
function Arrow({ label }: { label: string }) {
  const a = useAccent();
  return (
    <div aria-hidden="true" className="flex items-center justify-center gap-2 py-0.5 @4xl:flex-col @4xl:py-0">
      <span className={cn("grid size-7 shrink-0 place-items-center rounded-full", a.chip)}>
        <Icon n="down" className="size-4 @4xl:-rotate-90" sw={2.5} />
      </span>
      <span className="font-medium text-[11.5px] text-muted-foreground @4xl:hidden">{label}</span>
    </div>
  );
}

export function EvidenceFlow({
  pkg,
  lit,
  ledger,
  outcomes,
  outcomesReady,
  outcomeStep,
}: {
  pkg: { figure: number; unit: string; parts: FlowPart[]; ready: boolean; step: StepMark };
  lit: { figure: number; unit: string; parts: FlowPart[]; ready: boolean; step: StepMark };
  ledger: { figure: number; unit: string; parts: FlowPart[]; ready: boolean; step: StepMark };
  outcomes: Outcome[];
  outcomesReady: boolean;
  outcomeStep: StepMark;
}) {
  return (
    <div className="@container">
      <div className="grid gap-3 @4xl:grid-cols-[minmax(0,1fr)_2.25rem_minmax(0,0.95fr)_2.25rem_minmax(0,1.15fr)] @4xl:items-center">
        <div className="flex flex-col gap-3">
          <FlowBox
            icon="package"
            kicker="From the experiment"
            title="The result package"
            figure={pkg.figure}
            unit={pkg.unit}
            parts={pkg.parts}
            ready={pkg.ready}
            step={pkg.step}
            data="package"
          />
          <FlowBox
            icon="book"
            kicker="From the literature"
            title="The references"
            figure={lit.figure}
            unit={lit.unit}
            parts={lit.parts}
            ready={lit.ready}
            step={lit.step}
            data="literature"
          />
        </div>
        <Arrow label="into the ledger" />
        <FlowBox
          icon="table"
          kicker="This stage builds"
          title="The evidence ledger"
          figure={ledger.figure}
          unit={ledger.unit}
          parts={ledger.parts}
          ready={ledger.ready}
          step={ledger.step}
          main
          data="ledger"
        />
        <Arrow label="into the paper" />
        <div className="flex min-w-0 flex-col gap-2">
          <p className="font-semibold text-[10.5px] text-muted-foreground uppercase tracking-wide">In the paper</p>
          {outcomesReady ? (
            outcomes.map((o) => <OutcomeRow key={o.key} o={o} />)
          ) : (
            <div className="flex flex-col gap-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-14 w-full animate-none rounded-lg" />
              ))}
            </div>
          )}
          <div className="overflow-hidden rounded-lg ring-1 ring-foreground/10">
            <StepFoot step={outcomeStep} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- the recomputed values: one receipt each, the package's number beside the one code recomputed ---------- */
export function Receipts({ rec, n, active }: { rec: Recomputed[]; n: number; active: boolean }) {
  return (
    <div data-recheck className="@container scroll-mt-4">
      <ReceiptList rec={rec} n={n} active={active} />
    </div>
  );
}
function ReceiptList({ rec, n, active }: { rec: Recomputed[]; n: number; active: boolean }) {
  if (!rec.length)
    return (
      <div aria-hidden="true" className="grid gap-2 p-4 @xl:grid-cols-2 @4xl:grid-cols-3 sm:px-5">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-20 animate-none rounded-lg" />
        ))}
      </div>
    );
  return (
    <ul className="grid gap-2 p-4 @xl:grid-cols-2 @4xl:grid-cols-3 sm:px-5">
      {rec.map((r, i) => {
        const on = i < n;
        const now = active && i === n - 1;
        const tone: Tone = on ? (r.match ? "ok" : "bad") : "none";
        return (
          <li
            key={r.record}
            data-cursor={`rec:${r.record}`}
            className={cn(
              "flex min-w-0 flex-col gap-2 rounded-lg bg-card px-3 py-2.5 ring-1 transition-shadow duration-300",
              on && !r.match ? "ring-rose-300 dark:ring-rose-800" : "ring-foreground/10",
              now && "ring-2 ring-sky-400 dark:ring-sky-500",
            )}
          >
            <div className="flex items-start gap-2">
              <span className="min-w-0 flex-1">
                <span className="block break-words font-mono text-[12px] leading-5">{r.record}</span>
                <span className="block text-pretty text-[12.5px] text-muted-foreground leading-snug">{r.what}</span>
              </span>
              <span
                className={cn(
                  "inline-flex h-5 shrink-0 items-center gap-1 rounded-full px-2 font-medium text-[11.5px]",
                  TONE[tone].soft,
                )}
              >
                <span className={cn("size-1.5 rounded-full", TONE[tone].dot)} />
                {on ? (r.match ? "Matches" : "Differs") : "Waiting"}
              </span>
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2">
              <span className="min-w-0">
                <span className="block text-[11px] text-muted-foreground">Package</span>
                <span className="block truncate font-mono font-semibold text-[14px] tabular-nums">
                  {String(r.package)}
                </span>
              </span>
              <span className={cn("pb-0.5 font-semibold text-[15px]", on ? TONE[tone].text : "text-muted-foreground")}>
                {on ? (r.match ? (String(r.package) === String(r.recomputed) ? "=" : "≈") : "≠") : "?"}
              </span>
              <span className="min-w-0 text-right">
                <span className="block text-[11px] text-muted-foreground">Recomputed</span>
                {on ? (
                  <span
                    className={cn(
                      "block truncate font-mono font-semibold text-[14px] tabular-nums",
                      !r.match && TONE.bad.text,
                    )}
                  >
                    {String(r.recomputed)}
                  </span>
                ) : (
                  <Skeleton className="ml-auto h-3 w-14 animate-none rounded-full" />
                )}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
