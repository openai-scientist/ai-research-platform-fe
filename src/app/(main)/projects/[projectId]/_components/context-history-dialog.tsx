"use client";

import { useState } from "react";

import { History } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { ContextHistory } from "./context-history";

export function ContextHistoryDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon" aria-label="View context history">
              <History />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Version history</TooltipContent>
      </Tooltip>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-4 overflow-hidden sm:max-w-3xl">
        <DialogHeader className="shrink-0 pr-8">
          <DialogTitle>Context history</DialogTitle>
          <DialogDescription>Browse saved versions and expand one to view its research context.</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 overflow-y-auto p-1">{open && <ContextHistory projectId={projectId} />}</div>
      </DialogContent>
    </Dialog>
  );
}
