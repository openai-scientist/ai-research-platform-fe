"use client";

import { type ReactNode, useState } from "react";

import { ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export function ContextChevron({ expanded }: { expanded: boolean }) {
  return (
    <ChevronRight
      aria-hidden="true"
      data-icon="inline-start"
      className={
        expanded
          ? "rotate-90 transition-transform motion-reduce:transition-none"
          : "transition-transform motion-reduce:transition-none"
      }
    />
  );
}

export function ContextDisclosure({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="min-w-0">
      <CollapsibleTrigger asChild>
        <Button type="button" variant="ghost" className="w-full justify-start">
          <ContextChevron expanded={open} />
          {title}
        </Button>
      </CollapsibleTrigger>
      {description && <p className="pl-8 text-muted-foreground text-sm leading-relaxed">{description}</p>}
      <CollapsibleContent className="min-w-0">
        <div className="min-w-0 pt-3 pl-8">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}
