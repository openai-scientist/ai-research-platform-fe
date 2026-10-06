"use client";

import { type RefObject, useEffect, useState } from "react";

import { cn } from "cn";
import { ArrowLeft, FileText, Lightbulb } from "lucide-react";
import { motion } from "motion/react";

import { Button } from "@/components/ui/button";
import type { Figure } from "@/lib/run-stream/contract";
import type { RunState, WriteContent } from "@/lib/run-stream/run-state";
import { finalResults, signed } from "@/lib/run-stream/selectors";

import { PaperPage } from "../paper-page";
import { AgentAvatar } from "../run-bits";
import { AGENTS, VERDICT } from "../run-meta";

export function PaperScene({
  state,
  paper,
  figures,
  runLabel,
  scroller,
  onOpenReport,
  onOpenFindings,
  onClose,
}: {
  state: RunState;
  paper: WriteContent;
  figures: Figure[];
  runLabel: string;
  scroller: RefObject<HTMLElement | null>;
  onOpenReport(): void;
  onOpenFindings(): void;
  onClose(): void;
}) {
  const [current, setCurrent] = useState(paper.sections[0]?.id);
  const finals = finalResults(state);
  const report = state.stages.report?.content;
  const verdictOf = (h: string) =>
    report?.stage === "report" ? report.rows.find((r) => r.hypothesis_id === h)?.verdict : undefined;
  const keyResults = (["H1", "H5", "H3", "H2", "H6", "H4"] as const).filter((h) => finals[h]);
  const evidence = Object.values(state.stages)
    .map((s) => s.content)
    .flatMap((c) => (c.stage === "interpret" ? c.rows : []));
  const shortOf = (h: string) => evidence.find((r) => r.hypothesis.id === h)?.hypothesis.short ?? h;

  // Highlight the section being read.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const onScroll = () => {
      const top = el.getBoundingClientRect().top + 110;
      let id = paper.sections[0]?.id;
      for (const s of paper.sections) {
        const node = el.querySelector(`#paper-${s.id}`);
        if (node && node.getBoundingClientRect().top < top) id = s.id;
      }
      setCurrent(id);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [scroller, paper.sections]);

  const go = (id: string) => {
    const el = scroller.current;
    const node = el?.querySelector(`#paper-${id}`);
    if (!el || !node) return;
    el.scrollTo({
      top: el.scrollTop + node.getBoundingClientRect().top - el.getBoundingClientRect().top - 16,
      behavior: "smooth",
    });
  };

  let n = 0;
  return (
    <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[170px_minmax(0,1fr)_280px]">
      <nav aria-label="Contents" className="sticky top-3 hidden flex-col text-[13px] xl:flex">
        <span className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">Contents</span>
        {paper.sections.map((s) => {
          if (s.numbered) n += 1;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => go(s.id)}
              className={cn(
                "border-l-2 px-2.5 py-1.5 text-left leading-snug outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                current === s.id
                  ? "border-foreground font-medium text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {s.numbered ? `${n}. ` : ""}
              {s.title.replace("Appendix A · ", "Appendix A: ")}
            </button>
          );
        })}
      </nav>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="min-w-0"
      >
        <PaperPage paper={paper} figures={figures} runLabel={runLabel} />
      </motion.div>

      <aside className="flex min-w-0 flex-col gap-3 xl:sticky xl:top-3">
        <section className="rounded-xl bg-card px-3.5 py-3 ring-1 ring-foreground/10">
          <h3 className="mb-2.5 flex justify-between font-semibold text-[12.5px]">
            Key results{" "}
            <span className="font-mono font-normal text-[11px] text-muted-foreground">
              {Object.keys(finals).length} with a number
            </span>
          </h3>
          <ul className="flex flex-col gap-2 text-[12.5px]">
            {keyResults.map((h, i) => {
              const r = finals[h];
              const verdict = verdictOf(h);
              return (
                <motion.li
                  key={h}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="grid grid-cols-[auto_1fr_auto_8px] items-center gap-2"
                >
                  <span className="rounded-md bg-primary px-1.5 py-0.5 font-mono font-semibold text-[11px] text-primary-foreground">
                    {h}
                  </span>
                  <span className="truncate">{shortOf(h)}</span>
                  <b className="font-mono">{r.estimate !== null ? signed(r.estimate) : "—"}</b>
                  <span
                    title={verdict ? VERDICT[verdict].label : undefined}
                    className={cn("size-2 rounded-full", verdict ? VERDICT[verdict].dot : "bg-muted")}
                  />
                </motion.li>
              );
            })}
          </ul>
        </section>
        <section className="rounded-xl bg-card px-3.5 py-3 ring-1 ring-foreground/10">
          <h3 className="mb-2.5 flex justify-between font-semibold text-[12.5px]">
            Decisions{" "}
            <span className="font-mono font-normal text-[11px] text-muted-foreground">{state.decisions.length}</span>
          </h3>
          <ol className="flex flex-col">
            {state.decisions.map((d, i) => (
              <motion.li
                key={d.seq}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="relative grid grid-cols-[22px_1fr] gap-2.5 pb-3 text-[12.5px] last:pb-0 [&:not(:last-child)]:before:absolute [&:not(:last-child)]:before:top-6 [&:not(:last-child)]:before:bottom-0.5 [&:not(:last-child)]:before:left-[10.5px] [&:not(:last-child)]:before:w-px [&:not(:last-child)]:before:bg-border"
              >
                {d.actor === "you" ? (
                  <span className="grid size-[22px] place-items-center rounded-full bg-amber-500/20 font-semibold text-[8.5px] text-amber-800 dark:text-amber-300">
                    You
                  </span>
                ) : (
                  <AgentAvatar agent={d.actor} size="sm" className="size-[22px]" />
                )}
                <span>
                  <b
                    className={cn(
                      "font-semibold text-xs",
                      d.actor === "you" ? "text-amber-800 dark:text-amber-300" : AGENTS[d.actor].text,
                    )}
                  >
                    {d.actor === "you" ? "You" : AGENTS[d.actor].name}
                  </b>{" "}
                  <span className="font-mono text-[10.5px] text-muted-foreground">
                    #{String(d.seq).padStart(4, "0")}
                  </span>
                  <span className="block">{d.text}</span>
                </span>
              </motion.li>
            ))}
          </ol>
        </section>
        <div className="flex flex-col gap-2">
          <Button onClick={onOpenFindings} className="justify-start">
            <Lightbulb />
            Open in Findings
          </Button>
          <Button variant="outline" onClick={onOpenReport} className="justify-start">
            <FileText />
            View the report
          </Button>
          <Button variant="ghost" onClick={onClose} className="justify-start">
            <ArrowLeft />
            Back to Research flow
          </Button>
        </div>
      </aside>
    </div>
  );
}
