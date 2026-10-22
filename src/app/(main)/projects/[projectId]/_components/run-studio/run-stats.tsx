"use client";

import type { ReactNode } from "react";

import { cn } from "cn";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useRunDetailQuery } from "@/hooks/use-runs-query";
import type { RunState, StageContent } from "@/lib/run-stream/run-state";
import type { RunSession } from "@/lib/run-stream/run-store";

import { AnimatedNumber } from "./animated-number";
import { STAGE_SHORT } from "./run-meta";

export function compactNumber(value: number) {
  return value.toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 1 });
}

function duration(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${String(s % 60).padStart(2, "0")}s`;
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
}

/** The latest content a run has for one kind of stage. */
function latest<S extends StageContent["stage"]>(state: RunState, stage: S) {
  const key = [...state.stageOrder].reverse().find((k) => state.stages[k]?.content.stage === stage);
  return key ? (state.stages[key].content as Extract<StageContent, { stage: S }>) : undefined;
}

function plannedOf(state: RunState, key: string) {
  return [...state.plan].reverse().find((p) => p.key === key) ?? state.stages[key]?.plan;
}

function Meter({ value, max, className }: { value: number; max: number; className?: string }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
      <div
        className={cn("h-full rounded-full bg-primary transition-[width] duration-700", className)}
        style={{ width: `${max > 0 ? Math.min(100, (value / max) * 100) : 0}%` }}
      />
    </div>
  );
}

function Kpi({
  label,
  value,
  unit,
  shown,
  badge,
  children,
}: {
  label: string;
  value: number | null;
  unit?: string;
  /** Text in place of the counting number, such as `754K`. */
  shown?: string;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="rounded-none">
        <CardTitle className="font-normal text-muted-foreground text-sm">{label}</CardTitle>
        {badge && <CardAction>{badge}</CardAction>}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between gap-4">
        <p className="text-3xl tabular-nums leading-none tracking-tight">
          {value === null ? (
            <span className="text-muted-foreground">–</span>
          ) : (
            (shown ?? <AnimatedNumber value={value} />)
          )}
          {unit && value !== null && <span className="ml-1 text-base text-muted-foreground">{unit}</span>}
        </p>
        {children}
      </CardContent>
    </Card>
  );
}

const SOURCE_COLORS = ["bg-sky-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500"];

/** Papers, shortlist, hypotheses and tokens: the run at a glance. */
function KpiStrip({ session }: { session: RunSession }) {
  const { state } = session;
  const search = latest(state, "search");
  const screen = latest(state, "screen");
  const read = latest(state, "read");
  const hyp = latest(state, "hypothesize");
  const run = useRunDetailQuery(session.projectId, session.runId, { enabled: session.pipeline }).data?.data;

  const perSource = search?.collected?.per_source ?? {};
  const sources = (search?.sources ?? []).map((s, i) => {
    const cells = Object.entries(search?.cells ?? {}).filter(([k]) => k.endsWith(`:${s.id}`));
    const done = perSource[s.id];
    const requests = done?.requests ?? cells.length;
    const failed = done?.errors?.length ?? 0;
    return {
      ...s,
      papers: done?.papers ?? cells.reduce((sum, [, n]) => sum + (n ?? 0), 0),
      down: requests > 0 && failed >= requests,
      color: SOURCE_COLORS[i % SOURCE_COLORS.length],
    };
  });
  const found = sources.reduce((sum, s) => sum + s.papers, 0);
  const down = sources.filter((s) => s.down);
  const unique = search?.collected?.unique;

  const kept = screen?.kept.length ? screen.kept.filter((p) => !screen.dropped.includes(p.id)).length : null;
  const drafts = hyp ? Object.values(hyp.drafts) : [];
  const picked = drafts.filter((d) => d.selected && !hyp?.dropped.includes(d.hypothesis.id)).length;
  const rounds = state.stageOrder.filter((k) => state.stages[k]?.content.stage === "hypothesize").length;

  const used = run?.tokens_used ?? 0;
  const budget = run?.token_budget ?? 0;
  const worked = state.stageOrder.reduce((sum, k) => {
    const s = state.stages[k];
    return s?.startedAt && s.workedUntil ? sum + Date.parse(s.workedUntil) - Date.parse(s.startedAt) : sum;
  }, 0);

  return (
    <div className="overflow-hidden rounded-xl bg-card shadow-xs ring-1 ring-foreground/10">
      <div className="grid divide-y *:data-[slot=card]:rounded-none *:data-[slot=card]:ring-0 md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-4">
        <Kpi
          label="Papers found"
          value={unique ?? (found || null)}
          unit={unique !== undefined ? "unique" : undefined}
          badge={
            down.length > 0 && (
              <Badge className="bg-amber-500/15 text-amber-800 dark:text-amber-300" title="Rate limited or unreachable">
                {down.length === 1 ? `${down[0].name} failed` : `${down.length} sources failed`}
              </Badge>
            )
          }
        >
          <div className="flex flex-col gap-2">
            <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
              {found > 0 &&
                sources
                  .filter((s) => s.papers > 0)
                  .map((s) => (
                    <div
                      key={s.id}
                      className={cn("h-full", s.color)}
                      style={{ width: `${(s.papers / found) * 100}%` }}
                    />
                  ))}
            </div>
            <ul className="flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground text-xs">
              {sources.map((s) => (
                <li key={s.id} className="flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className={cn("size-1.5 shrink-0 rounded-full", s.down ? "bg-muted-foreground/40" : s.color)}
                  />
                  <span className={cn("font-medium text-foreground tabular-nums", s.down && "text-muted-foreground")}>
                    {s.papers}
                  </span>
                  {s.name}
                </li>
              ))}
            </ul>
          </div>
        </Kpi>
        <Kpi label="Shortlisted" value={kept} unit="papers">
          <div className="flex flex-col gap-2">
            <Meter value={kept ?? 0} max={unique ?? 0} />
            <p className="text-muted-foreground text-xs">
              {kept !== null && unique
                ? `${((kept / unique) * 100).toFixed(1)}% of ${unique} · ${read?.cards.length ?? 0} read`
                : "Scored for relevance and quality"}
            </p>
          </div>
        </Kpi>
        <Kpi
          label="Hypotheses"
          value={drafts.length ? picked || drafts.length : null}
          unit={picked ? "picked" : undefined}
        >
          <p className="text-muted-foreground text-xs">
            {drafts.length
              ? `${drafts.length} written · ${rounds} review ${rounds === 1 ? "round" : "rounds"}`
              : "Written after the gaps are found"}
          </p>
        </Kpi>
        <Kpi
          label="Tokens"
          value={run ? used : null}
          shown={compactNumber(used)}
          unit={budget ? `of ${compactNumber(budget)}` : undefined}
        >
          <div className="flex flex-col gap-2">
            <Meter value={used} max={budget} className={budget && used / budget >= 0.8 ? "bg-amber-500" : undefined} />
            <p className="text-muted-foreground text-xs">
              {budget ? `${Math.round((used / budget) * 100)}% of the budget` : "No budget set"}
              {worked > 0 && ` · ${duration(worked)} of work`}
            </p>
          </div>
        </Kpi>
      </div>
    </div>
  );
}

const findingsConfig = {
  blocking: { label: "Blocking", color: "var(--color-red-500)" },
  major: { label: "Major", color: "var(--color-amber-500)" },
  minor: { label: "Minor", color: "var(--color-sky-500)" },
} satisfies ChartConfig;

/** What the independent reviewer found in each round of hypotheses. */
function FindingsChart({ state }: { state: RunState }) {
  const data = state.stageOrder.flatMap((key, i) => {
    const c = state.stages[key]?.content;
    if (c?.stage !== "hypothesize") return [];
    const count = (s: string) => c.findings.filter((f) => f.severity === s).length;
    return [
      {
        round: `R${plannedOf(state, key)?.round ?? i + 1}`,
        blocking: count("blocking"),
        major: count("major"),
        minor: count("minor"),
      },
    ];
  });
  const last = data.at(-1);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reviewer findings</CardTitle>
        <CardDescription>Per round of hypotheses</CardDescription>
        {last && (
          <CardAction className="text-muted-foreground text-xs tabular-nums">
            {last.blocking ? `${last.blocking} blocking left` : "No blocking left"}
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {data.length ? (
          <ChartContainer config={findingsConfig} className="aspect-auto h-56 w-full">
            <BarChart data={data} margin={{ left: 0, right: 4, top: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="round" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={32} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="blocking" stackId="f" fill="var(--color-blocking)" maxBarSize={56} />
              <Bar dataKey="major" stackId="f" fill="var(--color-major)" maxBarSize={56} />
              <Bar dataKey="minor" stackId="f" fill="var(--color-minor)" radius={[4, 4, 0, 0]} maxBarSize={56} />
            </BarChart>
          </ChartContainer>
        ) : (
          <p className="grid h-56 place-items-center text-muted-foreground text-sm">
            The reviewer reads each round of hypotheses.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

const timeConfig = { minutes: { label: "Minutes", color: "var(--color-sky-500)" } } satisfies ChartConfig;

/** How long each stage worked, without the time it waited for you. */
function TimeChart({ state }: { state: RunState }) {
  const data = state.stageOrder.flatMap((key) => {
    const s = state.stages[key];
    if (!s?.startedAt || !s.workedUntil) return [];
    const p = plannedOf(state, key);
    const short = STAGE_SHORT[p?.stage ?? "scope"];
    const ms = Date.parse(s.workedUntil) - Date.parse(s.startedAt);
    return [
      {
        stage: p?.round ? `R${p.round}` : short,
        name: p?.round ? `R${p.round} ${short}` : short,
        minutes: Math.round((ms / 60000) * 10) / 10,
        ms,
      },
    ];
  });
  const total = data.reduce((sum, d) => sum + d.ms, 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Time per stage</CardTitle>
        <CardDescription>Waiting for you isn't counted</CardDescription>
        {total > 0 && <CardAction className="text-muted-foreground text-xs tabular-nums">{duration(total)}</CardAction>}
      </CardHeader>
      <CardContent>
        <ChartContainer config={timeConfig} className="aspect-auto h-56 w-full">
          <BarChart data={data} margin={{ left: 0, right: 4, top: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="stage" tickLine={false} axisLine={false} tickMargin={8} minTickGap={4} fontSize={11} />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={40}
              allowDecimals={false}
              tickFormatter={(v: number) => `${v}m`}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(_, items) => String(items[0]?.payload?.name ?? "")}
                  formatter={(_, __, item) => duration(Number(item.payload.ms))}
                />
              }
            />
            <Bar dataKey="minutes" fill="var(--color-minutes)" radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

/** The live run in numbers, under its card. */
export function RunStats({ session }: { session: RunSession }) {
  const { state } = session;
  if (!state.stageOrder.length) return null;
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <KpiStrip session={session} />
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <FindingsChart state={state} />
        <TimeChart state={state} />
      </div>
    </div>
  );
}
