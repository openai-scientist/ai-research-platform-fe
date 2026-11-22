"use client";

import { useRef } from "react";

import { cn } from "cn";
import { NotebookPen } from "lucide-react";

import { Pending } from "../run-studio/live-run/live-ui";
import { AgentCursor } from "../run-studio/run-bits";

/** The fields of the research plan the PI writes, in the order the endorsement shows them. */
const FIELDS = [
  { key: "question", label: "Research question" },
  { key: "motivation", label: "Why it matters" },
  { key: "objectives", label: "Objectives" },
  { key: "success_criteria", label: "Success when" },
  { key: "scope_in", label: "Covers" },
  { key: "scope_out", label: "Leaves out" },
  { key: "kill_criteria", label: "Stops the run if" },
  { key: "constraints", label: "Constraints" },
  { key: "risk_posture", label: "Risk posture" },
] as const;

/**
 * The PI's plan while it is written in Logos: every field of the plan as a slot, none filled until the plan arrives.
 * The values are shown in the endorsement that follows; this only shows what is being drafted and where it runs.
 */
export function PlanDraftWorkbench({ live }: { live: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  return (
    <div ref={root} className="relative border-t">
      <h3 className="px-4 pt-3 font-semibold text-sm">Drafting the research plan</h3>
      <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 px-4 pt-1.5 text-sm">
        <span>
          <b className="font-semibold">Now:</b> Writing the plan this run will follow, field by field.
        </span>
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-muted-foreground text-xs">
          <span className="size-2 rounded-full border-[1.5px] border-muted-foreground border-dashed" />
          Procedure preview
        </span>
        <span className="text-muted-foreground text-xs">· in Logos, no Local Node job</span>
      </p>
      <div className="mx-4 mt-2 flex items-start gap-2 rounded-lg bg-muted px-3 py-2 text-muted-foreground text-xs">
        <NotebookPen aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
        <p>
          The PI is drafting the scope, aims and success criteria. The fields appear as they are written, and you
          endorse the whole plan before any work starts.
        </p>
      </div>
      <dl data-visual className="grid gap-2 px-4 py-4 sm:grid-cols-2">
        {FIELDS.map((field, index) => (
          <div
            key={field.key}
            data-cursor={`f${index}`}
            className={cn(
              "flex min-w-0 flex-col gap-1.5 rounded-xl border bg-card p-3",
              (field.key === "question" || field.key === "motivation") && "sm:col-span-2",
            )}
          >
            <dt className="font-medium text-[11px] text-muted-foreground uppercase tracking-wide">{field.label}</dt>
            <dd>
              <Pending>Not written yet</Pending>
            </dd>
          </div>
        ))}
      </dl>
      <AgentCursor agent="pi" container={root} target={live ? "f0" : null} version="plan-draft" click />
    </div>
  );
}
