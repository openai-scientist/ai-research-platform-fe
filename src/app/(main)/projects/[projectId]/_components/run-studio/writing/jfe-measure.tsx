"use client";
"use no memo";

// The writing run keeps its state in module variables (engine.ts) and re-renders on emit(); the React Compiler
// would memoise these components on their props and never show a change.

import { Fragment, type ReactNode, useRef } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { Placeholder } from "../scenes/scene-ui";
import {
  JALPHA,
  JARCH,
  JCONFOUND,
  JDIFF,
  JDISPUTE,
  JEVIDENCE,
  JFAMILY,
  JFOREST,
  JHABITS_OUT,
  JHEAT,
  JINTRO,
  JLIMITS,
  JMEASURE_ORDER,
  JMOVE,
  JPARA_C,
  JPARA_T,
  JPROFILE_HASH,
  JPROHIBIT,
  JRECIPES,
  JRULES_OUT,
  REGISTRY,
} from "./data/jfe";
import { J, S, setTrack } from "./engine";
import { AgentCursor, CountUp, canEnter, cn, Icon, M, Pane } from "./lib";
import { RailSection } from "./paper";
import { Card, ColHead, Slot, SourceBadge, StatusBadge, TABLE_PAD } from "./scenes-gather";

/* ===== JFE scenes, part 2: annotation (J3), statistics (J4), the profile (J5) ===== */

/* ---------- J3 · labels, agreement, the registry ---------- */
export function MoveBadge({ m }: { m: string }) {
  return (
    <Badge className={JMOVE[m].chip}>
      {m} · {JMOVE[m].n}
    </Badge>
  );
}
/* One paragraph pair, sentence by sentence: the first label with its function and confidence, then the blind second. */
function LabelTable({ live }: { live: boolean }) {
  const an = J.an;
  const st = J.st.J3;
  const now = live && st.status === "running" ? (st.cur === "r1" ? an.a - 1 : st.cur === "r2" ? an.b - 1 : -1) : -1;
  return (
    <Card className="@container">
      <ColHead
        icon="quote"
        title="P-0137 · Introduction, paragraphs 1–2"
        aside="One of 308 papers, labelled sentence by sentence"
      />
      <Table className="table-fixed">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-12 pl-4">#</TableHead>
            <TableHead>Sentence</TableHead>
            <TableHead className="w-44 @max-xl:w-36">Annotator</TableHead>
            <TableHead className="w-40 pr-4 @max-2xl:hidden">Second, blind</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {JINTRO.map(([text, m, fn, conf, m2], i) => {
            const second = (
              <span className="flex items-center gap-1.5">
                <MoveBadge m={m2} />
                {i < an.a &&
                  (m2 === m ? (
                    <Icon n="circleCheck" className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Icon n="x" className="size-3.5 text-rose-600" />
                  ))}
              </span>
            );
            return (
              <TableRow key={text} data-state={i === now ? "selected" : undefined} className="duration-300">
                <TableCell className={cn(TABLE_PAD, "font-mono text-muted-foreground text-xs leading-5")}>
                  s{i + 1}
                </TableCell>
                <TableCell className={cn(TABLE_PAD, "leading-5")}>{text}</TableCell>
                <TableCell className={TABLE_PAD} data-cursor={`s:${i}`}>
                  <Slot on={i < an.a} w="w-20">
                    <MoveBadge m={m} />
                    <span className="mt-1 block text-muted-foreground text-xs">
                      {fn} · {conf.toFixed(2)}
                    </span>
                  </Slot>
                  <span className="mt-2 block @2xl:hidden" data-cursor={`b:${i}`}>
                    <span className="mb-1 block text-muted-foreground text-xs">Second, blind</span>
                    <Slot on={i < an.b} w="w-16">
                      {second}
                    </Slot>
                  </span>
                </TableCell>
                <TableCell className={cn(TABLE_PAD, "@max-2xl:hidden")} data-cursor={`b:${i}`}>
                  <Slot on={i < an.b} w="w-16">
                    {second}
                  </Slot>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {an.b === JINTRO.length && (
        <M as="p" in="fade" className="border-t px-4 py-2.5 text-muted-foreground text-xs">
          6 of 6 agree here. The second annotator never sees the first labels.
        </M>
      )}
    </Card>
  );
}
/** How far a move's agreement reaches, against the floor below which it cannot be used and the target. */
const ALPHA_STATE = (v: number): [string, string] =>
  v < 0.67 ? ["bad", "Below the floor"] : v < 0.8 ? ["warn", "Usable"] : ["ok", "Above target"];
function AlphaCard() {
  const an = J.an;
  const pos = (v: number) => `${((v - 0.4) / 0.6) * 100}%`;
  return (
    <Card data-alpha className="@container">
      <ColHead
        title="Agreement between the two annotators"
        icon="users"
        aside={an.alpha ? "Krippendorff's α · 400 spans" : "Below 0.67 a move cannot be used"}
      />
      <Table className="table-fixed" data-cursor="alpha">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-4">Move</TableHead>
            <TableHead className="w-28 @max-xl:hidden">Section</TableHead>
            <TableHead className="w-48 @max-lg:w-24">α</TableHead>
            <TableHead className="w-36 pr-4 @max-md:hidden">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {JALPHA.map(([sec, mv, a, after], i) => {
            const on = i < an.alpha;
            const v = after && an.relabel ? after : a;
            const [k, label] = ALPHA_STATE(v);
            const status = <StatusBadge k={k}>{label}</StatusBadge>;
            return (
              <TableRow key={mv}>
                <TableCell className={TABLE_PAD}>
                  <span className="block font-medium leading-5">{mv}</span>
                  <span className="mt-0.5 block text-muted-foreground text-xs @xl:hidden">{sec}</span>
                  <span className="mt-1.5 block @md:hidden">
                    <Slot on={on} w="w-20">
                      {status}
                    </Slot>
                  </span>
                </TableCell>
                <TableCell className={cn(TABLE_PAD, "text-muted-foreground leading-5 @max-xl:hidden")}>{sec}</TableCell>
                <TableCell className={TABLE_PAD}>
                  <Slot on={on} w="w-3/4">
                    <span className="flex items-center gap-3">
                      <i className="relative h-1.5 flex-1 rounded-full bg-muted @max-lg:hidden">
                        <span
                          className={cn(
                            "absolute inset-y-0 left-0 rounded-full transition-[width,background-color] duration-700",
                            k === "bad" ? "bg-rose-500" : k === "warn" ? "bg-amber-500" : "bg-emerald-500",
                          )}
                          style={{ width: pos(v) }}
                        />
                        <span className="absolute -inset-y-1 w-px bg-foreground/60" style={{ left: pos(0.67) }} />
                      </i>
                      <M as="span" key={v} in="fade" className="w-9 text-right tabular-nums leading-5">
                        {v.toFixed(2)}
                      </M>
                    </span>
                  </Slot>
                </TableCell>
                <TableCell className={cn(TABLE_PAD, "@max-md:hidden")}>
                  <Slot on={on} w="w-20">
                    {status}
                  </Slot>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {an.alpha > 0 && (
        <p className="border-t px-4 py-2.5 text-muted-foreground text-xs">
          The tick marks the 0.67 floor; 0.80 is the target. The bar runs from 0.40 to 1.00.
        </p>
      )}
      {an.disputed && (
        <M in="fade" className="border-t">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 pt-3 text-[13px]">
            <b className="font-semibold">“Compare with prior work”: 58 disputed spans</b>
            <span className="text-muted-foreground text-xs">three of them</span>
            <span className="ml-auto">
              {an.relabel ? (
                <StatusBadge k="ok">Relabelled under guideline v1.3</StatusBadge>
              ) : an.prov ? (
                <StatusBadge k="warn">Kept as provisional</StatusBadge>
              ) : (
                <StatusBadge k="now">Waiting for you</StatusBadge>
              )}
            </span>
          </div>
          <Table className="table-fixed">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Sentence</TableHead>
                <TableHead className="w-28 @max-lg:hidden">Annotator</TableHead>
                <TableHead className="w-28 pr-4 @max-lg:hidden">Second</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {JDISPUTE.map(([t, a, b]) => (
                <TableRow key={t}>
                  <TableCell className={TABLE_PAD}>
                    <span className="block leading-5">{t}</span>
                    <span className="mt-1 block text-muted-foreground text-xs @lg:hidden">
                      {a} · {b}
                    </span>
                    {an.relabel && (
                      <M as="span" in="fade" className="mt-1.5 block">
                        <StatusBadge k="ok">Compare + Interpret</StatusBadge>
                      </M>
                    )}
                  </TableCell>
                  <TableCell className={cn(TABLE_PAD, "leading-5 @max-lg:hidden")}>{a}</TableCell>
                  <TableCell
                    className={cn(
                      TABLE_PAD,
                      "leading-5 @max-lg:hidden",
                      !an.relabel && "text-rose-700 dark:text-rose-300",
                    )}
                  >
                    {b}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </M>
      )}
    </Card>
  );
}
/* Registry v2 by family: what is approved, how far the measuring has come, and how each feature is measured. */
function RegistryTable() {
  const n = J.an.reg;
  const measured = new Set(JMEASURE_ORDER.slice(0, n).map((f) => f[0]));
  const st = J.st.J3;
  const measuring = st.status === "running" && st.cur === "r4";
  return (
    <Card data-registry className="@container">
      <ColHead
        title="Feature registry v2"
        icon="layers"
        aside={n ? `${n} of 64 approved features measured` : "152 candidates · 64 approved"}
      />
      <Table className="table-fixed" data-cursor="registry">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-4">Family</TableHead>
            <TableHead className="w-24 text-right">Approved</TableHead>
            <TableHead className="w-24 text-right">Measured</TableHead>
            <TableHead className="w-20 text-right @max-2xl:hidden">By code</TableHead>
            <TableHead className="w-24 text-right @max-2xl:hidden">By a model</TableHead>
            <TableHead className="w-20 pr-4 text-right @max-2xl:hidden">Both</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {JFAMILY.map(([fam, label]) => {
            const list = REGISTRY.filter((f) => f[0].startsWith(`${fam}_`) && f[3] !== "c");
            const done = list.filter((f) => measured.has(f[0]));
            const by = (h: string) => list.filter((f) => f[2] === h).length;
            const busy = measuring && done.length > 0 && done.length < list.length;
            return (
              <TableRow key={fam} data-state={busy ? "selected" : undefined} className="duration-300">
                <TableCell className={cn(TABLE_PAD, "leading-5")}>{label}</TableCell>
                <TableCell className={cn(TABLE_PAD, "text-right tabular-nums")}>{list.length}</TableCell>
                <TableCell className={cn(TABLE_PAD, "text-right tabular-nums")}>
                  <span className={cn(done.length === list.length ? "text-foreground" : "text-muted-foreground")}>
                    {done.length}
                  </span>
                </TableCell>
                <TableCell className={cn(TABLE_PAD, "text-right text-muted-foreground tabular-nums @max-2xl:hidden")}>
                  {by("d")}
                </TableCell>
                <TableCell className={cn(TABLE_PAD, "text-right text-muted-foreground tabular-nums @max-2xl:hidden")}>
                  {by("l")}
                </TableCell>
                <TableCell className={cn(TABLE_PAD, "text-right text-muted-foreground tabular-nums @max-2xl:hidden")}>
                  {by("h")}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <p className="border-t px-4 py-2.5 text-muted-foreground text-xs">
        Code measures first, then the model. A candidate that was never approved is never scored.
      </p>
    </Card>
  );
}
export function AnnotateScene({ live }: { live: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const an = J.an;
  const st = J.st.J3;
  const WHERE: Record<string, string> = {
    r1: `s:${Math.max(0, an.a - 1)}`,
    r2: `b:${Math.max(0, an.b - 1)}`,
    r3: "alpha",
    JK3: "alpha",
    r4: "registry",
    r5: "trail",
  };
  const WHO: Record<string, string> = { r1: "an", r2: "a2", r3: "or", r4: "code", r5: "code" };
  const target = st.cur ? (WHERE[st.cur] ?? null) : null;
  const agent = st.cur ? (WHO[st.cur] ?? null) : null;
  return (
    <div ref={host} className="relative grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="flex min-w-0 flex-col gap-4">
        <LabelTable live={live} />
        <AlphaCard />
        <RegistryTable />
      </div>
      <aside className="flex min-w-0 flex-col gap-2.5 xl:sticky xl:top-3">
        <RailSection title="What a label says" aside="taxonomy v1.2">
          <ul className="flex flex-col gap-2 text-[12.5px]">
            {[
              ["M1", "Establishes the field: context, importance, prior work."],
              ["M2", "Opens a niche: a limitation, a contradiction, a gap."],
              ["M3", "Occupies it: aims, approach, contributions, outline."],
            ].map(([m, t]) => (
              <li key={m} className="flex flex-col items-start gap-1">
                <MoveBadge m={m} />
                <span className="text-muted-foreground">{t}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-muted-foreground text-xs">
            A move says where a sentence sits in the argument, not whether it is right. A gap can be stated with no
            evidence at all.
          </p>
        </RailSection>
        <RailSection title="One measurement, traced" aside={an.trail ? "INT_10" : ""}>
          <div data-cursor="trail" className="text-[12.5px]">
            {an.trail ? (
              <>
                <div className="mb-2.5 flex items-baseline justify-between gap-2">
                  <span className="text-muted-foreground">Measurements</span>
                  <CountUp value={19712} className="font-semibold text-[18px] tabular-nums" />
                </div>
                <dl className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-2 gap-y-1.5">
                  {[
                    ["Feature", "INT_10 · gap statement position"],
                    ["Paper", "P-0137 · Education Data Journal, 2024"],
                    ["Value", "0.58 of the way through the Introduction"],
                    ["Span", "Paragraph 2, sentence 4 · chars 1,989–2,101"],
                    ["Label", "M2 gap statement · 0.93 · agreed"],
                  ].map(([k, v]) => (
                    <Fragment key={k}>
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="min-w-0 break-words">{v}</dd>
                    </Fragment>
                  ))}
                </dl>
              </>
            ) : (
              <p className="text-muted-foreground">Every value keeps the path back to the words it was measured on.</p>
            )}
          </div>
        </RailSection>
      </aside>
      <AgentCursor
        agent={live && st.status === "running" ? agent : null}
        host={host}
        target={target}
        version={`${an.a}-${an.b}-${an.alpha}-${an.reg}-${an.trail}`}
      />
    </div>
  );
}

/* ---------- J4 · charts ---------- */
export const JSWARM = (() => {
  const X0 = 60;
  const X1 = 220;
  const W = 600;
  const r = 3.1;
  const sx = (v: number) => 16 + ((v - X0) / (X1 - X0)) * (W - 32);
  const place = (vals: number[], cy: number) => {
    const out: { x: number; y: number; v: number }[] = [];
    const sorted = [...vals].sort((a, b) => a - b);
    for (const v of sorted) {
      const x = sx(v);
      for (let k = 0; k < 40; k++) {
        const dy = (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (r * 1.9);
        const y = cy + dy;
        if (!out.some((o) => Math.abs(o.x - x) < r * 2 && Math.abs(o.y - y) < r * 1.9)) {
          out.push({ x, y, v });
          break;
        }
      }
    }
    return out;
  };
  const kde = (vals: number[], cy: number, half: number) => {
    const pts: [number, number][] = [];
    for (let v = X0; v <= X1; v += 2) {
      let d = 0;
      for (const x of vals) d += Math.exp(-0.5 * ((v - x) / 9) ** 2);
      pts.push([sx(v), d]);
    }
    const max = Math.max(...pts.map((p) => p[1]));
    const up = pts.map(([x, d]) => `${x.toFixed(1)},${(cy - (d / max) * half).toFixed(1)}`);
    const down = pts.map(([x, d]) => `${x.toFixed(1)},${(cy + (d / max) * half).toFixed(1)}`).reverse();
    return `M${up.join(" L")} L${down.join(" L")} Z`;
  };
  return {
    W,
    sx,
    r,
    t: place(JPARA_T, 62),
    c: place(JPARA_C, 152),
    vt: kde(JPARA_T, 62, 34),
    vc: kde(JPARA_C, 152, 30),
    ticks: [80, 100, 120, 140, 160, 180, 200],
  };
})();
export function SwarmChart() {
  const az = J.az;
  const still = useRef(!canEnter());
  const S2 = JSWARM;
  const band = (q1: number, q3: number, med: number, cy: number, cls: string) => (
    <g>
      <rect x={S2.sx(q1)} y={cy - 1.5} width={S2.sx(q3) - S2.sx(q1)} height="3" rx="1.5" className={cls} />
      <line
        x1={S2.sx(med)}
        x2={S2.sx(med)}
        y1={cy - 12}
        y2={cy + 12}
        strokeWidth="2.5"
        className="stroke-foreground"
        strokeLinecap="round"
      />
    </g>
  );
  return (
    <div data-cursor="swarm" className={cn("min-w-0", still.current && "still")}>
      <svg
        viewBox="0 0 600 214"
        className="block w-full"
        role="img"
        aria-label="Median paragraph length per paper: Education Data Journal median 132 words, interquartile range 110 to 150; controls median 128."
      >
        {S2.ticks.map((t) => (
          <g key={t}>
            <line x1={S2.sx(t)} x2={S2.sx(t)} y1="14" y2="186" className="stroke-foreground/[0.07]" />
            <text x={S2.sx(t)} y="202" textAnchor="middle" className="fill-muted-foreground font-mono text-[10.5px]">
              {t}
            </text>
          </g>
        ))}
        {az.violin && (
          <>
            <path
              d={S2.vt}
              className="wire-fade fill-sky-500/10 stroke-sky-600/60 dark:stroke-sky-400/60"
              strokeWidth="1.2"
            />
            <path d={S2.vc} className="wire-fade fill-amber-500/10 stroke-amber-600/60" strokeWidth="1.2" />
          </>
        )}
        {az.swarm && (
          <>
            {S2.t.map((d, i) => (
              <circle
                // biome-ignore lint/suspicious/noArrayIndexKey: a fixed list that never reorders
                key={`t${i}`}
                cx={d.x}
                cy={d.y}
                r={S2.r}
                className="jdrop fill-sky-600 dark:fill-sky-400"
                fillOpacity="0.75"
                style={{ animationDelay: `${(d.x / 600) * 900}ms` }}
              />
            ))}
            {S2.c.map((d, i) => (
              <circle
                // biome-ignore lint/suspicious/noArrayIndexKey: a fixed list that never reorders
                key={`c${i}`}
                cx={d.x}
                cy={d.y}
                r={S2.r}
                className="jdrop fill-amber-600 dark:fill-amber-400"
                fillOpacity="0.75"
                style={{ animationDelay: `${300 + (d.x / 600) * 900}ms` }}
              />
            ))}
          </>
        )}
        {az.violin && (
          <>
            {band(110, 150, 132, 62, "fill-sky-900/40 dark:fill-sky-100/50")}
            {band(106, 147, 128, 152, "fill-amber-900/40 dark:fill-amber-100/50")}
          </>
        )}
        <text x="16" y="20" className="fill-foreground font-semibold text-[11.5px]">
          Education Data Journal
        </text>
        <text x="584" y="20" textAnchor="end" className="fill-muted-foreground font-mono text-[10.5px]">
          {az.violin ? "N 212 · median 132 · IQR 110–150" : "N 212"}
        </text>
        <text x="16" y="112" className="fill-foreground font-semibold text-[11.5px]">
          Controls
        </text>
        <text x="584" y="112" textAnchor="end" className="fill-muted-foreground font-mono text-[10.5px]">
          {az.violin ? "N 96 · median 128 · IQR 106–147" : "N 96"}
        </text>
      </svg>
      <p className="mt-1 text-center text-[11px] text-muted-foreground">
        Median words per paragraph, one dot per paper
      </p>
    </div>
  );
}
export function MoveHeat() {
  const az = J.az;
  return (
    <div data-cursor="heat" className="flex min-w-0 flex-col gap-3">
      <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1">
        {JHEAT.map(([m, vals]) => (
          <Fragment key={m}>
            <MoveBadge m={m} />
            <span className="grid grid-cols-10 gap-[3px]">
              {vals.map((v, c) => (
                <span
                  // biome-ignore lint/suspicious/noArrayIndexKey: a fixed list that never reorders
                  key={c}
                  title={`${JMOVE[m].n} in tenth ${c + 1}: ${Math.round(v * 100)}% of papers`}
                  className="relative h-7 overflow-hidden rounded-[3px] bg-foreground/[0.04]"
                >
                  <span
                    className={cn("absolute inset-0 transition-opacity duration-500", JMOVE[m].bar)}
                    style={{ opacity: c < az.heat ? 0.12 + v * 0.88 : 0 }}
                  />
                </span>
              ))}
            </span>
          </Fragment>
        ))}
        <span />
        <span className="flex justify-between text-muted-foreground text-xs">
          <span>start</span>
          <span>middle</span>
          <span>end of the Introduction</span>
        </span>
      </div>
      {az.order ? (
        <M in="fade" className="flex flex-wrap items-center gap-1.5 rounded-lg bg-muted/50 px-3 py-2 text-[13px]">
          {["M1", "M2", "M3"].map((m, i) => (
            <Fragment key={m}>
              <Badge className={JMOVE[m].chip}>{JMOVE[m].n}</Badge>
              {i < 2 && <Icon n="right" className="size-3 text-muted-foreground" />}
            </Fragment>
          ))}
          <b className="ml-auto font-semibold tabular-nums">78%</b>
          <span className="text-muted-foreground">of 212 papers</span>
        </M>
      ) : (
        <p className="text-muted-foreground text-xs">Darker means more papers have that move in that tenth.</p>
      )}
    </div>
  );
}
export function Spark({ t, c }: { t: number[]; c: number[] }) {
  const all = [...t, ...c];
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const pts = (arr: number[]) =>
    arr.map((v, i) => `${4 + i * 22.4},${32 - ((v - lo) / (hi - lo || 1)) * 26}`).join(" ");
  return (
    <svg viewBox="0 0 120 36" className="h-9 w-28 shrink-0" aria-hidden="true">
      <polyline
        points={pts(c)}
        fill="none"
        strokeWidth="1.8"
        className="draw stroke-amber-500"
        style={{ "--len": 160 } as React.CSSProperties}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points={pts(t)}
        fill="none"
        strokeWidth="1.8"
        className="draw stroke-sky-600 dark:stroke-sky-400"
        style={{ "--len": 160 } as React.CSSProperties}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
const VERDICT: Record<string, [string, string]> = {
  distinct: ["ok", "Distinctive"],
  year: ["warn", "Explained by year"],
  same: ["na", "Not different"],
};
/* Each feature against the controls: the medians, Cliff's δ with its interval, and what it comes to. */
function ForestTable({ live }: { live: boolean }) {
  const az = J.az;
  const st = J.st.J4;
  const pos = (v: number) => `${((v + 0.6) / 1.2) * 100}%`;
  const comparing = live && st.status === "running" && st.cur === "s3";
  return (
    <Table className="table-fixed" data-cursor="forest">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="pl-4">Feature</TableHead>
          <TableHead className="w-28 text-right @max-xl:hidden">IR · controls</TableHead>
          <TableHead className="w-56 @max-2xl:w-40">Cliff's δ, −0.6 to +0.6</TableHead>
          <TableHead className="w-40 pr-4 @max-lg:hidden">Reading</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {JFOREST.map(([id, label, t, c, d, lo, hi, kind], i) => {
          const on = i < az.forest;
          const [k, text] = VERDICT[kind];
          const verdict = <StatusBadge k={k}>{text}</StatusBadge>;
          const tone =
            kind === "distinct" ? "bg-emerald-500" : kind === "year" ? "bg-amber-500" : "bg-muted-foreground/60";
          return (
            <TableRow
              key={id}
              data-cursor={`fr:${i}`}
              data-state={comparing && i === az.forest - 1 ? "selected" : undefined}
              className="duration-300"
            >
              <TableCell className={TABLE_PAD}>
                <span className="block leading-5">{label}</span>
                <span className="mt-0.5 block font-mono text-muted-foreground text-xs">{id}</span>
                <span className="mt-1 block text-muted-foreground text-xs @xl:hidden">
                  <Slot on={on} w="w-16">
                    {t} vs {c}
                  </Slot>
                </span>
                <span className="mt-1.5 block @lg:hidden">
                  <Slot on={on} w="w-20">
                    {verdict}
                  </Slot>
                </span>
              </TableCell>
              <TableCell className={cn(TABLE_PAD, "text-right tabular-nums leading-5 @max-xl:hidden")}>
                <Slot on={on} w="ml-auto w-14">
                  {t} · {c}
                </Slot>
              </TableCell>
              <TableCell className={TABLE_PAD}>
                <span className="relative block h-5">
                  <span className="absolute inset-y-0 left-1/2 w-px bg-foreground/25" />
                  {on && (
                    <M as="span" in="fade" dur={400} className="absolute inset-0">
                      <span
                        className={cn("absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full", tone)}
                        style={{ left: pos(lo), width: `calc(${pos(hi)} - ${pos(lo)})` }}
                      />
                      <span
                        className={cn(
                          "absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-card",
                          tone,
                        )}
                        style={{ left: pos(d) }}
                      />
                    </M>
                  )}
                </span>
              </TableCell>
              <TableCell className={cn(TABLE_PAD, "@max-lg:hidden")}>
                <Slot on={on} w="w-20">
                  {verdict}
                </Slot>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
/* The paragraph shapes found in the journal's papers, each with the recipe it becomes. */
function ArchTable({ recipes }: { recipes: boolean }) {
  const az = J.az;
  const recipeOf = Object.fromEntries(JRECIPES.map((r) => [r[2], r[0]]));
  return (
    <Table className="table-fixed" data-cursor="arch">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="pl-4">Archetype</TableHead>
          <TableHead className="w-28 @max-xl:hidden">Section</TableHead>
          <TableHead className="@max-2xl:hidden">Sentences, in order</TableHead>
          <TableHead className="w-24 text-right">Share</TableHead>
          <TableHead className="w-28 pr-4 @max-lg:hidden">Recipe</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {JARCH.map((a, i) => {
          const on = i < az.arch;
          const roles = a.roles.map(([, l]) => l).join(" → ");
          const recipe = recipes && recipeOf[a.id];
          return (
            <TableRow key={a.id}>
              <TableCell className={TABLE_PAD}>
                <span className="flex gap-2.5">
                  <span className="w-6 shrink-0 font-mono text-muted-foreground text-xs leading-5">{a.id}</span>
                  <span className="min-w-0">
                    <span className="block font-medium leading-5">{a.n}</span>
                    <span className="mt-0.5 block text-muted-foreground text-xs @xl:hidden">{a.sec}</span>
                    <span className="mt-1 block text-muted-foreground text-xs @2xl:hidden">
                      <Slot on={on} w="w-3/4">
                        {roles}
                      </Slot>
                    </span>
                  </span>
                </span>
              </TableCell>
              <TableCell className={cn(TABLE_PAD, "text-muted-foreground leading-5 @max-xl:hidden")}>{a.sec}</TableCell>
              <TableCell className={cn(TABLE_PAD, "@max-2xl:hidden")}>
                <Slot on={on} w="w-3/4">
                  <span className="block leading-5">{roles}</span>
                  <span className="mt-0.5 block font-mono text-muted-foreground text-xs @max-4xl:hidden">{a.ex}</span>
                </Slot>
              </TableCell>
              <TableCell className={cn(TABLE_PAD, "text-right")}>
                <Slot on={on} w="ml-auto w-10">
                  <span className="block tabular-nums leading-5">{a.share}%</span>
                  <span className="block text-muted-foreground text-xs">{a.of.replace(/^of /, "")}</span>
                </Slot>
              </TableCell>
              <TableCell className={cn(TABLE_PAD, "@max-lg:hidden")}>
                {recipe ? (
                  <Badge variant="outline" className="font-mono">
                    {recipe}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
export function AnalyzeScene({ live }: { live: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const az = J.az;
  const st = J.st.J4;
  const WHERE: Record<string, string> = {
    s1: "swarm",
    s2: "heat",
    s3: `fr:${Math.max(0, az.forest - 1)}`,
    s4: "confound",
    JK4: "abs",
    s5: "hold",
    s6: "arch",
  };
  const target = st.cur ? (WHERE[st.cur] ?? null) : null;
  return (
    <div ref={host} className="relative grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="grid min-w-0 gap-4 2xl:grid-cols-2">
          <Pane title="One value per paper" aside="CORE_03 · paragraph length">
            {az.swarm ? (
              <SwarmChart />
            ) : (
              <Placeholder>Each paper becomes one dot once its paragraphs are summarised</Placeholder>
            )}
          </Pane>
          <Pane title="Where each move sits" aside="Introduction · 212 papers">
            {az.heat ? <MoveHeat /> : <Placeholder>Drawn after the summaries</Placeholder>}
          </Pane>
        </div>
        <Card data-forest className="@container">
          <ColHead
            title="Education Data Journal against the controls"
            icon="compare"
            aside={az.forest ? "7 of 64 features shown · 2,000 resamples" : "Whole papers resampled"}
          />
          <ForestTable live={live} />
          <p className="border-t px-4 py-2.5 text-muted-foreground text-xs">
            Cliff's δ with a 95% interval, resampling whole papers. A bar that crosses the centre line means no clear
            difference.
          </p>
        </Card>
        <Card data-confound>
          <ColHead
            title="Explained by something else"
            icon="alert"
            aside={az.conf ? `${az.conf} of 3 differences · 2021–2026` : "Year, policy and template"}
          />
          <div data-cursor="confound" className="grid gap-px bg-border md:grid-cols-3">
            {JCONFOUND.map((c, i) =>
              i < az.conf ? (
                <M key={c.f} in="fade" className="flex flex-col gap-2 bg-card px-4 py-3.5">
                  <span className="flex items-start justify-between gap-2">
                    <b className="font-semibold text-[13px] leading-snug">{c.f}</b>
                    <Spark t={c.t} c={c.c} />
                  </span>
                  <span className="text-[12.5px] text-muted-foreground leading-snug">{c.why}</span>
                  <span className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-xs">
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                      <i className="h-0.5 w-3 rounded bg-sky-600 dark:bg-sky-400" />
                      Education Data Journal
                    </span>
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                      <i className="h-0.5 w-3 rounded bg-amber-500" />
                      Controls
                    </span>
                  </span>
                </M>
              ) : (
                <div key={c.f} className="flex flex-col gap-2 bg-card px-4 py-3.5">
                  <Skeleton aria-hidden="true" className="h-2.5 w-1/2 animate-none rounded-full" />
                  <Skeleton aria-hidden="true" className="h-2.5 w-full animate-none rounded-full" />
                </div>
              ),
            )}
          </div>
          {az.conf === 3 && (
            <M as="p" in="fade" className="border-t px-4 py-2.5 text-muted-foreground text-xs">
              9 differences found, 3 explained. The other 6 are what the profile calls distinctive of Education Data
              Journal.
            </M>
          )}
        </Card>
        {(az.abs !== null || st.cur === "JK4") && (
          <Card data-cursor="abs">
            <ColHead
              icon="file"
              title="One-paragraph abstracts · 81% of papers"
              aside={
                az.abs === "flag" ? (
                  <StatusBadge k="info">Habit, superseded by the rule</StatusBadge>
                ) : az.abs === "drop" ? (
                  <StatusBadge k="na">Dropped from v2</StatusBadge>
                ) : (
                  <StatusBadge k="now">Waiting for you</StatusBadge>
                )
              }
            />
            <p className="px-4 py-3 text-[13px] text-muted-foreground">
              The guidelines of September 2026 require a structured abstract (§2.3). Every paper here was published
              before that.
            </p>
          </Card>
        )}
        <Card data-arch className="@container">
          <ColHead
            icon="layers"
            title="Paragraph archetypes"
            aside={az.arch ? "Six shapes cover 72% of paragraphs" : "Mined once the comparisons are done"}
          />
          <ArchTable recipes={J.pb.recipes > 0} />
        </Card>
      </div>
      <aside className="flex min-w-0 flex-col gap-2.5 xl:sticky xl:top-3">
        <RailSection title="So far" aside="64 features">
          <dl className="flex flex-col gap-1.5 text-[12.5px]">
            {(
              [
                ["Differ from the controls", az.forest === 7 ? 9 : null],
                ["Explained by another cause", az.conf === 3 ? 3 : null],
                ["Distinctive of Education Data Journal", az.conf === 3 ? 6 : null],
                ["Drift on held-out papers", az.hold ? 3 : null],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2">
                <dt>{k}</dt>
                <dd className="tabular-nums">
                  {v == null ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <M as="span" key={v} in="fade">
                      {v}
                    </M>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </RailSection>
        <RailSection title="Held-out check" aside={az.hold ? "43 papers" : "after the comparison"}>
          <div data-cursor="hold" className="text-[12.5px]">
            {az.hold ? (
              <>
                <p className="mb-2">61 of 64 features fall inside their intervals on papers nobody looked at.</p>
                <ul className="flex flex-col gap-1.5">
                  {REGISTRY.filter((f) => f[3] === "p").map(([id, name], i) => (
                    <M as="li" key={id} in="fade" delay={i * 0.06} className="flex flex-col">
                      <span className="font-mono text-xs">{id}</span>
                      <span className="text-muted-foreground">{name}</span>
                    </M>
                  ))}
                </ul>
                <p className="mt-2 text-muted-foreground text-xs">
                  These three are published as provisional and never given to a writer as advice.
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">
                The 43 Education Data Journal papers set aside in J1 test whether each feature holds beyond the papers
                it was found on.
              </p>
            )}
          </div>
        </RailSection>
        <RailSection title="How to read “distinctive”">
          <p className="text-[12.5px] text-muted-foreground leading-relaxed">
            It means Education Data Journal's papers differ from comparable papers elsewhere, after year, subfield,
            length and template are ruled out. It does not mean the editors require it, and it says nothing about
            quality.
          </p>
        </RailSection>
      </aside>
      <AgentCursor
        agent={live && st.status === "running" ? "st" : null}
        host={host}
        target={target}
        version={`${az.swarm}-${az.heat}-${az.forest}-${az.conf}-${az.abs}-${az.hold}-${az.arch}`}
      />
    </div>
  );
}

/* ---------- J5 · the profile ---------- */
function SheetSection({
  n,
  title,
  aside,
  children,
  on = true,
}: {
  n: string;
  title: string;
  aside?: ReactNode;
  children: ReactNode;
  on?: boolean;
}) {
  return (
    <section className="flex flex-col gap-3 border-t px-4 py-4 sm:px-5">
      <h4 className="flex flex-wrap items-baseline gap-x-2.5 font-semibold text-sm">
        <span className="font-normal text-muted-foreground text-xs tabular-nums">{n}</span>
        {title}
        {aside && <span className="ml-auto font-normal text-muted-foreground text-xs">{aside}</span>}
      </h4>
      {on ? (
        children
      ) : (
        <div className="flex flex-col gap-2">
          <Skeleton aria-hidden="true" className="h-2.5 w-4/5 animate-none rounded-full" />
          <Skeleton aria-hidden="true" className="h-2.5 w-1/2 animate-none rounded-full" />
        </div>
      )}
    </section>
  );
}
/** Each line a writer receives: the rule, habit or prohibition, where it comes from, and a note. */
function writerLines(groups: number): [string, string, string, string][] {
  const habits = JHABITS_OUT.filter((_, i) => !(i === 0 && J.az.abs === "drop"));
  const out: [string, string, string, string][] = [];
  if (groups >= 1) for (const [t, s] of JRULES_OUT) out.push(["rule", t, s, ""]);
  if (groups >= 2) for (const [t, v, note] of habits) out.push(["habit", `${t} · ${v}`, "212 papers", note]);
  if (groups >= 3) for (const [t, s] of JPROHIBIT) out.push(["ban", t, s, ""]);
  return out;
}
export function ProfileSheet() {
  const pb = J.pb;
  const frozen = pb.frozen;
  return (
    <Card data-sheet data-cursor="sheet" className="@container">
      <header className="flex flex-col gap-3 px-4 pt-4 pb-4 sm:px-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h3 className="font-semibold text-xl tracking-tight">JFE-EDJ-v2</h3>
          {frozen ? <StatusBadge k="ok">Published · frozen</StatusBadge> : <StatusBadge k="now">Draft</StatusBadge>}
        </div>
        <p className="max-w-[68ch] text-muted-foreground text-sm">
          How research articles in Education Data Journal (example) were written, 2021–2026. Built from 212 papers and
          compared with 96 from three journals in the same field.
        </p>
        <dl className="grid gap-x-6 gap-y-2 rounded-lg bg-muted/50 px-4 py-3 text-[13px] sm:grid-cols-3">
          {[
            ["Scope", "English · research articles · 9 section types"],
            ["Provenance", "Manifest CM-EDJ-0918 · parser 3.2 · taxonomy v1.2 · registry v2.0"],
            ["Coverage", "Parsed 95% · α 0.78–0.88 · 64 features"],
          ].map(([k, v]) => (
            <div key={k} className="flex min-w-0 flex-col gap-0.5">
              <dt className="text-muted-foreground text-xs">{k}</dt>
              <dd className="leading-snug">{v}</dd>
            </div>
          ))}
        </dl>
      </header>
      <SheetSection
        n="1"
        title="Findings, by strength of evidence"
        aside={pb.labels ? "64 features" : ""}
        on={pb.labels}
      >
        <div className="flex h-2.5 gap-[2px] overflow-hidden rounded-full">
          {JEVIDENCE.map(([k, , n, bar], i) => (
            <M
              as="span"
              key={k}
              in="grow"
              delay={i * 0.1}
              className={cn("origin-left", bar)}
              style={{ width: `${(n / 64) * 100}%` }}
            />
          ))}
        </div>
        <ul className="grid gap-x-6 gap-y-2 text-[13px] sm:grid-cols-2">
          {JEVIDENCE.map(([k, label, n, bar, why]) => (
            <li key={k} className="grid grid-cols-[10px_minmax(0,1fr)_auto] items-start gap-2">
              <span className={cn("mt-1.5 size-2.5 rounded-[3px]", bar)} />
              <span>
                <b className="font-medium">{label}</b>
                <span className="block text-muted-foreground text-xs">{why}</span>
              </span>
              <span className="tabular-nums">{n}</span>
            </li>
          ))}
        </ul>
      </SheetSection>
      <SheetSection
        n="2"
        title="What a writer receives"
        aside={pb.rules ? "rules bind, habits guide" : ""}
        on={pb.rules > 0}
      >
        <div className="-mx-4 sm:-mx-5">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4 sm:pl-5">Line</TableHead>
                <TableHead className="w-32">Kind</TableHead>
                <TableHead className="w-40 pr-4 @max-xl:hidden sm:pr-5">From</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {writerLines(pb.rules).map(([kind, t, from, note]) => (
                <M as={TableRow} key={t} in="fade" dur={300}>
                  <TableCell className={cn(TABLE_PAD, "sm:first:pl-5")}>
                    <span className="block leading-5">{t}</span>
                    {note && (
                      <span
                        className={cn(
                          "mt-0.5 block text-xs",
                          /superseded|provisional/.test(note)
                            ? "text-amber-700 dark:text-amber-300"
                            : "text-muted-foreground",
                        )}
                      >
                        {note}
                      </span>
                    )}
                    <span className="mt-0.5 block text-muted-foreground text-xs @xl:hidden">{from}</span>
                  </TableCell>
                  <TableCell className={TABLE_PAD}>
                    <SourceBadge k={kind} />
                  </TableCell>
                  <TableCell className={cn(TABLE_PAD, "text-muted-foreground leading-5 @max-xl:hidden sm:last:pr-5")}>
                    {from}
                  </TableCell>
                </M>
              ))}
            </TableBody>
          </Table>
        </div>
        {J.an.prov && (
          <p className="text-amber-700 text-xs dark:text-amber-300">
            “Compare with prior work” is provisional: reported in the habits, never turned into advice.
          </p>
        )}
      </SheetSection>
      <SheetSection
        n="3"
        title="Writing recipes"
        aside={pb.recipes ? `${pb.recipes} of 4 · pinned to v2` : ""}
        on={pb.recipes > 0}
      >
        <ul data-recipes className="flex flex-col divide-y rounded-lg ring-1 ring-foreground/10">
          {JRECIPES.slice(0, pb.recipes).map(([id, n, arch, sec]) => {
            const a = JARCH.find((x) => x.id === arch);
            const prov = arch === "A5" && J.an.prov;
            return (
              <M
                as="li"
                key={id}
                in="fade"
                className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 px-3.5 py-2.5 text-[13px]"
              >
                <span className="min-w-0">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-mono text-muted-foreground text-xs">{id}</span>
                    <b className="font-medium">{n}</b>
                    <span className="text-muted-foreground text-xs">
                      {sec} · from {arch}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-muted-foreground text-xs">
                    {(a?.roles ?? []).map(([, l]) => l).join(" → ")}
                  </span>
                </span>
                {prov ? (
                  <StatusBadge k="warn">Provisional</StatusBadge>
                ) : frozen ? (
                  <StatusBadge k="ok">Approved</StatusBadge>
                ) : (
                  <StatusBadge k="na">Candidate</StatusBadge>
                )}
              </M>
            );
          })}
        </ul>
      </SheetSection>
      <SheetSection n="4" title="Changes from v1" aside={pb.diff ? "v1 published March 2025" : ""} on={pb.diff}>
        <div data-diff className="-mx-4 sm:-mx-5">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-28 pl-4 sm:pl-5">Part</TableHead>
                <TableHead className="@max-lg:hidden">v1</TableHead>
                <TableHead className="pr-4 sm:pr-5">v2</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {JDIFF.map(([k, a, b]) => (
                <TableRow key={k}>
                  <TableCell className={cn(TABLE_PAD, "text-muted-foreground sm:first:pl-5")}>{k}</TableCell>
                  <TableCell className={cn(TABLE_PAD, "text-muted-foreground leading-5 @max-lg:hidden")}>
                    {a ? <span className="line-through decoration-foreground/30">{a}</span> : "—"}
                  </TableCell>
                  <TableCell className={cn(TABLE_PAD, "leading-5 sm:last:pr-5")}>{b}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </SheetSection>
      <SheetSection n="5" title="Limitations" aside="published with the profile" on={pb.diff}>
        <ol className="flex flex-col gap-1.5 text-[13px]">
          {JLIMITS.map((l, i) => (
            <li key={l} className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-1">
              <span className="text-muted-foreground text-xs tabular-nums leading-5">{i + 1}.</span>
              {l}
            </li>
          ))}
        </ol>
      </SheetSection>
      <footer className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t px-4 py-3 text-muted-foreground text-xs sm:px-5">
        <span className="font-mono">sha256 {frozen ? JPROFILE_HASH : "computed when frozen"}</span>
        <span>{frozen ? "Published 26 Oct 2026" : "Not published"}</span>
        <span className="ml-auto">v1 stays readable</span>
      </footer>
    </Card>
  );
}
/* who reads the profile, and how far the manuscript run has got */
export function ReaderCard() {
  const s8 = S.st.S08;
  const state =
    s8.status === "done" ? "read" : S.jr.waiting ? "waiting" : s8.status === "running" ? "reading" : "queued";
  const line = {
    queued: `At ${S.stage}. It reads v2 when it reaches S08.`,
    waiting: "At S08, waiting for this profile: it goes on once v2 is published.",
    reading: "Reading v2 now, at S08.",
    read: "Read v2 at S08 and approved it as its journal contract.",
  }[state];
  return (
    <div className="flex flex-col gap-2.5 text-[12.5px]">
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2.5">
        <span className="grid size-8 place-items-center rounded-lg bg-pink-500/12 text-pink-700 dark:text-pink-300">
          <Icon n="pen" className="size-4" />
        </span>
        <span className="min-w-0">
          <b className="block font-semibold">ASW-0412 · S08</b>
          <span className="text-muted-foreground">{line}</span>
        </span>
      </div>
      <ul className="flex flex-col gap-1 text-muted-foreground text-xs">
        <li>S08 takes the rules, the habits and the placement of each statement type</li>
        <li>S09 and S10 take the move order and the recipes</li>
        <li>S13 measures the draft against these bands</li>
      </ul>
    </div>
  );
}
export function PublishScene({ live }: { live: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const pb = J.pb;
  const st = J.st.J5;
  const WHERE: Record<string, string> = {
    t1: "sheet",
    t2: "sheet",
    t3: "recipes-r",
    t4: "diff-r",
    JG2: "sheet",
    t5: "sheet",
  };
  const target = st.cur ? (WHERE[st.cur] ?? null) : null;
  return (
    <div ref={host} className="relative grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
      <ProfileSheet />
      <aside className="flex min-w-0 flex-col gap-2.5 xl:sticky xl:top-3">
        <RailSection title="Who reads this profile" aside="1 run">
          <ReaderCard />
        </RailSection>
        <RailSection title="Recipes" aside={pb.recipes ? "from J4" : ""}>
          <p data-cursor="recipes-r" className="text-[12.5px] text-muted-foreground leading-relaxed">
            {pb.recipes
              ? "Each recipe is an archetype written as a paragraph plan: moves in order, sentence roles, citation slots. ASW's planner reads them at S08."
              : "Made from the archetypes found in J4."}
          </p>
        </RailSection>
        <RailSection title="Versions" aside={pb.diff ? "v1 · v2" : ""}>
          <dl data-cursor="diff-r" className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-2 gap-y-2 text-[12.5px]">
            <dt className="font-mono text-muted-foreground">v1</dt>
            <dd>
              March 2025 · Introduction only · 150 papers
              <span className="block text-muted-foreground text-xs">stays readable</span>
            </dd>
            <dt className="font-mono font-semibold">v2</dt>
            <dd>
              {pb.frozen ? "October 2026 · published" : "this run · draft"}
              <span className="block text-muted-foreground text-xs">212 papers + 96 controls</span>
            </dd>
          </dl>
        </RailSection>
      </aside>
      <AgentCursor
        agent={live && st.status === "running" ? "pb" : null}
        host={host}
        target={target}
        version={`${pb.labels}-${pb.rules}-${pb.recipes}-${pb.diff}-${pb.frozen}`}
      />
    </div>
  );
}

/* ---------- the published profile, as a reader opens it ---------- */
export function ProfileView() {
  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-start gap-3 border-b pb-3.5">
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-lg tracking-tight">JFE-EDJ-v2, as a writer reads it</h2>
          <p className="mt-1 max-w-[68ch] text-muted-foreground text-sm">
            The frozen profile. The charts it was built from stay in Analyze; every number points back to papers and
            spans.
          </p>
        </div>
        <Button type="button" size="sm" onClick={() => setTrack("asw")}>
          Open the manuscript
          <Icon n="arrow" />
        </Button>
      </header>
      <ProfileSheet />
    </div>
  );
}
