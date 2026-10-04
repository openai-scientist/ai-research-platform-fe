"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { ResearchContextSection } from "./research-context-section";
import type { WorkspaceProps } from "./workspace-ui";

export function ResearchContextDialog(props: WorkspaceProps) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const checkHash = () => {
      if (window.location.hash === "#research-context") setOpen(true);
    };
    checkHash();
    window.addEventListener("hashchange", checkHash);
    return () => window.removeEventListener("hashchange", checkHash);
  }, []);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next && window.location.hash === "#research-context") {
          window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">Research context</Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-4 overflow-hidden sm:max-w-4xl">
        <DialogHeader className="shrink-0 pr-8">
          <DialogTitle>Research context</DialogTitle>
          <DialogDescription>View the current research context and browse saved versions.</DialogDescription>
        </DialogHeader>
        {open && <ResearchContextSection {...props} embedded />}
      </DialogContent>
    </Dialog>
  );
}
