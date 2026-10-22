"use client";

import { useEffect, useRef } from "react";

import { cn } from "cn";

// One pixel per cell: CELL apart, PIXEL wide, so a thin gap shows between neighbours.
const CELL = 14;
const PIXEL = 10;
const REACH = 90;
// Behind text the pixels stay, only fainter: down to SHADE of their strength within CLEARANCE
// of a glyph, back to full over the next FADE pixels. Removing them would leave a hole.
const CLEARANCE = 6;
const FADE = 30;
const SHADE = 0.22;

type Pixel = { x: number; y: number; weight: number; shade: number; phase: number; heat: number };

/**
 * A grid of square pixels packed into the corners and dissolving towards the middle, so the
 * form keeps a clear field. Pixels behind text in the element marked data-pixel-clear are dimmed,
 * so links in the corners stay readable. Pixels shimmer in waves that roll out of the corners, and the
 * pointer leaves a short glowing trail.
 */
export function SquareField({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let pixels: Pixel[] = [];
    let width = 0;
    let height = 0;
    let color = "";
    let frame = 0;
    const pointer = { x: -1e4, y: -1e4 };

    const layout = () => {
      const ratio = window.devicePixelRatio || 1;
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const reach = Math.min(width, height) * 0.52;
      const corners = [
        [0, 0],
        [width, 0],
        [0, height],
        [width, height],
      ];
      // Text the pixels must not cover, in canvas coordinates.
      const box = canvas.getBoundingClientRect();
      const content = canvas.parentElement?.querySelector("[data-pixel-clear]");
      // Measure the text itself, so bare text in a div counts as much as a link or a label.
      const rects: DOMRect[] = [];
      if (content) {
        const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
        const range = document.createRange();
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          if (!node.textContent?.trim()) continue;
          range.selectNodeContents(node);
          rects.push(...range.getClientRects());
        }
      }
      const texts = rects
        .filter((rect) => rect.width && rect.height)
        .map((rect) => ({
          left: rect.left - box.left - CLEARANCE,
          right: rect.right - box.left + CLEARANCE,
          top: rect.top - box.top - CLEARANCE,
          bottom: rect.bottom - box.top + CLEARANCE,
        }));
      const clearance = (x: number, y: number) =>
        Math.min(
          FADE,
          ...texts.map((rect) =>
            Math.hypot(Math.max(rect.left - x, 0, x - rect.right), Math.max(rect.top - y, 0, y - rect.bottom)),
          ),
        ) / FADE;
      pixels = [];
      for (let y = CELL / 2; y < height; y += CELL) {
        for (let x = CELL / 2; x < width; x += CELL) {
          const nearest = Math.min(...corners.map(([cx, cy]) => Math.hypot(x - cx, y - cy)));
          const weight = 1 - nearest / reach;
          // Dither the edge: the farther from a corner, the fewer pixels survive.
          if (weight <= 0 || Math.random() > weight ** 1.4) continue;
          // Phase follows the distance to the corner, so the shimmer travels outwards as a wave.
          pixels.push({
            x,
            y,
            weight,
            shade: SHADE + (1 - SHADE) * clearance(x, y),
            phase: nearest / 55 + Math.random() * 1.2,
            heat: 0,
          });
        }
      }
    };

    const draw = (time: number) => {
      context.clearRect(0, 0, width, height);
      context.fillStyle = color;
      const offset = (CELL - PIXEL) / 2;
      for (const pixel of pixels) {
        if (Math.hypot(pixel.x - pointer.x, pixel.y - pointer.y) < REACH) pixel.heat = 1;
        else pixel.heat *= 0.93;
        const wave = still ? 0.6 : 0.5 + 0.5 * Math.sin(time / 650 - pixel.phase);
        const alpha = (pixel.weight * (0.08 + 0.42 * wave) + pixel.heat * 0.45) * pixel.shade;
        if (alpha < 0.02) continue;
        context.globalAlpha = Math.min(0.85, alpha);
        context.fillRect(pixel.x - CELL / 2 + offset, pixel.y - CELL / 2 + offset, PIXEL, PIXEL);
      }
    };

    const loop = (time: number) => {
      draw(time);
      frame = requestAnimationFrame(loop);
    };
    const start = () => {
      cancelAnimationFrame(frame);
      if (still) draw(0);
      else if (!document.hidden) frame = requestAnimationFrame(loop);
    };

    color = getComputedStyle(canvas).color;
    layout();
    const sized = new ResizeObserver(() => {
      layout();
      start();
    });
    sized.observe(canvas);
    // Steps of a form change its height and move the text; lay the pixels out again.
    const content = canvas.parentElement?.querySelector("[data-pixel-clear]");
    if (content) sized.observe(content);
    // Web fonts change the width of the text once they arrive.
    let stopped = false;
    void document.fonts.ready.then(() => {
      if (stopped) return;
      layout();
      start();
    });
    // Theme changes flip the html class; repaint in the new colour.
    const themed = new MutationObserver(() => {
      color = getComputedStyle(canvas).color;
      if (still) draw(0);
    });
    themed.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style"] });
    const move = (event: PointerEvent) => {
      const box = canvas.getBoundingClientRect();
      pointer.x = event.clientX - box.left;
      pointer.y = event.clientY - box.top;
    };
    const leave = () => {
      pointer.x = -1e4;
      pointer.y = -1e4;
    };
    window.addEventListener("pointermove", move);
    document.addEventListener("pointerleave", leave);
    document.addEventListener("visibilitychange", start);
    start();

    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      sized.disconnect();
      themed.disconnect();
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", leave);
      document.removeEventListener("visibilitychange", start);
    };
  }, []);

  return <canvas ref={canvasRef} className={cn("pointer-events-none size-full", className)} />;
}
