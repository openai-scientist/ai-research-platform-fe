"use client";

import { cn } from "cn";
import { motion } from "motion/react";

import type { Decision } from "@/lib/run-stream/contract";

export const DECISION_LABEL: Record<Decision, string> = {
  proceed: "Write it up",
  refine: "Rerun the experiments",
  pivot: "Try new hypotheses",
};

/** Three separate branches from one source: nothing crosses, and only the chosen branch is solid. */
export function ForkDiagram({ choice, round, className }: { choice: Decision; round: number; className?: string }) {
  const targets: [Decision, number, string, string][] = [
    ["proceed", 8, DECISION_LABEL.proceed, "Report, then the paper"],
    ["refine", 70, DECISION_LABEL.refine, `Same hypotheses · round ${round + 1}`],
    ["pivot", 132, DECISION_LABEL.pivot, `Back to Hypothesize · round ${round + 1}`],
  ];
  const sx = 168;
  const sy = 92;
  return (
    <svg
      viewBox="0 0 560 184"
      role="img"
      aria-label={`Next step: ${DECISION_LABEL[choice]}`}
      className={cn("h-auto w-full max-w-[560px] overflow-visible", className)}
    >
      <rect x={6} y={70} width={sx - 6} height={44} rx={10} className="fill-card stroke-foreground/25" />
      <text x={22} y={89} className="fill-foreground font-semibold text-[12.5px]">
        Interpret
      </text>
      <text x={22} y={105} className="fill-muted-foreground text-[11px]">
        Round {round} results
      </text>
      {targets.map(([d, y, title, sub]) => {
        const ty = y + 22;
        const on = d === choice;
        return (
          <g key={d}>
            <path
              d={`M${sx} ${sy} C ${sx + 70} ${sy}, 220 ${ty}, 324 ${ty}`}
              className={cn("fill-none", on ? "stroke-foreground" : "stroke-foreground/25")}
              strokeWidth={on ? 2.2 : 1.5}
              strokeDasharray={on ? "7 5" : "3 5"}
            >
              {on && (
                <animate attributeName="stroke-dashoffset" from="0" to="-24" dur="1.6s" repeatCount="indefinite" />
              )}
            </path>
            <path
              d={`M318 ${ty - 5} L326 ${ty} L318 ${ty + 5} Z`}
              className={on ? "fill-foreground" : "fill-foreground/25"}
            />
            <motion.rect
              x={330}
              y={y}
              width={224}
              height={44}
              rx={10}
              initial={false}
              animate={{ opacity: 1 }}
              className={cn(
                "transition-colors duration-300",
                on ? "fill-primary stroke-primary" : "fill-card stroke-foreground/25",
              )}
            />
            <text
              x={346}
              y={y + 19}
              className={cn("font-semibold text-[12.5px]", on ? "fill-primary-foreground" : "fill-foreground")}
            >
              {title}
            </text>
            <text
              x={346}
              y={y + 35}
              className={cn("text-[11px]", on ? "fill-primary-foreground/70" : "fill-muted-foreground")}
            >
              {sub}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
