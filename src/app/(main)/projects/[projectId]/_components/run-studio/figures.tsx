"use client";

import { cn } from "cn";
import { motion } from "motion/react";

import type { Figure, FigureData } from "@/lib/run-stream/contract";
import { signed } from "@/lib/run-stream/selectors";

import { VERDICT } from "./run-meta";

const ease = [0.16, 1, 0.3, 1] as const;

function Bars({ data }: { data: Extract<FigureData, { kind: "bars" }> }) {
  const x0 = 40;
  const y0 = 160;
  const ph = 132;
  const bw = 44;
  const gap = 14;
  const y = (v: number) => y0 - ((v - data.y_min) / (data.y_max - data.y_min)) * ph;
  const ticks = [50, 60, 70, 80].filter((t) => t >= data.y_min && t <= data.y_max);
  return (
    <svg
      viewBox="0 0 340 188"
      className="h-auto w-full overflow-visible"
      role="img"
      aria-label="Mean exam score by nightly sleep"
    >
      {ticks.map((t) => (
        <g key={t}>
          <line x1={x0} x2={334} y1={y(t)} y2={y(t)} className="stroke-border" strokeDasharray="2 3" />
          <text x={x0 - 8} y={y(t) + 3} textAnchor="end" className="fill-muted-foreground font-mono text-[10px]">
            {t}
          </text>
        </g>
      ))}
      {data.bars.map((bar, i) => {
        const bx = x0 + 12 + i * (bw + gap);
        return (
          <g key={bar.label}>
            <motion.rect
              x={bx}
              y={y(bar.value)}
              width={bw}
              height={y0 - y(bar.value)}
              rx={3}
              className={bar.highlight ? "fill-blue-600" : "fill-blue-500/35"}
              style={{ transformBox: "fill-box", transformOrigin: "bottom" }}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: i * 0.08, duration: 0.7, ease }}
            />
            <motion.text
              x={bx + bw / 2}
              y={y(bar.value) - 5}
              textAnchor="middle"
              className="fill-foreground font-mono font-semibold text-[10.5px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 + i * 0.08 }}
            >
              {bar.value}
            </motion.text>
            <text
              x={bx + bw / 2}
              y={y0 + 16}
              textAnchor="middle"
              className="fill-muted-foreground font-mono text-[10px]"
            >
              {bar.label}
            </text>
          </g>
        );
      })}
      <line x1={x0} x2={334} y1={y0} y2={y0} className="stroke-foreground/30" />
      <text x={6} y={12} className="fill-muted-foreground font-mono text-[10px]">
        {data.y_label}
      </text>
    </svg>
  );
}

function Forest({ data }: { data: Extract<FigureData, { kind: "forest" }> }) {
  const X0 = 104;
  const X1 = 330;
  const x = (v: number) => X0 + ((v - data.x_min) / (data.x_max - data.x_min)) * (X1 - X0);
  const h = data.rows.length * 28 + 36;
  return (
    <svg
      viewBox={`0 0 340 ${h}`}
      className="h-auto w-full overflow-visible"
      role="img"
      aria-label="Estimated effects with 95% ranges"
    >
      {[-4, 0, 4, 8].map((t) => (
        <g key={t}>
          <line
            x1={x(t)}
            x2={x(t)}
            y1={6}
            y2={h - 22}
            className={t === 0 ? "stroke-muted-foreground/60" : "stroke-border"}
            strokeDasharray={t === 0 ? "3 3" : "2 3"}
          />
          <text x={x(t)} y={h - 8} textAnchor="middle" className="fill-muted-foreground font-mono text-[10px]">
            {t > 0 ? `+${t}` : t}
          </text>
        </g>
      ))}
      {data.rows.map((row, i) => {
        const cy = 20 + i * 28;
        const tone = VERDICT[row.verdict];
        return (
          <g key={row.hypothesis_id}>
            <text x={4} y={cy + 4} className="fill-foreground text-[11px]">
              <tspan className="font-bold font-mono text-[10.5px]">{row.hypothesis_id}</tspan> {row.label}
            </text>
            <motion.line
              x1={x(row.ci_low)}
              x2={x(row.ci_high)}
              y1={cy}
              y2={cy}
              className={tone.stroke}
              strokeWidth={3}
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: i * 0.09, duration: 0.7, ease }}
            />
            <motion.circle
              cx={x(row.estimate)}
              cy={cy}
              r={4.5}
              className={cn("stroke-card", tone.fill)}
              strokeWidth={1.5}
              style={{ transformBox: "fill-box", transformOrigin: "center" }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.25 + i * 0.09, type: "spring", stiffness: 500, damping: 20 }}
            >
              <title>{`${row.hypothesis_id}: ${signed(row.estimate)} [${signed(row.ci_low)}, ${signed(row.ci_high)}]`}</title>
            </motion.circle>
          </g>
        );
      })}
    </svg>
  );
}

function Paths({ data }: { data: Extract<FigureData, { kind: "paths" }> }) {
  const [study, stress] = data.mediators;
  const arrow = (d: string, ex: number, ey: number, solid: boolean, delay: number) => (
    <g>
      <motion.path
        d={d}
        className={cn("fill-none", solid ? "stroke-foreground" : "stroke-muted-foreground")}
        strokeWidth={1.6}
        strokeDasharray={solid ? undefined : "4 4"}
        initial={solid ? { pathLength: 0 } : { opacity: 0 }}
        animate={solid ? { pathLength: 1 } : { opacity: 1 }}
        transition={{ delay, duration: 0.7, ease }}
      />
      <motion.path
        d={`M${ex - 7} ${ey - 4} L${ex} ${ey} L${ex - 7} ${ey + 4} Z`}
        className={solid ? "fill-foreground" : "fill-muted-foreground"}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delay + 0.6 }}
      />
    </g>
  );
  const box = (x: number, y: number, w: number, h: number, title: string, sub?: string, muted?: boolean) => (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={8}
        className={cn("fill-card", muted ? "stroke-foreground/30" : "stroke-foreground")}
        strokeDasharray={muted ? "3 3" : undefined}
        strokeWidth={1.2}
      />
      <text
        x={x + w / 2}
        y={y + (sub ? h / 2 - 2 : h / 2 + 4)}
        textAnchor="middle"
        className="fill-foreground font-medium text-[11px]"
      >
        {title}
      </text>
      {sub && (
        <text
          x={x + w / 2}
          y={y + h / 2 + 13}
          textAnchor="middle"
          className="fill-muted-foreground font-mono text-[10px]"
        >
          {sub}
        </text>
      )}
    </g>
  );
  return (
    <svg
      viewBox="0 0 340 206"
      className="h-auto w-full overflow-visible"
      role="img"
      aria-label="How the sleep gap breaks down"
    >
      {arrow("M98 103 H 242", 242, 103, data.direct.tested, 0)}
      <text x={170} y={97} textAnchor="middle" className="fill-foreground font-mono font-semibold text-[10.5px]">
        {data.direct.label}
      </text>
      {study && arrow("M98 93 C 112 93, 104 29, 116 29", 116, 29, study.clear, 0.3)}
      {study && arrow("M226 29 C 240 29, 230 95, 242 95", 242, 95, study.clear, 0.5)}
      {stress && arrow("M98 113 C 112 113, 104 177, 116 177", 116, 177, stress.clear, 0.3)}
      {stress && arrow("M226 177 C 240 177, 230 111, 242 111", 242, 111, stress.clear, 0.5)}
      {box(4, 83, 94, 40, data.exposure)}
      {box(242, 83, 94, 40, data.outcome)}
      {study && box(116, 6, 110, 46, study.name, study.label, !study.clear)}
      {stress && box(116, 154, 110, 46, stress.name, stress.label, !stress.clear)}
    </svg>
  );
}

export function FigureArt({ figure }: { figure: Figure }) {
  if (figure.data.kind === "bars") return <Bars data={figure.data} />;
  if (figure.data.kind === "forest") return <Forest data={figure.data} />;
  return <Paths data={figure.data} />;
}

export function FigureCard({
  figure,
  checked,
  className,
  plain,
}: {
  figure: Figure;
  checked?: boolean;
  className?: string;
  plain?: boolean;
}) {
  return (
    <motion.figure
      data-figure={figure.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative m-0 flex min-w-0 flex-col gap-2.5",
        !plain && "rounded-xl bg-card p-4 ring-1 ring-foreground/10",
        className,
      )}
    >
      <div className={cn("mx-auto grid min-h-40 w-full place-items-center", plain ? "max-w-md" : "max-w-sm")}>
        <FigureArt figure={figure} />
      </div>
      <figcaption
        className={cn(
          "font-sans text-muted-foreground text-xs leading-relaxed",
          plain && "mx-auto max-w-lg text-center",
        )}
      >
        <b className="text-foreground">Figure {figure.id}.</b> {figure.caption}
      </figcaption>
      {checked && (
        <motion.span
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute top-2 right-2 inline-flex h-5 items-center gap-1 rounded-full bg-emerald-500/12 px-2 font-medium font-sans text-[10.5px] text-emerald-700 dark:text-emerald-300"
        >
          matches results.json
        </motion.span>
      )}
    </motion.figure>
  );
}
