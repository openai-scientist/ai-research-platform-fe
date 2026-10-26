"use client";

import { useState } from "react";

import { ArrowLeft, PanelRight } from "lucide-react";
import { motion } from "motion/react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import { closeWritingPreview } from "./writing/engine";
import { WritingStudio } from "./writing/shell";

/** The writing stage on its own, played on the example record, so it can be tried without a research run. */
export function WritingPreview() {
  const [asideOpen, setAsideOpen] = useState(true);
  return (
    <motion.section
      aria-label="Writing stage preview"
      className="fixed inset-0 z-50 flex flex-col bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <header className="flex min-h-14 items-center gap-x-2.5 border-b px-3 py-2 md:pr-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={closeWritingPreview}
          title="Leave the preview. The writing run keeps going."
        >
          <ArrowLeft />
          Research flow
        </Button>
        <Separator orientation="vertical" className="h-5 max-md:hidden" />
        <div className="flex min-w-0 flex-1 items-baseline gap-2.5">
          <b className="whitespace-nowrap font-mono font-semibold text-sm">RUN-25CD</b>
          <span className="truncate text-muted-foreground text-sm max-md:hidden">
            Writing stage, played on an example research record
          </span>
        </div>
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
