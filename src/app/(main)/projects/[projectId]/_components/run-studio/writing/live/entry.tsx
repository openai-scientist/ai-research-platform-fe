"use client";

/* ===== The writing stage on the research runs page: start a writing run, open the latest one, or watch the example ===== */

import { useState } from "react";

import { cn } from "cn";
import { ChevronDown, PenLine, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRunsQuery } from "@/hooks/use-runs-query";
import type { RunItem } from "@/lib/api/services/fetch-runs";

import { openWritingPreview } from "../engine";
import { openWritingRun, startWritingRun } from "./open";
import { isDraftRun, isWritingRun } from "./run";

const STATE: Record<string, { label: string; dot: string; c: string }> = {
  queued: { label: "Starting", dot: "bg-sky-500", c: "bg-sky-500/12 text-sky-700 dark:text-sky-300" },
  running: { label: "Running", dot: "bg-sky-500", c: "bg-sky-500/12 text-sky-700 dark:text-sky-300" },
  awaiting_review: {
    label: "Waiting for you",
    dot: "bg-amber-500",
    c: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  },
  completed: {
    label: "Done",
    dot: "bg-emerald-500",
    c: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  },
  failed: { label: "Stopped", dot: "bg-rose-500", c: "bg-rose-500/12 text-rose-700 dark:text-rose-300" },
};
type StartMode = "guided" | "light" | "auto";
const MODES: { mode: StartMode; label: string; x: string; draftOnly?: true }[] = [
  {
    mode: "guided",
    label: "Guided",
    x: "For your first runs: stops after each group of stages to show what it did and what it becomes in the paper; you add your own objections.",
    draftOnly: true,
  },
  { mode: "light", label: "Light", x: "Stops for you at each decision the record cannot settle." },
  { mode: "auto", label: "Auto", x: "Takes each recommendation and notes it; you read the result." },
];
/** How far a run goes: the outline only, or on to the first draft. */
const REACH = [
  { draft: false, label: "To the outline", x: "Plans every paragraph and sentence; writes nothing." },
  { draft: true, label: "To the first draft", x: "Then writes each section, the title and the abstract." },
];

function StartMenu({ projectId, again }: { projectId: string; again: boolean }) {
  const [busy, setBusy] = useState(false);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={again ? "outline" : "default"} size="sm" disabled={busy} className="max-sm:flex-1">
          <Play />
          {busy ? "Starting…" : again ? "Run again" : "Run the writing stage"}
          <ChevronDown className="opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="font-normal text-muted-foreground text-xs">
          From the sample experiment results (ERP-25CD). How far, and who decides at the stops?
        </DropdownMenuLabel>
        {REACH.map((r) => (
          <DropdownMenuGroup key={r.label}>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="flex flex-col gap-0.5 font-normal">
              <span className="font-medium text-xs">{r.label}</span>
              <span className="text-muted-foreground text-xs">{r.x}</span>
            </DropdownMenuLabel>
            {MODES.filter((m) => r.draft || !m.draftOnly).map((m) => (
              <DropdownMenuItem
                key={m.mode}
                className="flex-col items-start gap-0.5 pl-4"
                onSelect={async () => {
                  setBusy(true);
                  await startWritingRun(projectId, m.mode, r.draft);
                  setBusy(false);
                }}
              >
                <span className="font-medium">{m.label}</span>
                <span className="text-muted-foreground text-xs">{m.x}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** The writing stage: it builds the paper outline from the sample results, and opens in the writing studio. */
export function WritingRunRow({ projectId, canWrite }: { projectId: string; canWrite: boolean }) {
  const runs = useRunsQuery(
    projectId,
    { limit: 20 },
    { refetchInterval: (query) => (query.state.error ? false : 10_000) },
  );
  const latest: RunItem | undefined = runs.data?.data.find(isWritingRun);
  const state = latest ? STATE[latest.status] : undefined;
  const chip =
    state && latest?.status === "completed"
      ? { ...state, label: isDraftRun(latest) ? "Draft ready" : "Outline ready" }
      : state;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5 rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
        <PenLine className="size-4" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-2">
          <b className="font-medium text-sm">Writing stage</b>
          {latest && <span className="font-mono text-[11px] text-muted-foreground">{latest.label}</span>}
          {chip && (
            <span
              className={cn("inline-flex h-5 items-center gap-1.5 rounded-full px-2 font-medium text-[11px]", chip.c)}
            >
              <span className={cn("size-1.5 rounded-full", chip.dot)} />
              {chip.label}
            </span>
          )}
        </span>
        <span className="text-pretty text-muted-foreground text-xs">
          Builds the paper from the sample experiment results: the data report, the argued claims, the story, the plan
          of every paragraph and sentence, and, if you ask for it, the first draft written section by section.
        </span>
      </div>
      <div className="flex items-center gap-2 max-sm:w-full">
        <Button
          variant="ghost"
          size="sm"
          onClick={openWritingPreview}
          title="The whole writing stage, played on an example"
        >
          Example
        </Button>
        {latest && (
          <Button size="sm" className="max-sm:flex-1" onClick={() => openWritingRun(projectId, latest)}>
            Open
          </Button>
        )}
        {canWrite && <StartMenu projectId={projectId} again={Boolean(latest)} />}
      </div>
    </div>
  );
}
