"use client";

import { useState } from "react";

import { cn } from "cn";
import { ArrowRight, Check, Flag, Info, Play, Plus, Sparkles, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { GateKind, ReviewMode, RunInput } from "@/lib/run-stream/contract";
import { RUN_SOURCE, SHOW_DATA_STAGE, SHOW_REVIEW_MODE } from "@/lib/run-stream/features";
import { DATASET, SAMPLE_TOPIC } from "@/lib/run-stream/mock/scenario";

import { MODES, PIPELINE, STAGE_SHORT, STOP_INFO } from "./run-meta";

const STEPS = ["Topic", ...(SHOW_DATA_STAGE ? ["Data"] : []), ...(SHOW_REVIEW_MODE ? ["Your involvement"] : [])];

/** Fields suggested from the words of the topic. The person keeps, removes or adds to them. */
const FIELD_HINTS: [RegExp, string][] = [
  [/\b(sleep|insomnia|circadian|nap)/i, "Sleep science"],
  [/\b(exam|grade|gpa|student|undergrad|school|learning outcome|academic)/i, "Educational psychology"],
  [/\b(stress|anxiety|wellbeing|well-being|mood|depress)/i, "Psychology"],
  [/\b(survey|questionnaire|self-report)/i, "Survey statistics"],
  [/\b(neural|deep learning|transformer|federated|classifier|model training)/i, "Machine learning"],
  [/\b(distributed|asynchronous|byzantine|network|latency)/i, "Distributed systems"],
  [/\b(patient|clinical|hospital|disease|treatment)/i, "Clinical research"],
];

function suggestFields(topic: string) {
  return FIELD_HINTS.filter(([re]) => re.test(topic)).map(([, field]) => field);
}

// The backend's limits for a topic run.
const MIN_TOPIC = 12;
const MAX_TOPIC = 1000;
const MAX_FIELDS = 6;

/** What Popper derives from the topic on its own, in the Scope stage. */
const DERIVED = [
  ["Goal", "in five parts: title, problem, objective, scope, success"],
  ["Sub-questions", "that don't overlap and together cover the topic, ranked"],
  ["Topic score", "for novelty, specificity and feasibility, out of 10"],
] as const;
const ORDER: GateKind[] = ["scope", "screen", "hypotheses", "decision", "report", "publish"];

export function StopsPreview({ mode }: { mode: ReviewMode }) {
  const stops = [...MODES[mode].stops].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
  const perRound = stops.filter((k) => k === "hypotheses" || k === "decision").length;
  return (
    <div className="flex flex-col gap-3 rounded-xl border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <b className="font-semibold text-sm">Where this run stops for you</b>
        <span className="text-muted-foreground text-xs">
          {stops.length
            ? `${stops.length} stop${stops.length > 1 ? "s" : ""}${perRound ? `, plus ${perRound} more per extra round` : ""}`
            : "No stops"}
        </span>
      </div>
      <ol className="flex gap-1 pt-4">
        {PIPELINE.map((p) => {
          const on = stops.some((k) => STOP_INFO[k].stage === p.stage);
          return (
            <li key={p.stage} className="relative flex min-w-0 flex-1 flex-col gap-1.5">
              <motion.span
                className="absolute -top-4 -right-2 text-amber-500"
                initial={false}
                animate={{ scale: on ? 1 : 0, opacity: on ? 1 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 22 }}
              >
                <Flag className="size-3.5 fill-amber-500/25" />
              </motion.span>
              <i className="h-1 rounded-full bg-muted" />
              <span className="truncate text-[11px] text-muted-foreground">{STAGE_SHORT[p.stage]}</span>
            </li>
          );
        })}
      </ol>
      {stops.length ? (
        <ul className="flex flex-col gap-2">
          <AnimatePresence initial={false} mode="popLayout">
            {stops.map((k, i) => (
              <motion.li
                key={k}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-[20px_1fr] gap-2.5 text-sm"
              >
                <span className="grid size-5 place-items-center rounded-full bg-amber-500/15 font-mono font-semibold text-[11px] text-amber-800 dark:text-amber-300">
                  {i + 1}
                </span>
                <span>
                  <b className="font-medium">{STOP_INFO[k].title}</b>
                  <span className="block text-muted-foreground text-xs">
                    {STOP_INFO[k].where}. {STOP_INFO[k].what}
                  </span>
                </span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">
          The PI makes every call. You can still pause, watch, or read every decision in the activity log.
        </p>
      )}
      <p className="text-muted-foreground text-xs">
        Between stops the agents keep working. You can pause, watch, or leave; the run keeps going, and the sidebar
        shows when it needs you.
      </p>
    </div>
  );
}

/** The topic and fields a run starts from, within the backend's limits. Shared by the composer and the dialog. */
export function useTopicDraft() {
  const [topic, setTopic] = useState("");
  const [removed, setRemoved] = useState<string[]>([]);
  const [added, setAdded] = useState<string[]>([]);
  const [newField, setNewField] = useState("");
  const fields = [...new Set([...suggestFields(topic).filter((f) => !removed.includes(f)), ...added])];
  const addField = () => {
    const field = newField.trim();
    if (!field) return;
    if (field.length < 2) {
      toast.error("A field needs at least 2 characters.");
      return;
    }
    if (fields.some((f) => f.toLowerCase() === field.toLowerCase())) {
      setNewField("");
      return;
    }
    if (fields.length >= MAX_FIELDS) {
      toast.error(`Keep at most ${MAX_FIELDS} fields.`);
      return;
    }
    setAdded((list) => [...list, field]);
    setRemoved((list) => list.filter((f) => f !== field));
    setNewField("");
  };
  return {
    topic,
    setTopic,
    fields,
    newField,
    setNewField,
    addField,
    removeField: (field: string) => {
      setRemoved((list) => [...list, field]);
      setAdded((list) => list.filter((f) => f !== field));
    },
    ready: topic.trim().length >= MIN_TOPIC,
    words: topic.trim() ? topic.trim().split(/\s+/).length : 0,
    reset: () => {
      setTopic("");
      setRemoved([]);
      setAdded([]);
      setNewField("");
    },
    /** What the run starts from, or null after saying why it can't start yet. */
    input: (): RunInput | null => {
      if (fields.length > MAX_FIELDS) {
        toast.error(`Keep at most ${MAX_FIELDS} fields.`);
        return null;
      }
      return { topic: topic.trim(), domains: fields };
    },
  };
}

type TopicDraft = ReturnType<typeof useTopicDraft>;

export function TopicInput({
  draft,
  id,
  label,
  className,
  autoFocus,
}: {
  draft: TopicDraft;
  id: string;
  label: string;
  className?: string;
  autoFocus?: boolean;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id} className={className}>
        {label}
      </FieldLabel>
      <Textarea
        id={id}
        value={draft.topic}
        onChange={(e) => draft.setTopic(e.target.value)}
        maxLength={MAX_TOPIC}
        placeholder="One question you want answered, such as: does more sleep go with higher exam scores in our undergraduates?"
        className="font-(family-name:--font-lora) min-h-24 text-[17px] leading-snug md:text-[17px]"
        autoFocus={autoFocus}
      />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <FieldDescription className="min-w-0 basis-full sm:basis-0 sm:flex-1">
          Write it as one question. You don't list sub-questions; Popper derives them.
        </FieldDescription>
        {!draft.topic && (
          <Button variant="outline" size="xs" onClick={() => draft.setTopic(SAMPLE_TOPIC)}>
            Use the sample topic
          </Button>
        )}
        <span className="font-mono text-[11px] text-muted-foreground tabular-nums">{draft.words} words</span>
      </div>
      {RUN_SOURCE === "mock" && draft.topic.trim() && draft.topic.trim() !== SAMPLE_TOPIC && (
        <span className="text-muted-foreground text-xs">
          Mock stream: the run plays the sample study on sleep, whatever topic you type.
        </span>
      )}
    </Field>
  );
}

export function FieldsInput({ draft, id }: { draft: TopicDraft; id: string }) {
  const { fields, newField, setNewField, addField, removeField } = draft;
  return (
    <Field>
      <FieldLabel htmlFor={id}>Fields</FieldLabel>
      <div className="flex flex-wrap items-center gap-1.5">
        <AnimatePresence initial={false} mode="popLayout">
          {fields.map((field) => (
            <motion.span
              key={field}
              layout
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ type: "spring", stiffness: 420, damping: 26 }}
              className="inline-flex h-7 items-center gap-1 rounded-md bg-pink-500/10 pr-1 pl-2 font-medium text-pink-700 text-xs ring-1 ring-pink-500/25 dark:text-pink-300"
            >
              {field}
              <button
                type="button"
                onClick={() => removeField(field)}
                aria-label={`Remove ${field}`}
                className="grid size-5 place-items-center rounded hover:bg-pink-500/15"
              >
                <X className="size-3" />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
        <span className="flex items-center gap-1">
          <Input
            id={id}
            value={newField}
            onChange={(e) => setNewField(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addField();
              }
            }}
            placeholder="Add a field"
            maxLength={60}
            className="h-7 w-32 text-xs md:text-xs"
          />
          {newField.trim() && (
            <Button variant="ghost" size="icon-xs" onClick={addField} aria-label="Add field">
              <Plus />
            </Button>
          )}
        </span>
      </div>
      <FieldDescription>
        {fields.length
          ? "Suggested from your topic. They decide which skills and sources the agents use."
          : "Fields appear as you type. You can also add your own."}
      </FieldDescription>
    </Field>
  );
}

export function StartRunDialog({
  open,
  onOpenChange,
  defaultMode,
  onStart,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
  defaultMode: ReviewMode;
  /** The dialog shows the start as pending until this settles. */
  onStart(mode: ReviewMode, input: RunInput): void | Promise<void>;
}) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [mode, setMode] = useState<ReviewMode>(defaultMode);
  const draft = useTopicDraft();
  const [starting, setStarting] = useState(false);
  const start = async () => {
    const input = draft.input();
    if (!input) return;
    setStarting(true);
    try {
      await onStart(mode, input);
    } finally {
      setStarting(false);
    }
  };
  const move = (to: number) => {
    setDir(to > step ? 1 : -1);
    setStep(to);
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (next) {
          setStep(0);
          setMode(defaultMode);
          draft.reset();
        }
      }}
    >
      <DialogContent className="flex max-h-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="gap-1 px-5.5 pt-5">
          <DialogTitle className="text-base">Start a research run</DialogTitle>
          <DialogDescription>
            {STEPS.length > 1
              ? `${STEPS.length === 3 ? "Three" : "Two"} choices. After that the agents work on their own and only stop where you tell them to.`
              : "Type a topic. The agents take it from there, from the goal to the hypotheses, and stop once so you can check the reading list."}
          </DialogDescription>
          <ol className={cn("mt-4 flex border-b", STEPS.length === 1 && "hidden")}>
            {STEPS.map((label, i) => (
              <li
                key={label}
                className={cn(
                  "relative flex flex-1 items-center gap-2 pb-3 text-[13px]",
                  i === step ? "font-medium text-foreground" : "text-muted-foreground",
                  i > step && "max-sm:[&>span:last-child]:hidden",
                )}
              >
                <span
                  className={cn(
                    "grid size-5 place-items-center rounded-full border font-mono font-semibold text-[11px] transition-colors",
                    i < step && "border-foreground bg-foreground text-background",
                    i === step && "border-foreground",
                  )}
                >
                  {i < step ? <Check className="size-3" strokeWidth={3} /> : i + 1}
                </span>
                <span>{label}</span>
                <motion.span
                  className="absolute inset-x-0 -bottom-px h-0.5 origin-left bg-foreground"
                  initial={false}
                  animate={{ scaleX: i <= step ? 1 : 0 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                />
              </li>
            ))}
          </ol>
        </DialogHeader>
        <div className="min-h-[340px] overflow-y-auto overflow-x-hidden px-5.5 py-5">
          <AnimatePresence mode="wait" initial={false} custom={dir}>
            <motion.div
              key={step}
              custom={dir}
              initial={{ opacity: 0, x: dir * 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -18 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col gap-4.5"
            >
              {step === 0 && (
                <>
                  <TopicInput draft={draft} id="run-topic" label="Research topic" autoFocus />
                  <FieldsInput draft={draft} id="run-field" />
                  <div className="flex flex-col gap-2 rounded-xl bg-muted/60 px-4 py-3.5">
                    <span className="flex items-center gap-1.5 font-medium text-sm">
                      <Sparkles className="size-3.5 text-muted-foreground" />
                      What Popper writes from it, before any search
                    </span>
                    <ol className="flex flex-col gap-1">
                      {DERIVED.map(([what, how], i) => (
                        <li key={what} className="grid grid-cols-[18px_1fr] gap-2 text-sm">
                          <span className="font-mono text-muted-foreground text-xs leading-5">{i + 1}</span>
                          <span>
                            <b className="font-medium">{what}</b> <span className="text-muted-foreground">{how}</span>
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </>
              )}
              {STEPS[step] === "Data" && (
                <>
                  <Field>
                    <FieldLabel htmlFor="mock-dataset">Dataset</FieldLabel>
                    <Select value="dataset" disabled>
                      <SelectTrigger id="mock-dataset" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="dataset">{DATASET.name} · 8 columns</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="mock-version">Dataset version</FieldLabel>
                    <Select value="v1" disabled>
                      <SelectTrigger id="mock-version" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="v1">v1 · as uploaded · 1,240 rows</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                  <div className="grid grid-cols-[auto_1fr] gap-2.5 rounded-xl border px-3.5 py-3 text-sm">
                    <Info className="mt-0.5 size-4 text-muted-foreground" />
                    <p>
                      <b className="font-semibold">The Steward checks the data first.</b> It fixes problems in a copy
                      and saves that as v2. v1 stays exactly as uploaded, so you can always compare.
                    </p>
                  </div>
                </>
              )}
              {STEPS[step] === "Your involvement" && (
                <>
                  <Field>
                    <FieldLabel>How often should Popper stop and ask you?</FieldLabel>
                    <RadioGroup
                      value={mode}
                      onValueChange={(v) => setMode(v as ReviewMode)}
                      className="grid gap-2 sm:grid-cols-2"
                    >
                      {(Object.keys(MODES) as ReviewMode[]).map((key) => (
                        <label
                          key={key}
                          htmlFor={`mode-${key}`}
                          className={cn(
                            "grid cursor-pointer grid-cols-[auto_1fr] gap-x-2.5 gap-y-0.5 rounded-xl border px-3.5 py-3 transition-[background-color,box-shadow,border-color] hover:bg-muted/60",
                            mode === key && "border-foreground ring-1 ring-foreground",
                          )}
                        >
                          <RadioGroupItem id={`mode-${key}`} value={key} className="row-span-2 mt-0.5" />
                          <span className="flex items-center gap-2 font-semibold text-sm">
                            {MODES[key].label}
                            {key === "copilot" && (
                              <span className="rounded-full bg-muted px-1.5 py-px font-medium text-[11px] text-muted-foreground">
                                Recommended
                              </span>
                            )}
                            <span className="ml-auto font-mono font-normal text-[11px] text-muted-foreground">
                              {MODES[key].stops.length
                                ? `${MODES[key].stops.length} stop${MODES[key].stops.length > 1 ? "s" : ""}+`
                                : "0 stops"}
                            </span>
                          </span>
                          <span className="text-muted-foreground text-xs leading-snug">{MODES[key].line}</span>
                        </label>
                      ))}
                    </RadioGroup>
                  </Field>
                  <StopsPreview mode={mode} />
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
        <DialogFooter className="m-0 flex-row items-center gap-2.5 border-t bg-muted/40 px-5.5 py-3.5 sm:justify-between">
          <Button variant="outline" onClick={() => (step === 0 ? onOpenChange(false) : move(step - 1))}>
            {step === 0 ? "Cancel" : "Back"}
          </Button>
          <span className="ml-auto text-muted-foreground text-xs max-sm:hidden">
            {STEPS.length > 1 && `Step ${step + 1} of ${STEPS.length}`}
          </span>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => move(step + 1)} disabled={step === 0 && !draft.ready}>
              Next: {STEPS[step + 1]}
              <ArrowRight />
            </Button>
          ) : (
            <Button onClick={start} disabled={!draft.ready || starting}>
              <Play />
              {starting ? "Starting…" : "Start research run"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
