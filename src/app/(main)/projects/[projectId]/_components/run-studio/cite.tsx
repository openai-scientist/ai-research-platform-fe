"use client";

import { useContext, useMemo } from "react";

import { motion } from "motion/react";

import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import type { KnowledgeCard } from "@/lib/run-stream/contract";

import { Caret } from "./run-bits";
import { shortCite } from "./run-meta";
import { useTyping } from "./scenes/scene-ui";
import { WorkspaceContext } from "./workspace-context";

/**
 * A knowledge card named in the models' prose, with the word "card" the model may write before it; or, as a model
 * sometimes shortens it, "card 6480": the start or the end of its id.
 */
const CARD_REF = /(?:\b[Cc]ards?\s+)?\b(card-p-[0-9a-f]{12})\b|\b[Cc]ards?\s+([0-9a-f]{4,11})\b/g;

/** The one card whose id starts or ends with `short`; none when no card or several do. */
function byShort(short: string, cards: ReadonlyMap<string, KnowledgeCard>) {
  const found = [...cards.keys()].filter((id) => id.startsWith(`card-p-${short}`) || id.endsWith(short));
  return found.length === 1 ? found[0] : undefined;
}

export type CitePart = { kind: "text"; text: string } | { kind: "cite"; id: string; text: string };

/** Splits prose at the cards it names; each card reads as its short citation, such as "Terven 2026". */
export function citeParts(text: string, cards: ReadonlyMap<string, KnowledgeCard>): CitePart[] {
  const parts: CitePart[] = [];
  let at = 0;
  for (const match of text.matchAll(CARD_REF)) {
    const id = match[1] ?? byShort(match[2], cards);
    // A short number that names no single card is left as written.
    if (!id) continue;
    if (match.index > at) parts.push({ kind: "text", text: text.slice(at, match.index) });
    const card = cards.get(id);
    parts.push({ kind: "cite", id, text: card ? shortCite(card.citation) : "a cited paper" });
    at = match.index + match[0].length;
  }
  if (at < text.length) parts.push({ kind: "text", text: text.slice(at) });
  return parts;
}

/** Prose with its cards named by citation, as plain text (for a tooltip). */
export function citeLabels(text: string, cards: ReadonlyMap<string, KnowledgeCard>) {
  return citeParts(text, cards)
    .map((p) => p.text)
    .join("");
}

/** The knowledge cards of this run, by id; empty outside the run workspace. */
export function useCards(): ReadonlyMap<string, KnowledgeCard> {
  const stages = useContext(WorkspaceContext)?.state.stages;
  return useMemo(() => {
    const cards = new Map<string, KnowledgeCard>();
    for (const stage of Object.values(stages ?? {}))
      if (stage.content.stage === "read") for (const card of stage.content.cards) cards.set(card.id, card);
    return cards;
  }, [stages]);
}

const CHIP =
  "whitespace-nowrap rounded-[5px] bg-foreground/[0.06] px-1 font-medium text-[0.94em] text-foreground/90 ring-1 ring-foreground/10 ring-inset";

/**
 * A card named in prose: its short citation, and the paper behind it on hover. Inside a control it is plain text,
 * with the paper as its tooltip.
 */
function CiteChip({ id, label, card, plain }: { id: string; label: string; card?: KnowledgeCard; plain?: boolean }) {
  if (plain)
    return (
      <span title={card ? [card.citation, card.title].filter(Boolean).join(". ") : id} className={CHIP}>
        {label}
      </span>
    );
  return (
    <HoverCard openDelay={150} closeDelay={80}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className={`${CHIP} transition-colors hover:bg-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-foreground/10`}
        >
          {label}
        </button>
      </HoverCardTrigger>
      <HoverCardContent
        align="start"
        sideOffset={6}
        className="flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-1.5 p-3 text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        {card ? (
          <>
            <b className="font-semibold text-[13px]">{card.citation}</b>
            {card.title && <span className="text-pretty text-muted-foreground leading-snug">{card.title}</span>}
            {card.findings && (
              <span className="line-clamp-4 border-t pt-1.5 leading-snug">
                <b className="font-medium text-foreground/70">Finds </b>
                {card.findings}
              </span>
            )}
          </>
        ) : (
          <span className="text-muted-foreground leading-snug">
            A paper this run read. Its knowledge card is not on this page.
          </span>
        )}
        <span className="font-mono text-[10.5px] text-muted-foreground/80">{id}</span>
      </HoverCardContent>
    </HoverCard>
  );
}

/**
 * Prose that may name knowledge cards by id: each id reads as the paper's citation. While live it is typed out at
 * `speed` characters a second, a citation showing whole once the typing reaches it. `plain` is for text inside a
 * control, where a citation cannot be a control of its own.
 */
export function CitedText({
  text,
  live = false,
  speed = 150,
  plain,
  className,
}: {
  text: string;
  live?: boolean;
  speed?: number;
  plain?: boolean;
  className?: string;
}) {
  const cards = useCards();
  const parts = useMemo(() => citeParts(text, cards), [text, cards]);
  const total = parts.reduce((n, p) => n + p.text.length, 0);
  const shown = useTyping(text, total, live, speed);
  let left = shown;
  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (left <= 0) return null;
        const length = part.text.length;
        left -= length;
        if (part.kind === "text") return part.text.slice(0, length + Math.min(0, left));
        if (left < 0) return null;
        return (
          <motion.span
            // biome-ignore lint/suspicious/noArrayIndexKey: parts of one text keep their order
            key={i}
            initial={live ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
          >
            <CiteChip id={part.id} label={part.text} card={cards.get(part.id)} plain={plain} />
          </motion.span>
        );
      })}
      {shown < total && <Caret />}
    </span>
  );
}
