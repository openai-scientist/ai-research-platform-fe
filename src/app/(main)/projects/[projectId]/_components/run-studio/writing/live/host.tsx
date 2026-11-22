"use client";
"use no memo";

/* ===== A writing run on the engine, opened in the writing studio over the research flow (as the preview opens) ===== */

import { useEffect, useState } from "react";

import { ArrowLeft, PanelRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import { useWritingRun } from "../engine";
import { WritingStudio } from "../shell";
import { LiveRunControls } from "./chrome";
import { closeWritingRun, OPEN, useOpenRun } from "./open";
import { LIVE } from "./run";

function LiveWorkspace({ topic }: { topic: string }) {
  useWritingRun();
  const [asideOpen, setAsideOpen] = useState(true);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector("[role=dialog]")) closeWritingRun();
    };
    window.addEventListener("keydown", onKey);
    // The page under the studio keeps still: no second scrollbar beside the studio's own.
    const root = document.documentElement;
    const overflow = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      root.style.overflow = overflow;
    };
  }, []);
  return (
    <motion.section
      aria-label={`Writing run ${LIVE.label}`}
      className="fixed inset-0 z-50 flex flex-col bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <header className="flex min-h-14 items-center gap-x-2.5 border-b px-3 py-2 md:pr-4">
        <Button variant="ghost" size="sm" onClick={closeWritingRun} title="Leave the writing run. It keeps going.">
          <ArrowLeft />
          Research flow
        </Button>
        <Separator orientation="vertical" className="h-5 max-md:hidden" />
        <div className="flex min-w-0 flex-1 items-baseline gap-2.5">
          <b className="whitespace-nowrap font-mono font-semibold text-sm">{LIVE.label}</b>
          <span className="truncate text-muted-foreground text-sm max-md:hidden">{topic}</span>
        </div>
        <LiveRunControls />
        <Button
          variant="ghost"
          size="icon-sm"
          className="max-lg:hidden"
          onClick={() => setAsideOpen((o) => !o)}
          aria-label="Show or hide the side panel"
        >
          <PanelRight />
        </Button>
      </header>
      <WritingStudio asideOpen={asideOpen} />
    </motion.section>
  );
}

let hosts = 0;

/** Renders the open writing run over the page, in the run workspace's layer. */
export function WritingRunHost({ projectId }: { projectId: string }) {
  const open = useOpenRun();
  // Another project's run is not shown here; leaving the project closes it. A remount (a hot reload, strict mode)
  // mounts the host again before the check runs, so it keeps the run open.
  useEffect(() => {
    hosts += 1;
    if (OPEN.run && OPEN.run.projectId !== projectId) closeWritingRun();
    return () => {
      hosts -= 1;
      setTimeout(() => {
        if (hosts === 0 && OPEN.run?.projectId === projectId) closeWritingRun();
      }, 0);
    };
  }, [projectId]);
  return (
    <AnimatePresence>
      {open?.projectId === projectId && <LiveWorkspace key={open.run.id} topic={LIVE.topic} />}
    </AnimatePresence>
  );
}
