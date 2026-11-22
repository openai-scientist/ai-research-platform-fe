import { createContext, type ReactNode, useContext } from "react";

import { cn } from "cn";

import type { LiveStep, LiveStructureItem } from "@/lib/run-stream/live-views";

export type Tone = "ok" | "warn" | "bad" | "neutral" | "live";

const TONE: Record<Tone, string> = {
  ok: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  warn: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  bad: "bg-red-500/12 text-red-700 dark:text-red-300",
  live: "bg-sky-500/12 text-sky-700 dark:text-sky-300",
  neutral: "bg-muted text-muted-foreground",
};

export function Chip({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1 whitespace-nowrap rounded-full px-2 font-medium text-xs",
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** True inside the card of a recorded step: a value still missing there was not recorded, it is not being evaluated. */
export const RecordedContext = createContext(false);

/** A value slot whose number or text has not arrived: the structure stays, the value is not guessed. */
export function Pending({ children = "Evaluating", className }: { children?: ReactNode; className?: string }) {
  const recorded = useContext(RecordedContext);
  return (
    <span className={cn("text-muted-foreground text-xs italic", className)}>
      {recorded ? "Not recorded" : children}
    </span>
  );
}

/** Shows the value, or the pending slot when it is null or empty. */
export function Val({
  value,
  unit,
  className,
}: {
  value: ReactNode | null | undefined;
  unit?: string;
  className?: string;
}) {
  if (value === null || value === undefined || value === "") return <Pending className={className} />;
  return (
    <span className={className}>
      {value}
      {unit ? ` ${unit}` : ""}
    </span>
  );
}

const SOURCE = {
  artifact: "From the published artifact",
  event: "From an engine event",
  mixed: "From an event and an artifact",
};

/** A bordered section of a step's visual. `source` says where its values came from; `current` marks it as being worked on. */
export function Panel({
  title,
  aside,
  source,
  cursor,
  current,
  className,
  children,
}: {
  title?: ReactNode;
  aside?: ReactNode;
  source?: "artifact" | "event" | "mixed";
  cursor?: string;
  current?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      data-cursor={cursor}
      className={cn(
        "flex min-w-0 flex-col gap-2.5 rounded-xl border bg-card p-3 transition-[border-color,box-shadow]",
        current && "border-sky-500 ring-3 ring-sky-500/15",
        className,
      )}
    >
      {(title || aside || source) && (
        <header className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-medium text-[11px] text-muted-foreground uppercase tracking-wide">{title}</h3>
          <span className="flex items-center gap-2 text-muted-foreground text-xs">
            {aside}
            {source && (
              <span title={SOURCE[source]} className="rounded border px-1 font-mono text-[10px]">
                {source}
              </span>
            )}
          </span>
        </header>
      )}
      {children}
    </section>
  );
}

export function Meter({
  value,
  tone = "neutral",
  className,
}: {
  value: number | null;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span className={cn("block h-2 min-w-12 flex-1 overflow-hidden rounded-full bg-muted", className)}>
      {value !== null && (
        <span
          className={cn(
            "block h-full rounded-full",
            tone === "warn" ? "bg-amber-500" : tone === "ok" ? "bg-emerald-600" : "bg-foreground",
          )}
          style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }}
        />
      )}
    </span>
  );
}

export const fmt = (n: number | null | undefined, digits = 0) =>
  n === null || n === undefined ? null : n.toLocaleString("en-US", { maximumFractionDigits: digits });
export const pct = (n: number | null | undefined, digits = 1) =>
  n === null || n === undefined ? null : `${(n * 100).toLocaleString("en-US", { maximumFractionDigits: digits })}%`;

/** The `data-cursor` value of the nth item of a step's content; the agent cursor goes to the one the engine names. */
export const itemCursor = (index: number) => `i${index}`;
export const isCurrent = (step: Pick<LiveStep<object>, "cursor" | "cursorTarget">, index: number) =>
  step.cursorTarget === "content" && step.cursor === index;

/** Labels of the step's known structure that come from a source matching `from`, in the order the model lists them. */
export const known = (step: { structure: readonly LiveStructureItem[] }, from: RegExp) => [
  ...new Set(step.structure.filter((item) => from.test(item.source)).map((item) => item.label)),
];
/** The name in a "name · type · role" structure label. */
export const nameOf = (label: string) => label.split(" · ")[0];
/** An empty value cell in a drawn structure: the place is kept, nothing is measured. */
export const Blank = ({ className }: { className?: string }) => (
  <span aria-hidden className={cn("inline-block h-2 w-12 rounded-full bg-muted", className)} />
);
