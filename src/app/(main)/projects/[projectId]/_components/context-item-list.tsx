"use client";
import { type ReactNode, useEffect, useRef, useState } from "react";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

import { ContextChevron } from "./context-disclosure";

function FocusEditor({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('textarea, input, [role="combobox"]')?.focus();
  }, []);
  return (
    <div ref={ref} className="min-w-0 pt-2 pb-3">
      {children}
    </div>
  );
}

export function contextItemSummary(value: unknown): string {
  if (value == null || value === "") return "Not filled";
  if (typeof value === "object") return Object.values(value).map(contextItemSummary).join(" · ");
  return String(value);
}

export function ContextItemList({
  items,
  label,
  onAdd,
  onRemove,
  children,
}: {
  items: { id: string; summary: string }[];
  label: string;
  onAdd: () => string;
  onRemove: (id: string) => void;
  children: (id: string) => ReactNode;
}) {
  const [expanded, setExpanded] = useState("");
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground text-xs">
          {items.length} {items.length === 1 ? "item" : "items"}
        </span>
        <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={() => setExpanded(onAdd())}>
          <Plus data-icon="inline-start" /> Add {label.toLowerCase()}
        </Button>
      </div>
      {items.map((item, index) => (
        <Collapsible
          key={item.id}
          open={expanded === item.id}
          onOpenChange={(open) => setExpanded(open ? item.id : "")}
        >
          <div className="flex min-w-0 items-center gap-1">
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="min-w-0 flex-1 justify-start"
                aria-label={`Edit ${label.toLowerCase()} ${index + 1}`}
              >
                <ContextChevron expanded={expanded === item.id} />
                <span className="shrink-0 text-muted-foreground">{index + 1}.</span>
                <span className="truncate text-left">{item.summary}</span>
              </Button>
            </CollapsibleTrigger>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Remove ${label.toLowerCase()} ${index + 1}`}
              title={`Remove ${label.toLowerCase()} ${index + 1}`}
              onClick={() => {
                onRemove(item.id);
                setExpanded("");
              }}
            >
              <Trash2 />
            </Button>
          </div>
          <CollapsibleContent>
            <FocusEditor>{children(item.id)}</FocusEditor>
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );
}
