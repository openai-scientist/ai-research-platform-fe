"use client";
"use no memo";

// The writing run's diagrams, drawn with React Flow as the argument map of the research run is: the same frame, the
// same handles, edges and arrowheads, and the same way of keeping a drawing readable.
import "@xyflow/react/dist/style.css";

import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";

import {
  Background,
  Controls,
  type Edge,
  EdgeLabelRenderer,
  type EdgeProps,
  getBezierPath,
  getSmoothStepPath,
  Handle,
  type Node,
  type NodeTypes,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useStore,
} from "@xyflow/react";
import { motion } from "motion/react";

import { canEnter, cn } from "./lib";

const hidden = { opacity: 0, border: 0, width: 1, height: 1, minWidth: 0, minHeight: 0 };

/** A source and a target on every side, out of sight: an edge picks the sides that face each other. */
export function Handles() {
  return (
    <>
      <Handle type="target" position={Position.Top} id="t" style={hidden} isConnectable={false} />
      <Handle type="source" position={Position.Top} id="ts" style={hidden} isConnectable={false} />
      <Handle type="source" position={Position.Bottom} id="b" style={hidden} isConnectable={false} />
      <Handle type="target" position={Position.Bottom} id="bt" style={hidden} isConnectable={false} />
      <Handle type="source" position={Position.Right} id="rs" style={hidden} isConnectable={false} />
      <Handle type="target" position={Position.Right} id="rt" style={hidden} isConnectable={false} />
      <Handle type="source" position={Position.Left} id="ls" style={hidden} isConnectable={false} />
      <Handle type="target" position={Position.Left} id="lt" style={hidden} isConnectable={false} />
    </>
  );
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
/** The sides a link leaves and enters by: side to side when the boxes sit apart, top to bottom when stacked. */
export function sides(a: Box, b: Box) {
  const dx = b.x + b.w / 2 - (a.x + a.w / 2);
  const dy = b.y + b.h / 2 - (a.y + a.h / 2);
  if (Math.abs(dx) * 0.7 >= Math.abs(dy))
    return dx >= 0 ? { sourceHandle: "rs", targetHandle: "lt" } : { sourceHandle: "ls", targetHandle: "rt" };
  return dy >= 0 ? { sourceHandle: "b", targetHandle: "t" } : { sourceHandle: "ts", targetHandle: "bt" };
}

/** The arrowhead at the end of a link, drawn with it so it takes the link's colour in both themes. */
function headAt(x: number, y: number, angle: number) {
  const point = (along: number, across: number) =>
    `${x - along * Math.cos(angle) + across * Math.sin(angle)} ${y - along * Math.sin(angle) - across * Math.cos(angle)}`;
  return `M ${x} ${y} L ${point(8, 4)} L ${point(8, -4)} Z`;
}
const ANGLE: Record<Position, number> = {
  [Position.Top]: Math.PI / 2,
  [Position.Bottom]: -Math.PI / 2,
  [Position.Left]: 0,
  [Position.Right]: Math.PI,
};

export interface LinkData extends Record<string, unknown> {
  /** Tailwind stroke and fill classes for the line and its head. */
  stroke: string;
  fill: string;
  dash?: string;
  width?: number;
  opacity?: number;
  /** No arrowhead: a line that only ties two things together. */
  plain?: boolean;
  /** New since the last render of a live run: the line draws itself in, once the cards it joins are in place. */
  fresh?: boolean;
  label?: string;
  /** Square corners instead of a curve: the line runs along the gaps between cards, never across one. */
  step?: boolean;
  /** For a stepped line: where its middle segment runs, and how far it clears a card it turns around. */
  cx?: number;
  cy?: number;
  offset?: number;
}
export type LinkEdge = Edge<LinkData, "link">;

/** Seconds a new card takes to enter; a new line waits for it, then draws, then shows its head. */
const CARD_IN = 0.35;
const DRAW = 0.5;

function Link({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data }: EdgeProps<LinkEdge>) {
  if (!data) return null;
  const at = { sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition };
  const [path, labelX, labelY] = data.step
    ? getSmoothStepPath({ ...at, borderRadius: 10, centerX: data.cx, centerY: data.cy, offset: data.offset ?? 16 })
    : getBezierPath(at);
  const fresh = Boolean(data.fresh);
  return (
    <>
      <motion.g initial={false} animate={{ opacity: data.opacity ?? 1 }} transition={{ duration: 0.3 }}>
        <motion.path
          d={path}
          fill="none"
          className={data.stroke}
          strokeWidth={data.width ?? 1.6}
          strokeDasharray={data.dash}
          strokeLinecap="round"
          strokeLinejoin="round"
          // A dashed line cannot draw itself in (its dashes are the stroke pattern), so it fades in instead.
          initial={fresh ? (data.dash ? { opacity: 0 } : { pathLength: 0, opacity: 0 }) : false}
          animate={data.dash ? { opacity: 1 } : { pathLength: 1, opacity: 1 }}
          transition={{
            delay: fresh ? CARD_IN : 0,
            pathLength: { delay: fresh ? CARD_IN : 0, duration: DRAW, ease: "easeInOut" },
            opacity: { delay: fresh ? CARD_IN : 0, duration: 0.15 },
          }}
        />
        {!data.plain && (
          <motion.path
            d={headAt(targetX, targetY, ANGLE[targetPosition])}
            className={data.fill}
            initial={fresh ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            transition={{ delay: fresh ? CARD_IN + DRAW * 0.9 : 0, duration: 0.15 }}
          />
        )}
      </motion.g>
      {data.label && (
        <EdgeLabelRenderer>
          <span
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
            className="nodrag nopan pointer-events-none absolute whitespace-nowrap rounded-full bg-background px-1.5 py-px text-[10.5px] text-muted-foreground ring-1 ring-foreground/10"
          >
            {data.label}
          </span>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
const edgeTypes = { link: Link };

/**
 * Which nodes and edges are new to a live run: they enter, everything already on screen stays put. A view opened on
 * finished work shows it at once. New means first seen less than a moment ago, not first seen in this render: a line
 * is only put in once React Flow has measured the cards it joins, a frame or two after the render that added it.
 */
const NEW_FOR = 800;
export function useFresh(live: boolean) {
  const first = useRef(new Map<string, number>());
  const animate = live && canEnter();
  const now = performance.now();
  return {
    fresh: (id: string) => {
      if (!animate) return false;
      const t = first.current.get(id);
      if (t === undefined) {
        first.current.set(id, now);
        return true;
      }
      return now - t < NEW_FOR;
    },
    /** Call once per render with every id on screen. */
    seen: (ids: string[]) => {
      for (const id of ids) if (!first.current.has(id)) first.current.set(id, Number.NEGATIVE_INFINITY);
    },
  };
}

/** A card of the scene placed in a diagram: whatever it draws, with handles on every side. */
export interface BoxData extends Record<string, unknown> {
  w: number;
  /** A fixed height, so lines between cards side by side run level. */
  h?: number;
  content: ReactNode;
}
export type BoxNode = Node<BoxData, "box">;
function BoxCard({ data }: { data: BoxData }) {
  return (
    <div style={{ width: data.w, height: data.h }} className="relative">
      <Handles />
      {data.content}
    </div>
  );
}
export const BOX_TYPES = { box: BoxCard };

/** Below this zoom the nodes cannot be read: a drawing that would need it is shown from its left edge instead. */
const READABLE = 0.55;

/** Fits the drawing whenever `key` changes; one much wider than its frame is shown from the left, to be panned. */
function Fit({ fitKey }: { fitKey: string }) {
  const flow = useReactFlow();
  const width = useStore((s) => s.width);
  const height = useStore((s) => s.height);
  useEffect(() => {
    void fitKey;
    // The frame and the nodes need a moment to be measured before they can be fitted.
    const timer = window.setTimeout(() => {
      const nodes = flow.getNodes();
      if (!nodes.length || !width || !height) return;
      const bounds = flow.getNodesBounds(nodes);
      const pad = 1.1;
      const whole = Math.min(width / (bounds.width * pad), height / (bounds.height * pad), 1);
      const duration = canEnter() ? 400 : 0;
      if (whole >= READABLE) {
        void flow.fitView({ padding: 0.06, maxZoom: 1, duration });
        return;
      }
      const zoom = Math.min(1, Math.max(READABLE, height / (bounds.height * pad)));
      const y = Math.max(12, (height - bounds.height * zoom) / 2);
      void flow.setViewport({ x: 12 - bounds.x * zoom, y: y - bounds.y * zoom, zoom }, { duration });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [fitKey, flow, width, height]);
  return null;
}

/**
 * A diagram in a card. The page keeps scrolling over it; it zooms with the buttons or a pinch, and pans by dragging.
 * `fitKey` refits it when its content changes.
 */
export function Diagram<N extends Node>({
  nodes,
  edges,
  nodeTypes,
  fitKey,
  className,
  controls = true,
  onNodeClick,
  onNodeEnter,
  onNodeLeave,
  onPaneClick,
  children,
  label,
  style,
  still = false,
}: {
  nodes: N[];
  edges: LinkEdge[];
  nodeTypes: NodeTypes;
  fitKey: string;
  className?: string;
  controls?: boolean;
  onNodeClick?(id: string): void;
  onNodeEnter?(id: string): void;
  onNodeLeave?(id: string): void;
  onPaneClick?(): void;
  /** Overlays drawn over the frame, not the drawing: a sweep, a running check. */
  children?: ReactNode;
  label: string;
  style?: CSSProperties;
  /** A small drawing to look at, not to explore: no panning, no zoom. */
  still?: boolean;
}) {
  // The scenes rebuild their nodes on every render. Without the size React Flow measured, each rebuilt node counts as
  // unmeasured, every line on it is taken down and put back, and a new line draws itself again: keep the sizes.
  const sizes = useRef(new Map<string, { width: number; height: number }>());
  const measured = nodes.map((n) => {
    const m = sizes.current.get(n.id);
    return m && !n.measured ? { ...n, measured: m } : n;
  });
  return (
    <section
      aria-label={label}
      style={style}
      className={cn("relative overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10", className)}
    >
      <ReactFlowProvider>
        <ReactFlow
          nodes={measured}
          onNodesChange={(changes) => {
            for (const c of changes) if (c.type === "dimensions" && c.dimensions) sizes.current.set(c.id, c.dimensions);
          }}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          nodesConnectable={false}
          nodesDraggable={false}
          elementsSelectable={false}
          zoomOnScroll={false}
          panOnDrag={!still}
          zoomOnPinch={!still}
          zoomOnDoubleClick={!still}
          preventScrolling={false}
          minZoom={0.2}
          maxZoom={1.6}
          attributionPosition="bottom-right"
          // A small still drawing has no room for the attribution; the explorable ones keep it.
          proOptions={{ hideAttribution: still }}
          onNodeClick={onNodeClick ? (_, n) => onNodeClick(n.id) : undefined}
          onNodeMouseEnter={onNodeEnter ? (_, n) => onNodeEnter(n.id) : undefined}
          onNodeMouseLeave={onNodeLeave ? (_, n) => onNodeLeave(n.id) : undefined}
          onPaneClick={onPaneClick}
          // The zoom buttons take the app's theme; React Flow's own colours are light only.
          className={cn(
            "[--xy-controls-button-background-color:var(--card)] [--xy-controls-button-background-color-hover:var(--muted)]",
            "[--xy-controls-button-color:var(--foreground)] [--xy-controls-button-color-hover:var(--foreground)]",
            "[--xy-controls-button-border-color:var(--border)] [--xy-attribution-background-color:transparent]",
            "[--xy-background-color:transparent]",
          )}
        >
          {!still && <Background gap={18} size={1} className="[&_circle]:fill-foreground/10" />}
          {controls && !still && <Controls showInteractive={false} position="bottom-left" />}
          <Fit fitKey={fitKey} />
        </ReactFlow>
      </ReactFlowProvider>
      {children}
    </section>
  );
}
