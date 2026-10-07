"use client";

import { useId, useMemo, useRef, useState } from "react";

import { Columns3, Database, Table2 } from "lucide-react";

import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { showConnectionError } from "@/hooks/use-data-connections";

import { type SqlSuggestion, sqlCompletionContext } from "./sql-completion";
import type { ConnectionFlowState } from "./use-connection-flow";
import { useSqlSuggestions } from "./use-sql-suggestions";

function caretPoint(element: HTMLTextAreaElement) {
  const style = window.getComputedStyle(element);
  const mirror = document.createElement("div");
  for (const key of [
    "fontFamily",
    "fontSize",
    "fontWeight",
    "lineHeight",
    "letterSpacing",
    "paddingTop",
    "paddingLeft",
    "paddingRight",
    "paddingBottom",
    "boxSizing",
    "tabSize",
  ] as const)
    mirror.style[key] = style[key];
  Object.assign(mirror.style, {
    position: "fixed",
    visibility: "hidden",
    left: "0",
    top: "0",
    whiteSpace: "pre-wrap",
    overflowWrap: "break-word",
    width: `${element.clientWidth}px`,
  });
  mirror.textContent = element.value.slice(0, element.selectionStart);
  const marker = document.createElement("span");
  marker.textContent = ".";
  mirror.append(marker);
  document.body.append(mirror);
  const rect = marker.getBoundingClientRect();
  const base = mirror.getBoundingClientRect();
  const point = {
    left: Math.max(0, rect.left - base.left - element.scrollLeft),
    top: Math.max(0, rect.top - base.top - element.scrollTop) + (Number.parseFloat(style.lineHeight) || 20),
  };
  mirror.remove();
  return point;
}

export function SqlQueryInput({ flow }: { flow: ConnectionFlowState }) {
  const textarea = useRef<HTMLTextAreaElement>(null);
  const listId = useId();
  const [caret, setCaret] = useState(flow.sql.length);
  const [focused, setFocused] = useState(false);
  const [composing, setComposing] = useState(false);
  const [rangeSelected, setRangeSelected] = useState(false);
  const [forced, setForced] = useState(false);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [activeKey, setActiveKey] = useState("");
  const [point, setPoint] = useState({ left: 12, top: 32 });
  const seedSchema = flow.schema || (flow.schemas.includes("public") ? "public" : (flow.schemas[0] ?? ""));
  const context = useMemo(
    () => (composing || rangeSelected ? null : sqlCompletionContext(flow.sql, caret, seedSchema, forced, flow.kind)),
    [flow.sql, caret, seedSchema, forced, composing, rangeSelected, flow.kind],
  );
  const positionKey = `${flow.sql}:${caret}`;
  const enabled = focused && !composing && dismissed !== positionKey;
  const suggestions = useSqlSuggestions(flow, context, enabled);
  const selected = suggestions.items.find((item) => item.key === activeKey) ?? suggestions.items[0];
  const open = enabled && !flow.disabled && Boolean(context) && (suggestions.loading || suggestions.items.length > 0);

  function updateCaret(element: HTMLTextAreaElement) {
    setRangeSelected(element.selectionStart !== element.selectionEnd);
    setCaret(element.selectionStart);
    setPoint(caretPoint(element));
  }

  function apply(item: SqlSuggestion) {
    if (!context || !textarea.current) return;
    const next = flow.sql.slice(0, context.start) + item.insert + flow.sql.slice(context.end);
    if (next.length > 20_000) {
      showConnectionError(new Error("SQL queries may contain at most 20,000 characters."));
      return;
    }
    const position = context.start + item.insert.length;
    flow.setSql(next);
    setCaret(position);
    setForced(false);
    setActiveKey("");
    setDismissed(item.kind === "schema" ? null : `${next}:${position}`);
    window.requestAnimationFrame(() => {
      const element = textarea.current;
      if (!element) return;
      element.focus();
      element.setSelectionRange(position, position);
      setPoint(caretPoint(element));
    });
  }

  return (
    <Popover
      open={open}
      onOpenChange={(value) => {
        if (!value) setDismissed(positionKey);
      }}
    >
      <div className="relative min-w-0">
        <Textarea
          ref={textarea}
          id="connection-sql"
          value={flow.sql}
          disabled={flow.disabled}
          maxLength={20_000}
          spellCheck={false}
          autoComplete="off"
          className="min-h-56 bg-background font-(family-name:--font-geist-mono) leading-6 tracking-normal [font-variant-ligatures:none] [tab-size:2]"
          placeholder="SELECT column_name FROM schema.table_name"
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-controls={open ? listId : undefined}
          aria-activedescendant={open && selected ? `${listId}-${suggestions.items.indexOf(selected)}` : undefined}
          onChange={(event) => {
            flow.setSql(event.target.value);
            setForced(false);
            setDismissed(null);
            setActiveKey("");
            updateCaret(event.target);
          }}
          onSelect={(event) => updateCaret(event.currentTarget)}
          onScroll={(event) => setPoint(caretPoint(event.currentTarget))}
          onFocus={(event) => {
            setFocused(true);
            updateCaret(event.currentTarget);
          }}
          onBlur={() => setFocused(false)}
          onCompositionStart={() => setComposing(true)}
          onCompositionEnd={(event) => {
            setComposing(false);
            updateCaret(event.currentTarget);
          }}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return;
            if ((event.ctrlKey || event.metaKey) && event.key === " ") {
              event.preventDefault();
              setForced(true);
              setDismissed(null);
              updateCaret(event.currentTarget);
              return;
            }
            if (!open) return;
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              setDismissed(positionKey);
              return;
            }
            if ((event.key === "ArrowDown" || event.key === "ArrowUp") && suggestions.items.length) {
              event.preventDefault();
              const current = selected ? suggestions.items.indexOf(selected) : 0;
              const next =
                (current + (event.key === "ArrowDown" ? 1 : -1) + suggestions.items.length) % suggestions.items.length;
              setActiveKey(suggestions.items[next].key);
            } else if ((event.key === "Enter" || event.key === "Tab") && selected && !event.shiftKey) {
              event.preventDefault();
              apply(selected);
            }
          }}
        />
        <PopoverAnchor asChild>
          <span aria-hidden="true" className="pointer-events-none absolute size-px" style={point} />
        </PopoverAnchor>
      </div>
      <PopoverContent
        align="start"
        side="bottom"
        className="w-80 max-w-[calc(100vw-2rem)] p-0"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onInteractOutside={(event) => {
          if (event.target === textarea.current) event.preventDefault();
        }}
        onMouseDown={(event) => event.preventDefault()}
      >
        <Command shouldFilter={false} value={selected?.key ?? ""} onValueChange={setActiveKey}>
          <CommandList id={listId} aria-label="SQL suggestions">
            {suggestions.loading ? (
              <div className="flex items-center gap-2 p-3 text-muted-foreground text-xs">
                <Spinner />
                Loading suggestions…
              </div>
            ) : (
              <CommandGroup heading={context?.kind === "table" ? "Tables and schemas" : "Columns"}>
                {suggestions.items.map((item, index) => (
                  <CommandItem key={item.key} id={`${listId}-${index}`} value={item.key} onSelect={() => apply(item)}>
                    {item.kind === "column" ? <Columns3 /> : item.kind === "schema" ? <Database /> : <Table2 />}
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="break-words font-(family-name:--font-geist-mono) text-sm [font-variant-ligatures:none]">
                        {item.label}
                      </span>
                      <span className="break-words text-muted-foreground text-xs">{item.detail}</span>
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
        <p className="border-t px-3 py-2 text-muted-foreground text-xs">
          ↑/↓ to choose · Enter/Tab to insert · Esc to close
        </p>
      </PopoverContent>
    </Popover>
  );
}
