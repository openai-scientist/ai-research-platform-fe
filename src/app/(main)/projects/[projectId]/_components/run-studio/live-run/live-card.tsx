"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

import { cn } from "cn";
import { Check, Eye, Flag, Info } from "lucide-react";
import { useReducedMotion } from "motion/react";

import { Button } from "@/components/ui/button";
import type { LiveFinding, LiveStep, LiveStepKey } from "@/lib/run-stream/live-views";

import { AgentCursor, launchFlight } from "../run-bits";
import { LIVE_STEPS, usedIn } from "./live-steps";
import { Chip, RecordedContext } from "./live-ui";

const KIND = {
  ok: { icon: Check, dot: "bg-emerald-500/12 text-emerald-600", chip: "bg-emerald-600 text-white" },
  flag: { icon: Flag, dot: "bg-amber-500/15 text-amber-700 dark:text-amber-300", chip: "bg-amber-500 text-black" },
  note: { icon: Info, dot: "bg-muted text-muted-foreground", chip: "bg-sky-600 text-white" },
} as const;

const short = (text: string) => (text.length > 34 ? `${text.slice(0, 32)}…` : text);

function FindingRow({ finding, from, fly }: { finding: LiveFinding; from?: string; fly: string }) {
  const { icon: Icon, dot } = KIND[finding.kind];
  return (
    <li
      data-fly-finding={fly}
      data-kind={finding.kind}
      data-label={short(finding.text)}
      className={cn(
        "grid grid-cols-[1.125rem_minmax(0,1fr)] items-start gap-2.5 text-[13px] sm:grid-cols-[1.125rem_minmax(0,1fr)_auto]",
        from && "-mx-2 rounded-lg bg-sky-500/8 px-2 py-1.5",
      )}
    >
      <span className={cn("mt-0.5 grid size-[18px] place-items-center rounded-full", dot)}>
        <Icon aria-hidden className="size-2.5" strokeWidth={3} />
      </span>
      <span className="min-w-0 wrap-anywhere">
        {finding.text}
        {from && <span className="text-muted-foreground text-xs"> · found in {from}</span>}
      </span>
      {!from && finding.usedBy.length > 0 && (
        <span className="flex flex-wrap gap-1 max-sm:col-start-2 sm:justify-end">
          {finding.usedBy.map((key) => (
            <span
              key={key}
              className="whitespace-nowrap rounded-full border bg-card px-2 py-px text-[11px] text-muted-foreground"
            >
              → {LIVE_STEPS[key].title}
            </span>
          ))}
        </span>
      )}
    </li>
  );
}

/**
 * The live card of a step: one "Now" line, the step's own visual and the findings the step reads and produces.
 * The title, actor and progress stay in the side panel.
 */
export function LiveCard({
  stepKey,
  step,
  views,
  live,
  reopened,
  children,
}: {
  stepKey: LiveStepKey;
  step: LiveStep<object>;
  views: Partial<Record<LiveStepKey, { findings: LiveFinding[] }>>;
  live: boolean;
  /** A finished step opened again: the card says so and offers the way back to the live step. */
  reopened?: { onBack(): void };
  children: ReactNode;
}) {
  const meta = LIVE_STEPS[stepKey];
  const root = useRef<HTMLDivElement>(null);
  const seen = useRef({ key: stepKey, flown: new Set<string>() });
  if (seen.current.key !== stepKey) seen.current = { key: stepKey, flown: new Set() };

  const used = usedIn(stepKey, views);
  const found = step.findings;
  const running = live && step.progress < 1 && step.phase !== "waiting";
  const preview = step.source === "preview";
  const syncing = step.valueState === "syncing";
  // The tag follows the view model: preview, or engine values; mixed when both events and artifacts feed it.
  const origins = new Set(Object.values(step.valueSources));
  const mixed = origins.has("mixed") || (origins.has("event") && origins.has("artifact"));
  const walkable = step.walk === "structure" && live && !syncing && step.phase === "running";
  const sourceLabel = walkable
    ? "Procedure · walking the known structure"
    : preview
      ? "Procedure preview"
      : `${live ? "Live" : "Recorded"}${mixed ? " · events and artifacts" : ""}`;
  const done = step.phase === "recorded";
  const waiting = step.phase === "waiting";
  const reduced = useReducedMotion();
  const walking = walkable && !reduced;
  const [walkTarget, setWalkTarget] = useState<string | null>(null);

  // A step with only its structure known: the cursor visits each drawn item in turn, calmly, until the engine reports.
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new step starts its own walk.
  useEffect(() => {
    const host = root.current;
    if (!walking || !host) {
      setWalkTarget(null);
      return;
    }
    let at = -1;
    let previous: HTMLElement | null = null;
    const visit = () => {
      const items = [...host.querySelectorAll<HTMLElement>('[data-cursor^="i"]')];
      if (!items.length) return;
      at = (at + 1) % items.length;
      previous?.removeAttribute("data-walking");
      previous = items[at];
      previous.setAttribute("data-walking", "true");
      setWalkTarget(previous.dataset.cursor ?? null);
    };
    const first = window.setTimeout(visit, 600);
    const timer = window.setInterval(visit, 2200);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
      previous?.removeAttribute("data-walking");
    };
  }, [walking, stepKey]);

  // Chips fly from where a value is made to where it goes: parts into the lock, new findings out of the visual,
  // earlier findings into the work.
  useEffect(() => {
    const host = root.current;
    if (!host || !live) return;
    const visual = host.querySelector<HTMLElement>("[data-visual]");
    const flown = seen.current.flown;
    for (const el of host.querySelectorAll<HTMLElement>("[data-fly]")) {
      const key = el.dataset.fly ?? "";
      if (flown.has(`part:${key}`)) continue;
      flown.add(`part:${key}`);
      const land = host.querySelector(`[data-land="${CSS.escape(key)}"]`);
      launchFlight(el, land, el.dataset.label ?? key, "bg-foreground text-background");
    }
    for (const el of host.querySelectorAll<HTMLElement>("[data-fly-finding]")) {
      const key = `finding:${el.dataset.flyFinding}`;
      if (flown.has(key)) continue;
      flown.add(key);
      const tone = KIND[(el.dataset.kind as LiveFinding["kind"]) ?? "note"].chip;
      const isUsed = el.dataset.flyFinding?.startsWith("used");
      if (isUsed) launchFlight(el, visual, el.dataset.label ?? "", tone);
      else launchFlight(visual, el, el.dataset.label ?? "", tone);
    }
  });

  let target: string | null = null;
  if (walking) target = walkTarget;
  else if (running && !syncing) {
    if (step.cursor === null) target = "step";
    else target = step.cursorTarget === "procedure" ? `p${step.cursor}` : `i${step.cursor}`;
  }

  return (
    <div
      ref={root}
      className="relative min-w-0 overflow-hidden rounded-xl border bg-card shadow-xs [&_[data-walking=true]]:bg-sky-500/8 [&_section[data-walking=true]]:border-sky-500"
    >
      {reopened && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/50 px-4 py-2 text-sm">
          <span className="flex items-center gap-2">
            <Eye aria-hidden className="size-4 text-muted-foreground" />
            You are looking at a finished step.
          </span>
          <Button type="button" size="xs" variant="outline" onClick={reopened.onBack}>
            Back to live
          </Button>
        </div>
      )}
      <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 px-4 pt-3 text-sm">
        <span>
          <b className="font-semibold">
            {done ? "Done." : waiting ? "Waiting for you:" : live ? "Now:" : "Not finished:"}
          </b>{" "}
          {meta.now}
        </span>
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-muted-foreground text-xs">
          <span
            className={cn(
              "size-2 rounded-full",
              preview ? "border-[1.5px] border-muted-foreground border-dashed" : "bg-sky-600",
            )}
          />
          {sourceLabel}
        </span>
        {syncing && <Chip tone="warn">Syncing</Chip>}
        {waiting && <Chip tone="warn">Waiting for you</Chip>}
      </p>
      {preview && !done && step.procedure.length > 0 && (
        <p className="mx-4 mt-2 text-muted-foreground text-xs leading-relaxed">
          Logos has not sent this step's values yet; they appear when the engine reports them. Procedure:{" "}
          {step.procedure.map((line, index) => (
            <span key={line} data-cursor={`p${index}`}>
              {index > 0 && <span aria-hidden> → </span>}
              {line}
            </span>
          ))}
          .
        </p>
      )}
      <div data-visual data-cursor="step" className="min-w-0 px-4 py-4">
        <RecordedContext.Provider value={done}>{children}</RecordedContext.Provider>
      </div>
      <AgentCursor
        agent={meta.actor}
        container={root}
        target={target}
        version={`${stepKey}:${step.progress}`}
        click
        showCode={walking}
      />
      <section aria-label="Findings" className="flex flex-col gap-2 border-t bg-muted/40 px-4 py-3">
        {used.length > 0 && (
          <>
            <h4 className="font-medium text-muted-foreground text-xs">Used in this step</h4>
            <ul className="grid gap-1.5">
              {used.map((item, index) => (
                <FindingRow
                  key={`${item.from}:${item.text}`}
                  finding={item}
                  from={LIVE_STEPS[item.from].title}
                  fly={`used${index}`}
                />
              ))}
            </ul>
          </>
        )}
        <h4 className="font-medium text-muted-foreground text-xs">Found in this step</h4>
        {found.length > 0 ? (
          <ul className="grid gap-1.5">
            {found.map((item, index) => (
              <FindingRow key={item.text} finding={item} fly={`found${index}:${item.text}`} />
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-xs">
            {done ? "Nothing new to carry forward." : "Findings appear here when the engine records them."}
          </p>
        )}
      </section>
    </div>
  );
}
