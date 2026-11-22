"use client";
"use no memo";

/* ===== Live screen: claim anatomy — each claim of the run drawn in six parts from its Toulmin card =====
   What the stage did first: how many claims were drawn, how many warrants no source states (and of those, how many you
   endorsed), the warrants by source, the exchanges each card answers and the five checks over every card; then what
   it means for the paper. Then one row per claim, its warrant and its main qualifier; a row draws its claim below in
   the frame's six parts (data, qualifier, claim, warrant, backing, rebuttals), with the checks on its card and the
   debate exchanges it answers. The rows and the drawing stand first as outlines; the parts are drawn one by one, claim
   after claim, once the cards are in. */

import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { PulseDot } from "../../run-bits";
import { emit, S, scrollTop } from "../engine";
import { BOX_TYPES, type Box, type BoxNode, type LinkEdge, useFresh } from "../flow";
import { AgentCursor, cn, Icon, M, useMedia } from "../lib";
import { Typed } from "../scenes-gather";
import {
  cardChecks,
  cards,
  concededOf,
  endorsedOf,
  exchange,
  type Ground,
  ground,
  LIST,
  MARK,
  marked,
  nameOf,
  outcomeOf,
  PARTS,
  type Part,
  qualifiers,
  rebuttalFrom,
  reconOf,
  typeName,
  typeOf,
} from "./graph-data";
import { FullSize, useWidth } from "./graph-ui";
import { shown, streaming, WorkingHere } from "./kit";
import { Bars, scrollSoon } from "./outline-kit";
import { file, fill, LIVE } from "./run";
import { StatusPill, TONE as TONE_OF, type Tone } from "./stage-kit";
import {
  type BarRow,
  SubHead as ChartHead,
  EffectList,
  ResultGrid,
  Section,
  type Part as Slice,
  StageAccent,
  type Swatch,
  Takeaway,
} from "./stage-visual";
import { Term } from "./term";
import type { ToulminCard } from "./types";

/** What is checked on every card, listed before the first card is in. */
const CHECKS = [
  "Data traces to the record",
  "Warrant written in a source",
  "Backing is a source, a check or the lock",
  "Every concession qualifies the claim",
  "Every upheld challenge is a rebuttal",
];
/** What an exchange came to, as a mark of the one colour system, in the order of the debate's chart. */
const OUTCOME_ORDER = ["answered", "closed_from_record", "conceded", "upheld", "struck"];
const OUTCOME_SWATCH: Record<string, Swatch> = {
  answered: "ok",
  closed_from_record: "okSoft",
  conceded: "look",
  upheld: "bad",
  struck: "none",
};
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
/** Parts drawn before each part appears: data, so, claim; then what holds it up, and what would undo it. */
const PART_AT = Object.fromEntries(PARTS.map((p, i) => [p, i + 1])) as Record<Part, number>;

/** The words a part types out while it is drawn; a part that lists its items brings them in one by one instead. */
export function typedText(card: ToulminCard, part: Part) {
  if (part === "claim") return fill(card.claim);
  if (part === "war") return fill(card.warrant);
  if (part === "qual") return qualifiers(card).main?.text ?? "";
  return "";
}
/** How long a listing part takes to come in, at the preview's pace. */
export function partWait(card: ToulminCard, part: Part) {
  if (part === "data") return 420 + card.data.length * 110;
  if (part === "back") return 380 + card.backing.length * 110;
  if (part === "reb") return 420 + card.rebuttals.length * 140;
  return 420;
}

const isOpen = (sid: string) => S.st[sid]?.status === "done";
/** Goes to another screen of the run, as the track does. */
function openScreen(key: string) {
  S.view = key === S.live ? null : key;
  emit();
  scrollTop();
}

/* ---------- the parts ---------- */
/* Every part is a light card with dark text, told apart by its tag. Only a warrant no source states takes a colour:
   amber and dashed, written with care. The claim stands out by a firmer frame, not by a block of colour. */
const TONE: Record<Exclude<Part, "qual" | "claim">, string> = {
  data: "border-foreground/15 bg-card",
  war: "border-foreground/15 bg-muted/50",
  back: "border-foreground/15 bg-card",
  reb: "border-foreground/15 bg-muted/50",
};
const CLAIM = "border-2 border-foreground/45 bg-card shadow-xs";
const RECON = "border-amber-500/70 border-dashed bg-amber-50 dark:bg-amber-950/30";
const BOX = "relative flex flex-col gap-1.5 overflow-hidden rounded-xl border px-3 py-2.5 text-[13px] leading-snug";
const PILL =
  "flex w-full flex-col items-center justify-center gap-0.5 rounded-2xl border border-foreground/20 bg-card px-3 py-2 text-center text-[13px]";
const TAG_CLS = "font-semibold text-[11px] text-muted-foreground uppercase tracking-wide";

/** Where a part came from, under it: a ruling of the debate or a source. Its room is kept until it is tied, so the
 * card never grows when the sources arrive. */
function From({ on, children, className }: { on: boolean; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "flex items-start gap-1 text-left font-mono text-[11px] text-muted-foreground transition-opacity duration-500",
        !on && "opacity-0",
        className,
      )}
    >
      <Icon n="gavel" className="mt-px size-3 shrink-0" />
      <span className="min-w-0 break-words">{children}</span>
    </span>
  );
}
const Item = ({
  anim,
  i,
  className,
  children,
}: {
  anim: boolean;
  i: number;
  className?: string;
  children: ReactNode;
}) =>
  anim ? (
    <M as="li" in="up4" delay={i * 0.09} className={className}>
      {children}
    </M>
  ) : (
    <li className={className}>{children}</li>
  );

/** An id of the record, small and quiet beside the words it stands for. */
const IdChip = ({ children }: { children: ReactNode }) => (
  <b className="rounded bg-muted px-1 font-medium font-mono text-[11px] text-muted-foreground">{children}</b>
);

/** A value, statement, source, check or the lock, with the words it stands for. */
function GroundRow({ g }: { g: Ground }) {
  if (g.kind === "value")
    return (
      <>
        <span className="flex flex-wrap items-baseline gap-x-1.5">
          <IdChip>{g.head}</IdChip>
          <b className="font-semibold tabular-nums">{g.text}</b>
        </span>
        {g.note && <span className="text-[12px] text-muted-foreground leading-snug">{g.note}</span>}
      </>
    );
  if (g.kind === "statement")
    return (
      <>
        <span className="flex items-center gap-1.5">
          <b className="font-medium">{g.head}</b>
          <IdChip>{g.id}</IdChip>
        </span>
        <span className="leading-snug">{g.text}</span>
      </>
    );
  const icon = g.kind === "source" ? "book" : g.kind === "lock" ? "lock" : g.kind === "check" ? "shield" : "alert";
  return (
    <>
      <span className="flex items-center gap-1.5">
        <Icon n={icon} className="size-3.5 shrink-0 text-muted-foreground" />
        <b className="font-medium">{g.head}</b>
      </span>
      {g.text && <span className="leading-snug">{g.text}</span>}
      {g.note && <span className="text-[12px] text-muted-foreground leading-snug">{g.note}</span>}
    </>
  );
}

/** The kinds of backing a card names (newer runs): the protocol lock, an assumption check, or the method. */
const BACKING_KIND: Record<string, string> = {
  lock: "The protocol lock",
  check: "An assumption check",
  method: "The method",
};
function backingKinds(card: ToulminCard): string[] {
  const kinds = (card as ToulminCard & { backing_kinds?: unknown }).backing_kinds;
  return Array.isArray(kinds) ? kinds.filter((k): k is string => typeof k === "string") : [];
}
const listOf = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}` : (xs[0] ?? ""));

/** The body of each part of a card. `anim` brings its items in; `on` types the text being drawn; `tied` shows where
 * each part came from; `recon` marks a warrant no source states. */
function partBody(card: ToulminCard, part: Part, o: { anim: boolean; on: boolean; tied: boolean; recon: boolean }) {
  const typed = (text: string) => <Typed text={text} on={o.on} />;
  if (part === "data")
    return (
      <ul className="flex flex-col gap-2">
        {card.data.map((d, i) => (
          <Item key={d} anim={o.anim} i={i} className="flex flex-col gap-0.5">
            <GroundRow g={ground(d)} />
          </Item>
        ))}
      </ul>
    );
  if (part === "qual") {
    const q = qualifiers(card);
    return (
      <>
        <span className="font-medium">{typed(q.main?.text ?? "")}</span>
        {q.main?.from && <From on={o.tied}>Conceded · {q.main.from}</From>}
        {q.extra.length > 0 && (
          <span className="mt-1.5 flex w-full flex-col gap-1 border-t pt-1.5 text-left">
            <span className={TAG_CLS}>Also conceded · {q.extra.length}</span>
            <ul className="flex flex-col gap-1.5 leading-snug">
              {q.extra.map((x, i) => (
                <Item key={x.text} anim={o.anim} i={i} className="flex flex-col">
                  <span>{x.text}</span>
                  {x.from && <From on={o.tied}>{x.from}</From>}
                </Item>
              ))}
            </ul>
          </span>
        )}
      </>
    );
  }
  if (part === "claim") return <span className="font-medium">{typed(fill(card.claim))}</span>;
  if (part === "war") {
    const src = card.warrant_source ? ground(card.warrant_source) : null;
    const marks = o.recon && reconOf(card);
    return (
      <>
        <span>{typed(fill(card.warrant))}</span>
        {src && <From on={o.tied}>Source · {src.text}</From>}
        {(marks || endorsedOf(card)) && (
          <span className="flex flex-wrap gap-1.5 pt-0.5">
            {marks && <StatusPill tone="look">No source states it</StatusPill>}
            {endorsedOf(card) && <StatusPill tone="ok">Endorsed by you</StatusPill>}
          </span>
        )}
      </>
    );
  }
  if (part === "back") {
    // What kind of backing each item is, where the card says it: the lock, a check, or the method.
    const kinds = backingKinds(card);
    const each = kinds.length === card.backing.length;
    return (
      <>
        <ul className="flex flex-col gap-2">
          {card.backing.map((b, i) => (
            <Item key={b} anim={o.anim} i={i} className="flex flex-col gap-0.5">
              {each && (
                <span className="text-[11.5px] text-muted-foreground">{BACKING_KIND[kinds[i]] ?? kinds[i]}</span>
              )}
              <GroundRow g={ground(b)} />
            </Item>
          ))}
        </ul>
        {!each && kinds.length > 0 && (
          <span className="text-[12px] text-muted-foreground leading-snug">
            Backed by {listOf([...new Set(kinds)].map((k) => (BACKING_KIND[k] ?? k).toLowerCase()))}
          </span>
        )}
      </>
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {card.rebuttals.map((r, i) => {
        const from = rebuttalFrom(card, r);
        const text = fill(r);
        return (
          <Item key={r} anim={o.anim} i={i} className="grid grid-cols-[8px_minmax(0,1fr)] gap-x-1.5">
            <span className="mt-[7px] size-1.5 rounded-full bg-foreground/40" />
            <span className="flex flex-col items-start gap-0.5">
              <span>{text}</span>
              {from && <From on={o.tied}>Upheld · {from}</From>}
            </span>
          </Item>
        );
      })}
    </ul>
  );
}
const TAG: Record<Part, string> = {
  data: "Data",
  qual: "So, qualifier",
  claim: "Claim",
  war: "Warrant · since",
  back: "Backing · on account of",
  reb: "Rebuttal · unless",
};
const toneOf = (card: ToulminCard, part: Part, recon: boolean) =>
  part === "claim" ? CLAIM : part === "qual" ? "" : part === "war" && recon && reconOf(card) ? RECON : TONE[part];
const tagOf = (id: string, part: Part) =>
  part === "claim" && typeOf(id) ? `Claim · ${typeName(typeOf(id)).toLowerCase()}` : TAG[part];

/** One part in the drawing: an outline until it is drawn, then its words. */
function PartNode({
  id: k,
  card,
  part,
  drawn,
  active,
  on,
  tied,
  recon,
}: {
  id: string;
  card?: ToulminCard;
  part: Part;
  drawn: boolean;
  active: boolean;
  on: boolean;
  tied: boolean;
  recon: boolean;
}) {
  if (!drawn || !card)
    return (
      <div
        className={cn(
          "flex h-full flex-col gap-2 border border-dashed bg-card px-3 py-2.5",
          part === "qual" ? "items-center justify-center rounded-2xl" : "rounded-xl",
        )}
      >
        <span className={TAG_CLS}>{tagOf(k, part)}</span>
        <Skeleton aria-hidden="true" className={cn("h-2.5 w-4/5 rounded-full", !active && "animate-none")} />
        <Skeleton aria-hidden="true" className={cn("h-2.5 w-1/2 rounded-full", !active && "animate-none")} />
      </div>
    );
  const body = partBody(card, part, { anim: true, on, tied, recon });
  if (part === "qual")
    return (
      <M key={`${k}-qual`} in="fade" data-cursor="tou:qual" className={cn(PILL, "h-full")}>
        <span className={TAG_CLS}>{TAG.qual}</span>
        {body}
      </M>
    );
  return (
    <M
      key={`${k}-${part}`}
      in="up4"
      data-cursor={`tou:${part}`}
      className={cn(BOX, "h-full", toneOf(card, part, recon))}
    >
      <span className={TAG_CLS}>{tagOf(k, part)}</span>
      {body}
    </M>
  );
}

/* ---------- where each part sits ---------- */
/* Drawn at full size, as wide as the card holds at 13 px. */
const WIDE_W: Record<Part, number> = { data: 236, qual: 196, claim: 256, war: 236, back: 236, reb: 256 };
const NARROW_W: Record<Part, number> = { data: 290, qual: 250, claim: 290, war: 290, back: 290, reb: 290 };
const GUESS: Record<Part, number> = { data: 150, qual: 90, claim: 130, war: 170, back: 120, reb: 200 };
const GAP = 40;
/** The card width from which the parts sit side by side: the drawing, its frame's margin and the card's own inset. */
const WIDE_MIN = Math.ceil((WIDE_W.data + WIDE_W.qual + WIDE_W.claim + 2 * GAP) * 1.07) + 32;
/** The claim to the right of its data, warrant and backing under the qualifier, the rebuttals under the claim; on a
 * phone, one column read from the top. Rows are as tall as their tallest part, and parts in a row share its middle. */
function place(h: Record<Part, number>, wide: boolean): { at: Record<Part, Box>; w: number; h: number } {
  if (wide) {
    const W = WIDE_W;
    const qx = W.data + GAP;
    const cx = qx + W.qual + GAP;
    const mid = qx + W.qual / 2;
    const row = Math.max(h.data, h.qual, h.claim);
    const y2 = row + 72;
    const at: Record<Part, Box> = {
      data: { x: 0, y: (row - h.data) / 2, w: W.data, h: h.data },
      qual: { x: qx, y: (row - h.qual) / 2, w: W.qual, h: h.qual },
      claim: { x: cx, y: (row - h.claim) / 2, w: W.claim, h: h.claim },
      war: { x: mid - W.war / 2, y: y2, w: W.war, h: h.war },
      back: { x: mid - W.back / 2, y: y2 + h.war + 56, w: W.back, h: h.back },
      reb: { x: cx, y: y2, w: W.reb, h: h.reb },
    };
    return { at, w: cx + W.claim, h: Math.max(at.back.y + h.back, at.reb.y + h.reb) };
  }
  const W = NARROW_W;
  let y = 0;
  const at = {} as Record<Part, Box>;
  for (const p of ["data", "qual", "claim", "war", "back", "reb"] as Part[]) {
    at[p] = { x: p === "qual" ? 20 : 0, y, w: W[p], h: h[p] };
    y += h[p] + (p === "data" || p === "qual" ? 44 : 56);
  }
  return { at, w: NARROW_W.data + 40, h: y - 56 };
}

/**
 * The real height of each part of a card at the width it is drawn: every part is laid out once, out of sight, in full
 * (all its items, all its sources), and measured. A part never outgrows its place while it is typed or filled.
 */
function useHeights(card: ToulminCard | undefined, wide: boolean) {
  const [el, host] = useState<HTMLDivElement | null>(null);
  const [h, setH] = useState<Record<string, number>>({});
  const key = card ? `${card.claim_id}:${wide}` : "";
  useLayoutEffect(() => {
    if (!el || !key) return;
    const read = () => {
      const next: Record<string, number> = {};
      for (const n of el.querySelectorAll<HTMLElement>("[data-measure]"))
        next[n.dataset.measure as string] = Math.ceil(n.offsetHeight);
      setH((old) => (PARTS.every((p) => old[`${key}:${p}`] === next[p]) ? old : { ...old, ...prefix(key, next) }));
    };
    read();
    const ro = new ResizeObserver(read);
    for (const n of el.querySelectorAll("[data-measure]")) ro.observe(n);
    return () => ro.disconnect();
  }, [el, key]);
  const heights = Object.fromEntries(PARTS.map((p) => [p, h[`${key}:${p}`] ?? GUESS[p]])) as Record<Part, number>;
  const W = wide ? WIDE_W : NARROW_W;
  const measurer = card ? (
    <div ref={host} aria-hidden="true" className="pointer-events-none invisible absolute top-0 left-0 -z-10">
      {PARTS.map((p) => {
        const body = partBody(card, p, { anim: false, on: false, tied: true, recon: true });
        return p === "qual" ? (
          <div key={p} data-measure={p} style={{ width: W[p] }} className={PILL}>
            <span className={TAG_CLS}>{TAG.qual}</span>
            {body}
          </div>
        ) : (
          <div key={p} data-measure={p} style={{ width: W[p] }} className={cn(BOX, toneOf(card, p, true))}>
            <span className={TAG_CLS}>{tagOf(card.claim_id, p)}</span>
            {body}
          </div>
        );
      })}
    </div>
  ) : null;
  return { heights, measurer };
}
const prefix = (key: string, o: Record<string, number>) =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [`${key}:${k}`, v]));

/* ---------- the claims, one row each: the picker of the drawing below ---------- */
/** The columns of a row: the claim, its warrant, and how far it reaches. */
const ROW = "grid gap-x-5 gap-y-1.5 @min-[760px]:grid-cols-[11rem_minmax(0,1fr)_minmax(0,15rem)]";
/** A field's name, shown on a phone where the columns have no head. */
const Field = ({ children }: { children: ReactNode }) => (
  <span className="@min-[760px]:hidden font-medium text-muted-foreground text-xs">{children}</span>
);

function ClaimRow({
  id,
  card,
  parts,
  picked,
  drawing,
  recon,
  tied,
  onPick,
}: {
  id: string;
  card?: ToulminCard;
  parts: number;
  picked: boolean;
  drawing: boolean;
  recon: boolean;
  tied: boolean;
  onPick(): void;
}) {
  const ready = Boolean(card) && parts > 0;
  const src = card?.warrant_source ? ground(card.warrant_source) : null;
  const conceded = card && parts >= PART_AT.qual ? concededOf(id).length : null;
  const rebuttals = card && parts >= PART_AT.reb ? card.rebuttals.length : null;
  const main = card ? qualifiers(card).main?.text : undefined;
  return (
    <li className="border-t first:border-t-0">
      <button
        type="button"
        onClick={onPick}
        disabled={!ready}
        aria-pressed={picked}
        data-claim-row={id}
        className={cn(
          ROW,
          "w-full px-4 py-3 text-left outline-none transition-colors focus-visible:bg-muted/50 enabled:hover:bg-muted/40 sm:px-5",
          picked && "bg-muted/70 enabled:hover:bg-muted/70",
          !ready && "cursor-default",
        )}
      >
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="flex items-baseline gap-1.5">
            <b className="font-semibold text-sm">{nameOf(id)}</b>
            <span className="font-mono text-muted-foreground text-xs">{id}</span>
          </span>
          {card && parts > 0 && parts < PARTS.length ? (
            <span className="flex items-center gap-1.5 text-muted-foreground text-xs tabular-nums">
              {drawing && <PulseDot className="bg-sky-500" />}
              {parts} of 6 parts drawn
            </span>
          ) : (
            rebuttals != null && (
              <span className="text-muted-foreground text-xs tabular-nums">
                {conceded} conceded · {rebuttals} {rebuttals === 1 ? "rebuttal" : "rebuttals"}
              </span>
            )
          )}
        </span>
        <span className="flex min-w-0 flex-col gap-1">
          <Field>Warrant</Field>
          {card && parts >= PART_AT.war ? (
            <>
              <span className="line-clamp-4 @min-[760px]:line-clamp-none text-pretty text-[13px] leading-snug">
                <Typed text={fill(card.warrant)} on={streaming(LIST.tou, `${id}:war`)} />
              </span>
              {((recon && reconOf(card)) || endorsedOf(card) || (src && tied)) && (
                <span className="flex flex-wrap items-center gap-1.5">
                  {recon && reconOf(card) && <StatusPill tone="look">No source states it</StatusPill>}
                  {endorsedOf(card) && <StatusPill tone="ok">Endorsed by you</StatusPill>}
                  {src && tied && <span className="truncate text-muted-foreground text-xs">Source: {src.text}</span>}
                </span>
              )}
            </>
          ) : (
            <Bars n={2} last="w-3/5" />
          )}
        </span>
        <span className="flex min-w-0 flex-col gap-1">
          <Field>Main qualifier</Field>
          {card && parts >= PART_AT.qual ? (
            <span className="text-pretty text-[13px] leading-snug">
              <Typed text={main ?? ""} on={streaming(LIST.tou, `${id}:qual`)} />
              {!main && <span className="text-muted-foreground">None</span>}
            </span>
          ) : (
            <Bars n={1} last="w-4/5" />
          )}
        </span>
      </button>
    </li>
  );
}

/* ---------- the scene ---------- */
export function ToulminLive({ live }: { live: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const [pin, setPin] = useState<string | null>(null);
  const lastFocus = useRef<string | null>(null);
  const { fresh, seen } = useFresh(live);
  // The card's own width picks the drawing: side by side where it holds it at full size, one column otherwise.
  const { w: cardW, ref: cardRef } = useWidth();
  const wideScreen = useMedia("(min-width: 1024px)");
  const wide = cardW ? cardW >= WIDE_MIN : wideScreen;
  const all = cards();
  // Before the cards are in, the claims the debate argued stand in the list, to be drawn.
  const ids = all.length
    ? all.map((c) => c.claim_id)
    : (file("DebateRecord.json")?.claims.map((c) => c.claim_id) ?? []);
  const st = S.st.S05;
  const total = all.length * PARTS.length;
  const drawn = shown("S05", LIST.tou, total);
  const partsOf = (i: number) => Math.max(0, Math.min(PARTS.length, drawn - i * PARTS.length));
  const focusIdx = drawn ? Math.min(all.length - 1, Math.floor((drawn - 1) / PARTS.length)) : 0;
  const drawing = st.status !== "done" && drawn < total;
  if (drawing && all[focusIdx]) lastFocus.current = all[focusIdx].claim_id;
  const k = pin ?? (drawing ? ids[focusIdx] : (lastFocus.current ?? ids[0])) ?? "";
  const idx = Math.max(0, ids.indexOf(k));
  const card = all.find((c) => c.claim_id === k);
  const { heights, measurer } = useHeights(card, wide);
  const tied = marked(MARK.tied) || isOpen("S05");
  const recon = marked(MARK.recon) || isOpen("S05");
  const parts = card ? partsOf(idx) : 0;
  const building = live && st.status === "running" && drawing && focusIdx === idx;
  const { at, w: bw, h: bh } = place(heights, wide);
  // A part is put on the page by the drawing a moment after it is drawn: the pointer looks for it again then.
  const [settled, settle] = useState(0);
  const drawnKey = `${k}:${parts}`;
  useEffect(() => {
    void drawnKey;
    const t = window.setTimeout(() => settle((n) => n + 1), 90);
    return () => window.clearTimeout(t);
  }, [drawnKey]);

  // The six parts stand in their places from the start; each fills as the Graph Builder draws it.
  const nodes: BoxNode[] = PARTS.map((part) => ({
    id: `${k}-${part}`,
    type: "box",
    position: { x: at[part].x, y: at[part].y },
    width: at[part].w,
    height: at[part].h,
    data: {
      w: at[part].w,
      h: at[part].h,
      content: (
        <PartNode
          id={k}
          card={card}
          part={part}
          drawn={parts >= PART_AT[part]}
          active={building}
          on={streaming(LIST.tou, `${k}:${part}`)}
          tied={tied}
          recon={recon}
        />
      ),
    },
  }));
  // In one column the lines round the cards on the right: an empty mark keeps that margin inside the drawing.
  if (!wide)
    nodes.push({
      id: `${k}-margin`,
      type: "box",
      position: { x: NARROW_W.data + 40, y: 0 },
      width: 1,
      height: 1,
      data: { w: 1, h: 1, content: null },
    });
  /* Each line leaves and enters by the sides that face each other, so it runs straight between two cards. In one
     column, a line from below the claim to above it goes round the right-hand side, each at its own distance. */
  const ROUTE: Record<string, [string, string, number?]> = wide
    ? {
        "data-qual": ["rs", "lt"],
        "qual-claim": ["rs", "lt"],
        "war-qual": ["ts", "bt"],
        "back-war": ["ts", "bt"],
        "reb-claim": ["ts", "bt"],
      }
    : {
        "data-qual": ["b", "t"],
        "qual-claim": ["b", "t"],
        "war-qual": ["rs", "rt", 18],
        "back-war": ["ts", "bt"],
        "reb-claim": ["rs", "rt", 36],
      };
  const dashed = recon && card ? reconOf(card) : false;
  const link = (from: Part, to: Part, stroke: string, fill: string, dash?: string): LinkEdge => {
    const id = `${k}-${from}-${to}`;
    const [sh, th, offset] = ROUTE[`${from}-${to}`];
    return {
      id,
      type: "link",
      source: `${k}-${from}`,
      target: `${k}-${to}`,
      sourceHandle: sh,
      targetHandle: th,
      data: { stroke, fill, dash, step: true, offset, fresh: fresh(id) },
    };
  };
  // A line is drawn once both cards it joins are on the page.
  const joined = (a: Part, b: Part) => parts >= PART_AT[a] && parts >= PART_AT[b];
  const LINE = ["stroke-foreground/40", "fill-foreground/40"] as const;
  const edges = (
    [
      joined("data", "qual") && link("data", "qual", ...LINE),
      joined("qual", "claim") && link("qual", "claim", ...LINE),
      joined("war", "qual") &&
        (dashed ? link("war", "qual", "stroke-amber-500", "fill-amber-500", "4 4") : link("war", "qual", ...LINE)),
      joined("back", "war") && link("back", "war", ...LINE),
      joined("reb", "claim") && link("reb", "claim", ...LINE, "3 3"),
    ] as (LinkEdge | false)[]
  ).filter((e): e is LinkEdge => e !== false);
  useEffect(() => seen(edges.map((e) => e.id)));

  const name = k ? nameOf(k) : "";
  const checks = card
    ? cardChecks(card)
    : CHECKS.map((label) => ({ label, at: 99, pass: false, note: "", tone: "look" as const, recon: false }));
  let target: string | null = null;
  if (building && parts > 0) target = `tou:${PARTS[parts - 1]}`;
  const from = (card?.from_exchanges ?? []).map((id) => ({ id, x: exchange(id) }));
  const drafting = LIVE.calls.some((c) => c.stage === "S05" && !c.done && /^toulmin/.test(c.task));
  const done = isOpen("S05");

  // The takeaway, once every claim is drawn and the warrants no source states are marked.
  const complete = done || (total > 0 && drawn >= total);
  const N = all.length;
  const reconN = all.filter(reconOf).length;
  const endorsed = all.filter((c) => reconOf(c) && endorsedOf(c)).length;
  const _rebuttals = all.reduce((n, c) => n + c.rebuttals.length, 0);
  const headline =
    reconN === N
      ? `No source states the warrant of any of the ${N} claims: each is reconstructed, so the paper gives it as the study's own assumption.`
      : reconN
        ? `No source states ${reconN} of the ${N} claims' warrants: the paper gives those as the study's own assumption.`
        : `A source states the warrant of each of the ${N} claims.`;
  // The claims drawn in full so far, and what their cards answer in the debate once they are tied to it.
  const _whole = all.filter((_, i) => partsOf(i) >= PARTS.length).length;
  const tiedAll = tied && complete;
  const answered = [...new Set(all.flatMap((c) => c.from_exchanges))];
  const outcomeCount = (o: string) => answered.filter((id) => exchange(id)?.outcome === o).length;
  const _warrantSlices: Slice[] = [
    { key: "src", label: "Stated in a source", value: recon ? N - reconN : 0, swatch: "ok" },
    { key: "endorsed", label: "Endorsed by you", value: recon ? endorsed : 0, swatch: "okSoft" },
    { key: "recon", label: "Reconstructed", value: recon ? reconN - endorsed : 0, swatch: "look" },
  ].filter((s) => s.value > 0 || s.key !== "endorsed" || endorsed > 0) as Slice[];
  const _rows: BarRow[] = all.map((c, i) => {
    const xs = c.from_exchanges;
    const of = (o: string) => (tiedAll ? xs.filter((id) => exchange(id)?.outcome === o).length : 0);
    return {
      key: c.claim_id,
      name: `${nameOf(c.claim_id)} (${c.claim_id})`,
      label: (
        <>
          {nameOf(c.claim_id)} <span className="font-mono text-[11px] text-muted-foreground">{c.claim_id}</span>
        </>
      ),
      parts: OUTCOME_ORDER.map((o) => ({
        key: o,
        label: outcomeOf(o).name,
        value: of(o),
        swatch: OUTCOME_SWATCH[o],
      })),
      total: xs.length,
      end: plural(xs.length, "exchange"),
    };
  });
  const _rowParts = OUTCOME_ORDER.map((o) => ({
    key: o,
    label: outcomeOf(o).name,
    value: tiedAll ? outcomeCount(o) : 0,
    swatch: OUTCOME_SWATCH[o],
  })).filter((p) => p.value > 0);
  // The five checks of every card, over the cards drawn so far.
  const checkItems = CHECKS.map((label, j) => {
    const known = all
      .map((c, i) => ({ c, i }))
      .filter(({ c, i }) => {
        const x = cardChecks(c)[j];
        return partsOf(i) >= x.at && (!x.recon || recon);
      });
    const pass = known.filter(({ c }) => cardChecks(c)[j].pass).length;
    const building = live && st.status === "running";
    if (!known.length)
      return {
        key: label,
        title: label,
        result: building ? "Checked as each card is drawn" : "Not checked yet",
        tone: (building ? "now" : "wait") as "now" | "wait",
      };
    const all_ = known.length === N;
    return {
      key: label,
      title: label,
      result: `${pass} of ${plural(all_ ? N : known.length, "card")} pass${all_ ? "" : " so far"}`,
      tone: (pass === known.length ? "ok" : "look") as Tone,
    };
  });
  // What the cards do to the paper: the rule for reconstructed warrants, then each claim's sentence.
  const effects: { key: string; item: string; id?: string; effect: ReactNode; tone: Tone }[] = [
    ...(reconN
      ? [
          {
            key: "recon",
            item: `${plural(reconN, "reconstructed warrant")}`,
            effect: "stated as the study's own assumption, never as a fact or a quote.",
            tone: "look" as const,
          },
        ]
      : []),
    ...all.map((c) => {
      const main = qualifiers(c).main?.text;
      const r = reconOf(c) && !endorsedOf(c);
      // When every warrant is reconstructed, the line above says it once for all.
      const say = r && reconN < N;
      return {
        key: c.claim_id,
        item: nameOf(c.claim_id),
        id: c.claim_id,
        effect: (
          <>
            {main ? <>its sentence carries “{main}”</> : "its sentence carries no qualifier"}
            {c.rebuttals.length ? `; ${plural(c.rebuttals.length, "rebuttal")} named` : ""}
            {say ? "; its warrant is the study's own assumption" : ""}.
          </>
        ),
        tone: (r ? "look" : "ok") as Tone,
      };
    }),
  ];
  const known = (c: (typeof checks)[number]) => Boolean(card) && parts >= c.at && (!c.recon || recon);
  const checked = checks.filter(known);

  return (
    <StageAccent accent="indigo">
      <div ref={host} className="@container relative flex min-w-0 flex-col gap-5">
        {drafting && <WorkingHere sid="S05" task={/^toulmin/} />}
        <Section
          icon="target"
          title="What this stage did"
          tells="Each claim the debate argued is drawn in six parts: the data, the qualifier, the claim, the warrant that links them, its backing, and the rebuttals that would undo it."
          data-overview
        >
          <div className="@container flex flex-col gap-4 px-4 py-4 sm:px-5">
            <Takeaway ready={complete && recon && N > 0}>{headline}</Takeaway>
            <div className="flex flex-col gap-2">
              <ChartHead
                title="Where each claim's warrant comes from"
                tells="The warrant says why the data support the claim. A solid green edge: a source states it. A dashed amber edge: no source does, so the AI reconstructed it and the paper gives it as the study's own assumption. Pick a claim to draw it below."
              />
              <ul className="flex flex-wrap gap-2">
                {(all.length ? all : []).map((c, i) => {
                  const r = recon && reconOf(c);
                  const e = r && endorsedOf(c);
                  const whole = partsOf(i) >= PARTS.length;
                  return (
                    <li key={c.claim_id}>
                      <button
                        type="button"
                        onClick={() => {
                          setPin(c.claim_id);
                          scrollSoon("[data-six]");
                        }}
                        className={cn(
                          "flex min-w-0 flex-col items-start gap-0.5 rounded-lg bg-card px-3 py-2 text-left transition-colors hover:bg-muted/50",
                          !whole || !recon
                            ? "border border-foreground/15"
                            : r && !e
                              ? "border-2 border-amber-500 border-dashed dark:border-amber-400"
                              : "border-2 border-emerald-500 dark:border-emerald-400",
                          c.claim_id === k && "ring-2 ring-indigo-400 ring-offset-1 ring-offset-background",
                        )}
                      >
                        <span className="font-medium text-[13px] leading-tight">{nameOf(c.claim_id)}</span>
                        <span className="text-[11.5px] text-muted-foreground">
                          {!whole
                            ? "drawing…"
                            : !recon
                              ? c.claim_id
                              : r
                                ? e
                                  ? "endorsed by you"
                                  : "reconstructed"
                                : "stated in a source"}
                          {whole && c.rebuttals.length ? ` · ${plural(c.rebuttals.length, "rebuttal")}` : ""}
                        </span>
                      </button>
                    </li>
                  );
                })}
                {!all.length && <Bars n={1} last="w-2/3" />}
              </ul>
            </div>
            <div className="flex flex-col gap-2">
              <ChartHead
                title="The five checks on every card"
                tells="Each check over all the cards, with how many pass. Click one to read it claim by claim."
              />
              <ResultGrid items={checkItems.map((x) => ({ ...x, onPick: () => scrollSoon("[data-checks]") }))} />
            </div>
          </div>
        </Section>

        {/* The picked claim in six parts: the method's picture. */}
        <div ref={cardRef} data-six className="min-w-0 scroll-mt-4">
          <Section
            icon="layers"
            title={
              name ? (
                <>
                  {name} <span className="font-mono font-normal text-[12px] text-muted-foreground">{k}</span> in six
                  parts
                </>
              ) : (
                "A claim in six parts"
              )
            }
            tells="The data lead, so far as the qualifier allows, to the claim; the warrant says why, its backing what it stands on, and a rebuttal what would undo it."
            aside={
              pin && drawing ? (
                <Button variant="ghost" size="xs" className="text-muted-foreground" onClick={() => setPin(null)}>
                  Follow the Graph Builder
                </Button>
              ) : undefined
            }
            className="relative scroll-mt-4"
          >
            {/* The legend, above the drawing: how the six parts read. */}
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b px-4 py-2 text-[12.5px] text-muted-foreground sm:px-5">
              <span>
                <Term t="data">Data</Term> → so, <Term t="qualifier">qualifier</Term> → claim
              </span>
              <span>
                since <Term t="warrant">warrant</Term>, on account of <Term t="backing">backing</Term>
              </span>
              <span>
                unless <Term t="rebuttal">rebuttal</Term>
              </span>
              <span className="flex items-center gap-1.5">
                <i className="h-0 w-4 border-amber-500 border-t-2 border-dashed" />
                <Term t="reconstructed">reconstructed</Term> warrant: no source states it
              </span>
            </p>
            <div className="relative">
              {measurer}
              <FullSize
                label={name ? `${name} in six parts` : "A claim in six parts"}
                nodes={nodes}
                edges={edges}
                nodeTypes={BOX_TYPES}
                size={{ w: bw, h: bh }}
                fitKey={`${k}-${wide}-${Math.round(bh)}`}
              />
            </div>
          </Section>
        </div>

        <Section
          icon="pen"
          title="What it means for the paper"
          tells="What each claim's sentence must carry, and how a warrant no source states is written."
        >
          <div className="px-4 py-3 sm:px-5">
            {complete && recon && N > 0 ? <EffectList items={effects} /> : <Bars n={3} last="w-1/2" className="py-2" />}
          </div>
        </Section>

        {/* The claims, one row each; a row draws its claim in six parts below. */}
        <Section
          icon="list"
          title="Each claim, its warrant and how far it reaches"
          tells="Why the data support each claim (its warrant) and how far the claim reaches (its main qualifier). Pick one to see it drawn below."
          aside={N ? plural(N, "claim") : undefined}
          data-out="ToulminCards.json"
          className="scroll-mt-4"
        >
          <div
            aria-hidden="true"
            className={cn(
              ROW,
              "@min-[760px]:grid hidden border-b bg-muted/30 px-4 py-2 font-medium text-[12px] text-muted-foreground sm:px-5",
            )}
          >
            <span>Claim</span>
            <span>Warrant: why the data support it</span>
            <span>Main qualifier: how far it reaches</span>
          </div>
          <ul className="flex flex-col">
            {ids.map((id, i) => (
              <ClaimRow
                key={id}
                id={id}
                card={all[i]}
                parts={all[i] ? partsOf(i) : 0}
                picked={id === k}
                drawing={building && focusIdx === i}
                recon={recon}
                tied={tied}
                onPick={() => setPin(id)}
              />
            ))}
            {!ids.length &&
              [0, 1, 2, 3, 4].map((i) => (
                <li key={i} className={cn(ROW, "border-t px-4 py-3.5 first:border-t-0 sm:px-5")}>
                  <Bars n={1} last="w-2/3" />
                  <Bars n={2} last="w-3/5" />
                  <Bars n={1} last="w-4/5" />
                </li>
              ))}
          </ul>
        </Section>

        <Section
          icon="shield"
          title={name ? `Checks on ${name}, and the debate behind it` : "Checks on the claim, and the debate behind it"}
          tells="What is checked on every card, and the exchanges of the debate this card answers. A click on an exchange opens the debate."
          aside={
            card && checked.length
              ? `${checked.filter((c) => c.pass).length} of ${checked.length} checks pass`
              : undefined
          }
          data-checks
          className="scroll-mt-4"
        >
          <div className="grid gap-x-8 gap-y-4 px-4 py-4 sm:px-5 lg:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-2">
              <ChartHead title="The checks on the card" />
              <ul className="flex flex-col gap-2.5 text-[13.5px]">
                {checks.map((c) => {
                  const ok = known(c);
                  return (
                    <li key={c.label} className="grid grid-cols-[16px_minmax(0,1fr)] items-start gap-2.5">
                      {ok ? (
                        <M as="span" in="fade">
                          <Icon
                            n={c.pass ? "circleCheck" : "alert"}
                            className={cn("mt-0.5 size-4", c.pass ? TONE_OF.ok.text : TONE_OF.look.text)}
                          />
                        </M>
                      ) : (
                        <span className="mt-1 size-3 rounded-full border border-foreground/25" />
                      )}
                      <span className={cn(!ok && "text-muted-foreground")}>
                        {c.label}
                        {ok && c.note && <span className="block text-[12.5px] text-muted-foreground">{c.note}</span>}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="flex min-w-0 flex-col gap-2">
              <ChartHead title="From the debate" aside={card ? plural(from.length, "exchange") : undefined} />
              {tied && card ? (
                <ul className="flex flex-col divide-y rounded-lg ring-1 ring-foreground/10">
                  {from.map(({ id, x }, i) => {
                    const o = x ? outcomeOf(x.outcome) : null;
                    return (
                      <M as="li" key={id} in="up4" delay={i * 0.05}>
                        <button
                          type="button"
                          onClick={() => openScreen("debate")}
                          title="Open the debate"
                          className="grid w-full gap-x-4 gap-y-1 px-3 py-2.5 text-left transition-colors hover:bg-muted/50 sm:grid-cols-[minmax(0,1fr)_auto]"
                        >
                          <span className="flex min-w-0 flex-col gap-0.5">
                            <span className="text-pretty text-[13px] leading-snug">{x?.question ?? id}</span>
                            <span className="font-mono text-[11.5px] text-muted-foreground">{id}</span>
                          </span>
                          {o && (
                            <span className="sm:pt-0.5">
                              <StatusPill tone={o.tone}>{o.name}</StatusPill>
                            </span>
                          )}
                        </button>
                      </M>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-[13px] text-muted-foreground">
                  Each card is tied to its exchanges once every claim is drawn.
                </p>
              )}
            </div>
          </div>
        </Section>
        <AgentCursor
          agent={building ? "ag" : null}
          host={host}
          target={target}
          version={`${k}-${parts}-${recon}-${tied}-${settled}`}
        />
      </div>
    </StageAccent>
  );
}
