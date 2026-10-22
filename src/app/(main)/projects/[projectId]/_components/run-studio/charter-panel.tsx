"use client";

import { type ReactNode, useEffect, useState } from "react";

import { cn } from "cn";
import {
  Check,
  ChevronDown,
  CircleCheck,
  Minus,
  NotebookPen,
  OctagonX,
  Pencil,
  Plus,
  RotateCw,
  Scale,
  Target,
} from "lucide-react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { type ApiQueryOptions, useApiQuery } from "@/hooks/use-api";
import { projectKeys } from "@/lib/api/query-keys";
import { fetchRuns } from "@/lib/api/services/fetch-runs";
import type { Charter, Gate, GateAnswer } from "@/lib/run-stream/contract";

import { PiAdviceCard } from "./pi-advice";
import { useWorkspace } from "./workspace-context";

type Consultations = Awaited<ReturnType<typeof fetchRuns.getConsultations>>;

type ListField = "objectives" | "scope_in" | "scope_out" | "success_criteria" | "kill_criteria" | "constraints";

/** The lists of a charter, in reading order, each with how it reads and looks. */
const LISTS: {
  key: ListField;
  title: string;
  hint: string;
  icon: typeof Target;
  tone: string;
  required?: boolean;
}[] = [
  {
    key: "objectives",
    title: "Objectives",
    hint: "What the run must deliver.",
    icon: Target,
    tone: "text-foreground",
    required: true,
  },
  {
    key: "success_criteria",
    title: "Success when",
    hint: "How you judge it worked, whatever the result.",
    icon: CircleCheck,
    tone: "text-emerald-600 dark:text-emerald-400",
    required: true,
  },
  {
    key: "scope_in",
    title: "Covers",
    hint: "What the run takes on.",
    icon: Plus,
    tone: "text-sky-600 dark:text-sky-400",
  },
  {
    key: "scope_out",
    title: "Leaves out",
    hint: "What it leaves out on purpose.",
    icon: Minus,
    tone: "text-muted-foreground",
  },
  {
    key: "kill_criteria",
    title: "Stops the run if",
    hint: "What would end the run early.",
    icon: OctagonX,
    tone: "text-rose-600 dark:text-rose-400",
  },
  {
    key: "constraints",
    title: "Constraints",
    hint: "Limits every stage keeps to.",
    icon: Scale,
    tone: "text-amber-600 dark:text-amber-400",
  },
];

const EMPTY: Charter = {
  question: "",
  motivation: "",
  objectives: [],
  scope_in: [],
  scope_out: [],
  success_criteria: [],
  kill_criteria: [],
  constraints: [],
  risk_posture: "exploratory",
};

const POSTURE: Record<Charter["risk_posture"], { label: string; text: string }> = {
  exploratory: { label: "Exploratory", text: "Looks for promising directions; nothing is fixed in advance." },
  confirmatory: { label: "Confirmatory", text: "Tests a claim fixed in advance, like a pre-registration." },
};

/** Items a list shows before "Show all". */
const FOLDED = 3;

/** What is missing before the charter can be saved, or null. */
export function charterProblem(charter: Charter): string | null {
  if (!charter.question.trim()) return "Write the question the run sets out to answer.";
  if (!charter.objectives.length) return "Add at least one objective.";
  if (!charter.success_criteria.length) return "Add at least one success criterion.";
  return null;
}

/** Every consultation of the run with the PI, with its result once it has one. */
export function useConsultations(options?: ApiQueryOptions<Consultations>) {
  const { session } = useWorkspace();
  return useApiQuery(
    [...projectKeys.run(session.projectId, session.runId), "pi", "consultations"],
    (signal) => fetchRuns.getConsultations(session.projectId, session.runId, signal),
    options,
  );
}

/** The charter the PI drafted for this consultation, once it has one. */
function useDraft(consultationId: string) {
  const query = useConsultations();
  const charter = query.data?.data.find((c) => c.id === consultationId)?.result?.decision?.charter ?? null;
  return { pending: query.isPending, charter };
}

/**
 * How each list reads in the protocol: the name research gives it, the letter its items are numbered with (so a note or
 * a later stage can cite "E2"), and the noun its count takes.
 */
const PROTOCOL: Record<ListField, { name: string; prefix: string; one: string; many: string }> = {
  objectives: { name: "Aims", prefix: "A", one: "aim", many: "aims" },
  success_criteria: { name: "Success criteria", prefix: "S", one: "criterion", many: "criteria" },
  scope_in: { name: "Inclusion", prefix: "I", one: "included", many: "included" },
  scope_out: { name: "Exclusion", prefix: "E", one: "excluded", many: "excluded" },
  kill_criteria: { name: "Stopping rules", prefix: "R", one: "rule", many: "rules" },
  constraints: { name: "Constraints", prefix: "C", one: "constraint", many: "constraints" },
};

/** Ink settling on paper: no bounce, no slide. */
const INK = [0.22, 1, 0.36, 1] as const;
/** Seconds between lines as they are set. */
const LINE_STEP = 0.06;

/** A hairline that draws itself from the left. */
function Rule({ delay, className }: { delay: number; className?: string }) {
  return (
    <motion.span
      aria-hidden
      initial={{ scaleX: 0 }}
      animate={{ scaleX: 1 }}
      transition={{ delay, duration: 0.7, ease: INK }}
      className={cn("block h-px origin-left bg-foreground/15", className)}
    />
  );
}

/** One numbered line of the protocol. Its id is in the margin; clicking it copies the line, to cite it in a note. */
function ProtocolLine({ id, text, delay, tone }: { id: string; text: string; delay: number; tone?: string }) {
  const copy = () =>
    navigator.clipboard.writeText(`${id}: ${text}`).then(
      () => toast.success(`Copied ${id}.`),
      () => toast.error("Could not copy to the clipboard."),
    );
  return (
    // No layout animation: inside the sheet's own scroll it places lines at the wrong height while others come or go.
    // A line that folds away gives back its height instead.
    <motion.li
      initial={{ opacity: 0, clipPath: "inset(0 0 100% 0)" }}
      animate={{ opacity: 1, clipPath: "inset(0 0 0% 0)" }}
      exit={{ opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0, transition: { duration: 0.22, ease: INK } }}
      transition={{ delay, duration: 0.55, ease: INK }}
      className="group/line relative grid grid-cols-[2.25rem_minmax(0,1fr)] items-baseline py-[3px]"
    >
      {/* A mark of ink in the margin for the line under the pointer. */}
      <span
        aria-hidden
        className="absolute top-1 bottom-1 left-[1.85rem] w-px origin-top scale-y-0 bg-foreground transition-transform duration-300 ease-out group-hover/line:scale-y-100"
      />
      <motion.button
        type="button"
        onClick={() => void copy()}
        title={`Copy ${id}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: Math.max(0, delay - 0.08), duration: 0.3 }}
        className={cn(
          "w-fit rounded-sm font-mono text-[11px] tabular-nums tracking-tight transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          tone ?? "text-muted-foreground",
        )}
      >
        {id}
      </motion.button>
      <span className="text-pretty text-[13.5px] text-foreground/85 leading-relaxed transition-colors group-hover/line:text-foreground">
        {text}
      </span>
    </motion.li>
  );
}

/** The numbered lines of one list: the first few, and the rest on demand, named by their ids ("Show A4–A5"). */
function ProtocolLines({
  field,
  items,
  delay,
  tone,
}: {
  field: ListField;
  items: string[];
  delay: number;
  tone?: string;
}) {
  const [open, setOpen] = useState(false);
  const { prefix } = PROTOCOL[field];
  const shown = open ? items : items.slice(0, FOLDED);
  const rest = items.length - FOLDED;
  const range = rest === 1 ? `${prefix}${items.length}` : `${prefix}${FOLDED + 1}–${prefix}${items.length}`;
  if (!items.length) return <p className="pl-9 text-[13px] text-muted-foreground italic">None stated.</p>;
  return (
    <div className="flex flex-col">
      <ol>
        <AnimatePresence initial>
          {shown.map((item, i) => (
            <ProtocolLine
              // biome-ignore lint/suspicious/noArrayIndexKey: a list may repeat an item; its place tells them apart.
              key={`${i}:${item}`}
              id={`${prefix}${i + 1}`}
              text={item}
              tone={tone}
              delay={open && i >= FOLDED ? (i - FOLDED) * LINE_STEP : delay + i * LINE_STEP}
            />
          ))}
        </AnimatePresence>
      </ol>
      {rest > 0 && (
        <motion.button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay + Math.min(items.length, FOLDED) * LINE_STEP + 0.35, duration: 0.3 }}
          className="mt-0.5 ml-9 inline-flex w-fit items-center gap-1 font-mono text-[11px] text-muted-foreground underline decoration-foreground/20 underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground/60"
        >
          {open ? "Fold" : `Show ${range}`}
          <ChevronDown className={cn("size-3 transition-transform duration-300", open && "rotate-180")} />
        </motion.button>
      )}
    </div>
  );
}

/** A numbered section of the protocol: "§3 Eligibility", its rule, and what it holds. */
function ProtocolSection({
  n,
  title,
  note,
  count,
  delay,
  children,
}: {
  n: number;
  title: string;
  note: string;
  count: string;
  delay: number;
  children: ReactNode;
}) {
  return (
    <section aria-label={title} className="flex flex-col gap-2">
      <motion.header
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay, duration: 0.4 }}
        className="grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-baseline"
      >
        <span className="font-mono text-[11px] text-muted-foreground">§{n}</span>
        <h4 className="min-w-0">
          <span className="font-(family-name:--font-lora) font-semibold text-[16px]">{title}</span>
          <span className="ml-2 text-muted-foreground text-xs italic max-sm:hidden">{note}</span>
        </h4>
        <span className="font-mono text-[11px] text-muted-foreground tabular-nums">{count}</span>
      </motion.header>
      <Rule delay={delay + 0.05} />
      {children}
    </section>
  );
}

const counted = (field: ListField, items: string[]) =>
  `${items.length} ${items.length === 1 ? PROTOCOL[field].one : PROTOCOL[field].many}`;

/** Two lists set side by side under one section, each with its own small heading; one above the other when narrow. */
function Columns({
  pair,
  charter,
  delay,
  tones = [],
}: {
  pair: [ListField, ListField];
  charter: Charter;
  delay: number;
  tones?: (string | undefined)[];
}) {
  return (
    <div className="grid gap-y-3 sm:grid-cols-2">
      {pair.map((field, k) => (
        <motion.div
          key={field}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay - 0.1 + k * 0.1, duration: 0.4 }}
          className={cn("flex min-w-0 flex-col gap-1", k === 1 && "sm:border-l sm:pl-4")}
        >
          <span className="pl-9 font-medium text-[11px] text-muted-foreground uppercase tracking-[0.12em]">
            {PROTOCOL[field].name}
            <span className="ml-1.5 font-mono normal-case tracking-normal">{charter[field]?.length ?? 0}</span>
          </span>
          <ProtocolLines field={field} items={charter[field] ?? []} delay={delay + k * 0.1} tone={tones[k]} />
        </motion.div>
      ))}
    </div>
  );
}

/**
 * The charter to read, set as a research protocol: the question, then numbered sections with every line numbered, so a
 * note can cite "A2" or "E3". Sections are set one after another, each rule drawn before its lines.
 */
function CharterDocument({ charter }: { charter: Charter }) {
  const [why, setWhy] = useState(false);
  const posture = POSTURE[charter.risk_posture] ?? POSTURE.exploratory;
  const profile = [charter.profile?.domain, charter.profile?.research_type].filter(Boolean);
  const list = (field: ListField) => charter[field] ?? [];
  const STEP = 0.16;
  return (
    <MotionConfig reducedMotion="user">
      <article className="flex flex-col gap-6">
        <header className="flex flex-col gap-2.5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 font-medium text-[11px] text-muted-foreground uppercase tracking-[0.14em]">
            <span>
              Research protocol
              <span className="normal-case tracking-normal"> · drafted by the PI</span>
            </span>
            <span title={posture.text} className="flex flex-wrap gap-x-2 normal-case tracking-normal">
              <span className="font-semibold text-foreground">{posture.label}</span>
              {profile.map((p) => (
                <span key={p}>· {p}</span>
              ))}
            </span>
          </div>
          <Rule delay={0} className="bg-foreground/60" />
          <p className="font-(family-name:--font-lora) text-balance pt-1 text-[20px] leading-snug">
            {charter.question}
          </p>
          <p className="text-muted-foreground text-xs italic">{posture.text}</p>
          {charter.motivation && (
            <div className="text-[13px] leading-relaxed">
              <p className={cn("text-pretty text-foreground/80", !why && "line-clamp-2")}>
                <b className="font-(family-name:--font-lora) font-semibold text-foreground italic">Rationale. </b>
                {charter.motivation}
              </p>
              <button
                type="button"
                onClick={() => setWhy(!why)}
                className="mt-0.5 font-medium text-muted-foreground text-xs underline-offset-4 hover:text-foreground hover:underline"
              >
                {why ? "Show less" : "Read more"}
              </button>
            </div>
          )}
        </header>
        <ProtocolSection
          n={1}
          title="Aims"
          note="what the run must deliver"
          count={counted("objectives", list("objectives"))}
          delay={STEP}
        >
          <ProtocolLines field="objectives" items={list("objectives")} delay={STEP + 0.2} />
        </ProtocolSection>
        <ProtocolSection
          n={2}
          title="Success criteria"
          note="how the run is judged, whatever the result"
          count={counted("success_criteria", list("success_criteria"))}
          delay={STEP * 2}
        >
          <ProtocolLines field="success_criteria" items={list("success_criteria")} delay={STEP * 2 + 0.2} />
        </ProtocolSection>
        <ProtocolSection
          n={3}
          title="Eligibility"
          note="what the run takes on, and leaves out on purpose"
          count={`${list("scope_in").length} in · ${list("scope_out").length} out`}
          delay={STEP * 3}
        >
          <Columns pair={["scope_in", "scope_out"]} charter={charter} delay={STEP * 3 + 0.2} />
        </ProtocolSection>
        <ProtocolSection
          n={4}
          title="Stopping rules and constraints"
          note="what ends the run early, and the limits every stage keeps"
          count={`${counted("kill_criteria", list("kill_criteria"))} · ${counted("constraints", list("constraints"))}`}
          delay={STEP * 4}
        >
          <Columns
            pair={["kill_criteria", "constraints"]}
            charter={charter}
            delay={STEP * 4 + 0.2}
            tones={["text-rose-600 dark:text-rose-400"]}
          />
        </ProtocolSection>
      </article>
    </MotionConfig>
  );
}

const lines = (text: string) =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

/** One list of the charter as a text box, one item per line. The text stays as typed until it is saved. */
function ListEditor({
  list,
  value,
  onChange,
}: {
  list: (typeof LISTS)[number];
  value: Charter;
  onChange(charter: Charter): void;
}) {
  const id = `charter-${list.key}`;
  const Icon = list.icon;
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id} className="gap-1.5">
        <Icon className={cn("size-3.5", list.tone)} />
        {list.title}
        {list.required && <span className="font-normal text-muted-foreground">· required</span>}
        <span className="ml-auto font-normal text-muted-foreground text-xs tabular-nums">{value[list.key].length}</span>
      </Label>
      <Textarea
        id={id}
        defaultValue={value[list.key].join("\n")}
        onChange={(e) => onChange({ ...value, [list.key]: lines(e.target.value) })}
        className="min-h-28 text-[13px] leading-snug"
      />
      <span className="text-muted-foreground text-xs">{list.hint} One per line.</span>
    </div>
  );
}

function CharterEditor({ value, onChange }: { value: Charter; onChange(charter: Charter): void }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="charter-question">
          Question <span className="font-normal text-muted-foreground">· required</span>
        </Label>
        <Textarea
          id="charter-question"
          value={value.question}
          onChange={(e) => onChange({ ...value, question: e.target.value })}
          className="font-(family-name:--font-lora) min-h-20 text-[16px] leading-snug"
        />
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-medium text-sm">Posture</legend>
        <RadioGroup
          value={value.risk_posture}
          onValueChange={(v) => onChange({ ...value, risk_posture: v as Charter["risk_posture"] })}
          className="grid gap-2 sm:grid-cols-2"
        >
          {(Object.keys(POSTURE) as Charter["risk_posture"][]).map((key) => (
            <Label
              key={key}
              htmlFor={`posture-${key}`}
              className={cn(
                "flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 font-normal transition-colors hover:bg-muted/60",
                value.risk_posture === key && "border-foreground ring-1 ring-foreground",
              )}
            >
              <RadioGroupItem id={`posture-${key}`} value={key} className="mt-0.5" />
              <span className="flex flex-col gap-0.5">
                <b className="font-semibold text-sm">{POSTURE[key].label}</b>
                <span className="text-muted-foreground text-xs leading-snug">{POSTURE[key].text}</span>
              </span>
            </Label>
          ))}
        </RadioGroup>
      </fieldset>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="charter-motivation">Why it matters</Label>
        <Textarea
          id="charter-motivation"
          value={value.motivation}
          onChange={(e) => onChange({ ...value, motivation: e.target.value })}
          className="min-h-20 text-[13px] leading-relaxed"
        />
      </div>
      <div className="grid gap-x-6 gap-y-5 border-t pt-5 sm:grid-cols-2">
        {LISTS.map((list) => (
          <ListEditor key={list.key} list={list} value={value} onChange={onChange} />
        ))}
      </div>
    </div>
  );
}

/** A note kept with the answer, behind a link until it is wanted. */
export function NoteField({ value, onChange }: { value: string; onChange(note: string): void }) {
  const [open, setOpen] = useState(Boolean(value));
  if (!open)
    return (
      <Button variant="ghost" size="sm" className="w-fit text-muted-foreground" onClick={() => setOpen(true)}>
        <NotebookPen />
        Add a note
      </Button>
    );
  return (
    <Input
      autoFocus
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="A note for the agents, kept with your decision"
      aria-label="Note for the agents"
    />
  );
}

/**
 * The charter stop: the PI's plan to read and endorse, or to rewrite before the run starts. When the PI could not draft
 * it, you ask again or write it yourself.
 */
export function CharterReview({
  gate,
  header,
  pending,
  onAnswer,
}: {
  gate: Gate;
  /** The sheet's own header: whose turn it is, the stop, the title. */
  header: ReactNode;
  pending: boolean;
  onAnswer(answer: GateAnswer): void;
}) {
  const failed = gate.options.some((o) => o.id === "retry");
  const draft = useDraft(gate.id);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState<Charter | null>(null);
  const [note, setNote] = useState("");
  // The form starts from the PI's draft, or empty when there is none.
  useEffect(() => {
    if (editing && !draft.pending && value === null) setValue(draft.charter ?? EMPTY);
  }, [editing, draft.pending, draft.charter, value]);
  const extra = note.trim() ? { note: note.trim() } : {};
  const save = () => {
    if (!value) return;
    const problem = charterProblem(value);
    if (problem) {
      toast.error(problem);
      return;
    }
    onAnswer({ option_id: failed ? "write" : "edit", charter: value, ...extra });
  };

  return (
    <>
      <div className="flex flex-col gap-4 overflow-y-auto px-5 pt-4.5 pb-5 sm:px-6">
        {header}
        {editing ? (
          <p className="text-muted-foreground text-sm">
            {failed
              ? "Write the plan the run is judged against. Fill in at least the question, one objective and one success criterion."
              : "Your version replaces the PI's. Lists take one item per line."}
          </p>
        ) : failed ? (
          <p className="rounded-lg bg-muted px-3.5 py-3 text-sm">{gate.why}</p>
        ) : (
          <>
            <p className="text-muted-foreground text-sm">{gate.why}</p>
            {gate.advice && <PiAdviceCard advice={gate.advice} headline="Why the PI drafted it this way" />}
          </>
        )}
        {draft.pending && !failed ? (
          <div className="flex flex-col gap-3 py-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-11/12" />
            <Skeleton className="h-6 w-3/5" />
            <div className="grid gap-4 pt-3 sm:grid-cols-2">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          </div>
        ) : editing && value ? (
          <CharterEditor value={value} onChange={setValue} />
        ) : (
          !failed && draft.charter && <CharterDocument charter={draft.charter} />
        )}
        <NoteField value={note} onChange={setNote} />
      </div>
      <footer className="flex flex-wrap items-center justify-end gap-2.5 border-t bg-popover px-5 py-3.5 sm:px-6 max-sm:[&>button]:flex-1">
        <span className="mr-auto text-muted-foreground text-xs max-sm:hidden">Nothing runs until you answer.</span>
        {editing ? (
          <>
            <Button variant="ghost" onClick={() => setEditing(false)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={save} disabled={pending || !value}>
              <Check />
              {pending ? "Saving…" : "Save and start"}
            </Button>
          </>
        ) : failed ? (
          <>
            <Button variant="outline" onClick={() => setEditing(true)} disabled={pending}>
              <Pencil />
              Write it yourself
            </Button>
            <Button onClick={() => onAnswer({ option_id: "retry" })} disabled={pending}>
              <RotateCw />
              {pending ? "Asking…" : "Ask the PI again"}
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={() => setEditing(true)} disabled={pending || !draft.charter}>
              <Pencil />
              Edit the plan
            </Button>
            <Button onClick={() => onAnswer({ option_id: "endorse", ...extra })} disabled={pending || !draft.charter}>
              <Check />
              {pending ? "Endorsing…" : "Endorse the plan"}
            </Button>
          </>
        )}
      </footer>
    </>
  );
}
