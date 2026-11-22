"use client";
"use no memo";

/* ===== What the two argument screens share: the width of a card, and a diagram drawn 1:1 =====
   A diagram is drawn at full size and scrolls inside its card; it is never shrunk below readable text. */

import { type ReactNode, useLayoutEffect, useState } from "react";

import type { Node, NodeTypes } from "@xyflow/react";

import { type Box, Diagram, type LinkEdge } from "../flow";
import { cn, Icon } from "../lib";

/** The width of an element, as it changes: give `ref` to the element. */
export function useWidth() {
  const [el, ref] = useState<HTMLElement | null>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    if (!el) return;
    setW(el.clientWidth);
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  return { w, ref };
}

/**
 * A diagram drawn at `zoom` (1 = full size), never fitted smaller: its canvas takes the size of the drawing, inside a
 * frame of its own set in from the card's edges, so the card keeps its border and corners. The frame scrolls when the
 * drawing is wider or taller than the room it has; a soft fade marks the side with more to see, and `hint` names what
 * lies to the right (a click scrolls there). `maxHeight` caps the frame; the page scrolls past it.
 */
export function FullSize({
  label,
  nodes,
  edges,
  nodeTypes,
  size,
  zoom = 1,
  maxHeight,
  fitKey,
  hint,
  onNodeClick,
  onNodeEnter,
  onNodeLeave,
  children,
  className,
}: {
  label: string;
  nodes: Node[];
  edges: LinkEdge[];
  nodeTypes: NodeTypes;
  /** The drawing's own size, before the zoom. */
  size: Pick<Box, "w" | "h">;
  zoom?: number;
  maxHeight?: number;
  fitKey: string;
  /** What more there is to the right, while there is. */
  hint?: string;
  onNodeClick?(id: string): void;
  onNodeEnter?(id: string): void;
  onNodeLeave?(): void;
  children?: ReactNode;
  className?: string;
}) {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const [view, setView] = useState({ room: 0, barV: 0, barH: 0, left: false, right: false, down: false });
  useLayoutEffect(() => {
    if (!el) return;
    // What the frame shows of the drawing: its width, its scrollbars (classic ones take room), and what is hidden.
    const read = () => {
      const next = {
        room: el.clientWidth,
        barV: el.offsetWidth - el.clientWidth,
        barH: el.offsetHeight - el.clientHeight,
        left: el.scrollLeft > 4,
        right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
        down: el.scrollTop + el.clientHeight < el.scrollHeight - 4,
      };
      setView((old) => ((Object.keys(next) as (keyof typeof next)[]).every((k) => old[k] === next[k]) ? old : next));
    };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    el.addEventListener("scroll", read, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", read);
    };
  }, [el]);
  // A canvas the drawing fits at the zoom asked for (with the fit's own margin): the fit then lands on it, never below.
  const w = Math.max(view.room, Math.ceil(size.w * zoom * 1.07) + 4);
  const h = Math.ceil(size.h * zoom * 1.07) + 4;
  return (
    <div className={cn("min-w-0 p-3", className)}>
      <div className="relative overflow-hidden rounded-lg ring-1 ring-foreground/10">
        <div
          ref={setEl}
          className="min-w-0 overflow-auto overscroll-contain [scrollbar-width:thin]"
          style={maxHeight ? { maxHeight } : undefined}
        >
          <Diagram
            label={label}
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitKey={`${fitKey}-${w}-${h}-${zoom}`}
            still
            style={{ width: w, height: h }}
            className="rounded-none bg-foreground/[0.015] ring-0"
            onNodeClick={onNodeClick}
            onNodeEnter={onNodeEnter}
            onNodeLeave={onNodeLeave}
          >
            {children}
          </Diagram>
        </div>
        {/* The fades sit inside the scrollbars, over the drawing only. */}
        {view.left && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-0 left-0 w-12 bg-gradient-to-r from-card to-transparent"
            style={{ bottom: view.barH }}
          />
        )}
        {view.right && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-0 w-20 bg-gradient-to-l from-card to-transparent"
            style={{ right: view.barV, bottom: view.barH }}
          />
        )}
        {view.down && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-0 h-10 bg-gradient-to-t from-card to-transparent"
            style={{ right: view.barV, bottom: view.barH }}
          />
        )}
        {view.right && hint && (
          <button
            type="button"
            onClick={() => el?.scrollBy({ left: el.clientWidth * 0.8, behavior: "smooth" })}
            className="absolute top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-card/95 px-3 py-1.5 font-medium text-xs shadow-sm ring-1 ring-foreground/15 transition-colors hover:bg-muted"
            style={{ right: view.barV + 12 }}
          >
            {hint}
            <Icon n="right" className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
