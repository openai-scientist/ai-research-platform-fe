"use client";
"use no memo";

// The writing run keeps its state in module variables (engine.ts) and re-renders on emit(); the React Compiler
// would memoise these components on their props and never show a change.

import { type ReactNode, type RefObject, useLayoutEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import {
  ALLOC,
  BACKLOG,
  CAP_TRIES,
  CARS,
  CHECKS,
  DLT,
  EDITS,
  EVSRC,
  EXCEPTIONS,
  FIT,
  FIT_RULES,
  GLOSS,
  MOVES,
  PATCHES,
  RERUNS,
  REVIEWERS,
  RISK,
  RV_ISS,
  SDIFF,
  STORY,
} from "./data/core";
import { INTAKE, INTAKE_CHECKS } from "./data/intake";
import { AGENTS } from "./data/meta";
import { PARAS } from "./data/paper";
import { REPORT_FIELDS } from "./data/report";
import {
  briefIds,
  J,
  movedOut,
  PARA_BY,
  paraLabel,
  paraOn,
  patchIds,
  S,
  SEC_OF,
  SEC_ORDER,
  turnsShown,
} from "./engine";
import { JStats } from "./jfe-corpus";
import { AgentCursor, Bump, cn, Icon, M } from "./lib";
import { PaperPage, RailSection, RailWide } from "./paper";
import { Card, ColHead, Slot, StatusBadge, TABLE_PAD } from "./scenes-gather";

/* ===== Write and verify: outline, draft and read-back, review, sign-off, the paper ===== */

/* Every screen from the outline to the paper is the same desk: the manuscript, and beside it what the stage does to
 * it. Where the column is too narrow for both, the stage's sections sit above the page, folded to their summaries. */
const WIDE = 1024;
export function PaperDesk({
  host,
  rail,
  cursors,
  comments = false,
  top,
}: {
  host?: RefObject<HTMLDivElement | null>;
  rail: ReactNode;
  cursors?: ReactNode;
  comments?: boolean;
  top?: ReactNode;
}) {
  const own = useRef<HTMLDivElement>(null);
  const box = host ?? own;
  const [wide, setWide] = useState<boolean | null>(null);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWide(e.contentRect.width >= WIDE));
    ro.observe(el);
    return () => ro.disconnect();
  }, [box]);
  return (
    <div ref={box} className="@container relative flex flex-col gap-4">
      {top}
      <div className="grid min-w-0 items-start gap-4 @5xl:grid-cols-[minmax(0,1fr)_340px]">
        <RailWide value={wide}>
          <aside className="flex min-w-0 flex-col gap-2.5 @5xl:sticky @5xl:top-3 @5xl:order-last @5xl:max-h-[calc(100dvh-14rem)] @5xl:overflow-y-auto @5xl:p-px">
            {rail}
          </aside>
        </RailWide>
        <PaperPage comments={comments} />
      </div>
      {cursors}
    </div>
  );
}

/* A table inside a rail section, edge to edge, as the workspace's tables are. */
const RC = "py-2 align-top whitespace-normal first:pl-3.5 last:pr-3.5";
function RailTable({ head, children }: { head: [string, string?][]; children: ReactNode }) {
  return (
    <div className="-mx-3.5 -mb-3 border-t">
      <Table className="table-fixed text-xs">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {head.map(([h, w]) => (
              <TableHead key={h} className={cn("h-8 text-muted-foreground text-xs first:pl-3.5 last:pr-3.5", w)}>
                {h}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>{children}</TableBody>
      </Table>
    </div>
  );
}
/* What a section shows before its agent has filled it. */
const Pending = ({ children }: { children: ReactNode }) => (
  <p className="text-muted-foreground text-xs leading-relaxed">{children}</p>
);
const Note = ({ children }: { children: ReactNode }) => (
  <p className="mb-2.5 text-muted-foreground text-xs leading-relaxed">{children}</p>
);

/* ---------- S09–S10 outline and contracts ---------- */
export function BlueprintScene({ live }: { live: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const b = S.bp;
  const s7 = S.st.S09;
  const s8 = S.st.S10;
  const ids = briefIds();
  let target: string | null = null;
  if (s7.cur === "h1") target = "story";
  if (s7.cur === "h2" && b.placed) target = `sec:${ALLOC[b.placed - 1][0]}`;
  if (s7.cur === "h3") target = "moves";
  if (s7.cur === "h4" || s7.cur === "K09") target = "aligned";
  if (s8.cur === "i1" && b.briefs) target = `para:${ids[b.briefs - 1]}`;
  if (s8.cur === "i2") target = "para:RES-1";
  if (s8.cur === "i3") target = "para:RES-4";
  if (s8.cur === "i4") target = "risk";
  const agent = s7.status === "running" ? "rp" : s8.status === "running" ? (s8.cur === "i4" ? "or" : "rp") : null;
  const story = b.alt ? [STORY[0], STORY[1], STORY[2], STORY[4], STORY[3], STORY[5], STORY[6], STORY[7]] : STORY;
  const rail = (
    <>
      <RailSection fold title="Storyline" aside={b.story ? `${b.story} beats` : "not laid out"}>
        <div data-story data-cursor="story">
          {b.alt && (
            <div className="mb-2.5">
              <StatusBadge k="warn">Alternative order: Finding 2 first</StatusBadge>
            </div>
          )}
          {!b.story ? (
            <Pending>Laid out from the frozen graph and the placement map.</Pending>
          ) : (
            <RailTable head={[["#", "w-8"], ["Beat"], ["Statements", "w-24"]]}>
              {story.slice(0, b.story).map(([k, sp], i) => (
                <M as={TableRow} key={k + b.alt} in="fade">
                  <TableCell className={cn(RC, "text-muted-foreground tabular-nums")}>{i + 1}</TableCell>
                  <TableCell className={cn(RC, b.alt && (k === "Finding 2" || k === "Finding 1") && "font-medium")}>
                    {k}
                  </TableCell>
                  <TableCell className={cn(RC, "font-mono text-muted-foreground")}>{sp}</TableCell>
                </M>
              ))}
            </RailTable>
          )}
        </div>
      </RailSection>
      <RailSection fold title="Move patterns" aside={S.jr.rulesOnly ? "CARS, default" : "CARS, from JFE-IRJ-v2"}>
        <div data-cursor="moves">
          {!b.moves ? (
            <Pending>Picked after the sections have their statements.</Pending>
          ) : (
            <RailTable head={[["Section", "w-24"], ["Moves, in order"]]}>
              {CARS.map(([sec, ...moves]) => (
                <M as={TableRow} key={sec} in="fade">
                  <TableCell className={cn(RC, "font-medium")}>{sec}</TableCell>
                  <TableCell className={RC}>{moves.join(" → ")}</TableCell>
                </M>
              ))}
            </RailTable>
          )}
        </div>
      </RailSection>
      <RailSection fold title="Line-up check" aside={b.aligned ? "passed" : "not run"}>
        <div data-cursor="aligned" className="flex flex-col items-start gap-2 text-xs leading-relaxed">
          {b.aligned ? (
            <>
              <StatusBadge k="ok">Passed</StatusBadge>
              <span>The question asks about recall, the method measures recall, the results report recall.</span>
            </>
          ) : (
            <Pending>Question, method and results must measure the same thing.</Pending>
          )}
        </div>
      </RailSection>
      <RailSection
        fold
        lead={s8.cur === "i4" || b.risk}
        title="SmartPause"
        aside={b.risk ? "no stop needed" : "risk per paragraph"}
      >
        <div data-cursor="risk">
          {!b.risk ? (
            <Pending>Scored once every paragraph has a brief. Above 0.5, you would be asked.</Pending>
          ) : (
            <>
              <Note>A paragraph scoring above 0.5 would stop the run for you.</Note>
              <RailTable head={[["Paragraph"], ["Risk", "w-12"], ["", "w-24"]]}>
                {RISK.map(([k, v]) => {
                  const blocked = k.includes("blocked");
                  return (
                    <M as={TableRow} key={k} in="fade">
                      <TableCell className={RC}>{k.replace(" (blocked)", "")}</TableCell>
                      <TableCell className={cn(RC, "tabular-nums")}>{blocked ? "—" : v.toFixed(2)}</TableCell>
                      <TableCell className={RC}>
                        {blocked ? (
                          <StatusBadge k="na">Blocked</StatusBadge>
                        ) : v > 0.5 ? (
                          <StatusBadge k="warn">Ask you</StatusBadge>
                        ) : (
                          <StatusBadge k="ok">No stop</StatusBadge>
                        )}
                      </TableCell>
                    </M>
                  );
                })}
              </RailTable>
            </>
          )}
        </div>
      </RailSection>
    </>
  );
  return (
    <PaperDesk
      host={host}
      rail={rail}
      cursors={
        <AgentCursor
          agent={live ? agent : null}
          host={host}
          target={target}
          version={`${b.story}-${b.placed}-${b.briefs}-${b.roles}-${b.blocked}-${b.risk}`}
        />
      }
    />
  );
}

/* ---------- S11–S12 draft, then read back ---------- */
function sectionState(k: string) {
  const ps = PARAS.filter((p) => p.sec === k && p.s?.length && paraOn(p));
  const done = ps.filter((p) => S.pp.typed[p.id] === Number.POSITIVE_INFINITY || movedOut(p)).length;
  const writing = ps.some((p) => Object.values(S.pp.writing).includes(p.id));
  return { n: ps.length, done, s: writing ? "writing" : ps.length && done === ps.length ? "done" : "planned" };
}
function Sections() {
  return (
    <RailTable head={[["Section"], ["Paragraphs", "w-20"], ["", "w-24"]]}>
      {SEC_ORDER.map((k) => {
        const { n, done, s } = sectionState(k);
        return (
          <TableRow key={k}>
            <TableCell className={cn(RC, s === "writing" && "font-medium")}>
              {SEC_OF[k][2] ? `${SEC_OF[k][2]}. ` : ""}
              {SEC_OF[k][1]}
            </TableCell>
            <TableCell className={cn(RC, "text-muted-foreground tabular-nums")}>
              {done} of {n}
            </TableCell>
            <TableCell className={RC}>
              {s === "writing" ? (
                <StatusBadge k="now">Writing</StatusBadge>
              ) : s === "done" ? (
                <StatusBadge k="ok">Drafted</StatusBadge>
              ) : (
                <StatusBadge k="na">Planned</StatusBadge>
              )}
            </TableCell>
          </TableRow>
        );
      })}
    </RailTable>
  );
}
function Ledger() {
  return (
    <>
      <Note>Every number in the draft is copied from one of these rows of results.csv. None is typed.</Note>
      <RailTable head={[["Row", "w-20"], ["Holds"], ["Used", "w-12 text-right"]]}>
        {EVSRC.map(([id, detail]) => {
          const used = S.pp.used[id] ?? 0;
          return (
            <TableRow key={id} data-source={id} className={cn(!used && "text-muted-foreground")}>
              <TableCell className={cn(RC, "font-mono")}>{id}</TableCell>
              <TableCell className={RC}>{detail}</TableCell>
              <TableCell className={cn(RC, "text-right tabular-nums")}>
                <Bump k={used} className="inline-block">
                  {used || "—"}
                </Bump>
              </TableCell>
            </TableRow>
          );
        })}
      </RailTable>
    </>
  );
}
function Glossary() {
  return (
    <>
      <Note>Every writer uses the same word for the same thing.</Note>
      <RailTable head={[["Use"], ["Instead of"], ["Note"]]}>
        {GLOSS.map(([use, avoid, note], i) => (
          <TableRow
            key={use}
            className={cn("transition-colors duration-500", i === 0 && S.pp.rev.g1 === "fix" && "bg-emerald-500/10")}
          >
            <TableCell className={cn(RC, "font-medium")}>{use}</TableCell>
            <TableCell className={cn(RC, "text-muted-foreground")}>{avoid}</TableCell>
            <TableCell className={cn(RC, "text-muted-foreground")}>{note}</TableCell>
          </TableRow>
        ))}
      </RailTable>
    </>
  );
}
export const REV_OF: Record<string, string> = { add: "drift", weak: "sc", miss: "om", cite: "cd", lang: "ten" };
const SEV: Record<string, [string, string]> = {
  critical: ["bad", "Critical"],
  scientific: ["warn", "Scientific"],
  citation: ["info", "Citation"],
  language: ["na", "Language"],
};
function ReadBack() {
  const rv = S.rv;
  const found = RV_ISS.filter((iss) => S.pp.flags[REV_OF[iss.k]]);
  if (!rv.delta)
    return <Pending>{rv.reading ? "Reading the draft without the plan…" : "Runs when the draft is done."}</Pending>;
  return (
    <>
      <Note>The draft is turned back into an argument map and compared with the frozen graph, claim by claim.</Note>
      <RailTable head={[["#", "w-8"], ["Issue"], ["", "w-24"]]}>
        {found.map((iss) => {
          const fixed = S.pp.rev[REV_OF[iss.k]] !== "flag";
          const [k, label] = SEV[iss.sev];
          return (
            <M as={TableRow} key={iss.n} in="fade">
              <TableCell className={cn(RC, "text-muted-foreground tabular-nums")}>{iss.n}</TableCell>
              <TableCell className={RC}>
                <span className="font-medium">{iss.t}</span>
                <span className="text-muted-foreground"> · {iss.w}</span>
                <span className="mt-0.5 block text-muted-foreground">{fixed ? iss.fix : iss.route}</span>
              </TableCell>
              <TableCell className={RC}>
                {fixed ? <StatusBadge k="ok">Fixed</StatusBadge> : <StatusBadge k={k}>{label}</StatusBadge>}
              </TableCell>
            </M>
          );
        })}
      </RailTable>
    </>
  );
}
export function WriteScene({ live }: { live: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const s9 = S.st.S11;
  const s10 = S.st.S12;
  const rv = S.rv;
  const writers = Object.entries(S.pp.writing);
  let single: string | null = null;
  let target: string | null = null;
  if (s9.cur === "j2" || s9.cur === "j3" || s9.cur === "j4" || s9.cur === "G2") single = "sw";
  if (s9.cur === "j2") target = "para:TAB1";
  if (s9.cur === "j3") target = "rev:g1";
  if (s9.cur === "j4" || s9.cur === "G2") target = "para:RES-4";
  if (s10.status === "running") {
    single = "rv";
    target =
      s10.cur === "k1"
        ? "para:INT-1"
        : s10.cur === "k3"
          ? "rev:drift"
          : s10.cur === "k4"
            ? "rev:ten"
            : s10.cur === "K12"
              ? "rev:sc"
              : "para:RES-1";
  }
  const drafted = SEC_ORDER.filter((k) => sectionState(k).s === "done").length;
  const used = Object.values(S.pp.used).reduce((a, b) => a + b, 0);
  const rail = (
    <>
      <RailSection fold title="Sections" aside={`${drafted} of ${SEC_ORDER.length} drafted`}>
        <Sections />
      </RailSection>
      <RailSection fold title="Numbers from the evidence ledger" aside={used ? `${used} placed` : "none yet"}>
        <Ledger />
      </RailSection>
      <RailSection fold title="Shared terms" aside={`${GLOSS.length} terms`}>
        <Glossary />
      </RailSection>
      <RailSection
        fold
        lead={s10.status !== "pending"}
        title="Read-back"
        aside={
          rv.delta ? `${DLT.filter((d) => d[4] === "ok").length} of ${DLT.length} claims match` : "against graph v1"
        }
      >
        <ReadBack />
      </RailSection>
    </>
  );
  const cursors = (
    <>
      {writers.map(([w, id]) => (
        <AgentCursor key={w} agent={live ? w : null} host={host} target={`caret:${w}`} version={S.pp.typed[id]} />
      ))}
      <AgentCursor
        agent={live && !writers.length ? single : null}
        host={host}
        target={target}
        version={`${S.pp.table}-${rv.delta}-${rv.rolled}`}
      />
    </>
  );
  return <PaperDesk host={host} rail={rail} cursors={cursors} />;
}

/* ---------- S13–S14 journal fit and review ---------- */
export const STANCE: Record<string, { label: string; icon: string; chip: string }> = {
  me: { label: "Challenges", icon: "swords", chip: "bg-orange-500/10 text-orange-700 dark:text-orange-300" },
  ev: { label: "Tests", icon: "flask", chip: "bg-blue-500/10 text-blue-700 dark:text-blue-300" },
  wt: { label: "Refines", icon: "pen", chip: "bg-sky-500/10 text-sky-700 dark:text-sky-300" },
};
export function ReviewBoard() {
  const r = S.rev;
  const order: [string, number][] = [];
  for (const rv of REVIEWERS) for (let i = 0; i < rv.notes.length; i++) order.push([rv.k, i]);
  const shown = new Set(order.slice(0, r.notes).map(([k, i]) => `${k}${i}`));
  return (
    <Card className="@container">
      <ColHead title="Three reviewers, read separately" aside={`${r.notes} of ${order.length} notes`} />
      <ul className="grid divide-y border-b @2xl:grid-cols-3 @2xl:divide-x @2xl:divide-y-0">
        {REVIEWERS.map((rv) => {
          const done = rv.notes.every((_, i) => shown.has(`${rv.k}${i}`));
          return (
            <li key={rv.k} className="flex min-w-0 items-center gap-2.5 px-4 py-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted font-semibold text-[10px] text-muted-foreground">
                {rv.i}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium text-sm">{rv.n}</span>
              {done ? (
                <M as="span" in="fade">
                  <StatusBadge k={rv.verdict[1]}>{rv.verdict[0]}</StatusBadge>
                </M>
              ) : (
                <span className="text-muted-foreground text-xs">Reading…</span>
              )}
            </li>
          );
        })}
      </ul>
      <Table className="table-fixed">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-28 pl-4 @2xl:w-44">Reviewer</TableHead>
            <TableHead>Note</TableHead>
            <TableHead className="hidden w-32 pr-4 @2xl:table-cell">Kind</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {REVIEWERS.flatMap((rv) =>
            rv.notes.map((n, i) => {
              const on = shown.has(`${rv.k}${i}`);
              const st = STANCE[rv.k];
              const dis = r.disagree && ((rv.k === "me" && i === 0) || (rv.k === "ev" && i === 1));
              const orig = rv.k === "ev" && i === 2 && r.orig;
              return (
                <TableRow
                  key={`${rv.k}${n[0]}`}
                  className={cn("transition-colors duration-500", dis && "bg-amber-500/8 hover:bg-amber-500/10")}
                >
                  <TableCell className={cn(TABLE_PAD, "text-muted-foreground")}>
                    {rv.n.replace(" reviewer", "")}
                  </TableCell>
                  <TableCell className={TABLE_PAD}>
                    <Slot on={on} w="w-4/5">
                      <span className="text-muted-foreground">{n[0]} · </span>
                      {n[1]}
                    </Slot>
                    {dis && (
                      <M as="span" in="fade" className="mt-1.5 block">
                        <StatusBadge k="warn">Disagrees with the other reviewer</StatusBadge>
                      </M>
                    )}
                    {orig && (
                      <M as="span" in="fade" className="mt-1.5 block">
                        <StatusBadge k="ok">Holds in all 18 papers</StatusBadge>
                      </M>
                    )}
                  </TableCell>
                  <TableCell className={cn(TABLE_PAD, "hidden @2xl:table-cell")}>
                    {on && (
                      <Badge variant="outline" className={cn("gap-1 border-transparent", st.chip)}>
                        <Icon n={st.icon} className="size-3" />
                        {st.label}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            }),
          )}
        </TableBody>
      </Table>
      {r.choice && (
        <M as="p" in="fade" className="flex items-start gap-2 border-t px-4 py-3 text-muted-foreground text-xs">
          <Icon n="corner" className="mt-0.5 size-3.5" />
          <span>
            Both reports stay as written. The backlog follows your choice:{" "}
            {r.choice === "m" ? "rerun within length bins (comment 1)" : "keep the line in Limits (comment 3)"}.
          </span>
        </M>
      )}
    </Card>
  );
}
const PRIORITY: Record<string, [string, string]> = {
  high: ["bad", "High"],
  med: ["warn", "Medium"],
  low: ["na", "Low"],
};
export function ReviewScene({ live }: { live: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const f = S.fit;
  const s11 = S.st.S13;
  const s12 = S.st.S14;
  let target: string | null = null;
  let agent: string | null = null;
  if (s11.status === "running") {
    agent = "js";
    target =
      s11.cur === "l3"
        ? f.edits >= 3
          ? "sig"
          : f.edits === 2
            ? "rev:dis"
            : "rev:rel"
        : s11.cur === "l4"
          ? "sig"
          : "fit";
  }
  if (s12.status === "running") {
    agent = "rb";
    target = s12.cur === "m4" ? "backlog" : "para:RES-1";
  }
  const outside = FIT.slice(0, f.rows).filter(([, , , , q1, q3, , v]) => v < q1 || v > q3).length;
  const intro = MOVES[1];
  const disc = MOVES[3];
  const rail = (
    <>
      <RailSection
        fold
        title="Journal fit"
        aside={
          S.jr.rulesOnly
            ? "publisher's rules"
            : f.rows
              ? `${f.rows - outside} of ${f.rows} in the usual range`
              : "vs 212 papers"
        }
      >
        <div data-cursor="fit">
          {!f.rows && (
            <Pending>
              {S.jr.rulesOnly
                ? "Checked against the publisher's rules; no profile was built."
                : "Measured against IR Journal's own papers (JFE-IRJ-v2, 212 papers)."}
            </Pending>
          )}
          {f.rows > 0 && S.jr.rulesOnly && (
            <RailTable head={[["Rule", "w-28"], ["Draft"]]}>
              {FIT_RULES.slice(0, f.rows).map(([k, v]) => (
                <M as={TableRow} key={k} in="fade">
                  <TableCell className={cn(RC, "font-medium")}>{k}</TableCell>
                  <TableCell className={RC}>
                    <StatusBadge k="ok">{v}</StatusBadge>
                  </TableCell>
                </M>
              ))}
            </RailTable>
          )}
          {f.rows > 0 && !S.jr.rulesOnly && (
            <>
              <Note>Typical is the middle half of the journal's papers.</Note>
              <RailTable head={[["Measure"], ["Typical", "w-20"], ["Draft", "w-20"]]}>
                {FIT.slice(0, f.rows).map(([k, unit, , , q1, q3, , v, suf]) => {
                  const out = v < q1 || v > q3;
                  return (
                    <M as={TableRow} key={k} in="fade">
                      <TableCell className={RC}>
                        {k}
                        <span className="block text-muted-foreground">{unit}</span>
                      </TableCell>
                      <TableCell className={cn(RC, "text-muted-foreground tabular-nums")}>
                        {q1}–{q3}
                        {suf}
                      </TableCell>
                      <TableCell className={RC}>
                        <StatusBadge k={out ? "warn" : "ok"}>
                          {v}
                          {suf}
                        </StatusBadge>
                      </TableCell>
                    </M>
                  );
                })}
              </RailTable>
            </>
          )}
        </div>
      </RailSection>
      <RailSection
        fold
        title="Order of moves"
        aside={f.moves ? "1 move missing" : S.jr.rulesOnly ? "no profile" : "not compared"}
      >
        {!f.moves ? (
          <Pending>
            {S.jr.rulesOnly
              ? "No typical order to compare with: the profile was never built."
              : "Compared with the order most of the journal's papers use."}
          </Pending>
        ) : (
          <>
            {J.an?.prov && (
              <Note>
                “Compare with prior work” is provisional in JFE-IRJ-v2, so its absence is reported, not advised.
              </Note>
            )}
            <RailTable head={[["Section", "w-24"], ["In the draft"]]}>
              <M as={TableRow} in="fade">
                <TableCell className={cn(RC, "font-medium")}>Introduction</TableCell>
                <TableCell className={RC}>
                  {intro[1].join(" → ")}
                  <span className="mt-1.5 block">
                    <StatusBadge k="ok">As in {MOVES[0][2]}</StatusBadge>
                  </span>
                </TableCell>
              </M>
              <M as={TableRow} in="fade" delay={0.1}>
                <TableCell className={cn(RC, "font-medium")}>Discussion</TableCell>
                <TableCell className={RC}>
                  {disc[1].filter((m) => m !== "Compare with prior work").join(" → ")}
                  <span className="mt-1.5 block">
                    <StatusBadge k="warn">No “Compare with prior work”</StatusBadge>
                  </span>
                </TableCell>
              </M>
            </RailTable>
          </>
        )}
      </RailSection>
      <RailSection fold title="Style edits" aside={f.edits ? `${f.edits} of ${EDITS.length}` : "meaning must not move"}>
        {!f.edits ? (
          <Pending>Each edit is checked against graph v1; an edit that moves the meaning is reverted.</Pending>
        ) : (
          <RailTable head={[["Where", "w-14"], ["Edit"], ["", "w-24"]]}>
            {EDITS.slice(0, f.edits).map((e) => (
              <M as={TableRow} key={e.p} in="fade">
                <TableCell className={cn(RC, "tabular-nums")}>{paraLabel(PARA_BY[e.p])}</TableCell>
                <TableCell className={RC}>{e.ok ? e.why : e.why.replace(/^Reverted: t/, "T")}</TableCell>
                <TableCell className={RC}>
                  {e.ok ? <StatusBadge k="ok">Kept</StatusBadge> : <StatusBadge k="bad">Reverted</StatusBadge>}
                </TableCell>
              </M>
            ))}
          </RailTable>
        )}
      </RailSection>
      <RailSection fold title="Exceptions" aside="reported, not forced">
        {!f.exceptions ? (
          <Pending>Listed at the end of the fit check.</Pending>
        ) : S.jr.rulesOnly ? (
          <Pending>None: without a profile there is no usual range.</Pending>
        ) : (
          <RailTable head={[["Outside the usual range, and why it stays"]]}>
            {EXCEPTIONS.map(([k, v]) => (
              <M as={TableRow} key={k} in="fade">
                <TableCell className={RC}>
                  <span className="font-medium">{k}.</span> <span className="text-muted-foreground">{v}</span>
                </TableCell>
              </M>
            ))}
          </RailTable>
        )}
      </RailSection>
      <RailSection fold title="Issue backlog" aside={S.rev.backlog ? `${S.rev.backlog} ranked` : "after the review"}>
        <div data-cursor="backlog">
          {!S.rev.backlog ? (
            <Pending>Ranked after you settle the disagreement.</Pending>
          ) : (
            <RailTable head={[["Priority", "w-24"], ["Issue"]]}>
              {BACKLOG.slice(0, S.rev.backlog).map(([sev, t, route], i) => {
                const keep = i === 0 && S.rev.choice === "e";
                const [k, label] = PRIORITY[sev];
                return (
                  <M as={TableRow} key={t} in="fade">
                    <TableCell className={RC}>
                      <StatusBadge k={k}>{label}</StatusBadge>
                    </TableCell>
                    <TableCell className={RC}>
                      {keep ? "Keep the length caveat in 5.2 as written" : t}
                      <span className="mt-0.5 block text-muted-foreground">{keep ? "No change · 5.2" : route}</span>
                    </TableCell>
                  </M>
                );
              })}
            </RailTable>
          )}
        </div>
      </RailSection>
    </>
  );
  return (
    <PaperDesk
      host={host}
      comments={true}
      top={s12.status !== "pending" && <ReviewBoard />}
      rail={rail}
      cursors={
        <AgentCursor
          agent={live ? agent : null}
          host={host}
          target={target}
          version={`${f.rows}-${f.edits}-${S.rev.notes}-${S.rev.backlog}`}
        />
      }
    />
  );
}

/* ---------- S15–S16 revise and sign ---------- */
export function RunEnd() {
  const written = Object.values(S.pp.typed).filter((v) => v === Number.POSITIVE_INFINITY).length;
  return (
    <Card>
      <div className="flex items-start gap-3 border-b px-4 py-3.5">
        <Icon n="circleCheck" className="mt-0.5 size-4 text-emerald-600" />
        <div className="min-w-0">
          <b className="block font-semibold text-sm">Signed. The manuscript is submission-ready.</b>
          <p className="mt-0.5 text-muted-foreground text-sm">
            Written from the research record, argued, evaluated and checked against the claims you locked. ASW never
            submits; you send it when you choose.
          </p>
        </div>
      </div>
      <JStats
        items={[
          ["Intake checks", String(INTAKE_CHECKS.length), `${INTAKE.length} parts of RUN-25CD`],
          ["Report fields", String(REPORT_FIELDS.length), "24 required, all present"],
          [
            "Debate turns",
            String(turnsShown().length),
            `${turnsShown().filter((t) => t.st === "rule").length} rulings`,
          ],
          ["Claims locked", String(S.picked.length || 4), `graph v${S.map.version}, all IN`],
          ["Paragraphs written", String(written), "4.4 left empty"],
          ["Your decisions", String(S.decisions.filter((d) => d.actor === "you").length), "stops, checks and cases"],
        ]}
      />
    </Card>
  );
}
export function SignoffScene({ live }: { live: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const x = S.fix;
  const o = S.so;
  const s13 = S.st.S15;
  const s14 = S.st.S16;
  const ids = patchIds();
  const patches = PATCHES.filter((p) => ids.includes(p[4]));
  const rerun = S.rev.choice !== "e";
  const sdiff =
    rerun && !x.reverted
      ? SDIFF
      : SDIFF.filter((r) => r[0] !== "Number").map((r): [string, string, string, string] =>
          r[0] === "Qualifier" ? [r[0], r[1], "unchanged · the caveat stays in 5.2", "ok"] : r,
        );
  const reruns: [string, string, string][] =
    rerun && !x.reverted ? RERUNS : [["S07", "No new analysis", "not run"], ...RERUNS.slice(1)];
  let target: string | null = null;
  let agent: string | null = null;
  if (s13.status === "running") {
    agent = "re";
    target = s13.cur === "n2" ? `rev:${ids[Math.max(0, x.patches - 1)]}` : s13.cur === "n1" ? "para:RES-2" : "sdiff";
  }
  if (s14.status === "running") {
    agent = "re";
    target = s14.cur === "o3" ? "ai" : "checks";
  }
  const rail = (
    <>
      {S.scn === "cap" && x.tries > 0 && (
        <RailSection fold title="Revision rounds" aside={`${x.tries} of 3, the cap`}>
          {(x.edited || x.reverted) && (
            <Note>
              {x.edited
                ? "Your edit of 4.2 passed the read-back."
                : "4.2 is back to draft 1; comment 1 stays open in the response letter."}
            </Note>
          )}
          <RailTable head={[["Round", "w-20"], ["What the read-back found"]]}>
            {CAP_TRIES.slice(0, x.tries).map(([r, t, by]) => (
              <M as={TableRow} key={r} in="fade">
                <TableCell className={RC}>
                  <StatusBadge k="bad">{r.replace("Round ", "")}</StatusBadge>
                </TableCell>
                <TableCell className={RC}>
                  {t}
                  <span className="mt-0.5 block text-muted-foreground">{by}</span>
                </TableCell>
              </M>
            ))}
          </RailTable>
        </RailSection>
      )}
      <RailSection fold title="Patches" aside={`${x.patches} of ${patches.length}`}>
        {!x.patches ? (
          <Pending>Only the sentences an issue touches are changed.</Pending>
        ) : (
          <RailTable head={[["Where", "w-16"], ["Change"]]}>
            {patches.slice(0, x.patches).map(([where, from, to, why]) => (
              <M as={TableRow} key={where} in="fade">
                <TableCell className={cn(RC, "tabular-nums")}>{where}</TableCell>
                <TableCell className={RC}>
                  {why}
                  <span className="mt-0.5 block text-muted-foreground">
                    {from === "—" ? `Added: “${to}”` : `“${from}” → “${to}”`}
                  </span>
                </TableCell>
              </M>
            ))}
          </RailTable>
        )}
      </RailSection>
      <RailSection fold title="Science diff" aside={x.sdiff ? `${sdiff.length} checks` : "after the patches"}>
        <div data-cursor="sdiff">
          {!x.sdiff ? (
            <Pending>What the patches changed in the science, shown once they are in.</Pending>
          ) : (
            <RailTable head={[["Check"], ["Result"]]}>
              {sdiff.map(([k, what, v, tone], i) => (
                <M as={TableRow} key={k} in="fade" delay={i * 0.06}>
                  <TableCell className={RC}>
                    <span className="font-medium">{k}</span>
                    <span className="mt-0.5 block text-muted-foreground">{what}</span>
                  </TableCell>
                  <TableCell className={RC}>
                    <StatusBadge k={tone === "ok" ? "ok" : "warn"}>{tone === "ok" ? "Holds" : "New"}</StatusBadge>
                    <span className="mt-1 block text-muted-foreground">{v}</span>
                  </TableCell>
                </M>
              ))}
            </RailTable>
          )}
        </div>
      </RailSection>
      <RailSection fold title="Checks run again" aside={x.reruns ? `${x.reruns} of ${reruns.length}` : "affected only"}>
        {!x.reruns ? (
          <Pending>Only the checks the patches touch are run again.</Pending>
        ) : (
          <>
            {x.snap && <Note>Draft 2 is saved as a new hashed version. Draft 1 is kept unchanged.</Note>}
            <RailTable head={[["Stage", "w-14"], ["Check"], ["", "w-28"]]}>
              {reruns.slice(0, x.reruns).map(([k, t, r]) => {
                const pass = r === "pass" || r.startsWith("IN");
                return (
                  <M as={TableRow} key={k} in="fade">
                    <TableCell className={cn(RC, "font-mono text-muted-foreground")}>{k}</TableCell>
                    <TableCell className={RC}>{t}</TableCell>
                    <TableCell className={RC}>
                      {pass ? (
                        <StatusBadge k="ok">Pass</StatusBadge>
                      ) : (
                        <StatusBadge k="na">{r[0].toUpperCase() + r.slice(1)}</StatusBadge>
                      )}
                    </TableCell>
                  </M>
                );
              })}
            </RailTable>
          </>
        )}
      </RailSection>
      <RailSection
        fold
        lead={s14.status !== "pending"}
        title="Submission checklist"
        aside={o.checks ? `${o.checks} of ${CHECKS.length}` : ""}
      >
        <div data-cursor="checks">
          {!o.checks ? (
            <Pending>Checked after the revision.</Pending>
          ) : (
            <RailTable head={[["Item"], ["", "w-28"]]}>
              {CHECKS.slice(0, o.checks).map(([k, v, t]) => (
                <M as={TableRow} key={k} in="fade">
                  <TableCell className={RC}>
                    <span className="font-medium">{k}</span>
                    <span className="mt-0.5 block text-muted-foreground">{v}</span>
                  </TableCell>
                  <TableCell className={RC}>
                    {t === "ok" ? <StatusBadge k="ok">Pass</StatusBadge> : <StatusBadge k="warn">Note</StatusBadge>}
                  </TableCell>
                </M>
              ))}
              {o.ledger &&
                ["ApprovalLedger.json", "SubmissionPackage.zip"].map((f) => (
                  <M as={TableRow} key={f} in="fade">
                    <TableCell className={cn(RC, "font-mono")}>{f}</TableCell>
                    <TableCell className={RC}>
                      {o.signed ? (
                        <StatusBadge k="ok">Built</StatusBadge>
                      ) : (
                        <StatusBadge k="na">After you sign</StatusBadge>
                      )}
                    </TableCell>
                  </M>
                ))}
            </RailTable>
          )}
        </div>
      </RailSection>
    </>
  );
  return (
    <PaperDesk
      host={host}
      top={o.signed && <RunEnd />}
      rail={rail}
      cursors={
        <AgentCursor
          agent={live ? agent : null}
          host={host}
          target={target}
          version={`${x.patches}-${x.sdiff}-${o.checks}-${o.ai > 0}`}
        />
      }
    />
  );
}

/* ---------- the paper, once signed ---------- */
export function FinalPaper() {
  const claims: [string, string, string][] = [
    ["F1", "Fusion finds more evidence than BM25", "+0.076"],
    ["F2", "The gain is largest when evidence is spread out", "+0.094"],
    ["F3", "No clear gain at the same budget", "+0.031"],
    [
      "C",
      S.c.restated
        ? "Beats BM25; against dense retrieval the evidence is mixed"
        : "The better default for papers like those in QASPER",
      "—",
    ],
  ];
  const rail = (
    <>
      <RailSection fold title="Locked claims" aside={`graph v${S.map.version}, all IN`}>
        <RailTable head={[["", "w-10"], ["Claim"], ["Gain", "w-16 text-right"]]}>
          {claims.map(([k, t, v]) => (
            <TableRow key={k}>
              <TableCell className={cn(RC, "font-mono text-muted-foreground")}>{k}</TableCell>
              <TableCell className={RC}>{t}</TableCell>
              <TableCell className={cn(RC, "text-right tabular-nums")}>{v}</TableCell>
            </TableRow>
          ))}
        </RailTable>
      </RailSection>
      <RailSection fold title="Decisions" aside={`${S.decisions.length} in this run`}>
        <RailTable head={[["Stop", "w-14"], ["Decision"]]}>
          {S.decisions.map((d) => (
            <TableRow key={d.seq}>
              <TableCell className={cn(RC, "font-mono text-muted-foreground")}>{d.id}</TableCell>
              <TableCell className={RC}>
                {d.actor !== "you" && (
                  <span className={cn("font-medium", AGENTS[d.actor]?.text)}>{AGENTS[d.actor]?.name}: </span>
                )}
                {d.text}
              </TableCell>
            </TableRow>
          ))}
        </RailTable>
      </RailSection>
      <RailSection fold title="Submission package" aside="built and hashed">
        <ul className="flex flex-col gap-1.5 text-xs">
          {["Manuscript · PDF, DOCX, LaTeX", "ApprovalLedger.json", "DisclosureDraft.md", "SubmissionPackage.zip"].map(
            (f) => (
              <li key={f} className="flex items-center gap-2">
                <Icon n="fileCheck" className="size-3.5 text-emerald-600" />
                <span className="font-mono">{f}</span>
              </li>
            ),
          )}
        </ul>
        <p className="mt-2.5 text-muted-foreground text-xs">ASW never submits it for you.</p>
      </RailSection>
    </>
  );
  return <PaperDesk rail={rail} />;
}
