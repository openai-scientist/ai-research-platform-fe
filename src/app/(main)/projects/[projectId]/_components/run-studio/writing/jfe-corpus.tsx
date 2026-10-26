"use client";
"use no memo";

// The writing run keeps its state in module variables (engine.ts) and re-renders on emit(); the React Compiler
// would memoise these components on their props and never show a change.

import { type ReactNode, useRef } from "react";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import {
  JBINS,
  JCTRL,
  JFAIL_WHY,
  JHEADMAP,
  JPAGE,
  JPAGE_KIND,
  JPARSE_FAIL,
  JPARSE_N,
  JRIGHTS,
  JSAMPLING,
  JTEMPLATE,
  JTREE,
  JYEAR_N,
  JYEARS,
} from "./data/jfe";
import { J } from "./engine";
import { AgentCursor, cn, M, Pane } from "./lib";
import { RailSection } from "./paper";
import { Card, ColHead, Slot, StatusBadge, TABLE_PAD } from "./scenes-gather";

/* ===== JFE scenes, part 1: the corpus (J1) and the parser (J2) ===== */

/** A row of the run's key numbers, each with what it counts. A number shows once it is known. */
export function JStats({ items }: { items: [string, string | null, ReactNode][] }) {
  return (
    <dl
      className="grid grid-cols-2 gap-px border-b bg-border sm:grid-cols-[repeat(var(--n),minmax(0,1fr))]"
      style={{ "--n": items.length } as React.CSSProperties}
    >
      {items.map(([k, v, sub]) => (
        <div key={k} className="flex min-w-0 flex-col gap-0.5 bg-card px-4 py-3">
          <dt className="text-muted-foreground text-xs">{k}</dt>
          <dd className="font-semibold text-[20px] tabular-nums leading-tight">
            {v == null ? (
              <span className="text-muted-foreground/50">—</span>
            ) : (
              <M as="span" key={v} in="fade" dur={300}>
                {v}
              </M>
            )}
          </dd>
          <dd className="text-muted-foreground text-xs">{sub}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ---------- J1 · corpus ---------- */
/* What happened to IR Journal's papers, year by year, and to each control journal's. */
const ELIGIBLE = [98, 104, 98, 112, 126, 111];
const NO_RIGHTS = [3, 3, 3, 3, 3, 2];
const HELD = [8, 7, 8, 7, 8, 7];
const CTRL_NO_RIGHTS = [3, 3, 2];
const CTRL_HELD = [7, 7, 6];
const sum = (a: number[]) => a.reduce((n, x) => n + x, 0);
/** A short stagger for a list that appears at once. */
const canStagger = (i: number) => i * 0.05;
const fmt = (n: number) => n.toLocaleString("en-US");
/** Columns of the sample table: label, phase it is filled at, and the container width under which it hides. */
const SAMPLE_COLS: [string, number, string][] = [
  ["Works", 1, "@max-2xl:hidden"],
  ["Eligible", 2, "@max-xl:hidden"],
  ["Sampled", 3, ""],
  ["Kept", 5, ""],
  ["Held out", 6, ""],
];
function SampleTable() {
  const p = J.cp.phase;
  const num = (v: number | null, at: number, strong = false) => (
    <Slot on={p >= at} w="ml-auto w-8">
      <span className={cn("block tabular-nums", strong && "font-semibold")}>{v == null ? "—" : fmt(v)}</span>
    </Slot>
  );
  const row = (key: string, label: ReactNode, vals: (number | null)[], strong = false, from = 1) => (
    <TableRow key={key} className={cn(strong && "bg-muted/30 hover:bg-muted/30")}>
      <TableCell className={cn(TABLE_PAD, strong && "font-semibold")}>{label}</TableCell>
      {SAMPLE_COLS.map(([k, at, hide], i) => (
        <TableCell key={k} className={cn(TABLE_PAD, "text-right", hide)}>
          {num(vals[i], Math.max(at, from), strong)}
        </TableCell>
      ))}
    </TableRow>
  );
  const group = (label: string, note: string) => (
    <TableRow className="bg-muted/50 text-xs hover:bg-muted/50">
      <TableCell className="py-1.5 pl-4">
        <b className="font-semibold">{label}</b>
        <span className="ml-2 text-muted-foreground">{note}</span>
      </TableCell>
      {SAMPLE_COLS.map(([k, , hide]) => (
        <TableCell key={k} className={cn("py-1.5", hide)} />
      ))}
    </TableRow>
  );
  const sampled = JYEARS.map(() => 40);
  return (
    <Table className="table-fixed">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="pl-4">Papers from</TableHead>
          {SAMPLE_COLS.map(([k, , hide]) => (
            <TableHead key={k} className={cn("w-20 text-right last:pr-4 @max-md:w-16", hide)}>
              {k}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {group("IR Journal (example)", "research articles, 40 drawn per year")}
        {JYEARS.map((yr, y) => row(String(yr), yr, [JYEAR_N[y], ELIGIBLE[y], sampled[y], 40 - NO_RIGHTS[y], HELD[y]]))}
        {row(
          "irj",
          "All years",
          [sum(JYEAR_N), sum(ELIGIBLE), sum(sampled), sum(sampled) - sum(NO_RIGHTS), sum(HELD)],
          true,
        )}
        {group("Controls", "matched on year and subfield")}
        {JCTRL.map((c, i) => row(c.k, c.n, [null, c.elig, c.s, c.s - CTRL_NO_RIGHTS[i], CTRL_HELD[i]], false, 4))}
        {row(
          "ctrl",
          "All controls",
          [
            null,
            sum(JCTRL.map((c) => c.elig)),
            sum(JCTRL.map((c) => c.s)),
            sum(JCTRL.map((c) => c.s)) - sum(CTRL_NO_RIGHTS),
            sum(CTRL_HELD),
          ],
          true,
          4,
        )}
      </TableBody>
    </Table>
  );
}
export function CorpusScene({ live }: { live: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const st = J.st.J1;
  const p = J.cp.phase;
  const WHERE: Record<string, string> = { p1: "wall", p2: "bins", p3: "wall", p4: "wall", p5: "rights", p6: "wall" };
  const target = st.cur ? (WHERE[st.cur] ?? "wall") : null;
  const leftOut = JBINS.filter(([k]) => k !== "rights" || p >= 5);
  return (
    <div ref={host} className="relative flex flex-col gap-4">
      <Card data-wall className="@container">
        <ColHead icon="layers" title="Corpus" aside={p ? "OpenAlex · IR Journal and three controls" : "Not read yet"} />
        <JStats
          items={[
            ["Works, 2021–2026", p >= 1 ? "1,146" : null, "from the OpenAlex source"],
            ["Eligible", p >= 2 ? "649" : null, p >= 2 ? "488 left out · 9 duplicates" : "research articles only"],
            ["Sampled", p >= 4 ? "240 + 110" : p >= 3 ? "240" : null, p >= 4 ? "IR Journal + controls" : "40 per year"],
            ["Kept", p >= 5 ? "223 + 102" : null, p >= 6 ? "65 held out until J4" : "after the rights check"],
          ]}
        />
        <div data-cursor="wall">
          <SampleTable />
        </div>
      </Card>
      <div className="grid min-w-0 gap-3 lg:grid-cols-3">
        <Pane title="Sampling record" aside={p >= 3 ? "frozen with the manifest" : "written as it is drawn"}>
          <dl className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-3 gap-y-2 text-[13px]">
            {JSAMPLING.map(([k, v], i) => (
              <div key={k} className="contents">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="min-w-0 break-words">
                  <Slot on={i < 2 || p >= (i === 4 ? 4 : 3)} w="w-3/4">
                    {v}
                  </Slot>
                </dd>
              </div>
            ))}
          </dl>
        </Pane>
        <Pane title="Left out, with reasons" aside={p >= 5 ? "522 papers" : p >= 2 ? "497 papers" : ""}>
          <ul data-cursor="bins" className="flex flex-col gap-2 text-[13px]">
            {p < 2 && (
              <li className="text-muted-foreground">
                Every exclusion is logged here with its reason. Nothing leaves the corpus silently.
              </li>
            )}
            {p >= 2 &&
              leftOut.map(([k, label, n], i) => (
                <M
                  as="li"
                  key={k}
                  in="fade"
                  delay={canStagger(i)}
                  className="grid grid-cols-[minmax(0,1fr)_4rem_2.5rem] items-center gap-3"
                >
                  <span className={cn(k === "rights" && "font-medium text-rose-700 dark:text-rose-300")}>{label}</span>
                  <i className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <b
                      className={cn("block h-full rounded-full", k === "rights" ? "bg-rose-500" : "bg-foreground/40")}
                      style={{ width: `${(n / 233) * 100}%` }}
                    />
                  </i>
                  <span className="text-right tabular-nums">{n}</span>
                </M>
              ))}
          </ul>
        </Pane>
        <Pane title="Rights per paper" aside={p >= 5 ? "4 flags each" : ""}>
          <div data-cursor="rights">
            {p >= 5 ? (
              <ul className="flex flex-col gap-2 text-[13px]">
                {JRIGHTS.map(([k, v, why], i) => (
                  <M
                    as="li"
                    key={k}
                    in="fade"
                    delay={canStagger(i)}
                    className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3"
                  >
                    <span>
                      {k}
                      <span className="block text-muted-foreground text-xs">{why}</span>
                    </span>
                    <span className={cn("tabular-nums", v === "0" && "text-rose-700 dark:text-rose-300")}>{v}</span>
                  </M>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-muted-foreground">
                Open access is not a licence to copy. Each paper's rights are read separately before it is parsed.
              </p>
            )}
          </div>
        </Pane>
      </div>
      <AgentCursor
        agent={live && st.status === "running" ? "cm" : null}
        host={host}
        target={target}
        version={`${p}-${st.cur}`}
      />
    </div>
  );
}
/* ---------- J2 · parsing ---------- */
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** What each block of the sample page is, in words, and what it becomes in the canonical document. */
function blockOf([id, kind, , , , , tag, , maps]: (typeof JPAGE)[number]): [string, string] {
  if (kind === "head") return [`Heading “${maps}”`, id === "h1" ? "Starts INTRODUCTION" : "Starts RELATED_WORK"];
  if (kind === "fig") return [maps, "Kept as a figure, not as text"];
  if (kind === "tpl") return [cap(tag), "Template"];
  if (kind === "prose" && tag === "p") return ["Paragraph", maps];
  return [cap(tag), maps];
}
function PageBlocks({ live }: { live: boolean }) {
  const pr = J.pr;
  const st = J.st.J2;
  const reading = live && st.status === "running" && st.cur === "q2";
  return (
    <Table className="table-fixed">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="pl-4">Block on the page</TableHead>
          <TableHead className="w-28 @max-lg:hidden">Kind</TableHead>
          <TableHead className="pr-4">In the canonical document</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {JPAGE.map((b, i) => {
          const [name, to] = blockOf(b);
          const on = i < pr.page;
          const k = JPAGE_KIND[b[1]];
          const tpl = b[1] === "tpl";
          const kind = (
            <Badge variant="outline" className={k.tone}>
              {cap(k.label)}
            </Badge>
          );
          return (
            <TableRow
              key={b[0]}
              data-state={reading && i === pr.page - 1 ? "selected" : undefined}
              className="duration-300"
            >
              <TableCell className={TABLE_PAD}>
                <span className="block leading-5">{name}</span>
                <span className="mt-1.5 block @lg:hidden">
                  <Slot on={on} w="w-14">
                    {kind}
                  </Slot>
                </span>
              </TableCell>
              <TableCell className={cn(TABLE_PAD, "@max-lg:hidden")}>
                <Slot on={on} w="w-14">
                  {kind}
                </Slot>
              </TableCell>
              <TableCell className={TABLE_PAD}>
                <Slot on={on} w="w-2/3">
                  {tpl ? (
                    pr.strip ? (
                      <StatusBadge k="bad">Removed</StatusBadge>
                    ) : (
                      <span className="block text-muted-foreground leading-5">{to}</span>
                    )
                  ) : (
                    <span className="block font-mono text-xs leading-5">{to}</span>
                  )}
                </Slot>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
function CanonTree() {
  const pr = J.pr;
  return (
    <div className="flex min-w-0 flex-col gap-2 border-t px-4 py-3.5">
      <h4 className="font-medium text-muted-foreground text-xs">The canonical document of P-0137</h4>
      {!pr.tree && (
        <div className="flex flex-col gap-2 py-1">
          {[0, 1, 2].map((i) => (
            <Skeleton
              key={i}
              aria-hidden="true"
              className={cn("h-2.5 animate-none rounded-full", i % 2 ? "w-2/5" : "w-3/5")}
            />
          ))}
        </div>
      )}
      <ol className="flex flex-col">
        {JTREE.slice(0, pr.tree).map(([depth, name, meta]) => (
          <M
            as="li"
            key={name + meta}
            in="fade"
            dur={300}
            className={cn(
              "grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] items-baseline gap-x-2.5 py-1 text-[13px]",
              depth && "border-l",
            )}
            style={{
              marginLeft: `${Math.max(0, depth - 1) * 16 + (depth ? 4 : 0)}px`,
              paddingLeft: depth ? "12px" : "0",
            }}
          >
            <b className={cn("font-mono text-xs", depth ? "font-medium" : "font-semibold")}>{name}</b>
            <span className="min-w-0 text-muted-foreground text-xs">{meta}</span>
          </M>
        ))}
      </ol>
      {pr.strip && (
        <M as="p" in="fade" className="text-muted-foreground text-xs">
          Not in the document: the running head, page number, copyright and CRediT lines. They are the publisher's, so
          no feature may count them.
        </M>
      )}
    </div>
  );
}
function HeadingTable({ live }: { live: boolean }) {
  const pr = J.pr;
  const st = J.st.J2;
  const mapping = live && st.status === "running" && st.cur === "q4";
  return (
    <Table className="table-fixed">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="pl-4">As written</TableHead>
          <TableHead>Section</TableHead>
          <TableHead className="w-20 pr-4 text-right">Papers</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {JHEADMAP.map(([raw, to, n, flag], i) => {
          const on = i < pr.map;
          return (
            <TableRow
              key={raw}
              data-cursor={`hm:${i}`}
              data-state={mapping && i === pr.map - 1 ? "selected" : undefined}
              className="duration-300"
            >
              <TableCell className={cn(TABLE_PAD, "leading-5")} data-hm-raw={i}>
                {raw}
              </TableCell>
              <TableCell className={TABLE_PAD} data-hm-can={i}>
                <Slot on={on} w="w-24">
                  <span className="flex flex-wrap items-center gap-1.5">
                    {to.map((c) => (
                      <Badge key={c} variant="outline" className="font-mono">
                        {c}
                      </Badge>
                    ))}
                    {flag && <StatusBadge k="info">Kept as one</StatusBadge>}
                  </span>
                </Slot>
              </TableCell>
              <TableCell className={cn(TABLE_PAD, "text-right tabular-nums")}>
                <Slot on={on} w="ml-auto w-8">
                  {n}
                </Slot>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
export function ParseScene({ live }: { live: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const pr = J.pr;
  const st = J.st.J2;
  const read = Math.min(pr.queue, JPARSE_N);
  const failed = Object.entries(JFAIL_WHY).map(([k, why]): [string, number] => [
    why,
    Object.values(JPARSE_FAIL).filter((x) => x === k).length,
  ]);
  let target: string | null = null;
  if (st.cur === "q1") target = "sources";
  if (st.cur === "q2" || st.cur === "q3") target = "page";
  if (st.cur === "q4") target = `hm:${Math.max(0, pr.map - 1)}`;
  if (st.cur === "q5") target = "queue";
  if (st.cur === "q6") target = "audit";
  return (
    <div ref={host} className="relative grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="flex min-w-0 flex-col gap-4">
        <Card className="@container">
          <ColHead
            icon="file"
            title="P-0137, page 3"
            aside={pr.page ? "One of 127 PDFs, read by GROBID into TEI" : "A sample paper, shown as it is read"}
          />
          <div data-cursor="page">
            <PageBlocks live={live} />
          </div>
          <CanonTree />
        </Card>
        <Card data-headmap className="@container">
          <ColHead title="Headings to sections" icon="list" aside={pr.map ? "214 headings · 9 types" : ""} />
          <HeadingTable live={live} />
          {pr.map === JHEADMAP.length && (
            <M as="p" in="fade" className="border-t px-4 py-2.5 text-muted-foreground text-xs">
              The mapping goes by what a section does, not its exact words. A merged “Results and Discussion” is never
              split into two invented sections.
            </M>
          )}
        </Card>
        <Card data-queue>
          <ColHead title="Every paper, read" icon="table" aside={pr.queue ? `${read} of ${JPARSE_N}` : ""} />
          <div data-cursor="queue" className="flex flex-col gap-3 px-4 py-3.5">
            <div className="flex items-center gap-3 text-[13px]">
              <Progress
                value={(read / JPARSE_N) * 100}
                aria-label={`${read} of ${JPARSE_N} papers read`}
                className="h-1.5 flex-1"
              />
              <span className="w-24 text-right text-muted-foreground tabular-nums">
                {read} of {JPARSE_N}
              </span>
            </div>
            {pr.failed ? (
              <M as="ul" in="fade" className="flex flex-col divide-y rounded-lg ring-1 ring-foreground/10">
                {failed.map(([why, n]) => (
                  <li key={why} className="flex items-center justify-between gap-3 px-3 py-2 text-[13px]">
                    <span>{why}</span>
                    <StatusBadge k="bad">{n} dropped</StatusBadge>
                  </li>
                ))}
              </M>
            ) : (
              <p className="text-muted-foreground text-xs">
                A paper that cannot be read the same way as the others is dropped, with its reason.
              </p>
            )}
          </div>
        </Card>
      </div>
      <aside className="flex min-w-0 flex-col gap-2.5 xl:sticky xl:top-3">
        <RailSection title="Sources" aside={pr.fetched ? `${pr.fetched} of ${JPARSE_N} fetched` : ""}>
          <div data-cursor="sources" className="flex flex-col gap-2 text-[12.5px]">
            <div className="flex h-2 overflow-hidden rounded-full bg-muted">
              <span
                className="h-full bg-sky-600 transition-[width] duration-500 dark:bg-sky-400"
                style={{ width: `${(Math.min(pr.fetched, 198) / JPARSE_N) * 100}%` }}
              />
              <span
                className="h-full bg-slate-500 transition-[width] duration-500"
                style={{ width: `${(Math.max(0, pr.fetched - 198) / JPARSE_N) * 100}%` }}
              />
            </div>
            {(
              [
                ["bg-sky-600 dark:bg-sky-400", "JATS XML", 198],
                ["bg-slate-500", "PDF, then GROBID to TEI", 127],
              ] as const
            ).map(([dot, k, n]) => (
              <span key={k} className="flex justify-between">
                <span className="inline-flex items-center gap-1.5">
                  <span className={cn("size-2 rounded-full", dot)} />
                  {k}
                </span>
                <span className="tabular-nums">{n}</span>
              </span>
            ))}
            <p className="text-muted-foreground text-xs">
              JATS keeps the publisher's own structure, so it is preferred. A PDF is used only when no JATS exists.
            </p>
          </div>
        </RailSection>
        <RailSection title="Removed as template" aside={pr.strip ? "before measuring" : ""}>
          {pr.strip ? (
            <ul className="flex flex-col gap-1.5 text-[12.5px]">
              {JTEMPLATE.map(([k, v], i) => (
                <M as="li" key={k} in="fade" delay={canStagger(i)} className="flex justify-between gap-2">
                  <span>{k}</span>
                  <span className="tabular-nums">{v}</span>
                </M>
              ))}
            </ul>
          ) : (
            <p className="text-[12.5px] text-muted-foreground">
              Anything every paper shares because of the publisher's layout is removed, so the template is never
              mistaken for a writing habit.
            </p>
          )}
        </RailSection>
        <RailSection title="Hand audit" aside={pr.audit ? "30 papers" : ""}>
          <div data-cursor="audit" className="flex flex-col gap-2.5 text-[12.5px]">
            {pr.audit ? (
              <>
                {(
                  [
                    ["Introduction paragraphs found", 97.4],
                    ["Headings mapped as a person would", 96.1],
                  ] as const
                ).map(([k, v], i) => (
                  <M key={k} in="fade" delay={canStagger(i)} className="flex flex-col gap-1">
                    <span className="flex justify-between gap-2">
                      <span>{k}</span>
                      <span className="tabular-nums">{v}%</span>
                    </span>
                    <Progress value={v} aria-label={k} className="h-1.5" />
                  </M>
                ))}
                <p className="text-muted-foreground text-xs">Both above the 95% target.</p>
              </>
            ) : (
              <p className="text-muted-foreground">
                A person checks 30 papers against the PDF once everything is read.
              </p>
            )}
          </div>
        </RailSection>
        {pr.failed && (
          <M in="fade" className="rounded-xl bg-card px-3.5 py-3 text-[12.5px] ring-1 ring-foreground/10">
            <b className="font-semibold">308 papers go on</b>
            <span className="block text-muted-foreground">
              212 from IR Journal and 96 controls. The 212 are the papers ASW-0412 will be compared with.
            </span>
          </M>
        )}
      </aside>
      <AgentCursor
        agent={live && st.status === "running" ? "dp" : null}
        host={host}
        target={target}
        version={`${pr.page}-${pr.tree}-${pr.map}-${pr.queue}-${pr.audit}`}
      />
    </div>
  );
}
