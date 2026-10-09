"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "cn";
import { ArrowLeftRight, CircleCheck, Lightbulb, Target } from "lucide-react";
import { LayoutGroup, motion } from "motion/react";

import type { KnowledgeCard } from "@/lib/run-stream/contract";
import type { SynthesizeContent } from "@/lib/run-stream/run-state";

import { AgentCursor } from "../run-bits";
import { shortCite } from "../run-meta";
import { useReveal } from "../workspace-context";
import { Pane, Placeholder, TypeText } from "./scene-ui";

const TONES = [
  { badge: "bg-blue-500/12 text-blue-700 dark:text-blue-300", chip: "bg-blue-500/10 ring-blue-500/25" },
  { badge: "bg-violet-500/12 text-violet-700 dark:text-violet-300", chip: "bg-violet-500/10 ring-violet-500/25" },
  { badge: "bg-orange-500/12 text-orange-700 dark:text-orange-300", chip: "bg-orange-500/10 ring-orange-500/25" },
  { badge: "bg-teal-500/12 text-teal-700 dark:text-teal-300", chip: "bg-teal-500/10 ring-teal-500/25" },
];

function Chip({ id, label, tone, lit }: { id: string; label: string; tone?: string; lit: boolean }) {
  return (
    <motion.span
      layoutId={`syn-${id}`}
      title={id}
      transition={{ layout: { type: "spring", stiffness: 220, damping: 28 } }}
      className={cn(
        "inline-flex h-6 items-center whitespace-nowrap rounded-md px-2 text-[11.5px] ring-1 transition-[background-color,box-shadow] duration-300",
        tone ?? "bg-muted ring-foreground/10",
        lit && "bg-amber-500/25 ring-2 ring-amber-500",
      )}
    >
      {label}
    </motion.span>
  );
}

export function SynthesizeScene({
  data,
  cards,
  live,
}: {
  data: SynthesizeContent;
  cards: KnowledgeCard[];
  live: boolean;
}) {
  const scene = useRef<HTMLDivElement>(null);
  const gapsRef = useRef<HTMLDivElement>(null);
  useReveal(gapsRef, data.gaps.length + data.tensions.length + data.ranking.length, live);
  const [hoverGap, setHoverGap] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  // A new gap lights up the cards whose limitations point to it.
  const lastGap = data.gaps[data.gaps.length - 1]?.id ?? null;
  const seenGap = useRef(lastGap);
  useEffect(() => {
    if (lastGap === seenGap.current) return;
    seenGap.current = lastGap;
    if (!live || !lastGap) return;
    setFlash(lastGap);
    const timer = window.setTimeout(() => setFlash(null), 1800);
    return () => window.clearTimeout(timer);
  }, [lastGap, live]);

  const litGap = data.gaps.find((g) => g.id === (hoverGap ?? flash));
  const lit = new Set(litGap?.from ?? []);
  const placed = new Set([...data.clusters, ...data.setAside].flatMap((c) => c.card_ids));
  const pool = cards.filter((c) => !placed.has(c.id));
  const asideCount = data.setAside.reduce((n, a) => n + a.card_ids.length, 0);
  const tension = data.tensions[0];
  const betweenList = Array.isArray(tension?.between)
    ? tension.between
    : typeof tension?.between === "string"
      ? ((tension.between as string).match(/C\d+/g) ?? ["C1", "C2"])
      : ["C1", "C2"];
  const cite = new Map((cards ?? []).map((c) => [c.id, shortCite(c.citation)]));
  const label = (id: string) => cite.get(id) ?? id;
  const toneOf = (clusterId: string) =>
    TONES[
      Math.max(
        0,
        data.clusters.findIndex((c) => c.id === clusterId),
      ) % 4
    ];

  const rankOf = new Map((data.ranking ?? []).map((r) => [r.gap_id, r]));
  const ranked = data.ranking.length > 0;
  const gaps = ranked
    ? [...data.gaps].sort((a, b) => (rankOf.get(a.id)?.priority ?? 99) - (rankOf.get(b.id)?.priority ?? 99))
    : data.gaps;

  let target: string | null = data.clusters.length ? `cluster:${data.clusters[data.clusters.length - 1].id}` : null;
  if (data.overview) target = "overview";
  if (tension) target = "tension";
  if (data.gaps.length) target = `gap:${data.gaps[data.gaps.length - 1].id}`;
  if (ranked) target = `gap:${data.ranking[0].gap_id}`;

  return (
    <div ref={scene} className="relative flex flex-col gap-4">
      <LayoutGroup id="synthesis">
        {pool.length > 0 ? (
          <Pane title="Knowledge cards to sort" aside={`${pool.length} of ${cards.length} left`}>
            <div className="flex min-h-7 flex-wrap gap-1.5">
              {pool.map((c) => (
                <Chip key={c.id} id={c.id} label={label(c.id)} lit={lit.has(c.id)} />
              ))}
            </div>
          </Pane>
        ) : (
          <motion.p
            initial={live ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            className="flex items-center gap-1.5 text-emerald-700 text-xs dark:text-emerald-300"
          >
            <CircleCheck className="size-3.5" />
            {asideCount
              ? `All ${cards.length} cards accounted for: ${cards.length - asideCount} in ${data.clusters.length} schools of thought, ${asideCount} set aside with a reason.`
              : `All ${cards.length} cards sorted into ${data.clusters.length} schools of thought. Grouped by approach, not listed paper by paper.`}
          </motion.p>
        )}
        <div className="grid gap-3 md:grid-cols-2">
          {data.clusters.map((cluster) => {
            const tone = toneOf(cluster.id);
            const pulled = Boolean(betweenList.includes(cluster.id));
            return (
              <motion.section
                key={cluster.id}
                data-cursor={`cluster:${cluster.id}`}
                initial={live ? { opacity: 0, y: 10 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className={cn(
                  "flex min-w-0 flex-col gap-2 rounded-xl bg-card p-3.5 ring-1 ring-foreground/10 transition-shadow duration-500",
                  pulled && "ring-2 ring-orange-500/40",
                )}
              >
                <header className="flex items-center gap-2 text-sm">
                  <b
                    className={cn(
                      "inline-flex h-5 shrink-0 items-center rounded-md px-1.5 font-mono font-semibold text-[11px]",
                      tone.badge,
                    )}
                  >
                    {cluster.id}
                  </b>
                  <b className="font-semibold">{cluster.title}</b>
                  <span className="ml-auto font-mono text-[11px] text-muted-foreground">
                    {(cluster.card_ids ?? []).length} paper{cluster.card_ids.length === 1 ? "" : "s"}
                  </span>
                </header>
                <p className="text-muted-foreground text-xs leading-snug">{cluster.claim}</p>
                <div className="mt-auto flex flex-wrap gap-1.5">
                  {(cluster.card_ids ?? []).map((id) => (
                    <Chip key={id} id={id} label={label(id)} tone={tone.chip} lit={lit.has(id)} />
                  ))}
                </div>
              </motion.section>
            );
          })}
          {!data.clusters.length && (
            <Placeholder className="md:col-span-2">The cards are grouped by approach</Placeholder>
          )}
        </div>
        {data.setAside.length > 0 && (
          <Pane title="Set aside" aside={`${asideCount} card${asideCount === 1 ? "" : "s"} in no school of thought`}>
            <ul className="flex flex-col gap-2">
              {data.setAside.map((aside) => (
                <motion.li
                  key={aside.id}
                  initial={live ? { opacity: 0, y: 6 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col gap-1.5"
                >
                  <div className="flex flex-wrap gap-1.5">
                    {aside.card_ids.map((id) => (
                      <Chip key={id} id={id} label={label(id)} lit={lit.has(id)} />
                    ))}
                  </div>
                  <p className="text-muted-foreground text-xs leading-snug">{aside.reason}</p>
                </motion.li>
              ))}
            </ul>
          </Pane>
        )}
      </LayoutGroup>

      {data.overview ? (
        <Pane title="The field at a glance" aside="written from all the cards">
          <p data-cursor="overview" className="max-w-[90ch] font-(family-name:--font-lora) text-[15px] leading-relaxed">
            <TypeText text={data.overview} live={live} speed={160} />
          </p>
        </Pane>
      ) : (
        data.clusters.length > 0 && <Placeholder>Then the field is summed up in one paragraph</Placeholder>
      )}

      <div ref={gapsRef} className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        {tension ? (
          <Pane title="Where they pull apart" aside="the gaps hide here">
            <div data-cursor="tension" className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <b
                  className={cn(
                    "inline-flex h-6 items-center rounded-md px-2 font-mono font-semibold text-xs",
                    toneOf(betweenList[0] ?? "C1").badge,
                  )}
                >
                  {betweenList[0] ?? "C1"}
                </b>
                <svg viewBox="0 0 120 12" className="h-3 flex-1" aria-hidden="true">
                  <motion.line
                    x1={4}
                    x2={116}
                    y1={6}
                    y2={6}
                    className="stroke-orange-500"
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    initial={{ strokeDashoffset: 0 }}
                    animate={{ strokeDashoffset: [0, -18] }}
                    transition={{ duration: 0.9, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                  />
                </svg>
                <ArrowLeftRight className="size-3.5 text-orange-600" />
                <svg viewBox="0 0 120 12" className="h-3 flex-1" aria-hidden="true">
                  <motion.line
                    x1={4}
                    x2={116}
                    y1={6}
                    y2={6}
                    className="stroke-orange-500"
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    initial={{ strokeDashoffset: 0 }}
                    animate={{ strokeDashoffset: [0, 18] }}
                    transition={{ duration: 0.9, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                  />
                </svg>
                <b
                  className={cn(
                    "inline-flex h-6 items-center rounded-md px-2 font-mono font-semibold text-xs",
                    toneOf(betweenList[1] ?? "C2").badge,
                  )}
                >
                  {betweenList[1] ?? "C2"}
                </b>
              </div>
              <p className="text-sm leading-relaxed">{tension.text}</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {betweenList.map((id) => {
                  const cluster = data.clusters.find((c) => c.id === id);
                  return (
                    <span key={id} className="rounded-lg bg-muted/60 px-2.5 py-2">
                      <b className="block font-medium">{cluster?.title}</b>
                      <span className="text-muted-foreground">{cluster?.claim}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          </Pane>
        ) : (
          <Placeholder>Then where the groups disagree</Placeholder>
        )}
        {data.gaps.length ? (
          <Pane
            title={ranked ? "Gaps, ranked as opportunities" : "Gaps"}
            aside={ranked ? "most useful for your sub-questions first" : "each traced to the limitations behind it"}
          >
            <ul className="flex flex-col gap-2">
              {gaps.map((gap) => {
                const opportunity = rankOf.get(gap.id);
                return (
                  <motion.li
                    key={gap.id}
                    layout
                    data-cursor={`gap:${gap.id}`}
                    initial={live ? { opacity: 0, y: 8 } : false}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: live && !ranked ? 0.5 : 0,
                      layout: { type: "spring", stiffness: 260, damping: 28 },
                    }}
                    onMouseEnter={() => setHoverGap(gap.id)}
                    onMouseLeave={() => setHoverGap(null)}
                    className={cn(
                      "grid grid-cols-[auto_minmax(0,1fr)_auto] gap-x-2.5 gap-y-1.5 rounded-lg border px-3 py-2.5 transition-colors",
                      litGap?.id === gap.id ? "border-amber-500/60 bg-amber-500/8" : "hover:bg-muted/50",
                    )}
                  >
                    <span className="row-span-3 inline-flex h-6 items-center gap-1 self-start rounded-md bg-amber-500/15 px-1.5 font-mono font-semibold text-amber-800 text-xs dark:text-amber-300">
                      <Lightbulb className="size-3" />
                      {gap.id}
                    </span>
                    <span className="font-medium text-sm">{gap.text}</span>
                    <span className="row-span-3 self-start">
                      {opportunity && (
                        <motion.span
                          initial={live ? { opacity: 0, scale: 0.6 } : false}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: live ? 0.5 : 0, type: "spring", stiffness: 500, damping: 20 }}
                          className={cn(
                            "inline-flex h-6 items-center rounded-full px-2.5 font-medium text-xs",
                            opportunity.priority === 1
                              ? "bg-foreground text-background"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          Priority {opportunity.priority}
                        </motion.span>
                      )}
                    </span>
                    {gap.from && gap.from.length > 0 && (
                      <span className="col-start-2 flex flex-wrap items-center gap-1 text-muted-foreground text-xs">
                        from the limits of
                        {(gap.from ?? []).map((id) => (
                          <span
                            key={id}
                            className="inline-flex h-5 items-center rounded-md bg-muted px-1.5 text-[11px]"
                          >
                            {label(id)}
                          </span>
                        ))}
                      </span>
                    )}
                    {opportunity && (
                      <motion.span
                        initial={live ? { opacity: 0, height: 0 } : false}
                        animate={{ opacity: 1, height: "auto" }}
                        transition={{ delay: live ? 0.7 : 0, duration: 0.35 }}
                        className="col-start-2 overflow-hidden"
                      >
                        <span className="flex items-start gap-1.5 rounded-md bg-emerald-500/8 px-2 py-1.5 text-xs">
                          <Target className="mt-px size-3.5 shrink-0 text-emerald-600" />
                          <span>
                            <b className="font-semibold text-emerald-800 dark:text-emerald-300">Opportunity: </b>
                            {opportunity.text}
                          </span>
                        </span>
                      </motion.span>
                    )}
                  </motion.li>
                );
              })}
            </ul>
          </Pane>
        ) : (
          <Placeholder>Gaps are named last</Placeholder>
        )}
      </div>
      <AgentCursor
        agent={live ? "theorist" : null}
        container={scene}
        target={target}
        version={`${data.clusters.length}-${data.overview ? 1 : 0}-${data.gaps.length}-${data.ranking.length}`}
      />
    </div>
  );
}
