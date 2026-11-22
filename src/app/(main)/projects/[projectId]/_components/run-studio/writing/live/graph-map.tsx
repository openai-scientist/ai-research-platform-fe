"use client";
"use no memo";

/* ===== Live screen: the argument map (S06) and its evaluation (S07) =====
   What the stage did first: how many claims are IN, OUT or undecided, how much of the map traces to the record, lane
   by lane, and the nine steps of the two stages. Then what it means for the paper: the rules for every claim, and the
   claims as the paper will state them, each with its locked wording and why nothing defeats it. Then the AIF graph
   itself (ArgumentGraph.json: statements, ledger values and sources as I-nodes in the lanes of the argument, joined by
   inferences, conflicts and preferences) with the record of the node you pick, the Verifier's trace of every node
   (GraphEvidenceMap.json), and how strongly each claim may be worded. */

import { type ReactNode, useEffect, useState } from "react";

import type { Node, NodeProps } from "@xyflow/react";
import { Minus, Plus } from "lucide-react";
import { motion } from "motion/react";

import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { S } from "../engine";
import { Handles, type LinkEdge, useFresh } from "../flow";
import { canEnter, cn, Icon, M, useMedia } from "../lib";
import { Typed } from "../scenes-gather";
import {
  claimIds,
  type Ground,
  ghostLayout,
  ground,
  LABEL_TONE,
  LABEL_WORD,
  LIST,
  labelKey,
  MARK,
  type MapLayout,
  type MapLink,
  mapLayout,
  marked,
  NODE,
  nameOf,
  notWrittenOf,
  ownText,
  type Placed,
  removedOf,
  schemeOf,
  statusTone,
  strengthShare,
  typeName,
  typeOf,
} from "./graph-data";
import { FullSize } from "./graph-ui";
import { shown, streaming, WorkingHere } from "./kit";
import { Bars, SERIF, scrollSoon } from "./outline-kit";
import { file, fill, LIVE, says, statement } from "./run";
import { StatusPill, TONE, type Tone } from "./stage-kit";
import {
  type BarRow,
  SubHead as ChartHead,
  EffectList,
  Meter,
  ResultGrid,
  Section,
  type Part as Slice,
  StageAccent,
  type Swatch,
  Takeaway,
} from "./stage-visual";
import { Term } from "./term";
import type { EvaluationLabel } from "./types";

/* ---------- what is on the map so far ---------- */
const done = (sid: string) => S.st[sid]?.status === "done";
/** The evaluation is complete on screen once its stage is done, or while the run waits at the lock: the claims you
 * are asked to lock are all there to read. */
const evaluated = () => done("S07") || Boolean(LIVE.stop && LIVE.stop.stage === "S07");
const count = (sid: string, list: string, total: number, whole = false) => (whole ? total : shown(sid, list, total));

export function mapProgress(L: MapLayout) {
  const s = L.stream;
  const on = new Set<string>([
    ...s.statements.slice(0, count("S06", LIST.statements, s.statements.length)),
    ...s.data.slice(0, count("S06", LIST.data, s.data.length)),
    ...s.ra.slice(0, count("S06", LIST.ra, s.ra.length)),
    ...s.conflicts.slice(0, count("S06", LIST.conflicts, s.conflicts.length)),
  ]);
  const order = traceOrder(L);
  const whole = evaluated();
  const traced = new Set(order.slice(0, count("S07", LIST.trace, order.length, whole)));
  const labels = file("EvaluationLabels.json")?.labels ?? [];
  const labelled = labels.slice(0, count("S07", LIST.label, labels.length, whole));
  return { on, traced, labels: Object.fromEntries(labelled.map((l) => [l.statement_id, l])) };
}
/** The Verifier's sweep: every node of the evidence map, left to right. */
export function traceOrder(L: MapLayout) {
  const ids = file("GraphEvidenceMap.json")?.nodes.map((n) => n.node_id) ?? [];
  // The caveats of a closed band are traced first, where the band sits; then every node from left to right.
  const at = (id: string) => L.nodes.get(id) ?? { x: -1, y: L.bandIds.indexOf(id) };
  return ids
    .filter((id) => L.nodes.has(id) || L.bandIds.includes(id))
    .sort((a, b) => at(a).x - at(b).x || at(a).y - at(b).y);
}

/* ---------- the look of the map: light cards, dark text, colour only for what a status means ---------- */
/** A node's frame in the one colour meaning: the soft fill and text of its tone, and a border of the same hue. */
const BORDER: Record<Tone, string> = {
  ok: "border-emerald-500/60",
  look: "border-amber-500/70",
  bad: "border-rose-500/60",
  none: "border-foreground/15",
};
/** Lines: support and preference plain, an attack red, the lifecycle dotted. */
const EDGE: Record<MapLink["kind"], [string, string]> = {
  ok: ["stroke-slate-500", "fill-slate-500"],
  att: ["stroke-rose-500", "fill-rose-500"],
  pref: ["stroke-foreground/70", "fill-foreground/70"],
  life: ["stroke-slate-400", "fill-slate-400"],
  test: ["stroke-slate-400", "fill-slate-400"],
};
const SCHEME: Record<string, string> = {
  ra: "bg-card text-foreground ring-foreground/35",
  ca: "bg-rose-50 text-rose-800 ring-rose-500/60 dark:bg-rose-950/50 dark:text-rose-200",
  pa: "bg-card text-foreground ring-foreground/60",
};
/** The tone of a claim's label; a node without one is plain. */
const toneOfLabel = (label: string | null | undefined): Tone =>
  label ? (LABEL_TONE[labelKey(label)] ?? "none") : "none";
/** What a node is, as its small tag: its plain name for a statement (Finding 1, Gap 2, Limitation), Value or Source. */
function tagOf(id: string) {
  const type = typeOf(id);
  if (type === "datum" || type === "source") return typeName(type);
  return nameOf(id);
}
/** The tag of a node: a quiet chip with its plain name. */
function TypeTag({ id, className }: { id: string; className?: string }) {
  return (
    <b
      className={cn(
        "inline-flex h-[18px] shrink-0 items-center rounded bg-foreground/[0.07] px-1.5 font-semibold text-[11px] text-foreground/80",
        className,
      )}
    >
      {tagOf(id)}
    </b>
  );
}
/** A label as a compact word inside a node or a row: IN, OUT, Undecided. */
function LabelWord({ label, className }: { label: string; className?: string }) {
  const k = labelKey(label);
  const tone = LABEL_TONE[k] ?? "none";
  return (
    <span
      className={cn(
        "inline-flex h-[18px] items-center rounded bg-card px-1.5 font-semibold text-[11px] ring-1 ring-current/30",
        TONE[tone].text,
        className,
      )}
    >
      {LABEL_WORD[k] ?? k}
    </span>
  );
}

/* ---------- the nodes of the map ---------- */
interface LaneData extends Record<string, unknown> {
  title: string;
  band?: boolean;
}
function MapLane({ data, width, height }: NodeProps<Node<LaneData, "lane">>) {
  return (
    <div
      style={{ width, height }}
      className="pointer-events-none flex flex-col rounded-2xl bg-foreground/[0.025] px-2.5 pt-2 ring-1 ring-foreground/10"
    >
      <b className="font-semibold text-[11px] text-muted-foreground uppercase tracking-wide">{data.title}</b>
    </div>
  );
}
interface INodeData extends Record<string, unknown> {
  p: Placed;
  fresh: boolean;
  dim: boolean;
  picked: boolean;
  traced: boolean;
  label: string | null;
}
function LiveINode({ data }: NodeProps<Node<INodeData, "inode">>) {
  const { p, label } = data;
  const id = p.id;
  const type = typeOf(id);
  const lab = label ? labelKey(label) : null;
  const tone = toneOfLabel(label);
  const g = p.is === "data" ? ground(id) : null;
  const text = p.is === "data" ? (g?.text ?? id) : says(id);
  let opacity = 1;
  if (data.dim) opacity = 0.22;
  else if (lab === "OUT") opacity = 0.6;
  return (
    <motion.div
      data-cursor={`node:${id}`}
      title={p.is === "data" ? `${g?.head}: ${g?.text}${g?.note ? ` · ${g.note}` : ""}` : text}
      initial={data.fresh ? { opacity: 0, y: -10, scale: 0.9 } : false}
      animate={{ opacity, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={{ width: p.w, height: p.h }}
      className={cn(
        "relative flex cursor-pointer flex-col gap-1 overflow-hidden rounded-xl border px-2.5 py-2 text-left shadow-xs transition-shadow duration-300 hover:shadow-md",
        lab
          ? cn(TONE[tone].soft, BORDER[tone])
          : p.is === "data"
            ? "bg-muted/60 text-foreground"
            : "bg-card text-foreground",
        !lab && BORDER.none,
        p.context && "border-dashed",
        data.picked && "ring-2 ring-foreground/70 ring-offset-1 ring-offset-background",
      )}
    >
      <Handles />
      <span className="flex min-w-0 items-center gap-1.5 pr-1">
        <TypeTag id={id} />
        <span className="min-w-0 truncate font-mono text-[11px] text-muted-foreground">
          {p.is === "data" ? g?.head : id}
        </span>
        <span className="ml-auto flex shrink-0 items-center">
          {lab ? (
            <motion.span
              key={lab}
              initial={canEnter() ? { opacity: 0 } : false}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <LabelWord label={lab} />
            </motion.span>
          ) : (
            data.traced && (
              <motion.span
                initial={canEnter() ? { opacity: 0 } : false}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                title="Traced to the record"
              >
                <Icon n="circleCheck" className={cn("size-3.5", TONE.ok.text)} />
              </motion.span>
            )
          )}
        </span>
      </span>
      {p.is === "data" && type === "datum" ? (
        <>
          <b className="truncate font-semibold text-[15px] tabular-nums leading-tight">{text}</b>
          {g?.note && <span className="line-clamp-1 text-[12px] text-muted-foreground leading-snug">{g.note}</span>}
        </>
      ) : (
        <span
          className={cn(
            "text-[13px] leading-snug",
            p.is === "data" || p.context ? "line-clamp-2" : p.h < NODE.h ? "line-clamp-3" : "line-clamp-4",
          )}
        >
          {text}
        </span>
      )}
      {p.context && (
        <span className="absolute right-2 bottom-1.5 rounded bg-muted px-1 text-[11px] text-muted-foreground leading-4">
          context
        </span>
      )}
    </motion.div>
  );
}
interface SchemeData extends Record<string, unknown> {
  id: string;
  fresh: boolean;
  dim: boolean;
  picked: boolean;
}
function LiveScheme({ data }: NodeProps<Node<SchemeData, "scheme">>) {
  const sc = schemeOf(data.id);
  return (
    <motion.div
      title={`${sc.name}: ${sc.text}`}
      data-cursor={`node:${data.id}`}
      initial={data.fresh ? { opacity: 0 } : false}
      animate={{ opacity: data.dim ? 0.25 : 1 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "grid h-[22px] w-9 cursor-pointer place-items-center rounded-full font-mono font-semibold text-[11px] shadow-xs ring-[1.5px]",
        SCHEME[sc.kind] ?? SCHEME.ra,
        data.picked && "ring-[3px]",
      )}
    >
      <Handles />
      {sc.kind.toUpperCase()}
    </motion.div>
  );
}
/** The place of a statement before the graph is built: an outline, quiet, the size of the node it will hold. */
function MapGhost({ width, height }: NodeProps<Node<Record<string, unknown>, "ghost">>) {
  return (
    <div
      style={{ width, height }}
      className="pointer-events-none flex flex-col gap-2 rounded-xl border border-foreground/15 border-dashed bg-card/60 px-2.5 py-2"
    >
      <Skeleton aria-hidden="true" className="h-2.5 w-1/2 animate-none rounded-full" />
      <Skeleton aria-hidden="true" className="h-2 w-4/5 animate-none rounded-full" />
    </div>
  );
}
const MAP_NODE_TYPES = { lane: MapLane, inode: LiveINode, scheme: LiveScheme, ghost: MapGhost };

function MapCanvas({
  L,
  on,
  traced,
  labels,
  sel,
  pinned,
  onPick,
  hov,
  onHov,
  layer,
  live,
  sweep,
  zoom,
}: {
  zoom: number;
  L: MapLayout;
  on: Set<string>;
  traced: Set<string>;
  labels: Record<string, EvaluationLabel>;
  sel: string;
  pinned: boolean;
  onPick(id: string): void;
  hov: string | null;
  onHov(id: string | null): void;
  layer: string;
  live: boolean;
  sweep: boolean;
}) {
  const scheme = (id: string) => L.nodes.get(id)?.is === "scheme";
  const all = L.links.filter((l) => on.has(l.a) && on.has(l.b));
  const shownLink = (l: MapLink) =>
    layer === "all" ? !l.dup : layer === "life" ? l.layer === "life" : l.layer === layer;
  const links = all.filter(shownLink);
  const shownScheme = (id: string) => {
    if (layer === "life") return false;
    const kind = schemeOf(id).kind;
    if (layer === "support") return kind === "ra";
    if (layer === "conflict") return kind !== "ra";
    return true;
  };
  const focus = hov ?? (pinned ? sel : null);
  const near = new Set<string>();
  if (focus) {
    near.add(focus);
    for (const l of links) {
      if (l.a === focus) near.add(l.b);
      if (l.b === focus) near.add(l.a);
    }
    // Through a scheme: a node's inference reaches the nodes on its other side.
    if (!scheme(focus))
      for (const l of links) {
        if (scheme(l.a) && near.has(l.a)) near.add(l.b);
        if (scheme(l.b) && near.has(l.b)) near.add(l.a);
      }
  }
  const lit = focus ? near : null;
  const { fresh, seen } = useFresh(live);
  const nodes: Node[] = [
    ...(L.band
      ? [
          {
            id: "band",
            type: "lane",
            position: { x: L.band.x, y: L.band.y },
            width: L.band.w,
            height: L.band.h,
            zIndex: -1,
            selectable: false,
            data: { title: "Premises and caveats", band: true },
          } as Node,
        ]
      : []),
    ...L.lanes.map(
      (l): Node => ({
        id: `lane-${l.title}`,
        type: "lane",
        position: { x: l.x, y: l.y },
        width: l.w,
        height: l.h,
        zIndex: -1,
        selectable: false,
        data: { title: l.title },
      }),
    ),
    // The places of what is still to come: the outlines of a graph not yet built, or of its nodes not yet drawn.
    ...[...(L.ghost ?? []), ...[...L.nodes.values()].filter((p) => p.is !== "scheme" && !on.has(p.id))].map(
      (b, i): Node => ({
        id: `ghost-${"id" in b ? b.id : i}`,
        type: "ghost",
        position: { x: b.x, y: b.y },
        width: b.w,
        height: b.h,
        zIndex: -1,
        selectable: false,
        data: {},
      }),
    ),
    ...[...L.nodes.values()]
      .filter((p) => on.has(p.id) && (p.is !== "scheme" || shownScheme(p.id)))
      .map(
        (p): Node =>
          p.is === "scheme"
            ? {
                id: p.id,
                type: "scheme",
                position: { x: p.x, y: p.y },
                width: p.w,
                height: p.h,
                data: { id: p.id, fresh: fresh(p.id), dim: Boolean(lit && !lit.has(p.id)), picked: sel === p.id },
              }
            : {
                id: p.id,
                type: "inode",
                position: { x: p.x, y: p.y },
                width: p.w,
                height: p.h,
                data: {
                  p,
                  fresh: fresh(p.id),
                  dim: Boolean(lit && !lit.has(p.id)),
                  picked: sel === p.id && pinned,
                  traced: traced.has(p.id),
                  label: labels[p.id]?.label ?? null,
                },
              },
      ),
  ];
  const placed = new Set(nodes.map((n) => n.id));
  const edges: LinkEdge[] = links
    .filter((l) => placed.has(l.a) && placed.has(l.b))
    .map((l) => {
      const hot = Boolean(lit?.has(l.a) && lit.has(l.b));
      const dashed = l.kind === "life" || l.kind === "test";
      return {
        id: l.id,
        type: "link",
        source: l.a,
        target: l.b,
        sourceHandle: l.sh,
        targetHandle: l.th,
        data: {
          stroke: EDGE[l.kind][0],
          fill: EDGE[l.kind][1],
          dash: dashed ? "3 4" : undefined,
          width: hot ? 2.6 : 1.7,
          opacity: lit && !hot ? 0.15 : 1,
          fresh: fresh(l.id),
          step: true,
          offset: l.offset,
        },
      };
    });
  useEffect(() => seen([...nodes.map((n) => n.id), ...edges.map((e) => e.id)]));
  // Drawn at full size (or the zoom you pick): the map scrolls inside its card, its words never below 12 px at 1:1.
  return (
    <FullSize
      label="The argument map"
      nodes={nodes}
      edges={edges}
      nodeTypes={MAP_NODE_TYPES}
      size={{ w: L.w, h: L.h }}
      zoom={zoom}
      maxHeight={780}
      fitKey={`${layer}-${L.w}-${L.h}`}
      hint="Scroll for the conclusion and implication lanes"
      onNodeClick={(id) => L.nodes.has(id) && onPick(id)}
      onNodeEnter={(id) => L.nodes.has(id) && onHov(id)}
      onNodeLeave={() => onHov(null)}
    >
      {sweep && (
        <span
          aria-hidden="true"
          className="sweep-x pointer-events-none absolute inset-y-0 z-10 w-24 -translate-x-1/2 bg-gradient-to-r from-transparent via-foreground/10 to-transparent"
        />
      )}
    </FullSize>
  );
}

/* ---------- the record of a node ---------- */
/** What a node is tied to, in words: through each scheme, the statements on its other side. */
function relationsOf(L: MapLayout, id: string, on: Set<string>) {
  const g = file("ArgumentGraph.json");
  if (!g) return [];
  const edges = g.edges.filter((e) => on.has(e.source) && on.has(e.target));
  const ins = (s: string) => [...new Set(edges.filter((e) => e.target === s).map((e) => e.source))];
  const outs = (s: string) => [...new Set(edges.filter((e) => e.source === s).map((e) => e.target))];
  const rows: { verb: string; other: string; via?: string }[] = [];
  if (L.nodes.get(id)?.is === "scheme") {
    const sc = schemeOf(id);
    for (const p of ins(id)) rows.push({ verb: "From", other: p });
    for (const t of outs(id))
      rows.push({ verb: sc.kind === "ra" ? "Supports" : sc.kind === "ca" ? "Attacks" : "Over", other: t });
    return rows;
  }
  for (const s of outs(id)) {
    const kind = schemeOf(s).kind;
    for (const t of outs(s))
      rows.push({ verb: kind === "ra" ? "Supports" : kind === "ca" ? "Attacks" : "Preferred over", other: t, via: s });
  }
  for (const s of ins(id)) {
    const kind = schemeOf(s).kind;
    for (const p of ins(s))
      if (p !== id)
        rows.push({
          verb: kind === "ra" ? "Supported by" : kind === "ca" ? "Attacked by" : "Less preferred than",
          other: p,
          via: s,
        });
  }
  // The lifecycle, where the graph does not already tie the two.
  const tied = new Set(rows.map((r) => r.other));
  for (const l of file("LifecycleLinks.json")?.links ?? []) {
    if (l.from === id && L.nodes.has(l.to) && on.has(l.to) && !tied.has(l.to))
      rows.push({ verb: "Leads to", other: l.to });
    if (l.to === id && L.nodes.has(l.from) && on.has(l.from) && !tied.has(l.from))
      rows.push({ verb: "Comes from", other: l.from });
  }
  return rows;
}
/** The scheme a relation runs through, in a few words: its scheme's name, or the kind of conflict. */
function viaName(id: string) {
  const sc = schemeOf(id);
  if (sc.kind === "pa") return "preference";
  if (sc.kind === "ca") return sc.text || "conflict";
  return sc.name.replace(/^Inference · /, "").toLowerCase();
}
function GroundLine({ g }: { g: Ground }) {
  return (
    <li className="flex flex-col gap-0.5 rounded-md bg-muted/60 px-2.5 py-1.5">
      <span className="flex items-baseline gap-1.5">
        <b className="font-medium font-mono text-[11px] text-muted-foreground">{g.head}</b>
        {g.kind === "value" && <b className="font-semibold text-[13px] tabular-nums">{g.text}</b>}
      </span>
      {g.kind !== "value" && g.text && <span className="text-[13px] leading-snug">{g.text}</span>}
      {g.note && <span className="text-muted-foreground text-xs leading-snug">{g.note}</span>}
    </li>
  );
}
function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-medium text-muted-foreground text-xs">{title}</span>
      {children}
    </div>
  );
}
function MapRecord({
  L,
  id,
  on,
  traced,
  labels,
  onPick,
}: {
  L: MapLayout;
  id: string;
  on: Set<string>;
  traced: Set<string>;
  labels: Record<string, EvaluationLabel>;
  onPick(id: string): void;
}) {
  const p = L.nodes.get(id);
  if (!p || !on.has(id)) return <p className="text-muted-foreground text-xs">Pick a node of the map to read it.</p>;
  const rel = relationsOf(L, id, on);
  const links = (
    <Block title={`Links · ${rel.length}`}>
      {rel.length ? (
        <ul className="-mx-1.5 flex flex-col gap-0.5">
          {rel.map((r) => (
            <li key={`${r.verb}-${r.other}-${r.via ?? ""}`}>
              <button
                type="button"
                onClick={() => onPick(r.other)}
                className="flex w-full flex-col gap-0.5 rounded-md px-1.5 py-1 text-left text-[13px] hover:bg-muted/60"
              >
                <span className="text-muted-foreground text-xs">
                  {r.verb}
                  {r.via ? ` · ${viaName(r.via)}` : ""}
                </span>
                <span className="flex items-start gap-1.5">
                  {L.nodes.get(r.other)?.is === "scheme" ? (
                    <b className="mt-px rounded bg-foreground/[0.07] px-1.5 font-mono font-semibold text-[11px]">
                      {schemeOf(r.other).kind.toUpperCase()}
                    </b>
                  ) : (
                    <TypeTag id={r.other} className="mt-px" />
                  )}
                  <span className="min-w-0 leading-snug">
                    {L.nodes.get(r.other)?.is === "scheme"
                      ? schemeOf(r.other).text
                      : L.nodes.get(r.other)?.is === "data"
                        ? `${ground(r.other).head}: ${ground(r.other).text}`
                        : says(r.other)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <span className="text-muted-foreground text-xs">No links yet.</span>
      )}
    </Block>
  );
  if (p.is === "scheme") {
    const sc = schemeOf(id);
    return (
      <div className="flex flex-col gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "grid h-5 w-9 place-items-center rounded-full font-mono font-semibold text-[11px] ring-[1.5px]",
              SCHEME[sc.kind] ?? SCHEME.ra,
            )}
          >
            {sc.kind.toUpperCase()}
          </span>
          <b className="font-semibold text-[13px]">{sc.name}</b>
        </div>
        {sc.kind === "ra" && sc.text.length > 40 ? (
          <Block title="Warrant">
            <p className="text-sm leading-snug">{sc.text}</p>
            {sc.reconstructed && (
              <span className="flex items-center gap-1.5">
                <StatusPill tone="look">
                  <Term t="reconstructed">Reconstructed</Term>
                </StatusPill>
                <span className="text-muted-foreground">No source states it.</span>
              </span>
            )}
          </Block>
        ) : (
          <p className="text-[13px] leading-snug first-letter:uppercase">{sc.text}</p>
        )}
        {links}
      </div>
    );
  }
  const type = typeOf(id);
  const ev = file("GraphEvidenceMap.json")?.nodes.find((n) => n.node_id === id);
  const st = statement(id);
  const status = st?.status ?? file("ArgumentGraph.json")?.nodes.find((n) => n.node_id === id)?.extensions.asw?.status;
  const l = labels[id];
  const ext = marked(MARK.ext) || done("S06");
  if (p.is === "data") {
    const g = ground(id);
    return (
      <div className="flex flex-col gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <TypeTag id={id} />
          <b className="font-mono font-semibold text-[13px]">{g.head}</b>
          <span className="text-muted-foreground">
            {type === "source" ? "a source of the record" : "a value of the ledger"}
          </span>
        </div>
        {g.kind === "value" ? (
          <p className="flex flex-col gap-0.5">
            <b className="font-semibold text-[20px] tabular-nums leading-tight">{g.text}</b>
            <span className="text-[13px] text-muted-foreground leading-snug">{g.note}</span>
          </p>
        ) : (
          <p className="text-sm leading-snug">{g.text}</p>
        )}
        {ev?.record && (
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1">
            <dt className="text-muted-foreground">Record</dt>
            <dd className="font-mono">{ev.record}</dd>
          </dl>
        )}
        {links}
      </div>
    );
  }
  const traceRows = ev ? [...ev.keys, ...ev.sources].map(ground) : [];
  return (
    <div className="flex flex-col gap-3 text-xs">
      <div className="flex flex-wrap items-center gap-1.5">
        <b className="font-semibold text-[14px]">{nameOf(id)}</b>
        <span className="font-mono text-muted-foreground text-xs">{id}</span>
        <span className="ml-auto flex items-center gap-1.5">
          {l && <LabelWord label={l.label} />}
          {status && <StatusPill tone={statusTone(status)}>{status.replace(/_/g, " ")}</StatusPill>}
        </span>
      </div>
      <p className="text-sm leading-snug">{ownText(id)}</p>

      {ev && (
        <Block title={traced.has(id) ? `Traced to · ${traceRows.length}` : "Traced to"}>
          {!traced.has(id) ? (
            <span className="text-muted-foreground">Traced by the Verifier after the build.</span>
          ) : traceRows.length ? (
            <ul className="flex flex-col gap-1">
              {traceRows.map((g) => (
                <GroundLine key={g.id} g={g} />
              ))}
            </ul>
          ) : (
            <span className="text-muted-foreground">
              No number or source of its own: it rests on what it is inferred from.
            </span>
          )}
        </Block>
      )}
      {links}
      <div className="flex flex-col gap-2 border-t pt-2.5">
        <span className="font-medium text-muted-foreground text-xs">How it is stored</span>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-muted/60 px-2.5 py-2">
            <span className="font-medium text-[11px] text-muted-foreground">AIF core</span>
            <dl className="mt-1 grid grid-cols-[34px_minmax(0,1fr)] gap-x-1.5 gap-y-0.5 font-mono text-xs">
              <dt className="text-muted-foreground">id</dt>
              <dd className="break-all">{id}</dd>
              <dt className="text-muted-foreground">type</dt>
              <dd>{p.context ? "context" : "I-node"}</dd>
            </dl>
          </div>
          <div className={cn("rounded-lg px-2.5 py-2", ext ? "bg-muted/60" : "bg-muted/30 text-muted-foreground")}>
            <span className="font-medium text-[11px] text-muted-foreground">ASW extension</span>
            {ext ? (
              <dl className="mt-1 grid grid-cols-[56px_minmax(0,1fr)] gap-x-1.5 gap-y-0.5 font-mono text-xs">
                <dt className="text-muted-foreground">propType</dt>
                <dd className="break-words">{type}</dd>
                {status && (
                  <>
                    <dt className="text-muted-foreground">status</dt>
                    <dd className="break-words">{status}</dd>
                  </>
                )}
                {l && (
                  <>
                    <dt className="text-muted-foreground">label</dt>
                    <dd>{labelKey(l.label)}</dd>
                    <dt className="text-muted-foreground">strength</dt>
                    <dd>{l.strength}</dd>
                  </>
                )}
              </dl>
            ) : (
              <p className="mt-1 text-xs">Kept apart from the AIF core</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- the Verifier's measures ---------- */
/** What the Verifier's trace found: each node traced, the numbers they cite found in the ledger, and recomputed. */
function verifierOf(L: MapLayout, traced: Set<string>) {
  const ev = file("GraphEvidenceMap.json")?.nodes ?? [];
  const ledger = file("EvidenceLedger.json");
  const total = traceOrder(L).length;
  const n = traced.size;
  const cited = [
    ...new Set(
      ev.filter((x) => traced.has(x.node_id)).flatMap((x) => [...x.keys, ...(x.record ? [x.node_id.slice(2)] : [])]),
    ),
  ];
  const allCited = [...new Set(ev.flatMap((x) => [...x.keys, ...(x.record ? [x.node_id.slice(2)] : [])]))];
  const found = cited.filter((k) => ledger?.ledger.some((v) => v.key === k)).length;
  const records = new Set(
    allCited.map((k) => ledger?.ledger.find((v) => v.key === k)?.record).filter((r): r is string => Boolean(r)),
  );
  const recomputed = (ledger?.recomputed ?? []).filter((r) => records.has(r.record));
  // Each measure once: what was checked, how many of how many. While the graph is not built there is nothing to count
  // yet: the rows keep their places, empty.
  const rows: { k: string; v: number | null; of: number | null; note?: string }[] = [
    { k: "Nodes traced to the record", v: ev.length ? n : null, of: ev.length ? total : null },
    { k: "Numbers found in the ledger", v: ev.length ? found : null, of: ev.length ? allCited.length : null },
    {
      k: "Their records recomputed from the runs",
      v: n >= total && total > 0 ? recomputed.filter((r) => r.match).length : null,
      of: n >= total && total > 0 ? recomputed.length : null,
      note: "match",
    },
  ];
  return { rows, n, total, ready: ev.length > 0 };
}
function VerifierRows({ L, traced }: { L: MapLayout; traced: Set<string> }) {
  const { rows, n, total } = verifierOf(L, traced);
  return (
    <dl className="flex flex-col gap-3 px-4 py-4 sm:px-5">
      {rows.map((r) => {
        const whole = r.v != null && r.of != null && r.of > 0 && r.v >= r.of;
        const short = r.v != null && r.of != null && r.v < r.of && !(n < total);
        return (
          <div
            key={r.k}
            className="grid @xl:grid-cols-[16rem_minmax(0,1fr)_7rem_16px] grid-cols-[minmax(0,1fr)_auto_16px] items-center gap-x-3 gap-y-1.5 text-[13.5px]"
          >
            <dt className="@max-xl:col-span-3">{r.k}</dt>
            <dd className="min-w-0">
              <Meter value={r.v ?? 0} max={r.of ?? 1} tone={whole ? "ok" : short ? "look" : "none"} label={r.k} />
            </dd>
            <dd className="text-right tabular-nums">
              {r.v == null || r.of == null ? (
                <span className="text-muted-foreground">—</span>
              ) : (
                <>
                  <b className="font-semibold">{r.v}</b>
                  <span className="text-muted-foreground">
                    {" "}
                    of {r.of}
                    {r.note ? ` ${r.note}` : ""}
                  </span>
                </>
              )}
            </dd>
            {whole ? (
              <Icon n="circleCheck" className={cn("size-4", TONE.ok.text)} />
            ) : short ? (
              <Icon n="alert" className={cn("size-4", TONE.look.text)} />
            ) : (
              <span />
            )}
          </div>
        );
      })}
    </dl>
  );
}

/* ---------- the claims, as labelled ---------- */
/** How strongly a claim may be worded, in the one colour meaning: at the ceiling it holds; below it, written with
 * care; with no claim verb, plain. */
const strengthTone = (strength: string, ceiling?: string): Tone =>
  strength === "none" ? "none" : !ceiling || strengthShare(strength) >= strengthShare(ceiling) ? "ok" : "look";
/** Why a claim has its label, in one line, from the graph: the attacks on it and what it carries. */
export function reasonOf(l: EvaluationLabel) {
  const g = file("ArgumentGraph.json");
  const attacks = (g?.nodes ?? [])
    .filter((n) => n.kind === "CA")
    .filter((n) =>
      g?.edges.some(
        (e) => e.source === n.node_id && (e.target === l.statement_id || e.target === `RA:${l.statement_id}`),
      ),
    )
    .map((n) => g?.edges.find((e) => e.target === n.node_id)?.source)
    .filter((x): x is string => Boolean(x));
  const by = attacks.map((a) => nameOf(a)).join(", ");
  const lab = labelKey(l.label);
  const why =
    lab === "IN"
      ? attacks.length
        ? `Attacked by ${by}; the attack does not stand.`
        : "No attack stands against it."
      : lab === "OUT"
        ? attacks.length
          ? `Defeated by ${by}.`
          : "What it rests on is not IN."
        : `Attacked by ${by || "another claim"}, with no preference either way.`;
  return l.carried ? `${why} Carries “${fill(l.carried)}”.` : why;
}
function ClaimLedger({
  labels,
  sel,
  onPick,
  className,
}: {
  labels: Record<string, EvaluationLabel>;
  sel: string;
  onPick(id: string): void;
  className?: string;
}) {
  const f = file("EvaluationLabels.json");
  // Before the labels, the claims the graph holds (or the registry, before the graph) stand as rows to be labelled.
  const ids = f ? f.labels.map((l) => l.statement_id) : claimIds();
  const rowOf = (id: string) => f?.labels.find((l) => l.statement_id === id);
  const whole = evaluated();
  const worded = whole || marked(MARK.worded);
  const showStrength = whole || marked(MARK.strength);
  const ceiling = f?.ceiling.strength;
  const out = notWrittenOf();
  const wording = LIVE.calls.some((c) => c.stage === "S07" && !c.done && /^approve/.test(c.task));
  const rows = f?.labels ?? [];
  const recon = rows.filter((r) => r.reconstructed_warrant).length;
  return (
    <div className={cn("flex min-w-0 flex-col overflow-hidden rounded-lg ring-1 ring-foreground/10", className)}>
      {wording && <WorkingHere sid="S07" task={/^approve/} className="border-b px-4 py-2.5" />}
      <ul className="flex flex-col">
        {!ids.length &&
          [0, 1, 2, 3].map((i) => (
            <li key={i} className="border-t px-4 py-3.5 first:border-t-0 sm:px-5">
              <Bars n={3} last="w-2/3" />
            </li>
          ))}
        {ids.map((id) => {
          const row = rowOf(id);
          const l = labels[id];
          const lab = l ? labelKey(l.label) : null;
          const strength = showStrength && l && row ? row.strength : null;
          const text = row?.approved_text ? fill(row.approved_text) : "";
          return (
            <li key={id} data-claim-row={id} className="scroll-mt-24 border-t first:border-t-0">
              <button
                type="button"
                onClick={() => onPick(id)}
                aria-pressed={sel === id}
                className={cn(
                  "flex w-full flex-col gap-1.5 px-4 py-3 text-left outline-none transition-colors hover:bg-muted/40 focus-visible:bg-muted/50 sm:px-5",
                  sel === id && "bg-muted/70 hover:bg-muted/70",
                )}
              >
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <b className="font-semibold text-sm">{nameOf(id)}</b>
                  <span className="font-mono text-muted-foreground text-xs">{id}</span>
                  <span className="ml-auto flex flex-wrap items-center gap-1.5">
                    {lab && (
                      <M as="span" key={lab} in="fade">
                        <StatusPill tone={LABEL_TONE[lab] ?? "none"}>{LABEL_WORD[lab] ?? lab}</StatusPill>
                      </M>
                    )}
                    {strength && (
                      <M as="span" in="fade">
                        <StatusPill tone={strengthTone(strength, ceiling)}>
                          {strength === "none" ? "No claim verb" : `At most “${strength}”`}
                        </StatusPill>
                      </M>
                    )}
                  </span>
                </span>
                {worded && text ? (
                  <M
                    as="span"
                    in="up4"
                    className={cn(
                      SERIF,
                      "max-w-[80ch] text-pretty text-[15px] leading-snug",
                      lab === "OUT" && "text-muted-foreground",
                    )}
                  >
                    {text}
                  </M>
                ) : (
                  <span className="max-w-[80ch] text-pretty text-[13px] text-muted-foreground leading-snug">
                    {ownText(id)}
                  </span>
                )}
                {worded && lab === "IN" && !text && (
                  <span className={cn("text-xs", TONE.look.text)}>
                    No locked wording: check how the paper states it. Its own words are shown.
                  </span>
                )}
                <span className="text-pretty text-[13px] text-muted-foreground leading-snug">
                  {l ? (
                    <Typed text={reasonOf(l)} on={!whole && streaming(LIST.label, id)} />
                  ) : (
                    "Labelled once the graph is evaluated."
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <footer className="flex flex-col gap-2 border-t bg-muted/30 px-4 py-3 text-[13px] sm:px-5">
        {out.map((x) => (
          <p key={x.id} className="flex items-start gap-2">
            <Icon n="ban" className={cn("mt-0.5 size-4 shrink-0", TONE.bad.text)} />
            <span>
              <b className="font-medium">{nameOf(x.id)}</b> is not written{x.why ? `: ${x.why}` : ""}.
            </span>
          </p>
        ))}
        {recon > 0 && Object.keys(labels).length >= rows.length && (
          <p className="flex items-start gap-2">
            <Icon n="alert" className={cn("mt-0.5 size-4 shrink-0", TONE.look.text)} />
            <span>
              {recon === rows.length ? "Every claim's" : `${recon} of ${rows.length} claims'`} warrant was{" "}
              <Term t="reconstructed">reconstructed</Term> by the AI: no source states it, so it is never quoted.
            </span>
          </p>
        )}
        <p className="text-muted-foreground text-xs">
          <Term t="in">IN</Term> may be written, <Term t="out">OUT</Term> may not, <Term t="undec">undecided</Term> only
          hedged.
        </p>
      </footer>
    </div>
  );
}

/* ---------- on a phone: the map as a grouped list ---------- */
const LANE_GROUPS: { lane: string; title: string }[] = [
  { lane: "q", title: "Question" },
  { lane: "h", title: "Hypotheses" },
  { lane: "e", title: "Evidence" },
  { lane: "f", title: "Findings" },
  { lane: "c", title: "Conclusions" },
  { lane: "i", title: "Implications" },
  { lane: "band", title: "Premises and caveats" },
];
/** Where the canvas cannot be read, each lane is a list: every statement with its words and what it is tied to. */
function MapList({
  L,
  on,
  labels,
  sel,
  onPick,
}: {
  L: MapLayout;
  on: Set<string>;
  labels: Record<string, EvaluationLabel>;
  sel: string;
  onPick(id: string): void;
}) {
  const nodes = [...L.nodes.values()].filter((n) => n.is !== "scheme");
  const bandAll = L.bandIds.length ? L.bandIds : nodes.filter((n) => n.lane === "band").map((n) => n.id);
  return (
    <div className="flex flex-col divide-y">
      {LANE_GROUPS.map((g) => {
        const ids =
          g.lane === "band"
            ? bandAll
            : nodes
                .filter((n) => n.lane === g.lane)
                .sort((a, b) => a.y - b.y)
                .map((n) => n.id);
        if (!ids.length && !L.ghost) return null;
        return (
          <div key={g.lane} className="flex flex-col gap-2 px-4 py-3">
            <p className="flex items-center gap-2 font-medium text-muted-foreground text-xs">
              {g.title}
              <span className="tabular-nums">{ids.filter((id) => on.has(id)).length}</span>
            </p>
            {!ids.length && <Skeleton aria-hidden="true" className="h-10 animate-none rounded-lg" />}
            {ids.map((id) => {
              const isData = L.nodes.get(id)?.is === "data";
              const lab = labels[id] ? labelKey(labels[id].label) : null;
              const tone = toneOfLabel(lab);
              if (!on.has(id)) return <Skeleton key={id} aria-hidden="true" className="h-12 animate-none rounded-lg" />;
              const rel = relationsOf(L, id, on);
              return (
                <button
                  type="button"
                  key={id}
                  onClick={() => onPick(id)}
                  aria-pressed={sel === id}
                  className={cn(
                    "flex flex-col gap-1 rounded-lg border px-3 py-2 text-left",
                    lab ? cn(TONE[tone].soft, BORDER[tone]) : BORDER.none,
                    sel === id && "ring-2 ring-foreground/50",
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    <TypeTag id={id} />
                    <span className="min-w-0 truncate font-mono text-[11px] text-muted-foreground">
                      {isData ? ground(id).head : id}
                    </span>
                    {lab && <LabelWord label={lab} className="ml-auto" />}
                  </span>
                  <span className="text-sm leading-snug">
                    {isData ? `${ground(id).text}${ground(id).note ? ` · ${ground(id).note}` : ""}` : says(id)}
                  </span>
                  {rel.length > 0 && (
                    <span className="text-muted-foreground text-xs">
                      {rel
                        .map(
                          (r) =>
                            `${r.verb} ${L.nodes.get(r.other)?.is === "data" ? ground(r.other).head : nameOf(r.other)}`,
                        )
                        .join(" · ")}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

/* ---------- how strongly each claim may be worded, on one scale ---------- */
const AXIS = ["suggest", "indicate", "show"];
/** The claim, its bar and, when the labels differ, its label; on a narrow screen the claim is its id alone, so the
 * scale keeps its room. */
const ROW = {
  label:
    "grid grid-cols-[52px_minmax(0,1fr)_72px] items-center gap-x-3 @min-[560px]:grid-cols-[minmax(0,150px)_minmax(0,1fr)_80px] @min-[560px]:gap-x-4",
  plain:
    "grid grid-cols-[52px_minmax(0,1fr)] items-center gap-x-3 @min-[560px]:grid-cols-[minmax(0,150px)_minmax(0,1fr)] @min-[560px]:gap-x-4",
};
const BAR: Record<Tone, string> = {
  ok: "bg-emerald-500",
  look: "bg-amber-500",
  bad: "bg-rose-500",
  none: "bg-foreground/25",
};
/**
 * One row per claim: whether it stands (its label), and a bar to the strongest verb it may be worded with, on one scale
 * of verbs with the tick of the ceiling the study's design allows. Green reaches the ceiling, amber stays below it.
 * Hover reads the wording; a click picks the claim and shows it in the list above.
 */
function StrengthChart({
  ids,
  labels,
  showStrength,
  ceiling,
  sel,
  onPick,
}: {
  ids: string[];
  labels: Record<string, EvaluationLabel>;
  showStrength: boolean;
  ceiling?: string;
  sel: string;
  onPick(id: string): void;
}) {
  const rows = file("EvaluationLabels.json")?.labels ?? [];
  const at = (v: string) => `${strengthShare(v) * 100}%`;
  // Once every claim has its label and they are all the same, the key result says it: the column would repeat it. It
  // shows while the labels arrive, and whenever they differ.
  const given = ids.map((id) => labels[id]?.label).filter(Boolean);
  const labelCol = !ids.length || given.length < ids.length || new Set(given).size > 1;
  const ROW_ = labelCol ? ROW.label : ROW.plain;
  return (
    <div className="flex min-w-0 flex-col gap-3 px-4 py-3.5 sm:px-5">
      {/* The scale, above the bars: each verb at its place on it. */}
      <div className={cn(ROW_, "text-muted-foreground text-xs")}>
        <span>Claim</span>
        <span className="relative h-4">
          {AXIS.map((v) => (
            <span
              key={v}
              className={cn(
                "absolute -translate-x-1/2 whitespace-nowrap last:-translate-x-full",
                v === ceiling && "font-medium text-foreground",
              )}
              style={{ left: at(v) }}
            >
              {v}
            </span>
          ))}
        </span>
        {labelCol && (
          <span className="text-right">
            <Term t="aspic+">Label</Term>
          </span>
        )}
      </div>
      <ul className="-mt-1.5 flex flex-col">
        {ids.map((id) => {
          const l = labels[id];
          const row = rows.find((r) => r.statement_id === id);
          const lab = l ? labelKey(l.label) : null;
          const strength = showStrength && l && row ? row.strength : null;
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onPick(id)}
                title={row?.approved_text ? fill(row.approved_text) : ownText(id)}
                aria-pressed={sel === id}
                className={cn(
                  ROW_,
                  "-mx-2 w-[calc(100%+16px)] rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted/60",
                  sel === id && "bg-muted/70",
                )}
              >
                <span className="flex min-w-0 items-baseline gap-1.5 text-[13px]">
                  <span className="@max-[559px]:hidden font-medium">{nameOf(id)}</span>
                  <span className="font-mono text-muted-foreground text-xs">{id}</span>
                </span>
                <span className="relative h-2.5 rounded-full bg-muted">
                  {strength && strength !== "none" && (
                    <M
                      as="b"
                      in="grow"
                      className={cn(
                        "absolute inset-y-0 left-0 origin-left rounded-full",
                        BAR[strengthTone(strength, ceiling)],
                      )}
                      style={{ width: at(strength) }}
                    />
                  )}
                  {ceiling && (
                    <span
                      aria-hidden="true"
                      className="absolute -inset-y-1 w-0.5 -translate-x-1/2 rounded-full bg-foreground/70"
                      style={{ left: at(ceiling) }}
                    />
                  )}
                </span>
                {labelCol && (
                  <span className="flex justify-end">
                    {lab ? (
                      <M as="span" key={lab} in="fade">
                        <LabelWord label={lab} />
                      </M>
                    ) : (
                      <span className="rounded border border-foreground/20 border-dashed px-1.5 text-[11px] text-muted-foreground leading-4">
                        ···
                      </span>
                    )}
                  </span>
                )}
              </button>
            </li>
          );
        })}
        {!ids.length &&
          [0, 1, 2, 3, 4].map((i) => (
            <li key={i} className={cn(ROW_, "py-2")}>
              <Skeleton aria-hidden="true" className="h-3 w-24 animate-none rounded-full" />
              <span className="h-2.5 rounded-full bg-muted" />
              <span />
            </li>
          ))}
      </ul>
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground text-xs">
        <span className="flex items-center gap-1.5">
          <i className={cn("h-2 w-3 rounded-full", BAR.ok)} />
          worded at the ceiling
        </span>
        <span className="flex items-center gap-1.5">
          <i className={cn("h-2 w-3 rounded-full", BAR.look)} />
          hedged below it
        </span>
        <span className="flex items-center gap-1.5">
          <i className="h-3 w-0.5 rounded-full bg-foreground/70" />
          the <Term t="claim ceiling">ceiling</Term> the study's design allows
        </span>
      </p>
    </div>
  );
}

/* ---------- what the stage did: which claims stand, how much of the map traces to the record, and its nine steps ---------- */
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const LABEL_SWATCH: Record<string, Swatch> = { IN: "ok", UND: "look", OUT: "bad" };
/** The steps of the two stages, as the track names them, and the part of the screen each one fills. */
const STEPS: { sid: string; k: string; title: string; sel: string }[] = [
  { sid: "S06", k: "f1", title: "Put each statement on the map", sel: "[data-map]" },
  { sid: "S06", k: "f2", title: "Add the evidence and what it supports", sel: "[data-map]" },
  { sid: "S06", k: "f3", title: "Add the conflicts and preferences", sel: "[data-map]" },
  { sid: "S06", k: "f4", title: "Check the map is sound", sel: "[data-map]" },
  { sid: "S06", k: "f5", title: "Keep the science apart from the AIF core", sel: "[data-map]" },
  { sid: "S07", k: "g1", title: "Trace every node to the record", sel: "[data-verifier]" },
  { sid: "S07", k: "g2", title: "Decide which claims stand", sel: "[data-conf]" },
  { sid: "S07", k: "g3", title: "Set how strongly each claim may be worded", sel: "[data-strength]" },
  { sid: "S07", k: "g4", title: "Word each claim for the lock", sel: "[data-conf]" },
];
/** The claims by label so far. */
function labelCount(labels: Record<string, EvaluationLabel>) {
  const c = { IN: 0, OUT: 0, UND: 0 } as Record<string, number>;
  for (const l of Object.values(labels)) c[labelKey(l.label)] = (c[labelKey(l.label)] ?? 0) + 1;
  return c;
}
function stepResult(
  x: (typeof STEPS)[number],
  o: { L: MapLayout; on: Set<string>; traced: Set<string>; labels: Record<string, EvaluationLabel> },
): { tone: Tone | "wait" | "now"; label: string } {
  const st = S.st[x.sid];
  const now = st?.status === "running" && st.cur === x.k;
  const over = done(x.sid);
  const wait = (busy: string, idle: string) => ({
    tone: now ? ("now" as const) : ("wait" as const),
    label: now ? busy : idle,
  });
  const s = o.L.stream;
  const n = (ids: string[]) => ids.filter((id) => o.on.has(id)).length;
  const g = file("ArgumentGraph.json");
  if (!g && x.sid === "S06") return wait("Building", "Not built yet");
  switch (x.k) {
    case "f1":
      return n(s.statements) >= s.statements.length
        ? { tone: "ok", label: `${plural(s.statements.length, "statement")} placed` }
        : wait(`${n(s.statements)} of ${s.statements.length} placed`, "Not placed yet");
    case "f2":
      return n(s.data) + n(s.ra) >= s.data.length + s.ra.length
        ? { tone: "ok", label: `${plural(s.data.length, "value")} and sources · ${plural(s.ra.length, "inference")}` }
        : wait(`${n(s.data)} of ${s.data.length} values and sources`, "Not added yet");
    case "f3": {
      if (n(s.conflicts) < s.conflicts.length)
        return wait(`${n(s.conflicts)} of ${s.conflicts.length} added`, "Not added yet");
      const ca = g?.nodes.filter((x) => x.kind === "CA").length ?? 0;
      const pa = g?.nodes.filter((x) => x.kind === "PA").length ?? 0;
      return { tone: "ok", label: ca ? `${plural(ca, "conflict")} · ${plural(pa, "preference")}` : "No conflict" };
    }
    case "f4": {
      if (!over && !marked(MARK.sound)) return wait("Checking", "Not checked yet");
      const removed = removedOf().length;
      return removed ? { tone: "look", label: `${removed} removed` } : { tone: "ok", label: "Nothing removed" };
    }
    case "f5":
      return over || marked(MARK.ext)
        ? { tone: "ok", label: "Kept in the ASW extension" }
        : wait("Keeping it apart", "Not done yet");
    case "g1": {
      const v = verifierOf(o.L, o.traced);
      if (!v.ready) return wait("Tracing", "Not traced yet");
      if (v.n < v.total) return wait(`${v.n} of ${v.total} traced`, "Not traced yet");
      return { tone: "ok", label: `All ${plural(v.total, "node")} traced` };
    }
    case "g2": {
      const f = file("EvaluationLabels.json");
      const total = f?.labels.length ?? 0;
      const c = labelCount(o.labels);
      const got = c.IN + c.OUT + c.UND;
      if (!total || got < total) return wait(`${got} of ${total} labelled`, "Not labelled yet");
      return {
        tone: c.OUT ? "bad" : c.UND ? "look" : "ok",
        label: [`${c.IN} IN`, c.OUT && `${c.OUT} OUT`, c.UND && `${c.UND} undecided`].filter(Boolean).join(" · "),
      };
    }
    case "g3": {
      const ceiling = file("EvaluationLabels.json")?.ceiling.strength;
      return evaluated() || marked(MARK.strength)
        ? { tone: "ok", label: ceiling ? `At most “${ceiling}”` : "Set" }
        : wait("Setting it", "Not set yet");
    }
    default: {
      if (!evaluated() && !marked(MARK.worded)) return wait("Wording", "Not worded yet");
      const rows = (file("EvaluationLabels.json")?.labels ?? []).filter((l) => labelKey(l.label) === "IN");
      const worded = rows.filter((l) => l.approved_text).length;
      return {
        tone: worded < rows.length ? "look" : "ok",
        label: `${worded} of ${plural(rows.length, "IN claim")} worded`,
      };
    }
  }
}

/* ---------- the verdict on every claim: three columns, as the map decides them ---------- */
const VERDICT_COL: { k: "IN" | "UND" | "OUT"; title: string; means: string; head: string; card: string }[] = [
  {
    k: "IN",
    title: "IN",
    means: "Nothing defeats it: the paper writes it, up to its strength",
    head: "text-emerald-700 dark:text-emerald-300",
    card: "bg-emerald-50/70 ring-emerald-200 dark:bg-emerald-950/25 dark:ring-emerald-900",
  },
  {
    k: "UND",
    title: "Undecided",
    means: "An attack stands unresolved: only hedged",
    head: "text-amber-700 dark:text-amber-300",
    card: "bg-amber-50/70 ring-amber-200 dark:bg-amber-950/25 dark:ring-amber-900",
  },
  {
    k: "OUT",
    title: "OUT",
    means: "Defeated on the map: never written",
    head: "text-rose-700 dark:text-rose-300",
    card: "bg-rose-50/70 ring-rose-200 dark:bg-rose-950/25 dark:ring-rose-900",
  },
];
function VerdictColumns({
  ids,
  labels,
  onPick,
}: {
  ids: string[];
  labels: Record<string, EvaluationLabel>;
  onPick(id: string): void;
}) {
  const waiting = ids.filter((id) => !labels[id]);
  return (
    <div className="grid gap-3 @3xl:grid-cols-3">
      {VERDICT_COL.map((col) => {
        const here = ids.filter((id) => labels[id] && labelKey(labels[id].label) === col.k);
        return (
          <div key={col.k} className="flex min-w-0 flex-col gap-2 rounded-lg bg-muted/25 p-3 ring-1 ring-foreground/5">
            <div className="flex items-baseline justify-between gap-2">
              <span className={cn("font-semibold text-[15px]", col.head)}>{col.title}</span>
              <span className={cn("font-semibold text-[22px] tabular-nums leading-none", col.head)}>{here.length}</span>
            </div>
            <p className="text-pretty text-[12px] text-muted-foreground leading-snug">{col.means}</p>
            <ul className="flex flex-col gap-1.5">
              {here.map((id) => (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => onPick(id)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left ring-1 ring-inset hover:brightness-[0.98]",
                      col.card,
                    )}
                  >
                    <span className="min-w-0 truncate font-medium text-[13px]">
                      {nameOf(id)} <span className="font-mono font-normal text-[11px] text-muted-foreground">{id}</span>
                    </span>
                    {labels[id]?.strength && (
                      <span className="shrink-0 rounded bg-background/70 px-1.5 font-medium text-[11.5px]">
                        “{labels[id].strength}”
                      </span>
                    )}
                  </button>
                </li>
              ))}
              {!here.length && !waiting.length && <li className="text-[12.5px] text-muted-foreground">None.</li>}
              {col.k === "IN" &&
                waiting.map((id) => (
                  <li
                    key={id}
                    className="rounded-md px-2.5 py-1.5 text-[13px] text-muted-foreground ring-1 ring-foreground/10 ring-inset"
                  >
                    {nameOf(id)} · not labelled yet
                  </li>
                ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function MapOverview({
  L,
  on,
  labels,
  traced,
  onPick,
  onClaim,
}: {
  L: MapLayout;
  on: Set<string>;
  labels: Record<string, EvaluationLabel>;
  traced: Set<string>;
  onPick(sel: string): void;
  onClaim(id: string): void;
}) {
  const f = file("EvaluationLabels.json");
  const rows = f?.labels ?? [];
  const ids = f ? rows.map((l) => l.statement_id) : claimIds();
  const n = ids.length;
  const c = labelCount(labels);
  const ceiling = f?.ceiling.strength ?? file("ClaimCeiling.json")?.ceiling.strength;
  const frozen = Boolean(file("FrozenGraph_v1.json")) && done("S07") && LIVE.stop?.stage !== "S07";
  const v = verifierOf(L, traced);
  const ready = Boolean(f) && rows.length > 0 && (evaluated() || marked(MARK.worded));
  const _got = c.IN + c.OUT + c.UND;
  const stand = c.IN === rows.length ? `All ${rows.length} claims are IN` : `${c.IN} of ${rows.length} claims are IN`;
  const rest = [c.OUT ? `${c.OUT} OUT` : "", c.UND ? `${c.UND} undecided` : ""].filter(Boolean).join(", ");
  const headline = (
    <>
      {stand}
      {rest ? ` (${rest})` : ""}
      {c.OUT || c.UND ? "" : ": nothing defeats them"}
      {ceiling ? <>, and none may be worded more strongly than “{ceiling}”</> : null}
      {frozen ? ". The map is locked as v1 for the outline." : "."}
    </>
  );
  const _slices: Slice[] = (["IN", "UND", "OUT"] as const).map((k) => ({
    key: k,
    label: k === "UND" ? "Undecided" : k,
    value: c[k] ?? 0,
    swatch: LABEL_SWATCH[k],
  }));
  // Lane by lane: the nodes each lane holds, drawn on the map, then traced to the record.
  const nodes = [...L.nodes.values()].filter((p) => p.is !== "scheme");
  const bandAll = L.bandIds.length ? L.bandIds : nodes.filter((p) => p.lane === "band").map((p) => p.id);
  const traceable = new Set(traceOrder(L));
  const _laneRows: BarRow[] = LANE_GROUPS.map((g) => {
    const all = g.lane === "band" ? bandAll : nodes.filter((p) => p.lane === g.lane).map((p) => p.id);
    const drawn = all.filter((id) => on.has(id) || (g.lane === "band" && traced.has(id)));
    const tracedHere = drawn.filter((id) => traced.has(id)).length;
    // A node the Verifier has nothing to trace (the question, a context statement) is drawn plain.
    const context = drawn.filter((id) => !traceable.has(id)).length;
    return {
      key: g.lane,
      name: g.title,
      label: g.title,
      parts: [
        { key: "traced", label: "Traced to the record", value: tracedHere, swatch: "ok" as Swatch },
        {
          key: "drawn",
          label: "On the map, to be traced",
          value: drawn.length - tracedHere - context,
          swatch: "accent" as Swatch,
        },
        { key: "context", label: "Context: nothing to trace", value: context, swatch: "none" as Swatch },
      ],
      total: all.length,
      end: plural(all.length, "node"),
    };
  }).filter((r) => r.total > 0);
  const s = L.stream;
  const _strip = ids.map((id) => {
    const l = labels[id];
    const k = l ? labelKey(l.label) : null;
    return {
      key: id,
      swatch: (k ? LABEL_SWATCH[k] : "wait") as Swatch | "wait",
      text: `${nameOf(id)} (${id}): ${k ? (LABEL_WORD[k] ?? k) : "not labelled yet"}`,
    };
  });
  return (
    <Section
      icon="target"
      title="What this stage did"
      tells="The claim cards became one argument map; the Verifier traced every node to the record, and each claim was labelled IN, OUT or undecided."
      data-overview
    >
      <div className="@container flex flex-col gap-4 px-4 py-4 sm:px-5">
        <Takeaway ready={ready}>{headline}</Takeaway>
        <div className="flex flex-col gap-2">
          <ChartHead
            title={`The verdict on each of the ${plural(n, "claim")}`}
            tells="The map weighs every attack on a claim. IN: nothing defeats it; undecided: an attack stands unresolved; OUT: defeated. The quote is the strongest verb the paper may give it. Click a claim to read how it will be stated."
          />
          {n ? <VerdictColumns ids={ids} labels={labels} onPick={onClaim} /> : <Bars n={3} last="w-1/2" />}
        </div>
        <div className="flex flex-col gap-1.5 rounded-lg bg-muted/25 px-4 py-3 ring-1 ring-foreground/5">
          <span className="flex flex-wrap items-baseline justify-between gap-2 text-[13px]">
            <span>
              <b className="font-semibold">
                The Verifier traced {v.n} of {plural(v.total, "node")}
              </b>{" "}
              to a ledger value or a source
            </span>
            <span className="text-muted-foreground">
              {s.statements.length} statements, {plural(s.data.length, "value")},{" "}
              {plural(s.ra.length + s.conflicts.length, "link")} on the map
            </span>
          </span>
          <Meter
            value={v.n}
            max={v.total}
            tone={v.total > 0 && v.n >= v.total ? "ok" : "look"}
            label="Nodes traced to the record"
          />
        </div>
        <div className="flex flex-col gap-2">
          <ChartHead
            title="The nine steps"
            tells="Building the map, then evaluating it, in order, with what each step came to. Click one to read it."
          />
          <ResultGrid
            items={STEPS.map((x) => {
              const r = stepResult(x, { L, on, traced, labels });
              return { key: x.k, title: x.title, result: r.label, tone: r.tone, onPick: () => onPick(x.sel) };
            })}
          />
        </div>
      </div>
    </Section>
  );
}

/* ---------- what it means for the paper: the rules for every claim, and each claim as it will be stated ---------- */
function MapPaper({
  labels,
  sel,
  onPick,
}: {
  labels: Record<string, EvaluationLabel>;
  sel: string;
  onPick(id: string): void;
}) {
  const f = file("EvaluationLabels.json");
  const rows = f?.labels ?? [];
  const c = labelCount(labels);
  const ceiling = f?.ceiling.strength ?? file("ClaimCeiling.json")?.ceiling.strength;
  const ready = Boolean(f) && rows.length > 0 && (evaluated() || marked(MARK.worded));
  const inRows = rows.filter((l) => labelKey(l.label) === "IN");
  const worded = inRows.filter((l) => l.approved_text);
  const unworded = inRows.filter((l) => !l.approved_text);
  const outIds = new Set(rows.filter((l) => labelKey(l.label) === "OUT").map((l) => l.statement_id));
  const byStrength = new Map<string, number>();
  for (const l of inRows) byStrength.set(l.strength, (byStrength.get(l.strength) ?? 0) + 1);
  const effects: { key: string; item: string; id?: string; effect: string; tone: Tone }[] = [
    ...(worded.length
      ? [
          {
            key: "worded",
            item: plural(worded.length, "IN claim"),
            effect: "are written at their locked wording, listed below.",
            tone: "ok" as const,
          },
        ]
      : []),
    ...unworded.map((l) => ({
      key: `unworded-${l.statement_id}`,
      item: nameOf(l.statement_id),
      id: l.statement_id,
      effect: "is IN, but the lock gave it no wording: check how the paper states it.",
      tone: "look" as const,
    })),
    ...[...byStrength].map(([st, k]) => {
      const tone = strengthTone(st, ceiling);
      return {
        key: `strength-${st}`,
        item: plural(k, "claim"),
        effect:
          st === "none"
            ? "carry no claim verb."
            : tone === "ok"
              ? `may say at most “${st}”, the ceiling the study's design allows.`
              : `are hedged to “${st}”, below the ceiling${ceiling ? ` of “${ceiling}”` : ""}.`,
        tone,
      };
    }),
    ...(c.OUT
      ? [{ key: "out", item: plural(c.OUT, "OUT claim"), effect: "are not written.", tone: "bad" as const }]
      : []),
    ...(c.UND
      ? [
          {
            key: "und",
            item: `${c.UND} undecided`,
            effect: "may only be hedged, never stated as a finding.",
            tone: "look" as const,
          },
        ]
      : []),
    ...notWrittenOf()
      .filter((x) => !outIds.has(x.id))
      .map((x) => ({
        key: `not-${x.id}`,
        item: nameOf(x.id),
        id: x.id,
        effect: `is not written${x.why ? `: ${x.why}` : ""}.`,
        tone: "bad" as const,
      })),
  ];
  const ids = f ? rows.map((l) => l.statement_id) : claimIds();
  return (
    <Section
      icon="pen"
      title="What it means for the paper"
      tells="How strongly each claim may be worded, and each claim as the paper will state it, with why nothing defeats it."
      aside={ids.length ? plural(ids.length, "claim") : undefined}
      data-conf
      data-out="EvaluationLabels.json FrozenGraph_v1.json"
      className="scroll-mt-4"
    >
      <div className="flex flex-col gap-4 px-4 py-4 sm:px-5">
        {ready ? <EffectList items={effects} /> : <Bars n={3} last="w-1/2" className="py-1" />}
        <div className="flex flex-col gap-2">
          <ChartHead
            title="The claims, as the paper will state them"
            tells="Each claim's locked wording, its label and how strongly it may speak. Click one to find it on the map."
          />
          <ClaimLedger labels={labels} sel={sel} onPick={onPick} />
        </div>
      </div>
    </Section>
  );
}

/* ---------- the scene ---------- */
export function MapLive({ live }: { live: boolean }) {
  // Before the graph is built, its lanes stand with an outline for every statement they will hold.
  const L = mapLayout(true) ?? ghostLayout();
  const labelsFile = file("EvaluationLabels.json");
  const first = labelsFile?.labels[0]?.statement_id ?? L.stream.statements.find((id) => typeOf(id) === "finding") ?? "";
  const [selRaw, setSelRaw] = useState<string | null>(null);
  const [pinned, setPinned] = useState(false);
  const [hov, setHov] = useState<string | null>(null);
  const [layer, setLayer] = useState("all");
  const [zoom, setZoom] = useState(1);
  const wide = useMedia("(min-width: 768px)");
  const sel = selRaw ?? first;
  const setSel = (id: string) => {
    setPinned(!(pinned && id === sel));
    setSelRaw(id);
  };
  const { on, traced, labels } = mapProgress(L);
  const statements = L.stream.statements.length;
  const values = L.stream.data.length;
  const schemes = L.stream.ra.length + L.stream.conflicts.length;
  const labelled = Object.values(labels);
  const sweep = marked(MARK.sweep) && !evaluated();
  const v = verifierOf(L, traced);
  const ids = labelsFile ? labelsFile.labels.map((l) => l.statement_id) : claimIds();
  const ceiling = labelsFile?.ceiling.strength ?? file("ClaimCeiling.json")?.ceiling.strength;
  return (
    <StageAccent accent="indigo">
      <div className="@container relative flex min-w-0 flex-col gap-5">
        <MapOverview
          L={L}
          on={on}
          labels={labels}
          traced={traced}
          onPick={(s) => scrollSoon(s)}
          onClaim={(id) => {
            setSel(id);
            scrollSoon("[data-conf]");
          }}
        />
        <MapPaper labels={labels} sel={sel} onPick={setSel} />

        <Section
          icon="graph"
          title="The argument map"
          tells={
            wide
              ? "Every statement in its lane, joined by inferences (RA), conflicts (CA) and preferences (PA). Click a node to read its record."
              : "Every statement by its lane, with what it is tied to. Tap one to read it in full."
          }
          aside={L.ghost ? undefined : `${statements} statements · ${values} values · ${schemes} links`}
          data-out="ArgumentGraph.json"
          data-map
          className="scroll-mt-4"
        >
          {/* Above the drawing: which links to show, what the marks mean, and how large to draw it. */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-4 py-2 text-muted-foreground text-xs sm:px-5">
            {wide && (
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                spacing={0}
                value={layer}
                onValueChange={(x) => x && setLayer(x)}
                aria-label="Show links"
              >
                {[
                  ["all", "All links"],
                  ["support", "Support"],
                  ["conflict", "Conflict"],
                  ["life", "Lifecycle"],
                ].map(([k, label]) => (
                  <ToggleGroupItem key={k} value={k} className="h-7 px-2 text-xs">
                    {label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            )}
            <span className="flex items-center gap-1.5">
              <i className="h-0.5 w-4 rounded bg-slate-500" />
              <Term t="ra">RA</Term> supports
            </span>
            <span className="flex items-center gap-1.5">
              <i className="h-0.5 w-4 rounded bg-rose-500" />
              <Term t="ca">CA</Term> attacks
            </span>
            <span className="flex items-center gap-1.5">
              <i className="h-0.5 w-4 rounded bg-foreground/70" />
              <Term t="pa">PA</Term> prefers
            </span>
            <span className="flex items-center gap-1.5">
              <i className="h-0 w-4 border-slate-400 border-t-2 border-dotted" />
              lifecycle
            </span>
            {labelled.length > 0 && (
              <span className="flex items-center gap-1.5">
                {(["IN", "OUT", "UND"] as const).map((k) => (
                  <Term key={k} t={k === "UND" ? "undec" : k.toLowerCase()}>
                    <LabelWord label={k} />
                  </Term>
                ))}
              </span>
            )}
            {wide && (
              <fieldset className="ml-auto flex items-center gap-1" aria-label="Zoom">
                <button
                  type="button"
                  aria-label="Zoom out"
                  disabled={zoom <= 0.5}
                  onClick={() => setZoom((z) => Math.max(0.5, Math.round((z - 0.1) * 10) / 10))}
                  className="grid size-7 place-items-center rounded-md ring-1 ring-foreground/10 hover:bg-muted disabled:opacity-40"
                >
                  <Minus className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(1)}
                  className="h-7 min-w-12 rounded-md px-1.5 font-mono tabular-nums ring-1 ring-foreground/10 hover:bg-muted"
                  title="Draw at full size"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  type="button"
                  aria-label="Zoom in"
                  disabled={zoom >= 1}
                  onClick={() => setZoom((z) => Math.min(1, Math.round((z + 0.1) * 10) / 10))}
                  className="grid size-7 place-items-center rounded-md ring-1 ring-foreground/10 hover:bg-muted disabled:opacity-40"
                >
                  <Plus className="size-3.5" />
                </button>
              </fieldset>
            )}
          </div>
          <div className="grid min-w-0 @min-[1000px]:grid-cols-[minmax(0,1fr)_300px]">
            {wide ? (
              <MapCanvas
                L={L}
                on={on}
                traced={traced}
                labels={labels}
                sel={sel}
                pinned={pinned}
                onPick={setSel}
                hov={hov}
                onHov={setHov}
                layer={layer}
                live={live}
                sweep={sweep}
                zoom={zoom}
              />
            ) : (
              <MapList L={L} on={on} labels={labels} sel={sel} onPick={setSel} />
            )}
            <aside
              aria-label="The node you picked"
              className="flex @min-[1000px]:max-h-[804px] min-w-0 flex-col gap-2 @min-[1000px]:overflow-y-auto @min-[1000px]:overscroll-contain border-t @min-[1000px]:border-t-0 @min-[1000px]:border-l px-4 py-3.5 @min-[1000px]:[scrollbar-width:thin] sm:px-5"
            >
              <span className="font-semibold text-sm">The node you picked</span>
              <MapRecord L={L} id={sel} on={on} traced={traced} labels={labels} onPick={setSel} />
            </aside>
          </div>
        </Section>

        <Section
          icon="shield"
          title="Where every node comes from"
          tells="The Verifier traces each node of the map to a ledger value or a source, and checks that the numbers' records were recomputed."
          aside={v.ready ? `${v.n} of ${v.total} traced` : undefined}
          data-out="GraphEvidenceMap.json"
          data-verifier
          className="scroll-mt-4"
        >
          <VerifierRows L={L} traced={traced} />
        </Section>

        <Section
          icon="gauge"
          title="How strongly each claim may be worded"
          tells="Each claim on one scale of verbs, against the ceiling the study's design allows: green reaches it, amber is hedged below it."
          aside={ceiling ? `Ceiling “${ceiling}”` : undefined}
          data-strength
          className="scroll-mt-4"
        >
          <StrengthChart
            ids={ids}
            labels={labels}
            showStrength={evaluated() || marked(MARK.strength)}
            ceiling={ceiling}
            sel={sel}
            onPick={setSel}
          />
        </Section>
      </div>
    </StageAccent>
  );
}
