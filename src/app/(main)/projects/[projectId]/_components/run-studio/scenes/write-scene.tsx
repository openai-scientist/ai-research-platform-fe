"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

import { cn } from "cn";
import { AlertTriangle, ChevronDown, CircleCheck } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { Figure } from "@/lib/run-stream/contract";
import type { FeedItem, StageState, WriteContent } from "@/lib/run-stream/run-state";

import { PaperPage } from "../paper-page";
import { AgentCursor, launchFlight } from "../run-bits";
import { useReveal } from "../workspace-context";
import { SceneNote } from "./scene-ui";

function RailSection({
  title,
  aside,
  open,
  onOpenChange,
  children,
}: {
  title: string;
  aside?: ReactNode;
  open: boolean;
  onOpenChange(open: boolean): void;
  children: ReactNode;
}) {
  return (
    <Collapsible
      open={open}
      onOpenChange={onOpenChange}
      className="rounded-xl bg-card px-3.5 py-3 ring-1 ring-foreground/10"
    >
      <CollapsibleTrigger className="flex w-full items-center gap-2 text-left font-semibold text-[12.5px] outline-none">
        {title}
        <span className="ml-auto font-mono font-normal text-[11px] text-muted-foreground">{aside}</span>
        <ChevronDown className={cn("size-3.5 text-muted-foreground transition-transform", !open && "-rotate-90")} />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2.5">{children}</CollapsibleContent>
    </Collapsible>
  );
}

export function WriteScene({
  stage,
  figures,
  runLabel,
  decisions,
  live,
}: {
  stage: StageState;
  figures: Figure[];
  runLabel: string;
  decisions: FeedItem[];
  live: boolean;
}) {
  const paper = stage.content as WriteContent;
  const scene = useRef<HTMLDivElement>(null);
  const desk = useRef<HTMLDivElement>(null);
  const written = stage.doneStepIds.includes("write");
  const [outlineOpen, setOutlineOpen] = useState(true);
  const [sourcesOpen, setSourcesOpen] = useState(true);
  // Once the draft exists, fold the writing aids so the check and review stay in view.
  useEffect(() => {
    if (written) {
      setOutlineOpen(false);
      setSourcesOpen(false);
    }
  }, [written]);

  const writingSection = paper.sections.find((s) => paper.sectionStatus[s.id] === "writing");
  const writingBlocks = writingSection ? (paper.blocks[writingSection.id] ?? []) : [];
  const writingBlock = writingBlocks[writingBlocks.length - 1];
  const writingBlockId = stage.currentStepId === "write" ? writingBlock?.id : null;

  // Every number and figure the Reporter uses travels from the report list into the page.
  const usedTotal = Object.values(paper.sourcesUsed).reduce((a, b) => a + b, 0);
  const seen = useRef(usedTotal);
  useEffect(() => {
    if (usedTotal <= seen.current) {
      seen.current = usedTotal;
      return;
    }
    seen.current = usedTotal;
    if (!live || !writingBlock) return;
    const host = scene.current;
    const block = host?.querySelector(`[data-section="${writingSection?.id}"]`);
    if (writingBlock.kind === "figure") {
      launchFlight(
        host?.querySelector(`[data-source="figure:${writingBlock.figure}"]`),
        block?.querySelector(`[data-figure="${writingBlock.figure}"]`),
        `Figure ${writingBlock.figure}`,
        "bg-amber-600 text-white",
      );
      return;
    }
    const nums = block?.querySelectorAll<HTMLElement>("[data-num]");
    const last = nums?.[nums.length - 1];
    if (last?.dataset.src)
      launchFlight(
        host?.querySelector(`[data-source="${last.dataset.src}"]`),
        last,
        last.textContent ?? "",
        "bg-amber-600 text-white",
      );
  }, [usedTotal, live, writingBlock, writingSection?.id]);

  // The fixed number flies in from the report too.
  const fixedCount = Object.keys(paper.fixedNumbers).length;
  useEffect(() => {
    if (!live || !fixedCount) return;
    const host = scene.current;
    const [span, fixed] = Object.entries(paper.fixedNumbers)[0];
    void span;
    const target = host?.querySelector(`[data-src="${fixed.source}"]`);
    launchFlight(
      host?.querySelector(`[data-source="${fixed.source}"]`),
      target,
      fixed.value,
      "bg-amber-600 text-white",
    );
  }, [fixedCount, live, paper.fixedNumbers]);

  const blockRef = useRef<HTMLElement | null>(null);
  blockRef.current = writingSection
    ? (scene.current?.querySelector<HTMLElement>(`[data-section="${writingSection.id}"]`) ?? null)
    : null;
  useReveal(blockRef, `${writingSection?.id}-${writingBlocks.length}`, live);

  const openComment = paper.comments.find((c) => !c.revision);
  let target: string | null = writingSection ? `section:${writingSection.id}` : null;
  let role: "reporter" | "skeptic" | "code" = "reporter";
  if (paper.blocked && !Object.keys(paper.fixedNumbers).length) {
    target = `span:${paper.blocked.spanId}`;
    role = "code";
  }
  if (paper.comments.length) {
    const lastRevised = [...paper.comments].reverse().find((c) => c.revision);
    role = lastRevised ? "reporter" : "skeptic";
    target = lastRevised?.revision
      ? `span:${lastRevised.revision.spanId}`
      : `span:${paper.comments[paper.comments.length - 1].spanId}`;
    if (openComment && lastRevised) {
      role = "reporter";
    }
  }
  if (paper.typeset) target = null;
  const notes = decisions.filter((d) => d.stageKey === "write");
  const sections = paper.sections.length;

  return (
    <div ref={scene} className="relative flex flex-col gap-4">
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div ref={desk} className="-mx-4 min-w-0 bg-muted/70 px-3 py-6 sm:mx-0 sm:rounded-2xl sm:px-7 sm:py-8">
          {paper.sections.length ? (
            <PaperPage paper={paper} figures={figures} runLabel={runLabel} writingBlockId={writingBlockId} />
          ) : (
            <div className="mx-auto flex min-h-[560px] max-w-[780px] flex-col gap-3 rounded-sm bg-card px-14 pt-12 shadow-md ring-1 ring-foreground/10">
              {[60, 92, 80].map((w) => (
                <span key={w} className="h-3 animate-pulse rounded bg-muted" style={{ width: `${w}%` }} />
              ))}
            </div>
          )}
        </div>

        <aside className="flex min-w-0 flex-col gap-2.5 xl:sticky xl:top-3">
          <RailSection
            title="Outline"
            aside={sections ? `${sections} sections` : undefined}
            open={outlineOpen}
            onOpenChange={setOutlineOpen}
          >
            <ol className="flex flex-col gap-1.5 text-[12.5px]">
              {!sections && <li className="text-muted-foreground">Planned first.</li>}
              {paper.sections.map((s, i) => {
                const status = paper.sectionStatus[s.id];
                return (
                  <motion.li
                    key={s.id}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className={cn(
                      "grid grid-cols-[12px_1fr_auto] items-center gap-2",
                      status === "writing" && "font-semibold",
                    )}
                  >
                    <span
                      className={cn(
                        "size-2 rounded-full border-[1.5px] transition-colors",
                        status === "planned" && "border-foreground/30",
                        status === "writing" && "animate-pulse border-amber-600 bg-amber-600",
                        status === "done" && "border-emerald-500 bg-emerald-500",
                      )}
                    />
                    <span className="truncate">{s.title}</span>
                    <span className="font-mono text-[10.5px] text-muted-foreground">
                      {status === "done" ? "drafted" : status}
                    </span>
                  </motion.li>
                );
              })}
            </ol>
          </RailSection>

          <RailSection
            title="From the report"
            aside={paper.sources.length ? `${paper.sources.length} items` : undefined}
            open={sourcesOpen}
            onOpenChange={setSourcesOpen}
          >
            <div className="flex flex-wrap gap-1.5">
              {paper.sources.map((source, i) => {
                const used = paper.sourcesUsed[source.id] ?? 0;
                return (
                  <motion.span
                    key={`${source.id}-${used}`}
                    data-source={source.id}
                    title={source.detail}
                    initial={used ? { scale: 1.12 } : { scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={
                      used ? { duration: 0.4 } : { delay: i * 0.025, type: "spring", stiffness: 420, damping: 22 }
                    }
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 font-mono font-semibold text-[11px] transition-colors",
                      used ? "border-emerald-500/50 bg-emerald-500/10" : "bg-card",
                    )}
                  >
                    {source.label}
                    {used > 0 && (
                      <span className="font-normal text-[10px] text-emerald-700 dark:text-emerald-300">×{used}</span>
                    )}
                  </motion.span>
                );
              })}
            </div>
            <p className="mt-2 text-[11.5px] text-muted-foreground">Numbers and figures can only come from here.</p>
          </RailSection>

          <RailSection title="Number check" aside="rule 1" open onOpenChange={() => undefined}>
            <ul className="flex flex-col gap-2 text-[12.5px]">
              {!paper.checked && <li className="text-muted-foreground">Runs after the first draft.</li>}
              {paper.checked && (
                <motion.li
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-[16px_1fr] gap-2"
                >
                  <CircleCheck className="mt-0.5 size-3.5 text-emerald-600" />
                  {paper.checked.numbers} numbers and {paper.checked.figures} figures or tables trace to the report.
                </motion.li>
              )}
              {paper.blocked && (
                <motion.li
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-[16px_1fr] gap-2"
                >
                  <AlertTriangle className="mt-0.5 size-3.5 text-rose-600" />
                  <span>
                    “{paper.blocked.text}” in the abstract was typed by hand.{" "}
                    <b className="text-rose-700 dark:text-rose-300">Publishing blocked by rule 1.</b>
                  </span>
                </motion.li>
              )}
              {Object.values(paper.fixedNumbers).map((fixed) => (
                <motion.li
                  key={fixed.source}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-[16px_1fr] gap-2"
                >
                  <CircleCheck className="mt-0.5 size-3.5 text-emerald-600" />
                  Replaced with the result from the report, {fixed.value}. Block lifted.
                </motion.li>
              ))}
            </ul>
          </RailSection>

          <RailSection
            title="Review"
            aside={
              paper.comments.length
                ? `${paper.comments.filter((c) => c.revision).length} of ${paper.comments.length} resolved`
                : undefined
            }
            open
            onOpenChange={() => undefined}
          >
            <ol className="flex flex-col gap-2">
              {!paper.comments.length && (
                <li className="text-[12.5px] text-muted-foreground">The Skeptic comments after the check.</li>
              )}
              <AnimatePresence initial={false}>
                {paper.comments.map((c, i) => (
                  <motion.li
                    key={c.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: c.revision ? 0.62 : 1, y: 0 }}
                    className={cn(
                      "grid grid-cols-[auto_1fr] gap-2 rounded-lg border px-2.5 py-2 text-[12.5px] transition-colors",
                      c.revision ? "bg-card" : "border-orange-500/35 bg-orange-500/5",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 h-fit rounded-full px-1.5 font-bold text-[10px] text-white transition-colors",
                        c.revision ? "bg-emerald-600" : "bg-orange-600",
                      )}
                    >
                      {i + 1}
                    </span>
                    <span>
                      <span className={cn(c.revision && "line-through decoration-muted-foreground")}>{c.text}</span>
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">
                        {c.revision ? `Reporter: “${c.revision.to.trim()}”` : "Skeptic"}
                      </span>
                    </span>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ol>
          </RailSection>

          <RailSection title="Drafts" aside="score out of 10" open onOpenChange={() => undefined}>
            <div className="flex flex-col gap-2.5">
              {!paper.drafts.length && <p className="text-[12.5px] text-muted-foreground">Scored during review.</p>}
              {paper.drafts.map((d) => (
                <motion.div
                  key={d.draft}
                  layout
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col gap-0.5"
                >
                  <div className="grid grid-cols-[52px_1fr_28px] items-center gap-2 text-[12.5px]">
                    <span>Draft {d.draft}</span>
                    <i className="h-2 overflow-hidden rounded-full bg-muted">
                      <motion.b
                        className={cn(
                          "block h-full origin-left rounded-full",
                          d.best ? "bg-orange-600" : "bg-orange-500/45",
                        )}
                        style={{ width: `${d.score * 10}%` }}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                      />
                    </i>
                    <b className="text-right font-mono">{d.score.toFixed(1)}</b>
                  </div>
                  <span className="pl-[60px] text-[11px] text-muted-foreground">{d.note}</span>
                </motion.div>
              ))}
            </div>
          </RailSection>
        </aside>
      </div>
      {notes.map((n) => (
        <SceneNote
          key={n.seq}
          actor={n.actor}
          title={n.actor === "you" ? "Your decision" : "PI decision"}
          text={n.text}
          note={n.note}
        />
      ))}
      <AgentCursor
        agent={live ? role : null}
        container={scene}
        target={target}
        version={`${usedTotal}-${paper.comments.length}-${paper.comments.filter((c) => c.revision).length}`}
      />
    </div>
  );
}
