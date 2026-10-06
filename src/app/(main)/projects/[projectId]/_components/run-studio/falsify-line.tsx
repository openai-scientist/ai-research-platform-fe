"use client";

import { cn } from "cn";
import { motion } from "motion/react";

import type { Falsifier } from "@/lib/run-stream/contract";

/** Shared scale for falsifiers and results, in points. */
export const AXIS: [number, number] = [-4, 9];

/** Where a zone sits on the axis, clamped to it. A single value comes back with equal ends. */
export function zoneSpan(zone: Falsifier["zone"], axis = AXIS): [number, number] {
  const lo = Math.max(zone[0] ?? axis[0], axis[0]);
  const hi = Math.min(zone[1] ?? axis[1], axis[1]);
  return [lo, hi];
}

/**
 * A hypothesis's falsifier drawn as a number line: the red zone is where its 95% range must not land.
 * Draws itself in when it first appears.
 */
export function FalsifyLine({
  falsify,
  delay = 0,
  className,
}: {
  falsify: Falsifier;
  delay?: number;
  className?: string;
}) {
  const W = 280;
  const pad = 10;
  const x = (v: number) => pad + ((v - AXIS[0]) / (AXIS[1] - AXIS[0])) * (W - pad * 2);
  const [lo, hi] = zoneSpan(falsify.zone);
  const point = lo === hi;
  const ticks = [-4, -2, 0, 2, 4, 6, 8];
  return (
    <svg
      viewBox={`0 0 ${W} 46`}
      className={cn("h-auto w-full max-w-[320px]", className)}
      role="img"
      aria-label={falsify.text}
    >
      <motion.line
        x1={pad}
        x2={W - pad}
        y1={24}
        y2={24}
        className="stroke-emerald-500/55"
        strokeWidth={6}
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      />
      {point ? (
        <motion.line
          x1={x(lo)}
          x2={x(lo)}
          y1={14}
          y2={34}
          className="stroke-rose-500"
          strokeWidth={4}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: delay + 0.45, duration: 0.35 }}
        />
      ) : (
        <motion.rect
          x={x(lo)}
          width={x(hi) - x(lo)}
          y={18}
          height={12}
          rx={3}
          className="fill-rose-500/80"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ delay: delay + 0.45, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{ originX: falsify.zone[0] === null ? 1 : 0 }}
        />
      )}
      <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: delay + 0.8 }}>
        <text
          x={point ? x(lo) : (x(lo) + x(hi)) / 2}
          y={11}
          textAnchor="middle"
          className="fill-rose-700 font-semibold text-[8.5px] dark:fill-rose-300"
        >
          {point ? "must not touch" : "wrong"}
        </text>
        {!point && (
          <text
            x={falsify.zone[0] === null ? W - pad : pad}
            y={11}
            textAnchor={falsify.zone[0] === null ? "end" : "start"}
            className="fill-emerald-700 font-medium text-[8.5px] dark:fill-emerald-300"
          >
            range must land here
          </text>
        )}
      </motion.g>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={x(t)} x2={x(t)} y1={32} y2={35} className="stroke-muted-foreground/50" />
          <text x={x(t)} y={44} textAnchor="middle" className="fill-muted-foreground font-mono text-[7.5px]">
            {t > 0 ? `+${t}` : t}
          </text>
        </g>
      ))}
    </svg>
  );
}
