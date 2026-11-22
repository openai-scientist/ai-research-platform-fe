"use client";
"use no memo";

/* ===== The paper's toolbar: emphasis, what to put in a sentence from the run's record, who wrote what, and where the
   saves stand =====
   A value is put in from the evidence ledger and a source from the paper's references, each as a chip the sentence
   carries whole: a number is never typed in. The toolbar says whether your change is saved and checked, and opens
   the saved versions, each of which can be put back. */

import { useState, useSyncExternalStore } from "react";

import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import {
  Bold,
  Code,
  History,
  Italic,
  Quote,
  Redo2,
  Sigma,
  Subscript as SubIcon,
  Superscript as SupIcon,
  Table2,
  Undo2,
  UserPen,
  UserRoundPen,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Toggle } from "@/components/ui/toggle";
import { type DocVersionItem, fetchDocument } from "@/lib/api/services/fetch-document";

import { cn } from "../lib";
import { NUMS } from "./doc-order";
import { restore, SAVED } from "./doc-save";
import { exhibitNumbers } from "./outline-data";
import { citeName } from "./outline-paper";
import { file, LIVE } from "./run";

/** Whether the page marks the words you wrote or changed. */
export const SHOW: { who: boolean } = { who: false };

const subscribe = (l: () => void) => {
  SAVED.listeners.add(l);
  return () => SAVED.listeners.delete(l);
};
export const useSaved = () =>
  useSyncExternalStore(
    subscribe,
    () => SAVED.version,
    () => SAVED.version,
  );

/** What only the authors can supply, as the paper leaves it to them. */
const SLOTS = [
  "the ethics approval and its reference",
  "the funding and its grant number",
  "where the data and code can be found",
  "the conflicts of interest",
  "the acknowledgements",
].map((t) => ({ key: t, title: t.replace(/^./, (x) => x.toUpperCase()), detail: "Left for the authors to fill" }));

/** Puts a chip where the cursor is, in the sentence the cursor is in. */
function insertChip(editor: Editor, type: string, attrs: Record<string, unknown>) {
  const { state, view } = editor;
  const node = state.schema.nodes[type]?.create(attrs, null, state.selection.$from.marks());
  if (!node) return;
  view.dispatch(state.tr.replaceSelectionWith(node, false).scrollIntoView());
  view.focus();
}

function Picker({
  label,
  icon,
  placeholder,
  items,
  onPick,
  disabled = false,
}: {
  disabled?: boolean;
  label: string;
  icon: React.ReactNode;
  placeholder: string;
  items: { key: string; title: string; detail: string }[];
  onPick(key: string): void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="sm" aria-label={label} title={label} disabled={disabled}>
          {icon}
          <span className="max-sm:hidden">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[22rem] p-0">
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandList>
            <CommandEmpty>Nothing matches.</CommandEmpty>
            <CommandGroup>
              {items.map((x) => (
                <CommandItem
                  key={x.key}
                  value={`${x.title} ${x.key}`}
                  onSelect={() => {
                    setOpen(false);
                    onPick(x.key);
                  }}
                  className="flex flex-col items-start gap-0.5"
                >
                  <span className="text-sm">{x.title}</span>
                  <span className="text-muted-foreground text-xs">{x.detail}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function SaveState() {
  useSaved();
  let text = SAVED.n ? `Saved · version ${SAVED.n}` : "As the run wrote it";
  if (SAVED.dirty) text = "Not saved yet";
  if (SAVED.saving) text = "Saving…";
  if (SAVED.checking) text = "Checking your change…";
  return (
    <span aria-live="polite" data-save-state className="whitespace-nowrap text-muted-foreground text-xs tabular-nums">
      {text}
    </span>
  );
}

const WHEN = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" });
const CHANGE: Record<string, string> = {
  sentence_edited: "sentence changed",
  sentence_added: "sentence added",
  sentence_removed: "sentence removed",
  paragraph_added: "paragraph added",
  paragraph_removed: "paragraph removed",
  paragraph_moved: "paragraph moved",
  section_moved: "sections moved",
  heading_edited: "heading changed",
  front_edited: "title or abstract changed",
};
function versionLine(v: DocVersionItem, kinds: string[]) {
  if (v.restored_from !== null) return `Version ${v.restored_from} put back`;
  if (!kinds.length) return "Saved as it was";
  return `${v.changes.length} change${v.changes.length === 1 ? "" : "s"}: ${kinds.join(", ")}`;
}
function Versions({
  open,
  onOpenChange,
  onRestored,
}: {
  open: boolean;
  onOpenChange(o: boolean): void;
  onRestored(): void;
}) {
  useSaved();
  const [items, setItems] = useState<{ at: number; list: DocVersionItem[] } | null>(null);
  if (open && (!items || items.at !== SAVED.n)) {
    setItems({ at: SAVED.n, list: items?.list ?? [] });
    void fetchDocument.versions(LIVE.projectId, LIVE.runId).then((r) => setItems({ at: SAVED.n, list: r.data ?? [] }));
  }
  const list = items?.list ?? [];
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[22rem] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Versions of the paper</SheetTitle>
          <SheetDescription>
            Each save is a version. Putting one back saves it as a new version; none is deleted.
          </SheetDescription>
        </SheetHeader>
        <ol className="flex flex-col gap-2 px-4 pb-4">
          {list.map((v) => {
            const kinds = [...new Set(v.changes.map((c) => CHANGE[c.kind] ?? c.kind))];
            return (
              <li key={v.n} className="rounded-lg px-3 py-2.5 text-sm ring-1 ring-foreground/10">
                <div className="flex items-center justify-between gap-2">
                  <b className="font-medium">Version {v.n}</b>
                  <span className="text-muted-foreground text-xs">{WHEN.format(new Date(v.created_at))}</span>
                </div>
                <p className="mt-1 text-muted-foreground text-xs">{versionLine(v, kinds)}</p>
                {v.changes.some((c) => c.note) && (
                  <ul className="mt-1 flex flex-col gap-0.5 text-muted-foreground text-xs">
                    {[...new Set(v.changes.flatMap((c) => (c.note ? [c.note] : [])))].slice(0, 4).map((note) => (
                      <li key={note} className="truncate" title={note}>
                        {note}
                      </li>
                    ))}
                  </ul>
                )}
                {v.n !== SAVED.n && (
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    className="mt-2"
                    onClick={() => void restore(v.n, onRestored)}
                  >
                    Put this version back
                  </Button>
                )}
              </li>
            );
          })}
          <li className="rounded-lg px-3 py-2.5 text-muted-foreground text-sm ring-1 ring-foreground/10">
            <b className="font-medium text-foreground">Version 0</b>
            <p className="mt-1 text-xs">The paper as the run wrote it.</p>
          </li>
        </ol>
      </SheetContent>
    </Sheet>
  );
}

/** The toolbar over the paper. `onRestored`: a saved version was put back; the page shows it. */
export function PaperToolbar({ editor, onRestored }: { editor: Editor | null; onRestored(): void }) {
  const [history, setHistory] = useState(false);
  const [who, setWho] = useState(SHOW.who);
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            bold: e.isActive("bold"),
            italic: e.isActive("italic"),
            code: e.isActive("code"),
            sup: e.isActive("superscript"),
            sub: e.isActive("subscript"),
            editable: e.isEditable,
            undo: e.can().undo(),
            redo: e.can().redo(),
          }
        : null,
  });
  const ledger = file("EvidenceLedger.json");
  const values = (ledger?.ledger ?? []).map((v) => ({
    key: v.key,
    title: v.label || v.key,
    detail: `${v.printed} · ${v.key}`,
  }));
  const sources = (ledger?.references ?? []).map((r) => ({
    key: r.key,
    title: citeName(r.key),
    detail: r.title || r.key,
  }));
  const nums = { ...exhibitNumbers(), ...NUMS.of };
  const shown = file("Exhibits.json");
  const exhibits = [
    ...(shown?.tables ?? []).map((t) => ({ key: t.key, title: nums[t.key] ?? "Table", detail: t.caption })),
    ...(shown?.figures ?? []).map((f) => ({ key: f.key, title: nums[f.key] ?? "Figure", detail: f.caption })),
  ];
  const mark = (name: string) => () => editor?.chain().focus().toggleMark(name).run();
  // Read only (the saved paper not in yet, or a project you may only read): nothing to edit with.
  const off = !editor || !state?.editable;
  return (
    <div
      role="toolbar"
      aria-label="Edit the paper"
      className="sticky top-0 z-10 -mx-5 -mt-7 mb-8 flex flex-wrap items-center gap-0.5 rounded-t-sm border-b bg-card/95 px-3 py-1.5 font-sans text-sm leading-normal backdrop-blur sm:-mx-[20mm] sm:-mt-[22mm] sm:mb-[14mm] sm:px-6 lg:-mx-[25mm]"
    >
      <Toggle size="sm" pressed={Boolean(state?.bold)} onPressedChange={mark("bold")} disabled={off} aria-label="Bold">
        <Bold />
      </Toggle>
      <Toggle
        size="sm"
        pressed={Boolean(state?.italic)}
        onPressedChange={mark("italic")}
        disabled={off}
        aria-label="Italic"
      >
        <Italic />
      </Toggle>
      <Toggle
        size="sm"
        pressed={Boolean(state?.sup)}
        onPressedChange={mark("superscript")}
        disabled={off}
        aria-label="Superscript"
      >
        <SupIcon />
      </Toggle>
      <Toggle
        size="sm"
        pressed={Boolean(state?.sub)}
        onPressedChange={mark("subscript")}
        disabled={off}
        aria-label="Subscript"
      >
        <SubIcon />
      </Toggle>
      <Toggle size="sm" pressed={Boolean(state?.code)} onPressedChange={mark("code")} disabled={off} aria-label="Code">
        <Code />
      </Toggle>
      <Separator orientation="vertical" className="mx-1 h-5" />
      <Picker
        disabled={off}
        label="Value"
        icon={<Sigma />}
        placeholder="Find a value of the ledger"
        items={values}
        onPick={(k) => editor && insertChip(editor, "ledgerValue", { k, form: null })}
      />
      <Picker
        disabled={off}
        label="Source"
        icon={<Quote />}
        placeholder="Find a source of the paper"
        items={sources}
        onPick={(k) => editor && insertChip(editor, "cite", { keys: k, named: "" })}
      />
      <Picker
        disabled={off}
        label="Table or figure"
        icon={<Table2 />}
        placeholder="Find a table or figure"
        items={exhibits}
        onPick={(k) => editor && insertChip(editor, "exhibitRef", { k })}
      />
      <Picker
        disabled={off}
        label="For the authors"
        icon={<UserRoundPen />}
        placeholder="What only the authors can supply"
        items={SLOTS}
        onPick={(k) => editor && insertChip(editor, "authorSlot", { text: k })}
      />
      <Separator orientation="vertical" className="mx-1 h-5" />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Undo"
        disabled={!state?.undo}
        onClick={() => editor?.chain().focus().undo().run()}
      >
        <Undo2 />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Redo"
        disabled={!state?.redo}
        onClick={() => editor?.chain().focus().redo().run()}
      >
        <Redo2 />
      </Button>
      <Toggle
        size="sm"
        pressed={who}
        onPressedChange={(on) => {
          SHOW.who = on;
          setWho(on);
          editor?.view.dispatch(editor.state.tr.setMeta("addToHistory", false));
        }}
        aria-label="Show who wrote it"
        title="Mark the words you wrote or changed"
      >
        <UserPen />
        <span className="max-sm:hidden">Who wrote it</span>
      </Toggle>
      <span className="ml-auto flex items-center gap-1.5">
        <SaveState />
        <Button type="button" variant="ghost" size="sm" onClick={() => setHistory(true)} aria-label="Versions">
          <History />
          <span className={cn("max-sm:hidden")}>Versions</span>
        </Button>
      </span>
      <Versions open={history} onOpenChange={setHistory} onRestored={onRestored} />
    </div>
  );
}
