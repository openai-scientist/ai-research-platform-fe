"use client";

import { useEffect, useRef } from "react";

import { cn } from "cn";
import { BookOpen } from "lucide-react";
import { motion } from "motion/react";

import type { KnowledgeCard, ShortlistPaper } from "@/lib/run-stream/contract";
import { SHOW_SCOPE_EXTRAS } from "@/lib/run-stream/features";
import type { ReadContent, RunState } from "@/lib/run-stream/run-state";

import { AgentCursor, launchFlight } from "../run-bits";
import { shortCite } from "../run-meta";
import { useWorkspace } from "../workspace-context";
import { Bone, Pane, Placeholder } from "./scene-ui";
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
          const value = card[key];
          // Cards are read from abstracts; a field the abstract does not support stays empty.
          const limit = key === "limitations" && Boolean(value);
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
              <dd
                className={cn(
                  "leading-snug",
                  key === "findings" && value && "font-medium",
                  !value && "text-muted-foreground/70 italic",
                )}
              >
                {value || "Not in the abstract"}
              </dd>
            </motion.div>
          );
        })}
      </dl>
    </motion.article>
  );
}

/** A shortlisted paper whose card is still being read, in the place its card will take. */
function PendingCard({
  paper,
  index,
  active,
  wide,
}: {
  paper: ShortlistPaper;
  index: number;
  active: boolean;
  wide: boolean;
}) {
  return (
    <article
      className={cn(
        "flex min-w-0 flex-col overflow-hidden rounded-xl border border-dashed text-sm",
        wide && "md:col-span-2 2xl:col-span-1",
      )}
    >
      <header className="flex items-center gap-2 border-b border-dashed px-3 py-2 text-muted-foreground">
        <BookOpen className="size-3.5 shrink-0" />
        <b className="truncate font-semibold text-xs">{paper.citation}</b>
        <span className="ml-auto shrink-0 text-[11px] tabular-nums">
          {active ? "Reading" : `Card ${String(index + 1).padStart(2, "0")}`}
        </span>
      </header>
      <dl
        className={cn("flex flex-1 flex-col gap-2 px-3 py-2.5", wide && "md:grid md:grid-cols-2 md:gap-x-6 2xl:flex")}
      >
        {FIELDS.map(({ key, label }) => (
          <div key={key} className="grid grid-cols-[70px_minmax(0,1fr)] items-center gap-2 text-xs">
            <dt className="text-muted-foreground/70">{label}</dt>
            <dd>
              <Bone active={active} className={key === "findings" ? "w-full" : "w-3/4"} />
            </dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

export function ReadScene({
  data,
  shortlist,
  estimates,
  live,
  step,
}: {
  data: ReadContent;
  /** The papers kept at the screen, each to become a card. */
  shortlist: ShortlistPaper[];
  estimates: RunState["estimates"];
  live: boolean;
  /** The step running now, while the run is followed live. */
  step: string | null;
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
    if (!card.limitations) return;
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

  // While cards are read, each shortlisted paper keeps the place its card will fill. A paper without an abstract
  // gets no card, so the places go once the step ends.
  const carded = new Set(data.cards.map((card) => card.paper_id));
  const waiting = step === "extract" ? shortlist.filter((paper) => !carded.has(paper.id)) : [];
  const total = data.cards.length + waiting.length;
  const limited = data.cards.filter((card) => card.limitations);
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
            wide={total % 2 === 1 && i === total - 1}
          />
        ))}
        {waiting.map((paper, i) => (
          <PendingCard
            key={paper.id}
            paper={paper}
            index={data.cards.length + i}
            active={i === 0}
            wide={total % 2 === 1 && data.cards.length + i === total - 1}
          />
        ))}
        {!total && (
          <Placeholder className="md:col-span-2 2xl:col-span-3">Each shortlisted paper becomes a card</Placeholder>
        )}
      </div>
      <aside className="flex min-w-0 flex-col gap-4 xl:sticky xl:top-3">
        <div ref={tray}>
          <Pane title="Gap material" aside={`${limited.length} limitation${limited.length === 1 ? "" : "s"}`}>
            {limited.length ? (
              // Each card already shows its limitation in full; here they only collect, so the column stays short.
              <ul className="flex flex-wrap gap-1.5">
                {limited.map((card) => {
                  const isNew = live && data.cards.indexOf(card) >= fresh;
                  return (
                    <motion.li
                      key={card.id}
                      data-tray={card.id}
                      title={card.limitations}
                      initial={isNew ? { opacity: 0, scale: 0.8 } : false}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: isNew ? 0.25 + FIELDS.length * FIELD_STEP + 0.6 : 0 }}
                      className="inline-flex h-6 items-center whitespace-nowrap rounded-md bg-amber-500/12 px-2 font-medium text-[11px] text-amber-800 dark:text-amber-300"
                    >
                      {shortCite(card.citation)}
                    </motion.li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-muted-foreground text-xs">
                {data.cards.length
                  ? "None of the abstracts states a limitation so far."
                  : "What each paper couldn't answer collects here."}
              </p>
            )}
          </Pane>
        </div>
        {SHOW_SCOPE_EXTRAS && (
          <Pane title="Numbers from memory" aside="checked against cards">
            <EstimateList estimates={estimates} live={live} />
            {!estimates.length && <p className="text-muted-foreground text-xs">None were recalled.</p>}
          </Pane>
        )}
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
