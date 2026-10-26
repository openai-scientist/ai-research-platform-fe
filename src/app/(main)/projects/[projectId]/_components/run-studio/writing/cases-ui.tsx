"use client";
"use no memo";

// The writing run keeps its state in module variables (engine.ts) and re-renders on emit(); the React Compiler
// would memoise these components on their props and never show a change.

import { type ReactNode, useLayoutEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { PulseDot } from "../run-bits";
import { CASE_KIND, CASES, type CaseDef, SCN, SCN_ORDER } from "./data/cases";
import { BLOCKS } from "./data/core";
import { DEBATE_RULES, GROUND, RULING, RULING_ORDER, SCHEMES } from "./data/debate";
import { INC } from "./data/incidents";
import { JSTAGE, JTEAM } from "./data/jfe";
import { AGENTS, isCode, ROSTER, ROSTER_COUNT, type ScreenDef, STAGE, STOP_NO } from "./data/meta";
import { LEVEL_TONE } from "./data/report";
import { emit, J, jPublishNow, playScenario, restart, S, setTrack, settle, UI } from "./engine";
import { BOX_TYPES, type BoxNode, Diagram, type LinkEdge } from "./flow";
import { AgentAvatar, canEnter, cn, DEV, EASE, Icon, M, Pane, quiet, WorkOrb } from "./lib";
import { Card, ColHead } from "./scenes-gather";

/* ===== unhappy cases on screen: the recovery bar, the incident card, each stage's contract, the team and the scenarios ===== */

/* ---------- the recovery bar, as the FE's run workspace draws it under the stage track ---------- */
export const BAR_TONE: Record<string, { tile: string; strip: string }> = {
  sky: { tile: "bg-sky-500/15 text-sky-700 dark:text-sky-300", strip: "bg-sky-500/6" },
  amber: { tile: "bg-amber-500/15 text-amber-700 dark:text-amber-300", strip: "bg-amber-500/7" },
  rose: { tile: "bg-rose-500/12 text-rose-700 dark:text-rose-300", strip: "bg-rose-500/6" },
};
export function Bar({
  icon,
  tone,
  orb,
  title,
  text,
  meta,
  children,
}: {
  icon: string;
  tone: string;
  /** An agent is working on it: its orb stands in for the icon. */
  orb?: boolean;
  title: string;
  text: ReactNode;
  meta?: string;
  children?: ReactNode;
}) {
  const r = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (!r.current || !canEnter()) return;
    r.current.animate(
      [
        { height: "0px", opacity: 0 },
        { height: `${r.current.scrollHeight}px`, opacity: 1 },
      ],
      {
        duration: 350,
        easing: EASE,
      },
    );
  }, []);
  return (
    <section ref={r} role="status" className={cn("overflow-hidden border-b", BAR_TONE[tone].strip)}>
      <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center md:px-8">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {orb ? (
            <WorkOrb state="connecting" size={32} className="size-9" />
          ) : (
            <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", BAR_TONE[tone].tile)}>
              <Icon n={icon} className="size-[18px]" />
            </span>
          )}
          <span className="flex min-w-0 flex-col gap-0.5">
            <b className="font-semibold text-sm">{title}</b>
            <span className="text-pretty text-muted-foreground text-xs leading-snug">{text}</span>
            {meta && <span className="text-[11px] text-muted-foreground tabular-nums">{meta}</span>}
          </span>
        </div>
        {children && <div className="flex shrink-0 flex-wrap items-center gap-2 max-sm:justify-end">{children}</div>}
      </div>
    </section>
  );
}
export function RecoveryBar() {
  const [busy, setBusy] = useState(false);
  if (S.inc) {
    const d = INC[S.inc.key];
    const code = SCN[S.inc.key]?.code;
    return (
      <Bar
        key={`inc-${S.inc.key}`}
        icon={d.tone === "rose" ? "ban" : "alert"}
        tone={d.tone}
        title={d.title}
        text={d.text}
        meta={`${code ? `Unhappy case ${code} · ` : ""}found by ${AGENTS[d.det[0]].name}${isCode(d.det[0]) ? ", no AI" : ""} · rule: ${d.det[1]}`}
      >
        {[...d.opts]
          .sort((a, b) => a[3] - b[3])
          .map((o) => (
            <Button
              key={o[0]}
              type="button"
              variant={o[3] ? "default" : "outline"}
              size="sm"
              title={o[2]}
              onClick={() => settle("incident", o[0])}
            >
              {o[3] ? <Icon n="arrow" /> : null}
              {o[1]}
            </Button>
          ))}
      </Bar>
    );
  }
  if (S.lifecycle === "failed")
    return (
      <Bar
        key="failed"
        icon="ban"
        tone="rose"
        title="The run stopped"
        text={S.failure}
        meta="Nothing after this stage happens. What finished stays on record."
      >
        {S.scn !== "happy" && (
          <Button type="button" variant="outline" size="sm" onClick={() => playScenario("happy", false)}>
            Back to the happy path
          </Button>
        )}
        <Button type="button" size="sm" onClick={restart}>
          <Icon n="rotate" />
          Start over
        </Button>
      </Bar>
    );
  if (S.lifecycle === "blocked" && S.blocked)
    return (
      <Bar key="held" icon="lock" tone="amber" title="Held for you" text={S.blocked.why}>
        <Button type="button" size="sm" onClick={() => settle("resume")}>
          {S.blocked.button}
        </Button>
      </Bar>
    );
  if (S.jr.waiting)
    return (
      <Bar
        key="wait"
        icon="rotate"
        orb
        tone="sky"
        title="Waiting for the journal profile"
        text="S08 needs JFE-IRJ-v2, so the profile run is building it now. The claims are already frozen; the journal step goes on once it is published."
        meta={`Profile run at ${J.stage} · ${JSTAGE[J.stage].name}`}
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await jPublishNow();
            setBusy(false);
          }}
        >
          Skip ahead
        </Button>
        <Button type="button" size="sm" onClick={() => setTrack("jfe")}>
          Watch it
          <Icon n="arrow" />
        </Button>
      </Bar>
    );
  return null;
}

/* ---------- the strip that says which scenario is playing ---------- */
export function ScenarioStrip() {
  if (S.scn === "happy") return null;
  const c = SCN[S.scn];
  const k = CASE_KIND[c.kind];
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b bg-muted/40 px-4 py-2 text-xs md:px-8">
      <Badge className="font-mono">{c.code}</Badge>
      <b className="font-semibold">Unhappy case · {c.t}</b>
      <Badge className={k.c}>
        <Icon n={k.icon} className="size-3" />
        {k.label}
      </Badge>
      <span className="text-muted-foreground max-md:hidden">
        Breaks at {c.stage} · {STAGE[c.stage].short}
      </span>
      <span className="ml-auto flex gap-1.5">
        <Button type="button" variant="ghost" size="xs" onClick={() => playScenario(S.scn, false)}>
          Play from the start
        </Button>
        <Button type="button" variant="outline" size="xs" onClick={() => playScenario("happy", false)}>
          Back to the happy path
        </Button>
      </span>
    </div>
  );
}

/* ---------- the incident, in the scene where it happened ---------- */
/** Where a case sends the run: back to an earlier stage, round the same stage again, or nowhere. */
function RouteStage({ id, to }: { id: string; to?: boolean }) {
  return (
    <span
      className={cn(
        "flex h-[42px] flex-col items-center justify-center rounded-lg ring-[1.5px]",
        to ? "bg-primary text-primary-foreground ring-primary" : "bg-card ring-rose-500",
      )}
    >
      <b className="font-mono font-semibold text-[12px] leading-tight">{id}</b>
      <span className={cn("text-[9.5px] leading-tight", to ? "text-primary-foreground/70" : "text-muted-foreground")}>
        {STAGE[id].short}
      </span>
    </span>
  );
}
export function RouteDiagram({ route }: { route: [string, string | null, string] }) {
  const [from, to, label] = route;
  const again = to === from;
  const note = again
    ? ["Fixed, then", "checked again here"]
    : [label.split(" ").slice(0, 3).join(" "), label.split(" ").slice(3).join(" ")];
  const nodes: BoxNode[] = [
    {
      id: "from",
      type: "box",
      position: { x: 0, y: 0 },
      width: 92,
      data: { w: 92, content: <RouteStage id={from} /> },
    },
    to
      ? {
          id: "to",
          type: "box",
          position: { x: 190, y: 0 },
          width: 92,
          data: { w: 92, content: <RouteStage id={to} to /> },
        }
      : {
          id: "to",
          type: "box",
          position: { x: 150, y: 6 },
          width: 140,
          data: {
            w: 140,
            content: (
              <span className="flex flex-col text-[10.5px] leading-tight">
                <b className="font-medium">{note[0]}</b>
                <span className="text-muted-foreground">{note[1]}</span>
              </span>
            ),
          },
        },
  ];
  const edges: LinkEdge[] = [
    {
      id: "route",
      type: "link",
      source: "from",
      target: "to",
      sourceHandle: "rs",
      targetHandle: "lt",
      data: to
        ? { stroke: "stroke-foreground", fill: "fill-foreground", width: 1.8, label: again ? "again" : undefined }
        : { stroke: "stroke-foreground/40", fill: "fill-foreground/40", dash: "3 4", width: 1.5, plain: true },
    },
  ];
  return (
    <Diagram
      label={label}
      nodes={nodes}
      edges={edges}
      nodeTypes={BOX_TYPES}
      fitKey={`${from}-${to}`}
      still
      className="h-[74px] w-full max-w-[300px] bg-transparent ring-0"
    />
  );
}
export function IncidentCard({ inc, resolved }: { inc: { key: string; opt?: string }; resolved?: boolean }) {
  const d = INC[inc.key];
  const code = SCN[inc.key]?.code;
  const kind = CASE_KIND[SCN[inc.key]?.kind ?? "block"];
  const chosen = d.opts.find((o) => o[0] === inc.opt) ?? d.opts[0];
  if (resolved)
    return (
      <M
        in="fade"
        className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2.5 rounded-xl bg-muted/50 px-3.5 py-2.5 text-sm ring-1 ring-foreground/10"
      >
        <span className="grid size-6 place-items-center rounded-full bg-emerald-500/12 text-emerald-700 dark:text-emerald-300">
          <Icon n="check" className="size-3.5" />
        </span>
        <span className="min-w-0">
          <b className="font-semibold">
            Unhappy case {code} handled · {d.title}
          </b>
          <span className="block text-[12.5px] text-muted-foreground">
            You chose: <b className="font-medium text-foreground">{chosen[1]}</b>. {chosen[2]}
          </span>
        </span>
      </M>
    );
  return (
    <M
      as="section"
      in="card"
      data-incident
      className={cn(
        "overflow-hidden rounded-xl bg-card ring-2",
        d.tone === "rose" ? "ring-rose-500/50" : "ring-amber-500/50",
      )}
    >
      <header
        className={cn(
          "flex flex-wrap items-center gap-2 border-b px-4 py-2.5",
          d.tone === "rose" ? "bg-rose-500/[0.06]" : "bg-amber-500/[0.07]",
        )}
      >
        <Badge className="font-mono">{code ?? "!"}</Badge>
        <b className="font-semibold text-sm">Unhappy case</b>
        <Badge className={kind.c}>
          <Icon n={kind.icon} className="size-3" />
          {kind.label}
        </Badge>
        <Badge variant="outline" className="ml-auto">
          <PulseDot className={d.tone === "rose" ? "bg-rose-500" : "bg-amber-500"} />
          The run waits for you
        </Badge>
      </header>
      <div className="flex flex-col gap-4 p-4">
        <div>
          <h3 className="text-balance font-semibold text-[17px] tracking-tight">{d.title}</h3>
          <p className="mt-1 max-w-[70ch] text-[13.5px] text-muted-foreground">{d.text}</p>
        </div>
        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="font-medium text-[11px] text-muted-foreground uppercase tracking-wide">
              What was found · {d.ev.file}
            </span>
            <pre className="overflow-x-auto rounded-lg bg-muted/70 py-1.5 font-mono text-[11.5px] leading-relaxed">
              {d.ev.lines.map((line, i) => (
                <span
                  // biome-ignore lint/suspicious/noArrayIndexKey: a fixed list that never reorders
                  key={i}
                  className={cn(
                    "block px-3",
                    d.ev.hit.includes(i) && "hit-in bg-rose-500/15 text-rose-800 dark:text-rose-200",
                  )}
                  style={{ animationDelay: `${0.25 + i * 0.12}s` }}
                >
                  {line}
                </span>
              ))}
            </pre>
            {d.ev.note && <span className="text-[11.5px] text-muted-foreground">{d.ev.note}</span>}
          </div>
          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex items-start gap-2.5">
              <AgentAvatar a={d.det[0]} />
              <span className="min-w-0 text-[12.5px]">
                <b className={cn("font-semibold", AGENTS[d.det[0]].text)}>
                  {AGENTS[d.det[0]].name}
                  {isCode(d.det[0]) ? " · no AI" : ""}
                </b>
                <span className="block text-muted-foreground">
                  found it under the rule <b className="font-medium text-foreground">{d.det[1]}</b>
                </span>
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-medium text-[11px] text-muted-foreground uppercase tracking-wide">
                What ASW does
              </span>
              <ul className="flex flex-col gap-1 text-[12.5px]">
                {d.does.map((x, i) => (
                  <M
                    as="li"
                    // biome-ignore lint/suspicious/noArrayIndexKey: a fixed list that never reorders
                    key={i}
                    in="x"
                    delay={0.15 + i * 0.08}
                    className="grid grid-cols-[14px_minmax(0,1fr)] gap-2"
                  >
                    <Icon n="right" className="mt-0.5 size-3.5 text-muted-foreground" />
                    {x}
                  </M>
                ))}
              </ul>
            </div>
            <RouteDiagram route={d.route} />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <span className="font-medium text-[11px] text-muted-foreground uppercase tracking-wide">Ways out</span>
          <div className="grid gap-2 md:grid-cols-2">
            {d.opts.map((o) => (
              <button
                key={o[0]}
                type="button"
                onClick={() => settle("incident", o[0])}
                className={cn(
                  "group flex flex-col gap-1 rounded-xl border px-3.5 py-3 text-left transition-[background-color,border-color,box-shadow] hover:bg-muted/60",
                  o[3] && "border-foreground/40",
                )}
              >
                <span className="flex flex-wrap items-center gap-2 font-semibold text-sm">
                  {o[1]}
                  {o[3] ? <Badge variant="secondary">Orchestrator recommends</Badge> : ""}
                </span>
                <span className="flex items-start gap-1.5 text-muted-foreground text-xs">
                  <Icon n="arrow" className="mt-0.5 size-3" />
                  {o[2]}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </M>
  );
}
export function ScreenIncidents({ scr }: { scr: ScreenDef }) {
  const open = S.inc && scr.stages.includes(S.inc.sid) ? S.inc : null;
  const done = S.incs.filter((x) => scr.stages.includes(x.sid));
  if (!open && !done.length) return null;
  return (
    <div className="flex flex-col gap-2.5">
      {done.map((x) => (
        <IncidentCard key={x.key} inc={x} resolved={true} />
      ))}
      {open && <IncidentCard key={open.key} inc={open} />}
    </div>
  );
}

/* ---------- each stage's contract: inputs, process, outputs, the happy path and every unhappy case ---------- */
export function LevelChip({ lv }: { lv: string }) {
  return <Badge className={LEVEL_TONE[lv]}>{lv}</Badge>;
}
export function CaseRow({ c }: { c: CaseDef }) {
  const k = CASE_KIND[c.kind];
  const playable = DEV && c.play && c.play !== "happy";
  return (
    <li className="grid gap-x-4 gap-y-2 border-t px-3.5 py-3 first:border-t-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_auto]">
      <div className="flex min-w-0 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-1.5">
          <Badge className={k.c}>
            <Icon n={k.icon} className="size-3" />
            {k.label}
          </Badge>
          {c.play && playable && <Badge className="h-4 px-1.5 font-mono text-[10px]">{SCN[c.play].code}</Badge>}
        </span>
        <b className="font-semibold text-[13px] leading-snug">{c.t}</b>
        <span className="text-[12px] text-muted-foreground leading-snug">
          <b className="font-medium text-foreground/80">When</b> {c.trig}
        </span>
      </div>
      <dl className="grid min-w-0 grid-cols-[62px_minmax(0,1fr)] gap-x-2 gap-y-1 text-[12px]">
        <dt className="text-muted-foreground">Found by</dt>
        <dd className="flex items-center gap-1.5">
          <AgentAvatar a={c.det[0]} size="sm" />
          <span className="min-w-0">
            <span className="font-medium">{AGENTS[c.det[0]].name}</span>
            <span className="text-muted-foreground"> · {c.det[1]}</span>
          </span>
        </dd>
        <dt className="text-muted-foreground">ASW</dt>
        <dd>{c.resp}</dd>
        <dt className="text-muted-foreground">Route</dt>
        <dd className="font-mono text-[11.5px]">{c.route}</dd>
        <dt className="text-muted-foreground">Ends</dt>
        <dd>{c.exit}</dd>
      </dl>
      <div className="flex items-start lg:justify-end">
        {playable ? (
          <Button type="button" variant="outline" size="sm" onClick={() => c.play && playScenario(c.play)}>
            <Icon n="play" />
            Play it
          </Button>
        ) : c.play === "happy" ? (
          <span className="inline-flex h-7 items-center gap-1.5 rounded-md bg-emerald-500/10 px-2 font-medium text-[11.5px] text-emerald-800 dark:text-emerald-300">
            <Icon n="check" className="size-3" />
            In the happy path
          </span>
        ) : (
          <span className="inline-flex h-7 items-center rounded-md px-2 text-[11.5px] text-muted-foreground ring-1 ring-foreground/10">
            Described only
          </span>
        )}
      </div>
    </li>
  );
}
export function StageContract({ sid }: { sid: string }) {
  const def = STAGE[sid];
  const cs = CASES[sid];
  const unhappy = cs.cases.length;
  return (
    <section className="flex flex-col gap-3">
      <h3 className="flex flex-wrap items-baseline gap-2 font-semibold text-[15px] tracking-tight">
        <span className="font-medium font-mono text-[12px] text-muted-foreground">{sid}</span>
        {def.name}
      </h3>
      <div className="grid min-w-0 gap-3 lg:grid-cols-3">
        <Pane title="Input" aside="level">
          <ul className="flex flex-col gap-1.5 text-[12.5px]">
            {cs.in.map(([x, lv]) => (
              <li key={x} className="flex items-start justify-between gap-2">
                <span>{x}</span>
                <LevelChip lv={lv} />
              </li>
            ))}
          </ul>
          <p className="mt-2.5 border-t pt-2 text-[11.5px] text-muted-foreground">
            <b className="font-medium text-foreground/80">Starts when</b> {cs.pre}
          </p>
        </Pane>
        <Pane title="Process" aside={`${def.steps.filter((s) => !s.gate && !s.check).length} steps`}>
          <p className="text-[12.5px] leading-relaxed">{def.ipo.proc}.</p>
          <p className="mt-2.5 border-t pt-2 text-[11.5px] text-muted-foreground">
            <b className="font-medium text-foreground/80">You</b> {def.ipo.hu}
          </p>
        </Pane>
        <Pane title="Output" aside="files">
          <ul className="flex flex-wrap gap-1.5">
            {def.outs.map((f) => (
              <li key={f} className="inline-flex h-6 items-center gap-1 rounded-md border px-2 font-mono text-[11px]">
                <Icon n="file" className="size-3 text-muted-foreground" />
                {f}
              </li>
            ))}
          </ul>
          <p className="mt-2.5 border-t pt-2 text-[11.5px] text-muted-foreground">
            <b className="font-medium text-foreground/80">Needs</b> {def.ipo.needs}
          </p>
        </Pane>
      </div>
      <Card>
        <ColHead icon="check" title="Happy path" aside={`${def.steps.length} steps`} />
        <ol className="grid gap-x-6 px-3.5 py-3 md:grid-cols-2">
          {def.steps.map((s, i) => (
            <li key={s.id} className="grid grid-cols-[22px_minmax(0,1fr)] gap-2 py-1 text-[12.5px]">
              <span
                className={cn(
                  "mt-px grid size-[18px] place-items-center rounded-full font-mono font-semibold text-[9.5px]",
                  s.gate || s.check
                    ? "bg-amber-500/15 text-amber-800 dark:text-amber-300"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {s.gate || s.check ? <Icon n="flag" className="size-2.5" /> : i + 1}
              </span>
              <span>
                <b className="font-medium">{s.t}</b>
                {s.x ? (
                  <span className="block text-[11.5px] text-muted-foreground leading-snug">{s.x}</span>
                ) : (
                  <span className="block text-[11.5px] text-amber-700 dark:text-amber-300">
                    {s.gate ? `Stop ${STOP_NO[s.id]} · you decide` : "Quick check · you decide"}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ol>
      </Card>
      <Card>
        <ColHead
          icon="alert"
          title="Unhappy cases"
          aside={DEV ? `${unhappy} · ${cs.cases.filter((c) => c.play && c.play !== "happy").length} playable` : unhappy}
        />
        <ul>
          {cs.cases.map((c) => (
            <CaseRow key={c.t} c={c} />
          ))}
        </ul>
      </Card>
    </section>
  );
}
export function ContractView({ scr }: { scr: ScreenDef }) {
  return (
    <div className="flex flex-col gap-6">
      {scr.stages.map((sid) => (
        <StageContract key={sid} sid={sid} />
      ))}
    </div>
  );
}
export function ScreenTabs({ scr }: { scr: ScreenDef }) {
  const n = scr.stages.reduce((s, id) => s + CASES[id].cases.length, 0);
  const tab = S.tab;
  const set = (t: string) => {
    S.tab = t;
    quiet();
    emit();
  };
  return (
    <Tabs value={tab} onValueChange={set} className="-mt-2">
      <TabsList variant="line" aria-label="View" className="w-full justify-start border-b">
        <TabsTrigger value="run" className="flex-none">
          The run
        </TabsTrigger>
        <TabsTrigger value="contract" className="flex-none">
          Contract and cases
          <Badge variant="secondary" className="font-mono">
            {n}
          </Badge>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

/* ---------- a large dialog over the workspace: the team, the scenarios ---------- */
export function StudioDialog({
  title,
  sub,
  onClose,
  children,
  wide,
}: {
  title: string;
  sub?: string;
  onClose(): void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn(
          "flex max-h-[calc(100dvh-1.5rem)] flex-col gap-0 overflow-hidden p-0",
          wide ? "sm:max-w-[1080px]" : "sm:max-w-[760px]",
        )}
      >
        <DialogHeader className="border-b px-5 py-3.5 pr-12">
          <DialogTitle className="text-lg tracking-tight">{title}</DialogTitle>
          {sub && <DialogDescription>{sub}</DialogDescription>}
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- the team ---------- */
export const openSheet = (k: string | null) => {
  UI.sheet = k;
  emit();
};
export function AgentsSheet() {
  const [tab, setTab] = useState("team");
  return (
    <StudioDialog
      wide
      title={`${ROSTER_COUNT} agents and a code check`}
      sub="Who works on the manuscript, what each reads and writes, and what each may never do. Six more build the journal profile when the manuscript reaches S08."
      onClose={() => openSheet(null)}
    >
      <Tabs value={tab} onValueChange={setTab} className="mb-4">
        <TabsList variant="line" className="w-full justify-start border-b">
          <TabsTrigger value="team" className="flex-none">
            The team
          </TabsTrigger>
          <TabsTrigger value="debate" className="flex-none">
            How the debate works
          </TabsTrigger>
        </TabsList>
      </Tabs>
      {tab === "team" ? (
        <div className="flex flex-col gap-6">
          {ROSTER.map((b, bi) => (
            <section key={b.block} className="flex flex-col gap-2.5">
              <h3 className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground uppercase tracking-wider">
                {b.block}
                <i className="h-px flex-1 bg-border" />
                <span className="normal-case tracking-normal">
                  {BLOCKS[bi].from}–{BLOCKS[bi].to}
                </span>
              </h3>
              <div className="grid gap-2.5 md:grid-cols-2">
                {b.agents.map(([a, what, reads, writes, never], i) => (
                  <M
                    key={a}
                    in="up4"
                    delay={i * 0.03}
                    className="flex flex-col gap-2 rounded-xl bg-card px-3.5 py-3 ring-1 ring-foreground/10"
                  >
                    <span className="flex items-center gap-2.5">
                      <AgentAvatar a={a} />
                      <b className={cn("font-semibold text-[14px]", AGENTS[a].text)}>{AGENTS[a].name}</b>
                      {isCode(a) && <Badge variant="secondary">no AI</Badge>}
                    </span>
                    <p className="text-[12.5px] leading-snug">{what}</p>
                    <dl className="grid grid-cols-[56px_minmax(0,1fr)] gap-x-2 gap-y-1 border-t pt-2 text-[11.5px]">
                      <dt className="text-muted-foreground">Reads</dt>
                      <dd>{reads}</dd>
                      <dt className="text-muted-foreground">Writes</dt>
                      <dd>{writes}</dd>
                      <dt className="text-rose-700 dark:text-rose-300">Never</dt>
                      <dd>{never}</dd>
                    </dl>
                  </M>
                ))}
              </div>
            </section>
          ))}
          <section className="flex flex-col gap-2.5">
            <h3 className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground uppercase tracking-wider">
              In parallel · JFE-IRJ-v2
              <i className="h-px flex-1 bg-border" />
            </h3>
            <div className="flex flex-wrap gap-2">
              {JTEAM.map((a) => (
                <span
                  key={a}
                  className="inline-flex h-8 items-center gap-2 rounded-full bg-card py-1 pr-3 pl-1 text-[12.5px] ring-1 ring-foreground/10"
                >
                  <AgentAvatar a={a} size="sm" className="size-6" />
                  <span className="font-medium">{AGENTS[a].name}</span>
                </span>
              ))}
            </div>
            <p className="text-[12px] text-muted-foreground">
              They build the journal profile from the journal’s own papers. ASW reads it once, at S08.
            </p>
          </section>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <section className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Pane title="Who argues">
              <ul className="flex flex-col gap-2 text-[12.5px]">
                {["aa", "qm", "qs", "qx", "ql", "jd"].map((a) => (
                  <li key={a} className="grid grid-cols-[28px_minmax(0,1fr)] gap-2">
                    <AgentAvatar a={a} size="sm" className="size-6" />
                    <span>
                      <b className="font-medium">{AGENTS[a].name}</b>
                      <span className="block text-muted-foreground leading-snug">
                        {ROSTER[1].agents.find((x) => x[0] === a)?.[1]}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </Pane>
            <Pane title="The rules">
              <ul className="flex flex-col gap-2 text-[12.5px]">
                {DEBATE_RULES.map(([k, v]) => (
                  <li key={k}>
                    <b className="font-medium">{k}.</b> <span className="text-muted-foreground">{v}</span>
                  </li>
                ))}
              </ul>
            </Pane>
          </section>
          <Pane title="What a challenge may rest on">
            <div className="grid gap-2 sm:grid-cols-2">
              {Object.entries(GROUND)
                .filter(([k]) => k !== "none")
                .map(([k, v]) => (
                  <span key={k} className="flex items-start gap-2 text-[12.5px]">
                    <Badge className={cn("shrink-0", v.c)}>
                      <Icon n={v.icon} className="size-3" />
                      {v.n}
                    </Badge>
                    <span className="text-muted-foreground">{GROUND_WHAT[k]}</span>
                  </span>
                ))}
            </div>
          </Pane>
          <Pane title="The schemes and their critical questions">
            <div className="grid gap-3 md:grid-cols-2">
              {Object.entries(SCHEMES).map(([k, sch]) => (
                <div key={k} className="flex flex-col gap-1">
                  <b className="font-semibold text-[13px]">{sch.n}</b>
                  <span className="text-[11.5px] text-muted-foreground italic">
                    {sch.form} · {sch.src}
                  </span>
                  <ul className="mt-1 flex flex-col gap-0.5 text-[12px]">
                    {sch.cqs.map(([id, qq]) => (
                      <li key={id} className="grid grid-cols-[24px_minmax(0,1fr)]">
                        <span className="font-mono text-[10.5px] text-muted-foreground">{id}</span>
                        {qq}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Pane>
          <Pane title="From a ruling to the diagrams">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-[12px]">
                <thead>
                  <tr className="border-b text-[10.5px] text-muted-foreground uppercase tracking-wide">
                    <th className="py-1.5 pr-3 font-medium">Ruling</th>
                    <th className="py-1.5 pr-3 font-medium">Toulmin</th>
                    <th className="py-1.5 pr-3 font-medium">AIF</th>
                    <th className="py-1.5 font-medium">ASPIC+</th>
                  </tr>
                </thead>
                <tbody>
                  {RULING_ORDER.map((r) => (
                    <tr key={r} className="border-b last:border-b-0">
                      <td className="py-2 pr-3">
                        <Badge className={RULING[r].c}>{RULING[r].label}</Badge>
                      </td>
                      <td className="py-2 pr-3">{RULING[r].tou}</td>
                      <td className="py-2 pr-3">{RULING[r].aif}</td>
                      <td className="py-2">{RULING[r].asp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Pane>
        </div>
      )}
    </StudioDialog>
  );
}

/* what each kind of ground is, in the words of the debate rules */
const GROUND_WHAT: Record<string, string> = {
  cq: "A critical question of the claim’s scheme (Walton et al., 2008)",
  led: "A number or quote in the evidence ledger, with its file and line",
  rep: "A field of the standard data report",
  std: "An item of AsPredicted, the NeurIPS or ACL checklists, CONSORT or PRISMA",
  src: "A paper or file in the package; nothing from outside",
};

/* ---------- the scenarios ---------- */
export function ScenarioSheet() {
  const total = Object.values(CASES).reduce((n, c) => n + c.cases.length, 0);
  const happyShown = Object.values(CASES).reduce((n, c) => n + c.cases.filter((x) => x.play === "happy").length, 0);
  return (
    <StudioDialog
      title="Play a scenario"
      sub={`The happy path, or one thing wrong. ${total} cases are written into the stage contracts: ${happyShown} happen inside the happy path, ${SCN_ORDER.length} can be played on their own.`}
      onClose={() => openSheet(null)}
    >
      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={() => {
            openSheet(null);
            playScenario("happy", false);
          }}
          className={cn(
            "flex items-start gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors hover:bg-muted/60",
            S.scn === "happy" && "border-foreground ring-1 ring-foreground",
          )}
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-500/12 text-emerald-700 dark:text-emerald-300">
            <Icon n="check" className="size-[18px]" />
          </span>
          <span className="min-w-0 flex-1">
            <b className="block font-semibold text-sm">Happy path{S.scn === "happy" ? " · playing" : ""}</b>
            <span className="text-[12.5px] text-muted-foreground">
              The record is sound. What goes wrong is caught and handled inside the run: a fake DOI, an ungrounded
              challenge, a made-up number, a deadlock, an undercut answered from the traces, a new claim rolled back, a
              style edit reverted.
            </span>
          </span>
        </button>
        {BLOCKS.map((b) => {
          const list = SCN_ORDER.filter((k) => SCN[k].stage >= b.from && SCN[k].stage <= b.to);
          if (!list.length) return null;
          return (
            <section key={b.k} className="flex flex-col gap-2">
              <h3 className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground uppercase tracking-wider">
                {b.n}
                <i className="h-px flex-1 bg-border" />
              </h3>
              {list.map((k) => {
                const c = SCN[k];
                const kind = CASE_KIND[c.kind];
                const on = S.scn === k;
                return (
                  <div
                    key={k}
                    className={cn(
                      "grid gap-x-3 gap-y-2 rounded-xl border px-4 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center",
                      on && "border-foreground ring-1 ring-foreground",
                    )}
                  >
                    <span className="inline-flex h-6 w-fit items-center rounded-md bg-foreground px-1.5 font-bold font-mono text-[11px] text-background">
                      {c.code}
                    </span>
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <b className="font-semibold text-sm">{c.t}</b>
                        <Badge className={kind.c}>
                          <Icon n={kind.icon} className="size-3" />
                          {kind.label}
                        </Badge>
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {c.stage} · {STAGE[c.stage].short}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-[12.5px] text-muted-foreground leading-snug">{c.x}</span>
                    </span>
                    <span className="flex gap-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          openSheet(null);
                          playScenario(k, false);
                        }}
                      >
                        From the start
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          openSheet(null);
                          playScenario(k);
                        }}
                      >
                        <Icon n="play" />
                        Skip to it
                      </Button>
                    </span>
                  </div>
                );
              })}
            </section>
          );
        })}
      </div>
    </StudioDialog>
  );
}
