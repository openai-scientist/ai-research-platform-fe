"use client";

import { type ReactNode, useState } from "react";

import { cn } from "cn";
import { ArrowRight, Check, Info, TriangleAlert } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { Decision, Gate, GateAnswer, OwnFinding } from "@/lib/run-stream/contract";
import { plainNote } from "@/lib/run-stream/plain-notes";

import { AcceptReview } from "./accept-review";
import { CharterReview } from "./charter-panel";
import { ForkDiagram } from "./fork-diagram";
import { GateFrame } from "./gate-frame";
import { parseGatePrompt, parseGatePromptTokens } from "./gate-prompt";
import { RevisePicker } from "./revise-picker";
import { MODES } from "./run-meta";

const DECISIONS: Decision[] = ["proceed", "refine", "pivot"];

const asDecision = (id: string) => DECISIONS.find((d) => d === id);

function GatePromptText({ text }: { text: string }) {
  return parseGatePromptTokens(text).map((token) => {
    if (token.kind === "column") {
      return (
        <Badge
          key={`column-${token.text}`}
          variant="secondary"
          className="mr-1 bg-background align-[1px] font-mono text-foreground ring-1 ring-foreground/10"
        >
          {token.text}
        </Badge>
      );
    }
    if (token.kind === "fill-count") {
      return (
        <Badge
          key={`fill-count-${token.filled}-${token.total}`}
          variant="secondary"
          className="ml-1 bg-emerald-500/12 align-[1px] text-emerald-700 dark:text-emerald-300"
        >
          {token.filled}/{token.total} filled
        </Badge>
      );
    }
    return <span key={`text-${token.text}`}>{token.text}</span>;
  });
}

function GatePromptSectionLine({
  label,
  risk = false,
  children,
}: {
  label: string;
  risk?: boolean;
  children: ReactNode;
}) {
  return (
    <p className="text-[13px] text-muted-foreground leading-relaxed">
      {/* Inline label: Risk is the only badge; "The data shows" is implied by its value badges. */}
      {risk ? (
        <Badge
          variant="secondary"
          className="mr-1.5 bg-amber-500/15 align-[1px] text-amber-800 text-xs dark:text-amber-300"
        >
          {label}
        </Badge>
      ) : label.toLowerCase() === "the data shows" ? null : (
        <span className="font-medium text-foreground/80">{label} · </span>
      )}
      {children}
    </p>
  );
}

/** A review stop: why the run stopped, what is ready, what each choice leads to. */
/** Where a stop sits. A question from a stage engine has no fixed total: more may follow. */
function stopLabel(gate: Gate) {
  if (gate.kind !== "decision" || gate.stop_total > 1) return `Stop ${gate.stop_index} of ${gate.stop_total}`;
  return gate.stageKey === "experiment_design" ? "Question before the lock" : "Question";
}

export function GateSheet({
  gate,
  mode,
  round,
  minimized,
  onMinimize,
  onAnswer,
  onStartDrop,
  pending = false,
  readOnly = false,
  documentPreview,
}: {
  gate: Gate;
  mode: keyof typeof MODES;
  round: number;
  minimized: boolean;
  onMinimize(minimized: boolean): void;
  onAnswer(answer: GateAnswer): void;
  onStartDrop(): void;
  /** The answer is on its way; it can't be sent twice. */
  pending?: boolean;
  readOnly?: boolean;
  documentPreview?: ReactNode;
}) {
  const preferred = gate.options.find((o) => o.recommended && !o.disabled) ?? gate.options.find((o) => !o.disabled);
  const [choice, setChoice] = useState(preferred?.id ?? "");
  const [hover, setHover] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  // Items left out of a selection; everything starts picked.
  const [left, setLeft] = useState<string[]>([]);
  // Findings to send back for revision; the blocking and major ones start picked.
  const [sendBack, setSendBack] = useState<string[]>(
    () => gate.review?.findings.filter((f) => f.severity !== "minor").map((f) => f.finding_id) ?? [],
  );
  const [own, setOwn] = useState<OwnFinding[]>([]);
  const revising = choice === "revise" && Boolean(gate.review);

  const sendCount = sendBack.length + own.length;
  const option = gate.options.find((o) => o.id === choice);
  const picked = (gate.selection ?? []).filter((item) => !left.includes(item.id));
  const toggle = (id: string) => {
    if (left.includes(id)) setLeft(left.filter((x) => x !== id));
    else if (picked.length <= 1) toast.error("Keep at least one hypothesis.");
    else setLeft([...left, id]);
  };
  const shownDecision = asDecision(hover ?? choice);
  const prompt = parseGatePrompt(gate.why);

  const confirm = () => {
    if (!option || option.disabled || (option.needsText && !note.trim())) return;
    if ((gate.kind === "hypotheses" || gate.kind === "screen") && option.id === "drop") {
      onStartDrop();
      return;
    }
    if (revising) {
      if (!sendCount) {
        toast.error("Pick a finding or add one of your own to send back.");
        return;
      }
      onAnswer({
        option_id: option.id,
        findings: sendBack,
        own,
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      return;
    }
    onAnswer({
      option_id: option.id,
      ...(gate.selection && left.length ? { dropped: left } : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
    });
  };

  // The charter and the accept are documents to read before answering: they get a wider sheet of their own.
  const document = gate.kind === "charter" || gate.kind === "accept";
  if (readOnly)
    return (
      <GateFrame
        title={gate.title}
        badge="Awaiting a decision"
        minimizedLabel="Awaiting a decision"
        reopenLabel="View"
        minimized={minimized}
        onMinimize={onMinimize}
        wide={document}
      >
        {(header) => (
          <div className="flex flex-col gap-3 overflow-y-auto p-5 text-sm">
            {header}
            {gate.why && <p className="whitespace-pre-line">{gate.why}</p>}
            {gate.summary.map((line) => (
              <p key={line}>{line}</p>
            ))}
            {documentPreview}
            {gate.options.length > 0 && (
              <ul className="grid gap-1">
                {gate.options.map((choice) => (
                  <li key={choice.id}>{choice.label}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </GateFrame>
    );
  return (
    <GateFrame
      title={gate.title}
      detail={`${stopLabel(gate)} · ${MODES[mode].label} mode`}
      minimized={minimized}
      onMinimize={onMinimize}
      wide={document}
    >
      {(header) =>
        gate.kind === "charter" ? (
          <CharterReview gate={gate} header={header} pending={pending} onAnswer={onAnswer} />
        ) : gate.kind === "accept" ? (
          <AcceptReview
            gate={gate}
            header={header}
            pending={pending}
            onAnswer={onAnswer}
            documentPreview={documentPreview}
          />
        ) : gate.kind === "decision" && pending ? (
          <div className="flex flex-col gap-2 px-5 pt-4.5 pb-5 text-sm">
            {header}
            <p className="font-medium">Preparing the next question</p>
            <p className="text-muted-foreground">Your answer was sent. The agents are working out what to ask next.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3.5 overflow-y-auto px-5 pt-4.5 pb-4">
              {header}
              <div className="grid grid-cols-[auto_1fr] gap-2.5 rounded-xl bg-muted px-3 py-2.5 text-sm">
                <Info className="mt-0.5 size-4 text-muted-foreground" />
                {prompt.kind === "labelled" ? (
                  <div className="flex min-w-0 flex-col gap-2">
                    <p className="whitespace-pre-line leading-relaxed">
                      <b className="font-semibold">Why Popper stopped here.</b>{" "}
                      {prompt.question.label.toLowerCase() === "decision"
                        ? prompt.question.text
                        : `${prompt.question.label}: ${prompt.question.text}`}
                    </p>
                    {prompt.essential.map((section) => {
                      const isRisk = section.label.toLowerCase() === "risk";
                      if (gate.kind === "decision") {
                        return (
                          <GatePromptSectionLine key={section.label} label={section.label} risk={isRisk}>
                            {section.label.toLowerCase() === "the data shows" ? (
                              <GatePromptText text={section.text} />
                            ) : (
                              section.text
                            )}
                          </GatePromptSectionLine>
                        );
                      }

                      return (
                        <p key={section.label} className="flex items-start gap-1.5 text-[13px] text-muted-foreground">
                          {isRisk && (
                            <TriangleAlert
                              aria-hidden="true"
                              className="mt-0.5 size-3 shrink-0 text-muted-foreground"
                            />
                          )}
                          <span>
                            <span className="font-medium">{section.label}: </span>
                            {section.text}
                          </span>
                        </p>
                      );
                    })}
                    {prompt.more.length > 0 && (
                      <>
                        {moreOpen &&
                          (gate.kind === "decision" ? (
                            <ul
                              id={`gate-prompt-more-${gate.id}`}
                              className="flex flex-col gap-1.5 text-[13px] text-muted-foreground"
                            >
                              {prompt.more.map((section) => (
                                <li key={section.label ? `${section.label}-${section.text}` : section.text}>
                                  {section.label ? (
                                    <GatePromptSectionLine label={section.label}>{section.text}</GatePromptSectionLine>
                                  ) : (
                                    section.text
                                  )}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <div
                              id={`gate-prompt-more-${gate.id}`}
                              className="flex flex-col gap-1.5 text-[13px] text-muted-foreground"
                            >
                              {prompt.more.map((section) => (
                                <p
                                  key={section.label ? `${section.label}-${section.text}` : section.text}
                                  className="leading-snug"
                                >
                                  {section.label && (
                                    <span className="font-medium text-muted-foreground">{section.label}: </span>
                                  )}
                                  {section.text}
                                </p>
                              ))}
                            </div>
                          ))}
                        <button
                          type="button"
                          aria-expanded={moreOpen}
                          aria-controls={moreOpen ? `gate-prompt-more-${gate.id}` : undefined}
                          className="mt-0.5 w-fit self-start rounded-sm font-medium text-muted-foreground text-xs underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                          onClick={() => setMoreOpen(!moreOpen)}
                        >
                          {moreOpen ? "Show less" : "Read more"}
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex min-w-0 flex-col gap-2">
                    {prompt.paragraphs.map((paragraph, index) => (
                      <p key={index} className="whitespace-pre-line leading-relaxed">
                        {index === 0 && <b className="font-semibold">Why Popper stopped here.</b>}
                        {index === 0 ? " " : null}
                        {paragraph}
                      </p>
                    ))}
                  </div>
                )}
              </div>
              {gate.needsYou?.length ? <NeedsYouList items={gate.needsYou} /> : null}
              {shownDecision ? (
                <ForkDiagram choice={shownDecision} round={round} className="max-w-[520px]" />
              ) : (
                gate.summary.length > 0 && (
                  <ul className="flex flex-col gap-1.5 text-sm">
                    {gate.summary.map((line) => (
                      <li key={line} className="flex items-start gap-2">
                        <Check className="mt-1 size-3.5 shrink-0 text-emerald-600" />
                        {line}
                      </li>
                    ))}
                  </ul>
                )
              )}
              {gate.selection ? (
                <fieldset className="flex flex-col gap-1.5">
                  <legend className="mb-1.5 flex w-full items-baseline justify-between gap-2 text-xs">
                    <span className="font-medium">Take forward</span>
                    <span className="text-muted-foreground tabular-nums">
                      {picked.length} of {gate.selection.length} picked
                    </span>
                  </legend>
                  {gate.selection.map((item) => {
                    const on = !left.includes(item.id);
                    return (
                      <label
                        key={item.id}
                        htmlFor={`pick-${item.id}`}
                        className={cn(
                          "grid cursor-pointer grid-cols-[auto_auto_minmax(0,1fr)] items-start gap-x-3 rounded-xl border px-3.5 py-2.5 text-sm transition-colors hover:bg-muted/60",
                          on ? "border-foreground/15" : "border-dashed",
                        )}
                      >
                        <Checkbox
                          id={`pick-${item.id}`}
                          checked={on}
                          onCheckedChange={() => toggle(item.id)}
                          className="mt-0.5"
                        />
                        <span
                          className={cn(
                            "inline-flex h-5 items-center rounded-md px-1.5 font-mono font-semibold text-[11px] transition-colors",
                            on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                          )}
                        >
                          {item.id}
                        </span>
                        <span
                          className={cn("leading-snug transition-colors", !on && "text-muted-foreground line-through")}
                        >
                          {item.label}
                        </span>
                      </label>
                    );
                  })}
                </fieldset>
              ) : (
                <RadioGroup value={choice} onValueChange={setChoice} className="gap-2" aria-label={gate.title}>
                  {gate.options.map((o) => (
                    <label
                      key={o.id}
                      htmlFor={`gate-${o.id}`}
                      onMouseEnter={() => !o.disabled && setHover(o.id)}
                      onMouseLeave={() => setHover(null)}
                      className={cn(
                        "grid cursor-pointer grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-xl border px-3.5 py-3 transition-[background-color,border-color,box-shadow] hover:bg-muted/60",
                        choice === o.id && "border-foreground ring-1 ring-foreground",
                        o.disabled && "cursor-not-allowed opacity-50",
                      )}
                    >
                      <RadioGroupItem
                        id={`gate-${o.id}`}
                        value={o.id}
                        disabled={o.disabled}
                        className="row-span-3 mt-0.5"
                      />
                      <span className="flex flex-wrap items-center gap-2 font-semibold text-sm">
                        {o.label}
                        {o.recommended && (
                          <span className="rounded-full bg-muted px-1.5 py-px font-medium text-[11px] text-muted-foreground">
                            PI recommends
                          </span>
                        )}
                      </span>
                      <span className="flex flex-col gap-1">
                        <span className="text-muted-foreground text-xs">{o.description}</span>
                        {o.disabled && (
                          <span className="text-amber-800 text-xs dark:text-amber-300">
                            {o.disabledReason ?? "This choice is not available right now."}
                          </span>
                        )}
                      </span>

                      <span className="flex items-center gap-1.5 text-xs">
                        <ArrowRight className="size-3 text-muted-foreground" />
                        {o.leads_to}
                      </span>
                    </label>
                  ))}
                </RadioGroup>
              )}
              {revising && gate.review && (
                <RevisePicker review={gate.review} picked={sendBack} onPick={setSendBack} own={own} onOwn={setOwn} />
              )}
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  option?.needsText
                    ? option.id === "send_back"
                      ? "Required: what should change?"
                      : "Type your answer"
                    : "Optional: a note for the agents, kept with your decision"
                }
                aria-label={
                  option?.needsText
                    ? option.id === "send_back"
                      ? "Note to send back"
                      : "Your answer"
                    : "Note for the agents"
                }
              />
            </div>
            <div className="flex items-center gap-3 border-t bg-popover px-5 py-3.5">
              <span className="flex-1 text-muted-foreground text-xs">Nothing runs until you confirm.</span>
              <Button
                onClick={confirm}
                disabled={!option || option.disabled || pending || (option.needsText && !note.trim())}
              >
                {pending
                  ? "Sending…"
                  : gate.selection
                    ? `${option?.confirm_label ?? "Confirm"} ${picked.length}`
                    : revising
                      ? `${option?.confirm_label ?? "Send back"} ${sendCount}`
                      : (option?.confirm_label ?? "Confirm")}
              </Button>
            </div>
          </>
        )
      }
    </GateFrame>
  );
}

export function DropBar({
  kept,
  total,
  noun,
  keepable = 0,
  restored = 0,
  onReset,
  onApprove,
  pending = false,
}: {
  kept: number;
  total: number;
  /** What is being dropped, such as "hypothesis in the set" or "paper in the shortlist". */
  noun: string;
  /** Set-aside ideas the person may keep, and how many they picked. */
  keepable?: number;
  restored?: number;
  onReset(): void;
  onApprove(): void;
  pending?: boolean;
}) {
  return (
    <motion.div
      initial={{ y: 24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 24, opacity: 0 }}
      className="absolute bottom-4 left-1/2 z-30 flex w-[min(640px,calc(100%-2rem))] -translate-x-1/2 flex-wrap items-center gap-2.5 rounded-2xl bg-primary py-3 pr-3 pl-4 text-primary-foreground text-sm shadow-2xl"
    >
      <span className="min-w-40 flex-1">
        <b className="font-semibold">Click a {noun} to drop it.</b>{" "}
        {keepable > 0 && <>Click a set-aside idea to keep it anyway. </>}
        {kept} kept{restored > 0 ? `, ${restored} of them set aside before` : ` of ${total}`}.
      </span>
      <Button
        size="sm"
        variant="ghost"
        className="text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground"
        onClick={onReset}
        disabled={pending}
      >
        Undo all
      </Button>
      <Button size="sm" variant="secondary" onClick={onApprove} disabled={pending}>
        {pending ? "Sending…" : `Approve ${kept}`}
      </Button>
    </motion.div>
  );
}

/** The checks still open at a stage review, in plain words, beside the answer they need. */
function NeedsYouList({ items }: { items: NonNullable<Gate["needsYou"]> }) {
  return (
    <section
      aria-label="Needs you"
      className="grid gap-2 rounded-xl border border-amber-500/30 bg-amber-500/8 px-3 py-2.5 text-sm"
    >
      <b className="font-semibold">Still open, and waiting for you</b>
      <ul className="grid gap-2">
        {items.map((item) => (
          <li key={item.id} className="grid gap-0.5">
            <span className="font-medium">{plainNote(item.question)}</span>
            {item.why && <span className="text-muted-foreground text-xs">{plainNote(item.why)}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}
