"use client";

import { Fragment, useEffect, useRef } from "react";

import { cn } from "cn";
import { Play } from "lucide-react";
import { motion } from "motion/react";

import type { UnderstandContent } from "@/lib/run-stream/run-state";

import { AnimatedNumber } from "../animated-number";
import { AgentCursor, launchFlight } from "../run-bits";
import { useReveal } from "../workspace-context";
import { Pane, Placeholder } from "./scene-ui";

const SLOTS = [
  { slot: "outcome", label: "What is measured" },
  { slot: "exposure", label: "What might affect it" },
  { slot: "population", label: "Who it's about" },
  { slot: "follow_up", label: "Then ask" },
  { slot: "unit", label: "One row is" },
  { slot: "out_of_reach", label: "Out of reach" },
] as const;

/** Splits the question so each framed phrase can be underlined and fly to its slot. */
function questionParts(question: string, phrases: string[]) {
  const parts: { text: string; phrase?: string }[] = [];
  let rest = question;
  while (rest) {
    const hits = phrases.map((p) => ({ p, at: rest.indexOf(p) })).filter((h) => h.at >= 0);
    if (!hits.length) {
      parts.push({ text: rest });
      break;
    }
    const first = hits.reduce((a, b) => (b.at < a.at ? b : a));
    if (first.at > 0) parts.push({ text: rest.slice(0, first.at) });
    parts.push({ text: first.p, phrase: first.p });
    rest = rest.slice(first.at + first.p.length);
  }
  return parts;
}

const PHRASES = ["more sleep", "higher exam scores", "our undergraduates", "what explains it"];

export function UnderstandScene({
  data,
  question,
  live,
}: {
  data: UnderstandContent;
  question: string;
  live: boolean;
}) {
  const scene = useRef<HTMLDivElement>(null);
  const framed = new Map(data.frame.map((f) => [f.slot, f]));
  const activePhrases = new Set(data.frame.map((f) => f.phrase).filter(Boolean));
  const lastSlot = data.frame[data.frame.length - 1];

  // The framed phrase travels from the question to its slot.
  const flown = useRef(0);
  useEffect(() => {
    if (!live || data.frame.length <= flown.current) {
      flown.current = data.frame.length;
      return;
    }
    flown.current = data.frame.length;
    const slot = data.frame[data.frame.length - 1];
    if (!slot.phrase) return;
    const host = scene.current;
    launchFlight(
      host?.querySelector(`[data-phrase="${slot.phrase}"]`),
      host?.querySelector(`[data-slot="${slot.slot}"]`),
      slot.phrase,
      "bg-violet-600 text-white",
    );
  }, [data.frame, live]);

  const exploreRef = useRef<HTMLDivElement>(null);
  const litRef = useRef<HTMLDivElement>(null);
  useReveal(exploreRef, data.patterns.length + (data.chart ? 1 : 0), live);
  useReveal(litRef, data.papers.length + data.gaps.length + (data.literature ? 1 : 0), live);

  let target: string | null = lastSlot ? `slot:${lastSlot.slot}` : null;
  if (data.chart) target = data.patterns.length ? `pattern:${data.patterns.length}` : "chart";
  if (data.literature)
    target = data.gaps.length
      ? `gap:${data.gaps.length}`
      : data.papers.length
        ? `paper:${data.papers.length}`
        : "funnel";
  const cursorRole = data.literature ? "knowledge" : data.chart ? "methodologist" : "theorist";

  const max = data.literature?.found ?? 1;
  return (
    <div ref={scene} className="relative flex flex-col gap-4">
      <Pane title="Your question" aside="Each underlined part becomes one line below">
        <p className="font-(family-name:--font-lora) text-[19px] leading-relaxed">
          {questionParts(question, PHRASES).map((part, i) =>
            part.phrase ? (
              <mark
                key={`${part.text}-${i}`}
                data-phrase={part.phrase}
                className={cn(
                  "rounded-sm border-b-2 bg-transparent px-px text-inherit transition-colors duration-300",
                  activePhrases.has(part.phrase) ? "border-violet-500 bg-violet-500/12" : "border-violet-500/35",
                )}
              >
                {part.text}
              </mark>
            ) : (
              <Fragment key={`${part.text}-${i}`}>{part.text}</Fragment>
            ),
          )}
        </p>
        <dl className="mt-4 grid grid-cols-1 border-t sm:grid-cols-[200px_minmax(0,1fr)]">
          {SLOTS.map(({ slot, label }) => {
            const f = framed.get(slot);
            return (
              <Fragment key={slot}>
                <dt className="border-b py-2.5 pr-3 text-muted-foreground text-sm max-sm:border-b-0 max-sm:pb-0">
                  {label}
                </dt>
                <dd data-slot={slot} data-cursor={`slot:${slot}`} className="border-b py-2.5 text-sm">
                  {f ? (
                    <span className="relative block rounded-sm">
                      <motion.span
                        aria-hidden
                        className="absolute -inset-x-1 inset-y-0 rounded-sm bg-amber-200/70 dark:bg-amber-400/20"
                        initial={{ opacity: 1 }}
                        animate={{ opacity: 0 }}
                        transition={{ duration: 1.1 }}
                      />
                      <span
                        className={cn(
                          "relative font-semibold",
                          slot === "out_of_reach" && "text-rose-700 dark:text-rose-300",
                          ["outcome", "exposure"].includes(slot) && "font-medium font-mono",
                        )}
                      >
                        {f.value}
                      </span>
                      <span className="relative block text-muted-foreground text-xs">{f.note}</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </dd>
              </Fragment>
            );
          })}
        </dl>
      </Pane>

      <div className="grid gap-4 lg:grid-cols-2">
        <div ref={exploreRef}>
          {data.chart ? (
            <Pane title={data.chart.title} aside={data.chart.note}>
              <div data-cursor="chart" className="grid grid-cols-[30px_1fr] gap-1.5">
                <div className="flex h-[150px] -translate-y-1.5 flex-col justify-between text-right font-mono text-[10.5px] text-muted-foreground">
                  {[80, 70, 60, 50].map((v) => (
                    <span key={v}>{v}</span>
                  ))}
                </div>
                <div className="relative grid h-[150px] grid-cols-5 items-end gap-3 border-b border-l px-2.5">
                  {[1, 2, 3].map((i) => (
                    <span
                      key={i}
                      className="absolute inset-x-0 border-t border-dashed"
                      style={{ bottom: `${(i / 3) * 100}%` }}
                    />
                  ))}
                  {data.chart.bars.map((bar, i) => (
                    <motion.div
                      key={bar.label}
                      className={cn("relative origin-bottom rounded-t", i >= 3 ? "bg-blue-600" : "bg-blue-500/35")}
                      style={{ height: `${((bar.value - 50) / 30) * 100}%` }}
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ delay: i * 0.09, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <span className="absolute inset-x-0 -top-[18px] text-center font-mono font-semibold text-[11px]">
                        {bar.value}
                      </span>
                    </motion.div>
                  ))}
                </div>
                <div className="col-start-2 grid grid-cols-5 gap-3 px-2.5 pt-1 text-center font-mono text-[10.5px] text-muted-foreground">
                  {data.chart.bars.map((bar) => (
                    <span key={bar.label}>{bar.label}</span>
                  ))}
                </div>
              </div>
              <ul className="mt-3.5 flex flex-col gap-1.5">
                {data.patterns.map((p, i) => (
                  <motion.li
                    key={p.id}
                    data-cursor={`pattern:${i + 1}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-[28px_1fr] gap-2 text-sm"
                  >
                    <b className="pt-px font-mono text-blue-700 text-xs dark:text-blue-300">{p.id}</b>
                    <span>{p.text}</span>
                  </motion.li>
                ))}
              </ul>
            </Pane>
          ) : (
            <Placeholder icon={<Play className="size-3.5" />}>Exploring the data comes next</Placeholder>
          )}
        </div>
        <div ref={litRef}>
          {data.literature ? (
            <Pane title="Prior work" aside="via the knowledge service">
              <div data-cursor="funnel" className="flex flex-col gap-1.5">
                {(
                  [
                    ["Found", data.literature.found, "bg-cyan-500/35"],
                    ["Relevant", data.literature.relevant, "bg-cyan-500/70"],
                    ["Used", data.literature.used, "bg-cyan-600"],
                  ] as const
                ).map(([label, value, color], i) => (
                  <div key={label} className="grid grid-cols-[70px_1fr_40px] items-center gap-2.5 text-xs">
                    <span className="text-muted-foreground">{label}</span>
                    <motion.i
                      className={cn("block h-2.5 origin-left rounded-sm", color)}
                      style={{ width: `${Math.max(4, (value / max) * 100)}%` }}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ delay: i * 0.25, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    />
                    <AnimatedNumber value={value} className="text-right font-mono font-semibold text-sm tabular-nums" />
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-col border-t">
                {data.papers.map((paper, i) => (
                  <motion.div
                    key={paper.doi}
                    data-cursor={`paper:${i + 1}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-px border-b py-2 text-xs"
                  >
                    <b className="font-semibold">{paper.citation}</b>
                    <span>{paper.claim}</span>
                    <a
                      href={`https://doi.org/${paper.doi}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-fit font-mono text-[11.5px] text-cyan-700 hover:underline dark:text-cyan-300"
                    >
                      doi:{paper.doi}
                    </a>
                  </motion.div>
                ))}
              </div>
              {data.gaps.map((gap, i) => (
                <motion.div
                  key={gap.id}
                  data-cursor={`gap:${i + 1}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-1.5 flex gap-2 rounded-lg bg-cyan-500/10 px-2.5 py-2 text-xs"
                >
                  <b className="whitespace-nowrap font-semibold text-cyan-700 dark:text-cyan-300">{gap.id}:</b>
                  <span>{gap.text}</span>
                </motion.div>
              ))}
            </Pane>
          ) : (
            <Placeholder icon={<Play className="size-3.5" />}>Then prior work is read</Placeholder>
          )}
        </div>
      </div>
      <AgentCursor
        agent={live ? cursorRole : null}
        container={scene}
        target={target}
        version={data.patterns.length + data.papers.length}
      />
    </div>
  );
}
