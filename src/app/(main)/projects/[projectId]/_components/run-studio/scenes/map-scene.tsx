"use client";

import "@xyflow/react/dist/style.css";

import { type CSSProperties, type RefObject, useEffect, useMemo, useRef, useState } from "react";

import {
  Background,
  Controls,
  type Edge,
  EdgeLabelRenderer,
  type EdgeProps,
  getBezierPath,
  getStraightPath,
  getViewportForBounds,
  Handle,
  type InternalNode,
  type Node,
  type NodeProps,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useInternalNode,
  useReactFlow,
} from "@xyflow/react";
import { cn } from "cn";
import {
  ArrowDown,
  BookOpenText,
  CircleAlert,
  Download,
  Filter,
  FlaskConical,
  Layers,
  Lightbulb,
  type LucideIcon,
  MapPin,
  Microscope,
  Network,
  Orbit,
  Puzzle,
  ScanSearch,
  ShieldAlert,
  TriangleAlert,
  Users,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type {
  CanvasPiece,
  CanvasPieceId,
  EntityType,
  MapEdge,
  MapNode,
  MapRelation,
  RelationStatus,
} from "@/lib/run-stream/contract";
import type { MapContent } from "@/lib/run-stream/run-state";
import {
  checkGraph,
  type Direction,
  egoGraph,
  type GraphIssue,
  LAYER_OF,
  type MapLayer,
  traceOf,
  VOCABULARY,
} from "@/lib/run-stream/semantic-graph";

import { AgentCursor } from "../run-bits";
import { useWorkspace } from "../workspace-context";
import { PendingLines, Placeholder } from "./scene-ui";

// ---------- what the graph is made of ----------

/** The seven entity types, coloured as the scientific research canvas colours them. */
const ENTITY: Record<EntityType, { tag: string; name: string; plural: string; box: string; optional?: boolean }> = {
  evidence: { tag: "EV", name: "Evidence", plural: "Evidence", box: "bg-teal-700 ring-teal-800" },
  claim: { tag: "CL", name: "Claim", plural: "Claims", box: "bg-blue-600 ring-blue-700" },
  gap: { tag: "GAP", name: "Research gap", plural: "Research gaps", box: "bg-orange-600 ring-orange-700" },
  question: { tag: "RQ", name: "Research question", plural: "Research questions", box: "bg-amber-600 ring-amber-700" },
  hypothesis: { tag: "H", name: "Hypothesis", plural: "Hypotheses", box: "bg-violet-600 ring-violet-700" },
  assumption: {
    tag: "AS",
    name: "Assumption",
    plural: "Assumptions",
    box: "bg-slate-500 ring-slate-600",
    optional: true,
  },
  contribution: {
    tag: "EC",
    name: "Expected contribution",
    plural: "Expected contributions",
    box: "bg-green-700 ring-green-800",
    optional: true,
  },
};

const ENTITY_ORDER: EntityType[] = ["evidence", "claim", "gap", "question", "hypothesis", "assumption", "contribution"];

const LAYERS: Record<MapLayer, { code: string; title: string; asks: string }> = {
  foundation: { code: "L1", title: "Research foundation", asks: "Why · evidence, claims, gaps" },
  reasoning: { code: "L2", title: "Scientific reasoning", asks: "What if · questions, assumptions, hypotheses" },
  contribution: { code: "L3", title: "Proposed contribution", asks: "So what · anticipated contribution" },
};

const LAYER_ORDER: MapLayer[] = ["foundation", "reasoning", "contribution"];

/** The rows inside the layers, top down, each with the stage of the run that fills it. */
const ROWS: { layer: MapLayer; title: string; line: string; stage: string }[] = [
  {
    layer: "foundation",
    title: "Evidence",
    line: "Findings, with the sample and paper they come from",
    stage: "Stage 6",
  },
  {
    layer: "foundation",
    title: "Claims and gaps",
    line: "What the literature claims, and what it leaves open",
    stage: "Stage 7",
  },
  { layer: "reasoning", title: "Your question", line: "The topic the run started from", stage: "Stage 1" },
  {
    layer: "reasoning",
    title: "Sub-questions and hypotheses",
    line: "Each sub-question between the hypotheses that propose an answer to it",
    stage: "Stages 2 and 8",
  },
  { layer: "contribution", title: "Expected contributions", line: "What each would add if it holds", stage: "Stage 8" },
];

function rowOf(node: MapNode) {
  switch (node.type) {
    case "evidence":
      return 0;
    case "claim":
    case "gap":
      return 1;
    case "contribution":
      return 4;
    default:
      return node.type === "question" && node.stage === 1 ? 2 : 3;
  }
}

/** How each relation is drawn: colour by relation and polarity, line style by how far it can be trusted. */
const RELATION: Record<MapRelation, { label: string; stroke: string; fill: string }> = {
  supports: { label: "supports", stroke: "stroke-emerald-600", fill: "fill-emerald-600" },
  contradicts: { label: "contradicts", stroke: "stroke-rose-600", fill: "fill-rose-600" },
  substantiates: { label: "substantiates", stroke: "stroke-orange-500", fill: "fill-orange-500" },
  motivates: { label: "motivates", stroke: "stroke-orange-500", fill: "fill-orange-500" },
  decomposes_into: { label: "decomposes into", stroke: "stroke-amber-600", fill: "fill-amber-600" },
  proposes_answer_to: { label: "proposes answer to", stroke: "stroke-violet-600", fill: "fill-violet-600" },
  provides_rationale_for: { label: "provides rationale for", stroke: "stroke-blue-600", fill: "fill-blue-600" },
  depends_on: { label: "depends on", stroke: "stroke-slate-500", fill: "fill-slate-500" },
  addresses: { label: "addresses", stroke: "stroke-orange-600", fill: "fill-orange-600" },
  informs: { label: "informs", stroke: "stroke-green-700", fill: "fill-green-700" },
  targets: { label: "targets", stroke: "stroke-green-600", fill: "fill-green-600" },
};

const RELATION_ORDER = Object.keys(VOCABULARY) as MapRelation[];

/** A claim that challenges a hypothesis still `provides_rationale_for` it, drawn red. */
function lookOfEdge(edge: MapEdge) {
  if (edge.relation === "provides_rationale_for" && edge.polarity === "challenges")
    return { label: "challenges", stroke: "stroke-rose-600", fill: "fill-rose-600" };
  return RELATION[edge.relation];
}

/** Derived relations are dotted; unreviewed ones are drawn lighter, so the stated ones carry the drawing. */
const DASH: Record<RelationStatus, string | undefined> = { stated: undefined, derived: "2 4", unreviewed: undefined };
const SHADE: Record<RelationStatus, number> = { stated: 1, derived: 0.8, unreviewed: 0.5 };

const STATUS: Record<RelationStatus, { name: string; line: string; chip: string }> = {
  stated: {
    name: "Stated",
    line: "A record of the run says so directly.",
    chip: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  derived: {
    name: "Derived",
    line: "Inferred from other relations; no record states it.",
    chip: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
  unreviewed: {
    name: "Unreviewed",
    line: "A judgement of the run that nobody has checked yet.",
    chip: "bg-amber-500/10 text-amber-800 dark:text-amber-300",
  },
};

const NODE_W = 240;
const NODE_H = 96;
/** Evidence, gaps and hypotheses carry a caption underneath: the sample and paper, the papers, the falsifier. */
const CAPTIONED_H = 152;
const LABEL_W = 230;

function captionOf(node: MapNode): { line?: string; strong?: string } | null {
  if (node.type === "evidence")
    return { line: node.detail ? `Sample: ${node.detail}` : undefined, strong: node.source };
  if (node.type === "gap" && node.provenance?.length)
    return {
      line: `From the limitations of ${node.provenance.length} ${node.provenance.length === 1 ? "paper" : "papers"}`,
      strong: node.provenance.map((p) => p.source).join(" · "),
    };
  if (node.type === "hypothesis") {
    const wrong = node.facts?.find((f) => f.label === "Wrong if");
    return wrong ? { line: wrong.value } : null;
  }
  return null;
}

const heightOf = (node: MapNode) => (captionOf(node) ? CAPTIONED_H : NODE_H);
/** Findings are the longest row, so their cards are narrower; the sample and paper sit underneath. */
const EVIDENCE_W = 188;
const widthOf = (node: MapNode) => (node.type === "evidence" ? EVIDENCE_W : NODE_W);

/** Nodes of the ego graph in the side panel: smaller, without captions. */
const EGO_W = 184;
const EGO_H = 72;

/** The short line shown with a node's type, such as `SQ3 · no hypothesis yet` or `H1 · to test`. */
function qualifierOf(node: MapNode, edges: MapEdge[]) {
  switch (node.type) {
    case "question": {
      if (node.stage === 1) return "Your topic";
      const answered = edges.some((e) => e.to === node.id && e.relation === "proposes_answer_to");
      return answered ? node.code : `${node.code} · no hypothesis yet`;
    }
    case "claim":
      return `${node.code} · ${node.origin === "proposed" ? "proposed" : "literature"}`;
    case "hypothesis":
      return `${node.code} · to test`;
    case "contribution":
      return `${node.code} · expected`;
    default:
      return node.code;
  }
}

const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;

// ---------- layered canvas: layout ----------

interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Layout {
  nodes: Map<string, { x: number; y: number }>;
  /** Where each row's label goes, right of the nodes. */
  rows: { row: number; x: number; y: number }[];
  /** One band per layer, with how many of its entities are collapsed out of sight. */
  bands: (Bounds & { layer: MapLayer; hidden: number })[];
  bounds: Bounds;
}

const EMPTY: Layout = { nodes: new Map(), rows: [], bands: [], bounds: { x: 0, y: 0, width: 0, height: 0 } };

const GAP_X = 28;
const STEP = NODE_W + GAP_X;
/** Extra room between one sub-question's hypotheses and the next. */
const SQ_GAP = 72;
const ROW_GAP = 64;
const BAND_HEAD = 56;
const BAND_PAD = 28;
const LAYER_GAP = 24;

/**
 * Lays the graph out in its three layers. Sub-questions sit side by side with the hypotheses answering each beneath
 * them; every other row is ordered by what it is tied to, so relations run as straight as they can. Positions only
 * keep the drawing readable: no relation is flipped, and where a node sits says nothing about whether it holds.
 */
function layout(nodes: MapNode[], edges: MapEdge[], collapsed: Set<MapLayer>): Layout {
  const shown = nodes.filter((n) => !collapsed.has(LAYER_OF[n.type]));
  const byRow = new Map<number, MapNode[]>();
  for (const n of shown) byRow.set(rowOf(n), [...(byRow.get(rowOf(n)) ?? []), n]);
  /** The centre of each node across the page. */
  const xs = new Map<string, number>();
  const centreOf = (id: string) => {
    const known: number[] = [];
    for (const e of edges) {
      if (e.from !== id && e.to !== id) continue;
      const x = xs.get(e.from === id ? e.to : e.from);
      if (x !== undefined) known.push(x);
    }
    return known.length ? mean(known) : undefined;
  };
  /** Places a row in the order of what it is tied to, without overlaps, centred on where it wants to be. */
  const pack = (row: MapNode[], fallback: number) => {
    const wants = row.map((n, i) => ({ n, i, want: centreOf(n.id) ?? fallback + (i - (row.length - 1) / 2) * STEP }));
    wants.sort((a, b) => a.want - b.want || a.i - b.i);
    const at: number[] = [];
    wants.forEach((w, k) => {
      const room = k === 0 ? 0 : (widthOf(wants[k - 1].n) + widthOf(w.n)) / 2 + GAP_X;
      at.push(k === 0 ? w.want : Math.max(w.want, at[k - 1] + room));
    });
    const shift = mean(wants.map((w, k) => w.want - at[k]));
    wants.forEach((w, k) => {
      xs.set(w.n.id, at[k] + shift);
    });
  };

  // The spine: each sub-question in its own lane, between the hypotheses that propose an answer to it (alternating
  // left and right), so every such relation is a short arrow along the row. Lanes follow the order the run wrote.
  const row3 = byRow.get(3) ?? [];
  const hypotheses = row3.filter((n) => n.type !== "question");
  let cursor = 0;
  for (const sq of row3.filter((n) => n.type === "question")) {
    const own = hypotheses.filter((h) =>
      edges.some((e) => e.from === h.id && e.to === sq.id && e.relation === "proposes_answer_to"),
    );
    const left = own.filter((_, i) => i % 2 === 0).reverse();
    const right = own.filter((_, i) => i % 2 === 1);
    [...left, sq, ...right].forEach((n, i) => {
      xs.set(n.id, cursor + i * STEP);
    });
    cursor += (own.length + 1) * STEP + SQ_GAP;
  }
  for (const n of row3)
    if (!xs.has(n.id)) {
      xs.set(n.id, cursor);
      cursor += STEP;
    }
  const middle = xs.size ? mean([...xs.values()]) : 0;
  pack(byRow.get(2) ?? [], middle);
  pack(byRow.get(4) ?? [], middle);
  pack(byRow.get(1) ?? [], middle);
  pack(byRow.get(0) ?? [], middle);

  const ys = new Map<number, number>();
  const height = (r: number) => Math.max(...(byRow.get(r) ?? []).map(heightOf));
  const edgesOf = shown.filter((n) => xs.has(n.id));
  const left = (edgesOf.length ? Math.min(...edgesOf.map((n) => (xs.get(n.id) ?? 0) - widthOf(n) / 2)) : 0) - 40;
  const right = (edgesOf.length ? Math.max(...edgesOf.map((n) => (xs.get(n.id) ?? 0) + widthOf(n) / 2)) : 360) + 48;
  const bands: Layout["bands"] = [];
  let y = 0;
  for (const layer of LAYER_ORDER) {
    const all = nodes.filter((n) => LAYER_OF[n.type] === layer);
    if (!all.length) continue;
    const top = y;
    y += BAND_HEAD;
    if (!collapsed.has(layer)) {
      for (const [r, meta] of ROWS.entries()) {
        if (meta.layer !== layer || !byRow.has(r)) continue;
        ys.set(r, y);
        y += height(r) + ROW_GAP;
      }
      y += BAND_PAD - ROW_GAP;
    }
    bands.push({
      layer,
      x: left,
      y: top,
      width: right + LABEL_W + 32 - left,
      height: y - top,
      hidden: collapsed.has(layer) ? all.length : 0,
    });
    y += LAYER_GAP;
  }
  return {
    nodes: new Map(shown.map((n) => [n.id, { x: (xs.get(n.id) ?? 0) - widthOf(n) / 2, y: ys.get(rowOf(n)) ?? 0 }])),
    rows: [...ys.entries()].map(([row, at]) => ({ row, x: right, y: at + 10 })),
    bands,
    bounds: { x: left, y: 0, width: right + LABEL_W + 32 - left, height: Math.max(0, y - LAYER_GAP) },
  };
}

// ---------- shared drawing ----------

interface EntityData extends Record<string, unknown> {
  node: MapNode;
  qualifier: string;
  fresh: boolean;
  dim: boolean;
  picked: boolean;
  /** The ego graph's own centre; nodes there are not where the agent's cursor points. */
  ego: boolean | "ring";
  /** Drawn small, for the ego graph in the side panel. */
  compact?: boolean;
}
type EntityFlowNode = Node<EntityData, "entity">;
type BandFlowNode = Node<{ layer: MapLayer; hidden: number; fresh: boolean }, "band">;
type RowFlowNode = Node<{ title: string; line: string; stage: string; fresh: boolean }, "row">;

const hidden = { opacity: 0, border: 0, width: 1, height: 1, minWidth: 0, minHeight: 0 };

function EntityNode({ id, data }: NodeProps<EntityFlowNode>) {
  const { node, compact } = data;
  const caption = compact ? null : captionOf(node);
  const topic = node.type === "question" && node.stage === 1;
  return (
    <motion.div
      data-cursor={data.ego === false ? `mapnode:${id}` : undefined}
      initial={data.fresh ? { opacity: 0, scale: 0.86, y: -6 } : false}
      animate={{ opacity: data.dim ? 0.18 : 1, scale: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={compact ? { width: EGO_W, height: EGO_H } : { width: widthOf(node), height: heightOf(node) }}
      className="flex cursor-pointer flex-col gap-1.5"
    >
      <Handle type="target" position={Position.Top} id="t" style={hidden} isConnectable={false} />
      <Handle type="source" position={Position.Top} id="ts" style={hidden} isConnectable={false} />
      <Handle type="source" position={Position.Bottom} id="b" style={hidden} isConnectable={false} />
      <Handle type="target" position={Position.Bottom} id="bt" style={hidden} isConnectable={false} />
      <Handle type="source" position={Position.Right} id="rs" style={hidden} isConnectable={false} />
      <Handle type="target" position={Position.Right} id="rt" style={hidden} isConnectable={false} />
      <Handle type="source" position={Position.Left} id="ls" style={hidden} isConnectable={false} />
      <Handle type="target" position={Position.Left} id="lt" style={hidden} isConnectable={false} />
      <div
        style={{ height: compact ? EGO_H : NODE_H }}
        className={cn(
          "flex shrink-0 flex-col gap-1 overflow-hidden rounded-xl text-left text-white shadow-sm ring-1",
          compact ? "px-2.5 py-1.5" : "px-3 py-2",
          ENTITY[node.type].box,
          topic && "ring-2 ring-amber-300",
          (data.picked || data.ego === true) && "shadow-lg ring-[3px] ring-foreground",
        )}
      >
        <span className="flex min-w-0 items-center gap-1.5 text-[10px]">
          <b className="shrink-0 rounded bg-white/20 px-1 font-mono font-semibold leading-4">{ENTITY[node.type].tag}</b>
          <span className="truncate font-medium opacity-90">{data.qualifier}</span>
          <span className="ml-auto shrink-0 font-mono opacity-75" title={`Made in stage ${node.stage}`}>
            S{node.stage}
          </span>
        </span>
        <span
          className={cn(
            "leading-snug",
            compact ? "line-clamp-2 text-[11px]" : "line-clamp-3 text-[12px]",
            topic && "font-semibold",
            topic && !compact && "text-[13px]",
          )}
        >
          {node.label}
        </span>
      </div>
      {caption && (
        <span className="flex min-w-0 flex-col gap-0.5 px-1 text-[11px] leading-snug">
          {caption.line && <span className="line-clamp-2 text-muted-foreground">{caption.line}</span>}
          {caption.strong && <b className="truncate font-semibold text-foreground">{caption.strong}</b>}
        </span>
      )}
    </motion.div>
  );
}

function LayerBand({ data, width, height }: NodeProps<BandFlowNode>) {
  const meta = LAYERS[data.layer];
  return (
    <motion.div
      initial={data.fresh ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={{ width, height }}
      className="pointer-events-none flex flex-col rounded-2xl bg-foreground/[0.03] px-5 pt-3.5 ring-1 ring-foreground/10"
    >
      <span className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <b className="font-semibold text-[15px] uppercase tracking-wide">
          <span className="mr-2 font-mono text-muted-foreground">{meta.code}</span>
          {meta.title}
        </b>
        <span className="text-[13px] text-muted-foreground">{meta.asks}</span>
        {data.hidden > 0 && (
          <span className="text-[13px] text-muted-foreground italic">
            Collapsed · {data.hidden} {data.hidden === 1 ? "entity" : "entities"}
          </span>
        )}
      </span>
    </motion.div>
  );
}

function RowLabel({ data }: NodeProps<RowFlowNode>) {
  return (
    <motion.div
      initial={data.fresh ? { opacity: 0, x: -6 } : false}
      animate={{ opacity: 1, x: 0 }}
      style={{ width: LABEL_W }}
      className="pointer-events-none flex flex-col gap-0.5 border-foreground/20 border-l-2 pl-3"
    >
      <span className="font-mono text-[11px] text-muted-foreground uppercase tracking-wide">{data.stage}</span>
      <b className="font-semibold text-[15px] leading-tight">{data.title}</b>
      <span className="text-[13px] text-muted-foreground leading-snug">{data.line}</span>
    </motion.div>
  );
}

/** The arrowhead at the end of a relation, drawn with it so exported images keep it. */
function headAt(x: number, y: number, angle: number) {
  const point = (along: number, across: number) =>
    `${x - along * Math.cos(angle) + across * Math.sin(angle)} ${y - along * Math.sin(angle) - across * Math.cos(angle)}`;
  return `M ${x} ${y} L ${point(9, 4.5)} L ${point(9, -4.5)} Z`;
}

const ANGLE: Record<Position, number> = {
  [Position.Top]: Math.PI / 2,
  [Position.Bottom]: -Math.PI / 2,
  [Position.Left]: 0,
  [Position.Right]: Math.PI,
};

interface RelationData extends Record<string, unknown> {
  edge: MapEdge;
  fresh: boolean;
  dim: boolean;
  hot: boolean;
  picked: boolean;
  /** A long relation running up past other rows: kept faint until something it ties is picked. */
  faint: boolean;
  /** Its label is on show: the relation is picked, lit or under the pointer. */
  labelled: boolean;
  onPick(id: string): void;
}

function RelationPath({
  path,
  head,
  labelX,
  labelY,
  data,
}: {
  path: string;
  head: string;
  labelX: number;
  labelY: number;
  data: RelationData;
}) {
  const look = lookOfEdge(data.edge);
  const dash = DASH[data.edge.status];
  const quiet = data.faint && !data.hot && !data.picked;
  let opacity = data.hot || data.picked ? 1 : SHADE[data.edge.status];
  if (data.dim) opacity = 0.07;
  else if (quiet) opacity = 0.25;
  let width = 1.5;
  if (data.picked) width = 3;
  else if (data.hot) width = 2.2;
  return (
    <>
      <motion.g
        initial={data.fresh ? { opacity: 0 } : false}
        animate={{ opacity }}
        transition={{ duration: 0.3 }}
        className="cursor-pointer"
      >
        <path d={path} fill="none" stroke="transparent" strokeWidth={14} />
        <motion.path
          d={path}
          fill="none"
          className={look.stroke}
          strokeWidth={width}
          strokeDasharray={dash}
          initial={data.fresh && !dash ? { pathLength: 0 } : false}
          animate={dash ? undefined : { pathLength: 1 }}
          transition={{ duration: 0.55, ease: "easeInOut" }}
        />
        <path d={head} className={look.fill} />
      </motion.g>
      {data.labelled && !data.dim && (
        <EdgeLabelRenderer>
          <motion.button
            type="button"
            onClick={() => data.onPick(data.edge.id)}
            initial={data.fresh ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            transition={{ delay: data.fresh ? 0.35 : 0 }}
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
            className={cn(
              "nodrag nopan pointer-events-auto absolute cursor-pointer whitespace-nowrap rounded-full bg-background px-1.5 py-px text-[10.5px] text-muted-foreground italic ring-1 ring-foreground/10 hover:text-foreground",
              (data.hot || data.picked) && "font-medium text-foreground not-italic",
              data.picked && "ring-2 ring-foreground",
            )}
          >
            {look.label}
          </motion.button>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

type RelationFlowEdge = Edge<RelationData, "relation" | "ego">;

function LayeredEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps<RelationFlowEdge>) {
  if (!data) return null;
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  return (
    <RelationPath
      path={path}
      head={headAt(targetX, targetY, ANGLE[targetPosition])}
      labelX={labelX}
      labelY={labelY}
      data={data}
    />
  );
}

/** Where the line from one node's centre towards another's leaves its box. */
function rim(from: InternalNode, to: InternalNode): [number, number] {
  const w = from.measured.width ?? NODE_W;
  const h = from.measured.height ?? NODE_H;
  const cx = from.internals.positionAbsolute.x + w / 2;
  const cy = from.internals.positionAbsolute.y + h / 2;
  const dx = to.internals.positionAbsolute.x + (to.measured.width ?? NODE_W) / 2 - cx;
  const dy = to.internals.positionAbsolute.y + (to.measured.height ?? NODE_H) / 2 - cy;
  if (!dx && !dy) return [cx, cy];
  const scale = Math.min(
    dx ? (w / 2 + 6) / Math.abs(dx) : Number.POSITIVE_INFINITY,
    dy ? (h / 2 + 6) / Math.abs(dy) : Number.POSITIVE_INFINITY,
  );
  return [cx + dx * scale, cy + dy * scale];
}

/** A straight relation between two nodes of the ego graph, from rim to rim. */
function EgoEdge({ source, target, data }: EdgeProps<RelationFlowEdge>) {
  const a = useInternalNode(source);
  const b = useInternalNode(target);
  if (!a || !b || !data) return null;
  const [sx, sy] = rim(a, b);
  const [tx, ty] = rim(b, a);
  const [path, labelX, labelY] = getStraightPath({ sourceX: sx, sourceY: sy, targetX: tx, targetY: ty });
  return (
    <RelationPath
      path={path}
      head={headAt(tx, ty, Math.atan2(ty - sy, tx - sx))}
      labelX={labelX}
      labelY={labelY}
      data={data}
    />
  );
}

const nodeTypes = { entity: EntityNode, band: LayerBand, row: RowLabel };
const edgeTypes = { relation: LayeredEdge, ego: EgoEdge };

/**
 * Keeps the drawing in view whenever `key` changes. While the run draws, the camera follows the node being drawn at a
 * zoom where it can be read, unless the viewer took over; otherwise the whole drawing is fitted.
 */
function useFit(key: string, visible: boolean, live: boolean, focus?: { x: number; y: number } | null) {
  const { follow } = useWorkspace();
  const flow = useReactFlow();
  const fx = focus?.x;
  const fy = focus?.y;
  useEffect(() => {
    void key;
    if (!visible || (live && !follow)) return;
    // A tab that was hidden needs a moment to be measured before it can be fitted.
    const timer = window.setTimeout(() => {
      if (live && fx !== undefined && fy !== undefined) void flow.setCenter(fx, fy, { zoom: 0.8, duration: 450 });
      else void flow.fitView({ padding: 0.06, maxZoom: 1, duration: live ? 500 : 0 });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [key, visible, live, follow, flow, fx, fy]);
}

const flowProps = {
  nodeTypes,
  edgeTypes,
  nodesConnectable: false,
  nodesDraggable: false,
  elementsSelectable: false,
  minZoom: 0.08,
  maxZoom: 1.6,
  attributionPosition: "bottom-right",
  // The zoom buttons and the attribution take the app's theme; React Flow's own colours are light only.
  className: cn(
    "[&_.react-flow__node]:transition-transform [&_.react-flow__node]:duration-500 [&_.react-flow__node]:ease-out",
    "[--xy-controls-button-background-color:var(--card)] [--xy-controls-button-background-color-hover:var(--muted)]",
    "[--xy-controls-button-color:var(--foreground)] [--xy-controls-button-color-hover:var(--foreground)]",
    "[--xy-controls-button-border-color:var(--border)] [--xy-attribution-background-color:transparent]",
  ),
} as const;

type Pick = { kind: "node" | "edge"; id: string } | null;

// ---------- layered canvas ----------

function LayeredCanvas({
  data,
  placed,
  relations,
  pick,
  onPickNode,
  onPickEdge,
  live,
  visible,
  narrow,
  shown,
}: {
  data: MapContent;
  placed: Layout;
  relations: Set<MapRelation>;
  pick: Pick;
  onPickNode(id: string | null): void;
  onPickEdge(id: string): void;
  live: boolean;
  /** The tab is open: the view can only fit what it can measure. */
  visible: boolean;
  /** The ego panel takes part of the width, so the drawing is fitted again when it opens or closes. */
  narrow: boolean;
  /** Nodes and relations on screen before this render: anything else is new and animates in. */
  shown: RefObject<Set<string>>;
}) {
  const byId = useMemo(() => new Map(data.nodes.map((n) => [n.id, n])), [data.nodes]);
  const lit = useMemo(() => {
    if (!pick) return null;
    if (pick.kind === "node") return traceOf(data.edges, pick.id);
    const e = data.edges.find((x) => x.id === pick.id);
    return e ? new Set([e.from, e.to]) : null;
  }, [pick, data.edges]);
  const fresh = (id: string) => live && !shown.current.has(id);

  const nodes: (EntityFlowNode | BandFlowNode | RowFlowNode)[] = [
    ...placed.bands.map(
      (b): BandFlowNode => ({
        id: `band-${b.layer}`,
        type: "band",
        position: { x: b.x, y: b.y },
        width: b.width,
        height: b.height,
        zIndex: -1,
        draggable: false,
        selectable: false,
        data: { layer: b.layer, hidden: b.hidden, fresh: fresh(`band-${b.layer}`) },
      }),
    ),
    ...data.nodes
      .filter((n) => placed.nodes.has(n.id))
      .map(
        (n): EntityFlowNode => ({
          id: n.id,
          type: "entity",
          position: placed.nodes.get(n.id) as { x: number; y: number },
          width: widthOf(n),
          height: heightOf(n),
          draggable: false,
          data: {
            node: n,
            qualifier: qualifierOf(n, data.edges),
            fresh: fresh(n.id),
            dim: Boolean(lit && !lit.has(n.id)),
            picked: pick?.kind === "node" && pick.id === n.id,
            ego: false,
          },
        }),
      ),
    ...placed.rows.map(
      (r): RowFlowNode => ({
        id: `row-${r.row}`,
        type: "row",
        position: { x: r.x, y: r.y },
        width: LABEL_W,
        height: 44,
        draggable: false,
        selectable: false,
        data: { ...ROWS[r.row], fresh: fresh(`row-${r.row}`) },
      }),
    ),
  ];

  const [hovered, setHovered] = useState<string | null>(null);
  const edges: RelationFlowEdge[] = data.edges
    .filter((e) => relations.has(e.relation) && placed.nodes.has(e.from) && placed.nodes.has(e.to))
    .map((e) => {
      const a = rowOf(byId.get(e.from) as MapNode);
      const b = rowOf(byId.get(e.to) as MapNode);
      const picked = pick?.kind === "edge" && pick.id === e.id;
      const hot = picked || Boolean(pick?.kind === "node" && lit?.has(e.from) && lit?.has(e.to));
      const flags: RelationData = {
        edge: e,
        fresh: fresh(e.id),
        dim: Boolean(lit && !hot),
        hot,
        picked,
        faint: a - b >= 3,
        labelled: hot || hovered === e.id,
        onPick: onPickEdge,
      };
      const common = { id: e.id, type: "relation" as const, source: e.from, target: e.to, data: flags };
      if (a === b) {
        const rightward = (placed.nodes.get(e.from)?.x ?? 0) < (placed.nodes.get(e.to)?.x ?? 0);
        return { ...common, sourceHandle: rightward ? "rs" : "ls", targetHandle: rightward ? "lt" : "rt" };
      }
      // Each relation keeps the direction it is stated in; one that reads upward is drawn upward.
      return a < b
        ? { ...common, sourceHandle: "b", targetHandle: "t" }
        : { ...common, sourceHandle: "ts", targetHandle: "bt" };
    });

  useEffect(() => {
    for (const n of nodes) shown.current.add(n.id);
    for (const e of edges) shown.current.add(e.id);
  });
  const last = data.nodes[data.nodes.length - 1];
  const lastAt = last ? placed.nodes.get(last.id) : undefined;
  useFit(
    `${placed.nodes.size}-${placed.bands.length}-${placed.bands.map((b) => b.hidden).join("")}-${narrow}`,
    visible,
    live,
    last && lastAt ? { x: lastAt.x + widthOf(last) / 2, y: lastAt.y + heightOf(last) / 2 } : null,
  );

  return (
    <ReactFlow
      {...flowProps}
      nodes={nodes}
      edges={edges}
      onNodeClick={(_, node) => node.type === "entity" && onPickNode(node.id)}
      onEdgeClick={(_, edge) => onPickEdge(edge.id)}
      onEdgeMouseEnter={(_, edge) => setHovered(edge.id)}
      onEdgeMouseLeave={() => setHovered(null)}
      onPaneClick={() => onPickNode(null)}
    >
      <Background gap={18} size={1} className="[&_circle]:fill-foreground/10" />
      <Controls showInteractive={false} position="bottom-left" />
    </ReactFlow>
  );
}

// ---------- ego graph ----------

/**
 * The ego in the middle, its direct neighbours on a ring around it grouped by relation, and second-hop neighbours
 * on an outer ring next to the neighbour that leads to them.
 */
function egoLayout(ego: string, hop: Map<string, number>, edges: MapEdge[], byId: Map<string, MapNode>) {
  const pos = new Map<string, { x: number; y: number }>();
  const put = (id: string, cx: number, cy: number) => {
    if (byId.has(id)) pos.set(id, { x: cx - EGO_W / 2, y: cy - EGO_H / 2 });
  };
  put(ego, 0, 0);
  const tie = (id: string, near: string) =>
    edges.find((e) => (e.from === id && e.to === near) || (e.to === id && e.from === near));
  const ring1 = [...hop].filter(([, h]) => h === 1).map(([id]) => id);
  const rank = (id: string) => {
    const e = tie(id, ego);
    return e ? (e.to === ego ? 0 : 100) + RELATION_ORDER.indexOf(e.relation) : 200;
  };
  ring1.sort((a, b) => rank(a) - rank(b));
  const ring = (ids: string[], rx: number, ry: number, start: number) => {
    const angles = new Map<string, number>();
    ids.forEach((id, i) => {
      const angle = start + (2 * Math.PI * i) / Math.max(1, ids.length);
      angles.set(id, angle);
      put(id, rx * Math.cos(angle), ry * Math.sin(angle));
    });
    return angles;
  };
  const rx1 = Math.max(250, (ring1.length * (EGO_W + 28)) / (2 * Math.PI) / 0.75);
  const angles = ring(ring1, rx1, rx1 * 0.55, -Math.PI / 2);
  const ring2 = [...hop].filter(([, h]) => h === 2).map(([id]) => id);
  const parentAngle = (id: string) => {
    const via = ring1.find((p) => tie(id, p));
    return via ? (angles.get(via) ?? 0) : 0;
  };
  ring2.sort((a, b) => parentAngle(a) - parentAngle(b));
  const rx2 = Math.max(rx1 + 300, (ring2.length * (EGO_W + 24)) / (2 * Math.PI) / 0.75);
  ring(ring2, rx2, rx2 * 0.62, ring2.length ? parentAngle(ring2[0]) : 0);
  return pos;
}

function EgoCanvas({
  data,
  ego,
  hops,
  direction,
  relations,
  pick,
  onPickNode,
  onPickEdge,
  visible,
  laidOut,
}: {
  data: MapContent;
  ego: string;
  hops: 1 | 2;
  direction: Direction;
  relations: Set<MapRelation>;
  pick: Pick;
  onPickNode(id: string): void;
  onPickEdge(id: string): void;
  visible: boolean;
  /** What is on screen, for the download. */
  laidOut: RefObject<Bounds | null>;
}) {
  const byId = useMemo(() => new Map(data.nodes.map((n) => [n.id, n])), [data.nodes]);
  const near = useMemo(
    () => egoGraph(data.nodes, data.edges, ego, { hops, direction, relations }),
    [data.nodes, data.edges, ego, hops, direction, relations],
  );
  const pos = useMemo(() => egoLayout(ego, near.hop, near.edges, byId), [ego, near, byId]);
  useEffect(() => {
    const boxes = [...pos.values()];
    if (!boxes.length) return;
    const x = Math.min(...boxes.map((b) => b.x));
    const y = Math.min(...boxes.map((b) => b.y));
    laidOut.current = {
      x,
      y,
      width: Math.max(...boxes.map((b) => b.x + EGO_W)) - x,
      height: Math.max(...boxes.map((b) => b.y + EGO_H)) - y,
    };
  }, [pos, laidOut]);
  const pickedEdge = pick?.kind === "edge" ? pick.id : null;

  const nodes: EntityFlowNode[] = [...pos].map(([id, p]) => {
    const n = byId.get(id) as MapNode;
    return {
      id,
      type: "entity",
      position: p,
      width: EGO_W,
      height: EGO_H,
      draggable: false,
      data: {
        node: n,
        qualifier: qualifierOf(n, data.edges),
        fresh: false,
        dim: false,
        picked: false,
        ego: id === ego || "ring",
        compact: true,
      },
    };
  });
  const edges: RelationFlowEdge[] = near.edges.map((e) => ({
    id: e.id,
    type: "ego",
    source: e.from,
    target: e.to,
    data: {
      edge: e,
      fresh: false,
      dim: Boolean(pickedEdge && pickedEdge !== e.id),
      hot: e.from === ego || e.to === ego,
      picked: pickedEdge === e.id,
      faint: false,
      labelled: e.from === ego || e.to === ego || pickedEdge === e.id,
      onPick: onPickEdge,
    },
  }));
  useFit(`${ego}-${hops}-${direction}-${near.edges.length}`, visible, false);

  return (
    <ReactFlow
      {...flowProps}
      attributionPosition="top-right"
      nodes={nodes}
      edges={edges}
      onNodeClick={(_, node) => onPickNode(node.id)}
      onEdgeClick={(_, edge) => onPickEdge(edge.id)}
    >
      <Background gap={18} size={1} className="[&_circle]:fill-foreground/10" />
      <Controls showInteractive={false} position="bottom-right" orientation="horizontal" />
    </ReactFlow>
  );
}

// ---------- inspector ----------

function Chip({ node, className }: { node: MapNode; className?: string }) {
  return (
    <b
      className={cn(
        "inline-flex h-4.5 shrink-0 items-center rounded px-1 font-mono font-semibold text-[9.5px] text-white ring-1",
        ENTITY[node.type].box,
        className,
      )}
    >
      {ENTITY[node.type].tag} {node.code.length <= 6 ? node.code : ""}
    </b>
  );
}

function StatusChip({ status }: { status: RelationStatus }) {
  return (
    <span className={cn("rounded px-1.5 py-px font-medium text-[10.5px]", STATUS[status].chip)}>
      {STATUS[status].name}
    </span>
  );
}

function NodeInspector({
  data,
  id,
  onPickNode,
  onPickEdge,
}: {
  data: MapContent;
  id: string;
  onPickNode(id: string): void;
  onPickEdge(id: string): void;
}) {
  const byId = new Map(data.nodes.map((n) => [n.id, n]));
  const node = byId.get(id);
  if (!node) return null;
  const caption = captionOf(node);
  const ties = (out: boolean) =>
    data.edges
      .filter((e) => (out ? e.from === id : e.to === id))
      .map((e) => ({ e, other: byId.get(out ? e.to : e.from) }))
      .filter((r): r is { e: MapEdge; other: MapNode } => Boolean(r.other));
  const groups = [
    { title: "Inbound", rows: ties(false), out: false },
    { title: "Outbound", rows: ties(true), out: true },
  ];
  return (
    <div className="flex flex-col gap-3">
      <div className={cn("flex flex-col gap-1.5 rounded-lg px-3 py-2.5 text-white ring-1", ENTITY[node.type].box)}>
        <span className="flex items-center gap-1.5 text-[11px]">
          <b className="rounded bg-white/20 px-1 font-mono font-semibold">{ENTITY[node.type].tag}</b>
          <span className="font-medium opacity-90">{qualifierOf(node, data.edges)}</span>
          <span className="ml-auto font-mono opacity-80">Stage {node.stage}</span>
        </span>
        <p className="text-sm leading-snug">{node.text}</p>
      </div>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-xs">
        <dt className="text-muted-foreground">Type</dt>
        <dd>
          {ENTITY[node.type].name}
          {node.origin ? ` · from the ${node.origin === "literature" ? "literature" : "run"}` : ""}
        </dd>
        {node.type === "evidence" && node.source && (
          <>
            <dt className="text-muted-foreground">Source</dt>
            <dd className="font-medium">{node.source}</dd>
          </>
        )}
        {node.type === "evidence" && node.detail && (
          <>
            <dt className="text-muted-foreground">Sample</dt>
            <dd>{node.detail}</dd>
          </>
        )}
        {node.facts?.map((f) => (
          <div key={f.label} className="contents">
            <dt className="text-muted-foreground">{f.label}</dt>
            <dd className="leading-snug">{f.value}</dd>
          </div>
        ))}
      </dl>
      {node.type === "gap" && node.provenance && node.provenance.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="font-medium text-muted-foreground text-xs">{caption?.line}</span>
          <ul className="flex flex-col gap-1.5 text-xs">
            {node.provenance.map((p) => (
              <li key={p.source} className="flex flex-col gap-0.5 rounded-md bg-muted/60 px-2 py-1.5">
                <b className="font-semibold">{p.source}</b>
                <span className="text-muted-foreground leading-snug">{p.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {groups.map(
        (g) =>
          g.rows.length > 0 && (
            <div key={g.title} className="flex flex-col gap-1">
              <span className="font-medium text-muted-foreground text-xs">
                {g.title} · {g.rows.length}
              </span>
              <ul className="flex flex-col gap-0.5">
                {g.rows.map(({ e, other }) => (
                  <li key={e.id} className="flex flex-col rounded-md px-1.5 py-1 text-xs hover:bg-muted/60">
                    <button
                      type="button"
                      onClick={() => onPickEdge(e.id)}
                      className="flex items-center gap-1.5 text-left text-muted-foreground italic hover:text-foreground"
                    >
                      <svg viewBox="0 0 22 6" className="h-1.5 w-5 shrink-0" aria-hidden="true">
                        <line
                          x1={0}
                          x2={22}
                          y1={3}
                          y2={3}
                          className={lookOfEdge(e).stroke}
                          strokeWidth={2}
                          strokeDasharray={DASH[e.status]}
                        />
                      </svg>
                      {g.out ? lookOfEdge(e).label : `${lookOfEdge(e).label} this`}
                      {e.status !== "stated" && <StatusChip status={e.status} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => onPickNode(other.id)}
                      className="mt-0.5 flex items-start gap-1.5 text-left"
                    >
                      <Chip node={other} className="mt-px" />
                      <span className="line-clamp-2 min-w-0">{other.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ),
      )}
    </div>
  );
}

function EdgeInspector({ data, id, onPickNode }: { data: MapContent; id: string; onPickNode(id: string): void }) {
  const e = data.edges.find((x) => x.id === id);
  const from = data.nodes.find((n) => n.id === e?.from);
  const to = data.nodes.find((n) => n.id === e?.to);
  if (!e || !from || !to) return null;
  const end = (node: MapNode) => (
    <button
      type="button"
      onClick={() => onPickNode(node.id)}
      className="flex items-start gap-2 rounded-lg bg-muted/50 px-2.5 py-2 text-left text-xs ring-1 ring-foreground/10 hover:bg-muted"
    >
      <Chip node={node} className="mt-px" />
      <span className="line-clamp-3 min-w-0 leading-snug">{node.text}</span>
    </button>
  );
  const look = lookOfEdge(e);
  return (
    <div className="flex flex-col gap-3">
      <span className="font-medium text-muted-foreground text-xs">Relationship</span>
      <div className="flex flex-col gap-1">
        {end(from)}
        <span className="flex items-center gap-2 py-0.5 pl-3 text-xs">
          <ArrowDown className={cn("size-3.5", look.stroke.replace("stroke-", "text-"))} />
          <b className="font-semibold">{look.label}</b>
          <code className="font-mono text-[10.5px] text-muted-foreground">{e.relation}</code>
        </span>
        {end(to)}
      </div>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-xs">
        <dt className="text-muted-foreground">Status</dt>
        <dd className="flex flex-col items-start gap-1">
          <StatusChip status={e.status} />
          <span className="text-muted-foreground leading-snug">{STATUS[e.status].line}</span>
        </dd>
        {e.polarity && (
          <>
            <dt className="text-muted-foreground">Polarity</dt>
            <dd>{e.polarity === "supports" ? "Speaks for the hypothesis" : "Challenges the hypothesis"}</dd>
          </>
        )}
        <dt className="text-muted-foreground">Rationale</dt>
        <dd className="leading-snug">{e.rationale}</dd>
        <dt className="text-muted-foreground">Provenance</dt>
        <dd className="leading-snug">{e.provenance}</dd>
        <dt className="text-muted-foreground">Id</dt>
        <dd className="break-all font-mono text-[10.5px] text-muted-foreground">{e.id}</dd>
      </dl>
    </div>
  );
}

function Overview({
  data,
  issues,
  onPickNode,
  onPickEdge,
}: {
  data: MapContent;
  issues: GraphIssue[];
  onPickNode(id: string): void;
  onPickEdge(id: string): void;
}) {
  const count = (type: EntityType) => data.nodes.filter((n) => n.type === type).length;
  const used = new Set(data.edges.map((e) => e.relation));
  const nodeIds = new Set(data.nodes.map((n) => n.id));
  const open = (issue: GraphIssue) => {
    const first = issue.ids[0];
    if (!first) return;
    if (nodeIds.has(first)) onPickNode(first);
    else onPickEdge(first);
  };
  return (
    <div className="flex flex-col gap-4 text-xs">
      <section className="flex flex-col gap-1.5">
        <span className="font-medium text-muted-foreground">Checks · {issues.length}</span>
        {issues.length ? (
          <ul className="flex flex-col gap-1">
            {issues.map((issue) => (
              <li key={issue.text}>
                <button
                  type="button"
                  onClick={() => open(issue)}
                  className="flex w-full items-start gap-1.5 rounded-md px-1.5 py-1 text-left leading-snug hover:bg-muted"
                >
                  {issue.level === "error" ? (
                    <CircleAlert className="mt-px size-3.5 shrink-0 text-rose-600" />
                  ) : (
                    <TriangleAlert className="mt-px size-3.5 shrink-0 text-amber-600" />
                  )}
                  {issue.text}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">Every relation is in the vocabulary and nothing is left hanging.</p>
        )}
      </section>
      <section className="flex flex-col gap-1.5">
        <span className="font-medium text-muted-foreground">Entities</span>
        <ul className="flex flex-col gap-1.5">
          {ENTITY_ORDER.map((type) => (
            <li key={type} className="flex items-center gap-2">
              <b
                className={cn(
                  "w-9 rounded px-1 py-px text-center font-mono font-semibold text-[9.5px] text-white ring-1",
                  ENTITY[type].box,
                )}
              >
                {ENTITY[type].tag}
              </b>
              <span className="flex-1">
                {ENTITY[type].plural}
                {ENTITY[type].optional && <span className="text-muted-foreground"> · optional</span>}
              </span>
              <span className="text-muted-foreground tabular-nums">{count(type) || "none"}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="flex flex-col gap-1.5">
        <span className="font-medium text-muted-foreground">Relations</span>
        <ul className="flex flex-col gap-1.5">
          {RELATION_ORDER.filter((r) => used.has(r)).map((r) => (
            <li key={r} className="flex items-center gap-2">
              <svg viewBox="0 0 36 8" className="h-2 w-9 shrink-0" aria-hidden="true">
                <line x1={1} x2={30} y1={4} y2={4} className={RELATION[r].stroke} strokeWidth={1.6} />
                <path d="M 35 4 L 29 1 L 29 7 Z" className={RELATION[r].fill} />
              </svg>
              <span>
                {VOCABULARY[r].from} <b className="font-semibold">{RELATION[r].label}</b> {VOCABULARY[r].to}
              </span>
            </li>
          ))}
          {data.edges.some((e) => e.polarity === "challenges") && (
            <li className="flex items-center gap-2">
              <svg viewBox="0 0 36 8" className="h-2 w-9 shrink-0" aria-hidden="true">
                <line x1={1} x2={30} y1={4} y2={4} className="stroke-rose-600" strokeWidth={1.6} />
                <path d="M 35 4 L 29 1 L 29 7 Z" className="fill-rose-600" />
              </svg>
              <span>
                claim <b className="font-semibold">challenges</b> hypothesis (a rationale against it)
              </span>
            </li>
          )}
        </ul>
        <ul className="flex flex-col gap-1.5 pt-1">
          {(Object.keys(STATUS) as RelationStatus[]).map((s) => (
            <li key={s} className="flex items-center gap-2">
              <svg viewBox="0 0 36 8" className="h-2 w-9 shrink-0" aria-hidden="true">
                <line
                  x1={1}
                  x2={35}
                  y1={4}
                  y2={4}
                  className="stroke-foreground"
                  strokeWidth={1.6}
                  strokeDasharray={DASH[s]}
                  opacity={SHADE[s]}
                />
              </svg>
              <span>
                <b className="font-semibold">{STATUS[s].name}</b> · {STATUS[s].line}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <p className="text-muted-foreground leading-snug">
        Every arrow reads the way its relation is stated and is never flipped for the layout. Layers only group what is
        on screen: where a node sits says nothing about whether it holds. Point at a relation to see its name; click a
        node to open its ego graph here and light up what it rests on. Gap motivates question and contribution targets
        gap are off at first; turn them on under Relations.
      </p>
    </div>
  );
}

function RelationFilter({
  hiddenRelations,
  onChange,
  used,
}: {
  hiddenRelations: Set<MapRelation>;
  onChange(next: Set<MapRelation>): void;
  used: Set<MapRelation>;
}) {
  const list = RELATION_ORDER.filter((r) => used.has(r));
  const on = list.filter((r) => !hiddenRelations.has(r)).length;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-xs">
          <Filter />
          Relations · {on} of {list.length}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-56">
        <DropdownMenuLabel>Show relations</DropdownMenuLabel>
        {list.map((r) => (
          <DropdownMenuCheckboxItem
            key={r}
            checked={!hiddenRelations.has(r)}
            onSelect={(event) => event.preventDefault()}
            onCheckedChange={(checked) => {
              const next = new Set(hiddenRelations);
              if (checked) next.delete(r);
              else next.add(r);
              onChange(next);
            }}
          >
            {RELATION[r].label}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onChange(new Set())}>Show all</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ---------- research canvas ----------

type Group = "framing" | "theory" | "method" | "conclusions" | "puzzle";

/**
 * The four groups of the AMJ canvas, each in its own colour, with the puzzle in neutral grey at the centre. Fills are
 * opaque, so a piece's tabs can cover its neighbour's edge.
 */
const GROUP: Record<Group, { name: string; fill: string; title: string; item: string; swatch: string }> = {
  framing: {
    name: "Framing",
    fill: "bg-sky-50 dark:bg-[color-mix(in_oklab,var(--color-sky-950)_55%,var(--card))]",
    title: "text-sky-800 dark:text-sky-200",
    item: "ring-sky-600/15",
    swatch: "bg-sky-200 dark:bg-sky-800",
  },
  theory: {
    name: "Theoretical framework",
    fill: "bg-violet-50 dark:bg-[color-mix(in_oklab,var(--color-violet-950)_55%,var(--card))]",
    title: "text-violet-800 dark:text-violet-200",
    item: "ring-violet-600/15",
    swatch: "bg-violet-200 dark:bg-violet-800",
  },
  method: {
    name: "Empirical methodology",
    fill: "bg-teal-50 dark:bg-[color-mix(in_oklab,var(--color-teal-950)_55%,var(--card))]",
    title: "text-teal-800 dark:text-teal-200",
    item: "ring-teal-600/15",
    swatch: "bg-teal-200 dark:bg-teal-800",
  },
  conclusions: {
    name: "Conclusions",
    fill: "bg-amber-50 dark:bg-[color-mix(in_oklab,var(--color-amber-950)_55%,var(--card))]",
    title: "text-amber-800 dark:text-amber-200",
    item: "ring-amber-600/15",
    swatch: "bg-amber-200 dark:bg-amber-800",
  },
  puzzle: {
    name: "Puzzle",
    fill: "bg-slate-100 dark:bg-muted",
    title: "text-foreground",
    item: "ring-slate-500/20",
    swatch: "bg-slate-300 dark:bg-slate-600",
  },
};

type Side = "top" | "right" | "bottom" | "left";

/** The nine pieces, with the guiding questions of the AMJ canvas worksheet, placed and interlocked as in its Figure 1. */
const PIECES: Record<
  CanvasPieceId,
  {
    title: string;
    asks: string[];
    group: Group;
    icon: LucideIcon;
    area: string;
    /** The tabs this piece pushes into its neighbours: the side, and how far along it. */
    tabs: { side: Side; at: string }[];
  }
> = {
  audience: {
    title: "Audience & prior research",
    asks: [
      "Which audience should find your research interesting and relevant?",
      "How does prior research address the puzzle?",
      "Is the audience composed of those who have done the prior research, or is it a different audience?",
    ],
    group: "framing",
    icon: Users,
    area: "lg:col-start-1 lg:row-start-1",
    tabs: [{ side: "right", at: "55%" }],
  },
  question: {
    title: "Research question",
    asks: ["What specific question does your research answer?", "Why is it important to answer this question?"],
    group: "framing",
    icon: ScanSearch,
    area: "lg:col-start-2 lg:row-start-1",
    tabs: [{ side: "right", at: "55%" }],
  },
  theory: {
    title: "Theoretical constructs & relationships",
    asks: [
      "What are the key constructs in your theoretical framework?",
      "How do they relate to one another?",
      "Why should we expect these relations between the constructs?",
    ],
    group: "theory",
    icon: Network,
    area: "lg:col-start-3 lg:row-start-1",
    tabs: [{ side: "bottom", at: "50%" }],
  },
  boundaries: {
    title: "Boundary conditions & limitations",
    asks: [
      "How broadly applicable are the findings and in what conditions might they not hold?",
      "What are the main limitations of your study and how can future research address them?",
    ],
    group: "conclusions",
    icon: ShieldAlert,
    area: "lg:col-start-1 lg:row-start-2",
    tabs: [{ side: "top", at: "45%" }],
  },
  puzzle: {
    title: "The puzzle",
    asks: ["What broad question does this research project address?"],
    group: "puzzle",
    icon: Puzzle,
    area: "lg:col-start-2 lg:row-start-2",
    tabs: [
      { side: "top", at: "50%" },
      { side: "left", at: "50%" },
      { side: "right", at: "50%" },
      { side: "bottom", at: "50%" },
    ],
  },
  setting: {
    title: "Research setting",
    asks: ["In what social setting is the research conducted?", "Why is this setting appropriate for this study?"],
    group: "method",
    icon: MapPin,
    area: "lg:col-start-3 lg:row-start-2",
    tabs: [{ side: "bottom", at: "50%" }],
  },
  contributions: {
    title: "Contributions",
    asks: ["How do the empirical findings change how we think about the puzzle?"],
    group: "conclusions",
    icon: Lightbulb,
    area: "lg:col-start-1 lg:row-start-3",
    tabs: [{ side: "top", at: "45%" }],
  },
  findings: {
    title: "Empirical findings",
    asks: ["What empirical patterns do you see in your data?"],
    group: "conclusions",
    icon: Microscope,
    area: "lg:col-start-2 lg:row-start-3",
    tabs: [{ side: "left", at: "50%" }],
  },
  design: {
    title: "Research design & analysis",
    asks: ["What data do you use to answer your question?", "How do you analyze the data?"],
    group: "method",
    icon: FlaskConical,
    area: "lg:col-start-3 lg:row-start-3",
    tabs: [{ side: "left", at: "50%" }],
  },
};

const PIECE_ORDER: CanvasPieceId[] = [
  "audience",
  "question",
  "theory",
  "boundaries",
  "puzzle",
  "setting",
  "contributions",
  "findings",
  "design",
];

/** Radius of a tab, and how far its centre sits past the edge: the edge cuts it narrower, so it reads as a neck. */
const TAB_R = 15;
const TAB_D = 10;

/**
 * A jigsaw tab: a disc in the piece's own fill pushed across the shared edge into the neighbour, outlined only where
 * it shows. The part inside its own piece is cut away, bar one pixel that covers the edge under the neck.
 */
function Tab({ side, at, group }: { side: Side; at: string; group: Group }) {
  const out = `calc(100% + ${TAB_D - TAB_R}px)`;
  const along = `calc(${at} - ${TAB_R}px)`;
  const cut = `${TAB_R - TAB_D - 1}px`;
  const place: Record<Side, CSSProperties> = {
    right: { left: out, top: along, clipPath: `inset(0 0 0 ${cut})` },
    left: { right: out, top: along, clipPath: `inset(0 ${cut} 0 0)` },
    top: { bottom: out, left: along, clipPath: `inset(0 0 ${cut} 0)` },
    bottom: { top: out, left: along, clipPath: `inset(${cut} 0 0 0)` },
  };
  return (
    <span
      aria-hidden="true"
      style={{ width: TAB_R * 2, height: TAB_R * 2, ...place[side] }}
      className={cn(
        "pointer-events-none absolute z-10 hidden rounded-full border border-foreground/20 lg:block",
        GROUP[group].fill,
      )}
    />
  );
}

function PieceCard({
  id,
  piece,
  fresh,
  onRef,
  typeOf,
}: {
  id: CanvasPieceId;
  piece?: CanvasPiece;
  fresh: boolean;
  onRef(ref: string): void;
  /** The entity a record named on the canvas is drawn as on the layered canvas, so its badge shares its colour. */
  typeOf(ref: string): EntityType | undefined;
}) {
  const meta = PIECES[id];
  const group = GROUP[meta.group];
  const Icon = meta.icon;
  const pending = piece?.status === "pending";
  const centre = id === "puzzle";
  return (
    <section
      data-cursor={`piece:${id}`}
      className={cn("relative flex min-w-0 flex-col gap-3 px-6 py-5", group.fill, meta.area)}
    >
      {meta.tabs.map((t) => (
        <Tab key={t.side} side={t.side} at={t.at} group={meta.group} />
      ))}
      {centre ? (
        <header className="flex flex-col items-center gap-1 text-center">
          <Icon className="size-6 text-foreground" />
          <b className="font-semibold text-base uppercase tracking-wider">{meta.title}</b>
          <span className="max-w-64 text-[11px] text-muted-foreground italic leading-snug">{meta.asks[0]}</span>
        </header>
      ) : (
        <header className="flex items-start gap-3">
          <span className="min-w-0 flex-1">
            <b className={cn("block font-semibold text-[13px] uppercase tracking-wider", group.title)}>{meta.title}</b>
            <ul className="mt-1.5 flex list-disc flex-col gap-0.5 pl-4 text-[11px] text-muted-foreground italic leading-snug">
              {meta.asks.map((ask) => (
                <li key={ask}>{ask}</li>
              ))}
            </ul>
          </span>
          <Icon className={cn("mt-0.5 size-4.5 shrink-0", group.title)} />
        </header>
      )}
      {piece ? (
        <motion.ul className="flex flex-col gap-1.5 text-[12px] leading-snug">
          {piece.items.map((item, i) => (
            <motion.li
              // biome-ignore lint/suspicious/noArrayIndexKey: canvas lines have no ids and never reorder
              key={`${id}-${i}`}
              initial={fresh ? { opacity: 0, y: 4 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: fresh ? 0.08 * i : 0, duration: 0.3 }}
              className={cn(
                "rounded-md bg-card px-2.5 py-1.5 shadow-xs ring-1",
                group.item,
                centre && i === 0 && "font-(family-name:--font-lora) text-center text-[15px]",
              )}
            >
              {/* The records a line comes from lead it, inline, so each reads as "[C1] what C1 says". Each once:
                  older runs may name a record twice. */}
              {[...new Set(item.refs)].map((r) => {
                const type = typeOf(r);
                return type ? (
                  <button
                    key={r}
                    type="button"
                    onClick={() => onRef(r)}
                    title={`${ENTITY[type].name} ${r}: show it on the layered canvas`}
                    className={cn(
                      "mr-1.5 inline-flex h-4.5 -translate-y-px items-center gap-1 rounded px-1 align-middle font-sans font-semibold text-[10px] text-white ring-1 hover:opacity-85",
                      ENTITY[type].box,
                    )}
                  >
                    <span className="opacity-75">{ENTITY[type].tag}</span>
                    {r}
                  </button>
                ) : (
                  <span
                    key={r}
                    className="mr-1.5 inline-flex h-4.5 -translate-y-px items-center rounded bg-muted px-1 align-middle font-sans text-[10px] text-muted-foreground"
                  >
                    {r}
                  </span>
                );
              })}
              {item.text}
            </motion.li>
          ))}
        </motion.ul>
      ) : (
        <PendingLines lines={3} />
      )}
      {piece?.note && (
        <p
          className={cn(
            "text-[11px] leading-snug",
            pending ? "text-amber-800 dark:text-amber-300" : "text-muted-foreground",
            centre && "text-center",
          )}
        >
          {piece.note}
        </p>
      )}
    </section>
  );
}

function ResearchCanvas({
  data,
  topic,
  runLabel,
  date,
  live,
  onRef,
}: {
  data: MapContent;
  topic: string;
  runLabel: string;
  date?: string;
  live: boolean;
  onRef(ref: string): void;
}) {
  const pieces = new Map(data.pieces.map((p) => [p.id, p]));
  // A hypothesis and the contribution it informs share its id; a reference means the hypothesis.
  const types = new Map<string, EntityType>();
  for (const n of data.nodes) {
    const ref = n.id.split(":")[1];
    if (ref && !types.has(ref)) types.set(ref, n.type);
  }
  const typeOf = (ref: string) => types.get(ref);
  const seen = useRef(new Set(data.pieces.map((p) => p.id)));
  useEffect(() => {
    for (const p of data.pieces) seen.current.add(p.id);
  });
  const fields = [
    { label: "Project title", value: topic, wide: true },
    { label: "Run", value: runLabel },
    { label: "Date", value: date?.slice(0, 10) ?? "" },
    { label: "Filled", value: `${data.pieces.filter((p) => p.status === "filled").length} of 9` },
  ];
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <header className="flex flex-wrap items-end gap-x-6 gap-y-2">
        <b className="font-semibold text-lg uppercase tracking-wider">Research canvas</b>
        <dl className="flex min-w-0 flex-1 flex-wrap gap-2 text-[11px]">
          {fields.map((f) => (
            <div key={f.label} className={cn("flex min-w-0 flex-col gap-0.5", f.wide ? "flex-1" : "shrink-0")}>
              <dt className="text-[10px] text-muted-foreground uppercase tracking-wide">{f.label}</dt>
              <dd className="truncate rounded border border-foreground/20 px-2 py-1 tabular-nums" title={f.value}>
                {f.value || "—"}
              </dd>
            </div>
          ))}
        </dl>
      </header>
      <div className="grid gap-px overflow-hidden rounded-lg bg-foreground/20 ring-1 ring-foreground/20 lg:grid-cols-3 lg:grid-rows-[auto_auto_auto]">
        {PIECE_ORDER.map((id) => (
          <PieceCard
            key={id}
            id={id}
            piece={pieces.get(id)}
            fresh={live && !seen.current.has(id)}
            onRef={onRef}
            typeOf={typeOf}
          />
        ))}
      </div>
      <footer className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        {(["framing", "theory", "method", "conclusions"] as const).map((g) => (
          <span key={g} className="inline-flex items-center gap-1.5">
            <i className={cn("size-3 rounded-sm", GROUP[g].swatch)} />
            {GROUP[g].name}
          </span>
        ))}
        <span className="ml-auto">
          After the AMJ Management Research Canvas (Dorobantu, Gruber, Ravasi &amp; Wellman, 2024).
        </span>
      </footer>
    </div>
  );
}

// ---------- export ----------

function save(url: string, name: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
}

function backgroundOf(el: HTMLElement) {
  return getComputedStyle(el).backgroundColor || getComputedStyle(document.body).backgroundColor;
}

const frame = () => new Promise((resolve) => window.setTimeout(resolve, 350));

/** Renders a React Flow viewport to an image framing `bounds`, whatever part of it is on screen. */
async function flowImage(wrap: HTMLElement | null, bounds: Bounds | null, format: "png" | "svg") {
  const viewport = wrap?.querySelector<HTMLElement>(".react-flow__viewport");
  if (!wrap || !viewport || !bounds?.width) throw new Error("nothing to export");
  const width = Math.ceil(bounds.width + 96);
  const height = Math.ceil(bounds.height + 96);
  const vp = getViewportForBounds(bounds, width, height, 1, 1, 0.04);
  const { toPng, toSvg } = await import("html-to-image");
  // The image carries no stylesheet, and the relations take their colours from classes: write each colour onto its
  // shape for the copy, then put the shapes back as they were.
  const shapes = [...viewport.querySelectorAll<SVGElement>(".react-flow__edges path")];
  const before = shapes.map((el) => [el.getAttribute("stroke"), el.getAttribute("fill")] as const);
  for (const el of shapes) {
    const style = getComputedStyle(el);
    el.setAttribute("stroke", style.stroke);
    el.setAttribute("fill", style.fill);
  }
  try {
    return await (format === "png" ? toPng : toSvg)(viewport, {
      backgroundColor: backgroundOf(wrap),
      width,
      height,
      pixelRatio: 2,
      style: {
        width: `${width}px`,
        height: `${height}px`,
        transform: `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})`,
      },
    });
  } finally {
    shapes.forEach((el, i) => {
      const [stroke, fill] = before[i];
      if (stroke === null) el.removeAttribute("stroke");
      else el.setAttribute("stroke", stroke);
      if (fill === null) el.removeAttribute("fill");
      else el.setAttribute("fill", fill);
    });
  }
}

// ---------- scene ----------

type Tab = "layers" | "canvas";

export function MapScene({
  data,
  topic,
  runLabel,
  date,
  live,
}: {
  data: MapContent;
  topic: string;
  runLabel: string;
  date?: string;
  live: boolean;
}) {
  const scene = useRef<HTMLDivElement>(null);
  const layersRef = useRef<HTMLDivElement>(null);
  const egoRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const shown = useRef(new Set<string>());
  const placedRef = useRef<Layout>(EMPTY);
  const egoBounds = useRef<Bounds | null>(null);
  const [pick, setPick] = useState<Pick>(null);
  const [egoId, setEgoId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("layers");
  const [chosen, setChosen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hops, setHops] = useState<1 | 2>(1);
  const [direction, setDirection] = useState<Direction>("both");
  // Derived and doubled-up relations stay off until asked for: gap → question is only inferred, and a contribution
  // targets the very gap its hypothesis addresses.
  const [hiddenRelations, setHiddenRelations] = useState<Set<MapRelation>>(
    () => new Set<MapRelation>(["motivates", "targets"]),
  );
  const [collapsed, setCollapsed] = useState<Set<MapLayer>>(new Set());

  const byId = useMemo(() => new Map(data.nodes.map((n) => [n.id, n])), [data.nodes]);
  const relations = useMemo(() => new Set(RELATION_ORDER.filter((r) => !hiddenRelations.has(r))), [hiddenRelations]);
  const used = useMemo(() => new Set(data.edges.map((e) => e.relation)), [data.edges]);
  const issues = useMemo(() => checkGraph(data.nodes, data.edges), [data.nodes, data.edges]);
  const placed = useMemo(
    () => (data.nodes.length ? layout(data.nodes, data.edges, collapsed) : EMPTY),
    [data.nodes, data.edges, collapsed],
  );
  useEffect(() => {
    placedRef.current = placed;
  }, [placed]);
  const ego =
    egoId && byId.has(egoId) ? egoId : (data.nodes.find((n) => n.type === "hypothesis")?.id ?? data.nodes[0]?.id);

  const pickNode = (id: string | null) => {
    setPick(id ? { kind: "node", id } : null);
    if (id) setEgoId(id);
  };
  const pickEdge = (id: string) => {
    setPick({ kind: "edge", id });
    // The ego graph stays where it is when the relation touches it, and moves to the relation's source otherwise.
    const e = data.edges.find((x) => x.id === id);
    if (e && ego !== e.from && ego !== e.to) setEgoId(e.from);
  };
  const toggleNode = (id: string | null) => pickNode(id && pick?.kind === "node" && pick.id === id ? null : id);
  const showTab = (next: Tab) => {
    setTab(next);
    setChosen(true);
  };

  // While the run fills the research canvas, that is what to watch, unless a tab was picked by hand.
  const filling = data.pieces.length > 0;
  useEffect(() => {
    if (live && filling && !chosen) setTab("canvas");
  }, [live, filling, chosen]);

  /** A record named on the research canvas, opened on the layered canvas. */
  const pickRef = (ref: string) => {
    const node = data.nodes.find((n) => n.id.split(":")[1] === ref);
    if (!node) return;
    showTab("layers");
    pickNode(node.id);
  };

  const base = `${runLabel}-${topic}`
    .replace(/[^\w-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60)
    .toLowerCase();

  const exportLayers = async (format: "png" | "svg") => {
    setBusy(true);
    try {
      setPick(null);
      showTab("layers");
      await frame();
      await frame();
      save(await flowImage(layersRef.current, placedRef.current.bounds, format), `${base}-layered-canvas.${format}`);
    } catch {
      toast.error("Couldn't export the layered canvas.");
    } finally {
      setBusy(false);
    }
  };

  const exportEgo = async (format: "png" | "svg") => {
    setBusy(true);
    try {
      await frame();
      const code = (ego && byId.get(ego)?.code) || "ego";
      save(await flowImage(egoRef.current, egoBounds.current, format), `${base}-ego-${code}.${format}`);
    } catch {
      toast.error("Couldn't export the ego graph.");
    } finally {
      setBusy(false);
    }
  };

  const exportCanvas = async (format: "png" | "svg") => {
    setBusy(true);
    try {
      showTab("canvas");
      await frame();
      const el = canvasRef.current;
      if (!el) throw new Error("no canvas");
      const { toPng, toSvg } = await import("html-to-image");
      const options = { backgroundColor: backgroundOf(el), pixelRatio: 2 };
      save(await (format === "png" ? toPng : toSvg)(el, options), `${base}-research-canvas.${format}`);
    } catch {
      toast.error("Couldn't export the canvas.");
    } finally {
      setBusy(false);
    }
  };

  const exportJson = () => {
    const doc = {
      format: "popper-research-map",
      version: 2,
      run: runLabel,
      topic,
      exported_at: new Date().toISOString(),
      semantic_graph: {
        ontology:
          "Scientific Research Canvas v1.0: 7 entity types (5 core, 2 optional), 11 directed relations, 3 presentation layers. Layers group the display only.",
        layers: LAYER_OF,
        vocabulary: VOCABULARY,
        entities: data.nodes,
        relations: data.edges,
        issues,
      },
      research_canvas: {
        after:
          "AMJ Management Research Canvas (Dorobantu, Gruber, Ravasi & Wellman, 2024, Academy of Management Journal 67(5), 1163-1174)",
        pieces: data.pieces,
      },
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" }));
    save(url, `${base}-semantic-graph.json`);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const lastNode = data.nodes[data.nodes.length - 1];
  const lastPiece = data.pieces[data.pieces.length - 1];
  let target: string | null = null;
  if (tab === "layers" && lastNode && placed.nodes.has(lastNode.id)) target = `mapnode:${lastNode.id}`;
  if (tab === "canvas" && lastPiece) target = `piece:${lastPiece.id}`;
  const egoNode = ego ? byId.get(ego) : undefined;
  const cursorAgent = tab === "canvas" ? "reporter" : "theorist";

  const panelOpen = Boolean(pick && egoNode);
  const panel = (
    <aside className="flex h-[760px] min-w-0 flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      {panelOpen && ego && egoNode ? (
        <>
          <header className="flex flex-col gap-2 border-b px-3 py-2.5 text-xs">
            <span className="flex min-w-0 items-center gap-1.5">
              <Orbit className="size-3.5 shrink-0 text-muted-foreground" />
              <b className="shrink-0 font-semibold">Ego graph</b>
              <Chip node={egoNode} />
              <span className="min-w-0 truncate" title={egoNode.text}>
                {egoNode.label}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                className="ml-auto size-6 shrink-0"
                onClick={() => setPick(null)}
                aria-label="Close the ego graph"
              >
                <X />
              </Button>
            </span>
            <span className="flex flex-wrap items-center gap-1.5">
              <ToggleGroup
                type="single"
                size="sm"
                variant="outline"
                value={String(hops)}
                onValueChange={(v) => v && setHops(v === "2" ? 2 : 1)}
                aria-label="How far out to show"
              >
                <ToggleGroupItem value="1" className="h-6 px-2 text-[11px]">
                  1 hop
                </ToggleGroupItem>
                <ToggleGroupItem value="2" className="h-6 px-2 text-[11px]">
                  2 hops
                </ToggleGroupItem>
              </ToggleGroup>
              <ToggleGroup
                type="single"
                size="sm"
                variant="outline"
                value={direction}
                onValueChange={(v) => v && setDirection(v as Direction)}
                aria-label="Which of its relations to show"
              >
                <ToggleGroupItem value="both" className="h-6 px-2 text-[11px]">
                  Both ways
                </ToggleGroupItem>
                <ToggleGroupItem value="in" className="h-6 px-2 text-[11px]">
                  Inbound
                </ToggleGroupItem>
                <ToggleGroupItem value="out" className="h-6 px-2 text-[11px]">
                  Outbound
                </ToggleGroupItem>
              </ToggleGroup>
              <span className="text-[11px] text-muted-foreground">Click a neighbour to centre on it</span>
            </span>
          </header>
          <div ref={egoRef} className="h-[320px] shrink-0 border-b">
            <ReactFlowProvider>
              <EgoCanvas
                data={data}
                ego={ego}
                hops={hops}
                direction={direction}
                relations={relations}
                pick={pick}
                onPickNode={pickNode}
                onPickEdge={pickEdge}
                visible={tab === "layers"}
                laidOut={egoBounds}
              />
            </ReactFlowProvider>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3.5">
            {pick?.kind === "edge" ? (
              <EdgeInspector data={data} id={pick.id} onPickNode={pickNode} />
            ) : (
              <NodeInspector data={data} id={ego} onPickNode={pickNode} onPickEdge={pickEdge} />
            )}
          </div>
        </>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto p-3.5">
          <Overview data={data} issues={issues} onPickNode={pickNode} onPickEdge={pickEdge} />
        </div>
      )}
    </aside>
  );

  return (
    <div ref={scene} className="relative flex flex-col gap-3">
      <Tabs value={tab} onValueChange={(v) => showTab(v as Tab)} className="gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <TabsList>
            <TabsTrigger value="layers">
              <Layers />
              Layered canvas
            </TabsTrigger>
            <TabsTrigger value="canvas">
              <BookOpenText />
              Research canvas
            </TabsTrigger>
          </TabsList>
          <span className="text-muted-foreground text-xs tabular-nums">
            {data.nodes.length} entities · {data.edges.length} relations · {data.pieces.length} of 9 pieces
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="ml-auto" disabled={busy || !data.nodes.length}>
                <Download />
                Download
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-56">
              <DropdownMenuLabel>Layered canvas</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => void exportLayers("png")}>Image (PNG)</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void exportLayers("svg")}>Vector (SVG)</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>
                Ego graph{panelOpen && egoNode ? ` · ${egoNode.code}` : " · pick an entity"}
              </DropdownMenuLabel>
              <DropdownMenuItem disabled={!panelOpen} onSelect={() => void exportEgo("png")}>
                Image (PNG)
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!panelOpen} onSelect={() => void exportEgo("svg")}>
                Vector (SVG)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Research canvas</DropdownMenuLabel>
              <DropdownMenuItem disabled={!data.pieces.length} onSelect={() => void exportCanvas("png")}>
                Image (PNG)
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!data.pieces.length} onSelect={() => void exportCanvas("svg")}>
                Vector (SVG)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={exportJson}>Semantic graph and canvas as data (JSON)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <TabsContent value="layers" forceMount className="flex flex-col gap-2.5 data-[state=inactive]:hidden">
          {data.nodes.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-muted-foreground">Layers</span>
              <ToggleGroup
                type="multiple"
                size="sm"
                variant="outline"
                value={LAYER_ORDER.filter((l) => !collapsed.has(l))}
                onValueChange={(open) => setCollapsed(new Set(LAYER_ORDER.filter((l) => !open.includes(l))))}
                aria-label="Layers to expand"
              >
                {LAYER_ORDER.map((l) => (
                  <ToggleGroupItem key={l} value={l} className="gap-1.5 px-2.5 text-xs">
                    <span className="font-mono text-muted-foreground">{LAYERS[l].code}</span>
                    {LAYERS[l].title}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <RelationFilter hiddenRelations={hiddenRelations} onChange={setHiddenRelations} used={used} />
              {live && <span className="text-muted-foreground">Drawn in the order the run made each part</span>}
            </div>
          )}
          {data.nodes.length ? (
            <div
              className={cn(
                "grid gap-3",
                panelOpen ? "xl:grid-cols-[minmax(0,1.45fr)_minmax(400px,1fr)]" : "xl:grid-cols-[minmax(0,1fr)_320px]",
              )}
            >
              <div
                ref={layersRef}
                className="h-[760px] min-w-0 overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10"
              >
                <ReactFlowProvider>
                  <LayeredCanvas
                    data={data}
                    placed={placed}
                    relations={relations}
                    pick={pick}
                    onPickNode={toggleNode}
                    onPickEdge={pickEdge}
                    live={live}
                    visible={tab === "layers"}
                    narrow={panelOpen}
                    shown={shown}
                  />
                </ReactFlowProvider>
              </div>
              {tab === "layers" && panel}
            </div>
          ) : (
            <Placeholder className="h-80">Your question goes in first; the rest is drawn around it</Placeholder>
          )}
        </TabsContent>

        <TabsContent value="canvas" forceMount className="data-[state=inactive]:hidden">
          <div ref={canvasRef}>
            <ResearchCanvas data={data} topic={topic} runLabel={runLabel} date={date} live={live} onRef={pickRef} />
          </div>
        </TabsContent>
      </Tabs>
      <AgentCursor
        agent={live ? cursorAgent : null}
        container={scene}
        target={target}
        version={`${data.nodes.length}-${data.edges.length}-${data.pieces.length}-${placed.nodes.size}-${tab}`}
      />
    </div>
  );
}
