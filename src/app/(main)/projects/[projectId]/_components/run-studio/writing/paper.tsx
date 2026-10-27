"use client";
"use no memo";

// The writing run keeps its state in module variables (engine.ts) and re-renders on emit(); the React Compiler
// would memoise these components on their props and never show a change.

import { createContext, type ReactNode, useContext, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import { Caret } from "../run-bits";
import { ALLOC, COMMENTS, DATA_AV, DISCLOSURE, PLANX, REVIEWERS } from "./data/core";
import { PARAS, type Para, REFS } from "./data/paper";
import {
  briefIds,
  movedOut,
  paraLabel,
  paraOn,
  paraRoles,
  paraTokens,
  paraWords,
  type RevState,
  S,
  SEC_OF,
  SEC_ORDER,
  type Tok,
  tokLen,
} from "./engine";
import { cn, Icon, M, Strike } from "./lib";

type NumTok = Extract<Tok, { k: "n" }>;
type RevTok = Extract<Tok, { k: "r" }>;

export function NumberChip({ t, typeset, rev }: { t: NumTok; typeset: boolean; rev: RevState | null }) {
  const value = t.id && rev === "final" ? t.f : t.n;
  const body =
    t.id && rev === "fix" ? (
      <>
        <del className="bg-rose-500/12 px-0.5 text-rose-700 decoration-rose-500 dark:text-rose-300">{t.n}</del>
        <M
          as="ins"
          in="x"
          className="bg-emerald-500/12 px-0.5 text-emerald-800 no-underline shadow-[inset_0_-1.5px_0] shadow-emerald-600 dark:text-emerald-200"
        >
          {t.f}
        </M>
      </>
    ) : (
      value
    );
  return (
    <M
      as="span"
      in="fade"
      data-num={t.key}
      data-rev={t.id}
      title={`From the evidence ledger · ${t.e}`}
      className={cn(
        "cursor-help whitespace-nowrap underline decoration-dotted underline-offset-[3px] transition-colors duration-500",
        typeset ? "decoration-foreground/30" : "text-emerald-800 decoration-emerald-600/60 dark:text-emerald-300",
      )}
    >
      {body}
    </M>
  );
}
export function Cite({ c }: { c: number }) {
  return (
    <M as="span" in="fade" className="font-sans text-[0.8em] text-sky-700 dark:text-sky-300">
      [{c}]
    </M>
  );
}
/* A span that the read-back, the journal edit or the revision touches. */
export function RevSpan({ t, partial }: { t: RevTok; partial: number | null }) {
  const state = S.pp.rev[t.id];
  const flag = S.pp.flags[t.id];
  if (partial != null) return <span>{t.t.slice(0, partial)}</span>;
  if (state === "final")
    return t.f ? (
      /^\[\d\]$/.test(t.f) ? (
        <span data-rev={t.id} className="font-sans text-[0.8em] text-sky-700 dark:text-sky-300">
          {t.f}
        </span>
      ) : (
        <span data-rev={t.id}>{t.f}</span>
      )
    ) : null;
  if (state === "final-keep") return <span data-rev={t.id}>{t.t}</span>;
  /* a second change to the same span, at revision: the restored caveat is answered */
  if (state === "final2") return <span data-rev={t.id}>{t.g}</span>;
  if (state === "fix2")
    return (
      <span data-rev={t.id} data-cursor={`rev:${t.id}`}>
        <del className="bg-rose-500/12 text-rose-700 decoration-rose-500 dark:text-rose-300">{t.f}</del>
        <M
          as="ins"
          in="x"
          className="bg-emerald-500/12 text-emerald-800 no-underline shadow-[inset_0_-1.5px_0] shadow-emerald-600 dark:text-emerald-200"
        >
          {t.g}
        </M>
      </span>
    );
  if (state === "fix")
    return (
      <span data-rev={t.id} data-cursor={`rev:${t.id}`}>
        {t.t && <del className="bg-rose-500/12 text-rose-700 decoration-rose-500 dark:text-rose-300">{t.t}</del>}
        {t.f && (
          <M
            as="ins"
            in="x"
            className="bg-emerald-500/12 text-emerald-800 no-underline shadow-[inset_0_-1.5px_0] shadow-emerald-600 dark:text-emerald-200"
          >
            {t.f}
          </M>
        )}
      </span>
    );
  if (state === "flag")
    return (
      <span
        data-rev={t.id}
        data-cursor={`rev:${t.id}`}
        className="rounded-sm bg-orange-500/15 shadow-[inset_0_-2px_0] shadow-orange-500 transition-colors duration-500"
      >
        {t.t || (
          <span className="font-sans text-[0.8em] text-orange-700 italic dark:text-orange-300">[caveat missing]</span>
        )}
        <M
          as="sup"
          in="fade"
          title={`Read-back issue ${flag}`}
          className="ml-0.5 font-sans font-semibold text-[10px] text-orange-700 dark:text-orange-300"
        >
          {flag}
        </M>
      </span>
    );
  return t.t ? (
    <span data-rev={t.id} data-cursor={`rev:${t.id}`}>
      {t.t}
    </span>
  ) : null;
}
/* Typed text up to `typed` units; numbers and citations arrive whole. */
export function ParaText({ p, typed, caret, writer }: { p: Para; typed: number; caret: boolean; writer?: string }) {
  const toks = paraTokens(p);
  let left = typed;
  const out: ReactNode[] = [];
  let sigDone = false;
  for (const t of toks) {
    if (left <= 0) break;
    const len = tokLen(t);
    const part = left < len ? left : null;
    left -= len;
    if (t.k === "t") {
      const text = part != null ? t.t.slice(0, part) : t.t;
      if (p.id === "RES-2" && !sigDone && S.pp.sig && text.startsWith("The gain grew")) {
        sigDone = true;
        out.push(
          <span key={t.key}>
            The gain grew
            <span data-sig data-cursor="sig">
              {S.pp.sig === "ins" ? (
                <M
                  as="ins"
                  in="x"
                  className="bg-emerald-500/12 text-emerald-800 no-underline shadow-[inset_0_-1.5px_0] shadow-emerald-600 dark:text-emerald-200"
                >
                  {" "}
                  significantly
                </M>
              ) : (
                <>
                  <Strike className="text-rose-700 dark:text-rose-300"> significantly</Strike>
                  <M as="span" in="fade" className="ml-1 font-sans text-[0.8em] text-rose-700 dark:text-rose-300">
                    (reverted: no test was run)
                  </M>
                </>
              )}
            </span>
            {text.slice(13)}
          </span>,
        );
      } else out.push(<span key={t.key}>{text}</span>);
    } else if (t.k === "lab")
      out.push(
        <b key={t.key} className="font-sans font-semibold text-[0.92em]">
          {t.t}{" "}
        </b>,
      );
    else if (t.k === "n")
      out.push(<NumberChip key={t.key} t={t} typeset={S.pp.typeset} rev={t.id ? S.pp.rev[t.id] : null} />);
    else if (t.k === "c") out.push(<Cite key={t.key} c={t.c} />);
    else if (t.k === "r") out.push(<RevSpan key={t.key} t={t} partial={part} />);
    else if (t.k === "v") {
      const w = S.g2[t.v];
      out.push(
        <span
          key={t.key}
          className={cn(S.pp.typeset ? "" : "rounded-sm bg-sky-500/10 px-0.5 text-sky-800 dark:text-sky-200")}
          title="Wording chosen by you at stop 3"
        >
          {part != null ? w.slice(0, part) : w}
        </span>,
      );
    }
  }
  return (
    <>
      {out}
      {caret && (
        <span data-cursor={`caret:${writer}`}>
          <Caret className={writer === "rw" ? "text-yellow-600" : "text-amber-600"} />
        </span>
      )}
    </>
  );
}

/* A paragraph before it is written: grey lines, then its brief. */
export function Brief({ p, idx }: { p: Para; idx: number }) {
  const plan = PLANX[p.id];
  const blocked = p.blocked && S.bp.blocked;
  if (blocked)
    return (
      <M
        in="fade"
        data-cursor={`para:${p.id}`}
        className="mb-3 grid grid-cols-[auto_minmax(0,1fr)] gap-2.5 rounded-lg bg-destructive/5 px-3 py-2.5 font-sans text-[13px] ring-1 ring-destructive/20"
      >
        <Icon n="ban" className="mt-0.5 size-3.5 text-destructive" />
        <span>
          <b className="font-medium">{paraLabel(p)} needs evidence.</b>{" "}
          <span className="text-muted-foreground">
            {p.job} No timing log exists, so nothing is written here and no number is guessed.
          </span>
        </span>
      </M>
    );
  const roles = plan ? plan.roles.map((r) => r[1]) : paraRoles(p);
  return (
    <M
      in="fade"
      delay={idx * 0.03}
      data-cursor={`para:${p.id}`}
      className="mb-3 grid grid-cols-[3.25rem_minmax(0,1fr)] gap-x-3 gap-y-1 rounded-lg bg-muted/60 px-3 py-2.5 font-sans text-[13px]"
    >
      <span className="text-muted-foreground tabular-nums">{paraLabel(p) || "Abstract"}</span>
      <span className="text-foreground/85">{p.job}</span>
      {S.bp.roles && (
        <M in="fade" className="col-start-2 text-muted-foreground text-xs">
          {roles.join(" · ")}
          {(p.uses ?? []).length > 0 && <> · from {(p.uses ?? []).join(", ")}</>}
        </M>
      )}
    </M>
  );
}

export function Table1() {
  const rows: [string, string, string][] = [
    ["BM25", "0.612", "—"],
    ["Dense (E5-base)", "0.641", "0.029"],
    ["Fusion (RRF)", "0.688", "0.076"],
  ];
  const shown = S.pp.table;
  return (
    <M as="figure" in="up6" data-para="TAB1" className="relative my-4 font-sans">
      <figcaption className="mb-1.5 text-muted-foreground text-xs">
        <b className="text-foreground">Table 1.</b> Recall at 10 on 1,169 eligible QASPER test questions, mean of five
        seeds.
      </figcaption>
      <table className="w-full border-foreground border-y-[1.5px] text-sm">
        <thead>
          <tr className="border-foreground border-b">
            {["System", "Recall@10", "Gain over BM25"].map((x) => (
              <th key={x} className="px-2 py-1.5 text-left font-semibold">
                {x}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={r[0]}>
              <td className="px-2 py-1">{r[0]}</td>
              {[1, 2].map((ci) => {
                const n = ri * 2 + ci;
                return (
                  <td key={ci} className="px-2 py-1 font-mono" data-cell={n}>
                    {n <= shown ? (
                      <M as="span" in="fade">
                        {r[ci]}
                      </M>
                    ) : (
                      <Skeleton
                        aria-hidden="true"
                        className={cn("h-2.5 rounded-full", S.stage !== "S11" && "animate-none", "w-12")}
                      />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </M>
  );
}
/* the primary hypotheses and what became of them */
export function Table2() {
  const f3 = S.stm.f3 === "limitation";
  const rows = [
    ["H1", "Fusion beats BM25 on recall at 10", "A1", "Supported", "ok"],
    ["H2", "The gain is larger when evidence is spread", "A2", "Supported", "ok"],
    [
      "H4",
      "The gain holds at the same budget",
      "A3",
      f3 ? "Not supported · see 5.2" : "Not supported · inconclusive",
      "warn",
    ],
  ];
  return (
    <M as="figure" in="up6" data-para="TAB2" className="relative my-4 font-sans">
      <figcaption className="mb-1.5 text-muted-foreground text-xs">
        <b className="text-foreground">Table 2.</b> The primary hypotheses of the locked plan, the analysis that tested
        each, and its outcome.
      </figcaption>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-foreground border-y-[1.5px] text-sm">
          <thead>
            <tr className="border-foreground border-b">
              {["", "Hypothesis", "Analysis", "Outcome"].map((x) => (
                <th key={x || "id"} className="px-2 py-1.5 text-left font-semibold">
                  {x}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([h, t, a, o, tone]) => (
              <tr key={h}>
                <td className="px-2 py-1 font-mono">{h}</td>
                <td className="px-2 py-1">{t}</td>
                <td className="px-2 py-1 font-mono">{a}</td>
                <td
                  className={cn("px-2 py-1", tone === "warn" && !S.pp.typeset && "text-amber-700 dark:text-amber-300")}
                >
                  {o}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </M>
  );
}
export function Figure2() {
  const bars: [string, number, string][] = [
    ["Evidence in one paragraph", 0.051, "0.051"],
    ["Evidence spread out", 0.094, "0.094"],
  ];
  return (
    <M as="figure" in="up6" data-para="FIG2" className="my-5 font-sans">
      <div className="rounded-lg bg-muted/50 px-4 py-3.5">
        {bars.map(([label, v, txt], i) => (
          <div
            key={label}
            className="grid grid-cols-[150px_minmax(0,1fr)_44px] items-center gap-2.5 py-1 text-xs max-sm:grid-cols-[96px_minmax(0,1fr)_40px]"
          >
            <span className="text-muted-foreground">{label}</span>
            <i className="h-3 overflow-hidden rounded-full bg-foreground/5">
              {S.pp.fig && (
                <M
                  as="b"
                  in="grow"
                  delay={i * 0.15}
                  className={cn("block h-full origin-left rounded-full", i ? "bg-blue-600" : "bg-blue-500/45")}
                  style={{ width: `${(v / 0.1) * 100}%` }}
                />
              )}
            </i>
            <b className="text-right font-mono">{S.pp.fig ? txt : ""}</b>
          </div>
        ))}
      </div>
      <figcaption className="mt-1.5 text-muted-foreground text-xs">
        <b className="text-foreground">Figure 2.</b> Gain in recall at 10 over BM25, by how spread out the marked
        evidence is.
      </figcaption>
    </M>
  );
}

/* The page itself. `mode` decides what a paragraph shows when it has no text yet. */
export function PaperPage({ comments = false }: { comments?: boolean }) {
  const writingOf = Object.fromEntries(Object.entries(S.pp.writing).map(([w, id]) => [id, w]));
  const sec = (k: string) => {
    const [, title, num, budget] = SEC_OF[k];
    const placed = ALLOC.slice(0, S.bp.placed).find((a) => a[0] === k);
    const paras = PARAS.filter((p) => p.sec === k && paraOn(p));
    return (
      <section key={k} className="relative" data-sec={k}>
        {k !== "ABS" && (
          <h3 className="mt-7 mb-2.5 flex flex-wrap items-baseline gap-x-2.5 font-sans font-semibold text-[15px] tracking-tight">
            {num}. {title}
            {!S.pp.typeset && (
              <span className="font-normal text-muted-foreground text-xs">
                {budget}
                {placed && (
                  <M as="span" in="fade">
                    {" "}
                    · carries {placed[1].join(", ")}
                  </M>
                )}
              </span>
            )}
          </h3>
        )}
        {paras.map((p) => paraBlock(p, writingOf, comments))}
      </section>
    );
  };
  return (
    <article
      data-page
      className="relative min-w-0 rounded-xl bg-card px-5 pt-7 pb-10 font-serif text-[15.5px] text-card-foreground leading-[1.72] ring-1 ring-foreground/10 sm:px-12 sm:pt-10"
    >
      <header className="mb-6 border-b pb-5 font-sans">
        <p className="flex flex-wrap items-center justify-between gap-2 text-muted-foreground text-xs">
          <span>IR Journal (example) · Research article</span>
          {S.so.signed ? (
            <Badge
              variant="outline"
              className="gap-1 border-transparent bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
            >
              <Icon n="check" className="size-3" />
              Signed
            </Badge>
          ) : (
            <Badge variant="secondary">Draft {S.pp.draft}</Badge>
          )}
        </p>
        <h2 className="mt-3 text-balance font-semibold font-serif text-[23px] leading-snug tracking-tight">
          Fusing lexical and dense retrieval finds more evidence in long scientific papers
        </h2>
        <p className="mt-2 text-muted-foreground text-xs">A. Researcher (example) · B. Co-author (example)</p>
      </header>
      {SEC_ORDER.map(sec)}
      {(S.so.ai > 0 || S.st.S16.done.includes("o3")) && (
        <section data-ai className="mt-7 border-t pt-5 font-sans text-[13px] leading-relaxed">
          <h3 className="mb-1.5 font-semibold text-sm">Data availability</h3>
          <p className="mb-3 text-foreground/85">{DATA_AV}</p>
          <h3 className="mb-1.5 font-semibold text-sm">Use of AI</h3>
          <p className="text-foreground/85">
            {DISCLOSURE.slice(0, S.so.ai)}
            {S.so.ai < DISCLOSURE.length && <Caret className="text-fuchsia-600" />}
          </p>
        </section>
      )}
      {S.pp.typed.ABS != null || S.so.signed ? (
        <section className="mt-7 border-t pt-5 font-sans">
          <h3 className="mb-2 font-semibold text-sm">References</h3>
          <ol className="flex flex-col gap-1.5 text-[12.5px] leading-snug">
            {REFS.map((r, i) => (
              <li key={r} className="grid grid-cols-[28px_1fr]">
                <span className="pt-px font-mono text-muted-foreground text-xs">[{i + 1}]</span>
                <span>{r}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </article>
  );
}

export function paraBlock(p: Para, writingOf: Record<string, string>, comments: boolean) {
  if (p.kind === "table2")
    return S.pp.table > 0 && S.pp.typed["RES-6"] != null ? (
      <Table2 key={p.id} />
    ) : (
      skeletonFigure(p, "Table 2 · the hypotheses and their outcomes")
    );
  if (p.kind === "table")
    return S.pp.table > 0 ? <Table1 key={p.id} /> : skeletonFigure(p, "Table 1 · from rows 12–13");
  if (p.kind === "figure") return S.pp.fig ? <Figure2 key={p.id} /> : skeletonFigure(p, "Figure 2 · from rows 18–21");
  if (p.kind === "excluded")
    return S.bp.placed > 0 ? (
      <M
        key={p.id}
        in="fade"
        className="my-4 rounded-lg bg-muted/60 px-3 py-2.5 font-sans text-muted-foreground text-xs"
      >
        <b className="font-medium text-foreground">Figure 4 is left out.</b> No data file stands behind it, so it cannot
        be drawn.
      </M>
    ) : null;
  const typed = S.pp.typed[p.id];
  const writer = writingOf[p.id];
  const moved = movedOut(p);
  if (moved && (p.k ?? 1) > 1) return null;
  const notes = comments ? COMMENTS.slice(0, S.pp.comments).filter((c) => c.p === p.id) : [];
  let body: ReactNode;
  if (moved && S.bp.briefs > 0)
    body = (
      <p className="mb-3 rounded-lg bg-muted px-3 py-2 font-sans text-muted-foreground text-xs">
        4.3 is not written: you moved Finding 3 to the limitations.
      </p>
    );
  else if (typed != null)
    body = (
      <p className="mb-3">
        <ParaText p={p} typed={typed} caret={Boolean(writer)} writer={writer} />
      </p>
    );
  else if (S.bp.briefs > briefIds().indexOf(p.id)) body = <Brief p={p} idx={0} />;
  else {
    /* about 13 words to a line of the page */
    const lines = p.s?.length ? Math.min(11, Math.max(2, Math.round(paraWords(p) / 13))) : 3;
    body = (
      <div className="mb-3 flex flex-col gap-2 py-1">
        {Array.from({ length: lines }, (_, i) => (
          <Skeleton
            // biome-ignore lint/suspicious/noArrayIndexKey: placeholder lines never reorder
            key={i}
            aria-hidden="true"
            className={cn(
              "h-2.5 rounded-full",
              S.stage !== "S10" && "animate-none",
              i === lines - 1 ? "w-2/5" : "w-full",
            )}
          />
        ))}
      </div>
    );
  }
  return (
    <div key={p.id} data-para={p.id} data-cursor={`para:${p.id}`} className="relative">
      {p.sub && (
        <h4 className="mt-5 mb-1.5 font-sans font-semibold text-[13.5px] tracking-tight">
          {p.n} <span className="ml-1">{p.sub}</span>
        </h4>
      )}
      {body}
      {notes.length > 0 && (
        <span className="absolute top-1 -right-3 flex flex-col gap-1 sm:-right-10">
          {notes.map((c) => (
            <M
              key={c.id}
              as="span"
              in="fade"
              title={`${REVIEWERS.find((r) => r.k === c.r)?.n}: ${c.t}`}
              className={cn(
                "grid size-5 place-items-center rounded-full font-bold font-sans text-[10px] text-white shadow-sm",
                S.rev.backlog >= 1 || S.so.signed ? "bg-emerald-600" : "bg-indigo-600",
              )}
            >
              {c.id}
            </M>
          ))}
        </span>
      )}
    </div>
  );
}
export function skeletonFigure(p: Para, label: string) {
  if (!S.bp.placed) return null;
  return (
    <M
      key={p.id}
      in="fade"
      data-para={p.id}
      className="my-4 grid h-24 place-items-center rounded-lg bg-muted/60 font-sans text-muted-foreground text-xs"
    >
      {label}
    </M>
  );
}

/** Whether the desk is wide enough for the rail to sit beside the page; null until it is measured. */
const RailWideContext = createContext<boolean | null>(null);
export const RailWide = RailWideContext.Provider;

export function RailSection({
  title,
  aside,
  children,
  open: initial = true,
  fold = false,
  lead = false,
}: {
  title: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  open?: boolean;
  /** Folded to its summary where the rail sits above the page, open where it sits beside it. */
  fold?: boolean;
  /** The section of the step running now: first in the rail, where it is seen without scrolling. */
  lead?: boolean;
}) {
  const wide = useContext(RailWideContext);
  const [picked, setOpen] = useState<boolean | null>(null);
  const open = picked ?? (fold ? (wide ?? true) : initial);
  return (
    <M
      as="section"
      in="up"
      className={cn("rounded-xl bg-card px-3.5 py-3 ring-1 ring-foreground/10", lead && "order-first")}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open ? "true" : "false"}
        className="flex w-full items-center gap-2 text-left font-semibold text-[12.5px] outline-none"
      >
        {title}
        <span className="ml-auto font-mono font-normal text-[11px] text-muted-foreground">{aside}</span>
        <Icon n="down" className={cn("size-3.5 text-muted-foreground transition-transform", !open && "-rotate-90")} />
      </button>
      {open && <div className="pt-2.5">{children}</div>}
    </M>
  );
}
