"use client";

import { cn } from "cn";

import { Button } from "@/components/ui/button";
import type { BankLink } from "@/lib/api/services/fetch-writing-bank";

import {
  BOX_TYPES,
  type BoxNode,
  Diagram,
  type LinkEdge,
} from "../../../projects/[projectId]/_components/run-studio/writing/flow";
import { CARD_KINDS, type CardKind, cardKindOf } from "./bank-colors";
import type { CardOpener } from "./step-sheet";
import { humanize } from "./writing-bank-format";

/** How many linked entries one relation shows before it counts the rest. */
const SHOWN = 5;

// Column widths and spacing of the drawing, in pixels at zoom 1: it fits the card's sheet without shrinking.
const ENTRY_W = 260;
const CENTER_W = 220;
const GAP_X = 96;
const ROW_GAP = 10;
const GROUP_GAP = 22;

/**
 * How many lines a text takes when it wraps at a width of about `perLine` characters. React Flow needs each box's
 * height before it draws, so the boxes grow to their whole text instead of cutting it off.
 */
function linesOf(text: string, perLine: number) {
  let lines = 1;
  let used = 0;
  for (const word of text.split(/\s+/)) {
    const length = word.length;
    if (used && used + 1 + length > perLine) {
      lines += 1 + Math.floor(length / perLine);
      used = length % perLine;
    } else used += (used ? 1 : 0) + length;
  }
  return lines;
}

// Label text wraps at about 30 characters in an entry box, 34 in a relation's label, 22 in the centre card.
const entryHeight = (label: string) => linesOf(label, 30) * 18 + 38;
const labelHeight = (gloss: string) => linesOf(gloss, 34) * 15 + 10;
const centerHeight = (title: string) => Math.max(92, linesOf(title, 22) * 20 + 32);
const MORE_H = 40;

interface Group {
  relation: string;
  gloss: string;
  links: BankLink[];
}

function groupsOf(links: BankLink[], outgoing: boolean): Group[] {
  const groups = new Map<string, Group>();
  for (const link of links) {
    if (link.outgoing !== outgoing) continue;
    const group = groups.get(link.relation) ?? { relation: link.relation, gloss: link.gloss, links: [] };
    if (!group.links.some((item) => item.other.id === link.other.id)) group.links.push(link);
    groups.set(link.relation, group);
  }
  return [...groups.values()];
}

/** The height a relation takes: its label, its shown entries and a "more" row when it has more. */
function groupHeight(group: Group) {
  const shown = group.links.slice(0, SHOWN);
  return (
    labelHeight(`${group.gloss} · ${group.links.length}`) +
    shown.reduce((sum, link) => sum + entryHeight(link.other.label) + ROW_GAP, 0) +
    (group.links.length > SHOWN ? MORE_H : 0)
  );
}

function sideHeight(groups: Group[]) {
  return groups.reduce((sum, group, index) => sum + groupHeight(group) + (index ? GROUP_GAP : 0), 0);
}

function EntryBox({ link, kind }: { readonly link: BankLink; readonly kind: CardKind | null }) {
  return (
    <div
      className={cn(
        "flex size-full items-center gap-2.5 rounded-lg border bg-card px-3 py-2 shadow-xs",
        kind && "cursor-pointer hover:border-foreground/40",
      )}
    >
      <span
        className={cn("size-2.5 shrink-0 rounded-full", kind ? CARD_KINDS[kind].dot : "bg-muted-foreground/40")}
        aria-hidden="true"
      />
      <span className="flex min-w-0 flex-col">
        <span className="text-[13px] leading-[18px]">{link.other.label}</span>
        <span className="text-[11px] text-muted-foreground">{humanize(link.other.collection)}</span>
      </span>
    </div>
  );
}

/** The relation that ties a group of entries to the card, written over the group. */
function GroupLabel({ gloss, count }: { readonly gloss: string; readonly count: number }) {
  return (
    <p className="font-medium text-[11px] text-foreground/70 uppercase leading-[15px] tracking-wide">
      {gloss} · {count}
    </p>
  );
}

/** The same links as a list, for a screen too narrow to draw them: each relation with its entries. */
function LinkList({
  incoming,
  outgoing,
  onOpen,
}: {
  readonly incoming: Group[];
  readonly outgoing: Group[];
  readonly onOpen: CardOpener;
}) {
  const side = (title: string, groups: Group[]) =>
    groups.length > 0 && (
      <div className="flex flex-col gap-3">
        <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">{title}</p>
        {groups.map((group) => (
          <div key={group.relation} className="flex flex-col gap-1.5">
            <p className="text-sm">
              {group.gloss} <span className="text-muted-foreground">· {group.links.length}</span>
            </p>
            <ul className="flex flex-col gap-1.5">
              {group.links.map((link) => {
                const kind = cardKindOf(link.other.collection);
                const opens = kind && link.other.kind === "entry";
                return (
                  <li key={link.other.id}>
                    <Button
                      variant="ghost"
                      disabled={!opens}
                      onClick={() => onOpen(link.other.collection, link.other.id, link.other.label)}
                      className="block h-auto w-full whitespace-normal p-0 text-left font-normal hover:bg-transparent disabled:opacity-100"
                    >
                      <EntryBox link={link} kind={opens ? kind : null} />
                    </Button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    );
  return (
    <div className="flex flex-col gap-5 sm:hidden">
      {side("Point at this card", incoming)}
      {side("This card points at", outgoing)}
    </div>
  );
}

/**
 * A card's place in the bank's knowledge graph, drawn: the card in the middle; on the left the entries that point at
 * it, on the right the entries it points at, grouped under the relation that ties them. An entry of a kind the page
 * shows opens as its own card.
 */
export function LinksDiagram({
  id,
  title,
  kind,
  links,
  onOpen,
}: {
  readonly id: string;
  readonly title: string;
  readonly kind: CardKind | null;
  readonly links: BankLink[];
  readonly onOpen: CardOpener;
}) {
  const incoming = groupsOf(links, false);
  const outgoing = groupsOf(links, true);
  if (!incoming.length && !outgoing.length)
    return <p className="text-muted-foreground text-sm">No other entry of the bank links to this card.</p>;

  const centerH = centerHeight(title);
  const height = Math.max(sideHeight(incoming), sideHeight(outgoing), centerH);
  const centerX = incoming.length ? ENTRY_W + GAP_X : 0;
  const center = { x: centerX, y: height / 2 - centerH / 2 };
  const nodes: BoxNode[] = [
    {
      id: "center",
      type: "box",
      position: center,
      data: {
        w: CENTER_W,
        h: centerH,
        content: (
          <div
            className={cn(
              "flex size-full items-center justify-center rounded-xl border-2 px-4 text-center",
              kind ? CARD_KINDS[kind].className : "border-border bg-card",
            )}
          >
            <span className="font-medium text-sm leading-5">{title}</span>
          </div>
        ),
      },
    },
  ];
  const edges: LinkEdge[] = [];
  const opens = new Map<string, BankLink>();
  const stroke = kind ? "stroke-foreground/35" : "stroke-muted-foreground/50";
  const fill = kind ? "fill-foreground/35" : "fill-muted-foreground/50";

  const lay = (groups: Group[], side: "in" | "out") => {
    let top = (height - sideHeight(groups)) / 2;
    const entryX = side === "in" ? 0 : centerX + CENTER_W + GAP_X;
    groups.forEach((group, index) => {
      if (index) top += GROUP_GAP;
      const shown = group.links.slice(0, SHOWN);
      const more = group.links.length - shown.length;
      const label = `${group.gloss} · ${group.links.length}`;
      nodes.push({
        id: `label-${side}-${group.relation}`,
        type: "box",
        position: { x: entryX, y: top },
        data: {
          w: ENTRY_W,
          h: labelHeight(label),
          content: <GroupLabel gloss={group.gloss} count={group.links.length} />,
        },
      });
      top += labelHeight(label);
      for (const link of shown) {
        const nodeId = `${side}-${link.relation}-${link.other.id}`;
        const entryKind = cardKindOf(link.other.collection);
        const h = entryHeight(link.other.label);
        if (entryKind && link.other.kind === "entry") opens.set(nodeId, link);
        nodes.push({
          id: nodeId,
          type: "box",
          position: { x: entryX, y: top },
          data: { w: ENTRY_W, h, content: <EntryBox link={link} kind={entryKind} /> },
        });
        top += h + ROW_GAP;
        // The line runs the way the relation points: into the card from the left, out of it to the right.
        edges.push({
          id: `${nodeId}-edge`,
          type: "link",
          source: side === "in" ? nodeId : "center",
          target: side === "in" ? "center" : nodeId,
          sourceHandle: "rs",
          targetHandle: "lt",
          data: { stroke, fill, width: 1.3 },
        });
      }
      if (more > 0) {
        nodes.push({
          id: `more-${side}-${group.relation}`,
          type: "box",
          position: { x: entryX, y: top },
          data: {
            w: ENTRY_W,
            h: MORE_H - ROW_GAP,
            content: (
              <div className="flex size-full items-center px-3 text-foreground/70 text-xs">
                and {more} more {humanize(group.links[0]?.other.collection ?? "").toLowerCase()}
              </div>
            ),
          },
        });
        top += MORE_H;
      }
    });
  };
  lay(incoming, "in");
  lay(outgoing, "out");

  return (
    <>
      <LinkList incoming={incoming} outgoing={outgoing} onOpen={onOpen} />
      <div className="hidden flex-col gap-2 sm:flex">
        <div className="flex justify-between text-muted-foreground text-xs">
          <span>{incoming.length ? "Point at this card" : ""}</span>
          <span>{outgoing.length ? "This card points at" : ""}</span>
        </div>
        <Diagram
          label={`Links of ${title} in the bank`}
          nodes={nodes}
          edges={edges}
          nodeTypes={BOX_TYPES}
          fitKey={id}
          still
          style={{ height: Math.min(Math.max(height + 32, 160), 760) }}
          className="w-full"
          onNodeClick={(nodeId) => {
            const link = opens.get(nodeId);
            if (link) onOpen(link.other.collection, link.other.id, link.other.label);
          }}
        />
        <p className="sr-only">
          {[...incoming, ...outgoing]
            .map((group) => `${group.gloss}: ${group.links.map((link) => link.other.label).join(", ")}`)
            .join(". ")}
        </p>
      </div>
    </>
  );
}
