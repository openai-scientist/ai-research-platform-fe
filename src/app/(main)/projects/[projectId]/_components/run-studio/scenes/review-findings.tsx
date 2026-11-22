"use client";

import { useRef } from "react";

import { cn } from "cn";
import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";

import type { ReviewFinding } from "@/lib/run-stream/contract";

import { CitedText } from "../cite";
import { AgentAvatar } from "../run-bits";
import { AGENTS } from "../run-meta";
import { useReveal } from "../workspace-context";
import { bySeverity, FINDING_SEVERITY, findingTarget } from "./findings";

const FINDING_SPEED = 220;

export function ReviewFindings({ findings, newest }: { findings: ReviewFinding[]; newest?: string }) {
  const typed = useRef<HTMLLIElement>(null);
  const live = Boolean(newest && findings.some((f) => f.finding_id === newest));
  // The finding being typed is brought into view, as the cursor goes to it.
  useReveal(typed, newest, live);
  return (
    <div className="flex flex-col gap-2 border-t pt-2.5 text-xs">
      <span className="flex items-center gap-2">
        <AgentAvatar agent="reviewer" size="sm" />
        <b className={cn("font-semibold", AGENTS.reviewer.text)}>Independent review</b>
        <span className="text-muted-foreground">
          {findings.length} {findings.length === 1 ? "finding" : "findings"}
        </span>
      </span>
      <ul className="flex flex-col gap-2">
        {[...findings].sort(bySeverity).map((f) => {
          const tone = FINDING_SEVERITY[f.severity] ?? FINDING_SEVERITY.minor;
          const { field } = findingTarget(f.locator);
          const typing = f.finding_id === newest;
          return (
            <motion.li
              key={f.finding_id}
              ref={typing ? typed : undefined}
              data-cursor={`finding:${f.finding_id}`}
              layout="position"
              initial={typing ? { opacity: 0, x: -6 } : false}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className={cn("flex flex-col gap-0.5 border-l-2 pl-2.5", tone.bar)}
            >
              <span className="flex flex-wrap items-baseline gap-x-1.5 text-[11px]">
                <b className={cn("font-semibold", tone.text)}>{tone.label}</b>
                {field && <span className="text-foreground/80">· {field}</span>}
                <span className="text-muted-foreground">
                  · {f.category.replaceAll("_", " ")}
                  {f.kind === "needs_evidence" ? " · needs a source" : ""}
                </span>
              </span>
              <p className="leading-snug">
                <CitedText text={f.issue} live={typing} speed={FINDING_SPEED} />
              </p>
              {f.suggestion && (
                <motion.p
                  initial={typing ? { opacity: 0 } : false}
                  animate={{ opacity: 1 }}
                  transition={{ delay: typing ? f.issue.length / FINDING_SPEED : 0, duration: 0.3 }}
                  className="flex gap-1.5 text-muted-foreground leading-snug"
                >
                  <ArrowRight className="mt-0.5 size-3 shrink-0" />
                  <CitedText text={f.suggestion} />
                </motion.p>
              )}
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
