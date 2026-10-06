"use client";

import { useEffect, useRef } from "react";

import { cn } from "cn";
import { BookOpen } from "lucide-react";
import { motion } from "motion/react";

import type { KnowledgeCard } from "@/lib/run-stream/contract";
import type { ReadContent, RunState } from "@/lib/run-stream/run-state";

import { AgentCursor, launchFlight } from "../run-bits";
import { shortCite } from "../run-meta";
import { useWorkspace } from "../workspace-context";
import { Pane, Placeholder } from "./scene-ui";
import { EstimateList } from "./scope-scene";

const FIELDS: { key: keyof Omit<KnowledgeCard, "id" | "paper_id" | "citation">; label: string }[] = [
  { key: "problem", label: "Problem" },
  { key: "method", label: "Method" },
  { key: "data", label: "Data" },
  { key: "metrics", label: "Metrics" },
  { key: "findings", label: "Findings" },
  { key: "limitations", label: "Limitation" },
];

/** Seconds between fields while a card fills in. */
const FIELD_STEP = 0.14;

function CardView({ card, index, fresh, wide }: { card: KnowledgeCard; index: number; fresh: boolean; wide: boolean }) {
  return (
    <motion.article
      data-card={card.id}
      data-cursor={`card:${card.id}`}
      initial={fresh ? { opacity: 0, y: 10, scale: 0.98 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "flex min-w-0 flex-col overflow-hidden rounded-xl bg-card text-sm ring-1 ring-foreground/10",
        wide && "md:col-span-2 2xl:col-span-1",
      )}
    >
      <header className="flex items-center gap-2 border-b bg-muted/50 px-3 py-2">
        <BookOpen className="size-3.5 shrink-0 text-muted-foreground" />
        <b className="truncate font-semibold text-xs">{card.citation}</b>
        <span className="ml-auto shrink-0 text-[11px] text-muted-foreground tabular-nums">
          Card {String(index + 1).padStart(2, "0")}
        </span>
      </header>
      <dl
        className={cn("flex flex-1 flex-col gap-1.5 px-3 py-2.5", wide && "md:grid md:grid-cols-2 md:gap-x-6 2xl:flex")}
      >
        {FIELDS.map(({ key, label }, i) => {
          const limit = key === "limitations";
          return (
            <motion.div
              key={key}
              data-limit={limit ? card.id : undefined}
              initial={fresh ? { opacity: 0, x: -4 } : false}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: fresh ? 0.25 + i * FIELD_STEP : 0, duration: 0.3 }}
              className={cn(
                "grid grid-cols-[70px_minmax(0,1fr)] content-start gap-2 text-xs",
                limit && "-mx-1.5 mt-auto rounded-md bg-amber-500/12 px-1.5 py-1",
                limit && wide && "md:col-span-2 2xl:col-span-1",
              )}
            >
              <dt className={cn("text-muted-foreground", limit && "font-medium text-amber-800 dark:text-amber-300")}>
                {label}
              </dt>
              <dd className={cn("leading-snug", key === "findings" && "font-medium")}>{card[key]}</dd>
            </motion.div>
          );
        })}
      </dl>
    </motion.article>
  );
}

export function ReadScene({
  data,
  estimates,
  live,
}: {
  data: ReadContent;
  estimates: RunState["estimates"];
  live: boolean;
}) {
  const scene = useRef<HTMLDivElement>(null);
  const tray = useRef<HTMLDivElement>(null);
  const { follow } = useWorkspace();
  const seen = useRef(data.cards.length);
  const fresh = live ? seen.current : data.cards.length;
  const lastId = data.cards[data.cards.length - 1]?.id;
  useEffect(() => {
    if (!live || !follow || !lastId) return;
    scene.current?.querySelector(`[data-card="${lastId}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [lastId, live, follow]);

  // Once a card's limitation is written, it flies into the gap-material tray.
  useEffect(() => {
    if (data.cards.length <= seen.current || !live) {
      seen.current = data.cards.length;
      return;
    }
    seen.current = data.cards.length;
    const card = data.cards[data.cards.length - 1];
    const timer = window.setTimeout(
      () => {
        launchFlight(
          scene.current?.querySelector(`[data-limit="${card.id}"]`),
          tray.current?.querySelector(`[data-tray="${card.id}"]`) ?? tray.current,
          "limitation",
          "bg-amber-500 text-amber-950",
        );
      },
      (0.25 + FIELDS.length * FIELD_STEP) * 1000,
    );
    return () => window.clearTimeout(timer);
  }, [data.cards, live]);

  const checked = estimates.filter((e) => e.check).length;
  let target: string | null = data.cards.length ? `card:${data.cards[data.cards.length - 1].id}` : null;
  if (checked) target = `estimate:${estimates.filter((e) => e.check).pop()?.estimate.id}`;

  return (
    <div ref={scene} className="relative grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="grid min-w-0 gap-3 md:grid-cols-2 2xl:grid-cols-3">
        {data.cards.map((card, i) => (
          <CardView
            key={card.id}
            card={card}
            index={i}
            fresh={live && i >= fresh}
            wide={data.cards.length % 2 === 1 && i === data.cards.length - 1}
          />
        ))}
        {!data.cards.length && (
          <Placeholder className="md:col-span-2 2xl:col-span-3">Each shortlisted paper becomes a card</Placeholder>
        )}
      </div>
      <aside className="flex min-w-0 flex-col gap-4 xl:sticky xl:top-3">
        <div ref={tray}>
          <Pane title="Gap material" aside={`${data.cards.length} limitation${data.cards.length === 1 ? "" : "s"}`}>
            {data.cards.length ? (
              <ul className="flex flex-col divide-y">
                {data.cards.map((card, i) => (
                  <motion.li
                    key={card.id}
                    data-tray={card.id}
                    initial={live && i >= fresh ? { opacity: 0, height: 0 } : false}
                    animate={{ opacity: 1, height: "auto" }}
                    transition={{ delay: live && i >= fresh ? 0.25 + FIELDS.length * FIELD_STEP + 0.6 : 0 }}
                    className="flex flex-col items-start gap-1 overflow-hidden py-2 text-xs first:pt-0 last:pb-0"
                  >
                    <span className="inline-flex h-5 items-center whitespace-nowrap rounded-md bg-amber-500/12 px-1.5 font-medium text-[11px] text-amber-800 dark:text-amber-300">
                      {shortCite(card.citation)}
                    </span>
                    <span className="leading-snug">{card.limitations}</span>
                  </motion.li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-xs">What each paper couldn't answer collects here.</p>
            )}
          </Pane>
        </div>
        <Pane title="Numbers from memory" aside="checked against cards">
          <EstimateList estimates={estimates} live={live} />
          {!estimates.length && <p className="text-muted-foreground text-xs">None were recalled.</p>}
        </Pane>
      </aside>
      <AgentCursor
        agent={live ? "librarian" : null}
        container={scene}
        target={target}
        version={`${data.cards.length}-${checked}`}
      />
    </div>
  );
}
