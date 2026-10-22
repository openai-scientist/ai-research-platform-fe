"use client";

import { useEffect, useState } from "react";

import { cn } from "cn";
import { ArrowRight, Check, ChevronDown, ChevronUp, Info } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { Decision, Gate, GateAnswer, OwnFinding } from "@/lib/run-stream/contract";

import { AcceptReview } from "./accept-review";
import { CharterReview } from "./charter-panel";
import { ForkDiagram } from "./fork-diagram";
import { RevisePicker } from "./revise-picker";
import { PulseDot } from "./run-bits";
import { MODES } from "./run-meta";

const DECISIONS: Decision[] = ["proceed", "refine", "pivot"];

const asDecision = (id: string) => DECISIONS.find((d) => d === id);

/** A review stop: why the run stopped, what is ready, what each choice leads to. */
export function GateSheet({
  gate,
  mode,
  round,
  minimized,
  onMinimize,
  onAnswer,
  onStartDrop,
  pending = false,
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
}) {
  const preferred = gate.options.find((o) => o.recommended && !o.disabled) ?? gate.options.find((o) => !o.disabled);
  const [choice, setChoice] = useState(preferred?.id ?? "");
  const [hover, setHover] = useState<string | null>(null);
  const [note, setNote] = useState("");
  // Items left out of a selection; everything starts picked.
  const [left, setLeft] = useState<string[]>([]);
  // Findings to send back for revision; the blocking and major ones start picked.
  const [sendBack, setSendBack] = useState<string[]>(
    () => gate.review?.findings.filter((f) => f.severity !== "minor").map((f) => f.finding_id) ?? [],
  );
  const [own, setOwn] = useState<OwnFinding[]>([]);
  const revising = choice === "revise" && Boolean(gate.review);

  // Escape hides the sheet like "Hide to look at the work"; a menu or dialog open over it closes first.
  useEffect(() => {
    if (minimized) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (window.document.querySelector("[data-radix-popper-content-wrapper], [role='dialog'][data-state='open']"))
        return;
      onMinimize(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [minimized, onMinimize]);
  const sendCount = sendBack.length + own.length;
  const option = gate.options.find((o) => o.id === choice);
  const picked = (gate.selection ?? []).filter((item) => !left.includes(item.id));
  const toggle = (id: string) => {
    if (left.includes(id)) setLeft(left.filter((x) => x !== id));
    else if (picked.length <= 1) toast.error("Keep at least one hypothesis.");
    else setLeft([...left, id]);
  };
  const shownDecision = asDecision(hover ?? choice);

  if (minimized)
    return (
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="absolute bottom-4 left-1/2 z-30 flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-3 whitespace-nowrap rounded-full bg-card py-1.5 pr-1.5 pl-4 text-sm shadow-lg ring-1 ring-amber-500/60"
      >
        <PulseDot className="bg-amber-500" />
        <span className="truncate">
          <b className="font-semibold">Waiting for you:</b> {gate.title}
        </span>
        <Button size="sm" onClick={() => onMinimize(false)}>
          <ChevronUp />
          Answer
        </Button>
      </motion.div>
    );

  const confirm = () => {
    if (!option || option.disabled) return;
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
  const header = (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex h-6 items-center gap-2 rounded-full bg-amber-500/15 px-2.5 font-medium text-amber-800 text-xs dark:text-amber-300">
          <PulseDot className="bg-amber-500" />
          Your turn
        </span>
        <span className="text-muted-foreground text-xs">
          Stop {gate.stop_index} of {gate.stop_total} · {MODES[mode].label} mode
        </span>
        <Button variant="ghost" size="sm" className="ml-auto" onClick={() => onMinimize(true)}>
          <ChevronDown />
          Hide to look at the work
        </Button>
      </div>
      <h3 className="font-semibold text-lg tracking-tight">{gate.title}</h3>
    </>
  );

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 z-20 bg-black/25 dark:bg-black/50"
      />
      <motion.div
        role="dialog"
        aria-label={gate.title}
        initial={{ y: "110%" }}
        animate={{ y: 0 }}
        exit={{ y: "110%" }}
        transition={{ type: "spring", stiffness: 260, damping: 30 }}
        className={cn(
          "absolute inset-x-4 bottom-4 z-30 mx-auto flex max-h-[calc(100%-2rem)] flex-col overflow-hidden rounded-2xl bg-popover text-popover-foreground shadow-2xl ring-1 ring-foreground/10",
          document ? "max-w-[880px]" : "max-w-[700px]",
        )}
      >
        {gate.kind === "charter" ? (
          <CharterReview gate={gate} header={header} pending={pending} onAnswer={onAnswer} />
        ) : gate.kind === "accept" ? (
          <AcceptReview gate={gate} header={header} pending={pending} onAnswer={onAnswer} />
        ) : (
          <>
            <div className="flex flex-col gap-3.5 overflow-y-auto px-5 pt-4.5 pb-4">
              {header}
              <div className="grid grid-cols-[auto_1fr] gap-2.5 rounded-xl bg-muted px-3 py-2.5 text-sm">
                <Info className="mt-0.5 size-4 text-muted-foreground" />
                <p>
                  <b className="font-semibold">Why Popper stopped here.</b> {gate.why}
                </p>
              </div>
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
                      <span className="text-muted-foreground text-xs">{o.description}</span>
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
                placeholder="Optional: a note for the agents, kept with your decision"
                aria-label="Note for the agents"
              />
            </div>
            <div className="flex items-center gap-3 border-t bg-popover px-5 py-3.5">
              <span className="flex-1 text-muted-foreground text-xs">Nothing runs until you confirm.</span>
              <Button onClick={confirm} disabled={!option || option.disabled || pending}>
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
        )}
      </motion.div>
    </>
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
