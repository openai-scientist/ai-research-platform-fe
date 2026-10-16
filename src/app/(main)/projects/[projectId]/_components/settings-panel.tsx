"use client";

import { type ReactNode, useEffect, useId, useRef, useState } from "react";

import { cn } from "cn";
import { X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

/** Warns before leaving the page while a form has changes that aren't saved. */
export function useUnsavedWarning(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
}

/** The heading of a settings tab, with an optional action on its right. */
export function SettingsHeading({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex min-h-8 items-center justify-between gap-4">
      <h2 className="font-semibold text-lg tracking-tight">{title}</h2>
      {action}
    </div>
  );
}

/** A bordered block of settings rows. */
export function SettingsGroup({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  const headingId = useId();
  return (
    <section aria-labelledby={title ? headingId : undefined} className="flex min-w-0 flex-col gap-2.5">
      {title && (
        <h3 id={headingId} className="px-1 font-medium text-muted-foreground text-sm">
          {title}
        </h3>
      )}
      <div className={cn("divide-y overflow-hidden rounded-xl border bg-card", className)}>{children}</div>
    </section>
  );
}

/** One setting: its name on the left, the control on the right; stacked on phones. */
export function SettingsRow({
  label,
  htmlFor,
  hint,
  children,
  inline,
}: {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  children: ReactNode;
  /** Keep a small control, like a switch or a button, on the label's line even on phones. */
  inline?: boolean;
}) {
  const Label = htmlFor ? "label" : "p";
  return (
    <div
      className={cn(
        "grid gap-x-8 gap-y-3 px-4 py-5 sm:px-5",
        inline ? "grid-cols-[minmax(0,1fr)_auto] items-center" : "@xl/settings:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]",
      )}
    >
      <div className="flex min-w-0 flex-col gap-0.5 sm:pt-1.5">
        <Label htmlFor={htmlFor} className="font-medium text-sm">
          {label}
        </Label>
        {hint && <p className="text-pretty text-muted-foreground text-xs leading-relaxed">{hint}</p>}
      </div>
      <div className={cn("flex min-w-0 flex-col gap-1.5", inline && "items-end")}>{children}</div>
    </div>
  );
}

/** Shows a running count once a text gets close to its limit. */
export function CharacterCount({ length, max }: { length: number; max: number }) {
  if (length < max * 0.8) return null;
  return (
    <span
      aria-live="polite"
      className={cn("self-end text-xs tabular-nums", length > max ? "text-destructive" : "text-muted-foreground")}
    >
      {length.toLocaleString("en-US")} / {max.toLocaleString("en-US")}
    </span>
  );
}

/** Rises from the bottom once a form has changes, and goes away when they're saved or discarded. */
export function SaveBar({
  dirty,
  pending,
  form,
  onDiscard,
}: {
  dirty: boolean;
  pending?: boolean;
  form: string;
  onDiscard: () => void;
}) {
  if (!dirty) return null;
  return (
    <div className="fade-in-0 slide-in-from-bottom-2 sticky bottom-4 z-10 flex animate-in flex-wrap items-center justify-between gap-3 rounded-xl border bg-popover p-2 duration-200 motion-reduce:animate-none sm:pl-4">
      <p className="text-sm">Unsaved changes</p>
      <div className="flex items-center gap-1.5">
        <Button type="button" variant="ghost" disabled={pending} onClick={onDiscard}>
          Discard
        </Button>
        <Button type="submit" form={form} disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

const MAX_TAGS = 20;
const MAX_TAG_LENGTH = 40;

/** Tags as removable chips: Enter or a comma adds one, Backspace on an empty field takes the last one back. */
export function TagInput({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string;
  value: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const hintId = useId();

  function add(raw: string) {
    const next = [...value];
    for (const piece of raw.split(",")) {
      const tag = piece.trim();
      if (!tag) continue;
      if (tag.length > MAX_TAG_LENGTH) {
        toast.error(`Tags can be up to ${MAX_TAG_LENGTH} characters.`);
        continue;
      }
      if (next.some((existing) => existing.toLowerCase() === tag.toLowerCase())) continue;
      if (next.length >= MAX_TAGS) {
        toast.error(`A project can have up to ${MAX_TAGS} tags.`);
        break;
      }
      next.push(tag);
    }
    if (next.length !== value.length) onChange(next);
    setDraft("");
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: clicking the padding around the chips focuses the field
    // biome-ignore lint/a11y/useKeyWithClickEvents: the field inside handles the keyboard
    <div
      onClick={() => input.current?.focus()}
      className={cn(
        "flex min-h-9 w-full cursor-text flex-wrap items-center gap-1.5 rounded-lg border border-input bg-transparent px-1 py-1 transition-colors dark:bg-input/30",
        "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
        disabled && "pointer-events-none bg-input/50 opacity-50",
      )}
    >
      {value.map((tag) => (
        <span
          key={tag}
          className="inline-flex h-6 max-w-full items-center gap-1 rounded-md bg-muted pr-0.5 pl-2 text-sm"
        >
          <span className="truncate">{tag}</span>
          <button
            type="button"
            disabled={disabled}
            onClick={(event) => {
              event.stopPropagation();
              onChange(value.filter((existing) => existing !== tag));
              input.current?.focus();
            }}
            aria-label={`Remove tag ${tag}`}
            className="grid size-5 shrink-0 cursor-pointer place-items-center rounded text-muted-foreground outline-none transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-3" aria-hidden="true" />
          </button>
        </span>
      ))}
      <input
        ref={input}
        id={id}
        value={draft}
        disabled={disabled}
        aria-describedby={hintId}
        placeholder={value.length ? "" : "Add a tag"}
        onChange={(event) => {
          const next = event.target.value;
          if (next.includes(",")) add(next);
          else setDraft(next);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            add(draft);
          } else if (event.key === "Backspace" && !draft && value.length) {
            event.preventDefault();
            setDraft(value[value.length - 1]);
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => add(draft)}
        onPaste={(event) => {
          const pasted = event.clipboardData.getData("text");
          if (!/[,\n]/.test(pasted)) return;
          event.preventDefault();
          add(`${draft},${pasted.replace(/\n/g, ",")}`);
        }}
        className="h-6 min-w-24 flex-1 bg-transparent px-1.5 text-base outline-none placeholder:text-muted-foreground md:text-sm"
      />
      <span id={hintId} className="sr-only">
        Press Enter or type a comma to add a tag. Press Backspace to edit the last one.
      </span>
    </div>
  );
}
