"use client";

import { useState } from "react";

import { cn } from "cn";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Flag,
  FlaskConical,
  Info,
  Lightbulb,
  type LucideIcon,
  Play,
  Plus,
  Scale,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
import type { GateKind, IntentKind, ReviewMode, RunInput } from "@/lib/run-stream/contract";
import { SHOW_DATA_STAGE, SHOW_REVIEW_MODE } from "@/lib/run-stream/features";
import { DATASET } from "@/lib/run-stream/mock/scenario";

import { MODES, PIPELINE, RUN_MODES, STAGE_SHORT, STOP_INFO, stopsFor } from "./run-meta";

const STEPS = [
  "Your question",
  ...(SHOW_DATA_STAGE ? ["Data"] : []),
  ...(SHOW_REVIEW_MODE ? ["Your involvement"] : []),
];

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

// The backend's limits for a research case.
const MIN_TOPIC = 12;
const MAX_TOPIC = 2000;
const MAX_FIELDS = 6;
const MIN_INTENT = 12;
const MAX_CONTEXT = 4000;
const MAX_ITEM = 500;
const MAX_CONSTRAINTS = 20;
const MAX_REFERENCES = 30;

/** What the researcher means to do. Exploring a dataset needs a dataset, which this form does not pick yet. */
export const INTENTS: { kind: Exclude<IntentKind, "explore_dataset">; label: string; line: string }[] = [
  { kind: "test", label: "Test a claim", line: "Check a claim you already hold." },
  { kind: "compare", label: "Compare", line: "Compare methods, conditions or groups." },
  { kind: "explain", label: "Explain", line: "Find what explains an outcome." },
];

const lines = (text: string) =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const ORDER: GateKind[] = ["charter", "scope", "screen", "hypotheses", "accept", "decision", "report", "publish"];

/** Stops a run in this mode makes: the charter, then the stage stops. */
export function stopCount(mode: ReviewMode) {
  return stopsFor(mode).length;
}

export function StopsPreview({ mode }: { mode: ReviewMode }) {
  const stops = [...stopsFor(mode)].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
  const rows = [
    ...stops.map((k) => ({ key: k, title: STOP_INFO[k].title, text: `${STOP_INFO[k].where}. ${STOP_INFO[k].what}` })),
  ];
  const perRound = stops.filter((k) => k === "hypotheses" || k === "decision").length;
  return (
    <div className="flex flex-col gap-3 rounded-xl border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <b className="font-semibold text-sm">Where this run stops for you</b>
        <span className="text-muted-foreground text-xs">
          {rows.length
            ? `${rows.length} stop${rows.length > 1 ? "s" : ""}${perRound ? `, plus ${perRound} more per extra round` : ""}`
            : "No stops"}
        </span>
      </div>
      <ol className="flex gap-1 pt-4">
        {PIPELINE.map((p) => {
          // The charter stop comes before its stage starts; the others close their stage.
          const before = stops.some((k) => k === "charter" && STOP_INFO[k].stage === p.stage);
          const after = stops.some((k) => k !== "charter" && STOP_INFO[k].stage === p.stage);
          return (
            <li key={p.stage} className="relative flex min-w-0 flex-1 flex-col gap-1.5">
              {[
                { on: before, side: "-left-1" },
                { on: after, side: "-right-2" },
              ].map(({ on, side }) => (
                <motion.span
                  key={side}
                  className={cn("absolute -top-4 text-amber-500", side)}
                  initial={false}
                  animate={{ scale: on ? 1 : 0, opacity: on ? 1 : 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 22 }}
                >
                  <Flag className="size-3.5 fill-amber-500/25" />
                </motion.span>
              ))}
              <i className="h-1 rounded-full bg-muted" />
              <span className="truncate text-[11px] text-muted-foreground">{STAGE_SHORT[p.stage]}</span>
            </li>
          );
        })}
      </ol>
      {rows.length ? (
        <ul className="flex flex-col gap-2">
          <AnimatePresence initial={false} mode="popLayout">
            {rows.map((row, i) => (
              <motion.li
                key={row.key}
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
                  <b className="font-medium">{row.title}</b>
                  <span className="block text-muted-foreground text-xs">{row.text}</span>
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

/** The parts a run cannot start without, and how the form names them when one is missing. */
type Need = "topic" | "kind" | "intent";
const NEEDS: Record<Need, string> = {
  topic: "your question",
  kind: "what the run should do",
  intent: "what you will do with the result",
};

const listed = (items: string[]) =>
  items.length > 1 ? `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}` : (items[0] ?? "");

/**
 * The research case a run starts from, within the backend's limits. Shared by the composer and the dialog; `prefix`
 * keeps the ids of the two forms apart.
 */
export function useTopicDraft(prefix: string) {
  const [topic, setTopic] = useState("");
  const [kind, setKind] = useState<IntentKind | null>(null);
  const [intent, setIntent] = useState("");
  const [context, setContext] = useState("");
  const [constraints, setConstraints] = useState("");
  const [references, setReferences] = useState("");
  const [removed, setRemoved] = useState<string[]>([]);
  const [added, setAdded] = useState<string[]>([]);
  const [newField, setNewField] = useState("");
  // Set by a start that was refused: from then on, what is missing is marked.
  const [checked, setChecked] = useState(false);
  const ids = {
    topic: `${prefix}-topic`,
    kind: `${prefix}-kind`,
    intent: `${prefix}-intent`,
    field: `${prefix}-field`,
    case: `${prefix}-case`,
  };
  const short: Record<Need, boolean> = {
    topic: topic.trim().length < MIN_TOPIC,
    kind: kind === null,
    intent: intent.trim().length < MIN_INTENT,
  };
  const missing = (Object.keys(short) as Need[]).filter((need) => short[need]);
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
  /** True when the run can start. Otherwise marks what is missing, says so and moves to the first gap. */
  const check = () => {
    if (!missing.length) return true;
    setChecked(true);
    toast.error(`Still needed: ${listed(missing.map((need) => NEEDS[need]))}.`);
    const first = missing[0];
    const target =
      first === "kind"
        ? document.querySelector<HTMLElement>(`#${ids.kind} [role="radio"]`)
        : document.getElementById(ids[first]);
    target?.focus();
    return false;
  };
  return {
    ids,
    topic,
    setTopic,
    kind,
    setKind,
    intent,
    setIntent,
    context,
    setContext,
    constraints,
    setConstraints,
    references,
    setReferences,
    fields,
    newField,
    setNewField,
    addField,
    removeField: (field: string) => {
      setRemoved((list) => [...list, field]);
      setAdded((list) => list.filter((f) => f !== field));
    },
    /** Marked once a start was refused, and only while it is still missing. */
    invalid: (need: Need) => checked && short[need],
    check,
    reset: () => {
      setTopic("");
      setKind(null);
      setIntent("");
      setContext("");
      setConstraints("");
      setReferences("");
      setRemoved([]);
      setAdded([]);
      setNewField("");
      setChecked(false);
    },
    /** What the run starts from, or null after saying why it can't start yet. */
    input: (): RunInput | null => {
      if (!check() || !kind) return null;
      if (fields.length > MAX_FIELDS) {
        toast.error(`Keep at most ${MAX_FIELDS} fields.`);
        return null;
      }
      const limits = lines(constraints);
      const refs = lines(references);
      if (limits.length > MAX_CONSTRAINTS) {
        toast.error(`Keep at most ${MAX_CONSTRAINTS} constraints.`);
        return null;
      }
      if (limits.some((line) => line.length > MAX_ITEM)) {
        toast.error(`Each constraint can be at most ${MAX_ITEM} characters.`);
        return null;
      }
      if (refs.length > MAX_REFERENCES) {
        toast.error(`Keep at most ${MAX_REFERENCES} references.`);
        return null;
      }
      if (refs.some((line) => line.length < 3 || line.length > MAX_ITEM)) {
        toast.error(`Each reference needs 3 to ${MAX_ITEM} characters.`);
        return null;
      }
      return {
        problem: topic.trim(),
        intent: { kind, text: intent.trim() },
        context: context.trim(),
        constraints: limits,
        references: refs.map((citation) => ({ citation })),
        domains: fields,
      };
    },
  };
}

type TopicDraft = ReturnType<typeof useTopicDraft>;

export function TopicInput({
  draft,
  autoFocus,
  labelClassName,
}: {
  draft: TopicDraft;
  autoFocus?: boolean;
  labelClassName?: string;
}) {
  const invalid = draft.invalid("topic");
  return (
    <Field data-invalid={invalid}>
      <FieldLabel htmlFor={draft.ids.topic} className={labelClassName}>
        What do you want to find out?
      </FieldLabel>
      <Textarea
        id={draft.ids.topic}
        value={draft.topic}
        onChange={(e) => draft.setTopic(e.target.value)}
        maxLength={MAX_TOPIC}
        aria-invalid={invalid}
        placeholder="e.g. Does more sleep go with higher exam scores among our undergraduates?"
        className="font-(family-name:--font-lora) min-h-24 text-[17px] text-foreground leading-snug placeholder:text-muted-foreground/70 md:text-[17px]"
        autoFocus={autoFocus}
      />
      <FieldDescription>One question. Popper splits it into sub-questions itself.</FieldDescription>
    </Field>
  );
}

/** How each kind of run looks: an icon, and a hue that shows only once it is chosen. */
const INTENT_LOOK: Record<string, { icon: LucideIcon; tile: string; on: string }> = {
  test: {
    icon: FlaskConical,
    tile: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    on: "border-sky-500 bg-sky-500/5 ring-1 ring-sky-500",
  },
  compare: {
    icon: Scale,
    tile: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    on: "border-violet-500 bg-violet-500/5 ring-1 ring-violet-500",
  },
  explain: {
    icon: Lightbulb,
    tile: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    on: "border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500",
  },
};

/** What the run is for: the kind of answer, and what you will do with it. Both are part of the case. */
export function IntentInput({ draft }: { draft: TopicDraft }) {
  const { ids } = draft;
  const kindInvalid = draft.invalid("kind");
  const intentInvalid = draft.invalid("intent");
  return (
    <>
      <Field data-invalid={kindInvalid}>
        <FieldLabel id={`${ids.kind}-label`}>What should the run do?</FieldLabel>
        <RadioGroup
          id={ids.kind}
          value={draft.kind ?? ""}
          onValueChange={(value) => draft.setKind(value as IntentKind)}
          aria-labelledby={`${ids.kind}-label`}
          className="grid gap-2.5 sm:grid-cols-3"
        >
          {INTENTS.map((it) => {
            const look = INTENT_LOOK[it.kind];
            const Icon = look.icon;
            const on = draft.kind === it.kind;
            return (
              <label
                key={it.kind}
                htmlFor={`${ids.kind}-${it.kind}`}
                className={cn(
                  "relative flex cursor-pointer items-start gap-3 rounded-lg border bg-background p-3 transition-[background-color,box-shadow,border-color] hover:border-foreground/25 has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                  on && look.on,
                  kindInvalid && "border-destructive/50",
                )}
              >
                <span className="sr-only">
                  <RadioGroupItem id={`${ids.kind}-${it.kind}`} value={it.kind} aria-invalid={kindInvalid} />
                </span>
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-md transition-colors",
                    on ? look.tile : "bg-muted text-muted-foreground",
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-medium text-foreground text-sm">{it.label}</span>
                  <span className="text-muted-foreground text-xs leading-snug">{it.line}</span>
                </span>
              </label>
            );
          })}
        </RadioGroup>
      </Field>
      <Field data-invalid={intentInvalid}>
        <FieldLabel htmlFor={ids.intent}>What will you do with the result?</FieldLabel>
        <Input
          id={ids.intent}
          value={draft.intent}
          onChange={(e) => draft.setIntent(e.target.value)}
          maxLength={MAX_TOPIC}
          aria-invalid={intentInvalid}
          placeholder="e.g. Decide what sleep advice to give first-year students"
          className="text-foreground placeholder:text-muted-foreground/70"
        />
        <FieldDescription>One sentence. It tells the PI what a useful answer looks like.</FieldDescription>
      </Field>
    </>
  );
}

/** The optional parts of the case, kept apart from what a run needs. None blocks the run. */
export function CaseDetailsInput({ draft }: { draft: TopicDraft }) {
  const id = draft.ids.case;
  const added = [draft.context, draft.constraints, draft.references].filter((v) => v.trim()).length;
  const [open, setOpen] = useState(false);
  const status = [
    draft.fields.length ? `${draft.fields.length} field${draft.fields.length > 1 ? "s" : ""}` : "",
    added ? `${added} of 3 details` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="-mx-1.5 flex items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-sm outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <ChevronRight className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-90")} />
          <span className="font-medium">More details</span>
          <span className="text-muted-foreground text-xs">{status || "Optional"}</span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-5 pt-4 pl-6">
        <FieldsInput draft={draft} />
        <Field>
          <FieldLabel htmlFor={`${id}-context`}>Context</FieldLabel>
          <Textarea
            id={`${id}-context`}
            value={draft.context}
            onChange={(e) => draft.setContext(e.target.value)}
            maxLength={MAX_CONTEXT}
            placeholder="Your setting, what you have tried, who the result is for"
            className="min-h-16"
          />
        </Field>
        <div className="grid gap-5 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor={`${id}-constraints`}>Constraints</FieldLabel>
            <Textarea
              id={`${id}-constraints`}
              value={draft.constraints}
              onChange={(e) => draft.setConstraints(e.target.value)}
              placeholder={"One per line, for example:\nNo studies before 2015"}
              className="min-h-16"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${id}-references`}>Papers you already know</FieldLabel>
            <Textarea
              id={`${id}-references`}
              value={draft.references}
              onChange={(e) => draft.setReferences(e.target.value)}
              placeholder={"One per line: a DOI, a URL or a title"}
              className="min-h-16"
            />
          </Field>
        </div>
        <FieldDescription>Every stage reads these. Left empty, the PI makes its own assumptions.</FieldDescription>
      </CollapsibleContent>
    </Collapsible>
  );
}

function FieldsInput({ draft }: { draft: TopicDraft }) {
  const id = draft.ids.field;
  const { fields, newField, setNewField, addField, removeField } = draft;
  return (
    <Field>
      <FieldLabel htmlFor={id}>Fields</FieldLabel>
      <div className="flex flex-wrap items-center gap-1.5">
        {fields.map((field) => (
          <span
            key={field}
            className="inline-flex h-7 items-center gap-1 rounded-md bg-muted pr-1 pl-2 font-medium text-foreground text-xs"
          >
            {field}
            <button
              type="button"
              onClick={() => removeField(field)}
              aria-label={`Remove ${field}`}
              className="grid size-5 place-items-center rounded text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
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
        Suggested from your question. They decide which sources and skills the agents use.
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
  const draft = useTopicDraft("run");
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
                  <TopicInput draft={draft} autoFocus />
                  <IntentInput draft={draft} />
                  <CaseDetailsInput draft={draft} />
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
                      {RUN_MODES.map((key) => (
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
                            {key === "light" && (
                              <span className="rounded-full bg-muted px-1.5 py-px font-medium text-[11px] text-muted-foreground">
                                Recommended
                              </span>
                            )}
                            <span className="ml-auto font-mono font-normal text-[11px] text-muted-foreground">
                              {stopCount(key) ? `${stopCount(key)} stops+` : "0 stops"}
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
            <Button onClick={() => (step > 0 || draft.check()) && move(step + 1)}>
              Next: {STEPS[step + 1]}
              <ArrowRight />
            </Button>
          ) : (
            <Button onClick={start} disabled={starting}>
              <Play />
              {starting ? "Starting…" : "Start research run"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
