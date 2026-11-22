"use client";
"use no memo";

/* ===== The visual kit of the stage screens: open sections with a coloured head and a line on what each tells you,
   stat tiles with large figures, small charts where the data is countable, and one highlighted takeaway.
   Colour keeps one meaning on every screen: green holds or passed, amber look at it, red blocked or failed, grey not
   claimed; teal and violet belong to the two branches only. Each screen adds one calm accent of its own for its heads,
   its takeaway and its neutral marks. Fills are light with dark text; every chart grows as its data arrives, and
   stands still for a reader who asks for reduced motion. ===== */

import { createContext, type HTMLAttributes, type ReactNode, useContext } from "react";

import { Cell, Pie, PieChart } from "recharts";

import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { cn, Icon, RM } from "../lib";
import { Bars, CARD } from "./outline-kit";
import type { Tone } from "./stage-kit";

/* ---------- the stage accent: one calm hue per screen, for heads, the takeaway and neutral marks ---------- */
export type Accent = "sky" | "indigo";
interface AccentClasses {
  /** the head band of a section */
  band: string;
  /** the icon chip of a head */
  chip: string;
  /** a neutral mark: a count bar, a live dot */
  mark: string;
  /** the takeaway's light fill and its edge */
  soft: string;
  edge: string;
  /** a small label in the accent */
  text: string;
}
export const ACCENT: Record<Accent, AccentClasses> = {
  sky: {
    band: "bg-sky-50/70 dark:bg-sky-950/25",
    chip: "bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200",
    mark: "bg-sky-500 dark:bg-sky-400",
    soft: "bg-sky-50 dark:bg-sky-950/40",
    edge: "border-sky-500 dark:border-sky-400",
    text: "text-sky-800 dark:text-sky-200",
  },
  indigo: {
    band: "bg-indigo-50/70 dark:bg-indigo-950/25",
    chip: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200",
    mark: "bg-indigo-500 dark:bg-indigo-400",
    soft: "bg-indigo-50 dark:bg-indigo-950/40",
    edge: "border-indigo-500 dark:border-indigo-400",
    text: "text-indigo-800 dark:text-indigo-200",
  },
};
const AccentContext = createContext<Accent>("sky");
/** The screen's accent, for every section and chart under it. */
export function StageAccent({ accent, children }: { accent: Accent; children: ReactNode }) {
  return <AccentContext.Provider value={accent}>{children}</AccentContext.Provider>;
}
export const useAccent = () => ACCENT[useContext(AccentContext)];

/* ---------- the marks of the one colour system, as fills for bars, dots and chart slices ---------- */
export type Swatch = "ok" | "okSoft" | "look" | "lookSoft" | "bad" | "none" | "accent";
/** A swatch as a background (a div mark) and as an SVG fill (a chart slice). */
export const SWATCH: Record<Exclude<Swatch, "accent">, { bg: string; fill: string }> = {
  ok: {
    bg: "bg-emerald-500 dark:bg-emerald-400",
    fill: "fill-emerald-500 dark:fill-emerald-400",
  },
  okSoft: {
    bg: "bg-emerald-300 dark:bg-emerald-200",
    fill: "fill-emerald-300 dark:fill-emerald-200",
  },
  look: {
    bg: "bg-amber-500 dark:bg-amber-400",
    fill: "fill-amber-500 dark:fill-amber-400",
  },
  lookSoft: {
    bg: "bg-amber-300 dark:bg-amber-200",
    fill: "fill-amber-300 dark:fill-amber-200",
  },
  bad: {
    bg: "bg-rose-500 dark:bg-rose-400",
    fill: "fill-rose-500 dark:fill-rose-400",
  },
  none: {
    bg: "bg-stone-300 dark:bg-stone-600",
    fill: "fill-stone-300 dark:fill-stone-600",
  },
};
const swatchBg = (s: Swatch, accent: AccentClasses) => (s === "accent" ? accent.mark : SWATCH[s].bg);
/** The track behind what has not arrived yet. */
const TRACK = "bg-foreground/[0.07] dark:bg-foreground/10";
const GROW = "transition-[width,flex-basis] duration-500 ease-out motion-reduce:transition-none";

/** One part of a whole: its name, its count and its mark. */
export interface Part {
  key: string;
  label: string;
  value: number;
  swatch: Swatch;
}
const pct = (v: number, of: number) => (of > 0 ? Math.round((v / of) * 100) : 0);

/* ---------- sections: open, a coloured head, and one line on what the section tells a newcomer ---------- */
export function Section({
  icon,
  title,
  tells,
  now,
  aside,
  children,
  className,
  ...rest
}: {
  icon: string;
  title: ReactNode;
  /** What the section tells you, for a newcomer: one plain sentence. */
  tells?: ReactNode;
  /** What the stage is doing in this section right now, while it plays. */
  now?: ReactNode;
  aside?: ReactNode;
  children?: ReactNode;
  className?: string;
} & Omit<HTMLAttributes<HTMLElement>, "title">) {
  const a = useAccent();
  return (
    <section className={cn(CARD, "scroll-mt-4", className)} {...rest}>
      <header className={cn("flex flex-wrap items-start gap-x-3 gap-y-2 border-b px-4 py-3.5 sm:px-5", a.band)}>
        <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", a.chip)}>
          <Icon n={icon} className="size-4" />
        </span>
        <div className="min-w-0 flex-1 basis-56">
          <h3 className="text-pretty font-semibold text-[15.5px] leading-6">{title}</h3>
          {tells && (
            <p className="mt-0.5 max-w-[80ch] text-pretty text-[13.5px] text-muted-foreground leading-snug">
              <span className="font-medium text-foreground">What this tells you: </span>
              {tells}
            </p>
          )}
          {now && (
            <p className="mt-1.5 flex items-start gap-2 text-[12.5px] text-muted-foreground leading-snug">
              <span
                aria-hidden="true"
                className={cn("mt-1 size-1.5 shrink-0 animate-pulse rounded-full motion-reduce:animate-none", a.mark)}
              />
              <span className="min-w-0">{now}</span>
            </p>
          )}
        </div>
        {aside != null && (
          <div className="ml-auto flex shrink-0 items-center gap-2 self-center text-[12.5px] text-muted-foreground tabular-nums">
            {aside}
          </div>
        )}
      </header>
      {children}
    </section>
  );
}
/** A heading inside a section: a small title, and what the part under it shows. */
export function SubHead({ title, tells, aside }: { title: ReactNode; tells?: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
      <div className="min-w-0">
        <h4 className="font-semibold text-[13.5px]">{title}</h4>
        {tells && <p className="text-pretty text-[12.5px] text-muted-foreground leading-snug">{tells}</p>}
      </div>
      {aside != null && <div className="text-[12.5px] text-muted-foreground tabular-nums">{aside}</div>}
    </div>
  );
}

/* ---------- the takeaway: the one sentence a reader should leave with ---------- */
export function Takeaway({ ready, children }: { ready: boolean; children?: ReactNode }) {
  const a = useAccent();
  return (
    <div className={cn("rounded-lg border-l-4 px-4 py-3", a.soft, a.edge)}>
      <span className={cn("font-semibold text-[11.5px] uppercase tracking-wide", a.text)}>The takeaway</span>
      {ready && children ? (
        <p className="mt-0.5 max-w-[80ch] text-pretty font-medium text-[15.5px] leading-snug">{children}</p>
      ) : (
        <Bars n={2} last="w-1/2" className="mt-1.5 max-w-xl" />
      )}
    </div>
  );
}

/* ---------- stat tiles: a large figure, coloured by what it means, with a hint under it ---------- */
const TILE: Record<Tone | "accent", string> = {
  ok: "bg-emerald-50/70 ring-emerald-600/15 dark:bg-emerald-950/25 dark:ring-emerald-400/15",
  look: "bg-amber-50/70 ring-amber-600/20 dark:bg-amber-950/25 dark:ring-amber-400/15",
  bad: "bg-rose-50/70 ring-rose-600/15 dark:bg-rose-950/25 dark:ring-rose-400/15",
  none: "bg-muted/40 ring-foreground/10",
  accent: "bg-muted/40 ring-foreground/10",
};
const FIGURE: Record<Tone | "accent", string> = {
  ok: "text-emerald-700 dark:text-emerald-300",
  look: "text-amber-700 dark:text-amber-300",
  bad: "text-rose-700 dark:text-rose-300",
  none: "text-foreground",
  accent: "text-foreground",
};
export function StatTile({
  label,
  value,
  of,
  hint,
  tone = "none",
  ready,
  children,
}: {
  label: string;
  value: ReactNode;
  /** what the figure is out of: "of 51" */
  of?: ReactNode;
  hint?: ReactNode;
  tone?: Tone;
  ready: boolean;
  /** a small mark under the figure: a meter or a strip */
  children?: ReactNode;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5 rounded-xl px-3.5 py-3 ring-1 ring-inset", TILE[tone])}>
      <span className="font-medium text-[12.5px] text-muted-foreground leading-tight">{label}</span>
      {ready ? (
        <>
          <span className="flex flex-wrap items-baseline gap-x-1.5">
            <b className={cn("font-semibold text-[28px] leading-none tracking-tight", FIGURE[tone])}>{value}</b>
            {of != null && <span className="text-[13.5px] text-muted-foreground">{of}</span>}
          </span>
          {children}
          {hint && <span className="text-pretty text-[12.5px] text-muted-foreground leading-snug">{hint}</span>}
        </>
      ) : (
        <Bars n={2} last="w-2/3" className="py-1.5" />
      )}
    </div>
  );
}
/** Tiles in a row that wraps: two on a phone, as many as fit beside each other on a wide screen. */
export function TileRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-2.5 sm:grid-cols-[repeat(auto-fit,minmax(11rem,1fr))]", className)}>
      {children}
    </div>
  );
}

/* ---------- a meter: one share of a whole, the track a lighter step of its own hue ---------- */
const METER: Record<Tone | "accent", [string, string]> = {
  ok: ["bg-emerald-100 dark:bg-emerald-900/50", "bg-emerald-500 dark:bg-emerald-400"],
  look: ["bg-amber-100 dark:bg-amber-900/50", "bg-amber-500 dark:bg-amber-400"],
  bad: ["bg-rose-100 dark:bg-rose-900/50", "bg-rose-500 dark:bg-rose-400"],
  none: [TRACK, "bg-stone-400 dark:bg-stone-500"],
  accent: [TRACK, ""],
};
export function Meter({
  value,
  max,
  tone = "none",
  label,
}: {
  value: number;
  max: number;
  tone?: Tone;
  label: string;
}) {
  const [track, fill] = METER[tone];
  return (
    <span
      role="img"
      aria-label={`${label}: ${value} of ${max}`}
      className={cn("block h-1.5 w-full overflow-hidden rounded-full", track)}
    >
      <span className={cn("block h-full rounded-full", fill, GROW)} style={{ width: `${pct(value, max)}%` }} />
    </span>
  );
}

/* ---------- a mark with its words on hover and on focus ---------- */
function Tip({ text, children }: { text: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-pretty">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

/* ---------- a legend: each part's mark, its name and its count, in the order of the bar ---------- */
export function Legend({
  parts,
  total,
  stacked,
  className,
}: {
  parts: Part[];
  total?: number;
  /** one part per line, the counts in a column */
  stacked?: boolean;
  className?: string;
}) {
  const a = useAccent();
  return (
    <ul
      className={cn(
        "text-[12.5px]",
        stacked
          ? "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1.5"
          : "flex flex-wrap gap-x-4 gap-y-1.5",
        className,
      )}
    >
      {parts.map((p) => {
        const mark = (
          <span
            key="mark"
            aria-hidden="true"
            className={cn("size-2.5 shrink-0 rounded-[3px]", swatchBg(p.swatch, a))}
          />
        );
        const share = total != null && total > 0 && p.value > 0 ? ` · ${pct(p.value, total)}%` : "";
        return stacked ? (
          <li key={p.key} className={cn("contents", p.value === 0 && "[&>*]:opacity-60")}>
            {mark}
            <span className="text-muted-foreground leading-tight">{p.label}</span>
            <span className="text-right tabular-nums">
              <b className="font-semibold">{p.value}</b>
              <span className="text-muted-foreground">{share}</span>
            </span>
          </li>
        ) : (
          <li key={p.key} className={cn("inline-flex items-center gap-1.5", p.value === 0 && "opacity-60")}>
            {mark}
            <span className="text-muted-foreground">{p.label}</span>
            <b className="font-semibold tabular-nums">{p.value}</b>
            {share && <span className="text-muted-foreground tabular-nums">{share}</span>}
          </li>
        );
      })}
    </ul>
  );
}

/* ---------- a segmented bar: one whole split into its parts; what has not arrived is the grey track ---------- */
export function SegmentBar({
  parts,
  total,
  label,
  height = "h-3",
  scale,
}: {
  parts: Part[];
  /** the whole: what is missing from it shows as the track */
  total: number;
  label: string;
  height?: string;
  /** the bar's own length, as a share of the longest bar beside it (0–1) */
  scale?: number;
}) {
  const a = useAccent();
  const shown = parts.filter((p) => p.value > 0);
  const sum = shown.reduce((s, p) => s + p.value, 0);
  const rest = Math.max(0, total - sum);
  return (
    <figure
      aria-label={`${label}: ${parts.map((p) => `${p.value} ${p.label.toLowerCase()}`).join(", ")}${rest ? `, ${rest} still to come` : ""}.`}
      className={cn("flex min-w-0 gap-0.5", height, GROW)}
      style={{ width: scale != null ? `${Math.max(scale * 100, 4)}%` : "100%" }}
    >
      {shown.map((p) => (
        <Tip key={p.key} text={`${p.label}: ${p.value} of ${total} (${pct(p.value, total)}%)`}>
          <span
            // biome-ignore lint/a11y/noNoninteractiveTabindex: the part's words open on focus, as on hover
            tabIndex={0}
            className={cn(
              "min-w-1 rounded-[3px] outline-none focus-visible:ring-2 focus-visible:ring-ring",
              swatchBg(p.swatch, a),
              GROW,
            )}
            style={{ flexBasis: `${(p.value / Math.max(total, 1)) * 100}%` }}
          />
        </Tip>
      ))}
      {rest > 0 && (
        <span className={cn("rounded-[3px]", TRACK, GROW)} style={{ flexBasis: `${(rest / total) * 100}%` }} />
      )}
    </figure>
  );
}

/* ---------- rows of bars: one bar per item, its parts stacked, the lengths on one scale ---------- */
export interface BarRow {
  key: string;
  label: ReactNode;
  /** a line under the label */
  sub?: ReactNode;
  parts: Part[];
  total: number;
  /** at the end of the row: a count or a status */
  end?: ReactNode;
  /** a plain name for the row's words on hover */
  name: string;
}
export function BarRows({ rows, className }: { rows: BarRow[]; className?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.total));
  return (
    <ul className={cn("@container flex flex-col gap-2.5", className)}>
      {rows.map((r) => (
        <li
          key={r.key}
          className="grid @xl:grid-cols-[12rem_minmax(0,1fr)_auto] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1"
        >
          <span className="@max-xl:col-span-2 min-w-0 text-[13px] leading-tight">
            <span className="block truncate">{r.label}</span>
            {r.sub && <span className="block truncate text-[12px] text-muted-foreground">{r.sub}</span>}
          </span>
          <SegmentBar parts={r.parts} total={r.total} label={r.name} height="h-2.5" scale={r.total / max} />
          <span className="whitespace-nowrap text-right text-[12.5px] text-muted-foreground tabular-nums">{r.end}</span>
        </li>
      ))}
    </ul>
  );
}

/* ---------- a status strip: one small square per item, in its order, its words on hover ---------- */
export function StatusStrip({
  items,
  label,
  className,
}: {
  items: { key: string; swatch: Swatch | "wait"; text: string }[];
  label: string;
  className?: string;
}) {
  const a = useAccent();
  return (
    <ul aria-label={label} className={cn("inline-flex flex-wrap gap-[3px]", className)}>
      {items.map((it) => (
        <li key={it.key} className="flex">
          <Tip text={it.text}>
            <span
              aria-label={it.text}
              role="img"
              // biome-ignore lint/a11y/noNoninteractiveTabindex: the item's words open on focus, as on hover
              tabIndex={0}
              className={cn(
                "size-2.5 rounded-[3px] outline-none transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
                it.swatch === "wait" ? TRACK : swatchBg(it.swatch, a),
              )}
            />
          </Tip>
        </li>
      ))}
    </ul>
  );
}

/* ---------- a donut: the share of each part of one whole, the figure in its middle ---------- */
export function Donut({
  parts,
  total,
  center,
  sub,
  label,
}: {
  parts: Part[];
  total: number;
  center: ReactNode;
  sub?: ReactNode;
  label: string;
}) {
  const shown = parts.filter((p) => p.value > 0);
  const sum = shown.reduce((s, p) => s + p.value, 0);
  const rest = Math.max(0, total - sum);
  const data = [
    ...shown.map((p) => ({
      key: p.key,
      label: p.label,
      value: p.value,
      fill: SWATCH[p.swatch === "accent" ? "none" : p.swatch].fill,
    })),
    ...(rest > 0
      ? [
          {
            key: "rest",
            label: "Still to come",
            value: rest,
            fill: "fill-muted",
          },
        ]
      : []),
  ];
  const config = Object.fromEntries(data.map((d) => [d.key, { label: d.label }]));
  return (
    <div
      role="img"
      aria-label={`${label}: ${parts.map((p) => `${p.value} ${p.label.toLowerCase()}`).join(", ")}.`}
      className="relative size-36 shrink-0"
    >
      <ChartContainer config={config} className="aspect-square size-36" initialDimension={{ width: 144, height: 144 }}>
        <PieChart>
          <ChartTooltip
            cursor={false}
            content={({ active, payload }) => {
              const d = payload?.[0]?.payload as (typeof data)[number] | undefined;
              if (!active || !d) return null;
              return (
                <div className="rounded-md bg-popover px-2.5 py-1.5 text-popover-foreground text-xs shadow-md ring-1 ring-foreground/10">
                  <b className="font-semibold tabular-nums">{d.value}</b> {d.label.toLowerCase()} ·{" "}
                  {pct(d.value, total)}%
                </div>
              );
            }}
          />
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius="72%"
            outerRadius="100%"
            paddingAngle={data.length > 1 ? 2 : 0}
            cornerRadius={3}
            startAngle={90}
            endAngle={-270}
            stroke="none"
            isAnimationActive={!RM()}
            animationDuration={500}
          >
            {data.map((d) => (
              <Cell key={d.key} className={cn(d.fill, "outline-none")} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
      <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <b className="font-semibold text-2xl leading-none">{center}</b>
        {sub && <span className="mt-1 max-w-[6.5rem] text-[11.5px] text-muted-foreground leading-tight">{sub}</span>}
      </span>
    </div>
  );
}

/* ---------- results in the one colour system: each item's mark, its name and what it came to ---------- */
const TONE_ICON: Record<Tone | "wait" | "now", { n: string; c: string }> = {
  ok: { n: "circleCheck", c: "text-emerald-600 dark:text-emerald-400" },
  look: { n: "alert", c: "text-amber-600 dark:text-amber-400" },
  bad: { n: "x", c: "text-rose-600 dark:text-rose-400" },
  none: { n: "minus", c: "text-muted-foreground" },
  wait: { n: "minus", c: "text-muted-foreground/60" },
  now: { n: "rotate", c: "text-muted-foreground" },
};
export function ResultGrid({
  items,
  className,
}: {
  items: {
    key: string;
    title: ReactNode;
    result: ReactNode;
    tone: Tone | "wait" | "now";
    onPick?: () => void;
  }[];
  className?: string;
}) {
  return (
    <ol className={cn("grid gap-2 sm:grid-cols-2 xl:grid-cols-3", className)}>
      {items.map((it, i) => {
        const ic = TONE_ICON[it.tone];
        const body = (
          <>
            <span className="mt-0.5 font-mono text-[11px] text-muted-foreground tabular-nums">{i + 1}</span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="font-medium text-[13.5px] leading-snug">{it.title}</span>
              <span className="text-[12.5px] text-muted-foreground leading-snug">{it.result}</span>
            </span>
            <Icon
              n={ic.n}
              className={cn("mt-0.5 size-4", ic.c, it.tone === "now" && "animate-spin motion-reduce:animate-none")}
            />
          </>
        );
        return (
          <li key={it.key} className="min-w-0">
            {it.onPick ? (
              <button
                type="button"
                onClick={it.onPick}
                className="flex w-full items-start gap-2.5 rounded-lg bg-muted/40 px-3 py-2.5 text-left outline-none ring-1 ring-foreground/5 hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring"
              >
                {body}
              </button>
            ) : (
              <span className="flex items-start gap-2.5 rounded-lg bg-muted/40 px-3 py-2.5 ring-1 ring-foreground/5">
                {body}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/* ---------- what the stage does to the paper: one line per item, its mark in the one colour system ---------- */
const DOT: Record<Tone, string> = {
  ok: "bg-emerald-500",
  look: "bg-amber-500",
  bad: "bg-rose-500",
  none: "bg-foreground/25",
};
export function EffectList({
  items,
}: {
  items: {
    key: string;
    item: ReactNode;
    effect: ReactNode;
    tone?: Tone;
    id?: string;
  }[];
}) {
  return (
    <ul className="flex flex-col divide-y divide-border/70">
      {items.map((e) => (
        <li key={e.key} className="grid grid-cols-[0.5rem_minmax(0,1fr)] gap-3 py-2 text-[13.5px] leading-snug">
          <span className={cn("mt-1.5 size-2 rounded-full", DOT[e.tone ?? "none"])} />
          <span className="text-pretty">
            <b className="font-semibold">{e.item}</b>
            {e.id && <span className="ml-1.5 font-mono text-[11.5px] text-muted-foreground">{e.id}</span>}
            <span className="text-muted-foreground"> — </span>
            {e.effect}
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ---------- the tail of a genuinely long raw list: the first items stand, the rest open on a click ---------- */
export function TailToggle({
  open,
  onToggle,
  more,
  noun,
}: {
  open: boolean;
  onToggle(): void;
  more: number;
  noun: string;
}) {
  if (more <= 0) return null;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="inline-flex h-8 w-fit items-center gap-1.5 rounded-md px-2.5 font-medium text-[13px] text-muted-foreground outline-none ring-1 ring-foreground/10 hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Icon n="down" className={cn("size-3.5 transition-transform", open && "rotate-180")} />
      {open ? `Show fewer ${noun}` : `Show ${more} more ${noun}`}
    </button>
  );
}
